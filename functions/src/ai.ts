import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertStaffOrAbove } from "./shared";

// Stub for ai-chat.php's Ollama/gemma3 integration — that model ran locally
// on the shop's XAMPP machine and has no equivalent always-on host in this
// Firebase setup. Returns a friendly placeholder so the UI keeps working;
// swap in a hosted LLM call here when one is chosen.
export const aiChat = onCall(async (request) => {
  assertStaffOrAbove(request.auth);
  const { message } = request.data ?? {};

  if (!message || !String(message).trim()) {
    throw new HttpsError("invalid-argument", "message is required.");
  }

  return {
    reply:
      "Hi! 👋 The AI Assistant is coming soon. It'll be able to analyze your " +
      "inventory, payments, and sales trends once it's connected. For now, check " +
      "the Dashboard and Predictive Analytics pages for insights.",
  };
});
