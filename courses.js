/* Study OS — courses: grid, per-course dashboard with modules, notes, cards, questions */
let curCourse = null, curMod = null, courseTab = 'learn';
function courseLessons(cid, m) { const c = course(cid); if (!c) return []; const mods = m != null ? [m] : [...c.modules.map(x => x.id), null]; return mods.flatMap(mid => topPages(cid, mid).sort((a, b) => (a.order ?? a.created) - (b.order ?? b.created))); }
function nextLesson(p) { const c = pageCourse(p); if (!c || p.parent) return null; const L = courseLessons(c); const i = L.findIndex(x => x.id === p.id); return i >= 0 ? L[i + 1] || null : null; }
function courseProgress(cid, m) { const L = courseLessons(cid, m); return { done: L.filter(x => x.done).length, total: L.length, next: L.find(x => !x.done) }; }
function openCourse(id, mod) { curCourse = id; curMod = mod === undefined ? null : mod; S.settings.lastCourse = id; save(); go('course'); }
const inScope = (x, c, m) => (x.course || x.tr) === c && (m == null || (x.mod || null) === m);
const cardsIn = (c, m) => S.cards.filter(x => x.tr === c && (m == null || (x.mod || null) === m));
const qsIn = (c, m) => S.questions.filter(x => inScope(x, c, m));

V.courses = () => {
  app.innerHTML = `<h1>Courses</h1><p class="sub">Each course has modules, notes, flashcards and questions.</p>
  <div class="cgrid">${S.courses.map(c => {
    const due = dueCards({ course: c.id }), n = due.rev.length + due.nw.length, cards = cardsIn(c.id), strong = cards.filter(x => x.state === 'review' && x.s >= 21).length;
    return `<button class="ctile" data-c="${c.id}" style="--cc:${c.color}"><span class="cicon">${c.icon}</span><b>${esc(c.name)}</b><small>${c.modules.length} modules · ${courseProgress(c.id).done}/${courseProgress(c.id).total} lessons · ${cards.length} cards</small><div class="bar"><i style="width:${cards.length ? Math.round(strong / cards.length * 100) : 0}%;background:${c.color}"></i></div><span class="cdue">${n ? n + ' due' : '✓'}</span></button>`;
  }).join('')}<button class="ctile add" id="cAdd"><span class="cicon">＋</span><b>New course</b><small>Any subject or skill</small></button></div>
  <div class="row" style="margin-top:14px"><button id="allCards">All flashcards</button><button id="allQ">Mixed quiz (all courses)</button></div>`;
  $$('[data-c]').forEach(b => b.onclick = () => openCourse(b.dataset.c));
  $('#cAdd').onclick = () => courseSheet(null);
  $('#allCards').onclick = () => go('cards');
  $('#allQ').onclick = () => runQuiz(questionItems(shuffle(S.questions).slice(0, 20)), 'Mixed quiz', { mode: 'questions', shuffleOpts: true });
};

V.course = () => {
  const c = course(curCourse || S.settings.lastCourse); if (!c) { go('courses'); return; }
  curCourse = c.id; if (curMod && !c.modules.some(m => m.id === curMod) && curMod !== '') curMod = null;
  const m = curMod, due = dueCards({ course: c.id, mod: m }), nDue = due.rev.length + due.nw.length;
  const cards = cardsIn(c.id, m), qs = qsIn(c.id, m), pages = m == null ? pagesIn(c.id) : pagesIn(c.id, m);
  const strong = cards.filter(x => x.state === 'review' && x.s >= 21).length;
  const quiz = (S.quizzes || []).filter(z => z.course === c.id && (m == null || z.mod === m)).slice(-1)[0];
  const pr = courseProgress(c.id, m), pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0;
  app.innerHTML = `
  <div class="chead" style="--cc:${c.color}"><button class="cback" id="cBack">${I('chevL')} Courses</button>
    <div class="chrow"><span class="cicon big">${c.icon}</span><div><h1 style="margin:0">${esc(c.name)}</h1><p class="sub">${m == null ? 'All modules' : esc(modName(c.id, m))}</p></div><button id="cEdit">Edit</button></div>
    <div class="cprog"><div class="bar"><i style="width:${pct}%;background:${c.color}"></i></div><small>${pr.done}/${pr.total} lessons · ${pct}%</small>${pr.next ? `<button class="btn-blue" id="cCont">${I('play')} ${pr.done ? 'Continue' : 'Start'}: ${esc(pr.next.title || 'Untitled')}</button>` : (pr.total ? '<b>Course complete 🎉</b>' : '')}</div></div>
  <div class="chips">${[{ id: null, name: 'All' }, ...c.modules].map(x => `<button data-m="${x.id ?? ''}" class="${(m ?? '') === (x.id ?? '') ? 'on' : ''}" style="${(m ?? '') === (x.id ?? '') ? `background:${c.color};color:#fff` : ''}">${esc(x.name)}</button>`).join('')}<button id="mAdd">+ Module</button></div>
  <div class="stats" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div class="stat"><b>${nDue}</b><span>due</span></div><div class="stat"><b>${cards.length ? Math.round(strong / cards.length * 100) : 0}%</b><span>strong</span></div><div class="stat"><b>${pages.length}</b><span>notes</span></div><div class="stat"><b>${quiz ? Math.round(quiz.right / quiz.n * 100) + '%' : '–'}</b><span>last quiz</span></div></div>
  <div class="study">
    <button data-s="review" style="--cc:${c.color}">${I('cards')}<b>Review</b><small>${nDue} cards due</small></button>
    <button data-s="questions" style="--cc:${c.color}">${I('quiz')}<b>Practice questions</b><small>${qs.length} questions</small></button>
    <button data-s="test" style="--cc:${c.color}">${I('checkc')}<b>Test</b><small>from ${cards.length} cards</small></button>
    <button data-s="match" style="--cc:${c.color}">${I('timer')}<b>Match</b><small>${S.settings.matchBest && S.settings.matchBest[c.id] ? 'best ' + S.settings.matchBest[c.id].toFixed(1) + 's' : 'beat the clock'}</small></button>
  </div>
  <div class="seg" id="cSeg" style="margin-top:18px">${[['learn', 'Curriculum'], ['notes', 'Notes · ' + pages.length], ['cards', 'Cards · ' + cards.length], ['questions', 'Questions · ' + qs.length], ...(m == null ? [['modules', 'Modules']] : [])].map(t => `<button data-t="${t[0]}" class="${courseTab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
  <div id="cBody"></div>`;
  $('#cBack').onclick = () => go('courses');
  $('#cEdit').onclick = () => courseSheet(c);
  const cc = $('#cCont'); if (cc) cc.onclick = () => openPage(pr.next.id);
  $('#mAdd').onclick = () => moduleSheet(c, null);
  $$('.chips [data-m]').forEach(b => b.onclick = () => { curMod = b.dataset.m || null; if (curMod && courseTab === 'modules') courseTab = 'learn'; V.course(); });
  $$('#cSeg [data-t]').forEach(b => b.onclick = () => { courseTab = b.dataset.t; V.course(); });
  $$('.study [data-s]').forEach(b => b.onclick = () => {
    const s = b.dataset.s, ctx = { course: c.id, mod: m, mode: s }, title = c.name + (m ? ' · ' + modName(c.id, m) : '');
    if (s === 'review') { if (!nDue) { toast('Nothing due here ✓'); return; } startSession(due.rev, due.nw); }
    if (s === 'questions') { if (!qs.length) { questionSheet({ course: c.id, mod: m, onSaved: V.course }); toast('Add your first question'); return; } runQuiz(questionItems(shuffle(qs)), title + ' · questions', Object.assign(ctx, { shuffleOpts: true })); }
    if (s === 'test') testSheet(cards, title, ctx);
    if (s === 'match') runMatch(cards, ctx);
  });
  paintCourseBody(c, m, pages, cards, qs);
};
function paintCourseBody(c, m, pages, cards, qs) {
  const box = $('#cBody'); if (courseTab === 'modules' && m != null) courseTab = 'learn';
  if (courseTab === 'learn') {
    const mods = m != null ? [c.modules.find(x => x.id === m)] : [...c.modules, { id: null, name: 'General' }];
    box.innerHTML = mods.filter(Boolean).map(x => { const L = topPages(c.id, x.id).sort((a, b) => (a.order ?? a.created) - (b.order ?? b.created)); if (x.id === null && !L.length) return ''; const d = L.filter(l => l.done).length;
      return `<div class="section"><div class="sechead"><b>${esc(x.name)}</b><small class="muted">${d}/${L.length} lessons</small><button class="iconbtn" data-addl="${x.id || ''}" aria-label="Add lesson">${I('plus')}</button></div><div class="group">${L.length ? L.map((l, i) => `<div class="cell lesson" data-open="${l.id}"><button class="lcheck ${l.done ? 'on' : ''}" data-done="${l.id}" aria-label="Mark complete" style="color:${l.done ? c.color : ''}">${I(l.done ? 'checkc' : 'circle')}</button><span style="font-size:20px">${l.icon}</span><div class="grow"><b>${i + 1}. ${esc(l.title || 'Untitled')}</b><br><small>${l.blocks.some(b => b.type === 'link') ? 'Video / link · ' : ''}${l.blocks.length} blocks</small></div>${I('chev', 'muted')}</div>`).join('') : `<div class="cell muted">No lessons yet — tap + to add one.</div>`}</div></div>`; }).join('');
    $$('[data-addl]', box).forEach(b => b.onclick = () => { const p = newPage(null, '', '📄', null, c.id, b.dataset.addl || null); save(); openPage(p.id, true); });
    $$('[data-done]', box).forEach(b => b.onclick = e => { e.stopPropagation(); const l = pageById(b.dataset.done); l.done = !l.done; save(); V.course(); });
    $$('.lesson[data-open]', box).forEach(x => x.onclick = () => openPage(x.dataset.open));
    return;
  }
  if (courseTab === 'notes') {
    box.innerHTML = `<div class="row" style="margin:12px 0"><button class="btn-blue" id="nAdd">+ New note</button><button id="nPdf">⎙ Export PDF</button></div>
      <div class="group">${pages.length ? pages.sort((a, b) => b.updated - a.updated).map(p => `<div class="cell" data-open="${p.id}" style="cursor:pointer"><span style="font-size:22px">${p.icon}</span><div class="grow"><b>${esc(p.title || 'Untitled')}</b><br><small>${esc(modName(c.id, pageMod(p)))} · ${new Date(p.updated).toLocaleDateString('en-GB')}</small></div><button class="iconbtn danger" data-ptr="${p.id}" aria-label="Move to trash">${I('trash')}</button></div>`).join('') : '<div class="cell muted">No notes here yet.</div>'}</div>`;
    $('#nAdd').onclick = () => { const p = newPage(null, '', '📄', null, c.id, m); S.settings.expanded['c:' + c.id] = true; S.settings.expanded['m:' + (m || c.id + '-gen')] = true; save(); openPage(p.id, true); };
    $('#nPdf').onclick = () => { if (!pages.length) { toast('No notes to export'); return; } const order = []; const add = p => { order.push(p); kids(p.id).forEach(add); }; pages.filter(p => !p.parent).forEach(add); exportPDF(order, c.name + (m ? ' - ' + modName(c.id, m) : '')); };
    $$('[data-open]', box).forEach(x => x.onclick = e => { if (e.target.closest('[data-ptr]')) return; openPage(x.dataset.open); });
    $$('[data-ptr]', box).forEach(b => b.onclick = () => askTrash(pageById(b.dataset.ptr)));
  }
  if (courseTab === 'cards') {
    box.innerHTML = `<div class="row" style="margin:12px 0"><button class="btn-blue" id="kAdd">+ New card</button></div>
      <div class="group">${cards.length ? cards.slice(0, 200).map(k => `<div class="cell"><div class="grow" dir="auto">${esc(k.front)}<br><small>${esc(modName(c.id, k.mod))} · ${k.susp ? 'paused' : k.state === 'new' ? 'new' : 'next ' + new Date(k.due).toLocaleDateString('en-GB')}</small></div><button data-e="${k.id}">Edit</button><button class="iconbtn danger" data-kdel="${k.id}" aria-label="Delete card">${I('trash')}</button></div>`).join('') : '<div class="cell muted">No cards yet. Select text in a note → Card.</div>'}</div>`;
    $('#kAdd').onclick = () => cardSheet({ course: c.id, mod: m, onSaved: V.course });
    $$('[data-e]', box).forEach(b => b.onclick = () => editCard(S.cards.find(k => k.id === b.dataset.e), V.course));
    $$('[data-kdel]', box).forEach(b => b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.classList.add('confirm'); toast('Tap the bin again to delete'); return; } S.cards = S.cards.filter(k => k.id !== b.dataset.kdel); save(); V.course(); });
  }
  if (courseTab === 'questions') {
    box.innerHTML = `<div class="row" style="margin:12px 0"><button class="btn-blue" id="qAdd">+ New question</button></div>
      <div class="group">${qs.length ? qs.map(q => `<div class="cell"><div class="grow" dir="auto">${esc(q.q)}<br><small>${{ mcq: 'Multiple choice', sata: 'Select all', tf: 'True/False' }[q.type]} · ${esc(modName(c.id, q.mod))}${q.seen ? ` · ${Math.round((q.right || 0) / q.seen * 100)}% right` : ''}</small></div><button data-q="${q.id}">Edit</button><button class="iconbtn danger" data-qdel="${q.id}" aria-label="Delete question">${I('trash')}</button></div>`).join('') : '<div class="cell muted">No questions yet.</div>'}</div>`;
    $('#qAdd').onclick = () => questionSheet({ course: c.id, mod: m, onSaved: V.course });
    $$('[data-q]', box).forEach(b => b.onclick = () => questionSheet({ q: S.questions.find(q => q.id === b.dataset.q), onSaved: V.course }));
    $$('[data-qdel]', box).forEach(b => b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.classList.add('confirm'); toast('Tap the bin again to delete'); return; } S.questions = S.questions.filter(q => q.id !== b.dataset.qdel); save(); V.course(); });
  }
  if (courseTab === 'modules') {
    box.innerHTML = `<div class="group" style="margin-top:12px">${c.modules.map(x => { const d = dueCards({ course: c.id, mod: x.id }); return `<div class="cell" data-m="${x.id}" style="cursor:pointer"><div class="grow"><b>${esc(x.name)}</b><br><small>${pagesIn(c.id, x.id).length} notes · ${cardsIn(c.id, x.id).length} cards · ${qsIn(c.id, x.id).length} questions</small></div>${d.rev.length + d.nw.length ? `<span class="tag" style="background:${c.color}">${d.rev.length + d.nw.length} due</span>` : ''}<button data-me="${x.id}">Rename</button></div>`; }).join('')}</div>`;
    $$('[data-m]', box).forEach(r => r.onclick = e => { if (e.target.closest('[data-me]')) return; curMod = r.dataset.m; courseTab = 'learn'; V.course(); });
    $$('[data-me]', box).forEach(b => b.onclick = () => moduleSheet(c, c.modules.find(x => x.id === b.dataset.me)));
  }
}
function testSheet(cards, title, ctx) {
  if (cards.length < 2) { toast('Add a few cards first'); return; }
  sheet('Test settings', `<label>Number of questions</label><div class="seg" id="tN">${[10, 20, 30].map(n => `<button data-n="${n}" class="${n === 10 ? 'on' : ''}">${n}</button>`).join('')}<button data-n="999">All (${cards.length})</button></div>
    <label>Question types</label><div class="group">${[['mcq', 'Multiple choice'], ['tf', 'True / False'], ['written', 'Written (type the answer)']].map(k => `<label class="cell" style="margin:0;color:var(--ink);font-size:16px"><input type="checkbox" data-k="${k[0]}" checked style="width:22px;min-height:22px;flex:0 0 22px"> ${k[1]}</label>`).join('')}</div>
    <button class="btn-blue big" id="tGo" style="margin-top:12px">Start test</button>`, () => {
    let n = 10; $('#tN').onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; n = +b.dataset.n; $$('#tN button').forEach(x => x.classList.toggle('on', x === b)); };
    $('#tGo').onclick = () => { const kinds = $$('[data-k]').filter(i => i.checked).map(i => i.dataset.k); if (!kinds.length) { toast('Pick at least one type'); return; } closeSheet(); runQuiz(buildTest(cards, n, kinds), title + ' · test', ctx); };
  });
}
function courseSheet(c) {
  const isNew = !c; c = c || { id: 'c' + uid(), name: '', icon: '📘', color: PALETTE[S.courses.length % PALETTE.length], modules: [] };
  let icon = c.icon, color = c.color;
  sheet(isNew ? 'New course' : 'Edit course', `<label for="csN">Name</label><input id="csN" value="${esc(c.name)}" placeholder="e.g. Pharmacology, Python, IELTS">
    <label>Icon</label><div class="emojis" id="csI">${EMOJIS.map(e => `<button data-e="${e}" class="${e === icon ? 'on' : ''}">${e}</button>`).join('')}</div>
    <label>Colour</label><div class="swatches" id="csC">${PALETTE.map(p => `<button data-c="${p}" style="background:${p}" class="${p === color ? 'on' : ''}" aria-label="${p}"></button>`).join('')}</div>
    ${isNew ? '<label for="csM">Modules (one per line)</label><textarea id="csM" placeholder="Basics\nIntermediate\nProjects"></textarea>' : ''}
    <button class="btn-blue big" id="csOk" style="margin-top:12px">${isNew ? 'Create course' : 'Save'}</button>
    ${isNew ? '' : '<button id="csDel" class="danger" style="width:100%;margin-top:10px">Delete course</button>'}`, () => {
    $('#csI').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; icon = b.dataset.e; $$('#csI button').forEach(x => x.classList.toggle('on', x === b)); };
    $('#csC').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c; $$('#csC button').forEach(x => x.classList.toggle('on', x === b)); };
    $('#csOk').onclick = () => {
      const name = $('#csN').value.trim(); if (!name) { toast('Give the course a name'); return; }
      Object.assign(c, { name, icon, color });
      if (isNew) { c.modules = ($('#csM').value || '').split('\n').map(s => s.trim()).filter(Boolean).map(n => ({ id: 'm' + uid(), name: n })); S.courses.push(c); }
      save(); closeSheet(); openCourse(c.id);
    };
    const d = $('#csDel'); if (d) d.onclick = () => {
      if (!d.dataset.sure) { d.dataset.sure = 1; d.textContent = `Tap again: delete ${cardsIn(c.id).length} cards + ${qsIn(c.id).length} questions (notes move to General)`; return; }
      S.cards = S.cards.filter(k => k.tr !== c.id); S.questions = S.questions.filter(q => q.course !== c.id);
      S.pages.forEach(p => { if (!p.parent && p.course === c.id) { p.course = null; p.mod = null; } });
      S.courses = S.courses.filter(x => x !== c); save(); closeSheet(); go('courses');
    };
  });
}
function moduleSheet(c, mod) {
  sheet(mod ? 'Rename module' : 'New module', `<label for="msN">Module name</label><input id="msN" value="${esc(mod ? mod.name : '')}" placeholder="e.g. Grammar, Pharmacology, Stories">
    <button class="btn-blue big" id="msOk" style="margin-top:12px">${mod ? 'Save' : 'Add module'}</button>${mod ? '<button id="msDel" class="danger" style="width:100%;margin-top:10px">Delete module (items move to General)</button>' : ''}`, () => {
    setTimeout(() => $('#msN').focus(), 60);
    $('#msOk').onclick = () => { const n = $('#msN').value.trim(); if (!n) return; if (mod) mod.name = n; else { const x = { id: 'm' + uid(), name: n }; c.modules.push(x); curMod = x.id; } save(); closeSheet(); V.course(); };
    const d = $('#msDel'); if (d) d.onclick = () => { [...S.cards, ...S.questions, ...S.pages].forEach(x => { if (x.mod === mod.id) x.mod = null; }); c.modules = c.modules.filter(x => x !== mod); curMod = null; save(); closeSheet(); V.course(); };
  });
}
