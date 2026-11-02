// Public transport integration tests. Native Google POST/retry remains a device check.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {webcrypto} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),api=require(path.resolve(process.argv[2]));
const script=fs.readFileSync(process.argv[3],'utf8');
const pair={clientKey:Buffer.alloc(32,41).toString('base64'),encryptKey:Buffer.alloc(53,42).toString('base64'),hotHashData:'PRIVATE-HASH'};
const other={clientKey:'MUSIC-PRIVATE',encryptKey:'MUSIC-TOKEN'};
const URL='https://r1---fixture.googlevideo.com/initplayback?ack=1&secret=PRIVATE-TARGET';
const runtime=await api.webPlaybackRuntime({crypto:webcrypto,CompressionStream,DecompressionStream},Buffer.from(pair.clientKey,'base64'));
function v(n){const a=[];do{const x=n%128;n=Math.floor(n/128);a.push(x|(n?128:0));}while(n);return Buffer.from(a);}
function f(n,b){return Buffer.concat([v(n*8+2),v(b.length),Buffer.from(b)]);}
async function request(){
 const enc=await runtime.encrypt(gzipSync(f(1,Buffer.from('https://youtubei.googleapis.com/youtubei/v1/get_watch'))));
 return Buffer.concat([f(777,Buffer.from([255,0,128])),f(3,Buffer.concat([f(2,enc.cipher),f(5,Buffer.from(pair.encryptKey,'base64')),f(6,enc.iv),f(7,enc.hmac)]))]);
}
function frame(type,data){return Buffer.concat([api.encodeUmpInteger(type),api.encodeUmpInteger(data.length),Buffer.from(data)]);}
const player=api.messages['youtube.response.player.Player'];
const plain=Buffer.concat([Buffer.from([8,1,16,200,1]),f(4,f(2,player.toBinary(player.create({playabilityStatus:{},adPlacements:[{},{}],adSlots:[{}]}))))]);
const enc=await runtime.encrypt(plain);
const media=frame(21,Buffer.from([255,0,128,1]));
const body=Buffer.concat([frame(10,Buffer.from([8,25])),frame(11,Buffer.concat([f(1,enc.cipher),f(2,enc.hmac),f(3,enc.iv),f(99,Buffer.from('opaque-envelope'))])),media]);
const makeStore=()=>({YouTubeConfig:JSON.stringify({youtube:pair,youtubeMusic:other,metadata:{keep:true}})});
const defaultReply=()=>({statusCode:200,headers:{'Content-Type':'application/vnd.yt-ump','Content-Length':String(body.length),'Transfer-Encoding':'chunked',Connection:'X-Hop','X-Hop':'drop',Keep:'yes',ETag:'old-tag',Digest:'old-digest'},bodyBytes:new Uint8Array(body).buffer});
async function native({store=makeStore(),input,fetch=async()=>defaultReply(),url=URL,headers={},write='ok',fastTimeout=false,nonenumerable=false,echo=true,local=true}={}){
 if(input===undefined)input=await request();
 const results=[],logs=[],writes=[],fetches=[];
 const host={ArrayBuffer,Uint8Array,DataView,TextEncoder,TextDecoder,crypto:webcrypto,CompressionStream,DecompressionStream,
  setTimeout:fastTimeout?((fn,ms)=>setTimeout(fn,ms===12000?10:ms)):setTimeout,clearTimeout,
  $request:{url,method:'POST',headers:{'User-Agent':'youtube','Content-Type':'application/x-protobuf','Content-Length':String(input?.byteLength??0),Host:'wrong-host','Content-Encoding':'identity','Accept-Encoding':'gzip, br',Connection:'X-Hop','X-Hop':'drop',Authorization:'PRIVATE-AUTH',Cookie:'PRIVATE-COOKIE',Keep:'yes',...headers},bodyBytes:input,sessionIndex:42},
  $environment:{sourcePath:'https://fixture.invalid/request.js#debug=true'+(local?'&localPlayback=true':'')+(echo?'&qxEcho=true':'')},console:{log:s=>logs.push(String(s))}};
 host.$prefs={valueForKey:k=>store[k]??null,setValueForKey:(s,k)=>{writes.push(k);if(write==='throw')throw Error('PRIVATE-STORAGE-ERROR');if(write==='false')return false;store[k]=s;return true;},removeValueForKey:k=>{writes.push(k);delete store[k];return true;}};
 host.$task={fetch:r=>{fetches.push(r);return fetch(r);}};
 if(nonenumerable)for(const k of ['crypto','$prefs','$task','console','CompressionStream','DecompressionStream'])Object.defineProperty(host,k,{value:host[k],enumerable:false});
 await new Promise((resolve,reject)=>{host.$done=r=>{results.push(r);resolve();};try{vm.runInNewContext(script,host,{timeout:5000});}catch(e){reject(e);}});
 assert.equal(results.length,1);assert(!logs.join('\n').includes('PRIVATE-'));
 for(const value of [pair.clientKey,pair.encryptKey])assert(!logs.join('\n').includes(value));
 return {result:results[0],results,logs,writes,fetches,store};
}
function output(r){return Buffer.from(r.result.bodyBytes??Buffer.from(r.result.body??''));}
async function playerCounts(bytes){const parts=api.readUmp(new Uint8Array(bytes)),fields=api.readFields(parts[1].data),get=no=>fields.find(f=>f.no===no).data;const plain=await runtime.decrypt(get(1),get(2),get(3));const m=api.messages['youtube.ump.encrypted.OnesieInnertubeResponse'].fromBinary(plain);return {placements:m.contents[0].player.adPlacements.length,slots:m.contents[0].player.adSlots.length};}

test('missing and mismatched keys return a synthetic empty 200 before any fetch',async()=>{
 for(const config of [{}, {youtube:{...pair,encryptKey:Buffer.alloc(53,2).toString('base64')},youtubeMusic:other,metadata:{keep:true}}]){
  const store={YouTubeConfig:JSON.stringify(config)},r=await native({store});
  assert.equal(r.result.status,'HTTP/1.1 200 OK');assert.equal(r.result.body,'');assert.equal(r.fetches.length,0);
  assert(r.logs.some(s=>s.includes('action=bootstrap-empty')));
  const saved=JSON.parse(store.YouTubeConfig);assert.equal(saved.youtube,undefined);
  if(config.youtubeMusic)assert.deepEqual(saved.youtubeMusic,other);
 }
});
test('correctly keyed requests preserve exact binary bytes and end-to-end headers',async()=>{
 const input=await request(),padded=new Uint8Array(input.length+8);padded.set(input,4);const before=Buffer.from(padded);
 const r=await native({input:new DataView(padded.buffer,4,input.length),nonenumerable:true});
 assert.equal(r.fetches.length,1);const sent=r.fetches[0];assert.equal(sent.url,URL);assert.equal(sent.method,'POST');assert(Buffer.from(sent.bodyBytes).equals(input));assert(Buffer.from(padded).equals(before));
 assert.equal(sent.headers.Authorization,'PRIVATE-AUTH');assert.equal(sent.headers.Cookie,'PRIVATE-COOKIE');assert.equal(sent.headers.Keep,'yes');assert.equal(sent.headers['Accept-Encoding'],'identity');
 for(const name of ['Host','Content-Length','Content-Encoding','Connection','X-Hop'])assert.equal(sent.headers[name],undefined);
 assert.equal(sent.opts.redirection,false);assert.equal(sent.opts['auto-cookie'],false);
 assert.equal(r.result.status,'HTTP/1.1 200 OK');assert.equal(r.result.headers['Content-Length'],undefined);assert.equal(r.result.headers['Transfer-Encoding'],undefined);
 assert.equal(r.result.headers.Keep,'yes');assert.equal(r.result.headers.ETag,undefined);assert.equal(r.result.headers.Digest,undefined);assert.deepEqual(await playerCounts(output(r)),{placements:0,slots:0});
 const parts=api.readUmp(new Uint8Array(output(r)));assert(Buffer.from(parts[2].raw).equals(media));
 assert.equal(Buffer.from(api.readFields(parts[1].data).find(f=>f.no===99).data).toString(),'opaque-envelope');
 assert(r.logs.some(s=>s.includes('adPlacementsRemoved=2')&&s.includes('adSlotsRemoved=1')));
 assert(!Object.keys(r.store).some(k=>k.startsWith('YouTubeEchoFlight.')));
});
test('response filtering uses the request key snapshot and preserves concurrent fresh keys',async()=>{
 const store=makeStore(),newer={clientKey:Buffer.alloc(32,60).toString('base64'),encryptKey:Buffer.alloc(53,61).toString('base64')};
 const r=await native({store,fetch:async()=>{store.YouTubeConfig=JSON.stringify({youtube:newer,youtubeMusic:other});return defaultReply();}});
 assert.deepEqual(await playerCounts(output(r)),{placements:0,slots:0});assert.deepEqual(JSON.parse(store.YouTubeConfig).youtube,newer);
 assert(!r.writes.includes('YouTubeConfig'));
});
test('same-envelope internal re-entry is stopped without another native fetch',async()=>{
 const store=makeStore(),input=await request();let inner;
 const r=await native({store,input,fetch:async()=>{
  inner=await native({store,input,fetch:()=>{assert.fail('recursive fetch');}});
  return {statusCode:508,headers:inner.result.headers,body:''};
 }});
 assert.equal(r.fetches.length,1);assert.equal(inner.fetches.length,0);assert(inner.logs.some(s=>s.includes('duplicate-inflight')));assert(r.result.status.includes('508'));
});
test('different request nonces can fetch concurrently and release both leases',async()=>{
 const store=makeStore(),input1=await request(),input2=await request();let n=0,release;
 const wait=new Promise(resolve=>release=resolve),fetch=async()=>{n++;if(n===2)release();await wait;return defaultReply();};
 const results=await Promise.all([native({store,input:input1,fetch}),native({store,input:input2,fetch})]);
 assert.equal(n,2);for(const r of results)assert.deepEqual(await playerCounts(output(r)),{placements:0,slots:0});
 assert(!Object.keys(store).some(k=>k.startsWith('YouTubeEchoFlight.')));
});
test('genuine request authentication failure refreshes only the unchanged cached pair',async()=>{
 const input=Buffer.from(await request()),decoded=api.decodeOnesieRequest(new Uint8Array(input.buffer,input.byteOffset,input.byteLength));decoded.encryptedInnertubeRequest.hmac[0]^=1;
 const r=await native({input});assert.equal(r.result.body,'');assert.equal(r.fetches.length,0);assert.equal(JSON.parse(r.store.YouTubeConfig).youtube,undefined);assert.deepEqual(JSON.parse(r.store.YouTubeConfig).youtubeMusic,other);
 assert(r.logs.some(s=>s.includes('request-authentication-failed')));
});
test('upstream authentication failure discards the response and invalidates stale keys',async()=>{
 const broken=Buffer.from(body),parts=api.readUmp(new Uint8Array(broken.buffer,broken.byteOffset,broken.byteLength)),data=api.readFields(parts[1].data).find(f=>f.no===1).data;data[0]^=1;
 const r=await native({fetch:async()=>({...defaultReply(),bodyBytes:new Uint8Array(broken).buffer})});
 assert.equal(r.result.body,'');assert.equal(JSON.parse(r.store.YouTubeConfig).youtube,undefined);assert(r.logs.some(s=>s.includes('response-authentication-failed')));
});
test('redirects and HTTP errors retain status and payload, with no internal follow',async()=>{
 for(const statusCode of [307,403,204]){
  const bytes=statusCode===403?new Uint8Array(Buffer.from('error')):undefined;
  const r=await native({fetch:async()=>({statusCode,headers:{Location:'https://r2---fixture.googlevideo.com/initplayback?ack=1','Content-Type':'text/plain','Content-Length':'999'},bodyBytes:bytes?.buffer})});
  assert(r.result.status.startsWith('HTTP/1.1 '+statusCode+' '));assert.equal(r.fetches.length,1);assert.equal(r.result.headers.Location,'https://r2---fixture.googlevideo.com/initplayback?ack=1');
  assert.equal(output(r).toString(),statusCode===403?'error':'');assert.equal(r.result.headers['Content-Length'],undefined);
 }
});
test('decoded gzip and raw gzip are normalized, while unverified encodings fail explicitly',async()=>{
 for(const raw of [false,true]){
  const value=raw?gzipSync(body):body;
  const r=await native({fetch:async()=>({...defaultReply(),headers:{...defaultReply().headers,'Content-Encoding':'gzip'},bodyBytes:new Uint8Array(value).buffer})});
  assert.deepEqual(await playerCounts(output(r)),{placements:0,slots:0});assert.equal(r.result.headers['Content-Encoding'],undefined);
 }
 const r=await native({fetch:async()=>({...defaultReply(),headers:{'Content-Type':'application/vnd.yt-ump','Content-Encoding':'unknown'}})});
 assert(r.result.status.includes('502'));assert(r.logs.some(s=>s.includes('unsupported-upstream-encoding')));
});
test('timeouts finish once and a late fetch cannot filter or publish a second body',async()=>{
 let release;const pending=new Promise(resolve=>release=resolve),store=makeStore();
 const r=await native({store,fastTimeout:true,fetch:()=>pending});assert(r.result.status.includes('504'));assert.equal(r.result.body,'');
 release(defaultReply());await new Promise(resolve=>setTimeout(resolve,30));
 assert.equal(r.results.length,1);assert(!r.writes.includes('YouTubeAdvertiseInfo'));assert(!Object.keys(store).some(k=>k.startsWith('YouTubeEchoFlight.')));
});
test('bad origins, unsupported input and unavailable storage never forward data',async()=>{
 for(const opts of [{url:'https://example.com/initplayback?ack=1'},{input:new Uint8Array([0])},{headers:{'Content-Encoding':'gzip'}},{write:'false'},{write:'throw'}]){
  const r=await native(opts);assert(r.result.status.includes('502'));assert.equal(r.fetches.length,0);
 }
 const r=await native({fetch:async()=>{throw Error('PRIVATE-NETWORK-ERROR');}});assert(r.result.status.includes('502'));assert.equal(r.results.length,1);
});
test('the new adapter is opt-in and does not change the existing local request path',async()=>{
 const r=await native({echo:false});assert.deepEqual(Object.keys(r.result),[]);assert.equal(r.fetches.length,0);
 const source=JSON.stringify({version:'unused'});assert(!r.logs.join('\n').includes(source));
});

test('expired guards recover and late releases preserve a newer guard',async()=>{
 const store=makeStore(),input=await request();
 const key=api.echoLeaseKey(api.decodeOnesieRequest(new Uint8Array(input)).encryptedInnertubeRequest);
 store[key]=String(Date.now()-1);
 const r=await native({store,input});assert.equal(r.fetches.length,1);assert.equal(store[key],undefined);
 const prefs={valueForKey:k=>store[k],setValueForKey:(s,k)=>(store[k]=s,true),removeValueForKey:k=>(delete store[k],true)};
 const lease=api.acquireEchoLease({$prefs:prefs},key);assert.equal(typeof lease,'object');
 store[key]='newer';assert.equal(api.releaseEchoLease({$prefs:prefs},lease),true);assert.equal(store[key],'newer');
});
test('authentication failure cannot delete a concurrently refreshed pair',async()=>{
 const store=makeStore(),newer={clientKey:Buffer.alloc(32,70).toString('base64'),encryptKey:Buffer.alloc(53,71).toString('base64')};
 const broken=Buffer.from(body),parts=api.readUmp(new Uint8Array(broken.buffer,broken.byteOffset,broken.byteLength));
 api.readFields(parts[1].data).find(f=>f.no===1).data[0]^=1;
 const r=await native({store,fetch:async()=>{store.YouTubeConfig=JSON.stringify({youtube:newer,youtubeMusic:other});return {...defaultReply(),bodyBytes:new Uint8Array(broken).buffer};}});
 assert.equal(r.result.body,'');assert.deepEqual(JSON.parse(store.YouTubeConfig).youtube,newer);
});
test('oversize bodies are rejected and nonempty text cannot masquerade as binary',async()=>{
 const r=await native({input:new Uint8Array(api.MAX_PLAYBACK_BYTES+1)});assert(r.result.status.includes('502'));assert.equal(r.fetches.length,0);
 for(const reply of [{statusCode:200,headers:{},bodyBytes:new Uint8Array(api.MAX_PLAYBACK_BYTES+1).buffer},{statusCode:403,headers:{},body:'nonempty'}]){
  const r=await native({fetch:async()=>reply});assert(r.result.status.includes('502'));
 }
});

test('the shipped QX echo profile has a single initplayback handler and no overlapping observer',()=>{
 const profile=fs.readFileSync(new globalThis.URL('./quantumult-x.echo.conf',import.meta.url),'utf8');
 const rules=profile.split('\n').filter(line=>line.startsWith('^')).map(line=>{
  const [pattern,kind,script]=line.split(' url ');const [type,url]=kind.split(' ');return {pattern:new RegExp(pattern),type,url};
 });
 assert.equal(rules.length,4);
 const init=rules.filter(rule=>rule.pattern.test(URL));assert.equal(init.length,1);
 assert.equal(init[0].type,'script-analyze-echo-response');assert(init[0].url.includes('&qxEcho=true'));
 assert.equal(rules.filter(rule=>rule.pattern.test('https://youtubei.googleapis.com/youtubei/v1/next')).length,1);
 assert.deepEqual(rules.filter(rule=>rule.pattern.test('https://youtubei.googleapis.com/youtubei/v1/log_event')).map(r=>r.type).sort(),['script-request-header','script-response-body']);
 for(const action of ['export','prepare-bootstrap'])assert.equal(rules.filter(rule=>rule.pattern.test('https://example.com/yt-local-capture/'+action)).length,1);
 assert(profile.includes('hostname = *.googlevideo.com, youtubei.googleapis.com, example.com'));
});
