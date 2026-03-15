from datetime import datetime
import os
import uuid
from typing import Dict, Optional
from urllib import parse, request as urlrequest
from urllib.error import HTTPError
import json
import time

from flask import Flask, jsonify, request
from flask_cors import CORS
try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):
        return False
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))

app = Flask(__name__)

app.config["SECRET_KEY"] = (
    os.environ.get("FLASK_SECRET_KEY")
    or os.environ.get("SECRET_KEY")
    or "dev-secret-change-me"
)
serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])
app.config["DATABASE_URL"] = (os.environ.get("DATABASE_URL") or "").strip()

frontend_api_url = (os.environ.get("FRONTEND_API_URL") or "http://localhost:5173").strip()
CORS(
    app,
    origins=[
        "http://localhost:5173",
        frontend_api_url,
        "https://yourdomain.com",
        "https://www.yourdomain.com",
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Minimal in-memory storage for Phase 1.
users_by_email: Dict[str, Dict[str, str]] = {}
revoked_tokens = set()
market_cache: Dict[str, Dict[str, object]] = {}
top_movers_cache: Dict[str, Dict[str, object]] = {}
stock_quote_cache: Dict[str, Dict[str, object]] = {}
stock_history_cache: Dict[str, Dict[str, object]] = {}

ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"
MARKET_CACHE_TTL_SECONDS = 15
STOCK_QUOTE_CACHE_TTL_SECONDS = 30
STOCK_HISTORY_CACHE_TTL_SECONDS = 60

TICKER_PROVIDER_MAP = {
    "FTSE 100": "^FTSE",
    "DAX": "^GDAXI",
    "CAC 40": "^FCHI",
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


def create_token(user_id: str) -> str:
    return serializer.dumps({"sub": user_id, "iat": datetime.utcnow().isoformat()})


def verify_token(token: str) -> Optional[str]:
    if token in revoked_tokens:
        return None

    try:
        payload = serializer.loads(token, max_age=60 * 60 * 24 * 7)
    except (BadSignature, SignatureExpired):
        return None

    return payload.get("sub")


def get_authorization_token() -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.replace("Bearer ", "", 1).strip()


def json_error(message: str, status: int):
    return jsonify({"error": message}), status


def get_alpha_vantage_api_key() -> str:
    return (os.getenv("ALPHA_VANTAGE_API_KEY") or "").strip()


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


def _to_int(value, default=0):
    try:
        if isinstance(value, str):
            cleaned = value.replace(",", "").strip()
            if cleaned == "":
                return default
            return int(float(cleaned))
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _alpha_vantage_request(params):
    query = parse.urlencode(params)
    url = f"{ALPHA_VANTAGE_BASE_URL}?{query}"
    req = urlrequest.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "TradeLink/1.0 (+local-dev)",
        },
    )

    try:
        with urlrequest.urlopen(req, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="ignore")
        try:
            error_payload = json.loads(raw_body) if raw_body else {}
            message = error_payload.get("message") or error_payload.get("error")
        except Exception:
            message = None
        raise RuntimeError(message or f"HTTP Error {exc.code}: {exc.reason}") from exc

    if payload.get("Note"):
        raise RuntimeError("rate limit exceeded")
    if payload.get("Error Message"):
        raise RuntimeError(payload.get("Error Message"))
    if payload.get("Information"):
        raise RuntimeError(payload.get("Information"))

    return payload


def fetch_alpha_vantage_quote(symbol: str, api_key: str):
    now = time.time()
    cache_key = symbol.upper()
    cache_entry = stock_quote_cache.get(cache_key)
    if cache_entry and cache_entry["expiresAt"] > now:
        return cache_entry["data"]

    payload = _alpha_vantage_request(
        {
            "function": "GLOBAL_QUOTE",
            "symbol": symbol,
            "apikey": api_key,
        }
    )
    quote = payload.get("Global Quote") or {}
    if not isinstance(quote, dict) or not quote:
        raise RuntimeError("No quote data available")

    parsed_symbol = (quote.get("01. symbol") or symbol).upper()
    price = _to_float(quote.get("05. price"))
    change = _to_float(quote.get("09. change"))
    change_percent = (quote.get("10. change percent") or "0.00%").strip()
    if change_percent and not change_percent.endswith("%"):
        change_percent = f"{change_percent}%"

    data = {
        "symbol": parsed_symbol,
        "price": price,
        "change": change,
        "change_percent": change_percent,
    }
    stock_quote_cache[cache_key] = {
        "data": data,
        "expiresAt": now + STOCK_QUOTE_CACHE_TTL_SECONDS,
    }
    return data


def fetch_alpha_vantage_history(symbol: str, api_key: str):
    now = time.time()
    cache_key = symbol.upper()
    cache_entry = stock_history_cache.get(cache_key)
    if cache_entry and cache_entry["expiresAt"] > now:
        return cache_entry["data"]

    payload = _alpha_vantage_request(
        {
            "function": "TIME_SERIES_INTRADAY",
            "symbol": symbol,
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
        price = _to_float(values.get("4. close"))
        points.append({"time": timestamp, "price": price})

    points.sort(key=lambda item: item["time"])
    latest_points = points[-50:]
    stock_history_cache[cache_key] = {
        "data": latest_points,
        "expiresAt": now + STOCK_HISTORY_CACHE_TTL_SECONDS,
    }
    return latest_points


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/stocks/quote/<symbol>", methods=["GET"])
def stock_quote(symbol):
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    normalized_symbol = (symbol or "").strip().upper()
    if not normalized_symbol:
        return json_error("symbol is required", 400)

    try:
        quote = fetch_alpha_vantage_quote(normalized_symbol, api_key)
    except Exception as exc:
        if str(exc) == "rate limit exceeded":
            return json_error("rate limit exceeded", 429)
        return json_error(str(exc), 502)

    return jsonify(quote)


@app.route("/api/stocks/history/<symbol>", methods=["GET"])
def stock_history(symbol):
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    normalized_symbol = (symbol or "").strip().upper()
    if not normalized_symbol:
        return json_error("symbol is required", 400)

    try:
        history = fetch_alpha_vantage_history(normalized_symbol, api_key)
    except Exception as exc:
        if str(exc) == "rate limit exceeded":
            return json_error("rate limit exceeded", 429)
        return json_error(str(exc), 502)

    return jsonify(history)


@app.route("/api/market/quotes", methods=["GET"])
def market_quotes():
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    tickers_param = (request.args.get("tickers") or "").strip()
    if not tickers_param:
        return json_error("tickers query parameter is required", 400)

    requested_tickers = []
    for ticker in tickers_param.split(","):
        normalized = ticker.strip()
        if normalized and normalized not in requested_tickers:
            requested_tickers.append(normalized)

    if not requested_tickers:
        return json_error("No valid tickers provided", 400)

    cache_key = ",".join(sorted(requested_tickers))
    now = time.time()
    cache_entry = market_cache.get(cache_key)

    if cache_entry and cache_entry["expiresAt"] > now:
        return jsonify({"quotes": cache_entry["data"]})

    quotes = {}
    for ticker in requested_tickers:
        provider_symbol = TICKER_PROVIDER_MAP.get(ticker, ticker).upper()
        try:
            quote = fetch_alpha_vantage_quote(provider_symbol, api_key)
        except Exception as exc:
            if str(exc) == "rate limit exceeded":
                return json_error("rate limit exceeded", 429)
            continue

        quotes[ticker] = {
            "price": quote["price"],
            "change": quote["change"],
            "changePercent": _to_float(quote["change_percent"]),
            "updatedAt": datetime.utcnow().isoformat() + "Z",
        }

    market_cache[cache_key] = {
        "data": quotes,
        "expiresAt": now + MARKET_CACHE_TTL_SECONDS,
    }

    return jsonify({"quotes": quotes})


@app.route("/api/market/top-movers", methods=["GET"])
def market_top_movers():
    api_key = get_alpha_vantage_api_key()
    if not api_key:
        return json_error("ALPHA_VANTAGE_API_KEY is not set", 500)

    index = (request.args.get("index") or "FTSE100").strip()
    if index not in TOP_MOVER_UNIVERSES:
        return json_error("Unsupported index", 400)

    now = time.time()
    cache_entry = top_movers_cache.get(index)
    if cache_entry and cache_entry["expiresAt"] > now:
        return jsonify(cache_entry["data"])

    universe = TOP_MOVER_UNIVERSES[index]
    movers = []

    for stock in universe:
        try:
            quote = fetch_alpha_vantage_quote(stock["ticker"], api_key)
        except Exception as exc:
            if str(exc) == "rate limit exceeded":
                if not movers:
                    return json_error("rate limit exceeded", 429)
                break
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

    gainers = sorted((stock for stock in movers if stock["changePercent"] >= 0), key=lambda x: x["changePercent"], reverse=True)[:5]
    losers = sorted((stock for stock in movers if stock["changePercent"] < 0), key=lambda x: x["changePercent"])[:5]

    payload = {
        "gainers": gainers,
        "losers": losers,
        "updatedAt": datetime.utcnow().isoformat() + "Z",
    }

    top_movers_cache[index] = {
        "data": payload,
        "expiresAt": now + MARKET_CACHE_TTL_SECONDS,
    }

    return jsonify(payload)


@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return json_error("Name, email, and password are required", 400)

    if len(password) < 6:
        return json_error("Password must be at least 6 characters", 400)

    if email in users_by_email:
        return json_error("Email is already registered", 409)

    user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password_hash": generate_password_hash(password),
    }
    users_by_email[email] = user
    token = create_token(user["id"])

    return jsonify(
        {
            "token": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
        }
    )


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return json_error("Email and password are required", 400)

    user = users_by_email.get(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return json_error("Invalid credentials", 401)

    token = create_token(user["id"])
    return jsonify(
        {
            "token": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
        }
    )


@app.route("/api/auth/me", methods=["GET"])
def me():
    token = get_authorization_token()
    if not token:
        return json_error("Missing token", 401)

    user_id = verify_token(token)
    if not user_id:
        return json_error("Invalid token", 401)

    user = next((candidate for candidate in users_by_email.values() if candidate["id"] == user_id), None)
    if not user:
        return json_error("User not found", 404)

    return jsonify({"user": {"id": user["id"], "name": user["name"], "email": user["email"]}})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    token = get_authorization_token()
    if token:
        revoked_tokens.add(token)
    return jsonify({"message": "Logged out"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
