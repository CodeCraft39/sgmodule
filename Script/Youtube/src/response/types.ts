// Individual recovered shapes are in messages.ts. Business traversal also sees
// incomplete messages and unknown schema alternatives, so it uses this open view.
import type {YouTubeConfig} from '../request/types';
export interface Message { [key: string]: any }
export interface MessageCodec {
  typeName: string;
  create(value?: Message): Message;
  fromBinary(bytes: Uint8Array): Message;
  toBinary(value: Message): Uint8Array;
}
export interface UnknownField { no: number; wireType: number; data: Uint8Array }
export interface AdCache {
  whiteNo: number[]; blackNo: number[]; whiteEml: string[]; blackEml: string[]; dirty: boolean;
}
export interface State {
  adCache: AdCache;
  config: YouTubeConfig;
}
