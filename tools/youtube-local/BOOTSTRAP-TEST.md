# QX startup experiment — build 20261101.5

The normal local mode retains .4 behavior. The experiment is disabled unless
`bootstrapRetry=true` is explicitly set on the initplayback response script.
It has not passed a device test. Keep the .4 checkpoint as the known working
post-refresh baseline.

## 21:34 result: zero-length response replacements are not applied

The controlled bytes probe reproduced the behavior without YouTube. Safari and
HTTP captures both show REPLACED for nonempty bytes and ORIGINAL for empty bytes
and empty text. Script logs confirm all three cases ran with 17 input bytes.
This resolves the Analyzer-only ambiguity for those controlled cases; it does
not prove that YouTube retries a genuine empty response. See
[QX-20261101-213425.json](QX-20261101-213425.json).

Keep bootstrapRetry disabled and do not reset keys. The next isolated test is
[request-stage echo completion](../youtube-device/echo-probe/README.md), using one
Safari page and three synthetic POST checks. Production scripts are unchanged.

## 21:07 result: response-emptying experiment failed

Stop this YouTube reset experiment and remove bootstrapRetry=true from the
initplayback response URL. The normal local filtering path remains the baseline.
Session 66 entered bootstrap-empty and requested 1,354,013 -> 0 bytes, but the
HTTP export retains 1,354,013 bytes. Independent decryption with export 5 finds
five placement entries and one ad slot still present. The user observed ads.
Session 71 refreshed keys, but no later playback retry is captured.

This fails native acceptance. It does not prove whether QX ignored the empty
replacement or its analyzer exported original bytes for an empty output; the
callback log alone cannot decide that. Use the isolated three-case
[bytes probe](../youtube-device/bytes-probe/README.md) to compare nonempty bytes,
empty bytes and empty text, including Safari's actual display. No new YouTube
key export or reset is needed for that probe. The steps below are retained as
investigation history, not instructions to repeat the failed trial.
See [QX-20261101-210707.json](QX-20261101-210707.json).

## 20:53 QX result and the next timing trial

The preparation control succeeded, but log_event 11 refreshed keys before the
first playback request (40). All seven playback responses authenticated, and
five reported removing 87 placement entries, five slots and 15 rich items.
Independent decryption verifies all 12 captured metadata blocks. There were no
bootstrap-empty or missing-key logs. This validates early-key startup and normal
filtering, not the empty-response/client-retry experiment. See
[QX-20261101-205314.json](QX-20261101-205314.json).

For the next trial, keep the same scripts and profile. Let YouTube finish normal
startup and play/pause a video first. Leave the app running. Start a fresh capture,
open prepare-bootstrap in Safari, then return to YouTube and immediately select
a different video without force-quitting it. This changes the timing relative
to startup telemetry; it does not guarantee that missing keys will precede a
log_event refresh. Only a recorded bootstrap-empty plus an empty HTTP body and
subsequent automatic playback can validate that path. Send the same three exports.

## Device steps

1. Commit/push the rebuilt request/response scripts, updated
   `tools/youtube-device/capture.js`, and the source/test changes. Refresh all
   three script resources in QX. Production logs should show `20261101.5`.
2. Keep Shadowrocket off. In QX, replace overlapping YouTube/export rewrites
   with this directory's `quantumult-x.bootstrap.conf`. It has five rules and
   includes the existing MITM hosts plus example.com. Keep log level Error.
3. Force-quit YouTube. Start a fresh HTTP capture. In Safari open exactly:
   `https://example.com/yt-local-capture/prepare-bootstrap`
   Expect capture build `capture-20261101.2` and `prepared: true`.
   This explicit test action clears only YouTube's cached key record and its
   bootstrap suppression budget. It preserves Music, unrelated preferences and
   previous diagnostic observations. Keep the earlier key exports private.
4. Open YouTube and play one video. Note whether it starts automatically or
   needs a manual retry. Do not manually retry immediately; allow about 15 seconds
   to observe the result. Then test several more videos, seeking and switching.
5. Export the HTTP ZIP and separate tunnel log. Finally open
   `https://example.com/yt-local-capture/export` and retain its JSON privately.
   Send all three and your playback observations.

The preparation action intentionally differs from the previous test's instruction
to retain the cache: we now need a controlled missing-key state. Run it once per
capture attempt, not repeatedly while YouTube is running. If playback stalls,
disable `bootstrapRetry` by returning to `quantumult-x.conf`; keep the new scripts
and the existing export rule if needed. Normal mode preserves pass-through.

## What the experiment does

When local mode has no client key, the response hook checks HTTP status 200,
UMP content type, complete UMP framing and a supported type-25 encrypted envelope.
It records a per-app budget before returning an empty binary body. This keeps
that response from reaching the app with unfiltered metadata. It makes no fetch
and changes no request body.

Until successful authenticated HTTP-200 metadata is processed, subsequent
missing-key responses pass through with `reason=used`. Corruption, unsupported
formats and storage failures also pass unchanged. A successful response releases
the budget; configuration refresh alone does not release it. This prevents
sequential endless suppression. QX preferences provide no compare-and-swap API,
so this budget is not a strict global atomic guarantee for parallel script
executions; the capture must check actual request ordering and suppression count.

This is a response-body replacement, retaining Google's status/MIME type.
Maasea's original bootstrap is an empty synthetic 200 in the request stage, with
text/plain MIME. The experiment is therefore not claimed to be identical. It
only tests whether the app refreshes/retries successfully with the simpler
existing response-hook architecture.

Expected evidence is `action=bootstrap-empty` followed by config refresh and
successful `local-body`/`local-pass` with verified metadata. A log saying empty
was returned only proves the script requested that replacement. The HTTP trace
must confirm a zero-byte response followed by a subsequent playback request,
and the app must start without manual recovery.
Positive removal counts are still required to demonstrate ad filtering. If keys
arrive before the first playback request and no `bootstrap-empty` occurs, that
run has not exercised this experiment.

## What the existing capture proves

No configuration keys or the initial request's encrypted token appear in the
captured guide/browse/other API responses before session 36. The first recorded
key-bearing response is log_event 42, whose keys do not match request 36. It is
not possible to decrypt that first response with the available exports.

The pinned original request bundle returns a nested empty binary HTTP 200 for
missing keys on both its SR and QX branches. This was reproduced independently
in the VM. It establishes the author's fallback policy, not proof of automatic
retry on QX.

Seven public bootstrap test groups cover opt-in behavior, the sequential budget,
format/status guards, storage errors, app isolation, successful release and
non-release on authentication/protocol errors. The capture helper has 15 passing
test groups, including preparation scope and failures. The paired legacy and
private-capture checks also pass.

QX's official [binary rewrite example](https://github.com/crossutility/Quantumult-X/blob/master/sample-bytes-rewrite.js)
documents ArrayBuffer body replacement. Its [sample configuration](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf)
says body-related rewrites handle length/encoding headers. Neither source promises
how YouTube reacts to an empty playback response.

For helper validation accompanying this production change, run its checker with
`--production-check paired` after the paired checker. Its default checkpoint
mode remains available for isolated diagnostic-only work.
