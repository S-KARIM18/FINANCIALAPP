/**
 * Duplicate Payment Screen
 * Matches Stitch edge_cases_security_protection Duplicate tab.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/ui/Button';

export default function DuplicateScreen() {
  const router = useRouter();
  const { idempotencyKey } = useLocalSearchParams<{ idempotencyKey: string; phone: string; amount: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔒</Text>

        <View style={styles.guaranteeBadge}>
          <Text style={styles.guaranteeText}>✓ Zero Double-Charge Guarantee</Text>
        </View>

        <Text style={styles.title}>Payment Already Submitted</Text>
        <Text style={styles.subtitle}>
          This exact payment was already processed successfully. No duplicate charge was made.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>ORIGINAL IDEMPOTENCY KEY</Text>
          <Text style={styles.infoValue}>{idempotencyKey}</Text>
        </View>

        <Button title="View Existing Transaction" onPress={() => router.replace('/(app)/(tabs)/transactions')} style={styles.btn} />
        <Button title="Go Home" onPress={() => router.replace('/(app)/(tabs)/home')} variant="secondary" style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { flex: 1, paddingHorizontal: Spacing.screenEdgePadding, paddingTop: Spacing.space3xl, gap: Spacing.spaceXl, alignItems: 'center' },
  icon: { fontSize: 64 },
  guaranteeBadge: { backgroundColor: Colors.secondaryContainer, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full },
  guaranteeText: { fontSize: 13, fontWeight: '700', color: Colors.secondary },
  title: { fontSize: 22, fontWeight: '700', color: Colors.onSurface, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  infoCard: { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, padding: Spacing.spaceMd, width: '100%', gap: 4 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: Colors.onSurfaceVariant, letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.onSurface, fontFamily: 'monospace' },
  btn: { width: '100%' },
});
