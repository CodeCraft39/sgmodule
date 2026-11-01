// Public protobuf-ts extension points only. The dependency is pinned in
// tools/youtube-response/dependencies.json and bundled during the build.
import {MessageType, BinaryReader, BinaryWriter} from '@protobuf-ts/runtime';
import type {BinaryReadOptions, BinaryWriteOptions} from '@protobuf-ts/runtime';
import {utf8} from './utf8';
import {validateMessage} from './validate';
export {UnknownFieldHandler as UnknownFields, base64encode as encodeBase64} from '@protobuf-ts/runtime';

export class ProxyMessageType<T extends object> extends MessageType<T> {
  override fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): T {
    validateMessage(bytes, this);
    return super.fromBinary(bytes, {readerFactory: value => new BinaryReader(value, utf8), ...options});
  }
  override toBinary(message: T, options?: Partial<BinaryWriteOptions>): Uint8Array {
    return super.toBinary(message, {writerFactory: () => new BinaryWriter(utf8), ...options});
  }
}
