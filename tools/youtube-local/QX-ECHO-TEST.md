# Deterministic missing-key diagnostic — bootstrap-probe-20261102.1

The temporary profile is
`../youtube-device/bootstrap-probe/quantumult-x.conf`. It replaces only the QX
playback script URL with bootstrap-probe.js and adds arm/status/cancel control
URLs. API responses, log_event and key exports retain their production handlers.
The builder embeds the exact validated production request bundle. Neither
production script is changed and no source is fetched/evaluated at runtime.

1. Publish the diagnostic source, builder, tests, validation and bootstrap-probe.js.
   Refresh that resource after installing the temporary profile.
2. Keep QX on, Shadowrocket off and logging at Error. Play/pause a video; leave
   YouTube running. Start a fresh HTTP capture.
3. Open `https://example.com/yt-local-capture/bootstrap-probe/arm` in Safari.
   Require `armed: true`. Arming leaves keys intact and expires after ten minutes.
4. Return to YouTube and select a different video exactly once. Do not tap retry,
   select another video or restart either app for about 60 seconds.
5. Open `https://example.com/yt-local-capture/bootstrap-probe/status`. Require
   `state: completed`, `emptyCompletionRequested: true` and
   `initialConfigReadMasked: true` for a valid injected test; these flags describe
   the requested completion, not proof of native delivery or automatic retry.
6. Open `https://example.com/yt-local-capture/export`, save its private JSON and
   save HTTP ZIP/tunnel log. Copy the status JSON and note whether the selected
   video recovered automatically, stalled or showed ads.
7. Open `https://example.com/yt-local-capture/bootstrap-probe/cancel`, require
   `cancelled: true`, and restore `quantumult-x.echo.conf` for normal use. If
   playback stalled, retain the evidence before force-quitting/reopening YouTube.

The wrapper consumes a matched YouTube POST, clears only the actual YouTube
configuration entry and makes the production handler's first config read see
that missing entry. A concurrent refresh remains intact in real preferences.
Subsequent requests delegate normally. Music and unrelated settings remain.
This forces the real production missing-key branch; it does not directly invent
an empty response. Confirm exactly one `YT-BOOTSTRAP ... action=force-missing-key`
in the native log: QX preferences provide no atomic cross-script lock.

Acceptance requires the app-facing capture to contain the actual empty 200,
fresh-key acquisition, and automatic retry/recovery with authenticated filtering.
No manual retry is allowed as evidence of automatic recovery. If it fails, the
capture supplies a concrete failure for the next fix; one run cannot guarantee
all variants. Remove this diagnostic asset/profile after the gap is validated.

Reproduce with the pinned Node/TypeScript/esbuild tools exclusively in
`/private/tmp/`, then remove that temporary directory:

```sh
python3 tools/youtube-device/bootstrap-probe/check.py \
  --node /private/tmp/maasea-tools/node/node-v22.21.1-darwin-arm64/bin/node \
  --typescript /private/tmp/maasea-tools/typescript/package/lib/tsc.js \
  --esbuild /private/tmp/maasea-tools/esbuild/package/bin/esbuild \
  --work-dir /private/tmp/maasea-tools/probe-check
```

---

# QX request-stage playback test — build 20261101.6

The 2 November run passed normal QX playback: five real Google binary POSTs were
fetched, filtered and echoed successfully. The final pair independently verifies
four placements/one slot removed and three rich items removed. All 518 unaffected
UMP frames across the five pairs are byte-exact. See
[QX-20261102-092452.json](QX-20261102-092452.json).

The reset action succeeded, but log_event refreshed keys before the next playback
POST. Missing-key empty completion/client retry was **not exercised**. Do not
repeat phase B expecting timing alone to guarantee it; deterministic diagnostic
coverage is needed to validate that remaining branch. The steps below retain the
procedure that produced this evidence. Existing SR/Surge profiles are unchanged.

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

Real Google binary POST forwarding and full-response completion are now
native-verified for this run, with no observed fetch recursion or playback
failures. Forced re-entry, native timeout/memory boundaries and YouTube's
automatic retry after bootstrap are **not yet established**.
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
