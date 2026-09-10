/**
 * KudiFlow Color System
 * Exact values extracted from the Stitch design system (DESIGN.md)
 * Do NOT change these values — they are the visual source of truth.
 */
export const Colors = {
  // ─── Primary ───────────────────────────────────────────────────────────────
  primary: '#000000',
  primaryContainer: '#131b2e',   // deep navy — balance card, primary buttons
  onPrimary: '#ffffff',
  onPrimaryContainer: '#7c839b', // muted text on navy

  // ─── Secondary (Emerald) ───────────────────────────────────────────────────
  secondary: '#006c49',          // emerald green — success, completed
  secondaryContainer: '#6cf8bb', // mint — success badge backgrounds
  onSecondary: '#ffffff',
  onSecondaryContainer: '#00714d',

  // ─── Surface ──────────────────────────────────────────────────────────────
  surface: '#f8f9ff',                  // app background
  surfaceContainerLowest: '#ffffff',    // cards, modals
  surfaceContainerLow: '#eff4ff',      // subtle backgrounds
  surfaceContainer: '#e5eeff',         // chip/badge backgrounds
  surfaceContainerHigh: '#dce9ff',     // hover states
  surfaceContainerHighest: '#d3e4fe',  // active/selected states

  // ─── On Surface ───────────────────────────────────────────────────────────
  onSurface: '#0b1c30',         // primary text
  onSurfaceVariant: '#45464d',  // secondary/supporting text

  // ─── Error ────────────────────────────────────────────────────────────────
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // ─── Outline ──────────────────────────────────────────────────────────────
  outline: '#76777d',           // input borders, separators
  outlineVariant: '#c6c6cd',    // subtle dividers

  // ─── Semantic Aliases ─────────────────────────────────────────────────────
  success: '#006c49',
  successContainer: '#6cf8bb',
  warning: '#f59e0b',
  warningContainer: '#fef3c7',

  // ─── Transaction Status Colors ─────────────────────────────────────────────
  statusCompleted: '#006c49',
  statusPending: '#f59e0b',
  statusFailed: '#ba1a1a',
  statusProcessing: '#3b82f6',
  statusReversed: '#6b7280',

  // ─── Transparent ──────────────────────────────────────────────────────────
  transparent: 'transparent',
  overlay: 'rgba(11, 28, 48, 0.5)',
} as const;

export type ColorKey = keyof typeof Colors;
