import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import { assertStaffOrAbove, pad } from "./shared";

// inventory.stock (for motorcycles) is always a live count of Available
// units — same convention as inventory.ts, kept in sync here too whenever a
// transaction sells/returns a unit.
function statusFromAvailable(available: number) {
  return {
    stock: available,
    status: available > 0 ? "In Stock" : "Out of Stock",
    statusColor: available > 0 ? "green" : "red",
  };
}

// Mirrors add-transaction.php: generates the next TRX-YYYYMM-00001 number
// from a counters/ doc (atomic, unlike the original's racy COUNT(*)),
// creates the transaction + its installment schedule (if any), marks the
// unit Sold, and recomputes inventory stock — all in one Firestore
// transaction. Counter month/year is based on *now* (server time), not the
// transactionDate field, matching the original's date('Y')/date('m').
export const createTransaction = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const {
    customerId, customerName, customerContact, inventoryId, inventoryName, inventorySku, inventoryType, brand, imageUrl,
    unitId, engineNumber, chassisNumber, color,
    paymentType, sellingPrice, amountPaid, downPayment, terms, monthlyAmount,
    transactionDate, notes, processedByName, processedByRole,
  } = request.data ?? {};

  if (!customerId || !inventoryId || !unitId || !paymentType || !sellingPrice || !transactionDate) {
    throw new HttpsError(
      "invalid-argument",
      "customerId, inventoryId, unitId, paymentType, sellingPrice, and transactionDate are required."
    );
  }

  const db = getFirestore();
  const inventoryRef = db.collection("inventory").doc(inventoryId);
  const unitRef = inventoryRef.collection("units").doc(unitId);
  const transactionRef = db.collection("transactions").doc();

  const now = new Date();
  const monthKey = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}`;
  const counterRef = db.collection("counters").doc(`TRX-${monthKey}`);

  const downPaymentNum = Number(downPayment) || 0;
  const sellingPriceNum = Number(sellingPrice);
  const remainingBalance = paymentType === "Installment" ? sellingPriceNum - downPaymentNum : 0;
  const termsNum = Number(terms) || 0;
  const monthlyNum = Number(monthlyAmount) || 0;
  const isInstallmentSchedule = paymentType === "Installment" && termsNum > 0 && monthlyNum > 0;

  const result = await db.runTransaction(async (tx) => {
    const [counterDoc, unitDoc, availableSnap] = await Promise.all([
      tx.get(counterRef),
      tx.get(unitRef),
      tx.get(inventoryRef.collection("units").where("status", "==", "Available")),
    ]);

    if (!unitDoc.exists) {
      throw new HttpsError("not-found", "Unit not found.");
    }
    if (unitDoc.data()!.status !== "Available") {
      throw new HttpsError("failed-precondition", "This unit is no longer available.");
    }

    const nextCount = (counterDoc.exists ? (counterDoc.data()!.count as number) : 0) + 1;
    const transactionNo = `TRX-${monthKey}-${pad(nextCount, 5)}`;

    // Build the installment schedule up front (pure computation) so the
    // transaction doc can be written once with the correct nextDueDate.
    let firstDueDate: string | null = null;
    const installments: { paymentNo: number; dueDate: string; amountDue: number }[] = [];
    if (isInstallmentSchedule) {
      const startDate = new Date(transactionDate);
      for (let i = 1; i <= termsNum; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        const dueDateStr = dueDate.toISOString().split("T")[0];
        if (i === 1) firstDueDate = dueDateStr;

        let amountDue: number;
        if (i === termsNum) {
          const previousTotal = monthlyNum * (termsNum - 1);
          let last = remainingBalance - previousTotal;
          if (last <= 0.01) last = monthlyNum;
          amountDue = Math.round(last * 100) / 100;
        } else {
          amountDue = Math.round(monthlyNum * 100) / 100;
        }
        installments.push({ paymentNo: i, dueDate: dueDateStr, amountDue });
      }
    }

    tx.set(counterRef, { count: nextCount }, { merge: true });

    tx.set(transactionRef, {
      transactionNo,
      customerId,
      customerName: customerName || "",
      customerContact: customerContact || "",
      inventoryId,
      inventoryName: inventoryName || "",
      inventorySku: inventorySku || "",
      inventoryType: inventoryType || "",
      brand: brand || "",
      imageUrl: imageUrl || "",
      unitId,
      engineNumber: engineNumber || unitDoc.data()!.engineNumber || "",
      chassisNumber: chassisNumber || unitDoc.data()!.chassisNumber || "",
      color: color || unitDoc.data()!.color || "",
      paymentType,
      sellingPrice: sellingPriceNum,
      amountPaid: Number(amountPaid) || 0,
      downPayment: downPaymentNum,
      terms: termsNum || null,
      monthlyAmount: monthlyNum || null,
      balance: paymentType === "Installment" ? remainingBalance : 0,
      transactionDate,
      notes: notes || "",
      status: "Completed",
      remainingBalance,
      lastPaymentDate: null,
      nextDueDate: firstDueDate,
      processedBy: {
        uid: request.auth!.uid,
        name: processedByName || "Unknown",
        role: processedByRole || (request.auth!.token.role as string) || "Unknown",
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    installments.forEach(({ paymentNo, dueDate, amountDue }) => {
      const paymentRef = transactionRef.collection("installmentPayments").doc();
      tx.set(paymentRef, {
        paymentNo,
        dueDate,
        amountDue,
        amountPaid: 0,
        paymentDate: null,
        status: "Pending",
        penaltyAmount: 0,
        paymentMethod: "Cash",
        referenceNo: null,
        notes: "",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    tx.update(unitRef, { status: "Sold", updatedAt: FieldValue.serverTimestamp() });
    const newAvailable = availableSnap.size - 1;
    tx.update(inventoryRef, {
      ...statusFromAvailable(newAvailable),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { transactionId: transactionRef.id, transactionNo };
  });

  return result;
});

// Mirrors record-payment.php's payment_id path — the only path the frontend
// actually uses (the transaction_id-only "bulk/partial" branch in the PHP
// was dead code: it marked installments 'Paid' using their full amount_due
// regardless of the amount actually received, and the UI never called it).
// This version fixes that: partial payments accumulate and correctly land
// on 'Partial' status (a value the schema already had but the PHP never
// set), and lastPaymentDate is now actually updated (a field the PHP
// declared on transactions but never populated from this path).
export const recordPayment = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { transactionId, paymentId, amountPaid, paymentDate, paymentMethod, referenceNo, notes } =
    request.data ?? {};

  if (!transactionId || !paymentId || amountPaid == null) {
    throw new HttpsError("invalid-argument", "transactionId, paymentId, and amountPaid are required.");
  }
  const paid = Number(amountPaid);
  if (!(paid > 0)) {
    throw new HttpsError("invalid-argument", "amountPaid must be greater than zero.");
  }

  const db = getFirestore();
  const transactionRef = db.collection("transactions").doc(transactionId);
  const paymentRef = transactionRef.collection("installmentPayments").doc(paymentId);

  await db.runTransaction(async (tx) => {
    const [transactionDoc, paymentDoc, pendingSnap] = await Promise.all([
      tx.get(transactionRef),
      tx.get(paymentRef),
      tx.get(
        transactionRef
          .collection("installmentPayments")
          .where("status", "in", ["Pending", "Overdue", "Partial"])
      ),
    ]);

    if (!transactionDoc.exists) {
      throw new HttpsError("not-found", "Transaction not found.");
    }
    if (!paymentDoc.exists) {
      throw new HttpsError("not-found", "Installment payment not found.");
    }

    const paymentData = paymentDoc.data()!;
    const previouslyPaid = Number(paymentData.amountPaid) || 0;
    const amountDue = Number(paymentData.amountDue) || 0;
    const newTotalPaid = previouslyPaid + paid;
    const newStatus = newTotalPaid >= amountDue - 0.01 ? "Paid" : "Partial";

    let nextDueDate: string | null = null;
    for (const d of pendingSnap.docs) {
      const isThisPayment = d.id === paymentId;
      const effectiveStatus = isThisPayment ? newStatus : d.data().status;
      if (effectiveStatus === "Paid") continue;
      const due = d.data().dueDate as string;
      if (!nextDueDate || due < nextDueDate) nextDueDate = due;
    }

    const transactionData = transactionDoc.data()!;
    const newRemainingBalance = Math.max(0, Number(transactionData.remainingBalance || 0) - paid);

    tx.update(paymentRef, {
      amountPaid: newTotalPaid,
      paymentDate,
      status: newStatus,
      paymentMethod: paymentMethod || "Cash",
      referenceNo: referenceNo || null,
      notes: notes || "",
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(transactionRef, {
      remainingBalance: newRemainingBalance,
      lastPaymentDate: paymentDate,
      nextDueDate,
    });
  });

  return { success: true };
});

async function deleteTransactionInternal(db: Firestore, transactionId: string) {
  const transactionRef = db.collection("transactions").doc(transactionId);

  await db.runTransaction(async (tx) => {
    const transactionDoc = await tx.get(transactionRef);
    if (!transactionDoc.exists) {
      throw new HttpsError("not-found", "Transaction not found.");
    }
    const { unitId, inventoryId } = transactionDoc.data()!;
    const inventoryRef = db.collection("inventory").doc(inventoryId);
    const unitRef = inventoryRef.collection("units").doc(unitId);

    const [paymentsSnap, unitDoc, availableSnap] = await Promise.all([
      tx.get(transactionRef.collection("installmentPayments")),
      tx.get(unitRef),
      tx.get(inventoryRef.collection("units").where("status", "==", "Available")),
    ]);

    paymentsSnap.docs.forEach((p) => tx.delete(p.ref));
    tx.delete(transactionRef);

    if (unitDoc.exists) {
      tx.update(unitRef, { status: "Available", updatedAt: FieldValue.serverTimestamp() });
      const newAvailable = availableSnap.size + 1;
      tx.update(inventoryRef, {
        ...statusFromAvailable(newAvailable),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

// Mirrors delete-transaction.php: cascades the installmentPayments
// subcollection (Firestore doesn't auto-cascade) and reverses the unit
// sale (Available again, stock recomputed from the live Available count
// rather than a blind +1, keeping it consistent with inventory.ts).
export const deleteTransaction = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { transactionId } = request.data ?? {};
  if (!transactionId) {
    throw new HttpsError("invalid-argument", "transactionId is required.");
  }
  await deleteTransactionInternal(getFirestore(), transactionId);
  return { success: true };
});

// Mirrors bulk-delete-transactions.php: best-effort per-row, skipping (not
// failing the whole batch on) any transaction that no longer exists.
export const bulkDeleteTransactions = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { transactionIds } = request.data ?? {};
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    throw new HttpsError("invalid-argument", "transactionIds must be a non-empty array.");
  }

  const db = getFirestore();
  let deletedCount = 0;
  for (const id of transactionIds) {
    try {
      await deleteTransactionInternal(db, id);
      deletedCount++;
    } catch {
      // Skip and continue, matching the original's per-row tolerance.
    }
  }
  return { success: true, deletedCount };
});

// Replaces the flip-on-read Pending->Overdue logic that lived in
// get-installment-payments.php (every read used to mutate data as a side
// effect). Runs nightly across every transaction's installment schedule via
// a collectionGroup query.
export const flagOverdueInstallments = onSchedule("every day 01:00", async () => {
  const db = getFirestore();
  const today = new Date().toISOString().split("T")[0];

  const overdueSnap = await db
    .collectionGroup("installmentPayments")
    .where("status", "==", "Pending")
    .where("dueDate", "<", today)
    .get();

  const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < overdueSnap.docs.length; i += 450) {
    chunks.push(overdueSnap.docs.slice(i, i + 450));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const batch = db.batch();
      chunk.forEach((doc) => {
        batch.update(doc.ref, { status: "Overdue", updatedAt: FieldValue.serverTimestamp() });
      });
      await batch.commit();
    })
  );
});
