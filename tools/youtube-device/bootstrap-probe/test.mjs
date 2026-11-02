import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createCipheriv,createHmac,webcrypto} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const script=fs.readFileSync(process.argv[2],'utf8');
const STORE='YouTubeBootstrapProbe.v1';
const pair={clientKey:Buffer.alloc(32,37).toString('base64'),encryptKey:Buffer.alloc(53,38).toString('base64'),hotHashData:'PRIVATE-HASH'};
const music={clientKey:'PRIVATE-MUSIC-KEY',encryptKey:'PRIVATE-MUSIC-TOKEN'};
const config=()=>({youtube:pair,youtubeMusic:music,metadata:{retained:true}});
const storage=()=>({YouTubeConfig:JSON.stringify(config())});
const target='https://r1---fixture.googlevideo.com/initplayback?ack=1&secret=PRIVATE-TARGET';
const control=action=>'https://example.com/yt-local-capture/bootstrap-probe/'+action;
function v(n){const b=[];do{const x=n&127;n=Math.floor(n/128);b.push(x|(n?128:0));}while(n);return Buffer.from(b);}
function f(n,b){return Buffer.concat([v(n*8+2),v(b.length),b]);}
function body(p=pair){
 const key=Buffer.from(p.clientKey,'base64'),iv=Buffer.alloc(16,39);
 const aes=createCipheriv('aes-128-ctr',key.subarray(0,16),iv),plain=gzipSync(f(1,Buffer.from('https://youtubei.googleapis.com/youtubei/v1/get_watch')));
 const cipher=Buffer.concat([aes.update(plain),aes.final()]);
 const mac=createHmac('sha256',key.subarray(16)).update(cipher).update(iv).digest();
 return f(3,Buffer.concat([f(2,cipher),f(5,Buffer.from(p.encryptKey,'base64')),f(6,iv),f(7,mac)]));
}
async function native({store=storage(),url=target,method='POST',input=body(),agent='youtube',fail,refreshOnClear,nonenumerable=false,qx=true,fragment='debug=true&localPlayback=true&qxEcho=true'}={}){
 const results=[],logs=[],fetches=[],writes=[];
 const host={ArrayBuffer,Uint8Array,DataView,crypto:webcrypto,CompressionStream,DecompressionStream,setTimeout,clearTimeout,
  $request:{url,method,headers:{'User-Agent':agent},bodyBytes:input,body:input,sessionIndex:123},
  $environment:{sourcePath:'https://fixture.invalid/bootstrap-probe.js#'+fragment},console:{log:s=>logs.push(String(s))}};
 const prefs={valueForKey:k=>store[k]??null,setValueForKey:(value,k)=>{
  writes.push(k);if(fail===k)return false;store[k]=value;
  if(k==='YouTubeConfig'&&!JSON.parse(value).youtube&&refreshOnClear)store[k]=JSON.stringify(refreshOnClear);
  return true;
 },removeValueForKey:k=>(delete store[k],true)};
 if(qx){host.$prefs=prefs;host.$task={fetch:r=>{fetches.push(r);return Promise.resolve({statusCode:200,headers:{'Content-Type':'application/octet-stream'},bodyBytes:new Uint8Array([1,2,255]).buffer});}};}
 else{host.$persistentStore={read:k=>store[k]??null,write:(s,k)=>prefs.setValueForKey(s,k)};host.$rocket={};}
 if(nonenumerable)for(const k of ['crypto','console','$prefs','$task','CompressionStream','DecompressionStream'])if(k in host)Object.defineProperty(host,k,{value:host[k],enumerable:false});
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('completion-timeout')),3000);
  host.$done=r=>{results.push(r);clearTimeout(timer);resolve();};
  try{vm.runInNewContext(script,host,{timeout:3000});}catch(e){clearTimeout(timer);reject(e);}
 });
 assert.equal(results.length,1);
 const text=logs.join('\n');for(const privateValue of [pair.clientKey,pair.encryptKey,'PRIVATE-',target])assert(!text.includes(privateValue));
 return {result:results[0],results,logs,fetches,writes,store};
}
async function arm(store=storage()){const r=await native({store,url:control('arm'),method:'GET'});assert.equal(JSON.parse(r.result.body).armed,true);return store;}
function state(store){return JSON.parse(store[STORE]);}
function saved(store){return JSON.parse(store.YouTubeConfig);}

test('arming and status preserve real keys and unrelated storage',async()=>{
 const store=storage(),before=store.YouTubeConfig;await arm(store);assert.equal(store.YouTubeConfig,before);
 const r=await native({store,url:control('status'),method:'GET'});assert.equal(JSON.parse(r.result.body).armed,true);
 assert.equal(r.fetches.length,0);assert(!r.result.body.includes(pair.clientKey));
});
test('unarmed requests use the exact embedded production handler',async()=>{
 const r=await native();assert.equal(r.fetches.length,1);assert(Buffer.from(r.fetches[0].bodyBytes).equals(body()));
 assert.deepEqual([...new Uint8Array(r.result.bodyBytes)],[1,2,255]);assert(!r.logs.some(s=>s.includes('force-missing-key')));
});
test('one armed request invokes the real missing-key branch with empty HTTP 200 and no fetch',async()=>{
 const store=await arm(),r=await native({store});
 assert.equal(r.result.status,'HTTP/1.1 200 OK');assert.equal(r.result.body,'');assert.equal(r.fetches.length,0);
 assert(r.logs.some(s=>s.includes('mode=echo action=bootstrap-empty reason=cache-missing')));
 assert.equal(r.logs.filter(s=>s.includes('action=force-missing-key')).length,1);
 assert.equal(saved(store).youtube,undefined);assert.deepEqual(saved(store).youtubeMusic,music);assert.deepEqual(saved(store).metadata,{retained:true});
 assert.equal(state(store).state,'completed');assert.equal(state(store).emptyCompletionRequested,true);assert.equal(state(store).initialConfigReadMasked,true);
 store.YouTubeConfig=JSON.stringify(config());const next=await native({store});assert.equal(next.fetches.length,1);assert(!next.logs.some(s=>s.includes('force-missing-key')));
});
test('a concurrent configuration refresh cannot bypass the forced branch or be overwritten',async()=>{
 const store=await arm(),fresh={youtube:{...pair,clientKey:Buffer.alloc(32,80).toString('base64'),encryptKey:Buffer.alloc(53,81).toString('base64')},youtubeMusic:music,metadata:{new:true}};
 const r=await native({store,refreshOnClear:fresh});assert.equal(r.result.body,'');assert.equal(r.fetches.length,0);assert.deepEqual(saved(store),fresh);
 const next=await native({store,input:body(fresh.youtube)});assert.equal(next.fetches.length,1);
});
test('Music and unrelated URL/method requests do not consume the arm',async()=>{
 for(const opts of [{agent:'YouTube Music'},{url:'https://example.com/initplayback?ack=1'},{url:'https://r1---fixture.googlevideo.com/videoplayback?ack=1'},{method:'GET'}]){
  const store=await arm();await native({store,...opts});assert.equal(state(store).state,'armed');
 }
});
test('missing binary bodies, malformed bodies and mismatched cached keys do not consume the arm',async()=>{
 for(const opts of [{input:null},{input:new Uint8Array([0])},{input:body({...pair,encryptKey:Buffer.alloc(53,90).toString('base64')})}]){
  const store=await arm();const r=await native({store,...opts});assert.equal(state(store).state,'armed');assert(!r.logs.some(s=>s.includes('force-missing-key')));
 }
});
test('expired arms do not force another empty response',async()=>{
 const store=await arm();store[STORE]=JSON.stringify({...state(store),expiresAt:Date.now()-1});
 const r=await native({store});assert.equal(r.fetches.length,1);assert(!r.logs.some(s=>s.includes('force-missing-key')));
 const status=await native({store,url:control('status'),method:'GET'});assert.equal(JSON.parse(status.result.body).armed,false);
});
test('cancel disarms without restoring, deleting or exposing keys',async()=>{
 const store=await arm(),before=store.YouTubeConfig;
 const r=await native({store,url:control('cancel'),method:'GET'});assert.equal(JSON.parse(r.result.body).cancelled,true);assert.equal(store.YouTubeConfig,before);
 assert.equal((await native({store})).fetches.length,1);
});
test('failed claiming or clearing never forces a completion or repeats a partial diagnostic',async()=>{
 for(const fail of [STORE,'YouTubeConfig']){
  const store=await arm(),before=store.YouTubeConfig,r=await native({store,fail});
  assert.equal(store.YouTubeConfig,before);assert.equal(r.fetches.length,1);assert(!r.logs.some(s=>s.includes('force-missing-key')));
  if(fail==='YouTubeConfig')assert.equal(state(store).state,'failed');
 }
});
test('control errors are explicit and never arm without a usable cached pair',async()=>{
 const noKeys={YouTubeConfig:JSON.stringify({youtubeMusic:music})};
 for(const opts of [{store:noKeys},{method:'POST'},{fail:STORE},{store:{YouTubeConfig:'{'}}]){
  const r=await native({url:control('arm'),method:'GET',...opts});assert(r.result.status.includes('503'));assert.equal(JSON.parse(r.result.body).armed,false);assert.equal(r.fetches.length,0);
 }
});
test('native nonenumerable globals remain usable in the production callback',async()=>{
 const store=await arm(),r=await native({store,nonenumerable:true});assert.equal(r.result.body,'');assert.equal(state(store).emptyCompletionRequested,true);
});
test('non-QX or nonlocal usage cannot activate the diagnostic',async()=>{
 for(const opts of [{qx:false},{fragment:'debug=true'},{fragment:'debug=true&localPlayback=true'}]){
  const store=await arm();const r=await native({store,...opts});assert.equal(state(store).state,'armed');assert(!r.logs.some(s=>s.includes('force-missing-key')));
 }
});

test('the diagnostic profile has one playback rule and a separate local control rule',()=>{
 const profile=fs.readFileSync(new URL('./quantumult-x.conf',import.meta.url),'utf8');
 const rules=profile.split('\n').filter(s=>s.startsWith('^')).map(line=>{const [pattern,rest]=line.split(' url ');const [type,url]=rest.split(' ');return {pattern:new RegExp(pattern),type,url};});
 assert.equal(rules.length,5);
 const playback=rules.filter(r=>r.pattern.test(target));assert.equal(playback.length,1);assert.equal(playback[0].type,'script-analyze-echo-response');assert(playback[0].url.includes('bootstrap-probe.js#debug=true&localPlayback=true&qxEcho=true'));
 for(const action of ['arm','status','cancel'])assert.equal(rules.filter(r=>r.pattern.test(control(action))).length,1);
 assert.equal(rules.filter(r=>r.pattern.test('https://example.com/yt-local-capture/prepare-bootstrap')).length,0);
});
