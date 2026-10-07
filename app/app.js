import { OUTCOMES, TARIFFS, statsForDay, missingOrderFields, toCSV, dayKey, doorsOnStreet, migrateVisits, parseCSV, parseAddressList, mapsUrl, pointsForDay, mapPoints } from './lib.js';
import { xlsxRows } from './xlsx.js';

const $ = (sel) => document.querySelector(sel);
const STORE = 'visits';

function loadVisits() {
  return migrateVisits(JSON.parse(localStorage.getItem(STORE) || '[]'));
}

function saveVisit(visit) {
  const visits = loadVisits();
  visits.push(visit);
  localStorage.setItem(STORE, JSON.stringify(visits));
}

function loadStreets() {
  return JSON.parse(localStorage.getItem('streets') || '[]');
}

function saveStreets(streets) {
  localStorage.setItem('streets', JSON.stringify(streets));
}

// Adressen aus der eingelesenen Liste: { street, number, zip, city, info }
function loadAddresses() {
  return JSON.parse(localStorage.getItem('addresses') || '[]');
}

function saveAddresses(addresses) {
  localStorage.setItem('addresses', JSON.stringify(addresses));
}

function show(name) {
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== `view-${name}`;
  if (name === 'home') renderHome();
  if (name === 'street') renderStreet();
  if (name === 'map') renderMap();
  window.scrollTo(0, 0);
}

// ---------- Startseite ----------

function renderHome() {
  const visits = loadVisits();
  const today = dayKey(new Date().toISOString());
  const s = statsForDay(visits, today);
  $('#stats').innerHTML = [
    [s.total, 'Türen'],
    [s.vertrag, 'Verträge'],
    [s.interesse, 'Interessiert'],
    [pointsForDay(visits, today), 'Punkte'],
  ].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');

  const addresses = loadAddresses();
  const streets = $('#streets');
  streets.replaceChildren();
  for (const name of loadStreets()) {
    const doors = doorsOnStreet(visits, name, addresses);
    const li = document.createElement('li');
    li.className = 'street';
    li.innerHTML = '<span></span><span><small></small><button title="Entfernen">✕</button></span>';
    li.querySelector('span').textContent = name;
    const visited = doors.filter((d) => d.outcome).length;
    li.querySelector('small').textContent = addresses.some((a) => a.street === name) ? `${visited}/${doors.length}` : `${visited} Türen`;
    li.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        if (confirm(`${name} aus dem Gebiet entfernen?`)) {
          saveStreets(loadStreets().filter((s) => s !== name));
          saveAddresses(loadAddresses().filter((a) => a.street !== name));
        }
        return renderHome();
      }
      openStreet(name);
    });
    streets.append(li);
  }

  const list = $('#list');
  list.replaceChildren();
  for (const v of visits.filter((v) => dayKey(v.time) === today).reverse()) {
    const li = document.createElement('li');
    const time = new Date(v.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    li.innerHTML = `<span></span><small></small>`;
    li.children[0].textContent = `${v.street} ${v.number}`;
    li.children[1].textContent = `${OUTCOMES[v.outcome]} · ${time}`;
    list.append(li);
  }
}

// Übernimmt Straßen und Adressen aus einer Liste; schon vorhandene bleiben unverändert.
function importList(rows) {
  const list = parseAddressList(rows);
  const streets = loadStreets();
  const addresses = loadAddresses();
  const newStreets = list.streets.filter((s) => !streets.includes(s));
  const newAddresses = list.addresses.filter((a) => !addresses.some((b) => b.street === a.street && b.number === a.number));
  saveStreets([...streets, ...newStreets]);
  saveAddresses([...addresses, ...newAddresses]);
  $('#import-text').value = '';
  $('#import').open = false;
  alert(`${newStreets.length} Straßen und ${newAddresses.length} Adressen übernommen.`);
  renderHome();
}

$('#btn-import').addEventListener('click', () => importList(parseCSV($('#import-text').value)));
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    importList(/\.xlsx$/i.test(file.name) ? await xlsxRows(await file.arrayBuffer()) : parseCSV(await file.text()));
  } catch (err) {
    alert(err.message || 'Die Liste konnte nicht gelesen werden.');
  }
});

// ---------- Straße ----------

let currentStreet = '';
let returnTo = 'home';

function openStreet(name) {
  currentStreet = name;
  show('street');
}

function renderStreet() {
  $('#street-name').textContent = currentStreet;
  const list = $('#doors');
  list.replaceChildren();
  const onlyOpen = $('#only-open').checked;
  for (const door of doorsOnStreet(loadVisits(), currentStreet, loadAddresses())) {
    if (onlyOpen && door.outcome) continue;
    const li = document.createElement('li');
    li.className = 'door';
    li.innerHTML = '<span><i class="dot"></i><b></b> <small></small></span><small></small>';
    li.querySelector('.dot').classList.add(`s-${door.outcome || 'offen'}`);
    li.querySelector('b').textContent = door.unit ? `${door.number} · ${door.unit}` : door.number;
    li.querySelector('span small').textContent = door.info;
    li.lastChild.textContent = door.outcome ? OUTCOMES[door.outcome] : 'offen';
    li.addEventListener('click', () => openDoor(currentStreet, door.number, door.unit));
    list.append(li);
  }
}

$('#only-open').addEventListener('change', renderStreet);
$('#btn-other').addEventListener('click', () => openDoor(currentStreet, ''));

// Straße, PLZ und Ort bleiben vom letzten Besuch stehen, nur die Hausnummer wird neu eingegeben.
// Aus der Straßenansicht kommen Straße und Hausnummer mit, PLZ und Ort aus der Adressliste.
function openDoor(street, number, unit) {
  const f = $('#form-address');
  returnTo = street ? 'street' : 'home';
  $('#view-door .back').dataset.go = returnTo;
  if (street) f.street.value = street;
  f.number.value = number || '';
  f.unit.value = unit || '';
  f.note.value = '';
  for (const b of $('#extras').querySelectorAll('button')) b.classList.remove('on');
  const known = loadAddresses().find((a) => a.street === street && a.number === number);
  if (known?.zip) f.zip.value = known.zip;
  if (known?.city) f.city.value = known.city;
  $('#info').textContent = known?.info || '';
  renderDone();
  show('door');
  if (!f.number.value) (f.street.value ? f.number : f.street).focus();
}

$('#btn-new').addEventListener('click', () => openDoor());

$('#form-street').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = e.target.street.value.trim();
  const streets = loadStreets();
  if (!streets.includes(name)) saveStreets([...streets, name]);
  e.target.reset();
  renderHome();
});

$('#btn-export').addEventListener('click', () => {
  const blob = new Blob(['﻿' + toCSV(loadVisits())], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `besuche-${dayKey(new Date().toISOString())}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

for (const b of document.querySelectorAll('[data-go]')) b.addEventListener('click', () => show(b.dataset.go));

// ---------- Tür ----------

$('#btn-plus').addEventListener('click', () => {
  const input = $('#form-address').number;
  const n = parseInt(input.value, 10);
  input.value = Number.isNaN(n) ? '' : String(n + 2);
  renderDone();
});

// Zeigt, welche Hausnummern der Straße schon besucht wurden, und aktualisiert den Kartenlink.
function renderDone() {
  const f = $('#form-address');
  const doors = doorsOnStreet(loadVisits(), f.street.value.trim());
  $('#done').textContent = doors.length
    ? `Schon besucht: ${doors.filter((d) => d.outcome).map((d) => `${d.number}${d.unit ? ` ${d.unit}` : ''} (${OUTCOMES[d.outcome]})`).join(', ')}`
    : '';
  const address = `${f.street.value} ${f.number.value}, ${f.zip.value} ${f.city.value}`.replace(/[\s,]+$/, '').trim();
  $('#maps').href = mapsUrl(address, /iPhone|iPad|Macintosh/.test(navigator.userAgent));
}

$('#form-address').addEventListener('input', renderDone);

function currentAddress() {
  const f = $('#form-address');
  if (!f.reportValidity()) return null;
  return {
    street: f.street.value.trim(),
    number: f.number.value.trim(),
    zip: f.zip.value.trim(),
    city: f.city.value.trim(),
    unit: f.unit.value.trim(),
    note: f.note.value.trim(),
    extras: [...$('#extras').querySelectorAll('button.on')].map((b) => b.dataset.value),
  };
}

$('#extras').addEventListener('click', (e) => e.target.closest('button')?.classList.toggle('on'));

for (const b of document.querySelectorAll('[data-outcome]')) {
  b.addEventListener('click', () => {
    const address = currentAddress();
    if (!address) return;
    if (b.dataset.outcome === 'vertrag') return openOrder(address);
    saveVisit({ time: new Date().toISOString(), outcome: b.dataset.outcome, ...address });
    b.closest('details')?.removeAttribute('open');
    show(returnTo);
  });
}

// ---------- Karte ----------

let myPosition = null;
let mapAroundMe = false;

$('#btn-map').addEventListener('click', () => show('map'));
$('#btn-all').addEventListener('click', () => { mapAroundMe = false; renderMap(); });
$('#btn-locate').addEventListener('click', () => {
  if (!navigator.geolocation) return ($('#map-msg').textContent = 'Dieses Handy kann den Standort nicht bestimmen.');
  $('#map-msg').textContent = 'Standort wird gesucht …';
  navigator.geolocation.getCurrentPosition(
    (p) => { myPosition = { lat: p.coords.latitude, lon: p.coords.longitude }; mapAroundMe = true; renderMap(); },
    () => { $('#map-msg').textContent = 'Standort nicht verfügbar. Bitte Ortung für die App erlauben.'; },
    { enableHighAccuracy: true, timeout: 15000 },
  );
});

// Zeichnet die Häuser als farbige Punkte (Meter-Raster um die Mitte). Tippen öffnet die Tür.
function renderMap() {
  const svg = $('#map');
  svg.replaceChildren();
  const points = mapPoints(loadVisits(), loadAddresses());
  $('#map-msg').textContent = points.length ? '' : 'Keine Häuser mit Koordinaten. Die Vermarktungsliste mit Koordinaten-Spalten einlesen.';
  if (!points.length && !myPosition) return;
  const center = mapAroundMe && myPosition ? myPosition : points.reduce((c, p) => ({ lat: c.lat + p.lat / points.length, lon: c.lon + p.lon / points.length }), { lat: 0, lon: 0 });
  const k = Math.cos(center.lat * Math.PI / 180);
  const xy = (p) => [(p.lon - center.lon) * 111320 * k, (center.lat - p.lat) * 111320];
  let half = 150;
  if (!mapAroundMe) for (const p of points) half = Math.max(half, ...xy(p).map(Math.abs));
  half *= 1.05;
  svg.setAttribute('viewBox', `${-half} ${-half} ${2 * half} ${2 * half}`);
  const r = half / 22;
  const ns = 'http://www.w3.org/2000/svg';
  for (const p of points) {
    const [x, y] = xy(p);
    if (Math.abs(x) > half || Math.abs(y) > half) continue;
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', r);
    c.setAttribute('class', `s-${p.outcome || 'offen'}`);
    c.addEventListener('click', () => { currentStreet = p.street; openDoor(p.street, p.number); });
    svg.append(c);
    if (mapAroundMe) {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', x + r * 1.3); t.setAttribute('y', y + r / 2);
      t.style.fontSize = `${r * 1.6}px`;
      t.textContent = p.number;
      svg.append(t);
    }
  }
  if (myPosition) {
    const [x, y] = xy(myPosition);
    const me = document.createElementNS(ns, 'circle');
    me.setAttribute('cx', x); me.setAttribute('cy', y); me.setAttribute('r', r * 1.3);
    me.setAttribute('class', 'me');
    me.style.strokeWidth = r / 3;
    svg.append(me);
  }
}

// ---------- Auftrag ----------

let pendingAddress = null;
const order = {};

$('#tariffs').innerHTML = TARIFFS.map((t) => `<button type="button" data-value="${t}">${t}</button>`).join('');

for (const group of document.querySelectorAll('.choice')) {
  group.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const other of group.children) other.classList.toggle('on', other === b);
    order[group.dataset.field] = b.dataset.value;
  });
}

function openOrder(address) {
  pendingAddress = address;
  for (const key of Object.keys(order)) delete order[key];
  for (const b of document.querySelectorAll('.choice button')) b.classList.remove('on');
  $('#form-order').reset();
  $('#order-error').textContent = '';
  const place = `${address.zip} ${address.city}`.trim();
  $('#order-addr').textContent = `${address.street} ${address.number}${place ? `, ${place}` : ''}`;
  show('order');
  sizeCanvas();
  clearSignature();
}

$('#form-order').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const data = {
    ...order,
    name: f.name.value.trim(),
    phone: f.phone.value.trim(),
    email: f.email.value.trim(),
    signature: hasSignature ? canvas.toDataURL('image/png') : '',
  };
  const missing = missingOrderFields(data);
  if (missing.length) {
    $('#order-error').textContent = `Fehlt noch: ${missing.join(', ')}`;
    return;
  }
  saveVisit({ time: new Date().toISOString(), outcome: 'vertrag', ...pendingAddress, order: data });
  show(returnTo);
});

// ---------- Unterschrift ----------

const canvas = $('#signature');
const ctx = canvas.getContext('2d');
let hasSignature = false;
let drawing = false;

function sizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = 160 * ratio;
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1a1f29';
}

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
}

function point(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

canvas.addEventListener('pointerdown', (e) => {
  drawing = true;
  canvas.setPointerCapture(e.pointerId);
  ctx.beginPath();
  ctx.moveTo(...point(e));
});
canvas.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  ctx.lineTo(...point(e));
  ctx.stroke();
  hasSignature = true;
});
canvas.addEventListener('pointerup', () => { drawing = false; });

$('#btn-clear-sig').addEventListener('click', clearSignature);

// ---------- Start ----------

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
show('home');
