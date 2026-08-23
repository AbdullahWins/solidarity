import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, spacing, typography } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ScreenContainer style={styles.container}>
        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  link: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  linkText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '700',
  },
});
