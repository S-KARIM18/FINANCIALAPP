# KudiFlow Database Structure & Schema Reference

> **PostgreSQL (Neon Engine) Schema Documentation**

![KudiFlow Database Schema](./database-diagram.png)

---

## 1. Schema Overview

All database structures are defined in declarative SQL migrations (`server/migrations/`):
- `001_initial_schema.sql`: Core tables, enums, indexes, and row-level financial constraints.
- `002_seed_data.sql`: Seed data for baseline users and accounts.
- `003_challenge_features.sql`: Settlement reserve account, utility billers, and payment requests table.

### Global Data Integrity Standards:
- **Primary Keys**: UUID v4 generated via `gen_random_uuid()` (using `pgcrypto`).
- **Money Columns**: PostgreSQL `NUMERIC(15,2)` prevents any floating-point representation or rounding inaccuracies.
- **Enums**: Explicit PostgreSQL types enforce valid domain state transitions.
- **Constraints**: Declarative `CHECK` constraints on table definitions enforce invariants directly at the database engine level.

---

## 2. Table Specifications

### Table: `users`
Represents registered users in the platform.

| Column | Type | Nullable | Default | Description & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NO** | `gen_random_uuid()` | Primary Key |
| `full_name` | `VARCHAR(255)` | **NO** | | User legal full name |
| `phone` | `VARCHAR(20)` | **NO** | | Unique phone; `CHECK (phone ~ '^\+233[0-9]{9}$')` |
| `email` | `VARCHAR(255)` | **NO** | | Unique email; `CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')` |
| `password_hash` | `TEXT` | **NO** | | Bcrypt hash (cost factor 12) |
| `pin_hash` | `TEXT` | YES | `NULL` | Bcrypt hash of 4-digit transaction PIN |
| `status` | `user_status` | **NO** | `'PENDING_VERIFICATION'` | Enum: `'PENDING_VERIFICATION'`, `'ACTIVE'`, `'SUSPENDED'` |
| `created_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Last update timestamp |

**Indexes & Constraints**:
- `UNIQUE (phone)`, `UNIQUE (email)`
- `idx_users_phone ON users(phone)`, `idx_users_email ON users(email)`

---

### Table: `accounts`
Represents wallet balances held in Ghana Cedis (`GHS`).

| Column | Type | Nullable | Default | Description & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NO** | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | **NO** | | Foreign Key `REFERENCES users(id) ON DELETE RESTRICT` |
| `account_number` | `VARCHAR(20)` | **NO** | | Unique 10-digit account identifier |
| `currency` | `VARCHAR(3)` | **NO** | `'GHS'` | `CHECK (currency = 'GHS')` |
| `balance` | `NUMERIC(15,2)` | **NO** | `0.00` | Current wallet balance; `CHECK (balance >= 0)` |
| `status` | `account_status` | **NO** | `'ACTIVE'` | Enum: `'ACTIVE'`, `'SUSPENDED'`, `'CLOSED'` |
| `created_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Timestamp |

**Indexes & Constraints**:
- `UNIQUE (account_number)`, `UNIQUE (user_id)` (enforces exactly 1 account per user)
- `CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0)`: **Guarantees balance can never become negative under any circumstance.**

---

### Table: `transactions`
The immutable financial ledger recording every debit and credit.

| Column | Type | Nullable | Default | Description & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NO** | `gen_random_uuid()` | Primary Key |
| `reference` | `VARCHAR(20)` | **NO** | | Unique public transaction reference (`TXN-...` or `KDF-...`) |
| `sender_account_id` | `UUID` | **NO** | | FK `REFERENCES accounts(id) ON DELETE RESTRICT` |
| `recipient_account_id` | `UUID` | **NO** | | FK `REFERENCES accounts(id) ON DELETE RESTRICT` |
| `amount` | `NUMERIC(15,2)` | **NO** | | `CHECK (amount > 0)` |
| `fee` | `NUMERIC(15,2)` | **NO** | `0.00` | Platform fee; `CHECK (fee >= 0)` |
| `total_amount` | `NUMERIC(15,2)` | **NO** | | Total debited; `CHECK (total_amount > 0)` |
| `currency` | `VARCHAR(3)` | **NO** | `'GHS'` | `CHECK (currency = 'GHS')` |
| `type` | `transaction_type`| **NO** | `'TRANSFER'` | Enum: `'TRANSFER'`, `'REVERSAL'` |
| `status` | `transaction_status`| **NO**| `'PENDING'` | Enum: `'PENDING'`, `'PROCESSING'`, `'COMPLETED'`, `'FAILED'`, `'REVERSED'` |
| `idempotency_key` | `VARCHAR(255)` | **NO** | | Client-supplied unique key |
| `failure_reason` | `TEXT` | YES | `NULL` | Error details if status = 'FAILED' |
| `note` | `TEXT` | YES | `NULL` | Optional memo |
| `reversal_of` | `UUID` | YES | `NULL` | FK `REFERENCES transactions(id)` for reversals |
| `created_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Timestamp |
| `completed_at` | `TIMESTAMPTZ` | YES | `NULL` | Final settlement timestamp |

**Indexes & Constraints**:
- `UNIQUE (reference)`
- `CONSTRAINT transactions_no_self_transfer CHECK (sender_account_id != recipient_account_id)`
- `CONSTRAINT transactions_total_correct CHECK (total_amount = amount + fee)`: **Enforces exact math at database level.**
- Indexes: `idx_transactions_sender`, `idx_transactions_recipient`, `idx_transactions_status`, `idx_transactions_reference`, `idx_transactions_created`.

---

### Table: `idempotency_keys`
Prevents duplicate financial executions and caches responses.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `VARCHAR(255)` | **NO** | | Client idempotency key |
| `user_id` | `UUID` | **NO** | | FK `REFERENCES users(id) ON DELETE CASCADE` |
| `transaction_id` | `UUID` | YES | `NULL` | FK `REFERENCES transactions(id)` |
| `status` | `idempotency_status`| **NO**| `'PROCESSING'`| Enum: `'PROCESSING'`, `'COMPLETED'`, `'FAILED'` |
| `request_hash` | `VARCHAR(32)` | **NO** | | MD5 / SHA-256 fingerprint of payload params |
| `response_body` | `TEXT` | YES | `NULL` | Serialized JSON response |
| `expires_at` | `TIMESTAMPTZ` | **NO** | | Expiration timestamp (24-hour TTL) |
| `created_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Timestamp |

**Primary Key**: `PRIMARY KEY (user_id, key)`: Composite key isolates idempotency namespaces per user so different users can never collide.

---

### Table: `payment_requests`
Stores peer-to-peer payment requests and their settlement status.

| Column | Type | Nullable | Default | Description & Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NO** | `gen_random_uuid()` | Primary Key |
| `reference` | `VARCHAR(20)` | **NO** | | Unique reference (`REQ-...`) |
| `requester_user_id`| `UUID` | **NO** | | FK `REFERENCES users(id) ON DELETE CASCADE` |
| `payer_user_id` | `UUID` | **NO** | | FK `REFERENCES users(id) ON DELETE CASCADE` |
| `amount` | `NUMERIC(15,2)` | **NO** | | `CHECK (amount > 0)` |
| `currency` | `VARCHAR(3)` | **NO** | `'GHS'` | Currency |
| `note` | `TEXT` | YES | `NULL` | Reason / note |
| `status` | `payment_request_status`| **NO** | `'PENDING'` | Enum: `'PENDING'`, `'PAID'`, `'DECLINED'`, `'CANCELLED'` |
| `idempotency_key` | `VARCHAR(255)` | **NO** | | Key |
| `created_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Timestamp |
| `updated_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Timestamp |

**Constraints**:
- `CONSTRAINT payment_requests_no_self_request CHECK (requester_user_id != payer_user_id)`

---

### Table: `audit_logs`
Append-only tamper-evident audit record of security and financial events.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NO** | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | YES | `NULL` | FK `REFERENCES users(id) ON DELETE SET NULL` |
| `event_type` | `VARCHAR(64)` | **NO** | | Event name (e.g. `'TRANSFER_COMPLETED'`) |
| `entity_type` | `VARCHAR(64)` | YES | `NULL` | Entity class (e.g. `'transaction'`) |
| `entity_id` | `VARCHAR(255)`| YES | `NULL` | Entity ID |
| `metadata` | `JSONB` | **NO** | `'{}'` | Context details; **NEVER plain passwords/PINs** |
| `ip_address` | `VARCHAR(45)` | YES | `NULL` | Client IP |
| `created_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Append timestamp |

---

### Table: `notifications`
Stores transactional and security alerts for users.

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **NO** | `gen_random_uuid()` | Primary Key |
| `user_id` | `UUID` | **NO** | | FK `REFERENCES users(id) ON DELETE CASCADE` |
| `type` | `VARCHAR(64)` | **NO** | | Type (e.g. `'TRANSFER'`, `'DEPOSIT'`) |
| `title` | `TEXT` | **NO** | | Notification header |
| `body` | `TEXT` | **NO** | | Notification message |
| `data` | `JSONB` | **NO** | `'{}'` | Associated metadata |
| `read_at` | `TIMESTAMPTZ` | YES | `NULL` | Read status |
| `created_at` | `TIMESTAMPTZ` | **NO** | `NOW()` | Timestamp |
