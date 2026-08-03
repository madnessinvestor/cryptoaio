# CryptoAIO

## Overview

**CryptoAIO** is an all-in-one cryptocurrency portfolio and market tracking web app. It runs as a Flask web application and supports:

- Watchlist with real-time prices from multiple exchanges (Hyperliquid, MEXC, KuCoin, Gate.io, OKX, Kraken, Bitfinex, CoinGecko, CoinCap, CryptoCompare, Yahoo Finance)
- On-chain + manual portfolio / wallet dashboard (EVM, Solana, Bitcoin)
- Trade history tracking
- Price alerts (browser notifications)
- Embeddable ticker widget (`/widget`)
- AI assistant (Mad AI — Groq / Gemini / OpenRouter; requires user-supplied API key)
- GitHub Gist sync for data backup/restore
- PWA support (installable from browser)
- i18n: Portuguese & English

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 + Flask 3 |
| Frontend | HTML5 · CSS3 · Vanilla JS (ES6+) |
| Storage | Local JSON files + browser localStorage |
| AI | Groq · Gemini · OpenRouter (user-configured) |

## How to run

The app starts automatically via the **Start application** workflow:

```
python3 app.py
```

Serves on port **5000**.

## Environment secrets

| Secret | Purpose |
|--------|---------|
| `SESSION_SECRET` | Flask session signing key (required) |
| `GITHUB_CLIENT_ID` | GitHub OAuth for Gist sync (optional) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth for Gist sync (optional) |

## Key files

- `app.py` — Flask backend (routes, price aggregation, AI gateway, ~5600 lines)
- `static/app.js` — Core frontend logic (watchlist, prices, currency)
- `static/madai.js` — Mad AI chat + voice
- `static/dashboard.js` — Wallet dashboard
- `static/trade.js` — Trade/portfolio tab
- `static/alerts.js` — Price alerts
- `static/widget.js` — Embeddable widget
- `templates/index.html` — Main SPA
- `assets.json` / `alerts.json` / `portfolio_data.json` / `dashboard_*.json` — persisted data

## User preferences

- Git identity: `madnessinvestor` / `madness.investor@gmail.com` — always set before commits/pushes
