# Maasea proxy-script-template review

Reviewed 31 October 2026 at commit
[`98fe47a974a9d29b5a532395ae8abcf464c4966a`](https://github.com/Maasea/proxy-script-template/tree/98fe47a974a9d29b5a532395ae8abcf464c4966a),
dated 16 February 2024. This is useful author-provided adapter source, not the
missing YouTube application source or an up-to-date authoritative QX API spec.

## Directly useful evidence

The template's `lib/client.js` is byte-identical to the existing readable
`Script/SRSS/lib/client.js` in this project. SHA-256:
`727ba84a3996c2684d71df5814f65ee82ab9a8fae6721670755468810f013fc2`.
Its `script/decodeProtobuf.js` is also identical to the local SRSS copy, SHA-256
`404739df9c919a4b570d5c547f6d4cf7d959ca4391c04ce00c9915f7058b845e`.
There is no need to download those files again for development.

The readable adapter source corroborates the reconstructed platform boundary:

- The common internal binary representation is Uint8Array. QX native input/output
  uses ArrayBuffer; Surge native bodies use Uint8Array in binary mode.
- QX output conversion slices typed-array byteOffset/byteLength rather than
  returning an entire underlying allocation. Our adapters already preserve this.
- `QuanXClient.done()` unwraps a common nested `response` object, converts numeric
  status to an HTTP status line, and maps `bodyBytes` to ArrayBuffer. The original
  YouTube request script's raw `$done({response: ...})` bypasses that conversion.
- `SurgeClient.done()` preserves the nested response envelope and maps common
  bodyBytes to native body. Our Surge-compatible completion keeps that shape.
- `types/type.d.ts` describes separate QxDone and SgDone shapes. These declarations
  are useful design evidence, not proof that all undocumented native fields are
  unsupported. In particular, they do not settle cross-host URL replacement or
  prove that YouTube follows our QX HTTP 307 candidate.

Useful primary links:
[client implementation](https://github.com/Maasea/proxy-script-template/blob/98fe47a974a9d29b5a532395ae8abcf464c4966a/lib/client.js),
[native/common types](https://github.com/Maasea/proxy-script-template/blob/98fe47a974a9d29b5a532395ae8abcf464c4966a/types/type.d.ts),
[client declarations](https://github.com/Maasea/proxy-script-template/blob/98fe47a974a9d29b5a532395ae8abcf464c4966a/lib/client.d.ts).

## Additional storage hypothesis

The template's QX `getVal()` removes actual NUL characters from the stored string
before returning it. The pinned YouTube request/response adapters read the raw
value instead. JSON text with literal NUL contamination can fail JSON.parse;
therefore this difference is a concrete diagnostic lead if logs show a config
parse failure. It is not evidence that this iPad's preferences are contaminated.

Do not strip characters from stored data or declare this the cause without
checking the actual read value. A future diagnostic can report only whether
literal NUL characters are present, without printing keys or the config content.
Valid JSON containing an escaped `\u0000` sequence is a different case and is not
removed by the template's raw-string replacement.

## What the template cannot reconstruct

The repository has generic client helpers, environment declarations, an example
script and an esbuild pipeline. It has no YouTube request/response message
definitions, ad renderer schema, Onesie key acquisition logic, UMP handling or
ad_break response schema. It does not resolve the supplied field-42 payloads or
issue #110. Those still require bundle descriptors and real captures.

Its Protobuf helper invokes protoc --decode_raw and only decompresses gzip for
its optional gRPC framing path. It would not directly decode the archived
Brotli-compressed HTTP bodies. It produces a raw field dump, not verified field
names or a schema generator. Our explicit Brotli decompression and wire-path
verification remain necessary.

Its build pipeline confirms esbuild/IIFE-style bundling and ES2020 targeting,
consistent with our reconstruction. We retain deterministic build output,
explicit temporary tool paths and strict TypeScript checks rather than adopting
the old template's timestamp banner, floating dependency range and global
protoc/PATH setup. The user's /private/tmp-only installation rule takes precedence.

## Outcome

Use the existing readable SRSS adapter as a reference when maintaining the shared
typed platform boundary. Do not replace the current tested adapters wholesale
with this older client class: its QX fetch wrapper lacks rejection propagation,
and its completion layer does not implement a cross-host request rewrite.
Neither current rebuilt script calls that fetch wrapper.

This review changes the evidence/provenance documentation, not the runtime
behavior. The existing test results remain the results of the prior build; no
new live-client validation is claimed. The downloaded template and revision
metadata are removed after review. No dependencies or global settings are added.
