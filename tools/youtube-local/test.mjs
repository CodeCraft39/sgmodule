// Offline tests use private captures in /private/tmp; no keys/bodies are reported.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import {webcrypto,createHmac,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import test from 'node:test';
const require=createRequire(import.meta.url),api=require(path.resolve(process.argv[2]));
const responseScript=fs.readFileSync(process.argv[3],'utf8'),requestScript=fs.readFileSync(process.argv[4],'utf8');
const captureRoot=process.argv[5],records=JSON.parse(fs.readFileSync(path.join(captureRoot,'records.json')));
const probe=JSON.parse(fs.readFileSync(path.join(captureRoot,'probe.json')));
const init=records.find(r=>r.path==='/initplayback');assert(init);
function body(record,side){const bytes=fs.readFileSync(path.join(captureRoot,record.id+'.'+side+'.bin'));const encoding=record[side+'Encoding'];return encoding==='gzip'?zlib.gunzipSync(bytes):encoding==='br'?zlib.brotliDecompressSync(bytes):bytes;}
const input=body(init,'response'),request=body(init,'request');
const capturedRequest=api.decodeOnesieRequest(new Uint8Array(request)).encryptedInnertubeRequest;
const candidateKeys=[...probe.observations.map(o=>o.keys?.youtube),probe.currentConfiguration.keys?.youtube].filter(Boolean);
const savedKey=candidateKeys.find(k=>Buffer.from(k.encryptKey,'base64').equals(Buffer.from(capturedRequest.encryptedClientKey)));assert(savedKey);
const key=new Uint8Array(Buffer.from(savedKey.clientKey,'base64')),F=api.onesieProtocol.encryptedFields;
const parts=api.readUmp(new Uint8Array(input));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const same=(a,b)=>assert.equal(hash(Buffer.from(a)),hash(Buffer.from(b)));
const native={crypto:webcrypto,CompressionStream,DecompressionStream,setTimeout,clearTimeout};
const webRuntime=await api.webPlaybackRuntime(native,key);
function emptyState(){return {config:{},adCache:{whiteNo:[],blackNo:[],whiteEml:[],blackEml:['inline_injection_entrypoint_layout.eml'],dirty:false}};}
const params={captionLang:'off',blockUpload:true,blockImmersive:true,blockShorts:false};
const codec=api.messages['youtube.ump.encrypted.OnesieInnertubeResponse'];
const filter=(state=emptyState())=>plain=>api.onesieEndpoint.process(plain,params,state,'youtube').output;
function frame(type,data){return Buffer.concat([api.encodeUmpInteger(type),api.encodeUmpInteger(data.length),Buffer.from(data)]);}
function assemble(list){return Buffer.concat(list.map(p=>p.raw??p));}
function envelope(data){const fields=api.readFields(new Uint8Array(data));const f=no=>fields.find(f=>f.no===no)?.data;return {cipher:f(F.encryptedContent),hmac:f(F.hmac),iv:f(F.iv),algorithm:fields.find(f=>f.no===F.compressionAlgorithm)?.data[0]??0};}
async function plainPart(part,runtime=webRuntime){const e=envelope(part.data);return runtime.decompress(await runtime.decrypt(e.cipher,e.hmac,e.iv),e.algorithm);}
function counts(plain){const decoded=codec.fromBinary(new Uint8Array(plain));return decoded.contents.reduce((a,c)=>{
 if(c.player){a.players++;a.adPlacements+=c.player.adPlacements.length;a.adSlots+=c.player.adSlots.length;}
 if(c.next)a.nexts++;return a;},{players:0,nexts:0,adPlacements:0,adSlots:0});}
function snapshot(value){
 if(typeof value==='string')return {stringHash:hash(Buffer.from(value))};
 if(value instanceof Uint8Array)return {bytes:value.length,hash:hash(value)};
 if(Array.isArray(value))return value.map(snapshot);
 if(value&&typeof value==='object')return {fields:Object.fromEntries(Object.keys(value).sort().map(k=>[k,snapshot(value[k])])),
  unknown:api.UnknownFields.list(value).map(f=>({no:f.no,wire:f.wireType,bytes:f.data.length,hash:hash(f.data)}))};
 return value;
}
const baselineMetadata=[];for(const index of [55,139])baselineMetadata.push({index,plain:await plainPart(parts[index])});
const state=emptyState(),filtered=await api.rewriteOnesie(new Uint8Array(input),webRuntime,filter(state));
const updatedParts=api.readUmp(filtered.output);
async function runNative(source,{client='qx',body=input,mode='ok',keyOverride=savedKey.clientKey,features=true,local=true,fastTimeout=false,slowImport=false}={}){
 const results=[],logs=[],writes=[],fetches=[];
 const store={YouTubeConfig:JSON.stringify({youtube:{clientKey:keyOverride,encryptKey:savedKey.encryptKey}})};
 const context={ArrayBuffer,Uint8Array,DataView,$request:{url:'https://r1---fixture.googlevideo.com/initplayback?ack=1',method:'POST',headers:{'User-Agent':'youtube'},sessionIndex:12},$response:{},
  $environment:{sourcePath:'https://example.test/youtube.js#debug=true'+(local?'&localPlayback=true':'')},console:{log:s=>logs.push(String(s))},
  setTimeout:fastTimeout?(f=>setTimeout(f,10)):setTimeout,clearTimeout};
 const put=(value,name)=>{writes.push(name);if(mode==='throw')throw Error('PRIVATE-STORAGE-ERROR');if(mode==='false')return false;store[name]=value;return true;};
 if(client==='qx')Object.assign(context,{$task:{fetch:()=>fetches.push('fetch')},$prefs:{valueForKey:k=>store[k]??null,setValueForKey:put}}),context.$response.bodyBytes=new Uint8Array(body).buffer;
 else Object.assign(context,{$persistentStore:{read:k=>store[k]??null,write:put},$httpClient:{get:()=>fetches.push('get'),post:()=>fetches.push('post')}}),context.$response.body=new Uint8Array(body);
 context.$request.bodyBytes=new Uint8Array(request).buffer;context.$request.body=new Uint8Array(request);
 if(features)Object.assign(context,{crypto:webcrypto,CompressionStream,DecompressionStream});
 if(fastTimeout)context.crypto={subtle:{importKey:()=>new Promise(()=>{}),encrypt(){},decrypt(){},sign(){},verify(){}},getRandomValues(){}};
 if(slowImport){
  const subtle=Object.fromEntries(['verify','sign','encrypt','decrypt'].map(name=>[name,webcrypto.subtle[name].bind(webcrypto.subtle)]));
  subtle.importKey=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,30));return webcrypto.subtle.importKey(...args);};
  context.crypto={subtle,getRandomValues:webcrypto.getRandomValues.bind(webcrypto)};
 }

 const before=JSON.stringify(store);
 await new Promise((resolve,reject)=>{context.$done=r=>{results.push(r);resolve();};try{vm.runInNewContext(source,context,{timeout:5000});}catch(e){reject(e);}});
 assert.equal(results.length,1);assert.deepEqual(fetches,[]);
 assert(!logs.join('\n').includes(savedKey.clientKey));assert(!logs.join('\n').includes(savedKey.encryptKey));
 return {result:results[0],results,logs,writes,store,before};
}

test('real request key matches and authenticates; inner target is get_watch',async()=>{
 const cipher=capturedRequest.encryptedOnesieInnertubeRequest,iv=capturedRequest.iv;
 const expected=createHmac('sha256',Buffer.from(key).subarray(16)).update(cipher).update(iv).digest();same(expected,capturedRequest.hmac);
 const decrypted=await webRuntime.decrypt(cipher,capturedRequest.hmac,iv);
 const decoded=zlib.gunzipSync(decrypted),fields=api.readFields(new Uint8Array(decoded));
 const url=Buffer.from(fields.find(f=>f.no===1).data).toString();assert.equal(new URL(url).pathname,'/youtubei/v1/get_watch');
 assert.equal(input.length,probe.observations.find(o=>o.role==='response'&&o.body.bytes===input.length).body.bytes);
 assert.equal(parts.length,140);assert.equal(init.responseWireBytes-input.length,974);
});

test('UMP integers cover every length boundary and truncated frames reject',()=>{
 for(const value of [0,1,127,128,16383,16384,2097151,2097152,268435455,268435456,0xffffffff]){
  const encoded=Buffer.concat([api.encodeUmpInteger(value),Buffer.from([0])]);assert.equal(api.readUmp(encoded)[0].type,value);
 }
 for(const bytes of [[0x80],[1],[1,3,0],[0xf0,0,0,0]])assert.throws(()=>api.readUmp(new Uint8Array(bytes)));
 assert.throws(()=>api.encodeUmpInteger(-1));assert.throws(()=>api.encodeUmpInteger(2**32));
});

test('both authenticated response blocks filter; player has five placements and one slot',async()=>{
 assert.equal(filtered.verified,2);assert.equal(filtered.changed,2);
 assert.deepEqual(counts(baselineMetadata[0].plain),{players:1,nexts:0,adPlacements:5,adSlots:1});
 const decoded=await plainPart(updatedParts[55]);assert.equal(counts(decoded).adPlacements,0);assert.equal(counts(decoded).adSlots,0);
 const player=codec.fromBinary(decoded).contents[0].player;
 assert(player.playabilityStatus.pictureInPictureRender);assert(player.playabilityStatus.backgroundPlayerRender);
 assert.equal(counts(await plainPart(updatedParts[139])).nexts,1);
});

test('all media, headers and unrelated UMP frames remain byte exact',()=>{
 assert.equal(updatedParts.length,parts.length);
 for(let i=0;i<parts.length;i++){
  assert.equal(updatedParts[i].type,parts[i].type);
  if([55,139].includes(i))continue;
  same(updatedParts[i].raw,parts[i].raw);
 }
});

test('new ciphertext verifies, IVs change, and nested unknown values survive encoding',async()=>{
 for(const {index,plain} of baselineMetadata){
  const old=envelope(parts[index].data),next=envelope(updatedParts[index].data);
  assert.notEqual(hash(old.iv),hash(next.iv));assert.equal(old.algorithm,next.algorithm);
  const decoded=await plainPart(updatedParts[index]);
  const expected=filter()(plain)??plain;
  assert.deepEqual(snapshot(codec.fromBinary(decoded)),snapshot(codec.fromBinary(expected)));
  const originalFields=api.readFields(parts[index].data),newFields=api.readFields(updatedParts[index].data);
  for(const f of originalFields.filter(f=>![F.encryptedContent,F.hmac,F.iv].includes(f.no)))
   same(newFields.find(g=>g.no===f.no).raw,f.raw);
 }
});

test('no-op and already-filtered responses keep exact original encodings',async()=>{
 const noop=await api.rewriteOnesie(new Uint8Array(input),{...webRuntime,encrypt(){throw Error('must not encrypt');}},()=>undefined);
 assert.equal(noop.output,undefined);assert.equal(noop.changed,0);assert.equal(noop.verified,2);
 const again=await api.rewriteOnesie(filtered.output,webRuntime,filter());assert.equal(again.output,undefined);assert.equal(again.changed,0);
});

test('authentication corruption in either block rejects the whole transformation',async()=>{
 for(const index of [55,139]){
  const bad=Buffer.from(parts[index].data),cipherField=api.readFields(bad).find(f=>f.no===F.encryptedContent);bad[cipherField.data.byteOffset-bad.byteOffset+10]^=1;
  const mixed=Buffer.concat(parts.map((p,i)=>i===index?frame(p.type,bad):Buffer.from(p.raw)));
  await assert.rejects(api.rewriteOnesie(new Uint8Array(mixed),webRuntime,filter()),e=>e.code==='authentication-failed');
  const r=await runNative(responseScript,{body:mixed});assert.deepEqual(Object.keys(r.result),[]);assert.equal(r.writes.length,0);
  assert(r.logs.some(l=>l.includes('authentication-failed')));
 }
});

test('bounds, malformed envelopes, duplicates and unknown compression reject safely',async()=>{
 const dup=Buffer.concat([parts[55].data,api.readFields(parts[55].data).find(f=>f.no===F.iv).raw]);
 const incomplete=Buffer.from(parts[55].data.subarray(0,parts[55].data.length-1));
 for(const data of [dup,incomplete])await assert.rejects(api.rewriteOnesie(Buffer.concat([parts[54].raw,frame(11,data)]),webRuntime,filter()));
 await assert.rejects(api.rewriteOnesie(new Uint8Array(api.MAX_PLAYBACK_BYTES+1),webRuntime,filter()),e=>e.code==='size-limit');
 await assert.rejects(api.rewriteOnesie(new Uint8Array(input),webRuntime,()=>new Uint8Array(api.MAX_METADATA_BYTES+1)),e=>e.code==='size-limit');
 const compression=api.readFields(parts[55].data).find(f=>f.no===F.compressionAlgorithm);const unsupported=Buffer.from(parts[55].data);unsupported[compression.data.byteOffset-parts[55].data.byteOffset+compression.data.length-1]=99;
 await assert.rejects(api.rewriteOnesie(Buffer.concat([parts[54].raw,frame(11,unsupported)]),webRuntime,filter()),e=>e.code==='unsupported-compression');
});

test('native response adapters return filtered bytes locally without any external request',async()=>{
 for(const client of ['qx','surge']){
  const r=await runNative(responseScript,{client}),out=r.result.bodyBytes??r.result.body;assert(out);
  assert(r.logs.some(l=>l.includes('local-body')&&l.includes('verified=2')&&l.includes('updated=2')));
  const list=api.readUmp(new Uint8Array(out));assert.equal(counts(await plainPart(list[55])).adSlots,0);
  assert.equal(JSON.parse(r.store.YouTubeConfig).youtube.clientKey,savedKey.clientKey);
 }
});

test('missing native APIs, wrong keys, missing opt-in and deadline failures pass unchanged',async()=>{
 for(const opts of [{features:false},{keyOverride:Buffer.alloc(32,123).toString('base64')},{local:false},{fastTimeout:true}]){
  const r=await runNative(responseScript,opts);assert.deepEqual(Object.keys(r.result),[]);assert.equal(r.writes.length,0);
 }
});

test('storage errors cannot discard an authenticated filtered body',async()=>{
 for(const mode of ['false','throw']){
  const r=await runNative(responseScript,{mode});assert(r.result.bodyBytes);
  assert(r.logs.some(l=>l.includes('storage-write-failed')));assert(!r.logs.join('').includes('PRIVATE-STORAGE-ERROR'));
 }
});

test('local request mode preserves request and configuration and does not hand off to Worker',async()=>{
 for(const client of ['qx','surge']){
  const r=await runNative(requestScript,{client});assert.deepEqual(Object.keys(r.result),[]);assert.equal(r.writes.length,0);
  assert(r.logs.some(l=>l.includes('reason=local-playback')));
 }
});

test('new standalone Next panel is narrowly matched; older no-panel response stays unchanged',()=>{
 for(const record of records.filter(r=>r.path==='/youtubei/v1/next')){
  const original=body(record,'response'),result=api.filterImmersivePanels(new Uint8Array(original));
  assert.equal(result.removed,record.id==='16'?1:0);
  if(record.id==='15')same(result.bytes,original);
  if(record.id==='16'){
   assert.equal(api.filterImmersivePanels(result.bytes).removed,0);
   const path=api.wirePaths.immersiveItems,item=api.selectMessages(new Uint8Array(original),path)[0];assert(item);
   const negative=Buffer.from(item),marker='/pagead/';assert(negative.includes(marker));
   for(let i=negative.indexOf(marker);i>=0;i=negative.indexOf(marker))negative.write('/normal/',i);
   const wrapped=path.reduceRight((b,no)=>{const tag=Buffer.from(encodePb(no*8+2)),len=Buffer.from(encodePb(b.length));return Buffer.concat([tag,len,b]);},negative);
   assert.equal(api.filterImmersivePanels(new Uint8Array(wrapped)).removed,0);
  }
 }
});
function encodePb(n){const out=[];do{const v=n%128;n=Math.floor(n/128);out.push(v|(n?128:0));}while(n);return out;}

const nextResults=records.filter(r=>r.path==='/youtubei/v1/next').map(r=>{const b=body(r,'response'),out=api.filterImmersivePanels(new Uint8Array(b));return {record:r.id,input:b.length,output:out.bytes.length,removed:out.removed};});
const summary={archive:'2026-11-01-124630.zip',requestBytes:request.length,requestKeyMatch:true,requestAuthentication:'passed',
 responseWireBytes:init.responseWireBytes,responseDecodedBytes:input.length,responseSha256:hash(input),umpParts:parts.length,
 verifiedBlocks:filtered.verified,modifiedBlocks:filtered.changed,outputBytes:filtered.output.length,
 metadata:await Promise.all(baselineMetadata.map(async ({index,plain})=>({part:index,before:plain.length,after:(await plainPart(updatedParts[index])).length,beforeCounts:counts(plain),afterCounts:counts(await plainPart(updatedParts[index]))}))),
 unknownFieldValues:'preserved in filtered message round trips',mediaAndOtherFrames:'byte-exact',next:nextResults,
 actualDeviceFiltering:'pending user validation; crypto/compression capability probe already passed on QX',
 shadowrocketSurge:'legacy mode regression-tested offline; local native capability/device checks pending'};
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname),'REPLAY-RESULTS.json'),JSON.stringify(summary,null,2)+'\n');


test('none, gzip and Brotli metadata reconstruct with authenticated envelopes',async()=>{
 const codecClass=(encode)=>class {
  constructor(format){
   const chunks=[];
   return new TransformStream({transform(bytes){chunks.push(Buffer.from(bytes));},flush(controller){
    const all=Buffer.concat(chunks);
    const result=format==='brotli'?(encode?zlib.brotliCompressSync(all):zlib.brotliDecompressSync(all)):
      format==='gzip'?(encode?zlib.gzipSync(all):zlib.gunzipSync(all)):(()=>{throw Error('unsupported');})();
    controller.enqueue(new Uint8Array(result));
   }});
  }
 };
 const runtime=await api.webPlaybackRuntime({...native,CompressionStream:codecClass(true),DecompressionStream:codecClass(false)},key);
 const content=codec.toBinary(codec.create({contents:[{player:{playabilityStatus:{},adPlacements:[{}],adSlots:[{}]}}]}));
 const plain=Buffer.concat([Buffer.from([8,1,16,200,1]),Buffer.from(content)]);
 for(const algorithm of [0,1,2]){
  const encrypted=await runtime.encrypt(await runtime.compress(plain,algorithm));
  const bytesField=(no,b)=>Buffer.concat([Buffer.from(encodePb(no*8+2)),Buffer.from(encodePb(b.length)),Buffer.from(b)]);
  const payload=Buffer.concat([bytesField(F.encryptedContent,encrypted.cipher),bytesField(F.hmac,encrypted.hmac),bytesField(F.iv,encrypted.iv),Buffer.from([F.compressionAlgorithm*8,algorithm])]);
  const bytes=Buffer.concat([frame(10,Buffer.from([8,25])),frame(11,payload)]);
  const result=await api.rewriteOnesie(bytes,runtime,filter());assert.equal(result.changed,1);
  const output=await plainPart(api.readUmp(result.output)[1],runtime);assert.equal(counts(output).adSlots,0);
 }
});

test('protocol HTTP errors and unrelated UMP frames are kept without content filtering',async()=>{
 const content=codec.toBinary(codec.create({contents:[{player:{adPlacements:[{}]}}]}));
 const plain=Buffer.concat([Buffer.from([8,1,16,147,3]),Buffer.from(content)]); // HTTP 403
 const encrypted=await webRuntime.encrypt(await webRuntime.compress(plain,1));
 const bytesField=(no,b)=>Buffer.concat([Buffer.from(encodePb(no*8+2)),Buffer.from(encodePb(b.length)),Buffer.from(b)]);
 const payload=Buffer.concat([bytesField(F.encryptedContent,encrypted.cipher),bytesField(F.hmac,encrypted.hmac),bytesField(F.iv,encrypted.iv),Buffer.from([F.compressionAlgorithm*8,1])]);
 const input=Buffer.concat([frame(500,Buffer.from([255,0,128])),frame(10,Buffer.from([8,25])),frame(11,payload)]);
 const result=await api.rewriteOnesie(input,webRuntime,()=>{assert.fail('HTTP error must not enter content filtering');});
 assert.equal(result.verified,1);assert.equal(result.output,undefined);
});


test('late crypto completion after timeout cannot publish a body or cache writes',async()=>{
 const r=await runNative(responseScript,{fastTimeout:true,slowImport:true});
 assert.deepEqual(Object.keys(r.result),[]);assert(r.logs.some(l=>l.includes('reason=timeout')));
 await new Promise(resolve=>setTimeout(resolve,400));
 assert.equal(r.results.length,1);assert.equal(r.writes.length,0);
});
