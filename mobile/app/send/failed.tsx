import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Button } from '../../components/ui/Button';

export default function FailedScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason: string; phone: string; amount: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>❌</Text>
        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>{reason || 'Your payment could not be processed.'}</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>No funds were deducted from your wallet. You can safely retry.</Text>
        </View>
        <Button title="Try Again" onPress={() => router.back()} style={styles.btn} />
        <Button title="Go Home" onPress={() => router.replace('/(app)/(tabs)/home')} variant="secondary" style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { flex: 1, paddingHorizontal: Spacing.screenEdgePadding, paddingTop: Spacing.space3xl, gap: Spacing.spaceXl, alignItems: 'center' },
  icon: { fontSize: 64 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.onSurface },
  subtitle: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
  infoCard: { backgroundColor: Colors.secondaryContainer, borderRadius: Radius.md, padding: Spacing.spaceMd, width: '100%' },
  infoText: { fontSize: 13, color: Colors.secondary, textAlign: 'center' },
  btn: { width: '100%' },
});
