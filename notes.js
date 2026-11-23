/* Study OS — Notion-style pages with a block editor, images and drawings */
const BLOCK_TYPES = [
  ['p', 'Text', 'T'], ['h1', 'Heading 1', 'H1'], ['h2', 'Heading 2', 'H2'], ['h3', 'Heading 3', 'H3'],
  ['ul', 'Bulleted list', '•'], ['ol', 'Numbered list', '1.'], ['todo', 'To-do', '☐'], ['toggle', 'Toggle', '▸'],
  ['quote', 'Quote', '❝'], ['callout', 'Callout', '!'], ['code', 'Code', '{}'], ['divider', 'Divider', '—'],
  ['image', 'Image', '▣'], ['drawing', 'Drawing / diagram', '✎'], ['page', 'Sub-page', '▤']];
const TEXT_TYPES = new Set(['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'todo', 'toggle', 'quote', 'callout', 'code']);
const EMOJIS = '📄 📘 📗 📕 📒 📓 🧠 👁️ 🩺 💊 💉 🧪 🔬 🏥 🧬 ❤️ 🫁 🦴 🗣️ 🇺🇸 ✍️ 📝 💡 ⭐ 🎯 ✅ 📌 🗂️ 📊 🤖 💻 🧑‍⚕️ 🔥 🌱 🚀 🗓️ ⚡ 🎧 📷 🧩'.split(' ');

let curPage = null, lastFocus = null, noteQ = '';
const pageById = id => S.pages.find(p => p.id === id);
const kids = id => S.pages.filter(p => (p.parent || null) === (id || null));
function pageTrack(p) { while (p) { if (p.tr) return p.tr; p = pageById(p.parent); } return null; }
function crumbsOf(p) { const a = []; while (p) { a.unshift(p); p = pageById(p.parent); } return a; }
function descendants(id) { const out = []; kids(id).forEach(k => { out.push(k.id, ...descendants(k.id)); }); return out; }
function newBlock(type, extra) { return Object.assign({ id: 'b' + uid(), type, html: '' }, extra || {}); }
function newPage(parent, title, icon, blocks, tr) {
  const p = { id: 'p' + uid(), parent: parent || null, title: title || '', icon: icon || '📄', blocks: blocks || [newBlock('p')], created: Date.now(), updated: Date.now() };
  if (tr) p.tr = tr;
  S.pages.push(p); return p;
}
async function deletePage(id) {
  const ids = [id, ...descendants(id)];
  for (const pid of ids) { const p = pageById(pid); if (p) for (const b of p.blocks) await dropBlockFiles(b); }
  S.pages = S.pages.filter(p => !ids.includes(p.id));
  S.pages.forEach(p => p.blocks = p.blocks.filter(b => !(b.type === 'page' && ids.includes(b.page))));
  S.cards.forEach(c => { if (ids.includes(c.page)) delete c.page; });
  save();
}
async function dropBlockFiles(b) { for (const k of ['file', 'data', 'bg']) if (b[k]) { dropURL(b[k]); await fileDel(b[k]); } }

/* ---------- seed pages ---------- */
function seedPages() {
  S.pages = S.pages || [];
  const B = (type, html, extra) => newBlock(type, Object.assign({ html }, extra || {}));
  const start = newPage(null, 'Start here', '👋', [
    B('callout', 'This is your one place for <b>Ophthalmology, NCLEX, English and Health Informatics & AI</b>. Notes live here; things to remember become flashcards.'),
    B('h2', 'How to use it'),
    B('ul', 'Tap <b>⋮⋮</b> next to any block (or type <b>/</b>) to change it: heading, list, to-do, toggle, image, drawing…'),
    B('ul', 'Select text → tap <b>Card</b> or <b>Cloze</b> to turn it into a flashcard in one tap.'),
    B('ul', 'Use <b>Draw</b> for diagrams; tap a photo → <b>Annotate</b> to draw on it.'),
    B('ul', 'The <b>+</b> button captures a quick note from anywhere.'),
    B('h2', 'First steps'),
    B('todo', 'Open <b>Ophthalmology → Eye anatomy</b> and draw the eye from memory'),
    B('todo', 'Do today\'s card session'),
    B('todo', 'Export a backup on Friday (Progress tab)')]);
  const oph = newPage(null, 'Ophthalmology', '👁️', [B('p', 'Everything I learn at the eye center. One page per topic.')], 'oph');
  newPage(oph.id, 'Eye anatomy', '🧠', [B('h2', 'Structures'), B('ul', 'Cornea'), B('ul', 'Lens'), B('ul', 'Retina & macula'), B('ul', 'Optic nerve'), B('h2', 'Aqueous flow'), B('p', 'Ciliary body → posterior chamber → pupil → anterior chamber → trabecular meshwork → Schlemm\'s canal')]);
  newPage(oph.id, 'Drugs & cap colors', '💊', [B('toggle', 'Red cap — dilating drops', { inner: 'Tropicamide, phenylephrine, cyclopentolate, atropine. Never dilate narrow angles without checking.' }), B('toggle', 'Green cap — miotics', { inner: 'Pilocarpine' })]);
  newPage(oph.id, 'Surgery notes', '🏥', [B('h2', 'Cataract (phaco + IOL)'), B('ol', 'Prep, drape, speculum'), B('ol', 'Incisions + OVD'), B('ol', 'Capsulorhexis'), B('ol', 'Phaco + I/A'), B('ol', 'IOL injection')]);
  newPage(oph.id, 'Surgeon preference cards', '🗂️', [B('p', 'One toggle per surgeon: gloves, incision, OVD, IOL, settings.')]);
  const nc = newPage(null, 'NCLEX', '🩺', [B('p', 'Notes from Saunders, videos and my error log.')], 'nclex');
  newPage(nc.id, 'Weak topics', '🎯', [B('todo', '')]);
  const en = newPage(null, 'English', '🗣️', [B('p', 'New words from work, phrases, speaking practice.')], 'eng');
  newPage(en.id, 'Vocabulary from work', '✍️', [B('p', 'Select a word → Card to add it to your deck.')]);
  const hi = newPage(null, 'Health Informatics & AI', '🤖', [B('p', 'Course notes and project ideas.')], 'hi');
  newPage(hi.id, 'Project ideas', '💡', [B('ul', 'AI in diabetic retinopathy screening — case study from my clinic')]);
  S.settings.lastPage = start.id;
}

/* ---------- Notes view ---------- */
V.notes = () => {
  app.className = 'wide';
  if (!curPage || !pageById(curPage)) curPage = S.settings.lastPage && pageById(S.settings.lastPage) ? S.settings.lastPage : null;
  const narrowOpen = !!curPage && innerWidth <= 900 && V._openPage;
  app.innerHTML = `<div class="notes ${narrowOpen ? 'open' : ''}" id="notes">
    <aside class="side">
      <h1 style="margin-bottom:10px">Notes</h1>
      <input id="nQ" placeholder="Search pages" value="${esc(noteQ)}">
      <div class="row" style="margin:10px 0"><button class="btn-blue" id="nNew">New page</button></div>
      <div class="group pad tree" id="tree"></div>
    </aside>
    <section class="paper" id="paper"></section></div>`;
  paintTree();
  const q = $('#nQ'); q.oninput = () => { noteQ = q.value; paintTree(); };
  $('#nNew').onclick = () => { const p = newPage(null, '', '📄'); save(); openPage(p.id, true); };
  if (curPage) paintPage(); else $('#paper').innerHTML = '<p class="muted">Pick a page.</p>';
};
function paintTree() {
  const t = $('#tree'); if (!t) return;
  const ex = S.settings.expanded || (S.settings.expanded = {});
  if (noteQ.trim()) {
    const ql = noteQ.toLowerCase();
    const hits = S.pages.filter(p => (p.title + ' ' + p.blocks.map(b => plain(b.html) + ' ' + plain(b.inner || '') + ' ' + (b.cap || '')).join(' ')).toLowerCase().includes(ql));
    t.innerHTML = hits.length ? hits.map(p => `<a data-p="${p.id}" class="${p.id === curPage ? 'on' : ''}"><span class="ic">${p.icon}</span><span class="tt">${esc(p.title || 'Untitled')}</span></a>`).join('') : '<p class="muted small">No pages found.</p>';
  } else {
    const row = (p, d) => {
      const ks = kids(p.id), open = ex[p.id] || (curPage && crumbsOf(pageById(curPage)).some(c => c.id === p.id) && ex[p.id] !== false);
      return `<a data-p="${p.id}" class="${p.id === curPage ? 'on' : ''}" style="padding-left:${6 + d * 16}px"><span class="tw" data-tw="${p.id}">${ks.length ? (open ? '▾' : '▸') : ''}</span><span class="ic">${p.icon}</span><span class="tt">${esc(p.title || 'Untitled')}</span></a>` + (open ? ks.map(k => row(k, d + 1)).join('') : '');
    };
    t.innerHTML = kids(null).map(p => row(p, 0)).join('');
  }
  t.onclick = e => {
    const tw = e.target.closest('[data-tw]');
    if (tw && tw.textContent) { const id = tw.dataset.tw; const ks = kids(id); if (ks.length) { const isOpen = tw.textContent === '▾'; ex[id] = !isOpen; save(); paintTree(); return; } }
    const a = e.target.closest('[data-p]'); if (a) openPage(a.dataset.p);
  };
}
function openPage(id, focusTitle) {
  curPage = id; S.settings.lastPage = id; V._openPage = true; save();
  if (view !== 'notes') { go('notes'); } else { $('#notes').classList.add('open'); paintTree(); paintPage(); }
  if (focusTitle) setTimeout(() => { const t = $('#pTitle'); t && t.focus(); }, 50);
  window.scrollTo(0, 0);
}

function paintPage() {
  const p = pageById(curPage), el = $('#paper'); if (!p || !el) return;
  const tr = pageTrack(p), cr = crumbsOf(p);
  el.innerHTML = `
    <div class="crumbs"><a data-back="1">‹ All pages</a>${cr.slice(0, -1).map(c => ` / <a data-p="${c.id}">${c.icon} ${esc(c.title || 'Untitled')}</a>`).join('')}</div>
    <button class="picon" id="pIcon" aria-label="Change icon">${p.icon}</button>
    <div class="ptitle" id="pTitle" contenteditable="true" spellcheck="true">${esc(p.title)}</div>
    <div class="ptools">
      ${tr ? tag(tr) : ''}
      <button data-act="sub">+ Sub-page</button><button data-act="draw">✎ Draw</button><button data-act="img">▣ Image</button><button data-act="more">More</button>
    </div>
    <div class="blocks" id="blocks"></div>
    <button class="addblk" id="addBlk">+ Add a block</button>`;
  paintBlocks();
  el.onclick = pageClick;
  const t = $('#pTitle');
  t.oninput = () => { p.title = t.textContent.trim(); p.updated = Date.now(); save(); clearTimeout(t._t); t._t = setTimeout(paintTree, 400); };
  t.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const b = p.blocks[0]; if (b && TEXT_TYPES.has(b.type)) focusBlock(b.id, false); else { const nb = newBlock('p'); p.blocks.unshift(nb); paintBlocks(); focusBlock(nb.id); } } };
  $('#pIcon').onclick = () => sheet('Page icon', `<div class="emojis">${EMOJIS.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>`, sc => sc.querySelector('.emojis').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; p.icon = b.dataset.e; save(); closeSheet(); paintTree(); paintPage(); });
  $('#addBlk').onclick = () => { const last = p.blocks[p.blocks.length - 1]; if (last && last.type === 'p' && !plain(last.html).trim()) { focusBlock(last.id); return; } const nb = newBlock('p'); p.blocks.push(nb); save(); paintBlocks(); focusBlock(nb.id); };
}
function pageClick(e) {
  const p = pageById(curPage);
  const back = e.target.closest('[data-back]'); if (back) { V._openPage = false; $('#notes').classList.remove('open'); return; }
  const cp = e.target.closest('.crumbs [data-p]'); if (cp) { openPage(cp.dataset.p); return; }
  const act = e.target.closest('[data-act]'); if (!act) return;
  const a = act.dataset.act;
  if (a === 'sub') addSubpage(p, null);
  if (a === 'draw') insertDrawing(null);
  if (a === 'img') insertImage(null);
  if (a === 'more') {
    const r = act.getBoundingClientRect();
    menu(r.left, r.bottom + 6, [
      { icon: '▤', text: 'Move to…', fn: () => moveSheet(p) },
      { icon: '◐', text: 'Set track', fn: () => trackSheet(p) },
      { icon: '⧉', text: 'Duplicate page', fn: () => { const c = newPage(p.parent, p.title + ' (copy)', p.icon, JSON.parse(JSON.stringify(p.blocks.filter(b => !['image', 'drawing'].includes(b.type))))); c.blocks.forEach(b => b.id = 'b' + uid()); save(); openPage(c.id); } },
      '-', { icon: '✕', text: 'Delete page', danger: true, fn: () => sheet('Delete page?', `<p>“${esc(p.title || 'Untitled')}” and its ${descendants(p.id).length} sub-pages will be deleted. Cards stay.</p><button class="big danger" id="dYes">Delete</button>`, () => $('#dYes').onclick = async () => { const parent = p.parent; await deletePage(p.id); closeSheet(); curPage = parent; S.settings.lastPage = parent; V._openPage = !!parent; go('notes'); }) }]);
  }
}
function moveSheet(p) {
  const bad = new Set([p.id, ...descendants(p.id)]);
  const opts = S.pages.filter(x => !bad.has(x.id));
  sheet('Move “' + (p.title || 'Untitled') + '” to', `<div class="group">${[{ id: '', icon: '🏠', title: 'Top level' }, ...opts].map(o => `<div class="cell" data-mv="${o.id}" style="cursor:pointer"><span>${o.icon}</span><span class="grow">${esc(o.title || 'Untitled')}</span></div>`).join('')}</div>`,
    sc => sc.querySelector('.group').onclick = e => { const c = e.target.closest('[data-mv]'); if (!c) return; p.parent = c.dataset.mv || null; save(); closeSheet(); paintTree(); paintPage(); toast('Moved'); });
}
function trackSheet(p) {
  sheet('Track for new cards from this page', `<div class="group">${Object.keys(TRACKS).map(t => `<div class="cell" data-tr="${t}" style="cursor:pointer">${tag(t)}<span class="grow"></span>${p.tr === t ? '✓' : ''}</div>`).join('')}<div class="cell" data-tr="" style="cursor:pointer"><span class="grow">Inherit from parent</span></div></div>`,
    sc => sc.querySelector('.group').onclick = e => { const c = e.target.closest('[data-tr]'); if (!c) return; if (c.dataset.tr) p.tr = c.dataset.tr; else delete p.tr; save(); closeSheet(); paintPage(); });
}

/* ---------- blocks ---------- */
function paintBlocks(focusId, atEnd = true) {
  const p = pageById(curPage), box = $('#blocks'); if (!p || !box) return;
  if (!p.blocks.length) p.blocks.push(newBlock('p'));
  let n = 0;
  box.innerHTML = p.blocks.map(b => { n = b.type === 'ol' ? n + 1 : 0; return blockHTML(b, n); }).join('');
  $$('img[data-file]', box).forEach(async im => { im.src = await fileURL(im.dataset.file); });
  if (focusId) focusBlock(focusId, atEnd);
}
function blockHTML(b, num) {
  const ed = (cls, html, ph) => `<div class="ed ${cls || ''}" contenteditable="true" data-ph="${ph || ''}">${clean(html)}</div>`;
  let mk = '', body = '';
  switch (b.type) {
    case 'ul': mk = '<span class="mk">•</span>'; body = ed('', b.html, 'List'); break;
    case 'ol': mk = `<span class="mk">${num}.</span>`; body = ed('', b.html, 'List'); break;
    case 'todo': mk = `<input type="checkbox" data-chk ${b.checked ? 'checked' : ''} aria-label="done">`; body = ed('', b.html, 'To-do'); break;
    case 'toggle': mk = '<button class="tg" data-tg aria-label="toggle">▸</button>'; body = ed('', b.html, 'Toggle') + `<div class="inner">${ed('inner', b.inner || '', 'Hidden content… (good for self-testing)')}</div>`; break;
    case 'callout': body = `<span>💡</span>${ed('', b.html, 'Callout')}`; break;
    case 'divider': body = '<hr>'; break;
    case 'image': body = `<img data-file="${b.file}" data-view alt="${esc(b.cap || 'image')}">${ed('cap', b.cap || '', 'Add a caption')}<div class="mediaBar"><button data-annot>✎ Annotate</button></div>`; break;
    case 'drawing': body = `<img data-file="${b.file}" data-view alt="drawing"><div class="mediaBar"><button data-redraw>✎ Edit drawing</button></div>`; break;
    case 'page': { const c = pageById(b.page); body = c ? `<div class="plink" data-open="${c.id}">${c.icon} ${esc(c.title || 'Untitled')}</div>` : '<div class="muted small">(deleted page)</div>'; break; }
    case 'h1': body = ed('', b.html, 'Heading 1'); break;
    case 'h2': body = ed('', b.html, 'Heading 2'); break;
    case 'h3': body = ed('', b.html, 'Heading 3'); break;
    case 'quote': body = ed('', b.html, 'Quote'); break;
    case 'code': body = ed('', b.html, 'Code'); break;
    default: body = ed('', b.html, '');
  }
  return `<div class="blk ${b.type} ${b.checked ? 'done' : ''} ${b.open ? 'open' : ''}" data-id="${b.id}"><button class="hd" data-hd aria-label="Block menu">⋮⋮</button>${mk}<div class="body">${body}</div></div>`;
}
const blkOf = el => { const d = el.closest('.blk'); if (!d) return {}; const p = pageById(curPage); const i = p.blocks.findIndex(b => b.id === d.dataset.id); return { p, i, b: p.blocks[i], d }; };
function focusBlock(id, atEnd = true) {
  const d = $(`.blk[data-id="${id}"] .ed`); if (!d) return;
  d.focus();
  const r = document.createRange(); r.selectNodeContents(d); r.collapse(!atEnd);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function caretOffsets(ed) {
  const s = getSelection(); if (!s.rangeCount) return { start: false, end: false };
  const r = s.getRangeAt(0); if (!ed.contains(r.startContainer)) return { start: false, end: false };
  const a = document.createRange(); a.selectNodeContents(ed); a.setEnd(r.startContainer, r.startOffset);
  const b = document.createRange(); b.selectNodeContents(ed); b.setStart(r.endContainer, r.endOffset);
  return { start: a.toString().length === 0 && r.collapsed, end: b.toString().length === 0 && r.collapsed, pre: a.toString().length };
}
function syncBlock(ed) {
  const { p, b } = blkOf(ed); if (!b) return;
  if (ed.classList.contains('inner')) b.inner = clean(ed.innerHTML);
  else if (ed.classList.contains('cap')) b.cap = ed.textContent.trim();
  else b.html = clean(ed.innerHTML);
  p.updated = Date.now(); save();
}
function convert(b, type) {
  if (type === 'image') { insertImage(b.id, true); return; }
  if (type === 'drawing') { insertDrawing(b.id, true); return; }
  if (type === 'page') { addSubpage(pageById(curPage), b.id, true); return; }
  if (type === 'divider') { const p = pageById(curPage), i = p.blocks.indexOf(b); b.type = 'divider'; b.html = ''; const nb = newBlock('p'); p.blocks.splice(i + 1, 0, nb); save(); paintBlocks(nb.id); return; }
  b.type = type; if (type !== 'todo') delete b.checked; if (type === 'toggle') b.open = true;
  save(); paintBlocks(b.id);
}
function insertAfter(refId, nb) {
  const p = pageById(curPage); const i = refId ? p.blocks.findIndex(b => b.id === refId) : -1;
  if (i < 0) p.blocks.push(nb); else p.blocks.splice(i + 1, 0, nb);
  return nb;
}
function replaceOrInsert(refId, nb, replace) {
  const p = pageById(curPage); const i = p.blocks.findIndex(b => b.id === refId);
  if (replace && i >= 0 && !plain(p.blocks[i].html).trim()) p.blocks[i] = nb; else insertAfter(refId || (lastFocus && p.blocks.some(b => b.id === lastFocus) ? lastFocus : null), nb);
  lastFocus = nb.id;
}
function addSubpage(p, refId, replace) {
  const c = newPage(p.id, '', '📄');
  replaceOrInsert(refId, newBlock('page', { page: c.id }), replace);
  S.settings.expanded[p.id] = true; save(); openPage(c.id, true);
}
let pendingImg = null;
function insertImage(refId, replace) { pendingImg = { refId, replace }; $('#imgFile').click(); }
$('#imgFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; addImageFile(f); });
async function addImageFile(f) {
  if (!f || !pendingImg) return;
  try {
    const { blob, w, h } = await downscale(f); const id = 'f_' + uid(); await filePut(id, blob);
    replaceOrInsert(pendingImg.refId, newBlock('image', { file: id, w, h, cap: '' }), pendingImg.replace);
    save(); paintBlocks(); toast('Image added');
  } catch (x) { toast('Could not read that image'); }
  pendingImg = null;
}
function insertDrawing(refId, replace) {
  openDraw({}, r => { replaceOrInsert(refId, newBlock('drawing', { file: r.pngId, data: r.strokesId, paper: r.paper, W: r.W, H: r.H }), replace); save(); paintBlocks(); });
}
function redraw(b) {
  openDraw({ strokesId: b.data, bgId: b.bg, paper: b.paper, W: b.W, H: b.H }, async r => {
    dropURL(b.file); await fileDel(b.file); await fileDel(b.data);
    Object.assign(b, { file: r.pngId, data: r.strokesId, paper: r.paper, W: r.W, H: r.H }); save(); paintBlocks();
  });
}
function annotate(b) {
  openDraw({ bgId: b.file }, r => { Object.assign(b, { type: 'drawing', bg: b.file, file: r.pngId, data: r.strokesId, paper: r.paper, W: r.W, H: r.H }); save(); paintBlocks(); });
}
function viewImage(b) {
  const v = document.createElement('div'); v.className = 'viewer';
  v.innerHTML = `<img alt=""><div class="vbar"><button id="vEdit">✎ ${b.type === 'image' ? 'Annotate' : 'Edit'}</button><button id="vClose" class="btn-blue">Close</button></div>`;
  document.body.appendChild(v); fileURL(b.file).then(u => $('img', v).src = u);
  $('#vClose').onclick = () => v.remove();
  $('#vEdit').onclick = () => { v.remove(); b.type === 'image' ? annotate(b) : redraw(b); };
}
function blockMenu(btn, b) {
  const p = pageById(curPage), i = p.blocks.indexOf(b), r = btn.getBoundingClientRect();
  const turn = BLOCK_TYPES.filter(t => TEXT_TYPES.has(t[0]) && t[0] !== b.type).map(t => ({ icon: t[2], text: t[1], fn: () => convert(b, t[0]) }));
  menu(r.right + 4, r.top, [
    ...(TEXT_TYPES.has(b.type) ? [{ label: 'Turn into' }, ...turn, '-'] : []),
    { icon: '+', text: 'Insert block below', fn: () => slashMenu(btn, b, true) },
    { icon: '↑', text: 'Move up', fn: () => { if (i > 0) { p.blocks.splice(i - 1, 0, p.blocks.splice(i, 1)[0]); save(); paintBlocks(); } } },
    { icon: '↓', text: 'Move down', fn: () => { if (i < p.blocks.length - 1) { p.blocks.splice(i + 1, 0, p.blocks.splice(i, 1)[0]); save(); paintBlocks(); } } },
    ...(TEXT_TYPES.has(b.type) ? [{ icon: '⧉', text: 'Duplicate', fn: () => { const c = Object.assign({}, b, { id: 'b' + uid() }); p.blocks.splice(i + 1, 0, c); save(); paintBlocks(); } },
    { icon: '★', text: 'Make flashcard from block', fn: () => cardSheet({ front: '', back: plain(b.html) + (b.inner ? '\n' + plain(b.inner) : ''), tr: pageTrack(p), page: p.id }) }] : []),
    '-', { icon: '✕', text: 'Delete block', danger: true, fn: async () => { await dropBlockFiles(b); p.blocks.splice(i, 1); save(); paintBlocks(); } }]);
}
let slashState = null;
function slashMenu(anchor, b, insertBelow, query = '') {
  const r = anchor.getBoundingClientRect();
  const list = BLOCK_TYPES.filter(t => !query || t[1].toLowerCase().includes(query.toLowerCase()) || t[0].startsWith(query.toLowerCase()));
  if (!list.length) { closeMenu(); slashState = null; return; }
  const sel = slashState && slashState.b === b ? Math.min(slashState.sel || 0, list.length - 1) : 0;
  const pick = t => {
    slashState = null;
    if (insertBelow) { const nb = newBlock('p'); insertAfter(b.id, nb); save(); paintBlocks(); convert(nb, t[0]); if (TEXT_TYPES.has(t[0])) focusBlock(nb.id); return; }
    b.html = clean(b.html.replace(/\/[^/]*$/, '')); convert(b, t[0]);
  };
  menu(r.left, r.bottom + 6, [{ label: 'Blocks' }, ...list.map(t => ({ icon: t[2], text: t[1], fn: () => pick(t) }))], { sel: sel + 1 });
  slashState = { b, list, sel, pick, insertBelow };
}

/* editor events (delegated) */
document.addEventListener('input', e => {
  const ed = e.target.closest && e.target.closest('#blocks .ed'); if (!ed) return;
  const { b, d } = blkOf(ed); if (!b) return;
  if (!ed.classList.contains('inner') && !ed.classList.contains('cap')) {
    const t = ed.textContent;
    const md = [[/^#\s/, 'h1'], [/^##\s/, 'h2'], [/^###\s/, 'h3'], [/^[-*]\s/, 'ul'], [/^1[.)]\s/, 'ol'], [/^\[\]\s?/, 'todo'], [/^>\s/, 'quote'], [/^```/, 'code'], [/^---$/, 'divider']];
    if (b.type === 'p') for (const [re, ty] of md) if (re.test(t)) { b.html = clean(ed.innerHTML).replace(/^(#{1,3}\s|[-*]\s|1[.)]\s|\[\]\s?|>\s|```|---)/, ''); convert(b, ty); return; }
    const m = t.match(/(^|\s)\/(\w*)$/);
    if (m && TEXT_TYPES.has(b.type) && b.type !== 'code') { syncBlock(ed); slashMenu(ed, b, false, m[2]); }
    else if (slashState) { closeMenu(); slashState = null; }
  }
  syncBlock(ed);
});
document.addEventListener('focusin', e => { const d = e.target.closest && e.target.closest('#blocks .blk'); if (d) lastFocus = d.dataset.id; });
document.addEventListener('keydown', e => {
  const ed = e.target.closest && e.target.closest('#blocks .ed'); if (!ed) return;
  const { p, i, b } = blkOf(ed); if (!b) return;
  if (slashState && $('#menu')) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); slashState.sel = (slashState.sel + (e.key === 'ArrowDown' ? 1 : -1) + slashState.list.length) % slashState.list.length; const q = (ed.textContent.match(/\/(\w*)$/) || [])[1] || ''; slashMenu(ed, b, false, q); return; }
    if (e.key === 'Enter') { e.preventDefault(); slashState.pick(slashState.list[slashState.sel]); return; }
    if (e.key === 'Escape') { closeMenu(); slashState = null; return; }
  }
  const inner = ed.classList.contains('inner') || ed.classList.contains('cap');
  if (e.key === 'Enter' && !e.shiftKey) {
    if (b.type === 'code' || inner) { e.preventDefault(); document.execCommand('insertLineBreak'); return; }
    e.preventDefault();
    const listy = ['ul', 'ol', 'todo'].includes(b.type);
    if (listy && !ed.textContent.trim()) { convert(b, 'p'); return; }
    const s = getSelection(), r = s.getRangeAt(0); r.deleteContents();
    const tail = document.createRange(); tail.setStart(r.endContainer, r.endOffset); tail.setEnd(ed, ed.childNodes.length);
    const box = document.createElement('div'); box.appendChild(tail.extractContents());
    b.html = clean(ed.innerHTML);
    const nb = newBlock(listy ? b.type : 'p', { html: clean(box.innerHTML) });
    p.blocks.splice(i + 1, 0, nb); save(); paintBlocks(nb.id, false); return;
  }
  if (e.key === 'Backspace' && !inner) {
    const c = caretOffsets(ed);
    if (c.start) {
      e.preventDefault();
      if (b.type !== 'p') { convert(b, 'p'); focusBlock(b.id, false); return; }
      const prev = p.blocks[i - 1];
      if (!prev) return;
      if (TEXT_TYPES.has(prev.type)) {
        const joinAt = plain(prev.html).length; prev.html = clean(prev.html + b.html); p.blocks.splice(i, 1); save(); paintBlocks();
        const pe = $(`.blk[data-id="${prev.id}"] .ed`); pe.focus(); placeAt(pe, joinAt);
      } else if (!ed.textContent.trim()) { p.blocks.splice(i, 1); save(); paintBlocks(); }
      return;
    }
  }
  if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !inner) {
    const c = caretOffsets(ed), up = e.key === 'ArrowUp';
    if ((up && c.start) || (!up && c.end)) {
      for (let j = i + (up ? -1 : 1); j >= 0 && j < p.blocks.length; j += up ? -1 : 1) if (TEXT_TYPES.has(p.blocks[j].type)) { e.preventDefault(); focusBlock(p.blocks[j].id, up); return; }
    }
  }
  if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) { e.preventDefault(); document.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()]); }
});
function placeAt(ed, n) {
  const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let node, left = n;
  while ((node = w.nextNode())) { if (left <= node.length) { const r = document.createRange(); r.setStart(node, left); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; } left -= node.length; }
  focusBlock(ed.closest('.blk').dataset.id, true);
}
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('#blocks')) return;
  const t = e.target;
  if (t.closest('[data-hd]')) { const { b } = blkOf(t); blockMenu(t.closest('[data-hd]'), b); return; }
  if (t.matches('[data-chk]')) { const { b, d } = blkOf(t); b.checked = t.checked; d.classList.toggle('done', t.checked); save(); return; }
  if (t.closest('[data-tg]')) { const { b, d } = blkOf(t); b.open = !b.open; d.classList.toggle('open', b.open); save(); return; }
  if (t.closest('[data-annot]')) { annotate(blkOf(t).b); return; }
  if (t.closest('[data-redraw]')) { redraw(blkOf(t).b); return; }
  if (t.matches('[data-view]')) { viewImage(blkOf(t).b); return; }
  const o = t.closest('[data-open]'); if (o) openPage(o.dataset.open);
});
document.addEventListener('paste', e => {
  const ed = e.target.closest && e.target.closest('#blocks .ed'); if (!ed) return;
  const items = [...(e.clipboardData?.items || [])], img = items.find(it => it.type.startsWith('image/'));
  if (img) { e.preventDefault(); const { b } = blkOf(ed); pendingImg = { refId: b.id, replace: false }; addImageFile(img.getAsFile()); return; }
  e.preventDefault(); const txt = e.clipboardData.getData('text/plain'); document.execCommand('insertText', false, txt);
});

/* selection toolbar: format + make card */
let fmtEl = null;
document.addEventListener('selectionchange', () => {
  clearTimeout(fmtEl && fmtEl._t);
  const s = getSelection();
  const ed = s.rangeCount && s.anchorNode ? (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement)?.closest('#blocks .ed') : null;
  if (!ed || s.isCollapsed || !s.toString().trim()) { if (fmtEl) { fmtEl.remove(); fmtEl = null; } return; }
  const r = s.getRangeAt(0).getBoundingClientRect();
  if (!fmtEl) {
    fmtEl = document.createElement('div'); fmtEl.className = 'fmt';
    fmtEl.innerHTML = '<button data-f="bold"><b>B</b></button><button data-f="italic"><i>I</i></button><button data-f="underline"><u>U</u></button><button data-f="strikeThrough"><s>S</s></button><button data-f="mark">Mark</button><button data-f="code">&lt;/&gt;</button><button data-f="card">Card</button><button data-f="cloze">Cloze</button>';
    fmtEl.addEventListener('mousedown', ev => ev.preventDefault());
    fmtEl.addEventListener('pointerdown', ev => ev.preventDefault());
    fmtEl.addEventListener('click', fmtClick);
    document.body.appendChild(fmtEl);
  }
  const fw = fmtEl.offsetWidth || 380;
  fmtEl.style.left = Math.max(8, Math.min(r.left + r.width / 2 - fw / 2, innerWidth - fw - 8)) + 'px';
  const below = r.bottom + 12, above = r.top - 54;
  fmtEl.style.top = (matchMedia('(pointer:coarse)').matches || above < 8 ? Math.min(below, innerHeight - 140) : above) + 'px';
});
function fmtClick(e) {
  const b = e.target.closest('[data-f]'); if (!b) return;
  const f = b.dataset.f, s = getSelection(); if (!s.rangeCount) return;
  const txt = s.toString(), ed = (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement).closest('.ed');
  if (f === 'mark' || f === 'code') { document.execCommand('insertHTML', false, `<${f}>${esc(txt)}</${f}>`); return; }
  if (f === 'card' || f === 'cloze') {
    const p = pageById(curPage), pre = caretOffsets(ed).pre ?? 0, full = ed.textContent;
    const start = full.indexOf(txt, Math.max(0, pre - 1)) >= 0 ? full.indexOf(txt, Math.max(0, pre - 1)) : full.indexOf(txt);
    if (fmtEl) { fmtEl.remove(); fmtEl = null; }
    if (f === 'cloze') cardSheet({ front: full.slice(0, start) + '[[' + txt + ']]' + full.slice(start + txt.length), back: '', tr: pageTrack(p), page: p.id });
    else cardSheet({ front: '', back: txt.trim(), tr: pageTrack(p), page: p.id });
    return;
  }
  document.execCommand(f);
}
