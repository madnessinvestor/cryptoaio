"""
CryptoAIO — Android Launcher (Buildozer / python-for-android)

Starts the Flask server on localhost:5000 then shows it inside an Android
WebView using Kivy.  Requires python-for-android with the 'webview' recipe.
"""

import threading
import time
import os
import sys

# ── Kivy must be imported before anything else on Android ────────────────────
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.clock import Clock
from kivy.utils import platform

PORT = 5000
SERVER_READY = threading.Event()


def _start_flask():
    try:
        # On Android the app runs from /data/user/0/.../files/
        app_root = os.path.dirname(os.path.abspath(__file__))
        sys.path.insert(0, app_root)

        # Ensure writable dirs exist
        for d in ["static/icons/tokens"]:
            os.makedirs(os.path.join(app_root, d), exist_ok=True)

        from app import app as flask_app
        SERVER_READY.set()
        flask_app.run(host="127.0.0.1", port=PORT, debug=False, use_reloader=False, threaded=True)
    except Exception as e:
        print(f"Flask error: {e}")


class CryptoAIOApp(App):
    def build(self):
        self.title = "CryptoAIO"

        self.layout = BoxLayout(orientation="vertical")
        self.label  = Label(
            text="Starting CryptoAIO…",
            font_size="18sp",
            color=(0.1, 0.9, 0.4, 1),
        )
        self.layout.add_widget(self.label)

        # Start Flask server in background
        t = threading.Thread(target=_start_flask, daemon=True)
        t.start()

        # Poll until server is ready, then load WebView
        Clock.schedule_interval(self._check_server, 0.5)
        return self.layout

    def _check_server(self, dt):
        if not SERVER_READY.is_set():
            return

        Clock.unschedule(self._check_server)
        self._open_webview()

    def _open_webview(self):
        url = f"http://127.0.0.1:{PORT}"

        if platform == "android":
            try:
                from kivy.uix.webview import WebView
                wv = WebView(url=url)
                self.layout.clear_widgets()
                self.layout.add_widget(wv)
                return
            except ImportError:
                pass

            # Fallback: open in system browser
            try:
                from android import mActivity  # noqa: F401
                from jnius import autoclass
                Intent   = autoclass("android.content.Intent")
                Uri      = autoclass("android.net.Uri")
                intent   = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                mActivity.startActivity(intent)
            except Exception as e:
                self.label.text = f"Open browser:\n{url}\n\n{e}"
        else:
            import webbrowser
            webbrowser.open(url)
            self.label.text = f"Running at\n{url}"


if __name__ == "__main__":
    CryptoAIOApp().run()
