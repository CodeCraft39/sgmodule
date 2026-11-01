// Usage: node tools/youtube-next/test.mjs <extracted-captures-root> [scripts-and-schema-dir]
// Captures contain private data. Only lengths, hashes, field IDs and test results
// are written to the report; never commit raw requests, headers or bodies.
import fs from 'node:fs/promises';
import vm from 'node:vm';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const argv = globalThis.YOUTUBE_TEST_ARGS ?? process.argv.slice(2);
assert(argv[0], 'Supply extracted captures root');
const original = await fs.readFile(path.join(root, 'tools/youtube-response/fixtures/upstream.response.js'), 'utf8');
const patched = await fs.readFile(path.join(root, 'Script/Youtube/youtube.response.qx.js'), 'utf8');
const helper = await fs.readFile(path.join(dir, 'next-wire.js'), 'utf8');
const helperContext = {Uint8Array};
vm.runInNewContext(helper, helperContext);
const filter = helperContext.qxNext2026;
const route = [42,357104971,2,361256913,1,138681066,3,49399797,1,50195462,1];
const proto=await fs.readFile(path.join(dir,'next-observed.proto'),'utf8');
const schema=new Map([...proto.replace(/\/\/[^\n]*/g,'').matchAll(/message\s+(\w+)\s*\{([^}]+)\}/g)]
  .map(([,name,body])=>[name,[...body.matchAll(/(?:optional|repeated)\s+(\w+)\s+\w+\s*=\s*(\d+)\s*;/g)]
    .map(([,type,no])=>({type,no:Number(no)}))]));
let checks = 0;
function check(fn) { fn(); checks++; }
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const same = (a,b) => assert.deepEqual(Buffer.from(a), Buffer.from(b));

// Independent BigInt wire decoder, deliberately separate from next-wire.js.
function scan(buffer) {
  const b = Buffer.from(buffer), result = []; let p = 0;
  function v() {
    let value = 0n;
    for (let i=0;i<10;i++) {
      assert(p < b.length, 'EOF'); const x = b[p++];
      assert(i < 9 || x <= 1, 'overflow');
      value |= BigInt(x & 127) << BigInt(7*i);
      if (!(x & 128)) return value;
    }
    assert.fail('varint');
  }
  function field(depth=0) {
    assert(depth < 40); const start=p, tag=v();
    const no=Number(tag>>3n), wire=Number(tag&7n), tagEnd=p;
    assert(no>0 && no<=536870911); let valueStart=p;
    if(wire===0)v();
    else if(wire===1)p+=8;
    else if(wire===2){const len=Number(v());valueStart=p;p+=len;}
    else if(wire===3){while(true){const child=field(depth+1);if(child.wire===4){assert.equal(child.no,no);break;}}}
    else if(wire===5)p+=4;
    else assert.equal(wire,4);
    assert(p<=b.length);
    return {no,wire,raw:b.subarray(start,p),tag:b.subarray(start,tagEnd),data:b.subarray(valueStart,p)};
  }
  while(p<b.length){const f=field();assert.notEqual(f.wire,4);result.push(f);}
  return result;
}
function at(b, route) {
  let nodes=[Buffer.from(b)];
  for(const no of route)nodes=nodes.flatMap(n=>scan(n).filter(f=>f.no===no&&f.wire===2).map(f=>f.data));
  return nodes;
}
function validateSchema(b,name='NextObserved') {
  for(const f of scan(b)) {
    const declared=schema.get(name).find(x=>x.no===f.no);
    if(!declared)continue;
    const {type}=declared;
    const wire=['bool','uint64'].includes(type)?0:type==='fixed64'?1:2;
    assert.equal(f.wire,wire,`${name}.${f.no}`);
    if(schema.has(type))validateSchema(f.data,type);
    else if(type==='string')new TextDecoder('utf8',{fatal:true}).decode(f.data);
  }
}
function vint(n) { n=BigInt(n);const a=[];do{let x=Number(n&127n);n>>=7n;a.push(x|(n?128:0));}while(n);return Buffer.from(a); }
function msg(no,b){return Buffer.concat([vint(BigInt(no)*8n+2n),vint(b.length),Buffer.from(b)]);}
function wrap(b,route){return route.reduceRight((b,no)=>msg(no,b),b);}

// Verify every unremoved field byte-for-byte, recursively through changed
// ancestors. Includes field order, repeated fields and their original encodings.
function preservation(before, after, removedItems, level=0) {
  const a=scan(before), b=scan(after);let j=0;
  for(const f of a){
    if(f.no===route[level]&&f.wire===2){
      if(level===route.length-1 && removedItems.some(x=>x.equals(f.data)))continue;
      const g=b[j++];assert(g);same(f.tag,g.tag);
      if(level<route.length-1)preservation(f.data,g.data,removedItems,level+1);
      else same(f.raw,g.raw);
    }else same(f.raw,b[j++]?.raw??[]);
  }
  assert.equal(j,b.length);
}
function replay(source, bytes, store={}, url='https://youtubei.googleapis.com/youtubei/v1/next') {
  const logs=[], results=[];
  const context={Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,
    console:{log:(...x)=>logs.push(x.join(' '))},
    $request:{url,headers:{'user-agent':'com.google.ios.youtube/21.43'}},
    $response:{bodyBytes:new Uint8Array(bytes).buffer},$task:{},
    $prefs:{valueForKey:k=>store[k]??null,setValueForKey:(v,k)=>{store[k]=v;return true;}},
    $notify:()=>{},$done:r=>results.push(r)};
  vm.runInNewContext(source,context,{timeout:10000});
  assert.equal(results.length,1); return {result:results[0],logs,store};
}
const summary=[];let capturedItem;
for(const id of ['20261031_204503','20261031_213054','20261031_213333']){
  const raw=await fs.readFile(path.join(argv[0],id,'0/response_body'));
  const bytes=zlib.brotliDecompressSync(raw);
  const items=at(bytes,route); if(items.length)capturedItem=items[0];
  const wanted=id==='20261031_204503'?0:1;
  const base=replay(original,bytes), run=replay(patched,bytes);
  const out=run.result.bodyBytes?Buffer.from(run.result.bodyBytes):bytes;
  const filtered=filter(new Uint8Array(bytes));
  check(()=>validateSchema(bytes));
  check(()=>validateSchema(out));
  check(()=>assert.deepEqual(Object.keys(base.result),[]));
  check(()=>assert.equal(filtered.removed,wanted));
  check(()=>assert.equal(run.result.bodyBytes instanceof ArrayBuffer,!!wanted));
  check(()=>same(filtered.bytes,out));
  check(()=>preservation(bytes,out,items));
  check(()=>assert.equal(at(out,route).length,0));
  check(()=>assert.equal(filter(new Uint8Array(out)).removed,0));
  check(()=>same(filter(new Uint8Array(out)).bytes,out));
  check(()=>assert.deepEqual(run.store,{}));
  const stale={YouTubeAdvertiseInfo:JSON.stringify({version:'1.0',whiteNo:[],blackNo:[],whiteEml:['panel_product_feed_standard_layout.eml-fe'],blackEml:[]})};
  check(()=>same(replay(patched,bytes,stale).result.bodyBytes??bytes,out));
  check(()=>assert.equal(Number(scan(bytes).find(f=>f.no===47).data[0]),1));
  const entry={id,compressedBytes:raw.length,inputBytes:bytes.length,inputSha256:hash(bytes),
    topFields:scan(bytes).map(f=>({no:f.no,wire:f.wire,length:f.data.length})),
    removed:wanted,outputBytes:out.length,outputSha256:hash(out),logs:run.logs};
  if(argv[1]){
    const exp=await fs.readFile(path.join(argv[1],'youtube.response.experimental.js'),'utf8');
    const instrumented=exp.replace('try{Ki()}catch(l)','globalThis.__schema=re;try{Ki()}catch(l)');
    // Decode/re-encode from within its own VM and expose bytes only.
    const exportSchema=instrumented.replace('globalThis.__schema=re;', `
      function snap(value){
        if(value instanceof Uint8Array)return Array.from(value);
        if(Array.isArray(value))return value.map(snap);
        if(value&&typeof value==='object')return {
          props:Object.fromEntries(Object.keys(value).sort().map(k=>[k,snap(value[k])])),
          unknown:d.list(value).map(f=>({no:f.no,wire:f.wireType,data:Array.from(f.data)}))
        };
        return value;
      }
      let probe=re.fromBinary(new Uint8Array($response.bodyBytes));
      globalThis.__before=JSON.stringify(snap(probe));
      globalThis.__roundtrip=re.toBinary(probe);
      globalThis.__after=JSON.stringify(snap(re.fromBinary(globalThis.__roundtrip)));
    `);
    const replayExp=replay(exp,bytes);
    const c={Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,console:{log:()=>{}},
      $request:{url:'https://youtubei.googleapis.com/youtubei/v1/next',headers:{'user-agent':'youtube'}},
      $response:{bodyBytes:new Uint8Array(bytes).buffer},$task:{},
      $prefs:{valueForKey:()=>null,setValueForKey:()=>true},$done:()=>{},$notify:()=>{}};
    vm.runInNewContext(exportSchema,c,{timeout:10000});
    check(()=>assert.equal(c.__roundtrip.length,bytes.length));
    check(()=>assert.equal(c.__before,c.__after));
    // All opaque siblings remain identical despite known-field reordering.
    const originalTop=scan(bytes).filter(f=>![1,42].includes(f.no));
    const roundTop=scan(c.__roundtrip).filter(f=>![1,42].includes(f.no));
    check(()=>same(Buffer.concat(originalTop.map(f=>f.raw)),Buffer.concat(roundTop.map(f=>f.raw))));
    entry.experimentalOutputBytes=replayExp.result.bodyBytes?.byteLength??bytes.length;
    entry.experimentalRoundtripExact=Buffer.from(c.__roundtrip).equals(bytes);
  }
  summary.push(entry);
}
assert(capturedItem);
const unknowns=Buffer.concat([
  // Duplicate opaque fields and a deliberately nonminimal varint encoding.
  msg(600,Buffer.from([255,0,128])),msg(600,Buffer.from('opaque')),
  vint(601*8),Buffer.from([0x81,0]),
  vint(602*8+1),Buffer.from([1,2,3,4,5,6,7,8]),
  vint(603*8+5),Buffer.from([9,10,11,12]),
  vint(604*8+3),msg(1,Buffer.from('group')),vint(604*8+4)
]);
const mixed=Buffer.concat([unknowns,wrap(Buffer.concat([
  msg(1,capturedItem),unknowns,msg(1,Buffer.from([8,1])),msg(1,capturedItem)
]),route.slice(0,-1)),unknowns]);
const mixedOut=filter(new Uint8Array(mixed));
check(()=>assert.equal(mixedOut.removed,2));
check(()=>preservation(mixed,mixedOut.bytes,[capturedItem]));
check(()=>assert.equal(at(mixedOut.bytes,route).length,1));
for(const [from,to] of [['panel_product_feed_standard_layout','panel_organic_feed_standard_layout'],['/pagead/','/normal/']]){
  const negative=Buffer.from(capturedItem);const index=negative.indexOf(from);
  assert(index>=0);assert.equal(from.length,to.length);negative.write(to,index);
  // The captured element contains duplicate identifiers/URLs.
  for(let i=negative.indexOf(from);i>=0;i=negative.indexOf(from))negative.write(to,i);
  const input=wrap(negative,route),r=filter(new Uint8Array(input));
  check(()=>assert.equal(r.removed,0));check(()=>same(r.bytes,input));
}
// Unknown layouts and a pagead marker elsewhere in the response must not match.
const noMatch=Buffer.concat([msg(14,capturedItem),wrap(Buffer.from([8,1]),route),unknowns]);
check(()=>same(filter(new Uint8Array(noMatch)).bytes,noMatch));
for(const bad of [Buffer.from([0]),Buffer.from([0x80]),Buffer.from([0x0a,0x05,0]),
  Buffer.concat([mixed,Buffer.from([0x0a,0xff])]),Buffer.from([0x0c]),
  Buffer.from([0x0b,0x14]),Buffer.from([8,...Array(10).fill(255)]),
  Buffer.from([0xff,0xff,0xff,0xff,0x1f])]){
  check(()=>assert.throws(()=>filter(new Uint8Array(bad))));
  check(()=>assert.deepEqual(Object.keys(replay(patched,bad).result),[]));
}
check(()=>assert.deepEqual(Object.keys(replay(patched,Buffer.alloc(0)).result),[]));
// Legacy /next and an unrelated browse endpoint still use the original handler.
const legacy=msg(7,Buffer.alloc(0));
check(()=>same(filter(new Uint8Array(legacy)).bytes,legacy));
check(()=>assert.deepEqual(Object.keys(replay(patched,legacy).result),Object.keys(replay(original,legacy).result)));
const legacyAd=wrap(capturedItem,[7,51779735,1,49399797,1,50195462,1]);
const legacyBase=replay(original,legacyAd),legacyPatch=replay(patched,legacyAd);
check(()=>assert(legacyBase.result.bodyBytes instanceof ArrayBuffer));
check(()=>same(legacyBase.result.bodyBytes,legacyPatch.result.bodyBytes));
const combined=replay(patched,Buffer.concat([legacyAd,wrap(capturedItem,route)])).result;
check(()=>assert(combined.bodyBytes instanceof ArrayBuffer));
check(()=>assert.equal(at(Buffer.from(combined.bodyBytes),route).length,0));
check(()=>assert.equal(at(Buffer.from(combined.bodyBytes),[7,51779735,1,49399797,1,50195462,1]).length,0));
check(()=>assert.deepEqual(Object.keys(replay(patched,Buffer.alloc(0),{},'https://youtubei.googleapis.com/youtubei/v1/browse').result),[]));
const report={checks,captures:summary};
await fs.writeFile(path.join(dir,'results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
