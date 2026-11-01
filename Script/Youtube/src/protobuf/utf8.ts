// Small UTF-8 adapter for proxy engines that do not expose TextEncoder/Decoder.
// Invalid UTF-8 fails closed at the decoder; the response entrypoint passes the
// original response through on any processing error. No global is installed.
export const utf8 = {
  encode(input = ''): Uint8Array {
    const out: number[] = [];
    for (const ch of input) {
      let n = ch.codePointAt(0)!;
      if (n >= 0xd800 && n <= 0xdfff) n = 0xfffd;
      if (n < 0x80) out.push(n);
      else if (n < 0x800) out.push(0xc0 | (n >> 6), 0x80 | (n & 63));
      else if (n < 0x10000) out.push(0xe0 | (n >> 12), 0x80 | ((n >> 6) & 63), 0x80 | (n & 63));
      else out.push(0xf0 | (n >> 18), 0x80 | ((n >> 12) & 63), 0x80 | ((n >> 6) & 63), 0x80 | (n & 63));
    }
    return new Uint8Array(out);
  },
  decode(input = new Uint8Array(0)): string {
    const out: string[] = [];
    for (let p = 0; p < input.length;) {
      const first = input[p++];
      if (first < 0x80) { out.push(String.fromCharCode(first)); continue; }
      const count = first >= 0xc2 && first <= 0xdf ? 1 : first >= 0xe0 && first <= 0xef ? 2 : first >= 0xf0 && first <= 0xf4 ? 3 : -1;
      if (count < 0 || p + count > input.length) throw Error('protobuf-invalid-utf8');
      let n = first & (count === 1 ? 31 : count === 2 ? 15 : 7);
      for (let i = 0; i < count; i++) {
        const next = input[p++];
        if ((next & 0xc0) !== 0x80) throw Error('protobuf-invalid-utf8');
        n = (n << 6) | (next & 63);
      }
      if (n < (count === 1 ? 0x80 : count === 2 ? 0x800 : 0x10000) ||
          n >= 0xd800 && n <= 0xdfff || n > 0x10ffff) throw Error('protobuf-invalid-utf8');
      out.push(String.fromCodePoint(n));
    }
    // Match protobuf-ts's TextDecoder option ignoreBOM:true: an initial U+FEFF
    // belongs to the string value and must survive a decode/encode round trip.
    return out.join('');
  },
};
