# Vertriebbs

Schnelle Web-App für den Door-to-Door-Vertrieb von Glasfaser. Läuft im Browser auf dem Handy, lässt sich zum Startbildschirm hinzufügen und funktioniert offline.

## Ablauf an der Tür

1. **Nächste Tür** tippen. Straße, PLZ und Ort bleiben vom letzten Besuch stehen, nur die Hausnummer wird eingetippt (oder mit **+2** zur nächsten Nummer auf derselben Straßenseite gesprungen).
2. Ergebnis mit einem Tap: **Nicht da**, **Kein Interesse**, **Später** oder **Abschluss**.
3. Bei **Abschluss**: Glasfaser verfügbar, Tarif, Name, Telefon oder E-Mail, Unterschrift auf dem Bildschirm.
4. Die Startseite zeigt die Zahlen des Tages. **Als CSV exportieren** lädt alle Besuche als Tabelle für Excel herunter.

## Starten

```
npm start      # startet einen lokalen Server für den Ordner app/
npm test       # prüft die Logik in app/lib.js
```

## Noch offen

- Die Tarife in `app/lib.js` sind Platzhalter.
- Die Daten liegen nur im Browser des Geräts (localStorage). Es gibt noch keinen Server, keine Anmeldung und keine Übertragung an den Auftraggeber.
- Die Glasfaser-Verfügbarkeit wird von Hand eingetragen, es gibt noch keine Abfrage beim Netzbetreiber.
