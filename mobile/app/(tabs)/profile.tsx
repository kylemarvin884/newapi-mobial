import {
  Download,
  Languages,
  LogOut,
  Mail,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { appName } from '@/constants/app';
import { colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  platformDownloadUrl,
  platformShareUrl,
  buildShareMessage,
  currentAppVersion,
  fetchRelease,
  isNewerVersion,
  type AppRelease,
} from '@/services/release';

export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [release, setRelease] = useState<AppRelease | null>(null);

  useEffect(() => {
    let active = true;
    void fetchRelease()
      .then((latest) => {
        if (active) setRelease(latest);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  const signOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const openDownload = async (url = release?.download_url || platformDownloadUrl) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('无法打开下载链接', '请稍后重试或使用浏览器访问下载地址。');
    }
  };

  const shareApp = async () => {
    setSharing(true);
    try {
      let latest = release;
      if (!latest) {
        try {
          latest = await fetchRelease();
          setRelease(latest);
        } catch {}
      }
      await Share.share({
        title: t('shareApp'),
        message: language === 'en'
          ? `${appName} puts multi-model chat, image generation, balance, and API key management in your pocket.\n\nDownload: ${latest?.share_url || platformShareUrl}`
          : buildShareMessage(latest),
      });
    } catch (shareError) {
      Alert.alert('分享失败', shareError instanceof Error ? shareError.message : '请稍后重试');
    } finally {
      setSharing(false);
    }
  };

  const checkUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const latest = await fetchRelease();
      setRelease(latest);
      if (!isNewerVersion(latest.version, currentAppVersion)) {
        Alert.alert('已是最新版', `当前版本：v${currentAppVersion}`);
        return;
      }
      const notes = latest.release_notes.length
        ? `\n\n${latest.release_notes.map((item) => `• ${item}`).join('\n')}`
        : '';
      Alert.alert(
        `发现新版本 v${latest.version}`,
        `当前版本：v${currentAppVersion}${notes}`,
        [
          ...(latest.force_update ? [] : [{ text: '稍后', style: 'cancel' as const }]),
          { text: '立即下载', onPress: () => void openDownload(latest.download_url) },
        ],
        { cancelable: !latest.force_update },
      );
    } catch (updateError) {
      Alert.alert('检查更新失败', updateError instanceof Error ? updateError.message : '请稍后重试');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const updateAvailable = !!release && isNewerVersion(release.version, currentAppVersion);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('profile')}</Text>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <UserRound color={colors.primary} size={34} />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name}>{user?.display_name || user?.username}</Text>
            <Text style={styles.username}>@{user?.username}</Text>
          </View>
        </View>

        <View style={styles.list}>
          <View style={styles.row}>
            <Mail color={colors.textMuted} size={20} />
            <Text style={styles.rowLabel}>{t('email')}</Text>
            <Text numberOfLines={1} style={styles.rowValue}>{user?.email || t('unbound')}</Text>
          </View>
          <View style={styles.row}>
            <ShieldCheck color={colors.textMuted} size={20} />
            <Text style={styles.rowLabel}>{t('group')}</Text>
            <Text style={styles.rowValue}>{user?.group || 'default'}</Text>
          </View>
          <View style={styles.row}>
            <Smartphone color={colors.textMuted} size={20} />
            <Text style={styles.rowLabel}>{t('version')}</Text>
            <Text style={styles.rowValue}>
              v{currentAppVersion}{updateAvailable ? ` · ${t('latest')} v${release.version}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.languageRow}>
          <Languages color={colors.textMuted} size={20} />
          <Text style={styles.rowLabel}>{t('language')}</Text>
          <View style={styles.languageSwitch}>
            {(['zh', 'en'] as const).map((item) => (
              <Pressable
                key={item}
                onPress={() => setLanguage(item)}
                style={[styles.languageButton, language === item && styles.languageButtonActive]}>
                <Text style={[styles.languageText, language === item && styles.languageTextActive]}>
                  {item === 'zh' ? t('chinese') : t('english')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.shareCard}>
          <View style={styles.shareIcon}>
            <Sparkles color={colors.primary} size={22} />
          </View>
          <View style={styles.shareCopy}>
            <Text style={styles.shareTitle}>{t('shareTitle')}</Text>
            <Text style={styles.shareDescription}>{t('shareDescription')}</Text>
            <Text style={styles.shareHint}>{t('shareHint')}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton icon={Share2} label={t('shareApp')} loading={sharing} onPress={shareApp} />
          <PrimaryButton
            icon={updateAvailable ? Download : RefreshCw}
            label={updateAvailable ? `${t('downloadVersion')} v${release.version}` : t('checkUpdate')}
            loading={checkingUpdate}
            onPress={updateAvailable ? () => void openDownload() : checkUpdate}
          />
          <PrimaryButton icon={RefreshCw} label={t('refreshAccount')} loading={refreshing} onPress={refresh} />
          <PrimaryButton danger icon={LogOut} label={t('logout')} loading={loggingOut} onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 8, marginBottom: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: { marginLeft: 14, flex: 1 },
  name: { color: colors.text, fontSize: 21, fontWeight: '800' },
  username: { color: colors.textMuted, marginTop: 3 },
  list: { borderTopWidth: 1, borderColor: colors.border },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  rowLabel: { color: colors.text, fontWeight: '600' },
  rowValue: { color: colors.textMuted, flex: 1, textAlign: 'right' },
  languageRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  languageSwitch: { marginLeft: 'auto', flexDirection: 'row', padding: 3, backgroundColor: colors.surfaceMuted, borderRadius: 8 },
  languageButton: { minWidth: 64, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 4 },
  languageButtonActive: { backgroundColor: colors.surface },
  languageText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  languageTextActive: { color: colors.primary },
  shareCard: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  shareIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.surface,
  },
  shareCopy: { flex: 1 },
  shareTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  shareDescription: { color: colors.textMuted, lineHeight: 19, marginTop: 5 },
  shareHint: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 8 },
  actions: { gap: 12, marginTop: 32 },
});
