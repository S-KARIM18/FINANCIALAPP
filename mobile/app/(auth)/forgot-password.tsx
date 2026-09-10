import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import * as authApi from '../../services/auth.api';
import { getApiErrorMessage } from '../../utils/format';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setLoading(true); setError(null);
    try {
      await authApi.forgotPassword(phone);
      setSent(true);
    } catch (err) { setError(getApiErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{sent ? 'Check your phone' : 'Reset Password'}</Text>
        <Text style={styles.subtitle}>
          {sent
            ? `A reset code was sent to ${phone} if it exists in our system.`
            : 'Enter your registered phone number to receive a reset code.'}
        </Text>
        {!sent && (
          <>
            {error && <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>}
            <Input label="Phone number" value={phone} onChangeText={setPhone} placeholder="024 123 4567" keyboardType="phone-pad" />
            <Button title="Send Reset Code" onPress={handleSend} loading={loading} disabled={!phone} style={styles.btn} />
          </>
        )}
        {sent && (
          <Button title="Enter Reset Code" onPress={() => router.push({ pathname: '/(auth)/reset-password', params: { phone } })} style={styles.btn} />
        )}
        <Button title="Back to login" onPress={() => router.back()} variant="ghost" style={styles.btn} />
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
