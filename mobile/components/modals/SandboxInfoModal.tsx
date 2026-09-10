import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SandboxInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SandboxInfoModal: React.FC<SandboxInfoModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>KudiFlow Security Architecture</Text>
              <Text style={styles.subtitle}>Bank-grade financial integrity safeguards</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={20} color="#00B176" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Pessimistic Row Locking</Text>
                <Text style={styles.cardBody}>
                  Every balance check and debit uses strict PostgreSQL 'SELECT FOR UPDATE' in account ID order to guarantee zero race conditions or deadlock between concurrent transfers.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="git-commit-outline" size={20} color="#00B176" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Cryptographic Idempotency</Text>
                <Text style={styles.cardBody}>
                  Client requests carry unique Idempotency Keys with SHA-256 payload verification. Duplicate submissions return the identical completed transaction with 0 duplicate debits.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="calculator-outline" size={20} color="#00B176" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Exact Decimal Precision</Text>
                <Text style={styles.cardBody}>
                  All money math uses integer pesewas and PostgreSQL NUMERIC(15,2). Floating-point rounding errors are mathematically impossible.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="server-outline" size={20} color="#00B176" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Server-Authoritative Balances</Text>
                <Text style={styles.cardBody}>
                  Wallet balances are exclusively calculated and debited by the backend database. The frontend UI reflects server state and never alters financial balances directly.
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
              <Text style={styles.closeActionBtnText}>Understood</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 32, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  card: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardBody: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 16,
  },
  closeActionBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  closeActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
