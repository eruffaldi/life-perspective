# Pubblicare su GitHub Pages

`dist/` contiene già tutto: `index.html`, il manifest, il service worker e le
icone. Il flusso in `.github/workflows/pages.yml` costruisce e pubblica a ogni
push su `main`, **dopo** aver eseguito la suite — se un test cade,
l'installazione già presente sui telefoni resta quella buona.

Da fare una volta sola, nelle impostazioni del repository: *Settings → Pages →
Source: GitHub Actions*.

## Il repository dev'essere pubblico

GitHub Pages su un repository privato richiede un piano a pagamento. Se il tuo
è privato, o lo rendi pubblico o serve un'altra origine HTTPS — va bene
qualsiasi hosting statico.

**Diventa pubblico il codice, non i dati.** Il JSON di famiglia non viene mai
caricato da nessuna parte: resta nel `localStorage` del dispositivo, e l'unico
modo per farlo uscire è il pulsante *Scarica JSON*. Se però lo committi nel
repository per comodità, quello sì diventa pubblico.

## Percorsi relativi, non assoluti

Pages serve il sito sotto `/nome-repo/`, non alla radice del dominio. Per
questo `start_url` e `scope` nel manifest sono `"."` e gli URL nel service
worker sono relativi. Un percorso assoluto punterebbe alla radice e
l'installazione fallirebbe in modo poco leggibile: un test lo verifica.

## Aggiornamenti

Il nome della cache del service worker deriva dall'impronta dell'artefatto:
quando il contenuto cambia, cambia la cache e il precarico si rifà. Chi ha
l'applicazione installata vede un avviso discreto con un pulsante *Ricarica* —
non viene interrotto a metà di quello che sta facendo.

## Cosa resta valido offline

Dopo la prima apertura tutto viene servito dalla cache, senza mai interrogare
la rete per il contenuto. In aereo o senza campo funziona identico.

L'unica differenza rispetto al file su disco è la **prima** apertura, che
richiede connessione. Chi vuole zero dipendenze dalla rete anche al primo
avvio usa `dist/prospettiva.html` scaricato, o l'APK.

## Durata dei dati

L'applicazione chiede `navigator.storage.persist()` all'avvio: su un'origine
ospitata il `localStorage` è memoria sacrificabile finché non si chiede il
contrario, e qui dentro c'è un archivio di famiglia. Il permesso non è
garantito — Chrome lo concede più volentieri alle applicazioni installate.

Su iOS i dati di una web app aggiunta alla schermata Home sono più protetti di
quelli di una semplice scheda del browser, ma restano meno solidi di quelli di
un'applicazione nativa.

**In tutti i casi, il file esportato resta l'archivio vero.** Il salvataggio
nel dispositivo è comodità.
