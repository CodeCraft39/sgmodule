import type {IMessageType} from '@protobuf-ts/runtime';
import {messages} from './schema';
import {endpointMessages} from './wire-schema';
import {filterImmersivePanels} from './filters/immersive';
import {filterRichItems, processPlayer, processShorts, processGuide, processSettings, processWatch, processConfig} from './handlers';
import type {State} from './types';
import type {PlatformKey, WorkerParams} from '../request/types';

type Route = keyof typeof endpointMessages;
interface Result { output?: Uint8Array; removed?: number }
interface Endpoint { process(body: Uint8Array, params: WorkerParams, state: State, key: PlatformKey): Result }
type Handler<T> = (message: T, params: WorkerParams, state: State, key: PlatformKey) => boolean;
function bind<T extends object>(codec: IMessageType<T>, handler: Handler<T>, container?: 'next' | 'watch' | 'onesie'): Endpoint {
  return {process(body, params, state, key) {
    const wire = container ? filterImmersivePanels(body, container) : undefined;
    // The immersive schema is a lossless wire view of modern Next. Decode the
    // bundled legacy view only when it has relevant fields (or Watch players).
    if (container === 'next' && wire?.hasImmersive && !wire.hasLegacy)
      return {output:wire.removed ? wire.bytes : undefined, removed:wire.removed};
    const decoded = codec.fromBinary(wire?.bytes ?? body);
    const changed = handler(decoded, params, state, key);
    return {output:changed ? codec.toBinary(decoded) : wire?.removed ? wire.bytes : undefined, removed:wire?.removed};
  }};
}
const endpoints = {
  browse: bind(messages[endpointMessages.browse], (m, _p, s) => filterRichItems(m, messages[endpointMessages.browse], s.adCache)),
  next: bind(messages[endpointMessages.next], (m, _p, s) => filterRichItems(m, messages[endpointMessages.next], s.adCache), 'next'),
  player: bind(messages[endpointMessages.player], (m, p) => { processPlayer(m, p.captionLang); return true; }),
  search: bind(messages[endpointMessages.search], (m, _p, s) => filterRichItems(m, messages[endpointMessages.search], s.adCache)),
  'reel/reel_watch_sequence': bind(messages[endpointMessages['reel/reel_watch_sequence']], processShorts),
  guide: bind(messages[endpointMessages.guide], processGuide),
  'account/get_setting': bind(messages[endpointMessages['account/get_setting']], processSettings),
  get_watch: bind(messages[endpointMessages.get_watch], processWatch, 'watch'),
  config: bind(messages[endpointMessages.config], (m, _p, s, k) => processConfig(m, s, k)),
  log_event: bind(messages[endpointMessages.log_event], (m, _p, s, k) => processConfig(m, s, k)),
} satisfies Record<Route, Endpoint>;

export function endpointFor(route: string): Endpoint | undefined {
  return Object.prototype.hasOwnProperty.call(endpoints, route) ? endpoints[route as Route] : undefined;
}

export const onesieEndpoint: Endpoint = bind(messages['youtube.ump.encrypted.OnesieInnertubeResponse'],
  (message, params, state) => processWatch({contents:message.contents}, params, state), 'onesie');
