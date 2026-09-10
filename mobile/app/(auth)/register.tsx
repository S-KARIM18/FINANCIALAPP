/**
 * KudiFlow Account Creation Screen
 *
 * Pixel-perfect implementation matching Stitch design:
 * stitch_ui/stitch_kudiflow_mobile_fintech_ui/kudiflow_create_account_password/code.html
 * and media_1788975604642.png
 *
 * Features:
 * - Top header: Back button, KudiFlow brand badge, "PHONE REGISTRATION", profile icon
 * - Progress header: "STEP 1 OF 2" badge + 3-stage progress bar
 * - Headline: "Create your KudiFlow account", subtitle
 * - Field 1: Full legal name (badge icon, value, green checkmark, "Matches Ghana Card official records")
 * - Field 2: Ghana mobile number (Ghana flag 🇬🇭 +233 chevron, value, green checkmark, "Linked to MTN MoMo...")
 * - Field 3: Email address (@ icon, value, green checkmark)
 * - Field 4: Create security password (lock icon, eye toggle, "• Strong password" tag)
 *   - 4 dynamic strength bars
 *   - Password criteria card: 8+ characters, Uppercase letter, One number (0-9), Special character
 * - Terms & conditions agreement checkbox
 * - Primary CTA: "Continue ➔" (solid black button)
 * - Navigation link: "Already have an account? Log in"
 * - Security footnote: "256-BIT ENCRYPTED • PROTOTYPE SANDBOX"
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as authApi from '../../services/auth.api';
import { getApiErrorMessage } from '../../utils/format';

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('Ama Mensah');
  const [phone, setPhone] = useState('24 819 0244');
  const [email, setEmail] = useState('ama.mensah@kudiflow.gh');
  const [password, setPassword] = useState('KudiFlow2024!#');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic password criteria check
  const criteria = useMemo(() => {
    return {
      hasLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (criteria.hasLength) score++;
    if (criteria.hasUpper) score++;
    if (criteria.hasNumber) score++;
    if (criteria.hasSpecial) score++;
    return score;
  }, [criteria]);

  const isStrong = strengthScore === 4;

  const handleRegister = async () => {
    if (!fullName.trim() || !phone.trim() || !email.trim() || !password) {
      setError('Please fill in all registration fields.');
      return;
    }

    if (!termsAccepted) {
      setError('Please agree to KudiFlow Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    setError(null);

    // Normalize phone number: strip spaces, prepend +233 if needed
    const rawDigits = phone.replace(/\D/g, '');
    const cleanPhone = rawDigits.startsWith('233')
      ? `+${rawDigits}`
      : rawDigits.startsWith('0')
      ? `+233${rawDigits.slice(1)}`
      : `+233${rawDigits}`;

    try {
      const result = await authApi.register({
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: email.trim(),
        password,
      });

      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: result.phone, userId: result.userId },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* ─── Top Header ────────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#0B1C30" />
          </TouchableOpacity>

          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <View style={styles.brandBadgeInner}>
                <Ionicons name="flash" size={11} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.headerScreenTitle}>PHONE REGISTRATION</Text>
          </View>
        </View>

        <View style={styles.headerRightAvatar}>
          <Ionicons name="person" size={16} color="#FFFFFF" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Progress Header ───────────────────────────────────── */}
          <View style={styles.progressRow}>
            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>STEP 1 OF 2</Text>
            </View>
            <View style={styles.progressIndicators}>
              <View style={styles.progressActivePill} />
              <View style={styles.progressNextDot} />
              <View style={styles.progressInactiveDot} />
            </View>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.mainTitle}>Create your KudiFlow account</Text>
            <Text style={styles.mainSubtitle}>
              It only takes a few minutes to get started with seamless Ghana Cedis transfers.
            </Text>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={18} color="#BA1A1A" />
              <Text style={styles.errorCardText}>{error}</Text>
            </View>
          )}

          {/* ─── Form Inputs ───────────────────────────────────────── */}
          <View style={styles.formGroup}>
            {/* Field 1: Full Legal Name */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>FULL LEGAL NAME</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="id-card-outline" size={20} color="#76777D" style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={(t) => {
                    setFullName(t);
                    setError(null);
                  }}
                  placeholder="e.g. Ama Mensah"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
                {fullName.trim().length > 2 && (
                  <View style={styles.validCheckCircle}>
                    <Ionicons name="checkmark" size={14} color="#00714D" />
                  </View>
                )}
              </View>
              <View style={styles.hintRow}>
                <Ionicons name="checkmark-circle" size={14} color="#006C49" />
                <Text style={styles.hintTextGreen}>Matches Ghana Card official records</Text>
              </View>
            </View>

            {/* Field 2: Ghana Mobile Number */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>GHANA MOBILE NUMBER</Text>
              <View style={styles.inputContainer}>
                {/* Ghana Flag & Dial Code */}
                <View style={styles.flagGroup}>
                  <Text style={styles.flagEmoji}>🇬🇭</Text>
                  <Text style={styles.dialCode}>+233</Text>
                  <Ionicons name="chevron-down" size={14} color="#76777D" />
                </View>
                <TextInput
                  style={[styles.textInput, styles.phoneInput]}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setError(null);
                  }}
                  placeholder="24 819 0244"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
                {phone.trim().length >= 9 && (
                  <View style={styles.validCheckCircle}>
                    <Ionicons name="checkmark" size={14} color="#00714D" />
                  </View>
                )}
              </View>
              <Text style={styles.hintTextMuted}>
                Linked to MTN MoMo, Telecel Cash & AT Money
              </Text>
            </View>

            {/* Field 3: Email Address */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputContainer}>
                <Feather name="at-sign" size={18} color="#76777D" style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setError(null);
                  }}
                  placeholder="ama.mensah@kudiflow.gh"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {email.includes('@') && email.includes('.') && (
                  <View style={styles.validCheckCircle}>
                    <Ionicons name="checkmark" size={14} color="#00714D" />
                  </View>
                )}
              </View>
            </View>

            {/* Field 4: Create Security Password */}
            <View style={styles.fieldWrapper}>
              <View style={styles.passwordHeaderRow}>
                <Text style={styles.fieldLabel}>CREATE SECURITY PASSWORD</Text>
                <View style={styles.strengthTagRow}>
                  <View
                    style={[
                      styles.strengthDot,
                      { backgroundColor: isStrong ? '#006C49' : strengthScore >= 2 ? '#EAB308' : '#DC2626' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.strengthTagText,
                      { color: isStrong ? '#006C49' : strengthScore >= 2 ? '#B45309' : '#DC2626' },
                    ]}
                  >
                    {isStrong ? 'Strong password' : strengthScore >= 2 ? 'Medium password' : 'Weak password'}
                  </Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color="#76777D" style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  placeholder="Create password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeToggleBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#45464D"
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength 4-Bar Meter */}
              <View style={styles.strengthBarsRow}>
                {[1, 2, 3, 4].map((idx) => {
                  const isFilled = strengthScore >= idx;
                  const barColor = isStrong
                    ? '#006C49'
                    : strengthScore >= 2
                    ? '#EAB308'
                    : '#DC2626';
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: isFilled ? barColor : '#E5EEFF' },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Password Criteria Card */}
              <View style={styles.criteriaBox}>
                <View style={styles.criteriaGrid}>
                  {/* Item 1 */}
                  <View style={styles.criteriaItem}>
                    <Ionicons
                      name={criteria.hasLength ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={criteria.hasLength ? '#006C49' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.criteriaText,
                        criteria.hasLength && styles.criteriaTextActive,
                      ]}
                    >
                      8+ characters
                    </Text>
                  </View>

                  {/* Item 2 */}
                  <View style={styles.criteriaItem}>
                    <Ionicons
                      name={criteria.hasUpper ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={criteria.hasUpper ? '#006C49' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.criteriaText,
                        criteria.hasUpper && styles.criteriaTextActive,
                      ]}
                    >
                      Uppercase letter
                    </Text>
                  </View>

                  {/* Item 3 */}
                  <View style={styles.criteriaItem}>
                    <Ionicons
                      name={criteria.hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={criteria.hasNumber ? '#006C49' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.criteriaText,
                        criteria.hasNumber && styles.criteriaTextActive,
                      ]}
                    >
                      One number (0-9)
                    </Text>
                  </View>

                  {/* Item 4 */}
                  <View style={styles.criteriaItem}>
                    <Ionicons
                      name={criteria.hasSpecial ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={criteria.hasSpecial ? '#006C49' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.criteriaText,
                        criteria.hasSpecial && styles.criteriaTextActive,
                      ]}
                    >
                      Special character
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Terms & Consent Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              activeOpacity={0.8}
              onPress={() => setTermsAccepted(!termsAccepted)}
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxChecked,
                ]}
              >
                {termsAccepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>
                By tapping Continue, you confirm you agree to KudiFlow's{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>,{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>, and electronic consent notices.
              </Text>
            </TouchableOpacity>

            {/* Continue Primary Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!termsAccepted || loading) && styles.primaryBtnDisabled,
              ]}
              onPress={handleRegister}
              disabled={!termsAccepted || loading}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Creating Account...' : 'Continue'}
              </Text>
              {!loading && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
            </TouchableOpacity>

            {/* Already have an account? Log in */}
            <View style={styles.loginLinkRow}>
              <Text style={styles.loginMutedText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Text style={styles.loginHighlightText}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── Security Footnote ─────────────────────────────────── */}
          <View style={styles.securityFootnote}>
            <View style={styles.securityPill}>
              <Ionicons name="shield-checkmark" size={15} color="#006C49" />
              <Text style={styles.securityPillText}>
                256-BIT ENCRYPTED • PROTOTYPE SANDBOX
              </Text>
            </View>
            <Text style={styles.securityCaption}>
              Prototype demonstration environment for challenge evaluation
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#F8F9FD',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#131B2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeInner: {
    width: 16,
    height: 16,
    borderRadius: 5,
    backgroundColor: '#006C49',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerScreenTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0B1C30',
    letterSpacing: -0.2,
  },
  headerRightAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0B1C30',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },

  /* Step Badge */
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepPill: {
    backgroundColor: '#E5EEFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stepPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#3F465C',
    letterSpacing: 0.8,
  },
  progressIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressActivePill: {
    width: 22,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0F172A',
  },
  progressNextDot: {
    width: 8,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#006C49',
  },
  progressInactiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D3E4FE',
  },

  /* Title Section */
  titleSection: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0B1C30',
    letterSpacing: -0.7,
    lineHeight: 33,
  },
  mainSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 6,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFDAD6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorCardText: {
    fontSize: 13,
    color: '#93000A',
    fontWeight: '600',
    flex: 1,
  },

  /* Form Group */
  formGroup: {
    gap: 16,
  },
  fieldWrapper: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#45464D',
    letterSpacing: 0.8,
  },
  inputContainer: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBF1FF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1C30',
    paddingVertical: 0,
  },
  validCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6CF8BB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  hintTextGreen: {
    fontSize: 12,
    color: '#006C49',
    fontWeight: '600',
  },
  hintTextMuted: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  /* Ghana Phone Box */
  flagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  flagEmoji: {
    fontSize: 16,
  },
  dialCode: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0B1C30',
  },
  phoneInput: {
    letterSpacing: 0.5,
  },

  /* Password Header */
  passwordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strengthTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  strengthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  strengthTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  eyeToggleBtn: {
    padding: 6,
  },

  /* 4-Bar Meter */
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  strengthBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },

  /* Password Criteria Card */
  criteriaBox: {
    backgroundColor: '#EFF4FF',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },
  criteriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  criteriaItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  criteriaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  criteriaTextActive: {
    color: '#006C49',
    fontWeight: '700',
  },

  /* Terms Checkbox */
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  termsText: {
    flex: 1,
    fontSize: 12.5,
    color: '#45464D',
    lineHeight: 18,
  },
  termsLink: {
    color: '#0B1C30',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* Primary Button */
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Login Link */
  loginLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  loginMutedText: {
    fontSize: 13.5,
    color: '#45464D',
  },
  loginHighlightText: {
    marginLeft: 6,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#006C49',
  },

  /* Security Footnote */
  securityFootnote: {
    marginTop: 28,
    alignItems: 'center',
    gap: 8,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCE9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  securityPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0B1C30',
    letterSpacing: 0.6,
  },
  securityCaption: {
    fontSize: 11.5,
    color: '#76777D',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
  },
});
