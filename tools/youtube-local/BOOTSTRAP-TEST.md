# QX startup experiment — build 20261101.5

The normal local mode retains .4 behavior. The experiment is disabled unless
`bootstrapRetry=true` is explicitly set on the initplayback response script.
It has not passed a device test. Keep the .4 checkpoint as the known working
post-refresh baseline.

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
