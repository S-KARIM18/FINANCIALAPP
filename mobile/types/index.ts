/**
 * KudiFlow TypeScript types for the mobile app
 */

// ─── User & Account ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
  hasPin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id?: string;
  balance: string;
  accountNumber: string;
  currency: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED';

export type TransactionType = 'TRANSFER' | 'REVERSAL';

export interface Transaction {
  id: string;
  reference: string;
  senderAccountId: string;
  recipientAccountId: string;
  amount: string;
  fee: string;
  totalAmount: string;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  failureReason: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  // Joined fields
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
}

// API response shape (snake_case from server, camelCased by axios interceptor)
export interface TransactionRaw {
  id: string;
  reference: string;
  sender_account_id: string;
  recipient_account_id: string;
  amount: string;
  fee: string;
  total_amount: string;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  failure_reason: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  sender_name?: string;
  sender_phone?: string;
  recipient_name?: string;
  recipient_phone?: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Send Money ───────────────────────────────────────────────────────────────

export interface SendMoneyInput {
  recipientPhone: string;
  amount: string;
  note?: string;
  idempotencyKey: string;
  pin: string;
}

export interface SendMoneyResult {
  transaction: TransactionRaw;
  cached: boolean;
  message: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    status: string;
  };
  accessToken: string;
  refreshToken: string;
}

// ─── Challenge Extended Types ────────────────────────────────────────────────

export interface DepositInput {
  amount: string;
  fundingMethod: string;
  fundingReference?: string;
  idempotencyKey: string;
}

export interface BillPayInput {
  billerCode: string;
  customerNumber: string;
  amount: string;
  pin: string;
  idempotencyKey: string;
}

export interface PaymentRequest {
  id: string;
  requester_id: string;
  payer_id: string;
  amount: string;
  currency: string;
  note: string | null;
  status: 'PENDING' | 'PAID' | 'DECLINED' | 'CANCELLED';
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  requester_name?: string;
  requester_phone?: string;
  payer_name?: string;
  payer_phone?: string;
}

export interface CreatePaymentRequestInput {
  recipientPhone: string;
  amount: string;
  note?: string;
}
