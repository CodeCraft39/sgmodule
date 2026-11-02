"""Prepare integrity-checked build dependencies exclusively in /private/tmp."""
import argparse,hashlib,json,tarfile,urllib.request
from pathlib import Path
LOCK=Path(__file__).with_name('dependencies.json')
def pins(): return json.loads(LOCK.read_text())
def location(directory,name):
    pin=pins()[name]
    return Path(directory)/(pin.get('directory','runtime'))/'package'
def verify(directory):
    directory=Path(directory).resolve();directory.relative_to(Path('/private/tmp').resolve())
    for name,pin in pins().items():
        archive=directory/pin.get('archive','runtime.tgz');package=location(directory,name)
        if hashlib.sha256(archive.read_bytes()).hexdigest()!=pin['sha256']:raise ValueError('Dependency archive mismatch: '+name)
        with tarfile.open(archive) as tar:
            for member in tar.getmembers():
                target=(package.parent/member.name).resolve();target.relative_to(package)
                if not member.isfile() and not member.isdir():raise ValueError('Unexpected archive link or special file')
                if member.isfile() and target.read_bytes()!=tar.extractfile(member).read():raise ValueError('Modified dependency: '+name+'/'+member.name)
    return location(directory,'@protobuf-ts/runtime')
def esbuild_aliases(directory):
    return ['--alias:'+name+'='+str(path) for name,path in {
        '@protobuf-ts/runtime':location(directory,'@protobuf-ts/runtime')/'build/es2015/index.js',
        '@noble/ciphers/aes.js':location(directory,'@noble/ciphers')/'aes.js',
        '@noble/ciphers/utils.js':location(directory,'@noble/ciphers')/'utils.js',
        '@noble/hashes/hmac.js':location(directory,'@noble/hashes')/'hmac.js',
        '@noble/hashes/sha2.js':location(directory,'@noble/hashes')/'sha2.js',
        'pako':location(directory,'pako')/'dist/pako.mjs',
    }.items()]
def type_paths(directory):
    return {name:[str(path)] for name,path in {
        '@protobuf-ts/runtime':location(directory,'@protobuf-ts/runtime')/'build/types/index.d.ts',
        '@noble/ciphers/aes.js':location(directory,'@noble/ciphers')/'aes.d.ts',
        '@noble/ciphers/utils.js':location(directory,'@noble/ciphers')/'utils.d.ts',
        '@noble/hashes/hmac.js':location(directory,'@noble/hashes')/'hmac.d.ts',
        '@noble/hashes/sha2.js':location(directory,'@noble/hashes')/'sha2.d.ts',
        'pako':location(directory,'pako')/'dist/pako.d.ts',
    }.items()}
def bundle_banner(package,description):
    directory=package.parent.parent
    banner=description.rstrip()+'\n// Bundled versions, sources and integrity: tools/youtube-response/dependencies.json\n'
    for name,pin in pins().items():
        banner+='/* '+name+' '+pin['version']+'\n'+(location(directory,name)/'LICENSE').read_text()+'\n*/\n'
    source_map=json.loads((location(directory,'pako')/'dist/pako.mjs.map').read_text())
    notices=set()
    for source_name,source in zip(source_map['sources'],source_map['sourcesContent']):
        if '/zlib/' not in source_name:continue
        lines=[]
        for line in source.splitlines():
            if not line.startswith('//'):break
            lines.append(line)
        if lines:notices.add('\n'.join(lines))
    banner+='\n'.join(sorted(notices))+'\n'
    for name in ['goog-varint.js','protobufjs-utf8.js']:
        notice=[]
        for line in (package/'build/es2015'/name).read_text().splitlines():
            if not line.startswith('//'):break
            notice.append(line)
        banner+='\n'.join(notice)+'\n'
    return banner

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--directory',required=True,type=Path);a=p.parse_args()
    directory=a.directory.resolve();directory.relative_to(Path('/private/tmp').resolve());directory.mkdir(parents=True,exist_ok=True)
    for name,pin in pins().items():
        archive=directory/pin.get('archive','runtime.tgz')
        if not archive.exists():
            with urllib.request.urlopen(pin['url']) as response:data=response.read()
            if hashlib.sha256(data).hexdigest()!=pin['sha256']:raise ValueError('Downloaded dependency mismatch: '+name)
            archive.write_bytes(data)
        if hashlib.sha256(archive.read_bytes()).hexdigest()!=pin['sha256']:raise ValueError('Dependency mismatch: '+name)
        package=location(directory,name)
        with tarfile.open(archive) as tar:
            for member in tar.getmembers():
                if not member.isfile() and not member.isdir():raise ValueError('Unexpected archive link or special file')
                (package.parent/member.name).resolve().relative_to(package)
            tar.extractall(package.parent)
    print(verify(directory))
if __name__=='__main__':main()
