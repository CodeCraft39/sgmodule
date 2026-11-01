// Temporary QX response-completion probe. Only public static fixture URLs match.
// No YouTube traffic, preferences, keys, fetches or notifications are used.
(() => {
  const match = $request.url.match(/^https:\/\/raw\.githubusercontent\.com\/CodeCraft39\/sgmodule\/master\/tools\/youtube-device\/bytes-probe\/(nonempty|empty-bytes|empty-text)\.txt(?:\?.*)?$/);
  if (!match) { $done({}); return; }
  const mode = match[1];
  if ($response.statusCode !== 200) {
    console.log(`[YT-BYTES-PROBE] case=${mode} action=pass reason=source-status`);
    $done({}); return;
  }
  const original = $response.bodyBytes;
  const isBytes = original instanceof ArrayBuffer;
  const inputBytes = isBytes ? original.byteLength : 'unavailable';
  if (mode === 'empty-text') {
    console.log(`[YT-BYTES-PROBE] case=${mode} inputBytes=${inputBytes} requestedBytes=0 output=body-string`);
    $done({body:''}); return;
  }
  const replacement = mode === 'nonempty'
    ? new Uint8Array([81,88,45,80,82,79,66,69,58,82,69,80,76,65,67,69,68])
    : new Uint8Array(0);
  console.log(`[YT-BYTES-PROBE] case=${mode} inputBytes=${inputBytes} requestedBytes=${replacement.byteLength} output=bodyBytes`);
  $done({bodyBytes:replacement.buffer});
})();
