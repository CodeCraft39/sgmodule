"""Normalize selected private QX bodies exclusively beneath /private/tmp."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit
import zipfile
p = argparse.ArgumentParser()
p.add_argument('archive', type=Path)
p.add_argument('probe', type=Path)
p.add_argument('destination', type=Path)
a = p.parse_args()
dest = a.destination.resolve()
dest.relative_to(Path('/private/tmp').resolve())
dest.mkdir(parents=True, exist_ok=True)

def headers(raw):
    lines = raw.decode('utf8', errors='replace').splitlines()
    values = {k.strip().lower(): v.strip() for k, v in (line.split(':',1) for line in lines[1:] if ':' in line)}
    return lines[0] if lines else '', values

def dechunk(body):
    parts, p = [], 0
    while True:
        end = body.index(b'\r\n', p)
        length = int(body[p:end].split(b';')[0], 16)
        p = end + 2
        if not length:
            # This capture has no trailers. Reject other framing until supported.
            if body[p:] != b'\r\n':
                raise ValueError('Unexpected chunk trailers')
            return b''.join(parts)
        if p + length + 2 > len(body) or body[p+length:p+length+2] != b'\r\n':
            raise ValueError('Truncated chunk body')
        parts.append(body[p:p+length]); p += length + 2

records = []
with zipfile.ZipFile(a.archive) as z:
    for name in sorted(n for n in z.namelist() if n.endswith('/request_headers') and not n.startswith('__MACOSX/')):
        prefix = name[:-len('request_headers')]
        first, req = headers(z.read(name))
        method, target, *_ = first.split(' ')
        url = urlsplit(target)
        host = url.hostname or req.get('host','').split(':')[0]
        if not (host.endswith('.googlevideo.com') and url.path == '/initplayback' and method == 'POST' or
                host == 'youtubei.googleapis.com' and url.path == '/youtubei/v1/next'):
            continue
        ident = prefix.rstrip('/').split('/')[-1]
        item = {'id':ident, 'path':url.path, 'method':method}
        for side in ['request','response']:
            status, h = headers(z.read(prefix+side+'_headers'))
            body = z.read(prefix+side+'_body')
            item[side+'WireBytes'] = len(body)
            if h.get('transfer-encoding','').lower() == 'chunked':
                body = dechunk(body)
            item[side+'Bytes'] = len(body)
            item[side+'Encoding'] = h.get('content-encoding','identity')
            (dest / (ident+'.'+side+'.bin')).write_bytes(body)
        records.append(item)
(dest / 'records.json').write_text(json.dumps(records, indent=2)+'\n')
# Private keys stay in the explicit temporary destination, never the repository.
(dest / 'probe.json').write_bytes(a.probe.read_bytes())
print(json.dumps({'selectedRecords':len(records), 'destination':str(dest)}))
