# QX request-stage playback test — build 20261101.6

The isolated echo checks passed. This test now checks the actual YouTube path.
It is a QX-only opt-in; existing Shadowrocket/Surge profiles keep their behavior.

## Publish and configure

1. Commit/push the changed source, rebuilt scripts and validation files. Refresh
   **youtube.request.js, youtube.response.js and tools/youtube-device/capture.js**
   in QX after publishing.
2. Replace your overlapping YouTube rules with the complete
   [quantumult-x.echo.conf](quantumult-x.echo.conf). Keep unrelated rules. Merge
   its hosts into your MITM list: `*.googlevideo.com, youtubei.googleapis.com,
   example.com`. Keep your trusted MITM certificate enabled.
3. Remove the old initplayback request-body **and response-body** rules, plus the
   bytes/echo probe rules. The new initplayback rule must be
   **script-analyze-echo-response**, with `localPlayback=true&qxEcho=true`.
   Do not run the capture observers alongside it. Leave Shadowrocket off.

## A. Normal playback with existing keys

1. Leave QX on. Keep log level **Error**. Do not reset keys yet.
2. Force-quit YouTube. Start a fresh QX HTTP capture, then reopen YouTube.
3. Play several videos and switch between them. Note ads, automatic playback,
   stalls, seeking and the approximate time of any failure.
4. Expect build `20261101.6`. Correctly keyed playback should log
   `YT-REQUEST ... mode=echo action=fetched`, then
   `YT-RESPONSE ... action=local-body` or `local-pass`.
   `verified>0` proves authenticated metadata processing. Positive removal counts
   identify removed ad fields. An ad-free interval alone proves neither.
5. If playback stalls, save the capture/logs before changing anything. A
   `duplicate-inflight`/508 result means the recursion guard stopped an internal
   fetch from recursively fetching itself. It does not mean the adapter worked.
   Other `action=error` lines identify the failed stage.

## B. Missing-key recovery, only if A plays normally

Keep QX and the same HTTP capture running.

1. In YouTube, play a video and pause it. **Leave YouTube running**.
2. Open Safari and enter this exact URL, unchanged:
   `https://example.com/yt-local-capture/prepare-bootstrap`
3. Confirm `prepared: true`. This locally clears only the YouTube key pair and
   the retired experiment's budget. YouTube Music keys and other settings remain.
4. Switch back to the still-running YouTube app and immediately select a different
   video. Do not force-quit YouTube or restart QX between steps 2 and 4.
5. Expect `mode=echo action=bootstrap-empty` if that request arrives without keys.
   This branch returns a real empty HTTP 200 **without fetching Google**.
   Then look for config refresh and correctly keyed playback. Whether YouTube
   automatically retries and recovers is the point of this device test.

## Export

Stop/save the HTTP capture and separate QX tunnel log. In Safari, open:
`https://example.com/yt-local-capture/export`

Send the HTTP ZIP, tunnel log and downloaded JSON privately. Include whether
phase A and B played automatically and when any ads or stalls appeared. Keep QX
on until the export finishes. `example.com` is literal: QX generates these pages
locally. Do not substitute a hostname or publish the key export.

## What is and is not established

The earlier probe established native binary input/output, true empty echo
completion and a public GET fetch. Offline tests establish the new adapter's
binary forwarding logic, request authentication, shared filtering/re-encoding,
unknown/media preservation, concurrent-key isolation, header normalization,
timeouts, error/redirect handling and recursion detection in mocked hosts.
The three original Next captures still match their golden outputs.

Real Google binary POST forwarding, native fetch re-entry, native buffering/
latency and YouTube's automatic retry after bootstrap are **not yet established**.
The earlier private playback archives are no longer available at their supplied
Downloads paths, so their 16 replay checks were not rerun for .6. Historical
results remain in the JSON reports; the current validation manifest does not
claim that replay. This test supplies fresh evidence for the new transport.

The candidate requests HTTP identity encoding and supports identity/gzip output;
other HTTP encodings fail explicitly. Input/output is bounded to 8 MiB after
native buffering, with the shared metadata bounds/deadlines. Native fetch has a
12-second script deadline and a 20-second per-envelope storage guard. A timeout
cannot cancel native I/O; a late result cannot publish a second response. The
storage guard is best effort, not an atomic cross-script lock. Native script
termination and memory limits remain device concerns.

No Maasea Worker is contacted in this local profile. Legacy/default mode still
retains it for comparison. Shadowrocket local behavior is the next client test
once QX passes. Surge remains untested. After final device validation, review
removal of the old youtube.response.qx.js experiment and temporary probe tools.
