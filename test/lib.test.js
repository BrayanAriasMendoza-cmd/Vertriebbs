import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statsForDay, missingOrderFields, toCSV } from '../app/lib.js';

const visits = [
  { time: '2026-10-06T09:00:00.000Z', street: 'Hauptstr.', number: '1', outcome: 'nicht_da' },
  { time: '2026-10-06T09:05:00.000Z', street: 'Hauptstr.', number: '3', outcome: 'abschluss',
    order: { available: 'ja', tariff: 'Glasfaser 600', name: 'Müller; Anna', phone: '0170', signature: 'data:x' } },
  { time: '2026-10-05T17:00:00.000Z', street: 'Hauptstr.', number: '5', outcome: 'kein_interesse' },
];

test('statsForDay zählt nur Besuche des Tages', () => {
  const s = statsForDay(visits, '2026-10-06');
  assert.equal(s.total, 2);
  assert.equal(s.nicht_da, 1);
  assert.equal(s.abschluss, 1);
  assert.equal(s.kein_interesse, 0);
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
