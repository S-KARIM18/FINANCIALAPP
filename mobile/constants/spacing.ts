/**
 * KudiFlow Spacing System
 * Extracted from DESIGN.md — all values in points (same as pixels on 1x screens)
 */
export const Spacing = {
  // ─── Named Tokens ─────────────────────────────────────────────────────────
  space2xs: 4,
  spaceXs: 8,
  spaceSm: 12,
  spaceMd: 16,
  spaceLg: 20,
  spaceXl: 24,
  space2xl: 32,
  space3xl: 40,

  // ─── Layout ────────────────────────────────────────────────────────────────
  screenEdgePadding: 20,  // horizontal padding from screen edge
  cardInnerPadding: 16,

  // ─── Component Heights ─────────────────────────────────────────────────────
  inputHeight: 56,
  buttonHeight: 56,
  bottomNavHeight: 72,
  transactionRowHeight: 72,
  swipeTrackHeight: 56,
  swipeThumbSize: 48,
} as const;

/**
 * Border Radius System
 */
export const Radius = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 24,    // cards (28px in spec — use 24 as closest RN value)
  card: 28,  // exact card radius from Stitch
  full: 9999, // pills, circles
} as const;

/**
 * Shadow presets — card shadows matching Stitch depth tokens
 */
export const Shadows = {
  card: {
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  bottomNav: {
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
