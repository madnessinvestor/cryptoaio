# CryptoAIO

A privacy-first, all-in-one asset tracker for Cryptocurrencies, Stocks, and Forex — built with **Flask + Vanilla JavaScript** as a **Progressive Web App (PWA)**.

## Stack
- **Backend**: Python 3.12 / Flask 3 (`app.py`)
- **Frontend**: Vanilla JS, HTML5, CSS3 (under `static/` and `templates/`)
- **Dependencies**: `flask`, `gunicorn`, `requests` (see `requirements.txt`)

## Running the app
```
python3 app.py
```
Opens at `http://localhost:5000`. The Replit workflow `Start application` handles this automatically.

## Environment Variables
| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | ✅ Set in Replit Secrets | Flask session secret key |
| `GROQ_API_KEY` | Optional | Groq — Whisper transcription + LLaMA chat (Mad AI) |
| `GOOGLE_AI_API_KEY` | Optional | Google Gemini — Mad AI fallback |
| `OPENROUTER_API_KEY` | Optional | OpenRouter — Mad AI fallback |
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth for one-click Gist auth |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth secret |

Without AI keys, Mad AI is unavailable. All other modules (watchlist, portfolio, stocks, forex, widget) work without any keys.

## Data files (local JSON, no DB)
- `assets.json` — watchlist
- `alerts.json` — price alert rules
- `portfolio_data.json` — trade / portfolio entries
- `dashboard_wallets.json` — on-chain wallet addresses
- `dashboard_manual.json` — manual dashboard assets
- `dashboard_history.json` — portfolio value snapshots (used for 24 h chart)
- `static/icons/tokens/` — cached token icon images (downloaded on demand)

## Key static files
| File | Purpose |
|---|---|
| `static/style.css` | All styles — dark / light / purple-dark / custom colour themes |
| `static/app.js` | Core logic — watchlist, prices, currency switching, global refresh |
| `static/widget.js` | Widget tab — live preview, phone mockup, HSB colour picker, themes |
| `static/dashboard.js` | Dashboard — wallets, manual assets, 24 h portfolio chart |
| `static/trade.js` | Trade tab — P&L, win rate, position tracking |
| `static/madai.js` | Mad AI — chat, voice (Groq Whisper), TTS |
| `static/alerts.js` | Price alerts |
| `static/i18n.js` | i18n strings — Portuguese (default) + English |
| `static/gist.js` | GitHub Gist sync — auto-backup & restore |
| `static/backup.js` | Local data import / export |

## Widget tab specifics
- **AO VIVO** preview is wrapped in a phone mockup (green wallpaper, status bar with live clock)
- **Themes**: Escuro · Claro · Purple Dark · Auto · 🎨 Custom (full HSB colour picker)
- Custom colour persists via `localStorage` key `w_customBg`
- Global ↻ refresh also updates widget live data and the phone mockup clock

## Dashboard specifics
- Portfolio card shows **24 h variation only** — 1D/1W/1M period buttons were removed
- History snapshots saved to `dashboard_history.json` (one per hour, max configurable)

## Deployment
Configured for Replit Autoscale using `gunicorn`.

## User preferences

- **Git identity — OBRIGATÓRIO**: Todos os commits e pushes DEVEM usar `user.name = madnessinvestor` e `user.email = madness.investor@gmail.com`. NUNCA commitar como "Replit Agent" ou "agent@replit.com". Antes de qualquer `git commit` ou `git push`, SEMPRE executar: `git config user.name "madnessinvestor" && git config user.email "madness.investor@gmail.com"`. Isso se aplica ao agente também — não é opcional.
