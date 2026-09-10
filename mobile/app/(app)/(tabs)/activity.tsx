/**
 * Activity / Security Audit Log Tab
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import api from '../../../services/api';
import { API_ENDPOINTS } from '../../../constants/api';
import { formatDateTime } from '../../../utils/format';

interface AuditLog { id: string; event_type: string; created_at: string; }

export default function ActivityScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.activity);
      setLogs(res.data.data.activity || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchActivity(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Security Activity</Text>
        <Text style={styles.subtitle}>All account events are logged and immutable.</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(log) => log.id}
        renderItem={({ item }) => (
          <View style={styles.logRow}>
            <View style={styles.dot} />
            <View style={styles.logContent}>
              <Text style={styles.eventLabel}>
                {item.event_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </Text>
              <Text style={styles.logTime}>{formatDateTime(item.created_at)}</Text>
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchActivity} tintColor={Colors.primaryContainer} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⚡</Text>
              <Text style={styles.emptyTitle}>No activity yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.screenEdgePadding, paddingTop: Spacing.spaceMd, paddingBottom: Spacing.spaceMd, gap: 4 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.onSurface },
  subtitle: { fontSize: 12, color: Colors.onSurfaceVariant },
  list: { flexGrow: 1 },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.screenEdgePadding, paddingVertical: 12, gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryContainer, marginTop: 6 },
  logContent: { flex: 1, gap: 2 },
  eventLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  logTime: { fontSize: 12, color: Colors.onSurfaceVariant },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
});
