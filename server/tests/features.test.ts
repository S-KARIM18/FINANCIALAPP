import request from 'supertest';
import app from '../src/app';
import { query } from '../src/config/database';

jest.setTimeout(60000);

describe('Challenge Features: Deposit, Bill Pay & Payment Requests', () => {
  let amaToken: string;
  let kwameToken: string;
  const amaPhone = '+233245550192';
  const kwamePhone = '+233244100200';
  const password = 'KudiFlow2024!';
  const pin = '1234';

  beforeAll(async () => {
    // Reset balances for test isolation
    await query("UPDATE accounts SET balance = '4850.00' WHERE user_id = '11111111-1111-1111-1111-111111111111'");
    await query("UPDATE accounts SET balance = '2100.00' WHERE user_id = '22222222-2222-2222-2222-222222222222'");

    // Login Ama
    const amaRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: amaPhone, password });
    amaToken = amaRes.body.data.accessToken;

    // Login Kwame
    const kwameRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: kwamePhone, password });
    kwameToken = kwameRes.body.data.accessToken;
  });

  describe('Add Money (Simulated Sandbox Deposit)', () => {
    it('should deposit money into user wallet atomically and update balance', async () => {
      const startRes = await request(app)
        .get('/api/users/me/account')
        .set('Authorization', `Bearer ${amaToken}`);
      const initialBalance = parseFloat(startRes.body.data.account.balance);

      const idempotencyKey = `dep-test-${Date.now()}`;
      const depositRes = await request(app)
        .post('/api/transactions/deposit')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          amount: '150.00',
          fundingMethod: 'MTN_MOMO',
        });

      expect(depositRes.status).toBe(201);
      expect(depositRes.body.success).toBe(true);
      expect(depositRes.body.data.transaction.reference).toMatch(/^KDF-/);

      // Verify balance increased by exact amount
      const endRes = await request(app)
        .get('/api/users/me/account')
        .set('Authorization', `Bearer ${amaToken}`);
      const newBalance = parseFloat(endRes.body.data.account.balance);
      expect(newBalance).toBeCloseTo(initialBalance + 150.00, 2);

      // Idempotency: duplicate request with same key returns cached result and does not add balance again
      const dupRes = await request(app)
        .post('/api/transactions/deposit')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          amount: '150.00',
          fundingMethod: 'MTN_MOMO',
        });
      expect(dupRes.status).toBe(200);
      expect(dupRes.body.data.cached).toBe(true);

      const finalRes = await request(app)
        .get('/api/users/me/account')
        .set('Authorization', `Bearer ${amaToken}`);
      expect(parseFloat(finalRes.body.data.account.balance)).toBeCloseTo(newBalance, 2);
    });
  });

  describe('Pay Bills (Utility & Service Payments)', () => {
    it('should reject bill payment with wrong PIN without deducting balance', async () => {
      const startRes = await request(app)
        .get('/api/users/me/account')
        .set('Authorization', `Bearer ${amaToken}`);
      const initialBalance = parseFloat(startRes.body.data.account.balance);

      const res = await request(app)
        .post('/api/transactions/bill-pay')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', `bill-err-${Date.now()}`)
        .send({
          billerCode: 'ECG',
          customerNumber: '142098442',
          amount: '50.00',
          pin: '9999',
        });

      expect(res.status).toBe(400);

      const checkRes = await request(app)
        .get('/api/users/me/account')
        .set('Authorization', `Bearer ${amaToken}`);
      expect(parseFloat(checkRes.body.data.account.balance)).toBeCloseTo(initialBalance, 2);
    });

    it('should execute bill payment atomically with correct PIN and deduct balance + fee', async () => {
      const startRes = await request(app)
        .get('/api/users/me/account')
        .set('Authorization', `Bearer ${amaToken}`);
      const initialBalance = parseFloat(startRes.body.data.account.balance);

      const idempotencyKey = `bill-ok-${Date.now()}`;
      const res = await request(app)
        .post('/api/transactions/bill-pay')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          billerCode: 'ECG',
          customerNumber: '142098442',
          amount: '50.00',
          pin,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.reference).toMatch(/^KDF-/);

      // Verify balance reduced by amount + fee (50.00 + 1.00 = 51.00)
      const endRes = await request(app)
        .get('/api/users/me/account')
        .set('Authorization', `Bearer ${amaToken}`);
      expect(parseFloat(endRes.body.data.account.balance)).toBeCloseTo(initialBalance - 51.00, 2);

      // Idempotency check: duplicate bill pay does not double debit
      const dupRes = await request(app)
        .post('/api/transactions/bill-pay')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          billerCode: 'ECG',
          customerNumber: '142098442',
          amount: '50.00',
          pin,
        });
      expect(dupRes.status).toBe(200);
      expect(dupRes.body.data.cached).toBe(true);

      const finalRes = await request(app)
        .get('/api/users/me/account')
        .set('Authorization', `Bearer ${amaToken}`);
      expect(parseFloat(finalRes.body.data.account.balance)).toBeCloseTo(initialBalance - 51.00, 2);
    });

    it('should reject bill payment if balance is insufficient', async () => {
      const res = await request(app)
        .post('/api/transactions/bill-pay')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', `bill-high-${Date.now()}`)
        .send({
          billerCode: 'ECG',
          customerNumber: '142098442',
          amount: '99999.00',
          pin,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    });
  });

  describe('Request Money (Inbound & Outbound Requests)', () => {
    it('should create a payment request and persist in database', async () => {
      const res = await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', `req-test-${Date.now()}`)
        .send({
          payerPhone: kwamePhone,
          amount: '200.00',
          note: 'Dinner contribution',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentRequest.reference).toMatch(/^REQ-/);
      expect(res.body.data.paymentRequest.status).toBe('PENDING');
      expect(res.body.data.paymentRequest.amount).toBe('200.00');

      // Kwame should see this in his list of requests
      const listRes = await request(app)
        .get('/api/payment-requests?type=inbound')
        .set('Authorization', `Bearer ${kwameToken}`);

      expect(listRes.status).toBe(200);
      const found = listRes.body.data.paymentRequests.find(
        (r: any) => r.reference === res.body.data.paymentRequest.reference,
      );
      expect(found).toBeDefined();
      expect(found.requester_name).toBe('Ama Mensah');
    });

    it('should reject payment request to oneself', async () => {
      const res = await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', `self-req-${Date.now()}`)
        .send({
          payerPhone: amaPhone,
          amount: '100.00',
        });

      expect(res.status).toBe(400);
    });

    it('should reject payment request to nonexistent phone', async () => {
      const res = await request(app)
        .post('/api/payment-requests')
        .set('Authorization', `Bearer ${amaToken}`)
        .set('Idempotency-Key', `no-phone-${Date.now()}`)
        .send({
          payerPhone: '+233249999999',
          amount: '100.00',
        });

      expect(res.status).toBe(404);
    });
  });
});
