import {endpointFor, onesieEndpoint} from './endpoints';
import {bytes, isQX} from '../request/platform';
import {options} from '../request/options';
import {platformKey, endpoint as requestEndpoint} from '../request/core';
import {decodeBase64} from '../request/base64';
import {rewriteOnesie, OnesieError} from '../protobuf/onesie';
import {webPlaybackRuntime, playbackDeadline} from '../protobuf/web-playback';
import type {WebPlaybackHost} from '../protobuf/web-playback';
import {normalizeConfig} from '../request/config';
import {sessionSuffix} from '../request/diagnostics';
import type {Host} from '../request/types';
import type {AdCache, State} from './types';

interface ResponseHost extends Host, WebPlaybackHost { $response?: {body?: unknown; bodyBytes?: unknown} }
function emptyCache(): AdCache {
  return {whiteNo:[],blackNo:[],whiteEml:[],blackEml:['inline_injection_entrypoint_layout.eml'],dirty:false};
}
function decodeCache(value: unknown): AdCache | undefined {
  if (value === null || typeof value !== 'object') return;
  const cache = value as Record<string, unknown>;
  const {whiteNo, blackNo, whiteEml, blackEml} = cache;
  const numbers = (v: unknown): v is number[] => Array.isArray(v) && v.every((n: unknown) => typeof n === 'number' && Number.isInteger(n) && n > 0);
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s: unknown) => typeof s === 'string');
  if (cache.version === '1.0' && numbers(whiteNo) && numbers(blackNo) && strings(whiteEml) && strings(blackEml))
    return {whiteNo, blackNo, whiteEml, blackEml, dirty:false};
}
export async function runResponse(host: ResponseHost): Promise<void> {
  let done = false;
  const finish = (value: Record<string,unknown>) => { if (!done) { done=true; host.$done(value); } };
  const qx = isQX(host);
  const route = requestEndpoint(host.$request?.url ?? '') === 'initplayback' ? 'initplayback' :
    host.$request?.url.match(/^https?:\/\/[^/]+\/youtubei\/v1\/([^?#]+)/)?.[1] ?? 'other';
  const session = sessionSuffix(host.$request);
  const log = (action: string, detail: string) => host.console.log(`[YT-RESPONSE response-compat-20261101.2] client=${qx?'QX':'Surge-compatible'} endpoint=${route} action=${action} ${detail}${session}`);
  try {
    const opts = options(host);
    const endpoint = endpointFor(route);
    const local = route === 'initplayback' && opts.localPlayback;
    if (!endpoint && !local) {
      if (opts.debug) log('pass',route==='player/ad_break'?'reason=unverified-ad-break-schema':'reason=unhandled-endpoint');
      finish({}); return;
    }
    const raw = host.$response;
    const body = bytes(qx ? raw?.bodyBytes ?? raw?.body : raw?.body ?? raw?.bodyBytes);
    if (!body) { log('pass','reason=body-unavailable'); finish({}); return; }
    const load = (key: string): unknown => {
      const text = qx ? host.$prefs?.valueForKey(key) : host.$persistentStore?.read(key);
      if (!text) return {};
      try { return JSON.parse(text); }
      catch { log('recover',`event=cache-invalid-json key=${key}`); return {}; }
    };
    const saved = load('YouTubeAdvertiseInfo');
    const adCache = decodeCache(saved);
    const loadedConfig: unknown = load('YouTubeConfig');
    const config = normalizeConfig(loadedConfig);
    if (JSON.stringify(config) !== JSON.stringify(loadedConfig)) log('recover','event=cache-invalid-shape key=YouTubeConfig');
    const state: State = {adCache:adCache ?? emptyCache(),config};
    const beforeConfig = JSON.stringify(state.config);
    let output: Uint8Array | undefined, removed: number | undefined;
    if (local) {
      const cachedKey = state.config[platformKey(host.$request?.headers ?? {})]?.clientKey;
      if (!cachedKey) throw new OnesieError('key-missing');
      const result = await playbackDeadline(host,async () => {
        const runtime = await webPlaybackRuntime(host,decodeBase64(cachedKey));
        return rewriteOnesie(body,runtime,plain => onesieEndpoint.process(plain,opts.worker,state,
          platformKey(host.$request?.headers ?? {})).output);
      });
      output = result.output;
      if (opts.debug) log(output?'local-body':'local-pass',`bytes=${body.length}->${output?.length??body.length} verified=${result.verified} updated=${result.changed} parts=${result.parts}`);
    } else {
      ({output, removed} = endpoint!.process(body, opts.worker, state, platformKey(host.$request?.headers ?? {})));
    }
    const save = (key: string, value: unknown) => {
      try {
        const text = JSON.stringify(value);
        const ok = qx ? host.$prefs?.setValueForKey(text,key) : host.$persistentStore?.write(text,key);
        if (ok === false || (qx && ok === undefined)) log('persist','event=storage-write-failed key='+key);
      } catch { log('persist','event=storage-write-failed key='+key); }
    };
    if (state.adCache.dirty || JSON.stringify(state.config) !== beforeConfig) {
      if (state.adCache.dirty) {
        const {dirty, ...cache} = state.adCache;
        save('YouTubeAdvertiseInfo',{version:'1.0',...cache});
      }
      save('YouTubeConfig',state.config);
    }
    if (opts.debug && !local) log(output?'body':'pass',`bytes=${body.length}->${output?.length??body.length} removed=${removed??'legacy'}`);
    if (!output) finish({});
    else finish(qx ? {bodyBytes:output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength)} : {body:output});
  } catch (error) { log('pass','reason='+(error instanceof OnesieError ? error.code : 'processing-error')); finish({}); }
}
