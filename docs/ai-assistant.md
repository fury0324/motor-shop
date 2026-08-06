# AI Assistant — Chat History, Memory, and Database Tools

Reference for the "AI Helper" feature available in all three portals (`/admin/ai`,
`/cashier/ai`, `/staff/ai`). Covers what data it can persist, what data it can read from
Firestore, and every security check that gates both.

---

## 1. Components

| File | Responsibility |
|---|---|
| `server/src/routes/ai.js` | HTTP endpoints: session CRUD + `aiChat` (persistence, tool-calling loop, ownership checks) |
| `server/src/aiTools.js` | The fixed set of Firestore-reading functions ("tools") the model may call, plus role gating |
| `server/src/aiMemory.js` | Periodic background extraction of durable cross-session facts |
| `server/src/aiRateLimit.js` | Per-user sliding-window limiter on `POST /api/aiChat` |
| `server/src/openrouter.js` | Shared OpenRouter chat-completions client |
| `src/components/ai/AIAssistant.jsx` | Chat UI, mounted identically in all three portals |
| `src/components/ai/AISessionSidebar.jsx` | Session list — new/switch/rename/delete |
| `src/lib/aiApi.js` | Frontend API wrappers |

---

## 2. Data persisted (Firestore schema)

### `aiChatSessions/{sessionId}`
One document per chat thread.

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Owner. Always set from `req.auth.uid` server-side — **never** accepted from the client. |
| `title` | string | Defaults to `'New chat'`, auto-set from the first user message. |
| `messageCount` | number | Running count of persisted messages; also drives the memory-extraction cadence. |
| `lastMessagePreview` | string | Truncated last assistant reply, for the session list UI. |
| `createdAt` / `updatedAt` | Timestamp | Server timestamps. |

### `aiChatSessions/{sessionId}/messages/{messageId}`
| Field | Type | Notes |
|---|---|---|
| `role` | `'user' \| 'assistant'` | Only final turns are stored — intermediate tool-call/tool-result exchanges within a single `aiChat` request are never persisted. |
| `content` | string | Capped at write time (`MAX_MESSAGE_CHARS`/`MAX_CURRENT_MESSAGE_CHARS` in `ai.js`). |
| `createdAt` | Timestamp | |

### `aiUserMemory/{uid}`
One document per user (doc ID **is** the uid — there is no query needed to find "my" memory doc, which also makes it structurally impossible to fetch another user's by accident).

| Field | Type | Notes |
|---|---|---|
| `facts` | string | Bullet list of durable facts/preferences extracted from past conversations, capped ~2000 chars. |
| `updatedAt` | Timestamp | |

---

## 3. Isolation and security checks (chat data)

1. **Firestore rules deny all direct client access.** `aiChatSessions` (+ `messages` subcollection) and `aiUserMemory` are `allow read, write: if false` in `firestore.rules` — stricter than `customers`/`inventory`/`transactions`, which at least allow direct client *reads*. There is no legitimate client use case for reading chat data outside the API, so it's fully server-mediated.
2. **Every session-scoped endpoint checks ownership before touching data.** `assertOwnsSession(db, sessionId, uid)` in `ai.js` fetches the session doc and verifies `doc.data().uid === uid`; if not, it throws `HttpsError('not-found', ...)` — a 404, not a 403, so a request probing a foreign session ID can't even confirm it exists. This runs before `getAiSessionMessages`, `renameAiSession`, `deleteAiSession`, and `aiChat`.
3. **Memory is looked up strictly by the caller's own uid** (`db.collection('aiUserMemory').doc(uid)`, where `uid` always comes from the verified Firebase ID token) — never by a client-supplied ID.
4. **All writes go through firebase-admin (Admin SDK)**, which bypasses Firestore rules entirely — same pattern as every other collection in this app (see `docs/firestore-architecture.md`'s governing principle). The rules exist to block the browser from ever reaching these collections directly, not to grant the server access (the server already has full access via Admin SDK).

---

## 4. Database tools available to the AI

The model does **not** have a generic "run a Firestore query" tool. `server/src/aiTools.js` defines a fixed, closed set of parameterized functions — this is the entire surface area it can use to read the database. Each declares a `minRole`:

- `'staff'` — usable by `admin`, `cashier`, and `staff` (mirrors the existing `assertStaffOrAbove` check used by every other read route in this app).
- `'admin'` — usable by `admin` only (mirrors the existing `assertAdmin` check, e.g. on the user-management routes).

| Tool | minRole | Collection(s) read | Purpose |
|---|---|---|---|
| `list_customers` | staff | `customers` | Search by name/email/contact number |
| `get_customer_by_id` | staff | `customers` | One customer's details |
| `list_inventory` | staff | `inventory` | Search by name/brand/SKU/category/status |
| `get_inventory_item` | staff | `inventory` + `units` subcollection | One item's details + unit counts by status |
| `list_transactions` | staff | `transactions` | Search by status/payment type/customer/date range |
| `get_transaction_by_id` | staff | `transactions` + `installmentPayments` subcollection | One transaction + its payment schedule |
| `list_parts_transactions` | staff | `partsTransactions` | Search by date range |
| `get_dashboard_summary` | staff | (reuses `getDashboardStats(db)` from `routes/dashboard.js`) | Aggregate revenue/customer/inventory metrics |
| `list_users` | **admin** | `users` | Staff accounts by role/status |
| `get_user_summary` | **admin** | `users` | Staff account counts by role/status |

**Never accessible to any tool, at any role**: `counters`, `customerEmails`, `unitEngineNumbers`, `unitChassisNumbers`, `mail` — internal integrity/index collections with no query use case, consistent with their `if false` rules and the fact no other route in the app queries them either.

**Data minimization**: tool results return a hand-picked field subset, not raw documents. Notably, customer ID-document URLs (`documents.*Url`) and co-maker ID URLs are deliberately omitted from `list_customers`/`get_customer_by_id` even though staff can see them in the regular UI — the model has no legitimate need to see or repeat links to scanned ID photos.

**No new per-user scoping was introduced.** Tools return the same breadth of data that `assertStaffOrAbove` routes already expose to every staff/cashier/admin today (e.g. all transactions, not "only transactions I processed") — the app has no per-user data scoping anywhere else, so the AI's access intentionally matches the existing UI rather than being either more or less restrictive.

### Enforcement (defense in depth)

1. **Endpoint gate**: `aiChat` (and every session endpoint) requires `assertStaffOrAbove` — no anonymous/unauthenticated access.
2. **Tool list is filtered before the model ever sees it.** `toolsForRole(role)` in `aiTools.js` only includes `minRole: 'admin'` tools when `role === 'admin'`. A cashier's OpenRouter request literally never lists `list_users`/`get_user_summary` — the model has no way to know they exist.
3. **Server-side re-check on every tool call.** `executeTool(db, role, name, args)` re-validates `minRole` against the caller's role before running the handler — this defends against a misbehaving/compromised model response, not just a well-behaved one that only requests offered tools.
4. **Clamped query bounds.** Every `limit` argument is clamped server-side (`clampLimit`, max 25) regardless of what the model requests, preventing a prompt-engineered "list everything" from becoming a bulk data dump.
5. **Bounded tool-call loop.** At most `MAX_TOOL_ROUNDS = 3` rounds of tool calls per chat turn; if unresolved, one final call is made with tools disabled to force a plain-text answer — bounds worst-case latency/cost per message.

---

## 5. Memory extraction

`maybeExtractMemory()` in `aiMemory.js` runs **fire-and-forget** (not awaited) after each `aiChat` reply is sent, so it never adds latency to the user-facing response. It only actually calls the LLM every 8 messages in a session (`EXTRACT_EVERY_N_MESSAGES`), to bound the extra cost. It reads the session's own recent messages plus the caller's own `aiUserMemory/{uid}` doc, asks a small model to produce a deduplicated bullet list of durable facts (explicitly excluding transient figures like balances/counts, which go stale), and writes the result back to `aiUserMemory/{uid}` — always scoped to the same uid the chat request authenticated as.

The stored `facts` string is injected into the system prompt of future `aiChat` calls (`buildMemoryBlock()`), framed to the model as background context for tone/relevance — not a substitute for calling a tool when the user needs precise current data.

---

## 6. Rate limiting

`aiRateLimiter` (in-memory per-uid sliding window, 20 requests / 5 minutes) is applied only to `POST /api/aiChat`, since that's the endpoint that can trigger multiple paid OpenRouter calls and Firestore writes per request. Session CRUD endpoints are cheap reads/writes and stay unlimited.
