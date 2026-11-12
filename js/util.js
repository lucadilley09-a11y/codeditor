/* Codeditor — shared helpers */
window.Q = window.Q || {};
Q.APP = 'Codeditor'; // the app's name — change it here

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Icons (inline SVG, stroke-based) ---------- */
  const P = {
    files: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    learn: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    ext: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17.5h7M17.5 14v7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
    stop: '<rect x="6" y="6" width="12" height="12" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10v6M9 13h6"/>',
    filePlus: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M12 11v6M9 14h6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    folderOpen: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v1"/><path d="M3 19 5.5 11h16L19 19z"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    terminal: '<path d="m5 8 4 4-4 4M12 16h7"/><rect x="2" y="3" width="20" height="18"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16"/><path d="M9 4v16"/>',
    rightbar: '<rect x="3" y="4" width="18" height="16"/><path d="M15 4v16"/>',
    panel: '<rect x="3" y="4" width="18" height="16"/><path d="M3 15h18"/>',
    zen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    flame: '<path d="M12 2s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 1-3s0 3 2 3c0-4 2-6 2-10z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    lock: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2" fill="currentColor"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor"/><circle cx="16" cy="10" r="1.2" fill="currentColor"/><path d="M12 21a2 2 0 0 1 0-4h2a3 3 0 0 0 3-3"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    wand: '<path d="m15 4 1-2 1 2 2 1-2 1-1 2-1-2-2-1zM4 20 14 10M18 13l.7 1.3L20 15l-1.3.7L18 17l-.7-1.3L16 15l1.3-.7z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    copy: '<rect x="8" y="8" width="13" height="13"/><path d="M16 8V4H3v13h5"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    project: '<path d="M3 6h7l2 2h9v11H3z"/>',
    split: '<rect x="3" y="4" width="18" height="16"/><path d="M12 4v16"/>',
    zip: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M10 6h1M10 9h1M10 12h1M10 15h1v2h-1z"/>',
    format: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  };
  const icon = (name, size = 18, extra = '') =>
    `<svg class="ic ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  /* ---------- Toasts ---------- */
  function toast(msg, type = 'info', ms = 2600) {
    const host = $('#toasts');
    if (!host) return;
    const el = h('div', { class: `toast ${type}`, html: `${icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : type === 'xp' ? 'star' : 'info', 16)}<span>${msg}</span>` });
    host.append(el);
    while (host.children.length > 3) host.firstElementChild.remove();
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ms);
  }

  /* ---------- Modal / prompt / confirm ---------- */
  function modal({ title, body, buttons = [], wide = false, onClose, cls = '' }) {
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal' + (wide ? ' wide' : '') + (cls ? ' ' + cls : '') });
    const close = (val) => { back.classList.remove('in'); setTimeout(() => back.remove(), 160); onClose && onClose(val); };
    box.append(h('div', { class: 'modal-head' }, h('h3', { text: title }), h('button', { class: 'icon-btn', html: icon('close', 16), title: 'Close', onclick: () => close(null) })));
    const bodyEl = h('div', { class: 'modal-body' });
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.append(body);
    box.append(bodyEl);
    if (buttons.length) {
      const foot = h('div', { class: 'modal-foot' });
      buttons.forEach((b) => foot.append(h('button', { class: 'btn ' + (b.primary ? 'primary' : b.danger ? 'danger' : ''), text: b.label, onclick: () => { const r = b.onclick ? b.onclick(bodyEl) : b.value; if (r !== false) close(r === undefined ? b.value : r); } })));
      box.append(foot);
    }
    back.append(box);
    back.addEventListener('mousedown', (e) => { if (e.target === back) close(null); });
    back.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } });
    document.body.append(back);
    requestAnimationFrame(() => back.classList.add('in'));
    return { el: bodyEl, close };
  }

  function prompt(title, value = '', placeholder = '') {
    return new Promise((res) => {
      const input = h('input', { class: 'input', value, placeholder, spellcheck: 'false' });
      const m = modal({ title, body: input, onClose: (v) => res(v), buttons: [
        { label: 'Cancel', value: null },
        { label: 'OK', primary: true, onclick: () => input.value.trim() || false },
      ] });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim()) m.close(input.value.trim()); });
      setTimeout(() => { input.focus(); const dot = value.lastIndexOf('.'); input.setSelectionRange(0, dot > 0 ? dot : value.length); }, 30);
    });
  }

  function confirm(title, text, danger = true) {
    return new Promise((res) => {
      modal({ title, body: `<p>${text}</p>`, onClose: (v) => res(!!v), buttons: [
        { label: 'Cancel', value: false },
        { label: danger ? 'Delete' : 'OK', danger, primary: !danger, value: true },
      ] });
    });
  }

  /* ---------- Context menu ---------- */
  function contextMenu(x, y, items, cls = '') {
    $$('.ctx').forEach((m) => m.remove());
    const m = h('div', { class: 'ctx ' + cls });
    if (!items.some((it) => it !== '-' && it.icon)) m.classList.add('noicons');
    items.forEach((it) => {
      if (it === '-') return m.append(h('div', { class: 'ctx-sep' }));
      m.append(h('button', { class: 'ctx-item' + (it.danger ? ' danger' : ''), html: `<i class="ci">${it.icon ? icon(it.icon, 14) : ''}</i><span class="lbl">${esc(it.label)}</span>${it.key ? `<kbd>${esc(it.key)}</kbd>` : ''}`, onclick: () => { m.remove(); it.action(); } }));
    });
    document.body.append(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.min(x, innerWidth - r.width - 6) + 'px';
    m.style.top = Math.min(y, innerHeight - r.height - 6) + 'px';
    const off = (e) => { if (!m.contains(e.target)) { m.remove(); removeEventListener('mousedown', off, true); } };
    setTimeout(() => addEventListener('mousedown', off, true));
  }

  /* ---------- Download helpers ---------- */
  function download(name, data, type = 'text/plain') {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- Minimal ZIP writer (store, no compression) ---------- */
  const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) { // files: {path: string}
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    for (const [path, content] of Object.entries(files)) {
      const name = enc.encode(path), data = enc.encode(content), crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      parts.push(new Uint8Array(local.buffer), name, data);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
      cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cenSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    const count = Object.keys(files).length;
    end.setUint16(8, count, true); end.setUint16(10, count, true);
    end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  /* ---------- Tiny markdown renderer ---------- */
  function md(src) {
    const lines = String(src).replace(/\r/g, '').split('\n');
    let out = '', inCode = false, code = [], list = null;
    const inline = (s) => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const closeList = () => { if (list) { out += `</${list}>`; list = null; } };
    for (const line of lines) {
      if (line.startsWith('```')) {
        if (inCode) { out += `<pre><code>${esc(code.join('\n'))}</code></pre>`; code = []; inCode = false; }
        else { closeList(); inCode = true; }
        continue;
      }
      if (inCode) { code.push(line); continue; }
      let m;
      if ((m = line.match(/^(#{1,6})\s+(.*)/))) { closeList(); out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; }
      else if ((m = line.match(/^\s*[-*]\s+(.*)/))) { if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; }
      else if ((m = line.match(/^\s*\d+\.\s+(.*)/))) { if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; }
      else if ((m = line.match(/^>\s?(.*)/))) { closeList(); out += `<blockquote>${inline(m[1])}</blockquote>`; }
      else if (/^---+$/.test(line.trim())) { closeList(); out += '<hr>'; }
      else if (!line.trim()) { closeList(); }
      else { closeList(); out += `<p>${inline(line)}</p>`; }
    }
    if (inCode) out += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
    closeList();
    return out;
  }

  /* ---------- Event bus ---------- */
  const bus = {
    map: {},
    on(ev, fn) { (this.map[ev] = this.map[ev] || []).push(fn); },
    emit(ev, ...a) { (this.map[ev] || []).forEach((fn) => { try { fn(...a); } catch (e) { console.error(e); } }); },
  };

  /* ---------- Storage ---------- */
  const store = {
    /* other copies of the app (another tab, the chat preview) write to the same storage:
       watch(key, fn) calls fn(newValue) when one of them saves */
    watch(key, fn) { addEventListener('storage', (e) => { if (e.key === 'quill.' + key && e.newValue) { try { fn(JSON.parse(e.newValue)); } catch {} } }); },
    get(key, def) { try { const v = localStorage.getItem('quill.' + key); return v == null ? def : JSON.parse(v); } catch { return def; } },
    set(key, val) { try { localStorage.setItem('quill.' + key, JSON.stringify(val)); } catch (e) { toast('Storage is full — download a backup of your projects.', 'error'); } },
  };

  /* ---------- Confetti ---------- */
  function confetti(n = 120) {
    const c = h('canvas', { class: 'confetti' });
    document.body.append(c);
    const ctx = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const colors = ['#7c5cff', '#22d3ee', '#facc15', '#f472b6', '#4ade80', '#fb923c'];
    const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.45, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4, r: Math.random() * 6 + 3, c: colors[(Math.random() * colors.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4 }));
    let t = 0;
    (function frame() {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.45; p.vx *= 0.99; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (++t < 140) requestAnimationFrame(frame); else c.remove();
    })();
  }

  /* merge progress from another copy into ours: never lose done lessons, XP, badges or stats */
  function mergeProgress(a, b) {
    if (!b || typeof b !== 'object') return a;
    for (const k of Object.keys(b)) {
      const x = a[k], y = b[k];
      if (!(k in a)) a[k] = y;
      else if (typeof x === 'number' && typeof y === 'number') a[k] = Math.max(x, y);
      else if (Array.isArray(x) && Array.isArray(y)) { const seen = new Set(x.map((v) => JSON.stringify(v))); y.forEach((v) => { if (!seen.has(JSON.stringify(v))) x.push(v); }); }
      else if (x && y && typeof x === 'object' && typeof y === 'object') mergeProgress(x, y);
      else if (typeof x === 'string' && typeof y === 'string' && /^\d{4}-\d\d-\d\d/.test(x) && /^\d{4}-\d\d-\d\d/.test(y) && y > x) a[k] = y;
    }
    return a;
  }
  Object.assign(Q, { mergeProgress, $, $$, h, esc, uid, debounce, clamp, icon, toast, modal, prompt, confirm, contextMenu, download, zip, md, bus, store, confetti });
})();
