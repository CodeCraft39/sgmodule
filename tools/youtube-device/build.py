"""Build the temporary capture helper with an explicit esbuild; no dependencies."""
import argparse
from pathlib import Path
import subprocess
root = Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
p.add_argument('--esbuild', required=True)
p.add_argument('--out', type=Path, default=root / 'tools/youtube-device/capture.js')
a = p.parse_args()
subprocess.run([a.esbuild, 'tools/youtube-device/entry.ts', '--bundle', '--format=iife', '--target=es2020',
 '--banner:js=// Temporary local playback capture helper. Source: tools/youtube-device/capture.ts. Remove its device rules after capture.',
 '--outfile=' + str(a.out)], cwd=root, check=True)
