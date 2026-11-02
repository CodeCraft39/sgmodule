import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const script=fs.readFileSync(process.argv[2],'utf8');
const fixture='https://raw.githubusercontent.com/CodeCraft39/sgmodule/master/tools/youtube-device/echo-probe/upstream.txt';
const build='runtime-probe-20261102.2';
async function run({url=fixture+'?sr-runtime=auto&run=1',method='GET',response=true,features=true,patch={},getters={},qx=false}={}){
 const results=[],logs=[];let storage=0,fetches=0;
 const host={ArrayBuffer,Uint8Array,DataView,Object,Reflect,$request:{url,method,headers:{Authorization:'PRIVATE-AUTH'}},$rocket:{},
  console:{log:s=>logs.push(String(s))},$persistentStore:{read(){storage++;throw Error('PRIVATE-STORE');},write(){storage++;throw Error('PRIVATE-STORE');}},
  $httpClient:{get(){fetches++;throw Error('PRIVATE-FETCH');},post(){fetches++;throw Error('PRIVATE-FETCH');}},
  setTimeout,clearTimeout,...(features?{crypto:webcrypto,CompressionStream,DecompressionStream,TextEncoder,TextDecoder,WebAssembly}:{}),...patch};
 for(const [key,get] of Object.entries(getters))Object.defineProperty(host,key,{get,configurable:true});
 if(response)host.$response={headers:{'Content-Type':'text/plain','Content-Length':'16','Content-Encoding':'gzip','Transfer-Encoding':'chunked','Cache-Control':'old','Access-Control-Allow-Origin':'old',Keep:'yes'},body:new Uint8Array(Buffer.from('PRIVATE-BODY'))};
 if(qx){host.$task={fetch(){fetches++;throw Error('PRIVATE-FETCH');}};host.$prefs={valueForKey(){storage++;throw Error('PRIVATE-STORE');}};}
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('completion-timeout')),3000);host.$done=r=>{results.push(r);clearTimeout(timer);resolve();};try{vm.runInNewContext(script,{ArrayBuffer,Uint8Array,DataView,globalThis:host},{timeout:3000});}catch(e){clearTimeout(timer);reject(e);}});
 assert.equal(results.length,1);assert.equal(storage,0);assert.equal(fetches,0);assert(!logs.join('\n').includes('PRIVATE-'));
 const result=results[0],bytes=result.bodyBytes??result.body;
 return {result,results,logs,data:bytes instanceof ArrayBuffer?Buffer.from(bytes).toString():bytes instanceof Uint8Array?Buffer.from(bytes).toString():bytes};
}
const payload=r=>JSON.parse(r.data);
test('control page is local, public-only and offers a sequential matrix plus JSON download',async()=>{
 const r=await run({url:'https://example.com/yt-runtime-probe',response:false});
 assert.equal(r.result.response.status,200);const html=r.result.response.body;
 assert(html.includes('Check Auto, WebView and JSC'));assert(html.includes('yt-runtime-probe.json'));assert(html.includes('credentials:\'omit\''));
 assert(!html.includes('youtubei.googleapis.com'));assert(!html.includes('YouTubeConfig'));
});
test('public AES/HMAC/gzip vectors pass with real native APIs',async()=>{
 const r=await run(),p=payload(r);assert.equal(p.build,build);assert.equal(p.role,'response');assert.equal(p.engineRequested,'auto');assert.equal(p.availability.productionApiPreconditions,true);
 for(const key of ['aesCtr','hmacSha256','gzip','randomValues'])assert.equal(p.tests[key],'pass');
});
test('missing timer functions are distinguishable from missing cryptography',async()=>{
 for(const key of ['setTimeout','clearTimeout']){
  const p=payload(await run({patch:{[key]:undefined}}));assert.equal(p.availability[key],false);assert.equal(p.availability.subtlePresent,true);assert.equal(p.availability.productionApiPreconditions,false);assert.equal(p.tests.aesCtr,'not-run');
 }
});
test('missing crypto, randomness and individual methods have separate presence flags',async()=>{
 const missing=payload(await run({features:false}));assert.equal(missing.availability.cryptoPresent,false);assert.equal(missing.availability.productionApiPreconditions,false);
 const noRandom=payload(await run({patch:{crypto:{subtle:webcrypto.subtle}}}));assert.equal(noRandom.availability.randomValues,false);assert.equal(noRandom.availability.subtlePresent,true);
 const partial={importKey:webcrypto.subtle.importKey.bind(webcrypto.subtle),encrypt:webcrypto.subtle.encrypt.bind(webcrypto.subtle),decrypt:webcrypto.subtle.decrypt.bind(webcrypto.subtle),sign:webcrypto.subtle.sign.bind(webcrypto.subtle)};
 const noVerify=payload(await run({patch:{crypto:{subtle:partial,getRandomValues:webcrypto.getRandomValues.bind(webcrypto)}}}));assert.equal(noVerify.availability.subtleMethods.verify,false);assert.equal(noVerify.availability.productionApiPreconditions,false);assert.equal(noVerify.tests.hmacSha256,'unavailable');
});
test('native operation failures are reported without printing native exception text',async()=>{
 const subtle=Object.fromEntries(['importKey','encrypt','decrypt','verify'].map(k=>[k,webcrypto.subtle[k].bind(webcrypto.subtle)]));subtle.sign=async()=>{throw Error('PRIVATE-NATIVE-ERROR');};
 const p=payload(await run({patch:{crypto:{subtle,getRandomValues:webcrypto.getRandomValues.bind(webcrypto)}}}));assert.equal(p.tests.aesCtr,'pass');assert.equal(p.tests.hmacSha256,'failed');assert(p.availability.callFailures.some(f=>f.path==='crypto.subtle.sign'));
});
test('crypto deadlines complete once and report timeout without hanging the page',async()=>{
 const subtle={importKey:()=>new Promise(()=>{}),encrypt(){},decrypt(){},verify(){},sign(){}};
 const r=await run({patch:{crypto:{subtle,getRandomValues:webcrypto.getRandomValues.bind(webcrypto)},setTimeout:(fn,ms)=>setTimeout(fn,ms===1200?5:ms)}}),p=payload(r);
 assert.equal(p.tests.aesCtr,'timeout');assert.equal(p.tests.hmacSha256,'timeout');assert.equal(r.results.length,1);
});
test('compression absence and unsupported formats remain distinct',async()=>{
 const absent=payload(await run({patch:{CompressionStream:undefined,DecompressionStream:undefined}}));assert.equal(absent.tests.gzip,'unavailable');assert.equal(absent.availability.compressionStream,false);
 const unsupported=payload(await run({patch:{CompressionStream:class{constructor(){throw Error('unsupported');}}}}));assert.equal(unsupported.tests.gzip,'unsupported');
});
test('binary JSON results remove stale framing/encoding metadata and permit public cross-origin reads',async()=>{
 const r=await run();assert(r.result.body instanceof Uint8Array);assert.equal(r.result.headers['Content-Type'],'application/json; charset=utf-8');assert.equal(r.result.headers['Access-Control-Allow-Origin'],'*');assert.equal(r.result.headers.Keep,'yes');
 for(const name of ['Content-Length','Content-Encoding','Transfer-Encoding'])assert.equal(r.result.headers[name],undefined);
 const qx=await run({qx:true});assert(qx.result.bodyBytes instanceof ArrayBuffer);assert.equal(payload(qx).client,'QX');
});
test('unrelated traffic and wrong phases complete without collecting or changing data',async()=>{
 for(const opts of [{url:'https://youtubei.googleapis.com/youtubei/v1/next'},{url:fixture+'?sr-runtime=unknown'},{response:false},{method:'POST'},{url:'https://example.com/yt-runtime-probe',method:'POST',response:false}]){
  const r=await run(opts);assert.deepEqual(Object.keys(r.result),[]);assert.equal(r.logs.length,0);
 }
});
test('the shipped module isolates all three engines and contains no YouTube observers',()=>{
 const text=fs.readFileSync(new URL('./shadowrocket.sgmodule',import.meta.url),'utf8');const lines=text.split('\n').filter(l=>l.startsWith('yt.runtime.'));assert.equal(lines.length,4);
 for(const engine of ['auto','webview','jsc']){const matching=lines.filter(l=>{const pattern=l.match(/pattern=(.*?),requires-body=/)?.[1];return pattern&&new RegExp(pattern).test(fixture+'?sr-runtime='+engine+'&run=1');});assert.equal(matching.length,1);assert(matching[0].includes('engine='+engine+','));assert(matching[0].includes('binary-body-mode=1'));}
 assert(!text.includes('googlevideo.com'));assert(text.includes('hostname = %APPEND% example.com, raw.githubusercontent.com'));
});
test('the browser control runs sequential checks, preserves partial failures and downloads JSON',async()=>{
 const r=await run({url:'https://example.com/yt-runtime-probe',response:false});const js=r.result.response.body.match(/<script>([\s\S]*)<\/script>/)[1];
 const elements={run:{disabled:false},out:{textContent:''},save:{hidden:true}},seen=[];let blob,inflight=0;
 vm.runInNewContext(js,{document:{getElementById:id=>elements[id]},AbortController,Blob,setTimeout,clearTimeout,URL:{createObjectURL:b=>(blob=b,'blob:public'),revokeObjectURL(){}},fetch:async(url,opts)=>{assert.equal(++inflight,1);assert.equal(opts.credentials,'omit');assert(url.startsWith(fixture+'?sr-runtime='));const engine=new URL(url).searchParams.get('sr-runtime');seen.push(engine);inflight--;if(engine==='webview')throw Error('public network failure');return {ok:true,json:async()=>({build,engineRequested:engine})};}});
 await elements.run.onclick();assert.deepEqual(seen,['auto','webview','jsc']);assert.equal(elements.run.disabled,false);assert.equal(elements.save.hidden,false);const out=JSON.parse(await blob.text());assert.equal(out.results.length,3);assert.equal(out.results[1].error,'fetch-or-probe-failed');
});

test('a throwing crypto getter does not discard compression or timer results',async()=>{
 const r=await run({getters:{crypto(){const e=Error('PRIVATE-ACCESS-ERROR');e.name='SecurityError';throw e;}}}),p=payload(r);
 assert.equal(p.availability.cryptoPresent,false);assert.equal(p.availability.setTimeout,true);assert.equal(p.tests.gzip,'pass');assert.equal(p.tests.aesCtr,'unavailable');
 assert.deepEqual(p.availability.readFailures,[{path:'crypto',errorName:'SecurityError'}]);assert.equal(p.error,undefined);
});
test('a throwing native utility getter cannot abort crypto vector tests',async()=>{
 const p=payload(await run({getters:{$utils(){throw Error('PRIVATE-UTILITY-ERROR');}}}));
 assert.equal(p.tests.aesCtr,'pass');assert.equal(p.tests.hmacSha256,'pass');assert(p.availability.readFailures.some(f=>f.path==='$utils'));
});
test('throwing subtle and method accessors retain all independent flags and checks',async()=>{
 const crypto={getRandomValues:webcrypto.getRandomValues.bind(webcrypto)};Object.defineProperty(crypto,'subtle',{get(){throw Error('PRIVATE-SUBTLE-ERROR');}});
 const p=payload(await run({patch:{crypto}}));assert.equal(p.availability.cryptoPresent,true);assert.equal(p.availability.subtlePresent,false);assert.equal(p.tests.randomValues,'pass');assert.equal(p.tests.gzip,'pass');assert(p.availability.readFailures.some(f=>f.path==='crypto.subtle'));
 const subtle={};Object.defineProperty(subtle,'importKey',{get(){throw Error('PRIVATE-METHOD-ERROR');}});
 const q=payload(await run({patch:{crypto:{subtle,getRandomValues:webcrypto.getRandomValues.bind(webcrypto)}}}));assert.equal(q.availability.subtlePresent,true);assert.equal(q.availability.subtleMethods.importKey,false);assert(q.availability.readFailures.some(f=>f.path==='crypto.subtle.importKey'));assert.equal(q.tests.gzip,'pass');
});
test('throwing optional WASM and secure-context accessors remain isolated',async()=>{
 const wasm={};Object.defineProperty(wasm,'Module',{get(){throw Error('PRIVATE-WASM-ERROR');}});
 const p=payload(await run({patch:{WebAssembly:wasm},getters:{isSecureContext(){throw Error('PRIVATE-CONTEXT-ERROR');}}}));
 assert.equal(p.tests.aesCtr,'pass');assert.equal(p.tests.wasm,'unavailable');assert(p.availability.readFailures.some(f=>f.path==='WebAssembly.Module'));assert(p.availability.readFailures.some(f=>f.path==='isSecureContext'));
});
test('a vector-run failure preserves availability and a safe stage without raw native error text',async()=>{
 const p=payload(await run({patch:{clearTimeout(){throw new TypeError('PRIVATE-CLEAR-ERROR');}}}));
 assert.equal(p.availability.productionApiPreconditions,true);assert.equal(p.error,undefined);assert.deepEqual(p.probeError,{stage:'public-vector-checks',errorName:'TypeError'});assert.deepEqual(p.availability.callFailures,[{path:'clearTimeout',errorName:'TypeError'}]);
});
test('Reflect absence is reported without making the diagnostic depend on Reflect',async()=>{
 const p=payload(await run({patch:{Reflect:undefined}}));assert.equal(p.availability.intrinsics.reflectGet,false);assert.equal(p.tests.aesCtr,'pass');assert.equal(p.tests.hmacSha256,'pass');
});
test('native calls preserve their receiver and utility inventory contains names only',async()=>{
 const original={};for(const name of ['importKey','verify','sign','decrypt','encrypt'])original[name]=function(...args){assert.equal(this,original);return webcrypto.subtle[name](...args);};
 const p=payload(await run({patch:{crypto:{subtle:original,getRandomValues:webcrypto.getRandomValues.bind(webcrypto)},$utils:{gzip(){throw Error('must not invoke');},randomBytes(){throw Error('must not invoke');}}}}));
 assert.equal(p.tests.aesCtr,'pass');assert.equal(p.tests.hmacSha256,'pass');assert.deepEqual(p.availability.nativeUtilityMemberNames.$utils,['gzip','randomBytes']);
});
