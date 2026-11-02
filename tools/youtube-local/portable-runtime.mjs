import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createCipheriv,createDecipheriv,createHmac,createHash,webcrypto,randomBytes} from 'node:crypto';
import {gzipSync,gunzipSync,deflateSync,brotliDecompressSync} from 'node:zlib';
const api=createRequire(import.meta.url)(path.resolve(process.argv[2]));
const response=fs.readFileSync(process.argv[3],'utf8');
const key=new Uint8Array(randomBytes(32));
const host={crypto:{getRandomValues:webcrypto.getRandomValues.bind(webcrypto)},setTimeout,clearTimeout};
const portable=api.portablePlaybackRuntime(host,key);
const mac=(cipher,iv,k=key)=>createHmac('sha256',Buffer.from(k).subarray(16)).update(cipher).update(iv).digest();
const encrypt=(plain,iv,k=key)=>{const c=createCipheriv('aes-128-ctr',Buffer.from(k).subarray(0,16),iv);return Buffer.concat([c.update(plain),c.final()]);};
const decrypt=(cipher,iv,k=key)=>{const c=createDecipheriv('aes-128-ctr',Buffer.from(k).subarray(0,16),iv);return Buffer.concat([c.update(cipher),c.final()]);};
function uv(n){const out=[];do{const v=n%128;n=Math.floor(n/128);out.push(v|(n?128:0));}while(n);return Buffer.from(out);}
const f=(no,b)=>Buffer.concat([uv(no*8+2),uv(b.length),b]);
const frame=(type,b)=>Buffer.concat([api.encodeUmpInteger(type),api.encodeUmpInteger(b.length),b]);

test('portable AES-128-CTR matches the public NIST vector with independently computed HMAC',async()=>{
 const k=Buffer.concat([Buffer.from('2b7e151628aed2a6abf7158809cf4f3c','hex'),Buffer.alloc(16,7)]),iv=Buffer.from('f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff','hex');
 const cipher=Buffer.from('874d6191b620e3261bef6864990db6ce','hex'),r=api.portablePlaybackRuntime(host,k);
 assert.equal(Buffer.from(await r.decrypt(cipher,mac(cipher,iv,k),iv)).toString('hex'),'6bc1bee22e409f96e93d7e117393172a');
});
test('full 128-bit counters carry across 32/64/96 bits and wrap like native crypto',async()=>{
 for(const hex of ['000000000000000000000000fffffffe','0000000000000000fffffffffffffffe','00000000fffffffffffffffffffffffe','fffffffffffffffffffffffffffffffe']){
  const iv=Buffer.from(hex,'hex'),plain=randomBytes(77),cipher=encrypt(plain,iv);
  assert(Buffer.from(await portable.decrypt(cipher,mac(cipher,iv),iv)).equals(plain));
 }
});
test('portable encryption authenticates and round-trips with native crypto over boundary sizes',async()=>{
 for(const size of [0,1,15,16,17,31,32,33,4097,65537]){
  const plain=randomBytes(size),r=await portable.encrypt(plain);assert(Buffer.from(r.hmac).equals(mac(r.cipher,r.iv)));assert(decrypt(r.cipher,r.iv).equals(plain));
  assert(Buffer.from(await portable.decrypt(r.cipher,r.hmac,r.iv)).equals(plain));
 }
});
test('authentication rejects modified cipher, IV and tag before returning plaintext',async()=>{
 const r=await portable.encrypt(Buffer.from('known plaintext'));
 for(const field of ['cipher','iv','hmac']){
  const bad={...r,[field]:new Uint8Array(r[field])};bad[field][0]^=1;
  await assert.rejects(portable.decrypt(bad.cipher,bad.hmac,bad.iv),e=>e.code==='authentication-failed');
 }
 await assert.rejects(portable.decrypt(r.cipher,new Uint8Array(31),r.iv),e=>e.code==='authentication-failed');
});
test('portable calls preserve input keys, IVs and ciphertext views',async()=>{
 const k=new Uint8Array(key),before=Buffer.from(k),iv=randomBytes(16),ivBefore=Buffer.from(iv),plain=randomBytes(64),cipher=encrypt(plain,iv),cipherBefore=Buffer.from(cipher);
 const r=api.portablePlaybackRuntime(host,k);await r.decrypt(cipher,mac(cipher,iv),iv);await r.encrypt(plain);
 assert(Buffer.from(k).equals(before));assert(iv.equals(ivBefore));assert(cipher.equals(cipherBefore));
});
test('secure native randomness remains mandatory; there is no weak RNG fallback',async()=>{
 assert.throws(()=>api.portablePlaybackRuntime({},key),e=>e.code==='unsupported-crypto');
 for(const random of [()=>new Uint8Array(16),()=>{throw Error('native RNG unavailable');}]){
  const r=api.portablePlaybackRuntime({crypto:{getRandomValues:random}},key);
  await assert.rejects(r.encrypt(new Uint8Array(16)),e=>e.code==='unsupported-crypto');
 }
 const a=await portable.encrypt(new Uint8Array(16)),b=await portable.encrypt(new Uint8Array(16));assert.notDeepEqual([...a.iv],[...b.iv]);
});
test('factory retains the native backend and uses portable code only for incomplete native APIs',async()=>{
 const native=await api.createPlaybackRuntime({crypto:webcrypto,CompressionStream,DecompressionStream},key);assert.equal(native.backend,'webcrypto');
 assert.equal((await api.createPlaybackRuntime(host,key)).backend,'portable');
 const partial={crypto:{getRandomValues:host.crypto.getRandomValues,subtle:{importKey(){throw Error('partial API must not be used');}}}};
 assert.equal((await api.createPlaybackRuntime(partial,key)).backend,'portable');
});
test('invalid keys, IV sizes and oversized ciphertext are rejected',async()=>{
 for(const size of [0,16,31,33])await assert.rejects(api.createPlaybackRuntime(host,new Uint8Array(size)),e=>e.code==='key-invalid');
 await assert.rejects(portable.decrypt(new Uint8Array(1),new Uint8Array(32),new Uint8Array(15)),e=>e.code==='invalid-envelope');
 await assert.rejects(portable.decrypt(new Uint8Array(api.MAX_METADATA_BYTES+1),new Uint8Array(32),new Uint8Array(16)),e=>e.code==='size-limit');
});
test('portable gzip preserves arbitrary binary data and interoperates with native zlib',async()=>{
 for(const data of [Buffer.alloc(0),Buffer.from([0,255,128,1]),randomBytes(400000)]){
  const encoded=api.portableGzip(data,true);assert(gunzipSync(encoded).equals(data));assert(Buffer.from(api.portableGzip(gzipSync(data),false)).equals(data));
 }
});
test('gzip verifies CRC/trailers, requires gzip framing and rejects truncated streams',()=>{
 const data=gzipSync(Buffer.from('gzip validation'));
 for(const b of [data.subarray(0,-1),data.subarray(0,9),deflateSync(Buffer.from('wrong wrapper'))])assert.throws(()=>api.portableGzip(b,false),e=>e.code==='unsupported-compression');
 for(const offset of [data.length-8,data.length-1]){const bad=Buffer.from(data);bad[offset]^=1;assert.throws(()=>api.portableGzip(bad,false),e=>e.code==='unsupported-compression');}
});
test('streaming gzip enforces expanded and input bounds with a fixed-size chunk collector',()=>{
 const bomb=gzipSync(Buffer.alloc(api.MAX_METADATA_BYTES+1,1));assert.throws(()=>api.portableGzip(bomb,false),e=>e.code==='size-limit');
 assert.throws(()=>api.portableGzip(new Uint8Array(api.MAX_METADATA_BYTES+1),true),e=>e.code==='size-limit');
});
test('portable gzip supports concatenated members and unsupported Brotli stays explicit',async()=>{
 assert.equal(Buffer.from(api.portableGzip(Buffer.concat([gzipSync(Buffer.from('one')),gzipSync(Buffer.from('two'))]),false)).toString(),'onetwo');
 await assert.rejects(portable.decompress(new Uint8Array(2),2),e=>e.code==='unsupported-compression');
});
test('deadlines use detached timer functions instead of imposing an invalid native receiver',async()=>{
 const schedule=function(fn,ms){assert.equal(this,undefined);return setTimeout(fn,ms);},cancel=function(id){assert.equal(this,undefined);clearTimeout(id);};
 assert.equal(await api.playbackDeadline({setTimeout:schedule,clearTimeout:cancel},async()=>123),123);
});
test('the shipped response script filters locally without subtle, streams, native encoders or BigInt',async()=>{
 const player=api.messages['youtube.response.player.Player'],codec=api.messages['youtube.ump.encrypted.OnesieInnertubeResponse'];
 const content=codec.toBinary(codec.create({contents:[{player:player.create({playabilityStatus:{},adPlacements:[{},{}],adSlots:[{}]})}]}));
 const plain=Buffer.concat([Buffer.from([8,1,16,200,1]),content]),iv=randomBytes(16),cipher=encrypt(gzipSync(plain),iv);
 const media=frame(21,Buffer.from([0,255,128,1])),input=Buffer.concat([frame(10,Buffer.from([8,25])),frame(11,Buffer.concat([f(1,cipher),f(2,mac(cipher,iv)),f(3,iv),Buffer.from([32,1]),f(99,Buffer.from('opaque'))])),media]);
 const logs=[],results=[],store={YouTubeConfig:JSON.stringify({youtube:{clientKey:Buffer.from(key).toString('base64'),encryptKey:Buffer.alloc(53,3).toString('base64')}})};
 const context={ArrayBuffer,Uint8Array,DataView,BigInt:undefined,TextEncoder:undefined,TextDecoder:undefined,crypto:host.crypto,
  setTimeout:function(fn,ms){assert.equal(this,undefined);return setTimeout(fn,ms);},clearTimeout:function(id){assert.equal(this,undefined);clearTimeout(id);},
  $request:{url:'https://r1---fixture.googlevideo.com/initplayback?ack=1',headers:{'User-Agent':'YouTube'}},$response:{body:new Uint8Array(input)},$rocket:{},
  $argument:JSON.stringify({localPlayback:true,debug:true}),$persistentStore:{read:k=>store[k]??null,write:(s,k)=>(store[k]=s,true)},console:{log:s=>logs.push(String(s))},$httpClient:{get(){assert.fail('network');},post(){assert.fail('network');}}};
 await new Promise((resolve,reject)=>{context.$done=r=>{results.push(r);resolve();};try{vm.runInNewContext(response,context,{timeout:5000});}catch(e){reject(e);}});
 assert.equal(results.length,1);assert(results[0].body instanceof Uint8Array);assert(logs.some(s=>s.includes('runtime=portable')&&s.includes('adPlacementsRemoved=2')&&s.includes('adSlotsRemoved=1')));
 const parts=api.readUmp(results[0].body);assert(Buffer.from(parts[2].raw).equals(media));const fields=api.readFields(parts[1].data),get=no=>fields.find(f=>f.no===no).data;
 assert(Buffer.from(get(2)).equals(mac(get(1),get(3))));const output=codec.fromBinary(gunzipSync(decrypt(get(1),get(3))));assert.equal(output.contents[0].player.adPlacements.length,0);assert.equal(output.contents[0].player.adSlots.length,0);assert.equal(Buffer.from(get(99)).toString(),'opaque');
 assert(!logs.join('\n').includes(Buffer.from(key).toString('base64')));
});

test('a synchronous overrun cannot beat the deadline by starving the timer queue',async()=>{
 const entry=fs.readFileSync(process.argv[2],'utf8'),module={exports:{}};let clock=0;
 class Clock extends Date {static now(){return clock;}}
 vm.runInNewContext(entry,{module,exports:module.exports,Date:Clock,ArrayBuffer,Uint8Array,DataView},{timeout:3000});
 await assert.rejects(module.exports.playbackDeadline({setTimeout,clearTimeout},async()=>{clock=3001;return 'late result';}),e=>e.code==='timeout');
});

// The Next bytes below are real captures; only their encrypted transport wrapper
// and key are synthetic. This is not a native Shadowrocket playback replay.
test('portable and native encrypted wrappers preserve the three captured Next golden outputs',async()=>{
 const golden=JSON.parse(fs.readFileSync(new URL('../youtube-response/fixtures/next-golden.json',import.meta.url)));
 const native=await api.createPlaybackRuntime({crypto:webcrypto,CompressionStream,DecompressionStream},key);
 const params={captionLang:'off',blockUpload:true,blockImmersive:true,blockShorts:false};
 const hash=b=>createHash('sha256').update(b).digest('hex');
 for(const g of golden){
  const next=brotliDecompressSync(fs.readFileSync(path.join(process.argv[4],'captures',g.id,'0/response_body')));
  assert.equal(hash(next),g.inputSha256);
  const plain=Buffer.concat([Buffer.from([8,1,16,200,1]),f(4,f(3,next)),f(99,Buffer.from('unknown plaintext'))]);
  const iv=randomBytes(16),cipher=encrypt(gzipSync(plain),iv),media=frame(21,randomBytes(127));
  const input=Buffer.concat([frame(10,Buffer.from([8,25])),frame(11,Buffer.concat([f(1,cipher),f(2,mac(cipher,iv)),f(3,iv),Buffer.from([32,1]),f(99,Buffer.from('unknown envelope'))])),media]);
  const decoded=[];
  for(const runtime of [portable,native]){
   const state={config:{},adCache:{whiteNo:[],blackNo:[],whiteEml:[],blackEml:['inline_injection_entrypoint_layout.eml'],dirty:false}};
   const result=await api.rewriteOnesie(input,runtime,b=>api.onesieEndpoint.process(b,params,state,'youtube').output);
   assert.equal(result.verified,1);assert.equal(result.changed,g.removed?1:0);
   const parts=api.readUmp(result.output??input);assert(Buffer.from(parts[0].raw).equals(api.readUmp(input)[0].raw));assert(Buffer.from(parts[2].raw).equals(media));
   const envelope=api.readFields(parts[1].data),get=no=>envelope.find(x=>x.no===no).data;
   assert(Buffer.from(get(2)).equals(mac(get(1),get(3))));assert.equal(Buffer.from(get(99)).toString(),'unknown envelope');
   const output=gunzipSync(decrypt(get(1),get(3))),fields=api.readFields(output);
   assert.equal(Buffer.from(fields.find(x=>x.no===99).data).toString(),'unknown plaintext');
   const content=fields.find(x=>x.no===4).data,filtered=api.readFields(content).find(x=>x.no===3).data;
   assert.equal(hash(filtered),g.outputSha256);decoded.push(output);
  }
  assert(decoded[0].equals(decoded[1]));
 }
});
