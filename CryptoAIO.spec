# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for CryptoAIO Desktop

import os

block_cipher = None

# Data files to bundle
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

# Only include files that actually exist
datas = [(src, dst) for src, dst in datas if os.path.exists(src)]

a = Analysis(
    ["launcher.py"],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=[
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
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "numpy", "pandas", "PIL", "cv2"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="CryptoAIO",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,       # No terminal window on Windows
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="graphics/icon-512.ico",  # Multi-resolution ICO (16–256 px)
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="CryptoAIO",
)

# macOS .app bundle
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
