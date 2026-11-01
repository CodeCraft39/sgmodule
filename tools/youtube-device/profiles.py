"""Generate the two mutually exclusive capture phases for QX and SR/Surge syntax."""
import argparse
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
DIR = Path(__file__).resolve().parent
REMOTE = 'https://raw.githubusercontent.com/CodeCraft39/sgmodule/master/'
CAPTURE = REMOTE + 'tools/youtube-device/capture.js'
EXPORT = r'^https:\/\/example\.com\/yt-local-capture\/(export|reset)(?:\?.*)?$'
API = r'^https:\/\/youtubei\.googleapis\.com\/youtubei\/v1\/(browse|next|player(?:/ad_break)?|search|reel/reel_watch_sequence|guide|account/get_setting|get_watch|log_event|config)(?:\?.*)?$'
INIT = r'^https?:\/\/[\w-]+\.googlevideo\.com\/initplayback\?(?:[^#]*&)?ack(?:=|&|$)'
EVENT = r'^https:\/\/youtubei\.googleapis\.com\/youtubei\/v1\/log_event(?:\?.*)?$'


def outputs():
    base = (ROOT / 'tools/youtube-request/quantumult-x.conf').read_text()
    rewrites = [line for line in base.splitlines() if ' url script-' in line]
    assert len(rewrites) == 3
    output = {}
    for phase in ['worker-baseline', 'direct-google']:
        title = ['# Temporary capture phase: ' + phase,
                 '# Use ONE phase at a time. Replace overlapping YouTube rules; preserve other rules/MITM hosts.',
                 '# Publish the checkpoint pair and tools/youtube-device/capture.js before use.',
                 '# example.com export/reset responses are generated locally; exported JSON contains private session keys.',
                 '[rewrite_local]', EXPORT + ' url script-echo-response ' + CAPTURE]
        qx = rewrites.copy()
        if phase == 'direct-google':
            qx[1] = INIT + ' url script-request-body ' + CAPTURE
            qx.append(INIT + ' url script-response-body ' + CAPTURE)
        title += qx
        hosts = '*.googlevideo.com, youtubei.googleapis.com, example.com'
        if phase == 'worker-baseline':
            hosts += ', init-stream.maasea.workers.dev'
        title += ['', '[mitm]', '# Merge these hosts into existing coverage; do not replace other hosts.', 'hostname = ' + hosts]
        output['quantumult-x.' + phase + '.conf'] = '\n'.join(title) + '\n'
        sr = ['#!name=YouTube capture - ' + phase,
              '# Temporary SR/Surge-compatible test module. Disable overlapping YouTube modules.',
              '# Keep any custom production arguments identical in both phases.',
              '# Export contains private session keys. Do not publish the exported JSON.',
              '[Script]',
              'yt.capture.export = type=http-request,pattern=' + EXPORT + ',script-path=' + CAPTURE,
              'yt.response = type=http-response,pattern=' + API + ',requires-body=1,max-size=-1,binary-body-mode=1,script-path=' + REMOTE + 'Script/Youtube/youtube.response.js,argument={"debug":true}',
              'yt.event = type=http-request,pattern=' + EVENT + ',requires-body=1,max-size=-1,binary-body-mode=1,script-path=' + REMOTE + 'Script/Youtube/youtube.request.js,argument={"debug":true}']
        if phase == 'worker-baseline':
            sr.append('yt.init = type=http-request,pattern=' + INIT + ',requires-body=1,max-size=-1,binary-body-mode=1,script-path=' + REMOTE + 'Script/Youtube/youtube.request.js,argument={"debug":true}')
        else:
            sr += ['yt.capture.request = type=http-request,pattern=' + INIT + ',requires-body=1,max-size=-1,binary-body-mode=1,script-path=' + CAPTURE,
                   '# The response observer deliberately tests native buffering with a 2 MiB ceiling.',
                   'yt.capture.response = type=http-response,pattern=' + INIT + ',requires-body=1,max-size=2097152,binary-body-mode=1,script-path=' + CAPTURE]
        sr += ['', '[MITM]', 'hostname = %APPEND% ' + hosts]
        output['shadowrocket.' + phase + '.sgmodule'] = '\n'.join(sr) + '\n'
    return output


def main():
    p = argparse.ArgumentParser(); p.add_argument('--check', action='store_true'); args = p.parse_args()
    for name, text in outputs().items():
        file = DIR / name
        if args.check:
            if not file.exists() or file.read_text() != text:
                raise SystemExit('Stale profile: ' + name)
        else:
            file.write_text(text)
    print('Four capture profiles ' + ('verified' if args.check else 'written'))


if __name__ == '__main__':
    main()
