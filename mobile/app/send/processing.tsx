/**
 * Processing Screen — makes the actual API call after swipe.
 * NETWORK UNCERTAINTY: timeout/network error → /send/unknown, NOT /send/failed
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { useWalletStore } from '../../store/wallet.store';
import * as txApi from '../../services/transaction.api';
import { isNetworkUncertain, getApiErrorMessage } from '../../utils/format';

export default function ProcessingScreen() {
  const router = useRouter();
  const { phone, amount, fee, totalAmount, idempotencyKey, note, pin } = useLocalSearchParams<{
    phone: string; amount: string; fee: string; totalAmount: string;
    idempotencyKey: string; note: string; pin: string;
  }>();
  const { fetchBalance } = useWalletStore();
  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;
    sendPayment();
  }, []);

  const sendPayment = async () => {
    try {
      const result = await txApi.sendMoney({
        recipientPhone: phone,
        amount,
        note: note || undefined,
        idempotencyKey,
        pin,
      });

      await fetchBalance();

      router.replace({
        pathname: '/send/success',
        params: {
          txId: result.transaction.id,
          reference: result.transaction.reference,
          amount: result.transaction.amount,
          fee: result.transaction.fee,
          totalAmount: (parseFloat(result.transaction.amount) + parseFloat(result.transaction.fee)).toFixed(2),
          recipientPhone: phone,
          recipientName: result.transaction.recipient_name || '',
          status: result.transaction.status,
          note: note || '',
          cached: result.cached ? '1' : '0',
        },
      });
    } catch (err: unknown) {
      if (isNetworkUncertain(err)) {
        // Payment may have succeeded — DO NOT say "failed"
        router.replace({ pathname: '/send/unknown', params: { idempotencyKey, phone, amount, pin } });
      } else {
        const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
        if (code === 'DUPLICATE_TRANSACTION') {
          router.replace({ pathname: '/send/duplicate', params: { idempotencyKey, phone, amount } });
        } else {
          router.replace({ pathname: '/send/failed', params: { reason: getApiErrorMessage(err), phone, amount } });
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.primaryContainer} />
        <View style={styles.textGroup}>
          <Text style={styles.title}>Processing your payment</Text>
          <Text style={styles.subtitle}>Please wait. Do not close the app.</Text>
        </View>
        <View style={styles.steps}>
          <StepRow label="Verifying recipient..." done />
          <StepRow label="Authorizing transfer..." active />
          <StepRow label="Settling via Demo Settlement Rail" pending />
        </View>
      </View>
    </SafeAreaView>
  );
}

function StepRow({ label, done, active, pending }: { label: string; done?: boolean; active?: boolean; pending?: boolean }) {
  return (
    <View style={stepStyles.row}>
      <View style={[
        stepStyles.dot,
        done && stepStyles.dotDone,
        active && stepStyles.dotActive,
        pending && stepStyles.dotPending,
      ]} />
      <Text style={[stepStyles.text, pending && stepStyles.textDim]}>{label}</Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.spaceMd },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.surfaceContainerHighest, borderWidth: 1.5, borderColor: Colors.outlineVariant },
  dotDone: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  dotActive: { backgroundColor: Colors.primaryContainer, borderColor: Colors.primaryContainer },
  dotPending: { backgroundColor: Colors.surfaceContainerHighest },
  text: { fontSize: 14, color: Colors.onSurface, fontWeight: '600' },
  textDim: { color: Colors.onSurfaceVariant, fontWeight: '400' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.space2xl, paddingHorizontal: Spacing.screenEdgePadding },
  textGroup: { gap: Spacing.spaceXs, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.onSurface, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },
  steps: { gap: Spacing.spaceMd, width: '100%' },
});
