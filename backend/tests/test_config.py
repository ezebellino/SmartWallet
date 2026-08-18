from app.core.config import Settings


def test_postgresql_url_uses_installed_psycopg_driver() -> None:
    settings = Settings(database_url="postgresql://user:password@host:5432/db")

    assert settings.sqlalchemy_database_url == "postgresql+psycopg://user:password@host:5432/db"


def test_non_postgresql_url_is_not_modified() -> None:
    settings = Settings(database_url="sqlite:///./test.db")

    assert settings.sqlalchemy_database_url == "sqlite:///./test.db"
