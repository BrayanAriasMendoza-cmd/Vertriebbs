import { OUTCOMES, TARIFFS, statsForDay, missingOrderFields, toCSV, dayKey } from './lib.js';

const $ = (sel) => document.querySelector(sel);
const STORE = 'visits';

function loadVisits() {
  return JSON.parse(localStorage.getItem(STORE) || '[]');
}

function saveVisit(visit) {
  const visits = loadVisits();
  visits.push(visit);
  localStorage.setItem(STORE, JSON.stringify(visits));
}

function show(name) {
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== `view-${name}`;
  if (name === 'home') renderHome();
  window.scrollTo(0, 0);
}

// ---------- Startseite ----------

function renderHome() {
  const visits = loadVisits();
  const today = dayKey(new Date().toISOString());
  const s = statsForDay(visits, today);
  $('#stats').innerHTML = [
    [s.total, 'Türen'],
    [s.abschluss, 'Abschlüsse'],
    [s.spaeter, 'Später'],
    [s.nicht_da, 'Nicht da'],
  ].map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('');

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

$('#btn-new').addEventListener('click', () => {
  // Straße, PLZ und Ort bleiben vom letzten Besuch stehen, nur die Hausnummer wird neu eingegeben.
  const f = $('#form-address');
  f.number.value = '';
  f.note.value = '';
  show('door');
  (f.street.value ? f.number : f.street).focus();
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
});

function currentAddress() {
  const f = $('#form-address');
  if (!f.reportValidity()) return null;
  return {
    street: f.street.value.trim(),
    number: f.number.value.trim(),
    zip: f.zip.value.trim(),
    city: f.city.value.trim(),
    note: f.note.value.trim(),
  };
}

for (const b of document.querySelectorAll('[data-outcome]')) {
  b.addEventListener('click', () => {
    const address = currentAddress();
    if (!address) return;
    if (b.dataset.outcome === 'abschluss') return openOrder(address);
    saveVisit({ time: new Date().toISOString(), outcome: b.dataset.outcome, ...address });
    show('home');
  });
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
  saveVisit({ time: new Date().toISOString(), outcome: 'abschluss', ...pendingAddress, order: data });
  show('home');
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

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
show('home');
