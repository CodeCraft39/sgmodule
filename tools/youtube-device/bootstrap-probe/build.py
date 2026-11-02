"""Wrap the exact validated production request bundle; no network/eval at runtime."""
import argparse,hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[3]
p=argparse.ArgumentParser()
p.add_argument('--esbuild',required=True)
p.add_argument('--work-dir',required=True,type=Path)
p.add_argument('--out',type=Path,default=root/'tools/youtube-device/bootstrap-probe.js')
a=p.parse_args();work=a.work_dir.resolve();work.relative_to(Path('/private/tmp').resolve());work.mkdir(parents=True,exist_ok=True)
production=(root/'Script/Youtube/youtube.request.js').read_bytes()
manifest=json.loads((root/'tools/youtube-request/validation.json').read_text())
assert hashlib.sha256(production).hexdigest()==manifest['scriptSha256']
assert manifest['typecheck']=='passed' and manifest['reproducibleBuild']
preamble=work/'probe-preamble.js'
subprocess.run([a.esbuild,'tools/youtube-device/bootstrap-probe/main.ts','--bundle','--format=iife','--global-name=YTBootstrapProbe','--target=es2020','--outfile='+str(preamble)],cwd=root,check=True)
a.out.write_bytes(b'// TEMPORARY one-shot QX diagnostic. Production request SHA-256: '+manifest['scriptSha256'].encode()+b'\n'+preamble.read_bytes()+b'\nYTBootstrapProbe.runBootstrapProbe(globalThis, function(globalThis) {\n'+production+b'\n});\n')
