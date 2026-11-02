import {readFields} from './wire';
import {replaceBytesFields} from './edit';
import {onesieProtocol as P} from './onesie-schema';

export const MAX_PLAYBACK_BYTES = 8 * 1024 * 1024;
export const MAX_METADATA_BYTES = 8 * 1024 * 1024;
export class OnesieError extends Error {
  constructor(public readonly code: 'key-missing' | 'key-invalid' | 'unsupported-crypto' | 'unsupported-compression' |
    'authentication-failed' | 'invalid-envelope' | 'invalid-ump' | 'size-limit' | 'timeout') { super(code); }
}
export interface PlaybackRuntime {
  readonly backend?: 'webcrypto' | 'portable';
  decrypt(cipher: Uint8Array, hmac: Uint8Array, iv: Uint8Array): Promise<Uint8Array>;
  encrypt(plain: Uint8Array): Promise<{cipher: Uint8Array; hmac: Uint8Array; iv: Uint8Array}>;
  decompress(bytes: Uint8Array, algorithm: number): Promise<Uint8Array>;
  compress(bytes: Uint8Array, algorithm: number): Promise<Uint8Array>;
}
export interface UmpPart {type: number; raw: Uint8Array; typeTag: Uint8Array; data: Uint8Array}

// UMP uses its own prefix-length integer format, not Protobuf varints.
export function encodeUmpInteger(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new OnesieError('invalid-ump');
  const size = value < 128 ? 1 : value < 16384 ? 2 : value < 2097152 ? 3 : value < 268435456 ? 4 : 5;
  const output = new Uint8Array(size);
  const bits = size === 5 ? 0 : 8 - size;
  output[0] = size === 5 ? 240 : ([0,0,128,192,224][size] | (value % (2 ** bits)));
  for (let i = 1; i < size; i++) output[i] = Math.floor(value / 2 ** (bits + 8 * (i - 1))) % 256;
  return output;
}
export function readUmp(bytes: Uint8Array): UmpPart[] {
  if (bytes.length > MAX_PLAYBACK_BYTES) throw new OnesieError('size-limit');
  let p = 0;
  const integer = () => {
    if (p >= bytes.length) throw new OnesieError('invalid-ump');
    const first = bytes[p++]; let size = 1;
    for (let bit = 128; size < 5 && (first & bit); bit >>= 1) size++;
    const bits = size === 5 ? 0 : 8 - size;
    let value = size === 5 ? 0 : first & ((1 << bits) - 1);
    for (let i = 1; i < size; i++) {
      if (p >= bytes.length) throw new OnesieError('invalid-ump');
      value += bytes[p++] * 2 ** (bits + 8 * (i - 1));
    }
    return value;
  };
  const parts: UmpPart[] = [];
  while (p < bytes.length) {
    if (parts.length >= 100000) throw new OnesieError('size-limit');
    const start = p, type = integer(), typeEnd = p, length = integer(), begin = p;
    p += length;
    if (p > bytes.length) throw new OnesieError('invalid-ump');
    parts.push({type, raw:bytes.subarray(start,p), typeTag:bytes.subarray(start,typeEnd), data:bytes.subarray(begin,p)});
  }
  return parts;
}
function scalar(bytes: Uint8Array, no: number, fallback?: number): number {
  const fields = readFields(bytes).filter(f => f.no === no);
  if (!fields.length && fallback !== undefined) return fallback;
  if (fields.length !== 1 || fields[0].wire !== 0) throw new OnesieError('invalid-envelope');
  let value = 0, factor = 1;
  for (const byte of fields[0].data) {
    value += (byte & 127) * factor; factor *= 128;
    if (value > 0xffffffff) throw new OnesieError('invalid-envelope');
  }
  return value;
}
function equal(a: Uint8Array, b: Uint8Array): boolean { return a.length === b.length && a.every((n,i) => n === b[i]); }
export async function rewriteOnesie(bytes: Uint8Array, runtime: PlaybackRuntime,
  filter: (plain: Uint8Array) => Uint8Array | undefined) {
  const parts = readUmp(bytes), output: Uint8Array[] = [];
  let verified = 0, changed = 0, expanded = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.type !== P.parts.data || i === 0 || parts[i-1].type !== P.parts.header ||
        scalar(parts[i-1].data, P.headerFields.type, 0) !== P.headerTypes.encryptedResponsePart) {
      output.push(part.raw); continue;
    }
    const fields = readFields(part.data);
    const field = (no: number, length?: number) => {
      const matches = fields.filter(f => f.no === no);
      if (matches.length !== 1 || matches[0].wire !== 2 || length !== undefined && matches[0].data.length !== length)
        throw new OnesieError('invalid-envelope');
      return matches[0].data;
    };
    const F = P.encryptedFields;
    const cipher = field(F.encryptedContent), hmac = field(F.hmac,32), iv = field(F.iv,16);
    const algorithm = scalar(part.data,F.compressionAlgorithm,0);
    const decrypted = await runtime.decrypt(cipher,hmac,iv);
    verified++;
    const plain = await runtime.decompress(decrypted,algorithm);
    expanded += plain.length;
    if (plain.length > MAX_METADATA_BYTES || expanded > 2 * MAX_METADATA_BYTES) throw new OnesieError('size-limit');
    // Do not reinterpret a protocol/HTTP error response as successful content.
    if (scalar(plain,P.statusFields.proxyStatus) !== P.okProxyStatus || scalar(plain,P.statusFields.httpStatus) !== P.okHttpStatus) {
      output.push(part.raw); continue;
    }
    const filtered = filter(plain);
    if (!filtered || equal(filtered,plain)) { output.push(part.raw); continue; }
    if (filtered.length > MAX_METADATA_BYTES) throw new OnesieError('size-limit');
    const encoded = await runtime.encrypt(await runtime.compress(filtered,algorithm));
    const data = replaceBytesFields(part.data,new Map([
      [F.encryptedContent,encoded.cipher], [F.hmac,encoded.hmac], [F.iv,encoded.iv],
    ]));
    output.push(part.typeTag,encodeUmpInteger(data.length),data); changed++;
  }
  if (!changed) return {output:undefined, verified, changed, parts:parts.length};
  const total = output.reduce((n,chunk) => n + chunk.length,0);
  if (total > MAX_PLAYBACK_BYTES) throw new OnesieError('size-limit');
  const result = new Uint8Array(total); let p = 0;
  for (const chunk of output) { result.set(chunk,p); p += chunk.length; }
  return {output:result, verified, changed, parts:parts.length};
}
