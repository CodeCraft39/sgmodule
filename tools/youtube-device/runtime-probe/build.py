"""Build the shared public-vector runtime probe with a temporary esbuild."""
import argparse,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[3]
p=argparse.ArgumentParser();p.add_argument('--esbuild',required=True);p.add_argument('--out',type=Path,default=root/'tools/youtube-device/runtime-probe.js');a=p.parse_args()
subprocess.run([a.esbuild,'tools/youtube-device/runtime-probe/entry.ts','--bundle','--format=iife','--target=es2020','--banner:js=// Public-vector runtime probe. Source: runtime-probe/. No private key/body capture.','--outfile='+str(a.out)],cwd=root,check=True)
