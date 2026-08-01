# 🟢 CryptoAIO

**Crypto AIO** is an **All-in-One** cryptocurrency application designed to bring together the essential tools that investors and traders use every day, without requiring users to connect or grant access to their wallets. 

## Key Features

* 📊 Track portfolios using public wallet addresses. `No need for logins or wallet subscriptions` (On-Chain + Manual Assets) in EVM, Solana, Bitcoin and Others.
* ⭐ Create personalized watchlists with home screen widget support.
* 🔔 Price Alerts Set high/low alerts for any watchlist asset. Instant browser notification.
* 📈 Manage and track your trading history.
* 🤖 Integrated AI (Groq, Gemini, Openrouter between others with custom config) for analyzing assets, portfolios, and trades, fully customizable to your preferred AI provider. With voice and text guidance. `It requires its own AI to function`
* 📱 Embeddable Widget, A standalone ticker widget (`/widget`) that can be embedded in any page.
* 💻 Available on Desktop, Android, and iOS.
* 🌐 Runs directly in the browser as a Progressive Web App (PWA), with optional installation.
* 🔒 Privacy-first architecture, with local processing whenever possible to keep your data under your control.

The goal of **Crypto AIO** is to provide a complete cryptocurrency management experience by combining portfolio tracking, investment management, market monitoring, and AI-powered insights into a single modern, fast, and secure platform.

---

## 🚀 Multi-Exchange Price Aggregation
*Supports **cryptocurrencies, Brazilian stocks (B3), US stocks, and Forex** in a single platform. Track assets with real-time market data, switch instantly between **BRL, USD, and EUR**, and monitor everything from one unified dashboard. Compatible with thousands of supported tickers across multiple markets.
**It uses Hyperliquid, MEXC, KuCoin, Gate.io, OKX, Kraken, Bitfinex, CoinGecko, CoinCap, CryptoCompare, and Yahoo Finance to ensure accurate asset pricing.

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

## 📄 License

Distributed under the **MIT** license.

---

<div align="center">
  <strong>CryptoAIO</strong> — Simple. Fast. Private.
</div>
