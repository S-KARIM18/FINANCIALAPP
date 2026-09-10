# KudiFlow
### Move money with confidence.

![KudiFlow Architecture](docs/architecture.png)

---

## 1. Overview

**KudiFlow** is a Ghana-context digital financial platform and mobile wallet prototype engineered specifically for the **House of Practice 72-Hour Technical Challenge**. 

The purpose of this prototype is to demonstrate how a modern fintech system operating in the Ghanaian mobile money and digital payments landscape can guarantee **uncompromising financial correctness, atomic ledger consistency, and double-entry integrity**—even in the presence of mobile network dropouts, concurrent transfers, retry storms, and transient database latency.

> [!NOTE]
> **Regulatory Disclaimer**: KudiFlow is a technical challenge prototype developed solely for architectural evaluation and technical assessment. It is **not** a licensed financial institution and does not hold an Electronic Money Issuer (EMI) or Payment Service Provider (PSP) license from the Bank of Ghana. External funding rails and billers are clearly labelled and execute in an internal simulation sandbox.

---

## 2. Challenge Requirements Addressed

| Requirement Category | Specific Challenge Requirement | Implementation Status | Evidence / Verification Location |
| :--- | :--- | :---: | :--- |
| **Account Creation** | Registration with full name, phone (+233 format), email, strong password | **Complete** | `POST /api/auth/register`, `register.tsx`, `tests/auth.test.ts` |
| **Login & Auth** | Credential authentication, JWT access/refresh token rotation | **Complete** | `POST /api/auth/login`, `login.tsx`, `auth.middleware.ts` |
| **Balance Display** | Server-authoritative wallet balance, zero mock state | **Complete** | `GET /api/users/me/account`, `BalanceCard.tsx`, `home.tsx` |
| **Transaction Initiation** | Send Money flow with recipient lookup, fee schedule, slider gesture | **Complete** | `POST /api/transactions`, `review.tsx`, `tests/transaction.test.ts` |
| **Transaction Status** | Lightweight polling endpoint for uncertain network states | **Complete** | `GET /api/transactions/:id/status`, `unknown.tsx` |
| **Transaction History** | Paginated ledger feed with filters (sent, received, all) | **Complete** | `GET /api/transactions`, `transactions.tsx` |
| **Transaction Details** | Comprehensive receipt with reference, status, sender, recipient, fee | **Complete** | `GET /api/transactions/:id`, `[id].tsx` |
| **Authentication & PIN** | Mandatory 4-digit bcrypt transaction PIN required before money moves | **Complete** | Interactive PIN modal, `verifyPin()`, `tests/acceptance.test.ts` |
| **Authorization** | Strict user isolation; users cannot access un-owned transactions | **Complete** | `auth.middleware.ts`, `tests/transaction.test.ts` |
| **Input Validation** | Strict Zod schemas validating amounts, phone numbers, UUIDs | **Complete** | `validate.middleware.ts`, `AppError.ts` |
| **Transaction Integrity** | Atomic debit/credit within a single PostgreSQL transaction | **Complete** | `withTransaction()`, `tests/acceptance.test.ts` |
| **Duplicate Protection** | Mandatory client `Idempotency-Key` with SHA-256 payload fingerprinting | **Complete** | `idempotency_keys` table, `tests/idempotency.test.ts` |
| **Failed Transactions** | Insufficient funds, bad PIN, or self-transfer handled with 0 partial debits | **Complete** | Invariant rollbacks, `tests/transaction.test.ts` |
| **Audit Logging** | Append-only audit log of all financial events with PII sanitization | **Complete** | `audit_logs` table, `tests/acceptance.test.ts` |
| **Error Handling** | Standardized JSON error response format with domain error codes | **Complete** | `error.middleware.ts`, `AppError.ts` |
| **Network Uncertainty** | Safe retry without duplicate debits; "Checking payment..." state | **Complete** | Idempotency cache lookup, `unknown.tsx` |

---

## 3. Key Features

1. **Authentication & Session Lifecycle**:
   - Secure phone/email login with bcrypt password hashing (cost factor 12).
   - Dual-token architecture: 15-minute access tokens and 7-day refresh tokens.
   - Hardware-backed token storage on mobile devices using `expo-secure-store` (iOS Keychain / Android Keystore).
2. **Digital Wallet & Server-Authoritative Balances**:
   - Real-time balance retrieval directly from PostgreSQL.
   - Zero hardcoded mock transactions on Home and Ledger dashboards.
   - Exact Ghana Cedi (`GHS`) formatting with non-negative engine constraint.
3. **Send Money & Slide to Send**:
   - Recipient phone validation (Ghana format: `+233...`).
   - Server-side fee calculation schedule.
   - Fluid physical slider gesture that requires holding and sliding to completion.
4. **Mandatory PIN Authorization**:
   - Interactive 4-digit PIN authentication bottom-sheet modal.
   - Bcrypt PIN verification inside the database transaction boundary.
   - Zero money movement if the PIN is missing or invalid.
5. **Add Money (Prototype Sandbox Rail)**:
   - Funding modal supporting simulated MTN Mobile Money, Telecel Cash, and Bank Cards.
   - Funds atomically debit an internal System Settlement Reserve Account (`1000000000`) and credit the user wallet.
6. **Utility Bill Payments**:
   - Direct bill payment to ECG Prepaid Electricity, Ghana Water (GWCL), MTN Fiber, and DSTV.
   - Account/meter number validation with mandatory PIN authentication and GH₵ 1.00 fee.
7. **Peer-to-Peer Payment Requests**:
   - Create outbound payment requests with optional notes.
   - "Incoming" requests tab allows payers to review, authorize with PIN, or decline.
8. **Tamper-Evident Audit Trail**:
   - Append-only `audit_logs` table recording all financial, deposit, and auth events.
   - Strict PII sanitization policy: passwords and PINs are strictly stripped from metadata.
9. **Atomic Transaction Reversal**:
   - One-touch atomic reversal crediting funds back to sender and linking reversal ledger rows.
   - Prevents double-reversals via database check constraints.

---

## 4. Technology Stack

### Mobile Application (`mobile/`)
* **Framework**: React Native `0.86.3` with Expo `~57.0.21` and Expo Router `~57.0.20`.
* **Language**: TypeScript `~6.0.3` (Checked with `npx tsc --noEmit` — 0 errors).
* **State Management**: Zustand `^5.0.15` (independent lightweight stores for Auth and Wallet).
* **Networking**: Axios `^1.20.0` with custom request/response interceptors for Bearer JWT injection.
* **Security & Storage**: `expo-secure-store ~57.0.3` for hardware-encrypted token persistence.
* **UI & Gestures**: `react-native-gesture-handler ~2.32.0` and `react-native-reanimated 4.5.1` for 60fps slider animations.

### Backend API Server (`server/`)
* **Runtime**: Node.js `v24.13.0` with Express `^4.19.2`.
* **Language**: TypeScript `^5.5.3` (Checked with `npx tsc --noEmit` — 0 errors).
* **Database Driver**: `pg ^8.12.0` with connection pooling and SSL encryption.
* **Validation**: Zod `^3.23.8` for runtime request schema enforcement.
* **Security & Cryptography**: `bcrypt ^5.1.1` (cost factor 12), `jsonwebtoken ^9.0.2`, `helmet ^7.1.0`, `express-rate-limit ^7.3.1`.
* **Testing Framework**: Jest `^29.7.0`, `ts-jest ^29.2.2`, `supertest ^7.0.0`.

### Database
* **Database Engine**: PostgreSQL 16 (Hosted on Neon Serverless with AWS `eu-west-2` multi-AZ storage).
* **Precision**: All financial calculations use `NUMERIC(15,2)` and integer pesewas.

---

## 5. System Architecture

```
Mobile App (React Native Expo 57)
       │
       ▼  HTTPS REST API (Authorization: Bearer JWT, Idempotency-Key)
Express 4 + TypeScript Gateway
       │
       ├── Middleware: Helmet, CORS, Rate Limiters, Auth Verification, Zod Validator
       │
       ▼
Application Services (transaction.service.ts, auth.service.ts, payment-request.service.ts)
       │
       ▼  Atomic Transaction Boundary (withTransaction)
PostgreSQL Database (Neon)
       ├── Accounts Table (Pessimistic Locks: SELECT FOR UPDATE)
       ├── Transactions Table (Ledger Entries)
       ├── Idempotency Keys Table (Hash verification & Caching)
       ├── Audit Logs Table (Append-only audit trail)
       └── Notifications Table (User alerts)
```

1. **Client Layer**: Manages user input, animations, and token storage. Captures payment intent and generates a unique `Idempotency-Key` UUID for each send attempt.
2. **Gateway & Middleware Layer**: Terminates requests, applies security headers via Helmet, filters origins via CORS, enforces rate limits, validates JWT claims, and parses request schemas using Zod.
3. **Services Layer**: Orchestrates business rules, enforces the Ghana fee schedule, verifies bcrypt PIN hashes, and opens database transactions.
4. **Database Layer**: Sole authority of truth. Manages pessimistic row locks (`SELECT FOR UPDATE`), validates balance bounds, executes atomic double-entry updates, and commits ledger entries.

---

## 6. Transaction Architecture: The Send-Money Flow

```
[User Swipes Slider] 
       │
       ▼
[Enter 4-Digit PIN] (Modal captures PIN; never persisted to AsyncStorage)
       │
       ▼
[Client Generates Idempotency-Key] (UUID v4 attached to HTTP header)
       │
       ▼
[POST /api/transactions] ─── (Bearer JWT, Idempotency-Key, Body: { phone, amount, pin, note })
       │
       ▼
[JWT & Zod Validation] (Rejects malformed payloads with 422, unauthenticated with 401)
       │
       ▼
[BEGIN Database Transaction]
       │
       ├── 1. Check Idempotency Table:
       │      - If key exists & COMPLETED: Return cached transaction receipt immediately.
       │      - If key exists & parameters differ: Throw 409 IDEMPOTENCY_KEY_REUSED.
       │      - If key is new: Insert key with status 'PROCESSING'.
       │
       ├── 2. Verify Sender Transaction PIN:
       │      - Fetch sender `pin_hash` from `users` table.
       │      - Verify via `bcrypt.compare(pin, pin_hash)`.
       │      - If invalid: Delete idempotency key, ROLLBACK, throw 401 INVALID_PIN.
       │
       ├── 3. Acquire Pessimistic Row Locks:
       │      - Lock Sender Account: `SELECT * FROM accounts WHERE user_id = $1 FOR UPDATE`
       │      - Lock Recipient Account: `SELECT * FROM accounts WHERE phone = $2 FOR UPDATE`
       │      - (Locks acquired in deterministic account.id order to prevent deadlocks)
       │
       ├── 4. Server Fee Calculation & Balance Check:
       │      - Fee = 0.00 if amount <= 50.00; Fee = 2.00 if amount > 50.00.
       │      - Total = Amount + Fee.
       │      - If `balance < Total`: Mark key 'FAILED', ROLLBACK, throw 422 INSUFFICIENT_FUNDS.
       │
       ├── 5. Atomic Double-Entry Ledger Movement:
       │      - `UPDATE accounts SET balance = balance - Total WHERE id = sender.id`
       │      - `UPDATE accounts SET balance = balance + Amount WHERE id = recipient.id`
       │
       ├── 6. Record Ledger Entry:
       │      - `INSERT INTO transactions (reference, amount, fee, total_amount, status='COMPLETED')`
       │
       ├── 7. Audit Logging & Notifications:
       │      - `INSERT INTO audit_logs (event='TRANSFER_COMPLETED', metadata)`
       │      - `INSERT INTO notifications (user_id, type='TRANSFER', ...)`
       │
       └── 8. Commit Idempotency Key:
              - `UPDATE idempotency_keys SET status='COMPLETED', transaction_id=...`
              - COMMIT Transaction
       │
       ▼
[201 Created Response] ─── Returns verified transaction receipt to Mobile Client
       │
       ▼
[Success Screen] ─── Displays reference, fee, recipient, and updated ledger balance
```

---

## 7. Why KudiFlow Is a Financial System Rather Than CRUD

Traditional CRUD applications treat balances as simple column fields modified via `UPDATE users SET balance = $newBalance`. In a financial environment, this pattern guarantees race conditions, phantom money creation, and catastrophic balance drift. KudiFlow implements true financial engineering:

1. **Atomicity (All-or-Nothing)**: Balance deductions, recipient credits, and ledger entries occur inside a single PostgreSQL transaction block (`withTransaction`). If an error or crash occurs at any point, the entire operation rolls back.
2. **Pessimistic Concurrency (`SELECT FOR UPDATE`)**: Before evaluating a balance, the database locks the account row. Concurrent requests cannot read a stale balance while an in-flight transfer is completing.
3. **Exact Decimal Precision (`NUMERIC(15,2)`)**: Floating-point data types (`FLOAT`, `DOUBLE`) suffer from IEEE 754 precision loss. KudiFlow uses integer pesewas in code and `NUMERIC(15,2)` in PostgreSQL.
4. **Cryptographic Idempotency**: Mobile network retries never double-charge. Each transfer is bound to an `Idempotency-Key`. Re-submitting the same request returns the existing transaction.
5. **Server-Authoritative Balances**: The client never computes or transmits balances. The database is the sole authority.
6. **State Machine Invariants**: Transactions transition through explicit lifecycle states (`PENDING` → `PROCESSING` → `COMPLETED` | `FAILED` | `REVERSED`).
7. **Database Engine Invariants**: Declarative SQL `CHECK` constraints (`balance >= 0`, `amount > 0`, `total_amount = amount + fee`) prevent illegal records even if an application bug bypassed service logic.

---

## 8. Database Design

![KudiFlow Database Diagram](docs/database-diagram.png)

Detailed schema documentation is available in [`docs/database-structure.md`](docs/database-structure.md).

### Core Tables & Invariants:
* **`users`**: User records with unique phone (`+233...`) and email, separate `password_hash` and `pin_hash`.
* **`accounts`**: Single account per user, currency constrained to `'GHS'`, strictly enforced `CHECK (balance >= 0)`.
* **`transactions`**: Double-entry ledger rows recording `reference`, `amount`, `fee`, `total_amount`, and `status`. Constrained by `CHECK (total_amount = amount + fee)` and `CHECK (sender_account_id != recipient_account_id)`.
* **`idempotency_keys`**: Composite primary key `(user_id, key)` isolating user namespaces. Stores SHA-256 `request_hash`, cached response body, and 24-hour expiration TTL.
* **`payment_requests`**: Peer-to-peer inbound and outbound payment requests with status (`PENDING`, `PAID`, `DECLINED`, `CANCELLED`).
* **`audit_logs`**: Append-only audit record of financial and security events with JSONB metadata and IP tracking.
* **`notifications`**: User alert log populated atomically during financial events.

---

## 9. API Documentation

Comprehensive REST documentation with example payloads is located in [`docs/api-documentation.md`](docs/api-documentation.md).

### Endpoint Quick Reference

| Method | Endpoint | Auth | Headers | Purpose |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/auth/register` | None | None | Register new user account |
| `POST` | `/api/auth/verify-otp` | None | None | Verify phone with 6-digit OTP |
| `POST` | `/api/auth/set-pin` | Bearer JWT | None | Configure mandatory 4-digit PIN |
| `POST` | `/api/auth/login` | None | None | Authenticate with phone/email and password |
| `POST` | `/api/auth/refresh` | None | None | Rotate access token via refresh token |
| `GET` | `/api/users/me` | Bearer JWT | None | Get authenticated user profile |
| `GET` | `/api/users/me/account` | Bearer JWT | None | Get live wallet balance and account details |
| `POST` | `/api/transactions` | Bearer JWT | `Idempotency-Key` | Execute atomic transfer (requires PIN) |
| `POST` | `/api/transactions/deposit` | Bearer JWT | `Idempotency-Key` | Sandbox deposit from Settlement Reserve |
| `POST` | `/api/transactions/bill-pay` | Bearer JWT | `Idempotency-Key` | Pay utility bill (ECG, GWCL, MTN, DSTV) |
| `GET` | `/api/transactions` | Bearer JWT | None | List paginated transaction history |
| `GET` | `/api/transactions/:id` | Bearer JWT | None | Get transaction details (sender/recipient only) |
| `GET` | `/api/transactions/:id/status` | Bearer JWT | None | Check transaction status during network uncertainty |
| `POST` | `/api/transactions/:id/reverse` | Bearer JWT | None | Reverse completed transaction |
| `POST` | `/api/payment-requests` | Bearer JWT | None | Create peer payment request |
| `GET` | `/api/payment-requests` | Bearer JWT | None | List inbound/outbound payment requests |
| `POST` | `/api/payment-requests/:id/pay` | Bearer JWT | `Idempotency-Key` | Pay inbound request with PIN |
| `GET` | `/health` | None | None | Server and database health check |

---

## 10. Security Architecture

1. **Password Security**: Passwords hashed using `bcrypt` with a cost factor of 12 (computationally expensive against brute-force).
2. **Transaction PIN Isolation**: The 4-digit PIN is stored as an independent bcrypt hash (`users.pin_hash`). It is never stored in `localStorage` or `AsyncStorage` and is only sent during transaction submission.
3. **Session Tokens**: HMAC-SHA256 JWT tokens with short-lived 15-minute access tokens and 7-day refresh tokens.
4. **Hardware-Backed Storage**: Mobile client uses `expo-secure-store` which writes to iOS Keychain and Android Keystore with AES-256 GCM encryption.
5. **Ownership & Scope Checks**: Users can only access their own accounts and transactions. Querying another user's transaction returns `403 Forbidden`.
6. **Sanitized Audit Trail**: Passwords, raw PINs, and authentication tokens are strictly forbidden from the `audit_logs` metadata.
7. **Rate Limiting**: Tiered rate limiting protects against brute-force login attempts (10 req/15min) and OTP spamming (3 req/min).

---

## 11. Error Handling

Errors are returned in a uniform, machine-readable JSON structure:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Insufficient balance. Available: GH₵ 4850.00, Required: GH₵ 5002.00",
    "details": null
  }
}
```

* **`VALIDATION_ERROR` (422)**: Payload failed Zod schema validation.
* **`INVALID_CREDENTIALS` (401)**: Wrong password or unrecognized user identifier.
* **`INVALID_PIN` (401)**: Incorrect 4-digit transaction PIN.
* **`FORBIDDEN` (403)**: User attempted to view or reverse a transaction they do not own.
* **`NOT_FOUND` (404)**: Recipient phone number or transaction ID does not exist.
* **`IDEMPOTENCY_KEY_REUSED` (409)**: Re-used idempotency key with different financial parameters.
* **`INSUFFICIENT_FUNDS` (422)**: Wallet balance is less than `amount + fee`.
* **`INTERNAL_ERROR` (500)**: Unhandled server exceptions; internal stack traces are suppressed in production.

---

## 12. Transaction Failure Scenarios

* **Insufficient Balance**: The transaction evaluates `balance < totalAmount` under a pessimistic row lock, marks the idempotency key as `FAILED`, and issues an immediate rollback. Available balance remains untouched.
* **Duplicate Send**: The mobile app generates a single idempotency key for the send screen mount. If the user taps Send multiple times or a network retry fires, the backend returns the initial completed transaction receipt with `cached: true` and executes zero duplicate debits.
* **Payload Tampering on Existing Key**: If an attacker attempts to reuse an idempotency key with modified financial values, the backend detects a hash mismatch between the request parameters and stored `request_hash`, rejecting the request with `409 Conflict`.
* **Network Timeout After Submission**: If a mobile network timeout drops the connection before the response arrives, the client mounts the **Unknown Status** screen. Polling `GET /api/transactions/:id/status` retrieves the final state without risking re-submission.
* **Reversal Integrity**: Reversals verify that `status === 'COMPLETED'` and `reversal_of IS NULL`. The original transaction is credited back, a linked `REVERSAL` transaction is inserted, and subsequent reversal attempts are rejected.

---

## 13. Setup & Installation Instructions

### Prerequisites
* **Node.js**: Version `v20.x` or `v24.x`
* **npm**: Version `10.x` or higher
* **PostgreSQL Database**: A running PostgreSQL 15+ instance or a free Neon Serverless PostgreSQL database.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/kudiflow.git
cd kudiflow

# Install all workspace dependencies from root
npm install
```

### 2. Configure Environment Variables
Copy the sanitized environment template:
```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your PostgreSQL connection string and random JWT secrets:
```env
DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require
JWT_SECRET=your_32_char_minimum_jwt_secret_key_here
JWT_REFRESH_SECRET=your_32_char_minimum_refresh_secret_key_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:8081,exp://localhost:8081
```

### 3. Apply Database Migrations & Seed Baseline Data
```bash
# Apply migrations (001_initial_schema, 002_seed_data, 003_challenge_features)
npm run db:migrate

# Seed baseline demo accounts (Ama, Kwame, Kofi, Reserve, Billers)
npm run db:seed
```

### 4. Start the Express API Server
```bash
npm run server
# Server boots at http://localhost:3000
# Health check available at http://localhost:3000/health
```

### 5. Start the Mobile Client
```bash
npm run mobile
# Launches Metro bundler. Scan QR code with Expo Go on Android or iOS.
```

> [!TIP]
> **Testing on a Physical Device**: When scanning the QR code on a physical mobile device, ensure your phone and computer are on the same Wi-Fi network. `mobile/constants/api.ts` automatically detects your development computer's LAN IP via Expo Constants.

---

## 14. Demo Credentials

The database seed establishes the canonical starting accounts for technical evaluation:

| User | Phone Identifier | Starting Balance | Demo PIN | Demo Password | Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ama Mensah** | `+233245550192` | **GH₵ 4,850.00** | `1234` | `KudiFlow2024!` | Primary Sender |
| **Kwame Asante** | `+233244100200` | **GH₵ 2,100.00** | `1234` | `KudiFlow2024!` | Primary Recipient |
| **Kofi Boateng** | `+233200110022` | **GH₵ 1,500.00** | `1234` | `KudiFlow2024!` | Secondary Contact |
| **Settlement Reserve** | `+233240000000` | **GH₵ 9,999,250.00** | `1234` | `KudiFlow2024!` | Liquidity Reserve |

*(All demo credentials are for development and testing evaluation only).*

---

## 15. Testing & Verification

Automated test logs are detailed in [`docs/testing-evidence.md`](docs/testing-evidence.md).

```bash
# Execute entire test suite
npm run test --workspace=server
```

### Verification Matrix

| Test Suite | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :---: |
| `tests/acceptance.test.ts` (7 tests) | Ama sends 500+2 fee to Kwame -> Ama=4348, Kwame=2600. PIN checks, duplicate protection, 409 conflict, reversal. | All 7 tests passed cleanly (35.98 s) | **PASS** |
| `tests/features.test.ts` (7 tests) | Sandbox deposit, ECG bill payment with fee, inbound/outbound payment requests. | All 7 tests passed cleanly (107.16 s) | **PASS** |
| `tests/idempotency.test.ts` (3 tests) | 3x replay produces 1 debit; parameter tampering rejected with 409; user key isolation. | All 3 tests passed cleanly (29.61 s) | **PASS** |
| `tests/transaction.test.ts` (12 tests) | Atomicity, row locking, balance checks, double reversal prevention, concurrency safety. | All 12 tests passed cleanly (59.82 s) | **PASS** |
| `tests/auth.test.ts` (9 tests) | Registration, login, duplicate phone rejection, token refresh, health check. | All 9 tests passed cleanly (20.95 s) | **PASS** |
| `server` TypeScript Check | `npx tsc --noEmit` exits code 0 | 0 errors | **PASS** |
| `mobile` TypeScript Check | `npx tsc --noEmit` exits code 0 | 0 errors | **PASS** |

---

## 16. Known Limitations

A complete analysis is documented in [`docs/known-limitations.md`](docs/known-limitations.md).

* **Simulated External Funding Rails**: Direct deposits (Add Money) debit an internal System Settlement Reserve account (`1000000000`) rather than a live GhIPSS or mobile money aggregator.
* **Simulated Utility Gateways**: Bill payments settle into official biller accounts within PostgreSQL rather than external utility APIs.
* **Development OTP Logging**: For testing ease, SMS verification codes are logged to the backend console rather than sent via paid telco SMS gateways.
* **Smart Pot Savings Calculations**: The high-yield savings drawer (14.5% p.a.) features an interactive calculator; automated daily interest cron distribution is planned for future iterations.

---

## 17. Technical Decisions

Architecture Decision Records (ADRs) are documented in [`docs/technical-decisions.md`](docs/technical-decisions.md).

* **Why PostgreSQL?**: ACID guarantees, native row locking (`SELECT FOR UPDATE`), and SQL `CHECK` constraints.
* **Why `NUMERIC(15,2)`?**: Eliminates floating-point rounding errors and penny leaks.
* **Why Idempotency Keys?**: Guarantees zero double-debits across unreliable cellular networks.
* **Why Deterministic Lock Ordering?**: Eliminates database deadlocks during bidirectional concurrent transfers.
* **Why Separate Transaction PIN?**: Isolates monetary authorization from account authentication.
* **Why `expo-secure-store`?**: Ensures JWT tokens reside in hardware-encrypted iOS Keychain and Android Keystore.

---

## 18. Architecture Diagram

The high-resolution architecture diagram is located at [`docs/architecture.png`](docs/architecture.png) with accompanying technical breakdown in [`docs/architecture.md`](docs/architecture.md).

---

## 19. Application Screens & Verification Points

The mobile interface is organized into cohesive, production-ready screens:

1. **Onboarding & Authentication** (`(auth)/`):
   - Welcome onboarding screen with feature highlights.
   - Login screen with phone/email credentials and password visibility toggling.
   - Registration screen with client-side Ghana phone format enforcement.
2. **Home Dashboard** (`(app)/(tabs)/home.tsx`):
   - Balance card with live GHS indicator and balance visibility toggle.
   - Quick action squares: **Send**, **Add money**, **Request**, and **Pay Bills**.
   - Live recent transactions list with real-time receipts.
3. **Send & Review Flow** (`send/`):
   - Transfer amount configuration and recipient selector.
   - Review screen with server fee breakdown (`Amount + Fee = Total Deduction`).
   - Swipeable "Slide to Send" thumb button.
   - Tactile 4-digit PIN authentication modal.
4. **Settlement & Details** (`transactions/`):
   - Processing animation smoothly transitioning to Success screen.
   - Detailed transaction receipt with public reference, timestamp, status, sender, and recipient.
5. **Interactive Feature Modals**:
   - `AddMoneyModal.tsx`: Prototype sandbox deposit rail.
   - `PayBillsModal.tsx`: Utility settlement (ECG, GWCL, MTN Fiber, DSTV) with PIN verification.
   - `RequestMoneyModal.tsx`: Peer-to-peer payment requests and incoming payment approval.
   - `NotificationsModal.tsx`: Real-time notification feed with read tracking.
   - `SandboxInfoModal.tsx`: Cryptographic invariants and architecture overview.
   - `SavingsModal.tsx`: High-yield Smart Pot savings projection calculator.

---

## 20. Final Challenge Question: Financial System vs. CRUD Application

> **Question**: *What did you do to make your system behave like a financial system rather than a normal CRUD application?*

### The Engineering Reality:
A normal CRUD application models a financial transfer by executing two disjoint updates:
```sql
-- The CRUD Anti-Pattern (Vulnerable to race conditions and phantom money)
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
```
If the server crashes between those two lines, money is destroyed. If two transfers execute simultaneously, balances overwrite each other. If network packets duplicate, users are debited twice.

### How KudiFlow Implements a True Financial System:
1. **Pessimistic Concurrency & Atomic Boundaries**:
   Every transfer executes inside `withTransaction()`. Account rows are locked via `SELECT ... FOR UPDATE` in deterministic ID order. Concurrent transfers wait their turn; dirty reads and race conditions are mathematically impossible.
2. **Double-Entry Ledger Integrity**:
   Money is never simply changed in place. Every movement generates an immutable row in the `transactions` ledger table where `total_amount = amount + fee`.
3. **Database Engine Invariant Enforcement**:
   Declarative SQL constraints enforce integrity at the storage engine: `CHECK (balance >= 0)` ensures no account can ever have a negative balance; `CHECK (amount > 0)` prevents negative money transfers; and `CHECK (total_amount = amount + fee)` enforces fee conservation.
4. **Cryptographic Idempotency Guard**:
   Every transaction requires a unique `Idempotency-Key` and stores a SHA-256 fingerprint of the request payload. Replays return the cached transaction; tampered replays are rejected with `409 Conflict`.
5. **Separation of Authentication and Monetary Authorization**:
   Session passwords authenticate who the user is; a dedicated 4-digit bcrypt transaction PIN authorizes the release of funds.
6. **Immutable Audit Trail**:
   All financial events append an entry to `audit_logs` with contextual metadata and client IPs, with strict redaction of sensitive credentials.

---

## 21. If I Had Another 72 Hours, I Would...

With an additional 72 hours, I would focus entirely on production readiness and infrastructure resilience:

1. **Integrate Real-World Payment Aggregators**:
   Implement live webhook handlers and STK push prompts for Hubtel and Paystack Ghana to bridge the prototype sandbox rail into production MoMo networks.
2. **Redis Distributed Locking & Caching**:
   Introduce a Redis caching layer for read-heavy account and notification queries, while keeping PostgreSQL as the write-authoritative ledger.
3. **Automated End-to-End Detox Testing**:
   Build automated Detox E2E tests running on headless Android and iOS simulators to exercise slider gestures, PIN pads, and navigation transitions.
4. **Prometheus Metrics & Distributed Tracing**:
   Add Prometheus metrics (`http_request_duration_seconds`, `ledger_transaction_total`) and OpenTelemetry distributed tracing to monitor latency across database locks and service calls.
5. **Biometric Hardware Authentication**:
   Integrate `expo-local-authentication` to allow users to authorize transactions using FaceID or TouchID with secure hardware enclave fallback.

---

## Submission Summary
* **Codebase**: Fully functional, zero mock state, challenge-ready.
* **Test Suite**: **38 / 38 Automated Tests Passing (100%)**.
* **TypeScript Health**: 0 errors across `server` and `mobile`.
* **Database State**: Canonical baseline state seeded (Ama Mensah: GH₵ 4,850.00, Kwame Asante: GH₵ 2,100.00).
