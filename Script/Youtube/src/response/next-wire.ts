// Capture-verified /next extension for Maasea's 2026-07-19 bundle.
// Only remove the observed product-ad panel when BOTH its layout identifier and
// a /pagead/ URL in its data payload match. No learned renderer/layout cache.
// Unknown fields, duplicate fields, ordering and untouched encodings stay raw.
export function qxNext2026(input: Uint8Array | ArrayBuffer, container: 'next' | 'watch' = 'next') {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const nextPath = [42, 357104971, 2, 361256913, 1, 138681066,
    3, 49399797, 1, 50195462, 1];
  // Watch.contents is repeated field 1; each Content.next is field 3. Traverse
  // raw messages rather than MessageType.create(), which drops unknown fields.
  const path = container === 'watch' ? [1, 3, ...nextPath] : nextPath;
  let removed = 0;

  function uint32(b: Uint8Array, state: {p: number}): number {
    let value = 0, factor = 1;
    for (let i = 0; i < 5; i++, factor *= 128) {
      if (state.p >= b.length) throw Error('next: truncated varint');
      const v = b[state.p++];
      if (i === 4 && v > 15) throw Error('next: uint32 overflow');
      value += (v & 127) * factor;
      if (!(v & 128)) return value;
    }
    throw Error('next: invalid uint32');
  }

  function skip(b: Uint8Array, state: {p: number}, no: number, wire: number, depth: number): void {
    if (depth > 32) throw Error('next: group nesting limit');
    if (wire === 0) {
      for (let i = 0; i < 10; i++) {
        if (state.p >= b.length) throw Error('next: truncated scalar');
        const v = b[state.p++];
        if (i === 9 && v > 1) throw Error('next: uint64 overflow');
        if (!(v & 128)) return;
      }
    } else if (wire === 1) state.p += 8;
    else if (wire === 2) {
      const length = uint32(b, state);
      state.p += length;
    } else if (wire === 3) {
      while (state.p < b.length) {
        const tag = uint32(b, state), childNo = Math.floor(tag / 8), childWire = tag % 8;
        if (!childNo) throw Error('next: invalid group tag');
        if (childWire === 4) {
          if (childNo !== no) throw Error('next: mismatched group');
          return;
        }
        skip(b, state, childNo, childWire, depth + 1);
        if (state.p > b.length) throw Error('next: truncated group');
      }
      throw Error('next: unterminated group');
    } else if (wire === 5) state.p += 4;
    else throw Error('next: invalid wire type');
  }

  function fields(b: Uint8Array) {
    const result = [], state = {p: 0};
    while (state.p < b.length) {
      const start = state.p, tag = uint32(b, state);
      const no = Math.floor(tag / 8), wire = tag % 8, tagEnd = state.p;
      if (!no) throw Error('next: invalid field number');
      let valueStart = state.p;
      if (wire === 2) {
        const length = uint32(b, state);
        valueStart = state.p;
        state.p += length;
      } else skip(b, state, no, wire, 0);
      if (state.p > b.length) throw Error('next: truncated field');
      result.push({no, wire, start, tagEnd, valueStart, end: state.p});
    }
    return result;
  }

  function values(b: Uint8Array, route: number[]): Uint8Array[] {
    let nodes = [b];
    for (const no of route) {
      nodes = nodes.flatMap(node => fields(node)
        .filter(f => f.no === no && f.wire === 2)
        .map(f => node.subarray(f.valueStart, f.end)));
    }
    return nodes;
  }

  function contains(b: Uint8Array, text: string): boolean {
    outer: for (let i = 0; i <= b.length - text.length; i++) {
      for (let j = 0; j < text.length; j++) {
        if (b[i + j] !== text.charCodeAt(j)) continue outer;
      }
      return true;
    }
    return false;
  }

  function isCapturedAd(item: Uint8Array): boolean {
    const layouts = values(item, [153515154, 172660663, 2, 183314536, 1]);
    const identifier = 'panel_product_feed_standard_layout.eml-fe';
    const hasLayout = layouts.some(b => b.length >= identifier.length &&
      identifier.split('').every((ch, i) => b[i] === ch.charCodeAt(0)) &&
      (b.length === identifier.length || b[identifier.length] === 124));
    return hasLayout && values(item, [153515154, 172660663, 1, 168777401, 5])
      .some(b => contains(b, '/pagead/'));
  }

  function varint(value: number): Uint8Array {
    const out = [];
    do {
      const low = value % 128;
      value = Math.floor(value / 128);
      out.push(low | (value ? 128 : 0));
    } while (value);
    return new Uint8Array(out);
  }

  function join(parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
    let p = 0;
    for (const part of parts) { out.set(part, p); p += part.length; }
    return out;
  }

  function rewrite(b: Uint8Array, level: number): Uint8Array {
    const parts = [];
    let changed = false;
    for (const f of fields(b)) {
      if (f.no === path[level] && f.wire === 2) {
        const child = b.subarray(f.valueStart, f.end);
        if (level === path.length - 1) {
          if (isCapturedAd(child)) { removed++; changed = true; continue; }
        } else {
          const next = rewrite(child, level + 1);
          if (next !== child) {
            parts.push(b.subarray(f.start, f.tagEnd), varint(next.length), next);
            changed = true;
            continue;
          }
        }
      }
      parts.push(b.subarray(f.start, f.end));
    }
    return changed ? join(parts) : b;
  }

  const top = (container === 'watch' ? values(bytes, [1, 3]) : [bytes]).flatMap(fields);
  const has42 = top.some(f => f.no === 42 && f.wire === 2);
  const hasLegacy = top.some(f => (f.no === 7 || f.no === 8) && f.wire === 2);
  const output = has42 ? rewrite(bytes, 0) : bytes;
  return {bytes: output, removed, has42, hasLegacy};
}
