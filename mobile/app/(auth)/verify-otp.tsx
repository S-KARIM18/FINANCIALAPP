/**
 * KudiFlow OTP Verification Screen
 * 6-box OTP input + resend countdown.
 * After verification, goes to create-pin.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/ui/Button';
import { OTPInput } from '../../components/ui/OTPInput';
import * as authApi from '../../services/auth.api';
import * as authService from '../../services/api';
import { getApiErrorMessage } from '../../utils/format';

const RESEND_COOLDOWN = 60;

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { phone, userId } = useLocalSearchParams<{ phone: string; userId: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApi.verifyOtp(phone, otp);
      // Need a temp token to call set-pin — login with the current session
      router.push({ pathname: '/(auth)/create-pin', params: { phone, userId } });
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
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to {phone}.
          </Text>
        </View>

        <OTPInput value={otp} onChange={setOtp} />

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Resend */}
        <View style={styles.resendRow}>
          {canResend ? (
            <TouchableOpacity onPress={() => {}} activeOpacity={0.7}>
              <Text style={styles.resendLink}>Resend code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendTimer}>
              Resend in {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
            </Text>
          )}
        </View>

        <Button
          title="Verify & Continue"
          onPress={handleVerify}
          loading={loading}
          disabled={otp.length !== 6}
          style={styles.verifyBtn}
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
  errorBanner: { backgroundColor: Colors.errorContainer, borderRadius: Radius.md, padding: Spacing.spaceMd },
  errorText: { fontSize: 13, color: Colors.onErrorContainer },
  resendRow: { alignItems: 'center' },
  resendLink: { fontSize: 14, fontWeight: '700', color: Colors.primaryContainer },
  resendTimer: { fontSize: 14, color: Colors.onSurfaceVariant },
  verifyBtn: { width: '100%' },
});
