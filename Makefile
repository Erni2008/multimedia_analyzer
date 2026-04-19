PYTHON ?= python3

.PHONY: test build frontend-build frontend-lint up down migrate

test:
	$(PYTHON) scripts/run_tests.py

build:
	cd frontend && npm run build

frontend-build:
	cd frontend && npm run build

frontend-lint:
	cd frontend && npm run lint

up:
	docker compose up --build -d

down:
	docker compose down

migrate:
	alembic upgrade head
