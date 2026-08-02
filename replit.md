# CryptoAIO

An all-in-one cryptocurrency management app built with Python/Flask + Vanilla JS.

## How to run

The app starts automatically via the **Start application** workflow, which runs:
```
python3 app.py
```
It listens on port 5000.

For production deployment, Gunicorn is configured:
```
gunicorn --bind=0.0.0.0:5000 --reuse-port app:app
```

## Features

- **Watchlist** — track crypto, stocks, forex prices in real-time
- **Dashboard** — on-chain wallet tracking (EVM, Solana, Bitcoin) + manual assets
- **Trade** — portfolio / trade history and P&L
- **Mad AI** — AI chat/voice assistant (requires AI provider key configured in Settings)
- **Alerts** — price high/low browser notifications
- **Widget** — embeddable ticker widget at `/widget`
- **Gist Sync** — auto-backup data to GitHub Gist (configure token in Settings → Gist)
- **PWA** — installable as a Progressive Web App

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 + Flask 3 |
| Frontend | HTML5 · CSS3 · Vanilla JS (ES6+) |
| Storage | Local JSON files + localStorage |

## Secrets

| Secret | Purpose | Required? |
|--------|---------|-----------|
| `SESSION_SECRET` | Flask session signing key | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth for Gist login flow | Optional |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth for Gist login flow | Optional |

AI provider keys (Groq, Gemini, OpenRouter) are configured per-user in the app's Settings tab — they are not backend secrets.

The GitHub Personal Access Token for Gist sync is also configured per-user in Settings → Gist, not stored server-side.

## User preferences

- Git identity: `madnessinvestor` / `madness.investor@gmail.com`
