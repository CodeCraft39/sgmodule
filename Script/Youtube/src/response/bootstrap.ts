import {isQX} from '../request/platform';
import {header} from '../request/core';
import {readFields} from '../protobuf/wire';
import {readUmp} from '../protobuf/onesie';
import {onesieProtocol as P} from '../protobuf/onesie-schema';
import type {Host, Headers, PlatformKey} from '../request/types';

// Temporary opt-in experiment. A completed response is emptied once, then
// subsequent missing-key responses pass until authenticated metadata succeeds.
// This is a retry stimulus, not proof that the YouTube app actually retries.
export const BOOTSTRAP_STORE = 'YouTubeBootstrap.v1';
interface Budget {version: 1; youtube?: true; youtubeMusic?: true}
function load(host: Host): Budget | undefined {
  const raw = isQX(host) ? host.$prefs?.valueForKey(BOOTSTRAP_STORE) : host.$persistentStore?.read(BOOTSTRAP_STORE);
  if (!raw) return {version:1};
  if (raw.length > 1024) return;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const b = value as Budget;
  if (b.version === 1 && (b.youtube === undefined || b.youtube === true) &&
      (b.youtubeMusic === undefined || b.youtubeMusic === true)) return b;
}
function save(host: Host, budget: Budget): boolean {
  if (isQX(host)) return host.$prefs?.setValueForKey(JSON.stringify(budget),BOOTSTRAP_STORE) === true;
  return !!host.$persistentStore && host.$persistentStore.write(JSON.stringify(budget),BOOTSTRAP_STORE) !== false;
}
export function claimBootstrap(host: Host, key: PlatformKey,
  response: {statusCode?: number; headers?: Headers}, bytes: Uint8Array): 'claimed' | 'ineligible' | 'used' | 'storage-failed' {
  if (response.statusCode !== 200 ||
      !/^application\/vnd\.yt-ump(?:;|$)/i.test(header(response.headers??{},'content-type')?.trim()??'')) return 'ineligible';
  try {
    const parts = readUmp(bytes);
    const supported = parts.some((part,i) => {
      if (part.type !== P.parts.data || !i || parts[i-1].type !== P.parts.header) return false;
      const type = readFields(parts[i-1].data).filter(f=>f.no===P.headerFields.type);
      if (!(type.length===1 && type[0].wire===0 && type[0].data.length===1 &&
        type[0].data[0]===P.headerTypes.encryptedResponsePart)) return false;
      const envelope = readFields(part.data), F=P.encryptedFields;
      for (const [no,length] of [[F.encryptedContent,undefined],[F.hmac,32],[F.iv,16]]) {
        const f=envelope.filter(f=>f.no===no);
        if (f.length!==1 || f[0].wire!==2 || !f[0].data.length ||
            length!==undefined && f[0].data.length!==length) return false;
      }
      const compression=envelope.filter(f=>f.no===F.compressionAlgorithm);
      return !compression.length || compression.length===1 && compression[0].wire===0 &&
        compression[0].data.length===1 && compression[0].data[0]<=2;
    });
    if (!supported) return 'ineligible';
  } catch { return 'ineligible'; }
  try {
    const budget = load(host);
    if (!budget) return 'storage-failed';
    if (budget[key]) return 'used';
    return save(host,{...budget,[key]:true}) ? 'claimed' : 'storage-failed';
  } catch { return 'storage-failed'; }
}
export function releaseBootstrap(host: Host, key: PlatformKey): 'clear' | 'released' | 'storage-failed' {
  try {
    const budget = load(host);
    if (!budget) return 'storage-failed';
    if (!budget[key]) return 'clear';
    delete budget[key];
    return save(host,budget) ? 'released' : 'storage-failed';
  } catch { return 'storage-failed'; }
}
