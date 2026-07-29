# Privacy Policy

**madnessinvestor** built **CryptoAIO** as an Open Source application. This SERVICE is provided by madnessinvestor at no cost and is intended for use as is.

This page is used to inform visitors regarding the policies for the collection, use, and disclosure of Personal Information if anyone decided to use this Service.

If you choose to use this Service, then you agree to the collection and use of information in relation to this policy. The information described in this Privacy Policy is handled solely for the purpose of enabling the features of the app. It is **not** collected centrally, **not** sold, and **not** shared with third parties beyond what is strictly necessary to provide price data and optional AI features, as described below.

---

## Information Collection and Use

CryptoAIO is designed to work **entirely on-device**. The app does not require an account, does not collect your name, email address, or any personally identifiable information, and does not maintain any server-side database of user data.

The following information is stored **locally** (on your device only):

| Data | Where stored | Purpose |
|------|-------------|---------|
| Watchlist (asset symbols) | Local file / `localStorage` | Display prices for your selected assets |
| Portfolio trades (ticker, quantity, price, date) | Local file | P&L and win-rate calculation |
| On-chain wallet addresses | Local file | Fetch on-chain balances from public blockchain APIs |
| Manual asset entries | Local file | Display and value custom positions |
| Price alert rules | Local file | Trigger browser notifications |
| Dashboard history snapshots | Local file | Historical portfolio value chart |
| Theme, currency, language preferences | `localStorage` | Personalise the app appearance |
| AI provider API keys | `localStorage` | Sent directly from your browser to the chosen AI provider |
| GitHub Gist token (optional) | `localStorage` | Sync your data to your own private GitHub Gist |

None of this information is transmitted to the CryptoAIO developer or any central server.

---

## Network Requests — Third-Party Services

To display real-time market prices, on-chain balances, and AI responses, the app makes outbound requests **directly from your browser (or local server)** to the following third-party APIs. Each provider's own privacy policy applies to those requests.

### Market Data Providers

| Provider | Data sent | Privacy Policy |
|----------|-----------|---------------|
| [Hyperliquid](https://hyperliquid.xyz) | Asset symbol | [hyperliquid.xyz/privacy](https://hyperliquid.xyz/privacy) |
| [MEXC](https://www.mexc.com) | Asset symbol | [mexc.com/privacy](https://www.mexc.com/page/privacy) |
| [KuCoin](https://www.kucoin.com) | Asset symbol | [kucoin.com/privacy](https://www.kucoin.com/privacy) |
| [Gate.io](https://www.gate.io) | Asset symbol | [gate.io/privacy](https://www.gate.io/en/privacyStatement) |
| [OKX](https://www.okx.com) | Asset symbol | [okx.com/privacy](https://www.okx.com/help/privacy-policy) |
| [Kraken](https://www.kraken.com) | Asset symbol | [kraken.com/privacy](https://www.kraken.com/legal/privacy) |
| [Bitfinex](https://www.bitfinex.com) | Asset symbol | [bitfinex.com/privacy](https://www.bitfinex.com/legal/privacy) |
| [CoinGecko](https://www.coingecko.com) | Asset symbol | [coingecko.com/privacy](https://www.coingecko.com/en/privacy) |
| [CoinCap](https://coincap.io) | Asset symbol | [coincap.io/privacy](https://coincap.io/privacy) |
| [CryptoCompare](https://www.cryptocompare.com) | Asset symbol | [cryptocompare.com/privacy](https://www.cryptocompare.com/privacy-policy) |
| [brapi.dev](https://brapi.dev) | Asset symbol | [brapi.dev/docs](https://brapi.dev) |
| [Frankfurter](https://www.frankfurter.app) | Currency pair | [frankfurter.app](https://www.frankfurter.app) |
| [Yahoo Finance (via proxy)](https://finance.yahoo.com) | Asset symbol | [yahoo.com/privacy](https://legal.yahoo.com/us/en/yahoo/privacy/index.html) |

Only the **asset symbols you add to your watchlist** are sent to these APIs. No personal information is included in these requests.

### On-Chain Wallet Balances

If you add a wallet address to the Dashboard, that **public wallet address** is sent to public blockchain APIs (e.g. Ethereum RPC endpoints, Solana RPC) solely to fetch token balances. Wallet addresses are public on-chain data by nature.

No private keys are ever requested or transmitted.

### Mad AI — Artificial Intelligence Assistant

If you configure the Mad AI feature, the app communicates with the AI provider you choose:

| Provider | Privacy Policy |
|----------|---------------|
| [Groq](https://groq.com) | [groq.com/privacy](https://groq.com/privacy-policy) |
| [Google Gemini](https://gemini.google.com) | [policies.google.com/privacy](https://policies.google.com/privacy) |
| [OpenRouter](https://openrouter.ai) | [openrouter.ai/privacy](https://openrouter.ai/privacy) |
| [Cloudflare AI](https://ai.cloudflare.com) | [cloudflare.com/privacypolicy](https://www.cloudflare.com/privacypolicy/) |

When using Mad AI:

- Your **questions and portfolio data** (aggregated numbers, not raw keys or private information) are sent to the chosen provider to generate a response.
- **Voice input** (if used) is transcribed via Groq Whisper (primary) or OpenAI Whisper (fallback): the audio recording is sent to the respective provider's API. The audio is not stored by CryptoAIO.
- Your AI provider **API key** is stored only in your browser's `localStorage` and is sent directly from your browser to the chosen provider. It is never sent to or stored by the CryptoAIO developer.

### GitHub Gist Sync (Optional)

If you choose to enable data sync via GitHub Gist:

- Your **GitHub Personal Access Token** (with `gist` scope only) is stored in your browser's `localStorage`.
- The token is sent directly from your browser to [GitHub's API](https://api.github.com) to create or update a **private** Gist under your own GitHub account.
- CryptoAIO's developer has no access to your Gist or your token.
- GitHub's privacy policy applies: [docs.github.com/site-policy/privacy-policies](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)

---

## Log Data

When you access the app, the server (whether self-hosted or on a platform like Replit) may automatically record standard HTTP request logs, including:

- IP address
- Browser type and version
- Pages visited
- Timestamps

This is standard web server behaviour. If you are self-hosting CryptoAIO, this data is on your own infrastructure. If you are using a hosted instance, the hosting platform's privacy policy applies.

---

## Cookies and Local Storage

CryptoAIO does **not** use tracking cookies or third-party advertising cookies.

The app uses browser **`localStorage`** to persist your preferences and data locally. This data never leaves your device unless you explicitly use the GitHub Gist sync feature.

---

## Service Worker / PWA

CryptoAIO can be installed as a Progressive Web App (PWA). The Service Worker caches static assets (HTML, CSS, JS) for offline use. It does not collect or transmit any personal data.

---

## Security

CryptoAIO is designed so that sensitive data (API keys, wallet addresses, portfolio data) stays on your device. The developer does not have access to your data.

However, no method of storage or transmission over the internet is 100% secure. If you self-host the app, you are responsible for the security of your own server and environment.

---

## Children's Privacy

This Service does not address anyone under the age of 13. CryptoAIO does not knowingly collect personally identifiable information from children. If you are a parent or guardian and you are aware that your child has provided information through this Service, please contact us so that the appropriate action can be taken.

---

## Links to Other Sites

This Service may contain links to external websites (exchanges, data providers, AI services). If you click on a third-party link, you will be directed to that site. These external sites are not operated by CryptoAIO and their privacy policies apply.

---

## Changes to This Privacy Policy

This Privacy Policy may be updated from time to time. Changes are effective immediately upon being posted in this file. You are advised to review this page periodically.

**Last updated:** July 29, 2026

---

## Contact

If you have any questions or suggestions about this Privacy Policy, do not hesitate to open an issue on GitHub:

📌 [github.com/madnessinvestor/cryptoaio/issues](https://github.com/madnessinvestor/cryptoaio/issues)

---

<div align="center">
  <strong>CryptoAIO</strong> — Simple. Fast. Private.
</div>
