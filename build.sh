#!/usr/bin/env bash
# CryptoAIO — Linux / macOS Desktop Build Script
# Requires Python 3.10+ and pip

set -e

echo "============================================"
echo " CryptoAIO — Building Desktop App"
echo "============================================"
echo

# Detect OS
OS="$(uname -s)"

# Install system-level libs needed by pywebview on Linux
if [ "$OS" = "Linux" ]; then
    echo "[0/3] Installing system dependencies (requires sudo)..."
    sudo apt-get update -qq
    sudo apt-get install -y \
        python3-dev \
        libgtk-3-dev \
        libwebkit2gtk-4.0-dev \
        gir1.2-webkit2-4.0 2>/dev/null || \
    sudo apt-get install -y \
        python3-dev \
        libgtk-3-dev \
        libwebkit2gtk-4.1-dev 2>/dev/null || true
fi

echo "[1/3] Installing Python dependencies..."
pip install -r requirements.txt pyinstaller pywebview --quiet

echo "[2/3] Cleaning previous build..."
rm -rf build dist

echo "[3/4] Running PyInstaller — Main app..."
pyinstaller CryptoAIO.spec --clean --noconfirm

echo "[4/4] Running PyInstaller — Widget..."
pyinstaller CryptoAIOWidget.spec --clean --noconfirm

echo
echo "============================================"
if [ "$OS" = "Darwin" ]; then
    echo " Build complete!"
    echo " Main app   : dist/CryptoAIO.app"
    echo " Widget     : dist/CryptoAIOWidget.app"
else
    echo " Build complete!"
    echo " Main app   : dist/CryptoAIO/CryptoAIO"
    echo " Widget     : dist/CryptoAIOWidget/CryptoAIOWidget"
fi
echo "============================================"
