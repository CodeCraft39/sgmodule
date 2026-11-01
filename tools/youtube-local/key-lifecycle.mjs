// Public synthetic recovery tests. No private keys, captures or external service.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),api=require(path.resolve(process.argv[2]));
const responseScript=fs.readFileSync(process.argv[3],'utf8'),requestScript=fs.readFileSync(process.argv[4],'utf8');
const INIT='https://r1---fixture.googlevideo.com/initplayback?ack=1',LOG='https://youtubei.googleapis.com/youtubei/v1/log_event';
const old={clientKey:Buffer.alloc(32,17).toString('base64'),encryptKey:Buffer.alloc(53,18).toString('base64')};
const fresh={clientKey:Buffer.alloc(32,33).toString('base64'),encryptKey:Buffer.alloc(53,34).toString('base64')};
const hash='synthetic-server-config-hash',other={clientKey:'unrelated-music-key',encryptKey:'unrelated-music-token'};
function vint(n){const out=[];do{let x=n%128;n=Math.floor(n/128);out.push(x|(n?128:0));}while(n);return Buffer.from(out);}
function field(no,b){return Buffer.concat([vint(no*8+2),vint(b.length),Buffer.from(b)]);}
function wrap(fields,b){return fields.reduceRight((data,no)=>field(no,data),Buffer.from(b));}
function requestBody(pair=fresh){return field(3,field(5,Buffer.from(pair.encryptKey,'base64')));}
function initial(pair=old){return {YouTubeConfig:JSON.stringify({youtube:pair,youtubeMusic:other,metadata:{preserve:true}})};}
function read(store){return JSON.parse(store.YouTubeConfig);}
async function execute(source,{client='qx',store=initial(),url=INIT,request=requestBody(),response,headers={},local=true,crypto=webcrypto,write='ok'}={}){
 const results=[],logs=[],writes=[],fetches=[];
 const host={ArrayBuffer,Uint8Array,DataView,TextEncoder,TextDecoder,crypto,CompressionStream,DecompressionStream,setTimeout,clearTimeout,
  $request:{url,method:'POST',headers:{'User-Agent':'youtube',...headers},sessionIndex:42},$response:{},
  $environment:{sourcePath:'https://fixture.invalid/youtube.js#debug=true'+(local?'&localPlayback=true':'')},console:{log:s=>logs.push(String(s))}};
 const put=(value,key)=>{writes.push(key);if(write==='throw')throw Error('PRIVATE-STORAGE-ERROR');if(write==='false')return false;store[key]=value;return true;};
 if(client==='qx'){
  host.$task={fetch:()=>fetches.push('fetch')};host.$prefs={valueForKey:k=>store[k]??null,setValueForKey:put};
  if(request!==undefined)host.$request.bodyBytes=request instanceof Uint8Array?new Uint8Array(request).buffer:request;
  if(response!==undefined)host.$response.bodyBytes=new Uint8Array(response).buffer;
 }else{
  host.$rocket={};host.$persistentStore={read:k=>store[k]??null,write:put};host.$httpClient={get:()=>fetches.push('get'),post:()=>fetches.push('post')};
  host.$request.body=request;host.$response.body=response===undefined?undefined:new Uint8Array(response);
 }
 await new Promise((resolve,reject)=>{host.$done=r=>{results.push(r);resolve();};try{vm.runInNewContext(source,host,{timeout:5000});}catch(e){reject(e);}});
 assert.equal(results.length,1);assert.deepEqual(fetches,[]);
 for(const secret of [old.clientKey,old.encryptKey,fresh.clientKey,fresh.encryptKey,hash])assert(!logs.join('\n').includes(secret));
 return {result:results[0],logs,writes,store};
}
function configBody(pair=fresh,hotHashData=hash){const codec=api.messages['youtube.response.config.Config'];return codec.toBinary(codec.create({responseContext:{globalConfigGroup:{hotHashData,hotConfigGroup:{mediaHotConfig:{onesieHotConfig:{clientKey:Buffer.from(pair.clientKey,'base64'),encryptKey:Buffer.from(pair.encryptKey,'base64')}}}}}}));}
async function playback(){
 // Player ads plus a legacy Next ad that makes the renderer cache dirty.
 const player=api.messages['youtube.response.player.Player'];
 const playerBytes=player.toBinary(player.create({playabilityStatus:{},adPlacements:[{}],adSlots:[{}]}));
 const next=wrap([7,51779735,1,49399797,1,50195462,1,199999999],Buffer.from('pagead'+'x'.repeat(1100)));
 const plain=Buffer.concat([Buffer.from([8,1,16,200,1]),field(4,field(2,playerBytes)),field(4,field(3,next))]);
 const runtime=await api.webPlaybackRuntime({crypto:webcrypto,CompressionStream,DecompressionStream},Buffer.from(fresh.clientKey,'base64'));
 const enc=await runtime.encrypt(plain),data=Buffer.concat([field(1,enc.cipher),field(2,enc.hmac),field(3,enc.iv)]);
 const frame=(type,b)=>Buffer.concat([api.encodeUmpInteger(type),api.encodeUmpInteger(b.length),b]);
 return {runtime,input:Buffer.concat([frame(10,Buffer.from([8,25])),frame(11,data)])};
}

test('local key mismatch invalidates only the selected app and never redirects or mocks a response',async()=>{
 for(const client of ['qx','sr']){
  const store=initial();const r=await execute(requestScript,{client,store});
  assert.deepEqual(Object.keys(r.result),[]);assert.equal(read(store).youtube,undefined);
  assert.deepEqual(read(store).youtubeMusic,other);assert.deepEqual(read(store).metadata,{preserve:true});
  assert(r.logs.some(s=>s.includes('reason=key-mismatch')&&s.includes('cache=saved')&&s.includes('mode=local')));
  const matched=initial({...fresh,hotHashData:hash}),before=JSON.stringify(matched);
  const ok=await execute(requestScript,{client,store:matched});assert.deepEqual(Object.keys(ok.result),[]);assert.equal(JSON.stringify(matched),before);assert.equal(ok.writes.length,0);
  assert(ok.logs.some(s=>s.includes('reason=key-match')));
 }
});

test('local log_event requests configuration until the cached pair is bound to the current hash',async()=>{
 for(const client of ['qx','sr'])for(const pair of [old,{...old,hotHashData:'previous-hash'},{...fresh,hotHashData:hash},{clientKey:fresh.clientKey,hotHashData:hash}]){
  const store=initial(pair),headers={'Content-Encoding':'gzip','Content-Length':'123','X-YOUTUBE-HOT-HASH-DATA':hash,Keep:'yes'};
  const r=await execute(requestScript,{client,store,url:LOG,headers});
  const trusted=!!pair.encryptKey&&pair.hotHashData===hash;
  assert.equal(r.result.headers['X-YOUTUBE-HOT-HASH-DATA'],trusted?hash:undefined);
  assert.equal(r.result.headers['Content-Encoding'],'gzip');assert.equal(r.result.headers['Content-Length'],'123');assert.equal(r.result.headers.Keep,'yes');
  assert.equal(r.writes.length,0);assert(r.logs.some(s=>s.includes(trusted?'reason=cache-validated':'reason=config-refresh')));
  assert.equal(headers['X-YOUTUBE-HOT-HASH-DATA'],hash);
 }
});

test('missing binary data, malformed requests and storage errors pass locally without losing other namespaces',async()=>{
 for(const client of ['qx','sr'])for(const request of [null,'lossy text',new Uint8Array([0])]){
  const store=initial(),before=JSON.stringify(store),r=await execute(requestScript,{client,store,request});
  assert.deepEqual(Object.keys(r.result),[]);assert.equal(JSON.stringify(store),before);assert.equal(r.writes.length,0);
 }
 for(const write of ['throw','false']){
  const store=initial(),r=await execute(requestScript,{store,write});
  assert.deepEqual(Object.keys(r.result),[]);assert.deepEqual(read(store).youtube,old);assert(r.logs.some(s=>s.includes('storage-write-failed')));
 }
});

test('stale cache refreshes before playback and local filtering succeeds without Worker calls',async()=>{
 const {input,runtime}=await playback();
 for(const client of ['qx','sr']){
  const store=initial();
  const log=await execute(requestScript,{client,store,url:LOG,headers:{'X-YouTube-Hot-Hash-Data':hash}});
  assert.equal(log.result.headers['X-YouTube-Hot-Hash-Data'],undefined);
  await execute(responseScript,{client,store,url:LOG,response:configBody()});
  assert.deepEqual(read(store).youtube,{...fresh,hotHashData:hash});assert.deepEqual(read(store).youtubeMusic,other);
  const request=await execute(requestScript,{client,store});assert(request.logs.some(s=>s.includes('reason=key-match')));
  const response=await execute(responseScript,{client,store,response:input});
  const output=response.result.bodyBytes??response.result.body;assert(output);assert(response.logs.some(s=>s.includes('action=local-body')&&s.includes('verified=1')&&s.includes('adPlacementsRemoved=1')&&s.includes('adSlotsRemoved=1')&&s.includes('richItemsRemoved=1')));
  assert(!response.writes.includes('YouTubeConfig'));assert(response.writes.includes('YouTubeAdvertiseInfo'));
  const parts=api.readUmp(new Uint8Array(output)),fields=api.readFields(parts[1].data),f=no=>fields.find(f=>f.no===no).data;
  const plain=await runtime.decrypt(f(1),f(2),f(3));
  const decoded=api.messages['youtube.ump.encrypted.OnesieInnertubeResponse'].fromBinary(plain);
  assert.equal(decoded.contents[0].player.adPlacements.length,0);assert.equal(decoded.contents[0].player.adSlots.length,0);
 }
});

test('config without a hash cannot validate suppression and legacy acquisition keeps the original shape',async()=>{
 for(const client of ['qx','sr']){
  const store=initial({...fresh,hotHashData:'obsolete'});
  // Explicitly omit the optional server hash from this configuration.
  const c=api.messages['youtube.response.config.Config'],msg=c.fromBinary(configBody());delete msg.responseContext.globalConfigGroup.hotHashData;
  await execute(responseScript,{client,store,url:LOG,response:c.toBinary(msg)});
  assert.equal(read(store).youtube.hotHashData,undefined);
  const legacy=initial();await execute(responseScript,{client,store:legacy,url:LOG,response:configBody(),local:false});
  assert.deepEqual(read(legacy).youtube,fresh);
  const bad={...fresh,clientKey:Buffer.alloc(31).toString('base64')};
  const before=JSON.stringify(store);await execute(responseScript,{client,store,url:LOG,response:configBody(bad)});assert.equal(JSON.stringify(store),before);
 }
});

test('awaited playback cannot overwrite newer configuration keys',async()=>{
 const {input}=await playback(),store=initial({...fresh,hotHashData:hash});let release,entered;
 const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
 const subtle=Object.fromEntries(['encrypt','decrypt','sign','verify'].map(name=>[name,webcrypto.subtle[name].bind(webcrypto.subtle)]));
 let first=true;subtle.importKey=async(...args)=>{if(first){first=false;entered();await gate;}return webcrypto.subtle.importKey(...args);};
 const pending=execute(responseScript,{store,response:input,crypto:{subtle,getRandomValues:webcrypto.getRandomValues.bind(webcrypto)}});
 await started;
 const newer={clientKey:Buffer.alloc(32,44).toString('base64'),encryptKey:Buffer.alloc(53,45).toString('base64')};
 await execute(responseScript,{store,url:LOG,response:configBody(newer,'newer-hash')});
 release();const done=await pending;assert(done.result.bodyBytes);assert(!done.writes.includes('YouTubeConfig'));
 assert.deepEqual(read(store).youtube,{...newer,hotHashData:'newer-hash'});
});
