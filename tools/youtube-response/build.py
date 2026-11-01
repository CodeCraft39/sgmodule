"""Build response source using an explicitly supplied temporary esbuild."""
import argparse
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--esbuild',required=True);p.add_argument('--out',type=Path,default=root/'Script/Youtube/youtube.response.js');a=p.parse_args()
subprocess.run([a.esbuild,str(root/'Script/Youtube/src/response/entry.ts'),'--bundle','--format=iife','--target=es2020','--charset=utf8',
 '--banner:js=// Reconstructed response source: src/response/. Device validation pending.', '--outfile='+str(a.out)],cwd=root,check=True)
