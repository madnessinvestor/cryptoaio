# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for CryptoAIO Desktop
# Generates TWO executables inside the same dist/CryptoAIO/ folder:
#   CryptoAIO.exe        — full app (opens /)
#   CryptoAIOWidget.exe  — widget only (opens /widget, reuses running server)

import os

block_cipher = None

# ── Shared data files ─────────────────────────────────────────────────────────
datas = [
    ("templates",               "templates"),
    ("static",                  "static"),
    ("graphics",                "graphics"),
    ("assets.json",             "."),
    ("alerts.json",             "."),
    ("dashboard_wallets.json",  "."),
    ("portfolio_data.json",     "."),
    ("dashboard_manual.json",   "."),
    ("dashboard_history.json",  "."),
]
datas = [(src, dst) for src, dst in datas if os.path.exists(src)]

shared_hidden = [
    "flask",
    "jinja2",
    "jinja2.ext",
    "werkzeug",
    "werkzeug.serving",
    "werkzeug.routing",
    "itsdangerous",
    "click",
    "blinker",
    "requests",
    "urllib3",
    "certifi",
    "charset_normalizer",
    "idna",
    "concurrent.futures",
    "threading",
    "webview",
]

shared_excludes = ["tkinter", "matplotlib", "numpy", "pandas", "PIL", "cv2"]

# ── Analysis: main app ────────────────────────────────────────────────────────
a_main = Analysis(
    ["launcher.py"],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=shared_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=shared_excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# ── Analysis: widget ──────────────────────────────────────────────────────────
a_widget = Analysis(
    ["widget_launcher.py"],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=shared_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=shared_excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# MERGE removes duplicate files from a_widget that already live in a_main,
# so the final dist folder contains every file exactly once.
MERGE(
    (a_main,   "launcher",       "launcher"),
    (a_widget, "widget_launcher", "widget_launcher"),
)

# ── PYZ archives ─────────────────────────────────────────────────────────────
pyz_main   = PYZ(a_main.pure,   a_main.zipped_data,   cipher=block_cipher)
pyz_widget = PYZ(a_widget.pure, a_widget.zipped_data, cipher=block_cipher)

# ── Executables ───────────────────────────────────────────────────────────────
exe_main = EXE(
    pyz_main,
    a_main.scripts,
    [],
    exclude_binaries=True,
    name="CryptoAIO",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="graphics/icon-512.ico",
)

exe_widget = EXE(
    pyz_widget,
    a_widget.scripts,
    [],
    exclude_binaries=True,
    name="CryptoAIOWidget",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="graphics/icon-512.ico",
)

# ── Single COLLECT — both exes share all binaries/data ───────────────────────
coll = COLLECT(
    exe_main,
    exe_widget,
    a_main.binaries,
    a_main.zipfiles,
    a_main.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="CryptoAIO",
)

# ── macOS .app bundle (main app only) ─────────────────────────────────────────
app = BUNDLE(
    coll,
    name="CryptoAIO.app",
    icon=None,
    bundle_identifier="com.madnessinvestor.cryptoaio",
    info_plist={
        "NSHighResolutionCapable": True,
        "CFBundleShortVersionString": "1.0.0",
        "CFBundleName": "CryptoAIO",
    },
)
