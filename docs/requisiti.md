# Requisiti — validazione dei dati

Il formato di Prospettiva si scrive a mano. L'obiettivo di questa parte non è
impedire i dati sbagliati: è **fare in modo che sistemarli costi poco**.

Il criterio di progetto è uno solo: *chi incolla un JSON deve poter arrivare a
un documento valido senza aprire la console del browser.*

---

## RF — Requisiti funzionali

**RF1 — Raccogliere tutto, non fermarsi al primo.** La validazione produce
l'elenco completo delle diagnostiche in una sola passata. Fermarsi al primo
errore costringe a un ciclo correggi-riprova per ogni virgola fuori posto.

**RF2 — Due livelli, con conseguenze diverse.**
*Errore*: i dati non sono caricabili senza ambiguità. Blocca il caricamento.
*Avviso*: i dati sono caricabili ma probabilmente non dicono ciò che si voleva.
Non blocca nulla.
Un avviso non deve mai impedire di vedere la propria carta.

**RF3 — Ogni diagnostica ha quattro parti.** Livello, codice stabile, percorso
JSON (`people[2].documents[0].expires`) e messaggio. L'indicazione su come
sistemare è separata dal messaggio, perché dice una cosa diversa: il messaggio
racconta cosa non va, l'indicazione cosa fare.

**RF4 — Dalla diagnostica al punto esatto.** Un clic porta il cursore sul
frammento di testo responsabile. Se il percorso preciso non è localizzabile
(campo assente), si risale al genitore più vicino.

**RF5 — Codici stabili.** `E0xx` errori, `W0xx` avvisi. Un codice non viene
riusato per un significato diverso: i test vi si riferiscono, e chi ha già
visto un `W008` deve poterlo cercare.

**RF6 — Errori di sintassi trattati come diagnostiche.** JSON malformato
produce una diagnostica `E000` con il numero di riga, non un messaggio di
sistema.

**RF7 — Non si salvano dati con errori.** Il salvataggio nel browser rifiuta
un documento che non passa la validazione, per non riaprire l'app su una copia
inutilizzabile. Il download del file resta sempre possibile.

**RF8 — Anche ciò che arriva dal salvataggio viene validato.** Se la copia
conservata contiene errori si riparte dall'esempio, dicendolo.

**RF9 — Controllo senza applicazione.** Un comando esamina il documento e
mostra le diagnostiche senza sostituire i dati correnti.

**RF10 — Silenzio quando è tutto a posto.** Zero diagnostiche significa nessun
pannello e nessun contatore. Un avviso permanente su dati corretti insegna a
ignorare gli avvisi.

---

## RNF — Requisiti non funzionali

**RNF1** — La validazione è una funzione pura del documento: nessuna
dipendenza dallo stato dell'applicazione, nessun effetto collaterale. È
richiamabile da riga di comando (`make validate FILE=…`) e dai test.

**RNF2** — I dati d'esempio inclusi non producono alcuna diagnostica. Un
esempio che genera avvisi insegna che gli avvisi sono normali.

**RNF3** — Il costo è lineare nel numero di voci. I documenti previsti sono
dell'ordine delle centinaia di elementi.

**RNF4** — Ogni regola è coperta da almeno un test che la fa scattare e uno
che verifica che non scatti sui dati buoni. Un validatore con falsi positivi è
peggio di nessun validatore.

---

## Divisione del lavoro con lo JSON Schema

`schema/prospettiva.schema.json` (draft 2020-12) descrive struttura, tipi e
vocabolari chiusi. Serve agli editor — VS Code offre completamento e
segnalazioni in tempo reale — e alla verifica in CI.

Ma lo schema **non può** esprimere i vincoli che collegano campi diversi:

| verifica                                    | schema | validatore |
|---------------------------------------------|:------:|:----------:|
| campo obbligatorio presente                 | sì     | sì         |
| tipo e forma del valore                     | sì     | sì         |
| enum chiusi (`through`, `replaces`, `type`)  | sì     | sì         |
| formato della data                          | sì     | sì         |
| **data che esiste davvero** (31 febbraio)   | no     | sì         |
| **`who` che punta a un id esistente**       | no     | sì         |
| **id univoci**                              | no     | sì         |
| **fine successiva all'inizio**              | no     | sì         |
| **morte successiva alla nascita**           | no     | sì         |
| **evento dentro la vita della persona**     | no     | sì         |
| **luogo risolvibile in coordinate**         | no     | sì         |
| **`replaces` con un blocco `school` che lo giustifichi** | no | sì |

Le due verifiche vanno tenute allineate: un test carica lo schema con Ajv e
controlla che i dati d'esempio lo soddisfino. Se lo schema e il codice
divergono, quel test cade.

---

## Catalogo delle regole

### Errori

| codice | condizione | dove |
|--------|------------|------|
| E000 | il testo non è JSON valido | radice |
| E001 | la radice non è un oggetto | radice |
| E002 | `people` assente, non una lista, o vuoto | `people` |
| E003 | persona senza `name`, o voce che non è un oggetto | `people[i]` |
| E004 | persona senza `birth` | `people[i].birth` |
| E005 | data non riconoscibile | qualsiasi campo data |
| E006 | data sintatticamente valida ma inesistente (mese 13, 31 febbraio) | qualsiasi campo data |
| E007 | `id` duplicato fra due persone | `people[i].id` |
| E008 | `who` cita un id inesistente | `…​.who[k]` |
| E009 | `end` precedente a `start`, o scadenza precedente alla nascita | `…​.end` |
| E010 | `death` precedente a `birth` | `people[i].death` |
| E011 | evento senza `date`, periodo senza `start`, o i due mescolati | evento / periodo |
| E012 | `replaces` con un ciclo sconosciuto | `…​.replaces` |
| E013 | `school` non è un oggetto, o `through` sconosciuto | `…​.school` |
| E014 | chiave o valore non valido in `school.delays` | `…​.delays.x` |
| E015 | coordinate non numeriche o fuori scala | `places.x`, `…​.place.coord` |
| E016 | `recurrences` o `milestones` non validi | `…​.recurrences` |
| E017 | documento senza `expires` | `…​.documents[j]` |
| E018 | `validity` non intero positivo | `…​.validity` |
| E019 | `ageDisplay` fuori vocabolario | `settings.ageDisplay` |
| E020 | `meta.anchor` cita un id inesistente | `meta.anchor` |
| E021 | campo che dovrebbe essere lista o dizionario e non lo è | vari |
| E999 | eccezione imprevista durante il caricamento | radice |

`E999` è una rete di sicurezza: se una condizione sfugge al validatore ma fa
cadere `build()`, l'utente vede una diagnostica invece di una pagina bianca.
Ogni `E999` osservato è una regola mancante da aggiungere.

### Avvisi

| codice | condizione |
|--------|------------|
| W002 | evento o periodo fuori dalla vita della persona |
| W003 | data oltre `settings.horizon`: non verrà disegnata |
| W004 | `who` con un solo riferimento: sta meglio dentro la persona |
| W005 | voce di `places` mai usata — probabile nome che non coincide |
| W006 | `category` o `track` fuori vocabolario |
| W007 | due persone con lo stesso nome: colonne indistinguibili |
| W008 | scadenza vecchia di oltre dieci anni |
| W009 | `color` non esadecimale a sei cifre |
| W010 | data non canonica (`1978-4-2` invece di `1978-04-02`) |
| W011 | `replaces` senza un blocco `school` che lo giustifichi |
| W012 | vacanza più lunga di sei mesi |
| W014 | persona senza `id`: non potrà essere citata in `who` |
| W015 | evento o periodo senza etichetta |
| W016 | `type` di documento senza regole note e senza `validity` |

---

## Note di verifica

Durante lo sviluppo il validatore ha segnalato tre cose sui dati d'esempio.
Una era un difetto della regola — `W008` confrontava la scadenza con
l'orizzonte invece che con la data odierna, e giudicava «molto vecchia» una
patente ancora valida per anni. Le altre due erano difetti reali dei dati: un
`replaces` su una persona senza blocco `school`, che non faceva nulla, e una
voce di `places` dichiarata e mai usata.

È il comportamento che ci si aspetta da questa parte del progetto, ed è la
ragione di RNF2: l'esempio deve restare a zero diagnostiche, altrimenti la
prima cosa che si impara è a non leggerle.
