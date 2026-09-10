/**
 * KudiFlow — Format utilities for the mobile app
 */

/**
 * Format a balance/amount string for display.
 * e.g. "4850.00" → "4,850.00"
 */
export function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format with GH₵ prefix.
 * e.g. "500.00" → "GH₵ 500.00"
 */
export function formatCurrency(amount: string | number): string {
  return `GH₵ ${formatAmount(amount)}`;
}

/**
 * Format a phone number for display.
 * e.g. "+233245550192" → "+233 24 555 0192"
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233') && digits.length === 12) {
    const local = digits.slice(3);
    return `+233 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return phone;
}

/**
 * Format a date string to a human-readable format.
 * e.g. "2026-09-09T10:42:01Z" → "Sep 9, 2026 · 10:42 AM"
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format just the time portion.
 * e.g. "2026-09-09T10:42:01Z" → "10:42:01 AM"
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GH', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Relative time — "2 hours ago", "just now", etc.
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(dateStr);
}

/**
 * Get the first name from a full name.
 * "Ama Mensah" → "Ama"
 */
export function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName;
}

/**
 * Get initials from a full name.
 * "Ama Mensah" → "AM"
 */
export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');
}

/**
 * Get time-of-day greeting.
 * "Good morning", "Good afternoon", "Good evening"
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Truncate a transaction reference for display.
 * "KDF-8F42A91C" → stays as-is (short enough)
 */
export function truncateRef(ref: string, maxLen = 15): string {
  if (ref.length <= maxLen) return ref;
  return `${ref.slice(0, maxLen)}…`;
}

/**
 * Mask a phone number for privacy display.
 * "+233245550192" → "+233 24•••0192"
 */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  const formatted = formatPhone(phone);
  const parts = formatted.split(' ');
  if (parts.length >= 3) {
    parts[2] = '•••';
  }
  return parts.join(' ');
}

/**
 * Generate an idempotency key using a timestamp + random suffix.
 * Used for the swipe-to-send flow — generated ONCE per send attempt.
 */
export function generateIdempotencyKey(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

/**
 * Extract a user-readable error message from an Axios error response.
 */
export function getApiErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
      ?.message
  ) {
    return (error as { response: { data: { error: { message: string } } } }).response.data.error
      .message;
  }
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please check your connection.';
    }
    if (error.message.includes('Network Error')) {
      return 'Network unavailable. Please check your connection.';
    }
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Check if an Axios error is a network/timeout error (payment may have succeeded).
 */
export function isNetworkUncertain(error: unknown): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    ((error as { code?: string }).code === 'ECONNABORTED' ||
      (error as { code?: string }).code === 'ERR_NETWORK')
  ) {
    return true;
  }
  if (
    error instanceof Error &&
    (error.message.includes('timeout') || error.message.includes('Network Error'))
  ) {
    return true;
  }
  return false;
}
