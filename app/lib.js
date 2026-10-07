// Reine Logik ohne DOM, damit sie mit `node --test` geprüft werden kann.

// Die Haus-Status der Vertriebsrunde-App, Farben ebenfalls von dort.
export const OUTCOMES = {
  nicht_angetroffen: 'Nicht angetroffen',
  interesse: 'Interessiert',
  abgelehnt: 'Kein Interesse',
  vertrag: 'Vertrag',
  we_unstimmig: 'Wohneinheiten unstimmig',
  unbewohnt: 'Unbewohnt',
  gewerbe: 'Gewerbe',
  unbemerkbar: 'Unbemerkbar',
  blacklist: 'Blacklist',
};

// Ergebnisse, die mit der ersten App-Version gespeichert wurden.
const LEGACY_OUTCOMES = { nicht_da: 'nicht_angetroffen', kein_interesse: 'abgelehnt', spaeter: 'interesse', abschluss: 'vertrag' };

export function migrateVisits(visits) {
  return visits.map((v) => (LEGACY_OUTCOMES[v.outcome] ? { ...v, outcome: LEGACY_OUTCOMES[v.outcome] } : v));
}

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

// Alle Häuser einer Straße: aus der eingelesenen Adressliste (noch offen) und den Besuchen,
// mit dem letzten Ergebnis je Hausnummer, nach Hausnummer sortiert.
export function doorsOnStreet(visits, street, addresses = []) {
  const doors = new Map();
  for (const a of addresses) if (a.street === street) doors.set(a.number, { number: a.number, outcome: null, info: a.info || '' });
  for (const v of visits) {
    if (v.street !== street) continue;
    doors.set(v.number, { info: '', ...doors.get(v.number), number: v.number, outcome: v.outcome });
  }
  return [...doors.values()].sort((a, b) => a.number.localeCompare(b.number, 'de', { numeric: true }));
}

// Zerlegt CSV-Text in Zeilen und Zellen. Trenner (; Tab ,) wird aus der ersten Zeile erkannt.
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/)[0];
  const delim = [';', '\t', ','].find((d) => first.includes(d)) || ';';
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  row.push(cell); rows.push(row);
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some(Boolean));
}

const norm = (h) => String(h).toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9äöü]/g, '');

// Liest eine Adressliste (z. B. die Vermarktungsliste aus Excel). Mit Spalten "Strasse" und
// "Hausnummer" werden Adressen samt Infos übernommen, sonst je Zeile "Straße" oder "Straße Nr".
export function parseAddressList(rows) {
  const head = (rows[0] || []).map(norm);
  const col = (...names) => head.findIndex((h) => names.includes(h));
  const c = {
    street: col('strasse', 'street'), number: col('hausnummer', 'hausnr', 'nr'), extra: col('zusatz', 'hausnummerzusatz'),
    zip: col('plz'), city: col('ort'), type: col('efhmfh', 'gebaeudetyp', 'gebäudetyp'), units: col('anzahlne', 'wohneinheiten'),
    sv: col('anzahlsv'), owner: col('mfheigentuemername', 'eigentuemername', 'eigentuemer', 'mfheigentümername', 'eigentümername', 'eigentümer'),
  };
  const streets = [], addresses = [];
  const addStreet = (s) => { if (!streets.includes(s)) streets.push(s); };
  const addAddress = (a) => { if (!addresses.some((b) => b.street === a.street && b.number === a.number)) addresses.push(a); };

  if (c.street >= 0 && c.number >= 0) {
    const get = (r, i) => (i >= 0 && r[i] != null ? String(r[i]).trim() : '');
    for (const r of rows.slice(1)) {
      const street = get(r, c.street), number = get(r, c.number) + get(r, c.extra).toLowerCase();
      if (!street || !number) continue;
      const units = parseInt(get(r, c.units), 10), sv = parseInt(get(r, c.sv), 10);
      const info = [
        get(r, c.type).toUpperCase(),
        units > 1 ? `${units} Wohneinheiten` : '',
        sv > 0 ? `${sv} schon Vertrag` : '',
        get(r, c.owner) ? `Eigentümer: ${get(r, c.owner)}` : '',
      ].filter(Boolean).join(', ');
      addStreet(street);
      addAddress({ street, number, zip: get(r, c.zip), city: get(r, c.city), info });
    }
    return { streets, addresses };
  }

  for (const r of rows) {
    const cell = String(r[0] || '').trim();
    const m = cell.match(/^(.*\D)\s+(\d+\s*[a-zA-Z]?)$/);
    const street = (m ? m[1] : cell).trim();
    const number = m ? m[2].replace(/\s+/g, '').toLowerCase() : String(r[1] || '').trim();
    if (!street || /^stra(ß|ss)e$/i.test(street)) continue;
    addStreet(street);
    if (/^\d+\s*[a-zA-Z]?$/.test(number)) addAddress({ street, number, zip: '', city: '', info: '' });
  }
  return { streets, addresses };
}

// Link zur Kartenapp: Apple Karten auf dem iPhone, Google Maps sonst.
export function mapsUrl(address, apple) {
  const q = encodeURIComponent(address);
  return apple ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
}
