# Local playback test — Quantumult X and Shadowrocket

The .5 bootstrap-empty branch failed native acceptance in the 21:07 trial:
the script requested zero bytes, but the HTTP export retained the original
ad-bearing response and the user saw ads. Disable bootstrapRetry and stop key
reset trials. The next diagnostic is the isolated
[bytes/text completion probe](../youtube-device/bytes-probe/README.md).
[QX-20261101-210707.json](QX-20261101-210707.json) records the evidence and the
remaining native-vs-analyzer ambiguity. Normal local filtering remains verified.

The .5 QX run at 20:53 also confirms normal local filtering, with keys received
before the first playback request. It did not exercise the empty-response retry
branch. See [QX-20261101-205314.json](QX-20261101-205314.json) and the revised
warm-app timing trial in [BOOTSTRAP-TEST.md](BOOTSTRAP-TEST.md).

An opt-in bootstrap experiment is now available in build `20261101.5`.
See [BOOTSTRAP-TEST.md](BOOTSTRAP-TEST.md) for the focused QX test and
`quantumult-x.bootstrap.conf` for its five rules. Normal local mode keeps the
validated .4 behavior; the experiment is not enabled by `quantumult-x.conf`.

Validated request and response build: `20261101.4`. QX local playback filtering
is device-verified after key refresh in the 18:16 run: five ad-bearing responses
reported 84 placement entries, five slot entries and six rich items removed.
Independent decryption verifies all 11 processed metadata blocks and empty
placement/slot fields in the captured Player output. See
[QX-20261101-181644.json](QX-20261101-181644.json).

One startup response (session 36) passed through before fresh keys were available;
this run does not prove filtering for that bootstrap case. No player/ad_break
requests were captured. Shadowrocket and Surge local playback remain unverified.
The earlier stale-key failure and its fix are recorded below.

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
   `response-compat-20261101.4`. If the cached keys need refreshing, check
   `reason=config-refresh` on log_event, then
   `event=config-refreshed persisted=true` on its response.
   Playback requests should reach `reason=key-match`. A successful response logs
   `action=local-body` and `verified` greater than zero. Ad removal additionally
   requires a positive `adPlacementsRemoved`, `adSlotsRemoved`, `richItemsRemoved`
   or `panelsRemoved` count; `updated` alone can be a PiP/background change.
   `local-pass` can be a valid no-op. An ad-free interval alone is not proof.
5. Keep the log level at Error: it preserved the required script diagnostics in
   the previous run. Send the HTTP ZIP and the separate QX tunnel log from this
   run, plus the key export afterward if using the already installed export rule.
   Do not reset or clear YouTubeConfig before this test: it must exercise recovery
   from the known stale cache. Keep the same five installed rules and MITM hosts.

The export-only diagnostic rule can remain during this investigation; it does
not replace the playback handlers. After the playback run, open the literal
`https://example.com/yt-local-capture/export` in Safari and retain the JSON
privately. Do not enable the earlier request/response capture observers, which
would overlap the production scripts. The temporary export rule and its MITM
host can be removed after the key issue is device-validated.

## QX 15:56 run: playback filtering failed authentication

The separate Error-level tunnel log contains the script diagnostics. All four
initplayback responses (sessions 36, 46, 61, 71) passed through with
`authentication-failed`; later ad-free playback is not evidence of local
filtering. Browse and Next processing did execute. The HTTP archive can contain
post-script bodies: session 49 was reduced from 356,692 to 245,032 bytes on device,
and replaying that captured result is correctly a no-op.

Session 48 contains a separate content-lockup ad panel. Response build
`20261101.3` removes it offline (153,439 to 99,938 bytes), with ordinary panels
and unknown siblings covered by tests. This does not fix or explain the playback
key failure. See `QX-20261101-155639.json` for the measured results.

The export `yt-local-capture 3.json` confirms that QX still stored the same
32-byte client key and 53-byte encrypted key as both earlier snapshots. Those
keys authenticate the earlier archive, but match none of the four new requests
and authenticate none of their seven encrypted response blocks. The .2 local
request path returned before Maasea's key comparison/invalidation; all six
log_event requests retained the app's hot-hash header and returned no new keys.

Build .4 restores request-key comparison in local mode and invalidates only the
selected app's mismatched cache. It requests hot configuration until the stored
pair is associated with the current server-provided hot hash; legacy records
without that association therefore refresh on the next log_event. Config
responses save the pair and its optional hash together. If a server omits the
hash, processing can still use the keys, but the next log_event requests config
again. Local errors keep the original request/response. Filtering no longer
republishes unchanged YouTubeConfig snapshots, preventing awaited playback from
overwriting newer keys. The existing legacy mode retains its previous behavior.

The captured four request bodies now trigger mismatch invalidation in offline
replay, and all six captured log_event headers request fresh config. Six public
lifecycle test groups cover stale-cache recovery, hash association, encoding,
storage errors, legacy acquisition and concurrent refresh. They use a synthetic
config response; Google returning fresh keys and the first video's ordering still
need a QX run. A request that completes before keys arrive can still pass through.

## Then test Shadowrocket

After QX key refresh and playback filtering are validated, disconnect QX and
connect Shadowrocket. Disable overlapping
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
passes initplayback through to Google without redirecting it, checking the
request key and invalidating a mismatched app cache. The response handler
verifies/decrypts supported Onesie metadata, reuses
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

The standalone `/next` filter additionally recognizes the captured content-lockup
panel from the 15:56 QX run, as well as the earlier buttoned
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

The eight public playback unit groups and six public key-lifecycle groups need
no private files and run as part of the paired checker. The additional 16 playback replay groups use the private
normalized capture. Existing codec/handler/audit checks also run. Only non-secret
lengths, counts and response hashes are saved in the repository.
