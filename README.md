# SGAi Dashboard

Lightweight task dashboard for OpenClaw workflows.

## Features
- Kanban-style task board
- Briefing section (calendar summary)
- Image attachments (drag & drop / file picker)
- Task comments for progress tracking
- Local JSON persistence + simple Python API server

## Run
```bash
python3 scripts/task-board-server.py
```
Then open:
- http://127.0.0.1:18790/dashboard/

## Notes
- No tokens or secrets are stored in this repository.
- Runtime data is ignored via `.gitignore`.
