> Local playback extension (build 20261101.2): see [../youtube-local/README.md](../youtube-local/README.md).
> The generated set now has eight artifacts, including protocol constants in
> src/protobuf/onesie-schema.ts. Onesie code uses native crypto/compression and
> reuses the same typed handlers. The chronology below records the preceding refactor.

# Maintained YouTube source architecture

Refactor dated 1 November 2026, following checkpoint `f77e408`. Device tests were
intentionally deferred until after this refactor. Current build markers are
`request-compat-20261101.1` and `response-compat-20261101.1`.

## Source of truth

`Script/Youtube/schema/youtube.json` is the authoritative definition of the
recovered schema views, request fields, endpoint message assignments, and
lossless traversal paths. It records the pinned original bundles and capture
provenance. Field order is significant for compatibility with the old writers.

Run `python3 tools/youtube-response/generate.py` after editing it. The generator
produces seven checked-in artifacts:

- Request message interfaces and field constants: `src/request/messages.ts`
  and `src/request/schema.ts`.
- Response interfaces, codecs, and traversal/endpoint constants:
  `src/response/messages.ts`, `schema.ts`, and `wire-schema.ts`.
- `schema/response.proto` and `schema/onesie-request.proto` for inspection and
  interoperability work.

Do not edit generated artifacts. Both distribution builders reject stale
generated files. Generation needs Python only. The generator is project-owned;
these are not falsely described as outputs of the upstream protoc plugin.
The .proto views have not been compiled with protoc in this validation pass.

The schema remains deliberately partial. There are 83 message definitions
recovered from the response bundle, eight additional capture-backed immersive
view definitions, and two request definitions. The legacy and immersive Next
definitions are views of the same wire response. The legacy codec leaves the
immersive field opaque, preserving its original bytes when another handler
modifies a mixed Watch response. The immersive view supplies named structural
paths for lossless edits. Its singular edges describe navigation and do not
claim to establish Google's cardinality from a small set of captures.

Adding a field requires its wire type and position to be supported by evidence.
Where meaning is unknown, retain a neutral name. More fields do not inherently
improve filtering. An uncertain field is safer left opaque.

## Protobuf implementation

The extracted, partly minified `vendor/protobuf-runtime.js` and its declaration
facade have been removed. Response codecs import the public, typed API of
[@protobuf-ts/runtime 2.11.1](https://github.com/timostamm/protobuf-ts/tree/v2.11.1/packages/runtime).
The dependency URL and SHA-256 are locked in `dependencies.json`. No third-party
implementation or installed dependency directory is kept in this repository.

`dependency.py` downloads/extracts only beneath the explicitly supplied
`/private/tmp/` directory. It verifies the archive hash and every packaged file
used by the build. `build.py` bundles the upstream runtime into the output script
and includes its license and copyright notices. The device does not fetch or
install a package. The dependency directory must be removed after development.

Generated codecs extend the standard MessageType class and provide typed binary
writers in declaration order. This uses the public `internalBinaryWrite` API;
it does not modify the upstream runtime's field-sorting implementation. The
original writer-byte comparisons pass. The two previously documented empty-codec
unknown-preservation improvements remain intentional differences from Maasea.

The small `src/protobuf/runtime.ts` adapter supplies explicit UTF-8 readers and
writers. It does not require or install global TextEncoder/TextDecoder objects.
The schema validator checks known wire types and nested message boundaries
before reflection decoding. Packed and unpacked scalar inputs are supported;
malformed encodings and excessive nesting throw. Unknown byte payloads remain
opaque. Invalid known strings also throw rather than being rewritten using
replacement characters. The native entrypoint passes the original response
through on processing errors, without persisting partial filtering results.

## Typed endpoint processing

`src/response/endpoints.ts` binds each supported endpoint to its generated codec
and concrete handler. The endpoint table must cover the routes declared in the
schema; TypeScript checks that mapping. `handlers.ts` uses generated interfaces,
not a permissive `Message` index signature. Compile-only negative contracts
verify that invalid known fields and incorrect handler inputs are rejected.

`src/protobuf/visit.ts` confines reflection to one small boundary and walks
declared message fields only. It delivers the generated target type to handler
callbacks. Unknown-field storage remains with the Protobuf runtime, separate
from known message properties. Never use `MessageType.create()` or clone as a
way to copy decoded responses: those upstream operations discard unknown fields.

The original rich-item cache policy and ad-marker threshold remain unchanged.
Replacing those policies requires organic/ad traffic evidence; this source
refactor does not establish their accuracy for every server variant.

## Lossless filtering

`src/protobuf/wire.ts` is the bounded reader shared by request decoding and
response edits. `edit.ts` implements generic path selection and removal. There
is one implementation of raw field parsing. Untouched tags, value bytes, ordering,
duplicates and groups remain exact; changed ancestor lengths are updated.

`src/response/filters/immersive.ts` expresses the observed product-panel predicate:
the expected layout identifier and a `/pagead/` marker must both occur in the
expected containers. It obtains every field path from generated schema constants.
The same filter is used across clients for standalone Next and Next embedded in
Watch contents. No QX-specific field-42 processing function remains.

The two serialization guarantees are different:

- Lossless edits preserve every untouched field's complete original encoding.
- Generated codec re-encoding preserves unknown field values and multiplicity,
  but can normalize ordering and tags. It is used when a typed handler changes
  a known message. It is not claimed to be globally byte-identical.

No-op responses are returned without replacement. Future filters can reuse the
same infrastructure; this change adds no speculative filtering to other endpoints.

## Verification and remaining device work

The paired checker passes request tests (16 groups and 100 decoder variants),
332 original-codec checks, 40 original output/storage behavior comparisons,
eight audit-regression groups, and 12 architecture groups. The latter cover
observed schema decoding, positive/negative filtering, all wire types, duplicate
opaque data, non-minimal tags, nested preservation, malformed data, Unicode,
missing native text encoders/BigInt, known-wire mismatches, and packed scalars.
All three capture output hashes match the independently recorded golden hashes.
Current tests do not depend on `youtube.response.qx.js`.

Both scripts build reproducibly. The response also produced identical bytes
using a different temporary dependency directory. Validation manifests record
output hashes. No native proxy app was tested during this refactor.

Use the existing paired QX test profile after publishing both rebuilt scripts.
Verify the actual 307 method/body replay, Worker response/playback, native body
handling, key acquisition, and standalone/embedded filtering. Shadowrocket needs
the same rebuilt pair with its native configuration. Surge remains untested.
`/player/ad_break` remains pass-through pending an actual binary capture/schema.
Ad-free intervals alone are insufficient evidence of successful filtering.

After device tests pass, review removal of the historical
`Script/Youtube/youtube.response.qx.js` experiment and its obsolete build/test
helpers. Keep the capture provenance and useful regression evidence.
