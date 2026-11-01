// Temporary local playback capture helper. Source: tools/youtube-device/capture.ts. Remove its device rules after capture.
"use strict";
(() => {
  // Script/Youtube/src/request/platform.ts
  function isQX(host) {
    return host.$task !== void 0;
  }

  // Script/Youtube/src/request/diagnostics.ts
  function sessionSuffix(request) {
    const id = request?.sessionIndex ?? request?.id;
    return typeof id === "number" || typeof id === "string" && /^[\w-]{1,80}$/.test(id) ? ` session=${id}` : "";
  }

  // Script/Youtube/src/protobuf/onesie.ts
  var MAX_PLAYBACK_BYTES = 8 * 1024 * 1024;
  var MAX_METADATA_BYTES = 8 * 1024 * 1024;

  // Script/Youtube/src/response/bootstrap.ts
  var BOOTSTRAP_STORE = "YouTubeBootstrap.v1";

  // tools/youtube-device/capture.ts
  var BUILD = "capture-20261101.2";
  var STORE = "YTLocalCapture.v1";
  var LIMIT = 32;
  function record(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function read(host, key) {
    return isQX(host) ? host.$prefs?.valueForKey(key) : host.$persistentStore?.read(key);
  }
  function write(host, value) {
    if (isQX(host)) return host.$prefs?.setValueForKey(value, STORE) === true;
    if (!host.$persistentStore) return false;
    return host.$persistentStore.write(value, STORE) !== false;
  }
  function keys(host) {
    try {
      const raw = read(host, "YouTubeConfig");
      if (!raw) return { keys: {}, status: "missing" };
      const root = record(JSON.parse(raw)), result = {};
      for (const name of ["youtube", "youtubeMusic"]) {
        const entry = record(root[name]);
        const clientKey = typeof entry.clientKey === "string" && entry.clientKey.length <= 4096 ? entry.clientKey : void 0;
        const encryptKey = typeof entry.encryptKey === "string" && entry.encryptKey.length <= 4096 ? entry.encryptKey : void 0;
        if (clientKey || encryptKey) result[name] = { clientKey, encryptKey };
      }
      return { keys: result, status: Object.keys(result).length ? "present" : "missing-or-invalid" };
    } catch {
      return { keys: {}, status: "read-failed-or-invalid" };
    }
  }
  function report(host) {
    try {
      const raw = read(host, STORE);
      if (raw && raw.length < 262144) {
        const parsed = record(JSON.parse(raw));
        if (parsed.format === 1 && parsed.build === BUILD && Array.isArray(parsed.observations))
          return { format: 1, build: BUILD, observations: parsed.observations.slice(-LIMIT) };
      }
    } catch {
    }
    return { format: 1, build: BUILD, observations: [] };
  }
  function bodySummary(value) {
    if (value instanceof ArrayBuffer) return { kind: "ArrayBuffer", bytes: value.byteLength };
    if (value instanceof Uint8Array) return { kind: "Uint8Array", bytes: value.byteLength };
    if (ArrayBuffer.isView(value)) return { kind: "ArrayBufferView", bytes: value.byteLength };
    if (typeof value === "string") return { kind: "string", characters: value.length };
    return { kind: "unavailable" };
  }
  function hex(value) {
    return new Uint8Array(value.match(/../g).map((byte) => parseInt(byte, 16)));
  }
  function equal(a, b) {
    return a.length === b.length && a.every((byte, i) => byte === b[i]);
  }
  async function check(work) {
    try {
      return await work() ? "pass" : "failed";
    } catch {
      return "failed";
    }
  }
  async function transform(stream, bytes) {
    const writer = stream.writable.getWriter(), reader = stream.readable.getReader();
    const drain = (async () => {
      const chunks = [];
      let total = 0;
      while (true) {
        const value = await reader.read();
        if (value.done) break;
        if (!value.value) throw Error("missing-stream-value");
        total += value.value.length;
        if (total > 65536) {
          await reader.cancel();
          throw Error("probe-output-limit");
        }
        chunks.push(value.value);
      }
      const output2 = new Uint8Array(total);
      let p = 0;
      for (const chunk of chunks) {
        output2.set(chunk, p);
        p += chunk.length;
      }
      return output2;
    })();
    const written = (async () => {
      await writer.write(bytes);
      await writer.close();
    })();
    const [output] = await Promise.all([drain, written]);
    return output;
  }
  async function capabilities(host) {
    const result = {
      aesCtr: "unavailable",
      hmacSha256: "unavailable",
      gzip: "unavailable",
      brotli: "unavailable",
      br: "unavailable",
      subtlePresent: !!host.crypto?.subtle,
      randomValuesPresent: typeof host.crypto?.getRandomValues === "function",
      randomValues: "unavailable",
      wasm: "unavailable",
      textEncoderPresent: typeof host.TextEncoder === "function",
      textDecoderPresent: typeof host.TextDecoder === "function",
      elapsedMs: 0
    };
    if (result.randomValuesPresent) {
      try {
        const input = new Uint8Array(16);
        const value = host.crypto.getRandomValues.call(host.crypto, input);
        result.randomValues = value === input ? "pass" : "failed";
      } catch {
        result.randomValues = "failed";
      }
    }
    if (host.WebAssembly && typeof host.WebAssembly.Module === "function" && typeof host.WebAssembly.Instance === "function") {
      try {
        new host.WebAssembly.Instance(new host.WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])));
        result.wasm = "pass";
      } catch {
        result.wasm = "failed";
      }
    }
    if (!host.setTimeout || !host.clearTimeout) {
      if (result.subtlePresent) result.aesCtr = result.hmacSha256 = "not-run";
      if (host.CompressionStream && host.DecompressionStream) result.gzip = result.brotli = result.br = "not-run";
      return result;
    }
    const started = Date.now();
    const pending = [];
    const tasks = [];
    const subtle = record(host.crypto?.subtle);
    const api = host.crypto?.subtle;
    const schedule = (name, run) => {
      result[name] = "not-run";
      pending.push(name);
      tasks.push(check(run).then((status) => {
        result[name] = status;
      }));
    };
    if (["importKey", "encrypt", "decrypt"].every((name) => typeof subtle[name] === "function")) schedule("aesCtr", async () => {
      const key = await api.importKey("raw", hex("2b7e151628aed2a6abf7158809cf4f3c"), { name: "AES-CTR" }, false, ["encrypt", "decrypt"]);
      const algorithm = { name: "AES-CTR", counter: hex("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff"), length: 128 };
      const plain = hex("6bc1bee22e409f96e93d7e117393172a");
      const encrypted = new Uint8Array(await api.encrypt(algorithm, key, plain));
      return equal(encrypted, hex("874d6191b620e3261bef6864990db6ce")) && equal(new Uint8Array(await api.decrypt(algorithm, key, encrypted)), plain);
    });
    if (["importKey", "sign", "verify"].every((name) => typeof subtle[name] === "function")) schedule("hmacSha256", async () => {
      const key = await api.importKey("raw", new Uint8Array(20).fill(11), { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign", "verify"]);
      const data = new Uint8Array([72, 105, 32, 84, 104, 101, 114, 101]);
      const signature = new Uint8Array(await api.sign("HMAC", key, data));
      return equal(signature, hex("b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7")) && await api.verify("HMAC", key, signature, data);
    });
    if (host.CompressionStream && host.DecompressionStream) for (const format of ["gzip", "brotli", "br"]) {
      let encoder, decoder;
      try {
        encoder = new host.CompressionStream(format);
        decoder = new host.DecompressionStream(format);
      } catch {
        result[format] = "unsupported";
        continue;
      }
      schedule(format, async () => {
        const input = new Uint8Array([89, 84, 45, 108, 111, 99, 97, 108, 45, 112, 114, 111, 98, 101]);
        const compressed = await transform(encoder, input);
        const output = await transform(decoder, compressed);
        return equal(input, output);
      });
    }
    let timer;
    try {
      await Promise.race([Promise.all(tasks), new Promise((resolve) => {
        timer = host.setTimeout(resolve, 1200);
      })]);
    } finally {
      if (timer !== void 0) host.clearTimeout(timer);
    }
    const snapshot = { ...result, elapsedMs: Date.now() - started };
    for (const name of pending) if (snapshot[name] === "not-run") snapshot[name] = "timeout";
    return snapshot;
  }
  function jsonResponse(host, value, download = true) {
    const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
    if (download) headers["Content-Disposition"] = 'attachment; filename="yt-local-capture.json"';
    const body = JSON.stringify(value, null, 2);
    return isQX(host) ? { status: "HTTP/1.1 200 OK", headers, body } : { response: { status: 200, headers, body } };
  }
  async function runCapture(host) {
    let completed = false;
    const done = (value) => {
      if (!completed) {
        completed = true;
        host.$done(value);
      }
    };
    const log = (value) => host.console.log(`[YT-CAPTURE ${BUILD}] ${value}`);
    try {
      const url = host.$request?.url ?? "";
      const action = url.match(/^https:\/\/example\.com\/yt-local-capture\/(export|reset|prepare-bootstrap)(?:[?#]|$)/)?.[1];
      if (action) {
        if (host.$response || (host.$request?.method ?? "GET").toUpperCase() !== "GET") {
          done({});
          return;
        }
        if (action === "prepare-bootstrap") {
          let configCleared = false, budgetCleared = false;
          try {
            const config = record(JSON.parse(read(host, "YouTubeConfig") ?? "{}"));
            delete config.youtube;
            const budget = record(JSON.parse(read(host, BOOTSTRAP_STORE) ?? '{"version":1}'));
            if (budget.version !== 1) throw Error("unsupported-budget");
            delete budget.youtube;
            if (isQX(host)) {
              configCleared = host.$prefs?.setValueForKey(JSON.stringify(config), "YouTubeConfig") === true;
              budgetCleared = host.$prefs?.setValueForKey(JSON.stringify(budget), BOOTSTRAP_STORE) === true;
            }
          } catch {
          }
          done(jsonResponse(host, { build: BUILD, prepared: configCleared && budgetCleared, youtubeConfigCleared: configCleared, bootstrapBudgetCleared: budgetCleared }, false));
        } else if (action === "reset") {
          let ok = false;
          try {
            ok = write(host, JSON.stringify({ format: 1, build: BUILD, observations: [] }));
          } catch {
          }
          done(jsonResponse(host, { build: BUILD, reset: ok, scope: STORE }, false));
        } else done(jsonResponse(host, { ...report(host), exportedAt: (/* @__PURE__ */ new Date()).toISOString(), currentConfiguration: keys(host) }));
        return;
      }
      if (!/^https?:\/\/[\w-]+\.googlevideo\.com\/initplayback(?:[?#]|$)/.test(url)) {
        done({});
        return;
      }
      const phase = "direct-google";
      const role = host.$response ? "response" : "request";
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const privateConfig = keys(host);
      const saved = report(host), client = isQX(host) ? "QX" : host.$rocket ? "Shadowrocket" : "Surge-compatible";
      const previous = [...saved.observations].reverse().find((o) => o.client === client && o.role === role && o.phase === phase && Date.now() - Date.parse(o.timestamp) >= 0 && Date.now() - Date.parse(o.timestamp) < 6e5);
      const caps = previous?.capabilities ?? await capabilities(host);
      const input = host.$response ?? host.$request;
      const headers = record(input?.headers);
      const header2 = (name) => {
        const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
        return key && typeof headers[key] === "string" ? headers[key].slice(0, 256) : void 0;
      };
      const body = bodySummary(isQX(host) ? input?.bodyBytes ?? input?.body : input?.body ?? input?.bodyBytes);
      const observation = {
        timestamp,
        client,
        phase,
        role,
        session: sessionSuffix(host.$request).trim(),
        method: host.$request?.method ?? "unknown",
        body,
        headers: { contentType: header2("content-type"), contentEncoding: header2("content-encoding"), contentLength: header2("content-length") },
        statusCode: host.$response?.statusCode,
        keys: privateConfig.keys,
        keyStatus: privateConfig.status,
        capabilities: caps
      };
      const latest = report(host);
      latest.observations.push(observation);
      latest.observations = latest.observations.slice(-LIMIT);
      let stored = false;
      try {
        stored = write(host, JSON.stringify(latest));
      } catch {
      }
      log(`client=${client} phase=${phase} role=${role} ${observation.session} body=${body.kind} bytes=${body.bytes ?? "unavailable"} keys=${privateConfig.status} aes=${caps.aesCtr} hmac=${caps.hmacSha256} gzip=${caps.gzip} brotli=${caps.brotli}/${caps.br} wasm=${caps.wasm} random=${caps.randomValues} stored=${stored}`);
      done({});
    } catch {
      log("event=probe-failed traffic=unchanged");
      done({});
    }
  }

  // tools/youtube-device/entry.ts
  void runCapture(globalThis);
})();
