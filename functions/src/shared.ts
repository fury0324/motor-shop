import { HttpsError } from "firebase-functions/v2/https";

type CallableAuth = { uid: string; token: Record<string, unknown> } | undefined;

export function assertSignedIn(
  auth: CallableAuth
): asserts auth is { uid: string; token: Record<string, unknown> } {
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
}

export function assertStaffOrAbove(auth: CallableAuth) {
  assertSignedIn(auth);
  const role = auth.token.role as string | undefined;
  if (!role || !["admin", "cashier", "staff"].includes(role)) {
    throw new HttpsError("permission-denied", "You do not have permission to perform this action.");
  }
}

export function assertAdmin(auth: CallableAuth) {
  assertSignedIn(auth);
  if (auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can perform this action.");
  }
}

export function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}
