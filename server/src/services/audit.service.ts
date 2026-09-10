import { query } from '../config/database';
import { AuditLogRow } from '../types/transaction';

/**
 * Create an audit log entry.
 * SECURITY: Never pass passwords, PINs, or tokens in the metadata parameter.
 */
export async function createAuditLog(params: {
  userId?: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  await query(
    `INSERT INTO audit_logs (user_id, event_type, entity_type, entity_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.userId ?? null,
      params.eventType,
      params.entityType ?? null,
      params.entityId ?? null,
      JSON.stringify(params.metadata ?? {}),
      params.ipAddress ?? null,
    ],
  );
}

/**
 * Get audit logs for a specific user.
 * Used for the Activity screen.
 */
export async function getUserActivity(
  userId: string,
  limit = 50,
  offset = 0,
): Promise<AuditLogRow[]> {
  const result = await query<AuditLogRow>(
    `SELECT * FROM audit_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  return result.rows;
}
