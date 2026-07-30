"""
CryptoAIO — Android Foreground Service
Roda num processo separado do Kivy.
Permanece vivo mesmo com o app completamente fechado.
Verifica alertas de preço a cada 60 s e dispara notificações nativas.

Preços obtidos diretamente de APIs externas (CoinGecko + Hyperliquid)
— sem dependência do Flask, que roda apenas no processo principal.
"""

import os
import sys
import json
import time
import urllib.request

# ── Caminhos ──────────────────────────────────────────────────────────────────
_SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
_APP_ROOT    = os.path.dirname(_SERVICE_DIR)          # diretório raiz do app
sys.path.insert(0, _APP_ROOT)

from kivy.utils import platform

ALERTS_FILE      = os.path.join(_APP_ROOT, "alerts.json")
CHANNEL_ID_LOW   = "cryptoaio_service"        # canal para notificação persistente (sem som)
CHANNEL_ID_HIGH  = "cryptoaio_price_alerts"   # canal para alertas disparados (com som)
POLL_INTERVAL    = 60                          # segundos entre verificações


# ── Foreground Service ────────────────────────────────────────────────────────

def _get_service():
    """Retorna a instância do serviço Android (mService)."""
    from jnius import autoclass
    from android.config import SERVICE_CLASS_NAME
    return autoclass(SERVICE_CLASS_NAME).mService


def _ensure_channel(manager, channel_id, name, importance):
    """Cria o canal de notificação se ainda não existir (idempotente)."""
    from jnius import autoclass
    NotificationChannel = autoclass("android.app.NotificationChannel")
    String              = autoclass("java.lang.String")
    channel = NotificationChannel(String(channel_id), String(name), importance)
    channel.enableVibration(importance > 2)   # vibra apenas em canais HIGH
    channel.enableLights(True)
    manager.createNotificationChannel(channel)


def _start_foreground():
    """
    Promove o serviço a Foreground Service, exibindo uma notificação
    persistente (obrigatória pelo Android para serviços em background).
    Captura SecurityException do Android 14+ quando o atributo
    foregroundServiceType ainda não está no manifesto — o serviço
    continua rodando sem o status foreground nesse caso.
    """
    if platform != "android":
        return
    try:
        from jnius import autoclass
        NotificationManager = autoclass("android.app.NotificationManager")
        Builder             = autoclass("android.app.Notification$Builder")
        Rdrawable           = autoclass("android.R$drawable")
        String              = autoclass("java.lang.String")

        mService = _get_service()
        manager  = mService.getSystemService(mService.NOTIFICATION_SERVICE)

        _ensure_channel(manager, CHANNEL_ID_LOW, "Serviço CryptoAIO",
                        NotificationManager.IMPORTANCE_LOW)

        builder = Builder(mService, String(CHANNEL_ID_LOW))
        builder.setSmallIcon(Rdrawable.ic_dialog_info)
        builder.setContentTitle(String("CryptoAIO"))
        builder.setContentText(String("Monitorando alertas de preço…"))
        builder.setOngoing(True)
        builder.setPriority(-2)   # PRIORITY_MIN — não incomoda o usuário

        mService.startForeground(1, builder.build())
        print("[Service] Foreground service iniciado")
    except Exception as e:
        # No Android 14+ sem foregroundServiceType no manifesto isso falha
        # — o serviço continua rodando mas pode ser morto mais cedo pelo SO.
        print(f"[Service] startForeground falhou (continuando em background): {e}")


# ── Notificações de alerta ────────────────────────────────────────────────────

def _notify(title, message):
    """Dispara uma notificação de alerta de alta prioridade."""
    if platform != "android":
        print(f"[Service] NOTIFY: {title} — {message}")
        return
    try:
        from jnius import autoclass
        NotificationManager = autoclass("android.app.NotificationManager")
        Builder             = autoclass("android.app.Notification$Builder")
        Rdrawable           = autoclass("android.R$drawable")
        String              = autoclass("java.lang.String")

        mService = _get_service()
        manager  = mService.getSystemService(mService.NOTIFICATION_SERVICE)

        _ensure_channel(manager, CHANNEL_ID_HIGH, "Alertas Disparados",
                        NotificationManager.IMPORTANCE_HIGH)

        builder = Builder(mService, String(CHANNEL_ID_HIGH))
        builder.setSmallIcon(Rdrawable.ic_dialog_info)
        builder.setContentTitle(String(title))
        builder.setContentText(String(message))
        builder.setAutoCancel(True)
        builder.setPriority(1)    # PRIORITY_HIGH — mostra banner heads-up

        notif_id = int(time.time()) % 100_000
        manager.notify(notif_id, builder.build())
    except Exception as e:
        print(f"[Service] notify error: {e}")


# ── Busca de preços ───────────────────────────────────────────────────────────

# Mapeamento símbolo → ID no CoinGecko (cobre as principais criptos)
_COINGECKO_IDS = {
    "BTC":   "bitcoin",
    "ETH":   "ethereum",
    "SOL":   "solana",
    "BNB":   "binancecoin",
    "XRP":   "ripple",
    "ADA":   "cardano",
    "DOGE":  "dogecoin",
    "MATIC": "matic-network",
    "POL":   "matic-network",
    "DOT":   "polkadot",
    "AVAX":  "avalanche-2",
    "LINK":  "chainlink",
    "UNI":   "uniswap",
    "ATOM":  "cosmos",
    "LTC":   "litecoin",
    "BCH":   "bitcoin-cash",
    "TRX":   "tron",
    "TON":   "the-open-network",
    "NEAR":  "near",
    "OP":    "optimism",
    "ARB":   "arbitrum",
    "HYPE":  "hyperliquid",
    "SUI":   "sui",
    "APT":   "aptos",
    "INJ":   "injective-protocol",
    "SEI":   "sei-network",
    "PEPE":  "pepe",
    "WIF":   "dogwifcoin",
    "BONK":  "bonk",
    "JUP":   "jupiter-exchange-solana",
}


def _fetch_prices_coingecko(symbols):
    """Busca preços USD via CoinGecko (gratuito, sem chave)."""
    prices = {}
    sym_to_id  = {s: _COINGECKO_IDS[s] for s in symbols if s in _COINGECKO_IDS}
    id_to_sym  = {v: k for k, v in sym_to_id.items()}
    if not sym_to_id:
        return prices
    ids_str = ",".join(set(sym_to_id.values()))
    url = (
        "https://api.coingecko.com/api/v3/simple/price"
        f"?ids={ids_str}&vs_currencies=usd"
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read())
        for cg_id, v in data.items():
            sym = id_to_sym.get(cg_id)
            if sym and "usd" in v:
                prices[sym] = float(v["usd"])
    except Exception as e:
        print(f"[Service] CoinGecko error: {e}")
    return prices


def _fetch_prices_hyperliquid(symbols):
    """Busca preços via Hyperliquid (cobre tokens de perps)."""
    prices = {}
    url = "https://api.hyperliquid.xyz/info"
    data = json.dumps({"type": "allMids"}).encode()
    req  = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            mids = json.loads(r.read())   # {"BTC": "67000.5", ...}
        for sym in symbols:
            if sym in mids:
                try:
                    prices[sym] = float(mids[sym])
                except ValueError:
                    pass
    except Exception as e:
        print(f"[Service] Hyperliquid error: {e}")
    return prices


def _fetch_prices(symbols):
    """
    Tenta Hyperliquid primeiro (mais rápido para cripto),
    preenche o que faltou com CoinGecko.
    """
    prices = _fetch_prices_hyperliquid(symbols)
    missing = [s for s in symbols if s not in prices]
    if missing:
        prices.update(_fetch_prices_coingecko(missing))
    return prices


# ── Alertas ───────────────────────────────────────────────────────────────────

def _read_alerts():
    try:
        with open(ALERTS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _write_alerts(alerts):
    try:
        with open(ALERTS_FILE, "w", encoding="utf-8") as f:
            json.dump(alerts, f, ensure_ascii=False)
    except Exception as e:
        print(f"[Service] write alerts error: {e}")


def _fmt_price(p):
    if p is None:
        return "—"
    if p >= 10_000:
        return f"${p:,.0f}"
    if p >= 1:
        return f"${p:,.2f}"
    if p >= 0.01:
        return f"${p:.4f}"
    return f"${p:.6f}"


def _check_alerts(local_fired):
    alerts = _read_alerts()
    active = [a for a in alerts if not a.get("triggered")]
    if not active:
        return

    symbols = list({(a.get("ticker") or "").upper() for a in active})
    prices  = _fetch_prices(symbols)
    now     = time.time()
    changed = False

    for alert in alerts:
        if alert.get("triggered"):
            continue

        ticker    = (alert.get("ticker") or "").upper()
        target    = float(alert.get("target") or 0)
        direction = alert.get("direction", "above")
        alert_id  = alert.get("id")
        repeat    = int(alert.get("repeat_interval") or 0)
        price     = prices.get(ticker)

        if price is None:
            continue   # símbolo não suportado em background (ex: ações)

        fired = (
            (direction == "above" and price >= target) or
            (direction == "below" and price <= target)
        )
        if not fired:
            continue

        if repeat == 0 and alert_id in local_fired:
            continue

        if repeat > 0:
            last_fired = float(alert.get("last_fired_at") or 0)
            if now - last_fired < repeat:
                continue

        # Marcar e notificar
        if repeat == 0:
            local_fired.add(alert_id)
            alert["triggered"] = True
        alert["last_fired_at"] = now
        changed = True

        arrow   = "▲" if direction == "above" else "▼"
        title   = f"CryptoAIO {arrow} {ticker}"
        message = f"{ticker} atingiu {_fmt_price(price)} — Alvo: {_fmt_price(target)}"
        _notify(title, message)
        print(f"[Service] Alerta disparado: {title} | {message}")

    if changed:
        _write_alerts(alerts)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    print(f"[Service] CryptoAIO Alert Service iniciando (PID {os.getpid()})")
    _start_foreground()

    local_fired = set()
    while True:
        try:
            _check_alerts(local_fired)
        except Exception as e:
            print(f"[Service] loop error: {e}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
