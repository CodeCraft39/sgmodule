"""Check public runtime diagnostics without changing the production scripts."""
import argparse,hashlib,json,re,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[3]
p=argparse.ArgumentParser()
for k in ['node','typescript','esbuild']:p.add_argument('--'+k,required=True)
p.add_argument('--work-dir',type=Path,required=True);a=p.parse_args()
work=a.work_dir.resolve();work.relative_to(Path('/private/tmp').resolve());work.mkdir(parents=True,exist_ok=True)
def run(command):
 r=subprocess.run(command,cwd=root,text=True,capture_output=True)
 if r.returncode:print(r.stdout);print(r.stderr,file=sys.stderr);raise SystemExit(r.returncode)
 return r.stdout
before={k:hashlib.sha256((root/f'Script/Youtube/youtube.{k}.js').read_bytes()).hexdigest() for k in ['request','response']}
run([a.node,a.typescript,'-p','tools/youtube-device/runtime-probe/tsconfig.json'])
args=[sys.executable,'tools/youtube-device/runtime-probe/build.py','--esbuild',a.esbuild]
run(args);run(args+['--out',str(work/'reproduced.js')])
script=root/'tools/youtube-device/runtime-probe.js';assert script.read_bytes()==(work/'reproduced.js').read_bytes()
assert b'/private/tmp/' not in script.read_bytes()
tap=run([a.node,'tools/youtube-device/runtime-probe/test.mjs',str(script)]);(work/'tests.tap').write_text(tap)
groups=int(re.search(r'^# tests (\d+)$',tap,re.M)[1]);assert groups==int(re.search(r'^# pass (\d+)$',tap,re.M)[1])
for k,digest in before.items():assert hashlib.sha256((root/f'Script/Youtube/youtube.{k}.js').read_bytes()).hexdigest()==digest
report={'build':'runtime-probe-20261102.2','typecheck':'passed','testGroups':groups,'passed':groups,'reproducibleBuild':True,'productionFiles':'unchanged','productionBundleHashes':before,'deviceValidation':'pending Auto/WebView/JSC public-vector test','scriptSha256':hashlib.sha256(script.read_bytes()).hexdigest()}
(root/'tools/youtube-device/runtime-probe/validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
