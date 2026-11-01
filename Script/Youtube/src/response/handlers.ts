import {messages} from './schema';
import {UnknownFields, encodeBase64} from './vendor/protobuf-runtime.js';
import type {Message, AdCache, State, UnknownField} from './types';
import type {PlatformKey, WorkerParams} from '../request/types';

const player = 'youtube.response.player.';
const setting = 'youtube.response.setting.';
const make = (name: string, value: Message) => messages[name].create(value);
export function visit(root: Message, key: string, callback: (value: Message) => boolean | void): void {
  const stack = root && typeof root === 'object' ? [root] : [];
  while (stack.length) {
    const node = stack.pop()!;
    for (const name of Object.keys(node)) {
      if (name === key && callback(node)) return;
      if (node[name] !== null && typeof node[name] === 'object') stack.push(node[name]);
    }
  }
}
export function hasAdMarker(bytes: Uint8Array): boolean {
  if (bytes.length < 1000) return false; // Preserve the original heuristic threshold.
  const marker = [112,97,103,101,97,100];
  outer: for (let i = 0; i <= bytes.length - marker.length; i++) {
    for (let j = 0; j < marker.length; j++) if (bytes[i+j] !== marker[j]) continue outer;
    return true;
  }
  return false;
}
function unknownIsAd(field: UnknownField, cache: AdCache): boolean {
  if (cache.whiteNo.includes(field.no)) return false;
  if (cache.blackNo.includes(field.no)) return true;
  const ad = hasAdMarker(field.data);
  (ad ? cache.blackNo : cache.whiteNo).push(field.no); cache.dirty = true;
  return ad;
}
function rendererIsAd(item: Message, cache: AdCache): boolean {
  const unknown = UnknownFields.list(item)[0];
  if (unknown) return unknownIsAd(unknown, cache);
  let ad = false;
  visit(item, 'renderInfo', node => {
    const layout = node.renderInfo?.layoutRender?.eml?.split('|')?.[0] ?? '';
    if (cache.whiteEml.includes(layout)) ad = false;
    else if (cache.blackEml.includes(layout) || /shorts(?!_pivot_item)/.test(layout)) ad = true;
    else {
      const content = node.videoInfo?.videoContext?.videoContent;
      if (content) {
        ad = UnknownFields.list(content).some(f => hasAdMarker(f.data));
        (ad ? cache.blackEml : cache.whiteEml).push(layout); cache.dirty = true;
      }
    }
    return true;
  });
  return ad;
}
export function filterRichItems(message: Message, cache: AdCache): boolean {
  let changed = false;
  visit(message, 'richItemContents', node => {
    const items = node.richItemContents;
    if (!Array.isArray(items)) return false;
    for (let i = items.length - 1; i >= 0; i--) if (rendererIsAd(items[i], cache)) {
      items.splice(i, 1); changed = true;
    }
  });
  return changed;
}
const languages = {de:'Deutsch',ru:'Русский',fr:'Français',fil:'Filipino',ko:'한국어',ja:'日本語',en:'English',vi:'Tiếng Việt',
  'zh-Hant':'中文（繁體）','zh-Hans':'中文（简体）',und:'@VirgilClyne'};
export function processPlayer(message: Message, captionLang: string): void {
  if (message.adPlacements?.length) message.adPlacements.length = 0;
  if (message.adSlots?.length) message.adSlots.length = 0;
  if (message.playbackTracking) delete message.playbackTracking.pageadViewthroughconversion;
  const status = message.playabilityStatus;
  if (status) {
    status.pictureInPictureRender = make(player+'PictureInPictureSupportedRenderer', {
      pictureInPictureAbility:{active:true,f4:0,f6:0,f8:1}});
    status.backgroundPlayerRender = make(player+'BackgroundSupportedRenderer', {backgroundAbility:{active:true}});
  }
  if (captionLang === 'off') return;
  visit(message, 'captionTracks', node => {
    const tracks = node.captionTracks, audio = node.audioTracks;
    if (Array.isArray(tracks) && tracks.length) {
      const priority: Record<string, number> = {[captionLang]:2,en:1};
      let best = -1, index = 0;
      tracks.forEach((track: Message, i: number) => {
        const rank = priority[track.languageCode];
        if (rank && rank > best) { best = rank; index = i; }
        track.isTranslatable = true;
      });
      if (best !== 2) tracks.push(make(player+'CaptionTrack', {baseUrl:tracks[index].baseUrl+`&tlang=${captionLang}`,
        name:{runs:[{text:`@Enhance (${captionLang})`}]},vssId:`.${captionLang}`,languageCode:captionLang}));
      if (Array.isArray(audio)) for (const item of audio) {
        const selected = best === 2 ? index : tracks.length - 1;
        if (!item.captionTrackIndices?.includes(selected)) item.captionTrackIndices.push(selected);
        item.defaultCaptionTrackIndex = selected; item.captionsInitialState = 3;
      }
    }
    node.translationLanguages = Object.entries(languages).map(([code, text]) => make(player+'TranslationLanguage', {
      languageCode:code,languageName:{runs:[{text}]}}));
    return true;
  });
}
export function handle(route: string, message: Message, params: WorkerParams, state: State, key: PlatformKey): boolean {
  switch (route) {
    case 'browse': case 'next': case 'search': return filterRichItems(message, state.adCache);
    case 'player': processPlayer(message, params.captionLang); return true;
    case 'reel/reel_watch_sequence': {
      let changed = false;
      for (let i = (message.entries?.length ?? 0)-1; i >= 0; i--)
        if (message.entries[i].command?.reelWatchEndpoint?.adClientParams?.isAd) { message.entries.splice(i,1); changed=true; }
      return changed;
    }
    case 'guide': {
      const hidden = ['SPunlimited'];
      if (params.blockUpload) hidden.push('FEuploads');
      if (params.blockImmersive) hidden.push('FEmusic_immersive');
      if (params.blockShorts) hidden.push('FEshorts');
      let changed = false;
      visit(message, 'rendererItems', node => {
        for (let i = node.rendererItems.length-1; i >= 0; i--) {
          const item = node.rendererItems[i];
          if (hidden.includes(item.iconRender?.browseId ?? item.labelRender?.browseId)) { node.rendererItems.splice(i,1); changed=true; }
        }
      });
      return changed;
    }
    case 'account/get_setting':
      visit(message.settingItems, 'categoryId', node => {
        if (node.categoryId === 10135) node.subSettings.push(make(setting+'SubSetting', {settingBooleanRenderer:{
          itemId:0,enableServiceEndpoint:{setClientSettingEndpoint:{settingData:{clientSettingEnum:{item:151},boolValue:true}}},
          disableServiceEndpoint:{setClientSettingEndpoint:{settingData:{clientSettingEnum:{item:151},boolValue:false}}}}}));
      });
      message.settingItems.push(make(setting+'SettingItem', {backgroundPlayBackSettingRenderer:{
        backgroundPlayback:true,download:true,downloadQualitySelection:true,smartDownload:true,icon:{iconType:1093}}}));
      return true;
    case 'get_watch': {
      let changed = false;
      for (const item of message.contents) {
        if (item.player) { processPlayer(item.player, params.captionLang); changed = true; }
        if (item.next) changed = filterRichItems(item.next, state.adCache) || changed;
      }
      return changed;
    }
    case 'config': case 'log_event': {
      const cfg = message.responseContext?.globalConfigGroup?.hotConfigGroup?.mediaHotConfig?.onesieHotConfig;
      if (cfg?.clientKey?.length && cfg.encryptKey?.length) {
        const next = {clientKey:encodeBase64(cfg.clientKey),encryptKey:encodeBase64(cfg.encryptKey)};
        const current = state.config[key];
        if (current?.clientKey !== next.clientKey || current.encryptKey !== next.encryptKey) state.config[key] = next;
      }
      return false;
    }
    default: return false;
  }
}
