// Temporary device-only capture helper. It never fetches, redirects, changes
// playback bytes/headers, or updates YouTubeConfig. Export/reset are explicit
// synthetic requests on the exact diagnostic URL documented in README.md.
import {isQX} from '../../Script/Youtube/src/request/platform';
import {sessionSuffix} from '../../Script/Youtube/src/request/diagnostics';
import type {Host, Headers} from '../../Script/Youtube/src/request/types';
import {BOOTSTRAP_STORE} from '../../Script/Youtube/src/response/bootstrap';

export const BUILD = 'capture-20261101.2';
export const STORE = 'YTLocalCapture.v1';
const LIMIT = 32;
type Status = 'pass' | 'failed' | 'unsupported' | 'unavailable' | 'timeout' | 'not-run';
interface CryptoApi {
  importKey(format: string, data: Uint8Array, algorithm: object, extractable: boolean, usages: string[]): Promise<unknown>;
  encrypt(algorithm: object, key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
  decrypt(algorithm: object, key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
  sign(algorithm: string, key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
  verify(algorithm: string, key: unknown, signature: Uint8Array, data: Uint8Array): Promise<boolean>;
}
interface Stream {
  readable: {getReader(): {read(): Promise<{done: boolean; value?: Uint8Array}>; cancel(): Promise<void>}};
  writable: {getWriter(): {write(value: Uint8Array): Promise<void>; close(): Promise<void>}};
}
type StreamConstructor = new (format: string) => Stream;
interface ProbeHost extends Host {
  $response?: {body?: unknown; bodyBytes?: unknown; headers?: Headers; statusCode?: number};
  crypto?: {subtle?: unknown; getRandomValues?: unknown};
  TextEncoder?: unknown;
  TextDecoder?: unknown;
  WebAssembly?: {Module: new (bytes: Uint8Array) => unknown; Instance: new (module: unknown) => unknown};
  CompressionStream?: StreamConstructor;
  DecompressionStream?: StreamConstructor;
  setTimeout?: (callback: () => void, delay: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}
interface Capabilities {
  aesCtr: Status; hmacSha256: Status; gzip: Status; brotli: Status; br: Status;
  subtlePresent: boolean; randomValuesPresent: boolean; randomValues: Status; wasm: Status;
  textEncoderPresent: boolean; textDecoderPresent: boolean; elapsedMs: number;
}
type PrivateKeys = Partial<Record<'youtube' | 'youtubeMusic', {clientKey?: string; encryptKey?: string}>>;
interface Observation {
  timestamp: string; client: string; phase: 'direct-google'; role: 'request' | 'response'; session: string;
  method: string; body: {kind: string; bytes?: number; characters?: number};
  headers: Partial<Record<'contentType' | 'contentEncoding' | 'contentLength', string>>;
  statusCode?: number; keys: PrivateKeys; keyStatus: string; capabilities: Capabilities;
}
interface Report {format: 1; build: string; observations: Observation[]}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function read(host: ProbeHost, key: string): string | null | undefined {
  return isQX(host) ? host.$prefs?.valueForKey(key) : host.$persistentStore?.read(key);
}
function write(host: ProbeHost, value: string): boolean {
  if (isQX(host)) return host.$prefs?.setValueForKey(value, STORE) === true;
  if (!host.$persistentStore) return false;
  return host.$persistentStore.write(value, STORE) !== false;
}
function keys(host: ProbeHost): {keys: PrivateKeys; status: string} {
  try {
    const raw = read(host, 'YouTubeConfig');
    if (!raw) return {keys:{}, status:'missing'};
    const root = record(JSON.parse(raw)), result: PrivateKeys = {};
    for (const name of ['youtube', 'youtubeMusic'] as const) {
      const entry = record(root[name]);
      const clientKey = typeof entry.clientKey === 'string' && entry.clientKey.length <= 4096 ? entry.clientKey : undefined;
      const encryptKey = typeof entry.encryptKey === 'string' && entry.encryptKey.length <= 4096 ? entry.encryptKey : undefined;
      if (clientKey || encryptKey) result[name] = {clientKey, encryptKey};
    }
    return {keys:result, status:Object.keys(result).length ? 'present' : 'missing-or-invalid'};
  } catch { return {keys:{}, status:'read-failed-or-invalid'}; }
}
function report(host: ProbeHost): Report {
  try {
    const raw = read(host, STORE);
    if (raw && raw.length < 262144) {
      const parsed = record(JSON.parse(raw));
      if (parsed.format === 1 && parsed.build === BUILD && Array.isArray(parsed.observations))
        return {format:1, build:BUILD, observations:parsed.observations.slice(-LIMIT) as Observation[]};
    }
  } catch { /* A broken diagnostic cache must not affect playback. */ }
  return {format:1, build:BUILD, observations:[]};
}
function bodySummary(value: unknown): Observation['body'] {
  if (value instanceof ArrayBuffer) return {kind:'ArrayBuffer', bytes:value.byteLength};
  if (value instanceof Uint8Array) return {kind:'Uint8Array', bytes:value.byteLength};
  if (ArrayBuffer.isView(value)) return {kind:'ArrayBufferView', bytes:value.byteLength};
  if (typeof value === 'string') return {kind:'string', characters:value.length};
  return {kind:'unavailable'};
}
function hex(value: string): Uint8Array {
  return new Uint8Array(value.match(/../g)!.map(byte => parseInt(byte, 16)));
}
function equal(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}
async function check(work: () => Promise<boolean>): Promise<Status> {
  try { return await work() ? 'pass' : 'failed'; } catch { return 'failed'; }
}
async function transform(stream: Stream, bytes: Uint8Array): Promise<Uint8Array> {
  const writer = stream.writable.getWriter(), reader = stream.readable.getReader();
  const drain = (async () => {
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) {
      const value = await reader.read();
      if (value.done) break;
      if (!value.value) throw Error('missing-stream-value');
      total += value.value.length;
      if (total > 65536) { await reader.cancel(); throw Error('probe-output-limit'); }
      chunks.push(value.value);
    }
    const output = new Uint8Array(total); let p = 0;
    for (const chunk of chunks) { output.set(chunk, p); p += chunk.length; }
    return output;
  })();
  // Observe rejection immediately; a rejected write must not leave the reader's
  // promise unhandled while the script returns control to the proxy client.
  const written = (async () => { await writer.write(bytes); await writer.close(); })();
  const [output] = await Promise.all([drain, written]);
  return output;
}
export async function capabilities(host: ProbeHost): Promise<Capabilities> {
  const result: Capabilities = {aesCtr:'unavailable', hmacSha256:'unavailable', gzip:'unavailable', brotli:'unavailable', br:'unavailable',
    subtlePresent:!!host.crypto?.subtle, randomValuesPresent:typeof host.crypto?.getRandomValues === 'function',
    randomValues:'unavailable', wasm:'unavailable', textEncoderPresent:typeof host.TextEncoder === 'function',
    textDecoderPresent:typeof host.TextDecoder === 'function', elapsedMs:0};
  if (result.randomValuesPresent) {
    try {
      const input = new Uint8Array(16);
      const value = (host.crypto!.getRandomValues as (bytes: Uint8Array) => Uint8Array).call(host.crypto, input);
      result.randomValues = value === input ? 'pass' : 'failed';
    } catch { result.randomValues = 'failed'; }
  }
  if (host.WebAssembly && typeof host.WebAssembly.Module === 'function' && typeof host.WebAssembly.Instance === 'function') {
    try {
      // Empty valid WASM module: no imported code, memory, or stress workload.
      new host.WebAssembly.Instance(new host.WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0])));
      result.wasm = 'pass';
    } catch { result.wasm = 'failed'; }
  }
  if (!host.setTimeout || !host.clearTimeout) {
    if (result.subtlePresent) result.aesCtr = result.hmacSha256 = 'not-run';
    if (host.CompressionStream && host.DecompressionStream) result.gzip = result.brotli = result.br = 'not-run';
    return result;
  }
  const started = Date.now();
  const pending: Array<keyof Pick<Capabilities, 'aesCtr' | 'hmacSha256' | 'gzip' | 'brotli' | 'br'>> = [];
  const tasks: Promise<void>[] = [];
  const subtle = record(host.crypto?.subtle);
  const api = host.crypto?.subtle as CryptoApi;
  const schedule = (name: typeof pending[number], run: () => Promise<boolean>) => {
    result[name] = 'not-run'; pending.push(name);
    tasks.push(check(run).then(status => { result[name] = status; }));
  };
  // NIST SP 800-38A F.5.1: public AES-128-CTR test vector.
  if (['importKey', 'encrypt', 'decrypt'].every(name => typeof subtle[name] === 'function')) schedule('aesCtr', async () => {
    const key = await api.importKey('raw', hex('2b7e151628aed2a6abf7158809cf4f3c'), {name:'AES-CTR'}, false, ['encrypt','decrypt']);
    const algorithm = {name:'AES-CTR', counter:hex('f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff'), length:128};
    const plain = hex('6bc1bee22e409f96e93d7e117393172a');
    const encrypted = new Uint8Array(await api.encrypt(algorithm, key, plain));
    return equal(encrypted, hex('874d6191b620e3261bef6864990db6ce')) && equal(new Uint8Array(await api.decrypt(algorithm, key, encrypted)), plain);
  });
  // RFC 4231 test case 1: public HMAC-SHA256 vector, never a session key.
  if (['importKey','sign','verify'].every(name => typeof subtle[name] === 'function')) schedule('hmacSha256', async () => {
    const key = await api.importKey('raw', new Uint8Array(20).fill(11), {name:'HMAC', hash:{name:'SHA-256'}}, false, ['sign','verify']);
    const data = new Uint8Array([72,105,32,84,104,101,114,101]);
    const signature = new Uint8Array(await api.sign('HMAC', key, data));
    return equal(signature, hex('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7')) && await api.verify('HMAC', key, signature, data);
  });
  if (host.CompressionStream && host.DecompressionStream) for (const format of ['gzip','brotli','br'] as const) {
    let encoder: Stream, decoder: Stream;
    try { encoder = new host.CompressionStream(format); decoder = new host.DecompressionStream(format); }
    catch { result[format] = 'unsupported'; continue; }
    schedule(format, async () => {
      const input = new Uint8Array([89,84,45,108,111,99,97,108,45,112,114,111,98,101]);
      const compressed = await transform(encoder, input);
      const output = await transform(decoder, compressed);
      return equal(input, output);
    });
  }
  let timer: unknown;
  try {
    await Promise.race([Promise.all(tasks), new Promise<void>(resolve => { timer = host.setTimeout!(resolve, 1200); })]);
  } finally { if (timer !== undefined) host.clearTimeout(timer); }
  const snapshot = {...result, elapsedMs:Date.now()-started};
  for (const name of pending) if (snapshot[name] === 'not-run') snapshot[name] = 'timeout';
  return snapshot;
}
function jsonResponse(host: ProbeHost, value: unknown, download = true): Record<string, unknown> {
  const headers: Record<string, string> = {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'};
  if (download) headers['Content-Disposition'] = 'attachment; filename="yt-local-capture.json"';
  const body = JSON.stringify(value, null, 2);
  return isQX(host) ? {status:'HTTP/1.1 200 OK', headers, body} : {response:{status:200, headers, body}};
}
export async function runCapture(host: ProbeHost): Promise<void> {
  let completed = false;
  const done = (value: Record<string, unknown>) => { if (!completed) { completed = true; host.$done(value); } };
  const log = (value: string) => host.console.log(`[YT-CAPTURE ${BUILD}] ${value}`);
  try {
    const url = host.$request?.url ?? '';
    const action = url.match(/^https:\/\/example\.com\/yt-local-capture\/(export|reset|prepare-bootstrap)(?:[?#]|$)/)?.[1];
    if (action) {
      if (host.$response || (host.$request?.method ?? 'GET').toUpperCase() !== 'GET') { done({}); return; }
      if (action === 'prepare-bootstrap') {
        // Explicit device-test action. Preserve Music and all unrelated data.
        // No snapshot reset and no key values are returned in this response.
        let configCleared=false, budgetCleared=false;
        try {
          const config=record(JSON.parse(read(host,'YouTubeConfig')??'{}'));
          delete config.youtube;
          const budget=record(JSON.parse(read(host,BOOTSTRAP_STORE)??'{"version":1}'));
          if (budget.version!==1) throw Error('unsupported-budget');
          delete budget.youtube;
          if (isQX(host)) {
            configCleared=host.$prefs?.setValueForKey(JSON.stringify(config),'YouTubeConfig')===true;
            budgetCleared=host.$prefs?.setValueForKey(JSON.stringify(budget),BOOTSTRAP_STORE)===true;
          }
        } catch { /* Report preparation failure; never expose private data. */ }
        done(jsonResponse(host,{build:BUILD,prepared:configCleared&&budgetCleared,youtubeConfigCleared:configCleared,bootstrapBudgetCleared:budgetCleared},false));
      } else if (action === 'reset') {
        let ok = false;
        try { ok = write(host, JSON.stringify({format:1, build:BUILD, observations:[]})); } catch { /* Export reset failure safely. */ }
        done(jsonResponse(host, {build:BUILD, reset:ok, scope:STORE}, false));
      } else done(jsonResponse(host, {...report(host), exportedAt:new Date().toISOString(), currentConfiguration:keys(host)}));
      return;
    }
    if (!/^https?:\/\/[\w-]+\.googlevideo\.com\/initplayback(?:[?#]|$)/.test(url)) { done({}); return; }
    const phase = 'direct-google';
    const role = host.$response ? 'response' : 'request';
    const timestamp = new Date().toISOString();
    const privateConfig = keys(host); // Snapshot before awaiting any capability tests.
    const saved = report(host), client = isQX(host) ? 'QX' : host.$rocket ? 'Shadowrocket' : 'Surge-compatible';
    const previous = [...saved.observations].reverse().find(o => o.client === client && o.role === role && o.phase === phase &&
      Date.now()-Date.parse(o.timestamp) >= 0 && Date.now()-Date.parse(o.timestamp) < 600000);
    const caps = previous?.capabilities ?? await capabilities(host);
    const input = host.$response ?? host.$request;
    const headers = record(input?.headers);
    const header = (name: string) => {
      const key = Object.keys(headers).find(k => k.toLowerCase() === name);
      return key && typeof headers[key] === 'string' ? (headers[key] as string).slice(0,256) : undefined;
    };
    const body = bodySummary(isQX(host) ? input?.bodyBytes ?? input?.body : input?.body ?? input?.bodyBytes);
    const observation: Observation = {timestamp, client, phase, role,
      session:sessionSuffix(host.$request).trim(), method:host.$request?.method ?? 'unknown', body,
      headers:{contentType:header('content-type'), contentEncoding:header('content-encoding'), contentLength:header('content-length')},
      statusCode:host.$response?.statusCode, keys:privateConfig.keys, keyStatus:privateConfig.status, capabilities:caps};
    // Refresh after asynchronous work to retain observations recorded meanwhile.
    const latest = report(host);
    latest.observations.push(observation); latest.observations = latest.observations.slice(-LIMIT);
    let stored = false;
    try { stored = write(host, JSON.stringify(latest)); } catch { /* Safe diagnostic below. */ }
    log(`client=${client} phase=${phase} role=${role} ${observation.session} body=${body.kind} bytes=${body.bytes ?? 'unavailable'} keys=${privateConfig.status} aes=${caps.aesCtr} hmac=${caps.hmacSha256} gzip=${caps.gzip} brotli=${caps.brotli}/${caps.br} wasm=${caps.wasm} random=${caps.randomValues} stored=${stored}`);
    done({});
  } catch { log('event=probe-failed traffic=unchanged'); done({}); }
}
