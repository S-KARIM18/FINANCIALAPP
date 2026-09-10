/**
 * KudiFlow Transaction Row — 72px height list item
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { StatusBadge } from './StatusBadge';
import { TransactionRaw } from '../../types';
import { formatAmount, getInitials, formatRelativeTime } from '../../utils/format';

interface TransactionRowProps {
  transaction: TransactionRaw;
  currentUserId: string;
  onPress?: () => void;
}

export function TransactionRow({ transaction, currentUserId, onPress }: TransactionRowProps) {
  const isReversal = transaction.type === 'REVERSAL';
  const counterpartyName = isReversal
    ? (transaction.sender_name || 'Reversal')
    : (transaction.recipient_name || 'Unknown Recipient');

  const initials = getInitials(counterpartyName);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.row}>
      <View style={[styles.avatar, isReversal ? styles.avatarReceived : styles.avatarSent]}>
        <Text style={[styles.avatarText, isReversal ? styles.avatarTextReceived : styles.avatarTextSent]}>
          {initials}
        </Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>{counterpartyName}</Text>
        <View style={styles.metaRow}>
          <StatusBadge status={transaction.status} />
          <Text style={styles.time}>{formatRelativeTime(transaction.created_at)}</Text>
        </View>
      </View>

      <View style={styles.amountBlock}>
        <Text style={[styles.amount, isReversal ? styles.amountPositive : styles.amountNegative]}>
          {isReversal ? '+' : '-'}GH₵ {formatAmount(transaction.amount)}
        </Text>
        {transaction.note ? (
          <Text style={styles.note} numberOfLines={1}>{transaction.note}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.spaceMd,
    paddingHorizontal: Spacing.screenEdgePadding,
    minHeight: Spacing.transactionRowHeight,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.spaceMd,
    flexShrink: 0,
  },
  avatarReceived: { backgroundColor: Colors.secondaryContainer },
  avatarSent: { backgroundColor: Colors.surfaceContainerHighest },
  avatarText: { fontSize: 14, fontWeight: '700' },
  avatarTextReceived: { color: Colors.secondary },
  avatarTextSent: { color: Colors.onSurfaceVariant },
  details: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontSize: 11, color: Colors.onSurfaceVariant },
  amountBlock: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 14, fontWeight: '700' },
  amountPositive: { color: Colors.secondary },
  amountNegative: { color: Colors.onSurface },
  note: { fontSize: 10, color: Colors.onSurfaceVariant, maxWidth: 100 },
});
