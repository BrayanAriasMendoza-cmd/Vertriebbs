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

// Punkte wie in der Vertriebsrunde: ein Vertrag zählt am meisten, jede Tür zählt.
export const POINTS = { vertrag: 10, interesse: 3 };

export function pointsForDay(visits, day) {
  return visits.filter((v) => dayKey(v.time) === day).reduce((sum, v) => sum + (POINTS[v.outcome] || 1), 0);
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
  ['Wohnung', (v) => v.unit],
  ['Notiz', (v) => v.note],
  ['Auch Interesse an', (v) => (v.extras || []).join(', ')],
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

// Alle Türen einer Straße: aus der eingelesenen Adressliste (noch offen) und den Besuchen,
// mit dem letzten Ergebnis je Hausnummer und Wohnung, nach Hausnummer sortiert.
export function doorsOnStreet(visits, street, addresses = []) {
  const doors = new Map();
  for (const a of addresses) if (a.street === street) doors.set(a.number, { number: a.number, unit: '', outcome: null, info: a.info || '' });
  for (const v of visits) {
    if (v.street !== street) continue;
    const unit = v.unit || '';
    const key = unit ? `${v.number}|${unit}` : v.number;
    const info = doors.get(v.number)?.info || '';
    doors.set(key, { number: v.number, unit, outcome: v.outcome, info });
  }
  return [...doors.values()].sort((a, b) => `${a.number} ${a.unit}`.localeCompare(`${b.number} ${b.unit}`, 'de', { numeric: true }));
}

// Häuser mit Koordinaten für die Karte, mit dem letzten Ergebnis je Adresse (null = offen).
export function mapPoints(visits, addresses) {
  const latest = new Map();
  for (const v of visits) latest.set(`${v.street}|${v.number}`, v.outcome);
  return addresses
    .filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lon))
    .map((a) => ({ street: a.street, number: a.number, lat: a.lat, lon: a.lon, outcome: latest.get(`${a.street}|${a.number}`) || null }));
}

// Gauß-Krüger (DHDN, Bessel) nach WGS84, auf wenige Meter genau; aus der Vertriebsrunde-App.
export function gkToWgs(R, H) {
  const a = 6377397.155, f = 1 / 299.1528128, b = a * (1 - f), e2 = (a * a - b * b) / (a * a), ep2 = e2 / (1 - e2);
  const { sin: S, cos: C, tan: T, pow } = Math;
  const zone = Math.floor(R / 1e6), lon0 = zone * 3 * Math.PI / 180, x = R - zone * 1e6 - 500000;
  const mu = H / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 = mu + (3 * e1 / 2 - 27 * pow(e1, 3) / 32) * S(2 * mu) + (21 * e1 * e1 / 16 - 55 * pow(e1, 4) / 32) * S(4 * mu)
    + (151 * pow(e1, 3) / 96) * S(6 * mu) + (1097 * pow(e1, 4) / 512) * S(8 * mu);
  const C1 = ep2 * C(p1) * C(p1), T1 = T(p1) * T(p1), N1 = a / Math.sqrt(1 - e2 * S(p1) * S(p1));
  const R1 = a * (1 - e2) / pow(1 - e2 * S(p1) * S(p1), 1.5), D = x / N1;
  const lat = p1 - (N1 * T(p1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * pow(D, 4) / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * pow(D, 6) / 720);
  const lon = lon0 + (D - (1 + 2 * T1 + C1) * pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * pow(D, 5) / 120) / C(p1);
  const N = a / Math.sqrt(1 - e2 * S(lat) * S(lat));
  const X = N * C(lat) * C(lon), Y = N * C(lat) * S(lon), Z = N * (1 - e2) * S(lat);
  const s = 6.7e-6, k = Math.PI / 180 / 3600, rx = 0.202 * k, ry = 0.045 * k, rz = -2.455 * k;
  const X2 = 598.1 + (1 + s) * (X - rz * Y + ry * Z), Y2 = 73.7 + (1 + s) * (rz * X + Y - rx * Z), Z2 = 418.2 + (1 + s) * (-ry * X + rx * Y + Z);
  const A = 6378137, F = 1 / 298.257223563, E2 = F * (2 - F), pp = Math.hypot(X2, Y2);
  let la = Math.atan2(Z2, pp * (1 - E2));
  for (let i = 0; i < 8; i++) la = Math.atan2(Z2 + E2 * (A / Math.sqrt(1 - E2 * S(la) * S(la))) * S(la), pp);
  return { lat: la * 180 / Math.PI, lon: Math.atan2(Y2, X2) * 180 / Math.PI };
}

// Koordinaten einer Listenzeile: Gauß-Krüger (Rechts-/Hochwert) oder Längen-/Breitengrad.
function coords(x, y, lat, lon) {
  const num = (v) => parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  const X = num(x), Y = num(y);
  if (X > 1e6 && Y > 1e6) return gkToWgs(X, Y);
  if (Math.abs(Y) <= 90 && Math.abs(X) <= 180) return { lat: Y, lon: X };
  return { lat: num(lat), lon: num(lon) };
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
    sv: col('anzahlsv'), x: col('xkoordinate', 'rechtswert'), y: col('ykoordinate', 'hochwert'),
    lat: col('lat', 'latitude', 'breite'), lon: col('lon', 'lng', 'longitude', 'länge', 'laenge'), owner: col('mfheigentuemername', 'eigentuemername', 'eigentuemer', 'mfheigentümername', 'eigentümername', 'eigentümer'),
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
      const address = { street, number, zip: get(r, c.zip), city: get(r, c.city), info };
      const { lat, lon } = coords(get(r, c.x), get(r, c.y), get(r, c.lat), get(r, c.lon));
      if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) Object.assign(address, { lat: +lat.toFixed(6), lon: +lon.toFixed(6) });
      addAddress(address);
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
