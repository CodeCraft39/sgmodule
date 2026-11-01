// node test.mjs <compiled-test-entry.cjs> <candidate-bundle.js>
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const api=require(path.resolve(process.argv[2]));
const candidate=fs.readFileSync(process.argv[3],'utf8');
const upstream=fs.readFileSync(path.join(dir,'fixtures/upstream.request.js'),'utf8');
assert.equal(crypto.createHash('sha256').update(upstream).digest('hex'),
  '3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26');
const INIT='https://r1---sn-test.googlevideo.com/initplayback?source=youtube&ack=1';
const LOG='https://youtubei.googleapis.com/youtubei/v1/log_event';
const key=Buffer.from([0,1,128,255]);
const config={youtube:{clientKey:'client+/=',encryptKey:key.toString('base64'),extra:'preserve'},
  youtubeMusic:{clientKey:'music-key',encryptKey:key.toString('base64')},other:{unknown:true}};
const params={captionLang:'off',blockUpload:true,blockImmersive:true,blockShorts:false};
function v(n){n=BigInt(n);const a=[];do{let b=Number(n&127n);n>>=7n;a.push(b|(n?128:0));}while(n);return Buffer.from(a);}
function field(no,data){data=Buffer.from(data);return Buffer.concat([v(BigInt(no)*8n+2n),v(data.length),data]);}
function payload(k=key){return field(3,Buffer.concat([field(2,[1,2,3]),field(5,k),field(6,[4,5]),field(7,[6,7])]));}
function native(source,{client='qx',url=INIT,body=payload(),cache=config,rawCache,arg,environment,
  headers={'User-Agent':'com.google.ios.youtube/21.43'},storeThrows=false,writeResult=true,bodyFallback=false,omitBody=false}={}){
  const result=[],logs=[],writes=[];
  const state={YouTubeConfig:rawCache!==undefined?rawCache:cache===null?null:JSON.stringify(cache)};
  const request={url,headers,method:'POST',sessionIndex:42};
  const binary=body===undefined?undefined:typeof body==='string'?body:new Uint8Array(body);
  if(!omitBody)request[client==='qx'&&!bodyFallback?'bodyBytes':'body']=client==='qx'&&binary instanceof Uint8Array&&!bodyFallback?binary.buffer:binary;
  const read=k=>state[k]??null;
  const write=(value,name)=>{if(storeThrows)throw Error('storage unavailable');writes.push([name,value]);if(writeResult!==false)state[name]=value;return writeResult;};
  const context={ArrayBuffer,Uint8Array,TextEncoder,TextDecoder,console:{log:s=>logs.push(String(s))},
    $request:request,$response:{},$argument:arg,$environment:environment??{variables:{debug:'true'}},
    $done:r=>result.push(r)};
  if(client==='qx'){context.$task={};context.$prefs={valueForKey:read,setValueForKey:write};}
  else {context.$persistentStore={read,write};context.$httpClient={};context.$notification={post:()=>{}};if(client==='sr')context.$rocket={};}
  let error;
  try{vm.runInNewContext(source,context,{timeout:5000});}catch(e){error=e;}
  return {result:result[0],calls:result.length,logs,writes,state,error,context};
}
function normalize(value){
  if(value instanceof ArrayBuffer)return {bytes:[...new Uint8Array(value)]};
  if(ArrayBuffer.isView(value))return {bytes:[...new Uint8Array(value.buffer,value.byteOffset,value.byteLength)]};
  if(Array.isArray(value))return value.map(normalize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalize(value[k])]));
  return value;
}
function equal(a,b){assert.deepEqual(normalize(a),normalize(b));}

test('reconstructed core agrees with the original on supported decisions',()=>{
  const instrument=upstream.replace('Et();})();','globalThis.__core={He,ze};Et();})();');
  const original=native(instrument,{client:'sr'}).context.__core;
  assert(original);
  const cases=[
    {url:INIT,bodyBytes:payload(),config},
    {url:INIT,bodyBytes:payload([9]),config},
    {url:INIT,bodyBytes:undefined,config},
    {url:INIT,bodyBytes:payload(),config:{}},
    {url:INIT,bodyBytes:payload(),config:{youtube:{clientKey:'x'}}},
    {url:INIT,bodyBytes:payload(),config:{youtube:{encryptKey:'AA=='}}},
    {url:INIT,bodyBytes:payload(),config,headers:{'user-agent':'com.google.ios.youtubemusic/1'}},
    {url:LOG,config,headers:{'Content-Encoding':'gzip','X-YouTube-Hot-Hash-Data':'hash',Keep:'yes'}},
    {url:LOG,config:{},headers:{'CONTENT-ENCODING':'br','x-youtube-hot-hash-data':'hash',Keep:'yes'}},
    {url:'https://youtubei.googleapis.com/other',config},
  ];
  for(const c of cases){
    const input={headers:{'User-Agent':'youtube'},params,...c};
    const originalInput={...input,config:structuredClone(input.config),platformKey:api.platformKey(input.headers),
      workerUrl:'https://init-stream.maasea.workers.dev/'};
    const expected=original.He(originalInput),actual=api.processRequest({...input,config:structuredClone(input.config)});
    assert.equal(actual.action,expected.action==='exit'?'pass':expected.action);
    assert.equal(actual.changed,expected.changed);
    equal(actual.config,expected.config);
    equal(actual.headers,expected.headers);
    equal(actual.redirectUrl,expected.redirectUrl);
  }
});

test('Shadowrocket and Surge native completion/storage remain equivalent',()=>{
  for(const client of ['sr','surge'])for(const c of [
    {},{cache:{}},{body:payload([9])},{cache:{youtube:{clientKey:'partial'}}},{omitBody:true},
    {url:LOG},{url:LOG,cache:{}},
    {arg:JSON.stringify({captionLang:'zh-Hans',blockUpload:false,blockImmersive:false,blockShorts:true})},
  ]){
    const old=native(upstream,{client,...c}),next=native(candidate,{client,...c});
    assert.equal(next.error,undefined);assert.equal(next.calls,1);
    equal(next.result,old.result);equal(next.writes,old.writes);
  }
});

test('QX returns a flat documented 307 instead of a URL-rewrite object',()=>{
  const old=native(upstream),next=native(candidate);
  assert.equal(next.error,undefined);assert.equal(next.calls,1);
  assert.equal(next.result.status,'HTTP/1.1 307 Temporary Redirect');
  assert.equal(next.result.headers.Location,old.result.url);
  assert.equal(next.result.body,'');assert(!('response' in next.result));assert(!('url' in next.result));
  assert.equal(next.result.headers['Cache-Control'],'no-store');
  assert.equal(next.writes.length,0);
  assert(next.logs.some(s=>s.includes('action=redirect reason=key-match')));
});

test('QX fallback is a flat 200 and invalidates only the selected platform',()=>{
  for(const c of [{cache:{}},{body:payload([9])},{cache:{youtube:{clientKey:'partial'},other:1}},{omitBody:true}]){
    const next=native(candidate,c);assert.equal(next.calls,1);assert.equal(next.error,undefined);
    assert.equal(next.result.status,'HTTP/1.1 200 OK');assert.equal(next.result.body,'');
    assert(!('response' in next.result));
  }
  const next=native(candidate,{body:payload([9])});
  const saved=JSON.parse(next.state.YouTubeConfig);
  assert.equal(saved.youtube,undefined);equal(saved.youtubeMusic,config.youtubeMusic);equal(saved.other,config.other);
  equal(config.youtube,{clientKey:'client+/=',encryptKey:key.toString('base64'),extra:'preserve'});
  assert(native(candidate,{omitBody:true}).logs.some(s=>s.includes('reason=body-unavailable')));
});

test('QX header processing works with no request body and mixed-case headers',()=>{
  for(const cache of [{},config]){
    const headers={'User-Agent':'youtube','cOnTeNt-EnCoDiNg':'br','X-YOUTUBE-HOT-HASH-DATA':'opaque',Keep:'yes'};
    const next=native(candidate,{url:LOG,cache,headers,body:'irrelevant'});
    const expected={...headers};if(!cache.youtube?.clientKey)delete expected['X-YOUTUBE-HOT-HASH-DATA'];
    assert.equal(next.calls,1);equal(next.result,{headers:expected});assert.equal(headers['cOnTeNt-EnCoDiNg'],'br');
  }
});

test('QX header-only log_event preserves compressed body representation and framing',()=>{
  const plain=Buffer.from([10,3,1,2,3]);
  for(const [encoding,compress,decompress] of [['gzip',zlib.gzipSync,zlib.gunzipSync],['br',zlib.brotliCompressSync,zlib.brotliDecompressSync]]){
    for(const cache of [{},config]){
      const compressed=compress(plain),before=Buffer.from(compressed);
      const headers={'User-Agent':'youtube','Content-Encoding':encoding,'Content-Length':String(compressed.length),
        'Content-Type':'application/x-protobuf','X-YouTube-Hot-Hash-Data':'cached'};
      const next=native(candidate,{url:LOG,cache,headers,body:compressed});
      assert.equal(next.result.headers['Content-Encoding'],encoding);
      assert.equal(next.result.headers['Content-Length'],String(compressed.length));
      assert.equal(next.result.headers['Content-Type'],'application/x-protobuf');
      assert.deepEqual(Object.keys(next.result),['headers']);
      equal(compressed,before);equal(decompress(compressed),plain);
    }
  }
});

test('binary bridge preserves sliced views, accepts binary fallbacks, rejects text',()=>{
  const body=payload();const padded=new Uint8Array(body.length+20);padded.set(body,7);
  const view=padded.subarray(7,7+body.length),before=Buffer.from(padded);
  equal(api.bytes(view),body);equal(api.bytes(new DataView(padded.buffer,7,body.length)),body);
  for(const client of ['qx','sr']){
    const c=native(candidate,{client,body:view});assert.equal(c.calls,1);
    assert(client==='qx'?c.result.status.includes('307'):!!c.result.url);
  }
  assert(native(candidate,{body,bodyFallback:true}).result.status.includes('307'));
  equal(padded,before);assert.throws(()=>api.bytes('binary text'));
  const bad=native(candidate,{body:'lossy text'});assert.equal(bad.calls,1);assert.equal(bad.result.status,'HTTP/1.1 200 OK');
  assert(bad.logs.some(s=>s.includes('stage=body')));
});

test('decoded schema agrees with the embedded decoder, including merge semantics',()=>{
  const instrument=upstream.replace('Et();})();','globalThis.__schema=ze;Et();})();');
  const original=native(instrument,{client:'sr'}).context.__schema;
  const unknown=Buffer.concat([field(555,[255,0,128]),v(556*8),Buffer.from([0x81,0]),
    v(557*8+1),Buffer.alloc(8,9),v(558*8+5),Buffer.alloc(4,8),
    v(559*8+3),field(1,[2,3]),v(559*8+4)]);
  for(const body of [payload(),Buffer.concat([unknown,payload(),unknown]),
    Buffer.concat([field(3,Buffer.concat([unknown,field(5,key)])),field(3,field(6,[7,8]))]),
    Buffer.concat([field(3,field(5,key)),field(3,field(5,[]))])]){
    const before=Buffer.from(body),decoded=api.decodeOnesieRequest(body),golden=original.fromBinary(new Uint8Array(body));
    const a=decoded.encryptedInnertubeRequest,b=golden.encryptedInnertubeRequest;
    for(const name of ['encryptedOnesieInnertubeRequest','encryptedClientKey','iv','hmac'])equal(a?.[name],b?.[name]);
    equal(body,before);
    if(decoded.unknownFields.length)equal(Buffer.concat(decoded.unknownFields.map(f=>Buffer.from(f.raw))),Buffer.concat([unknown,unknown]));
  }
});

test('bounded wire reader rejects truncation, invalid tags/wires, overflow and groups',()=>{
  const bad=[[],[0],[0x80],[0x0a,0x10,0],[0x0b],[0x0c],[0x0b,0x14],
    [8,...Array(10).fill(255)],[0xff,0xff,0xff,0xff,0x1f],[0x0e],
    [...v(3*8),1],[...field(3,Buffer.from([5*8+5,0,0,0,0]))]];
  // Empty is valid protobuf and intentionally follows the ordinary key-mismatch path.
  assert.equal(api.decodeOnesieRequest(new Uint8Array()).encryptedInnertubeRequest,undefined);
  for(const input of bad.slice(1)){
    assert.throws(()=>api.decodeOnesieRequest(Uint8Array.from(input)));
    for(const client of ['qx','sr']){
      const c=native(candidate,{client,body:Buffer.from(input)});
      assert.equal(c.error,undefined);assert.equal(c.calls,1);
      if(client==='qx')assert.equal(c.result.status,'HTTP/1.1 200 OK');else equal(c.result,{});
      assert.equal(c.writes.length,0);
    }
  }
});

test('100 deterministic valid protobuf variants match the original decoder',()=>{
  const instrument=upstream.replace('Et();})();','globalThis.__schema=ze;Et();})();');
  const original=native(instrument,{client:'sr'}).context.__schema;
  let seed=0x5ead;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(let i=0;i<100;i++){
    const array=()=>Uint8Array.from({length:random()%70},()=>random()%256);
    const nested=[field(2,array()),field(5,array()),field(6,array()),field(7,array()),
      field(100+i,array()),Buffer.concat([v((200+i)*8),v(random())])];
    const unknown=field(1000+i,array());
    const body=Buffer.concat([unknown,field(3,Buffer.concat(nested)),field(3,field(6,array()))]);
    const actual=api.decodeOnesieRequest(body),expected=original.fromBinary(new Uint8Array(body));
    for(const name of ['encryptedOnesieInnertubeRequest','encryptedClientKey','iv','hmac'])
      equal(actual.encryptedInnertubeRequest[name],expected.encryptedInnertubeRequest[name]);
    equal(actual.unknownFields[0].raw,unknown);
  }
});

test('cache and arguments failures complete once and never log input values',()=>{
  for(const client of ['qx','sr'])for(const c of [
    {rawCache:'private-secret-invalid-json'}, {rawCache:'[]'},
    {cache:{youtube:{clientKey:23}}}, {cache:{youtube:false}},
    {arg:'private-secret-invalid-json'},
    {cache:{youtube:{clientKey:'private-secret',encryptKey:'!!!'}}},
  ]){
    const next=native(candidate,{client,...c});assert.equal(next.calls,1);assert.equal(next.error,undefined);
    assert.equal(next.writes.length,0);assert(!next.logs.join('\n').includes('private-secret'));
    if(client==='qx')assert.equal(next.result.status,'HTTP/1.1 200 OK');else equal(next.result,{});
  }
  for(const c of [{storeThrows:true},{writeResult:false}]){
    const next=native(candidate,{...c,body:payload([9])});
    assert.equal(next.calls,1);assert.equal(next.result.status,'HTTP/1.1 200 OK');
    assert(next.logs.some(s=>s.includes('cache=failed')));
  }
});

test('null config follows ordinary missing-key fallback and routine logging is opt-in',()=>{
  for(const client of ['qx','sr']){
    const quiet=native(candidate,{client,rawCache:'null',environment:{variables:{debug:'false'}}});
    assert.equal(quiet.calls,1);assert.equal(quiet.logs.length,0);
    assert(client==='qx'?quiet.result.status==='HTTP/1.1 200 OK':quiet.result.response.status===200);
    const error=native(candidate,{client,rawCache:'not-json',environment:{variables:{debug:'false'}}});
    assert(error.logs.some(l=>l.includes('processing-error')));
  }
});

test('QX fragment and environment options are parsed without forwarding debug to Worker',()=>{
  for(const environment of [
    {sourcePath:'https://example.test/youtube.request.js#captionLang=zh-Hans&blockUpload=false&blockImmersive=false&blockShorts=true&debug=true'},
    {variables:{captionLang:'zh-Hans',blockUpload:'false',blockImmersive:'false',blockShorts:'true',debug:'true'}},
  ]){
    const next=native(candidate,{environment});const url=new URL(next.result.headers.Location);
    assert.equal(url.searchParams.get('captionLang'),'zh-Hans');
    assert.equal(url.searchParams.get('blockUpload'),'false');assert.equal(url.searchParams.get('blockImmersive'),'false');
    assert.equal(url.searchParams.get('blockShorts'),'true');assert(!url.searchParams.has('debug'));
    assert(next.logs.some(s=>s.includes('output=http-307')));
  }
  assert.equal(api.options({$argument:'{{{unresolved}}}'}).worker.captionLang,'off');
});

test('base64 agrees with known bytes, including URL-safe/unpadded values',()=>{
  for(let length=0;length<128;length++){
    const data=Buffer.from(Array.from({length},(_,i)=>(i*31+length)%256));
    for(const encoded of [data.toString('base64'),data.toString('base64url')])equal(api.decodeBase64(encoded),data);
  }
  for(const bad of ['A','!!!','AA=A','A==='])assert.throws(()=>api.decodeBase64(bad));
});

test('routing does not accidentally match endpoint names inside another URL',()=>{
  for(const url of ['https://example.test/?next=initplayback','https://example.test/no/log_event',
    'https://example.test/initplayback-other','https://example.test/youtubei/v1/log_event-other']){
    const c=native(candidate,{url});assert.equal(c.calls,1);equal(c.result,{});assert.equal(c.writes.length,0);
  }
  assert.equal(api.platformKey({'USER-AGENT':'YouTubeMusic/1'}),'youtubeMusic');
  assert.equal(api.platformKey({}),'youtube');
});

test('shipped QX rules select analyze-echo, retain ack coverage, and exclude Worker traffic',()=>{
  const conf=fs.readFileSync(path.join(dir,'quantumult-x.conf'),'utf8');
  const lines=conf.split('\n').filter(s=>s.startsWith('^')&&!s.includes('script-response-body'));
  assert.equal(lines.length,2);
  assert(lines[0].includes(' url script-analyze-echo-response '));
  assert(lines[1].includes(' url script-request-header '));
  assert(lines.every(line=>line.endsWith('youtube.request.js#debug=true')));
  const init=new RegExp(lines[0].split(' url ')[0]),log=new RegExp(lines[1].split(' url ')[0]);
  for(const url of [INIT,'https://r1---sn-test.googlevideo.com/initplayback?ack=1',
    'https://r1---sn-test.googlevideo.com/initplayback?a=2&ack=1&b=3'])assert(init.test(url));
  for(const url of ['https://r1---sn-test.googlevideo.com/initplayback?a=1',
    'https://r1---sn-test.googlevideo.com/initplayback?acknowledge=1',
    'https://init-stream.maasea.workers.dev/?target='+encodeURIComponent(INIT)])assert(!init.test(url));
  assert(log.test(LOG));assert(log.test(LOG+'?a=1'));assert(!log.test(LOG+'-other'));
});
