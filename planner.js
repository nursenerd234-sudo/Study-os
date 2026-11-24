/* Study OS — planner: to-do list, calendar (month + day agenda), trash */
const ymd = d => dkey(d);
const fromYmd = s => new Date(s + 'T00:00:00');
const addDays = (s, n) => { const d = fromYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const prettyDate = s => { if (!s) return ''; const t = today(); if (s === t) return 'Today'; if (s === addDays(t, 1)) return 'Tomorrow'; if (s === addDays(t, -1)) return 'Yesterday'; return fromYmd(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
const WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function parseQuick(text) { // "Revise pharm tomorrow" → due tomorrow
  let due = null, t = text;
  const m = t.match(/\b(today|tonight|tomorrow|next week|(?:on )?(sun|mon|tue|wed|thu|fri|sat)[a-z]*)\b/i);
  if (m) {
    const w = m[1].toLowerCase();
    if (w === 'today' || w === 'tonight') due = today(); else if (w === 'tomorrow') due = addDays(today(), 1); else if (w === 'next week') due = addDays(today(), 7);
    else { const k = WD.findIndex(d => d.startsWith((m[2] || '').toLowerCase())); if (k >= 0) { const diff = (k - new Date().getDay() + 7) % 7 || 7; due = addDays(today(), diff); } }
    t = t.replace(m[0], '').replace(/\s{2,}/g, ' ').trim();
  }
  return { title: t, due };
}
function newTask(o) { const t = Object.assign({ id: 'k' + uid(), title: '', notes: '', due: null, time: '', course: null, prio: 0, done: false, created: Date.now() }, o); S.tasks.push(t); return t; }
const prioIc = p => p ? `<span class="prio p${p}" aria-label="priority">${'!'.repeat(p)}</span>` : '';
function taskRow(t) {
  const over = t.due && !t.done && t.due < today();
  return `<div class="cell task-row ${t.done ? 'done' : ''}" data-task="${t.id}"><button class="tcheck" data-tdone="${t.id}" aria-label="Complete">${I(t.done ? 'checkc' : 'circle')}</button>
    <div class="grow"><span class="ttl" dir="auto">${prioIc(t.prio)}${esc(t.title)}</span><br><small class="${over ? 'danger' : ''}">${[t.due ? prettyDate(t.due) + (t.time ? ' · ' + t.time : '') : '', t.course ? courseName(t.course) : ''].filter(Boolean).join(' · ')}</small></div>
    <button class="iconbtn danger" data-tdel="${t.id}" aria-label="Delete task">${I('trash')}</button></div>`;
}
function bindTasks(root, rerender) {
  $$('[data-tdone]', root).forEach(b => b.onclick = e => { e.stopPropagation(); const t = S.tasks.find(x => x.id === b.dataset.tdone); t.done = !t.done; t.doneAt = t.done ? Date.now() : null; save(); if (t.done) toast('Done ✓'); rerender(); });
  $$('[data-tdel]', root).forEach(b => b.onclick = e => { e.stopPropagation(); S.tasks = S.tasks.filter(x => x.id !== b.dataset.tdel); save(); toast('Task deleted'); rerender(); });
  $$('[data-task]', root).forEach(r => r.onclick = () => taskSheet(S.tasks.find(x => x.id === r.dataset.task), rerender));
}
function taskSheet(t, done, preset) {
  const isNew = !t; t = t || Object.assign({ title: '', notes: '', due: today(), time: '', course: null, prio: 0 }, preset || {});
  sheet(isNew ? 'New task' : 'Task', `<label for="tkT">Task</label><input id="tkT" dir="auto" value="${esc(t.title)}" placeholder="e.g. 25 NCLEX pharm questions">
    <div class="row"><div><label for="tkD">Date</label><input id="tkD" type="date" value="${t.due || ''}"></div><div><label for="tkH">Time</label><input id="tkH" type="time" value="${t.time || ''}"></div></div>
    <div class="row"><div><label for="tkC">Course</label><select id="tkC"><option value="">None</option>${courseOpts(t.course)}</select></div><div><label>Priority</label><div class="seg" id="tkP">${['None', '!', '!!', '!!!'].map((x, i) => `<button data-p="${i}" class="${(t.prio || 0) === i ? 'on' : ''}">${x}</button>`).join('')}</div></div></div>
    <label for="tkN">Notes</label><textarea id="tkN" dir="auto">${esc(t.notes || '')}</textarea>
    <button class="btn-blue big" id="tkOk" style="margin-top:12px">${isNew ? 'Add task' : 'Save'}</button>${isNew ? '' : `<button class="danger" id="tkDel" style="width:100%;margin-top:10px">${I('trash')} Delete task</button>`}`, () => {
    let prio = t.prio || 0; setTimeout(() => isNew && $('#tkT').focus(), 60);
    $('#tkP').onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; prio = +b.dataset.p; $$('#tkP button').forEach(x => x.classList.toggle('on', x === b)); };
    $('#tkOk').onclick = () => {
      const title = $('#tkT').value.trim(); if (!title) { toast('Write the task'); return; }
      const vals = { title, due: $('#tkD').value || null, time: $('#tkH').value || '', course: $('#tkC').value || null, prio, notes: $('#tkN').value.trim() };
      if (isNew) newTask(vals); else Object.assign(t, vals);
      save(); closeSheet(); done && done();
    };
    const d = $('#tkDel'); if (d) d.onclick = () => { S.tasks = S.tasks.filter(x => x !== t); save(); closeSheet(); done && done(); };
  });
}

/* ===== Tasks view ===== */
let showDone = false;
V.tasks = () => {
  app.className = 'wide';
  const t0 = today(), open = S.tasks.filter(t => !t.done);
  const groups = [['Overdue', open.filter(t => t.due && t.due < t0)], ['Today', open.filter(t => t.due === t0)], ['Upcoming', open.filter(t => t.due && t.due > t0).sort((a, b) => a.due.localeCompare(b.due))], ['Someday', open.filter(t => !t.due)]];
  const doneL = S.tasks.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const sortP = l => l.sort((a, b) => (b.prio || 0) - (a.prio || 0) || (a.time || '').localeCompare(b.time || ''));
  app.innerHTML = `<h1>Tasks</h1><p class="sub">${open.length} open · type “tomorrow”, “friday”… and the date is set for you</p>
    <form class="quickadd" id="qa"><span>${I('plus')}</span><input id="qaIn" placeholder="Add a task" dir="auto" autocomplete="off"><select id="qaC" aria-label="Course"><option value="">No course</option>${courseOpts(null)}</select><button class="btn-blue">Add</button></form>
    ${groups.map(([n, l]) => l.length ? `<h2 class="${n === 'Overdue' ? 'danger' : ''}">${n} <small class="muted">${l.length}</small></h2><div class="group">${sortP(l).map(taskRow).join('')}</div>` : '').join('') || '<div class="empty">' + I('tasks', 'big') + '<p>No open tasks. Enjoy the calm.</p></div>'}
    ${doneL.length ? `<button id="tgDone" style="margin-top:18px">${showDone ? 'Hide' : 'Show'} completed (${doneL.length})</button>${showDone ? `<div class="group">${doneL.slice(0, 50).map(taskRow).join('')}</div><button class="danger" id="clrDone" style="margin-top:10px">${I('trash')} Clear completed</button>` : ''}` : ''}`;
  $('#qa').onsubmit = e => { e.preventDefault(); const v = $('#qaIn').value.trim(); if (!v) return; const q = parseQuick(v); newTask({ title: q.title || v, due: q.due, course: $('#qaC').value || null }); save(); V.tasks(); setTimeout(() => $('#qaIn').focus(), 30); };
  const tg = $('#tgDone'); if (tg) tg.onclick = () => { showDone = !showDone; V.tasks(); };
  const cd = $('#clrDone'); if (cd) cd.onclick = () => { S.tasks = S.tasks.filter(t => !t.done); save(); V.tasks(); };
  bindTasks(app, V.tasks);
};

/* ===== Calendar view ===== */
let calMonth = null, calDay = null;
function newEvent(o) { const ev = Object.assign({ id: 'e' + uid(), title: '', date: today(), time: '', end: '', course: null, notes: '' }, o); S.events.push(ev); return ev; }
function itemsOn(d) {
  const ev = S.events.filter(e => e.date === d).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const tk = S.tasks.filter(t => t.due === d);
  const rev = S.cards.filter(c => !c.susp && c.state !== 'new' && c.due && ymd(new Date(c.due)) === d).length;
  return { ev, tk, rev };
}
V.calendar = () => {
  app.className = 'wide';
  calMonth = calMonth || today().slice(0, 7); calDay = calDay || today();
  const [Y, M] = calMonth.split('-').map(Number), first = new Date(Y, M - 1, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const cells = []; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
  const t0 = today(), sel = itemsOn(calDay);
  app.innerHTML = `<div class="calwrap"><div class="calmain">
    <div class="calhead"><h1>${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h1><div class="row" style="flex:0 0 auto;flex-wrap:nowrap"><button class="iconbtn" id="cPrev" aria-label="Previous month">${I('chevL')}</button><button id="cToday">Today</button><button class="iconbtn" id="cNext" aria-label="Next month">${I('chev')}</button></div></div>
    <div class="calgrid">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="wd">${d}</div>`).join('')}
    ${cells.map(d => { const k = ymd(d), it = itemsOn(k), other = d.getMonth() !== M - 1;
      return `<button class="day ${other ? 'other' : ''} ${k === t0 ? 'today' : ''} ${k === calDay ? 'sel' : ''}" data-d="${k}"><span class="dn">${d.getDate()}</span>${it.ev.slice(0, 2).map(e => `<span class="pill" style="background:${(course(e.course) || {}).color || 'var(--blue)'}">${esc(e.title)}</span>`).join('')}${it.tk.filter(t => !t.done).slice(0, 2).map(t => `<span class="pill task">${esc(t.title)}</span>`).join('')}${it.ev.length + it.tk.length > 4 ? `<span class="more">+${it.ev.length + it.tk.length - 4}</span>` : ''}${it.rev ? `<span class="dot" title="${it.rev} cards due"></span>` : ''}</button>`; }).join('')}</div></div>
    <aside class="calside"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><h2 style="margin:0;flex:1 1 auto">${prettyDate(calDay)}</h2><button class="iconbtn" id="evAdd" aria-label="Add event">${I('plus')}</button></div>
      <p class="sub">${fromYmd(calDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${sel.rev ? ` · ${sel.rev} cards due` : ''}</p>
      <h2>Events</h2><div class="group">${sel.ev.length ? sel.ev.map(e => `<div class="cell" data-ev="${e.id}" style="cursor:pointer"><span class="evbar" style="background:${(course(e.course) || {}).color || 'var(--blue)'}"></span><div class="grow"><b dir="auto">${esc(e.title)}</b><br><small>${e.time ? e.time + (e.end ? '–' + e.end : '') : 'All day'}${e.course ? ' · ' + esc(courseName(e.course)) : ''}</small></div><button class="iconbtn danger" data-evdel="${e.id}" aria-label="Delete event">${I('trash')}</button></div>`).join('') : '<div class="cell muted">No events</div>'}</div>
      <h2>Tasks</h2><div class="group">${sel.tk.length ? sel.tk.map(taskRow).join('') : '<div class="cell muted">No tasks</div>'}</div>
      <div class="row" style="margin-top:12px"><button id="tkAddDay">${I('tasks')} Add task</button><button id="evAdd2">${I('cal')} Add event</button></div></aside></div>`;
  const shift = n => { const d = new Date(Y, M - 1 + n, 1); calMonth = ymd(d).slice(0, 7); V.calendar(); };
  $('#cPrev').onclick = () => shift(-1); $('#cNext').onclick = () => shift(1);
  $('#cToday').onclick = () => { calMonth = today().slice(0, 7); calDay = today(); V.calendar(); };
  $$('.day').forEach(b => b.onclick = () => { calDay = b.dataset.d; if (b.classList.contains('other')) calMonth = calDay.slice(0, 7); V.calendar(); if (innerWidth < 900) $('.calside').scrollIntoView({ behavior: 'smooth' }); });
  $('#evAdd').onclick = $('#evAdd2').onclick = () => eventSheet(null, V.calendar, { date: calDay });
  $('#tkAddDay').onclick = () => taskSheet(null, V.calendar, { due: calDay });
  $$('[data-ev]').forEach(r => r.onclick = e => { if (e.target.closest('[data-evdel]')) return; eventSheet(S.events.find(x => x.id === r.dataset.ev), V.calendar); });
  $$('[data-evdel]').forEach(b => b.onclick = () => { S.events = S.events.filter(x => x.id !== b.dataset.evdel); save(); toast('Event deleted'); V.calendar(); });
  bindTasks($('.calside'), V.calendar);
};
function eventSheet(ev, done, preset) {
  const isNew = !ev; ev = ev || Object.assign({ title: '', date: today(), time: '', end: '', course: null, notes: '' }, preset || {});
  sheet(isNew ? 'New event' : 'Event', `<label for="evT">Title</label><input id="evT" dir="auto" value="${esc(ev.title)}" placeholder="e.g. IELTS exam, Shift, Lecture">
    <label for="evD">Date</label><input id="evD" type="date" value="${ev.date}">
    <div class="row"><div><label for="evS">Starts</label><input id="evS" type="time" value="${ev.time || ''}"></div><div><label for="evE">Ends</label><input id="evE" type="time" value="${ev.end || ''}"></div></div>
    <label for="evC">Course</label><select id="evC"><option value="">None</option>${courseOpts(ev.course)}</select>
    <label for="evN">Notes</label><textarea id="evN" dir="auto">${esc(ev.notes || '')}</textarea>
    <button class="btn-blue big" id="evOk" style="margin-top:12px">${isNew ? 'Add event' : 'Save'}</button>${isNew ? '' : `<button class="danger" id="evDel" style="width:100%;margin-top:10px">${I('trash')} Delete event</button>`}`, () => {
    setTimeout(() => isNew && $('#evT').focus(), 60);
    $('#evOk').onclick = () => {
      const title = $('#evT').value.trim(); if (!title) { toast('Give it a title'); return; }
      const vals = { title, date: $('#evD').value || today(), time: $('#evS').value || '', end: $('#evE').value || '', course: $('#evC').value || null, notes: $('#evN').value.trim() };
      if (isNew) newEvent(vals); else Object.assign(ev, vals);
      save(); closeSheet(); done && done();
    };
    const d = $('#evDel'); if (d) d.onclick = () => { S.events = S.events.filter(x => x !== ev); save(); closeSheet(); done && done(); };
  });
}

/* ===== Trash ===== */
V.trash = () => {
  app.className = 'wide';
  const T = S.trash || [];
  app.innerHTML = `<h1>Trash</h1><p class="sub">Deleted pages wait here until you restore them or delete them forever.</p>
    ${T.length ? `<div class="group" style="margin-top:14px">${T.map(t => { const r = t.pages.find(p => p.id === t.rootId) || t.pages[0]; return `<div class="cell"><span style="font-size:22px">${r ? r.icon : '📄'}</span><div class="grow"><b>${esc(r ? r.title || 'Untitled' : 'Page')}</b><br><small>${t.pages.length > 1 ? t.pages.length + ' pages · ' : ''}${esc(courseName(t.course))} · deleted ${new Date(t.at).toLocaleDateString('en-GB')}</small></div><button data-rs="${t.id}">${I('restore')} Restore</button><button class="iconbtn danger" data-pg="${t.id}" aria-label="Delete forever">${I('trash')}</button></div>`; }).join('')}</div>
    <button class="danger" id="empty" style="margin-top:14px">${I('trash')} Empty trash</button>` : `<div class="empty">${I('trash', 'big')}<p>Trash is empty.</p></div>`}`;
  $$('[data-rs]').forEach(b => b.onclick = () => { restoreTrash(b.dataset.rs); toast('Restored'); renderSidebar(); V.trash(); });
  $$('[data-pg]').forEach(b => b.onclick = async () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.classList.add('confirm'); toast('Tap again to delete forever'); return; } await purgeTrash(b.dataset.pg); V.trash(); });
  const em = $('#empty'); if (em) em.onclick = async () => { if (!em.dataset.sure) { em.dataset.sure = 1; em.textContent = 'Tap again — this cannot be undone'; return; } for (const t of [...S.trash]) await purgeTrash(t.id); V.trash(); };
};
