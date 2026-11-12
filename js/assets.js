/* Codeditor — asset pack: basic pixel sprites + sound effects made in code, plus your own uploads.
   Assets live in a project as data-URL text files under assets/ (e.g. assets/coin.png) and the preview
   maps those paths, so  img.src = "assets/coin.png"  and  new Audio("assets/jump.wav")  just work. */
(() => {
  const { h, esc, icon, toast } = Q;

  /* ---------- sprites: 8×8 pixel art, scaled ×4 ---------- */
  const PAL = { k: '#1b1f2a', w: '#ffffff', y: '#f5c542', Y: '#c98a12', r: '#ef4444', R: '#991b1b', g: '#4ade80', G: '#15803d', b: '#60a5fa', B: '#1d4ed8', p: '#c084fc', P: '#7e22ce', o: '#fb923c', n: '#a16207', N: '#713f12', s: '#cbd5e1', S: '#64748b', c: '#67e8f9', f: '#fcd5b4' };
  const SPRITES = {
    player: ['..kkkk..', '..kffk..', '..kffk..', '.bbbbbb.', 'f.bbbb.f', '..bbbb..', '..B..B..', '..k..k..'],
    coin: ['..yyyy..', '.yYyyYy.', 'yYyyyyYy', 'yYyyyyYy', 'yYyyyyYy', 'yYyyyyYy', '.yYyyYy.', '..yyyy..'],
    heart: ['.rr..rr.', 'rwrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...', '........'],
    star: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yy..yy.', 'yy....yy', '........'],
    slime: ['........', '..gggg..', '.gggggg.', 'gwkggwkg', 'gggggggg', 'gGggggGg', 'GGGGGGGG', '........'],
    gem: ['........', '..cccc..', '.cwccbc.', 'cccccccb', '.cccccb.', '..cccb..', '...cb...', '........'],
    key: ['.yyy....', 'y...y...', 'y...yyyy', 'y...y.yY', '.yyy..Y.', '........', '........', '........'],
    brick: ['nnnNnnnN', 'nnnNnnnN', 'NNNNNNNN', 'nNnnnNnn', 'nNnnnNnn', 'NNNNNNNN', 'nnnNnnnN', 'NNNNNNNN'],
    grass: ['gGgggGgg', 'GgGgGgGg', 'nnnnnnnn', 'nNnnnnNn', 'nnnNnnnn', 'nnnnnNnn', 'Nnnnnnnn', 'nnnNnnnn'],
    tree: ['..gggg..', '.gggGgg.', 'ggGggggg', 'gggggGgg', '.gGgggg.', '..gggg..', '...nn...', '...NN...'],
    sword: ['......ss', '.....sws', '....sws.', '...sws..', 'n.sws...', '.nss....', '.Nn.....', 'N..n....'],
    bullet: ['........', '........', '..oyy...', '.oyyww..', '.oyyww..', '..oyy...', '........', '........'],
    ghost: ['..wwww..', '.wwwwww.', 'wkwwkwww', 'wkwwkwww', 'wwwwwwww', 'wwwwwwww', 'wwwwwwww', 'w.ww.ww.'],
    chest: ['........', '.nnnnnn.', 'nNNNNNNn', 'nnnyynnn', 'NNNyyNNN', 'nnnnnnnn', 'nnnnnnnn', 'NNNNNNNN'],
  };
  function spriteURL(name, scale = 4) {
    const g = SPRITES[name]; const c = document.createElement('canvas'); c.width = 8 * scale; c.height = 8 * scale;
    const x = c.getContext('2d');
    g.forEach((row, j) => [...row].forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i * scale, j * scale, scale, scale); } }));
    return c.toDataURL('image/png');
  }

  /* ---------- sounds: tiny synth → WAV ---------- */
  const RATE = 22050;
  const SOUNDS = {
    jump: { dur: 0.22, f: (t) => 260 + 900 * t, wave: 'square', vol: 0.35 },
    coin: { dur: 0.28, f: (t) => (t < 0.08 ? 988 : 1319), wave: 'square', vol: 0.3 },
    hit: { dur: 0.18, f: () => 0, wave: 'noise', vol: 0.5 },
    laser: { dur: 0.25, f: (t) => 1400 - 1200 * Math.min(1, t / 0.25), wave: 'square', vol: 0.28 },
    powerup: { dur: 0.5, f: (t) => [523, 659, 784, 1047][Math.min(3, Math.floor(t / 0.1))], wave: 'triangle', vol: 0.45 },
    explosion: { dur: 0.7, f: () => 0, wave: 'noise', vol: 0.6 },
    click: { dur: 0.05, f: () => 1800, wave: 'square', vol: 0.25 },
    lose: { dur: 0.6, f: (t) => 440 - 260 * (t / 0.6), wave: 'triangle', vol: 0.45 },
  };
  function soundURL(name) {
    const s = SOUNDS[name]; const n = Math.floor(s.dur * RATE); const data = new Int16Array(n);
    let ph = 0, noise = 0;
    for (let i = 0; i < n; i++) {
      const t = i / RATE, env = Math.min(1, t / 0.005) * Math.pow(1 - i / n, s.wave === 'noise' ? 2 : 1.2);
      let v;
      if (s.wave === 'noise') { if (i % 3 === 0) noise = Math.random() * 2 - 1; v = noise; }
      else { ph += s.f(t) / RATE; const p = ph % 1; v = s.wave === 'square' ? (p < 0.5 ? 1 : -1) : 4 * Math.abs(p - 0.5) - 1; }
      data[i] = Math.max(-1, Math.min(1, v * env * s.vol)) * 32767;
    }
    const buf = new ArrayBuffer(44 + n * 2), d = new DataView(buf);
    const str = (o, t) => [...t].forEach((ch, k) => d.setUint8(o + k, ch.charCodeAt(0)));
    str(0, 'RIFF'); d.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
    d.setUint32(24, RATE, true); d.setUint32(28, RATE * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); str(36, 'data'); d.setUint32(40, n * 2, true);
    new Int16Array(buf, 44).set(data);
    let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return 'data:audio/wav;base64,' + btoa(bin);
  }

  /* ---------- your own assets (kept across projects, in this browser) ---------- */
  let dbp;
  const db = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('codeditor-assets', 1); r.onupgradeneeded = () => r.result.createObjectStore('mine'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const run = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('mine', mode); const q = fn(t.objectStore('mine')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  const mine = async () => { try { const keys = (await run('readonly', (s) => s.getAllKeys())) || []; const vals = (await run('readonly', (s) => s.getAll())) || []; return keys.map((k, i) => ({ name: k, data: vals[i] })); } catch { return []; } };
  const saveMine = (name, data) => run('readwrite', (s) => s.put(data, name));
  const delMine = (name) => run('readwrite', (s) => s.delete(name));

  const isAsset = (path) => /\.(png|jpe?g|gif|webp|svg|wav|mp3|ogg)$/i.test(path);
  const isData = (text) => typeof text === 'string' && text.startsWith('data:');
  const kindOf = (path) => (/\.(wav|mp3|ogg)$/i.test(path) ? 'sound' : 'image');
  const safe = (n) => n.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset';
  const extOf = (dataUrl, fallback) => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'image/svg+xml': 'svg' }[dataUrl.slice(5, dataUrl.indexOf(';'))] || fallback);

  function usage(path) {
    const v = safe(path.split('/').pop());
    return kindOf(path) === 'sound'
      ? `const ${v.replace(/-/g, '_')}Sound = new Audio("${path}");\n${v.replace(/-/g, '_')}Sound.play();`
      : `const ${v.replace(/-/g, '_')}Img = new Image();\n${v.replace(/-/g, '_')}Img.src = "${path}";\n// in your draw code:\nctx.drawImage(${v.replace(/-/g, '_')}Img, x, y);`;
  }
  function addToProject(name, data) {
    let path = `assets/${name}`; let k = 2;
    while (Q.fs.exists(path) && Q.fs.read(path) !== data) path = `assets/${name.replace(/(\.\w+)$/, `-${k++}$1`)}`;
    Q.fs.write(path, data); Q.bus.emit('fs:changed');
    Q.app.copyText(usage(path), `Added <b>${esc(path)}</b> — code to use it is copied`);
    return path;
  }
  const playData = (data) => { try { const a = new Audio(data); a.volume = 0.7; a.play().catch(() => {}); } catch {} };

  async function readUpload(f) {
    if (f.size > 1_000_000) { toast(`${esc(f.name)} is too big (max 1 MB — saved projects live in your browser)`, 'error', 3500); return null; }
    if (!/^(image|audio)\//.test(f.type)) { toast(`${esc(f.name)} isn’t an image or sound`, 'error'); return null; }
    return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(f); });
  }

  /* ---------- the library window ---------- */
  async function library() {
    const body = h('div', { class: 'assets' });
    const card = (label, preview, onAdd, extra) => h('div', { class: 'as-card' }, preview, h('div', { class: 'as-n', text: label }), h('div', { class: 'as-b' }, h('button', { class: 'btn sm', text: 'Add', onclick: onAdd }), extra || ''));
    const imgPrev = (src) => h('div', { class: 'as-img' }, h('img', { src, alt: '' }));
    const sndPrev = (src) => h('button', { class: 'as-img as-snd', title: 'Play', html: icon('play', 18), onclick: () => playData(src) });

    body.append(h('h5', { text: 'Sprites' }));
    const sg = h('div', { class: 'as-grid' });
    Object.keys(SPRITES).forEach((n) => { const url = spriteURL(n); sg.append(card(n, imgPrev(url), () => addToProject(n + '.png', url))); });
    body.append(sg, h('h5', { text: 'Sounds' }));
    const ag = h('div', { class: 'as-grid' });
    Object.keys(SOUNDS).forEach((n) => { let url; const get = () => (url = url || soundURL(n)); ag.append(card(n, h('button', { class: 'as-img as-snd', title: 'Play', html: icon('play', 18), onclick: () => playData(get()) }), () => addToProject(n + '.wav', get()))); });
    body.append(ag);

    const mineHost = h('div', { class: 'as-grid' });
    const renderMine = async () => {
      mineHost.innerHTML = '';
      const list = await mine();
      if (!list.length) mineHost.append(h('p', { class: 'muted small', style: { gridColumn: '1 / -1', margin: 0 }, text: 'Upload your own images and sounds — they stay in this browser and can be added to any project.' }));
      list.forEach(({ name, data }) => mineHost.append(card(name, kindOf(name) === 'sound' ? sndPrev(data) : imgPrev(data), () => addToProject(name, data),
        h('button', { class: 'icon-btn sm', title: 'Remove from my assets', html: icon('trash', 13), onclick: async () => { await delMine(name); renderMine(); } }))));
    };
    const up = h('button', { class: 'btn sm', html: `${icon('upload', 13)} Upload`, onclick: async () => {
      const files = await Q.app.pickFiles?.({ accept: 'image/*,audio/*', multiple: true }) || [];
      for (const f of files) { const d = await readUpload(f); if (!d) continue; const name = safe(f.name) + '.' + extOf(d, 'png'); await saveMine(name, d); }
      renderMine();
    } });
    body.append(h('div', { class: 'as-h' }, h('h5', { text: 'My assets' }), up), mineHost);
    renderMine();
    Q.modal({ title: 'Asset pack', wide: true, cls: 'assets-modal', body, buttons: [{ label: 'Done', primary: true }] });
  }

  /* ---------- open an asset file: show it instead of a wall of text ---------- */
  function viewer(path) {
    const data = Q.fs.read(path);
    const prev = kindOf(path) === 'sound' ? h('audio', { controls: true, src: data }) : h('img', { class: 'as-view', src: data, alt: path });
    const code = h('pre', { class: 'as-code', text: usage(path) });
    Q.modal({ title: path, body: h('div', { class: 'as-viewer' }, prev, h('p', { class: 'muted small', text: 'Use it in your game:' }), code), buttons: [{ label: 'Copy code', onclick: () => { Q.app.copyText(usage(path), 'Code copied'); return false; } }, { label: 'Close', primary: true }] });
  }

  /* ---------- preview support: map asset paths to their data ---------- */
  function previewScript(entry, readFile) {
    const map = {};
    for (const p of Q.fs.list()) { if (!isAsset(p)) continue; const d = readFile(p); if (isData(d)) map[p] = d; }
    if (!Object.keys(map).length) return { map, script: '' };
    const dir = entry.includes('/') ? entry.slice(0, entry.lastIndexOf('/') + 1) : '';
    const script = `<script>(function(){var A=${JSON.stringify(map)},D=${JSON.stringify(dir)};
function r(u){if(typeof u!=='string')return u;var k=u.replace(/^\\.\\//,'');if(A[k])return A[k];if(A[D+k])return A[D+k];return u;}
function patch(P,prop){var d=Object.getOwnPropertyDescriptor(P,prop);if(!d||!d.set)return;Object.defineProperty(P,prop,{get:d.get,set:function(v){d.set.call(this,r(v));},configurable:true});}
patch(HTMLImageElement.prototype,'src');patch(HTMLMediaElement.prototype,'src');patch(HTMLSourceElement.prototype,'src');
var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){return sa.call(this,n,(n==='src'||n==='href')?r(v):v);};
var OA=window.Audio;window.Audio=function(u){return u===undefined?new OA():new OA(r(u));};window.Audio.prototype=OA.prototype;
var of=window.fetch;window.fetch=function(u,o){return of.call(this,r(u),o);};
})();<\/script>`;
    return { map, script };
  }
  function rewriteHTML(html, entry, map) {
    if (!Object.keys(map).length) return html;
    return html.replace(/\b(src|href)=(["'])([^"']+)\2/gi, (m, attr, q, u) => { const p = Q.fs.resolve(entry, u); return p && map[p] ? `${attr}=${q}${map[p]}${q}` : m; });
  }

  Q.assets = { library, viewer, isAsset, isData, previewScript, rewriteHTML, readUpload, spriteURL, soundURL, SPRITES, SOUNDS };
})();
