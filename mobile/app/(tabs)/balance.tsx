import { Activity, Coins, Hash, RefreshCw, Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { Screen } from '@/components/Screen';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { syncBalanceWidget } from '@/storage/widget';
import type { Balance } from '@/types/api';

export default function BalanceScreen() {
  const { token } = useAuth();
  const { language, t } = useLanguage();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    void api
      .balance(token)
      .then((result) => {
        if (active) {
          setBalance(result);
          void syncBalanceWidget(result, language);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : t('balanceFailed'));
      });
    return () => {
      active = false;
    };
  }, [language, t, token]);

  const refresh = async () => {
    if (!token) return;
    setRefreshing(true);
    setError('');
    try {
      const result = await api.balance(token);
      setBalance(result);
      await syncBalanceWidget(result, language);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('balanceFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{t('accountOverview')}</Text>
            <Text style={styles.title}>{t('balance')}</Text>
          </View>
          <RefreshCw color={colors.primary} size={22} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.balanceBand}>
          <Coins color="#FFFFFF" size={24} />
          <Text style={styles.balanceLabel}>{t('availableBalance')}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.balanceValue}>
            {balance ? `${balance.currency_symbol}${balance.available.toFixed(4)}` : '--'}
          </Text>
        </View>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Activity color={colors.accent} size={22} />
            <Text style={styles.metricLabel}>{t('totalUsed')}</Text>
            <Text style={styles.metricValue}>
              {balance ? `${balance.currency_symbol}${balance.used.toFixed(4)}` : '--'}
            </Text>
          </View>
          <View style={styles.metric}>
            <Send color={colors.primary} size={22} />
            <Text style={styles.metricLabel}>{t('requests')}</Text>
            <Text style={styles.metricValue}>{balance?.request_count.toLocaleString() ?? '--'}</Text>
          </View>
          <View style={styles.metric}>
            <Hash color={colors.warning} size={22} />
            <Text style={styles.metricLabel}>{t('totalTokens')}</Text>
            <Text style={styles.metricValue}>{balance?.used_tokens.toLocaleString() ?? '--'}</Text>
          </View>
        </View>
        <Text style={styles.widgetHint}>{t('widgetHint')}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 2 },
  error: { color: colors.danger, marginBottom: 12 },
  balanceBand: {
    minHeight: 190,
    borderRadius: radius.medium,
    backgroundColor: colors.primaryDark,
    padding: 24,
    justifyContent: 'flex-end',
  },
  balanceLabel: { color: '#CFE7DE', fontSize: 14, marginTop: 28, marginBottom: 6 },
  balanceValue: { color: '#FFFFFF', fontSize: 40, fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  metric: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 132,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    padding: 16,
    justifyContent: 'space-between',
  },
  metricLabel: { color: colors.textMuted, marginTop: 12 },
  metricValue: { color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 4 },
  widgetHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 14 },
});
