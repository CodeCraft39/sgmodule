# YouTube request source and adapters

Current build: **request-compat-20261101.6**. Readable TypeScript under
`Script/Youtube/src/request/` builds `Script/Youtube/youtube.request.js`.
This is equivalent reconstructed source, not Maasea's original TypeScript.
The pinned original bundle remains in `fixtures/upstream.request.js` for parity.

## Native status

QX .6 normal playback and forced missing-key recovery are verified in the
[09:24](../youtube-local/QX-20261102-092452.json) and
[12:40](../youtube-local/QX-20261102-124053.json) runs. After the actual empty 200,
YouTube recovered through direct get_watch for the same video and received a
filtered response; key acquisition completed later. No additional production
change was needed for this behavior. Use the normal
[QX echo profile](../youtube-local/quantumult-x.echo.conf) after disarming the
completed temporary bootstrap probe. The first Shadowrocket local run acquired
matching keys but passed playback responses with unsupported-crypto; see
[the native failure report](../youtube-local/SR-20261102-191430.json). Runtime
capability probing is next. Surge remains untested.

## Behavior

| Mode | initplayback | log_event |
| --- | --- | --- |
| Default SR/Surge-compatible | Original Worker URL replacement or nested empty response | Original hot-hash/header behavior |
| Default QX | Flat 307 to the same Worker URL or flat empty 200 | QX header-only adapter |
| `localPlayback=true` | Direct Google pass-through, with key comparison/invalidation; shared response hook filters supported Onesie | Request fresh config until our pair is associated with the current hot hash |
| QX local + `qxEcho=true` | Request-stage adapter returns empty 200 before fetching when keys are missing; otherwise authenticates, fetches Google and runs the shared response core before full HTTP echo completion | Same local key acquisition |

Default QX 307 replay has not been established on the native YouTube client.
The local response-hook mode was device-verified after key refresh in the .4/.5
runs, but its attempt to empty startup responses failed native acceptance.
The .6 echo adapter replaces that failed mechanism. It requires
`script-analyze-echo-response`; do not also install an initplayback response hook.
Other clients ignore the QX-specific opt-in and retain their existing path.

There is no Worker request in either local mode. Legacy/default mode still
retains Maasea's external service for comparison; all-client removal is pending
native local validation. Shadowrocket local mode remains unverified and Surge
has not been tested.

## Maintained implementation

- `main.ts`, `platform.ts`, `options.ts`: native adapters, explicit opt-ins and
  safe diagnostics. QX accepts fragment/environment options; SR/Surge uses JSON
  arguments. The four original filtering options alone enter the Worker URL.
- `core.ts`: pure key comparison, selected-app invalidation and hot-hash policy.
- `protobuf.ts`: bounded, unknown-preserving request reader. Authoritative field
  definitions are generated from `Script/Youtube/schema/youtube.json`.
- `qx-echo.ts`: QX HTTP transport only. Binary bodies remain exact, request cookies
  and authorization are forwarded, hop/framing headers are rebuilt, redirects
  are not followed internally, and identity/gzip output is normalized. The
  decoder/filter implementation is shared with `response/main.ts`.
- `echo-lease.ts`: bounded, best-effort per-envelope fetch re-entry guard. No
  undocumented rewrite-bypass option or custom network marker is assumed.
- `src/protobuf/`: shared wire editing, crypto/compression and protocol framing.

The adapter snapshots the matched pair before awaiting I/O; it cannot overwrite
fresh keys with its unchanged snapshot. Authentication failures invalidate only
that same still-current pair. Logs omit keys, bodies, authorization, full URLs
and raw native exception messages. `YouTubeConfig` is runtime key storage,
required for local processing; capture exports are separate diagnostics.

The adapter rejects unsupported HTTP encodings, oversized bodies and processing
failures explicitly. Native fetch buffering/latency, binary POST support,
possible rewrite re-entry and YouTube's automatic retry remain device checks.
Full limits and exact expected logs are in the linked test instructions.

## Verification and build

The paired checker includes 16 original request groups and 100 decoder variants,
332 codec comparisons, 40 handler comparisons, three golden Next captures,
wire/schema tests, eight playback groups, six key-lifecycle groups and QX echo
integration tests. Native APIs are mocked; these tests do not contact Google or
Maasea. Current counts/hashes are in the request/response validation manifests.
Earlier private playback archives were unavailable for the .6 replay; historical
reports are retained without claiming that those checks ran again.

Both bundles now include the same pinned `@protobuf-ts/runtime` because the QX
request adapter calls the shared response core. The runtime is bundled locally;
the device downloads no package. License/copyright notices are retained. Follow
[dependency preparation](../youtube-response/README.md) for the pinned tools and
runtime. All tools, libraries and intermediates must be in `/private/tmp/`, with
no global install or persistent environment change. Remove them afterward.

Standalone request check (the paired checker is preferred for releases):

```sh
python3 tools/youtube-request/check.py \
  --node /private/tmp/maasea-tools/node/node-v22.21.1-darwin-arm64/bin/node \
  --typescript /private/tmp/maasea-tools/typescript/package/lib/tsc.js \
  --esbuild /private/tmp/maasea-tools/esbuild/package/bin/esbuild \
  --dependency-dir /private/tmp/maasea-tools \
  --work-dir /private/tmp/maasea-tools/request-check
```

## API references

[QX echo example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-echo-response.js),
[QX binary example](https://github.com/crossutility/Quantumult-X/blob/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d/sample-bytes-rewrite.js),
[QX fetch options](https://github.com/crossutility/Quantumult-X/blob/master/sample-task.js),
[Surge request API](https://manual.nssurge.com/scripting/http-request.html).
The original QX failure has separate request-API and schema-coverage findings;
see the [issue review](../youtube-response/README.md). A matching rewrite or an
ad-free video alone cannot establish successful filtering.
