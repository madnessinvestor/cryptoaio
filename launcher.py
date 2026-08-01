"""
CryptoAIO Desktop Launcher
Starts the Flask server and opens the app in a native window (pywebview)
or falls back to the system browser.
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
    """Writable directory for user data (assets, alerts, wallets…)."""
    if sys.platform == "win32":
        base = os.environ.get("APPDATA", os.path.expanduser("~"))
    elif sys.platform == "darwin":
        base = os.path.join(os.path.expanduser("~"), "Library", "Application Support")
    else:
        base = os.path.expanduser("~")
    d = os.path.join(base, "CryptoAIO")
    os.makedirs(d, exist_ok=True)
    return d

# ── Bootstrap data dir ────────────────────────────────────────────────────────

if hasattr(sys, "_MEIPASS"):
    data_dir = user_data_dir()

    # Copy default data files on first launch
    for fname in ["assets.json", "alerts.json", "dashboard_wallets.json",
                  "portfolio_data.json", "dashboard_manual.json", "dashboard_history.json",
                  "widget_settings.json"]:
        src = resource_path(fname)
        dst = os.path.join(data_dir, fname)
        if not os.path.exists(dst) and os.path.exists(src):
            shutil.copy2(src, dst)

    # Make all relative file paths in app.py resolve inside data_dir
    os.chdir(data_dir)

    # Ensure icons dir exists in data_dir
    os.makedirs(os.path.join(data_dir, "static", "icons", "tokens"), exist_ok=True)

# ── Import Flask app ──────────────────────────────────────────────────────────

sys.path.insert(0, resource_path("."))
from app import app as flask_app  # noqa: E402

# Fix template / static folder when bundled
if hasattr(sys, "_MEIPASS"):
    flask_app.template_folder = resource_path("templates")
    flask_app.static_folder   = resource_path("static")

PORT = 5000


def _start_flask():
    flask_app.run(host="127.0.0.1", port=PORT, debug=False, use_reloader=False)


def _wait_for_server(timeout=10):
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
    # Start Flask in a background thread
    t = threading.Thread(target=_start_flask, daemon=True)
    t.start()
    _wait_for_server()

    url = f"http://127.0.0.1:{PORT}"

    try:
        import webview  # pywebview
        webview.create_window(
            "CryptoAIO",
            url,
            width=480,
            height=920,
            resizable=True,
            min_size=(250, 435),
        )
        webview.start()
    except ImportError:
        # Fallback: open in system browser and keep process alive
        webbrowser.open(url)
        print(f"CryptoAIO running at {url}  (close this window to stop)")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
