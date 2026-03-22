import csv
import io
import json
import time
from collections import Counter
from datetime import datetime, timezone
from urllib import parse, request as urlrequest
from urllib.error import HTTPError


ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"
MARKET_CACHE_TTL_SECONDS = 300
STOCK_QUOTE_CACHE_TTL_SECONDS = 300
STOCK_HISTORY_CACHE_TTL_SECONDS = 900
EARNINGS_CACHE_TTL_SECONDS = 3600

SUPPORTED_TICKERS = {
    "BARC.L": {"name": "Barclays PLC", "bucket": "FTSE100"},
    "BP.L": {"name": "BP PLC", "bucket": "FTSE100"},
    "GSK.L": {"name": "GSK PLC", "bucket": "FTSE100"},
    "HSBA.L": {"name": "HSBC Holdings PLC", "bucket": "FTSE100"},
    "LLOY.L": {"name": "Lloyds Banking Group PLC", "bucket": "FTSE100"},
    "REL.L": {"name": "RELX PLC", "bucket": "FTSE100"},
    "RIO.L": {"name": "Rio Tinto PLC", "bucket": "FTSE100"},
    "SHEL.L": {"name": "Shell PLC", "bucket": "FTSE100"},
    "TSCO.L": {"name": "Tesco PLC", "bucket": "FTSE100"},
    "ULVR.L": {"name": "Unilever PLC", "bucket": "FTSE100"},
    "VOD.L": {"name": "Vodafone Group PLC", "bucket": "FTSE100"},
    "AHT.L": {"name": "Ashtead Group PLC", "bucket": "FTSE100"},
    "BAB.L": {"name": "Babcock International Group PLC", "bucket": "FTSE250"},
    "EZJ.L": {"name": "easyJet PLC", "bucket": "FTSE250"},
    "HOC.L": {"name": "Hochschild Mining PLC", "bucket": "FTSE250"},
    "ITRK.L": {"name": "Intertek Group PLC", "bucket": "FTSE250"},
    "PNN.L": {"name": "Pennon Group PLC", "bucket": "FTSE250"},
    "TBCG.L": {"name": "TBC Bank Group PLC", "bucket": "FTSE250"},
    "AAPL": {"name": "Apple Inc.", "bucket": "Global"},
    "AMZN": {"name": "Amazon.com Inc.", "bucket": "Global"},
    "GOOGL": {"name": "Alphabet Inc.", "bucket": "Global"},
    "META": {"name": "Meta Platforms Inc.", "bucket": "Global"},
    "MSFT": {"name": "Microsoft Corp.", "bucket": "Global"},
    "NFLX": {"name": "Netflix Inc.", "bucket": "Global"},
    "NVDA": {"name": "NVIDIA Corp.", "bucket": "Global"},
    "TSLA": {"name": "Tesla Inc.", "bucket": "Global"},
    "SPY": {"name": "SPDR S&P 500 ETF Trust", "bucket": "Proxy"},
    "DIA": {"name": "SPDR Dow Jones Industrial Average ETF Trust", "bucket": "Proxy"},
    "EWU": {"name": "iShares MSCI United Kingdom ETF", "bucket": "Proxy"},
    "EWG": {"name": "iShares MSCI Germany ETF", "bucket": "Proxy"},
    "EWQ": {"name": "iShares MSCI France ETF", "bucket": "Proxy"},
    "EWH": {"name": "iShares MSCI Hong Kong ETF", "bucket": "Proxy"},
    "EWJ": {"name": "iShares MSCI Japan ETF", "bucket": "Proxy"},
}

MARKET_OVERVIEW_INDICES = [
    {"name": "FTSE 100", "ticker": "FTSE 100", "region": "Europe", "source_symbol": "EWU", "source_type": "proxy_etf", "source_label": "iShares MSCI United Kingdom ETF proxy"},
    {"name": "S&P 500", "ticker": "S&P 500", "region": "US", "source_symbol": "SPY", "source_type": "proxy_etf", "source_label": "SPDR S&P 500 ETF Trust proxy"},
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


def is_supported_symbol(symbol: str) -> bool:
    return normalize_symbol(symbol) in SUPPORTED_TICKERS


def get_supported_symbol_name(symbol: str) -> str:
    normalized = normalize_symbol(symbol)
    return SUPPORTED_TICKERS.get(normalized, {}).get("name", normalized)


def get_supported_symbols(bucket: str | None = None):
    if bucket is None:
        return set(SUPPORTED_TICKERS.keys())
    return {symbol for symbol, meta in SUPPORTED_TICKERS.items() if meta["bucket"] == bucket}


def _get_cache_entry(cache, key, now):
    entry = cache.get(key)
    if not entry:
        return None, None
    return entry, entry["data"] if entry["expires_at"] > now else None


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
    if not is_supported_symbol(normalized):
        raise ValueError("Unsupported symbol")

    cache_entry, fresh_data = _get_cache_entry(stock_quote_cache, normalized, now)
    if fresh_data is not None:
        return fresh_data

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
        if cache_entry:
            return cache_entry["data"]
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
    if not is_supported_symbol(normalized):
        raise ValueError("Unsupported symbol")

    cache_entry, fresh_data = _get_cache_entry(stock_history_cache, normalized, now)
    if fresh_data is not None:
        return fresh_data

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
        if cache_entry:
            return cache_entry["data"]
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
        if normalized and is_supported_symbol(normalized) and normalized not in requested:
            requested.append(normalized)

    cache_key = ",".join(sorted(requested))
    now = time.time()
    cache_entry, fresh_data = _get_cache_entry(market_cache, cache_key, now)
    if fresh_data is not None:
        return fresh_data

    quotes = {}
    for ticker in requested:
        try:
            quote = fetch_quote(api_key, ticker)
            quotes[ticker] = {
                "price": quote["price"],
                "change": quote["change"],
                "changePercent": _to_float(quote["change_percent"]),
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
        except RateLimitError:
            if cache_entry:
                return cache_entry["data"]
            raise

    market_cache[cache_key] = {
        "data": quotes,
        "expires_at": now + MARKET_CACHE_TTL_SECONDS,
    }
    return quotes


def fetch_top_movers(api_key: str, index: str, community_counts: Counter | None = None):
    if index not in {"FTSE100", "FTSE250", "Global"}:
        raise ValueError("Unsupported index")

    now = time.time()
    cache_entry, fresh_data = _get_cache_entry(top_movers_cache, index, now)
    if fresh_data is not None:
        return fresh_data

    if index != "Global":
        supported_bucket = get_supported_symbols(index)
        ranked_symbols = [
            symbol for symbol, _count in (community_counts or Counter()).most_common()
            if symbol in supported_bucket
        ][:6]

        if not ranked_symbols:
            payload = {
                "gainers": [],
                "losers": [],
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "supported": False,
                "message": "No community-active FTSE names yet. Mention a supported ticker like #BARC.L in chat.",
            }
            top_movers_cache[index] = {
                "data": payload,
                "expires_at": now + MARKET_CACHE_TTL_SECONDS,
            }
            return payload

        quote_map = fetch_bulk_quotes(api_key, ranked_symbols)
        movers = []
        for symbol in ranked_symbols:
            quote = quote_map.get(symbol)
            if not quote:
                continue
            movers.append(
                {
                    "ticker": symbol,
                    "name": get_supported_symbol_name(symbol),
                    "price": quote["price"],
                    "change": quote["change"],
                    "changePercent": quote["changePercent"],
                    "volume": max(community_counts.get(symbol, 0), 1),
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
            "supported": True,
            "message": "Showing most-mentioned supported FTSE names in the TradeLink community.",
        }
        top_movers_cache[index] = {
            "data": payload,
            "expires_at": now + MARKET_CACHE_TTL_SECONDS,
        }
        return payload

    try:
        payload = _alpha_vantage_request({"function": "TOP_GAINERS_LOSERS", "apikey": api_key})
    except RateLimitError:
        if cache_entry:
            return cache_entry["data"]
        raise

    def _normalize_movers(entries):
        normalized_entries = []
        for entry in entries[:5]:
            symbol = normalize_symbol(entry.get("ticker") or "")
            if symbol not in get_supported_symbols("Global"):
                continue
            normalized_entries.append(
                {
                    "ticker": symbol,
                    "name": get_supported_symbol_name(symbol),
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
    if not payload["gainers"] and not payload["losers"]:
        payload["message"] = "No supported curated global movers are available from Alpha Vantage right now."

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
    now = time.time()
    cache_entry, fresh_data = _get_cache_entry(market_cache, "overview", now)
    if fresh_data is not None:
        return fresh_data

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
        except RateLimitError:
            if cache_entry:
                return cache_entry["data"]
            raise
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

    payload = {
        "indices": indices,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "sectors_available": False,
        "sectors": [],
    }
    market_cache["overview"] = {
        "data": payload,
        "expires_at": now + MARKET_CACHE_TTL_SECONDS,
    }
    return payload


def fetch_upcoming_earnings(api_key: str):
    now = time.time()
    cache_entry, fresh_data = _get_cache_entry(earnings_cache, "upcoming", now)
    if fresh_data is not None:
        return fresh_data

    try:
        payload = _alpha_vantage_request(
            {
                "function": "EARNINGS_CALENDAR",
                "horizon": "3month",
                "apikey": api_key,
            }
        )
    except RateLimitError:
        if cache_entry:
            return cache_entry["data"]
        raise

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
