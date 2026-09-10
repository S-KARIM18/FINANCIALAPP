/**
 * KudiFlow Balance Card — Stitch Reference Design
 * Deep obsidian navy, concentric radar watermark, live GHS badge,
 * large balance typography, monthly inflow indicator, and account handles.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Account } from '../../types';
import { formatAmount } from '../../utils/format';

interface BalanceCardProps {
  account: Account | null;
  balanceVisible: boolean;
  onToggleVisibility: () => void;
  ownerHandle?: string;
  ownerPhone?: string;
  monthlyInflow?: string;
  style?: ViewStyle;
}

export function BalanceCard({
  account,
  balanceVisible,
  onToggleVisibility,
  ownerHandle = '@ama.mensah',
  ownerPhone = '+233 24 555 0192',
  monthlyInflow = '1240.00',
  style,
}: BalanceCardProps) {
  const balance = account?.balance ?? '4850.00';

  return (
    <View style={[styles.card, style]}>
      {/* Background Concentric Radar Rings Watermark */}
      <View style={styles.radarContainer} pointerEvents="none">
        <View style={[styles.radarCircle, { width: 140, height: 140, right: -20, top: 40 }]} />
        <View style={[styles.radarCircle, { width: 220, height: 220, right: -60, top: 0 }]} />
        <View style={[styles.radarCircle, { width: 300, height: 300, right: -100, top: -40 }]} />
      </View>

      {/* Top Row: Label + Visibility Toggle + Live GHS Pill */}
      <View style={styles.headerRow}>
        <View style={styles.labelGroup}>
          <Text style={styles.label}>AVAILABLE BALANCE</Text>
          <TouchableOpacity onPress={onToggleVisibility} activeOpacity={0.7} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{balanceVisible ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>GHS LIVE</Text>
        </View>
      </View>

      {/* Main Balance Row */}
      <View style={styles.balanceRow}>
        <Text style={styles.currencyCode}>GH₵</Text>
        <Text style={styles.balanceAmount}>
          {balanceVisible ? formatAmount(balance) : '••••••'}
        </Text>
      </View>

      {/* Inflow Month Row */}
      <View style={styles.inflowRow}>
        <View style={styles.inflowChip}>
          <Text style={styles.inflowText}>↗ +GH₵ {formatAmount(monthlyInflow)}</Text>
        </View>
        <Text style={styles.inflowLabel}>inflow this month</Text>
      </View>

      {/* Bottom Info Row: Handle & Phone */}
      <View style={styles.footerRow}>
        <Text style={styles.handleText}>{ownerHandle}</Text>
        <Text style={styles.phoneText}>{ownerPhone}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0B1220',
    borderRadius: 24,
    padding: 22,
    marginHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  radarContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  radarCircle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E9BAE',
    letterSpacing: 0.8,
  },
  eyeBtn: {
    padding: 2,
  },
  eyeIcon: {
    fontSize: 14,
    color: '#8E9BAE',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#162238',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 10,
  },
  currencyCode: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
    marginRight: 6,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  inflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  inflowChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  inflowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  inflowLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  handleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#60A5FA',
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
});
