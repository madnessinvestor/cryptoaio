# CryptoAIO

Rastreador de ativos **privacy-first** com PWA para Criptomoedas, Ações Brasileiras (B3), Ações Americanas e pares de Câmbio (Forex).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + Flask |
| Frontend | Vanilla JavaScript (PWA, sem frameworks) |
| Armazenamento | Arquivos JSON locais |
| i18n | `static/i18n.js` — Português (padrão) e Inglês |
| PWA | `static/sw.js` + `static/manifest.json` |

---

## Como rodar

```bash
pip install -r requirements.txt
python3 app.py
```

Sobe na porta **5000**.

---

## Funcionalidades

### 📈 Watchlist
- Rastreamento de preços em tempo real via múltiplas exchanges
- Suporte a criptomoedas, ações (B3 e NYSE/NASDAQ via Yahoo Finance) e Forex
- Alertas de preço com notificações push no browser

### 🗂 Portfolio Dashboard
- Agrega ativos de carteiras **EVM** (Ethereum, Base, Arbitrum, Optimism, BSC, Polygon, HyperEVM, Sei, Avalanche, zkSync, Linea, Scroll, Mantle via Blockscout/RPC), **Solana** e **Bitcoin**
- Suporte a posições **DeFi** e **Perps**
- Ativos manuais (entradas customizadas)
- **Gráfico histórico do portfólio** com períodos 1D / 1W / 1M:
  - Reconstrói valor histórico via `value_usd × (preço_histórico / preço_atual)`
  - Evita distorções de tokens DeFi/receipt (XSOL, KHYPE, etc.)
  - Tokens estáveis tratados como $1 constante
  - Mapeamento de tokens wrapped/bridged para ticker canônico (WETH→ETH, POL→MATIC, etc.)
  - Cache server-side de 10 min por período; invalida ao atualizar carteiras
- Auto-refresh a cada 3 minutos quando o dashboard está visível

### 💱 Trade Tracker
- Registro manual de trades com preço médio e P&L
- Lookup automático de transações via hash ou link de explorer
- Exportação de relatório em PDF

### 🔔 Alertas
- Alertas de preço com opção de repetição
- Notificações push via Service Worker

### 🤖 Mad AI
- Analista de portfólio usando LLMs (Groq / Gemini / OpenRouter)
- Transcrição de voz via Whisper
- Respostas em TTS
- Requer ao menos uma das chaves de API opcionais

### 📱 Widget
- Widget de tela inicial para PWA instalado (tamanhos: 2×1, 2×2, 4×2)
- Mostra preços/saldos configuráveis

---

## Integrações de Dados

### Exchanges (preços e candles)
- **Hyperliquid** (principal para criptos)
- **MEXC**, **Gate.io**, **OKX**, **Kraken**, **Bitfinex** (fallbacks em cascata)
- **CoinGecko** (busca/metadados)
- **Yahoo Finance** (ações e Forex)
- **Frankfurter** (taxas de câmbio FX)

### Chains suportadas (carteiras on-chain)
Ethereum, Base, Arbitrum, Optimism, BSC, Polygon, HyperEVM, Sei, Avalanche, zkSync, Linea, Scroll, Mantle

---

## Endpoints da API

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/assets` | GET / POST | Watchlist (leitura e escrita) |
| `/api/portfolio` | GET / POST | Trades do portfólio |
| `/api/portfolio/order` | POST | Reordenar ativos |
| `/api/search` | GET | Busca multi-source (HL, CoinGecko, Yahoo) |
| `/api/price` | GET | Preço atual de um ativo |
| `/api/price-lookup` | GET | Lookup de preço por símbolo |
| `/api/history` | GET | Candles OHLCV |
| `/api/rates` | GET | Taxas de câmbio FX |
| `/api/icon` | GET | Ícone do token (disco local → fallback externo) |
| `/api/icon-img` | GET | PNG direto do ícone |
| `/api/tx-lookup` | GET | Dados de transação por hash |
| `/api/alerts` | GET / POST | Alertas de preço |
| `/api/ai/chat` | POST | Chat com LLM (Mad AI) |
| `/api/ai/transcribe` | POST | Transcrição de áudio (Whisper) |
| `/api/ai/status` | GET | Status das chaves de IA |
| `/api/dashboard/wallets` | GET / POST / DELETE | CRUD de carteiras |
| `/api/dashboard/wallets/<addr>/refresh` | POST | Atualizar carteira individual |
| `/api/dashboard/manual` | GET / POST / DELETE | Ativos manuais |
| `/api/dashboard/manual/refresh` | POST | Atualizar preços manuais |
| `/api/dashboard/history` | GET | Snapshots históricos do dashboard |
| `/api/dashboard/snapshot` | POST | Salvar snapshot atual |
| `/api/dashboard/chart` | GET | Série temporal do portfólio (`?period=1D\|1W\|1M`) |

---

## Arquivos de Dados

| Arquivo | Conteúdo |
|---|---|
| `assets.json` | Watchlist de ativos |
| `portfolio_data.json` | Trades registrados |
| `alerts.json` | Alertas de preço configurados |
| `dashboard_wallets.json` | Carteiras on-chain cadastradas |
| `dashboard_manual.json` | Ativos manuais do dashboard |
| `dashboard_history.json` | Snapshots históricos de saldo |
| `static/icons/tokens/` | Cache local de ícones PNG |
| `static/icons/token_urls.json` | Mapa de URLs de ícones cacheados |

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SESSION_SECRET` | ✅ Sim (já configurada) | Chave secreta da sessão Flask |
| `GROQ_API_KEY` | Opcional | Mad AI — LLaMA chat + transcrição Whisper |
| `GOOGLE_AI_API_KEY` | Opcional | Mad AI — Gemini como fallback |
| `OPENROUTER_API_KEY` | Opcional | Mad AI — OpenRouter como fallback |

> Sem as chaves opcionais, o Mad AI fica desabilitado. Todas as outras funcionalidades (watchlist, dashboard, alertas, forex, ações) funcionam normalmente.

---

## Sistema de Ícones

Ícones são buscados em cascata:
1. CoinGecko Search API
2. `erikthiart/cryptocurrency-icons` (GitHub)
3. `spothq/cryptocurrency-icons`
4. CoinCap

Após o primeiro download, o PNG é salvo em `static/icons/tokens/{SYM}.png` e servido localmente em todas as requisições seguintes.

---

## User preferences
