"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const ROOT = process.cwd();
const DATA_DIR = node_path_1.default.join(ROOT, 'data', 'task-board');
const TASKS_FILE = node_path_1.default.join(DATA_DIR, 'tasks.json');
const UPLOAD_DIR = node_path_1.default.join(DATA_DIR, 'uploads');
const DASHBOARD_DIR = node_path_1.default.join(ROOT, 'dashboard');
const DIST_DIR = node_path_1.default.join(ROOT, 'dist');
const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
function ensureFiles() {
    node_fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    node_fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
    if (!node_fs_1.default.existsSync(TASKS_FILE)) {
        node_fs_1.default.writeFileSync(TASKS_FILE, JSON.stringify({ tasks: [] }, null, 2), 'utf-8');
    }
}
function loadTasks() {
    ensureFiles();
    try {
        const raw = node_fs_1.default.readFileSync(TASKS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks))
            return parsed;
    }
    catch { }
    return { tasks: [] };
}
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
app.use(express_1.default.json({ limit: '2mb' }));
app.use('/data', express_1.default.static(node_path_1.default.join(ROOT, 'data')));
app.use('/dashboard', express_1.default.static(DASHBOARD_DIR));
app.get('/dashboard/app.js', (_req, res) => {
    res.sendFile(node_path_1.default.join(DIST_DIR, 'dashboard.js'));
});
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
        node_fs_1.default.writeFileSync(TASKS_FILE, JSON.stringify({ tasks: body.tasks }, null, 2), 'utf-8');
        return res.json({ ok: true, count: body.tasks.length });
    }
    catch (e) {
        return res.status(500).json({ ok: false, error: e?.message || 'write error' });
    }
});
app.post('/api/upload-image', upload.single('file'), (req, res) => {
    try {
        ensureFiles();
        const file = req.file;
        if (!file)
            return res.status(400).json({ ok: false, error: 'No file uploaded' });
        const ext = node_path_1.default.extname(file.originalname || '').toLowerCase();
        if (!ALLOWED.has(ext)) {
            return res.status(400).json({ ok: false, error: 'Unsupported file type' });
        }
        const safe = (file.originalname || 'upload').replace(/[^A-Za-z0-9._-]+/g, '-');
        const out = `${node_crypto_1.default.randomBytes(5).toString('hex')}-${safe}`;
        const outPath = node_path_1.default.join(UPLOAD_DIR, out);
        node_fs_1.default.writeFileSync(outPath, file.buffer);
        return res.json({ ok: true, url: `../data/task-board/uploads/${out}` });
    }
    catch (e) {
        return res.status(500).json({ ok: false, error: e?.message || 'upload error' });
    }
});
const port = Number(process.env.PORT || 18790);
ensureFiles();
app.listen(port, '0.0.0.0', () => {
    console.log(`SGAi dashboard server listening on :${port}`);
});
