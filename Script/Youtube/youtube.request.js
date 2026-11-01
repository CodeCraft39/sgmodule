// Reconstructed Maasea request script. Source: src/request/. Device validation pending.
(() => {
  // Script/Youtube/src/request/constants.ts
  var BUILD = "request-compat-20261101.5";
  var CONFIG_KEY = "YouTubeConfig";
  var WORKER_URL = "https://init-stream.maasea.workers.dev/";

  // Script/Youtube/src/request/base64.ts
  function decodeBase64(value) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const text = value.replace(/[\t\n\r ]/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw Error("invalid-base64");
    const unpadded = text.replace(/=+$/, "");
    if (unpadded.length % 4 === 1 || text.includes("=") && text.length % 4 !== 0) {
      throw Error("invalid-base64-length");
    }
    const out = new Uint8Array(Math.floor(unpadded.length * 6 / 8));
    let bits = 0, count = 0, index = 0;
    for (const ch of unpadded) {
      bits = bits << 6 | alphabet.indexOf(ch);
      count += 6;
      if (count >= 8) {
        count -= 8;
        out[index++] = bits >> count & 255;
      }
    }
    return out;
  }

  // Script/Youtube/src/protobuf/wire.ts
  function readFields(bytes2) {
    let p = 0;
    function uint32() {
      let value = 0, factor = 1;
      for (let i = 0; i < 5; i++, factor *= 128) {
        if (p >= bytes2.length) throw Error("protobuf-truncated-varint");
        const b = bytes2[p++];
        if (i === 4 && b > 15) throw Error("protobuf-uint32-overflow");
        value += (b & 127) * factor;
        if (!(b & 128)) return value;
      }
      throw Error("protobuf-invalid-varint");
    }
    function field(depth = 0) {
      if (depth > 32) throw Error("protobuf-group-depth");
      const start = p, tag = uint32(), no = Math.floor(tag / 8), wire = tag % 8, tagEnd = p;
      if (!no) throw Error("protobuf-invalid-tag");
      let dataStart = p;
      if (wire === 0) {
        let ended = false;
        for (let i = 0; i < 10; i++) {
          if (p >= bytes2.length) throw Error("protobuf-truncated-scalar");
          const b = bytes2[p++];
          if (i === 9 && b > 1) throw Error("protobuf-uint64-overflow");
          if (!(b & 128)) {
            ended = true;
            break;
          }
        }
        if (!ended) throw Error("protobuf-invalid-scalar");
      } else if (wire === 1) p += 8;
      else if (wire === 2) {
        const length = uint32();
        dataStart = p;
        p += length;
      } else if (wire === 3) {
        let ended = false;
        while (p < bytes2.length) {
          const child = field(depth + 1);
          if (child.wire === 4) {
            if (child.no !== no) throw Error("protobuf-mismatched-group");
            ended = true;
            break;
          }
        }
        if (!ended) throw Error("protobuf-unclosed-group");
      } else if (wire === 5) p += 4;
      else if (wire !== 4) throw Error("protobuf-invalid-wire");
      if (p > bytes2.length) throw Error("protobuf-truncated-field");
      return { no, wire, tag: bytes2.subarray(start, tagEnd), raw: bytes2.subarray(start, p), data: bytes2.subarray(dataStart, p) };
    }
    const result = [];
    while (p < bytes2.length) {
      const next = field();
      if (next.wire === 4) throw Error("protobuf-unexpected-end-group");
      result.push(next);
    }
    return result;
  }

  // Script/Youtube/src/request/schema.ts
  var requestFields = {
    OnesieRequest: { encryptedInnertubeRequest: 3 },
    EncryptedInnertubeRequest: { encryptedOnesieInnertubeRequest: 2, encryptedClientKey: 5, iv: 6, hmac: 7 }
  };

  // Script/Youtube/src/request/protobuf.ts
  function decodeOnesieRequest(bytes2) {
    const result = { unknownFields: [] };
    for (const outer of readFields(bytes2)) {
      if (outer.no !== requestFields.OnesieRequest.encryptedInnertubeRequest) {
        result.unknownFields.push(outer);
        continue;
      }
      if (outer.wire !== 2) throw Error("protobuf-wrong-onesie-wire");
      const nested = result.encryptedInnertubeRequest ?? {
        encryptedOnesieInnertubeRequest: new Uint8Array(0),
        encryptedClientKey: new Uint8Array(0),
        iv: new Uint8Array(0),
        hmac: new Uint8Array(0),
        unknownFields: []
      };
      for (const f of readFields(outer.data)) {
        const name = Object.keys(requestFields.EncryptedInnertubeRequest).find((key) => requestFields.EncryptedInnertubeRequest[key] === f.no);
        if (name) {
          if (f.wire !== 2) throw Error("protobuf-wrong-bytes-wire");
          nested[name] = f.data;
        } else nested.unknownFields.push(f);
      }
      result.encryptedInnertubeRequest = nested;
    }
    return result;
  }

  // Script/Youtube/src/request/core.ts
  function header(headers, name) {
    return Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
  }
  function platformKey(headers) {
    return (header(headers, "user-agent") ?? "").toLowerCase().includes("music") ? "youtubeMusic" : "youtube";
  }
  function endpoint(url) {
    if (/^https?:\/\/[^/?#]+\/initplayback(?:[?#]|$)/i.test(url)) return "initplayback";
    if (/^https?:\/\/[^/?#]+\/youtubei\/v1\/log_event(?:[?#]|$)/i.test(url)) return "log_event";
    return "other";
  }
  function workerUrl(clientKey, target, params) {
    const query = [`ck=${encodeURIComponent(clientKey)}`, `target=${encodeURIComponent(target)}`];
    for (const [key, value] of Object.entries(params)) query.push(`${key}=${encodeURIComponent(String(value))}`);
    return `${WORKER_URL}?${query.join("&")}`;
  }
  function processRequest(input) {
    const key = platformKey(input.headers), config = input.config;
    const base = { platformKey: key, config, changed: false };
    const route = endpoint(input.url);
    if (route === "other") return { ...base, action: "pass", reason: "unhandled-endpoint" };
    const cached = config[key];
    if (route === "log_event") {
      const needsConfig = input.localPlayback ? !(cached?.clientKey && cached.encryptKey && cached.hotHashData && cached.hotHashData === header(input.headers, "x-youtube-hot-hash-data")) : !cached?.clientKey;
      const headers = { ...input.headers };
      for (const name of Object.keys(headers)) {
        const lower = name.toLowerCase();
        if (lower === "content-encoding" && !input.preserveBodyEncoding || needsConfig && lower === "x-youtube-hot-hash-data") delete headers[name];
      }
      return { ...base, action: "headers", reason: input.localPlayback ? needsConfig ? "config-refresh" : "cache-validated" : cached?.clientKey ? "cache-present" : "cache-missing", headers };
    }
    if (input.localPlayback && input.bodyBytes === void 0)
      return { ...base, action: "pass", reason: "body-unavailable" };
    let reason = "cache-missing";
    if (cached?.clientKey && cached.encryptKey) {
      reason = "body-unavailable";
      if (input.bodyBytes !== void 0) {
        const requestKey = decodeOnesieRequest(input.bodyBytes).encryptedInnertubeRequest?.encryptedClientKey;
        const cacheKey = decodeBase64(cached.encryptKey);
        if (requestKey && requestKey.length === cacheKey.length && requestKey.every((v, i) => v === cacheKey[i])) {
          if (input.localPlayback) return { ...base, action: "pass", reason: "key-match" };
          return { ...base, action: "redirect", reason: "key-match", redirectUrl: workerUrl(cached.clientKey, input.url, input.params) };
        }
        reason = "key-mismatch";
      }
    }
    const changed = !!cached, updated = { ...config };
    if (changed) delete updated[key];
    return { ...base, action: input.localPlayback ? "pass" : "empty", reason, changed, config: changed ? updated : config };
  }

  // Script/Youtube/src/request/options.ts
  function bool(value, fallback) {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return fallback;
  }
  function record(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function options(host) {
    let values = {};
    const arg = host.$argument;
    if (typeof arg === "string" && !arg.includes("{{{")) values = record(JSON.parse(arg));
    else values = record(arg);
    const sourcePath = host.$environment?.sourcePath;
    if (sourcePath?.includes("#")) {
      const fragment = sourcePath.slice(sourcePath.indexOf("#") + 1);
      for (const pair of fragment.split("&")) {
        const split = pair.indexOf("=");
        if (split > 0) values[decodeURIComponent(pair.slice(0, split))] = decodeURIComponent(pair.slice(split + 1));
      }
    }
    values = { ...values, ...record(host.$environment?.variables) };
    return {
      worker: {
        captionLang: typeof values.captionLang === "string" ? values.captionLang : "off",
        blockUpload: bool(values.blockUpload, true),
        blockImmersive: bool(values.blockImmersive, true),
        blockShorts: bool(values.blockShorts, false)
      },
      debug: bool(values.debug, false),
      localPlayback: bool(values.localPlayback, false),
      bootstrapRetry: bool(values.bootstrapRetry, false)
    };
  }

  // Script/Youtube/src/request/platform.ts
  function isQX(host) {
    return host.$task !== void 0;
  }
  function bytes(value) {
    if (value === void 0 || value === null) return void 0;
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw Error("request-body-is-not-binary");
  }
  function completion(decision, qx) {
    if (decision.action === "redirect") {
      if (!qx) return { url: decision.redirectUrl };
      return { status: "HTTP/1.1 307 Temporary Redirect", headers: {
        Location: decision.redirectUrl,
        "Cache-Control": "no-store"
      }, body: "" };
    }
    if (decision.action === "empty") {
      return qx ? { status: "HTTP/1.1 200 OK", headers: { "Content-Type": "text/plain" }, body: "" } : { response: { status: 200, headers: { "Content-Type": "text/plain" }, body: new Uint8Array(0) } };
    }
    if (decision.action === "headers") return { headers: decision.headers };
    return {};
  }

  // Script/Youtube/src/request/diagnostics.ts
  function sessionSuffix(request) {
    const id = request?.sessionIndex ?? request?.id;
    return typeof id === "number" || typeof id === "string" && /^[\w-]{1,80}$/.test(id) ? ` session=${id}` : "";
  }

  // Script/Youtube/src/request/main.ts
  function loadConfig(raw) {
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed === null) return {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error("config-is-not-an-object");
    for (const name of ["youtube", "youtubeMusic"]) {
      const entry = parsed[name];
      if (entry !== void 0 && (!entry || typeof entry !== "object" || Array.isArray(entry))) throw Error("config-entry-is-not-an-object");
      if (entry && (entry.clientKey !== void 0 && typeof entry.clientKey !== "string" || entry.encryptKey !== void 0 && typeof entry.encryptKey !== "string")) throw Error("config-key-is-not-a-string");
    }
    return parsed;
  }
  function run(host) {
    const qx = isQX(host), client = qx ? "QX" : host.$rocket !== void 0 ? "Shadowrocket" : "Surge-compatible";
    const request = host.$request;
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      host.$done(result);
    };
    const log = (message) => host.console.log(`[YT-REQUEST ${BUILD}] client=${client} ${message}`);
    const route = endpoint(request?.url ?? "");
    const sessionText = sessionSuffix(request);
    let stage = "arguments";
    let local = false;
    try {
      if (!request || route === "other") {
        finish({});
        return;
      }
      const opts = options(host);
      local = opts.localPlayback;
      stage = "config";
      const raw = qx ? host.$prefs?.valueForKey(CONFIG_KEY) : host.$persistentStore?.read(CONFIG_KEY);
      const config = loadConfig(raw);
      stage = "body";
      const body = route === "initplayback" ? bytes(qx ? request.bodyBytes ?? request.body : request.body ?? request.bodyBytes) : void 0;
      stage = "decision";
      const decision = processRequest({
        url: request.url,
        headers: request.headers ?? {},
        bodyBytes: body,
        config,
        params: opts.worker,
        preserveBodyEncoding: qx || local,
        localPlayback: local
      });
      let persisted = "not-needed";
      if (decision.changed) {
        const serialized = JSON.stringify(decision.config);
        try {
          const ok = qx ? host.$prefs?.setValueForKey(serialized, CONFIG_KEY) : host.$persistentStore?.write(serialized, CONFIG_KEY);
          persisted = ok === false || qx && ok === void 0 ? "failed" : "saved";
        } catch {
          persisted = "failed";
        }
      }
      if (persisted === "failed") log(`endpoint=${route} event=storage-write-failed${sessionText}`);
      if (opts.debug) {
        log(`endpoint=${route} action=${decision.action} reason=${decision.reason} bodyBytes=${body?.length ?? "unavailable"} cache=${persisted}${local ? " mode=local" : ""}${sessionText}`);
        log(`output=${qx && decision.action === "redirect" ? "http-307" : decision.action} binary=${body !== void 0}${sessionText}`);
      }
      finish(completion(decision, qx));
    } catch {
      const echo = qx && route === "initplayback" && !local;
      log(`endpoint=${route} action=${echo ? "empty" : "pass"} reason=processing-error stage=${stage}${sessionText}`);
      const fallback = {
        action: "empty",
        reason: "processing-error",
        platformKey: platformKey(request?.headers ?? {}),
        config: {},
        changed: false
      };
      finish(echo ? completion(fallback, true) : {});
    }
  }

  // Script/Youtube/src/request/entry.ts
  run(globalThis);
})();
