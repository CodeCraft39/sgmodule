"""Build with an explicit temporary esbuild path; no npm install or global state."""
from pathlib import Path
import argparse
import hashlib
import subprocess
import sys
sys.dont_write_bytecode = True

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'tools/youtube-response'))
from dependency import verify, bundle_banner, esbuild_aliases
parser = argparse.ArgumentParser()
parser.add_argument('--esbuild', required=True)
parser.add_argument('--dependency-dir', required=True, type=Path)
parser.add_argument('--out', type=Path, default=root / 'Script/Youtube/youtube.request.js')
args = parser.parse_args()
package = verify(args.dependency_dir)
subprocess.run([sys.executable, str(root / 'tools/youtube-response/generate.py'), '--check'], check=True, cwd=root)
fixture = root / 'tools/youtube-request/fixtures/upstream.request.js'
assert hashlib.sha256(fixture.read_bytes()).hexdigest() == '3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26'
subprocess.run([args.esbuild, str(root / 'Script/Youtube/src/request/entry.ts'),
    '--bundle', '--format=iife', '--target=es2020', '--charset=utf8',
    '--minify-whitespace', '--legal-comments=none',
    *esbuild_aliases(args.dependency_dir),
    '--banner:js=' + bundle_banner(package,'// YouTube Enhance request. Source: src/request/. Native integration evidence: tools/youtube-local/.'),
    '--outfile=' + str(args.out)], check=True, cwd=root)
