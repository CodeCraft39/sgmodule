// Opt-in response-emptying experiment. Tests cannot establish native app retries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),api=require(path.resolve(process.argv[2]));
const script=fs.readFileSync(process.argv[3],'utf8');
const key=Buffer.alloc(32,19),runtime=await api.webPlaybackRuntime({crypto:webcrypto,CompressionStream,DecompressionStream},key);
// Use the independently known status wire representation, not descriptor names.
const encrypted=await runtime.encrypt(new Uint8Array([8,1,16,200,1]));
function v(n){const a=[];do{let x=n%128;n=Math.floor(n/128);a.push(x|(n?128:0));}while(n);return Buffer.from(a);}
function f(n,b){return Buffer.concat([v(n*8+2),v(b.length),b]);}
function frame(type,data){return Buffer.concat([api.encodeUmpInteger(type),api.encodeUmpInteger(data.length),data]);}
const envelope=Buffer.concat([f(1,encrypted.cipher),f(2,encrypted.hmac),f(3,encrypted.iv)]);
const input=Buffer.concat([frame(10,Buffer.from([8,25])),frame(11,envelope)]);
const response={statusCode:200,headers:{'Content-Type':'application/vnd.yt-ump'}};
function context(store={},write='ok'){
 const writes=[];
 return {writes,host:{$task:{},$prefs:{valueForKey:k=>store[k]??null,setValueForKey:(s,k)=>{
  writes.push(k);if(write==='throw')throw Error('PRIVATE-ERROR');if(write==='false')return false;store[k]=s;return true;
 }}}};
}
async function native({store={},enabled=true,body=input,status=200,mime='application/vnd.yt-ump',write='ok'}={}){
 const {host,writes}=context(store,write),results=[],logs=[];
 Object.assign(host,{ArrayBuffer,Uint8Array,DataView,crypto:webcrypto,CompressionStream,DecompressionStream,setTimeout,clearTimeout,
  $request:{url:'https://r1---fixture.googlevideo.com/initplayback?ack=1',headers:{'User-Agent':'youtube'}},
  $response:{bodyBytes:new Uint8Array(body).buffer,statusCode:status,headers:{'content-type':mime}},
  $environment:{sourcePath:'https://fixture.invalid/response.js#localPlayback=true&debug=true'+(enabled?'&bootstrapRetry=true':'')},
  console:{log:s=>logs.push(String(s))}});
 await new Promise((resolve,reject)=>{host.$done=r=>{results.push(r);resolve();};try{vm.runInNewContext(script,host,{timeout:5000});}catch(e){reject(e);}});
 assert.equal(results.length,1);assert(!logs.join('\n').includes('PRIVATE-'));return {result:results[0],logs,writes};
}
test('missing-key suppression is opt-in and consumes its budget before returning empty bytes',async()=>{
 const off=await native({enabled:false});assert.deepEqual(Object.keys(off.result),[]);assert.equal(off.writes.length,0);
 const store={},on=await native({store});assert.equal(on.result.bodyBytes.byteLength,0);
 assert.equal(JSON.parse(store[api.BOOTSTRAP_STORE]).youtube,true);assert(on.logs.some(s=>s.includes('action=bootstrap-empty')));
 const twice=await native({store});assert.deepEqual(Object.keys(twice.result),[]);assert(twice.logs.some(s=>s.includes('reason=used')));
});
test('unknown statuses, MIME types, framing and metadata variants keep original bytes',async()=>{
 for(const opts of [{status:403},{mime:'text/html'},{body:Buffer.from([255])},
  {body:Buffer.concat([frame(10,Buffer.from([8,0])),frame(11,envelope)])},
  {body:Buffer.concat([frame(10,Buffer.from([8,25])),frame(11,Buffer.from([10,0]))])}]){
  const r=await native(opts);assert.deepEqual(Object.keys(r.result),[]);assert.equal(r.writes.length,0);
 }
});
test('storage errors and unsupported budget versions cannot trigger suppression',async()=>{
 for(const write of ['false','throw']){const r=await native({write});assert.deepEqual(Object.keys(r.result),[]);}
 for(const value of ['broken','{"version":2}','{"version":1,"youtube":false}']){
  const r=await native({store:{[api.BOOTSTRAP_STORE]:value}});assert.deepEqual(Object.keys(r.result),[]);
 }
});
test('budgets are independent between YouTube and Music and preserve configuration',()=>{
 const config='PRIVATE-CONFIG',store={YouTubeConfig:config,[api.BOOTSTRAP_STORE]:JSON.stringify({version:1,youtubeMusic:true})};
 const {host}=context(store);assert.equal(api.claimBootstrap(host,'youtube',response,input),'claimed');
 assert.equal(api.claimBootstrap(host,'youtubeMusic',response,input),'used');assert.equal(store.YouTubeConfig,config);
 assert.equal(api.releaseBootstrap(host,'youtube'),'released');assert.equal(JSON.parse(store[api.BOOTSTRAP_STORE]).youtubeMusic,true);
});
test('authenticated metadata releases the budget without requiring an ad-removal modification',async()=>{
 const store={YouTubeConfig:JSON.stringify({youtube:{clientKey:key.toString('base64')}}),[api.BOOTSTRAP_STORE]:JSON.stringify({version:1,youtube:true})};
 const r=await native({store});assert.deepEqual(Object.keys(r.result),[]);
 assert.equal(JSON.parse(store[api.BOOTSTRAP_STORE]).youtube,undefined);assert(r.logs.some(s=>s.includes('budget=released')));
 delete store.YouTubeConfig;assert.equal((await native({store})).result.bodyBytes.byteLength,0);
});
test('authentication failure does not suppress data or reset the missing-key budget',async()=>{
 const store={YouTubeConfig:JSON.stringify({youtube:{clientKey:Buffer.alloc(32,20).toString('base64')}}),[api.BOOTSTRAP_STORE]:JSON.stringify({version:1,youtube:true})};
 const r=await native({store});assert.deepEqual(Object.keys(r.result),[]);assert.equal(r.writes.length,0);
 assert(r.logs.some(s=>s.includes('authentication-failed')));
});

test('authenticated HTTP-error metadata does not rearm the suppression budget',async()=>{
 const enc=await runtime.encrypt(new Uint8Array([8,1,16,147,3]));
 const error=Buffer.concat([frame(10,Buffer.from([8,25])),frame(11,Buffer.concat([f(1,enc.cipher),f(2,enc.hmac),f(3,enc.iv)]))]);
 const store={YouTubeConfig:JSON.stringify({youtube:{clientKey:key.toString('base64')}}),[api.BOOTSTRAP_STORE]:JSON.stringify({version:1,youtube:true})};
 const r=await native({store,body:error});assert.deepEqual(Object.keys(r.result),[]);assert.equal(r.writes.length,0);
 assert.equal(JSON.parse(store[api.BOOTSTRAP_STORE]).youtube,true);
});
