// No atob/Buffer dependency: these proxy clients do not expose Node globals.
export function decodeBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const text = value.replace(/[\t\n\r ]/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw Error('invalid-base64');
  const unpadded = text.replace(/=+$/, '');
  if (unpadded.length % 4 === 1 || (text.includes('=') && text.length % 4 !== 0)) {
    throw Error('invalid-base64-length');
  }
  const out = new Uint8Array(Math.floor(unpadded.length * 6 / 8));
  let bits = 0, count = 0, index = 0;
  for (const ch of unpadded) {
    bits = (bits << 6) | alphabet.indexOf(ch);
    count += 6;
    if (count >= 8) { count -= 8; out[index++] = (bits >> count) & 255; }
  }
  return out;
}
