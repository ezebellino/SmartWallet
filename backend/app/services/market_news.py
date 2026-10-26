from datetime import datetime, timedelta, timezone
from threading import Lock
from xml.etree import ElementTree

import httpx

FEED_URL = "https://www.federalreserve.gov/feeds/press_monetary.xml"
_cache: tuple[datetime, list[dict[str, str]]] | None = None
_lock = Lock()


def get_market_news() -> dict[str, object]:
    global _cache
    with _lock:
        now = datetime.now(timezone.utc)
        if _cache and now - _cache[0] < timedelta(minutes=30):
            return {"items": _cache[1], "unavailable": False}
        try:
            response = httpx.get(FEED_URL, timeout=5, follow_redirects=False)
            response.raise_for_status()
            root = ElementTree.fromstring(response.content)
            items = []
            for item in root.findall("./channel/item")[:8]:
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                if not title or not link.startswith("https://www.federalreserve.gov/"):
                    continue
                items.append({
                    "title": title,
                    "url": link,
                    "published_at": (item.findtext("pubDate") or "").strip(),
                    "source": "Federal Reserve",
                })
            _cache = (now, items)
            return {"items": items, "unavailable": False}
        except (httpx.HTTPError, ElementTree.ParseError):
            return {"items": _cache[1] if _cache else [], "unavailable": True}
