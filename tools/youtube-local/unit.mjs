// Public, synthetic tests: no private archive or session export is required.
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {webcrypto,createHmac} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),api=require(path.resolve(process.argv[2]));
const runtime=await api.webPlaybackRuntime({crypto:webcrypto,CompressionStream,DecompressionStream},new Uint8Array(32).fill(17));
const bytes=(n,b)=>Buffer.concat([Buffer.from([n*8+2,b.length]),Buffer.from(b)]);
const frame=(n,b)=>Buffer.concat([api.encodeUmpInteger(n),api.encodeUmpInteger(b.length),Buffer.from(b)]);
async function fixture(){
 const encrypted=await runtime.encrypt(Buffer.from([8,1,16,200,1]));
 const data=Buffer.concat([bytes(1,encrypted.cipher),bytes(2,encrypted.hmac),bytes(3,encrypted.iv)]);
 return Buffer.concat([frame(10,Buffer.from([8,25])),frame(11,data)]);
}
test('UMP integer encodings match independent boundary vectors',()=>{
 for(const [value,expected] of [[0,[0]],[127,[127]],[128,[128,2]],[16383,[191,255]],
  [16384,[192,0,2]],[2097151,[223,255,255]],[2097152,[224,0,0,2]],
  [268435455,[239,255,255,255]],[268435456,[240,0,0,0,16]],[4294967295,[240,255,255,255,255]]])
  assert.deepEqual([...api.encodeUmpInteger(value)],expected);
});
test('public synthetic envelope decrypts and remains exact when unchanged',async()=>{
 const original=await fixture();let calls=0;
 const result=await api.rewriteOnesie(original,runtime,plain=>{calls++;assert.deepEqual([...plain],[8,1,16,200,1]);return undefined;});
 assert.equal(calls,1);assert.equal(result.verified,1);assert.equal(result.output,undefined);
});
test('replacement fields must be existing, unique and length-delimited',()=>{
 assert.throws(()=>api.replaceBytesFields(new Uint8Array([8,1]),new Map([[1,new Uint8Array([0])]])));
 assert.throws(()=>api.replaceBytesFields(new Uint8Array([10,0,10,0]),new Map([[1,new Uint8Array([0])]])));
 assert.throws(()=>api.replaceBytesFields(new Uint8Array([]),new Map([[1,new Uint8Array([0])]])));
 assert.deepEqual([...api.replaceBytesFields(new Uint8Array([10,1,7,16,1]),new Map([[1,new Uint8Array([8,9])]]))],[10,2,8,9,16,1]);
});
test('invalid keys and unavailable native crypto reject before transformation',async()=>{
 await assert.rejects(api.webPlaybackRuntime({},new Uint8Array(32)),e=>e.code==='unsupported-crypto');
 await assert.rejects(api.webPlaybackRuntime({crypto:webcrypto},new Uint8Array(31)),e=>e.code==='key-invalid');
});
test('opaque unrelated UMP payloads are never interpreted as Protobuf',async()=>{
 const input=frame(999,new Uint8Array([255,0,128]));
 const result=await api.rewriteOnesie(input,{decrypt(){assert.fail('must not decrypt');}},()=>assert.fail('must not filter'));
 assert.equal(result.output,undefined);assert.equal(result.verified,0);
});


test('encryption matches NIST AES-CTR and independently computed ciphertext-plus-IV HMAC',async()=>{
 const iv=Buffer.from('f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff','hex');
 const key=Buffer.concat([Buffer.from('2b7e151628aed2a6abf7158809cf4f3c','hex'),Buffer.alloc(16,11)]);
 const apiHost={crypto:{subtle:webcrypto.subtle,getRandomValues:bytes=>{bytes.set(iv);return bytes;}}};
 const provider=await api.webPlaybackRuntime(apiHost,new Uint8Array(key));
 const result=await provider.encrypt(new Uint8Array(Buffer.from('6bc1bee22e409f96e93d7e117393172a','hex')));
 assert.equal(Buffer.from(result.cipher).toString('hex'),'874d6191b620e3261bef6864990db6ce');
 assert.equal(Buffer.from(result.hmac).toString('hex'),createHmac('sha256',key.subarray(16)).update(result.cipher).update(iv).digest('hex'));
});

test('synthetic authentication failure rejects before decrypting/filtering',async()=>{
 const data=await fixture(),parts=api.readUmp(data),fields=api.readFields(parts[1].data);
 const cipher=fields.find(f=>f.no===1).data;cipher[0]^=1;
 await assert.rejects(api.rewriteOnesie(data,runtime,()=>assert.fail('must not filter invalid MAC')),e=>e.code==='authentication-failed');
});

// Build a minimal wire fixture independently from the filtering implementation.
function pbInteger(n){const out=[];do{const byte=n%128;n=Math.floor(n/128);out.push(byte|(n?128:0));}while(n);return Buffer.from(out);}
function pbBytes(no,data){return Buffer.concat([pbInteger(no*8+2),pbInteger(data.length),Buffer.from(data)]);}
function wrap(path,data){return path.reduceRight((b,no)=>pbBytes(no,b),Buffer.from(data));}
test('observed panel layouts require the ad marker and preserve ordinary items and unknown siblings',()=>{
 const layouts=['panel_product_feed_standard_layout.eml-fe','panel_text_icon_center_image_buttoned_layout.eml-fe','panel_content_lockup.eml-fe'];
 const rootUnknown=pbBytes(777,Buffer.from('opaque-root-sibling'));
 const organic=Buffer.concat([wrap(api.wirePaths.rendererLayout,Buffer.from('panel_content_lockup.eml-fe')),wrap(api.wirePaths.rendererData,Buffer.from('/normal/content'))]);
 for(const layout of layouts){
  const ad=Buffer.concat([wrap(api.wirePaths.rendererLayout,Buffer.from(layout+'|variant')),wrap(api.wirePaths.rendererData,Buffer.from('/pagead/aclk'))]);
  const parent=api.wirePaths.immersiveItems.slice(0,-1),itemNo=api.wirePaths.immersiveItems.at(-1);
  const input=Buffer.concat([rootUnknown,wrap(parent,Buffer.concat([pbBytes(itemNo,ad),pbBytes(itemNo,organic)]))]);
  const expected=Buffer.concat([rootUnknown,wrap(parent,pbBytes(itemNo,organic))]);
  const result=api.filterImmersivePanels(new Uint8Array(input));
  assert.equal(result.removed,1);assert.deepEqual(Buffer.from(result.bytes),expected);
  const noMarker=wrap(api.wirePaths.immersiveItems,Buffer.concat([wrap(api.wirePaths.rendererLayout,Buffer.from(layout)),wrap(api.wirePaths.rendererData,Buffer.from('/normal/content'))]));
  const untouched=api.filterImmersivePanels(new Uint8Array(noMarker));assert.equal(untouched.removed,0);assert.deepEqual(Buffer.from(untouched.bytes),noMarker);
 }
 const unknownLayout=wrap(api.wirePaths.immersiveItems,Buffer.concat([wrap(api.wirePaths.rendererLayout,Buffer.from('panel_ordinary.eml-fe')),wrap(api.wirePaths.rendererData,Buffer.from('/pagead/aclk'))]));
 assert.equal(api.filterImmersivePanels(new Uint8Array(unknownLayout)).removed,0);
});
