import type {MessageCodec, Message, UnknownField} from '../types';
export class MessageType implements MessageCodec {
  constructor(name: string, fields: unknown[]);
  typeName: string;
  create(value?: Message): Message;
  fromBinary(bytes: Uint8Array): Message;
  toBinary(value: Message): Uint8Array;
}
export const UnknownFields: {list(value: Message): UnknownField[]};
export function encodeBase64(bytes: Uint8Array): string;
