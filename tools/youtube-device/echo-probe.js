// Temporary QX request-stage API probe. Only explicit local diagnostic URLs.
// No YouTube traffic, credentials, preferences or key resets.
(() => {
  const match = $request.url.match(/^https:\/\/example\.com\/yt-local-capture\/echo-probe(?:\/(empty|bytes|fetch))?(?:\?.*)?$/);
  if (!match) { $done({}); return; }
  const mode = match[1];
  const expected = [0,1,127,128,255,81,88,45,69,67,72,79,58,82,69,81];
  const headers = {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'};
  const finish = (value,status='200 OK') => $done({status:'HTTP/1.1 '+status,headers,...value});
  if (!mode) {
    if (($request.method??'GET').toUpperCase()!=='GET') { finish({body:'QX-ECHO:METHOD-FAILED'},'405 Method Not Allowed'); return; }
    headers['Content-Type']='text/html; charset=utf-8';
    finish({body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>QX echo probe</title></head><body>
<h2>QX echo probe</h2><p>This tests public data only. Leave QX on; YouTube can stay closed.</p>
<button id="run">Run three checks</button><pre id="out" style="white-space:pre-wrap">No tests run.</pre>
<script>
document.getElementById('run').onclick=async function(){
 this.disabled=true;var out=document.getElementById('out');out.textContent='';
 for(var name of ['empty','bytes','fetch']){
  try{
   var response=await fetch('/yt-local-capture/echo-probe/'+name+'?run='+Date.now(),{method:'POST',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/octet-stream'},body:new Uint8Array(${JSON.stringify(expected)})});
   var data=await response.arrayBuffer(),text=new TextDecoder().decode(data);
   out.textContent+=name+' | HTTP '+response.status+' | bytes '+data.byteLength+' | '+(text||'[blank]')+' | input '+response.headers.get('X-Probe-Input-Kind')+' | match '+response.headers.get('X-Probe-Input-Match')+'\\n';
  }catch(error){out.textContent+=name+' | REQUEST FAILED\\n';}
 }
 this.disabled=false;
};
</script></body></html>`}); return;
  }
  if (($request.method??'GET').toUpperCase()!=='POST') { finish({body:'QX-ECHO:METHOD-FAILED'},'405 Method Not Allowed'); return; }
  const original=$request.bodyBytes;
  const binary=original instanceof ArrayBuffer ? new Uint8Array(original) :
    ArrayBuffer.isView(original) ? new Uint8Array(original.buffer,original.byteOffset,original.byteLength) : undefined;
  const matches=binary ? binary.length===expected.length&&binary.every((n,i)=>n===expected[i]) : undefined;
  const kind=original instanceof ArrayBuffer?'ArrayBuffer':binary?'ArrayBufferView':typeof $request.body==='string'?'string':'unavailable';
  headers['X-Probe-Input-Kind']=kind;
  headers['X-Probe-Input-Match']=matches===undefined?'unavailable':String(matches);
  console.log(`[YT-ECHO-PROBE] case=${mode} inputKind=${kind} inputBytes=${binary?.length??'unavailable'} inputMatches=${headers['X-Probe-Input-Match']}`);
  if (mode==='empty') { finish({body:''}); return; }
  if (mode==='bytes') {
    const bytes=new Uint8Array([...'QX-ECHO:BYTES'].map(ch=>ch.charCodeAt(0)));
    finish({bodyBytes:bytes.buffer}); return;
  }
  const url='https://raw.githubusercontent.com/CodeCraft39/sgmodule/master/tools/youtube-device/echo-probe/upstream.txt';
  const failed=reason=>{
    console.log(`[YT-ECHO-PROBE] case=fetch action=failed reason=${reason}`);
    finish({body:'QX-ECHO:FETCH-FAILED'},'502 Bad Gateway');
  };
  // upstream.txt matches neither the echo probe nor the completed bytes probe.
  try {
    $task.fetch({url,method:'GET'}).then(response=>{
      if(response.statusCode!==200){failed('source-status');return;}
      if(!(response.bodyBytes instanceof ArrayBuffer)){failed('bytes-unavailable');return;}
      console.log(`[YT-ECHO-PROBE] case=fetch upstreamBytes=${response.bodyBytes.byteLength} output=bodyBytes`);
      finish({bodyBytes:response.bodyBytes});
    },()=>failed('request-error'));
  } catch { failed('request-error'); }
})();
