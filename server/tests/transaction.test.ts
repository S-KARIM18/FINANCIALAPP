/**
 * KudiFlow Transaction Tests
 *
 * Tests the financial correctness of the send money flow:
 * - Successful transfer
 * - Insufficient funds
 * - Invalid recipient
 * - Self-transfer
 * - Unauthorized access
 * - Reversal (atomic)
 * - Reversal idempotency
 * - Concurrency protection (no double spending)
 */

import request from 'supertest';
import app from '../src/app';
import { query } from '../src/config/database';

const AMA_PHONE = '+233245550192';
const KWAME_PHONE = '+233244100200';
const KOFI_PHONE = '+233200110022';
const DEMO_PASSWORD = 'KudiFlow2024!';

async function loginUser(phone: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: phone, password });
  return res.body.data.accessToken;
}

async function getBalance(token: string): Promise<number> {
  const res = await request(app)
    .get('/api/users/me/account')
    .set('Authorization', `Bearer ${token}`);
  return parseFloat(res.body.data.account.balance);
}

async function resetBalances(): Promise<void> {
  await query(`UPDATE accounts SET balance = 4850.00 WHERE account_number = '2055019201'`);
  await query(`UPDATE accounts SET balance = 2100.00 WHERE account_number = '2044100201'`);
  await query(`UPDATE accounts SET balance = 1500.00 WHERE account_number = '2001100221'`);
  await query(`UPDATE transactions SET reversal_of = NULL`);
  await query(`DELETE FROM idempotency_keys WHERE key LIKE 'txtest-%' OR key LIKE 'conc-%' OR key LIKE 'reversal-%'`);
  await query(`DELETE FROM transactions WHERE idempotency_key LIKE 'txtest-%' OR idempotency_key LIKE 'conc-%' OR idempotency_key LIKE 'reversal-%'`);
}

describe('Transactions — Final Acceptance Test', () => {
  let amaToken: string;
  let kwameToken: string;
  let kofiToken: string;

  beforeAll(async () => {
    amaToken = await loginUser(AMA_PHONE, DEMO_PASSWORD);
    kwameToken = await loginUser(KWAME_PHONE, DEMO_PASSWORD);
    kofiToken = await loginUser(KOFI_PHONE, DEMO_PASSWORD);
  });

  beforeEach(async () => {
    await resetBalances();
  });

  /**
   * FINAL ACCEPTANCE TEST from the spec:
   * Ama (4850) → Kwame: GHS 500, fee GHS 2
   * Expected: Ama = 4348, Kwame = 2600
   */
  test('Successful transfer: correct debit and credit', async () => {
    const amaBefore = await getBalance(amaToken);
    const kwameBefore = await getBalance(kwameToken);

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', 'txtest-accept-001')
      .send({ recipientPhone: KWAME_PHONE, amount: '500.00', pin: '1234', note: 'Acceptance test' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction.status).toBe('COMPLETED');

    const amaAfter = await getBalance(amaToken);
    const kwameAfter = await getBalance(kwameToken);

    // Ama debited: 500.00 + 2.00 fee = 502.00
    expect(amaAfter).toBe(amaBefore - 502);
    expect(amaAfter).toBe(4348.00);

    // Kwame credited: 500.00
    expect(kwameAfter).toBe(kwameBefore + 500);
    expect(kwameAfter).toBe(2600.00);
  });

  test('Insufficient funds — transaction fails, balance unchanged', async () => {
    const amaBefore = await getBalance(amaToken);

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', 'txtest-insuff-001')
      .send({ recipientPhone: KWAME_PHONE, amount: '10000.00', pin: '1234' }); // way more than 4850

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');

    // Balance must be unchanged
    const amaAfter = await getBalance(amaToken);
    expect(amaAfter).toBe(amaBefore);
  });

  test('Invalid recipient phone — transaction fails', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', 'txtest-badrecip-001')
      .send({ recipientPhone: '+233299999999', amount: '100.00', pin: '1234' }); // non-existent user

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECIPIENT_NOT_FOUND');
  });

  test('Self-transfer rejected', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', 'txtest-self-001')
      .send({ recipientPhone: AMA_PHONE, amount: '100.00', pin: '1234' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_TRANSFER');
  });

  test('Wrong PIN rejected — INVALID_PIN, no money movement', async () => {
    const amaBefore = await getBalance(amaToken);

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', 'txtest-wrongpin-001')
      .send({ recipientPhone: KWAME_PHONE, amount: '100.00', pin: '9999' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PIN');

    const amaAfter = await getBalance(amaToken);
    expect(amaAfter).toBe(amaBefore);
  });

  test('Missing PIN rejected — VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', 'txtest-nopin-001')
      .send({ recipientPhone: KWAME_PHONE, amount: '100.00' }); // no pin

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('Unauthorized transaction access — user cannot see another user transaction', async () => {
    // Ama makes a transaction
    const txRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', 'txtest-auth-001')
      .send({ recipientPhone: KWAME_PHONE, amount: '100.00', pin: '1234' });

    const txId = txRes.body.data.transaction.id;

    // Kofi tries to access Ama's transaction — should get NOT_FOUND, not the transaction
    const accessRes = await request(app)
      .get(`/api/transactions/${txId}`)
      .set('Authorization', `Bearer ${kofiToken}`);

    expect(accessRes.status).toBe(404);
    expect(accessRes.body.error.code).toBe('NOT_FOUND');
  });

  test('Missing Idempotency-Key header — rejected with VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      // No Idempotency-Key header
      .send({ recipientPhone: KWAME_PHONE, amount: '100.00', pin: '1234' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('Missing auth — rejected with UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Idempotency-Key', 'txtest-noauth-001')
      .send({ recipientPhone: KWAME_PHONE, amount: '100.00', pin: '1234' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('Transactions — Reversal', () => {
  let amaToken: string;
  let kwameToken: string;

  beforeAll(async () => {
    amaToken = await loginUser(AMA_PHONE, DEMO_PASSWORD);
    kwameToken = await loginUser(KWAME_PHONE, DEMO_PASSWORD);
  });

  beforeEach(async () => {
    await resetBalances();
  });

  test('Successful reversal returns funds to sender', async () => {
    // First make a transfer
    const txRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', 'txtest-reverse-001')
      .send({ recipientPhone: KWAME_PHONE, amount: '300.00', pin: '1234' });

    const txId = txRes.body.data.transaction.id;

    const amaAfterSend = await getBalance(amaToken);
    const kwameAfterReceive = await getBalance(kwameToken);

    // Reverse the transaction
    const revRes = await request(app)
      .post(`/api/transactions/${txId}/reverse`)
      .set('Authorization', `Bearer ${amaToken}`)
      .send({ reason: 'Test reversal' });

    expect(revRes.status).toBe(200);
    expect(revRes.body.success).toBe(true);

    const amaAfterReversal = await getBalance(amaToken);
    const kwameAfterReversal = await getBalance(kwameToken);

    // Ama's balance should be restored (gets back amount + fee)
    expect(amaAfterReversal).toBe(amaAfterSend + 302); // 300 + 2 fee

    // Kwame's balance should go back down by 300
    expect(kwameAfterReversal).toBe(kwameAfterReceive - 300);
  });

  test('Double reversal — second attempt fails (idempotent reversal)', async () => {
    const txRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${amaToken}`)
      .set('Idempotency-Key', 'txtest-reverse-002')
      .send({ recipientPhone: KWAME_PHONE, amount: '200.00', pin: '1234' });

    const txId = txRes.body.data.transaction.id;

    // First reversal
    await request(app)
      .post(`/api/transactions/${txId}/reverse`)
      .set('Authorization', `Bearer ${amaToken}`)
      .send({ reason: 'First reversal' });

    // Second reversal of same transaction — must fail
    const res = await request(app)
      .post(`/api/transactions/${txId}/reverse`)
      .set('Authorization', `Bearer ${amaToken}`)
      .send({ reason: 'Second reversal attempt' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');

    // Kwame's balance not affected by second reversal
    const kwameBalance = await getBalance(kwameToken);
    // After both reversal + returned, kwame is back at 2100
    expect(kwameBalance).toBe(2100.00);
  });
});

describe('Transactions — Concurrency Protection', () => {
  let amaToken: string;

  beforeAll(async () => {
    amaToken = await loginUser(AMA_PHONE, DEMO_PASSWORD);
  });

  beforeEach(async () => {
    // Set Ama's balance to exactly GHS 500 to test edge case
    await query(`UPDATE accounts SET balance = 500.00 WHERE account_number = '2055019201'`);
    await query(`DELETE FROM idempotency_keys WHERE key LIKE 'conc-%'`);
  });

  /**
   * CONCURRENCY TEST: Two simultaneous GHS 400 sends from an account with GHS 500.
   * Only one should succeed. Final balance must never be negative.
   */
  test('Concurrent sends — only one succeeds, balance never negative', async () => {
    const send = (key: string) =>
      request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', key)
        .send({ recipientPhone: KWAME_PHONE, amount: '400.00', pin: '1234' });

    // Fire both requests simultaneously
    const [res1, res2] = await Promise.all([
      send('conc-key-001'),
      send('conc-key-002'),
    ]);

    const statuses = [res1.status, res2.status];
    const succeeded = statuses.filter(s => s === 201).length;
    const failed = statuses.filter(s => s === 422).length;

    // Exactly one should succeed, exactly one should fail
    expect(succeeded).toBe(1);
    expect(failed).toBe(1);

    // Final balance must be non-negative
    const amaBalance = await getBalance(amaToken);
    expect(amaBalance).toBeGreaterThanOrEqual(0);

    // Balance should be exactly 98 (500 - 400 - 2 fee)
    expect(amaBalance).toBe(98);
  });
});
