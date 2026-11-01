# Controlled QX empty-body check

Completed at 21:34: nonempty replacement worked; both empty replacements left
ORIGINAL in Safari and the HTTP export. Do not repeat this probe. The next
request-stage check is described in [../echo-probe/README.md](../echo-probe/README.md).

The YouTube bootstrap experiment failed: its log requested zero bytes, but the
HTTP export retained the full ad-bearing response. We need to distinguish native
replacement behavior from HTTP Analyzer's handling of an empty replacement.
These public text fixtures avoid another YouTube key reset or an ad-delivery test.
This probe is temporary and must be removed from the device after evaluation.

1. Remove `&bootstrapRetry=true` from the YouTube initplayback response script URL.
   Keep the other production settings. Do not use prepare-bootstrap again.
2. Commit/push bytes-probe.js, bytes-probe.conf and the three .txt fixtures in this
   directory. Refresh the probe script resource in QX after adding its rule.
3. Merge the one rule in bytes-probe.conf into rewrite_local and add
   raw.githubusercontent.com to the existing MITM hosts. Keep QX on and logging
   at Error. Do not replace unrelated rules or hostnames.
4. Start a fresh HTTP capture, then open each URL in Safari once:

   - https://raw.githubusercontent.com/CodeCraft39/sgmodule/master/tools/youtube-device/bytes-probe/nonempty.txt?run=1
   - https://raw.githubusercontent.com/CodeCraft39/sgmodule/master/tools/youtube-device/bytes-probe/empty-bytes.txt?run=1
   - https://raw.githubusercontent.com/CodeCraft39/sgmodule/master/tools/youtube-device/bytes-probe/empty-text.txt?run=1

5. Report what Safari actually displays for each URL and send the HTTP ZIP plus
   tunnel log. No key export is needed. For a repeat, change run=1 to run=2 so
   Safari makes a fresh request rather than reusing a cached page.

Each fixture originally contains QX-PROBE:ORIGINAL (17 bytes). The nonempty control
requests QX-PROBE:REPLACED (17 bytes). Both empty cases request zero bytes using
different completion properties. The log proves only what the script requested;
Safari's display is essential for checking what reached the client. A source-status
error invalidates that case. These are text fixtures, so this probe alone cannot
establish identical behavior for every binary content type or YouTube retries.

QX's official binary example documents bodyBytes as an ArrayBuffer and supports
replacement buffers:
https://github.com/crossutility/Quantumult-X/blob/master/sample-bytes-rewrite.js
It does not establish how a zero-length replacement is handled natively.
