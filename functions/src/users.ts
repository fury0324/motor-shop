import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { assertAdmin as assertIsAdmin } from "./shared";

const VALID_ROLES = ["admin", "cashier", "staff"];

// Mirrors create-user.php + send-invite.php: creates the Auth account, sets the
// role as a custom claim (what Security Rules key off of), writes the
// users/{uid} profile doc, and optionally queues a welcome email via the
// Trigger Email extension (mail/ doc — delivered once the extension is
// installed in a later module; harmless no-op until then).
export const createStaffUser = onCall(async (request) => {
  assertIsAdmin(request.auth);
  const { name, email, password, role, sendInvite } = request.data ?? {};

  if (!name || !email || !password || !role) {
    throw new HttpsError("invalid-argument", "Name, email, password, and role are required.");
  }
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `Role must be one of: ${VALID_ROLES.join(", ")}`);
  }
  if (String(password).length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }

  const auth = getAuth();
  const db = getFirestore();

  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: name });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "A user with this email already exists.");
    }
    throw new HttpsError("internal", err instanceof Error ? err.message : "Failed to create user.");
  }

  await auth.setCustomUserClaims(userRecord.uid, { role });

  await db.collection("users").doc(userRecord.uid).set({
    name,
    email,
    role,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
  });

  if (sendInvite) {
    await db.collection("mail").add({
      to: [email],
      message: {
        subject: "Welcome to Euro Motor Shop",
        html: `<p>Hi ${name},</p><p>An account has been created for you on the Euro Motor Shop management portal.</p><p><b>Email:</b> ${email}<br/><b>Temporary password:</b> ${password}</p><p>Please log in and change your password as soon as possible.</p>`,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return { uid: userRecord.uid };
});

export const updateStaffUser = onCall(async (request) => {
  assertIsAdmin(request.auth);
  const { uid, name, email, role, status } = request.data ?? {};

  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required.");
  }
  if (role && !VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `Role must be one of: ${VALID_ROLES.join(", ")}`);
  }

  const auth = getAuth();
  const db = getFirestore();

  const authUpdate: Record<string, unknown> = {};
  if (name) authUpdate.displayName = name;
  if (email) authUpdate.email = email;
  if (status) authUpdate.disabled = status === "inactive";
  if (Object.keys(authUpdate).length > 0) {
    try {
      await auth.updateUser(uid, authUpdate);
    } catch (err) {
      throw new HttpsError("internal", err instanceof Error ? err.message : "Failed to update user.");
    }
  }
  if (role) {
    await auth.setCustomUserClaims(uid, { role });
  }

  const docUpdate: Record<string, unknown> = {};
  if (name) docUpdate.name = name;
  if (email) docUpdate.email = email;
  if (role) docUpdate.role = role;
  if (status) docUpdate.status = status;
  if (Object.keys(docUpdate).length > 0) {
    await db.collection("users").doc(uid).update(docUpdate);
  }

  return { success: true };
});

export const deleteStaffUser = onCall(async (request) => {
  assertIsAdmin(request.auth);
  const { uid } = request.data ?? {};

  if (!uid) {
    throw new HttpsError("invalid-argument", "uid is required.");
  }
  if (uid === request.auth?.uid) {
    throw new HttpsError("failed-precondition", "You cannot delete your own account.");
  }

  const auth = getAuth();
  const db = getFirestore();

  await auth.deleteUser(uid);
  await db.collection("users").doc(uid).delete();

  return { success: true };
});
