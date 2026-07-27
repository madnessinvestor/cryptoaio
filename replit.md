# CryptoAIO

A privacy-first, all-in-one asset tracker for Cryptocurrencies, Stocks, and Forex — built with **Flask + Vanilla JavaScript** as a **Progressive Web App (PWA)**.

## Stack
- **Backend**: Python / Flask (`app.py`)
- **Frontend**: Vanilla JS, HTML, CSS (under `static/` and `templates/`)
- **Dependencies**: `flask`, `gunicorn` (see `requirements.txt`)

## Running the app
```
python3 app.py
```
Opens at `http://localhost:5000`. The Replit workflow `Start application` handles this automatically.

## Environment Variables (optional — Mad AI features)
| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq — Whisper transcription + LLaMA chat |
| `GOOGLE_AI_API_KEY` | Google Gemini (fallback) |
| `OPENROUTER_API_KEY` | OpenRouter (fallback) |

Without these keys, Mad AI is unavailable. All other modules (watchlist, portfolio, stocks, forex) work without any keys.

## Data
- `assets.json` — persistent watchlist/portfolio data (local file, no DB)
- `alerts.json` — price alert rules
- `static/icons/tokens/` — cached token icon images (downloaded on demand)

## Deployment
Configured for Replit Autoscale using `gunicorn` (`run` in `.replit`).

## User preferences
