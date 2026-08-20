# CLAUDE.md

Prospettiva: carta del tempo di una famiglia, distribuita come **un solo file
HTML offline**. Contesto per chi lavora sul repository — le trappole, non la
struttura (quella si legge dal codice e dal README).

Interfaccia utente, commenti e messaggi diagnostici sono **in italiano**. Le
chiavi del formato dati sono in inglese, i valori in italiano.

## Invarianti da non violare

**L'artefatto non fa richieste di rete.** Niente CDN, niente tile server,
niente font remoti, niente `@import url()`. `tools/build.mjs` fallisce se
trova un `src=`/`href=` verso http(s): non aggirarlo, è il punto.

**Nessuna dipendenza a runtime.** Le dipendenze in `package.json` servono solo
a build e test. Se una funzione richiede una libreria nel browser, la risposta
di solito è scriverla a mano o non farla.

**Niente `localStorage` diretto.** Si passa da `Store`, che prova
`window.storage`, poi `localStorage`, e degrada a `mode: "none"` disabilitando
i pulsanti senza rompere nulla. Da `file://` alcuni browser negano lo storage:
è un caso previsto, non un errore.

**`src/coast.json` è generato, non scritto a mano.** Si rigenera con
`make coast`; è committato di proposito perché `make build` deve funzionare
senza rete.

## Trappole già pagate

**Il separatore delle polilinee.** La codifica occupa i caratteri ASCII
63–126. `|` è il 124 e ci cade dentro: usarlo come separatore spezza i tratti
a metà e produce geometria assurda. Il separatore è `;` (59), e sia
`tools/build.mjs` sia `tools/gen-coast.mjs` falliscono se qualcosa rientra nel
range. Vale per qualsiasi nuovo dato codificato allo stesso modo.

**L'asse y della carta è già ribaltato nei tracciati.** I path memorizzano
`-y`; la trasformazione del gruppo SVG applica `scale(base)`, **non**
`scale(base, -base)`. Un secondo ribaltamento spedisce la costa fuori campo
lasciando i pin al posto giusto — il sintomo è "si vedono solo i punti".

**`vector-effect: non-scaling-stroke` regge il rendering della carta.** Il
gruppo è scalato di un fattore ~66: senza quella proprietà gli spessori si
moltiplicano. I rasterizzatori (cairosvg) la ignorano, quindi uno snapshot che
sembra un blob pieno non prova che l'app sia rotta.

**In jsdom il boot avviene dopo `DOMContentLoaded`, che è asincrono.** Le
asserzioni sul DOM vanno dentro un `setTimeout`. Un test che verifica subito
dopo la costruzione della JSDOM misura una pagina vuota e passa per sbaglio.

**`additionalProperties` non attraversa `allOf`** nello JSON Schema: le forme
condivise usano `unevaluatedProperties`. E le tuple in draft 2020-12 vogliono
`prefixItems`, non `items` in forma di lista.

**Le dipendenze non vanno cotte nell'immagine Docker.** Il Makefile monta la
cartella di lavoro su `/app` e mascherebbe qualsiasi `node_modules` nel layer.
`NODE_PATH` non è una scorciatoia: gli import ESM lo ignorano.

## Modello dei dati

**Le date sono intervalli, non istanti.** La precisione si deduce dalla
lunghezza della stringa (`1921` / `1998-11` / `2008-07-12`) e non esiste un
campo `precisione` separato, proprio perché non possa andare fuori sincrono.
Ogni età derivata da una data imprecisa va marcata come approssimata. `circa`
è un'altra cosa: incertezza del ricordo, non granularità.

**`end` assente significa «ancora in corso», non «finito oggi».** È già stato
un bug: i periodi aperti sparivano dagli anni futuri. Chi filtra per anno deve
trattare il caso `open` separatamente.

**Ciò che riguarda più persone sta nelle liste di radice con `who`.** Non
duplicare un matrimonio dentro due persone: le due copie divergono.

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

## Lavorare qui

`make test` prima di dire che è fatto. La suite gira contro
`dist/prospettiva.html`, cioè contro ciò che si spedisce, non contro il
sorgente.

**Ogni bug corretto porta con sé un test che sarebbe fallito prima.** Tutti i
difetti elencati qui sopra sono stati trovati da qualcuno che guardava lo
schermo, non dalla suite: l'assenza di eccezioni non è evidenza.

Per la carta, l'assenza di errori non basta: verificare che i vertici
trasformati cadano davvero nel riquadro e vicino ai pin. Un rendering
sbagliato non lancia nulla.

Le diagnostiche del validatore vanno lette come segnali sui dati, non come
rumore da azzerare: due difetti reali dell'esempio sono emersi così.

## Decisione aperta: niente bundler

Non c'è Vite, e non per distrazione. Il sorgente è già un file unico senza
`import`: `vite-plugin-singlefile` servirebbe a ri-inlinare ciò che Vite ha
appena separato. L'unica build è l'iniezione di `coast.json`.

Il prezzo è dichiarato: niente TypeScript, niente type checking, il presidio
contro le regressioni è la suite. `src/index.html` supera le 1800 righe ed è al
limite del sostenibile. **Il momento di introdurre Vite è quando si decide di
spezzare il sorgente in moduli**, e allora conviene portarlo anche in TS. Non
farlo di iniziativa: è una scelta del proprietario del progetto.

## Non verificato

Il percorso Docker (`make check`, `make serve`, `--target artifact`) non è mai
stato eseguito: è stato scritto seguendo il pattern del progetto e collaudato
solo bypassando `docker run`. Se qualcosa non torna al primo `make check`, è
probabilmente lì.
