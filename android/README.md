# Confezionamento Android

L'APK non è un secondo progetto: incapsula lo **stesso** `dist/prospettiva.html`
che si apre sul PC. Capacitor copia gli asset dentro il pacchetto, quindi
l'applicazione resta interamente offline — nessun server, nessuna prima
apertura online.

```
make android        # APK di debug in dist/prospettiva.apk
make android-shell  # shell nel contenitore, per indagare i problemi di Gradle
```

## Perché una fase Docker a parte

La toolchain Android è pesante — JDK 21, SDK, Gradle — e non serve a chi lavora
solo sul file HTML. Vive in una fase separata del Dockerfile, così `make build`
e `make test` restano leggeri e nessuno deve installare Android Studio.

## Firma

`make android` produce un APK firmato con la chiave di debug: si installa su un
telefono con `adb install` o copiandolo, dopo aver consentito le origini
sconosciute. Va bene per uso personale e non è pubblicabile sul Play Store.
Per quello servono una chiave di rilascio, un `keystore` fuori dal repository e
un target `android-release` che qui non c'è di proposito: mettere una chiave di
firma in un repository è un errore difficile da rimediare.

## Il perimetro noto

- **Scarica JSON** non scrive su disco in una WebView: `createObjectURL` più
  `a.download` non bastano. Serve il plugin di filesystem o di condivisione.
  Finché non c'è, sul telefono si usa **Salva nel browser** e si esporta dal PC.
- «Cancella dati app» azzera lo storage, esattamente come farebbe la pulizia
  dei dati del browser. Il file scaricato resta l'archivio vero.
