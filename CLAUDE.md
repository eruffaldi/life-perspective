# CLAUDE.md

Prospettiva: carta del tempo di una famiglia, distribuita come **un solo file
HTML offline**. Sorgente TypeScript modulare, artefatto unico. Contesto per chi
lavora sul repository — le trappole, non la struttura (quella si legge dal
codice e dal README).

Interfaccia utente, commenti e messaggi diagnostici sono **in italiano**. Le
chiavi del formato dati sono in inglese, i valori in italiano.

## Invarianti da non violare

**L'artefatto non fa richieste di rete.** Niente CDN, niente tile server,
niente font remoti, niente `@import url()`. `tools/verify.mjs` fallisce se
trova un `src=`/`href=` verso http(s): non aggirarlo, è il punto.

**Il bundle è IIFE, non ESM.** Uno script `type="module"` non viene eseguito da
`file://` in Chrome, ed è così che l'applicazione vive. `vite.config.ts` forza
`output.format: "iife"`, `verify.mjs` toglie l'attributo residuo e fallisce se
trova sintassi di modulo nell'output. Se qualcuno "semplifica" tornando a ESM,
l'artefatto smette di partire con il doppio clic e nessun test di unità se ne
accorge — se ne accorgono solo quelli sull'artefatto.

**Nessuna dipendenza a runtime.** Ciò che sta in `package.json` serve a build e
test. Se una funzione richiede una libreria nel browser, la risposta di solito
è scriverla a mano o non farla.

**Niente `localStorage` diretto.** Si passa da `Store`, che prova
`window.storage`, poi `localStorage`, e degrada a `mode: "none"` disabilitando
i pulsanti senza rompere nulla. Da `file://` alcuni browser negano lo storage:
è un caso previsto, non un errore.

**`src/data/coast.json` è generato, non scritto a mano.** Si rigenera con
`make coast`; è committato di proposito perché `make build` deve funzionare
senza rete.

## Trappole già pagate

**Il separatore delle polilinee.** La codifica occupa i caratteri ASCII
63–126. `|` è il 124 e ci cade dentro: usarlo come separatore spezza i tratti a
metà e produce geometria assurda. Il separatore è `;` (59); `isEncodingSafe` lo
verifica e `verify.mjs` fallisce se qualcosa rientra nel range. Vale per
qualsiasi nuovo dato codificato allo stesso modo.

**L'asse y della carta è già ribaltato nei tracciati.** I path memorizzano
`-y`; la trasformazione del gruppo SVG applica `scale(base)`, **non**
`scale(base, -base)`. Un secondo ribaltamento spedisce la costa fuori campo
lasciando i pin al posto giusto — il sintomo è "si vedono solo i punti".

**`vector-effect: non-scaling-stroke` regge il rendering della carta.** Il
gruppo è scalato di un fattore ~66: senza quella proprietà gli spessori si
moltiplicano. I rasterizzatori (cairosvg) la ignorano, quindi uno snapshot che
sembra un blob pieno non prova che l'app sia rotta.

**In jsdom il boot avviene dopo `DOMContentLoaded`, che è asincrono.** Le
asserzioni sul DOM vanno dopo un'attesa. Un test che verifica subito dopo la
costruzione della JSDOM misura una pagina vuota e passa per sbaglio.

**`additionalProperties` non attraversa `allOf`** nello JSON Schema: le forme
condivise usano `unevaluatedProperties`. E le tuple in draft 2020-12 vogliono
`prefixItems`, non `items` in forma di lista.

**Le dipendenze non vanno cotte nell'immagine Docker.** Il Makefile monta la
cartella di lavoro su `/app` e mascherebbe qualsiasi `node_modules` nel layer.
`NODE_PATH` non è una scorciatoia: gli import ESM lo ignorano.

## Modello dei dati

**Due famiglie di tipi che non vanno confuse.** `Raw*` è ciò che l'utente
scrive: date come stringhe, campi opzionali assenti, nulla verificato. `Model*`
è ciò che i renderer consumano: date risolte, riferimenti già puntatori, valori
generati presenti. `build()` è l'unico ponte. Se un renderer tocca un tipo
`Raw`, qualcosa è sfuggito alla normalizzazione.

**Le date sono intervalli, non istanti.** La precisione si deduce dalla
lunghezza della stringa (`1921` / `1998-11` / `2008-07-12`) e non esiste un
campo `precisione` separato, proprio perché non possa andare fuori sincrono.
Ogni età derivata da una data imprecisa va marcata come approssimata. `circa` è
un'altra cosa: incertezza del ricordo, non granularità.

**`end` assente significa «ancora in corso», non «finito oggi».** È già stato
un bug: i periodi aperti sparivano dagli anni futuri. Chi filtra per anno deve
trattare il caso `open` separatamente — vedi `activeInYear`.

**Ciò che riguarda più persone sta nelle liste di radice con `who`.** Non
duplicare un matrimonio dentro due persone: le due copie divergono. Un periodo
condiviso si aggancia alla sola prima persona di `who`.

**Molte cose sono generate, non inserite.** Cicli scolastici da `birth` +
`school`, rinnovi dei documenti da `expires` + `type`, ricorrenze, compleanni
tondi. Prima di aggiungere un campo, chiedersi se sia derivabile.

## Validazione

I codici `E0xx`/`W0xx` sono **stabili**: non riusare un codice per un
significato diverso. Ogni regola nuova va aggiunta al catalogo in
`docs/requisiti.md`, allo schema se esprimibile, e ai test in entrambe le
direzioni — un caso che la fa scattare e la garanzia che non scatti sui dati
buoni.

**I dati d'esempio devono restare a zero diagnostiche.** Un esempio che genera
avvisi insegna a ignorare gli avvisi. Se una regola nuova accende l'esempio, o
la regola è sbagliata o l'esempio lo è: deciderlo, non silenziarlo.

**Errori bloccano, avvisi no.** Un avviso non deve mai impedire di vedere la
propria carta.

Lo schema copre struttura, tipi ed enum; i vincoli fra campi diversi
(riferimenti `who`, fine dopo inizio, date che esistono davvero) sono solo del
validatore. Un test con Ajv verifica entrambe le direzioni: se schema e codice
divergono, cade.

## Le tre confezioni

Un solo bundle, tre modi di arrivare alle persone:
`dist/prospettiva.html` (doppio clic, `file://`), `dist/index.html` più service
worker (GitHub Pages, installabile), e l'APK. **Il codice è lo stesso**: se
qualcuno introduce una seconda build per una delle tre, le confezioni
divergono e nessun test se ne accorgerà finché non sarà tardi.

Il file autosufficiente non deve rimandare a nulla — nemmeno al manifest, che
da `file://` sarebbe solo un 404. Le intestazioni della PWA le aggiunge
`tools/verify.mjs` alla sola copia ospitata.

**Percorsi relativi ovunque nel manifest e nel service worker.** Pages serve
sotto `/nome-repo/`, non alla radice: un percorso assoluto rompe
l'installazione in modo poco leggibile.

**Il service worker serve dalla cache, non dalla rete.** Per un'applicazione
che è un file solo, «network first» sarebbe soltanto un modo di essere lenti e
fragili.

## Tocco e Android

**Il mouse e il dito non sono la stessa cosa.** Su touch `wheel` non esiste e
non c'è hover: pan, pinch e tap arrivano da Pointer Events in
`src/ui/gestures.ts`, dove sta solo la matematica — il DOM è in `bindGestures`.
Chi tocca la navigazione della carta aggiorni i test lì: jsdom non implementa
`PointerEvent`, quindi la pinch non è simulabile nei test sull'artefatto.

**Ogni funzione dev'essere raggiungibile senza gesti.** Zoom della carta,
scala del grafico, selezione di un luogo: tutti hanno un comando visibile. I
gesti sono in più.

**`touch-action` non è cosmetico, è dove si decide chi gestisce il gesto.**
Il browser sceglie prima che gli eventi arrivino al codice, e `preventDefault`
su `pointermove` non ribalta la decisione. La carta dichiara `none` perché
gestisce tutto; le viste che scorrono dichiarano `pan-x pan-y`, così lo
scorrimento resta al browser e la pinch arriva a noi. Toglierlo non produce un
errore: produce una pagina che si ingrandisce al posto della scala.

In `pinchOnly` non si cattura il puntatore: la cattura toglierebbe al browser
il flusso di eventi che gli serve per scorrere.

**Le misure da polpastrello stanno dietro `(pointer: coarse)`**, non sempre
attive: sul desktop bersagli allargati si ruberebbero i tooltip a vicenda.

**Sotto i 720px le schede stanno in fondo**, non nell'intestazione, e l'altezza
delle due barre viene misurata a runtime in `--headh` e `--navh`: se qualcuno
le fissa a un valore costante, la vista viene tagliata al primo cambio di
orientamento.

**Sulle viste che scorrono non ci sono gesti.** C'è stata una pinch e non
funzionava su tutti i dispositivi: il browser decide da `touch-action` chi
gestisce il gesto, e dove quella dichiarazione non viene rispettata il codice
non riceve nulla e non può rimediare. La scala si cambia da `scale.ts`, un
pannello esplicito. **Non reintrodurre gesti come unica via per una funzione**:
vanno bene come scorciatoia, mai come sola strada.

L'APK incapsula lo stesso `dist/prospettiva.html`, non una seconda build. Se
qualcuno introduce un secondo processo per Android, i due artefatti divergono.

## Lingue

**Il catalogo italiano definisce il tipo** (`Messages = typeof it`): aggiungere
una voce lì e non altrove non compila. Niente `as const`, o i valori
resterebbero letterali e l'inglese non potrebbe scrivere "Timeline" dove
l'italiano dice "Cronologia".

**Nessuna stringa visibile nel markup né nel codice delle viste.** Tutto passa
da `t()`, letto al momento del disegno: le etichette non si memorizzano, altrimenti
il cambio di lingua non le raggiungerebbe. Quelle che finiscono nel modello —
cicli scolastici, ricorrenze — richiedono di ricostruirlo, non solo di
ridisegnare.

**Il domìnio non si traduce.** Cicli scolastici e validità dei documenti sono
regole dello Stato italiano; le chiavi del formato dati restano in inglese. Chi
aggiunge una lingua traduce l'interfaccia, non le regole.

**`t()` è stato globale**, quindi non è puro: i test che cambiano lingua devono
rimetterla com'era in `afterEach`.

## Etichette

**Tutto in `src/ui/labels.ts`**, con due strategie e un criterio per
scegliere. `assignLanes` distribuisce su più righe e non perde nulla: si usa
dove esiste un «sotto» libero, cioè i marcatori. `placeLabels` sceglie chi
mostrare: si usa dove quel sotto non c'è, cioè i pin sulla carta.

Se serve etichettare qualcosa di nuovo si passa da lì: contare lo spazio fino
all'elemento successivo sembra equivalente e non lo è, perché ignora sia i
vicini nascosti sia le scritte che sbordano in avanti.

**Le etichette dei periodi vivono dentro la barra**, confinate dal CSS
(`.barwrap.inside`), non dalla misura del testo. Una scritta che sborda non è
un difetto estetico: fa leggere una durata sbagliata.

La larghezza è **stimata**, non misurata: misurarla davvero costringerebbe a un
reflow per etichetta, centinaia per ridisegno. La stima è per eccesso — meglio
una scritta in meno che due accavallate.

## CSS

Ogni vista importa il proprio foglio, accanto al modulo. `src/styles/tokens.css`
è l'**unico** posto dove si dichiarano colori e famiglie di caratteri: se serve
una tinta nuova si aggiunge lì, non nel foglio della vista. I caratteri sono
stack di sistema — un font remoto violerebbe l'autosufficienza.

`test/styles.test.ts` intercetta le classi rimaste senza codice, gli id senza
markup e le variabili non definite: sono errori che il compilatore non vede,
perché il CSS è l'unico legame rimasto fra moduli altrimenti indipendenti.

## Lavorare qui

`make test` prima di dire che è fatto: fa typecheck, build e suite completa.
`make dev` dà ricarica a caldo su `:5173` mentre si lavora.

**Il typecheck non sostituisce i test, e viceversa.** `strict` con
`noUncheckedIndexedAccess` intercetta gli accessi non verificati; non dice nulla
sul fatto che la costa finisca nel riquadro giusto.

**Ogni bug corretto porta con sé un test che sarebbe fallito prima.** Le
trappole elencate qui sopra sono state trovate da qualcuno che guardava lo
schermo, non dalla suite: l'assenza di eccezioni non è evidenza.

Per la carta, l'assenza di errori non basta: verificare che i vertici
trasformati cadano davvero nel riquadro e vicino ai pin. Un rendering sbagliato
non lancia nulla.

Le diagnostiche del validatore vanno lette come segnali sui dati, non come
rumore da azzerare: due difetti reali dell'esempio sono emersi così.

## Non verificato

Il percorso Docker (`make check`, `make serve`, `--target artifact`,
`make android`) non è mai stato eseguito: è stato scritto seguendo il pattern del progetto e collaudato
solo bypassando `docker run`. Se qualcosa non torna al primo `make check`, è
probabilmente lì.

La fase Android in particolare non ha mai costruito un APK: versioni dell'SDK,
compatibilità fra Capacitor e il plugin Gradle e la generazione del progetto
nativo sono scritte da documentazione, non da esecuzione. È il primo posto
dove guardare se qualcosa non torna.

Nessuna prova su un telefono vero: i gesti sono verificati come matematica, non
sotto un dito, e il service worker non è mai stato eseguito da un browser — la
confezione è verificata, il comportamento a runtime no. `make pages` serve
esattamente a questo.
