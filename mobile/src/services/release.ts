import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface AppRelease {
  version: string;
  version_code: number;
  download_url: string;
  share_url: string;
  release_notes: string[];
  share_text: string;
  force_update: boolean;
  published_at: string;
}

const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
const isIOS = Platform.OS === 'ios';

const publicEnvironment: Record<string, string | undefined> = {
  androidDownloadUrl: process.env.EXPO_PUBLIC_ANDROID_DOWNLOAD_URL,
  androidReleaseManifestUrl: process.env.EXPO_PUBLIC_ANDROID_RELEASE_MANIFEST_URL,
  androidShareUrl: process.env.EXPO_PUBLIC_ANDROID_SHARE_URL,
  iosDownloadUrl: process.env.EXPO_PUBLIC_IOS_DOWNLOAD_URL,
  iosReleaseManifestUrl: process.env.EXPO_PUBLIC_IOS_RELEASE_MANIFEST_URL,
  iosShareUrl: process.env.EXPO_PUBLIC_IOS_SHARE_URL,
};

function configuredString(name: string, fallback: string): string {
  const environmentValue = publicEnvironment[name];
  if (environmentValue) return environmentValue;
  const value = extra?.[name];
  return typeof value === 'string' && value ? value : fallback;
}

export const currentAppVersion = Constants.expoConfig?.version ?? '0.0.0';

export const androidDownloadUrl = configuredString(
  'androidDownloadUrl',
  'https://app-api.lianhaotian.com/downloads/kyle-ai.apk',
);
export const androidReleaseManifestUrl = configuredString(
  'androidReleaseManifestUrl',
  'https://app-api.lianhaotian.com/downloads/android-release.json',
);
export const androidShareUrl = configuredString(
  'androidShareUrl',
  'https://app-api.lianhaotian.com/download',
);

export const iosDownloadUrl = configuredString(
  'iosDownloadUrl',
  'https://app-api.lianhaotian.com/ios',
);
export const iosReleaseManifestUrl = configuredString(
  'iosReleaseManifestUrl',
  'https://app-api.lianhaotian.com/downloads/ios-release.json',
);
export const iosShareUrl = configuredString(
  'iosShareUrl',
  'https://app-api.lianhaotian.com/ios',
);

export const platformDownloadUrl = isIOS ? iosDownloadUrl : androidDownloadUrl;
export const platformReleaseManifestUrl = isIOS
  ? iosReleaseManifestUrl
  : androidReleaseManifestUrl;
export const platformShareUrl = isIOS ? iosShareUrl : androidShareUrl;

const defaultShareText = [
  '🚀 Kyle AI，让多种 AI 模型随时装进口袋。',
  '✨ 支持智能聊天、AI 生图、余额查询和 API Key 管理。',
  '🔐 账号直接连接 Kyle AI 服务，简单、安全又方便。',
].join('\n');

function parseRelease(value: unknown): AppRelease {
  if (!value || typeof value !== 'object') throw new Error('版本清单格式错误');
  const release = value as Partial<AppRelease>;
  if (typeof release.version !== 'string' || !release.version.trim()) {
    throw new Error('版本清单缺少版本号');
  }
  return {
    version: release.version.trim(),
    version_code: typeof release.version_code === 'number' ? release.version_code : 0,
    download_url:
      typeof release.download_url === 'string' && release.download_url
        ? release.download_url
        : platformDownloadUrl,
    share_url:
      typeof release.share_url === 'string' && release.share_url
        ? release.share_url
        : platformShareUrl,
    release_notes: Array.isArray(release.release_notes)
      ? release.release_notes.filter((item): item is string => typeof item === 'string')
      : [],
    share_text:
      typeof release.share_text === 'string' && release.share_text.trim()
        ? release.share_text.trim()
        : defaultShareText,
    force_update: release.force_update === true,
    published_at: typeof release.published_at === 'string' ? release.published_at : '',
  };
}

function versionParts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, '')
    .split('-', 1)[0]
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

export function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = versionParts(latest);
  const currentParts = versionParts(current);
  const length = Math.max(latestParts.length, currentParts.length);
  for (let index = 0; index < length; index += 1) {
    const latestPart = latestParts[index] ?? 0;
    const currentPart = currentParts[index] ?? 0;
    if (latestPart !== currentPart) return latestPart > currentPart;
  }
  return false;
}

export async function fetchRelease(): Promise<AppRelease> {
  const manifestUrl = platformReleaseManifestUrl;
  const separator = manifestUrl.includes('?') ? '&' : '?';
  const response = await fetch(`${manifestUrl}${separator}time=${Date.now()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`更新服务器返回 ${response.status}`);
  return parseRelease(await response.json());
}

export const fetchAndroidRelease = fetchRelease;

export function buildShareMessage(release?: AppRelease | null): string {
  return `${release?.share_text || defaultShareText}\n\n📲 软件介绍与下载：${release?.share_url || platformShareUrl}`;
}