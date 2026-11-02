import {BUILD, CONFIG_KEY} from './constants';
import {header, platformKey, processRequest} from './core';
import {decodeOnesieRequest} from './protobuf';
import {bytes} from './platform';
import {decodeBase64} from './base64';
import {normalizeConfig} from './config';
import {sessionSuffix} from './diagnostics';
import {acquireEchoLease, echoLeaseKey, releaseEchoLease} from './echo-lease';
import {playbackDeadline} from '../protobuf/web-playback';
import {createPlaybackRuntime} from '../protobuf/playback-runtime';
import {OnesieError, MAX_PLAYBACK_BYTES} from '../protobuf/onesie';
import {runResponse} from '../response/main';
import type {ResponseHost} from '../response/main';
import type {Host, Options, Headers, YouTubeConfig, KeyConfig} from './types';

interface FetchRequest {
  url: string; method: string; headers: Headers; bodyBytes: ArrayBuffer;
  opts: {redirection: false; 'auto-cookie': false};
}
interface FetchResponse {statusCode: number; headers: Headers; bodyBytes?: unknown; body?: unknown}
interface EchoHost extends ResponseHost {$task: {fetch(request: FetchRequest): Promise<FetchResponse>}}
const FETCH_DEADLINE_MS=12000;
const HOP_HEADERS=['connection','proxy-connection','keep-alive','te','trailer','transfer-encoding','upgrade','host','content-length'];
export function echoHeaders(input: Headers, request=false): Headers {
  const hop=[...HOP_HEADERS,...(header(input,'connection')??'').split(',').map(s=>s.trim().toLowerCase())];
  const out: Headers={};
  for (const [name,value] of Object.entries(input)) {
    const lower=name.toLowerCase();
    if (typeof value==='string' && !hop.includes(lower) && lower!=='content-encoding' &&
        (!request || lower!=='accept-encoding')) out[name]=value;
  }
  // The captured init requests are uncompressed. Request a transport identity
  // response to avoid negotiating another HTTP compression layer around UMP.
  if (request) out['Accept-Encoding']='identity';
  return out;
}
function removeBodyValidators(headers: Headers): void {
  for (const name of Object.keys(headers)) {
    if (['etag','content-md5','digest','content-digest','repr-digest'].includes(name.toLowerCase())) delete headers[name];
  }
}
function saveConfig(host: Host, config: YouTubeConfig): boolean {
  try { return host.$prefs?.setValueForKey(JSON.stringify(config),CONFIG_KEY)===true; } catch { return false; }
}
function invalidateIfCurrent(host: Host, key: 'youtube'|'youtubeMusic', old: KeyConfig): boolean {
  try {
    const config=normalizeConfig(JSON.parse(host.$prefs?.valueForKey(CONFIG_KEY)??'{}'));
    if (config[key]?.clientKey!==old.clientKey || config[key]?.encryptKey!==old.encryptKey) return true;
    delete config[key]; return saveConfig(host,config);
  } catch { return false; }
}
export async function runQxEcho(base: Host, opts: Options, config: YouTubeConfig, body?: Uint8Array): Promise<void> {
  const host=base as EchoHost, req=host.$request, key=platformKey(req?.headers??{}), session=sessionSuffix(req);
  let done=false;
  const log=(action: string,detail: string)=>{
    if (opts.debug || action==='error' || action==='persist')
      host.console.log(`[YT-REQUEST ${BUILD}] client=QX endpoint=initplayback mode=echo action=${action} ${detail}${session}`);
  };
  const finish=(status: number,data: Uint8Array,headers: Headers={})=>{
    if (done) return; done=true;
    host.$done({status:`HTTP/1.1 ${status} ${status===200?'OK':status===502?'Bad Gateway':status===504?'Gateway Timeout':status===508?'Loop Detected':'Response'}`,
      headers:echoHeaders(headers),...(data.length ? {bodyBytes:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)} : {body:''})});
  };
  const empty=(reason: string)=>{log('bootstrap-empty','reason='+reason);finish(200,new Uint8Array(0),{'Content-Type':'text/plain','Cache-Control':'no-store'});};
  const error=(status: number,reason: string)=>{log('error','reason='+reason);finish(status,new Uint8Array(0),{'Cache-Control':'no-store'});};
  try {
    if (!req || !/^https?:\/\/[\w-]+\.googlevideo\.com\/initplayback(?:\?|$)/i.test(req.url)) { error(502,'unsupported-origin'); return; }
    if ((req.method??'POST').toUpperCase()!=='POST') { error(502,'unsupported-method'); return; }
    if (!body?.length) { empty('body-unavailable'); return; }
    if (body.length>MAX_PLAYBACK_BYTES) { error(502,'size-limit'); return; }
    const encoding=header(req.headers??{},'content-encoding')?.trim().toLowerCase();
    if (encoding && encoding!=='identity') { error(502,'unsupported-request-encoding'); return; }
    const envelope=decodeOnesieRequest(body).encryptedInnertubeRequest;
    if (!envelope) { error(502,'invalid-request-envelope'); return; }
    const leaseKey=echoLeaseKey(envelope);
    // Check before changing configuration: a re-entered fetch must not invalidate
    // keys acquired by another transaction or recurse into another native fetch.
    const prior=Number(host.$prefs?.valueForKey(leaseKey));
    if (Number.isFinite(prior)&&prior>Date.now()) { error(508,'duplicate-inflight'); return; }
    const decision=processRequest({url:req.url,headers:req.headers??{},bodyBytes:body,config,params:opts.worker,localPlayback:true,preserveBodyEncoding:true});
    if (decision.changed && !saveConfig(host,decision.config)) log('persist','event=storage-write-failed');
    if (decision.reason!=='key-match') { empty(decision.reason); return; }
    const pair={...config[key]!};
    let runtime;
    try {
      let clientKey: Uint8Array;
      try { clientKey=decodeBase64(pair.clientKey!); }
      catch { throw new OnesieError('key-invalid'); }
      runtime=await playbackDeadline(host,async()=>{
        const value=await createPlaybackRuntime(host,clientKey);
        await value.decrypt(envelope.encryptedOnesieInnertubeRequest,envelope.hmac,envelope.iv);
        return value;
      });
    } catch (e) {
      const reason=e instanceof OnesieError?e.code:'processing-error';
      if (reason==='authentication-failed'||reason==='key-invalid') {
        if (!invalidateIfCurrent(host,key,pair)) log('persist','event=storage-write-failed');
        empty('request-'+reason);
      } else error(502,reason);
      return;
    }
    if (typeof host.$task?.fetch!=='function' || !host.setTimeout || !host.clearTimeout) { error(502,'fetch-unavailable'); return; }
    const lease=acquireEchoLease(host,leaseKey);
    if (typeof lease==='string') { error(lease==='busy'?508:502,lease==='busy'?'duplicate-inflight':'guard-storage-failed'); return; }
    let pending: Promise<FetchResponse>;
    try {
      pending=Promise.resolve(host.$task.fetch({url:req.url,method:'POST',headers:echoHeaders(req.headers??{},true),
        bodyBytes:body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength) as ArrayBuffer,
        opts:{redirection:false,'auto-cookie':false}}));
    } catch {
      releaseEchoLease(host,lease); error(502,'fetch-failed'); return;
    }
    // Retain the lease until native I/O settles, even if our deadline fires.
    const released=pending.then(value=>{if(!releaseEchoLease(host,lease))log('persist','event=guard-release-failed');return value;},()=>{
      if(!releaseEchoLease(host,lease))log('persist','event=guard-release-failed');throw Error('fetch-failed');
    });
    let timer: unknown, upstream: FetchResponse;
    try {
      upstream=await Promise.race([released,new Promise<never>((_resolve,reject)=>{
        timer=host.setTimeout!(()=>reject(new Error('fetch-timeout')),FETCH_DEADLINE_MS);
      })]);
    } catch (e) {
      const timeout=e instanceof Error && e.message==='fetch-timeout';
      error(timeout?504:502,timeout?'fetch-timeout':'fetch-failed'); return;
    }
    finally { if(timer!==undefined)host.clearTimeout(timer); }
    if (!Number.isInteger(upstream.statusCode)||upstream.statusCode<100||upstream.statusCode>599) { error(502,'invalid-upstream-status');return; }
    let data=bytes(upstream.bodyBytes) ?? (upstream.body==='' ||
      (upstream.statusCode!==200 && upstream.body==null) ? new Uint8Array(0) : undefined);
    if (!data) { error(502,'upstream-bytes-unavailable'); return; }
    if (data.length>MAX_PLAYBACK_BYTES) { error(502,'size-limit');return; }
    const ce=header(upstream.headers??{},'content-encoding')?.trim().toLowerCase();
    if (ce && ce!=='identity'&&ce!=='gzip') { error(502,'unsupported-upstream-encoding');return; }
    if (ce==='gzip'&&data[0]===31&&data[1]===139) data=await playbackDeadline(host,()=>runtime.decompress(data!,1));
    log('fetched',`status=${upstream.statusCode} requestBytes=${body.length} responseBytes=${data.length}`);
    const responseHeaders=echoHeaders(upstream.headers??{});
    if (ce==='gzip') removeBodyValidators(responseHeaders);
    if (upstream.statusCode!==200 || !/^application\/vnd\.yt-ump(?:;|$)/i.test(header(responseHeaders,'content-type')?.trim()??'')) {
      finish(upstream.statusCode,data,responseHeaders);return;
    }
    let failure: string|undefined, result: Record<string,unknown>|undefined;
    const snapshot={...config,[key]:pair};
    // This is an actual upstream response delivered through a typed host adapter.
    // Use the same decoder, filters, statistics, persistence and diagnostics.
    // Native globals need not be enumerable; do not spread globalThis here.
    const responseHost: ResponseHost={
      $request:req,$task:host.$task,$prefs:host.$prefs,$environment:host.$environment,$argument:host.$argument,
      console:host.console,crypto:host.crypto,CompressionStream:host.CompressionStream,DecompressionStream:host.DecompressionStream,
      setTimeout:(callback,delay)=>host.setTimeout!(callback,delay),clearTimeout:handle=>host.clearTimeout!(handle),
      $response:{statusCode:200,headers:responseHeaders,bodyBytes:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)},
      $done:value=>{result=value;},
    };
    await runResponse(responseHost,{configSnapshot:snapshot,playbackRuntime:runtime,onFailure:reason=>{failure=reason;}});
    if (failure) {
      if (failure==='authentication-failed'||failure==='key-invalid'||failure==='key-missing') {
        if(!invalidateIfCurrent(host,key,pair))log('persist','event=storage-write-failed');
        empty('response-'+failure);
      } else error(502,'filter-'+failure);
      return;
    }
    const filtered=bytes(result?.bodyBytes)??data;
    if (result?.bodyBytes!==undefined) removeBodyValidators(responseHeaders);
    finish(200,filtered,responseHeaders);
  } catch { error(502,'processing-error'); }
}
