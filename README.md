# Multimedia Analyzer

Full-stack multimedia analysis project with:

- `app/` FastAPI backend
- `worker/` Celery background processing
- `frontend/` Next.js dashboard
- `docs/assignment/` assignment documentation and artifacts

The application supports:

- account registration and login
- media upload for audio and video files
- background transcription and analysis
- extracted entities and watchlist alert matches
- generated short recaps for completed transcripts
- file cleanup and history review
- paginated media listing
- dedicated watchlist storage per user
- migration-based schema management via Alembic

## Quick Start

1. Copy `.env.example` to `.env`.
2. Copy `frontend/.env.local.example` to `frontend/.env.local`.
3. Start the stack:

```bash
docker compose up --build
```

Services:

- frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- API health: `http://localhost:8000/health`

Apply migrations when needed:

```bash
alembic upgrade head
```

## Tests

Run the project test runner from the repo root:

```bash
python3 scripts/run_tests.py
```

Behavior:

- in Docker-enabled environments it first tries the containerized test run
- if Docker is unavailable, it falls back to local execution automatically
- each test is printed with a clear `OK` or `NO` status

You can force a mode when needed:

```bash
python3 scripts/run_tests.py --mode docker
python3 scripts/run_tests.py --mode local
```

Project shortcuts are also available through `make`:

```bash
make test
make frontend-lint
make frontend-build
make up
make down
make migrate
```

## Notes

- The backend is resilient in local development: when optional host-side packages are missing, local tests fall back to lightweight implementations so the project still remains testable.
- Full upload processing in regular use still expects the Docker environment described above, including database, Redis, FFmpeg, and multipart upload support.
- Assignment materials remain in `docs/assignment/`.
- CI is defined in `.github/workflows/ci.yml`.
- Local git hooks can be enabled with `pre-commit install`.
