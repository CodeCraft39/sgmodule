> Current source architecture and build 20261101.1: [../youtube-response/ARCHITECTURE.md](../youtube-response/ARCHITECTURE.md).
> This document records the preceding build .2 audit resolution; the open Message/any facade described below has since been removed.

# Audit fixes — 31 October 2026, build .2

The three actionable findings in AUDIT.md are resolved in source and the rebuilt
request/response pair. The original report is retained as the pre-fix record.
No changes have been published to GitHub or installed on a device here.

| Audit finding | Implemented resolution | Verification |
| --- | --- | --- |
| QX header-only log_event removed encoding metadata | QX preserves Content-Encoding, Content-Length, Content-Type and the original body; only hot-hash eligibility is edited. Surge/Shadowrocket retain the original body-aware behavior. | gzip and Brotli inputs retain their metadata, unchanged bytes and successful decompression; native output has no replacement body. |
| Stored JSON null prevented key acquisition | Response loads normalize null/non-object roots to empty config and remove invalid app namespaces while preserving valid other-app keys and metadata. Invalid JSON in either cache does not block key acquisition. Request null handling uses normal missing-key fallback. | Response→storage→request tests recover from null, invalid JSON, arrays/scalars and invalid namespace shapes on QX/Shadowrocket/Surge-compatible mocks. Music key recovery is tested separately. |
| Modern Next was missed inside get_watch | The bounded raw-wire editor also traverses repeated Watch.contents field 1 → Content.next field 3. Legacy/player handling then runs when needed. No-op Watch responses are passed unchanged instead of unnecessarily re-encoded. | All three captured Next bodies are embedded as raw bytes in repeated Watch contents, with opaque siblings. Expected output is byte-exact when only modern panels change. Mixed Player/legacy/modern responses are also tested. |

Additional audit observations addressed:

- Response storage false/throw is reported without losing a valid filtered body.
  Warnings identify the known storage key and session, not its contents.
- Both diagnostic prefixes include safe native session identifiers when available.
- Routine logs require debug=true and are off by default. Processing/cache/storage
  errors remain visible. The paired QX test profile appends #debug=true to both
  remote script URLs, so the device test still has branch diagnostics.
- Existing matching runtime keys retain metadata rather than being overwritten
  unnecessarily by an identical config response.

## Validation

- Strict TypeScript checks for both sources pass.
- Request: 16 test groups, including 100 decoder differential variants and
  compressed-header preservation cases.
- Response baseline: 83 message types, 332 codec checks, 25 native output/storage
  comparisons, and the three supplied standalone captures.
- Audit regressions: 8 test groups covering repaired-key handoff, Music isolation,
  persistence errors, repeated nested payloads, mixed Player/legacy/modern Watch
  contents, transactional failure, no-op preservation, debug gates and session IDs.
- Both generated distributions are reproducible. Exact hashes are recorded in
  each script's validation.json.

Unknown fields are preserved by the new raw-wire stage, including untouched
Watch siblings. When Player or legacy filtering requires generated-schema
encoding, the existing encoder still normalizes field ordering as before; that
case is tested for retained opaque data and intended behavior, not falsely
claimed as a global byte-identical rewrite.

## Still requires device evidence

- Whether YouTube follows QX's 307 and replays the correct method/body to the
  Worker, and whether the Worker response produces stable playback.
- Actual native request/response handling, including QX's compression pipeline.
  The fix removes our explicit metadata/body mismatch; mocks cannot simulate
  QX's network engine or prove live traffic correctness.
- /player/ad_break schema and filtering. It remains observed and passed through
  unchanged; no binary ad_break capture was available. Blocking it speculatively
  would not be a safe resolution.
- Real organic modern responses, legacy cache false positives and other server
  variants. Existing cache policy and partial/open message typing were retained
  as compatibility choices, not redesigned without traffic evidence.

## Device-test profile

Use tools/youtube-request/quantumult-x.conf after pushing both rebuilt scripts
to CodeCraft39/sgmodule master. It references both remote scripts with debug=true;
it does not deploy them. Remove that fragment after the diagnostic phase to
silence routine logs. Expect build markers request-compat-20261031.2 and
response-compat-20261031.2. Replace overlapping YouTube rewrites and refresh QX's
script resources. Keep the already-working MITM coverage.

For local script testing, substitute local filenames; routine logging is then
off unless the client supplies debug=true through its supported options. On
Shadowrocket keep the existing working native rules and use the rebuilt pair.

All tools, dependencies and extracted bodies used for validation were confined
to /private/tmp/ and are removed after finishing. There are no global installs
or persistent environment changes.
