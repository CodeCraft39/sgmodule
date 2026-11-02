"""Typecheck, rebuild, test and record a concise validation artifact.

All external tools are supplied as explicit paths. Test intermediates are
required to live under /private/tmp. This script does not install anything.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
sys.dont_write_bytecode = True

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'tools/youtube-response'))
from dependency import verify, esbuild_aliases, type_paths, pins
parser = argparse.ArgumentParser()
parser.add_argument('--node', required=True)
parser.add_argument('--typescript', required=True, help='Path to lib/tsc.js')
parser.add_argument('--esbuild', required=True)
parser.add_argument('--work-dir', type=Path, required=True)
parser.add_argument('--dependency-dir', type=Path, required=True)
args = parser.parse_args()
work = args.work_dir.resolve()
work.relative_to(Path('/private/tmp').resolve())
work.mkdir(parents=True, exist_ok=True)
package = verify(args.dependency_dir)

def run(command):
    result = subprocess.run(command, cwd=root, text=True, capture_output=True)
    if result.returncode:
        print(result.stdout, end='')
        print(result.stderr, end='', file=sys.stderr)
        raise SystemExit(result.returncode)
    return result.stdout.strip()

versions = {
    'node': run([args.node, '--version']),
    'typescript': run([args.node, args.typescript, '--version']),
    'esbuild': run([args.esbuild, '--version']),
}
tsconfig = work / 'tsconfig.request.json'
tsconfig.write_text(json.dumps({'extends': str(root / 'tools/youtube-request/tsconfig.json'),
    'compilerOptions': {'paths': type_paths(args.dependency_dir)}}))
run([args.node, args.typescript, '-p', str(tsconfig)])
run([sys.executable, 'tools/youtube-request/build.py', '--esbuild', args.esbuild, '--dependency-dir', str(args.dependency_dir)])
run([sys.executable, 'tools/youtube-request/build.py', '--esbuild', args.esbuild,
     '--out', str(work / 'request.reproduced.js'), '--dependency-dir', str(args.dependency_dir)])
output = root / 'Script/Youtube/youtube.request.js'
assert output.read_bytes() == (work / 'request.reproduced.js').read_bytes(), 'Non-reproducible output'
run([args.esbuild, 'tools/youtube-request/test-entry.ts', '--bundle', '--platform=node',
     '--format=cjs', *esbuild_aliases(args.dependency_dir), '--outfile=' + str(work / 'test-entry.cjs')])
tap = run([args.node, 'tools/youtube-request/test.mjs', str(work / 'test-entry.cjs'), str(output)])
(work / 'test.tap').write_text(tap + '\n')
tests = int(re.search(r'^# tests (\d+)$', tap, re.MULTILINE).group(1))
passed = int(re.search(r'^# pass (\d+)$', tap, re.MULTILINE).group(1))
assert tests == passed
report = {
    'typecheck': 'passed', 'testGroups': tests, 'passed': passed,
    'decoderDifferentialVariants': 100, 'reproducibleBuild': True,
    'fixtures': 'synthetic plus pinned original bundle; QX echo tests run by paired checker',
    'runtimeDependency': '@protobuf-ts/runtime@2.11.1',
    'bundledDependencies': {name:pin['version'] for name,pin in pins().items()},
    'deviceValidation': 'build .7 portable runtime and detached timers pending native testing; historical .6 QX verified; Surge untested',
    'tools': versions,
    'scriptSha256': hashlib.sha256(output.read_bytes()).hexdigest(),
}
(root / 'tools/youtube-request/validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
