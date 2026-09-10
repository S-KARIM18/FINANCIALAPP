/**
 * Send Money Screen
 *
 * Flow:
 * 1. User enters recipient phone number (or selects a verified Ghanaian beneficiary)
 *    and specifies amount/memo.
 * 2. THEN, the screen reveals the exact Ghanaian Verified Recipient details card,
 *    fee breakdown, total deduction, and the tactile Slide-to-Send slider
 *    matching the official design (media_1788972772846.png).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SwipeToSend } from '../../components/ui/SwipeToSend';
import { formatAmount } from '../../utils/format';
import { useWalletStore } from '../../store/wallet.store';

interface Beneficiary {
  name: string;
  phone: string;
  rawPhone: string;
  rail: string;
  avatar: string;
}

const BENEFICIARIES: Beneficiary[] = [
  {
    name: 'Ama Mensah',
    phone: '+233 24 819 0244',
    rawPhone: '+233248190244',
    rail: 'KudiFlow Wallet',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Kwame Asante',
    phone: '+233 24 410 0200',
    rawPhone: '+233244100200',
    rail: 'MTN MoMo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Kofi Boateng',
    phone: '+233 20 011 0022',
    rawPhone: '+233200110022',
    rail: 'Telecel Cash',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];

const PRESET_AMOUNTS = ['50', '100', '200', '500'];

export default function SendMoneyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone?: string;
    amount?: string;
    note?: string;
    idempotencyKey?: string;
  }>();

  const { account } = useWalletStore();

  const initialPhone = params.phone || '';
  const [recipientInput, setRecipientInput] = useState(initialPhone || '024 819 0244');
  const [amountInput, setAmountInput] = useState(params.amount || '500.00');
  const [noteInput, setNoteInput] = useState(params.note || 'Lunch at Buka Restaurant 🍗');

  // State flag: true = details card visible, false = entering recipient number
  const [hasConfirmedRecipient, setHasConfirmedRecipient] = useState(Boolean(initialPhone));
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(() => {
    if (initialPhone) {
      const match = BENEFICIARIES.find((b) =>
        b.rawPhone === initialPhone || b.phone === initialPhone || initialPhone.includes(b.rawPhone.slice(-9))
      );
      return match || {
        name: 'Ghanaian Verified Recipient',
        phone: initialPhone,
        rawPhone: initialPhone,
        rail: 'KudiFlow Wallet',
        avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
      };
    }
    return BENEFICIARIES[0];
  });

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [swipeCompleted, setSwipeCompleted] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Financial calculations
  const transferNum = parseFloat(amountInput) || 500.0;
  const feeNum = 2.0;
  const totalNum = transferNum + feeNum;
  const formattedTransfer = transferNum.toFixed(2);
  const formattedFee = feeNum.toFixed(2);
  const formattedTotal = totalNum.toFixed(2);

  const availableBalance = account?.balance ? formatAmount(account.balance) : '4,850.00';
  const actualIdempotencyKey = params.idempotencyKey || `tx-${Date.now()}`;

  const handleSelectContact = (contact: Beneficiary) => {
    setSelectedBeneficiary(contact);
    setRecipientInput(contact.phone);
    setInputError(null);
    setHasConfirmedRecipient(true);
  };

  const handleConfirmRecipient = () => {
    const trimmed = recipientInput.trim().replace(/\s+/g, '');
    if (!trimmed || trimmed.length < 9) {
      setInputError('Please enter a valid Ghana phone number (min 9 digits).');
      return;
    }

    const match = BENEFICIARIES.find((b) =>
      b.rawPhone === trimmed || b.rawPhone.includes(trimmed.slice(-9)) || b.phone.includes(trimmed)
    );

    if (match) {
      setSelectedBeneficiary(match);
    } else {
      setSelectedBeneficiary({
        name: 'Ghanaian Verified Recipient',
        phone: recipientInput,
        rawPhone: trimmed.startsWith('+233') ? trimmed : `+233${trimmed.replace(/^0/, '')}`,
        rail: 'MTN MoMo / KudiFlow',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      });
    }

    setInputError(null);
    setHasConfirmedRecipient(true);
  };

  const handleSwipeComplete = () => {
    if (isSubmitting) return;
    setSwipeCompleted(true);
    setPinInput('');
    setPinError(null);
    setShowPinModal(true);
  };

  const handleKeyPressPin = (digit: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      setPinError(null);
      if (next.length === 4) {
        setTimeout(() => {
          handleConfirmPin(next);
        }, 120);
      }
    }
  };

  const handleBackspacePin = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleCancelPin = () => {
    setShowPinModal(false);
    setPinInput('');
    setPinError(null);
    setSwipeCompleted(false);
    setIsSwiping(false);
  };

  const handleConfirmPin = (enteredPin: string) => {
    if (enteredPin.length !== 4) {
      setPinError('Please enter your 4-digit PIN');
      return;
    }
    setShowPinModal(false);
    setIsSubmitting(true);

    const destPhone = selectedBeneficiary?.rawPhone || recipientInput.trim();

    router.push({
      pathname: '/send/processing',
      params: {
        phone: destPhone,
        amount: formattedTransfer,
        fee: formattedFee,
        totalAmount: formattedTotal,
        idempotencyKey: actualIdempotencyKey,
        note: noteInput,
        pin: enteredPin,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── Top Header ────────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              if (hasConfirmedRecipient && !params.phone) {
                setHasConfirmedRecipient(false);
              } else {
                router.back();
              }
            }}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Send Money</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.helpButton} activeOpacity={0.7}>
            <Feather name="help-circle" size={22} color="#475569" />
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          scrollEnabled={!isSwiping}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── KudiFlow Guarantee Banner ─────────────────────────────── */}
          <View style={styles.guaranteeCard}>
            <View style={styles.shieldBox}>
              <Ionicons name="shield-checkmark" size={18} color="#2563EB" />
            </View>
            <View style={styles.guaranteeTextGroup}>
              <View style={styles.guaranteeTitleRow}>
                <Text style={styles.guaranteeTitle}>KudiFlow Guarantee</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.guaranteeSubtitle}>
                Zero fees on instant wallet-to-wallet transfers. Demo settlement rail &
                prototype verification active.
              </Text>
            </View>
          </View>

          {/* ─── STEP 1: Enter Recipient Phone (Before details are shown) ─ */}
          {!hasConfirmedRecipient ? (
            <View style={styles.inputCard}>
              <View style={styles.inputSectionHeader}>
                <Text style={styles.inputSectionTitle}>Enter Recipient Details</Text>
                <Text style={styles.inputSectionSubtitle}>
                  Enter the recipient's Ghana phone number to review transfer details.
                </Text>
              </View>

              {/* Phone Input Box */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>RECIPIENT PHONE</Text>
                <View style={[styles.phoneInputContainer, inputError ? styles.inputErrorBorder : null]}>
                  <View style={styles.flagBadge}>
                    <Text style={styles.flagEmoji}>🇬🇭</Text>
                    <Text style={styles.dialCode}>+233</Text>
                  </View>
                  <TextInput
                    style={styles.phoneTextInput}
                    value={recipientInput}
                    onChangeText={(t) => {
                      setRecipientInput(t);
                      setInputError(null);
                    }}
                    placeholder="024 819 0244"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    autoFocus
                  />
                  {recipientInput.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setRecipientInput('')}
                      style={styles.clearBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
                {inputError && <Text style={styles.errorText}>{inputError}</Text>}
              </View>

              {/* Quick Select Beneficiaries */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>OR SELECT VERIFIED BENEFICIARY</Text>
                <View style={styles.beneficiariesList}>
                  {BENEFICIARIES.map((item) => (
                    <TouchableOpacity
                      key={item.phone}
                      style={styles.beneficiaryRow}
                      activeOpacity={0.7}
                      onPress={() => handleSelectContact(item)}
                    >
                      <Image source={{ uri: item.avatar }} style={styles.contactAvatar} />
                      <View style={styles.contactInfo}>
                        <View style={styles.contactNameRow}>
                          <Text style={styles.contactName}>{item.name}</Text>
                          <Ionicons name="checkmark-circle" size={13} color="#0D9488" />
                        </View>
                        <Text style={styles.contactPhone}>{item.phone} • {item.rail}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>TRANSFER AMOUNT (GH₵)</Text>
                <View style={styles.amountInputBox}>
                  <Text style={styles.amountCurrencyPrefix}>GH₵</Text>
                  <TextInput
                    style={styles.amountTextInput}
                    value={amountInput}
                    onChangeText={setAmountInput}
                    placeholder="500.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Quick amount chips */}
                <View style={styles.presetChipsRow}>
                  {PRESET_AMOUNTS.map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[
                        styles.presetChip,
                        amountInput === amt && styles.presetChipActive,
                      ]}
                      onPress={() => setAmountInput(amt)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          amountInput === amt && styles.presetChipTextActive,
                        ]}
                      >
                        GH₵ {amt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reference Memo */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>REFERENCE MEMO</Text>
                <View style={styles.memoInputContainer}>
                  <Ionicons name="reader-outline" size={18} color="#64748B" />
                  <TextInput
                    style={styles.memoTextInput}
                    value={noteInput}
                    onChangeText={setNoteInput}
                    placeholder="What is this transfer for?"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Confirm & Review Button */}
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={handleConfirmRecipient}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryActionButtonText}>
                  Verify & Review Transfer →
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ─── STEP 2: The Exact Verified Details Screen (from image) ─── */
            <>
              {/* Main White Card */}
              <View style={styles.mainReceiptCard}>
                {/* Ghanaian Verified Recipient Inner Box */}
                <View style={styles.recipientBox}>
                  <View style={styles.recipientHeaderRow}>
                    <View style={styles.verifiedTagRow}>
                      <Ionicons name="checkmark-circle" size={13} color="#0D9488" />
                      <Text style={styles.verifiedTagText}>GHANAIAN VERIFIED RECIPIENT</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setHasConfirmedRecipient(false)}
                      style={styles.changeRecipientBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.changeRecipientText}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.recipientRow}>
                    <Image
                      source={{
                        uri: selectedBeneficiary?.avatar || 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
                      }}
                      style={styles.recipientAvatar}
                    />

                    <View style={styles.recipientDetails}>
                      <Text style={styles.recipientName}>
                        {selectedBeneficiary?.name || 'Ama Mensah'}
                      </Text>
                      <View style={styles.recipientPhoneRow}>
                        <Text style={styles.recipientPhone}>
                          {selectedBeneficiary?.phone || recipientInput}
                        </Text>
                        <View style={styles.walletDot} />
                        <Text style={styles.walletLabel}>
                          {selectedBeneficiary?.rail || 'KudiFlow Wallet'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Fee Breakdown Rows */}
                <View style={styles.feeBreakdown}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Transfer amount</Text>
                    <Text style={styles.feeValue}>GH₵ {formattedTransfer}</Text>
                  </View>

                  <View style={styles.feeRow}>
                    <View style={styles.labelWithBadge}>
                      <Text style={styles.feeLabel}>Service fee</Text>
                      <View style={styles.standardBadge}>
                        <Text style={styles.standardBadgeText}>STANDARD</Text>
                      </View>
                    </View>
                    <Text style={styles.feeValue}>GH₵ {formattedFee}</Text>
                  </View>

                  <View style={styles.feeRow}>
                    <View style={styles.labelWithBadge}>
                      <Text style={styles.feeLabel}>E-Levy / Regulatory</Text>
                      <View style={styles.exemptBadge}>
                        <Text style={styles.exemptBadgeText}>EXEMPT</Text>
                      </View>
                    </View>
                    <Text style={styles.exemptValue}>GH₵ 0.00</Text>
                  </View>
                </View>

                {/* Total Deduction Callout */}
                <View style={styles.totalDeductionRow}>
                  <View style={styles.totalLabelGroup}>
                    <Text style={styles.totalDeductionTitle}>TOTAL DEDUCTION</Text>
                    <Text style={styles.totalDeductionSub}>Instant settlement ready</Text>
                  </View>

                  <View style={styles.totalAmountGroup}>
                    <Text style={styles.totalCurrencyCode}>GH₵</Text>
                    <Text
                      style={styles.totalNumber}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formattedTotal}
                    </Text>
                  </View>
                </View>

                {/* Funding Source Container */}
                <View style={styles.infoPillBox}>
                  <View style={styles.fundingIconCircle}>
                    <Ionicons name="card" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.infoPillTextGroup}>
                    <Text style={styles.infoPillLabel}>Funding Source</Text>
                    <Text style={styles.infoPillValue}>KudiFlow Primary ...</Text>
                  </View>
                  <Text style={styles.balanceRemainingText}>GH₵ {availableBalance} left</Text>
                </View>

                {/* Reference Memo Container */}
                <View style={[styles.infoPillBox, styles.memoPillBox]}>
                  <View style={styles.memoIconCircle}>
                    <Ionicons name="reader" size={15} color="#2563EB" />
                  </View>
                  <View style={styles.infoPillTextGroup}>
                    <Text style={styles.infoPillLabel}>Reference Memo</Text>
                    <Text style={styles.infoPillValue} numberOfLines={1}>
                      {noteInput}
                    </Text>
                  </View>
                  <Ionicons name="lock-closed" size={14} color="#94A3B8" />
                </View>
              </View>

              {/* ─── Slide to Send Slider ──────────────────────────────────── */}
              <View style={styles.sliderContainer}>
                <SwipeToSend
                  amount={formattedTotal}
                  onComplete={handleSwipeComplete}
                  onSwipeStart={() => setIsSwiping(true)}
                  onSwipeEnd={() => setIsSwiping(false)}
                  disabled={isSubmitting}
                  completed={swipeCompleted}
                />
              </View>

              {/* ─── Disclaimer ────────────────────────────────────────────── */}
              <View style={styles.disclaimerRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                <Text style={styles.disclaimerText}>
                  Sliding executes instant payment. Double-tap disabled to prevent duplicate charges.
                </Text>
              </View>

              {/* ─── Touch ID / Biometric Pill ─────────────────────────────── */}
              <TouchableOpacity
                style={styles.biometricPill}
                activeOpacity={0.8}
                onPress={handleSwipeComplete}
              >
                <View style={styles.fingerprintCircle}>
                  <Ionicons name="finger-print" size={18} color="#2563EB" />
                </View>
                <Text style={styles.biometricPillText}>Or Authorize with Touch ID</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {/* ─── Security PIN Verification Modal ────────────────────── */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelPin}
      >
        <View style={styles.pinModalOverlay}>
          <View style={styles.pinModalCard}>
            <View style={styles.pinModalHeader}>
              <View style={styles.pinShieldCircle}>
                <Ionicons name="lock-closed" size={24} color="#006C49" />
              </View>
              <Text style={styles.pinModalTitle}>Enter Transaction PIN</Text>
              <Text style={styles.pinModalSubtitle}>
                Authorizing GH₵ {formattedTotal} to {selectedBeneficiary?.name || recipientInput}
              </Text>
            </View>

            {/* 4 Masked PIN Indicator Dots */}
            <View style={styles.pinDotsRow}>
              {[0, 1, 2, 3].map((idx) => {
                const filled = pinInput.length > idx;
                return (
                  <View
                    key={idx}
                    style={[styles.pinDot, filled && styles.pinDotFilled]}
                  />
                );
              })}
            </View>

            {pinError ? (
              <Text style={styles.pinErrorText}>{pinError}</Text>
            ) : (
              <Text style={styles.pinPromptText}>Enter your 4-digit security PIN</Text>
            )}

            {/* Custom Numeric Keypad */}
            <View style={styles.keypadGrid}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['cancel', '0', 'backspace'],
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.keypadRow}>
                  {row.map((key) => {
                    if (key === 'cancel') {
                      return (
                        <TouchableOpacity
                          key={key}
                          style={styles.keypadKeyAction}
                          onPress={handleCancelPin}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.keypadCancelText}>Cancel</Text>
                        </TouchableOpacity>
                      );
                    }
                    if (key === 'backspace') {
                      return (
                        <TouchableOpacity
                          key={key}
                          style={styles.keypadKeyAction}
                          onPress={handleBackspacePin}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="backspace-outline" size={22} color="#0F172A" />
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        key={key}
                        style={styles.keypadKeyNum}
                        onPress={() => handleKeyPressPin(key)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.keypadKeyNumText}>{key}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
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
    paddingTop: 6,
    paddingBottom: 40,
    gap: 14,
  },

  /* Guarantee Banner */
  guaranteeCard: {
    backgroundColor: '#EEF4FF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  shieldBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  guaranteeTextGroup: {
    flex: 1,
    gap: 3,
  },
  guaranteeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeBadge: {
    backgroundColor: '#6EE7B7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: 0.5,
  },
  guaranteeSubtitle: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },

  /* Step 1: Input Card */
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  inputSectionHeader: {
    gap: 4,
    paddingBottom: 4,
  },
  inputSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  inputSectionSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 17,
  },
  fieldWrapper: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
    gap: 10,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  flagEmoji: {
    fontSize: 16,
  },
  dialCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  clearBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 11.5,
    color: '#EF4444',
    marginTop: 2,
  },
  beneficiariesList: {
    gap: 8,
  },
  beneficiaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactPhone: {
    fontSize: 11.5,
    color: '#64748B',
  },
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
  },
  amountCurrencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  amountTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: '#1E293B',
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  memoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  memoTextInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  primaryActionButton: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  /* Step 2: Main Receipt Card (Pixel Perfect from Screenshot) */
  mainReceiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  recipientBox: {
    backgroundColor: '#F0F6FF',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  recipientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.4,
  },
  changeRecipientBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#E0EDFF',
  },
  changeRecipientText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recipientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  recipientDetails: {
    flex: 1,
    gap: 3,
  },
  recipientName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  recipientPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  recipientPhone: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
  },
  walletDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
  },
  walletLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#2563EB',
    flexShrink: 1,
  },

  /* Breakdown */
  feeBreakdown: {
    gap: 10,
    paddingHorizontal: 2,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feeLabel: {
    fontSize: 13.5,
    color: '#475569',
    fontWeight: '500',
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  standardBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  standardBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.4,
  },
  exemptBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exemptBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.4,
  },
  feeValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  exemptValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#059669',
  },

  /* Total Deduction */
  totalDeductionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  totalLabelGroup: {
    flexShrink: 1,
    gap: 2,
  },
  totalDeductionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  totalDeductionSub: {
    fontSize: 11.5,
    color: '#0284C7',
    fontWeight: '500',
  },
  totalAmountGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 3,
    flexShrink: 0,
    maxWidth: '56%',
  },
  totalCurrencyCode: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  totalNumber: {
    fontSize: 25,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    lineHeight: 30,
    textAlign: 'right',
  },

  /* Funding Source & Memo */
  infoPillBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  memoPillBox: {
    backgroundColor: '#F0F6FF',
    borderColor: '#E2E8F0',
  },
  fundingIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPillTextGroup: {
    flex: 1,
    gap: 2,
  },
  infoPillLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  infoPillValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  balanceRemainingText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Slider */
  sliderContainer: {
    marginTop: 6,
    width: '100%',
    alignItems: 'center',
  },

  /* Disclaimer */
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
    flex: 1,
  },

  /* Biometric Pill */
  biometricPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 9999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'center',
    marginTop: 2,
  },
  fingerprintCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricPillText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  /* ─── PIN Modal Styles ────────────────────────────────────────── */
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  pinModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  pinModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pinShieldCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  pinModalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  pinDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 8,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    borderColor: '#006C49',
    backgroundColor: '#006C49',
  },
  pinErrorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 16,
  },
  pinPromptText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
  },
  keypadGrid: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keypadKeyNum: {
    width: 76,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  keypadKeyNumText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  keypadKeyAction: {
    width: 76,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
