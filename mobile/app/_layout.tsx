import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
