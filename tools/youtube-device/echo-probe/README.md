# QX request-stage API probe

The 21:34 response-body test confirmed that both zero-length completion values
left the original body intact in Safari and the HTTP export. Nonempty byte
replacement worked. That explains why the response-emptying bootstrap experiment
cannot be accepted. No production-script changes are made for this next probe.

## Completed device result — 21:57

All three checks passed. The archive contains exact 16-byte POST bodies including
NUL, 0x80 and 0xff, a zero-byte synthetic HTTP 200, the intended 13-byte binary
response, and a 16-byte binary fetch/echo result. Safari and the capture agree.
The upstream public file was gzip encoded in its captured transaction, while the
native fetch callback and final echo contained the 16 decoded bytes.
See [../../youtube-local/QX-20261101-215745.json](../../youtube-local/QX-20261101-215745.json).

This establishes the tested API primitives, not a real YouTube POST/retry path.
Same-URL fetch re-entry, outbound binary forwarding, headers/compression/errors
and YouTube retry behavior remain integration requirements. The device steps
below are retained for reproduction; this three-case probe need not be repeated.

## Device steps

1. Keep bootstrapRetry disabled. Do not use prepare-bootstrap or reset keys.
2. Commit/push echo-probe.js, echo-probe.conf and echo-probe/upstream.txt.
3. Add the two rules in echo-probe.conf under rewrite_local. Keep example.com and
   raw.githubusercontent.com in MITM, preserving unrelated hosts. Refresh the
   new echo-probe.js resource. The completed bytes-probe rule can be disabled.
4. Keep QX on, Shadowrocket off and logging at Error. YouTube stays closed.
   Start a fresh HTTP capture and open this literal URL in Safari:
   https://example.com/yt-local-capture/echo-probe
5. Tap Run three checks once. Copy all three displayed result lines and send
   them with the HTTP ZIP and separate tunnel log. No key export is needed.

Expected outputs are HTTP 200 with zero bytes/[blank], 13 bytes/QX-ECHO:BYTES,
and 16 bytes/QX-ECHO:UPSTREAM. Each input should say ArrayBuffer or ArrayBufferView, and match true.
The page posts a fixed 16-byte synthetic payload including NUL, 0x80 and 0xff;
there are no credentials, cookies or YouTube data. It measures the response seen
by Safari rather than relying on the script's intended output or Analyzer alone.

## Scope

The first rule creates the local control page using script-echo-response. The
three checks use script-analyze-echo-response, so they can inspect binary request
bytes and return a complete HTTP response in the request stage. Empty text in
this API is a different operation from trying to empty an existing response.
Binary output in this combined context is deliberately unverified until this
probe runs. The fetch check retrieves only the unmatched public upstream.txt
fixture using native $task.fetch; it sends no private headers or data.

This tests synthetic HTTP response creation, binary input/output and a binary
GET fetch round trip. It does not validate forwarding arbitrary binary POSTs to
Google, compressed upstream handling, YouTube retry behavior or latency. Those
remain required before adopting a QX request-stage transport adapter. Such an
adapter must share the existing filtering core and contact Google directly,
preserving the working SR/Surge path and avoiding an external processing Worker.

The official QX echo example documents flat status/headers/body completion:
https://github.com/crossutility/Quantumult-X/blob/master/sample-echo-response.js
The binary rewrite example documents ArrayBuffer results from $task.fetch:
https://github.com/crossutility/Quantumult-X/blob/master/sample-bytes-rewrite.js
Their request-stage combination still needs the native device evidence above.
Remove the temporary device rules when evaluation is complete.
