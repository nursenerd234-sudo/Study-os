/* Study OS — Notion-style shell: sidebar workspace tree, drawer on phones, global search */
$$('[data-ic]').forEach(s => s.outerHTML = I(s.dataset.ic));
$('#menuBtn').innerHTML = I('side'); $('#searchBtn').innerHTML = I('search');
$('#menuBtn').onclick = () => openDrawer();
$('#searchBtn').onclick = () => searchSheet();
$('#sideScrim').onclick = () => closeDrawer();
function openDrawer() { document.body.classList.add('drawer'); }
function closeDrawer() { document.body.classList.remove('drawer'); }

const NAV_MAIN = [['today', 'home', 'Home'], ['calendar', 'cal', 'Calendar'], ['tasks', 'tasks', 'Tasks'], ['courses', 'grid', 'Courses'], ['cards', 'cards', 'Flashcards']];
const NAV_FOOT = [['plan', 'map', 'Study plan'], ['progress', 'gear', 'Progress & settings'], ['trash', 'trash', 'Trash']];
function renderSidebar() {
  const sb = $('#sidebar'); if (!sb || !S) return;
  const open = S.tasks.filter(t => !t.done && t.due && t.due <= today()).length, tr = (S.trash || []).length;
  const navItem = ([v, ic, label], extra) => `<a class="sbitem ${view === v || (v === 'courses' && view === 'course') ? 'on' : ''}" data-go="${v}">${I(ic)}<span>${label}</span>${extra ? `<small class="badge">${extra}</small>` : ''}</a>`;
  const keep = sb.querySelector('.sbscroll'), top = keep ? keep.scrollTop : 0;
  sb.innerHTML = `<div class="sbhead"><img src="icon-192.png" alt="" width="30" height="30"><b>Study OS</b><button class="iconbtn sbclose" id="sbClose" aria-label="Close sidebar">${I('chevL')}</button></div>
    <button class="sbsearch" id="sbSearch">${I('search')}<span>Search</span></button>
    <div class="sbscroll">
      <nav class="sbnav">${NAV_MAIN.map(n => navItem(n, n[0] === 'tasks' && open ? open : '')).join('')}</nav>
      <div class="sbsec"><span>Courses</span><button class="iconbtn" id="sbNewCourse" aria-label="New course">${I('plus')}</button></div>
      <div class="tree" id="sideTree">${treeHTML()}</div>
      <div class="sbsec"><span>Pages</span><button class="iconbtn" id="sbNewPage" aria-label="New page">${I('plus')}</button></div>
      <div class="tree">${topPages(null, null).map(p => pageRowHTML(p, 0)).join('') || '<p class="muted small" style="padding:0 12px">No loose pages</p>'}</div>
      <nav class="sbnav foot">${NAV_FOOT.map(n => navItem(n, n[0] === 'trash' && tr ? tr : '')).join('')}</nav>
    </div>`;
  const sc = sb.querySelector('.sbscroll'); sc.scrollTop = top;
  sb.onclick = sideClick;
  $$('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === view || (b.dataset.v === 'courses' && (view === 'course' || view === 'cards'))));
  const tt = $('#topTitle'); if (tt) tt.textContent = view === 'notes' && pageById(curPage) ? (pageById(curPage).title || 'Untitled') : view === 'course' && course(curCourse) ? course(curCourse).name : ({ today: 'Home', calendar: 'Calendar', tasks: 'Tasks', courses: 'Courses', cards: 'Flashcards', plan: 'Study plan', progress: 'Progress', trash: 'Trash' }[view] || 'Study OS');
}
function pageRowHTML(p, d) {
  const ex = S.settings.expanded, ks = kids(p.id), open = ks.length && (ex[p.id] ?? crumbsOf(pageById(curPage) || {}).some(c => c.id === p.id));
  return `<div class="trow ${p.id === curPage && view === 'notes' ? 'on' : ''}" style="padding-left:${8 + d * 14}px" data-p="${p.id}"><button class="tw" data-tw="${p.id}" data-open="${open ? 1 : 0}" aria-label="Expand">${ks.length ? I(open ? 'chevD' : 'chev') : ''}</button><span class="ic2">${p.icon}</span><span class="tt">${esc(p.title || 'Untitled')}</span>${p.done ? `<span class="tdone">${I('check')}</span>` : ''}<button class="tact" data-pm="${p.id}" aria-label="Page actions">${I('more')}</button></div>` + (open ? ks.map(k => pageRowHTML(k, d + 1)).join('') : '');
}
function treeHTML() {
  const ex = S.settings.expanded, cur = pageById(curPage), root = cur ? rootOf(cur) : null;
  return S.courses.map(c => {
    const kc = 'c:' + c.id, oc = ex[kc] ?? ((root && root.course === c.id) || (view === 'course' && curCourse === c.id));
    let h = `<div class="trow course ${view === 'course' && curCourse === c.id ? 'on' : ''}" data-course="${c.id}"><button class="tw" data-tg="${kc}" data-open="${oc ? 1 : 0}" aria-label="Expand">${I(oc ? 'chevD' : 'chev')}</button><span class="ic2">${c.icon}</span><span class="tt">${esc(c.name)}</span><button class="tact" data-addp="${c.id}|" aria-label="New page">${I('plus')}</button></div>`;
    if (!oc) return h;
    for (const m of [...c.modules, { id: null, name: 'General' }]) {
      const tp = topPages(c.id, m.id); if (m.id === null && !tp.length) continue;
      const km = 'm:' + (m.id || c.id + '-gen'), om = ex[km] ?? (root && root.course === c.id && (root.mod || null) === m.id);
      h += `<div class="trow mod" style="padding-left:22px" data-tg="${km}" data-open="${om ? 1 : 0}"><button class="tw" aria-label="Expand">${I(om ? 'chevD' : 'chev')}</button><span class="tt">${esc(m.name)}</span><small class="muted">${tp.length || ''}</small><button class="tact" data-addp="${c.id}|${m.id || ''}" aria-label="New page in module">${I('plus')}</button></div>`;
      if (om) h += tp.map(p => pageRowHTML(p, 2)).join('') || '<p class="muted small" style="padding-left:58px;margin:2px 0 6px">Empty</p>';
    }
    return h;
  }).join('');
}
function sideClick(e) {
  const ex = S.settings.expanded, t = e.target;
  if (t.closest('#sbClose')) { closeDrawer(); return; }
  if (t.closest('#sbSearch')) { searchSheet(); return; }
  if (t.closest('#sbNewCourse')) { courseSheet(null); return; }
  if (t.closest('#sbNewPage')) { const p = newPage(null, '', '📄'); save(); openPage(p.id, true); return; }
  const g = t.closest('[data-go]'); if (g) { closeDrawer(); go(g.dataset.go); return; }
  const add = t.closest('[data-addp]');
  if (add) { const [c, m] = add.dataset.addp.split('|'); const p = newPage(null, '', '📄', null, c || null, m || null); ex['c:' + c] = true; ex['m:' + (m || c + '-gen')] = true; save(); openPage(p.id, true); return; }
  const pm = t.closest('[data-pm]');
  if (pm) {
    const p = pageById(pm.dataset.pm), r = pm.getBoundingClientRect();
    menu(r.left, r.bottom + 4, [
      { icon: '↗', text: 'Open', fn: () => openPage(p.id) },
      { icon: '+', text: 'Add sub-page', fn: () => { const c = newPage(p.id, '', '📄'); p.blocks.push(newBlock('page', { page: c.id })); ex[p.id] = true; save(); openPage(c.id, true); } },
      ...(pageCourse(p) && !p.parent ? [{ icon: '✓', text: p.done ? 'Mark not complete' : 'Mark lesson complete', fn: () => { p.done = !p.done; save(); renderSidebar(); if (view === 'notes') paintPage(); if (view === 'course') V.course(); } }] : []),
      '-', { icon: '🗑', text: 'Move to trash', danger: true, fn: () => askTrash(p) }]);
    return;
  }
  const tg = t.closest('[data-tg]');
  if (tg) { ex[tg.dataset.tg] = tg.dataset.open !== '1'; save(); renderSidebar(); return; }
  const tw = t.closest('[data-tw]');
  if (tw && kids(tw.dataset.tw).length) { ex[tw.dataset.tw] = tw.dataset.open !== '1'; save(); renderSidebar(); return; }
  const cr = t.closest('[data-course]'); if (cr) { closeDrawer(); openCourse(cr.dataset.course); return; }
  const pr = t.closest('[data-p]'); if (pr) { openPage(pr.dataset.p); return; }
}

/* global search */
function searchSheet() {
  closeDrawer();
  sheet('Search', `<input id="gsQ" placeholder="Search pages, cards, questions, tasks" dir="auto" autocomplete="off"><div id="gsR" style="margin-top:12px"></div>`, () => {
    const q = $('#gsQ'); setTimeout(() => q.focus(), 60);
    const run = () => {
      const s = q.value.trim().toLowerCase(), R = $('#gsR'); if (!s) { R.innerHTML = '<p class="sub">Type to search everything.</p>'; return; }
      const pt = p => (p.title + ' ' + p.blocks.map(b => plain(b.html) + ' ' + plain(b.inner || '') + ' ' + (b.cap || '') + ' ' + (b.title || '') + ' ' + (b.rows || []).flat().map(plain).join(' ')).join(' ')).toLowerCase();
      const pages = S.pages.filter(p => pt(p).includes(s)).slice(0, 12), cards = S.cards.filter(c => (c.front + ' ' + c.back).toLowerCase().includes(s)).slice(0, 8);
      const qs = S.questions.filter(x => (x.q + ' ' + x.options.join(' ')).toLowerCase().includes(s)).slice(0, 6), tks = S.tasks.filter(t => t.title.toLowerCase().includes(s)).slice(0, 6);
      const sec = (n, l, f) => l.length ? `<h2>${n}</h2><div class="group">${l.map(f).join('')}</div>` : '';
      R.innerHTML = sec('Pages', pages, p => `<div class="cell" data-sp="${p.id}" style="cursor:pointer"><span style="font-size:20px">${p.icon}</span><div class="grow"><b>${esc(p.title || 'Untitled')}</b><br><small>${esc(courseName(pageCourse(p)))}</small></div></div>`)
        + sec('Flashcards', cards, c => `<div class="cell" data-sc="${c.id}" style="cursor:pointer"><div class="grow" dir="auto">${esc(c.front)}<br><small>${esc(courseName(c.tr))}</small></div></div>`)
        + sec('Questions', qs, x => `<div class="cell" data-sq="${x.id}" style="cursor:pointer"><div class="grow" dir="auto">${esc(x.q)}</div></div>`)
        + sec('Tasks', tks, t => `<div class="cell" data-st="${t.id}" style="cursor:pointer">${I(t.done ? 'checkc' : 'circle')}<div class="grow">${esc(t.title)}</div></div>`) || '<p class="sub">Nothing found.</p>';
      $$('[data-sp]', R).forEach(x => x.onclick = () => { closeSheet(); openPage(x.dataset.sp); });
      $$('[data-sc]', R).forEach(x => x.onclick = () => { closeSheet(); editCard(S.cards.find(c => c.id === x.dataset.sc), () => { }); });
      $$('[data-sq]', R).forEach(x => x.onclick = () => { closeSheet(); questionSheet({ q: S.questions.find(y => y.id === x.dataset.sq) }); });
      $$('[data-st]', R).forEach(x => x.onclick = () => { closeSheet(); taskSheet(S.tasks.find(t => t.id === x.dataset.st), () => V[view] && V[view]()); });
    };
    q.oninput = run; run();
  });
}
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchSheet(); } });
