"""Check the paired scripts with explicit tools and /private/tmp intermediates."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
for name in ['node', 'typescript', 'esbuild']:
    p.add_argument('--' + name, required=True)
p.add_argument('--work-dir', type=Path, required=True)
p.add_argument('--captures', type=Path, required=True, help='Output root of tools/youtube-next/prepare.py')
a = p.parse_args()
work = a.work_dir.resolve()
work.relative_to(Path('/private/tmp').resolve())
work.mkdir(parents=True, exist_ok=True)

def run(cmd):
    r = subprocess.run(cmd, cwd=root, capture_output=True, text=True)
    if r.returncode:
        print(r.stdout, end='')
        print(r.stderr, end='', file=sys.stderr)
        raise SystemExit(r.returncode)
    return r.stdout.strip()

run([sys.executable, 'tools/youtube-request/check.py', '--node', a.node,
     '--typescript', a.typescript, '--esbuild', a.esbuild, '--work-dir', str(work / 'request')])
run([a.node, a.typescript, '-p', 'tools/youtube-response/tsconfig.json'])
run([sys.executable, 'tools/youtube-response/build.py', '--esbuild', a.esbuild])
run([sys.executable, 'tools/youtube-response/build.py', '--esbuild', a.esbuild,
     '--out', str(work / 'response.reproduced.js')])
script = root / 'Script/Youtube/youtube.response.js'
assert script.read_bytes() == (work / 'response.reproduced.js').read_bytes()
entry = work / 'test-entry.cjs'
run([a.esbuild, 'tools/youtube-response/test-entry.ts', '--bundle', '--platform=node',
     '--format=cjs', '--outfile=' + str(entry)])
run([a.node, 'tools/youtube-response/test.mjs', str(entry), str(script), str(a.captures.resolve())])
tap = run([a.node, 'tools/youtube-response/regressions.mjs', str(entry), str(script),
           str(root / 'Script/Youtube/youtube.request.js'), str(a.captures.resolve())])
(work / 'regressions.tap').write_text(tap + '\n')
groups = int(re.search(r'^# tests (\d+)$', tap, re.MULTILINE).group(1))
passed = int(re.search(r'^# pass (\d+)$', tap, re.MULTILINE).group(1))
assert groups == passed
file = root / 'tools/youtube-response/validation.json'
report = json.loads(file.read_text())
report.update(typecheck='passed', reproducibleBuild=True, auditRegressionGroups=groups,
              auditRegressionPassed=passed, scriptSha256=hashlib.sha256(script.read_bytes()).hexdigest())
file.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
