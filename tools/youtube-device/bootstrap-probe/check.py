"""Verify the temporary wrapper against the exact already-validated production pair."""
import argparse,hashlib,json,re,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[3]
p=argparse.ArgumentParser()
for k in ['node','typescript','esbuild']:p.add_argument('--'+k,required=True)
p.add_argument('--work-dir',type=Path,required=True)
a=p.parse_args();work=a.work_dir.resolve();work.relative_to(Path('/private/tmp').resolve());work.mkdir(parents=True,exist_ok=True)
def run(cmd):
 r=subprocess.run(cmd,cwd=root,text=True,capture_output=True)
 if r.returncode:print(r.stdout);print(r.stderr,file=sys.stderr);raise SystemExit(r.returncode)
 return r.stdout
before={k:hashlib.sha256((root/f'Script/Youtube/youtube.{k}.js').read_bytes()).hexdigest() for k in ['request','response']}
for k,digest in before.items():
 manifest=json.loads((root/f'tools/youtube-{k}/validation.json').read_text());assert manifest['scriptSha256']==digest
run([a.node,a.typescript,'-p','tools/youtube-device/bootstrap-probe/tsconfig.json'])
args=[sys.executable,'tools/youtube-device/bootstrap-probe/build.py','--esbuild',a.esbuild,'--work-dir',str(work/'build')]
run(args);run(args+['--out',str(work/'reproduced.js')])
script=root/'tools/youtube-device/bootstrap-probe.js';data=script.read_bytes()
assert data==(work/'reproduced.js').read_bytes();assert b'/private/tmp/' not in data
production=(root/'Script/Youtube/youtube.request.js').read_bytes()
assert data.endswith(b'\nYTBootstrapProbe.runBootstrapProbe(globalThis, function(globalThis) {\n'+production+b'\n});\n')
tap=run([a.node,'tools/youtube-device/bootstrap-probe/test.mjs',str(script)])
(work/'tests.tap').write_text(tap)
groups=int(re.search(r'^# tests (\d+)$',tap,re.M)[1]);assert groups==int(re.search(r'^# pass (\d+)$',tap,re.M)[1])
for k,digest in before.items():assert hashlib.sha256((root/f'Script/Youtube/youtube.{k}.js').read_bytes()).hexdigest()==digest
report={'build':'bootstrap-probe-20261102.1','typecheck':'passed','testGroups':groups,'passed':groups,'reproducibleBuild':True,'productionBundleEmbeddedByteExact':True,'productionBundleHashes':before,'productionFiles':'unchanged','runtimeNetworkCodeLoading':False,'deviceValidation':'forced missing-key completion and automatic retry pending','scriptSha256':hashlib.sha256(data).hexdigest()}
(root/'tools/youtube-device/bootstrap-probe/validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
