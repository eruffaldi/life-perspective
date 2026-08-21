/**
 * Catalogo italiano. È anche la **definizione del tipo**: `Messages` si ricava
 * da qui, quindi una lingua a cui manchi una voce non compila, e nemmeno una
 * che cambi il numero di parametri di un messaggio. Non serve mantenere a mano
 * un'interfaccia parallela, che divergerebbe.
 *
 * Il domìnio resta italiano anche quando l'interfaccia non lo è: i cicli
 * scolastici e le validità dei documenti sono regole dello Stato italiano, non
 * stringhe da tradurre. Tradurre l'interfaccia non le rende generiche.
 */
export const it = {
  code: "it",
  name: "Italiano",
  /** Etichetta della lingua nella sua lingua, per il selettore. */
  months: ["gen", "feb", "mar", "apr", "mag", "giu",
           "lug", "ago", "set", "ott", "nov", "dic"],

  app: {
    title: "Prospettiva",
    documentTitle: (name: string) => name + " — carta del tempo",
    today: "oggi",
    year: "Anno",
    age: "Età",
    unknown: "—"
  },

  views: {
    chart: "Cronologia", chartShort: "Tempo",
    ages: "Età allineate", agesShort: "Età",
    places: "Luoghi", placesShort: "Luoghi",
    dense: "Anni densi", denseShort: "Anni",
    matrix: "Matrice", matrixShort: "Matrice"
  },

  tracks: {
    school: "Scuola", work: "Lavoro", home: "Casa", holiday: "Vacanze",
    finance: "Denaro", doc: "Documenti", life: "Vita", world: "Contesto"
  },

  roles: {
    self: "io", partner: "compagna/o", child: "figlio/a", parent: "genitore",
    grandparent: "nonno/a", sibling: "fratello/sorella", friend: "amico/a"
  },

  stages: {
    primary: "Elementari", middle: "Medie", highschool: "Liceo",
    bachelor: "Triennale", master: "Magistrale",
    middleEnd: "Licenza media", highschoolEnd: "Maturità",
    bachelorEnd: "Laurea triennale", masterEnd: "Laurea magistrale"
  },

  chart: {
    context: "Il mondo intorno",
    legendPeriod: "periodo", legendEvent: "evento", legendRecurrence: "ricorrenza",
    legendCirca: "data incerta", legendToday: "oggi",
    legendHint: "Passa sopra un elemento per leggere l'età di tutti in quel momento.",
    expires: (date: string) => "scade " + date,
    ongoing: "in corso",
    lived: (years: number) => "Visse " + years + " anni.",
    todayAge: (age: string) => "Oggi " + age + ".",
    endsIn: (when: string) => "Finisce " + when + ".",
    lasted: (years: number) => "Durata " + years + " anni.",
    startedOngoing: (when: string) => "Iniziato " + when + ", ancora in corso.",
    recurrenceNote: " · ricorrenza",
    circa: " (circa)"
  },

  age: {
    years: (n: number) => n + " anni",
    approx: (n: number) => "~" + n + " anni",
    range: (a: number, b: number) => a + "–" + b + " anni",
    notYetBorn: "non ancora nato",
    noLonger: "non più in vita",
    now: "adesso",
    inFuture: (s: string) => "tra " + s,
    inPast: (s: string) => s + " fa",
    nMonths: (n: number) => n + (n === 1 ? " mese" : " mesi"),
    nYears: (n: number) => n + (n === 1 ? " anno" : " anni"),
    yearsAndMonths: (y: string, m: string) => y + " e " + m
  },

  dense: {
    title: "Anni densi",
    lede: "Gli anni in cui si accavallano due o più cose. È qui che si vede la forma " +
          "dei prossimi vent'anni: le maturità, la fine del mutuo, i compleanni tondi " +
          "che cadono insieme.",
    includePast: "Includi anche il passato",
    onlyFuture: "Mostra solo dall'anno in corso",
    empty: "Nessun anno con due o più eventi in questo intervallo.",
    thisYear: "quest'anno",
    nextUp: "Prossimi passaggi",
    turns: (name: string, age: number) => name + " compie " + age + " anni",
    starts: (label: string) => "Inizio — " + label,
    ends: (label: string) => "Fine — " + label,
    anniversary: (n: number, label: string) => n + " anni — " + label,
    world: "il mondo"
  },

  matrix: {
    title: "Matrice delle età",
    lede: "Ogni riga è un momento, ogni colonna una persona: la cella dice quanti " +
          "anni aveva o avrà. Il trattino segna chi non era ancora nato, la croce " +
          "chi non c'era più.",
    moment: "Momento",
    when: "Quando"
  },

  places: {
    title: "Luoghi",
    lede: "Il cerchio cresce con gli anni passati sul posto. Il cursore in basso " +
          "spegne i luoghi che in quell'anno non c'entravano.",
    none: "Nessun luogo posizionato",
    noneLede: "Aggiungi `place` a eventi e periodi. Per i nomi che il repertorio non " +
              "conosce, indica le coordinate nel blocco `places`.",
    fit: "Inquadra tutto",
    traces: "Traccia dei traslochi",
    zoomIn: "Ingrandisci la carta",
    zoomOut: "Rimpicciolisci la carta",
    now: "Oggi",
    years: (n: number) => n + " anni",
    totalYears: (n: number) => n + " anni complessivi qui.",
    moments: (n: number) => n + (n === 1 ? " momento." : " momenti."),
    noCoords: "Senza coordinate",
    noCoordsLede: "Questi nomi non sono nel repertorio. Aggiungili al blocco `places` " +
                  "in fondo al JSON:",
    fromList: "dal tuo elenco",
    fromGazetteer: "dal repertorio",
    inferred: (from: string) => "dedotto da " + from
  },

  scale: {
    button: "Scala",
    title: "Scala del tempo",
    less: "Riduci la scala",
    more: "Aumenta la scala",
    lessHint: "Allarga l'intervallo mostrato",
    moreHint: "Stringi l'intervallo mostrato",
    label: "Scala del tempo",
    presetAll: "Tutto", presetAllHint: "l'intero arco, dalla persona più anziana all'orizzonte",
    presetDecades: "Decenni", presetDecadesHint: "una generazione a colpo d'occhio",
    presetYears: "Anni", presetYearsHint: "un anno per tacca",
    presetMonths: "Mesi", presetMonthsHint: "il massimo dettaglio",
    readout: (ppy: number, years: number) =>
      ppy + " px per anno · circa " + years + " anni a schermo"
  },

  filters: {
    button: "Filtri",
    buttonCount: (on: number, total: number) => "Filtri · " + on + "/" + total,
    title: "Cosa mostrare",
    all: "Tutto",
    none: "Niente"
  },

  data: {
    button: "Dati",
    buttonCount: (n: number) => "Dati · " + n,
    title: "Dati",
    lede: "Incolla qui il tuo JSON e premi Applica. Niente esce da questa pagina: " +
          "i dati restano in memoria finché la tieni aperta, quindi scarica il file " +
          "prima di chiuderla.",
    apply: "Applica",
    check: "Controlla",
    save: "Salva nel browser",
    forget: "Dimentica",
    download: "Scarica JSON",
    upload: "Apri file…",
    reset: "Ripristina esempio",
    close: "Chiudi",
    applied: (n: number) => "Applicato: " + n + (n === 1 ? " persona" : " persone"),
    appliedWarnings: (n: number) => " · " + n + (n === 1 ? " avviso" : " avvisi"),
    fixErrors: "Correggi gli errori elencati qui sopra.",
    noProblems: "Nessun problema rilevato.",
    saved: (when: string) => "Salvato nel browser · " + when,
    savedRestored: "Caricata la copia salvata nel browser.",
    savedBroken: "Copia salvata illeggibile, uso l'esempio.",
    savedInvalid: "La copia salvata contiene errori: mostro l'esempio.",
    forgotten: "Copia salvata rimossa. Il file resta quello che hai scaricato.",
    resetDone: "Esempio ricaricato. Premi Applica.",
    saveRefused: "Non salvo dati con errori: correggili prima.",
    saveUnavailable: "Salvataggio non disponibile in questo contesto",
    updateReady: "Nuova versione pronta.",
    reload: "Ricarica"
  },

  diag: {
    errors: (n: number) => n + (n === 1 ? " errore" : " errori"),
    warnings: (n: number) => n + (n === 1 ? " avviso" : " avvisi"),
    blocked: " — i dati non sono stati caricati",
    loaded: " — dati caricati",
    syntax: (line: number | null) =>
      "Il testo non è JSON valido" + (line ? " (riga " + line + ")" : "") + ".",
    unexpected: "Errore imprevisto durante il caricamento."
  },


  /**
   * Messaggi del validatore: la parte che si legge quando qualcosa non va, e
   * quindi quella che più di tutte deve parlare la lingua di chi legge. Ogni
   * regola restituisce messaggio e indicazione insieme, così le due metà non
   * possono finire in lingue diverse.
   */
  rules: {
    E001: () => ({ m: "Il documento non è un oggetto JSON.",
                   h: "La radice deve essere { … } con almeno la chiave `people`." }),
    E002missing: () => ({ m: "Manca l'elenco delle persone.",
                          h: 'Serve `"people": [ … ]` con almeno una persona.' }),
    E002empty: () => ({ m: "L'elenco delle persone è vuoto.",
                        h: "Aggiungi almeno una persona con `name` e `birth`." }),
    E003notObject: () => ({ m: "Questa voce non è un oggetto.",
                            h: 'Ogni persona è { "name": …, "birth": … }.' }),
    E003noName: () => ({ m: "Persona senza nome.", h: 'Serve `name`, per esempio "Sofia".' }),
    E004: (who: string) => ({ m: who + " non ha una data di nascita.",
                              h: "`birth` è obbligatoria: da lì discendono tutte le età." }),
    E005: (label: string, value: string) => ({
      m: label + ': "' + value + '" non è una data riconoscibile.',
      h: "Ammessi solo AAAA, AAAA-MM e AAAA-MM-GG, per esempio 1978, 1978-04 o 1978-04-12." }),
    E006month: (label: string, month: number) => ({
      m: label + ": il mese " + month + " non esiste.", h: "I mesi vanno da 01 a 12." }),
    E006day: (label: string, day: number, last: number) => ({
      m: label + ": il " + day + " non esiste in quel mese.",
      h: "Quel mese ha " + last + " giorni." }),
    E007: (id: string, other: string) => ({
      m: 'L\'id "' + id + '" è già usato da ' + other + ".",
      h: "Gli id devono essere unici: servono a collegare eventi e periodi condivisi." }),
    E008: (id: string, available: string) => ({
      m: 'Nessuna persona ha l\'id "' + id + '".',
      h: available ? "Id disponibili: " + available + "." : "Dai un `id` alle persone." }),
    E009end: (start: string, end: string) => ({
      m: "La fine precede l'inizio.", h: "Inizio " + start + ", fine " + end + "." }),
    E009doc: (birth: string, expiry: string) => ({
      m: "Il documento scade prima della nascita.",
      h: "Nascita " + birth + ", scadenza " + expiry + "." }),
    E010: (who: string, birth: string, death: string) => ({
      m: who + " risulta morto prima di nascere.",
      h: "Nascita " + birth + ", morte " + death + "." }),
    E011eventNotObject: () => ({ m: "Questa voce non è un oggetto.",
                                 h: 'Un evento è { "label": …, "date": … }.' }),
    E011periodNotObject: () => ({ m: "Questa voce non è un oggetto.",
                                  h: 'Un periodo è { "label": …, "start": … }.' }),
    E011noDate: () => ({ m: "Evento senza data.",
                         h: "Un evento è puntuale e usa `date`; per un intervallo usa `start` e `end`." }),
    E011eventSpan: () => ({ m: "Un evento non può avere `start` o `end`.",
                            h: "Punto nel tempo → `date`. Intervallo → spostalo in `periods` con `start`/`end`." }),
    E011noStart: () => ({ m: "Periodo senza inizio.",
                          h: "`start` è obbligatorio; `end` si può omettere per indicare «ancora in corso»." }),
    E011periodDate: () => ({ m: "Un periodo non usa `date`.",
                             h: "Intervallo → `start` e `end`. Punto nel tempo → spostalo in `events`." }),
    E012: (value: string, allowed: string) => ({
      m: '"' + value + '" non è un ciclo scolastico noto.', h: "Ammessi: " + allowed + "." }),
    E013notObject: () => ({ m: "Deve essere un oggetto.", h: 'Per esempio { "through": "highschool" }.' }),
    E013stage: (value: string, allowed: string) => ({
      m: '"' + value + '" non è un ciclo noto.', h: "Ammessi: " + allowed + "." }),
    E014key: (key: string, allowed: string) => ({
      m: '"' + key + '" non è un ciclo noto.', h: "Ammessi: " + allowed + "." }),
    E014value: () => ({ m: "Il ritardo dev'essere un intero non negativo.",
                        h: "Un anno perso alle medie si scrive 1." }),
    E015coord: () => ({ m: "Coordinate non valide.", h: "Servono due numeri: [latitudine, longitudine]." }),
    E015range: (lat: number, lon: number) => ({
      m: "Coordinate fuori scala: [" + lat + ", " + lon + "].",
      h: "Latitudine fra -90 e 90, longitudine fra -180 e 180. Forse sono invertite?" }),
    E015place: () => ({ m: "Luogo non valido.",
                        h: 'Una stringa ("Milano") oppure { "name": …, "coord": [lat, lon] }.' }),
    E016recurrences: () => ({ m: "Deve essere `true` o una lista di interi positivi.",
                              h: "Per esempio [10, 25, 50], oppure true per usare `settings.milestones`." }),
    E016milestones: () => ({ m: "Deve essere una lista di interi positivi.", h: "Per esempio [5, 10, 25, 50]." }),
    E017: () => ({ m: "Documento senza scadenza.",
                   h: "`expires` è obbligatoria: è da lì che si proiettano i rinnovi." }),
    E018: () => ({ m: "La validità dev'essere un intero positivo di anni.", h: "Per esempio 4." }),
    E019: (value: string) => ({ m: 'Valore "' + value + '" non ammesso.',
                                h: "Usa `midpoint` (~77 anni) oppure `range` (76–77 anni)." }),
    E020: (id: string, available: string) => ({
      m: 'Nessuna persona ha l\'id "' + id + '".',
      h: available ? "Id disponibili: " + available + "." : "Dai un `id` a una persona." }),
    E021who: () => ({ m: "Deve essere una lista di id.", h: 'Per esempio ["marta", "davide"].' }),
    E021filters: (allowed: string) => ({ m: "Deve essere una lista di corsie.",
                                         h: "Valori ammessi: " + allowed + "." }),
    E021places: () => ({ m: "Deve essere un dizionario nome → coordinate.",
                         h: 'Per esempio { "Lerici": [44.0757, 9.9114] }.' }),
    W002before: (label: string, birth: string) => ({
      m: label + " precede la nascita (" + birth + ").",
      h: "Non comparirà nella vista Età allineate." }),
    W002after: (label: string, death: string) => ({
      m: label + " è successivo alla morte (" + death + ").",
      h: "Comparirà comunque sulla cronologia, ma le età risulteranno vuote." }),
    W003: (horizon: string) => ({ m: "Oltre l'orizzonte (" + horizon + ").",
                                  h: "Non verrà disegnato: alza `settings.horizon`." }),
    W004: (who: string) => ({ m: "Un solo riferimento in `who`.",
                              h: "Se riguarda solo " + who + ", sta meglio dentro `people[].events` o `people[].periods`." }),
    W005: (name: string) => ({ m: '"' + name + '" non è usato da nessun evento o periodo.',
                               h: "Innocuo, ma forse il nome non coincide con quello scritto in `place`." }),
    W006category: (value: string, known: string) => ({
      m: '"' + value + '" non è una categoria nota.', h: "Finirà nella corsia Vita. Note: " + known + "." }),
    W006track: (value: string, known: string) => ({
      m: '"' + value + '" non è una corsia nota.', h: "Corsie: " + known + "." }),
    W007: (name: string) => ({ m: "Due persone si chiamano " + name + ".",
                               h: "Le colonne della matrice saranno indistinguibili: aggiungi un cognome o un soprannome." }),
    W008: (date: string) => ({ m: "Scadenza vecchia di oltre dieci anni: " + date + ".",
                               h: "La catena dei rinnovi partirà da lì e riempirà la corsia di voci passate. Di solito conviene indicare la scadenza attuale." }),
    W009: (value: string) => ({ m: '"' + value + '" non è un colore esadecimale a sei cifre.',
                                h: 'Verrà usato un colore della tavolozza. Formato atteso: "#35407E".' }),
    W010: (label: string, value: string, canonical: string) => ({
      m: label + ': "' + value + '" non è in forma canonica.',
      h: "Meglio due cifre per mese e giorno: " + canonical + "." }),
    W011: () => ({ m: "Non c'è nulla da sostituire.",
                   h: "`replaces` ha effetto solo se la persona ha un blocco `school`." }),
    W012: () => ({ m: "Vacanza di oltre sei mesi.",
                   h: "Se è un trasferimento, sta meglio come periodo con `track` `home` o `work`." }),
    W014: (who: string) => ({ m: who + " non ha un `id`.",
                              h: "Senza id nessun evento condiviso potrà riferirsi a questa persona con `who`." }),
    W015event: () => ({ m: "Evento senza etichetta.", h: "Comparirà come voce vuota." }),
    W015period: () => ({ m: "Periodo senza etichetta.", h: "La barra risulterà anonima." }),
    W016: (value: string, allowed: string) => ({
      m: '"' + value + '" non ha regole di rinnovo note.',
      h: "Verrà usata una validità di 10 anni. Ammessi: " + allowed + ", oppure indica `validity` in anni." })
  },

  now: "Oggi"
};

/**
 * Il tipo di un catalogo, ricavato dall'italiano. Niente `as const`: i valori
 * devono restare `string`, altrimenti l'inglese non potrebbe scrivere
 * "Timeline" dove l'italiano dice "Cronologia".
 */
export type Messages = typeof it;
