import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { assertStaffOrAbove } from "./shared";

// inventory_units.engine_number / .chassis_number were globally UNIQUE across
// all inventory in MySQL, not just within one model. Units now live in
// per-item subcollections, so these two top-level collections replicate that
// global uniqueness the same way customerEmails does for customer emails.
function engineIndexRef(db: FirebaseFirestore.Firestore, engineNumber: string) {
  return db.collection("unitEngineNumbers").doc(engineNumber);
}
function chassisIndexRef(db: FirebaseFirestore.Firestore, chassisNumber: string) {
  return db.collection("unitChassisNumbers").doc(chassisNumber);
}

// inventory.stock (for motorcycles) is always a live count of units whose
// status is 'Available' — matches add-inventory-unit.php exactly, which
// recomputed it the same way on every unit change rather than incrementing.
function statusFromAvailable(available: number) {
  return {
    stock: available,
    status: available > 0 ? "In Stock" : "Out of Stock",
    statusColor: available > 0 ? "green" : "red",
  };
}

// Mirrors add-inventory-unit.php: uppercase/trim the serials, enforce global
// uniqueness, create the unit as 'Available', and recompute the parent's
// stock/status atomically in the same transaction.
export const addInventoryUnit = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { inventoryId, engineNumber, chassisNumber, color, notes } = request.data ?? {};

  if (!inventoryId || !engineNumber || !chassisNumber) {
    throw new HttpsError(
      "invalid-argument",
      "inventoryId, engineNumber, and chassisNumber are required."
    );
  }

  const db = getFirestore();
  const engine = String(engineNumber).toUpperCase().trim();
  const chassis = String(chassisNumber).toUpperCase().trim();

  const inventoryRef = db.collection("inventory").doc(inventoryId);
  const engineRef = engineIndexRef(db, engine);
  const chassisRef = chassisIndexRef(db, chassis);
  const unitsRef = inventoryRef.collection("units");
  const newUnitRef = unitsRef.doc();

  await db.runTransaction(async (tx) => {
    const [inventoryDoc, engineDoc, chassisDoc, availableSnap] = await Promise.all([
      tx.get(inventoryRef),
      tx.get(engineRef),
      tx.get(chassisRef),
      tx.get(unitsRef.where("status", "==", "Available")),
    ]);

    if (!inventoryDoc.exists) {
      throw new HttpsError("not-found", "Inventory item not found.");
    }
    if (engineDoc.exists || chassisDoc.exists) {
      throw new HttpsError("already-exists", "Engine or Chassis number already exists!");
    }

    tx.set(newUnitRef, {
      engineNumber: engine,
      chassisNumber: chassis,
      color: color || null,
      status: "Available",
      purchaseDate: null,
      sellingPrice: null,
      notes: notes || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(engineRef, { inventoryId, unitId: newUnitRef.id });
    tx.set(chassisRef, { inventoryId, unitId: newUnitRef.id });
    tx.update(inventoryRef, {
      ...statusFromAvailable(availableSnap.size + 1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { unitId: newUnitRef.id };
});

// Mirrors the RESTRICT foreign key transactions.unit_id had on
// inventory_units — a unit with a transaction on record can't be deleted.
export const deleteInventoryUnit = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { inventoryId, unitId } = request.data ?? {};
  if (!inventoryId || !unitId) {
    throw new HttpsError("invalid-argument", "inventoryId and unitId are required.");
  }

  const db = getFirestore();
  const inventoryRef = db.collection("inventory").doc(inventoryId);
  const unitRef = inventoryRef.collection("units").doc(unitId);

  const referencing = await db
    .collection("transactions")
    .where("unitId", "==", unitId)
    .limit(1)
    .get();
  if (!referencing.empty) {
    throw new HttpsError(
      "failed-precondition",
      "This unit has a transaction on record and cannot be deleted."
    );
  }

  await db.runTransaction(async (tx) => {
    const unitDoc = await tx.get(unitRef);
    if (!unitDoc.exists) {
      throw new HttpsError("not-found", "Unit not found.");
    }
    const unit = unitDoc.data()!;
    const availableSnap = await tx.get(
      inventoryRef.collection("units").where("status", "==", "Available")
    );
    const remainingAvailable =
      unit.status === "Available" ? availableSnap.size - 1 : availableSnap.size;

    tx.delete(unitRef);
    if (unit.engineNumber) tx.delete(engineIndexRef(db, unit.engineNumber));
    if (unit.chassisNumber) tx.delete(chassisIndexRef(db, unit.chassisNumber));
    tx.update(inventoryRef, {
      ...statusFromAvailable(remainingAvailable),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

// Mirrors delete-inventory.php's cascade (now explicit — Firestore doesn't
// auto-cascade subcollections) plus the RESTRICT checks that MySQL enforced
// via transactions.inventory_id and parts_transactions.inventory_id.
export const deleteInventoryItem = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { inventoryId } = request.data ?? {};
  if (!inventoryId) {
    throw new HttpsError("invalid-argument", "inventoryId is required.");
  }

  const db = getFirestore();
  const inventoryRef = db.collection("inventory").doc(inventoryId);

  const [txSnap, partsTxSnap] = await Promise.all([
    db.collection("transactions").where("inventoryId", "==", inventoryId).limit(1).get(),
    db.collection("partsTransactions").where("inventoryId", "==", inventoryId).limit(1).get(),
  ]);
  if (!txSnap.empty || !partsTxSnap.empty) {
    throw new HttpsError(
      "failed-precondition",
      "This item has sales history and cannot be deleted."
    );
  }

  const unitsSnap = await inventoryRef.collection("units").get();

  const batch = db.batch();
  for (const unitDoc of unitsSnap.docs) {
    const unit = unitDoc.data();
    batch.delete(unitDoc.ref);
    if (unit.engineNumber) batch.delete(engineIndexRef(db, unit.engineNumber));
    if (unit.chassisNumber) batch.delete(chassisIndexRef(db, unit.chassisNumber));
  }
  batch.delete(inventoryRef);
  await batch.commit();

  return { success: true };
});
