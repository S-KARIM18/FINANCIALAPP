/**
 * KudiFlow Typography System
 * All roles use Plus Jakarta Sans.
 * Values extracted from DESIGN.md — these match the Stitch HTML configs exactly.
 */
import { TextStyle } from 'react-native';

type FontWeight = '400' | '600' | '700' | '800';

interface TypographyRole {
  fontSize: number;
  fontWeight: FontWeight;
  lineHeight: number;
  letterSpacing?: number;
  fontFamily: string;
}

export const Typography: Record<string, TypographyRole> = {
  // Large currency/balance display — GH₵ 4,850.00
  displayCurrency: {
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -0.03 * 38, // React Native uses pt, not em
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },

  // Main screen headings
  headlineLg: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.02 * 28,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Section headings
  headlineMd: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.015 * 22,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Card headings, important labels
  headlineSm: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.01 * 18,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // List items, button labels
  titleMd: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.005 * 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // Body text
  bodyMd: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Small supporting text, footnotes
  bodySm: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
  },

  // Uppercase category labels — "AVAILABLE BALANCE"
  labelCaps: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.06 * 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // Account numbers, amounts in lists
  labelNumericMono: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.02 * 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // Body large — slightly larger body text
  bodyLg: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
} as const;

/** Convert a TypographyRole to a React Native TextStyle */
export function getTextStyle(role: keyof typeof Typography): TextStyle {
  return Typography[role] as TextStyle;
}
