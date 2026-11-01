// Extra evidence for the schema/runtime refactor, independent of the old helper.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {messages,filterImmersivePanels,readFields,removeMessages,selectMessages,utf8,wirePaths}=require(path.resolve(process.argv[2]));
const source=fs.readFileSync(process.argv[3],'utf8'),captureRoot=process.argv[4];
const same=(a,b)=>assert.deepEqual(Buffer.from(a),Buffer.from(b));
function vint(value){value=BigInt(value);const out=[];do{const b=Number(value&127n);value>>=7n;out.push(b|(value?128:0));}while(value);return Buffer.from(out);}
function field(no,value){value=Buffer.from(value);return Buffer.concat([vint(no*8+2),vint(value.length),value]);}
const wrap=(value,route)=>route.reduceRight((b,no)=>field(no,b),Buffer.from(value));
const modernPath=[42,357104971,2,361256913,1,138681066,3,49399797,1,50195462,1];
const captured=zlib.brotliDecompressSync(fs.readFileSync(path.join(captureRoot,'captures/20261031_213054/0/response_body')));
const panel=selectMessages(new Uint8Array(captured),modernPath)[0];assert(panel);
const opaque=Buffer.concat([
  field(600,[255,0,128]),field(600,Buffer.from('opaque')),
  vint(601*8),Buffer.from([0x81,0]), // valid non-minimal scalar
  vint(602*8+1),Buffer.from([1,2,3,4,5,6,7,8]),
  vint(603*8+5),Buffer.from([9,10,11,12]),
  vint(604*8+3),field(1,Buffer.from('group')),vint(604*8+4),
]);
function run(route,body,client='qx'){
 const results=[],logs=[],store={};
 const context={Uint8Array,ArrayBuffer,TextEncoder:undefined,TextDecoder:undefined,BigInt:undefined,
  console:{log:s=>logs.push(String(s))},$request:{url:'https://youtubei.googleapis.com/youtubei/v1/'+route,headers:{'user-agent':'youtube'}},
  $response:{},$done:r=>results.push(r)};
 const bytes=new Uint8Array(body);
 if(client==='qx')Object.assign(context,{$task:{},$prefs:{valueForKey:k=>store[k]??null,setValueForKey:(v,k)=>{store[k]=v;return true;}}}),context.$response.bodyBytes=bytes.buffer;
 else Object.assign(context,{$persistentStore:{read:k=>store[k]??null,write:(v,k)=>{store[k]=v;return true;}}}),context.$response.body=bytes;
 vm.runInNewContext(source,context,{timeout:5000});assert.equal(results.length,1);
 return {result:results[0],logs,store};
}

test('generated immersive view decodes observed structure and root opaque fields survive',()=>{
 const codec=messages['youtube.observed.next.ImmersiveNext'];
 const decoded=codec.fromBinary(new Uint8Array(captured));
 assert(decoded.belowPlayerImmersiveLayout.field357104971.field2.field361256913.field1.field138681066.field3.sectionListRenderer);
 const roundtrip=codec.toBinary(decoded),before=readFields(new Uint8Array(captured)).filter(f=>f.no!==42),after=readFields(roundtrip).filter(f=>f.no!==42);
 assert.equal(before.length,after.length);
 for(let i=0;i<before.length;i++){assert.equal(before[i].no,after[i].no);same(before[i].data,after[i].data);}
 assert.deepEqual(wirePaths.immersiveItems,modernPath);
});

test('lossless edits keep duplicate opaque fields, all wire types and negative siblings byte exact',()=>{
 const input=Buffer.concat([opaque,wrap(Buffer.concat([field(1,panel),opaque,field(1,[8,1]),field(1,panel)]),modernPath.slice(0,-1)),opaque]);
 const expected=Buffer.concat([opaque,wrap(Buffer.concat([opaque,field(1,[8,1])]),modernPath.slice(0,-1)),opaque]);
 const result=filterImmersivePanels(new Uint8Array(input));
 assert.equal(result.removed,2);same(result.bytes,expected);
 assert.equal(filterImmersivePanels(result.bytes).removed,0);
 same(filterImmersivePanels(result.bytes).bytes,expected);
});

test('both ad predicates are necessary and markers outside the schema path do not match',()=>{
 for(const [from,to] of [['panel_product_feed_standard_layout','panel_organic_feed_standard_layout'],['/pagead/','/normal/']]){
  const negative=Buffer.from(panel);assert.equal(from.length,to.length);assert(negative.indexOf(from)>=0);
  for(let index=negative.indexOf(from);index>=0;index=negative.indexOf(from))negative.write(to,index);
  const input=wrap(negative,modernPath),result=filterImmersivePanels(new Uint8Array(input));
  assert.equal(result.removed,0);same(result.bytes,input);
 }
 const outside=Buffer.concat([field(14,panel),wrap([8,1],modernPath),opaque]);
 same(filterImmersivePanels(new Uint8Array(outside)).bytes,outside);
});

test('changed ancestor tags keep their original non-minimal encoding',()=>{
 // Field 1 tag 0x0a encoded in two bytes. Only its payload length may change.
 const input=new Uint8Array([0x8a,0,2,8,1]);
 const result=removeMessages(input,[1,1],()=>true);
 // Child field 1 is a varint, not a length-delimited message: no edit.
 assert.strictEqual(result.bytes,input);
 const editable=new Uint8Array([0x8a,0,3,0x0a,1,0]);
 same(removeMessages(editable,[1,1],()=>true).bytes,[0x8a,0,0]);
});

test('shared wire reader rejects invalid tags, overflowing values, truncated fields and deep groups',()=>{
 const invalid=[[0],[0x80],[0x0a,5,0],[0x0c],[0x0b,0x14],[8,...Array(10).fill(255)],
  [0xff,0xff,0xff,0xff,0x1f],[0x0b],[...Array(34).fill(0x0b),...Array(34).fill(0x0c)]];
 for(const value of invalid)assert.throws(()=>readFields(new Uint8Array(value)));
 for(const client of ['qx','surge'])for(const value of invalid){
  const r=run('next',value,client);assert.deepEqual(Object.keys(r.result),[]);assert(r.logs.some(l=>l.includes('processing-error')));
 }
});

test('generated codecs retain opaque nested fields when another known field changes',()=>{
 const player=messages['youtube.response.player.Player'];
 const input=Buffer.concat([opaque,field(2,opaque),field(7,field(84813246,opaque)),field(68,field(424701016,opaque))]);
 const message=player.fromBinary(new Uint8Array(input));
 message.adPlacements=[];message.adSlots=[];
 const output=player.toBinary(message);
 const known=readFields(output).find(f=>f.no===2);
 assert(known);same(known.data,opaque);
 // Generic codecs preserve unknown value bytes and multiplicity; unlike the
 // lossless editor they may canonicalize tags and move unknowns after knowns.
 const unknowns=readFields(output).filter(f=>f.no>=600),expected=readFields(new Uint8Array(opaque));
 assert.equal(unknowns.length,expected.length);
 for(let i=0;i<expected.length;i++){assert.equal(unknowns[i].no,expected[i].no);same(unknowns[i].data,expected[i].data);}
});

test('UTF-8 adapter matches standard encoders for Unicode and rejects malformed input',()=>{
 const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
 const strings=['','ASCII','字幕 Русский العربية','😀𝄞','\ud800','\udc00','\ufeffBOM','a\0b'];
 for(let i=0;i<1000;i++){
  let point=(i*104729)%0x110000;if(point>=0xd800&&point<=0xdfff)point=0xfffd;
  strings.push(String.fromCodePoint(point));
 }
 for(const text of strings){const encoded=encoder.encode(text);same(utf8.encode(text),encoded);assert.equal(utf8.decode(encoded),decoder.decode(encoded));}
 for(const bytes of [[0x80],[0xc0,0x80],[0xe0,0x80,0x80],[0xed,0xa0,0x80],[0xf4,0x90,0x80,0x80],[0xe2,0x82]])assert.throws(()=>utf8.decode(new Uint8Array(bytes)));
});

test('bundles process Unicode without native TextEncoder/Decoder on every native adapter',()=>{
 const caption='字幕 😀';
 const codec=messages['youtube.response.player.Player'];
 const input=codec.toBinary(codec.create({playabilityStatus:{},adPlacements:[{}],captions:{playerCaptionsTrackListRenderer:{
  captionTracks:[{baseUrl:'https://example.test/',name:{runs:[{text:caption}]},languageCode:'en'}]}}}));
 for(const client of ['qx','surge']){
  const result=run('player',input,client),output=result.result.bodyBytes??result.result.body;
  assert(output);const decoded=codec.fromBinary(new Uint8Array(output));
  assert.equal(decoded.adPlacements.length,0);assert.equal(decoded.captions.playerCaptionsTrackListRenderer.captionTracks[0].name.runs[0].text,caption);
  assert(decoded.playabilityStatus.pictureInPictureRender);
 }
});

test('malformed known strings fail open and unknown endpoints never enter a decoder',()=>{
 // guide.labelItems.guideSectionRenderer.rendererItems.iconRender.browseId
 const malformed=wrap([0xff],[4,117866661,1,318370163,1]);
 for(const client of ['qx','surge']){
  const response=run('guide',malformed,client);assert.deepEqual(Object.keys(response.result),[]);assert(response.logs.some(l=>l.includes('processing-error')));
  for(const route of ['__proto__','constructor','player/ad_break','player/other'])assert.deepEqual(Object.keys(run(route,[0],client).result),[]);
 }
});

// The upstream runtime supports string int64 values without native BigInt.
test('config acquisition works without BigInt and with a large int64 expiry',()=>{
 const codec=messages['youtube.response.config.Config'];
 const input=codec.toBinary(codec.create({responseContext:{globalConfigGroup:{hotConfigGroup:{mediaHotConfig:{onesieHotConfig:{
  clientKey:new Uint8Array([1,2]),encryptKey:new Uint8Array([3,4]),keyExpiresInSeconds:'9223372036854775807'}}}}}}));
 for(const client of ['qx','surge']){
  const r=run('config',input,client);assert.deepEqual(Object.keys(r.result),[]);
  assert.deepEqual(JSON.parse(r.store.YouTubeConfig).youtube,{clientKey:'AQI=',encryptKey:'AwQ='});
  assert.equal(r.logs.length,0);
 }
});

test('known wire mismatches fail before decoding for every nonempty generated message',()=>{
 for(const codec of Object.values(messages)){
  const first=codec.fields[0];if(!first)continue;
  const expected=first.kind==='message'?2:first.kind==='enum'?0:
    [1,6,16].includes(first.T)?1:[2,7,15].includes(first.T)?5:[9,12].includes(first.T)?2:0;
  const wrong=expected===0?5:0;
  const malformed=Buffer.concat([vint(first.no*8+wrong),Buffer.alloc(wrong===5?4:1)]);
  assert.throws(()=>codec.fromBinary(new Uint8Array(malformed)),codec.typeName);
 }
});

test('packed scalars accept packed and unpacked input and reject truncated encodings',()=>{
 const codec=messages['youtube.response.player.AudioTrack'];
 const packedField=codec.fields.find(f=>f.localName==='captionTrackIndices');assert(packedField);
 const no=packedField.no;
 assert.deepEqual(codec.fromBinary(new Uint8Array(field(no,[0,1,2]))).captionTrackIndices,[0,1,2]);
 assert.deepEqual(codec.fromBinary(new Uint8Array(Buffer.concat([vint(no*8),Buffer.from([2])]))).captionTrackIndices,[2]);
 for(const invalid of [[0x80],[...Array(10).fill(0xff)],[0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,2]])
  assert.throws(()=>codec.fromBinary(new Uint8Array(field(no,invalid))));
});
