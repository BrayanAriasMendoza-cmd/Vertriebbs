import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statsForDay, missingOrderFields, toCSV, doorsOnStreet, migrateVisits, parseCSV, parseAddressList } from '../app/lib.js';

const visits = [
  { time: '2026-10-06T09:00:00.000Z', street: 'Hauptstr.', number: '1', outcome: 'nicht_angetroffen' },
  { time: '2026-10-06T09:05:00.000Z', street: 'Hauptstr.', number: '3', outcome: 'vertrag',
    order: { available: 'ja', tariff: 'Highspeed 600', name: 'Müller; Anna', phone: '0170', signature: 'data:x' } },
  { time: '2026-10-05T17:00:00.000Z', street: 'Hauptstr.', number: '5', outcome: 'abgelehnt' },
];

test('statsForDay zählt nur Besuche des Tages', () => {
  const s = statsForDay(visits, '2026-10-06');
  assert.equal(s.total, 2);
  assert.equal(s.nicht_angetroffen, 1);
  assert.equal(s.vertrag, 1);
  assert.equal(s.abgelehnt, 0);
});

test('missingOrderFields meldet fehlende Pflichtfelder', () => {
  assert.deepEqual(missingOrderFields({}), ['Tarif', 'Name', 'Telefon oder E-Mail', 'Unterschrift']);
  assert.deepEqual(missingOrderFields({ tariff: 'x', name: 'A', email: 'a@b.de', signature: 'data:x' }), []);
});

test('toCSV setzt Felder mit Semikolon in Anführungszeichen', () => {
  const lines = toCSV(visits).split('\n');
  assert.equal(lines.length, 4);
  assert.ok(lines[0].startsWith('Zeit;Straße;Hausnr.'));
  assert.ok(lines[2].includes('"Müller; Anna"'));
  assert.ok(lines[2].endsWith(';ja'));
});

test('migrateVisits übersetzt Ergebnisse der ersten App-Version', () => {
  const v = migrateVisits([{ outcome: 'nicht_da' }, { outcome: 'spaeter' }, { outcome: 'abschluss' }, { outcome: 'gewerbe' }]);
  assert.deepEqual(v.map((x) => x.outcome), ['nicht_angetroffen', 'interesse', 'vertrag', 'gewerbe']);
});

test('doorsOnStreet verbindet Adressliste und Besuche, numerisch sortiert', () => {
  const v = [
    { street: 'A-Weg', number: '10', outcome: 'nicht_angetroffen' },
    { street: 'A-Weg', number: '2', outcome: 'interesse' },
    { street: 'B-Weg', number: '1', outcome: 'vertrag' },
    { street: 'A-Weg', number: '10', outcome: 'vertrag' },
  ];
  const list = [{ street: 'A-Weg', number: '4', info: 'MFH' }, { street: 'A-Weg', number: '2', info: 'EFH' }];
  assert.deepEqual(doorsOnStreet(v, 'A-Weg', list), [
    { number: '2', outcome: 'interesse', info: 'EFH' },
    { number: '4', outcome: null, info: 'MFH' },
    { number: '10', outcome: 'vertrag', info: '' },
  ]);
});

test('parseCSV erkennt Trenner und Anführungszeichen', () => {
  assert.deepEqual(parseCSV('﻿a;b\r\n"x;y";"sagt ""hi"""\n\n'), [['a', 'b'], ['x;y', 'sagt "hi"']]);
  assert.deepEqual(parseCSV('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('parseAddressList liest eine Vermarktungsliste mit Spalten', () => {
  const rows = [
    ['HA-ID', 'Strasse', 'Hausnummer', 'Zusatz', 'PLZ', 'Ort', 'EFH/MFH', 'Anzahl NE', 'Anzahl SV', 'MFH Eigentümer Name'],
    ['1', 'Lindenweg', '3', 'A', '12345', 'Musterstadt', 'mfh', '6', '2', 'Hausverwaltung X'],
    ['2', 'Lindenweg', '5', '', '12345', 'Musterstadt', 'EFH', '1', '0', ''],
    ['3', '', '', '', '', '', '', '', '', ''],
  ];
  assert.deepEqual(parseAddressList(rows), {
    streets: ['Lindenweg'],
    addresses: [
      { street: 'Lindenweg', number: '3a', zip: '12345', city: 'Musterstadt', info: 'MFH, 6 Wohneinheiten, 2 schon Vertrag, Eigentümer: Hausverwaltung X' },
      { street: 'Lindenweg', number: '5', zip: '12345', city: 'Musterstadt', info: 'EFH' },
    ],
  });
});

test('parseAddressList liest einfache Straßen- und Adresszeilen', () => {
  const rows = parseCSV('Hauptstraße;12\n"Lindenweg"\nAm Markt 7a\nHauptstraße 14\nStraße\n  Bahnhofstr.  ');
  const r = parseAddressList(rows);
  assert.deepEqual(r.streets, ['Hauptstraße', 'Lindenweg', 'Am Markt', 'Bahnhofstr.']);
  assert.deepEqual(r.addresses.map((a) => `${a.street} ${a.number}`), ['Hauptstraße 12', 'Am Markt 7a', 'Hauptstraße 14']);
});
