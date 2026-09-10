/**
 * KudiFlow Onboarding Screen
 *
 * Pixel-perfect implementation matching Stitch design:
 * stitch_ui/stitch_kudiflow_mobile_fintech_ui/kudiflow_onboarding_flow/code.html
 * and media_1788975408901.png
 *
 * Features:
 * - Top bar: KudiFlow logo with bolt badge + SKIP button
 * - Slide 1: "Send money, simply."
 *   - Visual card with Node A (GH₵ Wallet, GhIPSS Direct tag)
 *   - Transfer motion bridge with floating token (⚡ GH₵ 450.00)
 *   - Node B (Kofi Mensah, Instant tag)
 *   - Typography: "INSTANT SETTLEMENT", "Send money, simply.", description
 * - Slide 2: "Stay in control."
 *   - High-precision navy card with Active Unified Balance (GH₵ 12,840.50)
 *   - Weekly spending velocity micro bar chart with highlighted peak bar
 *   - Network rails badges: MTN MoMo, Telecel Cash, AT Money
 *   - Typography: "CLEAR OVERSIGHT", "Stay in control.", description
 * - Slide 3: "Move with confidence."
 *   - Regulatory shield visual card
 *   - Trust ledger: Bank of Ghana Licensed, Data Encryption 256-Bit, GhIPSS Instant Active
 *   - Typography: "PROTECTED CAPITAL", "Move with confidence.", description
 * - Interactive carousel indicators (wide pill for active slide)
 * - Primary CTA: "Continue ➔" (or "Get Started ➔" on slide 3)
 * - "Already have an account? Sign in" link
 * - Regulatory micro-badge: "Simulation Sandbox Rail • Prototype Demonstration"
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / SCREEN_WIDTH);
    if (idx !== activeIndex && idx >= 0 && idx < 3) {
      setActiveIndex(idx);
    }
  };

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setActiveIndex(index);
  };

  const handleContinue = () => {
    if (activeIndex < 2) {
      goToSlide(activeIndex + 1);
    } else {
      router.push('/(auth)/register');
    }
  };

  const handleSkip = () => {
    if (activeIndex < 2) {
      goToSlide(2);
    } else {
      router.push('/(auth)/register');
    }
  };

  const isLastSlide = activeIndex === 2;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* ─── Top Navigation Bar ────────────────────────────────────────── */}
      <View style={styles.topBar}>
        {/* Brand Logo Display */}
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <View style={styles.logoBadgeInner}>
              <Ionicons name="flash" size={13} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.brandTextRow}>
            <Text style={styles.brandTextDark}>Kudi</Text>
            <Text style={styles.brandTextGreen}>Flow</Text>
          </View>
        </View>

        {/* Skip Action Button */}
        <TouchableOpacity
          style={[styles.skipButton, isLastSlide && styles.skipButtonHidden]}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={isLastSlide}
        >
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Carousel Stage Container ──────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      >
        {/* ─── Slide 1: Simple Money Movement ──────────────────────────── */}
        <View style={styles.slide}>
          {/* Visual Showcase Card */}
          <View style={styles.visualCard}>
            {/* Ambient subtle glow backdrops */}
            <View style={styles.ambientGlowTop} />
            <View style={styles.ambientGlowBottom} />

            <View style={styles.cardInner}>
              {/* Node A: Sender in Accra */}
              <View style={styles.nodeRow}>
                <View style={styles.nodeBox}>
                  <View style={styles.walletIconCircle}>
                    <Ionicons name="wallet" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.nodeTextCol}>
                    <Text style={styles.nodeSubLabel}>SOURCE</Text>
                    <Text style={styles.nodeTitle}>GH₵ Wallet</Text>
                  </View>
                </View>

                {/* Rail Verification Tag */}
                <View style={styles.ghipssTag}>
                  <View style={styles.greenPulseDot} />
                  <Text style={styles.ghipssTagText}>Demo Rail</Text>
                </View>
              </View>

              {/* Transfer Motion Bridge & Flow Indicator */}
              <View style={styles.motionBridgeContainer}>
                {/* Curved dashed flow connector */}
                <View style={styles.flowLineWrapper}>
                  <View style={styles.flowDashLine} />
                </View>

                {/* Floating Centered Money Token */}
                <View style={styles.moneyTokenPill}>
                  <Ionicons name="flash" size={14} color="#6EE7B7" />
                  <Text style={styles.moneyTokenText}>GH₵ 450.00</Text>
                </View>
              </View>

              {/* Node B: Receiver Node */}
              <View style={styles.nodeRow}>
                <View style={styles.nodeBox}>
                  <View style={styles.recipientIconCircle}>
                    <Ionicons name="person" size={16} color="#059669" />
                  </View>
                  <View style={styles.nodeTextCol}>
                    <Text style={styles.nodeSubLabel}>RECIPIENT</Text>
                    <Text style={styles.nodeTitle}>Kofi Mensah</Text>
                  </View>
                </View>

                {/* Instant Tag */}
                <View style={styles.instantTag}>
                  <Ionicons name="time-outline" size={12} color="#64748B" />
                  <Text style={styles.instantTagText}>Instant</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Typography & Content */}
          <View style={styles.contentBox}>
            <Text style={styles.categoryLabel}>INSTANT SETTLEMENT</Text>
            <Text style={styles.headline}>Send money, simply.</Text>
            <Text style={styles.bodyDescription}>
              Send money to friends, family, and vendors across Mobile Money and Ghana banks in a few deliberate taps. Zero friction.
            </Text>
          </View>
        </View>

        {/* ─── Slide 2: Stay in Control ─────────────────────────────────── */}
        <View style={styles.slide}>
          {/* Visual Card: High-precision Financial Deck */}
          <View style={[styles.visualCard, styles.darkCard]}>
            <View style={styles.darkCardGlow} />

            {/* Header: Balance */}
            <View>
              <View style={styles.balanceHeaderRow}>
                <Text style={styles.balanceHeaderLabel}>ACTIVE UNIFIED BALANCE</Text>
                <Ionicons name="eye-outline" size={18} color="#94A3B8" />
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.currencyPrefix}>GH₵ </Text>
                <Text style={styles.balanceMain}>12,840</Text>
                <Text style={styles.balanceCents}>.50</Text>
              </View>
            </View>

            {/* Micro Analytics Bar Graph */}
            <View style={styles.analyticsBox}>
              <View style={styles.analyticsHeaderRow}>
                <Text style={styles.analyticsLabel}>WEEKLY SPENDING VELOCITY</Text>
                <Text style={styles.velocityTag}>-12.4%</Text>
              </View>
              <View style={styles.barsContainer}>
                <View style={[styles.bar, { height: 22 }]} />
                <View style={[styles.bar, { height: 32 }]} />
                <View style={[styles.bar, styles.barActive, { height: 48 }]} />
                <View style={[styles.bar, { height: 18 }]} />
                <View style={[styles.bar, { height: 36 }]} />
                <View style={[styles.bar, { height: 16 }]} />
                <View style={[styles.bar, { height: 28 }]} />
              </View>
            </View>

            {/* Network Rails Pills */}
            <View style={styles.networkPillsRow}>
              <View style={styles.networkPill}>
                <Text style={styles.networkPillText}>MTN MoMo</Text>
              </View>
              <View style={styles.networkPill}>
                <Text style={styles.networkPillText}>Telecel Cash</Text>
              </View>
              <View style={styles.networkPill}>
                <Text style={styles.networkPillText}>AT Money</Text>
              </View>
            </View>
          </View>

          {/* Typography & Content */}
          <View style={styles.contentBox}>
            <Text style={styles.categoryLabel}>CLEAR OVERSIGHT</Text>
            <Text style={styles.headline}>Stay in control.</Text>
            <Text style={styles.bodyDescription}>
              Consolidate and monitor your multiple mobile wallets and bank accounts in one crisp, real-time command deck.
            </Text>
          </View>
        </View>

        {/* ─── Slide 3: Bank-Grade Trust ────────────────────────────────── */}
        <View style={styles.slide}>
          {/* Visual Card: Vault & Regulatory Shield */}
          <View style={[styles.visualCard, styles.shieldCard]}>
            <View style={styles.shieldAmbientGlow} />

            {/* Shield Icon Badge */}
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark" size={32} color="#059669" />
            </View>

            {/* Trust Ledger Elements */}
            <View style={styles.trustLedgerList}>
              <View style={styles.trustRow}>
                <Text style={styles.trustLabel}>SIMULATION RAIL</Text>
                <Text style={styles.trustValue}>SANDBOX</Text>
              </View>
              <View style={styles.trustRow}>
                <Text style={styles.trustLabel}>DATA ENCRYPTION</Text>
                <Text style={styles.trustValue}>256-BIT</Text>
              </View>
              <View style={styles.trustRow}>
                <Text style={styles.trustLabel}>INSTANT SWITCH</Text>
                <Text style={styles.trustValue}>ACTIVE</Text>
              </View>
            </View>
          </View>

          {/* Typography & Content */}
          <View style={styles.contentBox}>
            <Text style={styles.categoryLabel}>PROTECTED CAPITAL</Text>
            <Text style={styles.headline}>Move with confidence.</Text>
            <Text style={styles.bodyDescription}>
              Every transfer is tested under high-concurrency ACID transactions, strict idempotency, and full cryptographic audit logging.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ─── Interactive Carousel Indicators ───────────────────────────── */}
      <View style={styles.dotsRow}>
        <TouchableOpacity
          onPress={() => goToSlide(0)}
          activeOpacity={0.7}
          style={[styles.dot, activeIndex === 0 ? styles.dotActive : styles.dotInactive]}
        />
        <TouchableOpacity
          onPress={() => goToSlide(1)}
          activeOpacity={0.7}
          style={[styles.dot, activeIndex === 1 ? styles.dotActive : styles.dotInactive]}
        />
        <TouchableOpacity
          onPress={() => goToSlide(2)}
          activeOpacity={0.7}
          style={[styles.dot, activeIndex === 2 ? styles.dotActive : styles.dotInactive]}
        />
      </View>

      {/* ─── Action Deck ───────────────────────────────────────────────── */}
      <View style={styles.actionDeck}>
        {/* Primary Action Button */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleContinue}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>
            {isLastSlide ? 'Get Started' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Alternative Action: Quick Log In */}
        <View style={styles.signInRow}>
          <Text style={styles.signInMuted}>Already have an account?</Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Bottom Regulatory Micro-Badge ─────────────────────────────── */}
      <View style={styles.regulatoryRow}>
        <Ionicons name="checkmark-circle" size={13} color="#059669" />
        <Text style={styles.regulatoryText}>
          Simulation Sandbox Rail • Prototype Demonstration
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#131B2E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoBadgeInner: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTextDark: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B1C30',
    letterSpacing: -0.5,
  },
  brandTextGreen: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: -0.5,
  },
  skipButton: {
    backgroundColor: '#EFF4FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skipButtonHidden: {
    opacity: 0,
  },
  skipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
  },

  /* Carousel */
  carousel: {
    flex: 1,
  },
  carouselContent: {
    alignItems: 'center',
  },
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: 'flex-start',
  },

  /* Visual Showcase Card */
  visualCard: {
    width: '100%',
    minHeight: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EBF1FF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    justifyContent: 'center',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(110, 231, 183, 0.25)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(219, 234, 254, 0.5)',
  },
  cardInner: {
    position: 'relative',
    zIndex: 2,
    gap: 12,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5EDFF',
  },
  walletIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#131B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeTextCol: {
    gap: 1,
  },
  nodeSubLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  nodeTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  ghipssTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  ghipssTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.1,
  },
  instantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  instantTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  /* Transfer Motion Bridge */
  motionBridgeContainer: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: -2,
  },
  flowLineWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '15%',
    right: '15%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowDashLine: {
    width: '100%',
    height: 1,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  moneyTokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#131B2E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 5,
  },
  moneyTokenText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  /* Slide 2 Dark Card */
  darkCard: {
    backgroundColor: '#131B2E',
    borderColor: '#1E293B',
    justifyContent: 'space-between',
    padding: 18,
  },
  darkCardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
  },
  balanceMain: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  balanceCents: {
    fontSize: 22,
    fontWeight: '600',
    color: '#94A3B8',
  },
  analyticsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 10,
    marginVertical: 10,
  },
  analyticsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  analyticsLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  velocityTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 4,
  },
  bar: {
    width: 22,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barActive: {
    backgroundColor: '#6EE7B7',
  },
  networkPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  networkPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  networkPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Slide 3 Shield Card */
  shieldCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  shieldAmbientGlow: {
    position: 'absolute',
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  shieldBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  trustLedgerList: {
    width: '100%',
    maxWidth: 240,
    gap: 6,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F6FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5EDFF',
  },
  trustLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  trustValue: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.2,
  },

  /* Content Below Card */
  contentBox: {
    marginTop: 22,
    paddingHorizontal: 2,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headline: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0B1C30',
    letterSpacing: -0.6,
  },
  bodyDescription: {
    fontSize: 14.5,
    color: '#475569',
    lineHeight: 22,
    marginTop: 8,
  },

  /* Carousel Dots */
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#131B2E',
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },

  /* Action Deck */
  actionDeck: {
    paddingHorizontal: 20,
    gap: 10,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#131B2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  signInMuted: {
    fontSize: 13.5,
    color: '#64748B',
  },
  signInLink: {
    marginLeft: 6,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#059669',
  },

  /* Regulatory Micro-Badge */
  regulatoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 10,
    paddingTop: 4,
  },
  regulatoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.2,
  },
});
