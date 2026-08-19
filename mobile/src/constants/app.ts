import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;

function configuredString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export const appName = configuredString(
  extra?.appName,
  Constants.expoConfig?.name ?? 'NewAPI Mobile',
);

export const storageNamespace = configuredString(
  extra?.storageNamespace,
  Constants.expoConfig?.slug ?? 'newapi-mobile',
).replace(/[^a-zA-Z0-9._-]/g, '-');

export function storageKey(suffix: string): string {
  return `${storageNamespace}:${suffix}`;
}
