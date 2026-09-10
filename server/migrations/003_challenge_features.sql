-- KudiFlow Challenge Features: Deposit Rail, Biller Accounts & Payment Requests
-- Migration: 003_challenge_features.sql

-- 1. System Settlement Reserve User & Account
INSERT INTO users (id, full_name, phone, email, password_hash, pin_hash, status)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'KudiFlow Settlement Reserve',
    '+233240000000',
    'settlement.reserve@kudiflow.gh',
    '/LewdBpj2sgeKhOmvK',
    '.Ye4oKoEa3Ro9llC/.og/at2uBECef90Kq',
    'ACTIVE'
) ON CONFLICT (phone) DO NOTHING;

INSERT INTO accounts (id, user_id, account_number, currency, balance, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    '1000000000',
    'GHS',
    10000000.00,
    'ACTIVE'
) ON CONFLICT (user_id) DO NOTHING;

-- 2. Biller Accounts for Utility & Service Payments
INSERT INTO users (id, full_name, phone, email, password_hash, pin_hash, status)
VALUES
    ('eeeeeeee-0000-0000-0000-000000000001', 'ECG Prepaid Electricity', '+233240000001', 'ecg@biller.kudiflow.gh', '/LewdBpj2sgeKhOmvK', '.Ye4oKoEa3Ro9llC/.og/at2uBECef90Kq', 'ACTIVE'),
    ('eeeeeeee-0000-0000-0000-000000000003', 'Ghana Water Company Ltd', '+233240000002', 'gwcl@biller.kudiflow.gh', '/LewdBpj2sgeKhOmvK', '.Ye4oKoEa3Ro9llC/.og/at2uBECef90Kq', 'ACTIVE'),
    ('eeeeeeee-0000-0000-0000-000000000005', 'MTN Fiber Broadband', '+233240000003', 'mtnfiber@biller.kudiflow.gh', '/LewdBpj2sgeKhOmvK', '.Ye4oKoEa3Ro9llC/.og/at2uBECef90Kq', 'ACTIVE'),
    ('eeeeeeee-0000-0000-0000-000000000007', 'DSTV & GOtv Ghana', '+233240000004', 'dstv@biller.kudiflow.gh', '/LewdBpj2sgeKhOmvK', '.Ye4oKoEa3Ro9llC/.og/at2uBECef90Kq', 'ACTIVE')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO accounts (id, user_id, account_number, currency, balance, status)
VALUES
    ('eeeeeeee-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000001', '3000000001', 'GHS', 5000.00, 'ACTIVE'),
    ('eeeeeeee-0000-0000-0000-000000000004', 'eeeeeeee-0000-0000-0000-000000000003', '3000000002', 'GHS', 5000.00, 'ACTIVE'),
    ('eeeeeeee-0000-0000-0000-000000000006', 'eeeeeeee-0000-0000-0000-000000000005', '3000000003', 'GHS', 5000.00, 'ACTIVE'),
    ('eeeeeeee-0000-0000-0000-000000000008', 'eeeeeeee-0000-0000-0000-000000000007', '3000000004', 'GHS', 5000.00, 'ACTIVE')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Payment Requests Table
CREATE TYPE payment_request_status AS ENUM ('PENDING', 'PAID', 'DECLINED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS payment_requests (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference          VARCHAR(20) NOT NULL UNIQUE,
    requester_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payer_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount             NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency           VARCHAR(3) NOT NULL DEFAULT 'GHS',
    note               TEXT,
    status             payment_request_status NOT NULL DEFAULT 'PENDING',
    idempotency_key    VARCHAR(255) NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_requests_no_self_request CHECK (requester_user_id != payer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_payer ON payment_requests(payer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_user_id, status);
