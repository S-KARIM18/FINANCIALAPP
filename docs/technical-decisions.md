# KudiFlow Architecture Decision Records (ADR)

This document details the core architectural decisions made in KudiFlow, explaining the technical rationale, tradeoffs considered, and implications.

---

### Decision 1 — PostgreSQL as Sole Authoritative State Store
* **Context**: Financial applications require ACID guarantees, reliable concurrency control, and relational integrity across accounts, ledger movements, and audit records.
* **Decision**: Adopt PostgreSQL (managed via Neon Serverless) as the authoritative single source of truth for all balances and transactions.
* **Rationale**:
  * Guarantees strict transactional serializability and row-level locking.
  * Native support for declarative `CHECK` constraints on monetary quantities.
  * Relational foreign key integrity guarantees that transactions cannot exist without valid source and destination accounts.
* **Tradeoff**: Higher latency compared to an in-memory Redis ledger, but financial correctness and zero data-loss risk take absolute precedence over microsecond read latency.

---

### Decision 2 — `NUMERIC(15,2)` for Currency and Integer Math
* **Context**: IEEE 754 floating-point representations (`FLOAT`, `DOUBLE`, JavaScript `Number`) introduce binary rounding anomalies (e.g., `0.1 + 0.2 = 0.30000000000000004`), which can cause penny leaks in financial applications.
* **Decision**: 
  1. Store all monetary values as PostgreSQL `NUMERIC(15,2)`.
  2. Perform monetary arithmetic in business logic by converting currency strings to integer pesewas (`toPesewas`), executing integer math, and formatting back (`fromPesewas`).
* **Rationale**: Eliminates precision drift, guarantees exact Ghana Pesewa accounting, and ensures that `amount + fee = total_amount` is mathematically invariant.

---

### Decision 3 — End-to-End Cryptographic Idempotency Keys
* **Context**: Mobile networks in emerging markets frequently experience connection dropouts, retry storms, and transient timeouts. Without deduplication, a user tapping "Send" during a network hiccup could be debited multiple times.
* **Decision**: Enforce a mandatory `Idempotency-Key` HTTP header on all state-altering financial endpoints (`POST /api/transactions`, `/deposit`, `/bill-pay`, `/pay`).
* **Rationale**:
  * An idempotency record is inserted within the atomic transaction boundary before balance locks are acquired.
  * A SHA-256 fingerprint of the request payload (`request_hash`) is stored alongside the key.
  * If a client retries with the identical key and identical parameters, the completed transaction is returned immediately with `cached: true` without re-debiting.
  * If a client attempts to reuse an existing key with different financial parameters (e.g., changing the amount or recipient), the request is rejected with `409 Conflict`.

---

### Decision 4 — Deterministic Pessimistic Row Locking (`SELECT FOR UPDATE`)
* **Context**: High-frequency concurrent transfers between accounts can result in race conditions (two transfers reading the same balance simultaneously) or deadlocks (User A transfers to User B while User B transfers to User A).
* **Decision**: Lock account rows using `SELECT ... FOR UPDATE` ordered strictly by `account.id` (`min(id1, id2)` then `max(id1, id2)`).
* **Rationale**:
  * Pessimistic row locking ensures that once a transaction begins evaluating an account balance, no concurrent worker can modify or read that balance until the transaction completes.
  * Deterministic lock ordering guarantees that circular wait conditions are impossible, preventing database deadlocks.

---

### Decision 5 — Separation of Login Credentials from Transaction Authorization PIN
* **Context**: If a user's phone is unlocked or an access token is compromised, unauthorized parties should not be able to execute financial transfers.
* **Decision**: Separate the account password from a dedicated 4-digit transaction PIN. Require PIN entry at the moment of payment execution.
* **Rationale**:
  * Passwords authenticate the session; PINs authorize the specific monetary debit.
  * The PIN is never stored in local storage, SecureStore, or React state outside the active payment modal.
  * Stored on the server as an independent bcrypt hash (`users.pin_hash`), completely separated from `password_hash`.
  * The PIN is verified inside the atomic transaction boundary before any balance modification.

---

### Decision 6 — Hardware-Backed Token Storage (`expo-secure-store`)
* **Context**: React Native apps running on iOS and Android must not store JWT authentication tokens in unencrypted `AsyncStorage` where they are vulnerable to inspection or extraction.
* **Decision**: Persist access tokens and refresh tokens exclusively in `expo-secure-store`.
* **Rationale**: SecureStore leverages iOS Keychain Services and Android Keystore system with AES-256 GCM hardware encryption.

---

### Decision 7 — Append-Only Audit Logging with Data Redaction
* **Context**: Fintech compliance mandates that all critical operations have an audit trail, but storing sensitive credentials in audit records creates regulatory and security vulnerabilities.
* **Decision**: Implement an append-only `audit_logs` table where all financial and authentication events are logged, with an automated redaction policy that strictly forbids passwords, raw PINs, or JWT tokens from metadata JSON payloads.
