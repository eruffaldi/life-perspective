# Prospettiva

Una carta del tempo per una famiglia: vite, scuole, lavori, case, vacanze,
scadenze e luoghi, tutti sullo stesso asse. Serve a rispondere a domande che
un calendario non sa affrontare — *quanti anni avrò alla maturità di mia figlia*,
*cosa faceva mio nonno alla mia età*, *quale anno sarà quello in cui tutto
capita insieme*.

L'artefatto è **un solo file HTML**. Nessuna rete, nessuna tile, nessuna CDN,
nessun account. Lo apri con doppio clic e funziona, anche in aereo o in barca.

```
make build      # produce dist/prospettiva.html
make test       # 248 test di regressione
make serve      # http://localhost:8080
```

L'unico prerequisito è Docker. Non serve Node installato.

---

## Le cinque viste

**Cronologia** — l'asse assoluto. Una corsia per persona, con sotto le tracce
scuola, lavoro, casa, vacanze, denaro, documenti. Una linea magenta verticale
segna oggi; a destra della linea il fondo è tratteggiato.

**Età allineate** — le stesse vite traslate a nascita = zero. È l'unica vista
che permette di sovrapporre le generazioni.

**Luoghi** — una carta con le coste incorporate. Il cerchio cresce con gli anni
passati sul posto, una linea tratteggiata unisce i traslochi in ordine, e un
cursore in basso spegne i luoghi che in quell'anno non c'entravano.

**Anni densi** — si apre con i prossimi passaggi e il countdown, poi elenca gli
anni in cui due o più cose si accavallano.

**Matrice** — momento per persona: la cella dice l'età. Un trattino per chi non
era ancora nato, una croce per chi non c'era più.

Il gesto centrale è il passaggio del mouse: sopra qualsiasi barra o rombo
compare l'età di **tutti** in quel momento.

---

## Il formato dei dati

Si incolla nel pannello **Dati**, oppure si carica da file. Un esempio completo
è precaricato nell'app.

### Struttura

```json
{
  "version": 1,
  "meta": { "title": "Prospettiva famiglia", "anchor": "me" },
  "settings": {
    "ageDisplay": "midpoint",
    "milestones": [5, 10, 20, 25, 50],
    "horizon": "2060"
  },
  "people": [ … ],
  "events": [ … ],
  "periods": [ … ],
  "holidays": [ … ],
  "places": { … }
}
```

`anchor` indica rispetto a chi calcolare i countdown. `horizon` limita le
proiezioni future. `ageDisplay` vale `midpoint` (`~77 anni`) oppure `range`
(`76–77 anni`), e riguarda solo le date di precisione grossa.

### Date a precisione variabile

La precisione si deduce dalla lunghezza della stringa, senza un campo
separato che possa andare fuori sincrono:

| valore         | significato   |
|----------------|---------------|
| `"1921"`       | solo l'anno   |
| `"1998-11"`    | mese e anno   |
| `"2008-07-12"` | giorno esatto |

Ogni data è internamente un **intervallo**, quindi le età derivate da una data
imprecisa vengono mostrate come approssimate. `"circa": true` è un'altra cosa
ancora: segnala un ricordo incerto, non una granularità.

### Persone

```json
{
  "id": "sofia",
  "name": "Sofia",
  "role": "child",
  "birth": "2012-09-03",
  "color": "#35407E",
  "school": { "system": "it", "through": "bachelor", "early": false, "delays": {} },
  "documents": [ … ],
  "periods": [ … ],
  "events": [ … ]
}
```

**Il blocco `school` genera i cicli scolastici**, non li inserisci a mano. In
Italia si entra in prima elementare a settembre dell'anno in cui si compiono
sei anni, e da lì discende tutto: elementari, medie, liceo, triennale,
magistrale, con i relativi periodi e gli eventi di fine ciclo (licenza media,
maturità, laurea). Da una sola data di nascita escono trenta marker futuri.

- `through` — dove fermarsi: `primary`, `middle`, `highschool`, `bachelor`, `master`
- `early: true` — anticipo, sposta tutto un anno indietro
- `delays: { "middle": 1 }` — un anno perso alle medie sposta in avanti tutto ciò che segue, non ciò che precede

**Un periodo inserito a mano sovrascrive quello generato** tramite `replaces`:

```json
{ "label": "Liceo classico Galvani", "start": "2026-09", "end": "2031-06",
  "track": "school", "replaces": "highschool", "place": "Bologna" }
```

Utile anche quando la mappatura non regge: il vecchio ordinamento
universitario si dichiara `"replaces": "master"`, perché non si divide in
triennale più magistrale.

### Periodi ed eventi

Un **evento** è puntuale e usa `date`. Un **periodo** è un intervallo e usa
`start` più `end`. `end` assente significa *tuttora in corso*: la barra sfuma
verso destra e — differenza che conta — resta accesa anche negli anni futuri,
invece di scadere oggi.

`track` sceglie la corsia: `school`, `work`, `home`, `holiday`, `finance`,
`doc`, `life`.

Ciò che riguarda una sola persona sta dentro `people[].periods` o
`people[].events`. Ciò che ne coinvolge più di una sta nelle liste di radice con
`who`, così non esistono due copie destinate a divergere:

```json
{ "id": "wedding", "label": "Matrimonio", "date": "2007-06-16",
  "category": "family", "who": ["marta", "davide"],
  "place": { "name": "Lerici", "coord": [44.0757, 9.9114] },
  "recurrences": [10, 25, 50] }
```

Un evento di radice **senza** `who` è contesto: Mondiali, elezioni, la caduta
del Muro. Finisce in una corsia a parte, in fondo.

`recurrences` accetta una lista di anniversari oppure `true`, che usa
`settings.milestones`. Gli anniversari annuali non si disegnano, solo le cifre
tonde, altrimenti la carta diventa illeggibile.

I **compleanni tondi** (18, 20, 30, 40, 50, 60, 65, 70, 80, 90, 100) sono
generati per tutti e alimentano gli anni densi: non vanno inseriti.

### Vacanze

```json
"holidays": [
  { "label": "Golfo dei Poeti", "start": "2026-08-01", "end": "2026-08-22",
    "place": "Lerici", "who": ["marta", "davide"] }
]
```

Diventano periodi condivisi su una corsia propria e, avendo un luogo,
compaiono anche sulla carta. Tre settimane a scala normale sono meno di un
pixel: sotto i quattro pixel la barra diventa un segno pieno con l'etichetta
accanto, invece di sparire.

### Documenti

Non si elencano tutti i rinnovi: si dà la scadenza corrente e il tipo, e la
catena si proietta fino all'orizzonte.

```json
"documents": [
  { "label": "Patente B",        "type": "patente",    "expires": "2029-03-09" },
  { "label": "Passaporto",       "type": "passaporto", "expires": "2030-06-14" },
  { "label": "Carta d'identità", "type": "identita",   "expires": "2032-01-20" },
  { "label": "Tessera del porto", "expires": "2027-05-01", "validity": 4 }
]
```

| tipo         | validità                                        |
|--------------|-------------------------------------------------|
| `patente`    | 10 anni fino a 50, poi 5, 3 sopra i 70, 2 sopra gli 80 |
| `passaporto` | 3 anni sotto i 3, 5 fino a 18, poi 10           |
| `identita`   | idem                                            |

La validità dipende dall'età **al rilascio**, non da quella attuale: una
patente che scade dopo i cinquant'anni si rinnova per cinque anni, non per dieci. È il genere di conto che a mano si sbaglia.

`validity` esplicito ha sempre la precedenza, per tessere e abbonamenti fuori
regola. Ogni documento occupa una riga propria, perché patente, passaporto e
carta d'identità si sovrappongono nel tempo.

### Luoghi

Un luogo è una stringa o un oggetto:

```json
"place": "Milano"
"place": { "name": "Lerici", "coord": [44.0757, 9.9114] }
```

Le coordinate si risolvono in quattro passi, in ordine di precedenza:

1. `coord` esplicito nell'elemento
2. il blocco `places` di radice
3. il repertorio interno (~130 città italiane ed europee, comprese le località costiere minori)
4. deduzione dal nome — `"Università di Bologna"` cade su Bologna

Quello che resta senza coordinate viene elencato in fondo alla colonna destra,
già formattato da incollare:

```json
"places": {
  "Università di Bologna": [44.4962, 11.3517],
  "Baia di Fiascherino": [44.0583, 9.9133]
}
```

---

## Errori e avvisi

Il pannello **Dati** valida quello che incolli e raccoglie tutte le
diagnostiche in una passata sola, invece di fermarsi alla prima. Ogni voce
porta un codice stabile, il percorso JSON del punto responsabile, cosa non va e
cosa fare; un clic porta il cursore sul frammento di testo.

**Gli errori bloccano il caricamento, gli avvisi no.** Un colore scritto male o
un luogo non riconosciuto non devono impedirti di vedere la tua carta. Se non
c'è nulla da segnalare non compare nessun pannello: un avviso permanente su
dati corretti insegna solo a ignorare gli avvisi.

Il pulsante **Controlla** esamina il documento senza sostituire i dati
correnti. Da riga di comando:

```
make validate FILE=miei-dati.json
```

Le regole sono le stesse: la CLI estrae il validatore dall'artefatto costruito,
così interfaccia e riga di comando non possono divergere.

`schema/prospettiva.schema.json` (draft 2020-12) copre struttura, tipi e
vocabolari chiusi, ed è utile puntarci l'editor per avere completamento e
segnalazioni mentre scrivi:

```json
{ "$schema": "./schema/prospettiva.schema.json", "version": 1, … }
```

Lo schema non può però esprimere i vincoli fra campi diversi — un `who` che
punta a un id esistente, una fine successiva all'inizio, il 31 febbraio — e di
quelli si occupa il validatore. La divisione del lavoro, il catalogo completo
dei codici e i requisiti stanno in [docs/requisiti.md](docs/requisiti.md).

---

## Filtri e salvataggio

Il pulsante **Filtri** accende e spegne le corsie, con il conteggio degli
elementi, e agisce su tutte e cinque le viste. I documenti partono spenti: sono
utili ma non c'entrano con il resto. `settings.filters` fissa lo stato
iniziale.

**Salva nel browser** conserva dati e filtri: prova prima `window.storage`
(quando l'app gira in un contesto che lo espone), poi `localStorage`, e se
nessuno dei due è disponibile disabilita il pulsante senza rompere niente.

Attenzione: aperto da `file://` alcuni browser negano `localStorage`, e comunque
la copia è legata a quel browser su quella macchina. **Scarica JSON** resta
l'archivio vero; il salvataggio nel browser è comodità, non backup.

---

## Lavorare con Claude Code

`CLAUDE.md` nella radice raccoglie invarianti, trappole già pagate e la
decisione aperta sul bundler. Viene letto all'inizio di ogni sessione: se
correggi Claude su qualcosa che vale anche per la prossima volta, quello è il
posto dove metterlo.

## Struttura del repository

```
src/index.html        il sorgente: tutta l'app, con il segnaposto __COAST__
src/coast.json        base cartografica generata (committata: build riproducibile offline)
schema/               JSON Schema del formato dati
docs/requisiti.md     requisiti e catalogo dei codici di diagnostica
tools/build.mjs       inietta la costa e verifica che non restino riferimenti esterni
tools/gen-coast.mjs   rigenera coast.json da Natural Earth
tools/validate.mjs    valida un file di dati da riga di comando
test/                 248 test su jsdom
dist/                 artefatto costruito (non versionato)
```

### Perché niente bundler

Il sorgente è già un file singolo senza dipendenze a runtime: non c'è nulla da
impacchettare. Aggiungere Vite e `vite-plugin-singlefile` significherebbe
introdurre una toolchain per ottenere una proprietà che il sorgente ha già per
costruzione. L'unico passo di build è l'iniezione di `coast.json`, ed è un
`String.replace`.

Il rovescio della medaglia va detto: niente TypeScript, niente type checking,
niente HMR. Il presidio contro le regressioni è la suite di test, non il
compilatore. Se il progetto dovesse crescere fino a rendere insostenibile un
sorgente unico, la porta d'ingresso naturale è proprio `tools/build.mjs`.

`src/coast.json` è committato di proposito: 151 KB di geometria generata,
così `make build` funziona senza rete. `make coast` la rigenera quando serve
cambiare tolleranza o riquadro.

### La base cartografica

Natural Earth via il pacchetto npm `world-atlas` (public domain), semplificata
con Douglas-Peucker e codificata in polilinee delta a precisione 1e-3 gradi.
Due livelli: il mondo a tolleranza grossa, l'Europa e il Mediterraneo a
tolleranza fine, scelti automaticamente in base all'inquadratura.

Una trappola documentata nel codice e verificata dalla build: l'alfabeto della
codifica occupa i caratteri ASCII 63–126, quindi il separatore fra tratti deve
stare **fuori** da quell'intervallo. `|` è il 124 e ci cade dentro; ogni volta
che una coordinata generava una barra verticale, lo split spezzava la linea e
il resto veniva decodificato come delta da zero.

---

## Comandi

| comando        | effetto                                              |
|----------------|------------------------------------------------------|
| `make build`   | produce `dist/prospettiva.html`                      |
| `make test`    | suite di regressione sull'artefatto costruito        |
| `make validate`| valida un file: `make validate FILE=dati.json`       |
| `make check`   | build e collaudo dentro Docker, senza montare nulla  |
| `make coast`   | rigenera `src/coast.json` (richiede rete)            |
| `make serve`   | pubblica su `http://localhost:8080`                  |
| `make dev`     | shell nel contenitore                                |
| `make clean`   | rimuove `dist`                                       |

Le dipendenze si installano nella cartella di lavoro montata, non
nell'immagine: il mount di `/app` maschererebbe qualsiasi `node_modules`
incorporato nel layer, e `NODE_PATH` non è una via d'uscita perché gli import
ESM lo ignorano. Il target `node_modules` se ne occupa da solo la prima volta.

`make check` è la variante senza mount — costruisce e collauda interamente
dentro l'immagine, ed è quella da usare in CI.

Per estrarre il solo artefatto senza avviare nulla:

```
docker build --target artifact -o out .
```

## Licenza

MIT per il codice. I dati cartografici provengono da Natural Earth, di pubblico
dominio.
