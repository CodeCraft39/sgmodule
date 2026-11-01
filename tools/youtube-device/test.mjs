import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {runCapture,capabilities,STORE,BUILD}=require(path.resolve(process.argv[2]));
const bundle=fs.readFileSync(process.argv[3],'utf8');
const INIT='https://r1---test.googlevideo.com/initplayback?x=1&ack=1';
const config=JSON.stringify({youtube:{clientKey:'PRIVATE-CLIENT-KEY',encryptKey:'PRIVATE-ENCRYPTED-KEY',unrelated:'omit'},metadata:'omit-me'});
function host({client='qx',response=false,url=INIT,store={YouTubeConfig:config,otherPreference:'keep'},mode='ok',native=false}={}){
 const done=[],logs=[],writes=[],requests=[];
 const request={url,method:'POST',headers:{'Content-Type':'application/octet-stream','Authorization':'PRIVATE-AUTHORIZATION'},sessionIndex:7};
 const body=new Uint8Array([1,2,255]);
 const h={ArrayBuffer,Uint8Array,$request:request,$done:v=>done.push(v),console:{log:s=>logs.push(String(s))},setTimeout,clearTimeout};
 const write=(value,key)=>{writes.push(key);if(mode==='throw')throw Error('PRIVATE-ERROR');if(mode==='false')return false;store[key]=value;return true;};
 if(client==='qx'){
  h.$task={fetch:()=>{requests.push('fetch');throw Error('must not fetch');}};
  h.$prefs={valueForKey:key=>store[key]??null,setValueForKey:write};request.bodyBytes=body.buffer;
 }else{
  h.$persistentStore={read:key=>store[key]??null,write};request.body=body;
  if(client==='sr')h.$rocket={};
 }
 if(response)h.$response=client==='qx'?{bodyBytes:body.buffer,statusCode:200,headers:{'content-encoding':'br'}}:{body,statusCode:200,headers:{'content-encoding':'br'}};
 if(native)Object.assign(h,{crypto:webcrypto,CompressionStream,DecompressionStream,WebAssembly,TextEncoder,TextDecoder});
 return {h,done,logs,writes,store,requests};
}
const plain=value=>JSON.parse(JSON.stringify(value));
const exported=result=>JSON.parse(result.response?.body??result.body);
async function run(options){const result=host(options);await runCapture(result.h);assert.equal(result.done.length,1);return result;}

test('native AES-CTR/HMAC public vectors and gzip round trip work',async()=>{
 const {h}=host({native:true});const result=await capabilities(h);
 assert.equal(result.aesCtr,'pass');assert.equal(result.hmacSha256,'pass');assert.equal(result.gzip,'pass');
 assert.equal(result.wasm,'pass');assert.equal(result.randomValues,'pass');
 assert(['pass','unsupported'].includes(result.brotli));assert(['pass','unsupported'].includes(result.br));
});

test('actual bundled observer completes unchanged across QX/SR/Surge adapters',async()=>{
 for(const client of ['qx','sr','surge'])for(const response of [false,true]){
  const r=host({client,response});const before=plain(r.h.$request),responseBefore=plain(r.h.$response??null);
  await new Promise((resolve,reject)=>{
   r.h.$done=value=>{r.done.push(value);resolve();};
   try{vm.runInNewContext(bundle,r.h,{timeout:2000});}catch(e){reject(e);}
  });
  assert.deepEqual(Object.keys(r.done[0]),[]);assert.deepEqual(plain(r.h.$request),before);assert.deepEqual(plain(r.h.$response??null),responseBefore);
  assert.equal(r.store.YouTubeConfig,config);assert.equal(r.store.otherPreference,'keep');assert.deepEqual(r.requests,[]);assert.deepEqual(r.writes,[STORE]);
  const entries=JSON.parse(r.store[STORE]).observations;assert.equal(entries.length,1);
  assert.equal(entries[0].role,response?'response':'request');assert.equal(entries[0].body.bytes,3);assert.equal(entries[0].session,'session=7');
  assert(!r.logs.join('\n').includes('PRIVATE-'));assert(!r.store[STORE].includes('PRIVATE-AUTHORIZATION'));assert(!r.store[STORE].includes('omit-me'));
 }
});

test('missing or failing native capabilities still preserve playback',async()=>{
 const noApi=await run({});const saved=JSON.parse(noApi.store[STORE]).observations[0];
 assert.equal(saved.capabilities.aesCtr,'unavailable');assert.equal(saved.capabilities.gzip,'unavailable');
 const {h}=host();h.crypto={subtle:{importKey:async()=>{throw Error('private');},encrypt(){},decrypt(){},sign(){},verify(){}}};
 const result=await capabilities(h);assert.equal(result.aesCtr,'failed');assert.equal(result.hmacSha256,'failed');
});

test('native capability deadline cannot leave playback waiting indefinitely',async()=>{
 const {h}=host();h.crypto={subtle:{importKey:()=>new Promise(()=>{}),encrypt(){},decrypt(){},sign(){},verify(){}}};
 const started=Date.now(),result=await capabilities(h);
 assert.equal(result.aesCtr,'timeout');assert.equal(result.hmacSha256,'timeout');assert(Date.now()-started<2500);
});

test('cached capabilities avoid repeated asynchronous tests in the same context type',async()=>{
 const first=await run({native:true});
 const next=host({store:first.store});next.h.crypto={subtle:{importKey:()=>{throw Error('must use recent snapshot');},encrypt(){},decrypt(){},sign(){},verify(){}}};
 await runCapture(next.h);assert.equal(JSON.parse(next.store[STORE]).observations.at(-1).capabilities.aesCtr,'pass');
});

test('export returns private configuration only to the exact synthetic endpoint',async()=>{
 for(const client of ['qx','sr','surge']){
  const r=host({client,url:'https://example.com/yt-local-capture/export'});r.h.$request.method='GET';await runCapture(r.h);
  const result=exported(r.done[0]);assert.equal(result.currentConfiguration.keys.youtube.clientKey,'PRIVATE-CLIENT-KEY');
  assert(!JSON.stringify(result).includes('omit'));assert(!r.logs.join('\n').includes('PRIVATE-'));assert.deepEqual(r.requests,[]);assert.deepEqual(r.writes,[]);
  const headers=r.done[0].headers??r.done[0].response.headers;assert.equal(headers['Cache-Control'],'no-store');assert(headers['Content-Disposition'].includes('attachment'));
 }
 for(const url of ['http://example.com/yt-local-capture/export','https://example.com.evil.test/yt-local-capture/export','https://example.com/yt-local-capture/export/other']){
  const r=await run({url});assert.deepEqual(Object.keys(r.done[0]),[]);assert.deepEqual(r.writes,[]);
 }
});

test('reset touches only the helper storage and preserves production keys',async()=>{
 for(const client of ['qx','sr']){
  const r=host({client,url:'https://example.com/yt-local-capture/reset',store:{YouTubeConfig:config,otherPreference:'keep',[STORE]:'broken'}});r.h.$request.method='GET';
  await runCapture(r.h);assert.equal(exported(r.done[0]).reset,true);assert.equal(JSON.parse(r.store[STORE]).observations.length,0);
  assert.equal(r.store.YouTubeConfig,config);assert.equal(r.store.otherPreference,'keep');assert.deepEqual(r.writes,[STORE]);
 }
});

test('diagnostic corruption/storage failures do not change playback or disclose errors',async()=>{
 for(const mode of ['false','throw']){
  const r=await run({mode,store:{YouTubeConfig:config,[STORE]:'PRIVATE-invalid-json'}});
  assert.deepEqual(Object.keys(r.done[0]),[]);assert(r.logs.some(l=>l.includes('stored=false')));assert(!r.logs.join('\n').includes('PRIVATE'));
 }
 for(const value of ['null','[]','not-json','{"youtube":{"clientKey":23}}']){
  const r=await run({store:{YouTubeConfig:value}});assert.equal(r.store.YouTubeConfig,value);assert.deepEqual(Object.keys(r.done[0]),[]);
 }
});

test('bounded observations retain recent evidence and sliced views report correct lengths',async()=>{
 const store={YouTubeConfig:config};
 for(let i=0;i<35;i++){const r=host({store});r.h.$request.bodyBytes=new Uint8Array(20).subarray(4,9);await runCapture(r.h);}
 const rows=JSON.parse(store[STORE]).observations;assert.equal(rows.length,32);assert.equal(rows.at(-1).body.bytes,5);
});

test('key snapshot precedes async work and concurrent observations are retained',async()=>{
 const store={YouTubeConfig:config};const first=host({store,native:true}),second=host({store,native:true});
 const a=runCapture(first.h);store.YouTubeConfig=JSON.stringify({youtube:{clientKey:'SECOND-PRIVATE-KEY',encryptKey:'SECOND-PRIVATE-ENCRYPTED'}});
 const b=runCapture(second.h);await Promise.all([a,b]);
 const rows=JSON.parse(store[STORE]).observations;assert.equal(rows.length,2);
 assert(rows.some(r=>r.keys.youtube.clientKey==='PRIVATE-CLIENT-KEY'));assert(rows.some(r=>r.keys.youtube.clientKey==='SECOND-PRIVATE-KEY'));
});

test('profiles have one init request handler per phase and keep API response/key acquisition',()=>{
 const dir=path.dirname(new URL(import.meta.url).pathname);
 for(const phase of ['worker-baseline','direct-google']){
  const qx=fs.readFileSync(path.join(dir,'quantumult-x.'+phase+'.conf'),'utf8');
  const lines=qx.split('\n').filter(l=>l.includes(' url script-'));
  const request=lines.filter(l=>l.includes('initplayback')&&!l.includes('script-response-body'));
  assert.equal(request.length,1);assert(lines.some(l=>l.includes('youtube.response.js#debug=true')));
  assert.equal(request[0].includes('youtube.request.js'),phase==='worker-baseline');
  assert.equal(lines.some(l=>l.includes('initplayback')&&l.includes('script-response-body')),phase==='direct-google');
  assert(qx.includes('example.com'));
  for(const line of lines){const pattern=line.split(' url ')[0];new RegExp(pattern);}
  assert(new RegExp(request[0].split(' url ')[0]).test(INIT));
  const sr=fs.readFileSync(path.join(dir,'shadowrocket.'+phase+'.sgmodule'),'utf8');
  assert.equal(sr.split('\n').filter(l=>l.includes('type=http-request')&&l.includes('initplayback')).length,1);
  assert(sr.includes('youtube.response.js'));assert(sr.includes('log_event'));assert(sr.includes('%APPEND%'));
 }
});


test('missing timers and failed reset have explicit bounded results',async()=>{
 const r=host({native:true});delete r.h.setTimeout;delete r.h.clearTimeout;
 const caps=await capabilities(r.h);assert.equal(caps.aesCtr,'not-run');assert.equal(caps.gzip,'not-run');
 const reset=host({url:'https://example.com/yt-local-capture/reset',mode:'throw'});reset.h.$request.method='GET';
 await runCapture(reset.h);assert.equal(exported(reset.done[0]).reset,false);assert.equal(reset.store.YouTubeConfig,config);
});


test('blocked WASM and random APIs are reported without blocking playback',async()=>{
 const r=host();r.h.WebAssembly={Module:class{constructor(){throw Error('restricted');}},Instance:class{}};
 r.h.crypto={getRandomValues:()=>{throw Error('restricted');}};
 await runCapture(r.h);assert.deepEqual(Object.keys(r.done[0]),[]);
 const c=JSON.parse(r.store[STORE]).observations[0].capabilities;
 assert.equal(c.wasm,'failed');assert.equal(c.randomValues,'failed');assert(!r.logs.join('').includes('restricted'));
});

test('explicit QX bootstrap preparation clears only YouTube keys and its suppression budget',async()=>{
 const other={clientKey:'MUSIC-PRIVATE',encryptKey:'MUSIC-TOKEN'};
 const store={YouTubeConfig:JSON.stringify({youtube:{clientKey:'YOUTUBE-PRIVATE'},youtubeMusic:other,metadata:{keep:true}}),
  'YouTubeBootstrap.v1':JSON.stringify({version:1,youtube:true,youtubeMusic:true}),[STORE]:'retained-snapshot',otherPreference:'keep'};
 const r=host({url:'https://example.com/yt-local-capture/prepare-bootstrap',store});r.h.$request.method='GET';await runCapture(r.h);
 assert.equal(exported(r.done[0]).prepared,true);const after=JSON.parse(store.YouTubeConfig);
 assert.equal(after.youtube,undefined);assert.deepEqual(after.youtubeMusic,other);assert.deepEqual(after.metadata,{keep:true});
 assert.equal(JSON.parse(store['YouTubeBootstrap.v1']).youtube,undefined);assert.equal(JSON.parse(store['YouTubeBootstrap.v1']).youtubeMusic,true);
 assert.equal(store[STORE],'retained-snapshot');assert.equal(store.otherPreference,'keep');assert.deepEqual(r.requests,[]);
 assert(!JSON.stringify(r.done).includes('PRIVATE'));
});
test('bootstrap preparation requires explicit GET and reports storage failure without exposing keys',async()=>{
 const url='https://example.com/yt-local-capture/prepare-bootstrap';
 const post=await run({url});assert.deepEqual(Object.keys(post.done[0]),[]);assert.deepEqual(post.writes,[]);
 for(const mode of ['throw','false']){
  const r=host({url,mode});r.h.$request.method='GET';await runCapture(r.h);assert.equal(exported(r.done[0]).prepared,false);
  assert.equal(r.store.YouTubeConfig,config);assert(!JSON.stringify(r.done).includes('PRIVATE'));
 }
});
