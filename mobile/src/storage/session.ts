import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { storageKey } from '@/constants/app';

const sessionKey = storageKey('session');

export async function readSessionToken(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(sessionKey);
  return SecureStore.getItemAsync(sessionKey);
}

export async function writeSessionToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(sessionKey, token);
    return;
  }
  await SecureStore.setItemAsync(sessionKey, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(sessionKey);
    return;
  }
  await SecureStore.deleteItemAsync(sessionKey);
}
