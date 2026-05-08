.PHONY: selfhost build up down logs help

# ── Self-Host (one-command start) ───────────────────────────────────────

selfhost:
	@echo "==> Nexus Portfolio — Self-Host Setup"
	@echo ""
	@if [ ! -f .env ]; then \
		echo "==> Creating .env from .env.example ..."; \
		cp .env.example .env; \
		echo "==> [IMPORTANT] Edit .env and fill in your Firebase credentials."; \
		echo ""; \
	else \
		echo "==> .env already exists, skipping."; \
	fi
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║  NEXT STEPS                                                  ║"
	@echo "║                                                              ║"
	@echo "║  1. Edit .env with your Firebase project credentials         ║"
	@echo "║     (Firebase free tier is all you need)                     ║"
	@echo "║                                                              ║"
	@echo "║  2. Set NEXUS_STORAGE_DRIVER (optional):                     ║"
	@echo "║     firebase  → (default) uses your Firebase project         ║"
	@echo "║     sqlite    → local SQLite file (set SQLITE_PATH)          ║"
	@echo "║     postgres  → requires DATABASE_URL                        ║"
	@echo "║                                                              ║"
	@echo "║  3. Start:                                                    ║"
	@echo "║     docker compose up --build -d                              ║"
	@echo "║                                                              ║"
	@echo "║  4. Open: http://localhost:6868                              ║"
	@echo "║                                                              ║"
	@echo "║  For Postgres:                                                ║"
	@echo "║     NEXUS_STORAGE_DRIVER=postgres docker compose \\           ║"
	@echo "║       -f docker-compose.yml -f docker-compose.selfhost.yml \\ ║"
	@echo "║       --profile postgres up --build -d                        ║"
	@echo "║                                                              ║"
	@echo "║  For SQLite:                                                  ║"
	@echo "║     NEXUS_STORAGE_DRIVER=sqlite docker compose up --build -d  ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@echo ""

# ── Build & Run ─────────────────────────────────────────────────────────

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

# ── Help ────────────────────────────────────────────────────────────────

help:
	@echo "Usage:"
	@echo "  make selfhost     One-command setup (creates .env, prints next steps)"
	@echo "  make build        Build Docker image"
	@echo "  make up           Start services (docker compose up -d)"
	@echo "  make down         Stop services"
	@echo "  make logs         Tail logs"
