import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import { assertStaffOrAbove, pad } from "./shared";

function partStatus(quantity: number) {
  return {
    stock: quantity,
    status: quantity > 0 ? "In Stock" : "Out of Stock",
    statusColor: quantity > 0 ? "green" : "red",
  };
}

// Mirrors add-parts-transaction.php: validates stock sufficiency and full
// payment, generates PRT-YYYYMM-00001 via an atomic counter (replacing the
// racy COUNT(*)), and decrements inventory quantity/stock in the same
// Firestore transaction (replacing the original's conditional
// `UPDATE ... WHERE quantity >= qty` + rowCount() race-check).
export const createPartsTransaction = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const {
    customerName, inventoryId, inventoryName, quantity, price,
    amountPaid, paymentType, transactionDate, notes,
    processedByName, processedByRole,
  } = request.data ?? {};

  if (!customerName || !inventoryId || amountPaid == null || Number(amountPaid) <= 0) {
    throw new HttpsError(
      "invalid-argument",
      "customerName, inventoryId, and a positive amountPaid are required."
    );
  }

  const qty = Number(quantity) || 1;
  if (qty <= 0) {
    throw new HttpsError("invalid-argument", "Quantity must be at least 1.");
  }

  const db = getFirestore();
  const inventoryRef = db.collection("inventory").doc(inventoryId);
  const transactionRef = db.collection("partsTransactions").doc();

  const now = new Date();
  const monthKey = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}`;
  const counterRef = db.collection("counters").doc(`PRT-${monthKey}`);

  const result = await db.runTransaction(async (tx) => {
    const [inventoryDoc, counterDoc] = await Promise.all([tx.get(inventoryRef), tx.get(counterRef)]);

    if (!inventoryDoc.exists) {
      throw new HttpsError("not-found", "Part not found.");
    }
    const part = inventoryDoc.data()!;
    if (!(part.category === "Part" || part.isPart)) {
      throw new HttpsError("failed-precondition", "Selected item is not a part.");
    }
    const currentQuantity = Number(part.quantity) || 0;
    if (currentQuantity < qty) {
      throw new HttpsError("failed-precondition", `Insufficient stock. Available: ${currentQuantity}`);
    }

    const unitPrice = price != null ? Number(price) : Number(part.price) || 0;
    const totalAmount = unitPrice * qty;
    const paidAmount = Number(amountPaid);
    if (paidAmount < totalAmount) {
      throw new HttpsError(
        "invalid-argument",
        `Amount paid (₱${paidAmount.toFixed(2)}) is less than total amount (₱${totalAmount.toFixed(2)}).`
      );
    }
    const changeAmount = Math.max(0, paidAmount - totalAmount);

    const nextCount = (counterDoc.exists ? (counterDoc.data()!.count as number) : 0) + 1;
    const transactionNo = `PRT-${monthKey}-${pad(nextCount, 5)}`;

    tx.set(counterRef, { count: nextCount }, { merge: true });

    tx.set(transactionRef, {
      transactionNo,
      customerName,
      inventoryId,
      inventoryName: inventoryName || part.name || "",
      imageUrl: part.imageUrl || "",
      quantity: qty,
      price: unitPrice,
      totalAmount,
      amountPaid: paidAmount,
      changeAmount,
      paymentType: paymentType || "Cash",
      transactionDate: transactionDate || now.toISOString().split("T")[0],
      notes: notes || "",
      status: "Completed",
      processedBy: {
        uid: request.auth!.uid,
        name: processedByName || "Unknown",
        role: processedByRole || (request.auth!.token.role as string) || "Unknown",
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const newQuantity = currentQuantity - qty;
    tx.update(inventoryRef, {
      quantity: newQuantity,
      ...partStatus(newQuantity),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { transactionId: transactionRef.id, transactionNo, totalAmount, changeAmount };
  });

  return result;
});

async function deletePartsTransactionInternal(db: Firestore, transactionId: string) {
  const transactionRef = db.collection("partsTransactions").doc(transactionId);

  await db.runTransaction(async (tx) => {
    const transactionDoc = await tx.get(transactionRef);
    if (!transactionDoc.exists) {
      throw new HttpsError("not-found", "Parts transaction not found.");
    }
    const { inventoryId, quantity } = transactionDoc.data()!;
    const inventoryRef = db.collection("inventory").doc(inventoryId);
    const inventoryDoc = await tx.get(inventoryRef);

    tx.delete(transactionRef);

    if (inventoryDoc.exists) {
      const currentQuantity = Number(inventoryDoc.data()!.quantity) || 0;
      const restored = currentQuantity + (Number(quantity) || 0);
      tx.update(inventoryRef, {
        quantity: restored,
        ...partStatus(restored),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

// Mirrors delete-parts-transaction.php: restores the quantity/stock it decremented.
export const deletePartsTransaction = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { transactionId } = request.data ?? {};
  if (!transactionId) {
    throw new HttpsError("invalid-argument", "transactionId is required.");
  }
  await deletePartsTransactionInternal(getFirestore(), transactionId);
  return { success: true };
});

// Mirrors bulk-delete-parts-transactions.php: best-effort per-row.
export const bulkDeletePartsTransactions = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { transactionIds } = request.data ?? {};
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    throw new HttpsError("invalid-argument", "transactionIds must be a non-empty array.");
  }
  const db = getFirestore();
  let deletedCount = 0;
  for (const id of transactionIds) {
    try {
      await deletePartsTransactionInternal(db, id);
      deletedCount++;
    } catch {
      // Skip and continue, matching the original's per-row tolerance.
    }
  }
  return { success: true, deletedCount };
});
