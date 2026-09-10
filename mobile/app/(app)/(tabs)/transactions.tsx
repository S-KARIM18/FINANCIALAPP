/**
 * Transactions Ledger Tab
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import { Spacing, Radius } from '../../../constants/spacing';
import { TransactionRow } from '../../../components/ui/TransactionRow';
import { useWalletStore } from '../../../store/wallet.store';
import { useAuthStore } from '../../../store/auth.store';

const FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Sent', value: 'sent' as const },
  { label: 'Received', value: 'received' as const },
  { label: 'Pending', value: 'pending' as const },
  { label: 'Failed', value: 'failed' as const },
];

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { transactions, isLoadingTransactions, fetchTransactions } = useWalletStore();
  const [activeFilter, setActiveFilter] = useState<'sent' | 'received' | 'pending' | 'failed' | undefined>(undefined);

  useEffect(() => { fetchTransactions(activeFilter); }, [activeFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction Ledger</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            onPress={() => setActiveFilter(f.value)}
            style={[styles.filterPill, activeFilter === f.value && styles.filterPillActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterLabel, activeFilter === f.value && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(tx) => tx.id}
        renderItem={({ item, index }) => (
          <View>
            <TransactionRow
              transaction={item}
              currentUserId={user?.id || ''}
              onPress={() => router.push(`/transactions/${item.id}`)}
            />
            {index < transactions.length - 1 && <View style={styles.divider} />}
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingTransactions}
            onRefresh={() => fetchTransactions(activeFilter)}
            tintColor={Colors.primaryContainer}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoadingTransactions ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No transactions</Text>
              <Text style={styles.emptyText}>Your transactions will appear here</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.screenEdgePadding, paddingTop: Spacing.spaceMd, paddingBottom: Spacing.spaceXs },
  title: { fontSize: 22, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.33 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.screenEdgePadding, gap: 8, paddingBottom: Spacing.spaceMd, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surfaceContainerLow },
  filterPillActive: { backgroundColor: Colors.primaryContainer },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  filterLabelActive: { color: Colors.onPrimary },
  list: { flexGrow: 1 },
  divider: { height: 1, backgroundColor: Colors.surfaceContainerLow, marginHorizontal: Spacing.spaceMd },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: Spacing.spaceXs },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
  emptyText: { fontSize: 14, color: Colors.onSurfaceVariant },
});
