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
import { depositMoney } from '../../services/transaction.api';
import { useWalletStore } from '../../store/wallet.store';


interface AddMoneyModalProps {
  visible: boolean;
  onClose: () => void;
}

const METHODS = [
  { id: 'MTN_MOMO', name: 'MTN Mobile Money', icon: 'phone-portrait-outline', badge: 'Instant' },
  { id: 'TELECEL_CASH', name: 'Telecel Cash', icon: 'phone-portrait-outline', badge: 'Instant' },
  { id: 'BANK_CARD', name: 'Ghana Card / Bank Card', icon: 'card-outline', badge: '0% Fee' },
];

const PRESETS = ['50', '100', '200', '500', '1000'];

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ visible, onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState('MTN_MOMO');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ reference: string; amount: string } | null>(null);

  const fetchBalance = useWalletStore((s) => s.fetchBalance);
  const fetchTransactions = useWalletStore((s) => s.fetchTransactions);

  const handleDeposit = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }

    setIsLoading(true);
    try {
      const idempotencyKey = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await depositMoney({
        amount: num.toFixed(2),
        fundingMethod: selectedMethod,
        idempotencyKey,
      });

      // Refresh stores
      await Promise.all([fetchBalance(), fetchTransactions()]);

      setSuccessData({
        reference: res.transaction.reference,
        amount: res.transaction.amount,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Deposit failed. Please try again.';
      Alert.alert('Deposit Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setSuccessData(null);
    setAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Add Money</Text>
              <Text style={styles.subtitle}>Prototype Sandbox Rail • Instant Settlement</Text>
            </View>
            <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {successData ? (
            <View style={styles.successBox}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={48} color="#00B176" />
              </View>
              <Text style={styles.successTitle}>Funds Credited!</Text>
              <Text style={styles.successAmount}>+GH₵ {parseFloat(successData.amount).toFixed(2)}</Text>
              <Text style={styles.successRef}>Ref: {successData.reference}</Text>
              <Text style={styles.successNote}>
                Your wallet balance has been updated atomically via the KudiFlow demo settlement rail.
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={resetAndClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sandbox Notice Banner */}
              <View style={styles.sandboxBanner}>
                <Ionicons name="flask-outline" size={18} color="#0284C7" />
                <Text style={styles.sandboxBannerText}>
                  DEMO RAIL: Funds settle directly from the system reserve account into your wallet with atomic consistency.
                </Text>
              </View>

              {/* Funding Method */}
              <Text style={styles.label}>Select Funding Source</Text>
              <View style={styles.methodsRow}>
                {METHODS.map((m) => {
                  const isSelected = selectedMethod === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.methodCard, isSelected && styles.methodCardActive]}
                      onPress={() => setSelectedMethod(m.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={m.icon as any}
                        size={20}
                        color={isSelected ? '#00B176' : '#64748B'}
                      />
                      <Text style={[styles.methodName, isSelected && styles.methodNameActive]}>
                        {m.name}
                      </Text>
                      <View style={styles.methodBadge}>
                        <Text style={styles.methodBadgeText}>{m.badge}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount Input */}
              <Text style={styles.label}>Deposit Amount (GH₵)</Text>
              <View style={styles.inputRow}>
                <Text style={styles.currencyPrefix}>GH₵</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  editable={!isLoading}
                />
              </View>

              {/* Presets */}
              <View style={styles.presetsRow}>
                {PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.presetChip, amount === p && styles.presetChipActive]}
                    onPress={() => setAmount(p)}
                  >
                    <Text style={[styles.presetText, amount === p && styles.presetTextActive]}>
                      +{p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleDeposit}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0C1220" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm Deposit</Text>
                )}
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
  sandboxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  sandboxBannerText: {
    fontSize: 12,
    color: '#0369A1',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  methodsRow: {
    gap: 8,
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  methodCardActive: {
    borderColor: '#00B176',
    backgroundColor: '#F0FDF4',
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 10,
    flex: 1,
  },
  methodNameActive: {
    color: '#006C49',
  },
  methodBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  methodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  presetChipActive: {
    borderColor: '#00B176',
    backgroundColor: '#DCFCE7',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  presetTextActive: {
    color: '#006C49',
  },
  submitBtn: {
    backgroundColor: '#00E676',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C1220',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#006C49',
    marginTop: 6,
  },
  successRef: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontFamily: 'monospace',
  },
  successNote: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginTop: 24,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
