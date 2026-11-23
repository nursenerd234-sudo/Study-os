/* Study OS — storage (IndexedDB) + shared helpers */
const DAY = 86400000;
const TRACKS = { oph: 'Ophthalmology', nclex: 'NCLEX', eng: 'English', hi: 'Health Informatics & AI' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const dkey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => dkey(new Date());
const tag = t => TRACKS[t] ? `<span class="tag t-${t}">${TRACKS[t]}</span>` : `<span class="tag t-all">All tracks</span>`;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let S = null;              // app state (cards, pages, logs, settings…)
let STORE = 'idb';         // 'idb' | 'memory'
const MEM = { kv: new Map(), files: new Map() };
let DBH = null;

function idbOpen() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open('studyos', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('kv'); d.createObjectStore('files'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
function idb(store, mode, fn) {
  return new Promise((res, rej) => {
    const tx = DBH.transaction(store, mode), st = tx.objectStore(store), q = fn(st);
    tx.oncomplete = () => res(q ? q.result : undefined);
    tx.onerror = () => rej(tx.error);
  });
}
async function kvGet(k) { if (STORE === 'memory') return MEM.kv.get(k); return idb('kv', 'readonly', s => s.get(k)); }
async function kvSet(k, v) { if (STORE === 'memory') { MEM.kv.set(k, v); return; } return idb('kv', 'readwrite', s => s.put(v, k)); }
async function fileGet(id) { if (STORE === 'memory') return MEM.files.get(id); return idb('files', 'readonly', s => s.get(id)); }
async function filePut(id, blob) { if (STORE === 'memory') { MEM.files.set(id, blob); return; } return idb('files', 'readwrite', s => s.put(blob, id)); }
async function fileDel(id) { if (!id) return; if (STORE === 'memory') { MEM.files.delete(id); return; } return idb('files', 'readwrite', s => s.delete(id)); }
async function fileAll() {
  if (STORE === 'memory') return [...MEM.files.entries()];
  const keys = await idb('files', 'readonly', s => s.getAllKeys());
  const vals = await idb('files', 'readonly', s => s.getAll());
  return keys.map((k, i) => [k, vals[i]]);
}

/* object URLs for stored blobs */
const URLS = {};
async function fileURL(id) {
  if (!id) return '';
  if (URLS[id]) return URLS[id];
  const b = await fileGet(id);
  if (!b) return '';
  return (URLS[id] = URL.createObjectURL(b));
}
function dropURL(id) { if (URLS[id]) { URL.revokeObjectURL(URLS[id]); delete URLS[id]; } }

let saveT = null;
function save(now) {
  clearTimeout(saveT);
  const run = () => kvSet('state', JSON.parse(JSON.stringify(S))).catch(() => { STORE = 'memory'; toast('Storage blocked — export a backup!'); });
  if (now) return run();
  saveT = setTimeout(run, 350);
}
document.addEventListener('visibilitychange', () => { if (document.hidden && S) save(true); });

function log() { const k = today(); S.logs[k] = S.logs[k] || { reviews: 0, news: 0, min: {}, tasks: {} }; return S.logs[k]; }

let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2300); }

/* bottom sheet */
function sheet(title, html, onMount) {
  closeSheet();
  const sc = document.createElement('div');
  sc.className = 'scrim'; sc.id = 'scrim';
  sc.innerHTML = `<div class="sheet" role="dialog" aria-label="${esc(title)}"><div class="grabber"></div><div class="sheet-head"><b>${esc(title)}</b><button id="shClose">Close</button></div>${html}</div>`;
  sc.addEventListener('click', e => { if (e.target === sc) closeSheet(); });
  document.body.appendChild(sc);
  $('#shClose').onclick = closeSheet;
  onMount && onMount(sc);
  return sc;
}
function closeSheet() { const s = $('#scrim'); if (s) s.remove(); }

/* floating menu */
function menu(x, y, items, opts = {}) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu'; m.id = 'menu';
  m.innerHTML = items.map((it, i) => it === '-' ? '<div class="sep"></div>' : it.label ? `<div class="lbl">${esc(it.label)}</div>` :
    `<button data-i="${i}" class="${i === opts.sel ? 'sel' : ''} ${it.danger ? 'danger' : ''}"><span class="mi">${it.icon || ''}</span>${esc(it.text)}</button>`).join('');
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  m.style.top = (y + r.height > innerHeight - 70 ? Math.max(8, y - r.height - 8) : y) + 'px';
  m.addEventListener('mousedown', e => e.preventDefault());
  m.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const it = items[+b.dataset.i]; closeMenu(); it.fn && it.fn(); });
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  function outside(e) { if (!m.contains(e.target)) { closeMenu(); } }
  m._outside = outside;
  return m;
}
function closeMenu() { const m = $('#menu'); if (m) { document.removeEventListener('pointerdown', m._outside, true); m.remove(); } }

/* image downscale → Blob (jpeg/png) */
function downscale(file, max = 1800) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
      const png = /png|gif|svg/.test(file.type);
      c.toBlob(b => { URL.revokeObjectURL(img.src); b ? res({ blob: b, w: c.width, h: c.height }) : rej('encode'); }, png ? 'image/png' : 'image/jpeg', .85);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
function blobToDataURL(b) { return new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); }
async function dataURLToBlob(u) { const r = await fetch(u); return r.blob(); }

/* sanitize editor HTML to a small whitelist */
const OK_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'CODE', 'MARK', 'A', 'SPAN', 'DIV', 'P']);
function clean(html) {
  const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
  const walk = n => {
    [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) return;
      if (c.nodeType !== 1 || !OK_TAGS.has(c.tagName)) {
        if (c.nodeType === 1 && !['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(c.tagName)) { walk(c); c.replaceWith(...c.childNodes); } else c.remove();
        return;
      }
      const href = c.tagName === 'A' ? c.getAttribute('href') : null;
      [...c.attributes].forEach(a => c.removeAttribute(a.name));
      if (href && /^https?:\/\//i.test(href)) { c.setAttribute('href', href); c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener'); }
      if (c.tagName === 'DIV' || c.tagName === 'P') { walk(c); c.before(document.createElement('br')); c.replaceWith(...c.childNodes); return; }
      if (c.tagName === 'SPAN') { walk(c); c.replaceWith(...c.childNodes); return; }
      walk(c);
    });
  };
  const root = doc.body.firstChild; walk(root);
  return root.innerHTML.replace(/^(<br>)+/, '');
}
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent || ''; };

/* shared view registry */
const V = {};
let view = 'today';
const app = document.getElementById('app');
