import type {PlatformKey, YouTubeConfig} from './types';

// Repair malformed cache shapes without discarding a valid other-app namespace
// or unrelated metadata. The caller decides when freshly acquired keys are saved.
export function normalizeConfig(value: unknown): YouTubeConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const config = {...value} as YouTubeConfig;
  for (const key of ['youtube', 'youtubeMusic'] as PlatformKey[]) {
    const entry = config[key];
    if (entry !== undefined && (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
      (entry.clientKey !== undefined && typeof entry.clientKey !== 'string') ||
      (entry.encryptKey !== undefined && typeof entry.encryptKey !== 'string'))) delete config[key];
  }
  return config;
}
