/**
 * KudiFlow Status Badge — pill-shaped transaction status indicator
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { TransactionStatus } from '../../types';

interface StatusBadgeProps {
  status: TransactionStatus | string;
  style?: ViewStyle;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  COMPLETED: { bg: Colors.secondaryContainer, text: Colors.secondary, label: 'Completed' },
  PENDING: { bg: Colors.warningContainer, text: Colors.warning, label: 'Pending' },
  PROCESSING: { bg: '#dbeafe', text: Colors.statusProcessing, label: 'Processing' },
  FAILED: { bg: Colors.errorContainer, text: Colors.error, label: 'Failed' },
  REVERSED: { bg: Colors.surfaceContainerHigh, text: Colors.onSurfaceVariant, label: 'Reversed' },
};

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
