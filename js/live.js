/* Codeditor — 👥 Live coding: edit the same file together in real time.
   The host's copy is the source of truth. Every edit is one op {p, d, i} (at position p delete d chars, insert i).
   Guests send one op at a time and wait for it to come back (central-server OT, like Google Docs' first design);
   every op carries a checksum of the host's text, so if anything ever drifts the guest re-syncs. */
(() => {
  const { h, esc, icon, toast } = Q;
  const N = () => Q.net;
  let S = null; // the session

  /* ---------- operational transform (the classic retain / delete / insert scheme) ----------
     An op is an array: a positive number keeps that many chars, a negative number deletes, a string inserts. */
  const isR = (x) => typeof x === 'number' && x > 0, isD = (x) => typeof x === 'number' && x < 0, isI = (x) => typeof x === 'string';
  function builder() {
    const ops = [];
    const b = {
      ops,
      retain(n) { if (n <= 0) return b; if (isR(ops[ops.length - 1])) ops[ops.length - 1] += n; else ops.push(n); return b; },
      insert(s) { if (!s) return b; const l = ops.length; if (isI(ops[l - 1])) ops[l - 1] += s; else if (isD(ops[l - 1])) { if (isI(ops[l - 2])) ops[l - 2] += s; else { ops.push(ops[l - 1]); ops[l - 1] = s; } } else ops.push(s); return b; },
      del(n) { if (n <= 0) return b; if (isD(ops[ops.length - 1])) ops[ops.length - 1] -= n; else ops.push(-n); return b; },
    };
    return b;
  }
  const baseLen = (op) => op.reduce((t, x) => t + (isR(x) ? x : isD(x) ? -x : 0), 0);
  const fromReplace = (len, p, d, i) => builder().retain(p).del(d).insert(i).retain(len - p - d).ops;
  function apply(text, op) {
    if (baseLen(op) !== text.length) throw new Error('op does not fit the text');
    let out = '', k = 0;
    for (const x of op) { if (isR(x)) { out += text.slice(k, k + x); k += x; } else if (isD(x)) k -= x; else out += x; }
    return out;
  }
  // transform(a, b) → [a', b'] with apply(apply(S, a), b') === apply(apply(S, b), a'); a's inserts go first on ties
  function transform(a, b) {
    if (baseLen(a) !== baseLen(b)) throw new Error('ops are for different texts');
    const A = builder(), Bp = builder();
    let i = 0, j = 0, x = a[i++], y = b[j++];
    for (let guard = 0; guard < 100000; guard++) {
      if (x === undefined && y === undefined) break;
      if (isI(x)) { A.insert(x); Bp.retain(x.length); x = a[i++]; continue; }
      if (isI(y)) { A.retain(y.length); Bp.insert(y); y = b[j++]; continue; }
      if (x === undefined || y === undefined) throw new Error('ops too short');
      if (isR(x) && isR(y)) { const m = Math.min(x, y); A.retain(m); Bp.retain(m); if (x > y) { x -= y; y = b[j++]; } else if (x === y) { x = a[i++]; y = b[j++]; } else { y -= x; x = a[i++]; } }
      else if (isD(x) && isD(y)) { if (-x > -y) { x -= y; y = b[j++]; } else if (x === y) { x = a[i++]; y = b[j++]; } else { y -= x; x = a[i++]; } }
      else if (isD(x) && isR(y)) { const m = Math.min(-x, y); A.del(m); if (-x > y) { x += y; y = b[j++]; } else if (-x === y) { x = a[i++]; y = b[j++]; } else { y += x; x = a[i++]; } }
      else if (isR(x) && isD(y)) { const m = Math.min(x, -y); Bp.del(m); if (x > -y) { x += y; y = b[j++]; } else if (x === -y) { x = a[i++]; y = b[j++]; } else { y += x; x = a[i++]; } }
    }
    return [A.ops, Bp.ops];
  }
  // live rooms carry at most ~4 KB per message: split a big paste into several small inserts
  function splitOp(op) {
    if (JSON.stringify(op).length < 3000) return [op];
    let p = 0, k = 0; if (isR(op[k])) p = op[k++];
    const d = isD(op[k]) ? -op[k++] : 0; const ins = isI(op[k]) ? op[k++] : ''; const rest = isR(op[k]) ? op[k++] : 0;
    if (k !== op.length || !ins) return [op]; // not a simple insert/replace: send as is
    const C = 2000, out = [];
    for (let off = 0; off < ins.length; off += C) { const b = builder(); b.retain(p + off); if (off === 0) b.del(d); b.insert(ins.slice(off, off + C)); b.retain(rest); out.push(b.ops); }
    return out;
  }
  const validOp = (op) => Array.isArray(op) && op.length < 2000 && op.every((x) => (typeof x === 'number' && Number.isInteger(x) && x !== 0) || (typeof x === 'string' && x.length < 50000));
  function hash(s) { let x = 2166136261; for (let k = 0; k < s.length; k++) { x ^= s.charCodeAt(k); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36) + ':' + s.length; }
  function diff(a, b) { // the op that turns a into b
    if (a === b) return null;
    let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
    let q = 0; while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
    return fromReplace(a.length, p, a.length - p - q, b.slice(p, b.length - q));
  }
  const code = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');

  /* ---------- editor glue ---------- */
  const ed = () => Q.app.editor;
  function setText(id, text) { ed().set(id, text); }
  function applyRemote(id, op) {
    const before = ed().get(id) ?? S.text; const target = apply(before, op);
    S.applying = true;
    try {
      if (ed().applyOp) { // edit only the changed ranges, so the local cursor stays put
        const edits = []; let k = 0;
        for (const x of op) { if (isR(x)) k += x; else if (isD(x)) { edits.push([k, k - x, '']); k -= x; } else edits.push([k, k, x]); }
        for (let e = edits.length - 1; e >= 0; e--) ed().applyOp(id, edits[e][0], edits[e][1], edits[e][2]);
        if (ed().get(id) !== target) setText(id, target);
      } else setText(id, target);
    } finally { S.applying = false; }
    S.text = target;
  }

  /* ---------- session ---------- */
  async function start() {
    if (S) return panel();
    const id = Q.app.editor.activeId;
    if (!id || Q.app.isVirtual(id) || Q.assets.isData(Q.fs.read(id) || '')) return toast('Open a code file from your project first — that’s the file you’ll edit together.', 'info', 4000);
    if (!(await name())) return;
    const B = await N().backend(); if (!B) return toast('Live coding needs the internet (or the claude.ai version with live rooms).', 'error', 4000);
    const room = code();
    begin(B, room, true, id);
  }
  async function join(roomCode) {
    if (S) return panel();
    if (!roomCode) { roomCode = await Q.prompt('Join a live session', '', 'Room code, like k3v6q2'); if (!roomCode) return; }
    roomCode = String(roomCode).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (roomCode.length < 4) return toast('That code looks too short.', 'error');
    if (!(await name())) return;
    const B = await N().backend(); if (!B) return toast('Live coding needs the internet (or the claude.ai version with live rooms).', 'error', 4000);
    begin(B, roomCode, false, null);
  }
  async function name() { if (N().me.name) return true; const n = await Q.prompt('Pick a nickname', '', 'Your friends will see it next to your cursor'); if (!n || !n.trim()) return false; N().setName(n); return true; }

  async function begin(B, roomCode, host, fileId) {
    let r;
    try { r = await B.room('live-' + roomCode); } catch (e) { return toast(esc(e.message || 'Couldn’t connect.'), 'error'); }
    S = { B, r, code: roomCode, host, fileId, docId: host ? fileId : '@live:' + roomCode, text: '', rev: 0, hist: [], out: null, buf: [], applying: false, peers: [], chat: [], snapParts: null, hostPeer: null, offs: [], synced: host, lastHello: 0 };
    const me = N().me;
    r.presence({ name: me.name, color: me.color, host, file: host ? fileId : null });
    if (host) {
      S.text = ed().get(fileId) ?? Q.fs.read(fileId) ?? '';
      S.title = fileId.split('/').pop();
    }
    /* incoming messages */
    S.offs.push(r.on('op', (m) => { const d = m.data; if (!d || typeof d !== 'object') return; host ? hostReceive(m, d) : guestReceive(d); }));
    S.offs.push(r.on('hello', (m) => { if (host && !m.isMe) sendSnapshot(); }));
    S.offs.push(r.on('snap', (m) => { if (!host) gotSnapPart(m.data); }));
    S.offs.push(r.on('chat', (m) => { const d = m.data; if (!d || typeof d.t !== 'string') return; S.chat.push({ n: N().clean(d.n, 24) || 'someone', c: /^#[0-9a-f]{6}$/i.test(d.c) ? d.c : '#888', t: N().clean(d.t, 300), me: m.isMe }); if (S.chat.length > 100) S.chat.shift(); panel(); if (!m.isMe) Q.sound?.play('click'); }));
    S.offs.push(r.on('run', (m) => { if (!m.isMe) { toast(`${esc(N().clean(m.data?.n, 24) || 'Someone')} ran the code`, 'info', 1500); runLocal(); } }));
    S.offs.push(r.on('end', (m) => { if (!host && !m.isMe) { toast('The host ended the live session.', 'info', 3500); stop(true); } }));
    S.offs.push(r.onPeers((list) => { S.peers = list; const hp = list.find((p) => p.presence?.host); S.hostPeer = hp?.peer || null; paintCursors(); panel(); }));
    /* local edits */
    S.offChange = (fid, text) => {
      if (!S || S.applying || fid !== S.docId || !S.synced) return;
      const o = diff(S.text, text ?? ed().get(fid) ?? ''); S.text = ed().get(fid) ?? text;
      if (!o) return;
      const pieces = splitOp(o);
      pieces.forEach((piece, k) => { if (host) hostApply(piece, r.peer, null, k === pieces.length - 1); else guestLocal(piece); });
    };
    Q.app.editor.onChange((fid, t) => S && S.offChange(fid, t));
    S.cursorTimer = setInterval(sendCursor, 150);
    if (host) {
      toast(`Live session started — room code <b>${roomCode}</b>`, 'success', 3500);
      setTimeout(sendSnapshot, 300);
    } else {
      Q.app.openVirtual(S.docId, { title: `👥 Live (connecting…)`, lang: 'plaintext', value: '' });
      const ask = () => { if (S && !S.synced) { r.emit('hello', { n: me.name }); setTimeout(ask, 2500); } };
      setTimeout(ask, 400);
      setTimeout(() => { if (S && !S.synced) toast('No one is hosting that room yet. Check the code with your friend.', 'info', 4500); }, 15000);
    }
    panel();
  }

  /* host side */
  function hostApply(o, fromPeer, opId, withHash = true) {
    S.rev++; S.hist.push(o); if (S.hist.length > 500) { S.hist.shift(); S.histBase = (S.histBase || 0) + 1; }
    S.r.emit('op', { o, rev: S.rev, from: fromPeer, id: opId, h: withHash ? hash(S.text) : null });
  }
  function hostReceive(m, d) {
    if (m.isMe || !validOp(d.o) || typeof d.base !== 'number') return;
    let o = d.o; const base = d.base, start = base - (S.histBase || 0);
    if (start < 0 || base > S.rev) return sendSnapshot(); // too far behind: re-sync
    try { for (let k = start; k < S.hist.length; k++) o = transform(S.hist[k], o)[1]; applyRemote(S.docId, o); } catch { return sendSnapshot(); }
    hostApply(o, m.peer, d.id);
  }
  function sendSnapshot() {
    if (!S || !S.host) return;
    const t = S.text = ed().get(S.docId) ?? S.text; const id = Math.random().toString(36).slice(2, 8);
    const parts = []; for (let k = 0; k < t.length || k === 0; k += 2800) parts.push(t.slice(k, k + 2800));
    const lang = ed().langOf?.(S.docId) || 'plaintext';
    parts.forEach((part, k) => setTimeout(() => S && S.r.emit('snap', { id, k, n: parts.length, part, rev: S.rev, lang, title: S.title, h: hash(t) }), k * 60));
  }
  /* guest side */
  function gotSnapPart(d) {
    if (!d || typeof d.part !== 'string' || typeof d.n !== 'number' || d.n > 400) return;
    if (!S.snapParts || S.snapParts.id !== d.id) S.snapParts = { id: d.id, parts: new Array(d.n), got: 0 };
    if (S.snapParts.parts[d.k] == null) { S.snapParts.parts[d.k] = d.part; S.snapParts.got++; }
    if (S.snapParts.got < d.n) return;
    const text = S.snapParts.parts.join(''); S.snapParts = null;
    if (hash(text) !== d.h) return;
    if (S.synced && S.out) return; // mid-edit: wait for our op to come back, the checksum will tell if we drift
    S.applying = true; try { setText(S.docId, text); } finally { S.applying = false; }
    S.text = text; S.rev = d.rev; S.out = null; S.buf = []; S.synced = true;
    if (Q.app.virtuals.has(S.docId)) { const v = Q.app.virtuals.get(S.docId); v.title = `👥 ${N().clean(d.title, 40) || 'Live file'}`; Q.app.editor.setLang?.(S.docId, d.lang || 'plaintext'); Q.app.renderTabs?.(); }
    Q.app.activate(S.docId); panel();
  }
  function guestLocal(o) {
    if (S.out) { S.buf.push(o); return; }
    S.out = { o, id: Math.random().toString(36).slice(2, 9) };
    S.r.emit('op', { o, base: S.rev, id: S.out.id });
  }
  function guestReceive(d) {
    if (!S.synced || !validOp(d.o) || typeof d.rev !== 'number') return;
    if (d.rev !== S.rev + 1) { if (d.rev > S.rev + 1) resync(); return; }
    S.rev = d.rev;
    if (S.out && d.id === S.out.id) { // our op came back = acknowledged
      S.out = null;
      if (S.buf.length) { const nx = S.buf.shift(); S.out = { o: nx, id: Math.random().toString(36).slice(2, 9) }; S.r.emit('op', { o: nx, base: S.rev, id: S.out.id }); }
      else if (d.h && hash(S.text) !== d.h) resync();
      return;
    }
    let o = d.o;
    try {
      if (S.out) { const [o2, a2] = transform(o, S.out.o); o = o2; S.out.o = a2; }
      S.buf = S.buf.map((b) => { const [o2, b2] = transform(o, b); o = o2; return b2; });
    } catch { return resync(); }
    applyRemote(S.docId, o);
    if (!S.out && !S.buf.length && d.h && hash(S.text) !== d.h) resync();
  }
  function resync() { if (!S || S.host) return; S.synced = false; S.out = null; S.buf = []; S.r.emit('hello', { n: N().me.name }); }

  /* ---------- cursors ---------- */
  let lastSel = '';
  function sendCursor() {
    if (!S || Q.app.editor.activeId !== S.docId) return;
    const sel = Q.app.editor.selOffsets?.(); if (!sel) return;
    const k = sel.join(',') + ':' + S.rev; if (k === lastSel) return; lastSel = k;
    S.r.presence({ sel, rev: S.rev });
  }
  const colorClass = new Map(); let sheet = null;
  function cls(color, name) {
    const key = color + '|' + name; if (colorClass.has(key)) return colorClass.get(key);
    const c = /^#[0-9a-f]{6}$/i.test(color) ? color : '#888888'; const n = 'lv' + colorClass.size;
    if (!sheet) { sheet = document.createElement('style'); document.head.append(sheet); }
    const label = JSON.stringify(String(name || '').slice(0, 16));
    sheet.textContent += `.monaco-editor .${n}-sel{background:${c}33}.monaco-editor .${n}-cur{position:relative}.monaco-editor .${n}-cur::after{content:'';display:inline-block;width:0;height:1.25em;vertical-align:text-bottom;border-left:2px solid ${c};margin-right:-2px}.monaco-editor .${n}-cur::before{content:${label};position:absolute;transform:translate(-1px,-15px);font:600 10px/1.3 var(--ui,sans-serif);color:#111;background:${c};padding:0 4px;border-radius:3px 3px 3px 0;pointer-events:none;white-space:nowrap;z-index:5}.fb-mark.${n}-sel{background:${c}33}.fb-mark.${n}-cur{background:${c};width:2px!important}`;
    colorClass.set(key, n); return n;
  }
  function paintCursors() {
    if (!S || !Q.app.editor.has(S.docId)) return;
    const text = Q.app.editor.get(S.docId) || '';
    const list = [];
    S.peers.forEach((p) => {
      if (p.isMe || !Array.isArray(p.presence?.sel)) return;
      const n = cls(p.presence.color, N().clean(p.presence.name, 16) || 'friend');
      const [a, b] = p.presence.sel.map((x) => Math.max(0, Math.min(text.length, x | 0)));
      const lc = (off) => { const pre = text.slice(0, off); return { line: pre.split('\n').length, col: off - pre.lastIndexOf('\n') }; };
      const A = lc(Math.min(a, b)), Bc = lc(Math.max(a, b)), H = lc(b);
      if (a !== b && A.line === Bc.line) list.push({ line: A.line, start: A.col, end: Bc.col, className: n + '-sel' });
      list.push({ line: H.line, start: H.col, after: '​', className: n + '-cur' });
    });
    Q.app.editor.decorate('live', S.docId, list);
  }

  /* ---------- run together ---------- */
  function runLocal() { if (!S) return; Q.app.activate(S.docId); Q.app.exec?.('run.run') ?? Q.app.cmd?.('run.run'); }

  /* ---------- the panel ---------- */
  let el = null;
  function panel() {
    if (!S) { el?.remove(); el = null; return; }
    if (!el) { el = h('div', { class: 'live-panel', role: 'region', 'aria-label': 'Live session' }); document.body.append(el); }
    const scroll = el.querySelector('.live-chat')?.scrollTop;
    el.innerHTML = '';
    const peers = S.peers.length ? S.peers : [{ isMe: true, presence: { name: N().me.name, color: N().me.color, host: S.host } }];
    const chatLog = h('div', { class: 'live-chat' }, ...S.chat.map((c) => h('div', { class: 'live-msg' + (c.me ? ' me' : '') }, h('b', { style: { color: c.c }, text: c.n }), h('span', { text: ' ' + c.t }))));
    const input = h('input', { class: 'input sm', placeholder: 'Say something…', maxlength: 300, 'aria-label': 'Chat message' });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && input.value.trim()) { S.r.emit('chat', { n: N().me.name, c: N().me.color, t: input.value.trim() }); input.value = ''; } });
    el.append(
      h('div', { class: 'live-head' }, h('b', { text: '👥 Live' }), h('code', { class: 'live-code', title: 'Room code — click to copy', text: S.code, onclick: () => Q.app.copyText(S.code, 'Room code copied') }),
        h('span', { class: 'muted small', text: S.synced ? (S.host ? 'hosting' : 'connected') : 'connecting…' }), h('div', { class: 'grow' }),
        h('button', { class: 'icon-btn sm', title: 'Minimise', html: el.classList.contains('min') ? '▴' : '▾', onclick: () => { el.classList.toggle('min'); panel(); } }),
        h('button', { class: 'icon-btn sm', title: S.host ? 'End the session for everyone' : 'Leave', html: icon('close', 13), onclick: () => stop() })),
      h('div', { class: 'live-peers' }, ...peers.map((p) => h('span', { class: 'live-peer', title: p.presence?.host ? 'host' : '' }, h('i', { style: { background: /^#[0-9a-f]{6}$/i.test(p.presence?.color) ? p.presence.color : '#888' } }), document.createTextNode(`${N().clean(p.presence?.name, 16) || 'friend'}${p.isMe ? ' (you)' : ''}${p.presence?.host ? ' ★' : ''}`)))),
      chatLog, h('div', { class: 'live-foot' }, input, h('button', { class: 'btn sm', html: `${icon('play', 11)} Run for all`, title: 'Run the code on everyone’s screen', onclick: () => { S.r.emit('run', { n: N().me.name }); runLocal(); } })));
    if (scroll != null) chatLog.scrollTop = scroll; requestAnimationFrame(() => (chatLog.scrollTop = chatLog.scrollHeight));
  }
  function stop(silent) {
    if (!S) return;
    if (S.host) S.r.emit('end', {});
    const s = S; S = null;
    clearInterval(s.cursorTimer); s.offs.forEach((f) => { try { f(); } catch {} });
    try { Q.app.editor.decorate('live', s.docId, []); } catch {}
    setTimeout(() => s.r.leave(), 200);
    if (!s.host && Q.app.virtuals.has(s.docId)) {
      const text = Q.app.editor.get(s.docId) || '';
      Q.app.closeVirtual(s.docId);
      if (text.trim() && !silent) toast('Left the session.', 'info');
      if (text.trim()) { const name = `live-${s.code}.txt`; Q.fs.write(name, text); Q.bus.emit('fs:changed'); toast(`Saved a copy as <b>${esc(name)}</b>`, 'info', 3000); }
    }
    panel();
  }
  setInterval(() => { if (S) paintCursors(); }, 250);

  Q.live = { start, join, stop, get session() { return S; }, _transform: transform, _diff: diff, _apply: apply, _fromReplace: fromReplace, _split: splitOp };
})();
