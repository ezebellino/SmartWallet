from fastapi.testclient import TestClient


def test_market_news_requires_auth_and_returns_source(client: TestClient, auth_headers: dict[str, str], monkeypatch) -> None:
    from app.routers import market_data

    monkeypatch.setattr(market_data, "get_market_news", lambda: {"items": [{"title": "Policy update", "url": "https://www.federalreserve.gov/newsevents/pressreleases/test.htm", "published_at": "Mon, 01 Jan 2026 00:00:00 GMT", "source": "Federal Reserve"}], "unavailable": False})
    assert client.get("/market-data/news").status_code == 401
    response = client.get("/market-data/news", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["items"][0]["source"] == "Federal Reserve"


def test_market_news_failure_is_distinct_from_an_empty_feed(monkeypatch) -> None:
    import httpx
    from app.services import market_news

    monkeypatch.setattr(market_news, "_cache", None)
    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: (_ for _ in ()).throw(httpx.ConnectError("unavailable")))
    assert market_news.get_market_news() == {"items": [], "unavailable": True}
