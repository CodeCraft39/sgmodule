import {messages} from './schema';
import {handle} from './handlers';
import {qxNext2026} from './next-wire';
import {bytes, isQX} from '../request/platform';
import {options} from '../request/options';
import {platformKey} from '../request/core';
import {normalizeConfig} from '../request/config';
import {sessionSuffix} from '../request/diagnostics';
import type {Host} from '../request/types';
import type {AdCache, State} from './types';

interface ResponseHost extends Host { $response?: {body?: unknown; bodyBytes?: unknown} }
const routes: Record<string,string> = {
  browse:'browse.Browse',next:'next.Next',player:'player.Player',search:'search.Search',
  'reel/reel_watch_sequence':'shorts.Shorts',guide:'guide.Guide','account/get_setting':'setting.Setting',
  get_watch:'watch.Watch',config:'config.Config',log_event:'config.Config',
};
function emptyCache(): AdCache {
  return {whiteNo:[],blackNo:[],whiteEml:[],blackEml:['inline_injection_entrypoint_layout.eml'],dirty:false};
}
export function runResponse(host: ResponseHost): void {
  let done = false;
  const finish = (value: Record<string,unknown>) => { if (!done) { done=true; host.$done(value); } };
  const qx = isQX(host);
  const route = host.$request?.url.match(/^https?:\/\/[^/]+\/youtubei\/v1\/([^?#]+)/)?.[1] ?? 'other';
  const session = sessionSuffix(host.$request);
  const log = (action: string, detail: string) => host.console.log(`[YT-RESPONSE response-compat-20261031.2] client=${qx?'QX':'Surge-compatible'} endpoint=${route} action=${action} ${detail}${session}`);
  try {
    const opts = options(host);
    if (!Object.prototype.hasOwnProperty.call(routes, route)) {
      if (opts.debug) log('pass',route==='player/ad_break'?'reason=unverified-ad-break-schema':'reason=unhandled-endpoint');
      finish({}); return;
    }
    const raw = host.$response;
    const body = bytes(qx ? raw?.bodyBytes ?? raw?.body : raw?.body ?? raw?.bodyBytes);
    if (!body) { log('pass','reason=body-unavailable'); finish({}); return; }
    const load = (key: string) => {
      const text = qx ? host.$prefs?.valueForKey(key) : host.$persistentStore?.read(key);
      if (!text) return {};
      try { return JSON.parse(text); }
      catch { log('recover',`event=cache-invalid-json key=${key}`); return {}; }
    };
    const saved = load('YouTubeAdvertiseInfo');
    const validCache = saved?.version === '1.0' && ['whiteNo','blackNo'].every(k=>Array.isArray(saved[k]) && saved[k].every((n: unknown)=>typeof n==='number' && Number.isInteger(n) && n>0)) &&
      ['whiteEml','blackEml'].every(k=>Array.isArray(saved[k]) && saved[k].every((s: unknown)=>typeof s==='string'));
    const loadedConfig: unknown = load('YouTubeConfig');
    const config = normalizeConfig(loadedConfig);
    if (JSON.stringify(config) !== JSON.stringify(loadedConfig)) log('recover','event=cache-invalid-shape key=YouTubeConfig');
    const state: State = {adCache:validCache?{whiteNo:saved.whiteNo,blackNo:saved.blackNo,whiteEml:saved.whiteEml,blackEml:saved.blackEml,dirty:false}:emptyCache(),config};
    const beforeConfig = JSON.stringify(state.config);
    const wire = route === 'next' ? qxNext2026(body) : route === 'get_watch' ? qxNext2026(body, 'watch') : undefined;
    let output: Uint8Array | undefined;
    if (route === 'next' && wire?.has42 && !wire.hasLegacy) {
      if (wire.removed) output = wire.bytes;
    } else {
      const codec = messages['youtube.response.'+routes[route]];
      const decoded = codec.fromBinary(wire?.bytes ?? body);
      const changed = handle(route, decoded, opts.worker, state, platformKey(host.$request?.headers ?? {}));
      if (changed) output = codec.toBinary(decoded);
      else if (wire?.removed) output = wire.bytes;
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
    if (opts.debug) log(output?'body':'pass',`bytes=${body.length}->${output?.length??body.length} removed=${wire?.removed??'legacy'}`);
    if (!output) finish({});
    else finish(qx ? {bodyBytes:output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength)} : {body:output});
  } catch { log('pass','reason=processing-error'); finish({}); }
}
