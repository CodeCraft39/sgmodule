import {webPlaybackRuntime} from './web-playback';
import {portablePlaybackRuntime} from './portable-playback';
import {OnesieError} from './onesie';
import type {PlaybackRuntime} from './onesie';
import type {WebPlaybackHost} from './web-playback';

export async function createPlaybackRuntime(host: WebPlaybackHost,key: Uint8Array): Promise<PlaybackRuntime> {
  if (key.length!==32) throw new OnesieError('key-invalid');
  const api=host.crypto?.subtle;
  const complete=api && typeof host.crypto?.getRandomValues==='function' &&
    (['importKey','verify','sign','decrypt','encrypt'] as const).every(name=>typeof api[name]==='function');
  // Keep the validated native path when it is available. An incomplete native
  // API can use maintained portable primitives, but still requires native CSPRNG.
  return complete ? webPlaybackRuntime(host,key) : portablePlaybackRuntime(host,key);
}
