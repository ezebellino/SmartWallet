# Railway deployment

SmartWallet is an isolated monorepo. Deploy each runtime as a separate Railway service.

## Services

Create these Railway services in one project:

1. `smartwallet-postgres`
   - Type: PostgreSQL database.

2. `smartwallet-backend`
   - Source: GitHub repo `ezebellino/SmartWallet`.
   - Root Directory: `/backend`.
   - Dockerfile is used automatically.
   - Public networking: generate a Railway domain.

3. `smartwallet-frontend`
   - Source: same GitHub repo.
   - Root Directory: `/frontend`.
   - Config file: `/frontend/railway.toml`.
   - Public networking: generate a Railway domain.

4. `smartwallet-mercado-pago-worker`
   - Source: same GitHub repo.
   - Root Directory: `/backend`.
   - Start Command:

```sh
python -m alembic upgrade head && python -m app.worker loop mercado_pago_sync
```

5. Optional later: `smartwallet-portfolio-worker`
   - Root Directory: `/backend`.
   - Start Command:

```sh
python -m alembic upgrade head && python -m app.worker loop portfolio_refresh
```

## Backend variables

Set these on `smartwallet-backend`:

```text
DATABASE_URL=${{ smartwallet-postgres.DATABASE_URL }}
ENVIRONMENT=production
DEBUG=false
JWT_SECRET_KEY=<generate a long random secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=https://<frontend-domain>
AI_PROVIDER=stub
OPENAI_API_KEY=<optional, secret>
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_SECONDS=20
MARKET_DATA_AUTO_REFRESH_ENABLED=false
MARKET_DATA_REFRESH_INTERVAL_MINUTES=90
MARKET_DATA_REFRESH_STARTUP_DELAY_SECONDS=5
WORKER_INTERVAL_MINUTES=90
WORKER_STARTUP_DELAY_SECONDS=5
MERCADO_PAGO_SYNC_LOOKBACK_DAYS=35
```

## Frontend variables

Set these on `smartwallet-frontend`:

```text
NEXT_PUBLIC_API_BASE_URL=https://<backend-domain>
```

This variable is baked into the browser bundle at build time, so redeploy the frontend after changing it.

## Worker variables

Set these on `smartwallet-mercado-pago-worker`:

```text
DATABASE_URL=${{ smartwallet-postgres.DATABASE_URL }}
ENVIRONMENT=production
DEBUG=false
JWT_SECRET_KEY=<same value as backend>
WORKER_INTERVAL_MINUTES=90
WORKER_STARTUP_DELAY_SECONDS=5
MERCADO_PAGO_SYNC_LOOKBACK_DAYS=35
```

The worker has no public domain. It reads encrypted Mercado Pago credentials from the shared database and imports movements through the backend service layer.

## Deployment order

1. Provision PostgreSQL.
2. Deploy backend.
3. Generate backend public domain.
4. Deploy frontend with `NEXT_PUBLIC_API_BASE_URL` pointing to backend.
5. Generate frontend public domain.
6. Update backend `CORS_ORIGINS` to the frontend domain.
7. Redeploy backend.
8. Verify:

```text
GET https://<backend-domain>/health
Open https://<frontend-domain>
```

9. Activate Mercado Pago productive credentials using the frontend domain.
10. Save the productive Access Token in SmartWallet.
11. Deploy/start `smartwallet-mercado-pago-worker`.

## Notes

- Do not paste provider secrets into chat or commit them to git.
- Do not use localhost for Mercado Pago productive credentials.
- Railway root directory matters: `/backend` and `/frontend` are independent services.
- If a service does not pick up the expected config file, set commands manually in Railway service settings.
