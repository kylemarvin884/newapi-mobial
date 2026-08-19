import AsyncStorage from '@react-native-async-storage/async-storage';
import { createElement } from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { BalanceWidget } from '@/widgets/BalanceWidget';
import type { Balance } from '@/types/api';
import type { Language } from '@/contexts/LanguageContext';

const snapshotKey = 'kyle-ai-balance-widget';

export interface BalanceWidgetSnapshot {
  currencySymbol: string;
  available: number;
  usedTokens: number;
  updatedAt: number;
  language: Language;
}

export const emptyWidgetSnapshot = (): BalanceWidgetSnapshot => ({
  currencySymbol: '¥',
  available: 0,
  usedTokens: 0,
  updatedAt: 0,
  language: 'zh',
});

export async function readWidgetSnapshot(): Promise<BalanceWidgetSnapshot> {
  const raw = await AsyncStorage.getItem(snapshotKey);
  if (!raw) return emptyWidgetSnapshot();
  try {
    const value = JSON.parse(raw) as Partial<BalanceWidgetSnapshot>;
    return {
      currencySymbol: typeof value.currencySymbol === 'string' ? value.currencySymbol : '¥',
      available: typeof value.available === 'number' ? value.available : 0,
      usedTokens: typeof value.usedTokens === 'number' ? value.usedTokens : 0,
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
      language: value.language === 'en' ? 'en' : 'zh',
    };
  } catch {
    return emptyWidgetSnapshot();
  }
}

export async function syncBalanceWidget(balance: Balance, language: Language): Promise<void> {
  const snapshot: BalanceWidgetSnapshot = {
    currencySymbol: balance.currency_symbol,
    available: balance.available,
    usedTokens: balance.used_tokens,
    updatedAt: Date.now(),
    language,
  };
  await AsyncStorage.setItem(snapshotKey, JSON.stringify(snapshot));
  if (Platform.OS !== 'android') return;
  try {
    await requestWidgetUpdate({
      widgetName: 'Balance',
      renderWidget: () => createElement(BalanceWidget, { snapshot }),
    });
  } catch {
    // Native widgets are unavailable in Expo Go and web previews.
  }
}
