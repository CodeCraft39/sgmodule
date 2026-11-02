# Local YouTube playback

Current candidate: **request/response build 20261101.6**. The next QX test is the
[request-stage playback test](QX-ECHO-TEST.md), using
[quantumult-x.echo.conf](quantumult-x.echo.conf). It replaces the overlapping
YouTube rules; refreshing scripts alone is insufficient.

## Why the QX transport changed

Normal local filtering worked after key acquisition in the .4 and .5 device
runs. Startup requests could arrive before matching keys. The .5 response-hook
experiment tried to replace those responses with zero bytes, but native QX kept
the original body. Safari and HTTP captures confirmed the failure independently.
That production branch and its retry-budget implementation have been removed.

The later request-stage echo probe passed true empty completion, exact binary
input/output and a public GET fetch. The new QX adapter uses this completion
contract. Missing/mismatched keys produce an empty response before fetching
Google. Matching keys are authenticated, then the exact request is fetched from
Google; the shared response core filters and re-encodes supported Onesie metadata
before the adapter returns the complete HTTP response.

This is opt-in with `localPlayback=true&qxEcho=true` on a QX
`script-analyze-echo-response` rule. There must be **no initplayback response-body
rule** in that profile. A key snapshot is retained per request. A persisted,
bounded per-envelope guard detects internal fetch re-entry instead of allowing
recursive fetches. No undocumented fetch-bypass option is assumed.

The existing [response-hook local profile](quantumult-x.conf) remains available
for comparison; it cannot suppress startup responses before keys arrive.
Shadowrocket/Surge default behavior is unchanged. The legacy default still uses
Maasea's Worker. The new local profile does not contact that service.

## Evidence

| Run | Established result |
| --- | --- |
| [15:56](QX-20261101-155639.json) | Cached-key authentication failed; subsequent ad-free videos were not filtering proof. |
| [18:16](QX-20261101-181644.json) | After key refresh, five ad-bearing responses had 84 placement entries, five slots and six rich items removed; 11 metadata blocks independently verified. Startup remained uncovered. |
| [20:53](QX-20261101-205314.json) | Normal keyed filtering verified again; no bootstrap branch executed. |
| [21:07](QX-20261101-210707.json) | Response-hook empty replacement failed; original ad-bearing body remained and ads appeared. |
| [21:34](QX-20261101-213425.json) | Controlled Safari probe: nonempty bytes replaced correctly; empty bytes/text retained the original response. |
| [21:57](QX-20261101-215745.json) | Request-stage echo: actual zero-byte response, exact binary input/output, public GET fetch round trip. |

The .6 adapter has offline integration coverage, but no native playback result
yet. Real Google POST forwarding, native fetch re-entry and YouTube retry require
the next device test. Ad-free periods alone remain insufficient evidence.
Shadowrocket local playback and Surge remain unverified. `/player/ad_break` is
observed but unfiltered pending a real binary response and schema evidence.

## Shared processing and limits

The generated protocol constants are in `src/protobuf/onesie-schema.ts`;
`onesie.ts` and `web-playback.ts` implement bounded framing, authentication,
crypto and compression. The existing typed endpoint handlers filter decrypted
metadata. Unknown field values survive typed serialization; untouched wire
fields and media frames retain exact bytes. Changed metadata receives a fresh
IV and HMAC. Only supported type-25 encrypted-response-part headers are handled.

The response-hook path passes the original response on errors. The QX echo
candidate instead completes the entire transaction: key failures return empty
200; transport/processing errors return an explicit 502/504/508. It does not
silently deliver an ad-bearing body after a known processing failure. This
behavior needs native playback validation before adoption.

Runtime `YouTubeConfig` stores real keys acquired through config/log_event; it
is necessary for local crypto, not just debugging. The exporter and probes are
optional diagnostics. Keep private captures/keys out of the repository.

## Reproduce offline

Use Node 22.21.1, TypeScript 5.9.3, esbuild 0.25.12 and the pinned
`@protobuf-ts/runtime` described in [the response build docs](../youtube-response/README.md).
All downloads, dependencies, private extracts and intermediates belong in
`/private/tmp/`, with no global installations or persistent environment changes.
Delete the temporary directories after finishing.

```sh
python3 tools/youtube-next/prepare.py \
  /Users/yutingli/Downloads/maasea_codex_handoff.zip \
  /private/tmp/maasea-local/next
python3 tools/youtube-response/check.py \
  --node /private/tmp/maasea-tools/node/node-v22.21.1-darwin-arm64/bin/node \
  --typescript /private/tmp/maasea-tools/typescript/package/lib/tsc.js \
  --esbuild /private/tmp/maasea-tools/esbuild/package/bin/esbuild \
  --dependency-dir /private/tmp/maasea-tools \
  --work-dir /private/tmp/maasea-local/check \
  --captures /private/tmp/maasea-local/next
```

The public suites include eight playback groups, six key-lifecycle groups and
QX echo integration tests. The paired checker also runs legacy parity, wire
preservation, schema, handler and original Next-capture checks. Current counts
and bundle hashes are in `../youtube-response/validation.json`.

When a private playback ZIP and matching key export are available, normalize
them with `prepare.py ZIP KEY_JSON /private/tmp/maasea-local/playback`, then add
`--playback-captures /private/tmp/maasea-local/playback` to run 16 additional
replay checks. They were **not rerun for .6** because the old private uploads no
longer exist at their supplied paths. [REPLAY-RESULTS.json](REPLAY-RESULTS.json)
retains the earlier protocol evidence; it is not a new transport acceptance test.

Protocol references checked during reconstruction:
[LuanRT crypto](https://github.com/LuanRT/googlevideo/blob/main/examples/onesie-request/utils.ts),
[UMP framing](https://github.com/davidzeng0/innertube/blob/main/googlevideo/ump.md),
[encrypted response envelope](https://github.com/davidzeng0/innertube/blob/main/protos/video_streaming/encrypted_innertube_response_part.proto).

The failed .5 test instructions in [BOOTSTRAP-TEST.md](BOOTSTRAP-TEST.md) are
historical. Do not activate the retired bootstrap profile.
