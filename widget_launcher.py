"""
CryptoAIO Widget Launcher
Opens the /widget page in a compact, always-on-top native window.

Strategy:
  1. Try to connect to an already-running CryptoAIO server on PORT.
  2. If none is found, start the Flask server in a background thread.
  3. Open /widget in a pywebview window (frameless, always on top).
     Falls back to the system browser if pywebview is not available.
"""

import sys
import os
import shutil
import threading
import time
import webbrowser

# ── Path helpers ──────────────────────────────────────────────────────────────

def resource_path(*parts):
    """Resolve a bundled resource path (works in PyInstaller and dev)."""
    base = sys._MEIPASS if hasattr(sys, "_MEIPASS") else os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, *parts)

def user_data_dir():
    """Writable directory for user data — shared with the main CryptoAIO app."""
    if sys.platform == "win32":
        base = os.environ.get("APPDATA", os.path.expanduser("~"))
    elif sys.platform == "darwin":
        base = os.path.join(os.path.expanduser("~"), "Library", "Application Support")
    else:
        base = os.path.expanduser("~")
    d = os.path.join(base, "CryptoAIO")
    os.makedirs(d, exist_ok=True)
    return d

# ── Bootstrap data dir (only when running as a PyInstaller bundle) ────────────

if hasattr(sys, "_MEIPASS"):
    data_dir = user_data_dir()

    for fname in ["assets.json", "alerts.json", "dashboard_wallets.json",
                  "portfolio_data.json", "dashboard_manual.json", "dashboard_history.json"]:
        src = resource_path(fname)
        dst = os.path.join(data_dir, fname)
        if not os.path.exists(dst) and os.path.exists(src):
            shutil.copy2(src, dst)

    os.chdir(data_dir)
    os.makedirs(os.path.join(data_dir, "static", "icons", "tokens"), exist_ok=True)

# ── Flask app ─────────────────────────────────────────────────────────────────

sys.path.insert(0, resource_path("."))

PORT = 5000
_server_started_here = False


def _server_already_running():
    import urllib.request
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}", timeout=1)
        return True
    except Exception:
        return False


def _start_flask():
    from app import app as flask_app
    if hasattr(sys, "_MEIPASS"):
        flask_app.template_folder = resource_path("templates")
        flask_app.static_folder   = resource_path("static")
    flask_app.run(host="127.0.0.1", port=PORT, debug=False, use_reloader=False)


def _wait_for_server(timeout=15):
    import urllib.request
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}", timeout=1)
            return True
        except Exception:
            time.sleep(0.2)
    return False


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not _server_already_running():
        _server_started_here = True
        t = threading.Thread(target=_start_flask, daemon=True)
        t.start()
        _wait_for_server()

    url = f"http://127.0.0.1:{PORT}/widget"

    try:
        import webview  # pywebview
        webview.create_window(
            "CryptoAIO Widget",
            url,
            width=420,
            height=260,
            resizable=True,
            min_size=(280, 160),
            on_top=True,
            frameless=False,
        )
        webview.start()
    except ImportError:
        webbrowser.open(url)
        print(f"CryptoAIO Widget running at {url}  (close this window to stop)")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
