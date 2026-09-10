import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '../../store/wallet.store';

interface SavingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const DURATIONS = [
  { days: 30, rate: 10.5, label: '30 Days' },
  { days: 90, rate: 12.0, label: '90 Days' },
  { days: 180, rate: 13.5, label: '180 Days' },
  { days: 365, rate: 14.5, label: '1 Year' },
];

export const SavingsModal: React.FC<SavingsModalProps> = ({ visible, onClose }) => {
  const [amount, setAmount] = useState('500');
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[3]);

  const numAmount = parseFloat(amount) || 0;
  const estimatedReturn = ((numAmount * (selectedDuration.rate / 100) * selectedDuration.days) / 365).toFixed(2);
  const totalMaturity = (numAmount + parseFloat(estimatedReturn)).toFixed(2);

  const handleStartSaving = () => {
    Alert.alert(
      'Smart Pot Locked!',
      `You have allocated GH₵ ${numAmount.toFixed(2)} to Smart Pot at ${selectedDuration.rate}% p.a. for ${selectedDuration.label}. (Interest accrued daily)`,
      [{ text: 'Great!', onPress: onClose }],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Smart Pot Savings</Text>
              <Text style={styles.subtitle}>Earn up to 14.5% annual return on your Cedis</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Rates Highlight */}
            <View style={styles.highlightBox}>
              <Text style={styles.highlightRate}>14.5% p.a.</Text>
              <Text style={styles.highlightSub}>Guaranteed High-Yield Fixed Cedi Vault</Text>
            </View>

            {/* Lock Duration */}
            <Text style={styles.label}>Choose Lock Period</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((d) => {
                const isSelected = selectedDuration.days === d.days;
                return (
                  <TouchableOpacity
                    key={d.days}
                    style={[styles.durationChip, isSelected && styles.durationChipActive]}
                    onPress={() => setSelectedDuration(d)}
                  >
                    <Text style={[styles.durationChipText, isSelected && styles.durationChipTextActive]}>
                      {d.label}
                    </Text>
                    <Text style={[styles.durationRate, isSelected && styles.durationRateActive]}>
                      {d.rate}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Amount */}
            <Text style={styles.label}>Savings Deposit Amount (GH₵)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencyPrefix}>GH₵</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
              />
            </View>

            {/* Projection Card */}
            <View style={styles.projectionCard}>
              <View style={styles.projectionRow}>
                <Text style={styles.projLabel}>Principal</Text>
                <Text style={styles.projVal}>GH₵ {numAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.projectionRow}>
                <Text style={styles.projLabel}>Estimated Interest Earned</Text>
                <Text style={styles.projValGreen}>+GH₵ {estimatedReturn}</Text>
              </View>
              <View style={[styles.projectionRow, styles.projTotalRow]}>
                <Text style={styles.projTotalLabel}>Total at Maturity</Text>
                <Text style={styles.projTotalVal}>GH₵ {totalMaturity}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={handleStartSaving}>
              <Text style={styles.startBtnText}>Start Smart Pot</Text>
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '80%',
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
  highlightBox: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  highlightRate: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00E676',
  },
  highlightSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  durationChipActive: {
    borderColor: '#00B176',
    backgroundColor: '#F0FDF4',
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  durationChipTextActive: {
    color: '#006C49',
  },
  durationRate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  durationRateActive: {
    color: '#00B176',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
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
  projectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  projLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  projVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  projValGreen: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B176',
  },
  projTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  projTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  projTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  startBtn: {
    backgroundColor: '#00E676',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C1220',
  },
});
