/**
 * Payment Request API service
 */

import api from './api';
import { API_ENDPOINTS } from '../constants/api';
import { PaymentRequest, SendMoneyResult } from '../types';

export async function createPaymentRequest(input: {
  recipientPhone: string;
  amount: string;
  note?: string;
}): Promise<PaymentRequest> {
  const res = await api.post(API_ENDPOINTS.paymentRequests, {
    payerPhone: input.recipientPhone,
    recipientPhone: input.recipientPhone,
    amount: input.amount,
    note: input.note,
  });
  return res.data?.data?.paymentRequest as PaymentRequest;
}

export async function listPaymentRequests(
  filter: 'inbound' | 'outbound' = 'inbound',
  status?: string,
): Promise<PaymentRequest[]> {
  const params: Record<string, unknown> = { type: filter, filter };
  if (status) params.status = status;

  try {
    const res = await api.get(API_ENDPOINTS.paymentRequests, { params });
    const list = res.data?.data?.paymentRequests || res.data?.data?.requests;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function payPaymentRequest(
  requestId: string,
  pin: string,
  idempotencyKey: string,
): Promise<SendMoneyResult> {
  const res = await api.post(
    API_ENDPOINTS.payPaymentRequest(requestId),
    { pin },
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  return res.data.data as SendMoneyResult;
}

export async function declinePaymentRequest(requestId: string): Promise<PaymentRequest> {
  const res = await api.post(API_ENDPOINTS.declinePaymentRequest(requestId));
  return res.data.data.paymentRequest as PaymentRequest;
}
