# 02 — Mini Financial Platform (KudiFlow)

> **House of Practice — 72-Hour Technical Challenge**  
> A functional prototype of a digital financial platform engineered for financial correctness, double-entry ledger integrity, and fault tolerance.

![KudiFlow Architecture](docs/architecture.png)

---

## 1. System Capabilities

The prototype implements all required user flows end-to-end with real database state (zero mock data):

| Required Capability | Implementation Details | Endpoint / Screen |
| :--- | :--- | :--- |
| **Create an account** | Full name, Ghana phone (`+233...`), email, password, and 4-digit PIN | `POST /api/auth/register`<br>`mobile/app/(auth)/register.tsx` |
| **Log in** | Credential auth, bcrypt verification, dual JWT (access & refresh token) | `POST /api/auth/login`<br>`mobile/app/(auth)/login.tsx` |
| **View balance** | Real-time, server-authoritative wallet balance directly from PostgreSQL | `GET /api/users/me/account`<br>`mobile/components/ui/BalanceCard.tsx` |
| **Initiate a transaction** | Recipient lookup, fee calculation, slide-to-send gesture, mandatory PIN | `POST /api/transactions`<br>`mobile/app/send/review.tsx` |
| **Receive transaction status**| Atomic processing modal, instant feedback, and safe polling endpoint | `GET /api/transactions/:id/status`<br>`mobile/app/send/processing.tsx` |
| **View transaction history** | Paginated ledger feed with type filtering (All, Sent, Received) | `GET /api/transactions`<br>`mobile/app/(app)/(tabs)/transactions.tsx` |
| **View transaction details** | Comprehensive receipt with reference, status, fee, sender & recipient | `GET /api/transactions/:id`<br>`mobile/app/transactions/[id].tsx` |

---

## 2. System Considerations

### Authentication & Authorization
* **Authentication**: Passwords hashed with `bcrypt` (cost factor 12). Authenticated requests use short-lived JWT access tokens (15m) and secure refresh tokens (7d) stored in hardware keystores (`expo-secure-store`).
* **Two-Tier Security**: A valid login session **cannot** move funds. Every debit strictly requires a 4-digit bcrypt-hashed Transaction PIN verified inside the transaction boundary.
* **Authorization**: Strict tenant isolation on all endpoints; users can only view their own accounts, balances, transactions, and audit records.

### Input Validation
* Runtime schema enforcement using **Zod** on all routes.
* Phone numbers must strictly match Ghana E.164 formats (`+233...`).
* Monetary amounts must be positive, non-zero numbers with at most 2 decimal places.

### Transaction Integrity & Concurrency
* **ACID Guarantees**: All balance mutations execute inside an isolated PostgreSQL transaction (`BEGIN ... COMMIT`).
* **Pessimistic Row Locking (`SELECT ... FOR UPDATE`)**: Sender and recipient account rows are locked in **deterministic ascending ID order** (`ORDER BY id ASC`), eliminating race conditions and deadlocks under concurrent load.
* **Double-Entry Ledger**: Every transaction atomically generates paired debit and credit entries in `ledger_entries`. Account balances match ledger sums.
* **Database Constraint Defense**: The `accounts` table enforces `CHECK (balance >= 0)`. Even if application logic fails, the database engine physically rejects any overdraft.

### Duplicate Transactions (Idempotency)
* Client sends a unique `Idempotency-Key` header (UUID) for each payment intent.
* The server stores the SHA-256 hash of the request payload in `idempotency_keys`.
* **Retry with same payload**: Returns the cached response immediately without re-executing money movement.
* **Retry with modified payload**: Returns `409 Conflict`.
* **UI Defense**: Tactile Swipe-to-Send gesture control prevents accidental double-clicks; submit state is locked on swipe completion.

### Failed Transactions & Rollback
* If an error occurs (insufficient funds, incorrect PIN, system failure), the database transaction issues a full **`ROLLBACK`**.
* No partial debits can ever occur. Failed attempts are recorded in `audit_logs` without altering financial state.

### Audit Logs
* Append-only `audit_logs` table records actor ID, action type, IP address, user-agent, entity references, and before/after metadata.
* Sensitive fields (passwords, PINs) are strictly sanitized prior to persistence.

### Error Handling
* Standardized RFC 7807 problem details format: `{ success: false, error: { code, message, details? } }`.
* Consistent HTTP status codes: `400` (Validation), `401` (Auth), `403` (Forbidden/Bad PIN), `404` (Not Found), `409` (Conflict/Idempotency), `422` (Insufficient Funds), `500` (Internal).

---

## 3. Edge-Case Scenarios

### What happens if the user clicks Send twice?
1. **Frontend**: The Swipe-to-Send slider replaces clickable buttons. Once swiped past 85%, the slider locks, enters the loading state, and disables further interaction.
2. **Backend**: The request includes an `Idempotency-Key`.
   - The first request acquires an in-flight lock and processes atomically.
   - The second identical request hits the idempotency layer, detects the existing key, and returns the cached transaction response with **zero duplicate debit or ledger entry**.
   - If two requests arrive concurrently at the exact same millisecond, the second encounters a unique key collision and yields a clean response once the first completes.

### What happens if the server fails during a transaction?
1. **Database Rollback**: All debits, credits, fee deductions, and ledger entries occur inside a single PostgreSQL transaction (`BEGIN ... COMMIT`). If the Node.js process crashes, the database connection drops, or an unhandled exception occurs mid-flight, PostgreSQL automatically triggers a **`ROLLBACK`**. Neither party is debited.
2. **Client Reconciliation**: When the client reconnects, it queries `GET /api/transactions/:id/status` using the transaction reference. If the transaction was not committed, the client knows it is safe to retry with the same idempotency key.

---

## 4. Question: What makes this behave like a financial system rather than a normal CRUD app?

| Normal CRUD Application | KudiFlow Financial System |
| :--- | :--- |
| `UPDATE accounts SET balance = balance - 50` directly in database. | **Pessimistic Row Locking (`SELECT ... FOR UPDATE`)**: Locks rows in ascending ID order before evaluating balance. |
| Single field mutation without auditability. | **Immutable Double-Entry Ledger**: Every movement creates paired debit and credit records in `ledger_entries`. |
| Relies on `if (balance >= amount)` in application code. | **Engine-Level Constraints**: `CHECK (balance >= 0)` in PostgreSQL guarantees zero overdrafts even if app crashes. |
| Re-running `POST /transfers` executes another payment. | **Cryptographic Idempotency**: `Idempotency-Key` + SHA-256 payload hash ensures exactly-once execution. |
| Login token is sufficient to trigger all actions. | **Two-Tier Authentication**: Separate 4-digit transaction PIN required for any money movement. |
| Floating-point math (`float` / `double`). | **Fixed-Point Precision**: `NUMERIC(15,2)` and integer pesewas eliminate IEEE-754 rounding bugs. |
| Updates overwrite past state silently. | **Tamper-Evident Audit Logging**: Append-only log captures every state change with before/after snapshots. |

---

## 5. Quick Start

### Prerequisites
* Node.js `20.x` or `24.x`
* PostgreSQL 15+ (or Neon serverless instance)
* npm / npx

### 1. Backend Setup
```bash
cd server
npm install
npm run db:migrate    # Run PostgreSQL migrations
npm run seed          # Seed canonical demo accounts (Ama & Kwame)
npm run dev           # Starts API server on http://localhost:5000
```

### 2. Mobile App Setup
```bash
cd mobile
npm install
npx expo start        # Launches Expo dev server (press 'w' for web, 'a' for android, 'i' for ios)
```

### 3. Run Automated Test Suite
```bash
cd server
npm test              # Executes Jest acceptance and unit test suites
```
> **Test Results**: **38 / 38 passed (100%)** across 5 test suites (`acceptance`, `features`, `idempotency`, `transaction`, `auth`).

### Demo Accounts (Post-Seed)
* **Sender (Ama Mensah)**: `+233245550192` | Password: `KudiFlow2024!` | PIN: `1234` | Balance: `GH₵ 4,850.00`
* **Recipient (Kwame Asante)**: `+233244100200` | Password: `KudiFlow2024!` | PIN: `1234` | Balance: `GH₵ 2,100.00`

---

## 6. Challenge Deliverables Directory

All required technical challenge artifacts are located in the [`docs/`](docs/) directory:

* 🏛️ **Architecture Diagram & Spec**: [`docs/architecture.md`](docs/architecture.md) & [`docs/architecture.png`](docs/architecture.png)
* 📖 **API Documentation**: [`docs/api-documentation.md`](docs/api-documentation.md)
* 🗄️ **Database Structure & ERD**: [`docs/database-structure.md`](docs/database-structure.md) & [`docs/database-diagram.png`](docs/database-diagram.png)
* 🧪 **Testing Evidence**: [`docs/testing-evidence.md`](docs/testing-evidence.md) *(Full Jest test reports & invariant verification)*
* 📐 **Technical Decisions**: [`docs/technical-decisions.md`](docs/technical-decisions.md) *(Trade-offs, locks, token strategy, database choices)*
* ⚠️ **Known Limitations**: [`docs/known-limitations.md`](docs/known-limitations.md) *(Production roadmap, external rails, compliance next steps)*
* 🎬 **Demo Script**: [`docs/demo-script.md`](docs/demo-script.md) *(Step-by-step verification walkthrough)*\n