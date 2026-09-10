// ─── Transaction Enums ───────────────────────────────────────────────────────

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export enum TransactionType {
  TRANSFER = 'TRANSFER',
  REVERSAL = 'REVERSAL',
}

// ─── Valid State Transitions ──────────────────────────────────────────────────

export const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  [TransactionStatus.PENDING]: [TransactionStatus.PROCESSING],
  [TransactionStatus.PROCESSING]: [TransactionStatus.COMPLETED, TransactionStatus.FAILED],
  [TransactionStatus.COMPLETED]: [TransactionStatus.REVERSED],
  [TransactionStatus.FAILED]: [],
  [TransactionStatus.REVERSED]: [],
};

export function isValidTransition(
  from: TransactionStatus,
  to: TransactionStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  password_hash: string;
  pin_hash: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  created_at: Date;
  updated_at: Date;
}

export interface AccountRow {
  id: string;
  user_id: string;
  account_number: string;
  currency: string;
  balance: string; // NUMERIC comes as string from pg driver — always parse carefully
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  created_at: Date;
  updated_at: Date;
}

export interface TransactionRow {
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
  idempotency_key: string;
  failure_reason: string | null;
  note: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  // Joined fields
  sender_name?: string;
  sender_phone?: string;
  recipient_name?: string;
  recipient_phone?: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: Date;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

export interface IdempotencyKeyRow {
  key: string;
  user_id: string;
  transaction_id: string | null;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  request_hash: string;
  response_body: string | null;
  expires_at: Date;
  created_at: Date;
}

// ─── Service Input Types ──────────────────────────────────────────────────────

export interface CreateTransactionInput {
  senderUserId: string;
  recipientPhone: string;
  amount: string; // String to avoid float precision loss in transit
  pin: string;    // Required 4-digit transaction PIN
  note?: string;
  idempotencyKey: string;
  ipAddress?: string;
}

export interface SendMoneyResult {
  transaction: TransactionRow;
  cached: boolean;
  fee?: string;
  totalDebited?: string;
}
