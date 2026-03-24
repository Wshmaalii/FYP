import csv
import io
import json
import time
from datetime import datetime, timezone
from urllib import parse, request as urlrequest
from urllib.error import HTTPError


ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"
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
    "LLOY": {"name": "Lloyds Banking Group", "bucket": "FTSE100", "provider_symbol": "LLOY.L", "aliases": ["LLOY", "LLOY.L"]},
    "LGEN": {"name": "Legal & General", "bucket": "FTSE100", "provider_symbol": "LGEN.L", "aliases": ["LGEN", "LGEN.L"]},
    "BP.": {"name": "BP", "bucket": "FTSE100", "provider_symbol": "BP.L", "aliases": ["BP.", "BP", "BP.L"]},
    "RR.": {"name": "Rolls-Royce Holdings", "bucket": "FTSE100", "provider_symbol": "RR.L", "aliases": ["RR.", "RR", "RR.L"]},
    "SHEL": {"name": "Shell", "bucket": "FTSE100", "provider_symbol": "SHEL.L", "aliases": ["SHEL", "SHEL.L"]},
    "BARC": {"name": "Barclays", "bucket": "FTSE100", "provider_symbol": "BARC.L", "aliases": ["BARC", "BARC.L"]},
    "NWG": {"name": "NatWest Group", "bucket": "FTSE100", "provider_symbol": "NWG.L", "aliases": ["NWG", "NWG.L"]},
    "HSBA": {"name": "HSBC Holdings", "bucket": "FTSE100", "provider_symbol": "HSBA.L", "aliases": ["HSBA", "HSBA.L"]},
    "AZN": {"name": "AstraZeneca", "bucket": "FTSE100", "provider_symbol": "AZN.L", "aliases": ["AZN", "AZN.L"]},
    "VOD": {"name": "Vodafone Group", "bucket": "FTSE100", "provider_symbol": "VOD.L", "aliases": ["VOD", "VOD.L"]},
    "BT.A": {"name": "BT Group", "bucket": "FTSE100", "provider_symbol": "BT-A.L", "aliases": ["BT.A", "BTA", "BT-A.L"]},
    "GSK": {"name": "GSK", "bucket": "FTSE100", "provider_symbol": "GSK.L", "aliases": ["GSK", "GSK.L"]},
    "AV.": {"name": "Aviva", "bucket": "FTSE100", "provider_symbol": "AV.L", "aliases": ["AV.", "AV", "AV.L"]},
    "TSCO": {"name": "Tesco", "bucket": "FTSE100", "provider_symbol": "TSCO.L", "aliases": ["TSCO", "TSCO.L"]},
    "ULVR": {"name": "Unilever", "bucket": "FTSE100", "provider_symbol": "ULVR.L", "aliases": ["ULVR", "ULVR.L"]},
    "RIO": {"name": "Rio Tinto", "bucket": "FTSE100", "provider_symbol": "RIO.L", "aliases": ["RIO", "RIO.L"]},
    "GLEN": {"name": "Glencore", "bucket": "FTSE100", "provider_symbol": "GLEN.L", "aliases": ["GLEN", "GLEN.L"]},
    "BATS": {"name": "British American Tobacco", "bucket": "FTSE100", "provider_symbol": "BATS.L", "aliases": ["BATS", "BATS.L"]},
    "STAN": {"name": "Standard Chartered", "bucket": "FTSE100", "provider_symbol": "STAN.L", "aliases": ["STAN", "STAN.L"]},
    "MNG": {"name": "M&G", "bucket": "FTSE100", "provider_symbol": "MNG.L", "aliases": ["MNG", "MNG.L"]},
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

MARKET_BOOTSTRAP_SYMBOLS = ["SPY", "EWU", "BARC", "LLOY", "SHEL"]

market_cache = {}
top_movers_cache = {}
stock_quote_cache = {}
stock_history_cache = {}
earnings_cache = {}
market_refresh_state = {}
alpha_vantage_request_state = {
    "last_started_at": None,
}
alpha_vantage_budget_state = {
    "window_started_at": time.time(),
    "calls_used": 0,
    "daily_budget": ALPHA_VANTAGE_DAILY_BUDGET,
    "last_request_at": None,
}
alpha_vantage_failure_state = {}
alpha_vantage_diagnostic_history = []


class RateLimitError(RuntimeError):
    pass


class AlphaVantageRequestError(RuntimeError):
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


class AlphaVantageBackoffError(AlphaVantageRequestError):
    pass


def _isoformat_timestamp(timestamp):
    if not timestamp:
        return None
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat()


def _reset_budget_window_if_needed(now):
    if now - alpha_vantage_budget_state["window_started_at"] >= ALPHA_VANTAGE_BUDGET_WINDOW_SECONDS:
        alpha_vantage_budget_state["window_started_at"] = now
        alpha_vantage_budget_state["calls_used"] = 0
        alpha_vantage_budget_state["last_request_at"] = None


def _budget_remaining(now):
    _reset_budget_window_if_needed(now)
    return max(alpha_vantage_budget_state["daily_budget"] - alpha_vantage_budget_state["calls_used"], 0)


def _record_alpha_vantage_request(now):
    _reset_budget_window_if_needed(now)
    alpha_vantage_budget_state["calls_used"] += 1
    alpha_vantage_budget_state["last_request_at"] = now


def _wait_for_request_slot():
    last_started_at = alpha_vantage_request_state.get("last_started_at")
    now = time.time()
    if last_started_at is None:
        alpha_vantage_request_state["last_started_at"] = now
        return
    elapsed = now - last_started_at
    if elapsed < ALPHA_VANTAGE_MIN_REQUEST_SPACING_SECONDS:
        time.sleep(ALPHA_VANTAGE_MIN_REQUEST_SPACING_SECONDS - elapsed)
    alpha_vantage_request_state["last_started_at"] = time.time()


def _record_refresh_state(key, cache_name, expires_at):
    market_refresh_state[key] = {
        "last_refresh_at": _isoformat_timestamp(time.time()),
        "cache_name": cache_name,
        "expires_at": _isoformat_timestamp(expires_at),
    }


def _append_diagnostic_entry(entry):
    alpha_vantage_diagnostic_history.insert(0, entry)
    del alpha_vantage_diagnostic_history[ALPHA_VANTAGE_DIAGNOSTIC_HISTORY_LIMIT:]


def _failure_state_key(function_name: str | None, symbol: str | None):
    return f"{function_name or 'unknown'}:{symbol or '*'}"


def _register_failure(function_name: str | None, symbol: str | None, reason: str, error_class: str):
    alpha_vantage_failure_state[_failure_state_key(function_name, symbol)] = {
        "reason": reason,
        "error_class": error_class,
        "failed_at": time.time(),
    }


def _clear_failure(function_name: str | None, symbol: str | None):
    alpha_vantage_failure_state.pop(_failure_state_key(function_name, symbol), None)


def _failure_backoff_entry(function_name: str | None, symbol: str | None):
    entry = alpha_vantage_failure_state.get(_failure_state_key(function_name, symbol))
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
        "daily_calls_used": alpha_vantage_budget_state["calls_used"],
        "daily_calls_remaining": remaining,
        "daily_budget": alpha_vantage_budget_state["daily_budget"],
        "window_started_at": _isoformat_timestamp(alpha_vantage_budget_state["window_started_at"]),
        "last_request_at": _isoformat_timestamp(alpha_vantage_budget_state["last_request_at"]),
        "rate_limited_mode": remaining <= 0,
        "last_refresh": market_refresh_state,
        "recent_diagnostics": alpha_vantage_diagnostic_history,
        "failure_backoff_seconds": ALPHA_VANTAGE_FAILURE_BACKOFF_SECONDS,
        "active_failure_backoffs": [
            {
                "request_key": request_key,
                "reason": entry["reason"],
                "error_class": entry["error_class"],
                "failed_at": _isoformat_timestamp(entry["failed_at"]),
            }
            for request_key, entry in alpha_vantage_failure_state.items()
            if time.time() - entry["failed_at"] <= ALPHA_VANTAGE_FAILURE_BACKOFF_SECONDS
        ],
    }


def get_alpha_vantage_api_key():
    from os import getenv
    return (getenv("ALPHA_VANTAGE_API_KEY") or "").strip()


def get_alpha_vantage_env_diagnostics():
    from os import getenv

    raw_value = getenv("ALPHA_VANTAGE_API_KEY")
    normalized = (raw_value or "").strip()
    return {
        "env_var_name": "ALPHA_VANTAGE_API_KEY",
        "present": raw_value is not None,
        "non_empty": bool(normalized),
        "key_length": len(normalized),
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


def _alpha_vantage_request(params):
    now = time.time()
    function_name = params.get("function")
    symbol = canonicalize_symbol(params.get("symbol", "")) or None

    backoff_entry = _failure_backoff_entry(function_name, symbol)
    if backoff_entry:
        reason = f"request backoff active after previous {backoff_entry['error_class']}"
        _record_diagnostic(
            symbol=symbol,
            function_name=function_name,
            reached_upstream=False,
            counted_budget=False,
            status="backoff_blocked",
            error_class="backoff",
            message=reason,
        )
        raise AlphaVantageBackoffError(
            reason,
            "backoff",
            reached_upstream=False,
            counted_budget=False,
            symbol=symbol,
            function=function_name,
        )

    if _budget_remaining(now) <= 0:
        _record_diagnostic(
            symbol=symbol,
            function_name=function_name,
            reached_upstream=False,
            counted_budget=False,
            status="budget_exhausted",
            error_class="rate_limit",
            message="daily budget exhausted",
        )
        raise RateLimitError("daily budget exhausted")

    _wait_for_request_slot()
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
        _record_alpha_vantage_request(now)
        reason = message or f"HTTP Error {exc.code}: {exc.reason}"
        error_class = "unauthorized" if exc.code in {401, 403} else "http_error"
        _register_failure(function_name, symbol, reason, error_class)
        _record_diagnostic(
            symbol=symbol,
            function_name=function_name,
            reached_upstream=True,
            counted_budget=True,
            status="failed",
            error_class=error_class,
            message=reason,
            upstream_status=exc.code,
        )
        raise AlphaVantageRequestError(
            reason,
            error_class,
            reached_upstream=True,
            counted_budget=True,
            upstream_status=exc.code,
            symbol=symbol,
            function=function_name,
        ) from exc
    except TimeoutError as exc:
        reason = "request timed out"
        _register_failure(function_name, symbol, reason, "timeout")
        _record_diagnostic(
            symbol=symbol,
            function_name=function_name,
            reached_upstream=False,
            counted_budget=False,
            status="failed",
            error_class="timeout",
            message=reason,
        )
        raise AlphaVantageRequestError(
            reason,
            "timeout",
            reached_upstream=False,
            counted_budget=False,
            symbol=symbol,
            function=function_name,
        ) from exc
    except Exception as exc:
        reason = str(exc) or exc.__class__.__name__
        _register_failure(function_name, symbol, reason, "network_error")
        _record_diagnostic(
            symbol=symbol,
            function_name=function_name,
            reached_upstream=False,
            counted_budget=False,
            status="failed",
            error_class="network_error",
            message=reason,
        )
        raise AlphaVantageRequestError(
            reason,
            "network_error",
            reached_upstream=False,
            counted_budget=False,
            symbol=symbol,
            function=function_name,
        ) from exc

    _record_alpha_vantage_request(now)

    if "csv" in content_type.lower():
        _clear_failure(function_name, symbol)
        _record_diagnostic(
            symbol=symbol,
            function_name=function_name,
            reached_upstream=True,
            counted_budget=True,
            status="success",
            message="csv payload received",
        )
        return body

    payload = json.loads(body)
    if payload.get("Note"):
        reason = "rate limit exceeded"
        _register_failure(function_name, symbol, reason, "rate_limit")
        _record_diagnostic(
            symbol=symbol,
            function_name=function_name,
            reached_upstream=True,
            counted_budget=True,
            status="failed",
            error_class="rate_limit",
            message=reason,
        )
        raise RateLimitError(reason)
    if payload.get("Error Message"):
        reason = payload.get("Error Message")
        _register_failure(function_name, symbol, reason, "invalid_symbol")
        _record_diagnostic(
            symbol=symbol,
            function_name=function_name,
            reached_upstream=True,
            counted_budget=True,
            status="failed",
            error_class="invalid_symbol",
            message=reason,
        )
        raise AlphaVantageRequestError(
            reason,
            "invalid_symbol",
            reached_upstream=True,
            counted_budget=True,
            symbol=symbol,
            function=function_name,
        )
    if payload.get("Information"):
        reason = payload.get("Information")
        _register_failure(function_name, symbol, reason, "information")
        _record_diagnostic(
            symbol=symbol,
            function_name=function_name,
            reached_upstream=True,
            counted_budget=True,
            status="failed",
            error_class="information",
            message=reason,
        )
        raise AlphaVantageRequestError(
            reason,
            "information",
            reached_upstream=True,
            counted_budget=True,
            symbol=symbol,
            function=function_name,
        )
    _clear_failure(function_name, symbol)
    _record_diagnostic(
        symbol=symbol,
        function_name=function_name,
        reached_upstream=True,
        counted_budget=True,
        status="success",
        message="json payload received",
    )
    return payload


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
    functions_to_try = [
        ("GLOBAL_QUOTE", {"function": "GLOBAL_QUOTE", "symbol": provider_symbol, "apikey": api_key}),
        ("TIME_SERIES_DAILY", {"function": "TIME_SERIES_DAILY", "symbol": provider_symbol, "outputsize": "compact", "apikey": api_key}),
    ]
    attempts = []
    for function_name, params in functions_to_try:
        try:
            payload = _alpha_vantage_request(params)
            attempts.append(
                {
                    "function": function_name,
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
                "payload_shape": list(payload.keys())[:5] if isinstance(payload, dict) else "csv",
            }
        except RateLimitError as exc:
            attempts.append(
                {
                    "function": function_name,
                    "status": "failed",
                    "error_class": "rate_limit",
                    "reached_upstream": False if "budget exhausted" in str(exc).lower() else True,
                    "counted_budget": False if "budget exhausted" in str(exc).lower() else True,
                    "message": str(exc),
                    "provider_symbol": provider_symbol,
                }
            )
            break
        except AlphaVantageRequestError as exc:
            attempts.append(
                {
                    "function": function_name,
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
                    "function": function_name,
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
            "message": "Mention a ticker like #BARC.L or $AAPL to start.",
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
    series_key = _daily_series_key(payload)
    if not series_key:
        raise AlphaVantageRequestError(
            "daily time series missing",
            "invalid_payload",
            reached_upstream=True,
            counted_budget=True,
        )

    series = payload.get(series_key) or {}
    if not isinstance(series, dict) or not series:
        raise AlphaVantageRequestError(
            "daily time series empty",
            "empty_payload",
            reached_upstream=True,
            counted_budget=True,
        )

    ordered_dates = sorted(series.keys(), reverse=True)
    latest = series.get(ordered_dates[0]) or {}
    previous = series.get(ordered_dates[1]) or latest
    latest_close = _to_float(latest.get("4. close"), None)
    previous_close = _to_float(previous.get("4. close"), latest_close)
    if latest_close is None:
        raise AlphaVantageRequestError(
            "latest close missing",
            "invalid_payload",
            reached_upstream=True,
            counted_budget=True,
        )

    change = None if previous_close in (None, 0) else latest_close - previous_close
    change_percent = None if previous_close in (None, 0) else (change / previous_close) * 100
    volume = _to_float(latest.get("5. volume"), None)

    history_points = []
    for date_key in reversed(ordered_dates[:30]):
        daily_row = series.get(date_key) or {}
        price = _to_float(daily_row.get("4. close"), None)
        if price is None:
            continue
        history_points.append({"time": date_key, "price": price})

    return {
        "latest_close": latest_close,
        "change": change,
        "change_percent": change_percent,
        "volume": volume,
        "history_points": history_points,
        "latest_date": ordered_dates[0],
    }


def _build_quote_payload(symbol: str, parsed_daily: dict):
    normalized = canonicalize_symbol(symbol)
    return {
        "symbol": normalized,
        "name": get_supported_symbol_name(normalized),
        "price": parsed_daily["latest_close"],
        "change": parsed_daily["change"],
        "change_percent": parsed_daily["change_percent"],
        "volume": parsed_daily["volume"],
        "providerSymbol": get_provider_symbol(normalized),
    }


def _available_quote_payload(symbol: str, quote_data, updated_at, source_message=None):
    return {
        **quote_data,
        "marketDataStatus": _snapshot_status(
            updated_at,
            True,
            message=source_message or "Showing most recent available data.",
        ),
    }


def refresh_symbol_snapshot(api_key: str, symbol: str, snapshot_loader=None, snapshot_saver=None):
    normalized = canonicalize_symbol(symbol)
    if not is_supported_symbol(normalized):
        return {
            "symbol": normalized or normalize_symbol(symbol),
            "provider_symbol": None,
            "status": "failed",
            "quote_refreshed": False,
            "history_refreshed": False,
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
        "quote_refreshed": False,
        "history_refreshed": False,
        "counted_budget": False,
        "reached_upstream": False,
        "error_class": None,
        "message": None,
    }

    try:
        payload = _alpha_vantage_request(
            {
                "function": "TIME_SERIES_DAILY",
                "symbol": provider_symbol,
                "outputsize": "compact",
                "apikey": api_key,
            }
        )
        parsed_daily = _parse_daily_time_series(payload)
        quote_payload = _build_quote_payload(normalized, parsed_daily)
        history_payload = parsed_daily["history_points"]

        _store_cache_entry(stock_quote_cache, normalized, quote_payload, now + STOCK_QUOTE_CACHE_TTL_SECONDS, now)
        _store_cache_entry(stock_history_cache, normalized, history_payload, now + STOCK_HISTORY_CACHE_TTL_SECONDS, now)
        _persist_snapshot(snapshot_saver, _build_quote_snapshot_key(normalized), quote_payload, now)
        _persist_snapshot(snapshot_saver, _build_history_snapshot_key(normalized), history_payload, now)
        _record_refresh_state(f"quote:{normalized}", "stock_quote_cache", now + STOCK_QUOTE_CACHE_TTL_SECONDS)
        _record_refresh_state(f"history:{normalized}", "stock_history_cache", now + STOCK_HISTORY_CACHE_TTL_SECONDS)

        result.update(
            {
                "status": "success",
                "quote_refreshed": True,
                "history_refreshed": True,
                "counted_budget": True,
                "reached_upstream": True,
                "message": "daily snapshot refreshed",
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
    except AlphaVantageRequestError as exc:
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
    now = time.time()
    result = {
        "status": "failed",
        "counted_budget": False,
        "reached_upstream": False,
        "error_class": None,
        "message": None,
    }
    try:
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
        _store_cache_entry(earnings_cache, "upcoming", data, now + EARNINGS_CACHE_TTL_SECONDS, now)
        _persist_snapshot(snapshot_saver, "earnings_upcoming", data, now)
        _record_refresh_state("earnings_upcoming", "earnings_cache", now + EARNINGS_CACHE_TTL_SECONDS)
        result.update(
            {
                "status": "success",
                "counted_budget": True,
                "reached_upstream": True,
                "message": "earnings snapshot refreshed",
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
    except AlphaVantageRequestError as exc:
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
                "message": str(exc) or "earnings snapshot refresh failed",
                "counted_budget": False,
                "reached_upstream": False,
            }
        )
        return result


def get_supported_market_universe():
    return [
        symbol for symbol, metadata in SUPPORTED_TICKERS.items()
        if metadata["bucket"] == "FTSE100"
    ]


def get_bootstrap_symbols():
    return list(MARKET_BOOTSTRAP_SYMBOLS)


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
    results = []
    if _budget_remaining(time.time()) <= 0:
        return {
            "status": "rate_limited",
            "rate_limited_mode": True,
            "symbols": results,
            "overview_result": {
                "status": "skipped",
                "saved": False,
                "available": snapshot_loader is not None and _overview_has_available_data(
                (_load_snapshot_entry(snapshot_loader, "market_overview") or {}).get("data")
                ),
            },
            "overview_seeded": snapshot_loader is not None and _overview_has_available_data(
                (_load_snapshot_entry(snapshot_loader, "market_overview") or {}).get("data")
            ),
            "baseline_symbols": MARKET_BOOTSTRAP_SYMBOLS,
        }

    baseline_seeded = False
    for symbol in MARKET_BOOTSTRAP_SYMBOLS:
        if _budget_remaining(time.time()) <= MARKET_REFRESH_BUFFER:
            break
        try:
            refresh_result = refresh_symbol_snapshot(
                api_key,
                symbol,
                snapshot_loader=snapshot_loader,
                snapshot_saver=snapshot_saver,
            )
        except Exception as exc:
            refresh_result = {
                "symbol": symbol,
                "provider_symbol": None,
                "status": "failed",
                "quote_refreshed": False,
                "history_refreshed": False,
                "counted_budget": False,
                "reached_upstream": False,
                "error_class": exc.__class__.__name__,
                "message": str(exc) or "bootstrap symbol refresh crashed",
            }
        results.append(refresh_result)
        if refresh_result["status"] == "success":
            baseline_seeded = True
            break

    overview_result = {
        "status": "skipped",
        "saved": False,
        "available": False,
        "message": "No successful baseline quote yet.",
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
        "symbols": results,
        "overview_seeded": overview_seeded,
        "overview_result": overview_result,
        "baseline_seeded": baseline_seeded,
        "baseline_symbols": MARKET_BOOTSTRAP_SYMBOLS,
    }


def refresh_market_snapshots(api_key: str, snapshot_loader=None, snapshot_saver=None):
    results = []
    if _budget_remaining(time.time()) <= 0:
        return {
            "status": "rate_limited",
            "rate_limited_mode": True,
            "symbols": results,
            "refreshed_count": 0,
        }

    symbols_to_refresh = list(MARKET_BOOTSTRAP_SYMBOLS)
    for symbol in get_supported_market_universe():
        if symbol not in symbols_to_refresh:
            symbols_to_refresh.append(symbol)

    symbols_to_refresh = sorted(
        symbols_to_refresh,
        key=lambda symbol: _snapshot_updated_at(snapshot_loader, _build_quote_snapshot_key(symbol)) or 0,
    )

    for symbol in symbols_to_refresh[:MARKET_REFRESH_BATCH_LIMIT]:
        if _budget_remaining(time.time()) <= MARKET_REFRESH_BUFFER:
            break
        results.append(refresh_symbol_snapshot(api_key, symbol, snapshot_loader=snapshot_loader, snapshot_saver=snapshot_saver))

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
        "overview_seeded": overview_seeded,
        "overview_result": overview_result,
        "earnings": earnings_result,
        "refreshed_count": len([item for item in results if item["status"] == "success"]),
    }
