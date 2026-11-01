// Compile-only contracts. An unused @ts-expect-error fails the paired checker,
// so accidentally widening codecs/handlers back to any cannot hide these errors.
import {messages} from '../../Script/Youtube/src/response/schema';
import {processPlayer} from '../../Script/Youtube/src/response/handlers';

export function checkMessageTypes(): void {
  const player = messages['youtube.response.player.Player'].create();
  // @ts-expect-error known fields have concrete types
  player.adPlacements = 'invalid';
  // @ts-expect-error undeclared fields are not a permissive index signature
  player.unverifiedField = true;
  // @ts-expect-error partial construction validates nested field types
  messages['youtube.response.config.Config'].create({responseContext:{globalConfigGroup:{hotHashData:12}}});
  // @ts-expect-error a Shorts response cannot enter the Player handler
  processPlayer(messages['youtube.response.shorts.Shorts'].create(), 'off');
}
