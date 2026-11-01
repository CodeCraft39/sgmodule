"""Check the paired scripts with explicit tools and /private/tmp intermediates."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
sys.dont_write_bytecode = True
from dependency import verify

root = Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
for name in ['node', 'typescript', 'esbuild']:
    p.add_argument('--' + name, required=True)
p.add_argument('--dependency-dir', type=Path, required=True)
p.add_argument('--work-dir', type=Path, required=True)
p.add_argument('--playback-captures', type=Path, help='Optional normalized private playback archive from tools/youtube-local/prepare.py')
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
package = verify(a.dependency_dir)
run([sys.executable, 'tools/youtube-response/generate.py', '--check'])
tsconfig = work / 'tsconfig.response.json'
tsconfig.write_text(json.dumps({'extends': str(root / 'tools/youtube-response/tsconfig.json'),
    'compilerOptions': {'paths': {'@protobuf-ts/runtime': [str(package / 'build/types/index.d.ts')]}},
    'include':[str(root / 'Script/Youtube/src/response/**/*.ts'), str(root / 'tools/youtube-response/type-contracts.ts')]}))
run([a.node, a.typescript, '-p', str(tsconfig)])
run([sys.executable, 'tools/youtube-response/build.py', '--esbuild', a.esbuild, '--dependency-dir', str(a.dependency_dir)])
run([sys.executable, 'tools/youtube-response/build.py', '--esbuild', a.esbuild,
     '--out', str(work / 'response.reproduced.js'), '--dependency-dir', str(a.dependency_dir)])
script = root / 'Script/Youtube/youtube.response.js'
assert script.read_bytes() == (work / 'response.reproduced.js').read_bytes()
assert b'/private/tmp/' not in script.read_bytes(), 'Build embeds a temporary dependency path'
alternate = work / 'alternate-dependency-location'
alternate.mkdir(exist_ok=True)
shutil.copyfile(a.dependency_dir / 'runtime.tgz', alternate / 'runtime.tgz')
run([sys.executable, 'tools/youtube-response/dependency.py', '--directory', str(alternate)])
run([sys.executable, 'tools/youtube-response/build.py', '--esbuild', a.esbuild,
     '--dependency-dir', str(alternate), '--out', str(work / 'response.alternate.js')])
assert script.read_bytes() == (work / 'response.alternate.js').read_bytes(), 'Dependency path changes bundle'
entry = work / 'test-entry.cjs'
run([a.esbuild, 'tools/youtube-response/test-entry.ts', '--bundle', '--platform=node',
     '--format=cjs', '--alias:@protobuf-ts/runtime=' + str(package / 'build/es2015/index.js'), '--outfile=' + str(entry)])
run([a.node, 'tools/youtube-response/test.mjs', str(entry), str(script), str(a.captures.resolve())])
tap = run([a.node, 'tools/youtube-response/regressions.mjs', str(entry), str(script),
           str(root / 'Script/Youtube/youtube.request.js'), str(a.captures.resolve())])
(work / 'regressions.tap').write_text(tap + '\n')
groups = int(re.search(r'^# tests (\d+)$', tap, re.MULTILINE).group(1))
passed = int(re.search(r'^# pass (\d+)$', tap, re.MULTILINE).group(1))
assert groups == passed
architecture = run([a.node, 'tools/youtube-response/architecture.mjs', str(entry), str(script), str(a.captures.resolve())])
(work / 'architecture.tap').write_text(architecture + '\n')
architecture_groups = int(re.search(r'^# tests (\d+)$', architecture, re.MULTILINE).group(1))
architecture_passed = int(re.search(r'^# pass (\d+)$', architecture, re.MULTILINE).group(1))
assert architecture_groups == architecture_passed
file = root / 'tools/youtube-response/validation.json'
report = json.loads(file.read_text())
unit = run([a.node, 'tools/youtube-local/unit.mjs', str(entry)])
(work / 'playback-unit.tap').write_text(unit + '\n')
unit_groups = int(re.search(r'^# tests (\d+)$', unit, re.MULTILINE).group(1))
assert unit_groups == int(re.search(r'^# pass (\d+)$', unit, re.MULTILINE).group(1))
report.update(playbackUnitGroups=unit_groups, playbackUnitPassed=unit_groups)
lifecycle = run([a.node, 'tools/youtube-local/key-lifecycle.mjs', str(entry), str(script),
                 str(root / 'Script/Youtube/youtube.request.js')])
(work / 'key-lifecycle.tap').write_text(lifecycle + '\n')
lifecycle_groups = int(re.search(r'^# tests (\d+)$', lifecycle, re.MULTILINE).group(1))
assert lifecycle_groups == int(re.search(r'^# pass (\d+)$', lifecycle, re.MULTILINE).group(1))
report.update(keyLifecycleGroups=lifecycle_groups, keyLifecyclePassed=lifecycle_groups)
if a.playback_captures:
    replay = run([a.node, 'tools/youtube-local/test.mjs', str(entry), str(script),
                  str(root / 'Script/Youtube/youtube.request.js'), str(a.playback_captures.resolve())])
    (work / 'playback-replay.tap').write_text(replay + '\n')
    replay_groups = int(re.search(r'^# tests (\d+)$', replay, re.MULTILINE).group(1))
    assert replay_groups == int(re.search(r'^# pass (\d+)$', replay, re.MULTILINE).group(1))
    report.update(playbackReplayGroups=replay_groups, playbackReplayPassed=replay_groups)

report.update(schemaGeneration='verified', runtimeDependency='@protobuf-ts/runtime@2.11.1', architectureTestGroups=architecture_groups, architecturePassed=architecture_passed, typecheck='passed', reproducibleBuild=True, reproducibleAcrossDependencyPaths=True, auditRegressionGroups=groups,
              auditRegressionPassed=passed, scriptSha256=hashlib.sha256(script.read_bytes()).hexdigest())
file.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
