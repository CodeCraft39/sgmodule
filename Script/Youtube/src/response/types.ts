import type {YouTubeConfig} from '../request/types';
import type {UnknownFieldHandler} from '@protobuf-ts/runtime';
export type UnknownField = ReturnType<typeof UnknownFieldHandler.list>[number];
export interface AdCache {
  whiteNo: number[]; blackNo: number[]; whiteEml: string[]; blackEml: string[]; dirty: boolean;
}
export interface State {
  adCache: AdCache;
  config: YouTubeConfig;
}
