/* Codeditor — Game Studio: 🎨 Pixel Studio (sprites + animation) and 🗺️ Level Studio (tile maps).
   Drawing tools only: what you make is saved as plain files (PNG sprite sheets, level data) that YOUR code uses. */
(() => {
  const { h, esc, icon, toast } = Q;

  /* ---------- shared bits ---------- */
  const PICO = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'];
  const hexToU32 = (hex) => { const n = parseInt(hex.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; };
  const u32ToHex = (u) => '#' + [u & 255, (u >> 8) & 255, (u >> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');
  const isEditableTarget = (t) => t && t.closest && t.closest('input, textarea, select, [contenteditable]');
  function line(x0, y0, x1, y1, plot) { // Bresenham
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (let guard = 0; guard < 10000; guard++) { plot(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  function overlay(title, cls) {
    const back = h('div', { class: 'studio-back' });
    const box = h('div', { class: 'studio ' + cls, role: 'dialog', 'aria-label': title });
    back.append(box); document.body.append(back);
    requestAnimationFrame(() => back.classList.add('in'));
    return { back, box, close: () => { back.classList.remove('in'); setTimeout(() => back.remove(), 160); } };
  }
  const projectImages = () => Q.fs.list().filter((p) => /^assets\/.*\.(png|gif|webp|jpe?g)$/i.test(p) && Q.assets.isData(Q.fs.read(p)));
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

  /* ===================================================================
     🎨 PIXEL STUDIO
     =================================================================== */
  // read an image back into frames: find the pixel scale, then split a horizontal strip of square frames
  async function decodeSprite(dataUrl) {
    const im = await loadImg(dataUrl);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const px = new Uint32Array(x.getImageData(0, 0, c.width, c.height).data.buffer);
    const blocky = (s) => { if (c.width % s || c.height % s) return false; for (let y = 0; y < c.height; y += s) for (let xx = 0; xx < c.width; xx += s) { const v = px[y * c.width + xx]; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) if (px[(y + j) * c.width + xx + i] !== v) return false; } return true; };
    let scale = 1; for (const s of [16, 8, 6, 5, 4, 3, 2]) if (blocky(s)) { scale = s; break; }
    const w = c.width / scale, hh = c.height / scale;
    if (w * hh > 256 * 64 || hh > 128) throw new Error(`That image is ${w}×${hh} pixels — Pixel Studio handles sprites up to 128×128.`);
    let fw = w, n = 1; if (w > hh && w % hh === 0 && w / hh <= 32) { fw = hh; n = w / hh; }
    if (fw > 128) throw new Error(`That image is ${w}×${hh} pixels — Pixel Studio handles sprites up to 128×128.`);
    const frames = [];
    for (let f = 0; f < n; f++) { const a = new Uint32Array(fw * hh); for (let y = 0; y < hh; y++) for (let i = 0; i < fw; i++) a[y * fw + i] = px[(y * scale) * c.width + (f * fw + i) * scale]; frames.push(a); }
    return { W: fw, H: hh, frames, scale };
  }

  function pixel({ path = null, data = null, name = null } = {}) {
    const ov = overlay('Pixel Studio', 'pixel');
    let W = 16, H = 16, frames = [new Uint32Array(256)], cur = 0, tool = 'pencil', color = hexToU32('#ff004d'), mirror = false, grid = true, onion = true;
    let fps = 8, playing = true, dirty = false, scale = 4, recent = [];
    const undo = [], redo = [];
    let savePath = path;
    const nameIn = h('input', { class: 'input sm', value: name || (path ? path.split('/').pop().replace(/\.\w+$/, '') : 'sprite'), 'aria-label': 'Sprite name', spellcheck: 'false' });

    /* --- layout --- */
    const canvas = h('canvas', { class: 'px-canvas', tabindex: 0, 'aria-label': 'Drawing canvas' });
    const stage = h('div', { class: 'px-stage' }, canvas);
    const toolsEl = h('div', { class: 'px-tools' });
    const palEl = h('div', { class: 'px-pal' });
    const recentEl = h('div', { class: 'px-recent' });
    const framesEl = h('div', { class: 'px-frames' });
    const prev = h('canvas', { class: 'px-preview', width: 96, height: 96 });
    const fpsIn = h('input', { type: 'range', min: 1, max: 24, value: fps, 'aria-label': 'Animation speed' });
    const fpsLab = h('span', { class: 'muted small', text: fps + ' fps' });
    const sizeLab = h('span', { class: 'muted small' });
    const colorIn = h('input', { type: 'color', class: 'px-colorin', title: 'Pick any colour', 'aria-label': 'Custom colour' });
    const status = h('div', { class: 'px-status muted small' });

    const TOOLS = [['pencil', '✏️', 'Pencil (B)'], ['eraser', '🧽', 'Eraser (E) · right-click also erases'], ['fill', '🪣', 'Fill (G)'], ['line', '📏', 'Line (L)'], ['rect', '⬜', 'Rectangle (R) · hold Shift for filled'], ['picker', '💧', 'Pick a colour (I)'], ['move', '✋', 'Move the drawing (V)']];
    const tbtn = {};
    TOOLS.forEach(([id, ic, tip]) => { const b = h('button', { class: 'px-tool', title: tip, 'aria-label': tip, html: ic, onclick: () => setTool(id) }); tbtn[id] = b; toolsEl.append(b); });
    toolsEl.append(h('div', { class: 'px-sep' }));
    const mirBtn = h('button', { class: 'px-tool', title: 'Mirror left/right (M)', 'aria-label': 'Mirror drawing', html: '🪞', onclick: () => { mirror = !mirror; mirBtn.classList.toggle('on', mirror); draw(); } });
    const gridBtn = h('button', { class: 'px-tool on', title: 'Grid (H)', 'aria-label': 'Toggle grid', html: '#', onclick: () => { grid = !grid; gridBtn.classList.toggle('on', grid); draw(); } });
    const onionBtn = h('button', { class: 'px-tool on', title: 'Onion skin: see the previous frame faintly (O)', 'aria-label': 'Toggle onion skin', html: '🧅', onclick: () => { onion = !onion; onionBtn.classList.toggle('on', onion); draw(); } });
    const undoBtn = h('button', { class: 'px-tool', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', html: '↶', onclick: () => doUndo() });
    const redoBtn = h('button', { class: 'px-tool', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', html: '↷', onclick: () => doRedo() });
    toolsEl.append(mirBtn, gridBtn, onionBtn, h('div', { class: 'px-sep' }), undoBtn, redoBtn);

    const swatch = (u, tip) => { const b = h('button', { class: 'px-sw' + (u === 0 ? ' clear' : ''), title: tip || u32ToHex(u), 'aria-label': tip || 'Colour ' + u32ToHex(u), style: u ? { background: u32ToHex(u) } : {}, onclick: () => setColor(u) }); b.dataset.u = u; return b; };
    PICO.forEach((c) => palEl.append(swatch(hexToU32(c))));
    palEl.append(swatch(0, 'Transparent (eraser)'));
    colorIn.addEventListener('input', () => setColor(hexToU32(colorIn.value)));

    const newBtn = h('button', { class: 'btn sm', html: `${icon('plus', 12)} New`, title: 'New sprite', onclick: () => newSprite() });
    const openBtn = h('button', { class: 'btn sm', html: `${icon('folderOpen', 12)} Open`, title: 'Open an image from your project or the asset pack', onclick: () => openPicker() });
    const closeBtn = h('button', { class: 'icon-btn', title: 'Close (Esc)', 'aria-label': 'Close Pixel Studio', html: icon('close', 16), onclick: () => tryClose() });
    const head = h('div', { class: 'st-head' }, h('b', { text: '🎨 Pixel Studio' }), sizeLab, h('div', { class: 'grow' }), newBtn, openBtn, closeBtn);

    const playBtn = h('button', { class: 'icon-btn sm', title: 'Play / pause the preview', html: icon('stop', 13), onclick: () => { playing = !playing; playBtn.innerHTML = icon(playing ? 'stop' : 'play', 13); } });
    fpsIn.addEventListener('input', () => { fps = +fpsIn.value; fpsLab.textContent = fps + ' fps'; });
    const frameBtns = h('div', { class: 'px-fbtns' },
      h('button', { class: 'btn sm', title: 'New empty frame', html: `${icon('plus', 12)} Frame`, onclick: () => { snap(); frames.splice(cur + 1, 0, new Uint32Array(W * H)); cur++; changed(); } }),
      h('button', { class: 'btn sm', title: 'Copy this frame', html: `${icon('copy', 12)} Copy`, onclick: () => { snap(); frames.splice(cur + 1, 0, frames[cur].slice()); cur++; changed(); } }),
      h('button', { class: 'icon-btn sm', title: 'Move frame left', html: '◀', onclick: () => moveFrame(-1) }),
      h('button', { class: 'icon-btn sm', title: 'Move frame right', html: '▶', onclick: () => moveFrame(1) }),
      h('button', { class: 'icon-btn sm', title: 'Delete this frame', html: icon('trash', 12), onclick: () => { if (frames.length < 2) return toast('A sprite needs at least one frame.', 'info'); snap(); frames.splice(cur, 1); cur = Math.min(cur, frames.length - 1); changed(); } }));

    const scaleSel = h('select', { class: 'input sm', title: 'How big each pixel is in the saved image', 'aria-label': 'Export scale' }, ...[1, 2, 4, 8].map((s) => h('option', { value: s, text: `${s}× size`, selected: s === scale })));
    scaleSel.addEventListener('change', () => { scale = +scaleSel.value; });
    const foot = h('div', { class: 'st-foot' }, h('label', { class: 'muted small', text: 'Name' }), nameIn, scaleSel, h('div', { class: 'grow' }),
      h('button', { class: 'btn', html: `${icon('download', 13)} PNG`, title: 'Download as a PNG file', onclick: () => download() }),
      h('button', { class: 'btn', html: `${icon('box', 13)} My assets`, title: 'Keep it in your asset pack, for any project', onclick: () => saveMine() }),
      h('button', { class: 'btn', html: `${icon('copy', 13)} Usage`, title: 'Copy how to load it in code', onclick: () => copyUsage() }),
      h('button', { class: 'btn primary', html: `${icon('check', 13)} Save to project`, onclick: () => saveProject() }));

    const side = h('div', { class: 'px-side' },
      h('div', { class: 'st-sec' }, h('h5', { text: 'Colours' }), palEl, h('div', { class: 'px-custom' }, colorIn, h('span', { class: 'muted small', text: 'Recent' }), recentEl)),
      h('div', { class: 'st-sec' }, h('h5', {}, h('span', { text: 'Preview' }), playBtn), h('div', { class: 'px-prevwrap' }, prev), h('div', { class: 'px-fps' }, fpsIn, fpsLab)));
    const framesSec = h('div', { class: 'px-framebar' }, framesEl, frameBtns);
    ov.box.append(head, h('div', { class: 'px-main' }, toolsEl, h('div', { class: 'px-center' }, stage, status, framesSec), side), foot);

    /* --- state helpers --- */
    function setTool(t) { tool = t; Object.entries(tbtn).forEach(([k, b]) => b.classList.toggle('on', k === t)); canvas.dataset.tool = t; }
    function setColor(u) {
      color = u >>> 0; if (u) { recent = [u, ...recent.filter((x) => x !== u)].slice(0, 8); renderRecent(); if (tool === 'eraser' || tool === 'picker') setTool('pencil'); } else setTool('eraser');
      palEl.querySelectorAll('.px-sw').forEach((b) => b.classList.toggle('on', +b.dataset.u === color));
      if (u) colorIn.value = u32ToHex(u);
    }
    function renderRecent() { recentEl.innerHTML = ''; recent.forEach((u) => recentEl.append(swatch(u))); }
    function snap() { undo.push({ cur, frames: frames.map((f) => f.slice()) }); if (undo.length > 100) undo.shift(); redo.length = 0; }
    function doUndo() { const s = undo.pop(); if (!s) return; redo.push({ cur, frames: frames.map((f) => f.slice()) }); frames = s.frames; cur = Math.min(s.cur, frames.length - 1); changed(); }
    function doRedo() { const s = redo.pop(); if (!s) return; undo.push({ cur, frames: frames.map((f) => f.slice()) }); frames = s.frames; cur = Math.min(s.cur, frames.length - 1); changed(); }
    function moveFrame(d) { const j = cur + d; if (j < 0 || j >= frames.length) return; snap(); [frames[cur], frames[j]] = [frames[j], frames[cur]]; cur = j; changed(); }
    function changed(markDirty = true) { if (markDirty) dirty = true; sizeLab.textContent = `${W}×${H} · ${frames.length} frame${frames.length > 1 ? 's' : ''}`; layout(); renderFrames(); draw(); }

    /* --- drawing surface --- */
    let cell = 16;
    const off = document.createElement('canvas'); const offx = off.getContext('2d');
    function layout() {
      const r = stage.getBoundingClientRect();
      cell = Math.max(2, Math.floor(Math.min((r.width - 16) / W, (r.height - 16) / H)));
      canvas.width = W * cell; canvas.height = H * cell; canvas.style.backgroundSize = `${cell * 2}px ${cell * 2}px`;
      canvas.style.backgroundPosition = `0 0, ${cell}px ${cell}px`;
      off.width = W; off.height = H;
    }
    let preview = null; // temporary pixels for line/rect while dragging
    function blit(arr, alpha = 1) {
      const img = offx.createImageData(W, H); new Uint32Array(img.data.buffer).set(arr); offx.putImageData(img, 0, 0);
      cx.globalAlpha = alpha; cx.drawImage(off, 0, 0, W * cell, H * cell); cx.globalAlpha = 1;
    }
    const cx = canvas.getContext('2d');
    function draw() {
      cx.imageSmoothingEnabled = false; cx.clearRect(0, 0, canvas.width, canvas.height);
      if (onion && frames.length > 1) blit(frames[(cur - 1 + frames.length) % frames.length], 0.28);
      blit(preview || frames[cur]);
      if (grid && cell >= 6) {
        cx.strokeStyle = 'rgba(128,128,128,.28)'; cx.lineWidth = 1; cx.beginPath();
        for (let i = 1; i < W; i++) { cx.moveTo(i * cell + 0.5, 0); cx.lineTo(i * cell + 0.5, H * cell); }
        for (let j = 1; j < H; j++) { cx.moveTo(0, j * cell + 0.5); cx.lineTo(W * cell, j * cell + 0.5); }
        cx.stroke();
        if (mirror) { cx.strokeStyle = 'rgba(255,0,77,.6)'; cx.beginPath(); cx.moveTo(W * cell / 2, 0); cx.lineTo(W * cell / 2, H * cell); cx.stroke(); }
      }
      if (hover) { cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.lineWidth = 1; cx.strokeRect(hover.x * cell + 0.5, hover.y * cell + 0.5, cell - 1, cell - 1); }
    }
    function renderFrames() {
      framesEl.innerHTML = '';
      frames.forEach((f, i) => {
        const c = h('canvas', { class: 'px-thumb' + (i === cur ? ' on' : ''), width: W, height: H, title: `Frame ${i + 1}`, tabindex: 0, 'aria-label': `Frame ${i + 1}` });
        const x = c.getContext('2d'); const img = x.createImageData(W, H); new Uint32Array(img.data.buffer).set(f); x.putImageData(img, 0, 0);
        c.onclick = () => { cur = i; renderFrames(); draw(); };
        framesEl.append(c);
      });
    }
    // animated preview (runs only while open & visible)
    let pf = 0, last = 0, raf = 0;
    const pcx = prev.getContext('2d');
    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (playing && t - last > 1000 / fps) { last = t; pf = (pf + 1) % frames.length; }
      const f = frames[playing ? pf % frames.length : cur]; if (!f) return;
      const k = Math.max(1, Math.floor(96 / Math.max(W, H)));
      prev.width = W * k; prev.height = H * k; pcx.imageSmoothingEnabled = false;
      const img = offx.createImageData(W, H); new Uint32Array(img.data.buffer).set(f);
      const o2 = document.createElement('canvas'); o2.width = W; o2.height = H; o2.getContext('2d').putImageData(img, 0, 0);
      pcx.clearRect(0, 0, prev.width, prev.height); pcx.drawImage(o2, 0, 0, W * k, H * k);
    }

    /* --- pointer input --- */
    let down = null, hover = null;
    const cellAt = (e) => { const r = canvas.getBoundingClientRect(); return { x: Math.floor(((e.clientX - r.left) / r.width) * W), y: Math.floor(((e.clientY - r.top) / r.height) * H) }; };
    const inside = (p) => p.x >= 0 && p.y >= 0 && p.x < W && p.y < H;
    function plotTo(arr, x, y, v) { if (x < 0 || y < 0 || x >= W || y >= H) return; arr[y * W + x] = v; if (mirror) arr[y * W + (W - 1 - x)] = v; }
    function flood(arr, x, y, v) {
      const from = arr[y * W + x]; if (from === v) return;
      const st = [[x, y]];
      while (st.length) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a >= W || b >= H || arr[b * W + a] !== from) continue; arr[b * W + a] = v; st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
    }
    function shape(arr, a, b, filled) {
      const out = arr.slice(); const v = down.erase ? 0 : color;
      if (tool === 'line') line(a.x, a.y, b.x, b.y, (x, y) => plotTo(out, x, y, v));
      else { const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (filled || x === x0 || x === x1 || y === y0 || y === y1) plotTo(out, x, y, v); }
      return out;
    }
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      const p = cellAt(e); if (!inside(p)) return;
      canvas.setPointerCapture(e.pointerId); canvas.focus();
      const erase = e.button === 2 || tool === 'eraser';
      if (tool === 'picker') { const v = frames[cur][p.y * W + p.x]; setColor(v); return; }
      snap();
      down = { start: p, last: p, erase, base: frames[cur].slice() };
      if (tool === 'fill') { flood(frames[cur], p.x, p.y, erase ? 0 : color); down = null; changed(); return; }
      if (tool === 'pencil' || tool === 'eraser') { plotTo(frames[cur], p.x, p.y, erase ? 0 : color); changed(); }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = cellAt(e);
      const nh = inside(p) ? p : null; const moved = !hover || !nh || hover.x !== nh.x || hover.y !== nh.y; hover = nh;
      if (nh) status.textContent = `x ${nh.x}, y ${nh.y}`;
      if (!down) { if (moved) draw(); return; }
      if (tool === 'pencil' || tool === 'eraser') { line(down.last.x, down.last.y, p.x, p.y, (x, y) => plotTo(frames[cur], x, y, down.erase ? 0 : color)); down.last = p; draw(); }
      else if (tool === 'line' || tool === 'rect') { preview = shape(down.base, down.start, p, e.shiftKey); draw(); }
      else if (tool === 'move') { const dx = p.x - down.start.x, dy = p.y - down.start.y; const out = new Uint32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sx = x - dx, sy = y - dy; if (sx >= 0 && sy >= 0 && sx < W && sy < H) out[y * W + x] = down.base[sy * W + sx]; } preview = out; draw(); }
    });
    const up = () => { if (!down) return; if (preview) { frames[cur] = preview; preview = null; } down = null; changed(); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { if (!down) { hover = null; draw(); } });

    /* --- keyboard --- */
    const keys = (e) => {
      if (!ov.back.isConnected || document.querySelector('.modal-back')) return;
      if (isEditableTarget(e.target)) return;
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') { e.preventDefault(); tryClose(); return; }
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
      if (mod && k === 'y') { e.preventDefault(); doRedo(); return; }
      if (mod && k === 's') { e.preventDefault(); saveProject(); return; }
      if (mod) return;
      const map = { b: 'pencil', p: 'pencil', e: 'eraser', g: 'fill', l: 'line', r: 'rect', i: 'picker', v: 'move' };
      if (map[k]) { setTool(map[k]); e.preventDefault(); }
      else if (k === 'm') mirBtn.click(); else if (k === 'h') gridBtn.click(); else if (k === 'o') onionBtn.click();
      else if (k === '[' || k === ',') { cur = (cur - 1 + frames.length) % frames.length; renderFrames(); draw(); }
      else if (k === ']' || k === '.') { cur = (cur + 1) % frames.length; renderFrames(); draw(); }
    };
    addEventListener('keydown', keys, true);
    const ro = new ResizeObserver(() => { layout(); draw(); }); ro.observe(stage);

    /* --- new / open --- */
    function newSprite() {
      const sel = (v) => h('select', { class: 'input' }, ...[8, 12, 16, 24, 32, 48, 64].map((n) => h('option', { value: n, text: n + ' px', selected: n === v })));
      const ws = sel(16), hs = sel(16);
      Q.modal({ title: 'New sprite', body: h('div', { class: 'st-new' }, h('label', { text: 'Width' }), ws, h('label', { text: 'Height' }), hs, h('p', { class: 'muted small', text: 'Small sprites (16×16) are quicker to draw and look great scaled up.' })),
        buttons: [{ label: 'Cancel' }, { label: 'Create', primary: true, onclick: async () => { if (dirty && !(await Q.confirm('Start a new sprite?', 'Your unsaved drawing will be lost.', false))) return; W = +ws.value; H = +hs.value; frames = [new Uint32Array(W * H)]; cur = 0; undo.length = redo.length = 0; savePath = null; nameIn.value = 'sprite'; changed(false); dirty = false; } }] });
    }
    async function load(dataUrl, p) {
      try { const r = await decodeSprite(dataUrl); W = r.W; H = r.H; frames = r.frames; cur = 0; scale = r.scale >= 8 ? 8 : r.scale >= 4 ? 4 : r.scale >= 2 ? 2 : 1; scaleSel.value = scale; undo.length = redo.length = 0; savePath = p || null; if (p) nameIn.value = p.split('/').pop().replace(/\.\w+$/, ''); changed(false); dirty = false; }
      catch (err) { toast(esc(err.message || 'Couldn’t open that image.'), 'error', 4000); }
    }
    function openPicker() {
      const list = h('div', { class: 'st-pick' });
      const item = (label, src, onPick) => h('button', { class: 'st-pick-it', onclick: onPick }, h('img', { src, alt: '' }), h('span', { text: label }));
      const imgs = projectImages();
      if (imgs.length) { list.append(h('h5', { text: 'In this project' })); const g = h('div', { class: 'st-pick-g' }); imgs.forEach((p) => g.append(item(p.replace(/^assets\//, ''), Q.fs.read(p), () => { m.close(); load(Q.fs.read(p), p); }))); list.append(g); }
      list.append(h('h5', { text: 'Asset pack' })); const g2 = h('div', { class: 'st-pick-g' }); Object.keys(Q.assets.SPRITES).forEach((n) => { const u = Q.assets.spriteURL(n); g2.append(item(n, u, () => { m.close(); load(u, null).then(() => { nameIn.value = n; }); })); }); list.append(g2);
      const m = Q.modal({ title: 'Open a sprite', wide: true, body: list, buttons: [{ label: 'Cancel' }] });
    }

    /* --- export --- */
    function sheet(sc = scale) {
      const c = document.createElement('canvas'); c.width = W * frames.length * sc; c.height = H * sc;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      frames.forEach((f, i) => { const img = offx.createImageData(W, H); new Uint32Array(img.data.buffer).set(f); const o = document.createElement('canvas'); o.width = W; o.height = H; o.getContext('2d').putImageData(img, 0, 0); x.drawImage(o, i * W * sc, 0, W * sc, H * sc); });
      return c.toDataURL('image/png');
    }
    const fileName = () => (Q.assets.safe(nameIn.value || 'sprite') || 'sprite') + '.png';
    function usage(p) {
      const v = Q.assets.safe(p.split('/').pop()).replace(/-(\w)/g, (_, c) => c.toUpperCase());
      const lang = Q.app.editor.langOf?.(Q.app.editor.activeId) || '';
      if (frames.length === 1) return Q.assets.usage(p);
      const fw = W * scale, fh = H * scale, N = frames.length;
      if (lang === 'lua') return `-- ${p}: ${N} frames, each ${fw}×${fh}\nlocal ${v}Img = love.graphics.newImage("${p}")\n-- frame i (0 to ${N - 1}) is the rectangle at x = i * ${fw}\nlocal ${v}Quad = love.graphics.newQuad(0, 0, ${fw}, ${fh}, ${v}Img:getDimensions())`;
      return `// ${p}: ${N} frames side by side, each ${fw}×${fh} pixels\nconst ${v}Img = new Image();\n${v}Img.src = "${p}";\n// to show frame i (0 to ${N - 1}), cut it out of the strip:\n// ctx.drawImage(${v}Img, i * ${fw}, 0, ${fw}, ${fh}, x, y, ${fw}, ${fh});`;
    }
    async function saveProject() {
      if (!Q.fs.list) return;
      let p = savePath && savePath.startsWith('assets/') ? savePath.replace(/[^/]+$/, fileName()) : 'assets/' + fileName();
      if (p !== savePath && Q.fs.exists(p) && !(await Q.confirm(`Replace ${p}?`, 'A file with that name is already in this project.', false))) return;
      Q.fs.write(p, sheet()); savePath = p; dirty = false; Q.bus.emit('fs:changed');
      toast(`Saved <b>${esc(p)}</b> — click <b>Usage</b> to see how to load it in code`, 'success', 3200);
    }
    async function saveMine() { await Q.assets.saveMine(fileName(), sheet()); toast(`Added <b>${esc(fileName())}</b> to My assets`, 'success'); }
    async function download() { const blob = await (await fetch(sheet())).blob(); Q.download(fileName(), blob); }
    function copyUsage() { const p = savePath || 'assets/' + fileName(); Q.app.copyText(usage(p), 'How to load it is copied — paste it in your code'); }
    async function tryClose() {
      if (dirty && !(await Q.confirm('Close Pixel Studio?', 'Your drawing has unsaved changes.', false))) return;
      cancelAnimationFrame(raf); ro.disconnect(); removeEventListener('keydown', keys, true); ov.close();
    }

    setTool('pencil'); setColor(color);
    requestAnimationFrame(() => { changed(false); raf = requestAnimationFrame(tick); canvas.focus(); });
    if (path && Q.fs.exists(path)) load(Q.fs.read(path), path); else if (data) load(data, null);
    return { get frames() { return frames; }, get size() { return [W, H]; }, saveProject, load, close: tryClose, setTool, setColor: (hex) => setColor(hexToU32(hex)) };
  }

  /* ===================================================================
     🗺️ LEVEL STUDIO — paint a tile map; saves only the level DATA.
     Drawing it in your game is your job (the "Draw a tile map" lesson shows how).
     =================================================================== */
  const BASIC = [{ ch: '#', name: 'wall', color: '#64748b' }, { ch: '@', name: 'player start', color: '#29adff' }, { ch: '*', name: 'goal', color: '#ffec27' }, { ch: '~', name: 'water', color: '#1d4ed8' }, { ch: '^', name: 'spikes', color: '#ef4444' }];
  function level({ path = null } = {}) {
    const ov = overlay('Level Studio', 'level');
    let cols = 20, rows = 12, map = [], tool = 'brush', sel = '#', dirty = false, cell = 28, savePath = path;
    let tiles = BASIC.map((t) => ({ ...t }));
    const undo = [], redo = [];
    const blank = () => Array.from({ length: rows }, () => '.'.repeat(cols));
    map = blank();
    const nameIn = h('input', { class: 'input sm', value: path ? path.split('/').pop().replace(/\.level\.json$/, '') : 'level1', 'aria-label': 'Level name', spellcheck: 'false' });
    const imgs = {}; // ch -> Image
    const canvas = h('canvas', { class: 'lv-canvas', tabindex: 0, 'aria-label': 'Level map' });
    const stage = h('div', { class: 'lv-stage' }, canvas);
    const tilesEl = h('div', { class: 'lv-tiles' });
    const status = h('div', { class: 'px-status muted small' });
    const colsIn = h('input', { class: 'input sm', type: 'number', min: 1, max: 200, value: cols, 'aria-label': 'Columns' });
    const rowsIn = h('input', { class: 'input sm', type: 'number', min: 1, max: 100, value: rows, 'aria-label': 'Rows' });
    const zoomIn = h('input', { type: 'range', min: 8, max: 64, value: cell, 'aria-label': 'Zoom' });
    const TOOLS = [['brush', '🖌️', 'Brush (B)'], ['eraser', '🧽', 'Eraser (E) · right-click also erases'], ['fill', '🪣', 'Fill (G)'], ['rect', '⬜', 'Rectangle (R)'], ['picker', '💧', 'Pick a tile (I)']];
    const tbtn = {}; const toolsEl = h('div', { class: 'px-tools' });
    TOOLS.forEach(([id, ic, tip]) => { const b = h('button', { class: 'px-tool', title: tip, 'aria-label': tip, html: ic, onclick: () => setTool(id) }); tbtn[id] = b; toolsEl.append(b); });
    toolsEl.append(h('div', { class: 'px-sep' }), h('button', { class: 'px-tool', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', html: '↶', onclick: () => doUndo() }), h('button', { class: 'px-tool', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', html: '↷', onclick: () => doRedo() }));
    const closeBtn = h('button', { class: 'icon-btn', title: 'Close (Esc)', 'aria-label': 'Close Level Studio', html: icon('close', 16), onclick: () => tryClose() });
    const head = h('div', { class: 'st-head' }, h('b', { text: '🗺️ Level Studio' }), h('span', { class: 'muted small', text: 'Columns' }), colsIn, h('span', { class: 'muted small', text: 'Rows' }), rowsIn, h('button', { class: 'btn sm', text: 'Resize', onclick: () => resize(+colsIn.value, +rowsIn.value) }), h('div', { class: 'grow' }),
      h('button', { class: 'btn sm', html: `${icon('folderOpen', 12)} Open`, onclick: () => openPicker() }), closeBtn);
    const dataBox = h('pre', { class: 'lv-data', 'aria-label': 'Level data' });
    const langSel = h('select', { class: 'input sm', 'aria-label': 'Data format' }, ...[['js', 'JavaScript'], ['py', 'Python'], ['lua', 'Lua']].map(([v, t]) => h('option', { value: v, text: t })));
    const guess = (() => { const l = Q.app.editor.langOf?.(Q.app.editor.activeId) || ''; return l === 'python' ? 'py' : l === 'lua' ? 'lua' : 'js'; })();
    langSel.value = guess; langSel.addEventListener('change', () => renderData());
    const side = h('div', { class: 'px-side lv-side' },
      h('div', { class: 'st-sec' }, h('h5', {}, h('span', { text: 'Tiles' }), h('button', { class: 'btn sm', html: `${icon('plus', 12)} Sprite`, title: 'Use an image from your project as a tile', onclick: () => addSpriteTile() })), tilesEl),
      h('div', { class: 'st-sec' }, h('h5', {}, h('span', { text: 'Level data' }), langSel), dataBox, h('p', { class: 'muted small', html: 'This is just the <b>data</b> — drawing it is up to your code. ' }, h('a', { href: '#', text: 'Learn how (Tile maps lesson)', onclick: async (e) => { e.preventDefault(); await tryClose(); if (!ov.back.isConnected) Q.learn.open('game', 'tilemap'); } }))));
    const foot = h('div', { class: 'st-foot' }, h('label', { class: 'muted small', text: 'Name' }), nameIn, h('span', { class: 'muted small', text: 'Zoom' }), zoomIn, h('div', { class: 'grow' }),
      h('button', { class: 'btn', html: `${icon('copy', 13)} Copy data`, onclick: () => Q.app.copyText(dataCode(), 'Level data copied — paste it into your code') }),
      h('button', { class: 'btn primary', html: `${icon('check', 13)} Save to project`, onclick: () => save() }));
    ov.box.append(head, h('div', { class: 'px-main' }, toolsEl, h('div', { class: 'px-center' }, stage, status), side), foot);

    function setTool(t) { tool = t; Object.entries(tbtn).forEach(([k, b]) => b.classList.toggle('on', k === t)); }
    function setTile(ch) { sel = ch; if (tool === 'eraser' || tool === 'picker') setTool('brush'); tilesEl.querySelectorAll('.lv-tile').forEach((b) => b.classList.toggle('on', b.dataset.ch === ch)); }
    function renderTiles() {
      tilesEl.innerHTML = '';
      tiles.forEach((t) => {
        const sw = t.src ? h('img', { src: Q.fs.exists(t.src) ? Q.fs.read(t.src) : '', alt: '' }) : h('span', { class: 'lv-sw', style: { background: t.color } });
        const b = h('button', { class: 'lv-tile' + (t.ch === sel ? ' on' : ''), title: `${t.name} — written as "${t.ch}"`, onclick: () => setTile(t.ch) }, sw, h('code', { text: t.ch }), h('span', { class: 'lv-tn', text: t.name }));
        b.dataset.ch = t.ch; tilesEl.append(b);
      });
    }
    function freeChar(name) {
      const used = new Set(['.', ...tiles.map((t) => t.ch)]);
      for (const c of [name[0]?.toUpperCase(), name[0]?.toLowerCase(), ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$%&+=?!'.split('')]) if (c && /[A-Za-z0-9$%&+=?!]/.test(c) && !used.has(c)) return c;
      return null;
    }
    function addSpriteTile() {
      const list = projectImages().filter((p) => !tiles.some((t) => t.src === p));
      if (!list.length) return toast('Add an image to this project first (Asset pack or Pixel Studio).', 'info', 3500);
      const g = h('div', { class: 'st-pick-g' });
      const m = Q.modal({ title: 'Use an image as a tile', wide: true, body: g, buttons: [{ label: 'Cancel' }] });
      list.forEach((p) => g.append(h('button', { class: 'st-pick-it', onclick: () => { const name = p.split('/').pop().replace(/\.\w+$/, ''); const ch = freeChar(name); if (!ch) return toast('No free letters left for tiles.', 'error'); tiles.push({ ch, name, src: p }); loadTileImg(tiles[tiles.length - 1]); renderTiles(); setTile(ch); dirty = true; renderData(); m.close(); } }, h('img', { src: Q.fs.read(p), alt: '' }), h('span', { text: p.replace(/^assets\//, '') }))));
    }
    function loadTileImg(t) { if (t.src && Q.fs.exists(t.src)) loadImg(Q.fs.read(t.src)).then((im) => { imgs[t.ch] = im; draw(); }).catch(() => {}); }
    const snap = () => { undo.push(map.slice()); if (undo.length > 100) undo.shift(); redo.length = 0; };
    function doUndo() { const s = undo.pop(); if (!s) return; redo.push(map.slice()); map = s; rows = map.length; cols = map[0]?.length || 1; changed(); }
    function doRedo() { const s = redo.pop(); if (!s) return; undo.push(map.slice()); map = s; rows = map.length; cols = map[0]?.length || 1; changed(); }
    function resize(c, r) {
      c = Math.max(1, Math.min(200, c | 0)); r = Math.max(1, Math.min(100, r | 0)); if (c === cols && r === rows) return;
      snap(); map = Array.from({ length: r }, (_, j) => ((map[j] || '') + '.'.repeat(c)).slice(0, c)); cols = c; rows = r; changed();
    }
    const get = (x, y) => map[y][x];
    const set = (x, y, ch) => { if (x < 0 || y < 0 || x >= cols || y >= rows) return; const s = map[y]; map[y] = s.slice(0, x) + ch + s.slice(x + 1); };
    function changed(mark = true) { if (mark) dirty = true; colsIn.value = cols; rowsIn.value = rows; layout(); draw(); renderData(); }
    const cx = canvas.getContext('2d');
    function layout() { canvas.width = cols * cell; canvas.height = rows * cell; }
    let preview = null, hover = null, down = null;
    function draw() {
      const m = preview || map;
      cx.imageSmoothingEnabled = false; cx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const ch = m[y][x]; if (ch === '.') continue;
        const t = tiles.find((q) => q.ch === ch);
        if (imgs[ch]) { const im = imgs[ch], fw = im.width > im.height && im.width % im.height === 0 ? im.height : im.width; cx.drawImage(im, 0, 0, fw, im.height, x * cell, y * cell, cell, cell); }
        else { cx.fillStyle = t?.color || '#888'; cx.fillRect(x * cell, y * cell, cell, cell); if (!t || !t.color || cell >= 14) { cx.fillStyle = 'rgba(0,0,0,.55)'; cx.font = `bold ${Math.floor(cell * 0.55)}px monospace`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(ch, x * cell + cell / 2, y * cell + cell / 2 + 1); } }
      }
      cx.strokeStyle = 'rgba(128,128,128,.22)'; cx.lineWidth = 1; cx.beginPath();
      for (let i = 1; i < cols; i++) { cx.moveTo(i * cell + 0.5, 0); cx.lineTo(i * cell + 0.5, rows * cell); }
      for (let j = 1; j < rows; j++) { cx.moveTo(0, j * cell + 0.5); cx.lineTo(cols * cell, j * cell + 0.5); }
      cx.stroke();
      if (hover) { cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.strokeRect(hover.x * cell + 0.5, hover.y * cell + 0.5, cell - 1, cell - 1); }
    }
    const cellAt = (e) => { const r = canvas.getBoundingClientRect(); return { x: Math.floor(((e.clientX - r.left) / r.width) * cols), y: Math.floor(((e.clientY - r.top) / r.height) * rows) }; };
    const inside = (p) => p.x >= 0 && p.y >= 0 && p.x < cols && p.y < rows;
    function fill(x, y, ch) { const from = get(x, y); if (from === ch) return; const st = [[x, y]]; let n = 0; while (st.length && n++ < 40000) { const [a, b] = st.pop(); if (a < 0 || b < 0 || a >= cols || b >= rows || map[b][a] !== from) continue; set(a, b, ch); st.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); } }
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      const p = cellAt(e); if (!inside(p)) return; canvas.setPointerCapture(e.pointerId); canvas.focus();
      const ch = e.button === 2 || tool === 'eraser' ? '.' : sel;
      if (tool === 'picker') { const c = get(p.x, p.y); if (c !== '.') setTile(c); return; }
      snap();
      if (tool === 'fill') { fill(p.x, p.y, ch); changed(); return; }
      down = { start: p, last: p, ch, base: map.slice() };
      if (tool === 'brush' || tool === 'eraser') { if (ch === '@') map = map.map((r) => r.replace(/@/g, '.')); set(p.x, p.y, ch); changed(); }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = cellAt(e); const nh = inside(p) ? p : null; hover = nh;
      if (nh) status.textContent = `column ${nh.x}, row ${nh.y}${get(nh.x, nh.y) !== '.' ? ' · ' + (tiles.find((t) => t.ch === get(nh.x, nh.y))?.name || get(nh.x, nh.y)) : ''}`;
      if (!down) return draw();
      if (tool === 'brush' || tool === 'eraser') { if (down.ch === '@') return draw(); line(down.last.x, down.last.y, p.x, p.y, (x, y) => set(x, y, down.ch)); down.last = p; draw(); }
      else if (tool === 'rect') { const m = down.base.slice(); const save = map; map = m; const x0 = Math.min(down.start.x, p.x), x1 = Math.max(down.start.x, p.x), y0 = Math.min(down.start.y, p.y), y1 = Math.max(down.start.y, p.y); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < rows && x >= 0 && x < cols) set(x, y, down.ch); preview = map; map = save; draw(); }
    });
    const up = () => { if (!down) return; if (preview) { map = preview; preview = null; } down = null; changed(); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { if (!down) { hover = null; draw(); } });
    zoomIn.addEventListener('input', () => { cell = +zoomIn.value; layout(); draw(); });

    function legend() { const used = new Set(map.join('')); return tiles.filter((t) => used.has(t.ch)); }
    function dataCode(lang = langSel.value) {
      const name = (Q.assets.safe(nameIn.value || 'level') || 'level').replace(/-/g, '_');
      const L = legend();
      const q = (s) => JSON.stringify(s);
      if (lang === 'py') return `# ${name}: ${cols}×${rows} tiles, made in Level Studio\n# Legend: ${['. = empty', ...L.map((t) => `${t.ch} = ${t.name}${t.src ? ` (${t.src})` : ''}`)].join(', ')}\n${name.toUpperCase()} = [\n${map.map((r) => '    ' + q(r) + ',').join('\n')}\n]\n`;
      if (lang === 'lua') return `-- ${name}: ${cols}×${rows} tiles, made in Level Studio\n-- Legend: ${['. = empty', ...L.map((t) => `${t.ch} = ${t.name}${t.src ? ` (${t.src})` : ''}`)].join(', ')}\nlocal ${name} = {\n${map.map((r) => '  ' + q(r) + ',').join('\n')}\n}\n`;
      return `// ${name}: ${cols}×${rows} tiles, made in Level Studio\n// Legend: ${['. = empty', ...L.map((t) => `${t.ch} = ${t.name}${t.src ? ` (${t.src})` : ''}`)].join(', ')}\nconst ${name.toUpperCase()} = [\n${map.map((r) => '  ' + q(r) + ',').join('\n')}\n];\n`;
    }
    let dataTimer = 0;
    function renderData() { clearTimeout(dataTimer); dataTimer = setTimeout(() => { dataBox.textContent = dataCode(); }, 80); }
    const ext = () => ({ js: 'js', py: 'py', lua: 'lua' }[langSel.value]);
    async function save() {
      const base = (Q.assets.safe(nameIn.value || 'level') || 'level');
      const p = `levels/${base}.level.json`;
      if (p !== savePath && Q.fs.exists(p) && !(await Q.confirm(`Replace ${p}?`, 'A level with that name is already in this project.', false))) return;
      Q.fs.write(p, JSON.stringify({ format: 'codeditor-level', version: 1, cols, rows, tiles: tiles.map(({ ch, name, src, color }) => ({ ch, name, src, color })), map }, null, 1));
      Q.fs.write(`levels/${base}.${ext()}`, dataCode());
      savePath = p; dirty = false; Q.bus.emit('fs:changed');
      toast(`Saved <b>levels/${esc(base)}.${ext()}</b> (your level data) — load it in your code`, 'success', 3600);
    }
    function loadJSON(text, p) {
      try {
        const d = JSON.parse(text); if (!Array.isArray(d.map) || !d.map.length) throw 0;
        rows = d.map.length; cols = Math.max(...d.map.map((r) => r.length)); map = d.map.map((r) => (r + '.'.repeat(cols)).slice(0, cols));
        tiles = (d.tiles || BASIC).map((t) => ({ ...t })); Object.keys(imgs).forEach((k) => delete imgs[k]); tiles.forEach(loadTileImg);
        savePath = p; nameIn.value = p.split('/').pop().replace(/\.level\.json$/, ''); undo.length = redo.length = 0; renderTiles(); changed(false); dirty = false;
      } catch { toast('That level file couldn’t be read.', 'error'); }
    }
    function openPicker() {
      const list = Q.fs.list().filter((p) => /\.level\.json$/.test(p));
      if (!list.length) return toast('No saved levels in this project yet.', 'info');
      const body = h('div', { class: 'st-pick' }, ...list.map((p) => h('button', { class: 'btn', style: { margin: '4px' }, text: p, onclick: () => { m.close(); loadJSON(Q.fs.read(p), p); } })));
      const m = Q.modal({ title: 'Open a level', body, buttons: [{ label: 'Cancel' }] });
    }
    const keys = (e) => {
      if (!ov.back.isConnected || document.querySelector('.modal-back')) return;
      if (isEditableTarget(e.target)) return;
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') { e.preventDefault(); tryClose(); return; }
      if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
      if (mod && k === 'y') { e.preventDefault(); doRedo(); return; }
      if (mod && k === 's') { e.preventDefault(); save(); return; }
      if (mod) return;
      const map2 = { b: 'brush', e: 'eraser', g: 'fill', r: 'rect', i: 'picker' };
      if (map2[k]) { setTool(map2[k]); e.preventDefault(); }
      else { const t = tiles.find((x) => x.ch === e.key); if (t) setTile(t.ch); }
    };
    addEventListener('keydown', keys, true);
    async function tryClose() { if (dirty && !(await Q.confirm('Close Level Studio?', 'Your level has unsaved changes.', false))) return; removeEventListener('keydown', keys, true); ov.close(); }

    renderTiles(); setTool('brush'); setTile('#');
    requestAnimationFrame(() => { changed(false); dirty = false; });
    if (path && Q.fs.exists(path)) loadJSON(Q.fs.read(path), path);
    return { get map() { return map; }, set: (x, y, ch) => { snap(); set(x, y, ch); changed(); }, save, dataCode, close: tryClose, resize, setTool, setTile };
  }

  /* ---------- chooser ---------- */
  function open() {
    const card = (ic, title, text, fn) => h('button', { class: 'gs-card', onclick: () => { m.close(); fn(); } }, h('div', { class: 'gs-ic', text: ic }), h('b', { text: title }), h('span', { class: 'muted small', text }));
    const body = h('div', { class: 'gs-cards' },
      card('🎨', 'Pixel Studio', 'Draw sprites and animate them frame by frame. Saves a PNG your code can load.', () => pixel()),
      card('🗺️', 'Level Studio', 'Paint tile maps for your levels. Saves the level data — you write the code that draws it (the Tile maps lesson shows how).', () => level()));
    const m = Q.modal({ title: '🎮 Game Studio', body, buttons: [{ label: 'Close' }] });
  }

  Q.studio = { open, pixel, level, decodeSprite };
})();
