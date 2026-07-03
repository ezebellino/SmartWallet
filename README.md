# Smart Wallet AI

Smart Wallet AI is a personal finance web application for tracking income, expenses, savings goals, investments, debts, and financial habits with AI-assisted analysis.

The product is designed to provide educational insights, simulations, and risk warnings. It must not present itself as definitive financial advice.

## Current Stage

Stage 0 and Stage 1 are being built first:

- Product roadmap and technical blueprint.
- FastAPI backend foundation.
- PostgreSQL-ready configuration.
- Docker-based local development.
- Initial tests and healthcheck.

## Planned Stack

- Backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL, Pydantic.
- Frontend: Next.js, TypeScript, TailwindCSS.
- Analytics: Pandas, NumPy, Matplotlib.
- AI: provider-agnostic service layer.
- Infrastructure: Docker, Railway, GitHub.

## Local Backend

The backend setup will live in `backend/`.

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Healthcheck:

```text
GET http://localhost:8000/health
```

Initial API surface:

```text
POST /auth/register
POST /auth/login
GET  /auth/me

GET    /categories
POST   /categories
PATCH  /categories/{category_id}
DELETE /categories/{category_id}

GET    /transactions
POST   /transactions
PATCH  /transactions/{transaction_id}
DELETE /transactions/{transaction_id}

GET    /budgets
POST   /budgets
PATCH  /budgets/{budget_id}
DELETE /budgets/{budget_id}
GET    /budgets/usage

GET    /goals
POST   /goals
PATCH  /goals/{goal_id}
POST   /goals/{goal_id}/contributions
DELETE /goals/{goal_id}

GET    /investments/assets
POST   /investments/assets
PATCH  /investments/assets/{asset_id}
DELETE /investments/assets/{asset_id}
GET    /investments/operations
POST   /investments/operations
GET    /investments/portfolio

GET /dashboard/monthly-summary
GET /insights/spending
GET /ai/reports
POST /ai/monthly-report
POST /simulations/compound-interest
```

The compound interest simulator applies each monthly contribution before calculating that month's interest.

Run tests:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

Run backend for frontend authentication:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Run the Docker development stack:

```powershell
docker compose up --build -d
```

The Docker backend runs Alembic migrations before starting Uvicorn and mounts `backend/app` plus `backend/alembic`, so code and migration changes are picked up without rebuilding the image for every source edit.

The frontend expects the API at:

```text
http://localhost:8000
```

Local frontend origins are enabled through `CORS_ORIGINS` in `backend/.env.example`.

Run migrations against the configured database:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Local PostgreSQL for this project is exposed on `localhost:5433` to avoid colliding with other local databases that commonly use `5432`. Inside Docker, services still talk to Postgres on `postgres:5432`.
