"""Prepare an integrity-checked build dependency exclusively in /private/tmp."""
import argparse
import hashlib
import json
from pathlib import Path
import tarfile
import urllib.request

LOCK = Path(__file__).with_name('dependencies.json')


def verify(directory):
    directory = Path(directory).resolve()
    directory.relative_to(Path('/private/tmp').resolve())
    pin = json.loads(LOCK.read_text())['@protobuf-ts/runtime']
    archive = directory / 'runtime.tgz'
    if hashlib.sha256(archive.read_bytes()).hexdigest() != pin['sha256']:
        raise ValueError('Protobuf runtime archive does not match the dependency lock')
    package = directory / 'runtime/package'
    # Verify extracted files as well, so supplying a pinned archive alongside a
    # modified implementation cannot silently bypass the lock.
    with tarfile.open(archive) as tar:
        for member in tar.getmembers():
            if not member.isfile():
                continue
            target = (directory / 'runtime' / member.name).resolve()
            target.relative_to(package)
            if target.read_bytes() != tar.extractfile(member).read():
                raise ValueError('Modified runtime dependency: ' + member.name)
    return package


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--directory', required=True, type=Path)
    args = p.parse_args()
    directory = args.directory.resolve()
    directory.relative_to(Path('/private/tmp').resolve())
    directory.mkdir(parents=True, exist_ok=True)
    pin = json.loads(LOCK.read_text())['@protobuf-ts/runtime']
    archive = directory / 'runtime.tgz'
    if not archive.exists():
        with urllib.request.urlopen(pin['url']) as response:
            data = response.read()
        if hashlib.sha256(data).hexdigest() != pin['sha256']:
            raise ValueError('Downloaded runtime does not match the dependency lock')
        archive.write_bytes(data)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != pin['sha256']:
        raise ValueError('Runtime archive does not match the dependency lock')
    with tarfile.open(archive) as tar:
        for member in tar.getmembers():
            if not member.isdir() and not member.isfile():
                raise ValueError('Unexpected archive link or special file')
            target = (directory / 'runtime' / member.name).resolve()
            target.relative_to(directory / 'runtime/package')
        tar.extractall(directory / 'runtime')
    print(verify(directory))


if __name__ == '__main__':
    main()
