# Changelog

Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/),
versionamento [semantico](https://semver.org/lang/it/).

Le versioni precedenti alla 0.3.0 non sono mai state pubblicate come tag: sono
ricostruite qui dalla sequenza di sviluppo, per rendere leggibile come il
progetto è arrivato alla forma attuale.

## [0.10.0] — 2026-08-20

### Modificato

- **Le etichette dei periodi restano dentro il rettangolo**, troncate quando
  non ci stanno. Prima sbordavano: «Scuola Normale Superiore» arrivava fino al
  1925 su una barra che finiva nel 1922, e il periodo sembrava durare tre anni
  di più. Fra una parola tagliata e una durata falsa, il troncamento mente
  meno. Escono ancora solo le barre sotto i diciotto pixel, dove dentro non
  entrerebbe una lettera, e quelle si vagliano fra loro come prima.
- **I marcatori non perdono più l'etichetta: scendono di riga.** La corsia degli
  eventi cresce fino a quattro righe e un rigo verticale lega ogni rombo alla
  sua scritta. Sui dati di Fermi si passa da cinque etichette visibili su
  tredici a tredici su tredici.
- `assignLanes` in `src/ui/labels.ts` affianca `placeLabels`: dove c'è un
  «sotto» libero si distribuisce, dove non c'è — i pin di una carta — si
  continua a scegliere.

## [0.9.1] — 2026-08-20

Difetti emersi provando l'applicazione su un insieme di dati reale — nove vite
del gruppo di via Panisperna, tutte concluse.

### Corretto

- **La riga di intestazione mostrava un trattino per una persona non più in
  vita.** L'applicazione dava implicitamente per scontato che la persona di
  riferimento fosse viva: chiedere la sua età «oggi» è corretto e inutile. Ora
  per chi è morto si mostra l'arco della vita e l'età raggiunta.
- **Un solo dato sbagliato produceva ventitré avvisi derivati.** Una data di
  morte impossibile faceva scattare «successivo alla morte» per ogni evento e
  ogni periodo di quella persona, seppellendo l'unica segnalazione che
  contava. Ora gli avvisi sulla collocazione nella vita vengono soppressi per
  chi ha già un errore sull'arco vitale: chi corregge la causa vede sparire il
  resto da solo.
- `tools/validate.mjs` non stampa più il rumore della scansione delle
  dipendenze di Vite.

## [0.9.0] — 2026-08-20

### Aggiunto

- **Multilingua.** Italiano e inglese, con selettore nell'intestazione, lingua
  del browser rilevata al primo avvio e scelta conservata. Il catalogo italiano
  **definisce il tipo**: una lingua a cui manchi una voce, o che cambi i
  parametri di un messaggio, non compila.
- Tradotti anche i messaggi del validatore, che sono la parte più letta quando
  qualcosa non va. Messaggio e indicazione arrivano insieme dal catalogo, così
  non possono finire in lingue diverse. I codici `E0xx`/`W0xx` restano stabili:
  non sono testo.
- I nomi dei mesi, i cicli scolastici generati, le ricorrenze, le corsie e i
  ruoli seguono la lingua; i ruoli inventati dall'utente restano com'erano.

### Corretto

- **Il pulsante «Traccia dei traslochi» sembrava senza testo.** `.geoctl .btn`
  sovrascriveva lo sfondo di `.btn.on` ma non il colore: scritta chiara su
  fondo chiaro. Ora lo sfondo traslucido vale solo per i comandi a riposo, e
  una sentinella in `test/styles.test.ts` intercetta chi ridefinisce lo sfondo
  dei pulsanti senza dire cosa succede allo stato acceso.
- Il cambio di lingua sollevava quando la textarea conteneva dati ancora da
  correggere: ora in quel caso si ridisegna soltanto.

### Note

Il **domìnio resta italiano** anche quando l'interfaccia non lo è: cicli
scolastici e validità dei documenti sono regole dello Stato italiano, non
stringhe da tradurre. Le chiavi del formato dati restano in inglese in
entrambe le lingue.

## [0.8.0] — 2026-08-20

### Modificato

- **La scala del tempo si cambia da un comando esplicito, non da un gesto.**
  Un pulsante *Scala* apre un pannello con passi − e +, cursore e quattro
  livelli predefiniti (Tutto, Decenni, Anni, Mesi). Si apre su richiesta, quindi
  non occupa l'intestazione né sul telefono né sul desktop, e il punto al
  centro della finestra resta dov'è quando la scala cambia. `+` e `-` da
  tastiera fanno lo stesso senza aprire nulla.
- La carta ha ora pulsanti di zoom espliciti accanto a *Inquadra tutto*:
  rotellina e pinch restano, ma non sono più l'unica via.

### Rimosso

- **La pinch sulle viste a scorrimento.** Dipendeva dal fatto che il browser
  rispettasse `touch-action`, e quando non lo fa il gesto non arriva mai al
  codice: non c'è niente da correggere dal lato nostro. Tenerla sarebbe stato
  tenere una promessa che il dispositivo può rompere. Resta sulla carta, dove
  l'elemento non scorre e il gesto si può prendere per intero.
- Il cursore fisso della scala nell'intestazione, sostituito dal pannello.

## [0.7.2] — 2026-08-20

### Corretto

- **La pinch sul grafico ingrandiva la pagina invece di cambiare la scala.**
  Mancava `touch-action` sulle viste: il browser interpreta il gesto a due dita
  come zoom della pagina e decide *prima* che gli eventi arrivino al codice, per
  cui il gestore non veniva mai eseguito. `preventDefault` su `pointermove` non
  serve a nulla in questo caso, la decisione si prende dal CSS. Ora `.pane`
  dichiara `touch-action: pan-x pan-y`: lo scorrimento resta al browser, la
  pinch arriva a noi.
- In modalità `pinchOnly` il puntatore non viene più catturato: la cattura
  toglieva al browser il flusso di eventi che gli serve per scorrere.

## [0.7.1] — 2026-08-20

### Corretto

- **Etichette sovrapposte sul grafico.** C'erano tre criteri diversi per lo
  stesso compito, e due erano ingenui: guardavano solo lo spazio fino
  all'elemento successivo. Quel criterio sbaglia in entrambe le direzioni —
  nasconde una scritta perché il vicino è vicino, anche quando il vicino è a
  sua volta nascosto e non occupa nulla; e non si accorge di niente quando è la
  scritta a sbordare in avanti oltre chi la segue. Ora c'è un solo algoritmo in
  `src/ui/labels.ts`, usato da marcatori, barre e pin della carta: si ordina
  per importanza e si colloca chi non collide.
- Le etichette delle barre non erano vagliate affatto: sbordavano l'una
  sull'altra dentro la stessa corsia.

### Modificato

- **L'intestazione non si mangia più lo schermo sul telefono.** Sotto i 720px
  le schede scendono in una barra in fondo — dove arriva il pollice — con
  etichette brevi, e in alto resta una riga sola. La legenda sparisce dove il
  gesto che descrive non esiste, cioè su qualsiasi dispositivo senza hover.
- Le altezze delle due barre sono misurate, non indovinate: la vista occupa
  esattamente lo spazio che resta, anche ruotando il telefono.
- Sul telefono il cursore della scala lascia il posto alla **pinch sul
  grafico**, mentre lo scorrimento a un dito resta al browser. Da mouse la
  rotellina continua a scorrere; per zoomare c'è il cursore, o `Ctrl` più
  rotellina.

## [0.7.0] — 2026-08-20

### Aggiunto

- **Applicazione web installabile.** La build produce ora due uscite dallo
  stesso bundle: `prospettiva.html` autosufficiente per il doppio clic, e
  `index.html` con manifest, service worker e icone per GitHub Pages. Il corpo
  è identico — un test verifica che non divergano.
- Service worker con precarico e servizio dalla cache: dopo la prima apertura
  la rete non viene più interrogata per il contenuto. Il nome della cache
  deriva dall'impronta dell'artefatto, quindi cambia solo quando cambia
  davvero qualcosa.
- Avviso discreto quando è pronta una versione nuova, con ricarico a scelta
  dell'utente invece che imposto.
- `navigator.storage.persist()` all'avvio: su un'origine ospitata il
  `localStorage` è memoria sacrificabile finché non si chiede il contrario.
- Icone generate dal linguaggio visivo dell'applicazione: corsie di vita
  attraversate dal meridiano magenta di «oggi», con variante ritagliabile.
- `.github/workflows/pages.yml` pubblica a ogni push su `main`, ma solo dopo
  che la suite è passata: un test rotto non deve sostituire l'installazione
  che le persone hanno già sul telefono.
- `make pages` per l'anteprima locale con il service worker attivo, e
  `docs/pubblicazione.md`.

### Corretto

- **Il segnaposto di build nel service worker non veniva sostituito.** Una
  `replace` semplice colpiva la prima occorrenza, che era in un commento: la
  costante restava intatta, la cache si sarebbe chiamata sempre allo stesso
  modo e gli aggiornamenti non sarebbero mai arrivati ai dispositivi già
  installati. La sostituzione è ora globale e verificata.

## [0.6.0] — 2026-08-20

### Aggiunto

- **Navigazione a tocco.** `src/ui/gestures.ts` gestisce pan a un dito, pinch a
  due e riconoscimento del tap con Pointer Events, tenendo la matematica
  separata dal DOM. Su touch `wheel` non esiste: lo zoom non si poteva ottenere
  adattando gli eventi del mouse.
- Il tooltip — il gesto centrale dell'applicazione — si apre a tocco e si
  chiude toccando altrove quando il dispositivo non ha hover.
- Aree sensibili da polpastrello: i marcatori passano da 16 a 44 pixel e i pin
  ricevono un bersaglio invisibile più largo del cerchio, entrambi solo sotto
  `(pointer: coarse)`.
- `touch-action: none` sulla carta: senza, il browser intercetta il gesto e lo
  trasforma in scorrimento della pagina.
- **Confezionamento Android.** `make android` incapsula lo stesso
  `dist/prospettiva.html` in un APK via Capacitor, con la toolchain in una fase
  Docker separata. Perimetro e limiti in `android/README.md`.

### Corretto

- `.geomap.drag` era rimasta senza codice che la attivasse dopo il passaggio ai
  gesti: il cursore a manina è tornato. Trovata da `test/styles.test.ts`.

## [0.5.1] — 2026-08-20

### Modificato

- Il foglio di stile monolitico si divide seguendo i moduli: ogni vista importa
  il proprio `.css`, e `src/styles/` tiene solo token, fondamenta e atomi
  tipografici condivisi. Le regole erano finite fuori posto per accumulo —
  `.bar.doc`, `.bar.tiny` e la legenda vivevano nella sezione del cassetto dati.
- Il rendering è invariato: il confronto regola per regola prima e dopo mostra
  178 → 176 blocchi, nessuno modificato, e la carta rasterizzata è identica al
  pixel.

### Aggiunto

- `test/styles.test.ts`: verifica che nessuna classe sopravviva al codice che
  la usava, che ogni id abbia un elemento nel markup e che non esistano
  `var(--…)` senza definizione. 213 test in totale.

### Rimosso

- Due regole morte: `.saved` e `.filters label .c`, rimaste da revisioni
  precedenti.

## [0.5.0] — 2026-08-20

Riscrittura in TypeScript. **Nessun cambiamento visibile all'utente**: le
cinque viste, i filtri, la validazione e il formato dati sono identici.

### Modificato

- Il sorgente passa da un unico file HTML di 1789 righe a diciassette moduli
  TypeScript in `strict`, con `noUncheckedIndexedAccess`, `noUnusedLocals` e
  `noUnusedParameters`. Il dominio (`src/core/`) non tocca il DOM.
- Introdotti Vite e `vite-plugin-singlefile`: la proprietà di file unico non è
  più una caratteristica del sorgente ma un risultato della build, verificato
  da `tools/verify.mjs`.
- I tipi distinguono `Raw*` (ciò che l'utente scrive) da `Model*` (ciò che i
  renderer consumano), con `build()` come unico ponte.
- La suite passa a Vitest: undici file di unità sui moduli puri più due di
  integrazione sull'artefatto costruito. 204 test.
- `tools/validate.mjs` importa il validatore dal sorgente TypeScript tramite
  vite-node, invece di estrarlo dall'HTML costruito.
- `make dev` avvia il server Vite con ricarica a caldo.

### Corretto

- **Bundle ESM non eseguibile da `file://`.** `vite-plugin-singlefile` inlinea
  come `<script type="module">`, e Chrome blocca i moduli sugli origin opachi:
  l'artefatto non sarebbe partito con il doppio clic, che è il modo in cui
  questa applicazione vive. La build forza ora il formato IIFE, toglie
  l'attributo residuo e fallisce se trova sintassi di modulo nell'output.

### Rimosso

- `tools/build.mjs` e il segnaposto `__COAST__`: la base cartografica è ora un
  normale `import` di JSON, inlineato da Vite.

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
