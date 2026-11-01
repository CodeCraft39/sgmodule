import {OnesieError, MAX_METADATA_BYTES} from './onesie';
import type {PlaybackRuntime} from './onesie';
import {youtube_ump_encrypted_CompressionAlgorithm as Compression} from '../response/messages';

interface Subtle {
  importKey(format: string, data: Uint8Array, algorithm: object, extractable: boolean, usages: string[]): Promise<unknown>;
  verify(algorithm: string, key: unknown, signature: Uint8Array, data: Uint8Array): Promise<boolean>;
  sign(algorithm: string, key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
  decrypt(algorithm: object, key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
  encrypt(algorithm: object, key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
}
interface CodecStream {
  readable: {getReader(): {read(): Promise<{done: boolean; value?: Uint8Array}>; cancel(): Promise<void>}};
  writable: {getWriter(): {write(bytes: Uint8Array): Promise<void>; close(): Promise<void>}};
}
export interface WebPlaybackHost {
  crypto?: {subtle?: Subtle; getRandomValues?: (bytes: Uint8Array) => Uint8Array};
  CompressionStream?: new (format: string) => CodecStream;
  DecompressionStream?: new (format: string) => CodecStream;
  setTimeout?: (callback: () => void, delay: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}
function append(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length+b.length); out.set(a); out.set(b,a.length); return out;
}
async function transform(stream: CodecStream, bytes: Uint8Array): Promise<Uint8Array> {
  const reader = stream.readable.getReader(), writer = stream.writable.getWriter();
  const read = (async () => {
    const parts: Uint8Array[] = []; let total = 0;
    while (true) {
      const result = await reader.read(); if (result.done) break;
      if (!result.value) throw new OnesieError('unsupported-compression');
      total += result.value.length;
      if (total > MAX_METADATA_BYTES) { await reader.cancel(); throw new OnesieError('size-limit'); }
      parts.push(result.value);
    }
    const out = new Uint8Array(total); let p = 0;
    for (const part of parts) { out.set(part,p); p += part.length; }
    return out;
  })();
  const write = (async () => { await writer.write(bytes); await writer.close(); })();
  const [out] = await Promise.all([read,write]); return out;
}
export async function webPlaybackRuntime(host: WebPlaybackHost, key: Uint8Array): Promise<PlaybackRuntime> {
  const api = host.crypto?.subtle;
  if (key.length !== 32) throw new OnesieError('key-invalid');
  if (!api || !host.crypto?.getRandomValues || ['importKey','verify','sign','decrypt','encrypt'].some(name =>
    typeof Reflect.get(api,name) !== 'function')) throw new OnesieError('unsupported-crypto');
  const aes = await api.importKey('raw',key.subarray(0,16),{name:'AES-CTR'},false,['encrypt','decrypt']);
  const hmac = await api.importKey('raw',key.subarray(16),{name:'HMAC',hash:{name:'SHA-256'}},false,['sign','verify']);
  const codec = async (bytes: Uint8Array, algorithm: number, encode: boolean) => {
    if (bytes.length > MAX_METADATA_BYTES) throw new OnesieError('size-limit');
    if (algorithm === Compression.NONE) return bytes;
    const format = algorithm === Compression.GZIP ? 'gzip' : algorithm === Compression.BROTLI ? 'brotli' : undefined;
    const Constructor = encode ? host.CompressionStream : host.DecompressionStream;
    if (!format || !Constructor) throw new OnesieError('unsupported-compression');
    let stream: CodecStream;
    try { stream = new Constructor(format); } catch { throw new OnesieError('unsupported-compression'); }
    return transform(stream,bytes);
  };
  return {
    async decrypt(cipher,signature,iv) {
      if (!await api.verify('HMAC',hmac,signature,append(cipher,iv))) throw new OnesieError('authentication-failed');
      return new Uint8Array(await api.decrypt({name:'AES-CTR',counter:iv,length:128},aes,cipher));
    },
    async encrypt(plain) {
      const iv = host.crypto!.getRandomValues!(new Uint8Array(16));
      const cipher = new Uint8Array(await api.encrypt({name:'AES-CTR',counter:iv,length:128},aes,plain));
      const signature = new Uint8Array(await api.sign('HMAC',hmac,append(cipher,iv)));
      return {cipher,hmac:signature,iv};
    },
    decompress:(bytes,algorithm) => codec(bytes,algorithm,false),
    compress:(bytes,algorithm) => codec(bytes,algorithm,true),
  };
}
export async function playbackDeadline<T>(host: WebPlaybackHost, work: () => Promise<T>): Promise<T> {
  if (!host.setTimeout || !host.clearTimeout) throw new OnesieError('unsupported-crypto');
  let timer: unknown;
  try {
    return await Promise.race([work(),new Promise<never>((_resolve,reject) => {
      timer = host.setTimeout!(() => reject(new OnesieError('timeout')),3000);
    })]);
  } finally { if (timer !== undefined) host.clearTimeout(timer); }
}
