# Prospettiva — unica interfaccia del progetto.
# Prerequisito: Docker. Non serve Node installato in locale.

IMAGE  := prospettiva-dev
STAMP  := .docker-stamp
PORT   ?= 8080
RUN    := docker run --rm -v "$(CURDIR)":/app -w /app $(IMAGE)

.DEFAULT_GOAL := help
.PHONY: help build test validate coast serve dev shell check clean distclean

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
	$(RUN) node tools/build.mjs

test: build ## Esegue la suite di regressione sull'artefatto costruito
	$(RUN) node test/app.test.mjs
	$(RUN) node test/validate.test.mjs
	$(RUN) node test/storage.test.mjs

validate: build ## Valida un file di dati:  make validate FILE=miei-dati.json
	@test -n "$(FILE)" || (echo "uso: make validate FILE=miei-dati.json"; exit 2)
	$(RUN) node tools/validate.mjs "$(FILE)"

coast: node_modules ## Rigenera src/coast.json da Natural Earth (richiede rete)
	$(RUN) node tools/gen-coast.mjs

check: ## Build e collaudo dentro Docker, senza montare nulla (come in CI)
	docker build --target test -t prospettiva-check .

serve: ## Costruisce e pubblica su http://localhost:$(PORT)
	docker build --target serve -t prospettiva-serve .
	docker run --rm -p $(PORT):80 prospettiva-serve

dev shell: $(STAMP) ## Apre una shell nel contenitore di sviluppo
	docker run --rm -it -v "$(CURDIR)":/app -w /app $(IMAGE) sh

clean: ## Rimuove l'artefatto costruito
	rm -rf dist

distclean: clean ## Rimuove anche node_modules, lo stamp e le immagini
	rm -rf node_modules $(STAMP)
	-docker rmi $(IMAGE) prospettiva-serve prospettiva-check 2>/dev/null || true
