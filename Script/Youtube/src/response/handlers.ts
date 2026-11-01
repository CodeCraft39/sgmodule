import type {IMessageType} from '@protobuf-ts/runtime';
import {messages} from './schema';
import {UnknownFields, encodeBase64} from '../protobuf/runtime';
import {visitType} from '../protobuf/visit';
import type * as M from './messages';
import type {AdCache, State, UnknownField, FilterStats} from './types';
import type {PlatformKey, WorkerParams} from '../request/types';

const itemSection = messages['youtube.response.browse.ItemSectionRenderer'];
const rendererContent = messages['youtube.response.browse.VideoRendererContent'];
const captionList = messages['youtube.response.player.PlayerCaptionsTrackListRenderer'];
export function hasAdMarker(bytes: Uint8Array): boolean {
  if (bytes.length < 1000) return false; // Inherited policy; keep golden behavior.
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
function rendererIsAd(item: M.youtube_response_browse_RichItemContent, cache: AdCache): boolean {
  const unknown = UnknownFields.list(item)[0];
  if (unknown) return unknownIsAd(unknown, cache);
  let ad = false;
  visitType(item, messages['youtube.response.browse.RichItemContent'], rendererContent, node => {
    const layout = node.renderInfo?.layoutRender?.eml.split('|')[0] ?? '';
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
export function filterRichItems<T extends object>(message: T, codec: IMessageType<T>, cache: AdCache, stats?: FilterStats): boolean {
  let changed = false;
  visitType(message, codec, itemSection, node => {
    const items = node.richItemContents;
    for (let i = items.length - 1; i >= 0; i--) if (rendererIsAd(items[i], cache)) {
      items.splice(i, 1); changed = true;
      if (stats) stats.richItems++;
    }
  });
  return changed;
}
const languages = {de:'Deutsch',ru:'Русский',fr:'Français',fil:'Filipino',ko:'한국어',ja:'日本語',en:'English',vi:'Tiếng Việt',
  'zh-Hant':'中文（繁體）','zh-Hans':'中文（简体）',und:'@VirgilClyne'};
export function processPlayer(message: M.youtube_response_player_Player, captionLang: string, stats?: FilterStats): void {
  if (stats) { stats.adPlacements += message.adPlacements.length; stats.adSlots += message.adSlots.length; }
  message.adPlacements.length = 0;
  message.adSlots.length = 0;
  if (message.playbackTracking) delete message.playbackTracking.pageadViewthroughconversion;
  const status = message.playabilityStatus;
  if (status) {
    status.pictureInPictureRender = messages['youtube.response.player.PictureInPictureSupportedRenderer'].create({
      pictureInPictureAbility:{active:true,f4:0,f6:0,f8:1}});
    status.backgroundPlayerRender = messages['youtube.response.player.BackgroundSupportedRenderer'].create({backgroundAbility:{active:true}});
  }
  if (captionLang === 'off') return;
  visitType(message, messages['youtube.response.player.Player'], captionList, node => {
    const tracks = node.captionTracks;
    if (tracks.length) {
      const priority: Record<string, number> = {[captionLang]:2,en:1};
      let best = -1, index = 0;
      tracks.forEach((track, i) => {
        const rank = priority[track.languageCode];
        if (rank && rank > best) { best = rank; index = i; }
        track.isTranslatable = true;
      });
      if (best !== 2) tracks.push(messages['youtube.response.player.CaptionTrack'].create({
        baseUrl:tracks[index].baseUrl+`&tlang=${captionLang}`, name:{runs:[{text:`@Enhance (${captionLang})`}]},
        vssId:`.${captionLang}`,languageCode:captionLang}));
      for (const item of node.audioTracks) {
        const selected = best === 2 ? index : tracks.length - 1;
        if (!item.captionTrackIndices.includes(selected)) item.captionTrackIndices.push(selected);
        item.defaultCaptionTrackIndex = selected; item.captionsInitialState = 3;
      }
    }
    node.translationLanguages = Object.entries(languages).map(([code, text]) => messages['youtube.response.player.TranslationLanguage'].create({
      languageCode:code,languageName:{runs:[{text}]}}));
    return true;
  });
}
export function processShorts(message: M.youtube_response_shorts_Shorts): boolean {
  let changed = false;
  for (let i = message.entries.length-1; i >= 0; i--)
    if (message.entries[i].command?.reelWatchEndpoint?.adClientParams?.isAd) { message.entries.splice(i,1); changed=true; }
  return changed;
}
export function processGuide(message: M.youtube_response_guide_Guide, params: WorkerParams): boolean {
  const hidden = ['SPunlimited'];
  if (params.blockUpload) hidden.push('FEuploads');
  if (params.blockImmersive) hidden.push('FEmusic_immersive');
  if (params.blockShorts) hidden.push('FEshorts');
  let changed = false;
  visitType(message, messages['youtube.response.guide.Guide'], messages['youtube.response.guide.GuideSectionRenderer'], node => {
    for (let i = node.rendererItems.length-1; i >= 0; i--) {
      const item = node.rendererItems[i];
      if (hidden.includes(item.iconRender?.browseId ?? item.labelRender?.browseId ?? '')) { node.rendererItems.splice(i,1); changed=true; }
    }
  });
  return changed;
}
export function processSettings(message: M.youtube_response_setting_Setting): boolean {
  for (const item of message.settingItems) visitType(item, messages['youtube.response.setting.SettingItem'], messages['youtube.response.setting.SettingCategoryCollectionRenderer'], node => {
    if (node.categoryId === 10135) node.subSettings.push(messages['youtube.response.setting.SubSetting'].create({settingBooleanRenderer:{
      itemId:0,enableServiceEndpoint:{setClientSettingEndpoint:{settingData:{clientSettingEnum:{item:151},boolValue:true}}},
      disableServiceEndpoint:{setClientSettingEndpoint:{settingData:{clientSettingEnum:{item:151},boolValue:false}}}}}));
  });
  message.settingItems.push(messages['youtube.response.setting.SettingItem'].create({backgroundPlayBackSettingRenderer:{
    backgroundPlayback:true,download:true,downloadQualitySelection:true,smartDownload:true,icon:{iconType:1093}}}));
  return true;
}
export function processWatch(message: M.youtube_response_watch_Watch, params: WorkerParams, state: State): boolean {
  let changed = false;
  for (const item of message.contents) {
    if (item.player) { processPlayer(item.player, params.captionLang, state.filterStats); changed = true; }
    if (item.next) changed = filterRichItems(item.next, messages['youtube.response.next.Next'], state.adCache, state.filterStats) || changed;
  }
  return changed;
}
export function processConfig(message: M.youtube_response_config_Config, state: State, key: PlatformKey): boolean {
  const group = message.responseContext?.globalConfigGroup;
  const cfg = group?.hotConfigGroup?.mediaHotConfig?.onesieHotConfig;
  if (cfg?.clientKey.length && cfg.encryptKey.length) {
    if (state.localPlayback && cfg.clientKey.length !== 32) return false;
    const next = {clientKey:encodeBase64(cfg.clientKey),encryptKey:encodeBase64(cfg.encryptKey),
      ...(state.localPlayback && group?.hotHashData ? {hotHashData:group.hotHashData} : {})};
    const current = state.config[key];
    if (current?.clientKey !== next.clientKey || current?.encryptKey !== next.encryptKey ||
        state.localPlayback && current?.hotHashData !== next.hotHashData) state.config[key] = next;
  }
  return false;
}
