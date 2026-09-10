/**
 * KudiFlow Create PIN Screen
 * 4-dot indicator + numeric keypad.
 * Matches Stitch otp_verification_pin_setup design.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { PINInput } from '../../components/ui/PINInput';
import { Button } from '../../components/ui/Button';
import * as authApi from '../../services/auth.api';
import { getApiErrorMessage } from '../../utils/format';

type Step = 'create' | 'confirm';

export default function CreatePINScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [step, setStep] = useState<Step>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentValue = step === 'create' ? pin : confirmPin;
  const currentSetter = step === 'create' ? setPin : setConfirmPin;

  const handleContinue = async () => {
    if (step === 'create') {
      if (pin.length !== 4) { setError('Please enter a 4-digit PIN.'); return; }
      setStep('confirm');
      setError(null);
      return;
    }

    // Confirm step
    if (confirmPin !== pin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.setPin(pin, confirmPin);
      // Now go to login
      Alert.alert(
        'PIN Created!',
        'Your transaction PIN has been set. Please log in to continue.',
        [{ text: 'Log In', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {step === 'create' ? 'Create your PIN' : 'Confirm your PIN'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'create'
              ? 'This 4-digit PIN secures your transactions.'
              : 'Enter your PIN again to confirm.'}
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <PINInput
          value={currentValue}
          onChange={currentSetter}
          label={step === 'create' ? 'Enter 4-digit PIN' : 'Confirm your PIN'}
        />

        <Button
          title={step === 'create' ? 'Continue' : 'Set PIN & Continue'}
          onPress={handleContinue}
          loading={loading}
          disabled={currentValue.length !== 4}
          style={styles.ctaBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenEdgePadding,
    paddingTop: Spacing.space3xl,
    gap: Spacing.spaceXl,
  },
  header: { gap: Spacing.spaceXs },
  title: { fontSize: 28, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.56 },
  subtitle: { fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 20 },
  errorBanner: { backgroundColor: Colors.errorContainer, borderRadius: 12, padding: 16 },
  errorText: { fontSize: 13, color: Colors.onErrorContainer },
  ctaBtn: { width: '100%' },
});
