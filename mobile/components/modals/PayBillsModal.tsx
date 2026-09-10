import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { payBill } from '../../services/transaction.api';
import { useWalletStore } from '../../store/wallet.store';


interface PayBillsModalProps {
  visible: boolean;
  onClose: () => void;
}

const BILLERS = [
  { code: 'ECG', name: 'ECG Prepaid Electricity', label: 'Meter Number', icon: 'flash-outline' },
  { code: 'GWCL', name: 'Ghana Water Company Ltd', label: 'Customer Account No.', icon: 'water-outline' },
  { code: 'MTN_FIBER', name: 'MTN Fiber Broadband', label: 'Account / Phone No.', icon: 'wifi-outline' },
  { code: 'DSTV', name: 'DSTV & GOtv Ghana', label: 'Smartcard / IUC No.', icon: 'tv-outline' },
];

export const PayBillsModal: React.FC<PayBillsModalProps> = ({ visible, onClose }) => {
  const [selectedBiller, setSelectedBiller] = useState(BILLERS[0]);
  const [customerNumber, setCustomerNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'details' | 'pin' | 'success'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; amount: string; totalDebited: string } | null>(null);

  const account = useWalletStore((s) => s.account);
  const fetchBalance = useWalletStore((s) => s.fetchBalance);
  const fetchTransactions = useWalletStore((s) => s.fetchTransactions);

  const handleProceedToPin = () => {
    if (!customerNumber.trim() || customerNumber.trim().length < 4) {
      Alert.alert('Invalid Account', `Please enter a valid ${selectedBiller.label}.`);
      return;
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    const totalNeeded = num + 1.0; // GH₵ 1.00 fee
    const currentBalance = parseFloat(account?.balance || '0');
    if (currentBalance < totalNeeded) {
      Alert.alert(
        'Insufficient Balance',
        `Available: GH₵ ${currentBalance.toFixed(2)}, Required: GH₵ ${totalNeeded.toFixed(2)} (including GH₵ 1.00 fee).`,
      );
      return;
    }

    setStep('pin');
  };

  const handleExecutePayment = async () => {
    if (pin.length !== 4) {
      Alert.alert('PIN Required', 'Please enter your 4-digit transaction PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const idempotencyKey = `bill_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await payBill({
        billerCode: selectedBiller.code,
        customerNumber: customerNumber.trim(),
        amount: parseFloat(amount).toFixed(2),
        pin,
        idempotencyKey,
      });

      await Promise.all([fetchBalance(), fetchTransactions()]);

      setReceipt({
        reference: res.transaction.reference,
        amount: res.transaction.amount,
        totalDebited: res.transaction.total_amount,
      });
      setStep('success');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Payment failed.';
      Alert.alert('Bill Payment Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep('details');
    setCustomerNumber('');
    setAmount('');
    setPin('');
    setReceipt(null);
    onClose();
  };

  const numAmount = parseFloat(amount) || 0;
  const totalAmount = (numAmount > 0 ? numAmount + 1.0 : 0).toFixed(2);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {step === 'pin' ? 'Authorize Payment' : step === 'success' ? 'Payment Receipt' : 'Pay Bills'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'pin'
                  ? 'Enter 4-digit PIN to confirm'
                  : step === 'success'
                  ? 'Utility Biller Settled'
                  : 'Direct utility & broadband settlement'}
              </Text>
            </View>
            <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {step === 'success' && receipt ? (
            <View style={styles.successBox}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-done-circle" size={48} color="#00B176" />
              </View>
              <Text style={styles.successTitle}>Bill Settled Successfully!</Text>
              <Text style={styles.successAmount}>-GH₵ {receipt.totalDebited}</Text>
              <Text style={styles.successBiller}>{selectedBiller.name}</Text>
              <Text style={styles.successRef}>Ref: {receipt.reference}</Text>

              <View style={styles.receiptDetails}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Account / Meter</Text>
                  <Text style={styles.receiptVal}>{customerNumber}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Bill Amount</Text>
                  <Text style={styles.receiptVal}>GH₵ {receipt.amount}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Convenience Fee</Text>
                  <Text style={styles.receiptVal}>GH₵ 1.00</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.doneBtn} onPress={resetAndClose}>
                <Text style={styles.doneBtnText}>Close Receipt</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'pin' ? (
            <View style={styles.pinStepBox}>
              <View style={styles.confirmSummary}>
                <Text style={styles.confirmBiller}>{selectedBiller.name}</Text>
                <Text style={styles.confirmAccount}>Account: {customerNumber}</Text>
                <Text style={styles.confirmTotal}>Total: GH₵ {totalAmount}</Text>
                <Text style={styles.confirmFeeNotice}>Includes GH₵ 1.00 convenience fee</Text>
              </View>

              <Text style={styles.pinPrompt}>Enter 4-digit Transaction PIN</Text>
              <TextInput
                style={styles.pinInput}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                value={pin}
                onChangeText={setPin}
                placeholder="••••"
                placeholderTextColor="#94A3B8"
                autoFocus
              />

              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleExecutePayment}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0C1220" />
                ) : (
                  <Text style={styles.submitBtnText}>Authorize GH₵ {totalAmount}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('details')}>
                <Text style={styles.backBtnText}>‹ Change Details</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Biller Select */}
              <Text style={styles.label}>Select Service Provider</Text>
              <View style={styles.billerGrid}>
                {BILLERS.map((b) => {
                  const isSelected = selectedBiller.code === b.code;
                  return (
                    <TouchableOpacity
                      key={b.code}
                      style={[styles.billerCard, isSelected && styles.billerCardActive]}
                      onPress={() => setSelectedBiller(b)}
                    >
                      <Ionicons
                        name={b.icon as any}
                        size={22}
                        color={isSelected ? '#00B176' : '#64748B'}
                      />
                      <Text style={[styles.billerName, isSelected && styles.billerNameActive]}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Customer Number Input */}
              <Text style={styles.label}>{selectedBiller.label}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={`Enter ${selectedBiller.label.toLowerCase()}`}
                placeholderTextColor="#94A3B8"
                value={customerNumber}
                onChangeText={setCustomerNumber}
              />

              {/* Amount Input */}
              <Text style={styles.label}>Amount to Pay (GH₵)</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>GH₵</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              {/* Fee Breakdown */}
              {numAmount > 0 && (
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Bill Amount</Text>
                    <Text style={styles.breakdownVal}>GH₵ {numAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Network Fee</Text>
                    <Text style={styles.breakdownVal}>GH₵ 1.00</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                    <Text style={styles.breakdownTotalLabel}>Total Deduction</Text>
                    <Text style={styles.breakdownTotalVal}>GH₵ {totalAmount}</Text>
                  </View>
                </View>
              )}

              {/* Proceed Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleProceedToPin}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Continue to Authorize</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 32, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  billerGrid: {
    gap: 8,
  },
  billerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  billerCardActive: {
    borderColor: '#00B176',
    backgroundColor: '#F0FDF4',
  },
  billerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 10,
  },
  billerNameActive: {
    color: '#006C49',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  breakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  breakdownTotalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  submitBtn: {
    backgroundColor: '#00E676',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C1220',
  },
  pinStepBox: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmSummary: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  confirmBiller: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  confirmAccount: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  confirmTotal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 10,
  },
  confirmFeeNotice: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  pinPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  pinInput: {
    width: 160,
    height: 52,
    borderWidth: 2,
    borderColor: '#00B176',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 12,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  backBtn: {
    marginTop: 10,
    padding: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  successAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 4,
  },
  successBiller: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4,
  },
  successRef: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  receiptDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginTop: 20,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
