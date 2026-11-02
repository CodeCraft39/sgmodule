# Runtime capability probe — runtime-probe-20261102.2

This reusable diagnostic tests public vectors in the actual binary response
script context. It reads no preferences or private request/response payloads,
sends no network requests from the proxy script and does not modify production
scripts. Its Safari page fetches only the existing public upstream.txt fixture,
sequentially through Auto, WebView and JSC rules. The engine label describes the
configured rule; it does not independently identify the native engine selected
by Auto.

The first Shadowrocket local run matched cached keys but returned
unsupported-crypto for six playback callbacks. That code can represent missing
timers, randomness or subtle methods. Compression was not reached. This probe
separates those presence flags and tests actual AES-CTR, HMAC, random API and
gzip/Brotli round trips, reusing capture.ts public-vector implementation.
The first native matrix established missing JSC crypto/compression APIs, but
Auto/WebView returned only probe-failed. Version .2 guards host/member reads,
preserves partial availability, binds native receivers and records safe read/call
failure paths plus error names. It also inventories native utility member names
without values or invocation. The exact Auto/WebView cause remains unproven until
the revised matrix runs. See ../../youtube-local/SR-RUNTIME-20261102-195208.json.

Passing tiny vectors does not establish full playback compatibility or memory/
performance limits. Native algorithm failure is distinct from API absence.

Publish runtime-probe.js and keep the existing public echo-probe/upstream.txt.
Add this directory's shadowrocket.sgmodule alongside the local YouTube module.
Refresh runtime-probe.js and confirm the page shows runtime-probe-20261102.2.
QX off, Shadowrocket on; YouTube can stay closed.
Open a fresh Safari page at the literal https://example.com/yt-runtime-probe?run=2. Tap
**Check Auto, WebView and JSC**, then **Save results JSON**. Send that JSON and the
PacketTunnel log. Browser fetches are limited to 15 seconds each and native
asynchronous checks share a 1.2-second deadline per response context.

The module appends example.com and raw.githubusercontent.com to MITM. Remove
its device rules/temporary hosts when finished; retain useful source/tests for
future runtime investigations. Existing YouTube configuration remains separate.

Build/test with Node 22.21.1, TypeScript 5.9.3 and esbuild 0.25.12 prepared only
in /private/tmp (no global installs or persistent environment changes):

```sh
python3 tools/youtube-device/runtime-probe/check.py \
  --node /private/tmp/maasea-tools/node/node-v22.21.1-darwin-arm64/bin/node \
  --typescript /private/tmp/maasea-tools/typescript/package/lib/tsc.js \
  --esbuild /private/tmp/maasea-tools/esbuild/package/bin/esbuild \
  --work-dir /private/tmp/maasea-tools/runtime-check
```

Remove the temporary tool/work directory afterward. validation.json records
strict typechecking, deterministic bundle output, offline public-vector/error/
timeout/UI checks and unchanged production hashes. Native results are pending.
