# Firestore Architecture — Euro Motor Shop

Finalized data model for the Firebase migration, derived from `scripts/reference-schema.sql`
(the real MySQL schema, including constraints). This supersedes the sketch in the original
migration plan wherever they differ — see **"Revision from the original plan"** below.

---

## Governing principle

> **Any write path that must enforce a uniqueness constraint or maintain referential
> integrity across documents goes through a Cloud Function (Admin SDK, bypasses rules).
> Everything else is a direct client Firestore write, gated by Security Rules.**

This one rule explains every decision below. MySQL enforced `UNIQUE` keys and `FOREIGN KEY`
constraints for you automatically; Firestore has neither, so wherever the old schema leaned on
one, that responsibility has to move somewhere — and a Cloud Function (which runs with
Admin privileges and can use `runTransaction` for atomicity) is the only place that can
replicate it safely.

---

## Collections

### `users/{uid}`
*From `users`. Doc ID = Firebase Auth UID (was auto-increment `id`).*

| Firestore field | MySQL column | Notes |
|---|---|---|
| `name` | `name` | |
| `email` | `email` | Uniqueness now enforced by Firebase Auth itself (email is the Auth account key) |
| `role` | `role` | Also set as an Auth **custom claim** — this is what Security Rules check |
| `status` | `status` | Also mirrored to Auth's `disabled` flag |
| `createdAt` | `created_at` | Timestamp |
| — | `password` | **Not stored in Firestore.** Lives only in Firebase Auth (bcrypt hash imported directly via `importUsers` in Module 9) |

- **Writes:** Cloud Functions only — `createStaffUser`, `updateStaffUser`, `deleteStaffUser` (built in Module 1).
- **Delete restriction:** none existed in MySQL (`processed_by_id` on transactions was a loose int, no FK). Deleting a user is unrestricted; transactions keep their denormalized `processedBy.name`/`.role` snapshot regardless.

---

### `customers/{customerId}`
*From `customers`. Doc ID = auto-generated (was auto-increment `id`).*

| Firestore field | MySQL column |
|---|---|
| `fullName` | `full_name` |
| `contactNumber` | `contact_number` |
| `email` | `email` |
| `homeAddress` | `home_address` |
| `birthDate` | `birth_date` *(ISO date string `YYYY-MM-DD`, not Timestamp — see "Date handling" below)* |
| `civilStatus` | `civil_status` |
| `occupation` | `occupation` |
| `monthlyIncome` | `monthly_income` |
| `documents.validIdUrl` | `valid_id_path` *(Storage download URL, not a local file path)* |
| `documents.barangayClearanceUrl` | `barangay_clearance_path` |
| `documents.utilityReceiptUrl` | `utility_receipt_path` |
| `documents.proofOfIncomeUrl` | `proof_of_income_path` |
| `coMaker.name` | `co_maker_name` |
| `coMaker.contact` | `co_maker_contact` |
| `coMaker.relationship` | `co_maker_relationship` |
| `coMaker.address` | `co_maker_address` |
| `coMaker.idUrl` | `co_maker_id_path` |
| `addedBy.uid` | *(new — real Auth UID, wasn't available before)* |
| `addedBy.name` | `added_by_name` |
| `addedBy.role` | `added_by_role` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

**Revision from the original plan:** I originally scoped customer create/update as direct
client writes with only delete going through a Cloud Function. Re-deriving from the real
schema changes that — `customers.email` had a `UNIQUE` key, and `transactions.customer_id`
is a `RESTRICT` foreign key (deleting a customer with transactions must fail, not orphan
them). Both of those need server-side atomicity, so **all three operations move to Cloud
Functions**: `createCustomer`, `updateCustomer`, `deleteCustomer`. Document *uploads* stay
client-side (client uploads to Storage first, gets a download URL, then passes that URL into
the Cloud Function call) — only the Firestore document write itself is server-mediated.

- **Uniqueness:** `createCustomer`/`updateCustomer` check-and-reserve the email inside a
  Firestore transaction against a new `customerEmails/{email}` index doc (see below).
- **Delete restriction (RESTRICT equivalent):** `deleteCustomer` queries `transactions` for
  any doc with matching `customerId`; if any exist, the function throws
  `failed-precondition` instead of deleting — exactly what MySQL's constraint did.

---

### `inventory/{itemId}`
*From `inventory`. Doc ID = auto-generated.*

| Firestore field | MySQL column |
|---|---|
| `sku` | `sku` |
| `name` | `name` |
| `brand` | `brand` |
| `category` | `category` (`'Motorcycle'` \| `'Part'`) |
| `type` | `type` |
| `price` | `price` |
| `description` | `description` |
| `stock` | `stock` |
| `status` | `status` |
| `statusColor` | `statusColor` |
| `imageUrl` | `image` *(Storage download URL)* |
| `color` | `color` |
| `isPart` | `is_part` *(boolean, was tinyint 0/1)* |
| `quantity` | `quantity` |
| `installmentMarkupPercent` | *(new — no MySQL equivalent)* Optional per-item override of the shop-wide installment markup default (`settings/general`). `null`/absent = use the default; always `null` for Parts. See "Installment pricing" note below. |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` |

- **Writes:** `sku` had **no** `UNIQUE` key in the real schema (only `PRIMARY KEY(id)`), and
  create/update carry no cross-document atomicity requirement — these stay **direct client
  writes**, rules-gated, matching the original plan.
- **Installment pricing:** `price` is the real cash price. When a `transactions` doc is
  created with `paymentType: 'Installment'`, the client (`Transaction.jsx`/`NewTransaction.jsx`)
  computes `sellingPrice` as `price * (1 + effectivePercent / 100)`, where `effectivePercent`
  is this item's `installmentMarkupPercent` if set, else the global default from
  `settings/general`. Motorcycles only — Parts always sell at `price` unchanged. This follows
  the same client-computed, client-trusted pricing model `price` itself already uses (see
  `docs/ai-assistant.md`-adjacent reasoning: nothing in this app's pricing pipeline is
  server-validated today, so this doesn't introduce a new trust boundary).
- **Delete:** Cloud Function `deleteInventoryItem` only (unchanged from original plan) —
  cascades the `units` subcollection, but first checks no `transactions` or
  `partsTransactions` reference this item (RESTRICT equivalent for both).

#### Subcollection: `inventory/{itemId}/units/{unitId}`
*From `inventory_units`.*

| Firestore field | MySQL column |
|---|---|
| `engineNumber` | `engine_number` *(uppercased)* |
| `chassisNumber` | `chassis_number` *(uppercased)* |
| `color` | `color` |
| `status` | `unit_status` |
| `purchaseDate` | `purchase_date` |
| `sellingPrice` | `selling_price` |
| `notes` | `notes` |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` |

- **Writes:** Cloud Functions only — `addInventoryUnit`, `deleteInventoryUnit` (unchanged
  from original plan). `engine_number` and `chassis_number` were **globally** unique across
  *all* inventory in MySQL, not just within one model — since units now live in per-item
  subcollections, that global uniqueness needs the two index collections below.
- **Delete restriction:** `deleteInventoryUnit` checks no `transactions` reference this
  `unitId` before deleting (RESTRICT equivalent).
- Also recomputes the parent `inventory` doc's `stock`/`status`/`statusColor` on every
  add/delete, same as `add-inventory-unit.php` did.

---

### `transactions/{transactionId}`
*From `transactions`.*

| Firestore field | MySQL column |
|---|---|
| `transactionNo` | `transaction_no` *(still `TRX-YYYYMM-00001`, via `counters/`)* |
| `customerId` | `customer_id` |
| `customerName` | *(new — denormalized snapshot for list display, avoids a join)* |
| `inventoryId` | `inventory_id` |
| `inventoryName`, `inventorySku` | *(new — denormalized snapshot)* |
| `unitId` | `unit_id` |
| `engineNumber`, `chassisNumber` | *(new — denormalized snapshot)* |
| `paymentType` | `payment_type` |
| `sellingPrice` / `amountPaid` / `downPayment` / `terms` / `monthlyAmount` / `balance` / `remainingBalance` | *(same names, snake→camel)* |
| `transactionDate` | `transaction_date` |
| `notes` | `notes` |
| `status` | `status` |
| `lastPaymentDate` / `nextDueDate` | *(same, snake→camel)* |
| `processedBy.uid` | *(new — real Auth UID)* |
| `processedBy.name` | `processed_by_name` |
| `processedBy.role` | `processed_by_role` |
| `createdAt` | `created_at` |

Denormalizing customer/inventory/unit names at write time is the Firestore-idiomatic
replacement for the `JOIN`s `get-transactions.php` did on every read — same pattern the
original schema already used for `processed_by_name`, just extended consistently.

- **Writes:** Cloud Functions only — `createTransaction`, `recordPayment`,
  `deleteTransaction`, `bulkDeleteTransactions` (unchanged from original plan).
- **Cascade:** deleting a transaction must explicitly batch-delete its
  `installmentPayments` subcollection first — **Firestore does not auto-cascade
  subcollections** the way MySQL's `ON DELETE CASCADE` did. This is a real gotcha the
  Cloud Function has to handle by hand.
- No RESTRICT concern on transactions themselves — nothing else referenced
  `transactions.id` except its own (cascading) subcollection.

#### Subcollection: `transactions/{transactionId}/installmentPayments/{paymentId}`
*From `installment_payments`.*

| Firestore field | MySQL column |
|---|---|
| `paymentNo` | `payment_no` |
| `dueDate` | `due_date` |
| `amountDue` / `amountPaid` | `amount_due` / `amount_paid` |
| `paymentDate` | `payment_date` |
| `status` | `status` — **`'Pending' \| 'Paid' \| 'Partial' \| 'Overdue'`** |
| `penaltyAmount` | `penalty_amount` |
| `paymentMethod` | `payment_method` — `'Cash' \| 'Bank Transfer' \| 'GCash' \| 'Others'` |
| `referenceNo` | `reference_no` |
| `notes` | `notes` |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` |

`'Partial'` and `penalty_amount` were missing from my original (code-only-inferred) model —
the real dump confirms both exist and need to be carried over; `recordPayment` and any
future partial-payment UI in Module 4 should account for both.

---

### `partsTransactions/{transactionId}`
*From `parts_transactions`.*

| Firestore field | MySQL column |
|---|---|
| `transactionNo` | `transaction_no` *(`PRT-YYYYMM-00001`, via `counters/`)* |
| `customerName` | `customer_name` *(plain text — parts sales still don't link to `customers`, matches original)* |
| `inventoryId` | `inventory_id` |
| `inventoryName` | *(new — denormalized)* |
| `quantity` / `price` / `totalAmount` / `amountPaid` / `changeAmount` | *(same, snake→camel)* |
| `paymentType` | `payment_type` |
| `transactionDate` | `transaction_date` |
| `notes` | `notes` |
| `status` | `status` |
| `processedBy.uid` / `.name` / `.role` | same pattern as `transactions` |
| `createdAt` / `updatedAt` | `created_at` / `updated_at` |

- **Writes:** Cloud Functions only — `createPartsTransaction`, `deletePartsTransaction`,
  `bulkDeletePartsTransactions` (unchanged from original plan).
- The `RESTRICT` FK this table had (`inventory_id → inventory`) affects **inventory
  deletion**, not parts-transaction deletion — already covered under `deleteInventoryItem`
  above. Deleting a parts transaction itself has no restriction, just reverses the
  quantity/stock decrement.

---

## Supporting collections (new — no MySQL equivalent)

These exist purely to let Cloud Functions replicate guarantees MySQL gave for free. All are
**Cloud-Function-only** (`allow read, write: if false` in rules) except `customerEmails`,
which is written inside `createCustomer`/`updateCustomer`/`deleteCustomer` (still a Cloud
Function — see the revision above) so it's equally `if false` to clients.

| Collection | Purpose | Replaces |
|---|---|---|
| `counters/{key}` (e.g. `TRX-202608`, `PRT-202608`) | Atomic sequence source for transaction numbers, incremented inside a Firestore transaction | The old `SELECT COUNT(*) ... WHERE YEAR/MONTH` (which was already racy in MySQL, and can't work at all in Firestore without this) |
| `unitEngineNumbers/{engineNumber}` | Reserves a unit's engine number globally, `{inventoryId, unitId}` | `inventory_units.engine_number UNIQUE` |
| `unitChassisNumbers/{chassisNumber}` | Reserves a unit's chassis number globally, `{inventoryId, unitId}` | `inventory_units.chassis_number UNIQUE` |
| `customerEmails/{email}` | Reserves a customer's email, `{customerId}` | `customers.email UNIQUE` |
| `mail/{id}` | Queue consumed by the Trigger Email extension (Module 7) | — (new capability, not a table) |

**Not migrated:** `password_resets` has no Firestore equivalent — Firebase Auth's native
`sendPasswordResetEmail` replaced this entire flow in Module 1, per the decision already
made and implemented.

---

### `aiChatSessions/{sessionId}` and `aiUserMemory/{uid}`
*New — no MySQL equivalent. Added for the AI Assistant's persistent chat history and
cross-session memory. Full detail (including the tool-access model) lives in
`docs/ai-assistant.md`; this entry covers the data model only.*

| Collection | Doc ID | Key fields |
|---|---|---|
| `aiChatSessions/{sessionId}` | auto-generated | `uid`, `title`, `messageCount`, `lastMessagePreview`, `createdAt`, `updatedAt` |
| `aiChatSessions/{sessionId}/messages/{messageId}` | auto-generated | `role` (`user`\|`assistant`), `content`, `createdAt` |
| `aiUserMemory/{uid}` | **is** the owner's Firebase Auth UID | `facts`, `updatedAt` |

- **Writes:** server-only, via `server/src/routes/ai.js` (`createAiSession`, `aiChat`, `renameAiSession`, `deleteAiSession`) and `server/src/aiMemory.js`.
- **Reads:** server-only — unlike every other collection above, there is **no** direct client read carve-out (`isStaffOrAbove()`) here. Every read goes through the API, which checks the requesting `uid` against the resource's `uid` field first. See `docs/ai-assistant.md` §3 for the full isolation argument.

---

### `settings/{docId}`
*New — no MySQL equivalent. Shop-wide config, currently just the installment markup
default. Single fixed doc, `settings/general`.*

| Firestore field | Notes |
|---|---|
| `installmentMarkupPercent` | number, 0–100. Default installment markup applied to motorcycle sales; see `inventory/{itemId}.installmentMarkupPercent` for the per-item override. |
| `updatedAt` | Timestamp |

- **Writes:** server-only, via `server/src/routes/settings.js`'s `updateSettings` (`assertAdmin`).
- **Reads:** `isStaffOrAbove()` — cashier/staff need the default to price installment transactions, but only admins can change it (enforced server-side, not just hidden in the UI).

---

## Date handling convention

MySQL `DATE` columns (`birth_date`, `transaction_date`, `due_date`, `purchase_date`, etc.)
become plain **ISO strings** (`'YYYY-MM-DD'`) in Firestore, not Timestamps — this avoids
timezone-shift bugs where a pure calendar date gets reinterpreted across midnight in a
different timezone. MySQL `DATETIME`/`TIMESTAMP` columns (`created_at`, `updated_at`)
become Firestore **Timestamps**, since those genuinely represent an instant, not a date.

---

## Security Rules implications

This finalizes and slightly revises the `firestore.rules` drafted in Module 0:

- `customers`: change from `allow create, update: if isStaffOrAbove()` to **`allow write: if false`** — all writes now go through Cloud Functions (per the revision above). Reads unchanged (`isStaffOrAbove()`).
- `inventory`: unchanged — direct client `create`/`update` for staff+, `delete: if false`.
- `inventory/{id}/units`: unchanged — `if false` (Cloud Functions only).
- `transactions`, `partsTransactions`, their subcollections, `counters`: unchanged — `if false`.
- New: `unitEngineNumbers`, `unitChassisNumbers`, `customerEmails` — `allow read, write: if false`.
- New: `aiChatSessions` (+ `messages` subcollection), `aiUserMemory` — `allow read, write: if false`, with **no** `isStaffOrAbove()` read carve-out (unlike the collections above) — see the AI Assistant section earlier in this doc and `docs/ai-assistant.md`.
- New: `settings` — `allow read: if isStaffOrAbove(); allow write: if false;` (write only via `updateSettings`, `assertAdmin`).

I'll apply this rules update at the start of Module 2, alongside the actual `createCustomer`/`updateCustomer`/`deleteCustomer` functions.

---

## Cloud Functions inventory (full picture)

**Built (Module 1):** `createStaffUser`, `updateStaffUser`, `deleteStaffUser`

**Module 2 — Customers:** `createCustomer`, `updateCustomer`, `deleteCustomer`
*(revised from direct-write per the analysis above)*

**Module 3 — Inventory:** `addInventoryUnit`, `deleteInventoryUnit`, `deleteInventoryItem`

**Module 4 — Transactions:** `createTransaction`, `recordPayment`, `deleteTransaction`,
`bulkDeleteTransactions`, plus a scheduled `flagOverdueInstallments` (nightly batch job
replacing the old flip-on-read `Pending`→`Overdue` logic in `get-installment-payments.php`)

**Module 5 — Parts Transactions:** `createPartsTransaction`, `deletePartsTransaction`,
`bulkDeletePartsTransactions`

**Module 6 — Dashboard/Analytics:** `getDashboardStats`, `getPredictiveAnalysis`
(read-only, but still server-side for Firestore Aggregation Queries + cross-collection reads)

**Module 7 — Notifications:** `sendDuePaymentReminders` (scheduled) and `sendPaymentConfirmationEmail`
(fired from `recordPayment`). Both send directly through Brevo's API (`server/src/email.js`)
rather than the `mail`/Trigger-Email-extension pattern — that collection is no longer written
to by this app, kept only for backward compatibility with anything else that might reference it.

**Module 8 — AI:** `listAiSessions`, `createAiSession`, `getAiSessionMessages`,
`renameAiSession`, `deleteAiSession`, `aiChat` (persisted history, live-database tool
access, cross-session memory — see `docs/ai-assistant.md`). Note: these now live in the
Express API (`server/src/routes/ai.js`), not Cloud Functions — `functions/src/ai.ts` is a
pre-migration stub left in place but superseded, same as the rest of `functions/`.

**Module 9 — Admin Settings:** `getSettings` (`assertStaffOrAbove`), `updateSettings`
(`assertAdmin`) — shop-wide config, currently the default installment markup percentage
used by `Transaction.jsx`/`NewTransaction.jsx` when pricing motorcycle Installment sales.
