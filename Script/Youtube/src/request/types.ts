export type Headers = Record<string, string>;
export type PlatformKey = 'youtube' | 'youtubeMusic';
export interface KeyConfig { clientKey?: string; encryptKey?: string; hotHashData?: string; [key: string]: unknown }
export interface YouTubeConfig { youtube?: KeyConfig; youtubeMusic?: KeyConfig; [key: string]: unknown }
export interface WorkerParams {
  captionLang: string;
  blockUpload: boolean;
  blockImmersive: boolean;
  blockShorts: boolean;
}
export interface Options { worker: WorkerParams; debug: boolean; localPlayback: boolean; bootstrapRetry: boolean }
export interface RequestInput {
  url: string;
  headers: Headers;
  bodyBytes?: Uint8Array;
  config: YouTubeConfig;
  params: WorkerParams;
  // A QX header-only rewrite must not change the body's representation metadata.
  preserveBodyEncoding?: boolean;
  localPlayback?: boolean;
}
export interface Decision {
  action: 'pass' | 'headers' | 'redirect' | 'empty';
  reason: string;
  platformKey: PlatformKey;
  config: YouTubeConfig;
  changed: boolean;
  headers?: Headers;
  redirectUrl?: string;
}
export interface NativeRequest {
  url: string;
  method?: string;
  headers?: Headers;
  body?: unknown;
  bodyBytes?: unknown;
  sessionIndex?: string | number;
  id?: string;
}
export interface Host {
  $request?: NativeRequest;
  $task?: unknown;
  $rocket?: unknown;
  $argument?: unknown;
  $environment?: { sourcePath?: string; variables?: Record<string, unknown>; [key: string]: unknown };
  $prefs?: { valueForKey(key: string): string | null; setValueForKey(value: string, key: string): boolean };
  $persistentStore?: { read(key: string): string | null; write(value: string, key: string): boolean | void };
  $done(result: Record<string, unknown>): void;
  console: { log(message: string): void };
}
