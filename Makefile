# Prospettiva — unica interfaccia del progetto.
# Prerequisito: Docker. Non serve Node installato in locale.

IMAGE  := prospettiva-dev
STAMP  := .docker-stamp
PORT   ?= 8080
DEVPORT?= 5173
RUN    := docker run --rm -v "$(CURDIR)":/app -w /app $(IMAGE)

.DEFAULT_GOAL := help
.PHONY: help build test typecheck validate coast pages serve dev shell check android android-shell clean distclean

help: ## Elenca i comandi disponibili
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-11s\033[0m %s\n", $$1, $$2}'

$(STAMP): Dockerfile
	docker build --target dev -t $(IMAGE) .
	@touch $(STAMP)

# Le dipendenze vivono nella cartella montata, non nell'immagine: il mount
# di /app nasconderebbe qualsiasi node_modules incorporato.
node_modules: $(STAMP) package.json
	$(RUN) npm install --no-audit --no-fund
	@touch node_modules

build: node_modules ## Costruisce dist/prospettiva.html
	$(RUN) npm run build

typecheck: node_modules ## Solo il controllo dei tipi, senza costruire
	$(RUN) npm run typecheck

test: node_modules ## Typecheck, build e suite completa (unità + artefatto)
	$(RUN) npm test

validate: node_modules ## Valida un file di dati:  make validate FILE=miei-dati.json
	@test -n "$(FILE)" || (echo "uso: make validate FILE=miei-dati.json"; exit 2)
	$(RUN) node tools/validate.mjs "$(FILE)"

coast: node_modules ## Rigenera src/data/coast.json da Natural Earth (richiede rete)
	$(RUN) node tools/gen-coast.mjs

ANDROID_IMAGE := prospettiva-android
ASTAMP := .android-stamp

$(ASTAMP): Dockerfile
	docker build --target android -t $(ANDROID_IMAGE) .
	@touch $(ASTAMP)

android: build $(ASTAMP) ## Confeziona l'APK di debug in dist/prospettiva.apk
	docker run --rm -v "$(CURDIR)":/app -w /app $(ANDROID_IMAGE) sh tools/android-build.sh

android-shell: $(ASTAMP) ## Shell nel contenitore Android, per i problemi di Gradle
	docker run --rm -it -v "$(CURDIR)":/app -w /app $(ANDROID_IMAGE) sh

check: ## Build e collaudo dentro Docker, senza montare nulla (come in CI)
	docker build --target test -t prospettiva-check .

pages: build ## Anteprima locale della PWA (service worker attivo) su :$(PORT)
	@echo "Anteprima su http://localhost:$(PORT) — è la stessa cosa che vedrà Pages"
	docker run --rm -p $(PORT):8000 -v "$(CURDIR)/dist":/site:ro -w /site \
	  $(IMAGE) npx --yes http-server -p 8000 -c-1 .

serve: ## Costruisce e pubblica il solo file su http://localhost:$(PORT)
	docker build --target serve -t prospettiva-serve .
	docker run --rm -p $(PORT):80 prospettiva-serve

dev: node_modules ## Server Vite con ricarica a caldo su http://localhost:$(DEVPORT)
	docker run --rm -it -v "$(CURDIR)":/app -w /app -p $(DEVPORT):$(DEVPORT) \
	  $(IMAGE) npx vite --host 0.0.0.0 --port $(DEVPORT)

shell: $(STAMP) ## Apre una shell nel contenitore
	docker run --rm -it -v "$(CURDIR)":/app -w /app $(IMAGE) sh

clean: ## Rimuove l'artefatto costruito
	rm -rf dist

distclean: clean ## Rimuove anche node_modules, gli stamp, il progetto Android e le immagini
	rm -rf node_modules $(STAMP) $(ASTAMP) android/app android/gradle* android/build.gradle \
	       android/settings.gradle android/variables.gradle android/capacitor.settings.gradle
	-docker rmi $(IMAGE) $(ANDROID_IMAGE) prospettiva-serve prospettiva-check 2>/dev/null || true
