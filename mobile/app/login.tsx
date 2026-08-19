import { LockKeyhole, LogIn, Mail, ShieldCheck, User, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { api } from '@/api/client';
import { PrimaryButton } from '@/components/PrimaryButton';
import { appName } from '@/constants/app';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type AuthMode = 'login' | 'register';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const { login, register, verifyTwoFactor } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!countdown) return;
    const timer = setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
    setChallengeToken(null);
    setCode('');
  };

  const sendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail) || codeLoading || countdown) return;
    setCodeLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await api.sendRegistrationCode(normalizedEmail);
      setNotice(response.message || t('codeSent'));
      setCountdown(60);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : t('codeFailed'));
    } finally {
      setCodeLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (challengeToken) {
        await verifyTwoFactor(challengeToken, code.trim());
      } else if (mode === 'register') {
        if (password !== confirmPassword) throw new Error(t('passwordMismatch'));
        const result = await register({
          username: username.trim(),
          password,
          email: email.trim().toLowerCase(),
          verification_code: code.trim(),
        });
        if (result.requiresTwoFactor && result.challengeToken) {
          setChallengeToken(result.challengeToken);
          return;
        }
      } else {
        const result = await login(username.trim(), password);
        if (result.requiresTwoFactor && result.challengeToken) {
          setChallengeToken(result.challengeToken);
          return;
        }
      }
      router.replace('/(tabs)/chat');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : mode === 'login' ? t('loginFailed') : t('registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  const registerDisabled =
    !username.trim() ||
    !emailPattern.test(email.trim()) ||
    password.length < 8 ||
    password !== confirmPassword ||
    code.trim().length < 4;
  const submitDisabled = challengeToken
    ? code.trim().length < 6
    : mode === 'login'
      ? !username.trim() || !password
      : registerDisabled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>{appName}</Text>
          <Text style={styles.subtitle}>
            {challengeToken ? t('twoFactorSubtitle') : mode === 'login' ? t('loginSubtitle') : t('registerSubtitle')}
          </Text>
        </View>

        {!challengeToken ? (
          <View style={styles.modeSwitch}>
            {(['login', 'register'] as AuthMode[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => switchMode(item)}
                style={[styles.modeButton, mode === item && styles.modeButtonActive]}>
                <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>
                  {item === 'login' ? t('login') : t('register')}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.form}>
          {challengeToken ? (
            <View style={styles.field}>
              <ShieldCheck color={colors.textMuted} size={20} />
              <TextInput
                autoFocus
                inputMode="numeric"
                maxLength={32}
                onChangeText={setCode}
                placeholder={t('twoFactorCode')}
                placeholderTextColor={colors.disabled}
                style={styles.input}
                value={code}
              />
            </View>
          ) : (
            <>
              <View style={styles.field}>
                <User color={colors.textMuted} size={20} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="username"
                  maxLength={64}
                  onChangeText={setUsername}
                  placeholder={t('username')}
                  placeholderTextColor={colors.disabled}
                  style={styles.input}
                  value={username}
                />
              </View>

              {mode === 'register' ? (
                <>
                  <View style={styles.field}>
                    <Mail color={colors.textMuted} size={20} />
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      inputMode="email"
                      maxLength={254}
                      onChangeText={setEmail}
                      placeholder={t('email')}
                      placeholderTextColor={colors.disabled}
                      style={styles.input}
                      value={email}
                    />
                  </View>
                  <View style={styles.codeRow}>
                    <View style={[styles.field, styles.codeField]}>
                      <ShieldCheck color={colors.textMuted} size={20} />
                      <TextInput
                        inputMode="numeric"
                        maxLength={16}
                        onChangeText={setCode}
                        placeholder={t('emailCode')}
                        placeholderTextColor={colors.disabled}
                        style={styles.input}
                        value={code}
                      />
                    </View>
                    <Pressable
                      disabled={!emailPattern.test(email.trim()) || codeLoading || countdown > 0}
                      onPress={sendCode}
                      style={({ pressed }) => [
                        styles.codeButton,
                        (!emailPattern.test(email.trim()) || codeLoading || countdown > 0) && styles.codeButtonDisabled,
                        pressed && styles.codeButtonPressed,
                      ]}>
                      <Text style={styles.codeButtonText}>
                        {codeLoading ? t('sending') : countdown ? `${countdown}s` : t('sendCode')}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              <View style={styles.field}>
                <LockKeyhole color={colors.textMuted} size={20} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete={mode === 'register' ? 'new-password' : 'password'}
                  onChangeText={setPassword}
                  placeholder={mode === 'register' ? t('passwordHint') : t('password')}
                  placeholderTextColor={colors.disabled}
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </View>

              {mode === 'register' ? (
                <View style={styles.field}>
                  <LockKeyhole color={colors.textMuted} size={20} />
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="new-password"
                    onChangeText={setConfirmPassword}
                    placeholder={t('confirmPassword')}
                    placeholderTextColor={colors.disabled}
                    secureTextEntry
                    style={styles.input}
                    value={confirmPassword}
                  />
                </View>
              ) : null}
            </>
          )}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            disabled={submitDisabled}
            icon={mode === 'register' && !challengeToken ? UserPlus : LogIn}
            label={challengeToken ? t('verifyLogin') : mode === 'login' ? t('login') : t('registerLogin')}
            loading={loading}
            onPress={submit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 36 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 82, height: 82, marginBottom: 12 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 16, marginTop: 6 },
  modeSwitch: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceMuted,
  },
  modeButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.small },
  modeButtonActive: { backgroundColor: colors.surface },
  modeText: { color: colors.textMuted, fontWeight: '700' },
  modeTextActive: { color: colors.primary },
  form: { gap: 12 },
  field: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  codeRow: { flexDirection: 'row', gap: 8 },
  codeField: { flex: 1 },
  codeButton: {
    minWidth: 106,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
  },
  codeButtonDisabled: { backgroundColor: colors.disabled },
  codeButtonPressed: { opacity: 0.82 },
  codeButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  notice: { color: colors.primary, lineHeight: 20 },
  error: { color: colors.danger, lineHeight: 20 },
});
