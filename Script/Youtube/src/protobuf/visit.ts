import type {IMessageType} from '@protobuf-ts/runtime';

// Traverse declared message fields only. Reflection is confined to this boundary;
// endpoint callbacks receive their generated concrete message interfaces.
export function visitType<T extends object>(root: object, codec: IMessageType<object>, target: IMessageType<T>, callback: (value: T) => boolean | void): void {
  const stack: Array<{value: object; codec: IMessageType<object>}> = [{value: root, codec}];
  while (stack.length) {
    const current = stack.pop()!;
    if (current.codec.typeName === target.typeName && callback(current.value as T)) return;
    for (const field of current.codec.fields) {
      if (field.kind !== 'message') continue;
      const child: unknown = Reflect.get(current.value, field.localName);
      const values: unknown[] = field.repeat && Array.isArray(child) ? child : [child];
      for (const value of values) if (value !== null && typeof value === 'object') {
        stack.push({value, codec: field.T()});
      }
    }
  }
}
