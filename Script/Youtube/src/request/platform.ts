import type {Decision, Host} from './types';

export function isQX(host: Host): boolean { return host.$task !== undefined; }
export function bytes(value: unknown): Uint8Array | undefined {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  // Never UTF-8 encode a string that may already be a lossy binary conversion.
  throw Error('request-body-is-not-binary');
}
export function completion(decision: Decision, qx: boolean): Record<string, unknown> {
  if (decision.action === 'redirect') {
    if (!qx) return {url: decision.redirectUrl};
    // QX's official echo API uses a flat HTTP response. 307 asks the client to
    // repeat the original method/body at the Worker, unlike a 302 redirect.
    return {status: 'HTTP/1.1 307 Temporary Redirect', headers: {
      Location: decision.redirectUrl!, 'Cache-Control': 'no-store',
    }, body: ''};
  }
  if (decision.action === 'empty') {
    return qx
      ? {status: 'HTTP/1.1 200 OK', headers: {'Content-Type': 'text/plain'}, body: ''}
      : {response: {status: 200, headers: {'Content-Type': 'text/plain'}, body: new Uint8Array(0)}};
  }
  if (decision.action === 'headers') return {headers: decision.headers};
  return {};
}
