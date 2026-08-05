import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { assertStaffOrAbove } from "./shared";

// customers.email had a UNIQUE key in MySQL; customerEmails/{email} replicates
// that atomically since Firestore has no native unique-field constraint.
function emailIndexRef(db: FirebaseFirestore.Firestore, email: string) {
  return db.collection("customerEmails").doc(email.toLowerCase().trim());
}

// Mirrors add-customer.php. The client generates the customer doc ID up front
// (Firestore's doc()-without-write pattern) so it can upload KYC documents to
// Storage under customers/{customerId}/... *before* calling this function —
// the download URLs are passed in as `documents`/`coMaker.idUrl`.
export const createCustomer = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const {
    customerId,
    fullName,
    contactNumber,
    email,
    homeAddress,
    birthDate,
    civilStatus,
    occupation,
    monthlyIncome,
    documents,
    coMaker,
    addedByName,
    addedByRole,
  } = request.data ?? {};

  if (!customerId || !fullName || !contactNumber || !email || !homeAddress) {
    throw new HttpsError(
      "invalid-argument",
      "customerId, fullName, contactNumber, email, and homeAddress are required."
    );
  }

  const db = getFirestore();
  const normalizedEmail = String(email).toLowerCase().trim();
  const customerRef = db.collection("customers").doc(customerId);
  const emailRef = emailIndexRef(db, normalizedEmail);

  await db.runTransaction(async (tx) => {
    const emailDoc = await tx.get(emailRef);
    if (emailDoc.exists) {
      throw new HttpsError("already-exists", "A customer with this email already exists.");
    }

    tx.set(emailRef, { customerId });
    tx.set(customerRef, {
      fullName,
      contactNumber,
      email: normalizedEmail,
      homeAddress,
      birthDate: birthDate || null,
      civilStatus: civilStatus || null,
      occupation: occupation || null,
      monthlyIncome: monthlyIncome != null && monthlyIncome !== "" ? Number(monthlyIncome) : null,
      documents: documents || {},
      coMaker: coMaker || {},
      addedBy: {
        uid: request.auth!.uid,
        name: addedByName || "Unknown",
        role: addedByRole || (request.auth!.token.role as string) || "staff",
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { customerId };
});

// Mirrors update-customer.php, plus keeps the email-uniqueness index in sync
// if the email changes (update-customer.php never touched file uploads, so
// neither does this — new document uploads go through createCustomer-style
// direct Storage writes and are merged into `documents` here).
export const updateCustomer = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const {
    customerId,
    fullName,
    contactNumber,
    email,
    homeAddress,
    birthDate,
    civilStatus,
    occupation,
    monthlyIncome,
    documents,
    coMaker,
  } = request.data ?? {};

  if (!customerId) {
    throw new HttpsError("invalid-argument", "customerId is required.");
  }

  const db = getFirestore();
  const customerRef = db.collection("customers").doc(customerId);

  await db.runTransaction(async (tx) => {
    const customerDoc = await tx.get(customerRef);
    if (!customerDoc.exists) {
      throw new HttpsError("not-found", "Customer not found.");
    }
    const existing = customerDoc.data()!;

    let newEmailRef: FirebaseFirestore.DocumentReference | null = null;
    let normalizedEmail: string | null = null;
    if (email) {
      normalizedEmail = String(email).toLowerCase().trim();
      if (normalizedEmail !== existing.email) {
        newEmailRef = emailIndexRef(db, normalizedEmail);
        const newEmailDoc = await tx.get(newEmailRef);
        if (newEmailDoc.exists) {
          throw new HttpsError("already-exists", "A customer with this email already exists.");
        }
      }
    }

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (fullName) update.fullName = fullName;
    if (contactNumber) update.contactNumber = contactNumber;
    if (homeAddress) update.homeAddress = homeAddress;
    if (birthDate !== undefined) update.birthDate = birthDate || null;
    if (civilStatus !== undefined) update.civilStatus = civilStatus || null;
    if (occupation !== undefined) update.occupation = occupation || null;
    if (monthlyIncome !== undefined) {
      update.monthlyIncome = monthlyIncome != null && monthlyIncome !== "" ? Number(monthlyIncome) : null;
    }
    if (documents) update.documents = { ...existing.documents, ...documents };
    if (coMaker) update.coMaker = { ...existing.coMaker, ...coMaker };

    if (newEmailRef && normalizedEmail) {
      tx.delete(emailIndexRef(db, existing.email));
      tx.set(newEmailRef, { customerId });
      update.email = normalizedEmail;
    }

    tx.update(customerRef, update);
  });

  return { success: true };
});

// Mirrors the RESTRICT foreign key transactions.customer_id had in MySQL —
// deleting a customer with transaction history must fail, not orphan them.
export const deleteCustomer = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { customerId } = request.data ?? {};
  if (!customerId) {
    throw new HttpsError("invalid-argument", "customerId is required.");
  }

  const db = getFirestore();
  const customerRef = db.collection("customers").doc(customerId);

  const referencing = await db
    .collection("transactions")
    .where("customerId", "==", customerId)
    .limit(1)
    .get();
  if (!referencing.empty) {
    throw new HttpsError(
      "failed-precondition",
      "This customer has existing transactions and cannot be deleted."
    );
  }

  const customerDoc = await customerRef.get();
  if (!customerDoc.exists) {
    throw new HttpsError("not-found", "Customer not found.");
  }
  const email = customerDoc.data()!.email as string | undefined;

  const batch = db.batch();
  batch.delete(customerRef);
  if (email) batch.delete(emailIndexRef(db, email));
  await batch.commit();

  return { success: true };
});
