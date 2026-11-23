/* Study OS — core: FSRS cards, Today, sessions, plan, progress, capture, backup */

/* ===== FSRS-4.5, two buttons: Forgot=1, Got it=3 ===== */
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5, FACTOR = 19 / 81, RET = 0.9;
const clampD = d => Math.min(10, Math.max(1, d));
const D0 = g => clampD(W[4] - (g - 3) * W[5]);
const Rt = (t, s) => Math.pow(1 + FACTOR * t / s, DECAY);
const ivl = s => Math.max(1, Math.round(s / FACTOR * (Math.pow(RET, 1 / DECAY) - 1)));
const nextD = (d, g) => clampD(W[7] * D0(4) + (1 - W[7]) * (d - W[6] * (g - 3)));
const sRecall = (d, s, r) => s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) + 1);
const sForget = (d, s, r) => Math.min(s, W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)));
function grade(c, g) {
  const now = Date.now(), L = log();
  if (c.state === 'new') { L.news++; c.s = W[g - 1]; c.d = D0(g); c.reps = 1; c.last = now; if (g === 1) { c.state = 'learning'; c.due = now; return true; } c.state = 'review'; c.due = now + DAY; return false; }
  if (c.state === 'learning') { if (g === 1) { c.due = now; return true; } c.state = 'review'; c.last = now; c.due = now + ivl(c.s) * DAY; return false; }
  const t = Math.max(0, (now - (c.last || now)) / DAY), r = Rt(t, c.s || 1);
  L.reviews++; c.reps = (c.reps || 0) + 1;
  if (g === 1) { c.lapses = (c.lapses || 0) + 1; c.s = sForget(c.d, c.s, r); c.d = nextD(c.d, 1); c.state = 'learning'; c.last = now; c.due = now; return true; }
  c.s = sRecall(c.d, c.s, r); c.d = nextD(c.d, 3); c.last = now; c.due = now + ivl(c.s) * DAY; return false;
}
function newCard(tr, front, back, speak, page, mod) { const c = { id: uid(), tr, mod: mod || null, front, back, speak: !!speak, state: 'new', s: 0, d: 0, due: 0, reps: 0, lapses: 0, last: 0, created: Date.now(), susp: false }; if (page) c.page = page; return c; }
function seedCards() { const out = []; for (const tr in SEED) for (const [f, b] of SEED[tr]) out.push(newCard(tr, f, b, tr === 'eng')); return out; }

/* ===== init + migration ===== */
async function init() {
  try { DBH = await idbOpen(); } catch (e) { STORE = 'memory'; }
  try { S = STORE === 'idb' ? await kvGet('state') : null; } catch (e) { STORE = 'memory'; }
  if (!S) { let old = null; try { old = JSON.parse(localStorage.getItem('studyos_v1')); } catch (e) { } S = old || { v: 1, cards: seedCards(), inbox: [], errors: [], blocks: [], logs: {}, settings: { newPerDay: 12, maxRev: 60, start: today(), easy: false } }; }
  upgrade();
  await save(true);
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  go(location.hash.slice(1) || 'today');
}
function upgrade() {
  S.inbox = S.inbox || []; S.errors = S.errors || []; S.blocks = S.blocks || []; S.logs = S.logs || {}; S.quizzes = S.quizzes || [];
  S.settings = Object.assign({ newPerDay: 12, maxRev: 60, start: today(), easy: false, theme: 'auto' }, S.settings || {});
  S.settings.expanded = S.settings.expanded || {};
  if (!S.courses) {
    S.courses = makeCourses();
    S.cards.forEach(c => { if (c.mod === undefined || c.mod === null) c.mod = guessModule(c.tr, c.front + ' ' + c.back); });
  }
  if (!S.questions) S.questions = seedQuestions();
  if (!S.pages) seedPages(); else migratePages();
  S.v = 3;
  applyTheme();
}

/* ===== routing ===== */
function go(v) {
  if (!V[v]) v = 'today';
  view = v; app.className = '';
  if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v);
  $$('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v || (b.dataset.v === 'courses' && (v === 'course' || v === 'cards'))));
  closeMenu(); V[v](); window.scrollTo(0, 0);
}
$$('nav.tabs button').forEach(b => b.onclick = () => { cur = null; if (b.dataset.v === 'notes' && view === 'notes') { V._openPage = false; } go(b.dataset.v); });
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== view && V[v]) { cur = null; go(v); } });

/* ===== helpers ===== */
function streak() { let n = 0, d = new Date(); const act = k => { const l = S.logs[k]; return l && (l.reviews + l.news > 0 || Object.keys(l.tasks).length > 0); }; if (!act(dkey(d))) d.setDate(d.getDate() - 1); while (act(dkey(d))) { n++; d.setDate(d.getDate() - 1); } return n; }
function dueCards(f) {
  const now = Date.now(), L = log(), easy = S.settings.easy, live = S.cards.filter(c => !c.susp && (!f || ((!f.course || c.tr === f.course) && (f.mod == null || (c.mod || null) === f.mod))));
  let rev = live.filter(c => c.state !== 'new' && c.due <= now).sort((a, b) => a.due - b.due);
  const revCap = Math.max(0, (easy ? 10 : S.settings.maxRev) - L.reviews), newCap = Math.max(0, (easy ? 3 : S.settings.newPerDay) - L.news);
  rev = rev.slice(0, revCap);
  const byTr = {}; live.filter(c => c.state === 'new').forEach(c => (byTr[c.tr] = byTr[c.tr] || []).push(c));
  const mix = []; let added = true; while (mix.length < newCap && added) { added = false; for (const t in byTr) if (byTr[t].length && mix.length < newCap) { mix.push(byTr[t].shift()); added = true; } }
  return { rev, nw: mix };
}
const renderCloze = (t, show) => esc(t).replace(/\[\[(.+?)\]\]/g, (m, x) => show ? `<span class="cz">${x}</span>` : '<span class="cz">[ … ]</span>');
function speak(t) { try { const u = new SpeechSynthesisUtterance(t.replace(/\[\[|\]\]/g, '').replace(/["()]/g, '')); u.lang = 'en-US'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { toast('Voice not available'); } }
const trackOpts = sel => courseOpts(sel);

/* ===== Today ===== */
V.today = () => {
  const { rev, nw } = dueCards(), L = log(), tasks = todayTasks(), easy = S.settings.easy, n = rev.length + nw.length;
  const shown = easy ? tasks.slice(0, 2) : tasks;
  const recent = [...S.pages].sort((a, b) => b.updated - a.updated).slice(0, 4);
  const d = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  app.innerHTML = `
  <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1 1 auto"><p class="sub">${d}</p><h1>${n ? 'Ready when you are.' : 'All caught up ✓'}</h1></div><button id="themeBtn" style="flex:0 0 auto" aria-label="Theme">${{ auto: '◐ Auto', light: '☀︎ Light', dark: '☾ Dark' }[S.settings.theme || 'auto']}</button></div>
  <div class="stats"><div class="stat"><b>${streak()}</b><span>day streak</span></div><div class="stat"><b>${n}</b><span>cards waiting</span></div><div class="stat"><b>${L.reviews + L.news}</b><span>done today</span></div></div>
  <div class="group pad">
    <button class="btn-blue big" id="start" ${n ? '' : 'disabled style="opacity:.45"'}>${n ? `Start session · ${n} cards` : 'No cards due'}</button>
    <button id="easy" style="width:100%;margin-top:10px">${easy ? 'Hard-day mode is ON · tap to turn off' : 'Hard day? Switch to 5-minute mode'}</button>
  </div>
  <h2>Today</h2>
  <div class="group">${shown.map(t => { const done = t.auto ? (L.reviews + L.news > 0 && !n) : !!L.tasks[t.id];
    return `<div class="task ${done ? 'done' : ''}"><input type="checkbox" data-t="${t.id}" ${done ? 'checked' : ''} ${t.auto ? 'disabled' : ''} aria-label="${esc(t.t)}"><div class="txt">${tag(t.tr)}<br><b>${esc(t.t)}</b><small>${esc(t.d)}</small></div></div>`; }).join('')}</div>
  ${S.inbox.length ? `<h2>Inbox · ${S.inbox.length}</h2><div class="group">${S.inbox.slice(0, 5).map(i => `<div class="cell"><div class="grow">${tag(i.tr)}<br>${esc(i.text)}</div><button data-mk="${i.id}">Card</button><button data-rm="${i.id}" aria-label="Done">✓</button></div>`).join('')}</div>` : ''}
  <h2>Courses</h2>
  <div class="cgrid small">${S.courses.map(c => { const d = dueCards({ course: c.id }), k = d.rev.length + d.nw.length; return `<button class="ctile" data-course="${c.id}" style="--cc:${c.color}"><span class="cicon">${c.icon}</span><b>${esc(c.name)}</b><span class="cdue">${k ? k + ' due' : '✓'}</span></button>`; }).join('')}</div>
  <h2>Recent notes</h2>
  <div class="group">${recent.map(p => `<div class="cell" data-open="${p.id}" style="cursor:pointer"><span style="font-size:22px">${p.icon}</span><div class="grow"><b>${esc(p.title || 'Untitled')}</b><br><small>${new Date(p.updated).toLocaleDateString('en-GB')}</small></div><span class="muted">›</span></div>`).join('')}</div>
  <h2>Focus timer</h2>
  <div class="group pad"><div class="timer" id="tm">25:00</div>
    <select id="tmTr" style="margin-top:8px">${trackOpts()}</select>
    <div class="row" style="margin-top:10px"><button data-min="15">15 min</button><button data-min="25" class="btn-blue">25 min</button><button id="tmStop">Stop</button></div></div>`;
  $('#start').onclick = () => n && startSession(rev, nw);
  $('#easy').onclick = () => { S.settings.easy = !S.settings.easy; save(); V.today(); };
  $('#themeBtn').onclick = () => { S.settings.theme = { auto: 'light', light: 'dark', dark: 'auto' }[S.settings.theme || 'auto']; applyTheme(); save(); V.today(); };
  $$('[data-course]').forEach(b => b.onclick = () => openCourse(b.dataset.course));
  $$('[data-t]').forEach(cb => cb.onchange = () => { const L = log(); if (cb.checked) L.tasks[cb.dataset.t] = 1; else delete L.tasks[cb.dataset.t]; save(); cb.closest('.task').classList.toggle('done', cb.checked); });
  $$('[data-min]').forEach(b => b.onclick = () => startTimer(+b.dataset.min));
  $('#tmStop').onclick = () => stopTimer(true);
  $$('[data-open]').forEach(c => c.onclick = () => { V._openPage = true; openPage(c.dataset.open); });
  $$('[data-rm]').forEach(b => b.onclick = () => { S.inbox = S.inbox.filter(i => i.id !== b.dataset.rm); save(); V.today(); });
  $$('[data-mk]').forEach(b => b.onclick = () => { const i = S.inbox.find(x => x.id === b.dataset.mk); cardSheet({ front: i.text, back: '', course: i.tr, onSaved: () => { S.inbox = S.inbox.filter(x => x !== i); save(); V.today(); } }); });
  paintTimer();
};

/* focus timer */
let tmEnd = 0, tmLen = 0, tmTrack = 'oph', tmInt = null;
function startTimer(m) { tmLen = m; tmEnd = Date.now() + m * 60000; tmTrack = ($('#tmTr') || {}).value || 'oph'; clearInterval(tmInt); tmInt = setInterval(paintTimer, 1000); paintTimer(); toast(m + ' minutes — one thing only.'); }
function stopTimer(manual) { if (!tmEnd) return; const mins = Math.round((tmLen * 60000 - (tmEnd - Date.now())) / 60000); if (mins > 0) { const L = log(); L.min[tmTrack] = (L.min[tmTrack] || 0) + mins; save(); } tmEnd = 0; clearInterval(tmInt); paintTimer(); if (manual) toast(mins > 0 ? `Logged ${mins} min` : 'Stopped'); }
function paintTimer() {
  let left = tmEnd ? Math.max(0, tmEnd - Date.now()) : 25 * 60000;
  if (tmEnd && left === 0) { const L = log(); L.min[tmTrack] = (L.min[tmTrack] || 0) + tmLen; save(); tmEnd = 0; clearInterval(tmInt); toast('Done! Logged ' + tmLen + ' min'); try { navigator.vibrate && navigator.vibrate(300); } catch (e) { } }
  const el = $('#tm'); if (el) el.textContent = String(Math.floor(left / 60000)).padStart(2, '0') + ':' + String(Math.floor(left % 60000 / 1000)).padStart(2, '0');
}

/* ===== review session ===== */
let Q = [], cur = null, shownAns = false, sessDone = 0;
function startSession(rev, nw) { Q = [...rev]; nw.forEach((c, i) => Q.splice(Math.min(Q.length, i * 3 + 1), 0, c)); sessDone = 0; nextCard(); }
function nextCard() { cur = Q.shift(); shownAns = false; if (!cur) { save(); sessionEnd(); return; } paintCard(); }
function paintCard() {
  const c = cur, cz = /\[\[.+?\]\]/.test(c.front);
  const front = cz ? renderCloze(c.front, false) : esc(c.front);
  const back = cz ? renderCloze(c.front, true) + (c.back ? '<br><small class="muted">' + esc(c.back) + '</small>' : '') : esc(c.back);
  const pg = c.page && pageById(c.page);
  app.innerHTML = `
  <div class="row" style="justify-content:space-between;margin-top:6px"><div style="flex:0 1 auto">${tag(c.tr)} ${c.state === 'new' ? '<small class="muted">new</small>' : ''}</div><small class="muted" style="flex:0 1 auto;text-align:right">${sessDone} done · ${Q.length + 1} left</small></div>
  <div class="group"><div class="flash">${shownAns && cz ? '' : front}</div>${shownAns ? `<div class="flash answer">${back}</div>` : ''}</div>
  ${c.speak ? '<button id="spk" style="width:100%;margin-bottom:10px">🔊 Hear it</button>' : ''}
  ${shownAns ? '<div class="grade"><button class="forgot" id="g1">Forgot</button><button class="got" id="g3">Got it</button></div>' : '<button class="btn-blue big" id="show">Show answer</button>'}
  <div class="row" style="margin-top:14px">${pg ? `<button id="toNote">${pg.icon} Open note</button>` : ''}<button id="edit">Edit card</button><button id="quit">End</button></div>`;
  const sp = $('#spk'); if (sp) sp.onclick = () => speak(c.front);
  if (shownAns) { $('#g1').onclick = () => doGrade(1); $('#g3').onclick = () => doGrade(3); }
  else $('#show').onclick = () => { shownAns = true; paintCard(); if (c.speak) speak(c.front); };
  $('#quit').onclick = () => { save(); sessionEnd(); };
  $('#edit').onclick = () => editCard(c, () => paintCard());
  const tn = $('#toNote'); if (tn) tn.onclick = () => { save(); cur = null; V._openPage = true; openPage(pg.id); };
}
function doGrade(g) { const again = grade(cur, g); sessDone++; if (again) Q.splice(Math.min(Q.length, 3), 0, cur); save(); nextCard(); }
function sessionEnd() { cur = null; app.innerHTML = `<h1>Session done ✓</h1><p class="sub">${sessDone} reviews. Small and daily beats big and rare.</p><div class="group pad"><button class="btn-blue big" id="back">Back to Today</button></div>`; $('#back').onclick = () => go('today'); }
document.addEventListener('keydown', e => { if (!cur || view !== 'today' || !$('.flash') || e.target.closest('input,textarea,[contenteditable]')) return; if (e.key === ' ' && !shownAns) { e.preventDefault(); shownAns = true; paintCard(); } else if (shownAns && e.key === '1') doGrade(1); else if (shownAns && (e.key === '2' || e.key === '3')) doGrade(3); });

/* ===== card sheet (used by Notes, Inbox, Cards) ===== */
function cardSheet(o) {
  const c0 = o.course || o.tr || (S.courses[0] || {}).id;
  sheet('New flashcard', `
    <div class="row"><div><label for="cfTr">Course</label><select id="cfTr">${courseOpts(c0)}</select></div><div><label for="cfM">Module</label><select id="cfM">${modOpts(c0, o.mod)}</select></div></div>
    <label for="cfF">Front — question, or a sentence with [[hidden part]]</label><textarea id="cfF" dir="auto">${esc(o.front || '')}</textarea>
    <label for="cfB">Back — answer (optional for cloze)</label><textarea id="cfB" dir="auto">${esc(o.back || '')}</textarea>
    <label style="display:flex;gap:10px;align-items:center;color:var(--ink)"><input type="checkbox" id="cfS" style="width:22px;min-height:22px" ${c0 === 'eng' ? 'checked' : ''}> Speak it (English)</label>
    <button class="btn-blue big" id="cfSave" style="margin-top:12px">Add card</button>`, () => {
    const f = $('#cfF'); setTimeout(() => (o.front ? $('#cfB') : f).focus(), 60);
    $('#cfTr').onchange = e => { $('#cfS').checked = e.target.value === 'eng'; $('#cfM').innerHTML = modOpts(e.target.value, null); };
    $('#cfSave').onclick = () => {
      const fr = f.value.trim(), bk = $('#cfB').value.trim();
      if (!fr) { toast('Write the front'); return; }
      if (!bk && !/\[\[.+?\]\]/.test(fr)) { toast('Add a back, or use [[cloze]]'); return; }
      S.cards.push(newCard($('#cfTr').value, fr, bk, $('#cfS').checked, o.page, $('#cfM').value || null)); save(); closeSheet(); toast('Card added ✓'); o.onSaved && o.onSaved();
    };
  });
}

/* ===== Cards view ===== */
let cardFilter = 'all', cardQ = '';
V.cards = () => {
  const list = S.cards.filter(c => (cardFilter === 'all' || c.tr === cardFilter) && (!cardQ || (c.front + ' ' + c.back).toLowerCase().includes(cardQ.toLowerCase())));
  app.innerHTML = `<button id="toCourses" style="margin-top:4px">‹ Courses</button><h1>All flashcards</h1><p class="sub">${S.cards.length} cards · select text in a note to make more</p>
  <div class="row" style="margin:14px 0"><button class="btn-blue" id="cNew">New card</button></div>
  <div class="seg">${[{ id: 'all', name: 'All' }, ...S.courses].map(t => `<button data-f="${t.id}" class="${cardFilter === t.id ? 'on' : ''}">${esc(t.name.replace('Health Informatics & AI', 'Informatics'))}</button>`).join('')}</div>
  <input id="cQ" placeholder="Search cards" value="${esc(cardQ)}" style="margin-top:10px">
  <div class="group">${list.length ? list.slice(0, 150).map(c => `<div class="cell"><div class="grow" dir="auto">${tag(c.tr)} <small>${esc(modName(c.tr, c.mod))} · ${c.susp ? 'paused' : c.state === 'new' ? 'new' : 'next ' + new Date(c.due).toLocaleDateString('en-GB')}</small><br>${esc(c.front)}</div><button data-e="${c.id}">Edit</button></div>`).join('') : '<div class="cell muted">No cards here yet.</div>'}</div>
  ${list.length > 150 ? `<p class="sub">Showing 150 of ${list.length}. Use search.</p>` : ''}`;
  $('#toCourses').onclick = () => go('courses');
  $('#cNew').onclick = () => cardSheet({ course: cardFilter === 'all' ? null : cardFilter, onSaved: V.cards });
  $$('[data-f]').forEach(b => b.onclick = () => { cardFilter = b.dataset.f; V.cards(); });
  const q = $('#cQ'); q.oninput = () => { cardQ = q.value; clearTimeout(q._t); q._t = setTimeout(() => { V.cards(); const n = $('#cQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); };
  $$('[data-e]').forEach(b => b.onclick = () => editCard(S.cards.find(c => c.id === b.dataset.e), V.cards));
};
function editCard(c, done) {
  sheet('Edit card', `<div class="row"><div><label for="eTr">Course</label><select id="eTr">${courseOpts(c.tr)}</select></div><div><label for="eM">Module</label><select id="eM">${modOpts(c.tr, c.mod)}</select></div></div>
  <label for="eF">Front</label><textarea id="eF">${esc(c.front)}</textarea>
  <label for="eB">Back</label><textarea id="eB">${esc(c.back)}</textarea>
  <label style="display:flex;gap:10px;align-items:center;color:var(--ink)"><input type="checkbox" id="eS" style="width:22px;min-height:22px" ${c.speak ? 'checked' : ''}> Speak it</label>
  <button class="btn-blue big" id="eSave" style="margin-top:12px">Save</button>
  <div class="row" style="margin-top:10px"><button id="eSusp">${c.susp ? 'Resume' : 'Pause'}</button><button id="eReset">Reset</button><button id="eDel" class="danger">Delete</button></div>`, () => {
    $('#eTr').onchange = e => $('#eM').innerHTML = modOpts(e.target.value, null);
    $('#eSave').onclick = () => { c.tr = $('#eTr').value; c.mod = $('#eM').value || null; c.front = $('#eF').value.trim() || c.front; c.back = $('#eB').value.trim(); c.speak = $('#eS').checked; save(); closeSheet(); toast('Saved'); done(); };
    $('#eSusp').onclick = () => { c.susp = !c.susp; save(); closeSheet(); toast(c.susp ? 'Paused' : 'Resumed'); if (c.susp && cur === c) nextCard(); else done(); };
    $('#eReset').onclick = () => { Object.assign(c, { state: 'new', s: 0, d: 0, due: 0, reps: 0, lapses: 0, last: 0 }); save(); closeSheet(); toast('Reset to new'); done(); };
    const del = $('#eDel'); del.onclick = () => { if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = 'Tap again'; return; } S.cards = S.cards.filter(x => x !== c); save(); closeSheet(); toast('Deleted'); if (cur === c) nextCard(); else done(); };
  });
}

/* ===== quick add (+) ===== */
$('#fab').onclick = () => {
  const p = view === 'notes' && curPage ? pageById(curPage) : null, cc = p ? pageCourse(p) : (view === 'course' ? curCourse : null), cm = p ? pageMod(p) : (view === 'course' ? curMod : null);
  sheet('Quick add', `<div class="seg" id="qaSeg"><button class="on" data-q="note">Note</button><button data-q="card">Card</button><button data-q="question">Question</button><button data-q="block">NCLEX block</button><button data-q="miss">Missed Q</button><button data-q="page">Page</button></div><div id="qaBody" style="margin-top:12px"></div>`, sc => {
    const body = $('#qaBody'), pane = {
      note: () => { body.innerHTML = `<label for="iT">Something from work to look up tonight</label><textarea id="iT" placeholder="e.g. Why trypan blue before capsulorhexis?"></textarea><label for="iTr">Track</label><select id="iTr">${courseOpts(cc || 'oph')}</select><button class="btn-blue big" id="iAdd" style="margin-top:12px">Save to inbox</button>`; setTimeout(() => $('#iT').focus(), 60); $('#iAdd').onclick = () => { const t = $('#iT').value.trim(); if (!t) return; S.inbox.unshift({ id: uid(), text: t, tr: $('#iTr').value, created: Date.now() }); save(); closeSheet(); toast('Saved to inbox'); if (view === 'today') V.today(); }; },
      card: () => { closeSheet(); cardSheet({ course: cc, mod: cm, page: p && p.id, onSaved: () => (V[view] && ['cards', 'course'].includes(view)) && V[view]() }); },
      question: () => { closeSheet(); questionSheet({ course: cc || 'nclex', mod: cm, onSaved: () => view === 'course' && V.course() }); },
      block: () => { const last = S.blocks.slice(-3).reverse(); body.innerHTML = `<div class="row"><div><label for="bN">Questions</label><input id="bN" type="number" inputmode="numeric" min="1"></div><div><label for="bC">Correct</label><input id="bC" type="number" inputmode="numeric" min="0"></div></div><button class="btn-blue big" id="bAdd" style="margin-top:12px">Log block</button>${last.length ? `<div class="group" style="margin-top:12px">${last.map(b => `<div class="cell"><span class="grow">${b.date}</span><b>${b.c}/${b.n} · ${Math.round(b.c / b.n * 100)}%</b></div>`).join('')}</div>` : ''}`; $('#bAdd').onclick = () => { const n = +$('#bN').value, c = +$('#bC').value; if (!n || c < 0 || c > n) { toast('Check the numbers'); return; } S.blocks.push({ date: today(), n, c }); log().tasks.nclex = 1; save(); closeSheet(); toast(`Logged ${Math.round(c / n * 100)}%`); if (view === 'today') V.today(); }; },
      miss: () => { body.innerHTML = `<label for="mTop">Topic</label><input id="mTop" placeholder="e.g. Hyperkalemia ECG"><label for="mWhy">Why I missed it</label><select id="mWhy"><option>Knowledge gap</option><option>Misread the question</option><option>Changed my answer</option><option>English / vocabulary</option></select><label for="mL">The lesson (becomes the card back)</label><textarea id="mL"></textarea><button class="btn-blue big" id="mAdd" style="margin-top:12px">Save + make card</button>`; $('#mAdd').onclick = () => { const top = $('#mTop').value.trim(), l = $('#mL').value.trim(); if (!top || !l) { toast('Add topic and lesson'); return; } S.errors.push({ id: uid(), date: today(), top, why: $('#mWhy').value, l }); S.cards.push(newCard('nclex', top + ' — key point?', l, false, null, null)); save(); closeSheet(); toast('Saved + card created'); }; },
      page: () => { closeSheet(); const np = p ? newPage(p.id, '', '📄') : newPage(null, '', '📄', null, cc, cm); if (p) { p.blocks.push(newBlock('page', { page: np.id })); S.settings.expanded[p.id] = true; } save(); V._openPage = true; openPage(np.id, true); }
    };
    pane.note();
    $('#qaSeg').onclick = e => { const b = e.target.closest('[data-q]'); if (!b) return; $$('#qaSeg button').forEach(x => x.classList.toggle('on', x === b)); pane[b.dataset.q](); };
  });
};

/* ===== Plan ===== */
V.plan = () => {
  const n = nclexToday(), w = wk(12);
  const list = (arr, i0) => arr.map((o, i) => `<div class="task ${i < i0 ? 'done' : ''}"><div class="txt"><b>${i === i0 ? '▶ ' : ''}Week ${i + 1}: ${esc(o[0])}</b><small>${esc(o[1])}</small></div></div>`).join('');
  app.innerHTML = `<h1>Plan</h1><p class="sub">You only need today's step. This is the map.</p>
  <h2>${tag('nclex')} NCLEX-RN · exam Nov–Dec 2027</h2>
  <div class="group"><div class="task"><div class="txt"><b>Now: ${esc(n.phase)}</b><small>${esc(n.detail)}</small></div></div>
   ${[['Phase 0 · Setup', '22 Nov – 31 Dec 2026'], ['Phase 1 · Foundation', 'Jan – Mar 2027'], ['Phase 2 · System review', 'Apr – Jul 2027'], ['Phase 3 · Question bank', 'Aug – mid-Oct 2027'], ['Phase 4 · Final readiness', 'mid-Oct – exam']].map(p => `<div class="task"><div class="txt"><b style="${n.phase.startsWith(p[0].split(' ·')[0]) ? 'color:var(--blue)' : ''}">${p[0]}</b><small>${p[1]}</small></div></div>`).join('')}</div>
  <h2>${tag('oph')} Ophthalmology · 12 weeks</h2><div class="group">${list(OPH, w)}</div>
  <h2>${tag('hi')} Health Informatics & AI · 12 weeks</h2><div class="group">${list(HI, w)}</div>
  <h2>${tag('eng')} English · weekly rhythm</h2><div class="group">${ENG.map((e, i) => `<div class="task"><div class="txt"><b style="${i === new Date().getDay() ? 'color:var(--blue)' : ''}">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}: ${esc(e[0])}</b><small>${esc(e[1])}</small></div></div>`).join('')}</div>
  <p class="sub">Goal: IELTS 6.5–7 / OET B by Sep 2027.</p>`;
};

/* ===== Progress + settings ===== */
V.progress = () => {
  const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const l = S.logs[dkey(d)]; days.push({ k: dkey(d), v: l ? l.reviews + l.news : 0 }); }
  const mx = Math.max(1, ...days.map(d => d.v));
  const strong = t => S.cards.filter(c => c.tr === t && c.state === 'review' && c.s >= 21).length, total = t => S.cards.filter(c => c.tr === t).length;
  const TR = S.courses.map(c => c.id);
  const mins = {}; Object.values(S.logs).forEach(l => { for (const t in l.min) mins[t] = (mins[t] || 0) + l.min[t]; });
  const last = S.blocks.slice(-5), avg = last.length ? Math.round(last.reduce((a, b) => a + b.c, 0) / last.reduce((a, b) => a + b.n, 0) * 100) : null;
  const why = {}; S.errors.forEach(e => why[e.why] = (why[e.why] || 0) + 1);
  app.innerHTML = `<h1>Progress</h1><p class="sub">Look once a week, not every day.</p>
  <div class="stats"><div class="stat"><b>${streak()}</b><span>day streak</span></div><div class="stat"><b>${avg === null ? '–' : avg + '%'}</b><span>NCLEX last 5</span></div><div class="stat"><b>${(S.quizzes || []).length}</b><span>quizzes done</span></div></div>
  <h2>Cards · last 14 days</h2><div class="group pad"><div class="chart">${days.map(d => `<div title="${d.k}: ${d.v}" style="height:${Math.round(d.v / mx * 100)}%"></div>`).join('')}</div><div class="row" style="justify-content:space-between;margin-top:6px"><small class="muted" style="flex:0 0 auto">2 weeks ago</small><small class="muted" style="flex:0 0 auto">today</small></div></div>
  <h2>Long-term memory</h2><div class="group">${TR.map(t => { const m = strong(t), n = total(t); return `<div class="cell" style="display:block"><div class="row" style="justify-content:space-between"><span style="flex:1 1 auto">${tag(t)}</span><small class="muted" style="flex:0 0 auto">${m}/${n} strong · ${mins[t] || 0} focus min</small></div><div class="bar" style="margin-top:8px"><i style="width:${n ? Math.round(m / n * 100) : 0}%"></i></div></div>`; }).join('')}</div>
  <p class="sub">"Strong" = remembered for 3+ weeks.</p>
  ${S.errors.length ? `<h2>Why I miss NCLEX questions</h2><div class="group">${Object.entries(why).map(([k, v]) => `<div class="cell"><span class="grow">${esc(k)}</span><b>${v}</b></div>`).join('')}</div>` : ''}
  <h2>Settings</h2><div class="group pad">
   <label>Appearance</label><div class="seg" id="sTheme">${[['auto', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']].map(t => `<button data-th="${t[0]}" class="${(S.settings.theme || 'auto') === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
   <div class="row"><div><label for="sN">New cards / day</label><input id="sN" type="number" min="0" value="${S.settings.newPerDay}"></div><div><label for="sR">Max reviews / day</label><input id="sR" type="number" min="5" value="${S.settings.maxRev}"></div></div>
   <label for="sD">Ophthalmology & Informatics plan start</label><input id="sD" type="date" value="${S.settings.start}">
   <button class="btn-blue" id="sSave" style="width:100%;margin-top:12px">Save settings</button></div>
  <h2>Backup</h2><div class="group pad">
   <p style="margin:0 0 10px">Everything (notes, drawings, images, cards) lives only on this tablet${STORE === 'memory' ? ' — <b class="danger">storage is blocked here, export now</b>' : ''}. Export every Friday to Google Drive.</p>
   <div class="row"><button id="exp" class="btn-blue">Export backup</button><button id="imp">Import backup</button></div>
   <small class="muted" id="expInfo"></small></div>`;
  $('#sSave').onclick = () => { S.settings.newPerDay = Math.max(0, +$('#sN').value || 0); S.settings.maxRev = Math.max(5, +$('#sR').value || 60); S.settings.start = $('#sD').value || S.settings.start; save(); toast('Saved'); };
  $('#exp').onclick = exportData;
  $('#sTheme').onclick = e => { const b = e.target.closest('[data-th]'); if (!b) return; S.settings.theme = b.dataset.th; applyTheme(); save(); V.progress(); };
  $('#imp').onclick = () => $('#importFile').click();
};
async function exportData() {
  $('#expInfo').textContent = 'Preparing…';
  const files = [];
  for (const [id, blob] of await fileAll()) files.push([id, await blobToDataURL(blob)]);
  const txt = JSON.stringify({ app: 'studyos', v: 3, exported: new Date().toISOString(), state: S, files });
  const name = 'studyos-backup-' + today() + '.json';
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { }
  $('#expInfo').textContent = `Saved ${name} (${(txt.length / 1048576).toFixed(1)} MB, ${files.length} images/drawings) to Downloads.`;
  toast('Backup downloaded');
}
$('#importFile').onchange = e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const d = JSON.parse(r.result);
      if (d.app === 'studyos' && d.state) { for (const [id, url] of d.files || []) await filePut(id, await dataURLToBlob(url)); S = d.state; }
      else if (d.cards && d.settings) S = d; else throw 0;
      upgrade(); await save(true); toast('Backup restored (' + S.cards.length + ' cards, ' + S.pages.length + ' notes)'); go('today');
    } catch (x) { toast('Not a valid backup file'); }
  };
  r.readAsText(f);
};

init();
