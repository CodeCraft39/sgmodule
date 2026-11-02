# Runtime capability probe

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
Passing tiny vectors does not establish full playback compatibility or memory/
performance limits. Native algorithm failure is distinct from API absence.

Publish runtime-probe.js and keep the existing public echo-probe/upstream.txt.
Add this directory's shadowrocket.sgmodule alongside the local YouTube module.
Refresh runtime-probe.js. QX off, Shadowrocket on; YouTube can stay closed.
Open the literal https://example.com/yt-runtime-probe in Safari. Tap
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
