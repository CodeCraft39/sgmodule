import {ctr} from '@noble/ciphers/aes.js';
import {equalBytes} from '@noble/ciphers/utils.js';
import {hmac} from '@noble/hashes/hmac.js';
import {sha256} from '@noble/hashes/sha2.js';
import {Deflate, Inflate} from 'pako';
import {MAX_METADATA_BYTES, OnesieError} from './onesie';
import {webCompressionCodec} from './web-playback';
import type {PlaybackRuntime} from './onesie';
import type {WebPlaybackHost} from './web-playback';
import {youtube_ump_encrypted_CompressionAlgorithm as Compression} from '../response/messages';

// Public streaming API: fixed output chunks bound transient inflation, and CRC /
// gzip trailer validation is handled by the maintained zlib implementation.
export function portableGzip(bytes: Uint8Array, encode: boolean): Uint8Array {
  if (bytes.length>MAX_METADATA_BYTES) throw new OnesieError('size-limit');
  const codec = encode ? new Deflate({gzip:true,level:6,memLevel:4,chunkSize:65536}) : new Inflate({windowBits:31,chunkSize:65536});
  const parts: Uint8Array[] = []; let total=0;
  codec.onData = part => {
    total+=part.length;
    if (total>MAX_METADATA_BYTES) throw new OnesieError('size-limit');
    parts.push(part);
  };
  try {
    if (!codec.push(bytes,true) || codec.err || (!encode && !(codec as Inflate).ended))
      throw new OnesieError('unsupported-compression');
  } catch (error) {
    if (error instanceof OnesieError) throw error;
    throw new OnesieError('unsupported-compression');
  }
  const result=new Uint8Array(total);let offset=0;
  for (const part of parts) { result.set(part,offset);offset+=part.length; }
  return result;
}
function append(a: Uint8Array,b: Uint8Array): Uint8Array {
  const result=new Uint8Array(a.length+b.length);result.set(a);result.set(b,a.length);return result;
}
export function portablePlaybackRuntime(host: WebPlaybackHost, inputKey: Uint8Array): PlaybackRuntime {
  if (inputKey.length!==32) throw new OnesieError('key-invalid');
  const crypto=host.crypto,random=crypto?.getRandomValues;
  if (typeof random!=='function') throw new OnesieError('unsupported-crypto');
  const key=new Uint8Array(inputKey),aesKey=key.subarray(0,16),macKey=key.subarray(16);
  const nativeCodec=webCompressionCodec(host);
  const codec=async (bytes: Uint8Array,algorithm: number,encode: boolean) => algorithm===Compression.GZIP
    ? portableGzip(bytes,encode) : nativeCodec(bytes,algorithm,encode);
  return {
    backend:'portable',
    async decrypt(cipher,signature,iv) {
      if (cipher.length>MAX_METADATA_BYTES) throw new OnesieError('size-limit');
      if (iv.length!==16) throw new OnesieError('invalid-envelope');
      if (signature.length!==32 || !equalBytes(hmac(sha256,macKey,append(cipher,iv)),signature))
        throw new OnesieError('authentication-failed');
      return ctr(aesKey,iv).decrypt(cipher);
    },
    async encrypt(plain) {
      if (plain.length>MAX_METADATA_BYTES) throw new OnesieError('size-limit');
      const iv=new Uint8Array(16);
      try { if (random.call(crypto,iv)!==iv) throw new OnesieError('unsupported-crypto'); }
      catch { throw new OnesieError('unsupported-crypto'); }
      const cipher=ctr(aesKey,iv).encrypt(plain);
      return {cipher,iv,hmac:hmac(sha256,macKey,append(cipher,iv))};
    },
    decompress:(bytes,algorithm)=>codec(bytes,algorithm,false),
    compress:(bytes,algorithm)=>codec(bytes,algorithm,true),
  };
}
