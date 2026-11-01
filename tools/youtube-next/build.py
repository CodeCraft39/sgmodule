"""Build a QX script from the untouched, hash-pinned Maasea bundle."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[2]
source = (ROOT / 'tools/youtube-response/fixtures/upstream.response.js').read_bytes()
assert hashlib.sha256(source).hexdigest() == 'f98483d5f5017514f82502253c0db5ce2d4ffb7839887aa2cadc22666f5a7f12', 'Review integration before using a different upstream bundle'
text = source.decode()
anchor = 'var Mi=[{path:"browse"'
assert text.count(anchor) == 1
text = text.replace(anchor, (Path(__file__).with_name('next-wire.js').read_text() + '\n' + anchor))
start = text.index('function ii(l){')
end = text.index('var uc=', start)
assert text[start:end].endswith('}')
text = text[:start] + '''function ii(l){
  let e=Mi.find(r=>l.url.includes(r.path));
  if(!e)return null;
  if(l.bodyBytes==null)return{action:"exit",state:l.state,changed:false};
  const q=e.path==="next" ? qxNext2026(l.bodyBytes) : null;
  if(q)console.log(`[QX-NEXT] removed=${q.removed} field42=${q.has42} legacy=${q.hasLegacy} bytes=${l.bodyBytes.length}->${q.bytes.length}`);
  // Modern field-42 responses need no generated-schema round trip. This also
  // prevents persistent adCache entries from deciding their classification.
  if(q?.has42 && !q.hasLegacy)return{action:q.removed?"body":"exit",bodyBytes:q.removed?q.bytes:undefined,state:l.state,changed:false};
  const t=e.msgType.fromBinary(q?.bytes??l.bodyBytes);
  const {bodyChanged:n,stateChanged:i}=e.handler(t,{params:l.params,state:l.state,platformKey:l.platformKey});
  const changed=n||!!q?.removed;
  return{action:changed?"body":"exit",bodyBytes:n?e.msgType.toBinary(t):q?.removed?q.bytes:undefined,state:l.state,changed:i};
}''' + text[end:]
out = ROOT / 'Script/Youtube/youtube.response.qx.js'
out.write_text('// QX /next product-panel patch; device validation pending. See tools/youtube-next/REPORT.md\n' + text)
print(out)
