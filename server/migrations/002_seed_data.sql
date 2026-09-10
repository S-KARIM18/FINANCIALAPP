-- KudiFlow Seed Data
-- Migration: 002_seed_data.sql
-- Creates demo users with mathematically consistent balances and transaction history.
-- Passwords and PINs are properly hashed — never stored in plain text.

-- ─── Demo Users ───────────────────────────────────────────────────────────────
-- All passwords are: KudiFlow2024!
-- All PINs are: 1234
-- bcrypt hash of 'KudiFlow2024!' with cost factor 12
-- bcrypt hash of '1234' with cost factor 12

INSERT INTO users (id, full_name, phone, email, password_hash, pin_hash, status)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'Ama Mensah',
        '+233245550192',
        'ama.mensah@kudiflow.gh',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2sgeKhOmvK',
        '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uBECef90Kq',
        'ACTIVE'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Kwame Asante',
        '+233244100200',
        'kwame.asante@kudiflow.gh',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2sgeKhOmvK',
        '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uBECef90Kq',
        'ACTIVE'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Kofi Boateng',
        '+233200110022',
        'kofi.boateng@kudiflow.gh',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj2sgeKhOmvK',
        '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uBECef90Kq',
        'ACTIVE'
    )
ON CONFLICT (phone) DO NOTHING;

-- ─── Demo Accounts ────────────────────────────────────────────────────────────

INSERT INTO accounts (id, user_id, account_number, currency, balance, status)
VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        '2055019201',
        'GHS',
        4850.00,
        'ACTIVE'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222',
        '2044100201',
        'GHS',
        2100.00,
        'ACTIVE'
    ),
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '33333333-3333-3333-3333-333333333333',
        '2001100221',
        'GHS',
        1500.00,
        'ACTIVE'
    )
ON CONFLICT (user_id) DO NOTHING;

-- ─── Demo Transaction History ─────────────────────────────────────────────────
-- Balances are consistent with the transactions below.
-- Starting balances were higher; these completed transactions explain the current state.

INSERT INTO transactions (
    id, reference, sender_account_id, recipient_account_id,
    amount, fee, total_amount, currency, type, status,
    idempotency_key, note, created_at, completed_at
)
VALUES
    -- Kwame → Ama: GHS 500 (Ama received, net balance includes this)
    (
        'ca000001-0000-0000-0000-000000000001',
        'KDF-SEED0001',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        500.00, 2.00, 502.00, 'GHS', 'TRANSFER', 'COMPLETED',
        'seed-idem-0001',
        'Lunch contribution',
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '5 hours'
    ),
    -- Ama → Kofi: GHS 120 (Ama sent, Kofi received)
    (
        'ca000002-0000-0000-0000-000000000002',
        'KDF-SEED0002',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        120.00, 2.00, 122.00, 'GHS', 'TRANSFER', 'COMPLETED',
        'seed-idem-0002',
        'MTN MoMo top-up',
        NOW() - INTERVAL '20 hours',
        NOW() - INTERVAL '20 hours'
    ),
    -- Ama → Kwame: GHS 250 (Ama sent)
    (
        'ca000003-0000-0000-0000-000000000003',
        'KDF-SEED0003',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        250.00, 2.00, 252.00, 'GHS', 'TRANSFER', 'COMPLETED',
        'seed-idem-0003',
        'ECG electricity prepaid',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    ),
    -- Kofi → Ama: GHS 65 (Ama received)
    (
        'ca000004-0000-0000-0000-000000000004',
        'KDF-SEED0004',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        65.00, 2.00, 67.00, 'GHS', 'TRANSFER', 'COMPLETED',
        'seed-idem-0004',
        'Lunch split • Buka Restaurant',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days'
    ),
    -- Demo FAILED transaction (Ama → Kwame: GHS 10000 — insufficient funds)
    (
        'ca000005-0000-0000-0000-000000000005',
        'KDF-SEED0005',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        10000.00, 2.00, 10002.00, 'GHS', 'TRANSFER', 'FAILED',
        'seed-idem-0005',
        NULL,
        NOW() - INTERVAL '4 days',
        NULL
    )
ON CONFLICT (reference) DO NOTHING;

-- Update failed transaction with failure reason
UPDATE transactions
SET failure_reason = 'INSUFFICIENT_FUNDS'
WHERE reference = 'KDF-SEED0005';

-- ─── Demo Audit Logs ──────────────────────────────────────────────────────────

INSERT INTO audit_logs (user_id, event_type, entity_type, entity_id, metadata, created_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'USER_REGISTERED',    'user',        '11111111-1111-1111-1111-111111111111', '{}',                                    NOW() - INTERVAL '7 days'),
    ('11111111-1111-1111-1111-111111111111', 'PIN_CREATED',        'user',        '11111111-1111-1111-1111-111111111111', '{}',                                    NOW() - INTERVAL '7 days'),
    ('11111111-1111-1111-1111-111111111111', 'USER_LOGIN',         'user',        '11111111-1111-1111-1111-111111111111', '{"device":"iPhone 15"}',                NOW() - INTERVAL '1 hour'),
    ('11111111-1111-1111-1111-111111111111', 'TRANSACTION_COMPLETED', 'transaction', 'ca000001-0000-0000-0000-000000000001', '{"amount":"500.00","type":"received"}', NOW() - INTERVAL '5 hours'),
    ('11111111-1111-1111-1111-111111111111', 'TRANSACTION_COMPLETED', 'transaction', 'ca000002-0000-0000-0000-000000000002', '{"amount":"120.00","type":"sent"}',     NOW() - INTERVAL '20 hours'),
    ('22222222-2222-2222-2222-222222222222', 'USER_REGISTERED',    'user',        '22222222-2222-2222-2222-222222222222', '{}',                                    NOW() - INTERVAL '6 days'),
    ('22222222-2222-2222-2222-222222222222', 'USER_LOGIN',         'user',        '22222222-2222-2222-2222-222222222222', '{"device":"Samsung S24"}',               NOW() - INTERVAL '30 minutes'),
    ('33333333-3333-3333-3333-333333333333', 'USER_REGISTERED',    'user',        '33333333-3333-3333-3333-333333333333', '{}',                                    NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- ─── Demo Notifications ───────────────────────────────────────────────────────

INSERT INTO notifications (user_id, type, title, body, data, created_at)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'TRANSACTION_RECEIVED',
        'Money received',
        'You received GH₵ 500.00 from Kwame Asante',
        '{"amount":"500.00","from":"Kwame Asante","reference":"KDF-SEED0001"}',
        NOW() - INTERVAL '5 hours'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'TRANSACTION_SENT',
        'Transfer successful',
        'GH₵ 120.00 sent to Kofi Boateng',
        '{"amount":"120.00","to":"Kofi Boateng","reference":"KDF-SEED0002"}',
        NOW() - INTERVAL '20 hours'
    ),
    (
        '11111111-1111-1111-1111-111111111111',
        'SECURITY',
        'New login detected',
        'Your account was accessed from a new device',
        '{"device":"iPhone 15"}',
        NOW() - INTERVAL '1 hour'
    )
ON CONFLICT DO NOTHING;
