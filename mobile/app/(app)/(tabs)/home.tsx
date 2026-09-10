/**
 * KudiFlow Home Screen — Pixel-Perfect Stitch Reference
 * Matches user's exact uploaded design:
 * - KudiFlow brand header with "HOME" sub-label, notification bell & profile avatar
 * - Obsidian navy balance card with GHS LIVE pill, concentric radar watermark & monthly inflow
 * - 4 Quick action squares: Send (mint green), Add money, Request, Pay Bills
 * - Bank-Grade Vault Active banner with BoG compliance text
 * - Smart Pot Savings banner with 14.5% p.a. & Explore button
 * - Recent transactions card featuring direct MoMo, Utility, and Split receipts
 */
import React, { useEffect, useState } from 'react';
import { AddMoneyModal } from '../../../components/modals/AddMoneyModal';
import { PayBillsModal } from '../../../components/modals/PayBillsModal';
import { RequestMoneyModal } from '../../../components/modals/RequestMoneyModal';
import { NotificationsModal } from '../../../components/modals/NotificationsModal';
import { SandboxInfoModal } from '../../../components/modals/SandboxInfoModal';
import { SavingsModal } from '../../../components/modals/SavingsModal';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { BalanceCard } from '../../../components/ui/BalanceCard';
import { useAuthStore } from '../../../store/auth.store';
import { useWalletStore } from '../../../store/wallet.store';
import { formatAmount } from '../../../utils/format';

interface TransactionItem {
  id: string;
  title: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  subtitle: string;
  amount: string;
  isPositive: boolean;
  icon: string;
  iconBg: string;
  iconColor: string;
  status: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [addMoneyVisible, setAddMoneyVisible] = useState(false);
  const [payBillsVisible, setPayBillsVisible] = useState(false);
  const [requestMoneyVisible, setRequestMoneyVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [sandboxInfoVisible, setSandboxInfoVisible] = useState(false);
  const [savingsVisible, setSavingsVisible] = useState(false);
  const {
    account,
    transactions,
    isLoadingBalance,
    isLoadingTransactions,
    balanceVisible,
    toggleBalanceVisibility,
    fetchBalance,
    fetchTransactions,
  } = useWalletStore();

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const onRefresh = async () => {
    await Promise.all([fetchBalance(), fetchTransactions()]);
  };

  // Pure live backend transactions
  const displayTransactions: TransactionItem[] = transactions.slice(0, 5).map((tx) => {
    const isSender = tx.sender_phone === user?.phone || tx.sender_name === user?.fullName;
    const name = isSender
      ? (tx.recipient_name || tx.recipient_phone || 'Recipient')
      : (tx.sender_name || tx.sender_phone || 'Sender');
    const truncatedName = name.length > 12 ? `${name.substring(0, 10)}...` : name;
    return {
      id: tx.id,
      title: truncatedName,
      badge: isSender ? 'MTN MoMo' : 'DIRECT',
      badgeBg: isSender ? '#DBEAFE' : '#DCFCE7',
      badgeColor: isSender ? '#1D4ED8' : '#059669',
      subtitle: `${isSender ? 'Sent Money' : 'Received'} • Today`,
      amount: `${isSender ? '-' : '+'}GH₵ ${formatAmount(tx.amount)}`,
      isPositive: !isSender,
      icon: isSender ? '↑' : '↓',
      iconBg: isSender ? '#E0F2FE' : '#DCFCE7',
      iconColor: isSender ? '#0284C7' : '#16A34A',
      status: tx.status === 'COMPLETED' ? 'Completed' : tx.status,
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingBalance || isLoadingTransactions}
            onRefresh={onRefresh}
            tintColor="#0B1220"
          />
        }
      >
        {/* ─── Top App Bar ───────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <View style={styles.logoBadgeInner} />
            </View>
            <View style={styles.brandTextGroup}>
              <Text style={styles.brandTitle}>KudiFlow</Text>
              <Text style={styles.brandSub}>HOME</Text>
            </View>
          </View>

          <View style={styles.topRightRow}>
            <TouchableOpacity
              style={styles.iconCircle}
              activeOpacity={0.7}
              onPress={() => setNotificationsVisible(true)}
            >
              <Ionicons name="notifications-outline" size={18} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(app)/(tabs)/profile')}
            >
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                }}
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Balance Card ──────────────────────────────────────────── */}
        <BalanceCard
          account={account}
          balanceVisible={balanceVisible}
          onToggleVisibility={toggleBalanceVisibility}
          ownerHandle={user ? `@ama.mensah` : '@ama.mensah'}
          ownerPhone={user?.phone || '+233 24 555 0192'}
          monthlyInflow="1240.00"
        />

        {/* ─── 4 Quick Actions ───────────────────────────────────────── */}
        <View style={styles.quickActionsContainer}>
          {/* Send */}
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => router.push('/send/review')}
          >
            <View style={[styles.actionSquare, styles.sendSquare]}>
              <Ionicons name="navigate" size={26} color="#0C1220" style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
            <Text style={styles.actionLabel}>Send</Text>
          </TouchableOpacity>

          {/* Add Money */}
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => setAddMoneyVisible(true)}
          >
            <View style={[styles.actionSquare, styles.whiteSquare]}>
              <Ionicons name="wallet-outline" size={26} color="#0F172A" />
            </View>
            <Text style={styles.actionLabel}>Add money</Text>
          </TouchableOpacity>

          {/* Request */}
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => setRequestMoneyVisible(true)}
          >
            <View style={[styles.actionSquare, styles.whiteSquare]}>
              <Ionicons name="qr-code-outline" size={26} color="#0F172A" />
            </View>
            <Text style={styles.actionLabel}>Request</Text>
          </TouchableOpacity>

          {/* Pay Bills */}
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => setPayBillsVisible(true)}
          >
            <View style={[styles.actionSquare, styles.whiteSquare]}>
              <Ionicons name="flash-outline" size={26} color="#0F172A" />
            </View>
            <Text style={styles.actionLabel}>Pay Bills</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Card 1: Bank-Grade Vault Active ───────────────────────── */}
        <TouchableOpacity
          style={styles.vaultCard}
          activeOpacity={0.85}
          onPress={() => setSandboxInfoVisible(true)}
        >
          <View style={styles.shieldBox}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
          </View>
          <View style={styles.vaultTextGroup}>
            <View style={styles.vaultTitleRow}>
              <Text style={styles.vaultTitle}>Security Sandbox • Prototype Rail</Text>
              <View style={styles.vaultDot} />
            </View>
            <Text style={styles.vaultSubtitle} numberOfLines={1}>
              Simulated settlement environment for review
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* ─── Card 2: Smart Pot Savings ─────────────────────────────── */}
        <View style={styles.savingsCard}>
          <View style={styles.piggyBox}>
            <Text style={styles.piggyIcon}>🐷</Text>
          </View>
          <View style={styles.savingsTextGroup}>
            <Text style={styles.savingsTag}>SMART POT SAVINGS</Text>
            <Text style={styles.savingsTitle}>Earn up to 14.5% p.a.</Text>
            <Text style={styles.savingsSubtitle} numberOfLines={1}>
              Lock funds safely in Ghana Cedis
            </Text>
          </View>
          <TouchableOpacity
            style={styles.exploreBtn}
            activeOpacity={0.85}
            onPress={() => setSavingsVisible(true)}
          >
            <Text style={styles.exploreBtnText}>Explore</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Recent Transactions ───────────────────────────────────── */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.sectionHeading}>Recent transactions</Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/(tabs)/transactions')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllLink}>See all ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionsCard}>
            {transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="receipt-outline" size={24} color="#006C49" />
                </View>
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your transfers will appear here in real time from the ledger.
                </Text>
                <TouchableOpacity
                  style={styles.emptySendButton}
                  onPress={() => router.push('/send/review')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptySendButtonText}>Send Money</Text>
                </TouchableOpacity>
              </View>
            ) : (
              displayTransactions.map((tx, index) => (
                <React.Fragment key={tx.id}>
                  <TouchableOpacity
                    style={styles.txRow}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/transactions/${tx.id}`)}
                  >
                  {/* Left Icon */}
                  <View style={[styles.txIconBox, { backgroundColor: tx.iconBg }]}>
                    <Text style={[styles.txIconText, { color: tx.iconColor }]}>
                      {tx.icon}
                    </Text>
                  </View>

                  {/* Center Details */}
                  <View style={styles.txDetailsCol}>
                    <View style={styles.txTitleRow}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <View style={[styles.badgePill, { backgroundColor: tx.badgeBg }]}>
                        <Text style={[styles.badgePillText, { color: tx.badgeColor }]}>
                          {tx.badge}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.txSubtitle} numberOfLines={1}>
                      {tx.subtitle}
                    </Text>
                  </View>

                  {/* Right Amount & Status */}
                  <View style={styles.txAmountCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        tx.isPositive ? styles.txPositive : styles.txNegative,
                      ]}
                    >
                      {tx.amount}
                    </Text>
                    <Text
                      style={[
                        styles.txStatus,
                        tx.isPositive ? styles.txStatusGreen : styles.txStatusMuted,
                      ]}
                    >
                      {tx.status}
                    </Text>
                  </View>
                </TouchableOpacity>

                {index < displayTransactions.length - 1 && (
                  <View style={styles.txDivider} />
                )}
              </React.Fragment>
            ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* ─── Interactive Challenge Feature Modals ──────────────────────── */}
      <AddMoneyModal
        visible={addMoneyVisible}
        onClose={() => setAddMoneyVisible(false)}
      />
      <PayBillsModal
        visible={payBillsVisible}
        onClose={() => setPayBillsVisible(false)}
      />
      <RequestMoneyModal
        visible={requestMoneyVisible}
        onClose={() => setRequestMoneyVisible(false)}
      />
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
      <SandboxInfoModal
        visible={sandboxInfoVisible}
        onClose={() => setSandboxInfoVisible(false)}
      />
      <SavingsModal
        visible={savingsVisible}
        onClose={() => setSavingsVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0C1220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeInner: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#4EEDB2',
  },
  brandTextGroup: {
    gap: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.1,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bellIcon: {
    fontSize: 16,
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  /* 4 Quick Actions */
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 2,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  actionSquare: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendSquare: {
    backgroundColor: '#4EEDB2',
    shadowColor: '#4EEDB2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  sendIcon: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0C1220',
  },
  whiteSquare: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBF0F7',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionEmoji: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  /* Bank-Grade Vault Active */
  vaultCard: {
    backgroundColor: '#EEF4FF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIcon: {
    fontSize: 18,
  },
  vaultTextGroup: {
    flex: 1,
  },
  vaultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vaultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  vaultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  vaultSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
  },

  /* Smart Pot Savings */
  savingsCard: {
    backgroundColor: '#EEF4FF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  piggyBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piggyIcon: {
    fontSize: 20,
  },
  savingsTextGroup: {
    flex: 1,
  },
  savingsTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  savingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  savingsSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  exploreBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Recent Transactions */
  transactionsSection: {
    paddingHorizontal: 16,
    marginTop: 4,
    gap: 12,
  },
  transactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D9488',
  },
  transactionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  txDetailsCol: {
    flex: 1,
    gap: 3,
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  txSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  txAmountCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  txPositive: {
    color: '#10B981',
  },
  txNegative: {
    color: '#0F172A',
  },
  txStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  txStatusGreen: {
    color: '#059669',
  },
  txStatusMuted: {
    color: '#64748B',
  },
  txDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  emptyContainer: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptySendButton: {
    backgroundColor: '#6CF8BB',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptySendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003824',
  },
});
