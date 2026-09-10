/**
 * Network Uncertainty Screen
 * Shown on timeout/network error — payment MAY have succeeded.
 * User can re-submit with the same idempotency key to check.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/ui/Button';
import * as txApi from '../../services/transaction.api';

export default function UnknownScreen() {
  const router = useRouter();
  const { idempotencyKey, phone, amount, pin } = useLocalSearchParams<{
    idempotencyKey: string; phone: string; amount: string; pin?: string;
  }>();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const result = await txApi.sendMoney({ recipientPhone: phone, amount, idempotencyKey, pin: pin || '' });
      router.replace({
        pathname: '/send/success',
        params: { txId: result.transaction.id, reference: result.transaction.reference, amount, recipientPhone: phone, cached: '1' },
      });
    } catch {
      // Still uncertain — stay on screen
    } finally { setChecking(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⏳</Text>

        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ PLEASE DO NOT SEND AGAIN</Text>
        </View>

        <Text style={styles.title}>We're Checking Your Payment Status</Text>
        <Text style={styles.subtitle}>
          Your payment may have been processed but we couldn't confirm the response.
          Do NOT create a new payment — press "Check Status" below.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>IDEMPOTENCY KEY</Text>
          <Text style={styles.infoValue}>{idempotencyKey}</Text>
          <Text style={styles.infoNote}>This key protects against duplicate charges.</Text>
        </View>

        <Button title={checking ? 'Checking...' : 'Live Check Status'} onPress={handleCheckStatus} loading={checking} style={styles.btn} />
        <Button title="Go to Home" onPress={() => router.replace('/(app)/(tabs)/home')} variant="ghost" style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { flex: 1, paddingHorizontal: Spacing.screenEdgePadding, paddingTop: Spacing.space3xl, gap: Spacing.spaceXl, alignItems: 'center' },
  icon: { fontSize: 64 },
  warningBanner: { backgroundColor: Colors.errorContainer, borderRadius: Radius.md, padding: Spacing.spaceMd, width: '100%' },
  warningText: { fontSize: 14, fontWeight: '800', color: Colors.onErrorContainer, textAlign: 'center', letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.onSurface, textAlign: 'center', letterSpacing: -0.33 },
  subtitle: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  infoCard: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, padding: Spacing.spaceMd, width: '100%', gap: 4 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface, fontFamily: 'monospace' },
  infoNote: { fontSize: 12, color: Colors.onSurfaceVariant },
  btn: { width: '100%' },
});
