/**
 * KudiFlow Toast Component
 *
 * Professional floating notification with animated slide/fade,
 * supporting success, error, and informational feedback.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  durationMs?: number;
  onHide?: () => void;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function Toast({
  visible,
  message,
  type = 'info',
  durationMs = 3500,
  onHide,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, durationMs);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  if (!visible && (opacity as unknown as { _value: number })._value === 0) {
    return null;
  }

  const containerStyle =
    type === 'success'
      ? styles.successContainer
      : type === 'error'
      ? styles.errorContainer
      : styles.infoContainer;

  const iconStyle =
    type === 'success'
      ? styles.successIcon
      : type === 'error'
      ? styles.errorIcon
      : styles.infoIcon;

  const textStyle =
    type === 'success'
      ? styles.successText
      : type === 'error'
      ? styles.errorText
      : styles.infoText;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={hideToast}
        style={[styles.container, containerStyle]}
      >
        <View style={[styles.iconCircle, iconStyle]}>
          <Text style={styles.iconText}>{ICONS[type]}</Text>
        </View>
        <Text style={[styles.message, textStyle]} numberOfLines={2}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 32,
    left: Spacing.screenEdgePadding,
    right: Spacing.screenEdgePadding,
    zIndex: 9999,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    gap: 12,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
  },
  successContainer: {
    backgroundColor: '#002517',
    borderColor: Colors.secondary,
  },
  errorContainer: {
    backgroundColor: '#380004',
    borderColor: Colors.error,
  },
  infoContainer: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.surfaceContainerHighest,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    backgroundColor: Colors.secondary,
  },
  errorIcon: {
    backgroundColor: Colors.error,
  },
  infoIcon: {
    backgroundColor: Colors.statusProcessing,
  },
  iconText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  successText: {
    color: '#d4faea',
  },
  errorText: {
    color: '#ffdad6',
  },
  infoText: {
    color: '#ffffff',
  },
});
