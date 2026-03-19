import csv
import io
import json
import time
from datetime import datetime, timezone
from urllib import parse, request as urlrequest
from urllib.error import HTTPError


ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"
MARKET_CACHE_TTL_SECONDS = 15
STOCK_QUOTE_CACHE_TTL_SECONDS = 30
STOCK_HISTORY_CACHE_TTL_SECONDS = 60
EARNINGS_CACHE_TTL_SECONDS = 3600

TICKER_PROVIDER_MAP = {
    "FTSE 100": "^FTSE",
    "DAX": "^GDAXI",
    "CAC 40": "^FCHI",
    "S&P 500": "^GSPC",
    "Dow Jones": "^DJI",
    "Nikkei 225": "^N225",
    "Hang Seng": "^HSI",
}

TOP_MOVER_UNIVERSES = {
    "FTSE100": [
        {"ticker": "BARC.L", "name": "Barclays PLC", "volume": 45200000},
        {"ticker": "BP.L", "name": "BP PLC", "volume": 32800000},
        {"ticker": "GSK.L", "name": "GSK", "volume": 12400000},
        {"ticker": "HSBA.L", "name": "HSBC Holdings", "volume": 28100000},
        {"ticker": "RIO.L", "name": "Rio Tinto", "volume": 8300000},
        {"ticker": "LLOY.L", "name": "Lloyds Banking Group", "volume": 67300000},
        {"ticker": "VOD.L", "name": "Vodafone Group", "volume": 89100000},
        {"ticker": "BT.L", "name": "BT Group", "volume": 42500000},
        {"ticker": "TSCO.L", "name": "Tesco PLC", "volume": 35700000},
        {"ticker": "IAG.L", "name": "IAG", "volume": 52800000},
    ],
    "FTSE250": [
        {"ticker": "EZJ.L", "name": "easyJet", "volume": 8100000},
        {"ticker": "ITRK.L", "name": "Intertek Group", "volume": 1200000},
        {"ticker": "BAB.L", "name": "Babcock International", "volume": 3900000},
        {"ticker": "CINE.L", "name": "Cineworld Group", "volume": 7200000},
        {"ticker": "AO.L", "name": "AO World", "volume": 2600000},
        {"ticker": "TBCG.L", "name": "TBC Bank Group", "volume": 1800000},
        {"ticker": "HOC.L", "name": "Hochschild Mining", "volume": 4300000},
        {"ticker": "PNN.L", "name": "Pennon Group", "volume": 1700000},
    ],
    "Global": [
        {"ticker": "AAPL", "name": "Apple Inc.", "volume": 56400000},
        {"ticker": "MSFT", "name": "Microsoft Corp.", "volume": 24200000},
        {"ticker": "NVDA", "name": "NVIDIA Corp.", "volume": 45100000},
        {"ticker": "AMZN", "name": "Amazon.com Inc.", "volume": 38700000},
        {"ticker": "TSLA", "name": "Tesla Inc.", "volume": 93600000},
        {"ticker": "META", "name": "Meta Platforms Inc.", "volume": 22800000},
        {"ticker": "GOOGL", "name": "Alphabet Inc.", "volume": 21100000},
        {"ticker": "NFLX", "name": "Netflix Inc.", "volume": 8200000},
    ],
}

MARKET_OVERVIEW_INDICES = [
    {"name": "FTSE 100", "ticker": "FTSE 100", "region": "Europe"},
    {"name": "DAX", "ticker": "DAX", "region": "Europe"},
    {"name": "CAC 40", "ticker": "CAC 40", "region": "Europe"},
    {"name": "S&P 500", "ticker": "S&P 500", "region": "US"},
    {"name": "Dow Jones", "ticker": "Dow Jones", "region": "US"},
    {"name": "Nikkei 225", "ticker": "Nikkei 225", "region": "Asia"},
    {"name": "Hang Seng", "ticker": "Hang Seng", "region": "Asia"},
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
    normalized = (symbol or "").strip()
    return TICKER_PROVIDER_MAP.get(normalized, normalized).upper()


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

    points = []
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
    if index not in TOP_MOVER_UNIVERSES:
        raise ValueError("Unsupported index")

    now = time.time()
    cache_entry = top_movers_cache.get(index)
    if cache_entry and cache_entry["expires_at"] > now:
        return cache_entry["data"]

    movers = []
    for stock in TOP_MOVER_UNIVERSES[index]:
        try:
            quote = fetch_quote(api_key, stock["ticker"])
        except RateLimitError:
            if not movers:
                raise
            break
        except Exception:
            continue

        movers.append(
            {
                "ticker": stock["ticker"],
                "name": stock["name"],
                "price": quote["price"],
                "change": quote["change"],
                "changePercent": _to_float(quote["change_percent"]),
                "volume": stock["volume"],
            }
        )

    payload = {
        "gainers": sorted(
            [stock for stock in movers if stock["changePercent"] >= 0],
            key=lambda item: item["changePercent"],
            reverse=True,
        )[:5],
        "losers": sorted(
            [stock for stock in movers if stock["changePercent"] < 0],
            key=lambda item: item["changePercent"],
        )[:5],
        "updatedAt": datetime.now(timezone.utc).isoformat(),
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
            quote = fetch_quote(api_key, item["ticker"])
            history = fetch_history(api_key, item["ticker"])
            day_open = history[0]["open"] if history else None
            day_high = max((point["high"] for point in history), default=None)
            day_low = min((point["low"] for point in history), default=None)
            day_volume = sum(point["volume"] for point in history) if history else None
            history_points = [{"time": point["time"], "price": point["price"]} for point in history]
            indices.append(
                {
                    "name": item["name"],
                    "ticker": item["ticker"],
                    "price": quote["price"],
                    "change": quote["change"],
                    "changePercent": _to_float(quote["change_percent"]),
                    "open": day_open,
                    "high": day_high,
                    "low": day_low,
                    "volume": day_volume,
                    "region": item["region"],
                    "status": _market_status(item["region"]),
                    "history": history_points,
                    "available": True,
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
