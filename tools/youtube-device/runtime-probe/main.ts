// Public-vector runtime diagnostics. No private input, key store or network calls.
import {capabilities} from '../capture';
import {isQX} from '../../../Script/Youtube/src/request/platform';
import {utf8} from '../../../Script/Youtube/src/protobuf/utf8';
import type {Headers} from '../../../Script/Youtube/src/request/types';

type CaptureHost = Parameters<typeof capabilities>[0];
interface RuntimeHost extends CaptureHost {
  isSecureContext?: boolean;
  $utils?: unknown;
  $crypto?: unknown;
  CryptoJS?: unknown;
}
export const BUILD = 'runtime-probe-20261102.1';
const FIXTURE = 'https://raw.githubusercontent.com/CodeCraft39/sgmodule/master/tools/youtube-device/echo-probe/upstream.txt';
function page(): string {
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shadowrocket runtime check</title>
<style>body{font:17px system-ui;margin:24px}button,a{font:inherit}pre{white-space:pre-wrap;word-break:break-word}</style>
<h2>Shadowrocket runtime check</h2><p>Public test vectors only. Leave Shadowrocket on; YouTube can stay closed.</p>
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
</script>`;
}
export function availability(host: RuntimeHost) {
  const api = host.crypto?.subtle;
  const method = (name: string) => !!api && typeof Reflect.get(Object(api),name) === 'function';
  const subtleMethods = {importKey:method('importKey'),verify:method('verify'),sign:method('sign'),decrypt:method('decrypt'),encrypt:method('encrypt')};
  const result = {
    cryptoPresent:!!host.crypto,subtlePresent:!!api,subtleMethods,
    randomValues:typeof host.crypto?.getRandomValues === 'function',
    setTimeout:typeof host.setTimeout === 'function',clearTimeout:typeof host.clearTimeout === 'function',
    compressionStream:typeof host.CompressionStream === 'function',decompressionStream:typeof host.DecompressionStream === 'function',
    secureContext:typeof host.isSecureContext === 'boolean' ? host.isSecureContext : null,
    nativeUtilities:{$utils:typeof host.$utils,$crypto:typeof host.$crypto,CryptoJS:typeof host.CryptoJS},
  };
  return {...result,productionApiPreconditions:result.setTimeout&&result.clearTimeout&&result.randomValues&&Object.values(subtleMethods).every(Boolean)};
}
function outputHeaders(input: Headers = {}): Headers {
  const output: Headers = {};
  for (const [name,value] of Object.entries(input))
    if (!['content-type','content-encoding','content-length','transfer-encoding','connection','access-control-allow-origin','cache-control'].includes(name.toLowerCase())) output[name]=value;
  return {...output,'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
}
export async function runRuntimeProbe(host: RuntimeHost): Promise<void> {
  let completed = false;
  const done = (value: Record<string,unknown>) => { if (!completed) { completed=true;host.$done(value); } };
  const client = isQX(host) ? 'QX' : host.$rocket ? 'Shadowrocket' : 'Surge-compatible';
  const url = host.$request?.url ?? '';
  if (/^https:\/\/example\.com\/yt-runtime-probe(?:\?[^#]*)?$/.test(url) && !host.$response) {
    if ((host.$request?.method??'GET').toUpperCase() !== 'GET') { done({});return; }
    const headers = {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'},body = page();
    done(isQX(host) ? {status:'HTTP/1.1 200 OK',headers,body} : {response:{status:200,headers,body}});return;
  }
  const engine = url.match(/^https:\/\/raw\.githubusercontent\.com\/CodeCraft39\/sgmodule\/master\/tools\/youtube-device\/echo-probe\/upstream\.txt\?sr-runtime=(auto|webview|jsc)(?:&[^#]*)?$/)?.[1];
  if (!engine || !host.$response || (host.$request?.method??'GET').toUpperCase() !== 'GET') { done({});return; }
  try {
    const apis = availability(host),tests = await capabilities(host);
    const result = {build:BUILD,client,role:'response',engineRequested:engine,availability:apis,tests};
    host.console.log(`[YT-RUNTIME ${BUILD}] client=${client} engineRequested=${engine} result=${JSON.stringify({availability:apis,tests})}`);
    const body = utf8.encode(JSON.stringify(result));
    done({headers:outputHeaders(host.$response.headers),...(isQX(host) ? {bodyBytes:body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength)} : {body})});
  } catch {
    const body = utf8.encode(JSON.stringify({build:BUILD,client,engineRequested:engine,error:'probe-failed'}));
    done({headers:outputHeaders(host.$response.headers),...(isQX(host)?{bodyBytes:body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength)}:{body})});
  }
}
