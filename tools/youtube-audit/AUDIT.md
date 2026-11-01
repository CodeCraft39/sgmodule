# Pre-device audit — 31 October 2026

**Historical pre-fix report:** the subsequent build .2 addresses the actionable
findings below. See [RESOLUTION.md](RESOLUTION.md) for fixes, regression results,
current device-test instructions and remaining evidence gaps.

Recommendation: resolve the confirmed cache regression and the QX compressed
log_event transport risk before using the candidate as the main device profile.
The rebuilt pair is not yet a verified QX fix. This audit changes documentation
only; implementation and distribution scripts remain unchanged.

## Scope

Inspected both TypeScript implementations, generated distribution files,
recovered schema/runtime, golden fixtures, validation scripts, native QX rules,
and current official QX/Surge API examples. Executed independent targeted VM
reproductions against the current built bundles. Used one supplied Brotli /next
capture and synthetic config/settings/guide/Shorts/get_watch inputs. No live
device, Google request or Worker request was executed.

Existing compiler/test results were reviewed, not rerun as a fresh complete
toolchain check in this audit. No tools or libraries were downloaded or installed.
One compressed capture was temporarily copied to /private/tmp and removed.

## Findings

### 1. High-priority QX transport risk: header-only log_event strips encoding

Locations: tools/youtube-request/quantumult-x.conf:8;
Script/Youtube/src/request/core.ts:28-34;
Script/Youtube/src/request/main.ts:42-47.

The recommended QX rule switched log_event from script-request-body to
script-request-header. The handler unconditionally removes Content-Encoding,
does not read/decode the log_event body, and returns only headers. It also retains
the original Content-Length. If QX forwards an encoded request body unchanged in
this mode, gzip bytes are mislabeled as an unencoded Protobuf message.

Independent mocked input with gzip magic 1f 8b returned only headers, with no
Content-Encoding, no replacement body, and the original length header. The
supplied next requests also actually use gzip (this establishes that compressed
YouTube request traffic is present, not the encoding of an uncaptured log_event).

QX's official configuration documents automatic length/encoding handling for
body-related rewrites. It does not establish that this header-only change is
safe. No native QX request pipeline was simulated here, so this is a concrete
contract risk rather than a proven on-device wire corruption. Existing tests
compare returned headers and do not examine compression or actual forwarding.

Required resolution: either retain correct encoding metadata in a header-only
path, or use a supported body-aware path with a verified body/encoding pair. Do
not select either behavior solely from the old mock-output parity test.

Primary evidence:
[QX official configuration](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample.conf).

### 2. Confirmed regression: JSON null prevents configuration-key recovery

Locations: Script/Youtube/src/response/main.ts:30-36;
Script/Youtube/src/response/handlers.ts:140-143.

The original response script uses getJSON(YouTubeConfig) ?? {}, so the valid
stored JSON text "null" becomes an empty config and can acquire fresh keys. The
reconstruction returns parsed null unchanged and then assigns config[key]. This
throws. The response catch returns no replacement and preserves the null value.
The request script also rejects this stored value, so it cannot repair it.

Independent reproduction: encode a valid Config response containing both keys
using the recovered codec; replay with YouTubeConfig set to the text null.

| Result | Original response bundle | Rebuilt response bundle |
| --- | --- | --- |
| Completion calls | 1 | 1 |
| YouTubeConfig writes | 1 | 0 |
| Stored config remains null | no | yes |
| Diagnostic | none | processing-error |

Required fix: normalize null/missing config before handlers, with validation and
a recovery policy for invalid shapes. Add a paired response→request regression
case demonstrating that recovered keys enable the request handoff.

### 3. Confirmed coverage gap: nested Next does not get the field-42 filter

Locations: Script/Youtube/src/response/main.ts:38-47;
Script/Youtube/src/response/handlers.ts:134-139.

The new wire editor is invoked only for a top-level next route. The get_watch
handler instead calls legacy filterRichItems on its decoded next child, whose
field 42 is still unknown data. The recovered Watch.Content descriptor explicitly
uses the same Next message type at field 3.

Independent reproduction used the actual 155,475-byte supplied Next capture.
Embed its unchanged raw wire bytes at Watch.contents (field 1) → Content.next
(field 3), then run the rebuilt response script:

| Input route | Input bytes | Output bytes | Product panel |
| --- | ---: | ---: | --- |
| next | 155,475 | 49,267 | removed |
| get_watch wrapper | 155,483 | 155,483 | retained |

The embedded Next remains 155,475 bytes and contains its product layout. This
proves the implementation's coverage difference; it does not claim that an actual
get_watch response with this form was captured on the iPad. The initial attempt
to construct the wrapper with MessageType.create was rejected as invalid audit
evidence because create drops unknown fields. The reported reproduction wraps
the raw payload directly and preserves field 42.

Required fix: apply the verified editor to embedded Next payloads as well, while
preserving other Watch fields, or explicitly constrain the claimed coverage.

## Additional observations, not release-blocking defects

- Failed response-side config writes are ignored: returning false from
  setValueForKey leaves no keys and produces only a normal pass log. The request
  script detects failed writes, but key acquisition does not. Better diagnostics
  would avoid confusing persistence failures with missing configuration traffic.
- QX 307 has the documented echo-response shape, but is a client-visible HTTP
  redirect, not Surge's internal URL replacement. YouTube's cross-host replay,
  method/body preservation and Worker response handling remain device checks.
  This known uncertainty is not promoted to a confirmed bug.
- Routine logs are unconditional as previously disclosed. They can be gated
  after the diagnostic phase; there is no runtime key/body dump in those logs.
- Response logs lack the request-side session identifier, making concurrent
  request/response correlation harder. Endpoint and length are not unique IDs.
- The response handler boundary uses an explicit open Message/any view and
  the retained JavaScript runtime is not TypeScript-checked. A passing strict
  TypeScript command is not end-to-end validation of every message-property use.
- Legacy layout/renderer blacklisting and its false-positive risk are inherited.
  The new standalone modern-path predicate is narrower, but only ad-bearing
  modern captures and synthetic organic controls are available.
- Issue 110 remains deliberately unimplemented: ad_break is observed and passed
  through. No ad_break body or schema was supplied. Including it in the response
  regex now does not mean its ads are filtered.

## Checks that supported the current implementation

- Independent populated settings (category 10135), guide button removal and
  Shorts isAd cases produced byte-identical output to the original bundle.
- The stored original response fixture remains available for comparisons, and
  build/validation artifacts expose the candidate status rather than claiming
  device success.
- Standalone modern /next replay still removes the captured panel. The wire
  preservation claim is limited to that verified path; it is not extended to
  every generated-schema re-encode or nested response.
- Native output distinctions, sliced binary-view handling, exact ad_break
  dispatch exclusion and default option values were inspected. No new definite
  regression was found in these aspects.

No source fixes were mixed into this audit. The next implementation pass should
add regression cases for findings 1–3, resolve them, rebuild both distributions,
and then use a controlled device test to settle the QX 307/Worker uncertainty.
