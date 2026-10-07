# Vertriebbs

Schnelle App für den Door-to-Door-Vertrieb von Glasfaser. Es gibt sie als Android-App zum Installieren und als Web-App im Browser. Sie startet sofort, braucht keine Anmeldung und funktioniert offline.

## Ablauf an der Tür

1. Unter **Mein Gebiet** die Straßen eintragen oder mit **Adressliste einlesen** eine Liste laden: die Vermarktungsliste als Excel-Datei (.xlsx) oder CSV, oder Zeilen aus Excel einfügen. Mit Spalten „Strasse“ und „Hausnummer“ werden alle Häuser samt PLZ, Ort, EFH/MFH, Wohneinheiten und Anzahl SV übernommen. Die Liste bleibt nur auf dem Handy. Ein Tap auf eine Straße zeigt alle Häuser mit farbigem Status (wahlweise nur die offenen).
2. Oder **Nächste Tür** tippen. Straße, PLZ und Ort bleiben vom letzten Besuch stehen, nur die Hausnummer wird eingetippt (oder mit **+2** zur nächsten Nummer auf derselben Straßenseite gesprungen).
3. Haus antippen, Ergebnis mit einem Tap: **Nicht angetroffen**, **Interessiert**, **Kein Interesse** oder **Vertrag**; unter „Weitere Status“ WE unstimmig, Unbewohnt, Gewerbe, Unbemerkbar, Blacklist (die Status der Vertriebsrunde-App). Danach geht es zurück zur Straße.
4. Bei **Vertrag**: Glasfaser verfügbar, Tarif, Name, Telefon oder E-Mail, Unterschrift auf dem Bildschirm.
5. Die Startseite zeigt die Zahlen des Tages. **Als CSV exportieren** lädt alle Besuche als Tabelle für Excel herunter.

## Android-App

Bei jedem Pull Request und jedem Stand auf `main` baut GitHub Actions die Android-App (`.apk`). Die Version von `main` liegt unter **Releases → Neueste Version** und lässt sich direkt auf dem Handy herunterladen und installieren (Installation aus unbekannten Quellen erlauben).

Die App ist mit [Capacitor](https://capacitorjs.com) aus dem Ordner `app/` gebaut. Lokal: `npm run android` öffnet das Projekt in Android Studio.

## iPhone

Auf dem iPhone läuft die Web-App: Nach dem Übernehmen in `main` wird sie auf GitHub Pages veröffentlicht (Adresse steht in den Repository-Einstellungen unter „Pages“). In Safari öffnen, auf „Teilen“ und „Zum Home-Bildschirm“ tippen. Danach startet sie wie eine App und funktioniert offline. Eine echte iPhone-App aus dem App Store braucht ein Apple-Entwicklerkonto.

## Starten im Browser

```
npm start      # startet einen lokalen Server für den Ordner app/
npm test       # prüft die Logik in app/lib.js
```

## Noch offen

- Die Daten liegen nur im Browser des Geräts (localStorage). Es gibt noch keinen Server, keine Anmeldung und keine Übertragung an den Auftraggeber.
- Die Glasfaser-Verfügbarkeit wird von Hand eingetragen, es gibt noch keine Abfrage beim Netzbetreiber.
