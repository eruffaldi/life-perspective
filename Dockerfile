# syntax=docker/dockerfile:1

# --------------------------------------------------------------------------
# deps — TypeScript, Vite, Vitest, e world-atlas per rigenerare la costa
# --------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# --------------------------------------------------------------------------
# build — typecheck, bundle IIFE inlineato, verifica di autosufficienza
# --------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json vite.config.ts index.html ./
COPY tools ./tools
COPY src ./src
COPY test ./test
COPY schema ./schema
RUN npm run build

# --------------------------------------------------------------------------
# test — unità sui moduli e integrazione sull'artefatto costruito
# --------------------------------------------------------------------------
FROM build AS test
RUN npx vitest run

# --------------------------------------------------------------------------
# artifact — immagine vuota da cui estrarre il file con `docker build -o`
# --------------------------------------------------------------------------
FROM scratch AS artifact
COPY --from=build /app/dist/prospettiva.html /prospettiva.html

# --------------------------------------------------------------------------
# serve — un nginx che serve l'unico file
# --------------------------------------------------------------------------
FROM nginx:alpine AS serve
COPY --from=build /app/dist/prospettiva.html /usr/share/nginx/html/index.html
EXPOSE 80

# --------------------------------------------------------------------------
# android — toolchain di confezionamento, tenuta a parte perche' pesante:
# chi lavora sul file HTML non deve scaricarsi JDK e SDK. Incapsula lo stesso
# dist/prospettiva.html che si apre sul PC.
# --------------------------------------------------------------------------
FROM eclipse-temurin:21-jdk AS android
ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/usr/local/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl unzip git ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*
# Strumenti da riga di comando: Android Studio non e' necessario per costruire.
RUN mkdir -p $ANDROID_HOME/cmdline-tools \
 && curl -fsSLo /tmp/tools.zip \
      https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
 && unzip -q /tmp/tools.zip -d $ANDROID_HOME/cmdline-tools \
 && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
 && rm /tmp/tools.zip \
 && yes | sdkmanager --licenses > /dev/null \
 && sdkmanager --install "platform-tools" "platforms;android-35" "build-tools;35.0.0" > /dev/null
WORKDIR /app
CMD ["sh"]

# --------------------------------------------------------------------------
# dev — solo il runtime. Le dipendenze NON vanno cotte qui: il Makefile monta
# la cartella di lavoro su /app e un node_modules incorporato verrebbe
# mascherato dal mount. Ci pensa il target `node_modules`.
# (NODE_PATH non e' una via d'uscita: gli import ESM lo ignorano.)
# --------------------------------------------------------------------------
FROM node:22-alpine AS dev
WORKDIR /app
EXPOSE 5173
CMD ["sh"]
