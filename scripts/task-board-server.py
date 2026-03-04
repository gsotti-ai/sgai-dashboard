#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import uuid
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path('/root/.openclaw/workspace')
TASKS_FILE = ROOT / 'data' / 'task-board' / 'tasks.json'
UPLOAD_DIR = ROOT / 'data' / 'task-board' / 'uploads'
ALLOWED_EXT = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}


def ensure_tasks_file() -> None:
    TASKS_FILE.parent.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if not TASKS_FILE.exists():
        TASKS_FILE.write_text(json.dumps({'tasks': []}, ensure_ascii=False, indent=2), encoding='utf-8')


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, code: int, payload: dict):
        raw = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _sanitize_filename(self, name: str) -> str:
        base = Path(name or 'upload').name
        base = re.sub(r'[^A-Za-z0-9._-]+', '-', base)
        if not base or base.startswith('.'):
            base = f'upload-{uuid.uuid4().hex[:8]}.bin'
        return base

    def _store_raw_upload(self, data: bytes, filename: str) -> str:
        safe_name = self._sanitize_filename(filename)
        ext = Path(safe_name).suffix.lower()
        if ext not in ALLOWED_EXT:
            raise ValueError('Unsupported file type')
        out_name = f"{uuid.uuid4().hex[:10]}-{safe_name}"
        out_path = UPLOAD_DIR / out_name
        out_path.write_bytes(data)
        return f"../data/task-board/uploads/{out_name}"

    def do_GET(self):
        if self.path.startswith('/api/tasks'):
            ensure_tasks_file()
            try:
                data = json.loads(TASKS_FILE.read_text(encoding='utf-8'))
                if not isinstance(data, dict):
                    data = {'tasks': []}
            except Exception:
                data = {'tasks': []}
            self._send_json(200, data)
            return
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/upload-image'):
            ensure_tasks_file()
            try:
                content_type = self.headers.get('Content-Type', '')
                length = int(self.headers.get('Content-Length', '0'))
                body = self.rfile.read(length)

                # multipart/form-data upload from browser FormData
                if 'multipart/form-data' in content_type and 'boundary=' in content_type:
                    boundary = content_type.split('boundary=', 1)[1].encode('utf-8')
                    parts = body.split(b'--' + boundary)
                    for part in parts:
                        if b'Content-Disposition:' not in part:
                            continue
                        header_blob, _, data_blob = part.partition(b'\r\n\r\n')
                        if not data_blob:
                            continue
                        headers = header_blob.decode('utf-8', errors='ignore')
                        if 'name="file"' not in headers:
                            continue
                        m = re.search(r'filename="([^"]+)"', headers)
                        filename = m.group(1) if m else f'upload-{uuid.uuid4().hex[:8]}.bin'
                        file_data = data_blob.rstrip(b'\r\n-')
                        url = self._store_raw_upload(file_data, filename)
                        self._send_json(200, {'ok': True, 'url': url})
                        return
                    self._send_json(400, {'ok': False, 'error': 'No file part found'})
                    return

                # fallback: raw bytes upload with ?filename=
                parsed = urlparse(self.path)
                qs = parse_qs(parsed.query)
                filename = (qs.get('filename') or ['upload.bin'])[0]
                url = self._store_raw_upload(body, filename)
                self._send_json(200, {'ok': True, 'url': url})
            except Exception as e:
                self._send_json(400, {'ok': False, 'error': str(e)})
            return

        if self.path.startswith('/api/tasks'):
            ensure_tasks_file()
            try:
                length = int(self.headers.get('Content-Length', '0'))
                body = self.rfile.read(length)
                data = json.loads(body.decode('utf-8'))
                if not isinstance(data, dict) or not isinstance(data.get('tasks'), list):
                    self._send_json(400, {'ok': False, 'error': 'Invalid payload'})
                    return
                TASKS_FILE.write_text(json.dumps({'tasks': data['tasks']}, ensure_ascii=False, indent=2), encoding='utf-8')
                self._send_json(200, {'ok': True, 'count': len(data['tasks'])})
            except Exception as e:
                self._send_json(500, {'ok': False, 'error': str(e)})
            return
        self._send_json(404, {'ok': False, 'error': 'Not found'})


if __name__ == '__main__':
    ensure_tasks_file()
    server = ThreadingHTTPServer(('0.0.0.0', 18790), Handler)
    print('Task board server on :18790')
    server.serve_forever()
