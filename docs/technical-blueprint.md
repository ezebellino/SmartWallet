# Smart Wallet AI Technical Blueprint

## Architecture Goals

- Keep business logic outside HTTP routers.
- Keep database access inside repositories.
- Validate all external input with Pydantic schemas.
- Keep AI provider code behind an interface-like service layer.
- Keep integrations replaceable and cache-aware.
- Avoid definitive financial advice in AI and investment features.

## Backend Architecture

```text
backend/
  app/
    main.py
    core/
      config.py
      errors.py
      security.py
    database/
      base.py
      session.py
    models/
    schemas/
    repositories/
    services/
    routers/
    auth/
    ai/
    analytics/
    investments/
    integrations/
    notifications/
    automations/
    tests/
```

Layer responsibilities:

- `routers`: HTTP endpoints and dependency wiring.
- `schemas`: request and response validation.
- `services`: business rules.
- `repositories`: database queries.
- `models`: SQLAlchemy tables.
- `analytics`: calculations and data analysis.
- `ai`: prompts, report generation, provider adapters.
- `investments`: portfolio and operation logic.
- `integrations`: external API clients.
- `automations`: scheduled jobs.
- `notifications`: notification creation and delivery channels.

## Frontend Architecture

```text
frontend/
  src/
    app/
    components/
    features/
      auth/
      dashboard/
      transactions/
      categories/
      goals/
      investments/
      ai-reports/
      notifications/
    services/
    hooks/
    types/
    utils/
    layouts/
    styles/
```

## Initial Data Model

### users

- `id`
- `email`
- `hashed_password`
- `full_name`
- `is_active`
- `created_at`
- `updated_at`

### categories

- `id`
- `user_id`
- `name`
- `type`
- `color`
- `icon`
- `created_at`
- `updated_at`

### transactions

- `id`
- `user_id`
- `category_id`
- `type`
- `amount`
- `currency`
- `description`
- `transaction_date`
- `is_recurring`
- `created_at`
- `updated_at`

### saving_goals

- `id`
- `user_id`
- `name`
- `target_amount`
- `current_amount`
- `target_date`
- `status`
- `created_at`
- `updated_at`

### investment_assets

- `id`
- `user_id`
- `name`
- `symbol`
- `asset_type`
- `currency`
- `risk_level`
- `created_at`
- `updated_at`

### investment_operations

- `id`
- `user_id`
- `asset_id`
- `operation_type`
- `quantity`
- `unit_price`
- `fees`
- `operation_date`
- `created_at`

### ai_reports

- `id`
- `user_id`
- `period_month`
- `period_year`
- `summary`
- `recommendations`
- `risk_warnings`
- `created_at`

### notifications

- `id`
- `user_id`
- `type`
- `title`
- `message`
- `status`
- `created_at`
- `read_at`

## Initial REST Endpoints

### System

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

### Categories

- `GET /categories`
- `POST /categories`
- `PATCH /categories/{category_id}`
- `DELETE /categories/{category_id}`

### Transactions

- `GET /transactions`
- `POST /transactions`
- `GET /transactions/{transaction_id}`
- `PATCH /transactions/{transaction_id}`
- `DELETE /transactions/{transaction_id}`

### Dashboard

- `GET /dashboard/monthly-summary`
- `GET /dashboard/category-breakdown`
- `GET /dashboard/cashflow`

### Goals

- `GET /goals`
- `POST /goals`
- `PATCH /goals/{goal_id}`
- `DELETE /goals/{goal_id}`

### Investments

- `GET /investments/assets`
- `POST /investments/assets`
- `GET /investments/portfolio`
- `POST /investments/operations`
- `GET /investments/performance`

### AI

- `POST /ai/monthly-report`
- `POST /ai/ask`

## Security Decisions

- Passwords are never stored in plain text.
- JWT secret must come from environment variables.
- User-owned records must always be filtered by authenticated user ID.
- AI prompts must avoid sending unnecessary sensitive data.
- Investment module must include educational disclaimers.
- External API keys must be stored only in environment variables.

