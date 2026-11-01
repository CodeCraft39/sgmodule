import {removeMessages, selectMessages} from '../../protobuf/edit';
import {readFields} from '../../protobuf/wire';
import {wirePaths, legacyNextFields} from '../wire-schema';

function contains(bytes: Uint8Array, text: string): boolean {
  outer: for (let i = 0; i <= bytes.length - text.length; i++) {
    for (let j = 0; j < text.length; j++) if (bytes[i+j] !== text.charCodeAt(j)) continue outer;
    return true;
  }
  return false;
}

// Both predicates and their positions are supported by the captured ad panels.
// The schema supplies field numbers. This predicate is shared by native clients.
function isObservedAdPanel(item: Uint8Array): boolean {
  // Product panel: 2026-10-31 captures. Buttoned panel: 2026-11-01
  // record 16. Content lockup: 2026-11-01 15:56 capture, record 48.
  // Each observed layout also requires /pagead/ in its expected data container.
  const identifiers = ['panel_product_feed_standard_layout.eml-fe',
    'panel_text_icon_center_image_buttoned_layout.eml-fe', 'panel_content_lockup.eml-fe'];
  const layout = selectMessages(item, wirePaths.rendererLayout).some(bytes => identifiers.some(identifier =>
    bytes.length >= identifier.length &&
    [...identifier].every((ch, i) => bytes[i] === ch.charCodeAt(0)) &&
    (bytes.length === identifier.length || bytes[identifier.length] === 124)));
  return layout && selectMessages(item, wirePaths.rendererData).some(bytes => contains(bytes, '/pagead/'));
}

export function filterImmersivePanels(input: Uint8Array | ArrayBuffer, container: 'next' | 'watch' | 'onesie' = 'next') {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const prefix = container === 'watch' ? wirePaths.watchNext : container === 'onesie' ? wirePaths.onesieNext : [];
  const fields = selectMessages(bytes, prefix).flatMap(readFields);
  const hasImmersive = fields.some(f => f.no === wirePaths.immersiveItems[0] && f.wire === 2);
  const hasLegacy = fields.some(f => legacyNextFields.some(no => no === f.no) && f.wire === 2);
  const result = hasImmersive ? removeMessages(bytes, [...prefix, ...wirePaths.immersiveItems], isObservedAdPanel) : {bytes, removed: 0};
  return {...result, hasImmersive, hasLegacy};
}
