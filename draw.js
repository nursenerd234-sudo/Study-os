/* Study OS — drawing & diagram canvas (pen pressure, marker, eraser, shapes, text, paper) */
const DCOLORS = ['#1c1c1e', '#007aff', '#ff3b30', '#34c759', '#ff9500', '#af52de'];
const DTOOLS = [['pen', 'Pen'], ['hl', 'Marker'], ['eraser', 'Eraser'], ['line', 'Line'], ['arrow', 'Arrow'], ['rect', 'Box'], ['ellipse', 'Circle'], ['text', 'Text']];

function paintPaper(x, W, H, paper) {
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  if (!paper || paper === 'plain') return;
  x.save(); x.strokeStyle = '#d7dbe3'; x.fillStyle = '#c3c8d2'; x.lineWidth = 1;
  const g = 40;
  if (paper === 'lines') { for (let y = g * 2; y < H; y += g) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); } }
  if (paper === 'grid') { for (let y = g; y < H; y += g) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); } for (let X = g; X < W; X += g) { x.beginPath(); x.moveTo(X, 0); x.lineTo(X, H); x.stroke(); } }
  if (paper === 'dots') { for (let y = g; y < H; y += g) for (let X = g; X < W; X += g) { x.beginPath(); x.arc(X, y, 1.6, 0, 7); x.fill(); } }
  x.restore();
}
function paintStroke(x, s) {
  x.save(); x.strokeStyle = x.fillStyle = s.c; x.lineCap = 'round'; x.lineJoin = 'round';
  const p = s.p;
  if (s.t === 'pen') {
    if (p.length === 1) { x.beginPath(); x.arc(p[0][0], p[0][1], s.w * (0.4 + 0.9 * p[0][2]) / 2, 0, 7); x.fill(); }
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i], m0 = i > 1 ? [(p[i - 2][0] + a[0]) / 2, (p[i - 2][1] + a[1]) / 2] : a, m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      x.lineWidth = s.w * (0.4 + 0.9 * (a[2] + b[2]) / 2);
      x.beginPath(); x.moveTo(m0[0], m0[1]); x.quadraticCurveTo(a[0], a[1], m1[0], m1[1]); x.stroke();
    }
    if (p.length > 1) { const a = p[p.length - 2], b = p[p.length - 1]; x.beginPath(); x.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); x.lineTo(b[0], b[1]); x.stroke(); }
  } else if (s.t === 'hl') {
    x.globalAlpha = .32; x.globalCompositeOperation = 'multiply'; x.lineWidth = s.w * 3.2;
    x.beginPath(); p.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.stroke();
  } else if (s.t === 'text') {
    x.font = `600 ${s.size}px -apple-system, system-ui, Roboto, sans-serif`; x.textBaseline = 'top';
    String(s.text).split('\n').forEach((ln, i) => x.fillText(ln, p[0][0], p[0][1] + i * s.size * 1.25));
  } else if (p.length > 1) {
    const [a, b] = p; x.lineWidth = s.w;
    x.beginPath();
    if (s.t === 'line' || s.t === 'arrow') { x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); }
    if (s.t === 'rect') x.roundRect ? x.roundRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 10) : x.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    if (s.t === 'ellipse') x.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2 || 1, Math.abs(b[1] - a[1]) / 2 || 1, 0, 0, 7);
    x.stroke();
    if (s.t === 'arrow') {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 14 + s.w * 2.5;
      x.beginPath(); x.moveTo(b[0], b[1]); x.lineTo(b[0] - L * Math.cos(ang - .45), b[1] - L * Math.sin(ang - .45));
      x.moveTo(b[0], b[1]); x.lineTo(b[0] - L * Math.cos(ang + .45), b[1] - L * Math.sin(ang + .45)); x.stroke();
    }
  }
  x.restore();
}
function samplePts(s) {
  const p = s.p;
  if (s.t === 'pen' || s.t === 'hl') return p;
  if (s.t === 'text') { const w = s.size * .6 * Math.max(...String(s.text).split('\n').map(l => l.length)), h = s.size * 1.25 * String(s.text).split('\n').length; const out = []; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 3; j++) out.push([p[0][0] + w * i / 6, p[0][1] + h * j / 3]); return out; }
  if (p.length < 2) return p;
  const [a, b] = p, out = [];
  if (s.t === 'line' || s.t === 'arrow') { for (let i = 0; i <= 30; i++) out.push([a[0] + (b[0] - a[0]) * i / 30, a[1] + (b[1] - a[1]) * i / 30]); }
  if (s.t === 'rect') { const c = [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]]; for (let k = 0; k < 4; k++) for (let i = 0; i <= 15; i++) out.push([c[k][0] + (c[k + 1][0] - c[k][0]) * i / 15, c[k][1] + (c[k + 1][1] - c[k][1]) * i / 15]); }
  if (s.t === 'ellipse') { const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, rx = Math.abs(b[0] - a[0]) / 2, ry = Math.abs(b[1] - a[1]) / 2; for (let i = 0; i < 48; i++) out.push([cx + rx * Math.cos(i / 48 * 6.283), cy + ry * Math.sin(i / 48 * 6.283)]); }
  return out;
}

/* Open the drawing editor.
   data: {strokesId, bgId, paper, W, H} (all optional). onDone({pngId, strokesId, paper, W, H, w, h}) */
async function openDraw(data, onDone) {
  data = data || {};
  let strokes = [];
  if (data.strokesId) { try { const b = await fileGet(data.strokesId); if (b) strokes = JSON.parse(await b.text()); } catch (e) { } }
  let bg = null;
  if (data.bgId) { bg = new Image(); bg.src = await fileURL(data.bgId); await new Promise(r => { bg.onload = r; bg.onerror = r; }); }
  let W = data.W || (bg ? Math.min(1800, bg.naturalWidth) : 1600);
  let H = data.H || (bg ? Math.round(W * bg.naturalHeight / bg.naturalWidth) : 1100);
  let paper = data.paper || (bg ? 'plain' : 'grid');
  let tool = 'pen', color = DCOLORS[0], width = 4, pencilOnly = false;
  const undo = [], redo = [];

  const el = document.createElement('div');
  el.className = 'draw';
  el.innerHTML = `<div class="dbar">
    <button id="dCancel">Cancel</button>
    ${DTOOLS.map(([k, n]) => `<button class="tool ${k === 'pen' ? 'on' : ''}" data-tool="${k}">${n}</button>`).join('')}
    ${DCOLORS.map((c, i) => `<button class="sw ${i ? '' : 'on'}" data-c="${c}" style="background:${c}" aria-label="colour ${c}"></button>`).join('')}
    <input type="range" id="dW" min="1" max="14" value="4" aria-label="Width">
    <button id="dUndo">Undo</button><button id="dRedo">Redo</button>
    <select id="dPaper" style="width:auto;min-height:40px"><option value="plain">Plain</option><option value="lines">Lines</option><option value="grid">Grid</option><option value="dots">Dots</option></select>
    <button id="dMore">+ Space</button>
    <button id="dPencil">Pencil only: off</button>
    <span class="sp"></span>
    <button id="dDone" class="btn-blue">Done</button></div>
    <div class="dstage" id="dStage"><canvas id="dCv"></canvas></div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  const cv = $('#dCv', el), x = cv.getContext('2d'), stage = $('#dStage', el);
  $('#dPaper', el).value = paper;
  if (bg) $('#dMore', el).style.display = 'none';
  let scale = 1, cur = null;

  function size() {
    const cssW = Math.min(stage.clientWidth - 28, W), dpr = window.devicePixelRatio || 1;
    scale = cssW / W;
    cv.style.width = cssW + 'px'; cv.style.height = Math.round(H * scale) + 'px';
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(H * scale * dpr);
    x.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    render();
  }
  function render() {
    paintPaper(x, W, H, paper);
    if (bg) x.drawImage(bg, 0, 0, W, H);
    strokes.forEach(s => paintStroke(x, s));
    if (cur) paintStroke(x, cur);
  }
  const snap = () => { undo.push(JSON.stringify(strokes)); if (undo.length > 80) undo.shift(); redo.length = 0; };
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale, e.pointerType === 'pen' ? (e.pressure || .5) : .5]; };
  function erase(pt) {
    const R = 14 / scale;
    const keep = strokes.filter(s => !samplePts(s).some(q => Math.hypot(q[0] - pt[0], q[1] - pt[1]) < R + s.w / 2));
    if (keep.length !== strokes.length) { strokes = keep; render(); }
  }
  let erasing = false;
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'pen' && !pencilOnly) { pencilOnly = true; $('#dPencil', el).textContent = 'Pencil only: on'; toast('Stylus detected — fingers won\'t draw now'); }
    if (pencilOnly && e.pointerType === 'touch') return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const pt = pos(e);
    if (tool === 'text') { textAt(e.clientX, e.clientY, pt); return; }
    if (tool === 'eraser') { snap(); erasing = true; erase(pt); return; }
    cur = { t: tool, c: color, w: width, p: [pt, pt.slice()] };
    if (tool === 'pen' || tool === 'hl') cur.p = [pt];
    render();
  });
  cv.addEventListener('pointermove', e => {
    if (pencilOnly && e.pointerType === 'touch') return;
    if (erasing) { erase(pos(e)); return; }
    if (!cur) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (cur.t === 'pen' || cur.t === 'hl') evs.forEach(ev => { const q = pos(ev), l = cur.p[cur.p.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) > .8) cur.p.push(q); });
    else cur.p[1] = pos(e);
    render();
  });
  const end = () => {
    if (erasing) { erasing = false; return; }
    if (!cur) return;
    snap(); strokes.push(cur); cur = null; render();
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  function textAt(cx, cy, pt) {
    const inp = document.createElement('textarea');
    inp.className = 'dtext'; inp.rows = 1; inp.style.left = cx + 'px'; inp.style.top = (cy - 18) + 'px'; inp.style.color = color;
    document.body.appendChild(inp); setTimeout(() => inp.focus(), 30);
    const fin = () => {
      const t = inp.value.trim(); inp.remove();
      if (t) { snap(); strokes.push({ t: 'text', c: color, w: width, size: 16 + width * 3, text: t, p: [pt] }); render(); }
    };
    inp.addEventListener('blur', fin);
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); inp.blur(); } if (ev.key === 'Escape') { inp.value = ''; inp.blur(); } });
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tool) { tool = b.dataset.tool; $$('.tool', el).forEach(t => t.classList.toggle('on', t === b)); }
    if (b.dataset.c) { color = b.dataset.c; $$('.sw', el).forEach(t => t.classList.toggle('on', t === b)); if (tool === 'eraser') { tool = 'pen'; $$('.tool', el).forEach(t => t.classList.toggle('on', t.dataset.tool === 'pen')); } }
  });
  $('#dW', el).oninput = e => width = +e.target.value;
  $('#dUndo', el).onclick = () => { if (!undo.length) return; redo.push(JSON.stringify(strokes)); strokes = JSON.parse(undo.pop()); render(); };
  $('#dRedo', el).onclick = () => { if (!redo.length) return; undo.push(JSON.stringify(strokes)); strokes = JSON.parse(redo.pop()); render(); };
  $('#dPaper', el).onchange = e => { paper = e.target.value; render(); };
  $('#dMore', el).onclick = () => { H += 600; size(); stage.scrollTop = stage.scrollHeight; };
  $('#dPencil', el).onclick = () => { pencilOnly = !pencilOnly; $('#dPencil', el).textContent = 'Pencil only: ' + (pencilOnly ? 'on' : 'off'); };
  const ro = new ResizeObserver(size); ro.observe(stage);
  const keys = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); (e.shiftKey ? $('#dRedo', el) : $('#dUndo', el)).click(); } };
  document.addEventListener('keydown', keys);
  const close = () => { ro.disconnect(); document.removeEventListener('keydown', keys); el.remove(); document.body.style.overflow = ''; };
  $('#dCancel', el).onclick = () => { if (strokes.length && undo.length && !el._sure) { el._sure = 1; toast('Tap Cancel again to discard changes'); return; } close(); };
  $('#dDone', el).onclick = async () => {
    const out = document.createElement('canvas'), k = Math.min(1, 2000 / W);
    out.width = Math.round(W * k); out.height = Math.round(H * k);
    const ox = out.getContext('2d'); ox.scale(k, k);
    paintPaper(ox, W, H, paper); if (bg) ox.drawImage(bg, 0, 0, W, H); strokes.forEach(s => paintStroke(ox, s));
    const png = await new Promise(r => out.toBlob(r, 'image/png'));
    const pngId = 'f_' + uid(), strokesId = 'f_' + uid();
    await filePut(pngId, png);
    await filePut(strokesId, new Blob([JSON.stringify(strokes)], { type: 'application/json' }));
    close();
    onDone && onDone({ pngId, strokesId, paper, W, H, w: out.width, h: out.height });
  };
}
