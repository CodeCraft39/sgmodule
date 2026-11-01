# Request-script reconstruction and QX compatibility candidate

Build .2 resolves the pre-device audit findings; see `../youtube-audit/RESOLUTION.md`. Routine logging now requires `debug=true`. The supplied QX test profile references the remote rebuilt pair with that fragment enabled.

The companion response script has now also been reconstructed. See
`../youtube-response/README.md` for the current paired-script status and GitHub
issue findings. `quantumult-x.conf` now includes the rebuilt response rule too;
replace overlapping response rules rather than adding a second handler.

The rebuilt `Script/Youtube/youtube.request.js` comes from readable TypeScript
under `Script/Youtube/src/request/`. It replaces the original request bundle;
the pinned original is retained in `fixtures/upstream.request.js` for regression
tests. This is equivalent reconstructed source, not Maasea's original TypeScript.
The existing response script remains a companion dependency.

## Behavior and identified compatibility issue

The original request bundle has platform adapters, but its `/initplayback`
branches bypass them:

- Matching cached key: `$done({url: workerUrl})`.
- Missing/incomplete/mismatched key or unavailable body: a nested
  `$done({response: ...})` mock response, and invalidation of that app's cached key.
- `/log_event`: strip Content-Encoding and, if no cached client key, the
  X-YouTube-Hot-Hash-Data header. This path already uses a platform adapter.

The nested mock-response shape is the documented Surge contract. QX's official
echo API instead uses a flat object with a complete HTTP status line. Its
published request-header example documents path/header edits, not the same
cross-host URL-rewrite contract as Surge. The original outputs therefore do not
provide a documented portable QX implementation. This source inspection is not
a device-level reproduction of which branch caused the reported failure.

This candidate uses:

| Decision | Shadowrocket / Surge-compatible | Quantumult X |
| --- | --- | --- |
| Matching cached key | Original `{url: workerUrl}` behavior | Flat `307 Temporary Redirect`, Location set to the same Worker URL, empty text body, Cache-Control no-store |
| Missing/mismatched cached key or unavailable body | Original nested empty binary `200` response | Flat empty text `200 OK` response |
| log_event | Original modified-header output | Header-only output preserves body encoding/length metadata; hot-hash eligibility is still edited |

QX needs `script-analyze-echo-response` for `/initplayback`: it waits for the
request body and permits a synthetic response. Do not use the earlier
script-request-body rule for this implementation. A 307 asks the HTTP client to
retain the original method/body; whether this YouTube client follows it across
hosts must be checked on the iPad. The new QX path does not fetch the Worker
inside the script or require another server/library.

Runtime `YouTubeConfig` storage is preserved, including its `youtube` and
`youtubeMusic` namespaces and unrelated properties. The existing response script
populates it with `clientKey` and `encryptKey` from configuration responses.
No exported configuration/debug file is required in the final installation.
The Worker endpoint and its existing ck/target/options query format are retained.

## Source layout

| File under src/request | Purpose |
| --- | --- |
| types.ts | Typed platform inputs, runtime config and decisions |
| protobuf.ts | Bounded reader for the two embedded request message definitions |
| base64.ts | Base64/base64url decoding without Node or browser-specific APIs |
| core.ts | Header processing, key comparison, Worker URL and fallback decisions |
| options.ts | Existing options plus QX fragment/environment option parsing |
| platform.ts | Binary normalization and client-specific completion values |
| main.ts / entry.ts | Storage integration, diagnostics, one completion per execution |

The recovered schema is `Script/Youtube/schema/onesie-request.proto`. Its exact
known path is root field 3 → bytes field 5 (`encryptedClientKey`); the other known
nested bytes fields are 2, 6 and 7. These definitions come from the original
bundle, not from the `/next` response captures. Unknown fields are retained as
raw views; input bytes are not modified or encoded. Repeated singular field-3
messages merge, and duplicate bytes fields use their last occurrence, matching
the embedded decoder. This is a focused read-only decoder, not a complete
generated Protobuf runtime.

## Offline validation and deliberate differences

Strict TypeScript checking passes. The Node test suite passes 16 test groups:
core decisions compared to the original; Shadowrocket/Surge native outputs and
storage; QX 307/200/header shapes; missing body; sliced binary views; unknown
fields, groups and duplicate messages; 100 deterministic decoder variants;
malformed data; cache/storage failures; option parsing; base64; endpoint routing;
the shipped QX rewrite rules; debug gating; null-config fallback; and gzip/Brotli
header preservation. `validation.json` records the build hash and
tool versions. Building twice produces identical JavaScript.

The test harness runs the built bundle in separate VM contexts with mocked native
APIs. No live request is sent to Google or the Worker by these tests. All request
fixtures are synthetic. There is no captured `/initplayback` exchange in the
supplied handoff, so offline coverage cannot establish playback-ad removal.

Intentional changes beyond the QX completion objects:

- Safe completion on parse/config errors. Surge-compatible clients pass through
  unchanged; QX initplayback returns empty 200 in echo mode and leaves cache
  unchanged. Logs identify the failure stage without exposing input values.
- Storage write failure is logged without preventing the selected completion.
- Missing/mixed-case User-Agent headers are handled safely.
- Routing matches endpoint paths, not incidental words in query strings.
- QX options can be read from script-URL fragments or environment variables.
  Boolean strings are normalized. Only the four known options are sent to the
  Worker; diagnostic options and arbitrary unknown arguments are not forwarded.
- Invalid base64 and incorrectly typed known protobuf fields are rejected rather
  than relying on permissive behavior in the old runtime.

The diagnostic prefix is `YT-REQUEST request-compat-20261031.2`. With debug=true, one ordinary line
reports client, endpoint, action, reason, body length, cache-write result and a
native session identifier when available. No body data, keys, full URLs, Worker
query strings or raw exception text are printed.

## Device setup and final test

For **Quantumult X**:

1. Push both rebuilt scripts to CodeCraft39/sgmodule master. Merge
   `quantumult-x.conf` into the existing profile. Its remote URLs end in
   `#debug=true` to enable diagnostic logs. Replace overlapping request
   rules for these endpoints and use the rebuilt response rule too. Preserve
   the existing MITM host list; request and response handling are different phases.
2. Refresh the script resource/cache. Check that initplayback uses
   script-analyze-echo-response and log_event uses script-request-header.
3. Start YouTube and play/switch several videos. On a cold configuration cache,
   expect `action=empty reason=cache-missing` first. This is intended fallback,
   not sufficient evidence of filtering. Missing bodies produce
   `reason=body-unavailable`: check the rewrite type and binary data exposure.
4. With a matching cached key, expect `action=redirect reason=key-match`. Confirm
   an actual HTTP 307 response, followed by a request to the Worker. Check that
   its method and binary body are preserved and that its target query points to
   the original initplayback URL. The script log alone cannot prove this.
   Inspecting the HTTPS Worker body may require temporarily adding
   `init-stream.maasea.workers.dev` to MITM capture coverage.
5. Confirm the Worker returns a usable response and playback continues. Note
   separately whether video ads and ad panels appear. Save relevant transaction
   headers/bodies and the associated session log when playback fails.

For **Shadowrocket**:

1. Keep the previously working interception rules and binary-body settings.
   Replace only the request-script resource with this rebuilt file, and retain
   the existing response script. No new QX echo rule belongs in this client.
2. Confirm the matching-key Worker handoff, fallback playback, key refresh, video
   switching and normal playback. Compare against the unmodified original when
   needed; both request implementations remain available locally.

Surge uses the same completion shapes as the original. Physical Surge validation
has not been performed. The existing sgmodule still points at Maasea's upstream
URL, so it will not automatically load this local reconstruction. Supply the
new script through the client resource URL/local path you choose; no publication
or deployment was performed here.

Optional parameters keep the original JSON argument format on Surge-compatible
clients. QX can use a remote script URL fragment such as
`#captionLang=off&debug=true`; recent QX builds also expose these as
`$environment.variables`. The test profile enables those logs explicitly; routine logs are off by default.
Processing and persistence errors remain visible without debug mode. Do not alter YouTubeConfig manually to force a live key match.

If QX logs key-match and emits 307 but YouTube does not replay the request, the
next step is a QX-native Worker fetch/echo transport, tested with that captured
exchange. This candidate does not silently claim that HTTP redirect replay has
already been demonstrated. If QX never reaches key-match, inspect key acquisition
in the companion response script before changing request transport again.

## Reproducible build without global installs

Production needs no runtime packages. For development, use Node 22.21.1,
TypeScript 5.9.3 and esbuild 0.25.12 (the validated versions). Download/extract
tools only beneath `/private/tmp/`; use explicit paths, no npm global install,
PATH edits, persistent environment changes or node_modules in the repository.
Remove the temporary directory after finishing. Existing external tool paths
can be substituted in the following commands if they satisfy the same isolation.

On the arm64 Mac used for this investigation, the temporary tool directory was
`/private/tmp/maasea-request-work`. Its contents are removed after validation;
recreate tools there before running these commands again:

```sh
python3 tools/youtube-request/check.py \
  --node /private/tmp/maasea-request-work/node/node-v22.21.1-darwin-arm64/bin/node \
  --typescript /private/tmp/maasea-request-work/typescript/package/lib/tsc.js \
  --esbuild /private/tmp/maasea-request-work/esbuild/package/bin/esbuild \
  --work-dir /private/tmp/maasea-request-work/check
```

Build output has no timestamps or machine-dependent paths and is reproducible
with the pinned compiler. The checked-in original fixture has SHA-256
`3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26`.

Temporary downloads used the official Node archive and npm registry archives:
[Node](https://nodejs.org/dist/v22.21.1/node-v22.21.1-darwin-arm64.tar.gz),
[Node checksums](https://nodejs.org/dist/v22.21.1/SHASUMS256.txt),
[TypeScript](https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz),
[esbuild arm64](https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.12.tgz).
The Node archive SHA-256 was checked against its published checksum manifest.

## API evidence and limits

- [QX official echo example, pinned](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-echo-response.js)
  demonstrates a flat 307 response with Location.
- [QX official configuration](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf)
  documents analyze-echo waiting for the request body and local script loading.
- [QX official binary example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js)
  documents ArrayBuffer binary handling and slicing typed-array views.
- [Surge request-script API](https://manual.nssurge.com/scripting/http-request.html)
  documents URL replacement, binary request bodies and nested mock responses.

No final device execution was performed. In particular, this does not establish
why QX previously appeared less reliable, that YouTube follows this 307 on the
iPad, or that ad-free playback is caused by the patch. The `/next` response-panel
experiment in `tools/youtube-next/` remains separate from this request fix.
