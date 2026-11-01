# Paired YouTube script reconstruction

Current builds: `request-compat-20261101.1` and `response-compat-20261101.1`.
The source/runtime consolidation is described in [ARCHITECTURE.md](ARCHITECTURE.md).
The pre-device audit findings remain resolved; see [../youtube-audit/RESOLUTION.md](../youtube-audit/RESOLUTION.md).
Routine logs require debug=true; the supplied QX test profile enables it through remote script-URL fragments.

The author's proxy-script-template has also been checked against this project;
see [TEMPLATE-REVIEW.md](TEMPLATE-REVIEW.md) for the pinned adapter comparison,
the existing identical SRSS sources, and the unverified QX storage-NUL hypothesis.

Both distribution files now build from source:

- `Script/Youtube/src/request/` → `youtube.request.js`
- `Script/Youtube/src/response/` → `youtube.response.js`

This is a reconstruction of the shipped behavior, not the author's recovered
TypeScript. Original bundles remain under each tool directory's `fixtures/`.
The older `youtube.response.qx.js` is the isolated field-42 experiment; use the
paired `youtube.request.js` / `youtube.response.js` for the current test candidate.
The upstream URLs in the user's existing rules still load upstream code, not
these local changes. Nothing has been published.

## GitHub findings and causal limits

Reviewed 31 October 2026:

- [#106](https://github.com/Maasea/sgmodule/issues/106) reports a QX regression.
  A commenter says excluding initplayback with `#regout=initplayback` restored
  operation, explicitly without investigating why. This is the strongest direct
  lead for prioritizing initplayback, not a verified root cause or proof of our
  307 candidate. There is no proposed confirmed QX fix in that discussion.
- [#110](https://github.com/Maasea/sgmodule/issues/110) reports mid-roll delivery
  through `/youtubei/v1/player/ad_break` on Loon. The supplied original regex
  excludes that endpoint: the slash after player cannot match `?` or end-of-URL.
  This configuration gap is independently reproducible. The reported 680 KB
  body and timing are the reporter's observations; the issue has no binary body
  attached and no confirmed fix. It affects endpoint coverage across clients,
  not specifically QX's ArrayBuffer conversion.
- [#104](https://github.com/Maasea/sgmodule/issues/104) includes reports of Surge
  playback stalls, with differing user observations. Therefore working on the
  user's Shadowrocket installation does not establish universal behavior across
  accounts, app/server variants or time.
- [#103](https://github.com/Maasea/sgmodule/issues/103) reports a response TypeError
  on Surge; the maintainer suggests refreshing external resources. It contains
  no QX-specific diagnosis.
- [#108](https://github.com/Maasea/sgmodule/issues/108) describes Shadowrocket
  playback instability which later improved without a confirmed script fix.
- An independently published [QX mirror](https://github.com/macong0420/quantumultx-youtube-adblock)
  was also inspected. Its request wrapper adds diagnostics around the same
  minified Maasea implementation; it does not demonstrate a corrected completion
  contract. Its documentation's QUIC explanation is not proof for this iPad.

Three separate problems must remain distinguishable:

1. **Request transport/API compatibility:** original initplayback branches bypass
   platform adapters. The fallback emits Surge's nested response shape. The QX
   candidate uses the documented flat echo response shape and HTTP 307 to the
   unchanged Worker URL. This still needs a device redirect/replay check.
2. **Response-schema coverage:** all supplied captures omit legacy next fields
   7/8, so the original response filter cannot reach the observed field-42 panel.
   That explains those offline no-ops, independently of the request-client API.
3. **New endpoint coverage:** ad_break is excluded by the old rule, and no
   response schema/body from that endpoint is available here.

The user's posted three rules use QX rewrite syntax; rule conversion/loading is
another surface to inspect. A QX rule matching a URL does not establish that its
script's return object has the right API shape.

## Issue 110 handling

It needs to be addressed for complete mid-roll coverage. This change adds safe
observation in the QX response rule, not speculative filtering. The reconstructed
response dispatcher matches complete endpoint paths: `/player/ad_break` is logged
as `reason=unverified-ad-break-schema` and passed through unchanged. It cannot
accidentally enter the ordinary Player decoder through substring matching.

Do not merely add ad_break to the old regex while retaining the old dispatcher:
the old `url.includes('player')` route would interpret it as a Player response.
That handler also enables background/PiP and unconditionally declares a body
change. The issue itself warns that a distinct response structure may be needed.

To implement filtering, retain one complete ad_break transaction with its binary
response and Content-Encoding, correlate it with playback and ad-report timing,
then reconstruct its actual fields. There are no ad_break or initplayback
transactions in the supplied handoff. Blocking the endpoint, clearing its body,
or borrowing Player field numbers is not justified by that evidence.

## Maintained source

- `schema/youtube.json`: one authoritative schema and endpoint/path definition,
  with evidence provenance. It covers 83 recovered response messages, eight
  observed immersive-view messages and two request messages.
- `generate.py`: produces interfaces, typed response codecs, request field
  constants, wire paths and .proto views. Builds reject stale generated output.
- `handlers.ts` and `endpoints.ts`: concrete typed handlers and an endpoint map
  checked against the schema. The broad Message/any facade has been removed.
- `src/protobuf/`: shared bounded wire reading, lossless editing, typed traversal,
  UTF-8 support, schema validation, and a small public-API runtime adapter.
- `filters/immersive.ts`: client-independent product-panel filtering for standalone
  and embedded Next; field paths come from generated schema constants.
- `main.ts`: native binary adapters, shared storage, output and safe diagnostics.
- `dependencies.json`: pinned @protobuf-ts/runtime 2.11.1 with archive integrity.
  The extracted opaque runtime has been removed. The upstream dependency is
  prepared only in /private/tmp and bundled at build time.

These remain evidence-backed partial schemas. Unknown fields remain preserved;
partial coverage does not imply complete recognition of all ad formats.
Generated writers preserve declaration order. Unchanged raw fields retain their
original encoding during lossless edits; typed re-encoding may normalize ordering
and tags while preserving unknown values. The original two empty codecs discarded
unknown data; preserving it remains an intentional difference. Malformed known
wire types/strings now fail open before any filtered body or cache is committed.
The legacy rich-item cache policy remains unchanged.

## Verification

`validation.json` records:

- 83 recovered and eight additional observed-view message types; 332 original-codec checks (default/populated input, with/without an
  unknown field). The two empty-codec preservation differences are tested
  explicitly, rather than claimed as parity.
- 40 output/storage behavior comparisons with the original across endpoint
  handlers and native QX/Surge-compatible output. Custom-caption comparison is
  performed on the Surge adapter because the original QX adapter ignores those
  arguments. Synthetic fixtures cannot establish real-client compatibility.
- All three uploaded next responses replayed after Brotli decompression. Modern
  output hashes match the independently recorded golden results; no-op input stays
  unchanged. QX and Surge-compatible adapters produce equal payload bytes.
- Ad-break observation passes through and does not mutate data; malformed
  inputs complete with no replacement. Strict TypeScript checking passes.

The request suite passes 16 groups, including 100 generated decoder
variants. Its build is reproducible. Eight additional audit-regression groups pass, including nested capture replay
and repaired-key request handoff. Twelve architecture groups additionally cover
wire preservation, schema validation, Unicode and operation without native
TextEncoder/Decoder or BigInt. Compile-only negative contracts verify message
typing. Both reconstructed bundles remain device
test candidates, not proof of ad-free playback.

## Build and test

Use the same pinned temporary tools described in `../youtube-request/README.md`.
All downloaded tools, libraries and intermediates must live in `/private/tmp/`,
with no global installs or persistent environment changes. They are removed at
the end of this investigation. Recreate them before using these commands:

```sh
python3 tools/youtube-response/dependency.py --directory /private/tmp/maasea-refactor
python3 tools/youtube-response/generate.py --check
python3 tools/youtube-response/build.py \
  --esbuild /private/tmp/maasea-refactor/esbuild/package/bin/esbuild \
  --dependency-dir /private/tmp/maasea-refactor
python3 tools/youtube-next/prepare.py /Users/yutingli/Downloads/maasea_codex_handoff.zip /private/tmp/maasea-refactor/captures
```

For final testing push **both rebuilt scripts** to CodeCraft39/sgmodule master
and use `../youtube-request/quantumult-x.conf`, replacing overlapping rules. The
remote URLs carry `#debug=true` for test logs; removing the fragment silences
routine logs. Nothing is published automatically. The response rule now observes ad_break. On Shadowrocket keep the working
client-native configuration and replace both script resources. The existing
upstream URLs and original Surge module are not deployed or altered here.

Distinguish each outcome in captures: initplayback branch and actual Worker
replay; key refresh on config/log_event; standalone/embedded next panel removal; and any ad_break
traffic. Ad-free intervals alone establish none of these mechanisms.

For the complete paired check (including the audit regressions), prepare the
captures as above and run:

```sh
python3 tools/youtube-response/check.py \
  --node /private/tmp/maasea-refactor/node/node-v22.21.1-darwin-arm64/bin/node \
  --typescript /private/tmp/maasea-refactor/typescript/package/lib/tsc.js \
  --esbuild /private/tmp/maasea-refactor/esbuild/package/bin/esbuild \
  --dependency-dir /private/tmp/maasea-refactor \
  --work-dir /private/tmp/maasea-refactor/paired-check \
  --captures /private/tmp/maasea-refactor/captures
```
