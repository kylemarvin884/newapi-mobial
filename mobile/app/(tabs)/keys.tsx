import * as Clipboard from 'expo-clipboard';
import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '@/api/client';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ApiKey, ApiKeyInput, UserGroup } from '@/types/api';

type QuotaMode = 'unlimited' | 'limited';
type ExpiryMode = 'never' | '30' | '90';

interface KeyForm {
  name: string;
  quotaMode: QuotaMode;
  quota: string;
  expiry: ExpiryMode;
  group: string;
}

const createDefaultForm = (group = ''): KeyForm => ({
  name: '',
  quotaMode: 'unlimited',
  quota: '10',
  expiry: 'never',
  group,
});

export default function KeysScreen() {
  const { token } = useAuth();
  const { language, t } = useLanguage();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [form, setForm] = useState<KeyForm>(() => createDefaultForm());
  const [quotaPerUnit, setQuotaPerUnit] = useState(500_000);
  const [currencySymbol, setCurrencySymbol] = useState('¥');

  useEffect(() => {
    if (!token) return;
    let active = true;
    void Promise.all([api.keys(token), api.balance(token), api.keyGroups(token)])
      .then(([keyList, balance, groupList]) => {
        if (!active) return;
        setKeys(keyList);
        setGroups(groupList);
        const fallbackGroup = groupList.find((group) => group.id === 'default')?.id ?? groupList[0]?.id ?? '';
        setForm((current) => ({ ...current, group: current.group || fallbackGroup }));
        setQuotaPerUnit(balance.quota_per_unit);
        setCurrencySymbol(balance.currency_symbol);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : t('keysFailed'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t, token]);

  const refresh = async () => {
    if (!token) return;
    setRefreshing(true);
    setError('');
    try {
      const [keyList, balance, groupList] = await Promise.all([
        api.keys(token),
        api.balance(token),
        api.keyGroups(token),
      ]);
      setKeys(keyList);
      setGroups(groupList);
      const fallbackGroup = groupList.find((group) => group.id === 'default')?.id ?? groupList[0]?.id ?? '';
      setForm((current) => ({
        ...current,
        group: groupList.some((group) => group.id === current.group) ? current.group : fallbackGroup,
      }));
      setQuotaPerUnit(balance.quota_per_unit);
      setCurrencySymbol(balance.currency_symbol);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('keysFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  const toggle = async (key: ApiKey) => {
    if (!token) return;
    try {
      const updated = await api.toggleKey(token, key.id);
      setKeys((current) => current.map((item) => (item.id === key.id ? updated : item)));
    } catch (toggleError) {
      Alert.alert(t('operationFailed'), toggleError instanceof Error ? toggleError.message : t('tryAgain'));
    }
  };

  const reveal = async (key: ApiKey) => {
    if (!token) return;
    if (revealed[key.id]) {
      setRevealed((current) => {
        const next = { ...current };
        delete next[key.id];
        return next;
      });
      return;
    }
    try {
      const response = await api.revealKey(token, key.id);
      setRevealed((current) => ({ ...current, [key.id]: response.key }));
    } catch (revealError) {
      Alert.alert(t('revealFailed'), revealError instanceof Error ? revealError.message : t('tryAgain'));
    }
  };

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert(t('copied'), t('copiedHint'));
  };

  const remove = (key: ApiKey) => {
    if (!token) return;
    Alert.alert(t('deleteKey'), t('deleteKeyConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteKey(token, key.id);
            setKeys((current) => current.filter((item) => item.id !== key.id));
          } catch (deleteError) {
            Alert.alert(t('deleteFailed'), deleteError instanceof Error ? deleteError.message : t('tryAgain'));
          }
        },
      },
    ]);
  };

  const create = async () => {
    if (!token) return;
    const quotaValue = Number(form.quota);
    if (!form.name.trim() || !form.group || (form.quotaMode === 'limited' && (!quotaValue || quotaValue < 0))) return;
    const expiryDays = form.expiry === 'never' ? 0 : Number(form.expiry);
    const input: ApiKeyInput = {
      name: form.name.trim(),
      expired_time: expiryDays ? Math.floor(Date.now() / 1000) + expiryDays * 86400 : -1,
      remain_quota: form.quotaMode === 'limited' ? Math.round(quotaValue * quotaPerUnit) : 0,
      unlimited_quota: form.quotaMode === 'unlimited',
      model_limits: [],
      allow_ips: [],
      group: form.group,
    };
    setSaving(true);
    try {
      const created = await api.createKey(token, input);
      setKeys((current) => [created, ...current]);
      setForm(createDefaultForm(form.group));
      setFormVisible(false);
    } catch (createError) {
      Alert.alert(t('createFailed'), createError instanceof Error ? createError.message : t('tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const defaultGroupId = groups.find((group) => group.id === 'default')?.id ?? groups[0]?.id ?? '';
  const selectedGroup = groups.find((group) => group.id === form.group);

  const openForm = () => {
    setForm(createDefaultForm(defaultGroupId));
    setFormVisible(true);
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t('credentials')}</Text>
          <Text style={styles.title}>API Keys</Text>
        </View>
        <Pressable accessibilityLabel={t('createKey')} onPress={openForm} style={styles.addButton}>
          <Plus color="#FFFFFF" size={22} />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={keys.length ? styles.list : styles.emptyList}
        data={keys}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? null : <EmptyState description={t('noKeyHint')} icon={KeyRound} title={t('noKey')} />
        }
        renderItem={({ item }) => {
          const fullKey = revealed[item.id];
          return (
            <View style={styles.keyCard}>
              <View style={styles.keyHeader}>
                <View style={styles.keyIcon}>
                  <KeyRound color={colors.primary} size={20} />
                </View>
                <View style={styles.keyIdentity}>
                  <Text numberOfLines={1} style={styles.keyName}>{item.name}</Text>
                  <Text numberOfLines={1} style={styles.keyMask}>{fullKey || item.key_masked || '••••••••••••'}</Text>
                  <Text numberOfLines={1} style={styles.keyGroup}>{t('group')} · {item.group || 'default'}</Text>
                </View>
                <Switch
                  onValueChange={() => toggle(item)}
                  thumbColor="#FFFFFF"
                  trackColor={{ false: colors.disabled, true: colors.primary }}
                  value={item.status === 1}
                />
              </View>
              <View style={styles.keyMeta}>
                <Text style={styles.metaText}>{item.unlimited_quota ? t('unlimited') : `${t('remaining')} ${currencySymbol}${(item.remain_quota / quotaPerUnit).toFixed(2)}`}</Text>
                <Text style={styles.metaText}>{item.expired_time === -1 ? t('neverExpires') : new Date(item.expired_time * 1000).toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN')}</Text>
              </View>
              <View style={styles.keyActions}>
                <Pressable accessibilityLabel={fullKey ? t('hideKey') : t('revealKey')} onPress={() => reveal(item)} style={styles.actionButton}>
                  {fullKey ? <EyeOff color={colors.textMuted} size={20} /> : <Eye color={colors.textMuted} size={20} />}
                </Pressable>
                <Pressable
                  accessibilityLabel={t('copyKey')}
                  disabled={!fullKey}
                  onPress={() => fullKey && copy(fullKey)}
                  style={styles.actionButton}>
                  <Copy color={fullKey ? colors.textMuted : colors.disabled} size={20} />
                </Pressable>
                <View style={styles.actionSpacer} />
                <Pressable accessibilityLabel={t('deleteKey')} onPress={() => remove(item)} style={styles.actionButton}>
                  <Trash2 color={colors.danger} size={20} />
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      <Modal animationType="slide" onRequestClose={() => setFormVisible(false)} transparent visible={formVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <Pressable onPress={() => setFormVisible(false)} style={StyleSheet.absoluteFill} />
          <View style={styles.formSheet}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{t('createKey')}</Text>
              <Pressable accessibilityLabel={t('close')} hitSlop={10} onPress={() => setFormVisible(false)}>
                <X color={colors.text} size={22} />
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>{t('name')}</Text>
            <TextInput
              autoFocus
              maxLength={50}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              placeholder={t('nameExample')}
              placeholderTextColor={colors.disabled}
              style={styles.input}
              value={form.name}
            />

            <Text style={styles.fieldLabel}>{t('group')}</Text>
            <Pressable onPress={() => setGroupPickerVisible(true)} style={styles.groupSelect}>
              <View style={styles.groupSelectText}>
                <Text numberOfLines={1} style={styles.groupSelectTitle}>
                  {selectedGroup?.description || selectedGroup?.id || t('chooseGroup')}
                </Text>
                {selectedGroup ? (
                  <Text numberOfLines={1} style={styles.groupSelectCaption}>
                    {selectedGroup.id}{selectedGroup.ratio ? ` · ${t('ratio')} ${selectedGroup.ratio}` : ''}
                  </Text>
                ) : null}
              </View>
              <ChevronDown color={colors.textMuted} size={18} />
            </Pressable>

            <Text style={styles.fieldLabel}>{t('quota')}</Text>
            <View style={styles.segmented}>
              {(['unlimited', 'limited'] as QuotaMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setForm((current) => ({ ...current, quotaMode: mode }))}
                  style={[styles.segment, form.quotaMode === mode && styles.segmentActive]}>
                  {form.quotaMode === mode ? <Check color={colors.primary} size={16} /> : null}
                  <Text style={[styles.segmentText, form.quotaMode === mode && styles.segmentTextActive]}>
                    {mode === 'unlimited' ? t('unlimited') : t('fixedQuota')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {form.quotaMode === 'limited' ? (
              <TextInput
                inputMode="decimal"
                onChangeText={(quota) => setForm((current) => ({ ...current, quota }))}
                placeholder={t('quotaAmount')}
                placeholderTextColor={colors.disabled}
                style={[styles.input, styles.conditionalInput]}
                value={form.quota}
              />
            ) : null}

            <Text style={styles.fieldLabel}>{t('validity')}</Text>
            <View style={styles.segmented}>
              {(['never', '30', '90'] as ExpiryMode[]).map((expiry) => (
                <Pressable
                  key={expiry}
                  onPress={() => setForm((current) => ({ ...current, expiry }))}
                  style={[styles.segment, form.expiry === expiry && styles.segmentActive]}>
                  <Text style={[styles.segmentText, form.expiry === expiry && styles.segmentTextActive]}>
                    {expiry === 'never' ? t('forever') : `${expiry} ${t('days')}`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formAction}>
              <PrimaryButton
                disabled={!form.name.trim() || !form.group}
                icon={Plus}
                label={t('createKey')}
                loading={saving}
                onPress={create}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setGroupPickerVisible(false)}
        transparent
        visible={groupPickerVisible}>
        <Pressable onPress={() => setGroupPickerVisible(false)} style={styles.pickerBackdrop}>
          <Pressable style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{t('chooseKeyGroup')}</Text>
              <Pressable accessibilityLabel={t('close')} hitSlop={10} onPress={() => setGroupPickerVisible(false)}>
                <X color={colors.text} size={22} />
              </Pressable>
            </View>
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setForm((current) => ({ ...current, group: item.id }));
                    setGroupPickerVisible(false);
                  }}
                  style={styles.pickerRow}>
                  <View style={styles.pickerRowText}>
                    <Text style={styles.pickerRowTitle}>{item.description || item.id}</Text>
                    <Text style={styles.pickerRowCaption}>
                      {item.id}{item.ratio ? ` · ${t('ratio')} ${item.ratio}` : ''}
                    </Text>
                  </View>
                  {form.group === item.id ? <Check color={colors.primary} size={20} /> : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 1 },
  addButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
  },
  error: { color: colors.danger, paddingHorizontal: 16, paddingBottom: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  emptyList: { flexGrow: 1 },
  keyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    padding: 14,
  },
  keyHeader: { flexDirection: 'row', alignItems: 'center' },
  keyIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  keyIdentity: { flex: 1, paddingHorizontal: 10, minWidth: 0 },
  keyName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  keyMask: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  keyGroup: { color: colors.primary, fontSize: 11, marginTop: 3, fontWeight: '600' },
  keyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  metaText: { color: colors.textMuted, fontSize: 12 },
  keyActions: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, gap: 4 },
  actionButton: { width: 38, height: 36, alignItems: 'center', justifyContent: 'center' },
  actionSpacer: { flex: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,32,27,0.38)' },
  formSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.medium,
    borderTopRightRadius: radius.medium,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  formHeader: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 7 },
  input: {
    height: 48,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: 13,
    fontSize: 15,
  },
  conditionalInput: { marginTop: 8 },
  groupSelect: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  groupSelectText: { flex: 1, paddingRight: 10 },
  groupSelectTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  groupSelectCaption: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  segmented: {
    minHeight: 44,
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceMuted,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.small,
    paddingHorizontal: 8,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  formAction: { marginTop: 24 },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19,32,27,0.38)' },
  pickerSheet: {
    maxHeight: '65%',
    minHeight: 240,
    paddingBottom: 24,
    borderTopLeftRadius: radius.medium,
    borderTopRightRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  pickerHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  pickerRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerRowText: { flex: 1, paddingRight: 12 },
  pickerRowTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  pickerRowCaption: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
});
