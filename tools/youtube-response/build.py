"""Build generated, typed response source with a locked temporary dependency."""
import argparse
from pathlib import Path
import subprocess
import sys
sys.dont_write_bytecode = True
from dependency import verify

root = Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
p.add_argument('--esbuild', required=True)
p.add_argument('--dependency-dir', required=True, type=Path)
p.add_argument('--out', type=Path, default=root / 'Script/Youtube/youtube.response.js')
a = p.parse_args()
package = verify(a.dependency_dir)
subprocess.run([sys.executable, 'tools/youtube-response/generate.py', '--check'], cwd=root, check=True)
banner = '// YouTube Enhance response. Source: src/response/. Device validation pending.\n'
banner += '// Bundles @protobuf-ts/runtime 2.11.1; source and integrity: tools/youtube-response/dependencies.json\n'
banner += '/*\n' + (package / 'LICENSE').read_text() + '\n*/\n'
# The package's Apache LICENSE does not include the full BSD notices in these
# source files. Reproduce those notices alongside the bundled implementation.
for name in ['goog-varint.js', 'protobufjs-utf8.js']:
    lines = (package / 'build/es2015' / name).read_text().splitlines()
    notice = []
    for line in lines:
        if not line.startswith('//'):
            break
        notice.append(line)
    banner += '\n'.join(notice) + '\n'
subprocess.run([a.esbuild, str(root / 'Script/Youtube/src/response/entry.ts'), '--bundle',
    '--format=iife', '--target=es2020', '--charset=utf8', '--minify-whitespace', '--legal-comments=none',
    '--alias:@protobuf-ts/runtime=' + str(package / 'build/es2015/index.js'),
    '--banner:js=' + banner, '--outfile=' + str(a.out)], cwd=root, check=True)
