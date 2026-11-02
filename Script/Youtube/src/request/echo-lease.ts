import type {Host} from './types';
import type {EncryptedInnertubeRequest} from './protobuf';
export interface EchoLease {key: string; value: string}
const LEASE_MS = 20000;
function hex(bytes: Uint8Array): string { return [...bytes].map(n=>n.toString(16).padStart(2,'0')).join(''); }
export function echoLeaseKey(request: EncryptedInnertubeRequest): string {
  if (request.iv.length!==16 || !request.encryptedClientKey.length || request.encryptedClientKey.length>512)
    throw Error('unsupported-request-envelope');
  // Cipher-key identity and nonce, never the plaintext key or URL. A re-entered
  // native fetch has the same envelope. Each completed fetch removes its lease.
  return 'YouTubeEchoFlight.v1.'+hex(request.encryptedClientKey)+'.'+hex(request.iv);
}
export function acquireEchoLease(host: Host, key: string): EchoLease | 'busy' | 'storage-failed' {
  try {
    const prefs=host.$prefs;
    if (!prefs || !prefs.removeValueForKey) return 'storage-failed';
    const prior=Number(prefs.valueForKey(key));
    if (Number.isFinite(prior) && prior>Date.now()) return 'busy';
    const lease={key,value:String(Date.now()+LEASE_MS)};
    return prefs.setValueForKey(lease.value,key) ? lease : 'storage-failed';
  } catch { return 'storage-failed'; }
}
export function releaseEchoLease(host: Host, lease: EchoLease): boolean {
  try {
    const prefs=host.$prefs;
    // Do not remove a newer lease after an expired native fetch completes late.
    if (prefs?.valueForKey(lease.key)!==lease.value) return true;
    if (!prefs.removeValueForKey) return false;
    prefs.removeValueForKey(lease.key);
    return prefs.valueForKey(lease.key)!==lease.value;
  } catch { return false; }
}
