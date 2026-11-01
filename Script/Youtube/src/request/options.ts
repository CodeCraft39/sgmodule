import type {Host, Options} from './types';

function bool(value: unknown, fallback: boolean): boolean {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function options(host: Host): Options {
  let values: Record<string, unknown> = {};
  const arg = host.$argument;
  if (typeof arg === 'string' && !arg.includes('{{{')) values = record(JSON.parse(arg));
  else values = record(arg);
  // QX does not use Surge's argument syntax. Support its documented script-URL
  // fragment and the parsed variables available on recent QX versions.
  const sourcePath = host.$environment?.sourcePath;
  if (sourcePath?.includes('#')) {
    const fragment = sourcePath.slice(sourcePath.indexOf('#') + 1);
    for (const pair of fragment.split('&')) {
      const split = pair.indexOf('=');
      if (split > 0) values[decodeURIComponent(pair.slice(0, split))] = decodeURIComponent(pair.slice(split + 1));
    }
  }
  values = {...values, ...record(host.$environment?.variables)};
  return {
    worker: {
      captionLang: typeof values.captionLang === 'string' ? values.captionLang : 'off',
      blockUpload: bool(values.blockUpload, true),
      blockImmersive: bool(values.blockImmersive, true),
      blockShorts: bool(values.blockShorts, false),
    },
    debug: bool(values.debug, false),
    localPlayback: bool(values.localPlayback, false),
    bootstrapRetry: bool(values.bootstrapRetry, false),
  };
}
