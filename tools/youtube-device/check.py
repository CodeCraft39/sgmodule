"""Verify the isolated device helper using explicit tools and temporary outputs."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
root = Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
for key in ['node', 'typescript', 'esbuild']:
    p.add_argument('--' + key, required=True)
p.add_argument('--work-dir', required=True, type=Path)
p.add_argument('--checkpoint', default='7978e7b')
a = p.parse_args()
work = a.work_dir.resolve()
work.relative_to(Path('/private/tmp').resolve())
work.mkdir(parents=True, exist_ok=True)

def run(command):
    result = subprocess.run(command, cwd=root, capture_output=True, text=True)
    if result.returncode:
        print(result.stdout, end=''); print(result.stderr, end='', file=sys.stderr)
        raise SystemExit(result.returncode)
    return result.stdout

run(['git', 'diff', '--exit-code', a.checkpoint, '--', 'Script/Youtube'])
run([a.node, a.typescript, '-p', 'tools/youtube-device/tsconfig.json'])
run([sys.executable, 'tools/youtube-device/profiles.py', '--check'])
run([sys.executable, 'tools/youtube-device/build.py', '--esbuild', a.esbuild])
run([sys.executable, 'tools/youtube-device/build.py', '--esbuild', a.esbuild, '--out', str(work / 'capture.reproduced.js')])
script = root / 'tools/youtube-device/capture.js'
assert script.read_bytes() == (work / 'capture.reproduced.js').read_bytes()
entry = work / 'capture-api.cjs'
run([a.esbuild, 'tools/youtube-device/capture.ts', '--bundle', '--platform=node', '--format=cjs', '--outfile=' + str(entry)])
tap = run([a.node, 'tools/youtube-device/test.mjs', str(entry), str(script)])
(work / 'tests.tap').write_text(tap)
groups = int(re.search(r'^# tests (\d+)$', tap, re.M).group(1))
passed = int(re.search(r'^# pass (\d+)$', tap, re.M).group(1))
assert groups == passed
report = {
    'typecheck': 'passed', 'testGroups': groups, 'passed': passed,
    'reproducibleBuild': True, 'profiles': 'four generated profiles verified',
    'productionCheckpoint': run(['git', 'rev-parse', a.checkpoint]).strip(),
    'productionFiles': 'unchanged from checkpoint; existing production regression manifests still apply',
    'deviceValidation': 'pending; native profile loading/export/buffering must be tested on iPad',
    'scriptSha256': hashlib.sha256(script.read_bytes()).hexdigest(),
}
(root / 'tools/youtube-device/validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
