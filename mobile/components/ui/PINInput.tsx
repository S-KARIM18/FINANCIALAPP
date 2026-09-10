/**
 * KudiFlow PIN Input — 4 dots + 3x4 numeric keypad
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';

interface PINInputProps {
  value: string;
  onChange: (pin: string) => void;
  maxLength?: number;
  label?: string;
  disabled?: boolean;
  onBiometric?: () => void;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['bio', '0', 'del'],
];

export function PINInput({
  value, onChange, maxLength = 4,
  label = 'Enter your 4-digit PIN',
  disabled = false,
  onBiometric,
}: PINInputProps) {
  const handleKey = (key: string) => {
    if (disabled) return;
    if (key === 'del') { onChange(value.slice(0, -1)); }
    else if (key === 'bio') { onBiometric?.(); }
    else if (value.length < maxLength) { onChange(value + key); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dots}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View key={i} style={[styles.dot, i < value.length ? styles.dotFilled : styles.dotEmpty]} />
        ))}
      </View>
      <View style={styles.keypad}>
        {KEYS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => handleKey(key)}
                disabled={disabled}
                activeOpacity={0.7}
                style={[styles.key, key === 'bio' && !onBiometric && styles.keyHidden]}
              >
                {key === 'bio' ? (
                  <Text style={styles.keySpecial}>{onBiometric ? '👆' : ''}</Text>
                ) : key === 'del' ? (
                  <Text style={styles.keySpecial}>⌫</Text>
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.spaceXl },
  label: { fontSize: 16, fontWeight: '600', color: Colors.onSurface, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: Spacing.spaceMd },
  dot: { width: 16, height: 16, borderRadius: 9999 },
  dotFilled: { backgroundColor: Colors.primaryContainer },
  dotEmpty: { backgroundColor: Colors.surfaceContainerHighest, borderWidth: 1.5, borderColor: Colors.outlineVariant },
  keypad: { width: '100%', gap: Spacing.spaceXs },
  row: { flexDirection: 'row', gap: Spacing.spaceXs, justifyContent: 'center' },
  key: {
    width: 88, height: 56,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  keyHidden: { backgroundColor: Colors.transparent },
  keyText: { fontSize: 22, fontWeight: '600', color: Colors.onSurface },
  keySpecial: { fontSize: 20, color: Colors.onSurface },
});
