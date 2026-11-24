/* Study OS — storage (IndexedDB) + shared helpers */
const DAY = 86400000;
const TRACKS = { oph: 'Ophthalmology', nclex: 'NCLEX', eng: 'English', hi: 'Health Informatics & AI' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const dkey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => dkey(new Date());
const PALETTE = ['#30a8bf', '#5856d6', '#f08a00', '#af52de', '#ff2d55', '#34c759', '#007aff', '#a2845e', '#5ac8fa', '#ff9500'];
const course = id => (S && S.courses ? S.courses.find(c => c.id === id) : null);
const courseName = id => (course(id) || {}).name || 'General';
const modOf = (cid, mid) => { const c = course(cid); return c ? c.modules.find(m => m.id === mid) : null; };
const modName = (cid, mid) => (modOf(cid, mid) || {}).name || 'General';
const tag = id => { const c = course(id); return c ? `<span class="tag" style="background:${c.color}">${esc(c.name)}</span>` : (id === 'all' ? `<span class="tag t-all">All courses</span>` : `<span class="tag t-all">General</span>`); };
const courseOpts = sel => S.courses.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.icon + ' ' + c.name)}</option>`).join('');
const modOpts = (cid, sel) => `<option value="">General</option>` + ((course(cid) || { modules: [] }).modules.map(m => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.name)}</option>`).join(''));
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

/* sanitize editor HTML to a whitelist (keeps Word-style colours, fonts, sizes) */
const OK_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'BR', 'CODE', 'MARK', 'A', 'SPAN', 'FONT', 'DIV', 'P', 'SUB', 'SUP']);
const OK_STYLE = { 'color': /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i, 'background-color': /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i, 'font-family': /^[\w\s,"'-]+$/, 'font-size': /^(\d{1,2}(\.\d+)?px|x*-?(small|large)|medium)$/, 'font-weight': /^(bold|[4-9]00)$/, 'font-style': /^italic$/, 'text-decoration-line': /^[a-z -]+$/, 'text-decoration': /^[a-z -]+$/ };
function cleanStyle(el) {
  const out = [];
  for (const k in OK_STYLE) { const v = el.style.getPropertyValue(k).trim(); if (v && OK_STYLE[k].test(v)) out.push(k + ':' + v); }
  return out.join(';');
}
function clean(html) {
  const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
  const walk = n => {
    [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) return;
      if (c.nodeType !== 1 || !OK_TAGS.has(c.tagName)) {
        if (c.nodeType === 1 && !['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT'].includes(c.tagName)) { walk(c); c.replaceWith(...c.childNodes); } else c.remove();
        return;
      }
      if (c.tagName === 'FONT') { const sp = doc.createElement('span'); if (c.getAttribute('color')) sp.style.color = c.getAttribute('color'); if (c.getAttribute('face')) sp.style.fontFamily = c.getAttribute('face'); sp.append(...c.childNodes); c.replaceWith(sp); walk(sp); finishSpan(sp); return; }
      const href = c.tagName === 'A' ? c.getAttribute('href') : null;
      const st = c.tagName === 'SPAN' ? cleanStyle(c) : '';
      [...c.attributes].forEach(a => c.removeAttribute(a.name));
      if (href && /^https?:\/\//i.test(href)) { c.setAttribute('href', href); c.setAttribute('target', '_blank'); c.setAttribute('rel', 'noopener'); }
      if (c.tagName === 'DIV' || c.tagName === 'P') { walk(c); c.before(doc.createElement('br')); c.replaceWith(...c.childNodes); return; }
      walk(c);
      if (c.tagName === 'SPAN') { if (st) c.setAttribute('style', st); else c.replaceWith(...c.childNodes); }
    });
  };
  function finishSpan(sp) { const st = cleanStyle(sp); [...sp.attributes].forEach(a => sp.removeAttribute(a.name)); if (st) sp.setAttribute('style', st); else sp.replaceWith(...sp.childNodes); }
  const root = doc.body.firstChild; walk(root);
  return root.innerHTML.replace(/^(<br>)+/, '');
}
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent || ''; };

/* shared view registry */
const V = {};
let view = 'today';
const app = document.getElementById('app');

/* small popover anchored to an element */
function popover(anchor, html, onClick) {
  closeMenu();
  const r = anchor.getBoundingClientRect(), m = document.createElement('div');
  m.className = 'menu pop'; m.id = 'menu'; m.innerHTML = html;
  document.body.appendChild(m);
  const mr = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - mr.width - 8)) + 'px';
  m.style.top = (r.bottom + mr.height > innerHeight - 70 ? Math.max(8, r.top - mr.height - 6) : r.bottom + 6) + 'px';
  m.addEventListener('mousedown', e => e.preventDefault()); m.addEventListener('pointerdown', e => { if (!e.target.closest('input,select')) e.preventDefault(); });
  m.addEventListener('click', e => onClick(e, m));
  setTimeout(() => document.addEventListener('pointerdown', out, true), 0);
  function out(e) { if (!m.contains(e.target)) closeMenu(); }
  m._outside = out; return m;
}

/* theme */
function applyTheme() {
  const t = (S && S.settings.theme) || 'auto', root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
}

/* print / PDF */
async function printHTML(title, html) {
  let a = $('#printArea'); if (a) a.remove();
  a = document.createElement('div'); a.id = 'printArea';
  a.innerHTML = html; document.body.appendChild(a);
  await Promise.all($$('img', a).map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
  const old = document.title; document.title = title;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); a.remove(); document.title = old; removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  try { window.print(); } catch (e) { toast('Printing is not available here'); done(); }
  setTimeout(() => { if (document.body.classList.contains('printing') && !matchMedia('print').matches) {} }, 1000);
}

/* Apple-style line icons (SF Symbols look) */
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  tasks: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12 3 3 5-6"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  doc: '<path d="M7 3.5h7l4.5 4.5v12.5H7z"/><path d="M14 3.5V8h4.5M10 12h6M10 15.5h6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  trash: '<path d="M4.5 7h15M10 3.5h4M6.5 7l1 13h9l1-13M10 10.5v6M14 10.5v6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2"/><circle cx="12" cy="12" r="7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="m9 6 6 6-6 6"/>', chevL: '<path d="m15 6-6 6 6 6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
  side: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/>',
  cards: '<rect x="3.5" y="7" width="13" height="13" rx="3"/><path d="M7.5 4h10a3 3 0 0 1 3 3v10"/>',
  quiz: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4M12 16.8v.1"/>',
  play: '<circle cx="12" cy="12" r="8.5"/><path d="m10.2 8.8 5 3.2-5 3.2z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', checkc: '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.4"/>',
  circle: '<circle cx="12" cy="12" r="8.5"/>',
  more: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  pencil: '<path d="m4.5 19.5 1-4.5L16 4.5a2.1 2.1 0 0 1 3 3L8.5 18z"/><path d="m14 6.5 3 3"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M3 20h18"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  restore: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 3h5"/>',
  flag: '<path d="M5 20.5V4.5M5 5h11l-2 4 2 4H5"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5V20"/>'
};
const I = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
