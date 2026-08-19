import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon color={colors.primary} size={28} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: 16,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  description: { color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
});

