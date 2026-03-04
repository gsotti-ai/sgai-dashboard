import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO_ROOT = process.cwd();
const WORKSPACE_ROOT = '/root/.openclaw/workspace';
const DATA_DIR = path.join(WORKSPACE_ROOT, 'data', 'task-board');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DASHBOARD_DIR = path.join(REPO_ROOT, 'dashboard');

const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function ensureFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify({ tasks: [] }, null, 2), 'utf-8');
  }
}

function loadTasks() {
  ensureFiles();
  try {
    const raw = fs.readFileSync(TASKS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tasks)) return parsed;
  } catch {}
  return { tasks: [] };
}

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

app.use(express.json({ limit: '2mb' }));
app.use('/data', express.static(path.join(WORKSPACE_ROOT, 'data')));
app.use('/dashboard', express.static(DASHBOARD_DIR));

app.get('/api/tasks', (_req, res) => {
  res.json(loadTasks());
});

app.post('/api/tasks', (req, res) => {
  try {
    const body = req.body;
    if (!body || !Array.isArray(body.tasks)) {
      return res.status(400).json({ ok: false, error: 'Invalid payload' });
    }
    ensureFiles();
    fs.writeFileSync(TASKS_FILE, JSON.stringify({ tasks: body.tasks }, null, 2), 'utf-8');
    return res.json({ ok: true, count: body.tasks.length });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'write error' });
  }
});

app.post('/api/upload-image', upload.single('file'), (req, res) => {
  try {
    ensureFiles();
    const file = req.file;
    if (!file) return res.status(400).json({ ok: false, error: 'No file uploaded' });
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED.has(ext)) {
      return res.status(400).json({ ok: false, error: 'Unsupported file type' });
    }
    const safe = (file.originalname || 'upload').replace(/[^A-Za-z0-9._-]+/g, '-');
    const out = `${crypto.randomBytes(5).toString('hex')}-${safe}`;
    const outPath = path.join(UPLOAD_DIR, out);
    fs.writeFileSync(outPath, file.buffer);
    return res.json({ ok: true, url: `../data/task-board/uploads/${out}` });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'upload error' });
  }
});

const port = Number(process.env.PORT || 18790);
ensureFiles();
app.listen(port, '0.0.0.0', () => {
  console.log(`SGAi dashboard server listening on :${port}`);
});
