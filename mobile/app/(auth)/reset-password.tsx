import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { OTPInput } from '../../components/ui/OTPInput';
import * as authApi from '../../services/auth.api';
import { getApiErrorMessage } from '../../utils/format';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setLoading(true); setError(null);
    try {
      await authApi.resetPassword(phone, otp, newPassword);
      router.replace('/(auth)/login');
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Enter Reset Code</Text>
        <Text style={styles.subtitle}>6-digit code sent to {phone}, plus your new password.</Text>
        {error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}
        <OTPInput value={otp} onChange={setOtp} />
        <Input label="New Password" value={newPassword} onChangeText={setNewPassword} placeholder="Min 8 characters" secureTextEntry autoComplete="new-password" />
        <Button title="Reset Password" onPress={handleReset} loading={loading} disabled={otp.length !== 6 || !newPassword} style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { flex: 1, paddingHorizontal: Spacing.screenEdgePadding, paddingTop: Spacing.space3xl, gap: Spacing.spaceXl },
  title: { fontSize: 28, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.56 },
  subtitle: { fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 20 },
  errorBanner: { backgroundColor: Colors.errorContainer, borderRadius: Radius.md, padding: Spacing.spaceMd },
  errorText: { fontSize: 13, color: Colors.onErrorContainer },
  btn: { width: '100%' },
});
