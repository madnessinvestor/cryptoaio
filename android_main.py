"""
CryptoAIO — Android Launcher (Buildozer / python-for-android)

Starts the Flask server on localhost:5000 then renders it inside a native
Android WebView via jnius.  Requires python-for-android (p4a).

Background alert checker: runs every 30 s, fetches prices from the local
Flask API, and fires native Android notifications when a price alert triggers.
"""

import threading
import time
import os
import sys
import json

# ── Kivy must be imported before anything else on Android ────────────────────
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.clock import Clock
from kivy.utils import platform
from kivy.core.window import Window

PORT = 5000
SERVER_READY = threading.Event()

# Notification channel ID — must match across all calls
NOTIFICATION_CHANNEL_ID = "cryptoaio_price_alerts"

# Reference to the Android WebView instance (set after creation)
_android_webview = None


# ── Flask server ──────────────────────────────────────────────────────────────

def _start_flask():
    try:
        app_root = os.path.dirname(os.path.abspath(__file__))
        sys.path.insert(0, app_root)

        for d in ["static/icons/tokens"]:
            os.makedirs(os.path.join(app_root, d), exist_ok=True)

        from app import app as flask_app
        SERVER_READY.set()
        flask_app.run(host="127.0.0.1", port=PORT, debug=False,
                      use_reloader=False, threaded=True)
    except Exception as e:
        print(f"Flask error: {e}")


# ── Background alert checker ──────────────────────────────────────────────────

def _alert_checker():
    """
    Runs in a daemon thread.
    Every 30 s: fetches alerts + asset prices from the local Flask API,
    fires native Android notifications when a price target is hit, and calls
    the trigger endpoint so the in-app state stays consistent.
    Works while the app is open OR running in the Android background.
    """
    import urllib.request

    BASE = f"http://127.0.0.1:{PORT}"

    # Wait until Flask is fully up
    SERVER_READY.wait(timeout=60)
    time.sleep(3)  # extra buffer for Flask to initialise

    # Track locally which one-time alerts already fired this session
    _local_fired = set()

    def _fetch(path):
        try:
            with urllib.request.urlopen(f"{BASE}{path}", timeout=6) as r:
                return json.loads(r.read())
        except Exception:
            return None

    def _post(path):
        try:
            req = urllib.request.Request(
                f"{BASE}{path}", method="POST",
                data=b"", headers={"Content-Length": "0"}
            )
            urllib.request.urlopen(req, timeout=6)
        except Exception:
            pass

    def _notify(title, message):
        """
        Fire a native Android notification.
        Uses jnius directly (not plyer) so we control the channel
        (required on Android 8+ / API 26+).
        The small icon uses a built-in Android system drawable —
        launcher icons are NOT suitable as notification icons on Android 5+
        because they must be white-on-transparent silhouettes.
        """
        if platform != "android":
            return
        try:
            from jnius import autoclass
            from android import mActivity

            Builder             = autoclass("android.app.Notification$Builder")
            NotificationManager = autoclass("android.app.NotificationManager")
            String              = autoclass("java.lang.String")
            # System icon — white-on-transparent, safe on all Android versions
            Rdrawable           = autoclass("android.R$drawable")

            builder = Builder(mActivity, String(NOTIFICATION_CHANNEL_ID))
            builder.setSmallIcon(Rdrawable.ic_dialog_info)
            builder.setContentTitle(String(title))
            builder.setContentText(String(message))
            builder.setAutoCancel(True)
            builder.setPriority(1)   # PRIORITY_HIGH

            manager = mActivity.getSystemService(mActivity.NOTIFICATION_SERVICE)
            notif_id = int(time.time()) % 100_000
            manager.notify(notif_id, builder.build())
        except Exception as e:
            print(f"[AlertChecker] notify error: {e}")

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

    print("[AlertChecker] started")

    while True:
        try:
            alerts = _fetch("/api/alerts")
            assets = _fetch("/api/assets")

            if alerts and assets:
                price_map = {
                    a.get("symbol", "").upper(): a.get("price")
                    for a in assets
                    if a.get("price") is not None
                }

                now = time.time()

                for alert in alerts:
                    if alert.get("triggered"):
                        continue

                    ticker    = (alert.get("ticker") or "").upper()
                    target    = float(alert.get("target") or 0)
                    direction = alert.get("direction", "above")
                    alert_id  = alert.get("id")
                    repeat    = int(alert.get("repeat_interval") or 0)

                    price = price_map.get(ticker)
                    if price is None:
                        continue

                    fired = (
                        (direction == "above" and price >= target) or
                        (direction == "below" and price <= target)
                    )
                    if not fired:
                        continue

                    if repeat == 0 and alert_id in _local_fired:
                        continue

                    if repeat > 0:
                        last_fired_at = float(alert.get("last_fired_at") or 0)
                        if now - last_fired_at < repeat:
                            continue

                    if repeat == 0:
                        _local_fired.add(alert_id)

                    _post(f"/api/alerts/{alert_id}/trigger")

                    arrow   = "▲" if direction == "above" else "▼"
                    title_n = f"CryptoAIO {arrow} {ticker}"
                    msg_n   = (
                        f"{ticker} atingiu {_fmt_price(price)}"
                        f" — Alvo: {_fmt_price(target)}"
                    )
                    _notify(title_n, msg_n)
                    print(f"[AlertChecker] fired: {title_n} | {msg_n}")

        except Exception as e:
            print(f"[AlertChecker] loop error: {e}")

        time.sleep(30)


# ── Notification helpers ───────────────────────────────────────────────────────

def _create_notification_channel():
    """
    Create the notification channel required on Android 8+ (API 26+).
    Without a channel, notifications are silently dropped on modern Android.
    Safe to call multiple times.
    """
    if platform != "android":
        return
    try:
        from jnius import autoclass
        from android import mActivity

        NotificationChannel = autoclass("android.app.NotificationChannel")
        NotificationManager = autoclass("android.app.NotificationManager")
        String              = autoclass("java.lang.String")

        channel = NotificationChannel(
            String(NOTIFICATION_CHANNEL_ID),
            String("Price Alerts"),               # user-visible name
            NotificationManager.IMPORTANCE_HIGH,  # shows heads-up banner
        )
        channel.setDescription(String("CryptoAIO price alert notifications"))
        channel.enableVibration(True)
        channel.enableLights(True)

        manager = mActivity.getSystemService(mActivity.NOTIFICATION_SERVICE)
        manager.createNotificationChannel(channel)
        print(f"[NotificationChannel] created: {NOTIFICATION_CHANNEL_ID}")
    except Exception as e:
        print(f"[NotificationChannel] error: {e}")


def _request_notification_permission():
    """Ask for POST_NOTIFICATIONS at runtime (required on Android 13 / API 33+)."""
    try:
        from android.permissions import request_permissions, Permission
        request_permissions([Permission.POST_NOTIFICATIONS])
    except Exception:
        pass  # Android < 13 does not need this


def _start_background_service():
    """
    Inicia o AlertChecker como Android Foreground Service (processo separado).
    O serviço sobrevive ao fechamento do app e continua verificando alertas.
    Usa a API nativa do p4a para iniciar serviços declarados em buildozer.spec.
    """
    if platform != "android":
        return
    try:
        from android import AndroidService
        svc = AndroidService("CryptoAIO Alerts", "Monitorando alertas de preço…")
        svc.start("")
        print("[Service] AndroidService iniciado")
    except Exception as e:
        print(f"[Service] Falha ao iniciar AndroidService: {e}")


# ── Android WebView (jnius) ───────────────────────────────────────────────────

def _open_android_webview(url, on_error=None):
    """
    Embed a native Android WebView that fills the entire activity window.
    Must be called from the main Kivy thread (Clock.schedule_once is fine).
    Returns True on success, False on failure.
    """
    global _android_webview
    if platform != "android":
        return False
    try:
        from jnius import autoclass
        from android import mActivity
        from android.runnable import run_on_ui_thread

        WebView       = autoclass("android.webkit.WebView")
        WebViewClient = autoclass("android.webkit.WebViewClient")
        WebSettings   = autoclass("android.webkit.WebSettings")

        @run_on_ui_thread
        def _create():
            global _android_webview
            wv = WebView(mActivity)
            s  = wv.getSettings()
            s.setJavaScriptEnabled(True)
            s.setDomStorageEnabled(True)
            s.setAllowFileAccess(True)
            s.setMixedContentMode(0)          # MIXED_CONTENT_ALWAYS_ALLOW
            s.setCacheMode(WebSettings.LOAD_DEFAULT)
            s.setLoadWithOverviewMode(True)
            s.setUseWideViewPort(True)
            wv.setWebViewClient(WebViewClient())
            wv.loadUrl(url)
            mActivity.setContentView(wv)
            _android_webview = wv
            print(f"[WebView] loaded: {url}")

        _create()
        return True
    except Exception as e:
        print(f"[WebView] jnius error: {e}")
        if on_error:
            on_error(str(e))
        return False


def _webview_go_back():
    """Navigate back in the WebView history (Android back button support)."""
    global _android_webview
    if _android_webview is None:
        return False
    try:
        from android.runnable import run_on_ui_thread

        @run_on_ui_thread
        def _back():
            if _android_webview.canGoBack():
                _android_webview.goBack()

        _back()
        return True
    except Exception:
        return False


# ── Kivy App ──────────────────────────────────────────────────────────────────

class CryptoAIOApp(App):

    def build(self):
        self.title = "CryptoAIO"

        self._layout = BoxLayout(orientation="vertical")
        self._label  = Label(
            text="Starting CryptoAIO…",
            font_size="18sp",
            color=(0.1, 0.9, 0.4, 1),
        )
        self._layout.add_widget(self._label)

        # Bind Android back button
        Window.bind(on_keyboard=self._on_keyboard)

        # Start Flask server
        threading.Thread(target=_start_flask, daemon=True).start()

        # Start background alert checker (in-process, while app is open)
        threading.Thread(target=_alert_checker, daemon=True).start()

        # Start the Foreground Service (separate process — survives app close)
        if platform == "android":
            _start_background_service()

        # Poll until Flask is ready, then open WebView
        Clock.schedule_interval(self._check_server, 0.5)
        return self._layout

    # ── Lifecycle ──────────────────────────────────────────────────────────

    def on_pause(self):
        """Allow the app to be backgrounded without being killed."""
        return True

    def on_resume(self):
        """Called when returning from background — nothing to do."""
        pass

    # ── Server readiness ───────────────────────────────────────────────────

    def _check_server(self, dt):
        if not SERVER_READY.is_set():
            return
        Clock.unschedule(self._check_server)
        self._open_webview()

    def _open_webview(self):
        url = f"http://127.0.0.1:{PORT}"

        if platform == "android":
            # Notification setup (idempotent, safe to call here)
            _create_notification_channel()
            _request_notification_permission()

            # Primary: native Android WebView via jnius
            ok = _open_android_webview(url, on_error=self._on_webview_error)
            if ok:
                return

            # Secondary fallback: system browser
            self._open_in_browser(url)
        else:
            # Desktop / development: open in default browser
            import webbrowser
            webbrowser.open(url)
            self._label.text = f"Running at\n{url}"

    def _on_webview_error(self, err):
        self._label.text = f"WebView error:\n{err}"

    def _open_in_browser(self, url):
        try:
            from android import mActivity
            from jnius import autoclass
            Intent = autoclass("android.content.Intent")
            Uri    = autoclass("android.net.Uri")
            intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            mActivity.startActivity(intent)
        except Exception as e:
            self._label.text = f"Open browser:\n{url}\n\n{e}"

    # ── Back button ────────────────────────────────────────────────────────

    def _on_keyboard(self, window, key, *args):
        """
        Handle the Android hardware back button (keycode 27).
        If the WebView can go back in history, do so.
        Otherwise let Kivy handle it (which exits the app).
        """
        if key == 27 and platform == "android":  # 27 = back / escape
            if _webview_go_back():
                return True   # consumed — don't exit
        return False           # propagate — exits app


if __name__ == "__main__":
    CryptoAIOApp().run()
