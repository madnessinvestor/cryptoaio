#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CryptoAIO — Flutter Build Script
# Gera APK (Android), bundle Web, ou exe Windows a partir do projeto flutter/
#
# Pré-requisitos (no seu computador, NÃO no Replit):
#   - Flutter SDK >= 3.8  →  https://docs.flutter.dev/get-started/install
#   - Android: Android Studio + SDK (para APK/AAB)
#   - Windows: Visual Studio 2022 com "Desktop development with C++" (para .exe)
#
# Uso:
#   ./build-flutter.sh            # menu interativo
#   ./build-flutter.sh apk        # APK debug
#   ./build-flutter.sh apk-release# APK release (não assinado)
#   ./build-flutter.sh web        # bundle web estático
#   ./build-flutter.sh windows    # executável Windows (só no Windows)
# ─────────────────────────────────────────────────────────────────────────────

set -e

FLUTTER_DIR="$(cd "$(dirname "$0")/flutter" && pwd)"
TARGET="${1:-}"

echo "============================================================"
echo " CryptoAIO — Flutter Build"
echo " Diretório: $FLUTTER_DIR"
echo "============================================================"
echo

# ── Verifica Flutter instalado ────────────────────────────────────────────────
if ! command -v flutter &>/dev/null; then
    echo "ERRO: Flutter SDK não encontrado no PATH."
    echo "  Instale em: https://docs.flutter.dev/get-started/install"
    exit 1
fi

FLUTTER_VER=$(flutter --version --machine 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('frameworkVersion','?'))" 2>/dev/null || flutter --version | head -1)
echo "Flutter: $FLUTTER_VER"
echo

# ── Menu interativo se nenhum alvo passado ────────────────────────────────────
if [ -z "$TARGET" ]; then
    echo "Escolha o alvo:"
    echo "  1) apk          — APK debug (instalação direta no dispositivo)"
    echo "  2) apk-release  — APK release não assinado (para assinar e publicar)"
    echo "  3) web          — Bundle web estático (deploy em qualquer servidor)"
    echo "  4) windows      — Executável Windows (requer Windows + Visual Studio)"
    echo
    read -rp "Opção [1-4]: " opt
    case "$opt" in
        1) TARGET="apk" ;;
        2) TARGET="apk-release" ;;
        3) TARGET="web" ;;
        4) TARGET="windows" ;;
        *) echo "Opção inválida."; exit 1 ;;
    esac
fi

cd "$FLUTTER_DIR"

# ── Instala dependências ───────────────────────────────────────────────────────
echo "[1/3] Instalando dependências (flutter pub get)..."
flutter pub get

# ── Build ─────────────────────────────────────────────────────────────────────
case "$TARGET" in

  apk)
    echo "[2/3] Compilando APK debug..."
    flutter build apk --debug
    APK_PATH="build/app/outputs/flutter-apk/app-debug.apk"
    echo
    echo "============================================================"
    echo " APK gerado: flutter/$APK_PATH"
    echo
    echo " Para instalar no dispositivo conectado via USB:"
    echo "   adb install flutter/$APK_PATH"
    echo "============================================================"
    ;;

  apk-release)
    echo "[2/3] Compilando APK release (não assinado)..."
    flutter build apk --release
    APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
    echo
    echo "============================================================"
    echo " APK gerado: flutter/$APK_PATH"
    echo
    echo " Para assinar e publicar na Play Store:"
    echo "   1. Gere a keystore (UMA VEZ):"
    echo "      keytool -genkey -v -keystore cryptoaio.jks \\"
    echo "        -alias cryptoaio -keyalg RSA -keysize 2048 -validity 10000"
    echo "   2. Crie flutter/android/key.properties:"
    echo "      storePassword=<sua-senha>"
    echo "      keyPassword=<sua-senha>"
    echo "      keyAlias=cryptoaio"
    echo "      storeFile=../../../cryptoaio.jks"
    echo "   3. Rebuild com: ./build-flutter.sh apk-release"
    echo "============================================================"
    ;;

  web)
    echo "[2/3] Compilando bundle web..."
    flutter build web --release --base-href "/"
    echo
    echo "============================================================"
    echo " Bundle gerado: flutter/build/web/"
    echo
    echo " Para servir localmente (teste):"
    echo "   cd flutter/build/web && python3 -m http.server 8080"
    echo
    echo " Para deploy (Vercel, Netlify, Firebase Hosting, etc.):"
    echo "   Suba o conteúdo de flutter/build/web/ para o seu hosting."
    echo
    echo " ATENÇÃO: o app Flutter Web chama a API Flask em runtime."
    echo "   Configure o endereço do servidor em Config → Servidor"
    echo "   dentro do app, ou edite flutter/lib/config/api_config.dart"
    echo "   (defaultUrl) antes do build para apontar para o servidor"
    echo "   Flask em produção."
    echo "============================================================"
    ;;

  windows)
    echo "[2/3] Compilando executável Windows..."
    if [[ "$(uname -s)" != MINGW* ]] && [[ "$(uname -s)" != "Windows_NT" ]] && ! grep -qi microsoft /proc/version 2>/dev/null; then
        echo "AVISO: build Windows deve ser executado no Windows."
        echo "  No Windows, instale Visual Studio 2022 com a carga"
        echo "  'Desktop development with C++' e execute este script"
        echo "  em Git Bash ou PowerShell."
        exit 1
    fi
    flutter build windows --release
    echo
    echo "============================================================"
    echo " Executável gerado: flutter/build/windows/x64/runner/Release/"
    echo "============================================================"
    ;;

  *)
    echo "Alvo desconhecido: $TARGET"
    echo "Use: apk | apk-release | web | windows"
    exit 1
    ;;
esac

echo
echo " Build concluído com sucesso!"
