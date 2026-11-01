"""Build with an explicit temporary esbuild path; no npm install or global state."""
from pathlib import Path
import argparse
import hashlib
import subprocess

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--esbuild', required=True)
parser.add_argument('--out', type=Path, default=root / 'Script/Youtube/youtube.request.js')
args = parser.parse_args()
fixture = root / 'tools/youtube-request/fixtures/upstream.request.js'
assert hashlib.sha256(fixture.read_bytes()).hexdigest() == '3ecca15e06e76a31720092c581180f648ef2c45e494644941ba985c878efbb26'
subprocess.run([args.esbuild, str(root / 'Script/Youtube/src/request/entry.ts'),
    '--bundle', '--format=iife', '--target=es2020', '--charset=utf8',
    '--banner:js=// Reconstructed Maasea request script. Source: src/request/. Device validation pending.',
    '--outfile=' + str(args.out)], check=True, cwd=root)
