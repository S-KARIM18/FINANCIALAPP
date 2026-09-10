# KudiFlow System Architecture

> **Ghana-Context Digital Wallet Platform — Technical Challenge Prototype**

![KudiFlow Architecture](./architecture.png)

---

## 1. Overview & Architectural Principles

KudiFlow is engineered from the ground up as an **authoritative financial ledger**, not a conventional CRUD application. The system strictly isolates client interaction from financial decision-making: the client UI expresses *intent*, while the backend enforces *invariants*, calculates *fees*, locks *resources*, records *double-entry ledger movements*, and emits *tamper-evident audit logs*.

### Core Principles:
1. **Server-Authoritative Balances**: Balances are calculated, updated, and stored exclusively by the backend database. Client applications can never pass new balances or alter account balances directly.
2. **Strict Atomicity**: Debits and credits execute within a single PostgreSQL transaction (`withTransaction`). Either both accounts update successfully and the ledger entry is committed, or the transaction rolls back completely with zero partial money movement.
3. **Pessimistic Concurrency Control**: Accounts are locked using `SELECT ... FOR UPDATE` ordered by account ID to completely eliminate race conditions and avoid deadlocks during concurrent transfers.
4. **End-to-End Cryptographic Idempotency**: Every financial request requires a client-generated `Idempotency-Key` header with payload SHA-256 fingerprinting. Duplicate network transmissions return cached transaction receipts without re-debiting.
5. **Exact Decimal Precision**: All monetary values are calculated in integer pesewas (`toPesewas` / `fromPesewas`) and stored in PostgreSQL `NUMERIC(15,2)`. Floating-point arithmetic is prohibited.

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Mobile App)"]
        UI["React Native / Expo 57"]
        Store["Zustand Store (Wallet, Auth)"]
        Keychain["Expo SecureStore (Tokens)"]
        APIClient["Axios Client (Idempotency Interceptor)"]
        UI --> Store
        Store --> Keychain
        Store --> APIClient
    end

    subgraph Gateway ["Transport & Security Gateway"]
        HTTPS["HTTPS REST API"]
        Helmet["Helmet Security Headers"]
        CORS["CORS Protection"]
        RateLimit["Rate Limiter (express-rate-limit)"]
        APIClient --> HTTPS
        HTTPS --> Helmet
        Helmet --> CORS
        CORS --> RateLimit
    end

    subgraph Backend ["Express TypeScript Backend"]
        AuthMiddleware["JWT Authentication Middleware"]
        Validator["Zod Input Validation Middleware"]
        TxController["Transaction / Payment Controllers"]
        TxService["Transaction Engine Service"]
        
        RateLimit --> AuthMiddleware
        AuthMiddleware --> Validator
        Validator --> TxController
        TxController --> TxService
    end

    subgraph Database ["PostgreSQL (Neon Managed)"]
        subgraph TxBoundary ["Atomic Transaction Boundary (BEGIN ... COMMIT)"]
            IdempLock["Idempotency Key Check / Insert (PROCESSING)"]
            PINCheck["Bcrypt Transaction PIN Verification"]
            AcctLock["SELECT ... FOR UPDATE (Account ID Order)"]
            BalCheck["Balance >= (Amount + Fee) Invariant"]
            DebitCredit["Atomic Balance Debit & Credit"]
            LedgerRow["INSERT INTO transactions (COMPLETED)"]
            AuditRow["INSERT INTO audit_logs"]
            NotifRow["INSERT INTO notifications"]
            IdempComplete["UPDATE idempotency_keys (COMPLETED)"]
        end
        
        TxService --> TxBoundary
        IdempLock --> PINCheck
        PINCheck --> AcctLock
        AcctLock --> BalCheck
        BalCheck --> DebitCredit
        DebitCredit --> LedgerRow
        LedgerRow --> AuditRow
        AuditRow --> NotifRow
        NotifRow --> IdempComplete
    end
```

---

## 3. Layer Responsibilities

### 1. Mobile Client Layer (`mobile/`)
* **Framework**: React Native 0.86.3 with Expo 57 and Expo Router v57.
* **Responsibilities**:
  * Render pixel-perfect interactive flows (Onboarding, Login, Wallet Dashboard, Send Review, Interactive PIN Modal, Bill Pay, Payment Requests, and Transaction Details).
  * Generate a cryptographically random UUID v4 `Idempotency-Key` upon mounting a transaction intent.
  * Store JWT access tokens and refresh tokens in device hardware-backed storage (`expo-secure-store`).
  * Never compute final balances or fees locally; display solely server-authoritative numbers.

### 2. Transport & Security Middleware (`server/src/middleware/`)
* **`helmet`**: Sets HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`).
* **`cors`**: Enforces strict origin matching for authorized web and mobile origins.
* **`express-rate-limit`**:
  * Global API: 100 requests / minute.
  * Auth endpoints: 10 requests / 15 minutes.
  * OTP endpoints: 3 requests / minute.
* **`auth.middleware.ts`**: Verifies HMAC-SHA256 JWT access tokens, validates user status in database, and injects authenticated user claims (`userId`, `phone`, `email`).
* **`validate.middleware.ts`**: Validates request body schemas against strict Zod type definitions before execution reaches business services.

### 3. Application Services Layer (`server/src/services/`)
* **`transaction.service.ts`**:
  * Coordinates atomic transfers, sandbox funding deposits, and utility bill payments.
  * Enforces server-side fee schedule:
    * Amounts $\le \text{GH₵ } 50.00$: **GH₵ 0.00** fee.
    * Amounts $> \text{GH₵ } 50.00$: **GH₵ 2.00** flat fee.
    * Bill payments: **GH₵ 1.00** flat convenience fee.
* **`payment-request.service.ts`**: Manages inbound and outbound peer-to-peer payment requests, settlement execution with PIN verification, and request cancellation/declination.
* **`auth.service.ts`**: Handles password hashing via `bcrypt` (cost factor 12), PIN hashing, JWT token rotation, and credential verification.
* **`otp.service.ts`**: Generates and hashes 6-digit one-time verification pins with attempt caps.

### 4. Persistence Layer (`server/src/config/database.ts` & PostgreSQL)
* **PostgreSQL Engine**: Neon Serverless PostgreSQL with SSL connection pooling.
* **Isolation Level**: Read Committed with explicit pessimistic row locks (`SELECT FOR UPDATE`).
* **Precision**: All financial columns use `NUMERIC(15,2)` and `CHECK` constraints prevent negative balances or corrupted ledger rows.

---

## 4. End-to-End Financial Transaction Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Mobile App User (Ama)
    participant UI as Mobile Review Screen
    participant API as Express API Server
    participant DB as PostgreSQL Database

    User->>UI: Swipes "Slide to Send"
    UI->>UI: Displays PIN Pad Bottom Sheet
    User->>UI: Enters 4-digit PIN (1234)
    UI->>API: POST /api/transactions<br/>Headers: Idempotency-Key, Authorization<br/>Body: { recipientPhone, amount, pin, note }
    
    API->>API: Verify JWT Access Token
    API->>API: Validate input schema with Zod
    
    critical Atomic Database Transaction Boundary
        API->>DB: BEGIN
        API->>DB: INSERT INTO idempotency_keys (key, user_id, status, request_hash) VALUES (...) ON CONFLICT DO UPDATE
        alt Key already completed
            DB-->>API: Returns cached transaction record
            API-->>UI: 200 OK (cached: true, idempotent response)
        end
        
        API->>DB: SELECT pin_hash FROM users WHERE id = senderUserId
        API->>API: verifyPin(inputPin, pin_hash)
        alt PIN Incorrect
            API->>DB: DELETE FROM idempotency_keys WHERE key = idempotencyKey
            API->>DB: ROLLBACK
            API-->>UI: 401 Unauthorized (INVALID_PIN)
        end
        
        API->>DB: SELECT * FROM accounts WHERE user_id = sender FOR UPDATE
        API->>DB: SELECT * FROM accounts WHERE user_id = recipient FOR UPDATE
        API->>API: Calculate Server Fee & Total Deduction
        API->>API: Validate balance >= totalAmount
        alt Insufficient Balance
            API->>DB: UPDATE idempotency_keys SET status = 'FAILED'
            API->>DB: ROLLBACK
            API-->>UI: 422 Unprocessable Entity (INSUFFICIENT_FUNDS)
        end
        
        API->>DB: UPDATE accounts SET balance = balance - totalAmount WHERE id = senderAccount.id
        API->>DB: UPDATE accounts SET balance = balance + amount WHERE id = recipientAccount.id
        API->>DB: INSERT INTO transactions (reference, amount, fee, total, status='COMPLETED')
        API->>DB: INSERT INTO audit_logs (event='TRANSFER_COMPLETED', metadata)
        API->>DB: INSERT INTO notifications (for sender & recipient)
        API->>DB: UPDATE idempotency_keys SET status='COMPLETED', transaction_id=...
        API->>DB: COMMIT
    end

    API-->>UI: 201 Created { success: true, data: { transaction, fee, totalDebited } }
    UI->>UI: Route to Success Screen with Reference, Amount, Fee
    UI->>User: Renders verified settlement receipt
```

---

## 5. Failure and Uncertainty Handling

* **Network Drop Before Submission**: Client generates a fresh idempotency key on first submit.
* **Network Drop During Processing**: Client retains the identical idempotency key on its screen state. If user retries, backend detects the in-flight or completed key and returns the identical response without charging again.
* **Database Deadlock Prevention**: When locking multiple accounts (sender and recipient), locks are always acquired in deterministic `account.id` order (`ID_A < ID_B`).
* **Crash Consistency**: Because all money movement occurs within a single database transaction, any unhandled error, database disconnect, or server crash triggers an automatic PostgreSQL rollback. Balance corruptions or partial debits are mathematically impossible.
