// Recovered embedded descriptors; edit these for schema changes.
import {MessageType} from './vendor/protobuf-runtime.js';
import type {MessageCodec} from './types';
export const messages: Record<string, MessageCodec> = {};
messages["youtube.component.Label"]=new MessageType("youtube.component.Label",[
  {"no":1,"name":"runs","kind":"message","repeat":1,"T":()=>messages["youtube.component.Run"],"localName":"runs","jsonName":"runs","opt":false}
]);
messages["youtube.component.Run"]=new MessageType("youtube.component.Run",[
  {"no":1,"name":"text","kind":"scalar","T":9,"localName":"text","jsonName":"text","repeat":0,"opt":false}
]);
messages["youtube.component.ResponseContext"]=new MessageType("youtube.component.ResponseContext",[
  {"no":6,"name":"serviceTrackingParams","kind":"message","repeat":1,"T":()=>messages["youtube.component.ServiceTrackingParam"],"localName":"serviceTrackingParams","jsonName":"serviceTrackingParams","opt":false}
]);
messages["youtube.component.ServiceTrackingParam"]=new MessageType("youtube.component.ServiceTrackingParam",[
  {"no":1,"name":"service","kind":"scalar","T":5,"localName":"service","jsonName":"service","repeat":0,"opt":false},
  {"no":2,"name":"params","kind":"message","repeat":1,"T":()=>messages["youtube.component.Param"],"localName":"params","jsonName":"params","opt":false}
]);
messages["youtube.component.Param"]=new MessageType("youtube.component.Param",[
  {"no":1,"name":"key","kind":"scalar","T":9,"localName":"key","jsonName":"key","repeat":0,"opt":false},
  {"no":2,"name":"value","kind":"scalar","T":9,"localName":"value","jsonName":"value","repeat":0,"opt":false}
]);
messages["youtube.response.browse.Browse"]=new MessageType("youtube.response.browse.Browse",[
  {"no":1,"name":"responseContext","kind":"message","T":()=>messages["youtube.component.ResponseContext"],"localName":"responseContext","jsonName":"responseContext","repeat":0,"opt":true},
  {"no":9,"name":"content","kind":"message","T":()=>messages["youtube.response.browse.Content"],"localName":"content","jsonName":"content","repeat":0,"opt":true},
  {"no":10,"name":"onResponseReceivedAction","kind":"message","T":()=>messages["youtube.response.browse.Content"],"localName":"onResponseReceivedAction","jsonName":"onResponseReceivedAction","repeat":0,"opt":true}
]);
messages["youtube.response.browse.Content"]=new MessageType("youtube.response.browse.Content",[
  {"no":58173949,"name":"singleColumnResultsRenderer","kind":"message","T":()=>messages["youtube.response.browse.SingleColumnResultsRenderer"],"localName":"singleColumnResultsRenderer","jsonName":"singleColumnResultsRenderer","repeat":0,"opt":true},
  {"no":153515154,"name":"elementRenderer","kind":"message","T":()=>messages["youtube.response.browse.ElementRenderer"],"localName":"elementRenderer","jsonName":"elementRenderer","repeat":0,"opt":true},
  {"no":49399797,"name":"sectionListRenderer","kind":"message","T":()=>messages["youtube.response.browse.SectionListRenderer"],"localName":"sectionListRenderer","jsonName":"sectionListRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.browse.SingleColumnResultsRenderer"]=new MessageType("youtube.response.browse.SingleColumnResultsRenderer",[
  {"no":1,"name":"tabs","kind":"message","repeat":1,"T":()=>messages["youtube.response.browse.BrowseTabSupportedRenderer"],"localName":"tabs","jsonName":"tabs","opt":false}
]);
messages["youtube.response.browse.BrowseTabSupportedRenderer"]=new MessageType("youtube.response.browse.BrowseTabSupportedRenderer",[
  {"no":58174010,"name":"tabRenderer","kind":"message","T":()=>messages["youtube.response.browse.TabRenderer"],"localName":"tabRenderer","jsonName":"tabRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.browse.TabRenderer"]=new MessageType("youtube.response.browse.TabRenderer",[
  {"no":4,"name":"content","kind":"message","T":()=>messages["youtube.response.browse.Content"],"localName":"content","jsonName":"content","repeat":0,"opt":true}
]);
messages["youtube.response.browse.SectionListRenderer"]=new MessageType("youtube.response.browse.SectionListRenderer",[
  {"no":1,"name":"sectionListSupportedRenderers","kind":"message","repeat":1,"T":()=>messages["youtube.response.browse.SectionListSupportedRenderer"],"localName":"sectionListSupportedRenderers","jsonName":"sectionListSupportedRenderers","opt":false}
]);
messages["youtube.response.browse.SectionListSupportedRenderer"]=new MessageType("youtube.response.browse.SectionListSupportedRenderer",[
  {"no":50195462,"name":"itemSectionRenderer","kind":"message","T":()=>messages["youtube.response.browse.ItemSectionRenderer"],"localName":"itemSectionRenderer","jsonName":"itemSectionRenderer","repeat":0,"opt":true},
  {"no":51845067,"name":"shelfRenderer","kind":"message","T":()=>messages["youtube.response.browse.ShelfRenderer"],"localName":"shelfRenderer","jsonName":"shelfRenderer","repeat":0,"opt":true},
  {"no":221496734,"name":"musicDescriptionShelfRenderer","kind":"message","T":()=>messages["youtube.response.browse.MusicDescriptionShelfRenderer"],"localName":"musicDescriptionShelfRenderer","jsonName":"musicDescriptionShelfRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.browse.ItemSectionRenderer"]=new MessageType("youtube.response.browse.ItemSectionRenderer",[
  {"no":1,"name":"richItemContents","kind":"message","repeat":1,"T":()=>messages["youtube.response.browse.RichItemContent"],"localName":"richItemContents","jsonName":"richItemContents","opt":false}
]);
messages["youtube.response.browse.RichItemContent"]=new MessageType("youtube.response.browse.RichItemContent",[
  {"no":153515154,"name":"videoWithContextRenderer","kind":"message","T":()=>messages["youtube.response.browse.ElementRenderer"],"localName":"videoWithContextRenderer","jsonName":"videoWithContextRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.browse.ElementRenderer"]=new MessageType("youtube.response.browse.ElementRenderer",[
  {"no":172660663,"name":"videoRendererContent","kind":"message","T":()=>messages["youtube.response.browse.VideoRendererContent"],"localName":"videoRendererContent","jsonName":"videoRendererContent","repeat":0,"opt":true}
]);
messages["youtube.response.browse.VideoRendererContent"]=new MessageType("youtube.response.browse.VideoRendererContent",[
  {"no":1,"name":"videoInfo","kind":"message","T":()=>messages["youtube.response.browse.VideoInfo"],"localName":"videoInfo","jsonName":"videoInfo","repeat":0,"opt":true},
  {"no":2,"name":"renderInfo","kind":"message","T":()=>messages["youtube.response.browse.RenderInfo"],"localName":"renderInfo","jsonName":"renderInfo","repeat":0,"opt":true}
]);
messages["youtube.response.browse.VideoInfo"]=new MessageType("youtube.response.browse.VideoInfo",[
  {"no":168777401,"name":"videoContext","kind":"message","T":()=>messages["youtube.response.browse.VideoContext"],"localName":"videoContext","jsonName":"videoContext","repeat":0,"opt":true}
]);
messages["youtube.response.browse.VideoContext"]=new MessageType("youtube.response.browse.VideoContext",[
  {"no":5,"name":"videoContent","kind":"message","T":()=>messages["youtube.response.browse.VideoContent"],"localName":"videoContent","jsonName":"videoContent","repeat":0,"opt":true}
]);
messages["youtube.response.browse.VideoContent"]=new MessageType("youtube.response.browse.VideoContent",[
  {"no":465160965,"name":"timedLyricsRender","kind":"message","T":()=>messages["youtube.response.browse.TimedLyricsRender"],"localName":"timedLyricsRender","jsonName":"timedLyricsRender","repeat":0,"opt":true}
]);
messages["youtube.response.browse.TimedLyricsRender"]=new MessageType("youtube.response.browse.TimedLyricsRender",[
  {"no":4,"name":"timedLyricsContent","kind":"message","T":()=>messages["youtube.response.browse.TimedLyricsContent"],"localName":"timedLyricsContent","jsonName":"timedLyricsContent","repeat":0,"opt":true}
]);
messages["youtube.response.browse.TimedLyricsContent"]=new MessageType("youtube.response.browse.TimedLyricsContent",[
  {"no":1,"name":"runs","kind":"message","repeat":1,"T":()=>messages["youtube.component.Run"],"localName":"runs","jsonName":"runs","opt":false},
  {"no":2,"name":"footerLabel","kind":"scalar","T":9,"localName":"footerLabel","jsonName":"footerLabel","repeat":0,"opt":false}
]);
messages["youtube.response.browse.RenderInfo"]=new MessageType("youtube.response.browse.RenderInfo",[
  {"no":183314536,"name":"layoutRender","kind":"message","T":()=>messages["youtube.response.browse.LayoutRender"],"localName":"layoutRender","jsonName":"layoutRender","repeat":0,"opt":true}
]);
messages["youtube.response.browse.LayoutRender"]=new MessageType("youtube.response.browse.LayoutRender",[
  {"no":1,"name":"eml","kind":"scalar","T":9,"localName":"eml","jsonName":"eml","repeat":0,"opt":false}
]);
messages["youtube.response.browse.ShelfRenderer"]=new MessageType("youtube.response.browse.ShelfRenderer",[
  {"no":5,"name":"richSectionContent","kind":"message","T":()=>messages["youtube.response.browse.RichSectionContent"],"localName":"richSectionContent","jsonName":"richSectionContent","repeat":0,"opt":true}
]);
messages["youtube.response.browse.RichSectionContent"]=new MessageType("youtube.response.browse.RichSectionContent",[
  {"no":51431404,"name":"reelShelfRenderer","kind":"message","T":()=>messages["youtube.response.browse.ReelShelfRenderer"],"localName":"reelShelfRenderer","jsonName":"reelShelfRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.browse.ReelShelfRenderer"]=new MessageType("youtube.response.browse.ReelShelfRenderer",[
  {"no":1,"name":"richItemContents","kind":"message","repeat":1,"T":()=>messages["youtube.response.browse.RichItemContent"],"localName":"richItemContents","jsonName":"richItemContents","opt":false}
]);
messages["youtube.response.browse.MusicDescriptionShelfRenderer"]=new MessageType("youtube.response.browse.MusicDescriptionShelfRenderer",[
  {"no":3,"name":"description","kind":"message","T":()=>messages["youtube.component.Label"],"localName":"description","jsonName":"description","repeat":0,"opt":true},
  {"no":10,"name":"footer","kind":"message","T":()=>messages["youtube.component.Label"],"localName":"footer","jsonName":"footer","repeat":0,"opt":true}
]);
messages["youtube.response.next.Next"]=new MessageType("youtube.response.next.Next",[
  {"no":7,"name":"content","kind":"message","T":()=>messages["youtube.response.next.Content"],"localName":"content","jsonName":"content","repeat":0,"opt":true},
  {"no":8,"name":"onResponseReceivedAction","kind":"message","T":()=>messages["youtube.response.browse.Content"],"localName":"onResponseReceivedAction","jsonName":"onResponseReceivedAction","repeat":0,"opt":true}
]);
messages["youtube.response.next.Content"]=new MessageType("youtube.response.next.Content",[
  {"no":51779735,"name":"nextResult","kind":"message","T":()=>messages["youtube.response.next.NextResult"],"localName":"nextResult","jsonName":"nextResult","repeat":0,"opt":true}
]);
messages["youtube.response.next.NextResult"]=new MessageType("youtube.response.next.NextResult",[
  {"no":1,"name":"content","kind":"message","T":()=>messages["youtube.response.browse.Content"],"localName":"content","jsonName":"content","repeat":0,"opt":true}
]);
messages["youtube.response.search.Search"]=new MessageType("youtube.response.search.Search",[
  {"no":4,"name":"content","kind":"message","T":()=>messages["youtube.response.browse.Content"],"localName":"content","jsonName":"content","repeat":0,"opt":true},
  {"no":7,"name":"onResponseReceivedCommand","kind":"message","T":()=>messages["youtube.response.search.OnResponseReceivedCommand"],"localName":"onResponseReceivedCommand","jsonName":"onResponseReceivedCommand","repeat":0,"opt":true}
]);
messages["youtube.response.search.OnResponseReceivedCommand"]=new MessageType("youtube.response.search.OnResponseReceivedCommand",[
  {"no":50195462,"name":"itemSectionRenderer","kind":"message","T":()=>messages["youtube.response.browse.ItemSectionRenderer"],"localName":"itemSectionRenderer","jsonName":"itemSectionRenderer","repeat":0,"opt":true},
  {"no":49399797,"name":"appendContinuationItemsAction","kind":"message","T":()=>messages["youtube.response.browse.SectionListRenderer"],"localName":"appendContinuationItemsAction","jsonName":"appendContinuationItemsAction","repeat":0,"opt":true}
]);
messages["youtube.response.shorts.Shorts"]=new MessageType("youtube.response.shorts.Shorts",[
  {"no":2,"name":"entries","kind":"message","repeat":2,"T":()=>messages["youtube.response.shorts.Entry"],"localName":"entries","jsonName":"entries","opt":false}
]);
messages["youtube.response.shorts.Entry"]=new MessageType("youtube.response.shorts.Entry",[
  {"no":1,"name":"command","kind":"message","T":()=>messages["youtube.response.shorts.Command"],"localName":"command","jsonName":"command","repeat":0,"opt":true}
]);
messages["youtube.response.shorts.Command"]=new MessageType("youtube.response.shorts.Command",[
  {"no":139608561,"name":"reelWatchEndpoint","kind":"message","T":()=>messages["youtube.response.shorts.ReelWatchEndpoint"],"localName":"reelWatchEndpoint","jsonName":"reelWatchEndpoint","repeat":0,"opt":true}
]);
messages["youtube.response.shorts.ReelWatchEndpoint"]=new MessageType("youtube.response.shorts.ReelWatchEndpoint",[
  {"no":8,"name":"overlay","kind":"message","T":()=>messages["youtube.response.shorts.Overlay"],"localName":"overlay","jsonName":"overlay","repeat":0,"opt":true},
  {"no":16,"name":"adClientParams","kind":"message","T":()=>messages["youtube.response.shorts.AdClientParams"],"localName":"adClientParams","jsonName":"adClientParams","repeat":0,"opt":true}
]);
messages["youtube.response.shorts.AdClientParams"]=new MessageType("youtube.response.shorts.AdClientParams",[
  {"no":1,"name":"isAd","kind":"scalar","T":8,"localName":"isAd","jsonName":"isAd","repeat":0,"opt":false}
]);
messages["youtube.response.shorts.Overlay"]=new MessageType("youtube.response.shorts.Overlay",[
  {"no":139970731,"name":"reelPlayerOverlayRenderer","kind":"message","T":()=>messages["youtube.response.shorts.ReelPlayerOverlayRenderer"],"localName":"reelPlayerOverlayRenderer","jsonName":"reelPlayerOverlayRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.shorts.ReelPlayerOverlayRenderer"]=new MessageType("youtube.response.shorts.ReelPlayerOverlayRenderer",[
  {"no":12,"name":"style","kind":"scalar","T":5,"localName":"style","jsonName":"style","repeat":0,"opt":false}
]);
messages["youtube.response.guide.Guide"]=new MessageType("youtube.response.guide.Guide",[
  {"no":4,"name":"labelItems","kind":"message","repeat":1,"T":()=>messages["youtube.response.guide.Item"],"localName":"labelItems","jsonName":"labelItems","opt":false},
  {"no":6,"name":"iconItems","kind":"message","repeat":1,"T":()=>messages["youtube.response.guide.Item"],"localName":"iconItems","jsonName":"iconItems","opt":false}
]);
messages["youtube.response.guide.Item"]=new MessageType("youtube.response.guide.Item",[
  {"no":117866661,"name":"guideSectionRenderer","kind":"message","T":()=>messages["youtube.response.guide.GuideSectionRenderer"],"localName":"guideSectionRenderer","jsonName":"guideSectionRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.guide.GuideSectionRenderer"]=new MessageType("youtube.response.guide.GuideSectionRenderer",[
  {"no":1,"name":"rendererItems","kind":"message","repeat":1,"T":()=>messages["youtube.response.guide.RendererItem"],"localName":"rendererItems","jsonName":"rendererItems","opt":false}
]);
messages["youtube.response.guide.RendererItem"]=new MessageType("youtube.response.guide.RendererItem",[
  {"no":318370163,"name":"iconRender","kind":"message","T":()=>messages["youtube.response.guide.guideEntryRenderer"],"localName":"iconRender","jsonName":"iconRender","repeat":0,"opt":true},
  {"no":117501096,"name":"labelRender","kind":"message","T":()=>messages["youtube.response.guide.guideEntryRenderer"],"localName":"labelRender","jsonName":"labelRender","repeat":0,"opt":true}
]);
messages["youtube.response.guide.guideEntryRenderer"]=new MessageType("youtube.response.guide.guideEntryRenderer",[
  {"no":1,"name":"browseId","kind":"scalar","T":9,"localName":"browseId","jsonName":"browseId","repeat":0,"opt":false}
]);
messages["youtube.response.player.Player"]=new MessageType("youtube.response.player.Player",[
  {"no":7,"name":"adPlacements","kind":"message","repeat":1,"T":()=>messages["youtube.response.player.AdPlacement"],"localName":"adPlacements","jsonName":"adPlacements","opt":false},
  {"no":2,"name":"playabilityStatus","kind":"message","T":()=>messages["youtube.response.player.PlayabilityStatus"],"localName":"playabilityStatus","jsonName":"playabilityStatus","repeat":0,"opt":true},
  {"no":9,"name":"playbackTracking","kind":"message","T":()=>messages["youtube.response.player.PlaybackTracking"],"localName":"playbackTracking","jsonName":"playbackTracking","repeat":0,"opt":true},
  {"no":10,"name":"captions","kind":"message","T":()=>messages["youtube.response.player.Captions"],"localName":"captions","jsonName":"captions","repeat":0,"opt":true},
  {"no":68,"name":"adSlots","kind":"message","repeat":1,"T":()=>messages["youtube.response.player.AdSlot"],"localName":"adSlots","jsonName":"adSlots","opt":false}
]);
messages["youtube.response.player.AdPlacement"]=new MessageType("youtube.response.player.AdPlacement",[
  {"no":84813246,"name":"adPlacementRenderer","kind":"message","T":()=>messages["youtube.response.player.AdPlacementRenderer"],"localName":"adPlacementRenderer","jsonName":"adPlacementRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.player.AdPlacementRenderer"]=new MessageType("youtube.response.player.AdPlacementRenderer",[
  {"no":4,"name":"params","kind":"scalar","T":9,"localName":"params","jsonName":"params","repeat":0,"opt":false}
]);
messages["youtube.response.player.PlayabilityStatus"]=new MessageType("youtube.response.player.PlayabilityStatus",[
  {"no":21,"name":"pictureInPictureRender","kind":"message","T":()=>messages["youtube.response.player.PictureInPictureSupportedRenderer"],"localName":"pictureInPictureRender","jsonName":"pictureInPictureRender","repeat":0,"opt":true},
  {"no":11,"name":"backgroundPlayerRender","kind":"message","T":()=>messages["youtube.response.player.BackgroundSupportedRenderer"],"localName":"backgroundPlayerRender","jsonName":"backgroundPlayerRender","repeat":0,"opt":true}
]);
messages["youtube.response.player.PictureInPictureSupportedRenderer"]=new MessageType("youtube.response.player.PictureInPictureSupportedRenderer",[
  {"no":151635310,"name":"pictureInPictureAbility","kind":"message","T":()=>messages["youtube.response.player.PictureInPictureAbility"],"localName":"pictureInPictureAbility","jsonName":"pictureInPictureAbility","repeat":0,"opt":true}
]);
messages["youtube.response.player.BackgroundSupportedRenderer"]=new MessageType("youtube.response.player.BackgroundSupportedRenderer",[
  {"no":64657230,"name":"backgroundAbility","kind":"message","T":()=>messages["youtube.response.player.BackgroundAbility"],"localName":"backgroundAbility","jsonName":"backgroundAbility","repeat":0,"opt":true}
]);
messages["youtube.response.player.PictureInPictureAbility"]=new MessageType("youtube.response.player.PictureInPictureAbility",[
  {"no":1,"name":"active","kind":"scalar","T":8,"localName":"active","jsonName":"active","repeat":0,"opt":false},
  {"no":4,"name":"f4","kind":"scalar","T":5,"localName":"f4","jsonName":"f4","repeat":0,"opt":false},
  {"no":6,"name":"f6","kind":"scalar","T":5,"localName":"f6","jsonName":"f6","repeat":0,"opt":false},
  {"no":8,"name":"f8","kind":"scalar","T":5,"localName":"f8","jsonName":"f8","repeat":0,"opt":false}
]);
messages["youtube.response.player.BackgroundAbility"]=new MessageType("youtube.response.player.BackgroundAbility",[
  {"no":1,"name":"active","kind":"scalar","T":8,"localName":"active","jsonName":"active","repeat":0,"opt":false}
]);
messages["youtube.response.player.PlaybackTracking"]=new MessageType("youtube.response.player.PlaybackTracking",[
  {"no":1,"name":"videostatsPlaybackUrl","kind":"message","T":()=>messages["youtube.response.player.Tracking"],"localName":"videostatsPlaybackUrl","jsonName":"videostatsPlaybackUrl","repeat":0,"opt":true},
  {"no":2,"name":"videostatsDelayplayUrl","kind":"message","T":()=>messages["youtube.response.player.Tracking"],"localName":"videostatsDelayplayUrl","jsonName":"videostatsDelayplayUrl","repeat":0,"opt":true},
  {"no":3,"name":"videostatsWatchtimeUrl","kind":"message","T":()=>messages["youtube.response.player.Tracking"],"localName":"videostatsWatchtimeUrl","jsonName":"videostatsWatchtimeUrl","repeat":0,"opt":true},
  {"no":4,"name":"ptrackingUrl","kind":"message","T":()=>messages["youtube.response.player.Tracking"],"localName":"ptrackingUrl","jsonName":"ptrackingUrl","repeat":0,"opt":true},
  {"no":5,"name":"qoeUrl","kind":"message","T":()=>messages["youtube.response.player.Tracking"],"localName":"qoeUrl","jsonName":"qoeUrl","repeat":0,"opt":true},
  {"no":13,"name":"atrUrl","kind":"message","T":()=>messages["youtube.response.player.Tracking"],"localName":"atrUrl","jsonName":"atrUrl","repeat":0,"opt":true},
  {"no":15,"name":"videostatsEngageUrl","kind":"message","T":()=>messages["youtube.response.player.Tracking"],"localName":"videostatsEngageUrl","jsonName":"videostatsEngageUrl","repeat":0,"opt":true},
  {"no":18,"name":"pageadViewthroughconversion","kind":"message","T":()=>messages["youtube.response.player.Tracking"],"localName":"pageadViewthroughconversion","jsonName":"pageadViewthroughconversion","repeat":0,"opt":true}
]);
messages["youtube.response.player.Tracking"]=new MessageType("youtube.response.player.Tracking",[
  {"no":1,"name":"baseUrl","kind":"scalar","T":9,"localName":"baseUrl","jsonName":"baseUrl","repeat":0,"opt":false}
]);
messages["youtube.response.player.Captions"]=new MessageType("youtube.response.player.Captions",[
  {"no":51621377,"name":"playerCaptionsTrackListRenderer","kind":"message","jsonName":"playerCaptionsTracklistRenderer","T":()=>messages["youtube.response.player.PlayerCaptionsTrackListRenderer"],"localName":"playerCaptionsTrackListRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.player.PlayerCaptionsTrackListRenderer"]=new MessageType("youtube.response.player.PlayerCaptionsTrackListRenderer",[
  {"no":1,"name":"captionTracks","kind":"message","repeat":1,"T":()=>messages["youtube.response.player.CaptionTrack"],"localName":"captionTracks","jsonName":"captionTracks","opt":false},
  {"no":2,"name":"audioTracks","kind":"message","repeat":1,"T":()=>messages["youtube.response.player.AudioTrack"],"localName":"audioTracks","jsonName":"audioTracks","opt":false},
  {"no":3,"name":"translationLanguages","kind":"message","repeat":1,"T":()=>messages["youtube.response.player.TranslationLanguage"],"localName":"translationLanguages","jsonName":"translationLanguages","opt":false},
  {"no":4,"name":"defaultAudioTrackIndex","kind":"scalar","opt":true,"T":5,"localName":"defaultAudioTrackIndex","jsonName":"defaultAudioTrackIndex","repeat":0},
  {"no":6,"name":"defaultCaptionTrackIndex","kind":"scalar","opt":true,"T":5,"localName":"defaultCaptionTrackIndex","jsonName":"defaultCaptionTrackIndex","repeat":0}
]);
messages["youtube.response.player.CaptionTrack"]=new MessageType("youtube.response.player.CaptionTrack",[
  {"no":1,"name":"baseUrl","kind":"scalar","T":9,"localName":"baseUrl","jsonName":"baseUrl","repeat":0,"opt":false},
  {"no":2,"name":"name","kind":"message","T":()=>messages["youtube.component.Label"],"localName":"name","jsonName":"name","repeat":0,"opt":true},
  {"no":3,"name":"vssId","kind":"scalar","T":9,"localName":"vssId","jsonName":"vssId","repeat":0,"opt":false},
  {"no":4,"name":"languageCode","kind":"scalar","T":9,"localName":"languageCode","jsonName":"languageCode","repeat":0,"opt":false},
  {"no":5,"name":"kind","kind":"scalar","opt":true,"T":9,"localName":"kind","jsonName":"kind","repeat":0},
  {"no":6,"name":"rtl","kind":"scalar","opt":true,"T":8,"localName":"rtl","jsonName":"rtl","repeat":0},
  {"no":7,"name":"isTranslatable","kind":"scalar","T":8,"localName":"isTranslatable","jsonName":"isTranslatable","repeat":0,"opt":false}
]);
messages["youtube.response.player.AudioTrack"]=new MessageType("youtube.response.player.AudioTrack",[
  {"no":2,"name":"captionTrackIndices","kind":"scalar","repeat":2,"T":5,"localName":"captionTrackIndices","jsonName":"captionTrackIndices","opt":false},
  {"no":3,"name":"defaultCaptionTrackIndex","kind":"scalar","opt":true,"T":5,"localName":"defaultCaptionTrackIndex","jsonName":"defaultCaptionTrackIndex","repeat":0},
  {"no":4,"name":"forcedCaptionTrackIndex","kind":"scalar","opt":true,"T":5,"localName":"forcedCaptionTrackIndex","jsonName":"forcedCaptionTrackIndex","repeat":0},
  {"no":5,"name":"visibility","kind":"scalar","opt":true,"T":5,"localName":"visibility","jsonName":"visibility","repeat":0},
  {"no":6,"name":"hasDefaultTrack","kind":"scalar","opt":true,"T":8,"localName":"hasDefaultTrack","jsonName":"hasDefaultTrack","repeat":0},
  {"no":7,"name":"hasForcedTrack","kind":"scalar","opt":true,"T":8,"localName":"hasForcedTrack","jsonName":"hasForcedTrack","repeat":0},
  {"no":8,"name":"audioTrackId","kind":"scalar","opt":true,"T":9,"localName":"audioTrackId","jsonName":"audioTrackId","repeat":0},
  {"no":11,"name":"captionsInitialState","kind":"scalar","opt":true,"T":5,"localName":"captionsInitialState","jsonName":"captionsInitialState","repeat":0}
]);
messages["youtube.response.player.TranslationLanguage"]=new MessageType("youtube.response.player.TranslationLanguage",[
  {"no":1,"name":"languageCode","kind":"scalar","T":9,"localName":"languageCode","jsonName":"languageCode","repeat":0,"opt":false},
  {"no":2,"name":"languageName","kind":"message","T":()=>messages["youtube.component.Label"],"localName":"languageName","jsonName":"languageName","repeat":0,"opt":true}
]);
messages["youtube.response.player.AdSlot"]=new MessageType("youtube.response.player.AdSlot",[
  {"no":424701016,"name":"render","kind":"message","T":()=>messages["youtube.response.player.AdSlot.Render"],"localName":"render","jsonName":"render","repeat":0,"opt":true}
]);
messages["youtube.response.player.AdSlot.Render"]=new MessageType("youtube.response.player.AdSlot.Render",[

]);
messages["youtube.response.setting.Setting"]=new MessageType("youtube.response.setting.Setting",[
  {"no":6,"name":"settingItems","kind":"message","repeat":1,"T":()=>messages["youtube.response.setting.SettingItem"],"localName":"settingItems","jsonName":"settingItems","opt":false},
  {"no":7,"name":"CollectionItems","kind":"message","jsonName":"CollectionItems","repeat":1,"T":()=>messages["youtube.response.setting.SettingItem"],"localName":"collectionItems","opt":false}
]);
messages["youtube.response.setting.SettingItem"]=new MessageType("youtube.response.setting.SettingItem",[
  {"no":88478200,"name":"backgroundPlayBackSettingRenderer","kind":"message","T":()=>messages["youtube.response.setting.BackgroundPlayBackSettingRenderer"],"localName":"backgroundPlayBackSettingRenderer","jsonName":"backgroundPlayBackSettingRenderer","repeat":0,"opt":true},
  {"no":66930374,"name":"settingCategoryCollectionRenderer","kind":"message","T":()=>messages["youtube.response.setting.SettingCategoryCollectionRenderer"],"localName":"settingCategoryCollectionRenderer","jsonName":"settingCategoryCollectionRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.setting.BackgroundPlayBackSettingRenderer"]=new MessageType("youtube.response.setting.BackgroundPlayBackSettingRenderer",[
  {"no":1,"name":"name","kind":"message","T":()=>messages["youtube.component.Label"],"localName":"name","jsonName":"name","repeat":0,"opt":true},
  {"no":2,"name":"backgroundPlayback","kind":"scalar","T":8,"localName":"backgroundPlayback","jsonName":"backgroundPlayback","repeat":0,"opt":false},
  {"no":3,"name":"download","kind":"scalar","T":8,"localName":"download","jsonName":"download","repeat":0,"opt":false},
  {"no":5,"name":"trackingParams","kind":"scalar","T":12,"localName":"trackingParams","jsonName":"trackingParams","repeat":0,"opt":false},
  {"no":9,"name":"downloadQualitySelection","kind":"scalar","T":8,"localName":"downloadQualitySelection","jsonName":"downloadQualitySelection","repeat":0,"opt":false},
  {"no":10,"name":"smartDownload","kind":"scalar","T":8,"localName":"smartDownload","jsonName":"smartDownload","repeat":0,"opt":false},
  {"no":14,"name":"icon","kind":"message","T":()=>messages["youtube.response.setting.Icon"],"localName":"icon","jsonName":"icon","repeat":0,"opt":true}
]);
messages["youtube.response.setting.SettingCategoryCollectionRenderer"]=new MessageType("youtube.response.setting.SettingCategoryCollectionRenderer",[
  {"no":2,"name":"name","kind":"message","T":()=>messages["youtube.component.Label"],"localName":"name","jsonName":"name","repeat":0,"opt":true},
  {"no":3,"name":"subSettings","kind":"message","repeat":1,"T":()=>messages["youtube.response.setting.SubSetting"],"localName":"subSettings","jsonName":"subSettings","opt":false},
  {"no":4,"name":"categoryId","kind":"scalar","T":5,"localName":"categoryId","jsonName":"categoryId","repeat":0,"opt":false},
  {"no":5,"name":"icon","kind":"message","T":()=>messages["youtube.response.setting.Icon"],"localName":"icon","jsonName":"icon","repeat":0,"opt":true}
]);
messages["youtube.response.setting.Icon"]=new MessageType("youtube.response.setting.Icon",[
  {"no":1,"name":"iconType","kind":"scalar","T":5,"localName":"iconType","jsonName":"iconType","repeat":0,"opt":false}
]);
messages["youtube.response.setting.SubSetting"]=new MessageType("youtube.response.setting.SubSetting",[
  {"no":61331416,"name":"settingBooleanRenderer","kind":"message","T":()=>messages["youtube.response.setting.SettingBooleanRenderer"],"localName":"settingBooleanRenderer","jsonName":"settingBooleanRenderer","repeat":0,"opt":true}
]);
messages["youtube.response.setting.SettingBooleanRenderer"]=new MessageType("youtube.response.setting.SettingBooleanRenderer",[
  {"no":2,"name":"title","kind":"message","T":()=>messages["youtube.component.Label"],"localName":"title","jsonName":"title","repeat":0,"opt":true},
  {"no":3,"name":"description","kind":"message","T":()=>messages["youtube.component.Label"],"localName":"description","jsonName":"description","repeat":0,"opt":true},
  {"no":5,"name":"enableServiceEndpoint","kind":"message","T":()=>messages["youtube.response.setting.ServiceEndpoint"],"localName":"enableServiceEndpoint","jsonName":"enableServiceEndpoint","repeat":0,"opt":true},
  {"no":6,"name":"disableServiceEndpoint","kind":"message","T":()=>messages["youtube.response.setting.ServiceEndpoint"],"localName":"disableServiceEndpoint","jsonName":"disableServiceEndpoint","repeat":0,"opt":true},
  {"no":15,"name":"itemId","kind":"scalar","T":5,"localName":"itemId","jsonName":"itemId","repeat":0,"opt":false}
]);
messages["youtube.response.setting.ServiceEndpoint"]=new MessageType("youtube.response.setting.ServiceEndpoint",[
  {"no":81212182,"name":"setClientSettingEndpoint","kind":"message","T":()=>messages["youtube.response.setting.SetClientSettingEndpoint"],"localName":"setClientSettingEndpoint","jsonName":"setClientSettingEndpoint","repeat":0,"opt":true}
]);
messages["youtube.response.setting.SetClientSettingEndpoint"]=new MessageType("youtube.response.setting.SetClientSettingEndpoint",[
  {"no":1,"name":"settingData","kind":"message","T":()=>messages["youtube.response.setting.SettingData"],"localName":"settingData","jsonName":"settingData","repeat":0,"opt":true}
]);
messages["youtube.response.setting.SettingData"]=new MessageType("youtube.response.setting.SettingData",[
  {"no":1,"name":"clientSettingEnum","kind":"message","T":()=>messages["youtube.response.setting.ClientSettingEnum"],"localName":"clientSettingEnum","jsonName":"clientSettingEnum","repeat":0,"opt":true},
  {"no":3,"name":"boolValue","kind":"scalar","T":8,"localName":"boolValue","jsonName":"boolValue","repeat":0,"opt":false}
]);
messages["youtube.response.setting.ClientSettingEnum"]=new MessageType("youtube.response.setting.ClientSettingEnum",[
  {"no":1,"name":"item","kind":"scalar","T":5,"localName":"item","jsonName":"item","repeat":0,"opt":false}
]);
messages["youtube.response.watch.Watch"]=new MessageType("youtube.response.watch.Watch",[
  {"no":1,"name":"contents","kind":"message","repeat":1,"T":()=>messages["youtube.response.watch.Content"],"localName":"contents","jsonName":"contents","opt":false}
]);
messages["youtube.response.watch.Content"]=new MessageType("youtube.response.watch.Content",[
  {"no":2,"name":"player","kind":"message","T":()=>messages["youtube.response.player.Player"],"localName":"player","jsonName":"player","repeat":0,"opt":true},
  {"no":3,"name":"next","kind":"message","T":()=>messages["youtube.response.next.Next"],"localName":"next","jsonName":"next","repeat":0,"opt":true}
]);
messages["youtube.response.config.Config"]=new MessageType("youtube.response.config.Config",[
  {"no":1,"name":"response_context","kind":"message","T":()=>messages["youtube.response.config.ResponseContext"],"localName":"responseContext","jsonName":"responseContext","repeat":0,"opt":true}
]);
messages["youtube.response.config.ResponseContext"]=new MessageType("youtube.response.config.ResponseContext",[
  {"no":16,"name":"globalConfigGroup","kind":"message","T":()=>messages["youtube.response.config.GlobalConfigGroup"],"localName":"globalConfigGroup","jsonName":"globalConfigGroup","repeat":0,"opt":true}
]);
messages["youtube.response.config.GlobalConfigGroup"]=new MessageType("youtube.response.config.GlobalConfigGroup",[
  {"no":6,"name":"coldConfigGroup","kind":"message","T":()=>messages["youtube.response.config.ColdConfigGroup"],"localName":"coldConfigGroup","jsonName":"coldConfigGroup","repeat":0,"opt":true},
  {"no":7,"name":"hotConfigGroup","kind":"message","T":()=>messages["youtube.response.config.HotConfigGroup"],"localName":"hotConfigGroup","jsonName":"hotConfigGroup","repeat":0,"opt":true},
  {"no":4,"name":"hot_hash_data","kind":"scalar","opt":true,"T":9,"localName":"hotHashData","jsonName":"hotHashData","repeat":0},
  {"no":5,"name":"cold_hash_data","kind":"scalar","opt":true,"T":9,"localName":"coldHashData","jsonName":"coldHashData","repeat":0}
]);
messages["youtube.response.config.ColdConfigGroup"]=new MessageType("youtube.response.config.ColdConfigGroup",[

]);
messages["youtube.response.config.HotConfigGroup"]=new MessageType("youtube.response.config.HotConfigGroup",[
  {"no":138536474,"name":"mediaHotConfig","kind":"message","T":()=>messages["youtube.response.config.MediaHotConfig"],"localName":"mediaHotConfig","jsonName":"mediaHotConfig","repeat":0,"opt":true}
]);
messages["youtube.response.config.MediaHotConfig"]=new MessageType("youtube.response.config.MediaHotConfig",[
  {"no":146311580,"name":"onesieHotConfig","kind":"message","T":()=>messages["youtube.response.config.OnesieHotConfig"],"localName":"onesieHotConfig","jsonName":"onesieHotConfig","repeat":0,"opt":true}
]);
messages["youtube.response.config.OnesieHotConfig"]=new MessageType("youtube.response.config.OnesieHotConfig",[
  {"no":1,"name":"clientKey","kind":"scalar","T":12,"localName":"clientKey","jsonName":"clientKey","repeat":0,"opt":false},
  {"no":2,"name":"encryptKey","kind":"scalar","T":12,"localName":"encryptKey","jsonName":"encryptKey","repeat":0,"opt":false},
  {"no":3,"name":"keyExpiresInSeconds","kind":"scalar","T":3,"localName":"keyExpiresInSeconds","jsonName":"keyExpiresInSeconds","repeat":0,"opt":false},
  {"no":30,"name":"useHotConfigToCreateOnesieRequest","kind":"scalar","T":8,"localName":"useHotConfigToCreateOnesieRequest","jsonName":"useHotConfigToCreateOnesieRequest","repeat":0,"opt":false}
]);
messages["youtube.ump.encrypted.EncryptedInnertubeResponsePart"]=new MessageType("youtube.ump.encrypted.EncryptedInnertubeResponsePart",[
  {"no":1,"name":"encryptedContent","kind":"scalar","T":12,"localName":"encryptedContent","jsonName":"encryptedContent","repeat":0,"opt":false},
  {"no":2,"name":"hmac","kind":"scalar","T":12,"localName":"hmac","jsonName":"hmac","repeat":0,"opt":false},
  {"no":3,"name":"iv","kind":"scalar","T":12,"localName":"iv","jsonName":"iv","repeat":0,"opt":false},
  {"no":4,"name":"compressionAlgorithm","kind":"enum","T":()=>["youtube.ump.encrypted.CompressionAlgorithm", {"0": "NONE", "1": "GZIP", "2": "BROTLI", "NONE": 0, "GZIP": 1, "BROTLI": 2}],"localName":"compressionAlgorithm","jsonName":"compressionAlgorithm","repeat":0,"opt":false}
]);
messages["youtube.ump.encrypted.OnesieInnertubeResponse"]=new MessageType("youtube.ump.encrypted.OnesieInnertubeResponse",[
  {"no":4,"name":"contents","kind":"message","repeat":1,"T":()=>messages["youtube.response.watch.Content"],"localName":"contents","jsonName":"contents","opt":false}
]);
