/**
 * KudiFlow Input Field
 * 56px height, 12px radius, white background, with icon and error state.
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  hint?: string;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  hint,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      )}
      <View
        style={[
          styles.inputRow,
          isFocused && styles.inputRowFocused,
          error ? styles.inputRowError : null,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            rightIcon ? styles.inputWithRight : null,
          ]}
          placeholderTextColor={Colors.outline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            activeOpacity={0.7}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.66,
  },
  inputRow: {
    height: Spacing.inputHeight,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.spaceMd,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputRowFocused: {
    borderWidth: 1.5,
    borderColor: Colors.primaryContainer,
  },
  inputRowError: {
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.onSurface,
    height: '100%',
  },
  inputWithLeft: { marginLeft: Spacing.spaceXs },
  inputWithRight: { marginRight: Spacing.spaceXs },
  leftIcon: { marginRight: 4 },
  rightIcon: { padding: 4 },
  errorText: { fontSize: 12, color: Colors.error, marginTop: 2 },
  hintText: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
});
