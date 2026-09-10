/**
 * Normalize a Ghanaian phone number to E.164 format: +233XXXXXXXXX
 *
 * Accepted inputs:
 *   0241234567      → +233241234567
 *   233241234567    → +233241234567
 *   +233241234567   → +233241234567
 *   024 123 4567    → +233241234567
 */
export function normalizeGhanaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  if (digits.startsWith('233') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+233${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+233${digits}`;
  }

  // Already E.164 without +
  if (digits.startsWith('233') && digits.length > 12) {
    throw new Error(`Invalid Ghana phone number: ${raw}`);
  }

  throw new Error(`Cannot normalize phone number: ${raw}`);
}

/**
 * Validate that a string looks like a valid Ghana phone number.
 */
export function isValidGhanaPhone(raw: string): boolean {
  try {
    normalizeGhanaPhone(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a phone number for display: +233 24 123 4567
 */
export function formatPhoneForDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('233')) {
    const local = digits.slice(3);
    return `+233 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return e164;
}

/**
 * Generate a human-readable transaction reference.
 * Format: KDF-XXXXXXXX (8 hex chars from timestamp + random)
 */
export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(16).slice(-6).toUpperCase();
  const random = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0').toUpperCase();
  return `KDF-${timestamp}${random}`;
}

/**
 * Generate a numeric account number for KudiFlow accounts.
 * Format: 10-digit number starting with 20 (KudiFlow prefix)
 */
export function generateAccountNumber(): string {
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `20${suffix}`;
}

/**
 * Convert a 2-decimal money string (e.g. "500", "500.5", "500.50") into integer pesewas (BigInt).
 * Never uses parseFloat or floating-point arithmetic.
 */
export function toPesewas(amountStr: string): bigint {
  const trimmed = amountStr.trim();
  const isNegative = trimmed.startsWith('-');
  const clean = isNegative ? trimmed.slice(1) : trimmed;

  const parts = clean.split('.');
  const wholeStr = parts[0] || '0';
  const fracStr = parts[1] || '00';

  if (!/^\d+$/.test(wholeStr) || (fracStr.length > 0 && !/^\d+$/.test(fracStr))) {
    throw new Error(`Invalid monetary amount format: ${amountStr}`);
  }

  const normalizedFrac = (fracStr + '00').slice(0, 2);
  const total = BigInt(wholeStr) * 100n + BigInt(normalizedFrac);
  return isNegative ? -total : total;
}

/**
 * Format pesewas BigInt back to a standard 2-decimal currency string (e.g. "500.00").
 */
export function fromPesewas(pesewas: bigint): string {
  const isNegative = pesewas < 0n;
  const abs = isNegative ? -pesewas : pesewas;
  const whole = abs / 100n;
  const frac = abs % 100n;
  const sign = isNegative ? '-' : '';
  return `${sign}${whole}.${frac.toString().padStart(2, '0')}`;
}

/**
 * Safe decimal addition using string-based arithmetic via BigInt.
 * Avoids all floating-point precision issues in financial calculations.
 */
export function addDecimals(a: string, b: string): string {
  return fromPesewas(toPesewas(a) + toPesewas(b));
}

/**
 * Safe decimal subtraction using string-based arithmetic via BigInt.
 */
export function subtractDecimals(a: string, b: string): string {
  const result = toPesewas(a) - toPesewas(b);
  if (result < 0n) throw new Error('Subtraction would result in negative value');
  return fromPesewas(result);
}

/**
 * Safe decimal comparison using BigInt pesewas.
 */
export function compareDecimals(a: string, b: string): -1 | 0 | 1 {
  const aBig = toPesewas(a);
  const bBig = toPesewas(b);
  if (aBig < bBig) return -1;
  if (aBig > bBig) return 1;
  return 0;
}

/**
 * Format an amount string for display: GH₵ 1,234.56 without using parseFloat.
 */
export function formatAmount(amount: string): string {
  const pesewas = toPesewas(amount);
  const isNegative = pesewas < 0n;
  const abs = isNegative ? -pesewas : pesewas;
  const whole = (abs / 100n).toString();
  const frac = (abs % 100n).toString().padStart(2, '0');
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = isNegative ? '-' : '';
  return `GH₵ ${sign}${formattedWhole}.${frac}`;
}

/**
 * Calculate the standard KudiFlow transfer fee.
 * For the prototype: GHS 2.00 flat fee per transfer.
 * A real implementation would use a tiered fee schedule.
 */
export function calculateTransferFee(_amount: string): string {
  return '2.00';
}

/**
 * Create a hash of request parameters for idempotency fingerprinting.
 * This detects when the same key is reused with different parameters.
 */
export function hashRequestParams(params: Record<string, unknown>): string {
  const sorted = JSON.stringify(params, Object.keys(params).sort());
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
