import {decodeBase64} from './base64';
import {WORKER_URL} from './constants';
import {decodeOnesieRequest} from './protobuf';
import type {Decision, Headers, PlatformKey, RequestInput, WorkerParams} from './types';

export function header(headers: Headers, name: string): string | undefined {
  return Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
}
export function platformKey(headers: Headers): PlatformKey {
  return (header(headers, 'user-agent') ?? '').toLowerCase().includes('music') ? 'youtubeMusic' : 'youtube';
}
export function endpoint(url: string): 'initplayback' | 'log_event' | 'other' {
  if (/^https?:\/\/[^/?#]+\/initplayback(?:[?#]|$)/i.test(url)) return 'initplayback';
  if (/^https?:\/\/[^/?#]+\/youtubei\/v1\/log_event(?:[?#]|$)/i.test(url)) return 'log_event';
  return 'other';
}
export function workerUrl(clientKey: string, target: string, params: WorkerParams): string {
  const query = [`ck=${encodeURIComponent(clientKey)}`, `target=${encodeURIComponent(target)}`];
  for (const [key, value] of Object.entries(params)) query.push(`${key}=${encodeURIComponent(String(value))}`);
  return `${WORKER_URL}?${query.join('&')}`;
}
export function processRequest(input: RequestInput): Decision {
  const key = platformKey(input.headers), config = input.config;
  const base = {platformKey: key, config, changed: false};
  const route = endpoint(input.url);
  if (route === 'other') return {...base, action: 'pass', reason: 'unhandled-endpoint'};
  const cached = config[key];
  if (route === 'log_event') {
    const headers = {...input.headers};
    for (const name of Object.keys(headers)) {
      const lower = name.toLowerCase();
      if ((lower === 'content-encoding' && !input.preserveBodyEncoding) ||
        (!cached?.clientKey && lower === 'x-youtube-hot-hash-data')) delete headers[name];
    }
    return {...base, action: 'headers', reason: cached?.clientKey ? 'cache-present' : 'cache-missing', headers};
  }
  let reason = 'cache-missing';
  if (cached?.clientKey && cached.encryptKey) {
    reason = 'body-unavailable';
    if (input.bodyBytes !== undefined) {
      const requestKey = decodeOnesieRequest(input.bodyBytes).encryptedInnertubeRequest?.encryptedClientKey;
      const cacheKey = decodeBase64(cached.encryptKey);
      if (requestKey && requestKey.length === cacheKey.length && requestKey.every((v, i) => v === cacheKey[i])) {
        return {...base, action: 'redirect', reason: 'key-match', redirectUrl: workerUrl(cached.clientKey, input.url, input.params)};
      }
      reason = 'key-mismatch';
    }
  }
  // Copy rather than mutate the caller's snapshot; preserve the other app's keys
  // and all unknown configuration properties when invalidating this platform.
  const changed = !!cached, updated = {...config};
  if (changed) delete updated[key];
  return {...base, action: 'empty', reason, changed, config: changed ? updated : config};
}
