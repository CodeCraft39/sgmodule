// Bounded wire reader shared by request decoding and lossless response edits.
export interface WireField {
  no: number;
  wire: number;
  tag: Uint8Array;
  raw: Uint8Array;
  data: Uint8Array;
}
export function readFields(bytes: Uint8Array): WireField[] {
  let p = 0;
  function uint32(): number {
    let value = 0, factor = 1;
    for (let i = 0; i < 5; i++, factor *= 128) {
      if (p >= bytes.length) throw Error('protobuf-truncated-varint');
      const b = bytes[p++];
      if (i === 4 && b > 15) throw Error('protobuf-uint32-overflow');
      value += (b & 127) * factor;
      if (!(b & 128)) return value;
    }
    throw Error('protobuf-invalid-varint');
  }
  function field(depth = 0): WireField {
    if (depth > 32) throw Error('protobuf-group-depth');
    const start = p, tag = uint32(), no = Math.floor(tag / 8), wire = tag % 8, tagEnd = p;
    if (!no) throw Error('protobuf-invalid-tag');
    let dataStart = p;
    if (wire === 0) {
      let ended = false;
      for (let i = 0; i < 10; i++) {
        if (p >= bytes.length) throw Error('protobuf-truncated-scalar');
        const b = bytes[p++];
        if (i === 9 && b > 1) throw Error('protobuf-uint64-overflow');
        if (!(b & 128)) { ended = true; break; }
      }
      if (!ended) throw Error('protobuf-invalid-scalar');
    } else if (wire === 1) p += 8;
    else if (wire === 2) {
      const length = uint32(); dataStart = p; p += length;
    } else if (wire === 3) {
      let ended = false;
      while (p < bytes.length) {
        const child = field(depth + 1);
        if (child.wire === 4) {
          if (child.no !== no) throw Error('protobuf-mismatched-group');
          ended = true; break;
        }
      }
      if (!ended) throw Error('protobuf-unclosed-group');
    } else if (wire === 5) p += 4;
    else if (wire !== 4) throw Error('protobuf-invalid-wire');
    if (p > bytes.length) throw Error('protobuf-truncated-field');
    return {no, wire, tag: bytes.subarray(start, tagEnd), raw: bytes.subarray(start, p), data: bytes.subarray(dataStart, p)};
  }
  const result: WireField[] = [];
  while (p < bytes.length) {
    const next = field();
    if (next.wire === 4) throw Error('protobuf-unexpected-end-group');
    result.push(next);
  }
  return result;
}
