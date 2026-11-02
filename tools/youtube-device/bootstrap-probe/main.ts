// Temporary QX diagnostic. The builder embeds the exact validated production bundle.
import {CONFIG_KEY} from '../../../Script/Youtube/src/request/constants';
import {decodeBase64} from '../../../Script/Youtube/src/request/base64';
import {platformKey} from '../../../Script/Youtube/src/request/core';
import {decodeOnesieRequest} from '../../../Script/Youtube/src/request/protobuf';
import {bytes, isQX} from '../../../Script/Youtube/src/request/platform';
import {options} from '../../../Script/Youtube/src/request/options';
import {sessionSuffix} from '../../../Script/Youtube/src/request/diagnostics';
import type {Host, YouTubeConfig} from '../../../Script/Youtube/src/request/types';

export const BUILD = 'bootstrap-probe-20261102.1';
export const STORE = 'YouTubeBootstrapProbe.v1';
const TTL_MS = 10 * 60 * 1000;
interface ProbeHost extends Host {
  crypto?: unknown;
  CompressionStream?: unknown;
  DecompressionStream?: unknown;
  setTimeout?: (callback: () => void, delay: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}
interface ProbeState {
  version: 1;
  token: string;
  state: 'armed' | 'claimed' | 'completed' | 'failed' | 'cancelled';
  expiresAt: number;
  session?: string;
  emptyCompletionRequested?: boolean;
  initialConfigReadMasked?: boolean;
  failure?: string;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid-record');
  return value as Record<string, unknown>;
}
function readConfig(host: ProbeHost): YouTubeConfig {
  return object(JSON.parse(host.$prefs?.valueForKey(CONFIG_KEY) ?? '{}')) as YouTubeConfig;
}
function readState(host: ProbeHost): ProbeState | undefined {
  const raw = host.$prefs?.valueForKey(STORE);
  if (!raw) return;
  const value = object(JSON.parse(raw));
  if (value.version !== 1 || typeof value.token !== 'string' || typeof value.expiresAt !== 'number' ||
      !['armed','claimed','completed','failed','cancelled'].includes(String(value.state))) throw Error('invalid-state');
  return value as unknown as ProbeState;
}
function writeState(host: ProbeHost, state: ProbeState): boolean {
  try { return host.$prefs?.setValueForKey(JSON.stringify(state), STORE) === true; }
  catch { return false; }
}
function hasPair(config: YouTubeConfig): boolean {
  const pair = config.youtube;
  return typeof pair?.clientKey === 'string' && typeof pair.encryptKey === 'string' &&
    decodeBase64(pair.clientKey).length === 32 && decodeBase64(pair.encryptKey).length > 0;
}
function reply(host: ProbeHost, status: number, value: unknown): void {
  host.$done({status:`HTTP/1.1 ${status} ${status === 200 ? 'OK' : 'Service Unavailable'}`,
    headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}, body:JSON.stringify(value)});
}
export function runBootstrapProbe(host: ProbeHost, production: (view: ProbeHost) => void): void {
  let delegated = false;
  const delegate = (view: ProbeHost) => { if (!delegated) { delegated=true; production(view); } };
  const request = host.$request;
  const control = request?.url.match(/^https:\/\/example\.com\/yt-local-capture\/bootstrap-probe\/(arm|status|cancel)(?:\?[^#]*)?$/)?.[1];
  const log = (detail: string) => host.console.log(`[YT-BOOTSTRAP ${BUILD}] ${detail}${sessionSuffix(request)}`);
  if (control) {
    try {
      if (!isQX(host) || (request?.method ?? 'GET').toUpperCase() !== 'GET') {
        reply(host,503,{build:BUILD,armed:false,error:'QX-GET-required'}); return;
      }
      if (control === 'arm') {
        // Arming does not clear keys. Selection/clearing happens inside a real POST.
        if (!hasPair(readConfig(host))) { reply(host,503,{build:BUILD,armed:false,error:'play-a-video-first'}); return; }
        const state: ProbeState = {version:1,token:`${Date.now()}-${Math.random()}`,state:'armed',expiresAt:Date.now()+TTL_MS};
        const ok = writeState(host,state);
        log(`action=arm persisted=${ok}`);
        reply(host,ok?200:503,{build:BUILD,armed:ok,keysUnchanged:true,expiresInSeconds:TTL_MS/1000});
      } else if (control === 'cancel') {
        const previous = readState(host);
        const state: ProbeState = {...previous,version:1,token:previous?.token??'',state:'cancelled',expiresAt:0};
        const ok = writeState(host,state);
        reply(host,ok?200:503,{build:BUILD,cancelled:ok});
      } else {
        const state = readState(host);
        // Export control state only; never key material, request bodies or URLs.
        reply(host,200,{build:BUILD,state:state?.state??'idle',armed:state?.state==='armed'&&state.expiresAt>Date.now(),
          session:state?.session,emptyCompletionRequested:state?.emptyCompletionRequested,
          initialConfigReadMasked:state?.initialConfigReadMasked,failure:state?.failure});
      }
    } catch { reply(host,503,{build:BUILD,armed:false,error:'control-storage-or-config-failed'}); }
    return;
  }
  let armed: ProbeState | undefined;
  let snapshot: YouTubeConfig | undefined;
  try {
    const opts = options(host);
    if (!isQX(host) || !opts.localPlayback || !opts.qxEcho || !request ||
        request.method?.toUpperCase() !== 'POST' || platformKey(request.headers??{}) !== 'youtube' ||
        !/^https?:\/\/[\w-]+\.googlevideo\.com\/initplayback\?(?:[^#]*&)?ack(?:=|&|$)/.test(request.url)) {
      delegate(host); return;
    }
    armed = readState(host);
    if (armed?.state !== 'armed' || armed.expiresAt <= Date.now()) { delegate(host); return; }
    const body = bytes(request.bodyBytes ?? request.body);
    if (!body?.length) { log('action=skip reason=body-unavailable'); delegate(host); return; }
    const envelope = decodeOnesieRequest(body).encryptedInnertubeRequest;
    snapshot = readConfig(host);
    const storedKey = hasPair(snapshot) ? decodeBase64(snapshot.youtube!.encryptKey!) : undefined;
    if (!storedKey || !envelope || storedKey.length !== envelope.encryptedClientKey.length ||
        !storedKey.every((v,i)=>v===envelope.encryptedClientKey[i])) {
      log('action=skip reason=cache-not-matched'); delegate(host); return;
    }
  } catch { log('action=skip reason=diagnostic-unavailable'); delegate(host); return; }
  // Consume before clearing, so ordinary sequential requests do not repeat it.
  // QX preferences offer no cross-script compare-and-swap. Accept the device run
  // only when the tunnel log records exactly one action=force-missing-key.
  const claimed: ProbeState = {...armed!,state:'claimed',session:sessionSuffix(request).trim()};
  if (!writeState(host,claimed)) { log('action=skip reason=claim-write-failed'); delegate(host); return; }
  let cleared: string;
  try {
    // Re-read immediately before writing to preserve other apps/settings.
    const config = readConfig(host);
    delete config.youtube;
    cleared = JSON.stringify(config);
    if (host.$prefs?.setValueForKey(cleared,CONFIG_KEY) !== true) throw Error('write-failed');
  } catch {
    writeState(host,{...claimed,state:'failed',failure:'config-clear-failed'});
    log('action=skip reason=config-clear-failed'); delegate(host); return;
  }
  let initialRead = true, completed = false;
  const prefs = host.$prefs!;
  const view: ProbeHost = {
    $request:request,$task:host.$task,$environment:host.$environment,$argument:host.$argument,
    console:host.console,crypto:host.crypto,CompressionStream:host.CompressionStream,DecompressionStream:host.DecompressionStream,
    setTimeout:host.setTimeout ? (callback,delay)=>host.setTimeout!(callback,delay) : undefined,
    clearTimeout:host.clearTimeout ? handle=>host.clearTimeout!(handle) : undefined,
    $prefs:{
      valueForKey(name) {
        // Guarantee this production invocation sees the missing pair even if a
        // config response races between the clear and its initial read. Keep
        // that concurrent fresh configuration intact in the actual preferences.
        if (name === CONFIG_KEY && initialRead) { initialRead=false; return cleared; }
        return prefs.valueForKey(name);
      },
      setValueForKey:(value,name)=>prefs.setValueForKey(value,name),
      removeValueForKey:prefs.removeValueForKey ? name=>prefs.removeValueForKey!(name) : undefined,
    },
    $done(result) {
      if (completed) return;
      completed=true;
      const empty = result.status === 'HTTP/1.1 200 OK' && result.body === '';
      try {
        if (readState(host)?.token === claimed.token &&
            !writeState(host,{...claimed,state:'completed',emptyCompletionRequested:empty,initialConfigReadMasked:!initialRead}))
          log('action=record-failed');
      } catch { log('action=record-failed'); }
      log(`action=production-completion emptyRequested=${empty} initialReadMasked=${!initialRead}`);
      host.$done(result);
    },
  };
  log('action=force-missing-key configCleared=true');
  delegate(view);
}
