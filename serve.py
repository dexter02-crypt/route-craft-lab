#!/usr/bin/env python3
"""Small read-only development server. Only explicit ASSETS.json entries are served."""
from __future__ import annotations
import argparse
import json
import mimetypes
from pathlib import Path, PurePosixPath
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit
import webbrowser

ROOT = Path(__file__).resolve().parent
CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'none'; media-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

def safe_asset(root: Path, name: str) -> Path:
    rel = PurePosixPath(name)
    if not name or rel.is_absolute() or any(p in ('', '.', '..') for p in rel.parts) or '\\' in name:
        raise ValueError('Invalid asset path.')
    path = root
    for part in rel.parts:
        path = path / part
        if path.is_symlink():
            raise ValueError('Symbolic links are not served.')
    if not path.is_file() or path.stat().st_size > 10_000_000:
        raise ValueError('Missing or oversized asset.')
    return path

def make_server(root: Path = ROOT, port: int = 0) -> ThreadingHTTPServer:
    root = root.resolve()
    names = json.loads((root/'ASSETS.json').read_text(encoding='utf-8'))
    if not isinstance(names, list) or len(names) > 500 or any(not isinstance(x,str) for x in names):
        raise ValueError('Invalid static asset list.')
    assets = {name: safe_asset(root,name) for name in names}
    if 'index.html' not in assets:
        raise ValueError('Index is not allowlisted.')
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass
        def respond(self, head: bool = False):
            allowed_hosts = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
            if self.headers.get('Host','') not in allowed_hosts:
                self.send_error(403, 'Unexpected Host header'); return
            try:
                raw = unquote(urlsplit(self.path).path, errors='strict')
            except (ValueError, UnicodeDecodeError):
                self.send_error(400); return
            if raw == '/': raw='/index.html'
            elif raw.endswith('/'): raw+='index.html'
            name=raw.removeprefix('/')
            if name not in assets:
                self.send_error(404); return
            try:
                path=safe_asset(root,name)
                data=path.read_bytes()
            except (OSError, ValueError):
                self.send_error(404); return
            self.send_response(200)
            mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'}.get(path.suffix, mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Content-Security-Policy',CSP)
            self.send_header('Referrer-Policy','no-referrer')
            self.send_header('Permissions-Policy','camera=(), microphone=(), geolocation=()')
            self.end_headers()
            if not head:
                try: self.wfile.write(data)
                except (BrokenPipeError, ConnectionResetError): pass
        def do_GET(self): self.respond()
        def do_HEAD(self): self.respond(True)
    return ThreadingHTTPServer(('127.0.0.1',port),Handler)

def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=0,help='0 chooses a free local port.')
    parser.add_argument('--no-open',action='store_true',help='Print the address without opening a browser.')
    args=parser.parse_args()
    if not 0<=args.port<=65535: parser.error('Port must be between 0 and 65535.')
    try:
        with make_server(ROOT,args.port) as server:
            url=f'http://127.0.0.1:{server.server_port}/'
            print(f'Local workspace: {url}\nNo uploads or directory listing. Ctrl+C stops the server.',flush=True)
            if not args.no_open: webbrowser.open(url)
            try: server.serve_forever(poll_interval=.2)
            except KeyboardInterrupt: pass
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f'Stopped: {exc}'); return 2
    return 0
if __name__=='__main__': raise SystemExit(main())
