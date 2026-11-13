/* Codeditor — online features plumbing (Library, Game Jams, Live coding).
   Two backends with the same small interface:
   - inside claude.ai: the page's shared db + live room (people who can open the page)
   - anywhere else (GitHub Pages, a downloaded copy): a free public MQTT message server over WebSockets.
     No accounts. Anyone could change or delete posts, and the server may be wiped some day —
     so each copy re-posts your own posts if they go missing. */
(() => {
  const { store, uid } = Q;
  const NS = 'cdtr/v1/';
  const BROKERS = window.__cdBrokers || ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const COLORS = ['#f2b544', '#60a5fa', '#4ade80', '#f87171', '#c084fc', '#fb923c', '#2dd4bf', '#f472b6'];

  /* ---------- who am I (display name is just a nickname you pick) ---------- */
  const me = (() => {
    const s = store.get('net', {});
    if (!s.id) s.id = 'u' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 14);
    if (!s.color) s.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    store.set('net', s);
    return s;
  })();
  const setName = (n) => { me.name = String(n || '').trim().slice(0, 24); const s = store.get('net', {}); s.name = me.name; store.set('net', s); };
  const clean = (t, n = 200) => String(t ?? '').replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g, ' ').slice(0, n);

  /* ===================== tiny MQTT 3.1.1 client (QoS 0) over WebSocket ===================== */
  const enc = new TextEncoder(), dec = new TextDecoder();
  function varint(n) { const out = []; do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0); return out; }
  const str = (s) => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
  function packet(type, body) { const len = body.length; const head = [type, ...varint(len)]; const out = new Uint8Array(head.length + len); out.set(head, 0); out.set(body, head.length); return out; }
  function concat(a, b) { const o = new Uint8Array(a.length + b.length); o.set(a, 0); o.set(b, a.length); return o; }

  function mqtt(urls) {
    let ws = null, buf = new Uint8Array(0), pid = 1, alive = false, ping = 0, closed = false, attempt = 0;
    const subs = new Map(); // filter -> Set(fn)
    const waitConn = []; const statusFns = new Set();
    const setAlive = (v) => { if (alive === v) return; alive = v; statusFns.forEach((f) => f(v)); };
    const match = (filter, topic) => { const f = filter.split('/'), t = topic.split('/'); for (let i = 0; i < f.length; i++) { if (f[i] === '#') return true; if (f[i] !== '+' && f[i] !== t[i]) return false; } return f.length === t.length; };
    function send(bytes) { if (ws && ws.readyState === 1) { ws.send(bytes); return true; } return false; }
    function subscribeWire(filter) { const id = pid++ & 0xffff || 1; send(packet(0x82, new Uint8Array([id >> 8, id & 255, ...str(filter), 0]))); }
    function connect() {
      if (closed) return;
      const url = urls[attempt % urls.length]; attempt++;
      try { ws = new WebSocket(url, 'mqtt'); } catch { return setTimeout(connect, 2000); }
      ws.binaryType = 'arraybuffer';
      const giveUp = setTimeout(() => { try { ws.close(); } catch {} }, 8000);
      ws.onopen = () => { send(packet(0x10, new Uint8Array([...str('MQTT'), 4, 0x02, 0, 60, ...str('cd' + Math.random().toString(36).slice(2, 12))]))); };
      ws.onmessage = (e) => {
        buf = concat(buf, new Uint8Array(e.data));
        for (;;) {
          if (buf.length < 2) break;
          let mul = 1, len = 0, i = 1, b;
          do { if (i >= buf.length) return; b = buf[i++]; len += (b & 127) * mul; mul *= 128; } while (b & 128);
          if (buf.length < i + len) break;
          const type = buf[0] >> 4, flags = buf[0] & 15, body = buf.slice(i, i + len); buf = buf.slice(i + len);
          if (type === 2) { clearTimeout(giveUp); attempt = 0; setAlive(true); for (const f of subs.keys()) subscribeWire(f); waitConn.splice(0).forEach((f) => f()); clearInterval(ping); ping = setInterval(() => send(new Uint8Array([0xc0, 0])), 30000); }
          else if (type === 3) {
            const tl = (body[0] << 8) | body[1]; const topic = dec.decode(body.slice(2, 2 + tl)); let p = 2 + tl; if ((flags >> 1) & 3) p += 2;
            const payload = dec.decode(body.slice(p));
            for (const [f, fns] of subs) if (match(f, topic)) fns.forEach((fn) => { try { fn(topic, payload, !!(flags & 1)); } catch (err) { console.warn(err); } });
          }
        }
      };
      ws.onclose = () => { clearTimeout(giveUp); clearInterval(ping); setAlive(false); if (!closed) setTimeout(connect, Math.min(8000, 800 * attempt)); };
      ws.onerror = () => {};
    }
    connect();
    return {
      get alive() { return alive; },
      onStatus(fn) { statusFns.add(fn); return () => statusFns.delete(fn); },
      ready(ms = 9000) { return alive ? Promise.resolve(true) : new Promise((res) => { const t = setTimeout(() => res(false), ms); waitConn.push(() => { clearTimeout(t); res(true); }); }); },
      sub(filter, fn) { if (!subs.has(filter)) { subs.set(filter, new Set()); if (alive) subscribeWire(filter); } subs.get(filter).add(fn); return () => { const s = subs.get(filter); if (!s) return; s.delete(fn); if (!s.size) { subs.delete(filter); const id = pid++ & 0xffff || 1; send(packet(0xa2, new Uint8Array([id >> 8, id & 255, ...str(filter)]))); } }; },
      pub(topic, payload, retain = false) { const body = new Uint8Array([...str(topic), ...enc.encode(payload)]); return send(packet(retain ? 0x31 : 0x30, body)); },
      close() { closed = true; clearInterval(ping); try { ws && ws.close(); } catch {} },
    };
  }

  /* ===================== backend: MQTT (works anywhere with internet) ===================== */
  function mqttBackend() {
    let client = null;
    const conn = () => (client = client || mqtt(BROKERS));
    const topic = (coll, id) => NS + coll + '/' + id;
    const okId = (id) => /^[\w.~:@+-]{1,180}$/.test(id);
    return {
      kind: 'public',
      label: 'Public (free online server)',
      async start() { return conn().ready(); },
      onStatus: (fn) => { const off = conn().onStatus(fn); setTimeout(() => fn(conn().alive), 0); return off; },
      get online() { return !!client?.alive; },
      watch(coll, cb) { // cb(Map id -> doc), called on every change
        const docs = new Map(); let t = 0;
        const flush = () => { clearTimeout(t); t = setTimeout(() => cb(new Map(docs)), 60); };
        const off = conn().sub(NS + coll + '/+', (tp, payload) => {
          const id = tp.slice(NS.length + coll.length + 1);
          if (!payload) docs.delete(id); else { try { const d = JSON.parse(payload); if (d && typeof d === 'object') docs.set(id, d); } catch {} }
          flush();
        });
        setTimeout(() => cb(new Map(docs)), 2500); // empty collections: still answer
        return off;
      },
      async put(coll, id, doc) { if (!okId(id)) throw new Error('bad id'); await conn().ready(); const s = JSON.stringify(doc); if (s.length > 240000) throw new Error('too big'); if (!conn().pub(topic(coll, id), s, true)) throw new Error('offline'); },
      async del(coll, id) { await conn().ready(); conn().pub(topic(coll, id), '', true); },
      get(coll, id, ms = 6000) {
        return new Promise((res) => { let done = false; const fin = (v) => { if (done) return; done = true; off(); res(v); }; const off = conn().sub(topic(coll, id), (tp, p) => { if (!p) return fin(null); try { fin(JSON.parse(p)); } catch { fin(null); } }); setTimeout(() => fin(null), ms); });
      },
      async room(code) {
        await conn().ready();
        const base = NS + 'room/' + code + '/';
        const peerId = 'p' + Math.random().toString(36).slice(2, 10);
        const handlers = new Map(); const offs = []; const peers = new Map(); let mine = {}; const peerFns = new Set(); let beat = 0, sweep = 0;
        const emitPeers = () => { const list = [...peers.values()].map((p) => ({ ...p, isMe: p.peer === peerId })); peerFns.forEach((f) => f(list)); };
        offs.push(conn().sub(base + 'ev/+', (tp, p) => { const name = tp.slice((base + 'ev/').length); let m; try { m = JSON.parse(p); } catch { return; } if (!m || typeof m !== 'object') return; const fns = handlers.get(name); if (fns) fns.forEach((f) => f({ data: m.d, peer: m.p, isMe: m.p === peerId })); }));
        offs.push(conn().sub(base + 'pr', (tp, p) => { let m; try { m = JSON.parse(p); } catch { return; } if (!m || typeof m.p !== 'string') return; if (m.bye) peers.delete(m.p); else peers.set(m.p, { peer: m.p, presence: m.s || {}, seen: Date.now() }); emitPeers(); }));
        const say = () => conn().pub(base + 'pr', JSON.stringify({ p: peerId, s: mine }));
        beat = setInterval(say, 3000); say();
        sweep = setInterval(() => { let ch = false; for (const [k, v] of peers) if (k !== peerId && Date.now() - v.seen > 9000) { peers.delete(k); ch = true; } if (ch) emitPeers(); }, 2000);
        return {
          peer: peerId,
          emit(name, data) { const s = JSON.stringify({ p: peerId, d: data }); if (s.length > 60000) return false; return conn().pub(base + 'ev/' + name, s); },
          on(name, fn) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(fn); return () => handlers.get(name)?.delete(fn); },
          presence(patch) { mine = { ...mine, ...patch }; Object.keys(mine).forEach((k) => mine[k] == null && delete mine[k]); clearTimeout(this._pt); this._pt = setTimeout(say, 120); },
          onPeers(fn) { peerFns.add(fn); setTimeout(emitPeers, 0); return () => peerFns.delete(fn); },
          get online() { return !!client?.alive; },
          leave() { clearInterval(beat); clearInterval(sweep); conn().pub(base + 'pr', JSON.stringify({ p: peerId, bye: 1 })); offs.forEach((f) => f()); handlers.clear(); peerFns.clear(); },
        };
      },
    };
  }

  /* ===================== backend: claude.ai shared db + room ===================== */
  function claudeBackend(db, roomNS, user) {
    const statusFns = new Set();
    return {
      kind: 'claude',
      label: 'claude.ai (people who can open this page)',
      async start() { return true; },
      onStatus: (fn) => { statusFns.add(fn); setTimeout(() => fn(true), 0); return () => statusFns.delete(fn); },
      online: true,
      user,
      watch(coll, cb) {
        let done = false; const t = setTimeout(() => { if (!done) cb(new Map()); }, 10000);
        return db.collection(coll).limit(1000).onSnapshot((snap) => { done = true; clearTimeout(t); const m = new Map(); snap.docs.forEach((d) => m.set(d.id, d.data())); cb(m); }, () => { clearTimeout(t); cb(new Map()); });
      },
      async put(coll, id, doc) { await db.collection(coll).doc(id).set(JSON.parse(JSON.stringify(doc))); },
      async del(coll, id) { await db.collection(coll).doc(id).delete(); },
      async get(coll, id) { const s = await db.collection(coll).doc(id).get(); return s.exists ? s.data() : null; },
      async room(code) {
        if (!roomNS) throw new Error('Live rooms aren’t available here');
        const r = await roomNS.join(code.toLowerCase());
        const peerFns = new Set();
        let myPeer = null;
        const map = (list) => list.map((p) => { if (p.sameTab) myPeer = p.peer; return { peer: p.peer, presence: p.presence || {}, isMe: p.sameTab }; });
        const offPeers = r.onPeers((ch) => { const list = map(ch.peers); peerFns.forEach((f) => f(list)); });
        return {
          get peer() { return myPeer; },
          emit(name, data) { r.emit(name, data).catch(() => {}); return true; },
          on(name, fn) { return r.on(name, (m) => fn({ data: m.data, peer: m.peer, isMe: m.sameTab })); },
          presence(patch) { r.presence(patch).catch(() => {}); },
          onPeers(fn) { peerFns.add(fn); setTimeout(() => fn(map(r.peers())), 0); return () => peerFns.delete(fn); },
          get online() { return r.connected(); },
          leave() { offPeers(); peerFns.clear(); r.leave().catch(() => {}); },
        };
      },
    };
  }

  /* ===================== pick a backend ===================== */
  let readyP = null;
  function backend() {
    if (readyP) return readyP;
    readyP = (async () => {
      const inClaude = typeof window.claude?.use === 'function' || /claude\.ai|claudeusercontent|anthropic/.test(location.hostname);
      if (inClaude && typeof window.claude?.use === 'function') {
        try {
          const [db, room, user] = await Promise.all([claude.use('db'), claude.use('room'), claude.use('user')]);
          if (db) {
            if (user) { try { const id = await user.id(); if (id) me.cid = id; } catch {} }
            return claudeBackend(db, room, user);
          }
        } catch {}
        return null; // inside claude.ai without db: external sockets are blocked there anyway
      }
      if (inClaude) return null;
      if (!('WebSocket' in window)) return null;
      return mqttBackend();
    })();
    return readyP;
  }

  /* ---------- compress big payloads (projects) ---------- */
  async function packData(obj) { return Q.share?.pack ? Q.share.pack(obj) : btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
  async function unpackData(s) { return Q.share?.unpack ? Q.share.unpack(s) : JSON.parse(decodeURIComponent(escape(atob(s)))); }

  Q.net = { backend, me, setName, clean, packData, unpackData, mqtt, COLORS, BROKERS };
})();
