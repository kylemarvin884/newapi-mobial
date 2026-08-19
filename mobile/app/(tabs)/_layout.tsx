import { Redirect, Tabs } from 'expo-router';
import { Bot, CircleDollarSign, KeyRound, UserRound } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TabLayout() {
  const { token, isLoading } = useAuth();
  const { t } = useLanguage();
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tabs.Screen
        name="chat"
        options={{ title: t('chat'), tabBarIcon: ({ color, size }) => <Bot color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="balance"
        options={{
          title: t('balance'),
          tabBarIcon: ({ color, size }) => <CircleDollarSign color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="keys"
        options={{ title: t('keys'), tabBarIcon: ({ color, size }) => <KeyRound color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: { height: 66, paddingTop: 6, paddingBottom: 8, borderTopColor: colors.border },
  tabLabel: { fontSize: 12, fontWeight: '600' },
});
