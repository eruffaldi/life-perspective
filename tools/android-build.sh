#!/bin/sh
# Confeziona dist/prospettiva.html in un APK di debug.
#
# Capacitor si aspetta un `index.html` nella cartella degli asset: l'artefatto
# viene copiato con quel nome, non ricostruito. Un secondo processo di build
# per Android significherebbe due artefatti che possono divergere.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

if [ ! -f dist/prospettiva.html ]; then
  echo "android: manca dist/prospettiva.html — esegui prima 'make build'" >&2
  exit 1
fi

# La WebView carica index.html: stesso file, nome che Capacitor si aspetta.
cp dist/prospettiva.html dist/index.html

if [ ! -d node_modules/@capacitor/cli ]; then
  echo "android: installo la toolchain Capacitor"
  npm install --no-audit --no-fund --no-save \
    @capacitor/cli @capacitor/core @capacitor/android
fi

# `android/` contiene solo README e icone finche' Capacitor non lo popola:
# il progetto Gradle e' rigenerabile e non va versionato.
if [ ! -f android/build.gradle ]; then
  echo "android: genero il progetto nativo"
  npx cap add android
else
  npx cap sync android
fi

cd android
./gradlew --no-daemon assembleDebug

APK=app/build/outputs/apk/debug/app-debug.apk
if [ ! -f "$APK" ]; then
  echo "android: Gradle non ha prodotto l'APK atteso" >&2
  exit 1
fi

cp "$APK" "$ROOT/dist/prospettiva.apk"
SIZE=$(du -k "$ROOT/dist/prospettiva.apk" | cut -f1)
echo "android: dist/prospettiva.apk — ${SIZE} KB, firmato con la chiave di debug"
