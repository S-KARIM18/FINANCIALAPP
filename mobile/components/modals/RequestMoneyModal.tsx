import React, { useState, useEffect } from 'react';
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
import {
  createPaymentRequest,
  listPaymentRequests,
  payPaymentRequest,
  declinePaymentRequest,
} from '../../services/payment-request.api';
import { PaymentRequest } from '../../types';
import { useWalletStore } from '../../store/wallet.store';


interface RequestMoneyModalProps {
  visible: boolean;
  onClose: () => void;
}

const QUICK_CONTACTS = [
  { name: 'Kwame Asante', phone: '+233245550193' },
  { name: 'Kofi Boateng', phone: '+233205550194' },
];

export const RequestMoneyModal: React.FC<RequestMoneyModalProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'inbound'>('create');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inboundRequests, setInboundRequests] = useState<PaymentRequest[]>([]);
  const [pin, setPin] = useState('');
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);

  const fetchBalance = useWalletStore((s) => s.fetchBalance);
  const fetchTransactions = useWalletStore((s) => s.fetchTransactions);

  useEffect(() => {
    if (visible) {
      loadInbound();
    }
  }, [visible]);

  const loadInbound = async () => {
    try {
      const requests = await listPaymentRequests('inbound', 'PENDING');
      setInboundRequests(Array.isArray(requests) ? requests : []);
    } catch {
      setInboundRequests([]);
    }
  };

  const handleCreateRequest = async () => {
    if (!recipientPhone.trim()) {
      Alert.alert('Phone Required', 'Please enter a valid recipient phone number.');
      return;
    }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a request amount greater than zero.');
      return;
    }

    setIsLoading(true);
    try {
      await createPaymentRequest({
        recipientPhone: recipientPhone.trim(),
        amount: num.toFixed(2),
        note: note.trim() || undefined,
      });

      Alert.alert('Request Sent!', `Payment request for GH₵ ${num.toFixed(2)} was sent successfully.`);
      setRecipientPhone('');
      setAmount('');
      setNote('');
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to create request.';
      Alert.alert('Request Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async (requestId: string) => {
    if (pin.length !== 4) {
      Alert.alert('PIN Required', 'Please enter your 4-digit transaction PIN to pay this request.');
      return;
    }

    setIsLoading(true);
    try {
      const idempotencyKey = `reqpay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await payPaymentRequest(requestId, pin, idempotencyKey);
      await Promise.all([fetchBalance(), fetchTransactions(), loadInbound()]);
      setPayingRequestId(null);
      setPin('');
      Alert.alert('Paid!', 'The payment request was authorized and settled.');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Payment failed.';
      Alert.alert('Payment Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await declinePaymentRequest(requestId);
      await loadInbound();
      Alert.alert('Declined', 'Payment request declined.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not decline request.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Request Money</Text>
              <Text style={styles.subtitle}>Peer-to-peer payment requests & incoming requests</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'create' && styles.tabActive]}
              onPress={() => setActiveTab('create')}
            >
              <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
                Send Request
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'inbound' && styles.tabActive]}
              onPress={() => {
                setActiveTab('inbound');
                loadInbound();
              }}
            >
              <Text style={[styles.tabText, activeTab === 'inbound' && styles.tabTextActive]}>
                Incoming ({(inboundRequests || []).length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'create' ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Quick Contacts */}
              <Text style={styles.label}>Quick Contacts</Text>
              <View style={styles.contactsRow}>
                {QUICK_CONTACTS.map((c) => (
                  <TouchableOpacity
                    key={c.phone}
                    style={styles.contactChip}
                    onPress={() => setRecipientPhone(c.phone)}
                  >
                    <Ionicons name="person-circle-outline" size={18} color="#00B176" />
                    <Text style={styles.contactName}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Phone Input */}
              <Text style={styles.label}>Payer Phone Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. +233 24 555 0193"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={recipientPhone}
                onChangeText={setRecipientPhone}
              />

              {/* Amount Input */}
              <Text style={styles.label}>Amount (GH₵)</Text>
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

              {/* Note / Purpose */}
              <Text style={styles.label}>Note / Reason (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Lunch contribution, Groceries split"
                placeholderTextColor="#94A3B8"
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleCreateRequest}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0C1220" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Payment Request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {(inboundRequests || []).length === 0 ? (
                <View style={styles.emptyRequests}>
                  <Ionicons name="mail-open-outline" size={40} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No pending requests</Text>
                  <Text style={styles.emptySubtitle}>
                    When someone sends you a payment request, it will appear here.
                  </Text>
                </View>
              ) : (
                (inboundRequests || []).map((req) => (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={styles.reqTopRow}>
                      <View>
                        <Text style={styles.reqName}>{req.requester_name || 'KudiFlow User'}</Text>
                        <Text style={styles.reqPhone}>{req.requester_phone}</Text>
                      </View>
                      <Text style={styles.reqAmount}>GH₵ {parseFloat(req.amount).toFixed(2)}</Text>
                    </View>
                    {req.note && <Text style={styles.reqNote}>"{req.note}"</Text>}

                    {payingRequestId === req.id ? (
                      <View style={styles.pinEntryBox}>
                        <Text style={styles.pinPrompt}>Enter 4-digit PIN to pay:</Text>
                        <TextInput
                          style={styles.smallPinInput}
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={4}
                          value={pin}
                          onChangeText={setPin}
                          placeholder="••••"
                          placeholderTextColor="#94A3B8"
                          autoFocus
                        />
                        <View style={styles.reqActions}>
                          <TouchableOpacity
                            style={styles.payConfirmBtn}
                            onPress={() => handlePay(req.id)}
                            disabled={isLoading}
                          >
                            <Text style={styles.payConfirmText}>Confirm Pay</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => {
                              setPayingRequestId(null);
                              setPin('');
                            }}
                          >
                            <Text style={styles.cancelText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.reqActions}>
                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() => setPayingRequestId(req.id)}
                        >
                          <Text style={styles.payBtnText}>Pay Request</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => handleDecline(req.id)}
                        >
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
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
    marginBottom: 14,
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  contactsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  contactName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#006C49',
    marginLeft: 6,
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
  submitBtn: {
    backgroundColor: '#00E676',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C1220',
  },
  emptyRequests: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  requestCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reqTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reqName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  reqPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  reqAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#006C49',
  },
  reqNote: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 6,
  },
  reqActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  payBtn: {
    flex: 1,
    backgroundColor: '#00B176',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  payBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  declineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  pinEntryBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pinPrompt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  smallPinInput: {
    width: 120,
    height: 40,
    borderWidth: 1.5,
    borderColor: '#00B176',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 8,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  payConfirmBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  payConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
