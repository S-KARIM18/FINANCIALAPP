/**
 * Transaction API service
 *
 * IDEMPOTENCY KEY RULE:
 * The idempotency key is generated ONCE per intentional send, stored in the
 * send flow component state. If the network fails and user retries by pressing
 * "Check Status", the SAME key is reused. A new key is NEVER generated for the
 * same financial intent within the same screen mount.
 *
 * NETWORK UNCERTAINTY:
 * If POST /transactions times out or returns a network error, the caller must
 * show "Checking payment..." NOT "Payment failed". The user should query
 * GET /transactions/:id/status using the known reference.
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import {
  SendMoneyInput,
  SendMoneyResult,
  DepositInput,
  BillPayInput,
  TransactionRaw,
  TransactionStatus,
} from '../types';

export async function sendMoney(input: SendMoneyInput): Promise<SendMoneyResult> {
  const res = await api.post(API_ENDPOINTS.transactions, {
    recipientPhone: input.recipientPhone,
    amount: input.amount,
    pin: input.pin,
    note: input.note,
  }, {
    headers: {
      'Idempotency-Key': input.idempotencyKey,
    },
  });

  return res.data.data as SendMoneyResult;
}

export async function depositMoney(input: DepositInput): Promise<SendMoneyResult> {
  const res = await api.post(API_ENDPOINTS.deposit, {
    amount: input.amount,
    fundingMethod: input.fundingMethod,
    fundingReference: input.fundingReference,
  }, {
    headers: {
      'Idempotency-Key': input.idempotencyKey,
    },
  });

  return res.data.data as SendMoneyResult;
}

export async function payBill(input: BillPayInput): Promise<SendMoneyResult> {
  const res = await api.post(API_ENDPOINTS.billPay, {
    billerCode: input.billerCode,
    customerNumber: input.customerNumber,
    amount: input.amount,
    pin: input.pin,
  }, {
    headers: {
      'Idempotency-Key': input.idempotencyKey,
    },
  });

  return res.data.data as SendMoneyResult;
}

export async function listTransactions(
  filter?: 'sent' | 'received' | 'pending' | 'failed',
  limit = 20,
  offset = 0,
): Promise<TransactionRaw[]> {
  const params: Record<string, unknown> = { limit, offset };
  if (filter) params.filter = filter;

  const res = await api.get(API_ENDPOINTS.transactions, { params });
  return res.data.data.transactions as TransactionRaw[];
}

export async function getTransactionById(id: string): Promise<TransactionRaw> {
  const res = await api.get(API_ENDPOINTS.transactionById(id));
  return res.data.data.transaction as TransactionRaw;
}

export async function getTransactionStatus(id: string): Promise<{
  id: string;
  reference: string;
  status: TransactionStatus;
  amount: string;
  completedAt: string | null;
  failureReason: string | null;
}> {
  const res = await api.get(API_ENDPOINTS.transactionStatus(id));
  return res.data.data;
}

export async function reverseTransaction(
  id: string,
  reason?: string,
): Promise<SendMoneyResult> {
  const res = await api.post(API_ENDPOINTS.reverseTransaction(id), { reason });
  return res.data.data;
}
