import json
import time
from datetime import datetime, timezone
from urllib import parse, request as urlrequest
from urllib.error import HTTPError


FINNHUB_BASE_URL = "https://finnhub.io/api/v1"
MARKET_CACHE_TTL_SECONDS = 21600
STOCK_QUOTE_CACHE_TTL_SECONDS = 43200
STOCK_HISTORY_CACHE_TTL_SECONDS = 43200
EARNINGS_CACHE_TTL_SECONDS = 43200
ALPHA_VANTAGE_DAILY_BUDGET = 25
ALPHA_VANTAGE_BUDGET_WINDOW_SECONDS = 86400
ALPHA_VANTAGE_FAILURE_BACKOFF_SECONDS = 21600
ALPHA_VANTAGE_DIAGNOSTIC_HISTORY_LIMIT = 25
ALPHA_VANTAGE_MIN_REQUEST_SPACING_SECONDS = 1.0
MARKET_REFRESH_BATCH_LIMIT = 5
MARKET_REFRESH_BUFFER = 5

SUPPORTED_TICKERS = {
    "LLOY": {"name": "Lloyds Banking Group", "bucket": "FTSE100", "provider_symbol": "LLOY.L", "aliases": ["LLOY", "LLOY.L", "LLOY.LON"]},
    "LGEN": {"name": "Legal & General", "bucket": "FTSE100", "provider_symbol": "LGEN.L", "aliases": ["LGEN", "LGEN.L", "LGEN.LON"]},
    "BP.": {"name": "BP", "bucket": "FTSE100", "provider_symbol": "BP.L", "aliases": ["BP.", "BP", "BP.L", "BP.LON"]},
    "RR.": {"name": "Rolls-Royce Holdings", "bucket": "FTSE100", "provider_symbol": "RR.L", "aliases": ["RR.", "RR", "RR.L", "RR.LON"]},
    "SHEL": {"name": "Shell", "bucket": "FTSE100", "provider_symbol": "SHEL.L", "aliases": ["SHEL", "SHEL.L", "SHEL.LON"]},
    "BARC": {"name": "Barclays", "bucket": "FTSE100", "provider_symbol": "BARC.L", "aliases": ["BARC", "BARC.L", "BARC.LON"]},
    "NWG": {"name": "NatWest Group", "bucket": "FTSE100", "provider_symbol": "NWG.L", "aliases": ["NWG", "NWG.L", "NWG.LON"]},
    "HSBA": {"name": "HSBC Holdings", "bucket": "FTSE100", "provider_symbol": "HSBA.L", "aliases": ["HSBA", "HSBA.L", "HSBA.LON"]},
    "AZN": {"name": "AstraZeneca", "bucket": "FTSE100", "provider_symbol": "AZN.L", "aliases": ["AZN", "AZN.L", "AZN.LON"]},
    "VOD": {"name": "Vodafone Group", "bucket": "FTSE100", "provider_symbol": "VOD.L", "aliases": ["VOD", "VOD.L", "VOD.LON"]},
    "BT.A": {"name": "BT Group", "bucket": "FTSE100", "provider_symbol": "BTA.L", "aliases": ["BT.A", "BTA", "BT-A.L", "BTA.LON"]},
    "GSK": {"name": "GSK", "bucket": "FTSE100", "provider_symbol": "GSK.L", "aliases": ["GSK", "GSK.L", "GSK.LON"]},
    "AV.": {"name": "Aviva", "bucket": "FTSE100", "provider_symbol": "AV.L", "aliases": ["AV.", "AV", "AV.L", "AV.LON"]},
    "TSCO": {"name": "Tesco", "bucket": "FTSE100", "provider_symbol": "TSCO.L", "aliases": ["TSCO", "TSCO.L", "TSCO.LON"]},
    "ULVR": {"name": "Unilever", "bucket": "FTSE100", "provider_symbol": "ULVR.L", "aliases": ["ULVR", "ULVR.L", "ULVR.LON"]},
    "RIO": {"name": "Rio Tinto", "bucket": "FTSE100", "provider_symbol": "RIO.L", "aliases": ["RIO", "RIO.L", "RIO.LON"]},
    "GLEN": {"name": "Glencore", "bucket": "FTSE100", "provider_symbol": "GLEN.L", "aliases": ["GLEN", "GLEN.L", "GLEN.LON"]},
    "BATS": {"name": "British American Tobacco", "bucket": "FTSE100", "provider_symbol": "BATS.L", "aliases": ["BATS", "BATS.L", "BATS.LON"]},
    "STAN": {"name": "Standard Chartered", "bucket": "FTSE100", "provider_symbol": "STAN.L", "aliases": ["STAN", "STAN.L", "STAN.LON"]},
    "MNG": {"name": "M&G", "bucket": "FTSE100", "provider_symbol": "MNG.L", "aliases": ["MNG", "MNG.L", "MNG.LON"]},
    "EWU": {"name": "iShares MSCI United Kingdom ETF", "bucket": "Proxy", "provider_symbol": "EWU", "aliases": ["EWU"]},
    "SPY": {"name": "SPDR S&P 500 ETF Trust", "bucket": "Proxy", "provider_symbol": "SPY", "aliases": ["SPY"]},
}

SUPPORTED_SYMBOL_ALIASES = {}
for canonical_symbol, metadata in SUPPORTED_TICKERS.items():
    SUPPORTED_SYMBOL_ALIASES[canonical_symbol] = canonical_symbol
    for alias in metadata.get("aliases", []):
        SUPPORTED_SYMBOL_ALIASES[alias.upper()] = canonical_symbol

MARKET_OVERVIEW_INDICES = [
    {"name": "FTSE 100", "ticker": "FTSE 100", "region": "Europe", "source_symbol": "EWU", "source_type": "proxy_etf", "source_label": "iShares MSCI United Kingdom ETF proxy"},
    {"name": "S&P 500", "ticker": "S&P 500", "region": "US", "source_symbol": "SPY", "source_type": "proxy_etf", "source_label": "SPDR S&P 500 ETF Trust proxy"},
]

PRIMARY_BASELINE_SYMBOL = "SPY"

market_cache = {}
top_movers_cache = {}
stock_quote_cache = {}
stock_history_cache = {}
earnings_cache = {}
market_refresh_state = {}
provider_request_state = {
    "last_started_at": None,
}
provider_budget_state = {
    "window_started_at": time.time(),
    "calls_used": 0,
    "daily_budget": ALPHA_VANTAGE_DAILY_BUDGET,
    "last_request_at": None,
}
provider_failure_state = {}
provider_diagnostic_history = []


class RateLimitError(RuntimeError):
    pass


class ProviderRequestError(RuntimeError):
    def __init__(
        self,
        reason: str,
        error_class: str,
        *,
        reached_upstream: bool,
        counted_budget: bool,
        upstream_status: int | None = None,
        symbol: str | None = None,
        function: str | None = None,
    ):
        super().__init__(reason)
        self.reason = reason
        self.error_class = error_class
        self.reached_upstream = reached_upstream
        self.counted_budget = counted_budget
        self.upstream_status = upstream_status
        self.symbol = symbol
        self.function = function


class ProviderBackoffError(ProviderRequestError):
    pass


def _isoformat_timestamp(timestamp):
    if not timestamp:
        return None
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()


def _reset_budget_window_if_needed(now):
    if now - provider_budget_state["window_started_at"] >= ALPHA_VANTAGE_BUDGET_WINDOW_SECONDS:
        provider_budget_state["window_started_at"] = now
        provider_budget_state["calls_used"] = 0
        provider_budget_state["last_request_at"] = None


def _budget_remaining(now):
    _reset_budget_window_if_needed(now)
    return max(provider_budget_state["daily_budget"] - provider_budget_state["calls_used"], 0)


def _record_provider_request(now):
    _reset_budget_window_if_needed(now)
    provider_budget_state["calls_used"] += 1
    provider_budget_state["last_request_at"] = now


def _wait_for_request_slot():
    last_started_at = provider_request_state.get("last_started_at")
    now = time.time()
    if last_started_at is None:
        provider_request_state["last_started_at"] = now
        return
    elapsed = now - last_started_at
    if elapsed < ALPHA_VANTAGE_MIN_REQUEST_SPACING_SECONDS:
        time.sleep(ALPHA_VANTAGE_MIN_REQUEST_SPACING_SECONDS - elapsed)
    provider_request_state["last_started_at"] = time.time()


def _record_refresh_state(key, cache_name, expires_at):
    market_refresh_state[key] = {
        "last_refresh_at": _isoformat_timestamp(time.time()),
        "cache_name": cache_name,
        "expires_at": _isoformat_timestamp(expires_at),
    }


def _append_diagnostic_entry(entry):
    provider_diagnostic_history.insert(0, entry)
    del provider_diagnostic_history[ALPHA_VANTAGE_DIAGNOSTIC_HISTORY_LIMIT:]


def _failure_state_key(function_name: str | None, symbol: str | None):
    return f"{function_name or 'unknown'}:{symbol or '*'}"


def _register_failure(function_name: str | None, symbol: str | None, reason: str, error_class: str):
    provider_failure_state[_failure_state_key(function_name, symbol)] = {
        "reason": reason,
        "error_class": error_class,
        "failed_at": time.time(),
    }


def _clear_failure(function_name: str | None, symbol: str | None):
    provider_failure_state.pop(_failure_state_key(function_name, symbol), None)


def _failure_backoff_entry(function_name: str | None, symbol: str | None):
    entry = provider_failure_state.get(_failure_state_key(function_name, symbol))
    if not entry:
        return None
    if time.time() - entry["failed_at"] > ALPHA_VANTAGE_FAILURE_BACKOFF_SECONDS:
        _clear_failure(function_name, symbol)
        return None
    return entry


def _record_diagnostic(
    *,
    symbol: str | None,
    function_name: str | None,
    reached_upstream: bool,
    counted_budget: bool,
    status: str,
    error_class: str | None = None,
    message: str | None = None,
    upstream_status: int | None = None,
):
    _append_diagnostic_entry(
        {
            "timestamp": _isoformat_timestamp(time.time()),
            "symbol": symbol,
            "function": function_name,
            "reached_upstream": reached_upstream,
            "counted_budget": counted_budget,
            "status": status,
            "error_class": error_class,
            "message": message,
            "upstream_status": upstream_status,
        }
    )


def get_market_debug_status():
    now = time.time()
    remaining = _budget_remaining(now)
    return {
        "daily_calls_used": provider_budget_state["calls_used"],
        "daily_calls_remaining": remaining,
        "daily_budget": provider_budget_state["daily_budget"],
        "window_started_at": _isoformat_timestamp(provider_budget_state["window_started_at"]),
        "last_request_at": _isoformat_timestamp(provider_budget_state["last_request_at"]),
        "rate_limited_mode": remaining <= 0,
        "last_refresh": market_refresh_state,
        "recent_diagnostics": provider_diagnostic_history,
        "failure_backoff_seconds": ALPHA_VANTAGE_FAILURE_BACKOFF_SECONDS,
        "active_failure_backoffs": [
            {
                "request_key": request_key,
                "reason": entry["reason"],
                "error_class": entry["error_class"],
                "failed_at": _isoformat_timestamp(entry["failed_at"]),
            }
            for request_key, entry in provider_failure_state.items()
            if time.time() - entry["failed_at"] <= ALPHA_VANTAGE_FAILURE_BACKOFF_SECONDS
        ],
    }


def get_finnhub_api_key():
    from os import getenv
    return (getenv("FINNHUB_API_KEY") or getenv("ALPHA_VANTAGE_API_KEY") or "").strip()


def get_finnhub_env_diagnostics():
    from os import getenv

    finnhub_raw = getenv("FINNHUB_API_KEY")
    legacy_raw = getenv("ALPHA_VANTAGE_API_KEY")
    raw_value = finnhub_raw if finnhub_raw is not None else legacy_raw
    normalized = (raw_value or "").strip()
    return {
        "env_var_name": "FINNHUB_API_KEY",
        "present": raw_value is not None,
        "non_empty": bool(normalized),
        "key_length": len(normalized),
        "legacy_fallback_used": finnhub_raw is None and legacy_raw is not None,
    }


def normalize_symbol(symbol: str) -> str:
    return (symbol or "").strip().upper()


def canonicalize_symbol(symbol: str) -> str:
    normalized = normalize_symbol(symbol)
    return SUPPORTED_SYMBOL_ALIASES.get(normalized, normalized)


def is_supported_symbol(symbol: str) -> bool:
    return canonicalize_symbol(symbol) in SUPPORTED_TICKERS


def get_supported_symbol_name(symbol: str) -> str:
    normalized = canonicalize_symbol(symbol)
    return SUPPORTED_TICKERS.get(normalized, {}).get("name", normalized)


def get_provider_symbol(symbol: str) -> str:
    canonical = canonicalize_symbol(symbol)
    return SUPPORTED_TICKERS.get(canonical, {}).get("provider_symbol", canonical)


def get_supported_symbols(bucket: str | None = None):
    if bucket is None:
        return set(SUPPORTED_TICKERS.keys())
    return {symbol for symbol, meta in SUPPORTED_TICKERS.items() if meta["bucket"] == bucket}


def _get_cache_entry(cache, key, now):
    entry = cache.get(key)
    if not entry:
        return None, None
    return entry, entry["data"] if entry["expires_at"] > now else None


def _get_any_cached_data(cache, key):
    entry = cache.get(key)
    if not entry:
        return None
    return entry.get("data")


def _cache_status_payload(cache_entry, source: str, now):
    if not cache_entry:
        return {
            "source": source,
            "isCachedFallback": False,
            "lastUpdatedAt": None,
            "message": None,
        }

    expires_at = cache_entry.get("expires_at")
    is_stale = bool(expires_at and expires_at <= now)
    return {
        "source": source,
        "isCachedFallback": is_stale,
        "lastUpdatedAt": _isoformat_timestamp(cache_entry.get("updated_at")),
        "message": "Showing most recent available data." if is_stale else None,
    }


def _store_cache_entry(cache, key, data, expires_at, updated_at):
    cache[key] = {
        "data": data,
        "expires_at": expires_at,
        "updated_at": updated_at,
    }


def _load_snapshot_entry(snapshot_loader, key):
    if not snapshot_loader:
        return None
    snapshot = snapshot_loader(key)
    if not snapshot:
        return None
    return {
        "data": snapshot.get("data"),
        "expires_at": 0,
        "updated_at": snapshot.get("updated_at"),
    }


def _persist_snapshot(snapshot_saver, key, data, updated_at):
    if snapshot_saver:
        snapshot_saver(key, data, updated_at)


def _snapshot_updated_at(snapshot_loader, key):
    snapshot_entry = _load_snapshot_entry(snapshot_loader, key)
    if not snapshot_entry:
        return None
    return snapshot_entry.get("updated_at")


def _overview_has_available_data(payload):
    if not isinstance(payload, dict):
        return False
    indices = payload.get("indices")
    if not isinstance(indices, list) or not indices:
        return False
    return any(isinstance(index, dict) and index.get("available") for index in indices)


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


def _finnhub_request(path, params, *, endpoint_name: str, symbol: str | None = None):
    now = time.time()
    normalized_symbol = canonicalize_symbol(symbol or params.get("symbol", "")) or None
    function_name = endpoint_name

    backoff_entry = _failure_backoff_entry(function_name, normalized_symbol)
    if backoff_entry:
        reason = f"request backoff active after previous {backoff_entry['error_class']}"
        _record_diagnostic(
            symbol=normalized_symbol,
            function_name=function_name,
            reached_upstream=False,
            counted_budget=False,
            status="backoff_blocked",
            error_class="backoff",
            message=reason,
        )
        raise ProviderBackoffError(
            reason,
            "backoff",
            reached_upstream=False,
            counted_budget=False,
            symbol=normalized_symbol,
            function=function_name,
        )

    if _budget_remaining(now) <= 0:
        _record_diagnostic(
            symbol=normalized_symbol,
            function_name=function_name,
            reached_upstream=False,
            counted_budget=False,
            status="budget_exhausted",
            error_class="rate_limit",
            message="daily budget exhausted",
        )
        raise RateLimitError("daily budget exhausted")

    _wait_for_request_slot()
    query = dict(params)
    query["token"] = get_finnhub_api_key()
    url = f"{FINNHUB_BASE_URL}{path}?{parse.urlencode(query)}"
    req = urlrequest.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "TradeLink/1.0 (+render-backend)",
        },
    )

    try:
        with urlrequest.urlopen(req, timeout=8) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="ignore")
        try:
            error_payload = json.loads(raw_body) if raw_body else {}
            message = error_payload.get("message") or error_payload.get("error")
        except Exception:
            message = None
        _record_provider_request(now)
        reason = message or f"HTTP Error {exc.code}: {exc.reason}"
        error_class = "unauthorized" if exc.code in {401, 403} else "http_error"
        _register_failure(function_name, normalized_symbol, reason, error_class)
        _record_diagnostic(
            symbol=normalized_symbol,
            function_name=function_name,
            reached_upstream=True,
            counted_budget=True,
            status="failed",
            error_class=error_class,
            message=reason,
            upstream_status=exc.code,
        )
        raise ProviderRequestError(
            reason,
            error_class,
            reached_upstream=True,
            counted_budget=True,
            upstream_status=exc.code,
            symbol=normalized_symbol,
            function=function_name,
        ) from exc
    except TimeoutError as exc:
        reason = "request timed out"
        _register_failure(function_name, normalized_symbol, reason, "timeout")
        _record_diagnostic(
            symbol=normalized_symbol,
            function_name=function_name,
            reached_upstream=False,
            counted_budget=False,
            status="failed",
            error_class="timeout",
            message=reason,
        )
        raise ProviderRequestError(
            reason,
            "timeout",
            reached_upstream=False,
            counted_budget=False,
            symbol=normalized_symbol,
            function=function_name,
        ) from exc
    except Exception as exc:
        reason = str(exc) or exc.__class__.__name__
        _register_failure(function_name, normalized_symbol, reason, "network_error")
        _record_diagnostic(
            symbol=normalized_symbol,
            function_name=function_name,
            reached_upstream=False,
            counted_budget=False,
            status="failed",
            error_class="network_error",
            message=reason,
        )
        raise ProviderRequestError(
            reason,
            "network_error",
            reached_upstream=False,
            counted_budget=False,
            symbol=normalized_symbol,
            function=function_name,
        ) from exc

    _record_provider_request(now)

    payload = json.loads(body)
    if payload.get("error"):
        reason = payload.get("error")
        error_class = "rate_limit" if "limit" in reason.lower() else "provider_error"
        _register_failure(function_name, normalized_symbol, reason, error_class)
        _record_diagnostic(
            symbol=normalized_symbol,
            function_name=function_name,
            reached_upstream=True,
            counted_budget=True,
            status="failed",
            error_class=error_class,
            message=reason,
        )
        if error_class == "rate_limit":
            raise RateLimitError(reason)
        raise ProviderRequestError(
            reason,
            error_class,
            reached_upstream=True,
            counted_budget=True,
            symbol=normalized_symbol,
            function=function_name,
        )

    _clear_failure(function_name, normalized_symbol)
    _record_diagnostic(
        symbol=normalized_symbol,
        function_name=function_name,
        reached_upstream=True,
        counted_budget=True,
        status="success",
        message="json payload received",
    )
    return payload


def _parse_finnhub_quote(payload):
    price = _to_float(payload.get("c"), None)
    previous_close = _to_float(payload.get("pc"), None)
    if price in (None, 0.0) and previous_close in (None, 0, 0.0):
        raise ProviderRequestError(
            "quote payload was empty",
            "empty_payload",
            reached_upstream=True,
            counted_budget=True,
        )
    return {
        "price": price,
        "change": _to_float(payload.get("d"), None),
        "change_percent": _to_float(payload.get("dp"), None),
        "high": _to_float(payload.get("h"), None),
        "low": _to_float(payload.get("l"), None),
        "open": _to_float(payload.get("o"), None),
        "previous_close": previous_close,
        "timestamp": payload.get("t"),
    }


def diagnose_quote_request(api_key: str, symbol: str):
    normalized = canonicalize_symbol(symbol)
    if not normalized:
        return {
            "symbol": symbol,
            "normalized_symbol": normalized,
            "supported": False,
            "status": "invalid",
            "message": "symbol is required",
        }
    if not is_supported_symbol(normalized):
        return {
            "symbol": symbol,
            "normalized_symbol": normalized,
            "supported": False,
            "status": "unsupported",
            "message": "unsupported symbol",
        }

    provider_symbol = get_provider_symbol(normalized)
    attempts = []
    try:
        payload = _finnhub_request(
            "/quote",
            {"symbol": provider_symbol},
            endpoint_name="quote",
            symbol=normalized,
        )
        _parse_finnhub_quote(payload)
        attempts.append(
            {
                "function": "quote",
                "status": "success",
                "reached_upstream": True,
                "counted_budget": True,
                "message": "request succeeded",
                "provider_symbol": provider_symbol,
            }
        )
        return {
            "symbol": symbol,
            "normalized_symbol": normalized,
            "supported": True,
            "status": "success",
            "attempts": attempts,
            "payload_shape": list(payload.keys())[:8] if isinstance(payload, dict) else None,
        }
    except RateLimitError as exc:
        attempts.append(
            {
                "function": "quote",
                "status": "failed",
                "error_class": "rate_limit",
                "reached_upstream": False if "budget exhausted" in str(exc).lower() else True,
                "counted_budget": False if "budget exhausted" in str(exc).lower() else True,
                "message": str(exc),
                "provider_symbol": provider_symbol,
            }
        )
    except ProviderRequestError as exc:
        attempts.append(
            {
                "function": "quote",
                "status": "failed",
                "error_class": exc.error_class,
                "reached_upstream": exc.reached_upstream,
                "counted_budget": exc.counted_budget,
                "upstream_status": exc.upstream_status,
                "message": exc.reason,
                "provider_symbol": provider_symbol,
            }
        )
    except Exception as exc:
        attempts.append(
            {
                "function": "quote",
                "status": "failed",
                "error_class": exc.__class__.__name__,
                "reached_upstream": False,
                "counted_budget": False,
                "message": str(exc),
                "provider_symbol": provider_symbol,
            }
        )

    return {
        "symbol": symbol,
        "normalized_symbol": normalized,
        "supported": True,
        "status": "failed",
        "attempts": attempts,
    }


def _snapshot_status(updated_at, available: bool, *, message: str | None = None):
    return {
        "source": "cache",
        "isCachedFallback": bool(available),
        "lastUpdatedAt": _isoformat_timestamp(updated_at),
        "message": message if available else "Live market data is limited in this prototype and may not be available right now.",
    }


def _build_quote_snapshot_key(symbol: str) -> str:
    return f"quote:{canonicalize_symbol(symbol)}"


def _build_history_snapshot_key(symbol: str) -> str:
    return f"history:{canonicalize_symbol(symbol)}"


def get_snapshot_quote(symbol: str, snapshot_loader=None):
    normalized = canonicalize_symbol(symbol)
    if not is_supported_symbol(normalized):
        raise ValueError("This ticker is not part of the supported prototype universe.")

    cache_entry, fresh_data = _get_cache_entry(stock_quote_cache, normalized, time.time())
    if fresh_data is not None:
        return fresh_data, cache_entry.get("updated_at")

    snapshot_entry = _load_snapshot_entry(snapshot_loader, _build_quote_snapshot_key(normalized))
    if snapshot_entry and snapshot_entry.get("data"):
        _store_cache_entry(
            stock_quote_cache,
            normalized,
            snapshot_entry["data"],
            time.time() + STOCK_QUOTE_CACHE_TTL_SECONDS,
            snapshot_entry.get("updated_at") or time.time(),
        )
        return snapshot_entry["data"], snapshot_entry.get("updated_at")

    return None, None


def get_snapshot_history(symbol: str, snapshot_loader=None):
    normalized = canonicalize_symbol(symbol)
    if not is_supported_symbol(normalized):
        raise ValueError("This ticker is not part of the supported prototype universe.")

    cache_entry, fresh_data = _get_cache_entry(stock_history_cache, normalized, time.time())
    if fresh_data is not None:
        return fresh_data, cache_entry.get("updated_at")

    snapshot_entry = _load_snapshot_entry(snapshot_loader, _build_history_snapshot_key(normalized))
    if snapshot_entry and snapshot_entry.get("data"):
        _store_cache_entry(
            stock_history_cache,
            normalized,
            snapshot_entry["data"],
            time.time() + STOCK_HISTORY_CACHE_TTL_SECONDS,
            snapshot_entry.get("updated_at") or time.time(),
        )
        return snapshot_entry["data"], snapshot_entry.get("updated_at")

    return [], None


def fetch_quote(api_key: str, symbol: str, snapshot_loader=None, snapshot_saver=None):
    now = time.time()
    data, updated_at = get_snapshot_quote(symbol, snapshot_loader=snapshot_loader)
    normalized = canonicalize_symbol(symbol)
    if data:
        return {
            **data,
            "marketDataStatus": _snapshot_status(updated_at, True, message="Showing most recent available data."),
        }
    return {
        "symbol": normalized,
        "price": None,
        "change": None,
        "change_percent": "Unavailable",
        "marketDataStatus": _snapshot_status(updated_at, False),
    }


def fetch_history(api_key: str, symbol: str, snapshot_loader=None, snapshot_saver=None):
    points, updated_at = get_snapshot_history(symbol, snapshot_loader=snapshot_loader)
    return {
        "points": points,
        "marketDataStatus": _snapshot_status(updated_at, bool(points), message="Showing most recent available data." if points else None),
    }


def fetch_bulk_quotes(api_key: str, tickers, snapshot_loader=None, snapshot_saver=None):
    quotes = {}
    last_updated_at = None
    for ticker in tickers:
        normalized = canonicalize_symbol(ticker)
        if not is_supported_symbol(normalized):
            continue
        quote, updated_at = get_snapshot_quote(normalized, snapshot_loader=snapshot_loader)
        if not quote:
            continue
        quotes[normalized] = {
            "price": quote["price"],
            "change": quote["change"],
            "changePercent": _to_float(quote["change_percent"]),
            "updatedAt": _isoformat_timestamp(updated_at),
        }
        if updated_at and (last_updated_at is None or updated_at > last_updated_at):
            last_updated_at = updated_at
    return {
        "quotes": quotes,
        "marketDataStatus": _snapshot_status(last_updated_at, bool(quotes), message="Showing most recent available data." if quotes else None),
    }


def fetch_top_movers(api_key: str, index: str, community_entries: list[dict] | None = None, window_days: int = 7):
    if index not in {"FTSE100", "FTSE250", "Global"}:
        raise ValueError("Unsupported index")

    now = time.time()
    cache_entry, fresh_data = _get_cache_entry(top_movers_cache, index, now)
    if fresh_data is not None:
        return fresh_data

    supported_bucket = get_supported_symbols(index)
    ranked_entries = [
        entry for entry in (community_entries or [])
        if entry["symbol"] in supported_bucket
    ][:8]
    ranked_symbols = [entry["symbol"] for entry in ranked_entries]

    if not ranked_symbols:
        scope_label = {
            "FTSE100": "supported FTSE 100 names",
            "FTSE250": "supported FTSE 250 names",
            "Global": "curated global names",
        }[index]
        payload = {
            "items": [],
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "supported": False,
            "message": "Mention a ticker like #BARC or $AAPL to start.",
            "windowDays": window_days,
            "marketDataStatus": {
                "source": "internal",
                "isCachedFallback": False,
                "lastUpdatedAt": datetime.now(timezone.utc).isoformat(),
                "message": None,
            },
        }
        _store_cache_entry(top_movers_cache, index, payload, now + MARKET_CACHE_TTL_SECONDS, now)
        return payload

    discussed_items = []
    entry_map = {entry["symbol"]: entry for entry in ranked_entries}
    for symbol in ranked_symbols:
        quote = _get_any_cached_data(stock_quote_cache, symbol)
        discussion_entry = entry_map.get(symbol, {})
        discussed_items.append(
            {
                "ticker": symbol,
                "name": get_supported_symbol_name(symbol),
                "price": quote["price"] if quote else None,
                "change": quote["change"] if quote else None,
                "changePercent": _to_float(quote["change_percent"]) if quote else None,
                "volume": 0,
                "mentionCount": int(discussion_entry.get("mentions", 0)),
                "uniqueUsers": int(discussion_entry.get("unique_users", 0)),
                "watchlistAdds": int(discussion_entry.get("watchlist_adds", 0)),
            }
        )

    scope_message = {
        "FTSE100": "Most discussed supported FTSE 100 names in TradeLink over the last 7 days.",
        "FTSE250": "Most discussed supported FTSE 250 names in TradeLink over the last 7 days.",
        "Global": "Most discussed curated global names in TradeLink over the last 7 days.",
    }[index]
    payload = {
        "items": discussed_items,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "supported": True,
        "message": scope_message,
        "windowDays": window_days,
        "marketDataStatus": {
            "source": "internal",
            "isCachedFallback": False,
            "lastUpdatedAt": datetime.now(timezone.utc).isoformat(),
            "message": None,
        },
    }

    _store_cache_entry(top_movers_cache, index, payload, now + MARKET_CACHE_TTL_SECONDS, now)
    _record_refresh_state(f"most_discussed:{index}", "top_movers_cache", now + MARKET_CACHE_TTL_SECONDS)
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


def _daily_series_key(payload):
    for key in ("Time Series (Daily)", "Weekly Time Series", "Monthly Time Series"):
        if isinstance(payload, dict) and key in payload:
            return key
    return None


def _parse_daily_time_series(payload):
    return _parse_finnhub_quote(payload)


def _build_quote_payload(symbol: str, parsed_daily: dict):
    normalized = canonicalize_symbol(symbol)
    return {
        "symbol": normalized,
        "name": get_supported_symbol_name(normalized),
        "price": parsed_daily["price"],
        "change": parsed_daily["change"],
        "change_percent": parsed_daily["change_percent"],
        "high": parsed_daily["high"],
        "low": parsed_daily["low"],
        "open": parsed_daily["open"],
        "previous_close": parsed_daily["previous_close"],
        "volume": None,
        "providerSymbol": get_provider_symbol(normalized),
    }


def refresh_quote_snapshot(api_key: str, symbol: str, snapshot_saver=None):
    normalized = canonicalize_symbol(symbol)
    if not is_supported_symbol(normalized):
        return {
            "symbol": normalized or normalize_symbol(symbol),
            "provider_symbol": None,
            "status": "failed",
            "quote_attempted": False,
            "history_attempted": False,
            "quote_refreshed": False,
            "history_refreshed": False,
            "snapshot_stored": False,
            "counted_budget": False,
            "reached_upstream": False,
            "error_class": "unsupported_symbol",
            "message": "This ticker is not part of the supported prototype universe.",
        }

    provider_symbol = get_provider_symbol(normalized)
    now = time.time()
    result = {
        "symbol": normalized,
        "provider_symbol": provider_symbol,
        "status": "failed",
        "quote_attempted": True,
        "history_attempted": False,
        "quote_refreshed": False,
        "history_refreshed": False,
        "snapshot_stored": False,
        "counted_budget": False,
        "reached_upstream": False,
        "error_class": None,
        "message": None,
    }

    try:
        payload = _finnhub_request(
            "/quote",
            {"symbol": provider_symbol},
            endpoint_name="quote",
            symbol=normalized,
        )
        parsed_daily = _parse_daily_time_series(payload)
        quote_payload = _build_quote_payload(normalized, parsed_daily)
        _store_cache_entry(stock_quote_cache, normalized, quote_payload, now + STOCK_QUOTE_CACHE_TTL_SECONDS, now)
        _persist_snapshot(snapshot_saver, _build_quote_snapshot_key(normalized), quote_payload, now)
        _record_refresh_state(f"quote:{normalized}", "stock_quote_cache", now + STOCK_QUOTE_CACHE_TTL_SECONDS)

        result.update(
            {
                "status": "success",
                "quote_refreshed": True,
                "snapshot_stored": True,
                "counted_budget": True,
                "reached_upstream": True,
                "message": "quote snapshot refreshed",
                "updated_at": _isoformat_timestamp(now),
            }
        )
        return result
    except RateLimitError as exc:
        result.update(
            {
                "error_class": "rate_limit",
                "message": str(exc),
                "counted_budget": "budget exhausted" not in str(exc).lower(),
                "reached_upstream": "budget exhausted" not in str(exc).lower(),
            }
        )
        return result
    except ProviderRequestError as exc:
        result.update(
            {
                "error_class": exc.error_class,
                "message": exc.reason,
                "counted_budget": exc.counted_budget,
                "reached_upstream": exc.reached_upstream,
                "upstream_status": exc.upstream_status,
            }
        )
        return result
    except Exception as exc:
        result.update(
            {
                "error_class": exc.__class__.__name__,
                "message": str(exc) or "snapshot refresh failed",
                "counted_budget": False,
                "reached_upstream": False,
            }
        )
        return result


def refresh_history_snapshot(api_key: str, symbol: str, snapshot_loader=None, snapshot_saver=None):
    normalized = canonicalize_symbol(symbol)
    if not is_supported_symbol(normalized):
        return {
            "symbol": normalized or normalize_symbol(symbol),
            "provider_symbol": None,
            "status": "failed",
            "quote_attempted": False,
            "history_attempted": False,
            "quote_refreshed": False,
            "history_refreshed": False,
            "snapshot_stored": False,
            "counted_budget": False,
            "reached_upstream": False,
            "error_class": "unsupported_symbol",
            "message": "This ticker is not part of the supported prototype universe.",
        }

    quote_snapshot, _ = get_snapshot_quote(normalized, snapshot_loader=snapshot_loader)
    if not quote_snapshot:
        return {
            "symbol": normalized,
            "provider_symbol": get_provider_symbol(normalized),
            "status": "skipped",
            "quote_attempted": False,
            "history_attempted": False,
            "quote_refreshed": False,
            "history_refreshed": False,
            "snapshot_stored": False,
            "counted_budget": False,
            "reached_upstream": False,
            "error_class": None,
            "message": "history skipped until a quote snapshot exists",
        }

    provider_symbol = get_provider_symbol(normalized)
    now = time.time()
    result = {
        "symbol": normalized,
        "provider_symbol": provider_symbol,
        "status": "failed",
        "quote_attempted": False,
        "history_attempted": True,
        "quote_refreshed": False,
        "history_refreshed": False,
        "snapshot_stored": False,
        "counted_budget": False,
        "reached_upstream": False,
        "error_class": None,
        "message": None,
    }

    try:
        end_ts = int(time.time())
        start_ts = end_ts - (60 * 60 * 24 * 45)
        payload = _finnhub_request(
            "/stock/candle",
            {
                "symbol": provider_symbol,
                "resolution": "D",
                "from": start_ts,
                "to": end_ts,
            },
            endpoint_name="candle",
            symbol=normalized,
        )
        history_payload = _parse_finnhub_candles(payload)
        _store_cache_entry(stock_history_cache, normalized, history_payload, now + STOCK_HISTORY_CACHE_TTL_SECONDS, now)
        _persist_snapshot(snapshot_saver, _build_history_snapshot_key(normalized), history_payload, now)
        _record_refresh_state(f"history:{normalized}", "stock_history_cache", now + STOCK_HISTORY_CACHE_TTL_SECONDS)
        result.update(
            {
                "status": "success",
                "history_refreshed": True,
                "snapshot_stored": True,
                "counted_budget": True,
                "reached_upstream": True,
                "message": "history snapshot refreshed",
                "updated_at": _isoformat_timestamp(now),
            }
        )
        return result
    except RateLimitError as exc:
        result.update(
            {
                "error_class": "rate_limit",
                "message": str(exc),
                "counted_budget": "budget exhausted" not in str(exc).lower(),
                "reached_upstream": "budget exhausted" not in str(exc).lower(),
            }
        )
        return result
    except ProviderRequestError as exc:
        result.update(
            {
                "error_class": exc.error_class,
                "message": exc.reason,
                "counted_budget": exc.counted_budget,
                "reached_upstream": exc.reached_upstream,
                "upstream_status": exc.upstream_status,
            }
        )
        return result
    except Exception as exc:
        result.update(
            {
                "error_class": exc.__class__.__name__,
                "message": str(exc) or "history snapshot refresh failed",
                "counted_budget": False,
                "reached_upstream": False,
            }
        )
        return result


def refresh_symbol_snapshot(api_key: str, symbol: str, snapshot_loader=None, snapshot_saver=None):
    quote_result = refresh_quote_snapshot(api_key, symbol, snapshot_saver=snapshot_saver)
    if quote_result.get("status") != "success":
        return quote_result
    history_result = refresh_history_snapshot(
        api_key,
        symbol,
        snapshot_loader=snapshot_loader,
        snapshot_saver=snapshot_saver,
    )
    merged = dict(quote_result)
    merged["history_attempted"] = history_result.get("history_attempted", False)
    merged["history_refreshed"] = history_result.get("history_refreshed", False)
    if history_result.get("status") == "failed":
        merged["message"] = history_result.get("message") or merged.get("message")
        merged["error_class"] = history_result.get("error_class")
    return merged


def _build_overview_from_snapshot_loader(snapshot_loader=None):
    indices = []
    latest_updated_at = None
    for item in MARKET_OVERVIEW_INDICES:
        quote, updated_at = get_snapshot_quote(item["source_symbol"], snapshot_loader=snapshot_loader)
        available = bool(quote and quote.get("price") is not None)
        if available and updated_at and (latest_updated_at is None or updated_at > latest_updated_at):
            latest_updated_at = updated_at
        indices.append(
            {
                "name": item["name"],
                "ticker": item["ticker"],
                "price": quote["price"] if available else None,
                "change": quote["change"] if available else None,
                "changePercent": quote["change_percent"] if available else None,
                "open": None,
                "high": None,
                "low": None,
                "volume": quote.get("volume") if available else None,
                "region": item["region"],
                "status": _market_status(item["region"]) if available else "Unavailable",
                "history": [],
                "available": available,
                "sourceSymbol": item["source_symbol"],
                "sourceType": item["source_type"],
                "sourceLabel": item["source_label"],
            }
        )

    payload = {
        "indices": indices,
        "updatedAt": _isoformat_timestamp(latest_updated_at) or datetime.now(timezone.utc).isoformat(),
        "sectors_available": False,
        "sectors": [],
    }
    return payload, latest_updated_at


def refresh_market_overview_snapshot(snapshot_loader=None, snapshot_saver=None):
    payload, latest_updated_at = _build_overview_from_snapshot_loader(snapshot_loader=snapshot_loader)
    if not _overview_has_available_data(payload):
        return {
            "status": "failed",
            "saved": False,
            "available": False,
            "error_class": "no_available_snapshot_data",
            "message": "No stored quote snapshots were available for the overview.",
        }
    updated_at = latest_updated_at or time.time()
    try:
        _store_cache_entry(market_cache, "overview", payload, time.time() + MARKET_CACHE_TTL_SECONDS, updated_at)
        _persist_snapshot(snapshot_saver, "market_overview", payload, updated_at)
        _record_refresh_state("market_overview", "market_cache", time.time() + MARKET_CACHE_TTL_SECONDS)
        return {
            "status": "success",
            "saved": True,
            "available": True,
            "updated_at": _isoformat_timestamp(updated_at),
        }
    except Exception as exc:
        return {
            "status": "failed",
            "saved": False,
            "available": True,
            "error_class": exc.__class__.__name__,
            "message": str(exc) or "overview snapshot save failed",
        }


def fetch_market_overview(api_key: str, snapshot_loader=None, snapshot_saver=None):
    now = time.time()
    cache_entry, fresh_data = _get_cache_entry(market_cache, "overview", now)
    if fresh_data is not None and _overview_has_available_data(fresh_data):
        return {
            **fresh_data,
            "marketDataStatus": _snapshot_status(
                cache_entry.get("updated_at") if cache_entry else None,
                True,
                message="Showing most recent available data.",
            ),
        }

    snapshot_entry = _load_snapshot_entry(snapshot_loader, "market_overview")
    if snapshot_entry and _overview_has_available_data(snapshot_entry.get("data")):
        _store_cache_entry(
            market_cache,
            "overview",
            snapshot_entry["data"],
            now + MARKET_CACHE_TTL_SECONDS,
            snapshot_entry.get("updated_at") or now,
        )
        return {
            **snapshot_entry["data"],
            "marketDataStatus": _snapshot_status(
                snapshot_entry.get("updated_at"),
                True,
                message="Showing most recent available data.",
            ),
        }

    payload, latest_updated_at = _build_overview_from_snapshot_loader(snapshot_loader=snapshot_loader)
    if _overview_has_available_data(payload):
        return {
            **payload,
            "marketDataStatus": _snapshot_status(
                latest_updated_at,
                True,
                message="Showing most recent available data.",
            ),
        }

    return {
        **payload,
        "marketDataStatus": _snapshot_status(None, False),
    }


def fetch_upcoming_earnings(api_key: str, snapshot_loader=None, snapshot_saver=None):
    now = time.time()
    cache_entry, fresh_data = _get_cache_entry(earnings_cache, "upcoming", now)
    if cache_entry is None:
        cache_entry = _load_snapshot_entry(snapshot_loader, "earnings_upcoming")
    if fresh_data is not None:
        return {
            **fresh_data,
            "marketDataStatus": _cache_status_payload(cache_entry, "live", now),
        }

    if cache_entry:
        return {
            **cache_entry["data"],
            "marketDataStatus": _snapshot_status(
                cache_entry.get("updated_at"),
                True,
                message="Showing most recent available data.",
            ),
        }

    return {
        "items": [],
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "marketDataStatus": _snapshot_status(None, False),
    }


def refresh_earnings_snapshot(api_key: str, snapshot_saver=None):
    return {
        "status": "skipped",
        "counted_budget": False,
        "reached_upstream": False,
        "error_class": None,
        "message": "earnings refresh is not implemented for the Finnhub provider in this prototype",
    }


def get_supported_market_universe():
    return [
        symbol for symbol, metadata in SUPPORTED_TICKERS.items()
        if metadata["bucket"] == "FTSE100"
    ]


def get_bootstrap_symbols():
    return [PRIMARY_BASELINE_SYMBOL]


def list_stored_quote_snapshot_symbols(snapshot_loader=None):
    stored = []
    for symbol in SUPPORTED_TICKERS.keys():
        snapshot = _load_snapshot_entry(snapshot_loader, _build_quote_snapshot_key(symbol))
        data = snapshot.get("data") if snapshot else None
        has_price = bool(isinstance(data, dict) and data.get("price") is not None)
        stored.append(
            {
                "symbol": symbol,
                "has_snapshot": bool(snapshot),
                "has_price": has_price,
                "updated_at": _isoformat_timestamp(snapshot.get("updated_at")) if snapshot else None,
            }
        )
    return stored


def bootstrap_market_snapshots(api_key: str, snapshot_loader=None, snapshot_saver=None):
    attempted_symbol = PRIMARY_BASELINE_SYMBOL
    results = []
    if _budget_remaining(time.time()) <= 0:
        return {
            "status": "rate_limited",
            "rate_limited_mode": True,
            "symbols": results,
            "attempted_symbol": attempted_symbol,
            "overview_result": {
                "status": "skipped",
                "saved": False,
                "available": snapshot_loader is not None and _overview_has_available_data(
                (_load_snapshot_entry(snapshot_loader, "market_overview") or {}).get("data")
                ),
                "message": "overview skipped because the system is rate-limited",
            },
            "overview_seeded": snapshot_loader is not None and _overview_has_available_data(
                (_load_snapshot_entry(snapshot_loader, "market_overview") or {}).get("data")
            ),
            "baseline_symbols": [attempted_symbol],
        }

    baseline_seeded = False
    try:
        refresh_result = refresh_quote_snapshot(
            api_key,
            attempted_symbol,
            snapshot_saver=snapshot_saver,
        )
    except Exception as exc:
        refresh_result = {
            "symbol": attempted_symbol,
            "provider_symbol": None,
            "status": "failed",
            "quote_attempted": True,
            "history_attempted": False,
            "quote_refreshed": False,
            "history_refreshed": False,
            "snapshot_stored": False,
            "counted_budget": False,
            "reached_upstream": False,
            "error_class": exc.__class__.__name__,
            "message": str(exc) or "bootstrap quote refresh crashed",
        }
    results.append(refresh_result)
    baseline_seeded = refresh_result["status"] == "success" and refresh_result.get("snapshot_stored", False)

    overview_result = {
        "status": "skipped",
        "saved": False,
        "available": False,
        "message": "overview skipped because no baseline quote exists yet",
    }
    overview_seeded = False
    if baseline_seeded:
        try:
            overview_result = refresh_market_overview_snapshot(snapshot_loader=snapshot_loader, snapshot_saver=snapshot_saver)
            overview_seeded = overview_result.get("status") == "success" and overview_result.get("saved")
        except Exception as exc:
            overview_result = {
                "status": "failed",
                "saved": False,
                "available": False,
                "error_class": exc.__class__.__name__,
                "message": str(exc) or "overview snapshot build crashed",
            }
    return {
        "status": "success" if any(item["status"] == "success" for item in results) else "failed",
        "rate_limited_mode": _budget_remaining(time.time()) <= 0,
        "attempted_symbol": attempted_symbol,
        "symbols": results,
        "overview_seeded": overview_seeded,
        "overview_result": overview_result,
        "baseline_seeded": baseline_seeded,
        "baseline_symbols": [attempted_symbol],
    }


def refresh_market_snapshots(api_key: str, snapshot_loader=None, snapshot_saver=None):
    results = []
    if _budget_remaining(time.time()) <= 0:
        return {
            "status": "rate_limited",
            "rate_limited_mode": True,
            "symbols": results,
            "attempted_symbols": [],
            "refreshed_count": 0,
        }

    symbols_to_refresh = list(get_bootstrap_symbols())
    for symbol in get_supported_market_universe():
        if symbol not in symbols_to_refresh:
            symbols_to_refresh.append(symbol)

    symbols_to_refresh = sorted(
        symbols_to_refresh,
        key=lambda symbol: _snapshot_updated_at(snapshot_loader, _build_quote_snapshot_key(symbol)) or 0,
    )

    attempted_symbols = []
    for symbol in symbols_to_refresh[:MARKET_REFRESH_BATCH_LIMIT]:
        if _budget_remaining(time.time()) <= MARKET_REFRESH_BUFFER:
            break
        attempted_symbols.append(symbol)
        try:
            results.append(
                refresh_symbol_snapshot(
                    api_key,
                    symbol,
                    snapshot_loader=snapshot_loader,
                    snapshot_saver=snapshot_saver,
                )
            )
        except Exception as exc:
            results.append(
                {
                    "symbol": symbol,
                    "provider_symbol": get_provider_symbol(symbol),
                    "status": "failed",
                    "quote_attempted": False,
                    "history_attempted": False,
                    "quote_refreshed": False,
                    "history_refreshed": False,
                    "snapshot_stored": False,
                    "counted_budget": False,
                    "reached_upstream": False,
                    "error_class": exc.__class__.__name__,
                    "message": str(exc) or "refresh crashed",
                }
            )

    try:
        overview_result = refresh_market_overview_snapshot(snapshot_loader=snapshot_loader, snapshot_saver=snapshot_saver)
    except Exception as exc:
        overview_result = {
            "status": "failed",
            "saved": False,
            "available": False,
            "error_class": exc.__class__.__name__,
            "message": str(exc) or "overview snapshot refresh crashed",
        }
    overview_seeded = overview_result.get("status") == "success" and overview_result.get("saved")
    earnings_result = None
    if _budget_remaining(time.time()) > MARKET_REFRESH_BUFFER:
        earnings_result = refresh_earnings_snapshot(api_key, snapshot_saver=snapshot_saver)

    return {
        "status": "success" if any(item["status"] == "success" for item in results) or overview_seeded else "failed",
        "rate_limited_mode": _budget_remaining(time.time()) <= 0,
        "symbols": results,
        "attempted_symbols": attempted_symbols,
        "overview_seeded": overview_seeded,
        "overview_result": overview_result,
        "earnings": earnings_result,
        "refreshed_count": len([item for item in results if item["status"] == "success"]),
    }
