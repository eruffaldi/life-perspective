# Changelog

Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/),
versionamento [semantico](https://semver.org/lang/it/).

Le versioni precedenti alla 0.3.0 non sono mai state pubblicate come tag: sono
ricostruite qui dalla sequenza di sviluppo, per rendere leggibile come il
progetto è arrivato alla forma attuale.

## [0.4.1] — 2026-08-20

### Aggiunto

- `CLAUDE.md`: invarianti, trappole note e decisioni aperte, per le sessioni
  di Claude Code.

### Modificato

- I dati d'esempio non descrivono più una persona reale: la famiglia è
  inventata (Marta, Davide, Sofia, Tommaso, Nonna Elsa) e i luoghi sono scelti
  per mostrare il comportamento della carta — Siena, Bologna, Milano, Padova,
  Lerici, Barcellona — non per raccontare una biografia. Restano a zero
  diagnostiche, come richiede RNF2.
- Il nome nel copyright della licenza è ora generico.

## [0.4.0] — 2026-08-20

### Aggiunto

- **Validazione con diagnostica.** Il parsing raccoglie tutte le segnalazioni
  in una passata invece di fermarsi alla prima. Ogni diagnostica porta livello,
  codice stabile, percorso JSON, messaggio e indicazione su come procedere; un
  clic porta il cursore sul frammento responsabile. Gli errori bloccano il
  caricamento, gli avvisi no.
- Pulsante **Controlla**: esamina il documento senza sostituire i dati
  correnti.
- `schema/prospettiva.schema.json` (draft 2020-12) per gli editor e la CI, con
  un test che verifica che schema e codice non divergano.
- `docs/requisiti.md`: requisiti della validazione, divisione del lavoro fra
  schema e validatore, catalogo completo dei codici.
- `tools/validate.mjs` e `make validate FILE=…`. La CLI estrae il validatore
  dall'artefatto costruito, così non esistono due copie delle regole.
- Il salvataggio nel browser rifiuta i documenti con errori, e ciò che viene
  ripristinato dallo storage viene validato prima dell'uso.

### Corretto

- **`usedPlaces` usata prima della dichiarazione** nel validatore: la funzione
  `place()` la referenziava durante la scansione delle persone, mentre il
  `const` veniva più avanti.
- **Regola W008 tarata sull'orizzonte anziché su oggi**: una patente in
  scadenza nel 2028 veniva segnalata come «molto vecchia».
- **Tuple nello JSON Schema**: in draft 2020-12 servono `prefixItems`, non
  `items` in forma di lista; e `additionalProperties` non attraversa `allOf`,
  quindi `who` veniva rifiutato sugli eventi condivisi. Entrambi trovati dal
  test con Ajv.
- Dati d'esempio: rimossi un `replaces` privo di blocco `school` (non faceva
  nulla) e una voce di `places` mai usata — segnalati dal validatore stesso.

## [0.3.0] — 2026-08-20

### Aggiunto

- **Vacanze** — blocco `holidays` di radice che si espande in periodi condivisi
  su una corsia propria. Avendo un `place` compaiono anche sulla carta.
- **Scadenze dei documenti** — blocco `documents` per persona. Si dichiara la
  scadenza corrente e il tipo; la catena dei rinnovi si proietta fino
  all'orizzonte. Validità italiane per `patente`, `passaporto` e `identita`,
  calcolate sull'età **al rilascio**; `validity` esplicito per il resto.
  Un documento per riga, perché patente, passaporto e carta d'identità si
  sovrappongono nel tempo.
- **Pannello filtri** — accende e spegne le corsie con il conteggio degli
  elementi, e agisce su tutte e cinque le viste. I documenti partono spenti.
  `settings.filters` fissa lo stato iniziale.
- **Salvataggio locale** — dati e filtri conservati fra sessioni. Prova
  `window.storage`, poi `localStorage`; se nessuno dei due è disponibile
  disabilita il pulsante senza degradare il resto dell'app.
- Suite dedicata alla persistenza, con i tre contesti (`localStorage`,
  `window.storage`, nessuno dei due) simulati.

### Corretto

- **Dipendenze mascherate dal mount.** La fase `dev` del Dockerfile copiava
  `node_modules` in `/app`, ma il Makefile monta la cartella di lavoro sullo
  stesso percorso e la nascondeva: su un clone pulito `make test` sarebbe
  fallito con `Cannot find package 'jsdom'`. Le dipendenze si installano ora
  nel volume montato, tramite il target `node_modules`.

### Modificato

- Le barre più strette di quattro pixel si disegnano come segno pieno con
  etichetta accanto, invece di scomparire: senza questo le vacanze di due
  settimane erano invisibili alla scala normale.
- Le corsie sono ora dichiarate in una tabella unica (`TRACKS`), da cui
  discendono ordine di disegno, etichette e filtri.

## [0.2.1] — 2026-08-20

### Corretto

- **Separatore in collisione con la codifica delle polilinee.** L'alfabeto
  occupa i caratteri ASCII 63–126 e il separatore scelto era `|`, cioè il 124:
  ogni volta che una coordinata generava una barra verticale lo `split`
  spezzava il tratto, e il resto veniva decodificato come delta a partire da
  zero. 1605 linee diventavano 2422 poligoni con latitudini fino a ±350°.
  Il separatore è ora `;` e la build fallisce se dovesse rientrare nel range.
- **Doppio ribaltamento dell'asse y.** I tracciati salvano già la y verso il
  basso e la trasformazione del gruppo SVG ne applicava un secondo: la costa
  finiva migliaia di pixel fuori campo mentre i pin, calcolati per conto loro,
  restavano al posto giusto. Da qui l'effetto "si vedono solo i punti".
- Anticollisione delle etichette sulla carta: dove due luoghi coincidono vince
  il cerchio più grande, e zoomando le altre riemergono.

### Modificato

- I test sulla carta ora applicano davvero la trasformazione SVG e contano
  quanti vertici di costa cadono nel riquadro e vicino ai pin. La sola assenza
  di eccezioni non avrebbe intercettato nessuno dei due bug.

## [0.2.0] — 2026-08-20

### Aggiunto

- **Vista Luoghi** — carta con base cartografica incorporata, senza tile né
  rete. Due livelli di dettaglio scelti in base all'inquadratura.
- Risoluzione delle coordinate in quattro passi: `coord` esplicito, blocco
  `places`, repertorio interno di ~130 città, deduzione dal nome. Quello che
  resta senza coordinate viene elencato già formattato da incollare.
- Cursore degli anni che spegne i luoghi non attivi e mostra l'età di tutti.
- Traccia dei traslochi: una linea tratteggiata per persona, in ordine
  cronologico.
- `tools/gen-coast.mjs` per rigenerare la base da Natural Earth.

## [0.1.1] — 2026-08-20

### Aggiunto

- Strip **Prossimi passaggi** in cima agli anni densi, con il countdown: la
  risposta diretta a "quanto manca alla maturità di …" senza leggere il grafico.
- Etichette sui marker, con anticollisione: compaiono solo se c'è spazio prima
  del marker successivo.
- `recurrences: true` usa `settings.milestones` invece di ripetere la lista su
  ogni evento.

### Corretto

- L'intestazione dell'asse temporale non restava ancorata durante lo
  scorrimento orizzontale.
- L'etichetta "oggi" sul meridiano finiva sotto l'asse in cima alla pagina.

## [0.1.0] — 2026-08-20

Prima versione funzionante.

### Aggiunto

- Quattro viste sullo stesso modello: Cronologia, Età allineate, Anni densi,
  Matrice.
- Date a precisione variabile (`1921`, `1998-11`, `2008-07-12`), trattate
  internamente come intervalli: le età che ne derivano sono marcate come
  approssimate.
- Generazione dei cicli scolastici italiani dalla sola data di nascita, con
  `through`, `early` e `delays`. Un periodo inserito a mano sovrascrive quello
  generato tramite `replaces`.
- Eventi e periodi condivisi con `who`, per non tenere due copie della stessa
  cosa; eventi di radice senza `who` come corsia di contesto.
- Ricorrenze e compleanni tondi generati.
- Passaggio del mouse su qualsiasi elemento: età di tutti in quel momento.
- Pannello dati con applica, scarica e apri file.
