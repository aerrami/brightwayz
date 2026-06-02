# brightwayz

Combined monorepo for the Brightwayz platform.

## Layout

- `api/` — FastAPI backend (Python). Originally `aerrami/brightwayz-api`.
- `web/` — Next.js frontend (TypeScript). Originally `aerrami/brightwayz-web`.

Each subproject is self-contained: its own README, dependencies, and run commands live inside `api/` and `web/`.

## Working in a subproject

```bash
# Backend
cd api
python -m venv .venv && .venv\Scripts\activate   # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd web
npm install
npm run dev
```

See `api/README.md` and `web/README.md` for details.

## History

History from both source repos was preserved via `git subtree add`. The original
repos remain at `aerrami/brightwayz-api` and `aerrami/brightwayz-web`.
