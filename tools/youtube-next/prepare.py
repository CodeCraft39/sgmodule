"""Extract only replay inputs from the supplied handoff; omit private headers."""
from pathlib import Path
from io import BytesIO
import sys
import zipfile

archive, destination = Path(sys.argv[1]), Path(sys.argv[2])
ids = ('20261031_204503', '20261031_213054', '20261031_213333')
with zipfile.ZipFile(archive) as outer:
    for capture_id in ids:
        with zipfile.ZipFile(BytesIO(outer.read(f'http_captures/{capture_id}.zip'))) as inner:
            target = destination / 'captures' / capture_id / '0' / 'response_body'
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(inner.read(f'{capture_id}/0/response_body'))
    for name in ('youtube.response.debug.js', 'youtube.response.experimental.js', 'next_2026_partial.proto'):
        target = destination / 'scripts_and_schema' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(outer.read(f'scripts_and_schema/{name}'))
print(destination)
