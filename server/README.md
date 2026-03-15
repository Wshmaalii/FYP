# TradeLink Backend

## Environment Variables

Create `server/.env` with:

```env
DATABASE_URL=postgresql://postgres:ynLk.#N!hp,i5kb@db.cqhqgmeygtzikfuxowsw.supabase.co:5432/postgres
SECRET_KEY=tradelink_fyp_secure_key_9f4a1d7c82f3b6e
FRONTEND_URL=https://tradelink-fyp.vercel.app/
ALPHA_VANTAGE_API_KEY=
```

`DATABASE_URL` is normalized in code so reserved characters in the Supabase password are safely encoded before SQLAlchemy connects.

## Install

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run Database Migrations

```bash
cd server
source .venv/bin/activate
export FLASK_APP=app.py
flask db init
flask db migrate -m "create users and revoked tokens"
flask db upgrade
```

If `migrations/` already exists, skip `flask db init`.

## Run The API

```bash
cd server
source .venv/bin/activate
python app.py
```

The API runs on `http://127.0.0.1:5000` by default.

## Auth Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/health`
