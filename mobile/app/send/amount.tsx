/**
 * Send Money — Amount Input
 * Idempotency key is generated HERE — once per intentional send intent.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { generateIdempotencyKey } from '../../utils/format';

export default function AmountScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError('Please enter a valid amount.'); return; }
    if (num > 50000) { setError('Maximum single transfer is GH₵ 50,000.'); return; }
    setError(null);

    // IDEMPOTENCY: key generated ONCE when user confirms amount
    // Passed all the way to processing screen — never regenerated
    const idempotencyKey = generateIdempotencyKey();

    router.push({
      pathname: '/send/review',
      params: { phone, amount: num.toFixed(2), note, idempotencyKey },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.step}>AMOUNT</Text>
            <Text style={styles.title}>How much?</Text>
            <Text style={styles.subtitle}>To {phone}</Text>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>GH₵</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(t) => { setAmount(t.replace(/[^0-9.]/g, '')); setError(null); }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.surfaceContainerHighest}
              autoFocus
            />
          </View>

          {amount && parseFloat(amount) > 0 && (
            <View style={styles.feeRow}>
              <Text style={styles.feeText}>
                Fee: GH₵ 2.00 · Total deducted: GH₵ {(parseFloat(amount) + 2).toFixed(2)}
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            placeholder="What's this for?"
            leftIcon={<Text style={styles.noteIcon}>💬</Text>}
          />

          <Button
            title="Review Transfer"
            onPress={handleContinue}
            disabled={!amount || parseFloat(amount) <= 0}
            style={styles.btn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  content: {
    flexGrow: 1, paddingHorizontal: Spacing.screenEdgePadding,
    paddingTop: Spacing.space2xl, gap: Spacing.spaceXl,
    paddingBottom: Spacing.space3xl,
  },
  header: { gap: Spacing.spaceXs },
  step: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.56 },
  subtitle: { fontSize: 14, color: Colors.onSurfaceVariant },
  amountContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingVertical: Spacing.spaceXl,
  },
  currencySymbol: { fontSize: 32, fontWeight: '700', color: Colors.onSurface },
  amountInput: {
    fontSize: 56, fontWeight: '800', color: Colors.onSurface,
    letterSpacing: -2, minWidth: 150,
  },
  feeRow: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md,
    padding: Spacing.spaceMd, alignItems: 'center',
  },
  feeText: { fontSize: 13, color: Colors.onSurfaceVariant, fontWeight: '500' },
  errorBanner: { backgroundColor: Colors.errorContainer, borderRadius: Radius.md, padding: Spacing.spaceMd },
  errorText: { fontSize: 13, color: Colors.onErrorContainer },
  noteIcon: { fontSize: 18 },
  btn: { width: '100%' },
});
