#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CryptoAIO — Android Build Script (APK + Google Play AAB)
#
# Pré-requisitos (no seu computador Linux/macOS, NÃO no Replit):
#   pip install buildozer cython
#   sudo apt install -y adb default-jdk  # Linux
#
# Buildozer baixa o Android SDK/NDK automaticamente na primeira execução.
# ─────────────────────────────────────────────────────────────────────────────

set -e

MODE="${1:-debug}"   # Uso: ./build-android.sh [debug|release]

echo "============================================================"
echo " CryptoAIO — Android Build  (modo: $MODE)"
echo "============================================================"
echo

# ── 1. Limpa artefatos anteriores ────────────────────────────────────────────
echo "[1/4] Limpando builds anteriores..."
buildozer android clean

# ── 2. Compila ────────────────────────────────────────────────────────────────
if [ "$MODE" = "release" ]; then
    echo "[2/4] Compilando APK de RELEASE (não assinado)..."
    buildozer android release
    echo
    echo "  APK não assinado em: bin/CryptoAIO-*-release-unsigned.apk"
    echo
    echo "  ╔═══════════════════════════════════════════════════════════╗"
    echo "  ║  PRÓXIMOS PASSOS PARA O GOOGLE PLAY                      ║"
    echo "  ║                                                           ║"
    echo "  ║  A) Assinar o APK com sua keystore:                      ║"
    echo "  ║     1. Gere a keystore (UMA VEZ, guarde com cuidado):    ║"
    echo "  ║        keytool -genkey -v                       \\        ║"
    echo "  ║          -keystore cryptoaio.jks                \\        ║"
    echo "  ║          -alias cryptoaio                       \\        ║"
    echo "  ║          -keyalg RSA -keysize 2048              \\        ║"
    echo "  ║          -validity 10000                                  ║"
    echo "  ║                                                           ║"
    echo "  ║     2. Assine o APK:                                     ║"
    echo "  ║        apksigner sign                           \\        ║"
    echo "  ║          --ks cryptoaio.jks                    \\        ║"
    echo "  ║          --ks-key-alias cryptoaio              \\        ║"
    echo "  ║          --out bin/CryptoAIO-release.apk       \\        ║"
    echo "  ║          bin/CryptoAIO-*-release-unsigned.apk            ║"
    echo "  ║                                                           ║"
    echo "  ║  B) Verificar assinatura:                                ║"
    echo "  ║        apksigner verify bin/CryptoAIO-release.apk        ║"
    echo "  ║                                                           ║"
    echo "  ║  C) Enviar para o Play Store:                            ║"
    echo "  ║     Google Play Console → Seu app → Produção             ║"
    echo "  ║     → Criar nova versão → Upload do APK assinado         ║"
    echo "  ║                                                           ║"
    echo "  ║  D) A cada atualização:                                  ║"
    echo "  ║     Incremente android.numeric_version no buildozer.spec  ║"
    echo "  ║     (ex: 1 → 2 → 3) e atualize version (ex: 1.0.0→1.1.0)║"
    echo "  ╚═══════════════════════════════════════════════════════════╝"
else
    echo "[2/4] Compilando APK de DEBUG (para testes)..."
    buildozer android debug
    echo
    echo "  APK de teste em: bin/CryptoAIO-*-debug.apk"
fi

# ── 3. Instala no dispositivo conectado via USB (opcional) ────────────────────
echo
echo "[3/4] Dispositivo Android conectado via USB?"
read -r -p "        Instalar o APK agora? [s/N] " RESP
if [[ "$RESP" =~ ^[sS]$ ]]; then
    APK=$(ls bin/CryptoAIO-*-"$MODE"*.apk 2>/dev/null | head -1)
    if [ -n "$APK" ]; then
        echo "       Instalando $APK..."
        adb install -r "$APK"
        echo "       ✅ Instalado! Abra CryptoAIO no dispositivo."
    else
        echo "       ⚠️  APK não encontrado em bin/."
    fi
fi

echo
echo "[4/4] Concluído."
echo "============================================================"
echo " RESUMO — Como atualizar no Google Play"
echo "============================================================"
echo
echo "  Cada nova versão enviada ao Play Store PRECISA ter:"
echo "  • android.numeric_version maior que a versão anterior"
echo "    (buildozer.spec — campo android.numeric_version)"
echo "  • APK assinado com A MESMA keystore de sempre"
echo "    (nunca perca o arquivo .jks e a senha!)"
echo
echo "  Fluxo resumido:"
echo "    1. Edite o código"
echo "    2. Incremente android.numeric_version no buildozer.spec"
echo "    3. ./build-android.sh release"
echo "    4. Assine o APK com apksigner (veja instruções acima)"
echo "    5. Faça upload no Play Console"
echo "============================================================"
