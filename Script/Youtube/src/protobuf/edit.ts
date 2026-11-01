import {readFields} from './wire';

export function selectMessages(bytes: Uint8Array, path: readonly number[]): Uint8Array[] {
  let nodes = [bytes];
  for (const no of path) nodes = nodes.flatMap(node => readFields(node)
    .filter(f => f.no === no && f.wire === 2).map(f => f.data));
  return nodes;
}

function varint(value: number): Uint8Array {
  const out: number[] = [];
  do {
    const low = value % 128;
    value = Math.floor(value / 128);
    out.push(low | (value ? 128 : 0));
  } while (value);
  return new Uint8Array(out);
}

// Replace existing unique bytes/message fields. Unknown siblings and the
// original tag encodings remain exact. Cryptographic envelope edits must not
// silently ignore a missing field or ambiguous duplicate.
export function replaceBytesFields(bytes: Uint8Array, replacements: ReadonlyMap<number, Uint8Array>): Uint8Array {
  const seen = new Set<number>(), parts: Uint8Array[] = [];
  for (const field of readFields(bytes)) {
    const value = replacements.get(field.no);
    if (value === undefined) { parts.push(field.raw); continue; }
    if (field.wire !== 2 || seen.has(field.no)) throw Error('protobuf-ambiguous-replacement');
    seen.add(field.no);
    parts.push(field.tag, varint(value.length), value);
  }
  if (seen.size !== replacements.size) throw Error('protobuf-missing-replacement');
  const output = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let p = 0;
  for (const part of parts) { output.set(part, p); p += part.length; }
  return output;
}

// Edit only matching length-delimited messages. Keep the original tag bytes,
// all untouched fields and their ordering, including duplicates and groups.
// A failed traversal throws before the caller can publish any partial output.
export function removeMessages(bytes: Uint8Array, path: readonly number[], predicate: (value: Uint8Array) => boolean) {
  if (!path.length) throw Error('protobuf-empty-edit-path');
  let removed = 0;
  function rewrite(node: Uint8Array, level: number): Uint8Array {
    const parts: Uint8Array[] = [];
    let changed = false;
    for (const field of readFields(node)) {
      if (field.no === path[level] && field.wire === 2) {
        if (level === path.length - 1) {
          if (predicate(field.data)) { removed++; changed = true; continue; }
        } else {
          const child = rewrite(field.data, level + 1);
          if (child !== field.data) {
            parts.push(field.tag, varint(child.length), child);
            changed = true;
            continue;
          }
        }
      }
      parts.push(field.raw);
    }
    if (!changed) return node;
    const out = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
    let position = 0;
    for (const part of parts) { out.set(part, position); position += part.length; }
    return out;
  }
  const output = rewrite(bytes, 0);
  return {bytes: output, removed};
}
