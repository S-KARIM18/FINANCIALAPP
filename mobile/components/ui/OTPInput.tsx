/**
 * KudiFlow OTP Input — 6 separate boxes, auto-advance
 */
import React, { useRef, useEffect } from 'react';
import {
  View, TextInput, StyleSheet,
  NativeSyntheticEvent, TextInputKeyPressEventData,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius } from '../../constants/spacing';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
}

export function OTPInput({ value, onChange, length = 6, disabled = false }: OTPInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>(Array(length).fill(null));

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const chars = value.split('');
    chars[index] = digit;
    const newValue = chars.slice(0, length).join('');
    onChange(newValue);
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, i) => {
        const isFilled = !!value[i];
        const isActive = value.length === i;
        return (
          <View key={i} style={[styles.box, isFilled && styles.boxFilled, isActive && styles.boxActive]}>
            <TextInput
              ref={(ref) => { inputRefs.current[i] = ref; }}
              value={value[i] || ''}
              onChangeText={(text) => handleChange(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              style={styles.boxInput}
              editable={!disabled}
              secureTextEntry
              autoComplete="one-time-code"
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: {
    width: 48, height: 56,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  boxFilled: { backgroundColor: Colors.surfaceContainerLowest, borderColor: Colors.primaryContainer },
  boxActive: { borderColor: Colors.primaryContainer, borderWidth: 2 },
  boxInput: {
    width: '100%', height: '100%',
    textAlign: 'center', fontSize: 20, fontWeight: '700',
    color: Colors.onSurface,
  },
});
