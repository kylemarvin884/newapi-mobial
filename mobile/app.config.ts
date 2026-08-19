import type { ConfigContext, ExpoConfig } from 'expo/config';

import baseConfig from './app.json';

function optional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function requiredIdentity(value: string | undefined, fallback: string): string {
  return optional(value) ?? fallback;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = baseConfig.expo as ExpoConfig;
  const appName = requiredIdentity(process.env.APP_NAME, base.name ?? 'NewAPI Mobile');
  const appSlug = requiredIdentity(process.env.APP_SLUG, base.slug ?? 'newapi-mobile');
  const appScheme = requiredIdentity(process.env.APP_SCHEME, 'newapimobile');
  const androidPackage = requiredIdentity(process.env.ANDROID_PACKAGE, 'com.example.newapimobile');
  const iosBundleIdentifier = requiredIdentity(
    process.env.IOS_BUNDLE_IDENTIFIER,
    'com.example.newapimobile',
  );
  const storageNamespace = requiredIdentity(
    process.env.EXPO_PUBLIC_STORAGE_NAMESPACE,
    appSlug,
  );
  const easProjectId = optional(process.env.EAS_PROJECT_ID);

  return {
    ...config,
    ...base,
    name: appName,
    slug: appSlug,
    scheme: appScheme,
    ios: {
      ...base.ios,
      bundleIdentifier: iosBundleIdentifier,
    },
    android: {
      ...base.android,
      package: androidPackage,
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'react-native-android-widget',
        {
          widgets: [
            {
              name: 'Balance',
              label: `${appName} 余额`,
              description: '查看余额和累计 Token',
              minWidth: '180dp',
              minHeight: '110dp',
              targetCellWidth: 3,
              targetCellHeight: 2,
              resizeMode: 'horizontal',
              previewImage: './assets/icon.png',
              updatePeriodMillis: 1800000,
            },
          ],
        },
      ],
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/icon-ios.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#F7FAF9',
        },
      ],
    ],
    extra: {
      router: {},
      appName,
      storageNamespace,
      apiBaseUrl: optional(process.env.EXPO_PUBLIC_API_BASE_URL),
      androidDownloadUrl: optional(process.env.EXPO_PUBLIC_ANDROID_DOWNLOAD_URL),
      androidReleaseManifestUrl: optional(
        process.env.EXPO_PUBLIC_ANDROID_RELEASE_MANIFEST_URL,
      ),
      androidShareUrl: optional(process.env.EXPO_PUBLIC_ANDROID_SHARE_URL),
      iosDownloadUrl: optional(process.env.EXPO_PUBLIC_IOS_DOWNLOAD_URL),
      iosReleaseManifestUrl: optional(process.env.EXPO_PUBLIC_IOS_RELEASE_MANIFEST_URL),
      iosShareUrl: optional(process.env.EXPO_PUBLIC_IOS_SHARE_URL),
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    },
  };
};
