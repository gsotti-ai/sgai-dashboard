# SGAi Dashboard

Lightweight task dashboard for OpenClaw workflows.

## Features
- Kanban-style task board (React + touch-friendly drag & drop)
- Briefing section (calendar summary)
- Image attachments (drag & drop / file picker)
- Task comments for progress tracking
- Local JSON persistence + Node/TypeScript API server

## Run
```bash
npm install
npm run build
npm start
```
Then open:
- http://127.0.0.1:18790/dashboard/

## Notes
- No tokens or secrets are stored in this repository.
- Runtime data is ignored via `.gitignore`.
- Python components were removed; this repo is Node/TypeScript only.
