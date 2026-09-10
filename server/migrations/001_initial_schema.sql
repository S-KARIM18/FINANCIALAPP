-- KudiFlow Initial Schema
-- Migration: 001_initial_schema.sql
-- All monetary amounts use NUMERIC(15,2) — never FLOAT or DOUBLE
-- UUIDs used for all primary keys
-- Row-level constraints prevent impossible financial states

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20)  NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   TEXT         NOT NULL,
    pin_hash        TEXT,  -- NULL until user sets PIN
    status          user_status  NOT NULL DEFAULT 'PENDING_VERIFICATION',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT users_phone_unique UNIQUE (phone),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_phone_format CHECK (phone ~ '^\+233[0-9]{9}$'),
    CONSTRAINT users_email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Accounts ─────────────────────────────────────────────────────────────────

CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

CREATE TABLE IF NOT EXISTS accounts (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    account_number  VARCHAR(20)    NOT NULL,
    currency        VARCHAR(3)     NOT NULL DEFAULT 'GHS',
    balance         NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
    status          account_status NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT accounts_account_number_unique UNIQUE (account_number),
    CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0),
    CONSTRAINT accounts_currency_ghs CHECK (currency = 'GHS'),
    CONSTRAINT accounts_one_per_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);

-- ─── Transactions ─────────────────────────────────────────────────────────────

CREATE TYPE transaction_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED');
CREATE TYPE transaction_type   AS ENUM ('TRANSFER', 'REVERSAL');

CREATE TABLE IF NOT EXISTS transactions (
    id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    reference             VARCHAR(20)       NOT NULL,
    sender_account_id     UUID              NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    recipient_account_id  UUID              NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount                NUMERIC(15,2)     NOT NULL,
    fee                   NUMERIC(15,2)     NOT NULL DEFAULT 0.00,
    total_amount          NUMERIC(15,2)     NOT NULL,
    currency              VARCHAR(3)        NOT NULL DEFAULT 'GHS',
    type                  transaction_type  NOT NULL DEFAULT 'TRANSFER',
    status                transaction_status NOT NULL DEFAULT 'PENDING',
    idempotency_key       VARCHAR(255)      NOT NULL,
    failure_reason        TEXT,
    note                  TEXT,
    reversal_of           UUID REFERENCES transactions(id), -- for REVERSAL type
    created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMPTZ,
    CONSTRAINT transactions_reference_unique UNIQUE (reference),
    CONSTRAINT transactions_amount_positive CHECK (amount > 0),
    CONSTRAINT transactions_fee_non_negative CHECK (fee >= 0),
    CONSTRAINT transactions_total_positive CHECK (total_amount > 0),
    CONSTRAINT transactions_currency_ghs CHECK (currency = 'GHS'),
    CONSTRAINT transactions_no_self_transfer CHECK (sender_account_id != recipient_account_id),
    CONSTRAINT transactions_total_correct CHECK (total_amount = amount + fee)
);

CREATE INDEX IF NOT EXISTS idx_transactions_sender    ON transactions(sender_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recipient ON transactions(recipient_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status    ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created   ON transactions(created_at DESC);

-- ─── Idempotency Keys ─────────────────────────────────────────────────────────
-- Composite unique constraint (user_id, key) prevents key collisions between users
-- and allows each user's keys to be managed independently.

CREATE TYPE idempotency_status AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key             VARCHAR(255)       NOT NULL,
    user_id         UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id  UUID               REFERENCES transactions(id),
    status          idempotency_status NOT NULL DEFAULT 'PROCESSING',
    request_hash    VARCHAR(32)        NOT NULL, -- fingerprint of request params
    response_body   TEXT,                        -- cached JSON response
    expires_at      TIMESTAMPTZ        NOT NULL,
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, key)  -- composite PK enforces per-user uniqueness
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ─── OTP Codes ────────────────────────────────────────────────────────────────

CREATE TYPE otp_purpose AS ENUM ('PHONE_VERIFICATION', 'PASSWORD_RESET');

CREATE TABLE IF NOT EXISTS otp_codes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   TEXT        NOT NULL,  -- bcrypt hash of the OTP — never store raw
    purpose     otp_purpose NOT NULL,
    attempts    INT         NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON otp_codes(user_id, purpose, expires_at);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
-- Append-only. No updates or deletes. Every important financial/security event is recorded.

CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
    event_type  VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64),
    entity_id   VARCHAR(255),
    metadata    JSONB       NOT NULL DEFAULT '{}',  -- NEVER store passwords/PINs/tokens here
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id   ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event     ON audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity    ON audit_logs(entity_type, entity_id);

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(64) NOT NULL,
    title       TEXT        NOT NULL,
    body        TEXT        NOT NULL,
    data        JSONB       NOT NULL DEFAULT '{}',
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ─── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
