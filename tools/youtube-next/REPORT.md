# Maasea /next investigation — 31 October 2026

Historical isolated-patch report. The original bundle is now preserved at
`tools/youtube-response/fixtures/upstream.response.js`; the production response
file now builds from TypeScript. See `../youtube-response/README.md` for current
paired-script status. The evidence and capture results below remain applicable.

The field-42 hypothesis is verified for the two larger captures: Maasea's
generated decoder leaves a product-ad panel opaque, so its renderer filter
cannot reach it. The experimental patch exposes and removes that panel offline.
This is a filtering coverage defect, not evidence of a Quantumult X binary-body
conversion defect or proof that video-ad playback has been blocked.

The deliverable is `Script/Youtube/youtube.response.qx.js`, a complete patched
bundle. Its new behavior is deliberately limited to the observed product-ad
panel. It is ready for an iPad trial, not validated as a general ad blocker.

## Inputs and provenance

- Handoff archive SHA-256:
  `ebeb01315c5783806902c1f9eeb65cbd55cb26aab7d0ec0ace2c86fc8a2f49e2`.
- The uploaded debug script contains the repository's original response bundle
  verbatim, surrounded by a diagnostic wrapper. Original bundle SHA-256:
  `f98483d5f5017514f82502253c0db5ce2d4ffb7839887aa2cadc22666f5a7f12`.
- Experimental changes comprise a diagnostic banner and dynamic message types
  that connect field 42 to Maasea's existing `E` / section-list decoder. They also
  declare response context at field 1. No unminified Maasea source was sought.
- All three HTTP responses are `application/x-protobuf`, `Content-Encoding: br`.
  Their archived body lengths match the compressed Content-Length. Offline
  replay therefore uses Brotli-decompressed bytes, not the archive bytes directly.
- Raw requests, headers and response payloads are kept out of the repository.
  `results.json` records hashes, lengths, field IDs and non-content diagnostics.

## Wire reconstruction

| Capture | Compressed bytes | Decoded bytes | Top-level fields in wire order |
| --- | ---: | ---: | --- |
| 204503 | 4,137 | 10,629 | 1, 13, 14, 47, 777 |
| 213054 | 23,840 | 155,475 | 1, 13, 14, 15, 26, 42, 47, 777 |
| 213333 | 25,146 | 132,541 | 1, 13, 14, 15, 26, 42, 47, 777 |

Every listed field has wire type 2 except field 47, which has wire type 0 and
value 1 in all three responses. There are no top-level fields 7 or 8 in this
sample. The earlier eight-field claim is correct for the two larger captures,
not for the smallest one.

The exact product-panel item path is:

```text
42 → 357104971 → 2 → 361256913 → 1 → 138681066
   → 3 → 49399797 → 1 → 50195462 → 1
```

Both larger captures contain exactly one item at this path. Its payload lengths
are 106,190 and 83,071 bytes. The renderer ID is `153515154`, an ElementRenderer,
not specifically a video renderer despite Maasea's `videoWithContextRenderer`
property name. Within the item:

```text
153515154 → 172660663 → 2 → 183314536 → 1
    UTF-8 identifier: panel_product_feed_standard_layout.eml-fe|727db186527db03f
153515154 → 172660663 → 1 → 168777401 → 5
    opaque payload containing /pagead/ URLs
```

The supplied partial schema has the correct observed field-42 chain. Its claim
that this establishes a general watch/recommendation tree is too broad: the
actual sampled item is a product-ad panel. Field 14 contains extension
62960614 in all captures. Field 15 contains extension 361588638 in the larger
captures, with nested field 2 → 153515154. Their internal extension names remain
unresolved. `next-observed.proto` records verified nesting, leaves opaque data
as bytes, and avoids assigning a video-specific meaning to ElementRenderer.

## Independent implementations

| Source | Comparison and limits |
| --- | --- |
| [Basket5125/YoutubeLocalProxy, pinned android_full_next.proto](https://github.com/Basket5125/YoutubeLocalProxy/blob/87cca937cfe2add1a52863bacd7ef13a167f8e17/app/src/main/proto/android_full_next.proto) | Root field 7 → 51779735 → 1 → 49399797 → 1 → 50195462 → 1 agrees with Maasea's legacy nesting. Root field 8 is continuation contents, not necessarily an action. Its field 14 is player overlays. This implementation targets old Android clients; it does not describe the observed field-42 extension chain. |
| [davidzeng0/innertube, pinned WatchNextResponse](https://github.com/davidzeng0/innertube/blob/b04d48d000a84befa5d7b018553b04fa4f98ebd8/protos/youtube/api/innertube/watch_next_response.proto) | Names field 14 `player_overlays`, 15 `companion_ads`, 26 `on_ui_ready`, 42 `below_player_immersive_layout`, 47 `is_ad_playback`, and 777 `framework_updates`. Its definitions are generated from a February 2025 schema snapshot. The repository is archived; these names are independent corroboration, not a current Google contract. |
| [Independent ElementRenderer definition](https://github.com/davidzeng0/innertube/blob/b04d48d000a84befa5d7b018553b04fa4f98ebd8/protos/youtube/api/innertube/element_renderer.proto) and [IdentifierProperties](https://github.com/davidzeng0/innertube/blob/b04d48d000a84befa5d7b018553b04fa4f98ebd8/protos/youtube/elements/identifier_properties.proto) | Corroborate IDs 153515154, extension 172660663, and identifier properties 183314536 → string field 1. The newer outer extension IDs are absent from this snapshot; their nesting comes from the captures. |
| [LightTube next_response.proto](https://github.com/lighttube-org/InnerTube/blob/1c9263010eb3643239136125f075a560672e92d2/Protobuf/next_response.proto) and [general.proto](https://github.com/lighttube-org/InnerTube/blob/1c9263010eb3643239136125f075a560672e92d2/Protobuf/general.proto) | Independently use root contents 7, tracking params 13, framework updates 777 and renderer IDs 49399797/50195462. This project is also archived and supplies no field-42 confirmation. |
| [YouTube.js protobuf tree, pinned](https://github.com/LuanRT/YouTube.js/tree/09a459b8757a04f74766bdca4c53cd4ebfc7544d/protos) | A separate maintained implementation, but its checked protobuf tree provides WatchNext request definitions, not a matching binary WatchNext response schema. Its JSON handling cannot validate these numeric response extension IDs. |

Agreement among legacy schemas supports the existing field-7/8 path. It does
not justify replacing those fields with 42 or treating 42 as a universal new
location for recommendations. No reviewed independent implementation confirms
the complete newer extension chain.

## Diagnosis and minimum changes

Facts established by source inspection and replay:

1. Original `re` decodes only top-level fields 7 and 8. The protobuf-ts runtime
   retains other fields through its unknown-field symbol.
2. `Ir` searches named, decoded `richItemContents` arrays. It does not descend
   into that unknown-field storage. On every supplied response it reports no
   body change and the script completes with `$done({})`.
3. The experimental schema reaches the product panel. Maasea's heuristic sees
   `pagead` in its opaque data and learns a blacklist entry for its layout.
4. Experimental decode/encode without filtering preserves decoded known values
   and unknown fields at every decoded node in these captures. On the larger
   responses it changes ordering, so it is not byte-identical. This is not by
   itself evidence of corruption. Its filtered output lengths are 49,267 and
   49,452 bytes.

The patch uses a small wire reader/editor on the verified path. It removes a
complete item only when its exact layout identifier (ignoring the pipe suffix)
AND `/pagead/` in the expected data container match. It does not learn or consult
Maasea's global renderer/layout cache for this new path. This avoids treating
every future item with an observed layout as an ad based on one earlier sample.
This is still an evidence-based predicate, not proof against all false positives.

For these field-42 responses it copies all other encoded fields verbatim and
recalculates only the lengths of changed ancestors. With no match it returns
no replacement. Truncation, invalid wire data and unsupported structure fail
open through the bundle's existing catch/exit path, without partial output.
The original field-7/8 filtering and other endpoint handlers remain available.
For a synthetic response containing both old and new paths, both filters run;
the legacy generated encoder still has its original ordering behavior.

No QX ArrayBuffer bridge changes are needed for the established input behavior.
Fields 14, 15, 47 and 777 are preserved. In particular, flipping `is_ad_playback`
would misdescribe an ad response rather than remove its underlying video ad.
Blindly deleting overlays could also remove playback controls. Those are not
supported fixes for this sample.

## Offline validation

81 assertions pass using Node's VM with mocked QX globals and three decompressed
captures. The independent test wire reader uses BigInt; production parsing uses
a separate bounded implementation. Tests cover:

- Original and experimental replay, output as ArrayBuffer, exactly one `$done`.
- Known declarations in the reconstructed proto checked against wire types and
  nested payloads; this is structural validation, not a `protoc` compilation.
- Removal of one product panel from each larger response and none from 204503.
- Byte-exact preservation of every other field, recursively through ancestors.
- Unknown bytes, duplicate fields, nonminimal scalar encodings, fixed32,
  fixed64 and groups; repeated matched items alongside an unmatched item.
- Negative controls with the layout changed or every `/pagead/` marker changed,
  plus ad data outside the verified path.
- Idempotence, a stale whitelist, empty input, malformed input and overflow.
- A synthetic legacy ad item, combined legacy/modern response, and browse smoke
  test. These are not physical-device or full-endpoint integration tests.

| Capture | Patched decoded bytes | Removed panels | Result |
| --- | ---: | ---: | --- |
| 204503 | 10,629 | 0 | unchanged / no replacement |
| 213054 | 49,267 | 1 | ArrayBuffer replacement |
| 213333 | 49,452 | 1 | ArrayBuffer replacement |

The patched and experimental output lengths happen to agree. The patch's
preservation guarantee is stricter for these samples because unaffected fields
retain their original order and encoding. This does not establish equivalence
on other traffic. There is no captured organic field-42 response in this set;
negative controls are synthetic.

## Reproduce and maintain

Run from the repository root with Python 3 and Node.js:

```sh
python3 tools/youtube-next/prepare.py /Users/yutingli/Downloads/maasea_codex_handoff.zip /private/tmp/maasea-replay
python3 tools/youtube-next/build.py
node tools/youtube-next/test.mjs /private/tmp/maasea-replay/captures /private/tmp/maasea-replay/scripts_and_schema
```

The build pins the original bundle hash and fails when upstream changes so the
integration is reviewed explicitly. Edit `next-wire.js`, then regenerate the
deliverable. Do not edit generated minified schema classes. The original
`youtube.response.js` is untouched. Test metadata is in `results.json`.

## iPad trial and remaining unknowns

1. Point the existing working QX response-script rule at the patched bundle
   through a URL/local resource QX can load, refresh its script cache, and keep
   the already-verified interception and binary-response configuration. Use one
   active response handler for each request. The file is not hosted or deployed
   by this investigation.
2. For an ad-bearing response, save the associated script log and input/output
   bodies and note what appeared: product panel, companion banner, or playback
   ad. Logs have the form `[QX-NEXT] removed=1 field42=true legacy=false
   bytes=155475->49267` for the second supplied capture. New live responses will
   have different lengths. Correlate each log to its specific HTTP transaction.
3. Verify QX presents decompressed bytes to the script and delivers the replaced
   body correctly despite the original response's compression headers. The mock
   tests the ArrayBuffer boundary, not QX's real compression/header handling.
4. Check panel removal, ordinary recommendations, scrolling/continuation,
   controls, comments, switching videos and playback stability. Capture an
   organic field-42 response to assess false-positive risk on real content.
5. If the video ad still plays after `removed=1`, this is compatible with the
   offline findings: the patch removes one UI panel and leaves other ad payloads.
   Capture the relevant `/player`, `/get_watch`/Onesie and media transactions
   together with `/next` to locate the actual playback-ad decision. These captures
   alone cannot establish which endpoint or local state initiated playback.
6. A `removed=0` log means no verified match; an unchanged ad-bearing response
   without 42 is expected. Do not generalize a quiet/ad-free period into success.

Not established: elimination of pre-roll/mid-roll video ads; correct behavior
across all account/app/server variants; why Shadowrocket appears more reliable;
whether the same responses reach both clients; or whether QX accepts and renders
the replacement on this iPad. There is no paired Shadowrocket capture or live
device execution in the supplied evidence. The semantic label `is_ad_playback`
is corroborated by an independent reverse-engineered schema, not by an official
Google specification.
