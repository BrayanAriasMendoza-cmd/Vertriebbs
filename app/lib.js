// Reine Logik ohne DOM, damit sie mit `node --test` geprüft werden kann.

export const OUTCOMES = {
  nicht_da: 'Nicht da',
  kein_interesse: 'Kein Interesse',
  spaeter: 'Später wiederkommen',
  abschluss: 'Abschluss',
};

export const TARIFFS = ['Highspeed 150', 'Highspeed 300', 'Highspeed 600', 'Highspeed 1000'];

export function dayKey(iso) {
  return iso.slice(0, 10);
}

export function statsForDay(visits, day) {
  const counts = { total: 0 };
  for (const key of Object.keys(OUTCOMES)) counts[key] = 0;
  for (const v of visits) {
    if (dayKey(v.time) !== day) continue;
    counts.total++;
    counts[v.outcome]++;
  }
  return counts;
}

// Liefert eine Liste fehlender Pflichtfelder für einen Abschluss.
export function missingOrderFields(order) {
  const missing = [];
  if (!order.tariff) missing.push('Tarif');
  if (!order.name?.trim()) missing.push('Name');
  if (!order.phone?.trim() && !order.email?.trim()) missing.push('Telefon oder E-Mail');
  if (!order.signature) missing.push('Unterschrift');
  return missing;
}

const CSV_COLUMNS = [
  ['Zeit', (v) => v.time],
  ['Straße', (v) => v.street],
  ['Hausnr.', (v) => v.number],
  ['PLZ', (v) => v.zip],
  ['Ort', (v) => v.city],
  ['Ergebnis', (v) => OUTCOMES[v.outcome]],
  ['Notiz', (v) => v.note],
  ['Glasfaser verfügbar', (v) => v.order?.available],
  ['Tarif', (v) => v.order?.tariff],
  ['Name', (v) => v.order?.name],
  ['Telefon', (v) => v.order?.phone],
  ['E-Mail', (v) => v.order?.email],
  ['Unterschrift', (v) => (v.order?.signature ? 'ja' : '')],
];

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Semikolon als Trenner, damit Excel mit deutscher Einstellung die Datei direkt öffnet.
export function toCSV(visits) {
  const lines = [CSV_COLUMNS.map(([h]) => h).join(';')];
  for (const v of visits) lines.push(CSV_COLUMNS.map(([, get]) => csvCell(get(v))).join(';'));
  return lines.join('\n');
}

// Letztes Ergebnis je Hausnummer einer Straße, nach Hausnummer sortiert.
export function doorsOnStreet(visits, street) {
  const latest = new Map();
  for (const v of visits) if (v.street === street) latest.set(v.number, v.outcome);
  return [...latest]
    .map(([number, outcome]) => ({ number, outcome }))
    .sort((a, b) => a.number.localeCompare(b.number, 'de', { numeric: true }));
}

// Liest Straßennamen aus eingefügtem Text oder einer CSV-Datei: erste Spalte je Zeile,
// eine Hausnummer am Ende wird abgeschnitten, Kopfzeile und Doppelte fallen weg.
export function parseStreetList(text) {
  const streets = [];
  for (const line of text.split(/\r?\n/)) {
    const cell = line.split(/[;\t,]/)[0].replace(/"/g, '').trim();
    const street = cell.replace(/\s+\d+\s*[a-zA-Z]?$/, '').trim();
    if (!street || /^stra(ß|ss)e$/i.test(street) || streets.includes(street)) continue;
    streets.push(street);
  }
  return streets;
}
