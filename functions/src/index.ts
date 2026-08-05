import { initializeApp } from "firebase-admin/app";

initializeApp();

export { createStaffUser, updateStaffUser, deleteStaffUser } from "./users";
export { createCustomer, updateCustomer, deleteCustomer } from "./customers";
export { addInventoryUnit, deleteInventoryUnit, deleteInventoryItem } from "./inventory";
export {
  createTransaction,
  recordPayment,
  deleteTransaction,
  bulkDeleteTransactions,
  flagOverdueInstallments,
} from "./transactions";
export {
  createPartsTransaction,
  deletePartsTransaction,
  bulkDeletePartsTransactions,
} from "./partsTransactions";
export { getDashboardStats, getPredictiveAnalysis } from "./dashboard";
export { sendDuePaymentReminders, sendDuePaymentRemindersNow } from "./notifications";
export { aiChat } from "./ai";
