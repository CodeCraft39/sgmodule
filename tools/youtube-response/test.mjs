// node test.mjs <compiled-schema.cjs> <candidate-response.js> <extracted-captures>
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const dir=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url),{messages}=require(path.resolve(process.argv[2]));
const candidate=fs.readFileSync(process.argv[3],'utf8');
const original=fs.readFileSync(path.join(dir,'fixtures/upstream.response.js'),'utf8');
const start=original.indexOf('var Je=class extends m');
const instrumented=original.slice(0,start)+`var baseM=m;m=class extends baseM{constructor(n,f){super(n,f);(globalThis.types??={})[n]=this;}};`+original.slice(start);
function replay(source,route,body,client='qx',cache={},arg){
 const logs=[],done=[];const store={...cache};
 const get=k=>store[k]??null,put=(v,k)=>{store[k]=v;return true};
 const ctx={ArrayBuffer,Uint8Array,TextDecoder,TextEncoder,console:{log:s=>logs.push(String(s))},$request:{url:'https://youtubei.googleapis.com/youtubei/v1/'+route,headers:{'user-agent':'youtube'}},$response:{},$argument:arg,$environment:{variables:{debug:'true'}},
 $done:v=>done.push(v),$notify:()=>{},$notification:{post:()=>{}}};
 const bytes=new Uint8Array(body);
 if(client==='qx'){ctx.$task={};ctx.$prefs={valueForKey:get,setValueForKey:put};ctx.$response.bodyBytes=bytes.buffer;}
 else{ctx.$persistentStore={read:get,write:put};ctx.$response.body=bytes;}
 vm.runInNewContext(source,ctx,{timeout:5000});assert.equal(done.length,1);
 return {result:done[0],logs,store,ctx};
}
const originals=replay(instrumented,'none',[]).ctx.types;
const equal=(a,b)=>assert.deepEqual(Buffer.from(a),Buffer.from(b));
const unknown=Buffer.from([0xa2,0x3e,3,1,2,3]); // opaque field 996
let codecChecks=0,behaviorChecks=0;
function fill(name,depth=0){
 const type=originals[name],msg=type.create();
 for(const f of type.fields){
  if(f.kind==='message'){
   if(depth<2){const child=fill(f.T().typeName,depth+1);if(f.repeat)msg[f.localName]=[child];else msg[f.localName]=child;}
  }else{
   let val=f.kind==='enum'?1:f.T===12?new Uint8Array([1,2,255]):f.T===9?'sample':f.T===8?true:[3,4,6,16,18].includes(f.T)?'7':7;
   msg[f.localName]=f.repeat?[val]:val;
  }
 }
 return msg;
}
for(const [name,codec] of Object.entries(messages)){
 const old=originals[name];assert(old,name);
 for(const msg of [old.create(),fill(name)]){
  const bytes=old.toBinary(msg);equal(codec.toBinary(codec.fromBinary(bytes)),old.toBinary(old.fromBinary(bytes)));
  const extended=Buffer.concat([bytes,unknown]);
  if(old.fields.length===0){
   equal(codec.toBinary(codec.fromBinary(extended)),extended); // Original empty renderer discards unknowns.
  }else equal(codec.toBinary(codec.fromBinary(extended)),old.toBinary(old.fromBinary(extended)));
  codecChecks+=2;
 }
}
const routes={browse:'browse.Browse',next:'next.Next',player:'player.Player',search:'search.Search','reel/reel_watch_sequence':'shorts.Shorts',guide:'guide.Guide','account/get_setting':'setting.Setting',get_watch:'watch.Watch',config:'config.Config',log_event:'config.Config'};
function compare(route,msg,params){
 const codec=messages['youtube.response.'+routes[route]],body=codec.toBinary(codec.create(msg));
 for(const client of (params?['surge']:['qx','surge'])){
  const a=replay(original,route,body,client,{},params),b=replay(candidate,route,body,client,{},params);
  assert.deepEqual(Object.keys(b.result),Object.keys(a.result),route);
  for(const k of Object.keys(a.result))equal(b.result[k],a.result[k]);
  assert.deepEqual(b.store,a.store,route);behaviorChecks++;
 }
}
for(const route of Object.keys(routes)){
 compare(route,route==='player'?{playabilityStatus:{}}:route==='get_watch'?{contents:[{player:{playabilityStatus:{}}}]}:{});
}
compare('player',{playabilityStatus:{},adPlacements:[{}],adSlots:[{}],captions:{playerCaptionsTrackListRenderer:{
 captionTracks:[{baseUrl:'https://example.test/?x=1',languageCode:'en'}],audioTracks:[{captionTrackIndices:[0]}]}}},JSON.stringify({captionLang:'fr'}));
// Config key acquisition must still feed the request script's existing storage key.
compare('config',{responseContext:{globalConfigGroup:{hotConfigGroup:{mediaHotConfig:{onesieHotConfig:{clientKey:new Uint8Array([1,2]),encryptKey:new Uint8Array([3,4])}}}}}});
function vint(n){const a=[];do{const b=n%128;n=Math.floor(n/128);a.push(b|(n?128:0));}while(n);return Buffer.from(a);}
function wrap(no,b){return Buffer.concat([vint(no*8+2),vint(b.length),b]);}
const legacyAd=[7,51779735,1,49399797,1,50195462,1,199999999]
 .reduceRight((b,n)=>wrap(n,b),Buffer.from('pagead'+'x'.repeat(1100)));
for(const client of ['qx','surge']){
 const a=replay(original,'next',legacyAd,client),b=replay(candidate,'next',legacyAd,client);
 assert.deepEqual(Object.keys(b.result),Object.keys(a.result));
 for(const k of Object.keys(a.result))equal(b.result[k],a.result[k]);
 assert.deepEqual(b.store,a.store);assert(JSON.parse(b.store.YouTubeAdvertiseInfo).blackNo.includes(199999999));behaviorChecks++;
}
// Captured modern /next responses: compare with the already independently tested
// field-42 patch. This is not a golden comparison against the no-op upstream.
const oldPatch=fs.readFileSync(path.resolve(dir,'../../Script/Youtube/youtube.response.qx.js'),'utf8');
const captures=[];
for(const id of ['20261031_204503','20261031_213054','20261031_213333']){
 const raw=fs.readFileSync(path.join(process.argv[4],'captures',id,'0/response_body'));
 const body=zlib.brotliDecompressSync(raw),a=replay(oldPatch,'next',body),b=replay(candidate,'next',body);
 if(a.result.bodyBytes)equal(b.result.bodyBytes,a.result.bodyBytes);else assert.deepEqual(Object.keys(b.result),[]);
 const sr=replay(candidate,'next',body,'surge');
 if(b.result.bodyBytes)equal(sr.result.body,b.result.bodyBytes);else assert.deepEqual(Object.keys(sr.result),[]);
 captures.push({id,input:body.length,output:b.result.bodyBytes?.byteLength??body.length});
}
// Issue 110 remains observable but cannot accidentally enter the Player decoder.
const adBreak=replay(candidate,'player/ad_break',unknown);
assert.deepEqual(Object.keys(adBreak.result),[]);assert(adBreak.logs.some(l=>l.includes('unverified-ad-break-schema')));
for(const bad of [[0],[0x0a,0xff]]){const r=replay(candidate,'next',bad);assert.deepEqual(Object.keys(r.result),[]);}
const report={messageTypes:Object.keys(messages).length,codecChecks,behaviorChecks,captures,adBreak:'pass-through observation only',deviceValidation:'pending'};
fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
