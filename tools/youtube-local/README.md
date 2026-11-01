# Local playback test — Quantumult X and Shadowrocket

The supplied capture was sufficient. No more capability probes are needed for
this QX device before the first local filtering test.

## What to do on the iPhone

1. Commit and push BOTH rebuilt files: `Script/Youtube/youtube.request.js` and
   `Script/Youtube/youtube.response.js`. Refresh their cached resources in QX.
2. Replace the overlapping YouTube rewrites with `quantumult-x.conf` in this
   directory. Keep unrelated rules and merge its MITM hosts into your list.
   Disable the earlier initplayback capture observers and the old analyze-echo
   request rule. Only one request handler and one response handler should match
   each initplayback transaction.
3. Force-quit/reopen YouTube. Play a video that usually shows an ad. Note ads,
   startup, stalls, seeking and switching to another video.
4. Copy the script record for `/initplayback`. Expect build
   `response-compat-20261101.2`, `action=local-body`, `verified` greater than zero,
   and `updated` greater than zero on an ad-bearing response. `local-pass` can be
   a valid no-op; an ad-free interval alone is not proof.
5. Send that script record and the playback result. If playback fails or ads
   remain, retain a private HTTP capture of that run, as you did for this archive.

This test needs no example.com URL. The old export/reset rules can be removed.
If you wish to clear their private snapshots first, use the old reset rule before
removing it. Keep your capture ZIPs and key JSON private.

## Then test Shadowrocket

After the QX run, disconnect QX and connect Shadowrocket. Disable overlapping
YouTube modules and the earlier capture observers, then import this directory's
`shadowrocket.sgmodule`. Refresh both script resources. MITM must remain enabled
with the trusted certificate and the listed hosts.

Force-quit/reopen YouTube and repeat the same playback checks and log collection.
This module enables `debug` and `localPlayback` through arguments. The build log
labels this adapter `Surge-compatible`, including on Shadowrocket; report which
app you used. Its native crypto/compression APIs are still device-unverified.
If you see `unsupported-crypto` or `unsupported-compression`, send the log; it
means the local path did not run successfully. No new capability probe or
example.com URL is required before attempting this test.

## What changed

`localPlayback=true` is an explicit opt-in on both scripts. The request handler
passes initplayback through to Google without redirecting it or invalidating
keys. The response handler verifies/decrypts supported Onesie metadata, reuses
our existing typed filters, recompresses/re-encrypts it with a fresh IV and HMAC,
and rebuilds UMP framing. It makes no fetch to Maasea or another processing server.
It still uses the runtime YouTubeConfig keys acquired by config/log_event.

The local mode uses native Web Crypto and Compression Streams. Your QX probe
passed these in request and response contexts. Unknown/unhandled frames and
media remain raw. Invalid authentication, unsupported APIs/compression, size
limits and processing errors pass the original response through without a
partial transformed body or partial cache writes. The asynchronous operation has
an approximately three-second deadline, with 8 MiB input/per-metadata and 16 MiB
cumulative expanded-metadata bounds. This is not a synchronous CPU watchdog;
actual device memory, latency and stability still require validation.

The default remains the checkpoint's legacy request behavior when the option is
absent. Existing SR/Surge configurations therefore retain their Worker path for
comparison. Local mode is implemented through the common adapters, but actual
SR/Surge native crypto availability and playback have not been validated. Do not
call all-client Worker removal complete yet. After local device validation, the
legacy path and temporary artifacts can be reviewed for removal.

Only encrypted-response-part Onesie headers (type 25) are processed in this
candidate. That is the format in this capture. Legacy encrypted-player type 0
and other unverified variants pass unchanged. `/player/ad_break` also remains
unfiltered. Key rotation can cause a response's key to differ from the currently
cached key; authentication then fails open. Testing video switches and key
refresh is part of the remaining device work.

The standalone `/next` filter additionally recognizes the captured buttoned
panel layout, together with `/pagead/` inside its expected data container. That
capture contains ad-click URLs and advertiser data. Ordinary buttoned panels
without the ad marker are retained. This is not a blanket layout blacklist.

## Proven from the private archive

Archive: `2026-11-01-124630.zip`, with `yt-local-capture 2.json`.
The detailed non-secret results are in `REPLAY-RESULTS.json`.

- Request 12 is 6,291 bytes. Its encrypted client key matches the snapshot.
  HMAC verification, AES-CTR decryption and gzip decompression succeed. The
  inner target is `/youtubei/v1/get_watch`.
- The HTTP response is chunked: 2,005,864 captured bytes become 2,004,890 body
  bytes, exactly matching the probe. HTTP chunk framing is removed only by the
  offline preparation tool; the on-device script receives the decoded body.
- All 140 UMP records parse completely. Two type-25 metadata blocks authenticate
  and decrypt. The first contains five ad placements and one ad slot; those are
  removed, and existing PiP/background logic is retained. The second contains a
  Next response, which receives the existing rich-item filtering.
- Both rebuilt blocks verify and decode again after re-encryption. Unknown
  message values survive serialization. All media, Onesie headers and unrelated
  UMP records remain byte-identical. Only the two changed metadata data records
  are replaced. Fresh random IVs intentionally make ciphertext differ per run.
- Standalone Next record 16 contains a different ad-marked panel identifier from
  the older captures. The former predicate therefore returned removed=0. The new
  paired predicate removes one panel: 266,475 → 202,476 bytes. Record 15 remains
  unchanged at 12,160 bytes. The three older replay hashes still match.

These results prove local processing of this captured protocol. They do not
prove that the YouTube app will skip ads, accept every server variant, or perform
well on the device. No playback claim is based solely on the capability probe.

Independent protocol references used and checked against wire evidence:
[LuanRT crypto example](https://github.com/LuanRT/googlevideo/blob/main/examples/onesie-request/utils.ts),
[UMP framing](https://github.com/davidzeng0/innertube/blob/main/googlevideo/ump.md),
[encrypted response envelope](https://github.com/davidzeng0/innertube/blob/main/protos/video_streaming/encrypted_innertube_response_part.proto).
Our code lives in src/protobuf/onesie.ts and web-playback.ts; protocol constants
are generated from schema/youtube.json, and filtering reuses response/endpoints.ts.

## Reproduce offline

All tools, private inputs and intermediate files must stay in /private/tmp and
be removed after use. There are no global installs or persistent environment
changes. With the pinned tools/runtime prepared as described by the response
build documentation:

```sh
python3 tools/youtube-local/prepare.py \
  /Users/yutingli/Downloads/2026-11-01-124630.zip \
  '/Users/yutingli/Downloads/yt-local-capture 2.json' \
  /private/tmp/maasea-local-work/replay
python3 tools/youtube-next/prepare.py \
  /Users/yutingli/Downloads/maasea_codex_handoff.zip \
  /private/tmp/maasea-local-work/old-captures
python3 tools/youtube-response/check.py \
  --node /private/tmp/maasea-refactor/node/node-v22.21.1-darwin-arm64/bin/node \
  --typescript /private/tmp/maasea-refactor/typescript/package/lib/tsc.js \
  --esbuild /private/tmp/maasea-refactor/esbuild/package/bin/esbuild \
  --dependency-dir /private/tmp/maasea-refactor \
  --work-dir /private/tmp/maasea-refactor/check \
  --captures /private/tmp/maasea-local-work/old-captures \
  --playback-captures /private/tmp/maasea-local-work/replay
```

The seven public playback unit groups need no private files and run as part of
the paired checker. The additional 16 playback replay groups use the private
normalized capture. Existing codec/handler/audit checks also run. Only non-secret
lengths, counts and response hashes are saved in the repository.
