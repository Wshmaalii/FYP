import csv
import io
import json
import time
from datetime import datetime, timezone
from urllib import parse, request as urlrequest
from urllib.error import HTTPError


ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"
MARKET_CACHE_TTL_SECONDS = 300
STOCK_QUOTE_CACHE_TTL_SECONDS = 300
STOCK_HISTORY_CACHE_TTL_SECONDS = 900
EARNINGS_CACHE_TTL_SECONDS = 3600

MARKET_OVERVIEW_INDICES = [
    {"name": "FTSE 100", "ticker": "FTSE 100", "region": "Europe", "source_symbol": "EWU", "source_type": "proxy_etf", "source_label": "iShares MSCI United Kingdom ETF proxy"},
    {"name": "DAX", "ticker": "DAX", "region": "Europe", "source_symbol": "EWG", "source_type": "proxy_etf", "source_label": "iShares MSCI Germany ETF proxy"},
    {"name": "CAC 40", "ticker": "CAC 40", "region": "Europe", "source_symbol": "EWQ", "source_type": "proxy_etf", "source_label": "iShares MSCI France ETF proxy"},
    {"name": "S&P 500", "ticker": "S&P 500", "region": "US", "source_symbol": "SPY", "source_type": "proxy_etf", "source_label": "SPDR S&P 500 ETF Trust proxy"},
    {"name": "Dow Jones", "ticker": "Dow Jones", "region": "US", "source_symbol": "DIA", "source_type": "proxy_etf", "source_label": "SPDR Dow Jones Industrial Average ETF proxy"},
    {"name": "Nikkei 225", "ticker": "Nikkei 225", "region": "Asia", "source_symbol": "EWJ", "source_type": "proxy_etf", "source_label": "iShares MSCI Japan ETF proxy"},
    {"name": "Hang Seng", "ticker": "Hang Seng", "region": "Asia", "source_symbol": "EWH", "source_type": "proxy_etf", "source_label": "iShares MSCI Hong Kong ETF proxy"},
]

market_cache = {}
top_movers_cache = {}
stock_quote_cache = {}
stock_history_cache = {}
earnings_cache = {}


class RateLimitError(RuntimeError):
    pass


def get_alpha_vantage_api_key():
    from os import getenv
    return (getenv("ALPHA_VANTAGE_API_KEY") or "").strip()


def normalize_symbol(symbol: str) -> str:
    return (symbol or "").strip().upper()


def _to_float(value, default=0.0):
    try:
        if isinstance(value, str):
            cleaned = value.replace(",", "").replace("%", "").strip()
            if cleaned == "":
                return default
            return float(cleaned)
        return float(value)
    except (TypeError, ValueError):
        return default


def _alpha_vantage_request(params):
    query = parse.urlencode(params)
    url = f"{ALPHA_VANTAGE_BASE_URL}?{query}"
    req = urlrequest.Request(
        url,
        headers={
            "Accept": "application/json,text/csv",
            "User-Agent": "TradeLink/1.0 (+render-backend)",
        },
    )

    try:
        with urlrequest.urlopen(req, timeout=8) as response:
            body = response.read().decode("utf-8")
            content_type = response.headers.get("Content-Type", "")
    except HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="ignore")
        try:
            error_payload = json.loads(raw_body) if raw_body else {}
            message = error_payload.get("message") or error_payload.get("error")
        except Exception:
            message = None
        raise RuntimeError(message or f"HTTP Error {exc.code}: {exc.reason}") from exc

    if "csv" in content_type.lower():
        return body

    payload = json.loads(body)
    if payload.get("Note"):
        raise RateLimitError("rate limit exceeded")
    if payload.get("Error Message"):
        raise RuntimeError(payload.get("Error Message"))
    if payload.get("Information"):
        raise RuntimeError(payload.get("Information"))
    return payload


def fetch_quote(api_key: str, symbol: str):
    now = time.time()
    normalized = normalize_symbol(symbol)
    cache_entry = stock_quote_cache.get(normalized)
    if cache_entry and cache_entry["expires_at"] > now:
        return cache_entry["data"]

    try:
        payload = _alpha_vantage_request(
            {"function": "GLOBAL_QUOTE", "symbol": normalized, "apikey": api_key}
        )
        quote = payload.get("Global Quote") or {}
        if not isinstance(quote, dict) or not quote:
            raise RuntimeError("No quote data available")

        data = {
            "symbol": (quote.get("01. symbol") or normalized).upper(),
            "price": _to_float(quote.get("05. price")),
            "change": _to_float(quote.get("09. change")),
            "change_percent": (quote.get("10. change percent") or "0.00%").strip(),
        }
        if data["change_percent"] and not data["change_percent"].endswith("%"):
            data["change_percent"] = f"{data['change_percent']}%"
    except RateLimitError:
        raise
    except Exception:
        payload = _alpha_vantage_request(
            {
                "function": "TIME_SERIES_DAILY",
                "symbol": normalized,
                "outputsize": "compact",
                "apikey": api_key,
            }
        )
        series = payload.get("Time Series (Daily)") or {}
        if not isinstance(series, dict) or len(series) < 2:
            raise RuntimeError("No quote data available")

        sorted_points = sorted(series.items(), key=lambda item: item[0], reverse=True)
        latest = sorted_points[0][1]
        previous = sorted_points[1][1]
        latest_close = _to_float(latest.get("4. close"))
        previous_close = _to_float(previous.get("4. close"))
        change = latest_close - previous_close
        change_percent = ((change / previous_close) * 100) if previous_close else 0.0
        data = {
            "symbol": normalized,
            "price": latest_close,
            "change": change,
            "change_percent": f"{change_percent:.2f}%",
        }

    stock_quote_cache[normalized] = {
        "data": data,
        "expires_at": now + STOCK_QUOTE_CACHE_TTL_SECONDS,
    }
    return data


def fetch_history(api_key: str, symbol: str):
    now = time.time()
    normalized = normalize_symbol(symbol)
    cache_entry = stock_history_cache.get(normalized)
    if cache_entry and cache_entry["expires_at"] > now:
        return cache_entry["data"]

    points = []
    try:
        payload = _alpha_vantage_request(
            {
                "function": "TIME_SERIES_INTRADAY",
                "symbol": normalized,
                "interval": "5min",
                "apikey": api_key,
            }
        )
        series = payload.get("Time Series (5min)") or {}
        if not isinstance(series, dict) or not series:
            raise RuntimeError("No historical data available")

        for timestamp, values in series.items():
            if not isinstance(values, dict):
                continue
            points.append(
                {
                    "time": timestamp,
                    "price": _to_float(values.get("4. close")),
                    "open": _to_float(values.get("1. open")),
                    "high": _to_float(values.get("2. high")),
                    "low": _to_float(values.get("3. low")),
                    "volume": _to_float(values.get("5. volume")),
                }
            )
    except RateLimitError:
        raise
    except Exception:
        payload = _alpha_vantage_request(
            {
                "function": "TIME_SERIES_DAILY",
                "symbol": normalized,
                "outputsize": "compact",
                "apikey": api_key,
            }
        )
        series = payload.get("Time Series (Daily)") or {}
        if not isinstance(series, dict) or not series:
            raise RuntimeError("No historical data available")

        for timestamp, values in series.items():
            if not isinstance(values, dict):
                continue
            points.append(
                {
                    "time": timestamp,
                    "price": _to_float(values.get("4. close")),
                    "open": _to_float(values.get("1. open")),
                    "high": _to_float(values.get("2. high")),
                    "low": _to_float(values.get("3. low")),
                    "volume": _to_float(values.get("5. volume")),
                }
            )

    points.sort(key=lambda item: item["time"])
    latest_points = points[-50:]
    stock_history_cache[normalized] = {
        "data": latest_points,
        "expires_at": now + STOCK_HISTORY_CACHE_TTL_SECONDS,
    }
    return latest_points


def fetch_bulk_quotes(api_key: str, tickers):
    requested = []
    for ticker in tickers:
        normalized = (ticker or "").strip()
        if normalized and normalized not in requested:
            requested.append(normalized)

    cache_key = ",".join(sorted(requested))
    now = time.time()
    cache_entry = market_cache.get(cache_key)
    if cache_entry and cache_entry["expires_at"] > now:
        return cache_entry["data"]

    quotes = {}
    for ticker in requested:
        quote = fetch_quote(api_key, ticker)
        quotes[ticker] = {
            "price": quote["price"],
            "change": quote["change"],
            "changePercent": _to_float(quote["change_percent"]),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }

    market_cache[cache_key] = {
        "data": quotes,
        "expires_at": now + MARKET_CACHE_TTL_SECONDS,
    }
    return quotes


def fetch_top_movers(api_key: str, index: str):
    if index not in {"FTSE100", "FTSE250", "Global"}:
        raise ValueError("Unsupported index")

    now = time.time()
    cache_entry = top_movers_cache.get(index)
    if cache_entry and cache_entry["expires_at"] > now:
        return cache_entry["data"]

    if index != "Global":
        payload = {
            "gainers": [],
            "losers": [],
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "supported": False,
            "message": "Top movers are only supported for the US market by the current Alpha Vantage endpoint.",
        }
        top_movers_cache[index] = {
            "data": payload,
            "expires_at": now + MARKET_CACHE_TTL_SECONDS,
        }
        return payload

    payload = _alpha_vantage_request({"function": "TOP_GAINERS_LOSERS", "apikey": api_key})

    def _normalize_movers(entries):
        normalized_entries = []
        for entry in entries[:5]:
            normalized_entries.append(
                {
                    "ticker": entry.get("ticker") or "",
                    "name": entry.get("ticker") or "",
                    "price": _to_float(entry.get("price")),
                    "change": _to_float(entry.get("change_amount")),
                    "changePercent": _to_float(entry.get("change_percentage")),
                    "volume": int(_to_float(entry.get("volume"), 0)),
                }
            )
        return normalized_entries

    payload = {
        "gainers": _normalize_movers(payload.get("top_gainers") or []),
        "losers": _normalize_movers(payload.get("top_losers") or []),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "supported": True,
        "message": None,
    }

    top_movers_cache[index] = {
        "data": payload,
        "expires_at": now + MARKET_CACHE_TTL_SECONDS,
    }
    return payload


def _market_status(region: str):
    now = datetime.now(timezone.utc)
    weekday = now.weekday()
    if weekday >= 5:
        return "Closed"

    hour = now.hour + (now.minute / 60)
    hours = {
        "Europe": (8, 16.5),
        "US": (14.5, 21),
        "Asia": (0, 6),
    }.get(region, (0, 0))
    return "Open" if hours[0] <= hour <= hours[1] else "Closed"


def fetch_market_overview(api_key: str):
    indices = []
    for item in MARKET_OVERVIEW_INDICES:
        try:
            quote = fetch_quote(api_key, item["source_symbol"])
            indices.append(
                {
                    "name": item["name"],
                    "ticker": item["ticker"],
                    "price": quote["price"],
                    "change": quote["change"],
                    "changePercent": _to_float(quote["change_percent"]),
                    "open": None,
                    "high": None,
                    "low": None,
                    "volume": None,
                    "region": item["region"],
                    "status": _market_status(item["region"]),
                    "history": [],
                    "available": True,
                    "sourceSymbol": item["source_symbol"],
                    "sourceType": item["source_type"],
                    "sourceLabel": item["source_label"],
                }
            )
        except Exception:
            indices.append(
                {
                    "name": item["name"],
                    "ticker": item["ticker"],
                    "price": None,
                    "change": None,
                    "changePercent": None,
                    "open": None,
                    "high": None,
                    "low": None,
                    "volume": None,
                    "region": item["region"],
                    "status": "Unavailable",
                    "history": [],
                    "available": False,
                    "sourceSymbol": item["source_symbol"],
                    "sourceType": item["source_type"],
                    "sourceLabel": item["source_label"],
                }
            )

    return {
        "indices": indices,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "sectors_available": False,
        "sectors": [],
    }


def fetch_upcoming_earnings(api_key: str):
    now = time.time()
    cache_entry = earnings_cache.get("upcoming")
    if cache_entry and cache_entry["expires_at"] > now:
        return cache_entry["data"]

    payload = _alpha_vantage_request(
        {
            "function": "EARNINGS_CALENDAR",
            "horizon": "3month",
            "apikey": api_key,
        }
    )

    rows = []
    if isinstance(payload, str):
        reader = csv.DictReader(io.StringIO(payload))
        for row in reader:
            if row:
                rows.append(row)

    normalized = []
    for row in rows[:12]:
        normalized.append(
            {
                "ticker": row.get("symbol") or "",
                "company": row.get("name") or row.get("symbol") or "",
                "report_date": row.get("reportDate") or "",
                "estimate": _to_float(row.get("estimate"), None),
                "currency": row.get("currency") or "",
            }
        )

    data = {"items": normalized, "updatedAt": datetime.now(timezone.utc).isoformat()}
    earnings_cache["upcoming"] = {
        "data": data,
        "expires_at": now + EARNINGS_CACHE_TTL_SECONDS,
    }
    return data
