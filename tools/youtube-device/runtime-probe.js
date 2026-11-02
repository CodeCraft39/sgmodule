// Public-vector runtime probe. Source: runtime-probe/. No private key/body capture.
"use strict";
(() => {
  // Script/Youtube/src/request/platform.ts
  function isQX(host) {
    return host.$task !== void 0;
  }

  // tools/youtube-device/capture.ts
  function record(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
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

  // Script/Youtube/src/protobuf/utf8.ts
  var utf8 = {
    encode(input = "") {
      const out = [];
      for (const ch of input) {
        let n = ch.codePointAt(0);
        if (n >= 55296 && n <= 57343) n = 65533;
        if (n < 128) out.push(n);
        else if (n < 2048) out.push(192 | n >> 6, 128 | n & 63);
        else if (n < 65536) out.push(224 | n >> 12, 128 | n >> 6 & 63, 128 | n & 63);
        else out.push(240 | n >> 18, 128 | n >> 12 & 63, 128 | n >> 6 & 63, 128 | n & 63);
      }
      return new Uint8Array(out);
    },
    decode(input = new Uint8Array(0)) {
      const out = [];
      for (let p = 0; p < input.length; ) {
        const first = input[p++];
        if (first < 128) {
          out.push(String.fromCharCode(first));
          continue;
        }
        const count = first >= 194 && first <= 223 ? 1 : first >= 224 && first <= 239 ? 2 : first >= 240 && first <= 244 ? 3 : -1;
        if (count < 0 || p + count > input.length) throw Error("protobuf-invalid-utf8");
        let n = first & (count === 1 ? 31 : count === 2 ? 15 : 7);
        for (let i = 0; i < count; i++) {
          const next = input[p++];
          if ((next & 192) !== 128) throw Error("protobuf-invalid-utf8");
          n = n << 6 | next & 63;
        }
        if (n < (count === 1 ? 128 : count === 2 ? 2048 : 65536) || n >= 55296 && n <= 57343 || n > 1114111) throw Error("protobuf-invalid-utf8");
        out.push(String.fromCodePoint(n));
      }
      return out.join("");
    }
  };

  // tools/youtube-device/runtime-probe/api-snapshot.ts
  function errorName(error) {
    try {
      const name = error?.name;
      return typeof name === "string" && /^[A-Za-z][A-Za-z0-9]{0,47}$/.test(name) ? name : "Error";
    } catch {
      return "Error";
    }
  }
  function apiSnapshot(host) {
    const readFailures = [];
    const callFailures = [];
    function read(value, name, path) {
      if (value === void 0 || value === null) return void 0;
      try {
        return Object(value)[name];
      } catch (error) {
        readFailures.push({ path, errorName: errorName(error) });
        return void 0;
      }
    }
    const crypto = read(host, "crypto", "crypto");
    const subtle = read(crypto, "subtle", "crypto.subtle");
    const names = ["importKey", "verify", "sign", "decrypt", "encrypt"];
    const methods = {};
    for (const name of names) methods[name] = read(subtle, name, "crypto.subtle." + name);
    const random = read(crypto, "getRandomValues", "crypto.getRandomValues");
    const set = read(host, "setTimeout", "setTimeout"), clear = read(host, "clearTimeout", "clearTimeout");
    const compress = read(host, "CompressionStream", "CompressionStream");
    const decompress = read(host, "DecompressionStream", "DecompressionStream");
    const secure = read(host, "isSecureContext", "isSecureContext");
    const wasm = read(host, "WebAssembly", "WebAssembly");
    const module = read(wasm, "Module", "WebAssembly.Module"), instance = read(wasm, "Instance", "WebAssembly.Instance");
    const utilities = {};
    for (const name of ["$utils", "$crypto", "CryptoJS"]) utilities[name] = read(host, name, name);
    const reflect = read(host, "Reflect", "Reflect"), object = read(host, "Object", "Object");
    const nativeUtilityMemberNames = {};
    for (const [name, value] of Object.entries(utilities)) {
      if (!value || !["object", "function"].includes(typeof value)) continue;
      try {
        nativeUtilityMemberNames[name] = Object.getOwnPropertyNames(value).filter((key) => /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(key)).sort().slice(0, 80);
      } catch (error) {
        readFailures.push({ path: name + ".memberNames", errorName: errorName(error) });
      }
    }
    const subtleMethods = {};
    for (const name of names) subtleMethods[name] = typeof methods[name] === "function";
    const nativeUtilities = {};
    for (const name of ["$utils", "$crypto", "CryptoJS"]) nativeUtilities[name] = typeof utilities[name];
    const availability = {
      cryptoPresent: !!crypto,
      subtlePresent: !!subtle,
      subtleMethods,
      randomValues: typeof random === "function",
      setTimeout: typeof set === "function",
      clearTimeout: typeof clear === "function",
      compressionStream: typeof compress === "function",
      decompressionStream: typeof decompress === "function",
      secureContext: typeof secure === "boolean" ? secure : null,
      nativeUtilities,
      intrinsics: { reflectGet: typeof read(reflect, "get", "Reflect.get") === "function", objectValues: typeof read(object, "values", "Object.values") === "function" },
      nativeUtilityMemberNames,
      productionApiPreconditions: typeof set === "function" && typeof clear === "function" && typeof random === "function" && names.every((name) => subtleMethods[name]),
      readFailures,
      callFailures
    };
    function bound(value, receiver, path, asynchronous = false) {
      if (typeof value !== "function") return void 0;
      const failed = (error) => {
        callFailures.push({ path, errorName: errorName(error) });
        throw error;
      };
      return (...args) => {
        try {
          const result = Function.prototype.apply.call(value, receiver, args);
          return asynchronous ? Promise.resolve(result).catch(failed) : result;
        } catch (error) {
          return failed(error);
        }
      };
    }
    const boundMethods = {};
    for (const name of names) boundMethods[name] = bound(methods[name], subtle, "crypto.subtle." + name, true);
    const safeHost = {
      $done() {
      },
      console: { log() {
      } },
      crypto: crypto ? {
        subtle: subtle ? boundMethods : void 0,
        getRandomValues: bound(random, crypto, "crypto.getRandomValues")
      } : void 0,
      setTimeout: bound(set, host, "setTimeout"),
      clearTimeout: bound(clear, host, "clearTimeout"),
      CompressionStream: compress,
      DecompressionStream: decompress,
      TextEncoder: read(host, "TextEncoder", "TextEncoder"),
      TextDecoder: read(host, "TextDecoder", "TextDecoder"),
      WebAssembly: wasm ? { Module: module, Instance: instance } : void 0
    };
    return { availability, host: safeHost };
  }

  // tools/youtube-device/runtime-probe/main.ts
  var BUILD = "runtime-probe-20261102.2";
  var FIXTURE = "https://raw.githubusercontent.com/CodeCraft39/sgmodule/master/tools/youtube-device/echo-probe/upstream.txt";
  function page() {
    return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shadowrocket runtime check</title>
<style>body{font:17px system-ui;margin:24px}button,a{font:inherit}pre{white-space:pre-wrap;word-break:break-word}</style>
<h2>Shadowrocket runtime check</h2><p>Build: ${BUILD}</p><p>Public test vectors only. Leave Shadowrocket on; YouTube can stay closed.</p>
<button id="run">Check Auto, WebView and JSC</button> <a id="save" hidden download="yt-runtime-probe.json">Save results JSON</a><pre id="out"></pre>
<script>
const run=document.getElementById('run'),out=document.getElementById('out'),save=document.getElementById('save');
let download;
run.onclick=async()=>{run.disabled=true;save.hidden=true;const results=[];out.textContent='Checking...';
for(const engine of ['auto','webview','jsc']){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch('${FIXTURE}?sr-runtime='+engine+'&run='+Date.now(),{cache:'no-store',credentials:'omit',signal:controller.signal});
 const value=await response.json();if(!response.ok||value.build!=='${BUILD}'||value.engineRequested!==engine)throw Error('invalid-response');results.push(value);}
 catch{results.push({engineRequested:engine,error:'fetch-or-probe-failed'});}
 finally{clearTimeout(timer);}
 out.textContent=JSON.stringify(results,null,2);
}
if(download)URL.revokeObjectURL(download);download=URL.createObjectURL(new Blob([JSON.stringify({build:'${BUILD}',results},null,2)],{type:'application/json'}));
save.href=download;save.hidden=false;run.disabled=false;
};
<\/script>`;
  }
  function outputHeaders(input = {}) {
    const output = {};
    for (const [name, value] of Object.entries(input))
      if (!["content-type", "content-encoding", "content-length", "transfer-encoding", "connection", "access-control-allow-origin", "cache-control"].includes(name.toLowerCase())) output[name] = value;
    return { ...output, "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
  }
  async function runRuntimeProbe(host) {
    let completed = false;
    const done = (value) => {
      if (!completed) {
        completed = true;
        host.$done(value);
      }
    };
    const client = isQX(host) ? "QX" : host.$rocket ? "Shadowrocket" : "Surge-compatible";
    const url = host.$request?.url ?? "";
    if (/^https:\/\/example\.com\/yt-runtime-probe(?:\?[^#]*)?$/.test(url) && !host.$response) {
      if ((host.$request?.method ?? "GET").toUpperCase() !== "GET") {
        done({});
        return;
      }
      const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }, body = page();
      done(isQX(host) ? { status: "HTTP/1.1 200 OK", headers, body } : { response: { status: 200, headers, body } });
      return;
    }
    const engine = url.match(/^https:\/\/raw\.githubusercontent\.com\/CodeCraft39\/sgmodule\/master\/tools\/youtube-device\/echo-probe\/upstream\.txt\?sr-runtime=(auto|webview|jsc)(?:&[^#]*)?$/)?.[1];
    if (!engine || !host.$response || (host.$request?.method ?? "GET").toUpperCase() !== "GET") {
      done({});
      return;
    }
    try {
      const snapshot = apiSnapshot(host);
      let tests;
      let probeError;
      try {
        tests = await capabilities(snapshot.host);
      } catch (error) {
        probeError = { stage: "public-vector-checks", errorName: errorName(error) };
      }
      const result = { build: BUILD, client, role: "response", engineRequested: engine, availability: snapshot.availability, tests, probeError };
      host.console.log(`[YT-RUNTIME ${BUILD}] client=${client} engineRequested=${engine} result=${JSON.stringify({ availability: snapshot.availability, tests, probeError })}`);
      const body = utf8.encode(JSON.stringify(result));
      done({ headers: outputHeaders(host.$response.headers), ...isQX(host) ? { bodyBytes: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) } : { body } });
    } catch (error) {
      const body = utf8.encode(JSON.stringify({ build: BUILD, client, engineRequested: engine, error: "probe-failed", probeError: { stage: "snapshot-or-output", errorName: errorName(error) } }));
      done({ headers: outputHeaders(host.$response.headers), ...isQX(host) ? { bodyBytes: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) } : { body } });
    }
  }

  // tools/youtube-device/runtime-probe/entry.ts
  void runRuntimeProbe(globalThis);
})();
