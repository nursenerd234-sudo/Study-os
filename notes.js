/* Study OS — notes: courses › modules › pages, Word-style block editor, tables, images, drawings, PDF */
const BLOCK_TYPES = [
  ['p', 'Text', 'T'], ['h1', 'Heading 1', 'H1'], ['h2', 'Heading 2', 'H2'], ['h3', 'Heading 3', 'H3'],
  ['ul', 'Bulleted list', '•'], ['ol', 'Numbered list', '1.'], ['todo', 'To-do', '☐'], ['toggle', 'Toggle', '▸'],
  ['quote', 'Quote', '❝'], ['callout', 'Callout', '!'], ['code', 'Code', '{}'], ['table', 'Table', '▦'], ['divider', 'Divider', '—'],
  ['image', 'Image', '▣'], ['drawing', 'Drawing / diagram', '✎'], ['page', 'Sub-page', '▤']];
const TEXT_TYPES = new Set(['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'todo', 'toggle', 'quote', 'callout', 'code']);
const EMOJIS = '📄 📘 📗 📕 📒 📓 🧠 👁️ 🩺 💊 💉 🧪 🔬 🏥 🧬 ❤️ 🫁 🦴 🗣️ 📖 ✍️ 📝 💡 ⭐ 🎯 ✅ 📌 🗂️ 📊 🤖 💻 🧑‍⚕️ 🔥 🌱 🚀 🗓️ ⚡ 🎧 📷 🧩'.split(' ');
const FONTS = [['', 'Default', ''], ['serif', 'Serif', 'Georgia, "Noto Serif", "Times New Roman", serif'], ['mono', 'Mono', 'ui-monospace, "Roboto Mono", Menlo, monospace'], ['round', 'Rounded', 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif'], ['hand', 'Handwriting', '"Segoe Print", "Bradley Hand", cursive'], ['casual', 'Casual', 'casual, "Comic Sans MS", cursive']];
const fontCSS = k => (FONTS.find(f => f[0] === k) || FONTS[0])[2];
const SIZES = [12, 14, 16, 17, 18, 20, 24, 28, 32, 40];
const TEXT_COLORS = ['#1c1c1e', '#8e8e93', '#ff3b30', '#ff9500', '#c69300', '#34c759', '#30a8bf', '#007aff', '#5856d6', '#af52de', '#ff2d55', '#a2845e'];
const HIGHLIGHTS = ['#fff3b0', '#d4f5d4', '#d6e9ff', '#ffd6e7', '#ffe2c4', '#e9dcff'];

let curPage = null, lastFocus = null, lastRange = null, noteQ = '';
const pageById = id => S.pages.find(p => p.id === id);
const kids = id => S.pages.filter(p => p.parent === id);
const topPages = (c, m) => S.pages.filter(p => !p.parent && (p.course || null) === (c || null) && (p.mod || null) === (m || null));
function crumbsOf(p) { const a = []; while (p) { a.unshift(p); p = pageById(p.parent); } return a; }
const rootOf = p => crumbsOf(p)[0] || p;
const pageCourse = p => p ? (rootOf(p).course || null) : null;
const pageMod = p => p ? (rootOf(p).mod || null) : null;
function descendants(id) { const out = []; kids(id).forEach(k => out.push(k.id, ...descendants(k.id))); return out; }
const pagesIn = (c, m) => S.pages.filter(p => pageCourse(p) === c && (m === undefined || pageMod(p) === m));
function newBlock(type, extra) { return Object.assign({ id: 'b' + uid(), type, html: '' }, extra || {}); }
function newPage(parent, title, icon, blocks, c, m) {
  const p = { id: 'p' + uid(), parent: parent || null, title: title || '', icon: icon || '📄', blocks: blocks || [newBlock('p')], created: Date.now(), updated: Date.now() };
  if (!parent) { p.course = c || null; p.mod = m || null; }
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

/* ---------- seed + migration ---------- */
function seedPages() {
  S.pages = [];
  const B = (type, html, extra) => newBlock(type, Object.assign({ html }, extra || {}));
  const M = (c, n) => modByName(c, n);
  const start = newPage(null, 'Start here', '👋', [
    B('callout', 'One place for <b>NCLEX, Ophthalmology, English and Health Informatics & AI</b>. Each course has modules; each module has notes, flashcards and questions.'),
    B('h2', 'Writing like Word'),
    B('ul', 'Use the toolbar on top of every note: style, <span style="font-family:Georgia, serif">font</span>, <span style="font-size:20px">size</span>, <span style="color:#ff3b30">colour</span>, <span style="background-color:#fff3b0">highlight</span>, alignment, lists and tables.'),
    B('ul', 'Select text → <b>Card</b> or <b>Cloze</b> makes a flashcard instantly.'),
    B('ul', 'More → <b>Export PDF</b> saves any note (or a whole module from the course page).'),
    B('h2', 'First steps'),
    B('todo', 'Open the <b>NCLEX</b> course and do 5 practice questions'),
    B('todo', 'Write today\'s ophthalmology note'),
    B('todo', 'Export a backup on Friday (Progress tab)')]);
  newPage(null, 'Eye anatomy', '🧠', [B('h2', 'Structures'), B('ul', 'Cornea'), B('ul', 'Lens'), B('ul', 'Retina & macula'), B('ul', 'Optic nerve'), B('h2', 'Aqueous flow'), B('p', 'Ciliary body → posterior chamber → pupil → anterior chamber → trabecular meshwork → Schlemm\'s canal')], 'oph', M('oph', 'Anatomy & Physiology'));
  newPage(null, 'Drugs & cap colors', '💊', [B('table', '', { rows: [['Cap', 'Class', 'Example'], ['Red', 'Mydriatic / cycloplegic', 'Tropicamide'], ['Green', 'Miotic', 'Pilocarpine'], ['Yellow / Blue', 'Beta-blocker', 'Timolol'], ['Turquoise', 'Prostaglandin', 'Latanoprost']] })], 'oph', M('oph', 'Medications'));
  newPage(null, 'Cataract surgery', '🏥', [B('ol', 'Prep, drape, speculum'), B('ol', 'Incisions + OVD'), B('ol', 'Capsulorhexis'), B('ol', 'Phaco + I/A'), B('ol', 'IOL injection')], 'oph', M('oph', 'Procedures & Surgery'));
  newPage(null, 'Lab values', '🧪', [B('table', '', { rows: [['Lab', 'Normal'], ['Sodium', '135–145 mEq/L'], ['Potassium', '3.5–5.0 mEq/L'], ['pH', '7.35–7.45']] })], 'nclex', M('nclex', 'Labs & Values'));
  newPage(null, 'Present perfect vs past simple', '📖', [B('callout', 'Finished time (yesterday, in 2020) → past simple. Since / for / ever / already → present perfect.')], 'eng', M('eng', 'Grammar'));
  newPage(null, 'Short story: The night shift', '📚', [B('p', 'Write a short story here using 5 new words from this week.')], 'eng', M('eng', 'Stories & Reading'));
  newPage(null, 'What is FHIR?', '🤖', [B('p', 'FHIR = Fast Healthcare Interoperability Resources…')], 'hi', M('hi', 'Data Standards'));
  S.settings.lastPage = start.id;
}
function migratePages() {
  const pageNameMod = { 'Eye anatomy': 'Anatomy & Physiology', 'Drugs & cap colors': 'Medications', 'Surgery notes': 'Procedures & Surgery', 'Surgeon preference cards': 'Procedures & Surgery', 'Vocabulary from work': 'Vocabulary', 'Project ideas': 'Projects' };
  S.pages.forEach(p => {
    if (p.parent || p.course !== undefined) return;
    if (p.tr) { // old v2 root course page → its children become module pages of that course
      const c = p.tr; p.course = c; p.mod = null; delete p.tr;
      kids(p.id).forEach(k => { k.parent = null; k.course = c; k.mod = modByName(c, pageNameMod[k.title]) || null; p.blocks = p.blocks.filter(b => !(b.type === 'page' && b.page === k.id)); });
      p.title = (p.title || 'Course') + ' — overview';
    } else { p.course = null; p.mod = null; }
  });
}

/* ---------- Notes view ---------- */
V.notes = () => {
  app.className = 'wide';
  if (!curPage || !pageById(curPage)) curPage = S.settings.lastPage && pageById(S.settings.lastPage) ? S.settings.lastPage : null;
  const narrowOpen = !!curPage && innerWidth <= 900 && V._openPage;
  app.innerHTML = `<div class="notes ${narrowOpen ? 'open' : ''}" id="notes">
    <aside class="side"><h1 style="margin-bottom:10px">Notes</h1>
      <input id="nQ" placeholder="Search all notes" value="${esc(noteQ)}">
      <div class="group pad tree" id="tree" style="margin-top:10px"></div></aside>
    <section class="paper" id="paper"></section></div>`;
  paintTree();
  const q = $('#nQ'); q.oninput = () => { noteQ = q.value; paintTree(); };
  if (curPage) paintPage(); else $('#paper').innerHTML = '<p class="muted">Pick a note, or tap + next to a module.</p>';
};
function paintTree() {
  const t = $('#tree'); if (!t) return;
  const ex = S.settings.expanded || (S.settings.expanded = {});
  const curRoot = curPage && pageById(curPage) ? rootOf(pageById(curPage)) : null;
  if (noteQ.trim()) {
    const ql = noteQ.toLowerCase();
    const hits = S.pages.filter(p => (p.title + ' ' + p.blocks.map(b => plain(b.html) + ' ' + plain(b.inner || '') + ' ' + (b.cap || '') + ' ' + (b.rows || []).flat().map(plain).join(' ')).join(' ')).toLowerCase().includes(ql));
    t.innerHTML = hits.length ? hits.map(p => `<a data-p="${p.id}" class="${p.id === curPage ? 'on' : ''}"><span class="ic">${p.icon}</span><span class="tt">${esc(p.title || 'Untitled')}<br><small class="muted">${esc(courseName(pageCourse(p)))} › ${esc(modName(pageCourse(p), pageMod(p)))}</small></span></a>`).join('') : '<p class="muted small">Nothing found.</p>';
  } else {
    const pageRow = (p, d) => {
      const ks = kids(p.id), open = ex[p.id] !== false && (ex[p.id] || crumbsOf(pageById(curPage) || {}).some(c => c.id === p.id));
      return `<a data-p="${p.id}" class="${p.id === curPage ? 'on' : ''}" style="padding-left:${6 + d * 14}px"><span class="tw" data-tw="${p.id}">${ks.length ? (open ? '▾' : '▸') : ''}</span><span class="ic">${p.icon}</span><span class="tt">${esc(p.title || 'Untitled')}</span></a>` + (open ? ks.map(k => pageRow(k, d + 1)).join('') : '');
    };
    const head = (key, open, icon, label, cnt, d, add, color) => `<a class="th" data-tw="${key}" style="padding-left:${6 + d * 14}px"><span class="tw">${open ? '▾' : '▸'}</span><span class="ic">${icon}</span><span class="tt" ${color ? `style="color:${color};font-weight:650"` : ''}>${esc(label)}</span><small class="muted">${cnt}</small><span class="tadd" data-add="${add}" aria-label="New note">+</span></a>`;
    let html = '';
    for (const c of S.courses) {
      const kc = 'c:' + c.id, oc = ex[kc] ?? (curRoot && curRoot.course === c.id);
      html += head(kc, oc, c.icon, c.name, pagesIn(c.id).length, 0, c.id + '|', c.color);
      if (!oc) continue;
      for (const m of [...c.modules, { id: null, name: 'General' }]) {
        const tp = topPages(c.id, m.id); if (m.id === null && !tp.length) continue;
        const km = 'm:' + (m.id || c.id + '-gen'), om = ex[km] ?? (curRoot && curRoot.course === c.id && (curRoot.mod || null) === m.id);
        html += head(km, om, '', m.name, pagesIn(c.id, m.id).length, 1, c.id + '|' + (m.id || ''));
        if (om) html += tp.map(p => pageRow(p, 2)).join('') || `<p class="muted small" style="padding-left:48px;margin:4px 0">No notes yet</p>`;
      }
    }
    const gen = topPages(null, null), kg = 'c:general', og = ex[kg] ?? true;
    html += head(kg, og, '🗂️', 'General', gen.length, 0, '|');
    if (og) html += gen.map(p => pageRow(p, 1)).join('');
    t.innerHTML = html;
  }
  t.onclick = e => {
    const add = e.target.closest('[data-add]');
    if (add) { e.stopPropagation(); const [c, m] = add.dataset.add.split('|'); const p = newPage(null, '', '📄', null, c || null, m || null); if (c) { ex['c:' + c] = true; ex['m:' + (m || c + '-gen')] = true; } save(); openPage(p.id, true); return; }
    const tw = e.target.closest('[data-tw]');
    if (tw && (tw.classList.contains('th') || e.target.closest('.tw'))) {
      const key = tw.dataset.tw;
      if (tw.classList.contains('th')) { ex[key] = !(tw.querySelector('.tw').textContent === '▾'); save(); paintTree(); return; }
      if (kids(key).length) { ex[key] = tw.textContent !== '▾'; save(); paintTree(); return; }
    }
    const a = e.target.closest('[data-p]'); if (a) openPage(a.dataset.p);
  };
}
function openPage(id, focusTitle) {
  curPage = id; S.settings.lastPage = id; V._openPage = true; save();
  if (view !== 'notes') go('notes'); else { $('#notes').classList.add('open'); paintTree(); paintPage(); }
  if (focusTitle) setTimeout(() => { const t = $('#pTitle'); t && t.focus(); }, 60);
  window.scrollTo(0, 0);
}

/* ---------- Word-style toolbar ---------- */
function wordBar() {
  const sel = (id, opts, label) => `<select id="${id}" aria-label="${label}">${opts}</select>`;
  return `<div class="wbar" id="wbar">
    <button data-w="undo" title="Undo">↶</button><button data-w="redo" title="Redo">↷</button><span class="wsep"></span>
    ${sel('wStyle', [['p', 'Normal'], ['h1', 'Heading 1'], ['h2', 'Heading 2'], ['h3', 'Heading 3'], ['quote', 'Quote'], ['callout', 'Callout'], ['code', 'Code']].map(o => `<option value="${o[0]}">${o[1]}</option>`).join(''), 'Paragraph style')}
    ${sel('wFont', FONTS.map(f => `<option value="${f[0]}">${f[1]}</option>`).join(''), 'Font')}
    ${sel('wSize', '<option value="">Size</option>' + SIZES.map(s => `<option value="${s}">${s}</option>`).join(''), 'Font size')}
    <span class="wsep"></span>
    <button data-w="bold" title="Bold"><b>B</b></button><button data-w="italic" title="Italic"><i>I</i></button><button data-w="underline" title="Underline"><u>U</u></button><button data-w="strikeThrough" title="Strikethrough"><s>S</s></button>
    <button data-w="superscript" title="Superscript">x²</button><button data-w="subscript" title="Subscript">x₂</button>
    <button data-w="color" title="Text colour"><span style="border-bottom:3px solid #ff3b30">A</span></button><button data-w="hilite" title="Highlight"><span style="background:#fff3b0;color:#000;padding:0 4px;border-radius:3px">ab</span></button>
    <span class="wsep"></span>
    <button data-w="al-left" title="Align left">⇤</button><button data-w="al-center" title="Center">≡</button><button data-w="al-right" title="Align right">⇥</button><button data-w="al-justify" title="Justify">☰</button>
    <button data-w="ul" title="Bullets">•≡</button><button data-w="ol" title="Numbering">1≡</button><button data-w="todo" title="Checklist">☑</button>
    <button data-w="outdent" title="Decrease indent">⇠</button><button data-w="indent" title="Increase indent">⇢</button>
    <span class="wsep"></span>
    <button data-w="table" title="Insert table">▦</button><button data-w="clear" title="Clear formatting">⌫ Format</button>
  </div>`;
}
function restoreRange() {
  if (!lastRange) return null;
  const ed = (lastRange.startContainer.nodeType === 1 ? lastRange.startContainer : lastRange.startContainer.parentElement)?.closest('#blocks .ed');
  if (!ed || !document.contains(ed)) return null;
  ed.focus(); const s = getSelection(); s.removeAllRanges(); s.addRange(lastRange); return ed;
}
const curBlock = () => { const p = pageById(curPage); return p && p.blocks.find(b => b.id === lastFocus); };
function wordCmd(cmd, val) {
  const p = pageById(curPage), b = curBlock();
  if (cmd === 'undo' || cmd === 'redo') { restoreRange(); document.execCommand(cmd); return; }
  if (cmd.startsWith('al-')) { if (!b) return; b.align = cmd.slice(3) === 'left' ? '' : cmd.slice(3); save(); paintBlocks(b.id); return; }
  if (cmd === 'indent' || cmd === 'outdent') { if (!b) return; b.indent = Math.max(0, Math.min(4, (b.indent || 0) + (cmd === 'indent' ? 1 : -1))); save(); paintBlocks(b.id); return; }
  if (['ul', 'ol', 'todo'].includes(cmd)) { if (!b || !TEXT_TYPES.has(b.type)) return; convert(b, b.type === cmd ? 'p' : cmd); return; }
  if (cmd === 'table') { const nb = newBlock('table', { rows: [['', '', ''], ['', '', ''], ['', '', '']] }); insertAfter(lastFocus, nb); save(); paintBlocks(); return; }
  const ed = restoreRange(); if (!ed) { toast('Tap inside the text first'); return; }
  const collapsed = getSelection().isCollapsed;
  document.execCommand('styleWithCSS', false, true);
  if (cmd === 'clear') { document.execCommand('removeFormat'); if (b) { delete b.font; delete b.size; delete b.align; delete b.indent; syncBlock(ed); paintBlocks(b.id); } return; }
  if (cmd === 'font') { if (collapsed && b) { b.font = val; save(); paintBlocks(b.id); } else document.execCommand('fontName', false, fontCSS(val) || 'system-ui'); return; }
  if (cmd === 'size') {
    if (collapsed && b) { b.size = +val || null; save(); paintBlocks(b.id); return; }
    document.execCommand('fontSize', false, '7');
    $$('span[style*="xxx-large"], font[size="7"]', ed).forEach(s => { if (s.tagName === 'FONT') { const sp = document.createElement('span'); sp.append(...s.childNodes); s.replaceWith(sp); s = sp; } s.style.fontSize = val + 'px'; });
    syncBlock(ed); return;
  }
  if (cmd === 'foreColor') { document.execCommand('foreColor', false, val); return; }
  if (cmd === 'hiliteColor') { document.execCommand('hiliteColor', false, val); return; }
  document.execCommand(cmd);
}
function bindWordBar() {
  const bar = $('#wbar'); if (!bar) return;
  bar.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  bar.addEventListener('click', e => {
    const btn = e.target.closest('[data-w]'); if (!btn) return;
    const w = btn.dataset.w;
    if (w === 'color') { popover(btn, `<div class="lbl">Text colour</div><div class="swatches">${TEXT_COLORS.map(c => `<button data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`, (ev) => { const c = ev.target.closest('[data-c]'); if (c) { closeMenu(); wordCmd('foreColor', c.dataset.c); } }); return; }
    if (w === 'hilite') { popover(btn, `<div class="lbl">Highlight</div><div class="swatches">${HIGHLIGHTS.map(c => `<button data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<button data-c="transparent" aria-label="none" style="background:var(--card2)">✕</button></div>`, (ev) => { const c = ev.target.closest('[data-c]'); if (c) { closeMenu(); wordCmd('hiliteColor', c.dataset.c); } }); return; }
    wordCmd(w);
  });
  $('#wStyle').onchange = e => { const b = curBlock(); if (b && TEXT_TYPES.has(b.type)) convert(b, e.target.value); };
  $('#wFont').onchange = e => wordCmd('font', e.target.value);
  $('#wSize').onchange = e => { if (e.target.value) wordCmd('size', e.target.value); e.target.value = ''; };
}
function syncBar() {
  const b = curBlock(), st = $('#wStyle'), fo = $('#wFont'); if (!st || !b) return;
  if ([...st.options].some(o => o.value === b.type)) st.value = b.type;
  fo.value = b.font || '';
}

function paintPage() {
  const p = pageById(curPage), el = $('#paper'); if (!p || !el) return;
  const c = pageCourse(p), m = pageMod(p), cr = crumbsOf(p);
  el.innerHTML = `
    <div class="crumbs"><a data-back="1">‹ Notes</a>${c ? ` / <a data-course="${c}">${esc(course(c).icon + ' ' + course(c).name)}</a> / <span>${esc(modName(c, m))}</span>` : ''}${cr.slice(0, -1).map(x => ` / <a data-p="${x.id}">${esc(x.title || 'Untitled')}</a>`).join('')}</div>
    <button class="picon" id="pIcon" aria-label="Change icon">${p.icon}</button>
    <div class="ptitle" id="pTitle" contenteditable="true" dir="auto">${esc(p.title)}</div>
    <div class="ptools">${c ? tag(c) : ''}
      <button data-act="sub">+ Sub-page</button><button data-act="draw">✎ Draw</button><button data-act="img">▣ Image</button><button data-act="card">★ Card</button><button data-act="more">More</button></div>
    ${wordBar()}
    <div class="blocks" id="blocks" style="${p.font ? 'font-family:' + fontCSS(p.font) + ';' : ''}${p.size ? 'font-size:' + p.size + 'px;' : ''}"></div>
    <button class="addblk" id="addBlk">+ Add a block</button>`;
  paintBlocks(); bindWordBar();
  el.onclick = pageClick;
  const t = $('#pTitle');
  t.oninput = () => { p.title = t.textContent.trim(); p.updated = Date.now(); save(); clearTimeout(t._t); t._t = setTimeout(paintTree, 400); };
  t.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const b = p.blocks[0]; if (b && TEXT_TYPES.has(b.type)) focusBlock(b.id, false); } };
  $('#pIcon').onclick = () => sheet('Note icon', `<div class="emojis">${EMOJIS.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>`, sc => sc.querySelector('.emojis').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; p.icon = b.dataset.e; save(); closeSheet(); paintTree(); paintPage(); });
  $('#addBlk').onclick = () => { const last = p.blocks[p.blocks.length - 1]; if (last && last.type === 'p' && !plain(last.html).trim()) { focusBlock(last.id); return; } const nb = newBlock('p'); p.blocks.push(nb); save(); paintBlocks(nb.id); };
}
function pageClick(e) {
  const p = pageById(curPage);
  if (e.target.closest('[data-back]')) { V._openPage = false; $('#notes').classList.remove('open'); return; }
  const cc = e.target.closest('[data-course]'); if (cc) { openCourse(cc.dataset.course); return; }
  const cp = e.target.closest('.crumbs [data-p]'); if (cp) { openPage(cp.dataset.p); return; }
  const act = e.target.closest('[data-act]'); if (!act) return;
  const a = act.dataset.act;
  if (a === 'sub') addSubpage(p, null);
  if (a === 'draw') insertDrawing(null);
  if (a === 'img') insertImage(null);
  if (a === 'card') cardSheet({ course: pageCourse(p), mod: pageMod(p), page: p.id });
  if (a === 'more') {
    const r = act.getBoundingClientRect();
    menu(r.left, r.bottom + 6, [
      { icon: '⎙', text: 'Export PDF', fn: () => exportPDF([p], p.title || 'Note') },
      { icon: 'Aa', text: 'Page font & size', fn: () => pageFontSheet(p) },
      ...(p.parent ? [] : [{ icon: '▤', text: 'Move to course / module', fn: () => moveSheet(p) }]),
      { icon: '⧉', text: 'Duplicate note', fn: () => { const c = newPage(p.parent, p.title + ' (copy)', p.icon, JSON.parse(JSON.stringify(p.blocks.filter(b => !['image', 'drawing'].includes(b.type)))), pageCourse(p), pageMod(p)); c.blocks.forEach(b => b.id = 'b' + uid()); save(); openPage(c.id); } },
      '-', { icon: '✕', text: 'Delete note', danger: true, fn: () => sheet('Delete note?', `<p>“${esc(p.title || 'Untitled')}” and ${descendants(p.id).length} sub-pages will be deleted. Cards stay.</p><button class="big danger" id="dYes">Delete</button>`, () => $('#dYes').onclick = async () => { const parent = p.parent; await deletePage(p.id); closeSheet(); curPage = parent; S.settings.lastPage = parent; V._openPage = !!parent; go('notes'); }) }]);
  }
}
function pageFontSheet(p) {
  sheet('Page font & size', `<label for="pfF">Default font</label><select id="pfF">${FONTS.map(f => `<option value="${f[0]}" ${p.font === f[0] ? 'selected' : ''}>${f[1]}</option>`).join('')}</select>
    <label for="pfS">Default size</label><select id="pfS"><option value="">Default (17)</option>${SIZES.map(s => `<option value="${s}" ${p.size === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <p class="sub" style="margin-top:10px">Tip: with no text selected, the toolbar font/size changes the current block only.</p>
    <button class="btn-blue big" id="pfOk" style="margin-top:12px">Apply</button>`, () => $('#pfOk').onclick = () => { p.font = $('#pfF').value || undefined; p.size = +$('#pfS').value || undefined; save(); closeSheet(); paintPage(); });
}
function moveSheet(p) {
  sheet('Move note', `<label for="mvC">Course</label><select id="mvC"><option value="">General (no course)</option>${courseOpts(p.course)}</select>
    <label for="mvM">Module</label><select id="mvM">${modOpts(p.course, p.mod)}</select><button class="btn-blue big" id="mvOk" style="margin-top:12px">Move</button>`, () => {
    $('#mvC').onchange = e => $('#mvM').innerHTML = modOpts(e.target.value, null);
    $('#mvOk').onclick = () => { p.course = $('#mvC').value || null; p.mod = $('#mvM').value || null; save(); closeSheet(); paintTree(); paintPage(); toast('Moved'); };
  });
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
const edStyle = b => `${b.align ? 'text-align:' + b.align + ';' : ''}${b.size ? 'font-size:' + b.size + 'px;' : ''}${b.font ? 'font-family:' + fontCSS(b.font) + ';' : ''}`;
function blockHTML(b, num, ro) {
  const ce = ro ? '' : 'contenteditable="true"';
  const ed = (cls, html, ph) => `<div class="ed ${cls || ''}" ${ce} dir="auto" data-ph="${ph || ''}" style="${edStyle(b)}">${clean(html)}</div>`;
  let mk = '', body = '';
  switch (b.type) {
    case 'ul': mk = '<span class="mk">•</span>'; body = ed('', b.html, 'List'); break;
    case 'ol': mk = `<span class="mk">${num}.</span>`; body = ed('', b.html, 'List'); break;
    case 'todo': mk = `<input type="checkbox" data-chk ${b.checked ? 'checked' : ''} aria-label="done" ${ro ? 'disabled' : ''}>`; body = ed('', b.html, 'To-do'); break;
    case 'toggle': mk = '<button class="tg" data-tg aria-label="toggle">▸</button>'; body = ed('', b.html, 'Toggle') + `<div class="inner">${ed('inner', b.inner || '', 'Hidden content… (good for self-testing)')}</div>`; break;
    case 'callout': body = `<span>💡</span>${ed('', b.html, 'Callout')}`; break;
    case 'divider': body = '<hr>'; break;
    case 'table': body = `<div class="tblwrap"><table class="ntable">${(b.rows || [['']]).map((r, i) => `<tr>${r.map((c, j) => `<td><div class="ed cell" ${ce} dir="auto" data-r="${i}" data-c="${j}">${clean(c)}</div></td>`).join('')}</tr>`).join('')}</table></div>${ro ? '' : '<div class="mediaBar"><button data-tbl="row+">+ Row</button><button data-tbl="col+">+ Column</button><button data-tbl="row-">− Row</button><button data-tbl="col-">− Column</button></div>'}`; break;
    case 'image': body = `<img data-file="${b.file}" data-view alt="${esc(b.cap || 'image')}">${ed('cap', b.cap || '', 'Add a caption')}${ro ? '' : '<div class="mediaBar"><button data-annot>✎ Annotate</button></div>'}`; break;
    case 'drawing': body = `<img data-file="${b.file}" data-view alt="drawing">${ro ? '' : '<div class="mediaBar"><button data-redraw>✎ Edit drawing</button></div>'}`; break;
    case 'page': { const c = pageById(b.page); body = c ? `<div class="plink" data-open="${c.id}">${c.icon} ${esc(c.title || 'Untitled')}</div>` : '<div class="muted small">(deleted page)</div>'; break; }
    default: body = ed('', b.html, '');
  }
  const indent = b.indent ? `margin-left:${b.indent * 28}px` : '';
  return `<div class="blk ${b.type} ${b.checked ? 'done' : ''} ${b.open || ro ? 'open' : ''}" data-id="${b.id}" style="${indent}">${ro ? '' : '<button class="hd" data-hd aria-label="Block menu">⋮⋮</button>'}${mk}<div class="body">${body}</div></div>`;
}
const blkOf = el => { const d = el.closest('.blk'); if (!d) return {}; const p = pageById(curPage); const i = p.blocks.findIndex(b => b.id === d.dataset.id); return { p, i, b: p.blocks[i], d }; };
function focusBlock(id, atEnd = true) {
  const d = $(`.blk[data-id="${id}"] .ed`); if (!d) return;
  d.focus(); const r = document.createRange(); r.selectNodeContents(d); r.collapse(!atEnd);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function caretOffsets(ed) {
  const s = getSelection(); if (!s.rangeCount) return { start: false, end: false };
  const r = s.getRangeAt(0); if (!ed.contains(r.startContainer)) return { start: false, end: false };
  const a = document.createRange(); a.selectNodeContents(ed); a.setEnd(r.startContainer, r.startOffset);
  const b = document.createRange(); b.selectNodeContents(ed); b.setStart(r.endContainer, r.endOffset);
  return { start: a.toString().length === 0 && r.collapsed, end: b.toString().length === 0 && r.collapsed, pre: a.toString().length };
}
const isInner = ed => ed.classList.contains('inner') || ed.classList.contains('cap') || ed.classList.contains('cell');
function syncBlock(ed) {
  const { p, b } = blkOf(ed); if (!b) return;
  if (ed.classList.contains('inner')) b.inner = clean(ed.innerHTML);
  else if (ed.classList.contains('cap')) b.cap = ed.textContent.trim();
  else if (ed.classList.contains('cell')) b.rows[+ed.dataset.r][+ed.dataset.c] = clean(ed.innerHTML);
  else b.html = clean(ed.innerHTML);
  p.updated = Date.now(); save();
}
function convert(b, type) {
  if (type === 'image') { insertImage(b.id, true); return; }
  if (type === 'drawing') { insertDrawing(b.id, true); return; }
  if (type === 'page') { addSubpage(pageById(curPage), b.id, true); return; }
  const p = pageById(curPage), i = p.blocks.indexOf(b);
  if (type === 'divider' || type === 'table') { const nb2 = type === 'table' ? newBlock('table', { rows: [['', '', ''], ['', '', ''], ['', '', '']] }) : newBlock('divider'); if (!plain(b.html).trim()) p.blocks[i] = nb2; else p.blocks.splice(i + 1, 0, nb2); const nb = newBlock('p'); p.blocks.splice(p.blocks.indexOf(nb2) + 1, 0, nb); save(); paintBlocks(nb.id); return; }
  b.type = type; if (type !== 'todo') delete b.checked; if (type === 'toggle') b.open = true;
  save(); paintBlocks(b.id);
}
function insertAfter(refId, nb) { const p = pageById(curPage); const i = refId ? p.blocks.findIndex(b => b.id === refId) : -1; if (i < 0) p.blocks.push(nb); else p.blocks.splice(i + 1, 0, nb); lastFocus = nb.id; return nb; }
function replaceOrInsert(refId, nb, replace) {
  const p = pageById(curPage); const i = p.blocks.findIndex(b => b.id === refId);
  if (replace && i >= 0 && !plain(p.blocks[i].html).trim()) { p.blocks[i] = nb; lastFocus = nb.id; } else insertAfter(refId || (lastFocus && p.blocks.some(b => b.id === lastFocus) ? lastFocus : null), nb);
}
function addSubpage(p, refId, replace) { const c = newPage(p.id, '', '📄'); replaceOrInsert(refId, newBlock('page', { page: c.id }), replace); S.settings.expanded[p.id] = true; save(); openPage(c.id, true); }
let pendingImg = null;
function insertImage(refId, replace) { pendingImg = { refId, replace }; $('#imgFile').click(); }
$('#imgFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; addImageFile(f); });
async function addImageFile(f) {
  if (!f || !pendingImg) return;
  try { const { blob, w, h } = await downscale(f); const id = 'f_' + uid(); await filePut(id, blob); replaceOrInsert(pendingImg.refId, newBlock('image', { file: id, w, h, cap: '' }), pendingImg.replace); save(); paintBlocks(); toast('Image added'); }
  catch (x) { toast('Could not read that image'); }
  pendingImg = null;
}
function insertDrawing(refId, replace) { openDraw({}, r => { replaceOrInsert(refId, newBlock('drawing', { file: r.pngId, data: r.strokesId, paper: r.paper, W: r.W, H: r.H }), replace); save(); paintBlocks(); }); }
function redraw(b) { openDraw({ strokesId: b.data, bgId: b.bg, paper: b.paper, W: b.W, H: b.H }, async r => { dropURL(b.file); await fileDel(b.file); await fileDel(b.data); Object.assign(b, { file: r.pngId, data: r.strokesId, paper: r.paper, W: r.W, H: r.H }); save(); paintBlocks(); }); }
function annotate(b) { openDraw({ bgId: b.file }, r => { Object.assign(b, { type: 'drawing', bg: b.file, file: r.pngId, data: r.strokesId, paper: r.paper, W: r.W, H: r.H }); save(); paintBlocks(); }); }
function viewImage(b) {
  const v = document.createElement('div'); v.className = 'viewer';
  v.innerHTML = `<img alt=""><div class="vbar"><button id="vEdit">✎ ${b.type === 'image' ? 'Annotate' : 'Edit'}</button><button id="vClose" class="btn-blue">Close</button></div>`;
  document.body.appendChild(v); fileURL(b.file).then(u => $('img', v).src = u);
  $('#vClose').onclick = () => v.remove(); $('#vEdit').onclick = () => { v.remove(); b.type === 'image' ? annotate(b) : redraw(b); };
}
function blockMenu(btn, b) {
  const p = pageById(curPage), i = p.blocks.indexOf(b), r = btn.getBoundingClientRect();
  const turn = BLOCK_TYPES.filter(t => TEXT_TYPES.has(t[0]) && t[0] !== b.type).map(t => ({ icon: t[2], text: t[1], fn: () => convert(b, t[0]) }));
  menu(r.right + 4, r.top, [
    ...(TEXT_TYPES.has(b.type) ? [{ label: 'Turn into' }, ...turn, '-'] : []),
    { icon: '+', text: 'Insert block below', fn: () => slashMenu(btn, b, true) },
    { icon: '↑', text: 'Move up', fn: () => { if (i > 0) { p.blocks.splice(i - 1, 0, p.blocks.splice(i, 1)[0]); save(); paintBlocks(); } } },
    { icon: '↓', text: 'Move down', fn: () => { if (i < p.blocks.length - 1) { p.blocks.splice(i + 1, 0, p.blocks.splice(i, 1)[0]); save(); paintBlocks(); } } },
    ...(TEXT_TYPES.has(b.type) ? [{ icon: '⧉', text: 'Duplicate', fn: () => { p.blocks.splice(i + 1, 0, Object.assign({}, b, { id: 'b' + uid() })); save(); paintBlocks(); } },
    { icon: '★', text: 'Make flashcard from block', fn: () => cardSheet({ front: '', back: plain(b.html) + (b.inner ? '\n' + plain(b.inner) : ''), course: pageCourse(p), mod: pageMod(p), page: p.id }) }] : []),
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
  const { b } = blkOf(ed); if (!b) return;
  if (!isInner(ed)) {
    const t = ed.textContent;
    const md = [[/^#\s/, 'h1'], [/^##\s/, 'h2'], [/^###\s/, 'h3'], [/^[-*]\s/, 'ul'], [/^1[.)]\s/, 'ol'], [/^\[\]\s?/, 'todo'], [/^>\s/, 'quote'], [/^```/, 'code'], [/^---$/, 'divider']];
    if (b.type === 'p') for (const [re, ty] of md) if (re.test(t)) { b.html = clean(ed.innerHTML).replace(/^(#{1,3}\s|[-*]\s|1[.)]\s|\[\]\s?|>\s|```|---)/, ''); convert(b, ty); return; }
    const m = t.match(/(^|\s)\/(\w*)$/);
    if (m && TEXT_TYPES.has(b.type) && b.type !== 'code') { syncBlock(ed); slashMenu(ed, b, false, m[2]); }
    else if (slashState) { closeMenu(); slashState = null; }
  }
  syncBlock(ed);
});
document.addEventListener('focusin', e => { const d = e.target.closest && e.target.closest('#blocks .blk'); if (d) { lastFocus = d.dataset.id; syncBar(); } });
document.addEventListener('keydown', e => {
  const ed = e.target.closest && e.target.closest('#blocks .ed'); if (!ed) return;
  const { p, i, b } = blkOf(ed); if (!b) return;
  if (slashState && $('#menu')) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); slashState.sel = (slashState.sel + (e.key === 'ArrowDown' ? 1 : -1) + slashState.list.length) % slashState.list.length; slashMenu(ed, b, false, (ed.textContent.match(/\/(\w*)$/) || [])[1] || ''); return; }
    if (e.key === 'Enter') { e.preventDefault(); slashState.pick(slashState.list[slashState.sel]); return; }
    if (e.key === 'Escape') { closeMenu(); slashState = null; return; }
  }
  if (ed.classList.contains('cell') && e.key === 'Tab') { e.preventDefault(); const cells = $$('.cell', ed.closest('table')); const k = cells.indexOf(ed) + (e.shiftKey ? -1 : 1); if (cells[k]) { cells[k].focus(); } return; }
  if (e.key === 'Tab' && !isInner(ed)) { e.preventDefault(); b.indent = Math.max(0, Math.min(4, (b.indent || 0) + (e.shiftKey ? -1 : 1))); save(); paintBlocks(b.id); return; }
  const inner = isInner(ed);
  if (e.key === 'Enter' && !e.shiftKey) {
    if (b.type === 'code' || inner) { e.preventDefault(); document.execCommand('insertLineBreak'); return; }
    e.preventDefault();
    const listy = ['ul', 'ol', 'todo'].includes(b.type);
    if (listy && !ed.textContent.trim()) { convert(b, 'p'); return; }
    const s = getSelection(), r = s.getRangeAt(0); r.deleteContents();
    const tail = document.createRange(); tail.setStart(r.endContainer, r.endOffset); tail.setEnd(ed, ed.childNodes.length);
    const box = document.createElement('div'); box.appendChild(tail.extractContents());
    b.html = clean(ed.innerHTML);
    const nb = newBlock(listy ? b.type : 'p', { html: clean(box.innerHTML) }); if (b.font) nb.font = b.font; if (b.size && b.type === 'p') nb.size = b.size; if (b.indent) nb.indent = b.indent;
    p.blocks.splice(i + 1, 0, nb); save(); paintBlocks(nb.id, false); return;
  }
  if (e.key === 'Backspace' && !inner) {
    const c = caretOffsets(ed);
    if (c.start) {
      e.preventDefault();
      if (b.indent) { b.indent--; save(); paintBlocks(b.id, false); return; }
      if (b.type !== 'p') { convert(b, 'p'); focusBlock(b.id, false); return; }
      const prev = p.blocks[i - 1]; if (!prev) return;
      if (TEXT_TYPES.has(prev.type)) { const joinAt = plain(prev.html).length; prev.html = clean(prev.html + b.html); p.blocks.splice(i, 1); save(); paintBlocks(); const pe = $(`.blk[data-id="${prev.id}"] .ed`); pe.focus(); placeAt(pe, joinAt); }
      else if (!ed.textContent.trim()) { p.blocks.splice(i, 1); save(); paintBlocks(); }
      return;
    }
  }
  if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !inner) {
    const c = caretOffsets(ed), up = e.key === 'ArrowUp';
    if ((up && c.start) || (!up && c.end)) for (let j = i + (up ? -1 : 1); j >= 0 && j < p.blocks.length; j += up ? -1 : 1) if (TEXT_TYPES.has(p.blocks[j].type)) { e.preventDefault(); focusBlock(p.blocks[j].id, up); return; }
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
  if (t.closest('[data-hd]')) { blockMenu(t.closest('[data-hd]'), blkOf(t).b); return; }
  if (t.matches('[data-chk]')) { const { b, d } = blkOf(t); b.checked = t.checked; d.classList.toggle('done', t.checked); save(); return; }
  if (t.closest('[data-tg]')) { const { b, d } = blkOf(t); b.open = !b.open; d.classList.toggle('open', b.open); save(); return; }
  if (t.closest('[data-annot]')) { annotate(blkOf(t).b); return; }
  if (t.closest('[data-redraw]')) { redraw(blkOf(t).b); return; }
  if (t.matches('[data-view]')) { viewImage(blkOf(t).b); return; }
  const tb = t.closest('[data-tbl]');
  if (tb) {
    const { b } = blkOf(t), R = b.rows, op = tb.dataset.tbl;
    if (op === 'row+') R.push(R[0].map(() => ''));
    if (op === 'col+') R.forEach(r => r.push(''));
    if (op === 'row-' && R.length > 1) R.pop();
    if (op === 'col-' && R[0].length > 1) R.forEach(r => r.pop());
    save(); paintBlocks(); return;
  }
  const o = t.closest('[data-open]'); if (o) openPage(o.dataset.open);
});
document.addEventListener('paste', e => {
  const ed = e.target.closest && e.target.closest('#blocks .ed'); if (!ed) return;
  const items = [...(e.clipboardData?.items || [])], img = items.find(it => it.type.startsWith('image/'));
  if (img) { e.preventDefault(); pendingImg = { refId: blkOf(ed).b.id, replace: false }; addImageFile(img.getAsFile()); return; }
  e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});

/* selection bubble: make card / cloze; remember range for the toolbar */
let fmtEl = null;
document.addEventListener('selectionchange', () => {
  const s = getSelection();
  const ed = s.rangeCount && s.anchorNode ? (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement)?.closest('#blocks .ed') : null;
  if (ed) lastRange = s.getRangeAt(0).cloneRange();
  if (!ed || s.isCollapsed || !s.toString().trim()) { if (fmtEl) { fmtEl.remove(); fmtEl = null; } return; }
  const r = s.getRangeAt(0).getBoundingClientRect();
  if (!fmtEl) {
    fmtEl = document.createElement('div'); fmtEl.className = 'fmt';
    fmtEl.innerHTML = '<button data-f="card">★ Card</button><button data-f="cloze">Cloze</button><button data-f="mark">Highlight</button>';
    fmtEl.addEventListener('mousedown', ev => ev.preventDefault()); fmtEl.addEventListener('pointerdown', ev => ev.preventDefault());
    fmtEl.addEventListener('click', fmtClick); document.body.appendChild(fmtEl);
  }
  const fw = fmtEl.offsetWidth || 260;
  fmtEl.style.left = Math.max(8, Math.min(r.left + r.width / 2 - fw / 2, innerWidth - fw - 8)) + 'px';
  const below = r.bottom + 12, above = r.top - 54;
  fmtEl.style.top = (matchMedia('(pointer:coarse)').matches || above < 70 ? Math.min(below, innerHeight - 140) : above) + 'px';
});
function fmtClick(e) {
  const btn = e.target.closest('[data-f]'); if (!btn) return;
  const f = btn.dataset.f, s = getSelection(); if (!s.rangeCount) return;
  const txt = s.toString(), ed = (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement).closest('.ed');
  if (f === 'mark') { document.execCommand('styleWithCSS', false, true); document.execCommand('hiliteColor', false, '#fff3b0'); return; }
  const p = pageById(curPage), pre = caretOffsets(ed).pre ?? 0, full = ed.textContent;
  const start = full.substr(pre, txt.length) === txt ? pre : full.indexOf(txt);
  if (fmtEl) { fmtEl.remove(); fmtEl = null; }
  if (f === 'cloze') cardSheet({ front: full.slice(0, start) + '[[' + txt + ']]' + full.slice(start + txt.length), back: '', course: pageCourse(p), mod: pageMod(p), page: p.id });
  else cardSheet({ front: '', back: txt.trim(), course: pageCourse(p), mod: pageMod(p), page: p.id });
}

/* ---------- PDF export ---------- */
async function exportPDF(pages, title) {
  const urls = {};
  for (const p of pages) for (const b of p.blocks) if (b.file) urls[b.file] = await blobToDataURL(await fileGet(b.file) || new Blob());
  const html = pages.map((p, k) => {
    let n = 0;
    const body = p.blocks.map(b => { n = b.type === 'ol' ? n + 1 : 0; return blockHTML(b, n, true); }).join('').replace(/data-file="([^"]+)"/g, (m, id) => `src="${urls[id] || ''}"`);
    const c = pageCourse(p);
    return `<article class="print-page" ${k ? 'style="break-before:page"' : ''}><div class="print-meta">${c ? esc(courseName(c) + ' › ' + modName(c, pageMod(p))) : 'Study OS'}</div><h1>${p.icon} ${esc(p.title || 'Untitled')}</h1><div class="blocks" style="${p.font ? 'font-family:' + fontCSS(p.font) + ';' : ''}${p.size ? 'font-size:' + p.size + 'px' : ''}">${body}</div></article>`;
  }).join('');
  toast('Choose “Save as PDF” in the print screen');
  printHTML(title, html);
}
