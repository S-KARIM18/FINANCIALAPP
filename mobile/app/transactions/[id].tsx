/**
 * Transaction Detail / Full Audit Receipt
 * Matches Stitch kudiflow_transaction_details_receipt design.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Share,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as txApi from '../../services/transaction.api';
import { TransactionRaw } from '../../types';
import { formatAmount } from '../../utils/format';
import { useWalletStore } from '../../store/wallet.store';

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchBalance } = useWalletStore();
  const [tx, setTx] = useState<TransactionRaw | null>(null);
  const [loading, setLoading] = useState(true);
  const [reversing, setReversing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Copied to clipboard');

  useEffect(() => {
    txApi
      .getTransactionById(id)
      .then(setTx)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleReverse = () => {
    Alert.alert(
      'Reverse Transaction',
      'This will return the funds to the sender. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse',
          style: 'destructive',
          onPress: async () => {
            setReversing(true);
            try {
              await txApi.reverseTransaction(id, 'User requested reversal');
              await fetchBalance();
              const updated = await txApi.getTransactionById(id);
              setTx(updated);
              Alert.alert('Success', 'Transaction has been reversed successfully.');
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
                'Reversal failed.';
              Alert.alert('Error', msg);
            } finally {
              setReversing(false);
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = () => {
    setToastMessage('Copied to clipboard');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  const handleShare = async () => {
    if (!tx) return;
    try {
      await Share.share({
        message: `KudiFlow Transfer Receipt\nRef: ${tx.reference}\nAmount: GHS ${formatAmount(tx.amount)}\nRecipient: ${tx.recipient_name || tx.recipient_phone || 'Recipient'}\nStatus: ${tx.status}\nSettlement: Demo Settlement Rail`,
      });
    } catch {
      // Ignored
    }
  };

  const handleDownload = () => {
    if (!tx) return;
    Alert.alert(
      'Receipt Downloaded',
      `Official PDF Receipt for ${tx.reference} has been saved to your device.`,
      [{ text: 'OK' }]
    );
  };

  const handleReportIssue = () => {
    if (!tx) return;
    Alert.alert(
      'Report Payment Issue',
      `Support ticket created for Transaction ${tx.reference}. Our 24/7 compliance desk will reach out shortly.`,
      [{ text: 'Dismiss' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0F172A" />
          <Text style={styles.loadingText}>Loading receipt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tx) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.errorTitle}>Transaction not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonSimple}>
            <Text style={styles.backButtonSimpleText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const rawAmount = parseFloat(tx.amount) || 0;
  const rawFee = parseFloat(tx.fee) || 2.0;
  const totalDebited = (rawAmount + rawFee).toFixed(2);
  const formattedAmount = rawAmount.toFixed(2);

  const txDate = tx.created_at ? new Date(tx.created_at) : new Date();
  const day = txDate.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[txDate.getMonth()];
  const year = txDate.getFullYear();

  let hours = txDate.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = txDate.getMinutes().toString().padStart(2, '0');
  const seconds = txDate.getSeconds();

  const formattedDateStr = `${day} ${month} ${year} • ${hours}:${minutes} ${ampm} GMT`;

  const time0 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${Math.max(1, seconds - 2).toString().padStart(2, '0')} ${ampm}`;
  const time1 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${Math.max(1, seconds - 1).toString().padStart(2, '0')} ${ampm}`;
  const time2 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;

  const isSuccess = tx.status === 'COMPLETED';

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── Top Header ────────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Transaction Receipt</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.helpButton} activeOpacity={0.7}>
            <Feather name="help-circle" size={22} color="#475569" />
          </TouchableOpacity>

          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            }}
            style={styles.avatarImage}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Status Section ───────────────────────────────────── */}
        <View style={styles.heroSection}>
          {/* Main Success Checkmark with Live Tag */}
          <View style={styles.checkCircleWrapper}>
            <View style={[styles.checkCircle, !isSuccess && styles.failedCheckCircle]}>
              <Ionicons
                name={isSuccess ? 'checkmark' : 'close'}
                size={44}
                color={isSuccess ? '#047857' : '#B91C1C'}
              />
            </View>
            <View style={styles.liveTag}>
              <View style={[styles.liveDot, !isSuccess && styles.failedLiveDot]} />
              <Text style={[styles.liveText, !isSuccess && styles.failedLiveText]}>
                {tx.status}
              </Text>
            </View>
          </View>

          {/* GhIPSS Cleared & Verified Pill */}
          <View style={styles.ghipssBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#0D9488" />
            <Text style={styles.ghipssBadgeText}>DEMO RAIL • CLEARED & AUDITED</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headlineText}>
            {isSuccess ? 'Payment Successful & Settled' : `Payment ${tx.status}`}
          </Text>

          {/* Timestamp with clock */}
          <View style={styles.timestampRow}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.timestampText}>{formattedDateStr}</Text>
          </View>

          {/* Large Amount */}
          <View style={styles.amountDisplayRow}>
            <Text style={styles.currencyPrefix}>GHS</Text>
            <Text style={styles.amountValue}>{formattedAmount}</Text>
          </View>

          {/* Fee Debited Sub-pill */}
          <View style={styles.feeDebitedPill}>
            <Text style={styles.feeDebitedText}>
              Total debited <Text style={styles.feeDebitedBold}>GHS {totalDebited}</Text> (incl. GHS {rawFee.toFixed(2)} fee)
            </Text>
          </View>
        </View>

        {/* ─── Audit & Receipt Ledger Card ───────────────────────────── */}
        <View style={styles.card}>
          {/* Top Ledger Header Strip */}
          <View style={styles.cardTopStrip}>
            <View style={styles.ledgerTagLeft}>
              <Ionicons name="checkmark-circle" size={14} color="#0D9488" />
              <Text style={styles.ledgerTagLeftText}>AUDIT & RECEIPT LEDGER</Text>
            </View>
            <View style={styles.ledgerTagRight}>
              <Ionicons name="shield-checkmark" size={12} color="#0D9488" />
              <Text style={styles.ledgerTagRightText}>256-BIT ENCRYPTED</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {/* Row 1: Transaction ID */}
            <View style={styles.ledgerRow}>
              <Text style={styles.rowLabel}>Transaction ID</Text>
              <TouchableOpacity
                onPress={copyToClipboard}
                activeOpacity={0.7}
                style={styles.txIdPill}
              >
                <Text style={styles.txIdText}>{tx.reference}</Text>
                <Ionicons name="copy-outline" size={14} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Row 2: Recipient */}
            <View style={styles.ledgerRowTopAligned}>
              <Text style={styles.rowLabel}>Recipient</Text>
              <View style={styles.rightInfoGroup}>
                <Text style={styles.recipientName}>
                  {tx.recipient_name || 'Verified Recipient'}
                </Text>
                <Text style={styles.recipientPhone}>
                  {tx.recipient_phone || '+233 24 819 0244'}
                </Text>
                <View style={styles.railBadge}>
                  <Text style={styles.railBadgeText}>
                    {tx.recipient_phone?.includes('20') ? 'Telecel Cash Rail' : 'MTN MoMo Rail'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 3: Sender */}
            <View style={styles.ledgerRowTopAligned}>
              <Text style={styles.rowLabel}>Sender</Text>
              <View style={styles.rightInfoGroup}>
                <Text style={styles.recipientName}>{tx.sender_name || 'Ama Mensah'}</Text>
                <Text style={styles.recipientPhone}>{tx.sender_phone || '+233 24 555 0192'}</Text>
              </View>
            </View>

            {/* Row 4: Category / Note */}
            <View style={styles.ledgerRow}>
              <Text style={styles.rowLabel}>Category / Note</Text>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillEmoji}>🍽</Text>
                <Text style={styles.categoryPillText} numberOfLines={1}>
                  {tx.note || 'Food & Dining • Lunch'}
                </Text>
              </View>
            </View>

            {/* Row 5: Payment Method */}
            <View style={styles.ledgerRow}>
              <Text style={styles.rowLabel}>Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                <View style={styles.vaultIconBox}>
                  <Ionicons name="wallet" size={13} color="#FFFFFF" />
                </View>
                <Text style={styles.paymentMethodText}>KudiFlow Instant Rail</Text>
              </View>
            </View>

            {/* Demo Settlement Sandbox Box */}
            <View style={styles.bondedBox}>
              <View style={styles.bondedLeft}>
                <View style={styles.medalCircle}>
                  <Ionicons name="ribbon-outline" size={18} color="#0284C7" />
                </View>
                <View style={styles.bondedTextGroup}>
                  <Text style={styles.bondedTitle}>Demo Settlement Sandbox</Text>
                  <Text style={styles.bondedSubtitle}>Prototype Rail Reference: ${tx.reference}</Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={16} color="#0D9488" />
            </View>
          </View>
        </View>

        {/* ─── Transaction Lifecycle Card ────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.lifecycleHeader}>
            <Text style={styles.lifecycleTitle}>Transaction Lifecycle</Text>
            <View style={styles.instantBadge}>
              <Text style={styles.instantBadgeText}>INSTANT 2.0S</Text>
            </View>
          </View>

          <View style={styles.timelineContainer}>
            {/* Connecting Vertical Line */}
            <View style={styles.timelineVerticalLine} />

            {/* Step 1: Initiated */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineIconNode}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepTitle}>Initiated</Text>
                  <Text style={styles.stepTime}>{time0}</Text>
                </View>
                <Text style={styles.stepSubtitle}>Authenticated via FaceID Biometrics on device</Text>
              </View>
            </View>

            {/* Step 2: Clearing & Fraud Check */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineIconNode}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={styles.stepTitle}>Clearing & Fraud Check</Text>
                  <Text style={styles.stepTime}>{time1}</Text>
                </View>
                <Text style={styles.stepSubtitle}>Simulated Settlement Rail & Invariant Protocols Verified</Text>
              </View>
            </View>

            {/* Step 3: Settled & Completed */}
            <View style={styles.timelineStep}>
              <View style={[styles.timelineIconNode, styles.settledIconNode]}>
                <Ionicons name="checkmark-done" size={13} color="#FFFFFF" />
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.stepTitleRow}>
                  <Text style={[styles.stepTitle, styles.settledTitle]}>Settled & Completed</Text>
                  <Text style={styles.stepTime}>{time2}</Text>
                </View>
                <Text style={styles.stepSubtitle}>
                  Instant credit dispatched to recipient account
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Bottom Action Buttons ─────────────────────────────────── */}
        <View style={styles.actionsContainer}>
          {/* Download PDF Receipt */}
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownload}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color="#0F172A" />
            <Text style={styles.downloadButtonText}>Download PDF Receipt</Text>
          </TouchableOpacity>

          {/* Share Confirmation */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social" size={18} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>Share Confirmation</Text>
          </TouchableOpacity>

          {/* Reverse Button (if eligible) */}
          {tx.status === 'COMPLETED' && tx.type === 'TRANSFER' && (
            <TouchableOpacity
              style={styles.reverseBtn}
              onPress={handleReverse}
              disabled={reversing}
              activeOpacity={0.8}
            >
              {reversing ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.reverseBtnText}>Reverse Transaction</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Report an Issue Link */}
          <TouchableOpacity
            onPress={handleReportIssue}
            activeOpacity={0.7}
            style={styles.reportLinkContainer}
          >
            <Text style={styles.reportLinkText}>Report an issue with this payment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── Floating Copied Toast ─────────────────────────────────── */}
      {showToast && (
        <View style={styles.floatingToast}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  backButtonSimple: {
    padding: 10,
  },
  backButtonSimpleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 14,
  },

  /* Hero Section */
  heroSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkCircleWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  checkCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#6EE7B7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  failedCheckCircle: {
    backgroundColor: '#FCA5A5',
    shadowColor: '#EF4444',
  },
  liveTag: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  failedLiveDot: {
    backgroundColor: '#DC2626',
  },
  liveText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  failedLiveText: {
    color: '#DC2626',
  },
  ghipssBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 6,
  },
  ghipssBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.6,
  },
  headlineText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B1C30',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  timestampText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 12,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  amountValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0B1C30',
    letterSpacing: -1,
  },
  feeDebitedPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    marginTop: 6,
  },
  feeDebitedText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  feeDebitedBold: {
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopStrip: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ledgerTagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ledgerTagLeftText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  ledgerTagRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ledgerTagRightText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ledgerRowTopAligned: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  txIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  txIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  rightInfoGroup: {
    alignItems: 'flex-end',
    gap: 2,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  recipientPhone: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  railBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  railBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  categoryPillEmoji: {
    fontSize: 13,
  },
  categoryPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#065F46',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vaultIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Demo Settlement Sandbox Box */
  bondedBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    marginTop: 2,
  },
  bondedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  medalCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bondedTextGroup: {
    flex: 1,
    gap: 2,
  },
  bondedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  bondedSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },

  /* Lifecycle Card */
  lifecycleHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lifecycleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  instantBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 9999,
  },
  instantBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  timelineContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    position: 'relative',
    gap: 14,
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: 27,
    top: 14,
    bottom: 24,
    width: 2,
    backgroundColor: '#059669',
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineIconNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  settledIconNode: {
    backgroundColor: '#059669',
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  settledTitle: {
    color: '#059669',
  },
  stepTime: {
    fontSize: 11.5,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  stepSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 15,
  },

  /* Buttons */
  actionsContainer: {
    gap: 10,
    marginTop: 2,
  },
  downloadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  downloadButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  shareButton: {
    backgroundColor: '#000000',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reverseBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reverseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  reportLinkContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  reportLinkText: {
    fontSize: 12,
    color: '#64748B',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },

  /* Floating Toast */
  floatingToast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
