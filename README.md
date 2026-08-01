# 🟢 CryptoAIO

**CryptoAIO** is an All-In-One, *privacy-first* asset tracker for **Cryptocurrencies, Stocks and Forex**, built with **Flask + Vanilla JavaScript** as a **Progressive Web App (PWA)**.

Monitor your favourite assets quickly and lightly — no account, no subscription, no tracking.

---

## ✨ Features

### 🤖 Mad AI — AI-Powered Financial Assistant
Chat with an AI specialised in your portfolio, with **voice** support.

- Full trade analysis (P&L, win rate, best/worst asset)
- Natural-language questions about your portfolio
- **Voice input**: record your question with the microphone; audio is transcribed via **Groq Whisper** (primary) or **OpenAI Whisper** (fallback if `OPENAI_API_KEY` is set)
- **Text-to-speech**: listen to AI responses with native speech synthesis
- Gateway with automatic fallback across providers: **Groq → Gemini → OpenRouter**
- **Custom provider**: any OpenAI-compatible endpoint — Cloudflare Workers AI, local models, self-hosted LLMs

---

### 🚀 Multi-Exchange Price Aggregation
Prices fetched from multiple exchanges simultaneously with automatic best-source selection.

| Exchange | Exchange | Exchange |
|----------|----------|----------|
| Hyperliquid | MEXC | KuCoin |
| Gate.io | OKX | Kraken |
| Bitfinex | CoinGecko | CoinCap |
| CryptoCompare | Yahoo Finance | — |

---

### 📊 Stocks

#### 🇧🇷 Brazilian Stock Exchange (B3)
PETR4, VALE3, ITUB4, BBAS3, WEGE3, BBDC4 and many more — via **brapi.dev**.

#### 🇺🇸 US Stock Market
AAPL, MSFT, NVDA, TSLA, GOOGL and any supported American ticker.

---

### 💱 Forex
Real-time pairs with automatic flag icons:
`USDBRL` · `EURBRL` · `GBPBRL` · `USDEUR` · `USDJPY`

---

### 🌎 Multi-Currency
View all assets in **BRL (R$)**, **USD ($)** or **EUR (€)** with real-time conversion and instant switching without reloading the page.

---

### ⭐ Watchlist
Add and remove assets with automatic persistence — no login required.

---

### 💼 Trade Tab (Portfolio)
- Record entries and exits per asset
- Realised and unrealised P&L calculation
- Win rate and aggregated statistics
- Multiple trades per asset supported

---

### 🏦 Dashboard (On-Chain + Manual Assets)
- Track on-chain wallet balances grouped by network and asset
- **Tokens / DeFi / Perps tabs** per wallet — separate views for token balances, DeFi positions, and perpetual positions
- Manual assets for off-chain or custom positions
- Portfolio diversification chart
- Portfolio 24 h variation (% and absolute value)
- Add wallets and manual assets via the **speed-dial FAB button** (＋)
- **Transaction hash lookup** — decode any EVM, Solana, or Bitcoin transaction directly from the app

#### Supported Wallet Networks

| Type | Networks |
|------|----------|
| EVM | Ethereum · Polygon · Arbitrum One · Base · HyperEVM |
| Other | Solana · Bitcoin · Ergo · Starknet · SEI |

---

### 🔔 Price Alerts
Set high/low alerts for any watchlist asset. Instant browser notification.

---

### 📱 Embeddable Widget
A standalone ticker widget (`/widget`) that can be embedded in any page.

- Configurable columns (1 or 2) and rows (1 or 2 per asset)
- Adjustable font size, currency, and refresh rate
- **Live "AO VIVO" preview** inside a phone mockup with real-time clock and green wallpaper background
- **Themes**: Escuro · Claro · Purple Dark · Auto · **Custom colour** (full HSB picker — saturation/brightness canvas + hue slider + hex input)
- Separate settings page at `/widget/settings`

---

### 📱 Progressive Web App (PWA)
Install CryptoAIO directly on your home screen on Android, iPhone, Windows, macOS or Linux.
- Offline shell
- Fast loading
- Native-like experience

---

### 🔒 Privacy First

| ✅ No account required | ✅ No personal data collected |
|---|---|
| ✅ No analytics or tracking | ✅ No private keys |
| ✅ No broker integration | ✅ No data selling |

---

## 🪙 Supported Asset Types

| Type | Examples |
|------|----------|
| Cryptocurrencies | BTC, ETH, SOL, HYPE, XRP, DOGE |
| Brazilian Stocks (B3) | PETR4, VALE3, ITUB4, WEGE3 |
| US Stocks | AAPL, NVDA, TSLA, GOOGL |
| Forex | USDBRL, EURBRL, GBPBRL |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 + Flask 3 |
| Frontend | HTML5 · CSS3 · Vanilla JS (ES6+) |
| AI | Groq (Whisper + LLaMA) · Gemini · OpenRouter |
| Market Data | Hyperliquid, MEXC, KuCoin, Gate.io, OKX, Kraken, Bitfinex, CoinGecko, CoinCap, CryptoCompare, brapi.dev, Frankfurter, Yahoo Finance |
| Storage | Local JSON + localStorage |

---

## 📂 Project Structure

```
cryptoaio/
├── app.py                  # Flask backend — routes, price aggregation, Mad AI gateway
├── launcher.py             # Desktop launcher (PyInstaller + pywebview / browser fallback)
├── android_main.py         # Android launcher (Kivy / Buildozer)
├── assets.json             # Persisted watchlist
├── alerts.json             # Price alerts
├── portfolio_data.json     # Trade / portfolio entries
├── dashboard_wallets.json  # On-chain wallets
├── dashboard_manual.json   # Manual dashboard assets
├── dashboard_history.json  # Portfolio value snapshots (24 h chart)
├── requirements.txt
│
├── static/
│   ├── style.css           # Global styles (dark / light / purple-dark / custom themes)
│   ├── app.js              # Core logic (watchlist, prices, currency, refresh)
│   ├── madai.js            # Mad AI — chat, voice input, TTS
│   ├── trade.js            # Trade tab / portfolio
│   ├── dashboard.js        # Wallet dashboard & manual assets
│   ├── alerts.js           # Price alerts
│   ├── widget.js           # Widget tab (live preview, themes, HSB colour picker)
│   ├── gist.js             # GitHub Gist sync (auto-backup & restore)
│   ├── backup.js           # Local data import / export
│   ├── i18n.js             # Internationalisation (pt / en)
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service Worker
│   └── icons/              # Local token icon cache
│
└── templates/
    ├── index.html          # Main SPA
    ├── widget.html         # Standalone widget page
    └── widget_settings.html
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+

### Installation

```bash
git clone https://github.com/madnessinvestor/cryptoaio
cd cryptoaio
pip install -r requirements.txt
python app.py
```

Open in your browser: `http://localhost:5000`

### Running on Replit

Dependencies are installed automatically. Just press **Run**.

### Running as Desktop App

```bash
pip install -r requirements.txt pywebview
python launcher.py
```

Opens in a native window via pywebview, or falls back to the system browser. To build a standalone executable:

```bash
pyinstaller CryptoAIO.spec
```

### Building the Android APK

Requires [Buildozer](https://buildozer.readthedocs.io/):

```bash
buildozer android debug
```

Build configuration is in `buildozer.spec`.

### Environment Variables (optional — required for Mad AI)

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Flask session secret key (set in Replit Secrets) |
| `GROQ_API_KEY` | Groq (Whisper transcription + LLaMA chat) |
| `GOOGLE_AI_API_KEY` | Google Gemini (fallback) |
| `OPENROUTER_API_KEY` | OpenRouter (fallback) |
| `OPENAI_API_KEY` | OpenAI Whisper — voice transcription fallback (used when `GROQ_API_KEY` is absent) |

> Without AI keys, Mad AI is unavailable. All other modules work normally.

---

## 🎯 Roadmap

- [x] Multi-asset watchlist
- [x] Portfolio with P&L
- [x] On-chain wallet dashboard
- [x] Manual assets dashboard
- [x] Portfolio diversification chart
- [x] Portfolio 24 h variation only (simplified, no period buttons)
- [x] Price alerts
- [x] Multi-currency (BRL / USD / EUR)
- [x] Mad AI — AI assistant with portfolio analysis
- [x] Voice input (Groq Whisper)
- [x] Text-to-speech (native TTS)
- [x] Installable PWA
- [x] Embeddable widget with 2-column / 2-row layouts
- [x] Widget phone mockup preview (live "AO VIVO" with clock & wallpaper)
- [x] Widget custom colour picker (HSB canvas + hue slider + hex input)
- [x] Widget themes: Dark · Light · Purple Dark · Auto · Custom
- [x] i18n — Portuguese & English (full coverage)
- [x] Global refresh button syncs widget live data + clock
- [x] DeFi positions and Perps tracked per wallet (Tokens / DeFi / Perps tabs)
- [x] Transaction hash lookup (EVM, Solana, Bitcoin)
- [x] Custom AI provider (Cloudflare Workers AI, any OpenAI-compatible endpoint)
- [x] Desktop app (PyInstaller + pywebview)
- [x] Android APK (Buildozer / Kivy)
- [ ] Historical price charts per asset
- [ ] Multiple watchlists

---

## 📝 Changelog

### v2026.07.29 (rev5)
- **Widget — custom colour picker**: new "🎨 Cor" theme option opens a full HSB panel (saturation/brightness canvas + hue slider + hex input + live swatch). Colour persists in `localStorage` and applies instantly to the "AO VIVO" preview.
- **Widget — Purple Dark theme**: new preset theme with deep purple background and lilac accents.
- **Widget — phone mockup preview**: the "AO VIVO" section is now wrapped in a phone-frame mockup with a green wallpaper background, a status bar with live clock, and a pill notch — simulating how the widget looks on a real device.
- **Widget — phone clock syncs on refresh**: pressing the global ↻ button now also calls `wltLoad()` (updates live data and "Atualizado às" timestamp) and `_updatePhoneClock()` (updates the status bar clock).
- **Widget — i18n fix for empty state**: "Nenhum ativo na Watchlist ainda" / "No assets in Watchlist yet" now uses the `t()` i18n function so it correctly switches language when the user changes locale in Config.
- **Dashboard — 24 h only**: removed the 1S / 1M period buttons from the Portfolio card. Only the 24 h variation is shown.

### v2026.07.29 (rev4)
- **Data reset on import**: cleared all sample data from the original repository (watchlist, trades, wallets, alerts, history) so the app starts completely empty on first run.

### v2026.07.29 (rev3)
- **Mad AI icon redesign**: replaced the sparkle/star icon with a robot head (antenna, eyes, mouth) across all three locations — navigation bar, section header, and the "not configured" empty state card.
- **Mad AI empty-state icon**: the robot icon on the "not configured" card is now 128 px (2× larger) and has a **breathing animation** (smooth scale pulse).

### v2026.07.29 (rev2)
- **Share report — no more pop-up blocker**: the full report now opens in an in-page fullscreen overlay instead of a new browser window.
- **Share report — language-aware**: the generated report respects the app's active language (PT/EN).
- **i18n — English translations for Share report**: added all missing EN translations for `rpt_share_*` keys.

### v2026.07.29
- Initial Replit deployment. Flask dependencies installed, workflow configured, app verified running.

---

## 📄 License

Distributed under the **MIT** license.

---

<div align="center">
  <strong>CryptoAIO</strong> — Simple. Fast. Private.
</div>
