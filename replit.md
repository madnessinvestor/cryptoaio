# CryptoAIO

A Flask + Vanilla JS all-in-one cryptocurrency app — watchlist, portfolio tracking, price alerts, wallet dashboard, AI chat (Mad AI), and an embeddable ticker widget.

## How to run

The **Start application** workflow runs `python3 app.py` on port 5000. Press **Run** or start it from the Workflows panel.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 + Flask 3 |
| Frontend | HTML5 · CSS3 · Vanilla JS (ES6+) |
| AI | Groq · Gemini · OpenRouter (configured in-app) |
| Market Data | Hyperliquid, MEXC, KuCoin, Gate.io, OKX, Kraken, Bitfinex, CoinGecko, CoinCap, CryptoCompare, brapi.dev, Frankfurter, Yahoo Finance |
| Storage | Local JSON files + browser localStorage |

## Secrets

| Secret | Required | Purpose |
|--------|----------|---------|
| `SESSION_SECRET` | Yes (set) | Flask session signing |
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth for Gist sync |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth for Gist sync |

> **GitHub Gist sync token** — stored client-side in localStorage, entered via the app's **Config → Gist** settings panel. Generate a PAT with `gist` scope at github.com/settings/tokens and paste it there (not here).

## Key files

- `app.py` — Flask backend, all API routes and price aggregation
- `templates/index.html` — main SPA shell
- `static/app.js` — watchlist + price refresh core
- `static/madai.js` — AI chat & voice
- `static/gist.js` — GitHub Gist backup/restore
- `assets.json`, `alerts.json`, `dashboard_wallets.json`, etc. — persisted data (JSON)

## User preferences

- Git identity: madnessinvestor / madness.investor@gmail.com
