import type {IMessageType, FieldInfo} from '@protobuf-ts/runtime';
import {readFields} from './wire';

const fieldsByType = new WeakMap<IMessageType<object>, Map<number, FieldInfo>>();
function scalarWire(type: number): number {
  if (type === 1 || type === 6 || type === 16) return 1;
  if (type === 2 || type === 7 || type === 15) return 5;
  if (type === 9 || type === 12) return 2;
  return 0;
}
function validatePacked(bytes: Uint8Array, wire: number): void {
  if (wire === 1 || wire === 5) {
    if (bytes.length % (wire === 1 ? 8 : 4)) throw Error('protobuf-truncated-packed-field');
    return;
  }
  let p = 0;
  while (p < bytes.length) {
    for (let i = 0; ; i++) {
      if (p >= bytes.length) throw Error('protobuf-truncated-packed-varint');
      const byte = bytes[p++];
      if (i > 9 || i === 9 && byte > 1) throw Error('protobuf-packed-varint-overflow');
      if (!(byte & 128)) break;
    }
  }
}

// Schema validation precedes the upstream reflection decoder. In particular,
// known message lengths cannot consume neighboring fields, and a known field
// with a different wire type cannot silently be decoded using its old type.
// Unknown length-delimited payloads remain opaque; they need not be messages.
export function validateMessage(bytes: Uint8Array, codec: IMessageType<object>, depth = 0): void {
  if (depth > 64) throw Error('protobuf-message-depth');
  let definitions = fieldsByType.get(codec);
  if (!definitions) {
    definitions = new Map(codec.fields.map(field => [field.no, field]));
    fieldsByType.set(codec, definitions);
  }
  for (const field of readFields(bytes)) {
    const definition = definitions.get(field.no);
    if (!definition) continue;
    if (definition.kind === 'message') {
      if (field.wire !== 2) throw Error('protobuf-wrong-message-wire');
      validateMessage(field.data, definition.T(), depth + 1);
    } else if (definition.kind === 'scalar' || definition.kind === 'enum') {
      const expected = definition.kind === 'enum' ? 0 : scalarWire(definition.T);
      if (definition.repeat && field.wire === 2 && expected !== 2) validatePacked(field.data, expected);
      else if (field.wire !== expected) throw Error('protobuf-wrong-scalar-wire');
    } else throw Error('protobuf-unsupported-schema-kind');
  }
}
