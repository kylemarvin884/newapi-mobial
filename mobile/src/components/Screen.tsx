import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

interface ScreenProps extends ViewProps {
  padded?: boolean;
}

export function Screen({ children, padded = true, style, ...props }: PropsWithChildren<ScreenProps>) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={[styles.container, padded && styles.padded, style]} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  padded: { paddingHorizontal: 16 },
});

