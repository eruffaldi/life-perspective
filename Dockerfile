# syntax=docker/dockerfile:1

# --------------------------------------------------------------------------
# deps — dipendenze di sola build (jsdom per i test, world-atlas per la costa)
# --------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# --------------------------------------------------------------------------
# build — inietta la base cartografica e verifica l'autosufficienza
# --------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tools ./tools
COPY src ./src
RUN node tools/build.mjs

# --------------------------------------------------------------------------
# test — gira contro l'artefatto costruito, non contro il sorgente
# --------------------------------------------------------------------------
FROM build AS test
COPY test ./test
COPY schema ./schema
RUN node test/app.test.mjs \
 && node test/validate.test.mjs \
 && node test/storage.test.mjs

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
# dev — solo il runtime. Le dipendenze NON vanno cotte qui: il Makefile monta
# la cartella di lavoro su /app e un node_modules incorporato verrebbe
# mascherato dal mount. Ci pensa il target `node_modules` a installarle
# dentro il volume montato.
# (NODE_PATH non e' una via d'uscita: gli import ESM lo ignorano.)
# --------------------------------------------------------------------------
FROM node:22-alpine AS dev
WORKDIR /app
CMD ["sh"]
