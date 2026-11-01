// node regressions.mjs <test-entry.cjs> <response.js> <request.js> <capture-root>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';
import path from 'node:path';
import test from 'node:test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),api=require(path.resolve(process.argv[2]));
const response=fs.readFileSync(process.argv[3],'utf8'),request=fs.readFileSync(process.argv[4],'utf8');
const captureRoot=process.argv[5],{messages,filterImmersivePanels}=api;
const equal=(a,b)=>assert.deepEqual(Buffer.from(a),Buffer.from(b));
const INIT='https://r1---test.googlevideo.com/initplayback?ack=1';
function vint(n){n=BigInt(n);const a=[];do{const b=Number(n&127n);n>>=7n;a.push(b|(n?128:0));}while(n);return Buffer.from(a);}
function field(no,b){b=Buffer.from(b);return Buffer.concat([vint(no*8+2),vint(b.length),b]);}
const key=new Uint8Array([3,4]);
const cfg=messages['youtube.response.config.Config'];
const configBody=cfg.toBinary(cfg.create({responseContext:{globalConfigGroup:{hotConfigGroup:{mediaHotConfig:{
  onesieHotConfig:{clientKey:new Uint8Array([1,2]),encryptKey:key}}}}}}));
function run(source,route,body,store={},client='qx',mode='ok',debug=false,userAgent='youtube'){
 const logs=[],results=[],writes=[];
 const put=(value,name)=>{
  writes.push(name);if(mode==='throw')throw Error('private storage error');
  if(mode==='false')return false;store[name]=value;return true;
 };
 const req={url:route==='initplayback'?INIT:'https://youtubei.googleapis.com/youtubei/v1/'+route,
   headers:{'User-Agent':userAgent},sessionIndex:37,id:'native-37',method:'POST'};
 const ctx={ArrayBuffer,Uint8Array,TextEncoder,TextDecoder,$request:req,$response:{},
  $environment:{sourcePath:'https://example.test/script.js'+(debug?'#debug=true':'')},
  console:{log:s=>logs.push(String(s))},$done:r=>results.push(r)};
 const bytes=new Uint8Array(body);
 if(client==='qx'){
  ctx.$task={};ctx.$prefs={valueForKey:k=>store[k]??null,setValueForKey:put};
  ctx.$response.bodyBytes=bytes.buffer;req.bodyBytes=bytes.buffer;
 }else{
  ctx.$persistentStore={read:k=>store[k]??null,write:put};ctx.$response.body=bytes;req.body=bytes;
  if(client==='sr')ctx.$rocket={};
 }
 vm.runInNewContext(source,ctx,{timeout:5000});assert.equal(results.length,1);
 return {result:results[0],logs,writes,store};
}
const applied=(result,input)=>result.bodyBytes??result.body??input;
function scan(input){
 const b=Buffer.from(input),out=[];let p=0;
 const v=()=>{let n=0n;for(let i=0;i<10;i++){assert(p<b.length);let x=b[p++];n|=BigInt(x&127)<<BigInt(7*i);if(!(x&128))return Number(n);}assert.fail('bad varint');};
 while(p<b.length){const start=p,tag=v(),no=Math.floor(tag/8),wire=tag%8;assert(no);let begin=p;
  if(wire===2){const len=v();begin=p;p+=len;}else if(wire===0)v();else if(wire===1)p+=8;else if(wire===5)p+=4;else assert.fail('unexpected wire');
  assert(p<=b.length);out.push({no,wire,raw:b.subarray(start,p),data:b.subarray(begin,p)});
 }return out;
}
function values(b,route){let nodes=[Buffer.from(b)];for(const no of route)nodes=nodes.flatMap(x=>scan(x).filter(f=>f.no===no&&f.wire===2).map(f=>f.data));return nodes;}
const richPath=[42,357104971,2,361256913,1,138681066,3,49399797,1,50195462,1];
const unknown=field(900,Buffer.from('opaque-watch-state'));
const unknownChild=field(901,Buffer.from('opaque-content-state'));
const cacheBase={youtubeMusic:{clientKey:'keep',encryptKey:'AwQ='},metadata:{keep:true}};

test('null/invalid cached config and ad cache recover keys and enable the next request',()=>{
 const states=['null','[]','false','42','"invalid"','not valid JSON with private-secret',
   JSON.stringify({...cacheBase,youtube:{clientKey:23}})];
 for(const client of ['qx','sr','surge'])for(const initial of states){
  const store={YouTubeConfig:initial,YouTubeAdvertiseInfo:'private-secret invalid JSON'};
  const acquired=run(response,'config',configBody,store,client);
  const saved=JSON.parse(store.YouTubeConfig);
  assert.equal(saved.youtube.clientKey,'AQI=');assert.equal(saved.youtube.encryptKey,'AwQ=');
  if(initial.includes('metadata')){assert.deepEqual(saved.youtubeMusic,cacheBase.youtubeMusic);assert.deepEqual(saved.metadata,cacheBase.metadata);}
  const forwarded=run(request,'initplayback',field(3,field(5,key)),store,client);
  if(client==='qx')assert.equal(forwarded.result.status,'HTTP/1.1 307 Temporary Redirect');
  else assert(forwarded.result.url?.startsWith('https://init-stream.maasea.workers.dev/'));
  assert(!acquired.logs.join('\n').includes('private-secret'));
 }
});

test('config and log_event do not rewrite matching keys or discard existing metadata',()=>{
 for(const route of ['config','log_event'])for(const client of ['qx','sr']){
  const store={YouTubeConfig:JSON.stringify({...cacheBase,youtube:{clientKey:'AQI=',encryptKey:'AwQ=',metadata:'keep'}})};
  const before=store.YouTubeConfig,r=run(response,route,configBody,store,client);
  assert.equal(store.YouTubeConfig,before);assert.equal(r.writes.length,0);assert.equal(r.logs.length,0);
 }
});

test('Music key recovery preserves video keys and enables the Music request',()=>{
 for(const client of ['qx','sr']){
  const video={clientKey:'video-keep',encryptKey:'AwQ='};
  const store={YouTubeConfig:JSON.stringify({youtube:video,youtubeMusic:false,metadata:7})};
  run(response,'log_event',configBody,store,client,'ok',false,'YouTubeMusic/1');
  const saved=JSON.parse(store.YouTubeConfig);
  assert.deepEqual(saved.youtube,video);assert.equal(saved.metadata,7);
  assert.equal(saved.youtubeMusic.clientKey,'AQI=');
  const forwarded=run(request,'initplayback',field(3,field(5,key)),store,client,'ok',false,'YouTubeMusic/1');
  const target=client==='qx'?forwarded.result.headers.Location:forwarded.result.url;
  assert.equal(new URL(target).searchParams.get('ck'),'AQI=');
 }
});

test('failed persistence is visible in quiet mode and cannot discard a filtered response',()=>{
 const legacy=[7,51779735,1,49399797,1,50195462,1,199999999]
  .reduceRight((b,n)=>field(n,b),Buffer.from('pagead'+'x'.repeat(1100)));
 for(const mode of ['false','throw'])for(const client of ['qx','sr']){
  const config=run(response,'config',configBody,{},client,mode);
  assert(config.logs.some(l=>l.includes('storage-write-failed')&&l.includes('key=YouTubeConfig')&&l.includes('session=37')));
  assert.equal(config.store.YouTubeConfig,undefined);
  const filtered=run(response,'next',legacy,{},client,mode);
  assert(Buffer.from(applied(filtered.result,legacy)).length<legacy.length);
  assert(filtered.logs.some(l=>l.includes('key=YouTubeAdvertiseInfo')&&l.includes('storage-write-failed')));
 }
});

test('captured modern Next is filtered inside repeated Watch contents with byte-exact siblings',()=>{
 for(const id of ['20261031_204503','20261031_213054','20261031_213333']){
  const raw=fs.readFileSync(path.join(captureRoot,'captures',id,'0/response_body'));
  const next=zlib.brotliDecompressSync(raw),filtered=Buffer.from(filterImmersivePanels(new Uint8Array(next)).bytes);
  const wrapped=Buffer.concat([unknown,field(1,Buffer.concat([unknownChild,field(3,next),unknownChild])),
    field(1,field(3,next)),unknown]);
  const expected=Buffer.concat([unknown,field(1,Buffer.concat([unknownChild,field(3,filtered),unknownChild])),
    field(1,field(3,filtered)),unknown]);
  const wire=filterImmersivePanels(new Uint8Array(wrapped),'watch');equal(wire.bytes,expected);
  assert.equal(wire.removed,id==='20261031_204503'?0:2);
  for(const client of ['qx','sr','surge']){
   const r=run(response,'get_watch',wrapped,{},client);equal(applied(r.result,wrapped),expected);
   equal(filterImmersivePanels(new Uint8Array(expected),'watch').bytes,expected);
   assert.equal(filterImmersivePanels(new Uint8Array(expected),'watch').removed,0);
   const nexts=values(applied(r.result,wrapped),[1,3]);assert.equal(nexts.length,2);
   for(const n of nexts)assert.equal(values(n,richPath).length,0);
  }
 }
});

test('get_watch handles player and legacy Next changes alongside modern payloads',()=>{
 const next=zlib.brotliDecompressSync(fs.readFileSync(path.join(captureRoot,'captures/20261031_213054/0/response_body')));
 const player=messages['youtube.response.player.Player'];
 const body=player.toBinary(player.create({playabilityStatus:{},adPlacements:[{}],adSlots:[{}]}));
 const legacy=[7,51779735,1,49399797,1,50195462,1,199999999].reduceRight((b,n)=>field(n,b),Buffer.from('pagead'+'x'.repeat(1100)));
 const watch=Buffer.concat([unknown,field(1,Buffer.concat([field(2,body),field(3,next),unknownChild])),field(1,field(3,legacy)),unknown]);
 for(const client of ['qx','sr']){
  const r=run(response,'get_watch',watch,{},client),out=applied(r.result,watch);
  assert.equal(filterImmersivePanels(new Uint8Array(out),'watch').removed,0);
  assert.equal(values(out,[1,3,...richPath]).length,0);
  const decoded=messages['youtube.response.watch.Watch'].fromBinary(new Uint8Array(out));
  assert.equal(decoded.contents[0].player.adPlacements.length,0);
  assert.equal(decoded.contents[0].player.adSlots.length,0);
  assert(decoded.contents[0].player.playabilityStatus.pictureInPictureRender);
  assert(JSON.parse(r.store.YouTubeAdvertiseInfo).blackNo.includes(199999999));
  assert.equal(scan(out).filter(f=>f.no===900).length,2);
  for(const f of scan(out).filter(f=>f.no===900))equal(f.raw,unknown);
  const content=values(out,[1])[0];equal(scan(content).find(f=>f.no===901).raw,unknownChild);
 }
});

test('unmatched, malformed and no-op nested payloads are passed through transactionally',()=>{
 const noOp=Buffer.concat([unknown,field(1,Buffer.concat([unknownChild,field(3,[])]))]);
 for(const client of ['qx','sr']){
  const ok=run(response,'get_watch',noOp,{},client);assert.deepEqual(Object.keys(ok.result),[]);assert.equal(ok.logs.length,0);
  const malformed=Buffer.concat([noOp,Buffer.from([0x0a,0xff])]);
  const bad=run(response,'get_watch',malformed,{},client);assert.deepEqual(Object.keys(bad.result),[]);
  assert.equal(bad.writes.length,0);assert(bad.logs.some(l=>l.includes('processing-error')));
 }
});

test('routine diagnostics require debug; errors remain visible and correlated',()=>{
 for(const client of ['qx','sr']){
  const quiet=run(response,'next',[],{},client);assert.equal(quiet.logs.length,0);
  const debug=run(response,'next',[],{},client,'ok',true);
  assert(debug.logs.some(l=>l.includes('response-compat-20261101.2')&&l.includes('session=37')));
  const adBreak=run(response,'player/ad_break',[0],{},client,'ok',true);
  assert.deepEqual(Object.keys(adBreak.result),[]);assert(adBreak.logs.some(l=>l.includes('unverified-ad-break-schema')));
 }
});
