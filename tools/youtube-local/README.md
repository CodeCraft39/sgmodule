# Local YouTube playback

Current candidate: **request/response 20261102.7**. Native validation is pending
for this build. Earlier **20261101.6** QX normal local playback and forced
missing-key recovery are verified for the captured runs below.

- [09:24 run](QX-20261102-092452.json): five native fetch/filter/echo pairs; logs
  record 31 placement entries, four slots and 11 rich items removed. The final
  pair independently decrypts to zero placements/slots.
- [12:40 run](QX-20261102-124053.json): exactly one forced missing-key request
  produced a real empty HTTP 200. Within about two seconds, the app completed a
  direct `/get_watch` response for the same video, with empty Player ad fields;
  media delivery followed before keys refreshed. Both config snapshots decode,
  the fresh pair matches the export and later hot-hash headers use the new hash.
  Warm-up traffic independently confirms 12 placements, one slot and three rich
  items removed. The user reports normal playback without ads.

Recovery used direct `/get_watch`, not an encrypted initplayback retry. No
production change is required for that observed fallback. The wrapper is now a
completed diagnostic; disarm it and restore
[quantumult-x.echo.conf](quantumult-x.echo.conf) for normal use. Remove temporary
diagnostic assets after the device configuration no longer references them.
The [first Shadowrocket local run](SR-20261102-191430.json) failed native
acceptance: keys matched, but six playback response callbacks passed through
with unsupported-crypto and none performed local filtering. Four ad_break calls
were also observed without payload bodies. The
[second runtime matrix](SR-RUNTIME-20261102-201841.json) retains valid .2 tunnel
results despite the stale .1 Safari page: Auto/WebView expose secure randomness
but no crypto.subtle; JSC lacks both. Auto/WebView also reject the probe's bound
timer invocation. A repeated capability matrix is unnecessary before trying .7.
The candidate bundles maintained portable AES/HMAC and gzip, uses detached timers,
and keeps the native backend on complete Web Crypto hosts. Use explicit
`engine=webview` in [the Shadowrocket test profile](shadowrocket.sgmodule).
Native secure randomness, timer behavior, memory use and real filtering still
need validation; API presence alone establishes none of these.
Surge remains untested.

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
| [2 Nov 09:24](QX-20261102-092452.json) | Five real Google POST/fetch/filter/echo pairs verified; 518 unaffected frames exact. Final pair independently decrypts to zero placements/slots. Missing-key branch did not run. |
| [21:57](QX-20261101-215745.json) | Request-stage echo: actual zero-byte response, exact binary input/output, public GET fetch round trip. |
| [2 Nov 12:40](QX-20261102-124053.json) | Forced empty 200 verified; same-video direct get_watch fallback and media delivery preceded fresh-key acquisition. Native missing-key recovery passed for this run. |

The .6 normal transport and forced missing-key fallback are native-verified in
these runs. The direct fallback output contains no placement or slot entries;
its original response is unavailable, so no exact removal count is assigned to
that fallback response. Native logs, captured framing, decrypted matching video
identifiers and user observation together support recovery. This does not prove
every startup ordering, server variant or native resource boundary. `/player/ad_break`
is observed but unfiltered pending a real binary response and schema evidence.

## Shared processing and limits

The generated protocol constants are in `src/protobuf/onesie-schema.ts`;
`onesie.ts` implements bounded framing and authenticated rewrite orchestration.
`playback-runtime.ts` selects native `web-playback.ts` or maintained portable
primitives in `portable-playback.ts`. The existing typed endpoint handlers filter decrypted
metadata. Unknown field values survive typed serialization; untouched wire
fields and media frames retain exact bytes. Changed metadata receives a fresh
IV and HMAC. Only supported type-25 encrypted-response-part headers are handled.

Both bundles contain the integrity-pinned `@noble/ciphers`, `@noble/hashes` and
`pako` dependencies listed alongside the Protobuf runtime in
[dependencies.json](../youtube-response/dependencies.json). The device downloads
no runtime libraries and local mode calls no Worker. Native getRandomValues
remains mandatory; no weak RNG fallback is provided. Gzip uses the public Pako
streaming API with 64 KiB output chunks, CRC/trailer validation and an 8 MiB limit.
Brotli remains native-only. The three-second deadline rejects late results before
publishing bytes or persisting state, but cannot interrupt synchronous JavaScript;
input/output bounds limit work, not exact CPU time or native memory consumption.

The response-hook path passes the original response on errors. The QX echo
candidate instead completes the entire transaction: key failures return empty
200; transport/processing errors return an explicit 502/504/508. It does not
silently deliver an ad-bearing body after a known processing failure. Normal playback and one forced missing-key case have native coverage; native
timeout/size/forced-reentry failures still have only offline coverage.

Runtime `YouTubeConfig` stores real keys acquired through config/log_event; it
is necessary for local crypto, not just debugging. The exporter and probes are
optional diagnostics. Keep private captures/keys out of the repository.

## Reproduce offline

Use Node 22.21.1, TypeScript 5.9.3, esbuild 0.25.12 and the pinned
build dependencies described in [the response build docs](../youtube-response/README.md).
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

## Candidate .7 offline evidence

The paired checker passes the original 332 codec and 40 behavior comparisons,
three Next golden captures, request/echo/key lifecycle/architecture regressions,
strict TypeScript and reproducible builds across dependency directories. Sixteen
portable-runtime groups cover public AES vectors, independent native crypto
interoperability, full 128-bit counter carry, authentication rejection, secure RNG
requirements, gzip CRC/truncation/expansion limits and detached/deadline timers.
The shipped response bundle filters a synthetic encrypted Player without subtle,
streams, native UTF-8 encoders or BigInt. All three original captured Next bodies
also reproduce their golden results inside synthetic encrypted wrappers under
both backends; unaffected frames and opaque fields remain exact.

These synthetic wrappers do not constitute a new native encrypted playback
replay. The later QX/SR uploads were unavailable for the final .7 replay; historical
native reports remain evidence for their recorded builds only. Shadowrocket .7
needs real local-body logs with positive verified/updated counters and real ad
removal; ad-free intervals alone are insufficient. QX also needs a short .7
regression test because the shared bundle and timer invocation changed.
