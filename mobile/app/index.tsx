import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  return <Redirect href={token ? '/(tabs)/chat' : '/login'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});

