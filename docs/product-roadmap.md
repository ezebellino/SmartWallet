# Smart Wallet AI Product Roadmap

## Product Definition

Smart Wallet AI is a private personal finance assistant that helps users register money movements, understand spending behavior, plan savings goals, simulate investment scenarios, and receive educational AI-generated recommendations.

The product is not a financial advisor. It provides educational analysis, comparisons, simulations, and risk warnings.

## MVP Scope

The MVP focuses on a strong financial core:

1. User registration and login.
2. Secure JWT authentication.
3. Income and expense CRUD.
4. Custom categories.
5. Monthly balance.
6. Expense charts by category.
7. Basic unnecessary spending detection.
8. Savings goals.
9. Compound interest simulator.
10. Initial manual investment module.
11. Monthly AI report.

## Non-MVP Scope

The following features are intentionally deferred:

- Bank account integrations.
- Live investment trading.
- Real-time market alerts.
- Advanced forecasting.
- Mobile app.
- Multi-account household mode.
- Full notification system.

## Roadmap

### Phase 0: Product and Architecture

- Product definition.
- MVP scope.
- Technical blueprint.
- Initial data model.
- Backend and frontend architecture.
- User flow.
- Delivery plan.

### Phase 1: Backend Foundation

- FastAPI project.
- PostgreSQL configuration.
- Environment variables.
- Healthcheck.
- Docker Compose.
- Test setup.
- Clean folder structure.

### Phase 2: Authentication

- User model.
- Registration.
- Login.
- Password hashing.
- JWT access token.
- Protected routes.
- Current user dependency.

### Phase 3: Personal Finance Core

- Categories.
- Transactions.
- Monthly balance.
- Dashboard aggregates.
- Filters by date, type, and category.
- Recurring transaction preparation.

### Phase 4: Frontend MVP

- Next.js app.
- Dark mode layout.
- Login and registration.
- Dashboard.
- Transaction forms.
- Category management.
- Financial charts.

### Phase 5: Goals and Simulations

- Savings goals.
- Goal progress.
- Compound interest simulator.
- Monthly contribution simulations.
- Conservative, moderate, and aggressive scenarios.

### Phase 6: Investments

- Manual asset registry.
- Asset types.
- Buy and sell operations.
- Average price.
- Profit and loss.
- Portfolio distribution.
- Educational risk warnings.

### Phase 7: AI Assistant

- Monthly report generation.
- Spending behavior analysis.
- Savings recommendations.
- Investment scenario explanations.
- Prompt templates.
- AI safety guardrails.

### Phase 8: External APIs

- Market price providers.
- Crypto price providers.
- Currency exchange rates.
- Inflation data.
- Interest rate references.
- Provider abstraction and cache.

### Phase 9: Automations

- Monthly report jobs.
- Spending anomaly detection jobs.
- Recurring movement creation.
- Portfolio recalculation.
- Price snapshot updates.

### Phase 10: Notifications

- In-app notifications.
- Email notifications.
- Budget limit alerts.
- Monthly report ready alerts.
- Goal progress alerts.
- Investment movement alerts.

### Phase 11: Advanced Analytics

- Spending trend analysis.
- Monthly prediction.
- Outlier detection.
- Financial score.
- Debt analysis.
- Annual savings projection.

### Phase 12: Production Delivery

- Railway deployment.
- CI checks.
- Backend tests.
- Frontend tests.
- Monitoring.
- Backups.
- Production documentation.

