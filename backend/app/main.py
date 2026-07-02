from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers.ai_reports import router as ai_reports_router
from app.routers.auth import router as auth_router
from app.routers.budgets import router as budgets_router
from app.routers.categories import router as categories_router
from app.routers.dashboard import router as dashboard_router
from app.routers.health import router as health_router
from app.routers.insights import router as insights_router
from app.routers.investments import router as investments_router
from app.routers.saving_goals import router as saving_goals_router
from app.routers.simulations import router as simulations_router
from app.routers.transactions import router as transactions_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(ai_reports_router)
    app.include_router(categories_router)
    app.include_router(transactions_router)
    app.include_router(budgets_router)
    app.include_router(saving_goals_router)
    app.include_router(investments_router)
    app.include_router(insights_router)
    app.include_router(simulations_router)
    app.include_router(dashboard_router)
    return app


app = create_app()
