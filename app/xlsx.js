// Liest die erste Tabelle einer Excel-Datei (.xlsx) ohne Zusatzbibliothek, übernommen aus der Vertriebsrunde-App.

function unzipEntry(buf, want) {
  const u = new Uint8Array(buf), dv = new DataView(buf);
  let end = -1;
  for (let i = u.length - 22; i >= Math.max(0, u.length - 70000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error('Keine Excel-Datei.');
  const count = dv.getUint16(end + 10, true), dec = new TextDecoder();
  let p = dv.getUint32(end + 16, true);
  for (let k = 0; k < count && dv.getUint32(p, true) === 0x02014b50; k++) {
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    if (dec.decode(u.subarray(p + 46, p + 46 + nameLen)) === want) {
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      const data = u.subarray(start, start + size);
      if (method === 0) return Promise.resolve(dec.decode(data));
      if (method !== 8 || typeof DecompressionStream !== 'function') {
        throw new Error('Dieses Handy kann Excel nicht entpacken. Bitte die Liste als CSV speichern.');
      }
      return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return Promise.resolve(null);
}

export async function xlsxRows(buf) {
  const [shared, sheet] = await Promise.all([unzipEntry(buf, 'xl/sharedStrings.xml'), unzipEntry(buf, 'xl/worksheets/sheet1.xml')]);
  if (!sheet) throw new Error('Keine Tabelle in der Datei gefunden.');
  const parser = new DOMParser();
  const strings = shared
    ? [...parser.parseFromString(shared, 'application/xml').getElementsByTagName('si')]
        .map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join(''))
    : [];
  const rows = [];
  for (const row of parser.parseFromString(sheet, 'application/xml').getElementsByTagName('row')) {
    const out = [];
    for (const c of row.getElementsByTagName('c')) {
      const letters = /^([A-Z]+)/.exec(c.getAttribute('r') || '');
      let col = out.length;
      if (letters) col = [...letters[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const type = c.getAttribute('t'), v = c.getElementsByTagName('v')[0];
      let val = '';
      if (type === 's' && v) val = strings[+v.textContent] || '';
      else if (type === 'inlineStr') val = [...c.getElementsByTagName('t')].map((t) => t.textContent).join('');
      else if (v) val = v.textContent;
      out[col] = val;
    }
    rows.push(Array.from(out, (x) => x ?? ''));
  }
  return rows;
}
