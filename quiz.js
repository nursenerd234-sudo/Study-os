/* Study OS — Quizlet-style study modes: practice questions, test from cards, match game, question editor */
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
const isCloze = c => /\[\[.+?\]\]/.test(c.front);
const cardAnswer = c => isCloze(c) ? [...c.front.matchAll(/\[\[(.+?)\]\]/g)].map(m => m[1]).join(', ') : (c.back || '');
const cardPrompt = c => isCloze(c) ? c.front.replace(/\[\[(.+?)\]\]/g, '_____') : c.front;
const norm = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) { const m = a.length, n = b.length; if (!m || !n) return Math.max(m, n); let prev = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; }
function closeEnough(input, ans) { const a = norm(ans), b = norm(input); if (!b) return false; if (a === b) return true; if (b.length >= 3 && a.includes(b) && b.length >= a.length * .6) return true; return 1 - lev(a, b) / Math.max(a.length, b.length) >= .8; }

function buildTest(cards, n, kinds) {
  const pool = shuffle(cards.filter(c => !c.susp && cardAnswer(c).trim())).slice(0, n);
  const answers = [...new Set(cards.map(cardAnswer).filter(Boolean))];
  return pool.map(c => {
    const ans = cardAnswer(c), others = shuffle(answers.filter(a => a !== ans));
    let kind = kinds[Math.floor(Math.random() * kinds.length)];
    if ((kind === 'mcq' && others.length < 3) || (kind === 'tf' && !others.length)) kind = 'written';
    const base = { prompt: cardPrompt(c), rationale: c.back && isCloze(c) ? c.back : '', src: { card: c.id }, answer: ans };
    if (kind === 'mcq') { const opts = shuffle([ans, ...others.slice(0, 3)]); return Object.assign(base, { kind: 'mcq', options: opts, correct: [opts.indexOf(ans)], label: 'Choose the answer' }); }
    if (kind === 'tf') { const truth = Math.random() < .5, shown = truth ? ans : others[0]; return Object.assign(base, { kind: 'mcq', prompt: base.prompt + '\n\n→ ' + shown, options: ['True', 'False'], correct: [truth ? 0 : 1], label: 'True or false?' }); }
    return Object.assign(base, { kind: 'written', label: 'Type the answer' });
  });
}
function questionItems(qs) {
  return qs.map(q => ({ kind: q.type === 'sata' ? 'sata' : 'mcq', prompt: q.q, options: q.options, correct: q.correct, rationale: q.rationale, src: { q: q.id }, label: q.type === 'sata' ? 'Select all that apply' : q.type === 'tf' ? 'True or false?' : 'Choose the best answer', answer: q.correct.map(i => q.options[i]).join(' · ') }));
}

let QZ = null;
function runQuiz(items, title, ctx) {
  if (!items.length) { toast('Nothing to quiz yet — add cards or questions first'); return; }
  QZ = { items, i: 0, right: 0, missed: [], title, ctx, picked: new Set(), checked: false, shuf: items.map(it => it.kind === 'written' ? null : (ctx.shuffleOpts && it.options.length > 2 ? shuffle(it.options.map((_, k) => k)) : it.options.map((_, k) => k))) };
  paintQuiz();
}
function paintQuiz() {
  const z = QZ, it = z.items[z.i], order = z.shuf[z.i];
  const opt = (k, pos) => { const cls = z.checked ? (it.correct.includes(k) ? 'right' : z.picked.has(k) ? 'wrong' : '') : (z.picked.has(k) ? 'picked' : ''); return `<button class="opt ${cls}" data-o="${k}"><span class="ok">${it.kind === 'sata' ? (z.picked.has(k) ? '☑' : '☐') : String.fromCharCode(65 + pos)}</span><span>${esc(it.options[k])}</span></button>`; };
  app.innerHTML = `
    <div class="row" style="justify-content:space-between;margin-top:6px"><b style="flex:1 1 auto">${esc(z.title)}</b><small class="muted" style="flex:0 0 auto">${z.i + 1} / ${z.items.length}</small><button id="qzEnd" style="flex:0 0 auto">End</button></div>
    <div class="bar" style="margin:10px 0 14px"><i style="width:${Math.round(z.i / z.items.length * 100)}%"></i></div>
    <div class="group pad"><small class="muted">${esc(it.label)}</small><div class="qtext" dir="auto">${esc(it.prompt)}</div></div>
    ${it.kind === 'written' ? `<input id="qzIn" placeholder="Your answer" dir="auto" ${z.checked ? 'disabled' : ''} value="${esc(z.typed || '')}">` : `<div class="opts">${order.map((k, pos) => opt(k, pos)).join('')}</div>`}
    ${z.checked ? `<div class="group pad fb ${z.lastOk ? 'good' : 'bad'}"><b>${z.lastOk ? 'Correct ✓' : 'Not quite'}</b>${!z.lastOk ? `<div>Answer: <b>${esc(it.answer)}</b></div>` : ''}${it.rationale ? `<div class="muted" style="margin-top:6px">${esc(it.rationale)}</div>` : ''}</div>
      <div class="row">${it.kind === 'written' && !z.lastOk ? '<button id="qzOverride">I was right</button>' : ''}<button class="btn-blue big" id="qzNext">${z.i + 1 < z.items.length ? 'Next' : 'See results'}</button></div>`
      : (it.kind === 'mcq' ? '' : '<button class="btn-blue big" id="qzCheck">Check</button>')}`;
  $('#qzEnd').onclick = endQuiz;
  if (!z.checked) {
    $$('.opt').forEach(b => b.onclick = () => { const k = +b.dataset.o; if (it.kind === 'sata') { z.picked.has(k) ? z.picked.delete(k) : z.picked.add(k); paintQuiz(); } else { z.picked = new Set([k]); check(); } });
    const c = $('#qzCheck'); if (c) c.onclick = check;
    const inp = $('#qzIn'); if (inp) { inp.focus(); inp.oninput = () => z.typed = inp.value; inp.onkeydown = e => { if (e.key === 'Enter') check(); }; }
  } else {
    $('#qzNext').onclick = next;
    const o = $('#qzOverride'); if (o) o.onclick = () => { z.right++; z.missed.pop(); z.lastOk = true; record(it, true, true); next(); };
  }
}
function check() {
  const z = QZ, it = z.items[z.i];
  let ok;
  if (it.kind === 'written') ok = closeEnough(z.typed || '', it.answer);
  else { if (!z.picked.size) { toast('Pick an answer'); return; } ok = it.correct.length === z.picked.size && it.correct.every(k => z.picked.has(k)); }
  z.checked = true; z.lastOk = ok;
  if (ok) z.right++; else z.missed.push(it);
  record(it, ok);
  paintQuiz();
}
function record(it, ok, fix) {
  if (it.src.q) { const q = S.questions.find(x => x.id === it.src.q); if (q) { if (!fix) q.seen = (q.seen || 0) + 1; if (ok) q.right = (q.right || 0) + 1; } }
  save();
}
function next() { const z = QZ; z.i++; z.picked = new Set(); z.checked = false; z.typed = ''; if (z.i >= z.items.length) endQuiz(); else paintQuiz(); }
function endQuiz() {
  const z = QZ; if (!z) return;
  const n = Math.min(z.items.length, z.i + (z.checked ? 1 : 0));
  if (!n) { QZ = null; z.ctx.course ? openCourse(z.ctx.course, z.ctx.mod) : go('today'); return; }
  const pct = Math.round(z.right / n * 100);
  S.quizzes = S.quizzes || []; S.quizzes.push({ date: today(), course: z.ctx.course || null, mod: z.ctx.mod || null, mode: z.ctx.mode, n, right: z.right });
  if (z.ctx.course === 'nclex') log().tasks.nclex = 1;
  save();
  app.innerHTML = `<h1>${pct}%</h1><p class="sub">${z.right} of ${n} correct · ${esc(z.title)}</p>
    <div class="group pad"><div class="bar" style="height:12px"><i style="width:${pct}%;background:${pct >= 70 ? 'var(--ok)' : pct >= 50 ? 'var(--eng)' : 'var(--bad)'}"></i></div></div>
    ${z.missed.length ? `<h2>Review these</h2><div class="group">${z.missed.map(m => `<div class="cell" style="display:block"><div dir="auto">${esc(m.prompt.split('\n\n→')[0])}</div><small>Answer: <b>${esc(m.answer)}</b></small></div>`).join('')}</div>` : '<p class="sub">Perfect round. 🎉</p>'}
    <div class="row" style="margin-top:14px">${z.missed.length ? '<button id="qzRetry" class="btn-blue">Retry missed</button>' : ''}${z.missed.some(m => m.src.q) ? '<button id="qzCards">Make cards from missed</button>' : ''}<button id="qzDone">Done</button></div>`;
  const missed = z.missed, ctx = z.ctx, title = z.title; QZ = null;
  const r = $('#qzRetry'); if (r) r.onclick = () => runQuiz(missed.map(m => Object.assign({}, m)), title + ' · retry', ctx);
  const c = $('#qzCards'); if (c) c.onclick = () => { missed.filter(m => m.src.q).forEach(m => { const q = S.questions.find(x => x.id === m.src.q); S.cards.push(newCard(q.course, q.q, m.answer + (q.rationale ? '\n' + q.rationale : ''), false, null, q.mod)); }); save(); toast('Cards created'); c.disabled = true; };
  $('#qzDone').onclick = () => ctx.course ? openCourse(ctx.course, ctx.mod) : go('today');
}

/* Match game */
function runMatch(cards, ctx) {
  const pool = shuffle(cards.filter(c => !c.susp && cardAnswer(c) && cardAnswer(c).length <= 70 && cardPrompt(c).length <= 90)).slice(0, 6);
  if (pool.length < 3) { toast('Need at least 3 short cards for Match'); return; }
  const tiles = shuffle(pool.flatMap(c => [{ id: c.id, t: cardPrompt(c), k: 'q' }, { id: c.id, t: cardAnswer(c), k: 'a' }]));
  const t0 = Date.now(); let first = null, left = pool.length, timer;
  app.innerHTML = `<div class="row" style="justify-content:space-between;margin-top:6px"><b style="flex:1 1 auto">Match</b><span class="timer" id="mT" style="font-size:28px;flex:0 0 auto">0.0s</span><button id="mEnd" style="flex:0 0 auto">End</button></div>
    <p class="sub">Tap a term, then its match.</p><div class="mgrid">${tiles.map((x, i) => `<button class="mtile" data-i="${i}" dir="auto">${esc(x.t)}</button>`).join('')}</div>`;
  timer = setInterval(() => { const el = $('#mT'); if (!el) { clearInterval(timer); return; } el.textContent = ((Date.now() - t0) / 1000).toFixed(1) + 's'; }, 100);
  $('#mEnd').onclick = () => { clearInterval(timer); ctx.course ? openCourse(ctx.course, ctx.mod) : go('today'); };
  $('.mgrid').onclick = e => {
    const b = e.target.closest('.mtile'); if (!b || b.classList.contains('gone')) return;
    const x = tiles[+b.dataset.i];
    if (!first) { first = { b, x }; b.classList.add('sel'); return; }
    if (first.b === b) { b.classList.remove('sel'); first = null; return; }
    if (first.x.id === x.id && first.x.k !== x.k) {
      [first.b, b].forEach(t => { t.classList.remove('sel'); t.classList.add('gone'); }); first = null; left--;
      if (!left) {
        clearInterval(timer); const secs = (Date.now() - t0) / 1000;
        S.settings.matchBest = S.settings.matchBest || {}; const key = ctx.course || 'all', best = S.settings.matchBest[key];
        const rec = !best || secs < best; if (rec) S.settings.matchBest[key] = secs; save();
        app.innerHTML = `<h1>${secs.toFixed(1)}s</h1><p class="sub">${rec ? 'New best time! 🎉' : 'Best: ' + best.toFixed(1) + 's'}</p><div class="row" style="margin-top:14px"><button class="btn-blue" id="mAgain">Play again</button><button id="mDone">Done</button></div>`;
        $('#mAgain').onclick = () => runMatch(cards, ctx); $('#mDone').onclick = () => ctx.course ? openCourse(ctx.course, ctx.mod) : go('today');
      }
    } else { const a = first.b; [a, b].forEach(t => t.classList.add('bad')); setTimeout(() => [a, b].forEach(t => t.classList.remove('bad', 'sel')), 450); first = null; }
  };
}

/* Question editor */
function questionSheet(o) {
  const q = o.q || { type: 'mcq', q: '', options: ['', '', '', ''], correct: [0], rationale: '', course: o.course || 'nclex', mod: o.mod || null };
  let type = q.type, opts = [...q.options], corr = new Set(q.correct);
  const paint = () => {
    $('#qeOpts').innerHTML = (type === 'tf' ? ['True', 'False'] : opts).map((v, i) => `<div class="row" style="flex-wrap:nowrap;margin:6px 0"><input type="${type === 'sata' ? 'checkbox' : 'radio'}" name="qeC" data-c="${i}" ${corr.has(i) ? 'checked' : ''} style="width:24px;min-height:24px;flex:0 0 24px" aria-label="correct"><input data-v="${i}" value="${esc(v)}" placeholder="Option ${String.fromCharCode(65 + i)}" ${type === 'tf' ? 'disabled' : ''} style="flex:1 1 auto">${type !== 'tf' && opts.length > 2 ? `<button data-x="${i}" style="flex:0 0 auto" aria-label="remove">✕</button>` : ''}</div>`).join('') + (type !== 'tf' && opts.length < 8 ? '<button id="qeAdd">+ Option</button>' : '');
    $$('[data-v]').forEach(i => i.oninput = () => opts[+i.dataset.v] = i.value);
    $$('[data-c]').forEach(i => i.onchange = () => { const k = +i.dataset.c; if (type === 'sata') { i.checked ? corr.add(k) : corr.delete(k); } else corr = new Set([k]); });
    $$('[data-x]').forEach(b => b.onclick = () => { const k = +b.dataset.x; opts.splice(k, 1); corr = new Set([...corr].filter(x => x !== k).map(x => x > k ? x - 1 : x)); if (!corr.size) corr.add(0); paint(); });
    const a = $('#qeAdd'); if (a) a.onclick = () => { opts.push(''); paint(); };
  };
  sheet(o.q ? 'Edit question' : 'New question', `
    <div class="seg" id="qeType"><button data-t="mcq">Multiple choice</button><button data-t="sata">Select all</button><button data-t="tf">True / False</button></div>
    <div class="row"><div><label for="qeC">Course</label><select id="qeC">${courseOpts(q.course)}</select></div><div><label for="qeM">Module</label><select id="qeM">${modOpts(q.course, q.mod)}</select></div></div>
    <label for="qeQ">Question</label><textarea id="qeQ" dir="auto">${esc(q.q)}</textarea>
    <label>Options · mark the correct one${'s'}</label><div id="qeOpts"></div>
    <label for="qeR">Rationale (why)</label><textarea id="qeR" dir="auto">${esc(q.rationale || '')}</textarea>
    <button class="btn-blue big" id="qeSave" style="margin-top:12px">${o.q ? 'Save' : 'Add question'}</button>${o.q ? '<button id="qeDel" class="danger" style="width:100%;margin-top:10px">Delete question</button>' : ''}`, () => {
    const setType = t => { type = t; if (t === 'tf') { opts = ['True', 'False']; if (![...corr].every(k => k < 2)) corr = new Set([0]); } if (t === 'mcq' && corr.size > 1) corr = new Set([[...corr][0]]); $$('#qeType button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); paint(); };
    $('#qeType').onclick = e => { const b = e.target.closest('[data-t]'); if (b) setType(b.dataset.t); };
    $('#qeC').onchange = e => $('#qeM').innerHTML = modOpts(e.target.value, null);
    setType(type);
    $('#qeSave').onclick = () => {
      const text = $('#qeQ').value.trim(), options = type === 'tf' ? ['True', 'False'] : opts.map(s => s.trim()).filter(Boolean);
      if (!text || options.length < 2) { toast('Add the question and at least 2 options'); return; }
      const correct = [...corr].filter(k => k < options.length).sort(); if (!correct.length) { toast('Mark the correct answer'); return; }
      Object.assign(q, { type, q: text, options, correct, rationale: $('#qeR').value.trim(), course: $('#qeC').value, mod: $('#qeM').value || null });
      if (!o.q) { q.id = 'q' + uid(); q.seen = 0; q.right = 0; q.created = Date.now(); S.questions.push(q); }
      save(); closeSheet(); toast(o.q ? 'Saved' : 'Question added'); o.onSaved && o.onSaved();
    };
    const d = $('#qeDel'); if (d) d.onclick = () => { if (!d.dataset.sure) { d.dataset.sure = 1; d.textContent = 'Tap again to delete'; return; } S.questions = S.questions.filter(x => x !== q); save(); closeSheet(); o.onSaved && o.onSaved(); };
  });
}
