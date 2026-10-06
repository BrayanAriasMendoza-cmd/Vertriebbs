# Vertriebbs

Schnelle App für den Door-to-Door-Vertrieb von Glasfaser. Es gibt sie als Android-App zum Installieren und als Web-App im Browser. Sie startet sofort, braucht keine Anmeldung und funktioniert offline.

## Ablauf an der Tür

1. Im Gebiet unter **Mein Gebiet** die Straßen eintragen, in denen gearbeitet wird. Ein Tap auf eine Straße öffnet die nächste Tür dort und zeigt, welche Hausnummern schon besucht wurden.
2. Oder **Nächste Tür** tippen. Straße, PLZ und Ort bleiben vom letzten Besuch stehen, nur die Hausnummer wird eingetippt (oder mit **+2** zur nächsten Nummer auf derselben Straßenseite gesprungen).
3. Ergebnis mit einem Tap: **Nicht da**, **Kein Interesse**, **Später** oder **Abschluss**.
4. Bei **Abschluss**: Glasfaser verfügbar, Tarif, Name, Telefon oder E-Mail, Unterschrift auf dem Bildschirm.
5. Die Startseite zeigt die Zahlen des Tages. **Als CSV exportieren** lädt alle Besuche als Tabelle für Excel herunter.

## Android-App

Bei jedem Pull Request und jedem Stand auf `main` baut GitHub Actions die Android-App (`.apk`). Die Version von `main` liegt unter **Releases → Neueste Version** und lässt sich direkt auf dem Handy herunterladen und installieren (Installation aus unbekannten Quellen erlauben).

Die App ist mit [Capacitor](https://capacitorjs.com) aus dem Ordner `app/` gebaut. Lokal: `npm run android` öffnet das Projekt in Android Studio.

## Starten im Browser

```
npm start      # startet einen lokalen Server für den Ordner app/
npm test       # prüft die Logik in app/lib.js
```

## Noch offen

- Die Tarife in `app/lib.js` sind Platzhalter.
- Die Daten liegen nur im Browser des Geräts (localStorage). Es gibt noch keinen Server, keine Anmeldung und keine Übertragung an den Auftraggeber.
- Die Glasfaser-Verfügbarkeit wird von Hand eingetragen, es gibt noch keine Abfrage beim Netzbetreiber.
