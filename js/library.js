/* Codeditor — 📚 Library (post games, sprites and coding challenges; play, like and remix others')
   and 🏁 Game Jams (a theme + a deadline; everyone submits a game, then votes).
   Everything from other people is untrusted: text is escaped, games run in a locked-down frame. */
(() => {
  const { h, esc, icon, toast } = Q;
  const N = () => Q.net;
  const KINDS = { project: ['🎮', 'Games & projects'], sprite: ['🎨', 'Sprites'], challenge: ['🧩', 'Challenges'] };
  const DAY = 864e5;
  let B = null; // backend
  let ui = null;
  const data = { lib: new Map(), likes: new Map(), solves: new Map(), jams: new Map(), jament: new Map(), jamvote: new Map() };
  const offs = [];

  const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`; };
  const left = (t) => { let s = Math.max(0, (t - Date.now()) / 1000); const d = Math.floor(s / 86400); s -= d * 86400; const hh = Math.floor(s / 3600); s -= hh * 3600; const m = Math.floor(s / 60); return d ? `${d}d ${hh}h` : hh ? `${hh}h ${m}m` : `${m}m ${Math.floor(s % 60)}s`; };
  const myId = () => N().me.cid || N().me.id;
  const mine = (p) => p && (p.by === myId() || p.by === N().me.id);
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const okDoc = (d) => d && typeof d === 'object' && typeof d.title === 'string';
  const safeImg = (u) => (typeof u === 'string' && /^data:image\/(png|gif|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length < 60000 ? u : '');

  async function ensureName() {
    if (N().me.name) return true;
    const n = await Q.prompt('Pick a nickname', '', 'Shown on what you post — not your real name');
    if (!n || !n.trim()) return false;
    N().setName(n); return true;
  }

  /* ---------- connect + subscribe once ---------- */
  async function connect() {
    if (B) return B;
    B = await N().backend();
    if (!B) return null;
    B.start();
    for (const coll of Object.keys(data)) offs.push(B.watch(coll, (m) => { data[coll] = m; render(); }));
    // self-healing (public server only): if one of my posts vanished, put it back
    if (B.kind === 'public') setTimeout(async () => { const keep = Q.store.get('libMine', {}); for (const [id, rec] of Object.entries(keep)) if (!data.lib.has(id) && rec.meta) { try { await B.put('lib', id, rec.meta); if (rec.data && !(await B.get('libd', id, 4000))) await B.put('libd', id, { d: rec.data }); } catch {} } }, 9000);
    return B;
  }
  const remember = (id, meta, d) => { const k = Q.store.get('libMine', {}); k[id] = { meta, data: d && d.length < 120000 ? d : null }; Q.store.set('libMine', k); };
  const forget = (id) => { const k = Q.store.get('libMine', {}); delete k[id]; Q.store.set('libMine', k); };

  /* ---------- posting ---------- */
  async function postProject() {
    if (!(await ensureName())) return;
    const p = Q.fs.project; const files = {};
    for (const [k, v] of Object.entries(p.files)) if (typeof v === 'string') files[k] = v;
    const packed = await N().packData({ v: 1, name: p.name, files });
    if (packed.length > 220000) return toast(`This project is too big to post (${Math.round(packed.length / 1024)} KB, max 215 KB). Remove big images or sounds and try again.`, 'error', 5000);
    const entry = Object.keys(files).find((f) => /(^|\/)index\.html?$/i.test(f)) || Object.keys(files).find((f) => /\.html?$/i.test(f)) || null;
    const thumbSrc = Object.keys(files).find((f) => /^assets\/.*\.png$/i.test(f) && files[f].length < 50000);
    const lang = entry ? 'web' : (Object.keys(files).find((f) => /\.py$/.test(f)) ? 'python' : Object.keys(files).find((f) => /\.lua$/.test(f)) ? 'lua' : 'js');
    form('Post your project', [['title', 'Title', p.name], ['desc', 'Description', '', 'What is it? How do you play?', true]], async (v) => {
      const id = newId();
      const meta = { kind: 'project', title: N().clean(v.title, 60), desc: N().clean(v.desc, 400), by: myId(), name: N().me.name, color: N().me.color, created: Date.now(), size: packed.length, entry, lang, thumb: thumbSrc ? await thumb(files[thumbSrc]) : '', remixOf: p.remixOf || null };
      await B.put('libd', id, { d: packed }); await B.put('lib', id, meta); remember(id, meta, packed);
      toast('Posted to the Library! 🎉', 'success'); return id;
    });
  }
  async function postSprite(dataUrl, name) {
    if (!(await ensureName())) return;
    if (!dataUrl) {
      const imgs = Q.fs.list().filter((p) => /^assets\/.*\.(png|gif|webp)$/i.test(p) && Q.assets.isData(Q.fs.read(p)));
      if (!imgs.length) return toast('No images in this project — draw one in Pixel Studio first.', 'info', 3500);
      const g = h('div', { class: 'st-pick-g' });
      const m = Q.modal({ title: 'Which sprite?', wide: true, body: g, buttons: [{ label: 'Cancel' }] });
      imgs.forEach((p) => g.append(h('button', { class: 'st-pick-it', onclick: () => { m.close(); postSprite(Q.fs.read(p), p.split('/').pop().replace(/\.\w+$/, '')); } }, h('img', { src: Q.fs.read(p), alt: '' }), h('span', { text: p.replace(/^assets\//, '') }))));
      return;
    }
    if (dataUrl.length > 200000) return toast('That image is too big to post (max ~150 KB).', 'error');
    form('Post a sprite', [['title', 'Name', name || 'sprite'], ['desc', 'Description', '', 'Optional', true]], async (v) => {
      const id = newId();
      const meta = { kind: 'sprite', title: N().clean(v.title, 40), desc: N().clean(v.desc, 300), by: myId(), name: N().me.name, color: N().me.color, created: Date.now(), thumb: await thumb(dataUrl), size: dataUrl.length };
      await B.put('libd', id, { d: dataUrl }); await B.put('lib', id, meta); remember(id, meta, dataUrl);
      toast('Sprite posted! 🎨', 'success'); return id;
    });
  }
  async function postChallenge() {
    if (!(await ensureName())) return;
    const langSel = h('select', { class: 'input' }, h('option', { value: 'js', text: 'JavaScript' }), h('option', { value: 'py', text: 'Python' }));
    const title = h('input', { class: 'input', placeholder: 'e.g. FizzBuzz to 20' });
    const task = h('textarea', { class: 'input', rows: 3, placeholder: 'What should the code do? Be exact about what it prints.' });
    const starter = h('textarea', { class: 'input mono', rows: 4, placeholder: 'Starting code (optional)', spellcheck: 'false' });
    const sol = h('textarea', { class: 'input mono', rows: 6, placeholder: 'YOUR solution — it is run once to work out the correct output, and is NOT posted.', spellcheck: 'false' });
    const out = h('pre', { class: 'lib-out muted small', text: 'Run your solution to see the output people must match.' });
    let expected = null;
    const run = async () => {
      out.textContent = 'Running…';
      const code = sol.value; const r = langSel.value === 'py' ? await Q.runner.runPython(code, { timeout: 8000 }) : await Q.runner.runJS(code, { timeout: 4000 });
      if (r.errors.length) { expected = null; out.textContent = 'Your solution has an error:\n' + r.errors[0].text; return; }
      expected = r.logs.map((l) => String(l).replace(/\s+$/, '')).join('\n').replace(/\s+$/, '');
      out.textContent = expected ? 'People must print exactly:\n' + expected : 'Your solution printed nothing — a challenge needs output to check.';
      if (!expected) expected = null;
    };
    const body = h('div', { class: 'lib-form' }, h('label', { text: 'Language' }), langSel, h('label', { text: 'Title' }), title, h('label', { text: 'Task' }), task, h('label', { text: 'Starting code' }), starter, h('label', { text: 'Your solution' }), sol,
      h('div', {}, h('button', { class: 'btn sm', html: `${icon('play', 12)} Run my solution`, onclick: run })), out);
    Q.modal({ title: 'Make a coding challenge', wide: true, body, buttons: [{ label: 'Cancel' }, { label: 'Post challenge', primary: true, onclick: () => {
      if (!title.value.trim() || !task.value.trim()) { toast('Give it a title and a task.', 'info'); return false; }
      if (expected == null) { toast('Run your solution first (it must print something).', 'info'); return false; }
      (async () => {
        const id = newId();
        const meta = { kind: 'challenge', title: N().clean(title.value, 60), desc: N().clean(task.value, 800), by: myId(), name: N().me.name, color: N().me.color, created: Date.now(), lang: langSel.value };
        const d = JSON.stringify({ starter: starter.value.slice(0, 4000), expected: expected.slice(0, 4000) });
        try { await B.put('libd', id, { d }); await B.put('lib', id, meta); remember(id, meta, d); toast('Challenge posted! 🧩', 'success'); } catch (e) { toast('Couldn’t post: ' + esc(e.message), 'error'); }
      })();
    } }] });
  }
  function form(title, fields, onOk) {
    const inputs = {};
    const body = h('div', { class: 'lib-form' }, ...fields.flatMap(([k, label, val, ph, area]) => { const el = h(area ? 'textarea' : 'input', { class: 'input', value: val || '', placeholder: ph || '', rows: area ? 3 : null }); if (area) el.value = val || ''; inputs[k] = el; return [h('label', { text: label }), el]; }),
      h('p', { class: 'muted small', text: B?.kind === 'public' ? 'Posts are public: anyone using Codeditor online can see, play and remix them. Don’t post personal info.' : 'Anyone who can open this Codeditor page can see, play and remix your post.' }));
    Q.modal({ title, body, buttons: [{ label: 'Cancel' }, { label: 'Post', primary: true, onclick: () => { const v = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value])); if (!v.title.trim()) { toast('Give it a name.', 'info'); return false; } onOk(v).catch((e) => toast('Couldn’t post: ' + esc(e.message || 'offline'), 'error', 4000)); } }] });
  }
  async function thumb(dataUrl) {
    try { const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; }); const fw = im.width > im.height && im.width % im.height === 0 ? im.height : im.width; const k = Math.min(1, 64 / Math.max(fw, im.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(fw * k)); c.height = Math.max(1, Math.round(im.height * k)); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, fw, im.height, 0, 0, c.width, c.height); return c.toDataURL('image/png'); } catch { return ''; }
  }

  /* ---------- using posts ---------- */
  async function fetchData(id) { const d = await B.get('libd', id, 8000); if (!d || typeof d.d !== 'string') throw new Error('This post’s files couldn’t be downloaded (it may have been removed).'); return d.d; }
  async function play(id, p) {
    let files;
    try { files = (await N().unpackData(await fetchData(id))).files; } catch (e) { return toast(esc(e.message || 'Couldn’t open it.'), 'error', 4000); }
    if (!p.entry || !files[p.entry]) return remix(id, p, files);
    const read = (path) => files[path];
    const html = Q.runner.buildPage(p.entry, read, { hook: false });
    const frame = h('iframe', { class: 'lib-frame', sandbox: 'allow-scripts allow-pointer-lock', title: p.title, srcdoc: Q.runner.guardHTML(html) });
    Q.modal({ title: `▶ ${p.title}`, wide: true, cls: 'lib-play', body: h('div', {}, frame, h('p', { class: 'muted small', text: `by ${p.name || 'someone'} · runs locked off from your projects` })), buttons: [{ label: 'Remix it', onclick: () => { remix(id, p, files); } }, { label: 'Close', primary: true }] });
    setTimeout(() => frame.focus(), 200);
  }
  async function remix(id, p, files) {
    try { files = files || (await N().unpackData(await fetchData(id))).files; } catch (e) { return toast(esc(e.message), 'error'); }
    const clean = {}; for (const [k, v] of Object.entries(files || {})) if (typeof v === 'string' && typeof k === 'string' && k.length < 200 && !k.includes('..')) clean[k] = v;
    Q.fs.importProject(`Remix of ${p.title}`.slice(0, 60), clean);
    Q.fs.project.remixOf = id;
    toast(`Opened <b>${esc(p.title)}</b> as your own copy — change anything!`, 'success', 3500);
    close(); Q.app.showView?.('files');
  }
  async function useSprite(id, p, where) {
    let d; try { d = await fetchData(id); } catch (e) { return toast(esc(e.message), 'error'); }
    if (!safeImg(d) && !/^data:image\//.test(d)) return toast('That sprite looks broken.', 'error');
    const name = (Q.assets.safe(p.title) || 'sprite') + '.png';
    if (where === 'mine') { await Q.assets.saveMine(name, d); toast(`Added <b>${esc(name)}</b> to My assets`, 'success'); }
    else if (where === 'edit') { close(); Q.studio.pixel({ data: d, name: p.title }); }
    else { let path = 'assets/' + name, k = 2; while (Q.fs.exists(path) && Q.fs.read(path) !== d) path = `assets/${name.replace(/\.png$/, '')}-${k++}.png`; Q.fs.write(path, d); Q.bus.emit('fs:changed'); toast(`Added <b>${esc(path)}</b> to this project`, 'success'); }
  }
  async function solve(id, p) {
    let c; try { c = JSON.parse(await fetchData(id)); } catch (e) { return toast(esc(e.message || 'Couldn’t open it.'), 'error'); }
    const expected = String(c.expected || '').replace(/\r/g, '');
    const course = Q.learn.courses.find((x) => x.id === (p.lang === 'py' ? 'py' : 'js'));
    const norm = (t) => String(t).replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\s+$/, '');
    const step = { type: 'code', task: `<b>${esc(p.title)}</b> <span class="muted">— a challenge by ${esc(p.name || 'someone')}</span><br>${esc(p.desc).replace(/\n/g, '<br>')}`, starter: String(c.starter || ''), hints: [], solution: null,
      check: (r) => (norm(r.out) === norm(expected) ? true : `Not quite — it should print:<pre>${esc(expected.split('\n').slice(0, 12).join('\n'))}${expected.split('\n').length > 12 ? '\n…' : ''}</pre>`) };
    close();
    Q.learn.startCustom(course, { id: 'challenge~' + id, title: '🧩 ' + p.title, temp: true, kind: 'libchallenge', steps: [step], onDone: async (body, foot, info) => {
      body.append(h('div', { class: 'done-card' }, h('div', { class: 'big', text: '🧩' }), h('h3', { text: 'Challenge solved!' }), h('p', { text: `${info.secs}s · ${info.attempts} wrong tr${info.attempts === 1 ? 'y' : 'ies'}` })));
      foot.append(h('div', { class: 'grow' }), h('button', { class: 'btn', text: 'Close', onclick: () => info.close() }), h('button', { class: 'btn primary', text: 'Back to the Library', onclick: () => { info.close(); open('challenge'); } }));
      try { if (await ensureName()) await B.put('solves', id + '__' + myId(), { post: id, by: myId(), name: N().me.name, secs: info.secs, tries: info.attempts, at: Date.now() }); } catch {}
    } });
  }
  async function like(id) {
    const k = id + '__' + myId();
    try { if (data.likes.has(k)) await B.del('likes', k); else await B.put('likes', k, { post: id, by: myId() }); } catch { toast('You’re offline.', 'error'); }
  }
  async function remove(id) {
    if (!(await Q.confirm('Delete this post?', 'It will be removed from the Library for everyone.', true))) return;
    try { await B.del('lib', id); await B.del('libd', id); forget(id); toast('Deleted.', 'info'); } catch { toast('Couldn’t delete (offline?).', 'error'); }
  }

  /* ---------- jams ---------- */
  function jamState(j) { const now = Date.now(); return now < j.ends ? 'open' : now < j.voteEnds ? 'voting' : 'done'; }
  async function newJam() {
    if (!(await ensureName())) return;
    const theme = h('input', { class: 'input', placeholder: 'e.g. Gravity, Only one button, Tiny world' });
    const desc = h('textarea', { class: 'input', rows: 2, placeholder: 'Rules or ideas (optional)' });
    const dur = h('select', { class: 'input' }, ...[[3600e3, '1 hour'], [3 * 3600e3, '3 hours'], [DAY, '1 day'], [3 * DAY, '3 days'], [7 * DAY, '1 week']].map(([v, t]) => h('option', { value: v, text: t, selected: v === DAY })));
    const vote = h('select', { class: 'input' }, ...[[3600e3, '1 hour'], [DAY, '1 day'], [3 * DAY, '3 days']].map(([v, t]) => h('option', { value: v, text: t, selected: v === DAY })));
    Q.modal({ title: '🏁 Start a Game Jam', body: h('div', { class: 'lib-form' }, h('label', { text: 'Theme' }), theme, h('label', { text: 'Description' }), desc, h('label', { text: 'Time to make games' }), dur, h('label', { text: 'Time to vote' }), vote),
      buttons: [{ label: 'Cancel' }, { label: 'Start jam', primary: true, onclick: () => {
        if (!theme.value.trim()) { toast('Pick a theme.', 'info'); return false; }
        const id = newId(); const now = Date.now();
        B.put('jams', id, { title: N().clean(theme.value, 50), desc: N().clean(desc.value, 300), by: myId(), name: N().me.name, created: now, ends: now + +dur.value, voteEnds: now + +dur.value + +vote.value }).then(() => { toast('Jam started! 🏁', 'success'); jamOpen = id; render(); }).catch((e) => toast('Couldn’t start it: ' + esc(e.message), 'error'));
      } }] });
  }
  async function submitToJam(jamId) {
    const my = [...data.lib].filter(([, p]) => okDoc(p) && p.kind === 'project' && mine(p));
    if (!my.length) return toast('Post a game to the Library first (📚 → Post → This project), then submit it here.', 'info', 4500);
    const list = h('div', { class: 'lib-pick' });
    const m = Q.modal({ title: 'Submit which game?', body: list, buttons: [{ label: 'Cancel' }] });
    my.forEach(([id, p]) => list.append(h('button', { class: 'btn', style: { margin: '4px' }, text: p.title, onclick: async () => { m.close(); try { await B.put('jament', jamId + '__' + id, { jam: jamId, post: id, by: myId(), at: Date.now() }); toast('Submitted! Good luck 🍀', 'success'); } catch { toast('Couldn’t submit (offline?).', 'error'); } } })));
  }
  async function vote(jamId, postId, cat, n) {
    if (!(await ensureName())) return;
    const k = jamId + '__' + postId + '__' + myId();
    const cur = data.jamvote.get(k) || { jam: jamId, post: postId, by: myId() };
    const next = { ...cur, [cat]: n, at: Date.now() };
    data.jamvote.set(k, next); render();
    try { await B.put('jamvote', k, next); } catch { toast('Couldn’t save your vote (offline?).', 'error'); }
  }
  function scores(jamId) {
    const out = new Map();
    for (const [, v] of data.jamvote) if (v && v.jam === jamId) { const s = out.get(v.post) || { fun: [], creative: [], theme: [] }; ['fun', 'creative', 'theme'].forEach((c) => { const x = +v[c]; if (x >= 1 && x <= 5) s[c].push(x); }); out.set(v.post, s); }
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    return [...out].map(([post, s]) => ({ post, fun: avg(s.fun), creative: avg(s.creative), theme: avg(s.theme), votes: Math.max(s.fun.length, s.creative.length, s.theme.length), total: avg(s.fun) + avg(s.creative) + avg(s.theme) })).sort((a, b) => b.total - a.total);
  }

  /* ---------- the window ---------- */
  let tab = 'project', jamOpen = null, query = '', sort = 'new', statusEl = null;
  function open(t) {
    if (t) tab = t;
    if (ui) { render(); return; }
    const back = h('div', { class: 'studio-back' }); const box = h('div', { class: 'studio library', role: 'dialog', 'aria-label': 'Library' });
    back.append(box); document.body.append(back); requestAnimationFrame(() => back.classList.add('in'));
    statusEl = h('span', { class: 'lib-status' });
    const search = h('input', { class: 'input sm', placeholder: 'Search…', 'aria-label': 'Search the library', oninput: (e) => { query = e.target.value.toLowerCase(); render(); } });
    const sortSel = h('select', { class: 'input sm', 'aria-label': 'Sort' }, h('option', { value: 'new', text: 'Newest' }), h('option', { value: 'top', text: 'Most liked' }));
    sortSel.addEventListener('change', () => { sort = sortSel.value; render(); });
    const tabs = h('div', { class: 'lib-tabs' }, ...[...Object.entries(KINDS), ['jam', ['🏁', 'Game Jams']]].map(([k, [ic, label]]) => h('button', { class: 'lib-tab', 'data-k': k, html: `${ic} ${esc(label)}`, onclick: () => { tab = k; jamOpen = null; render(); } })));
    const postBtn = h('button', { class: 'btn primary sm', html: `${icon('upload', 12)} Post`, onclick: (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      Q.contextMenu(r.left, r.bottom + 4, [{ label: '🎮 This project', action: () => postProject() }, { label: '🎨 A sprite from this project', action: () => postSprite() }, { label: '🧩 A coding challenge', action: () => postChallenge() }, '-', { label: '🏁 Start a Game Jam', action: () => newJam() }]);
    } });
    const nameBtn = h('button', { class: 'btn ghost sm', title: 'Your nickname', onclick: async () => { const n = await Q.prompt('Your nickname', N().me.name || '', 'Shown on what you post'); if (n != null && n.trim()) { N().setName(n); render(); } } });
    const closeBtn = h('button', { class: 'icon-btn', title: 'Close', 'aria-label': 'Close the Library', html: icon('close', 16), onclick: () => close() });
    const listEl = h('div', { class: 'lib-body' });
    box.append(h('div', { class: 'st-head' }, h('b', { text: '📚 Library' }), statusEl, h('div', { class: 'grow' }), search, sortSel, nameBtn, postBtn, closeBtn), tabs, listEl);
    const keys = (e) => { if (e.key === 'Escape' && !document.querySelector('.modal-back')) { e.preventDefault(); close(); } };
    addEventListener('keydown', keys, true);
    const tick = setInterval(() => { if (tab === 'jam') render(); }, 1000);
    ui = { back, box, listEl, tabs, nameBtn, keys, tick };
    render();
    connect().then((b) => {
      if (!b) { statusEl.className = 'lib-status off'; statusEl.textContent = 'Not available here'; listEl.innerHTML = ''; listEl.append(h('div', { class: 'lib-empty' }, h('p', { text: 'The Library needs the internet (or the claude.ai version with shared storage turned on).' }))); return; }
      b.onStatus((on) => { statusEl.className = 'lib-status ' + (on ? 'on' : 'off'); statusEl.textContent = on ? '● Online' : '○ Connecting…'; statusEl.title = b.label; });
      render();
    });
  }
  function close() { if (!ui) return; removeEventListener('keydown', ui.keys, true); clearInterval(ui.tick); ui.back.classList.remove('in'); const b = ui.back; setTimeout(() => b.remove(), 160); ui = null; }

  let renderQueued = false;
  function render() { if (!ui || renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; if (ui) draw(); }); }
  function draw() {
    const { listEl, tabs, nameBtn } = ui;
    tabs.querySelectorAll('.lib-tab').forEach((b) => b.classList.toggle('on', b.dataset.k === tab));
    nameBtn.textContent = N().me.name ? `👤 ${N().me.name}` : '👤 Set nickname';
    const scroll = listEl.scrollTop; listEl.innerHTML = '';
    if (!B) { listEl.append(h('div', { class: 'lib-empty' }, h('div', { class: 'spinner' }), h('p', { text: 'Connecting…' }))); return; }
    if (tab === 'jam') { drawJams(listEl); listEl.scrollTop = scroll; return; }
    const likeCount = new Map(); const iLike = new Set();
    for (const [k, v] of data.likes) if (v && typeof v.post === 'string') { likeCount.set(v.post, (likeCount.get(v.post) || 0) + 1); if (k.endsWith('__' + myId())) iLike.add(v.post); }
    const solveCount = new Map(); for (const [, v] of data.solves) if (v && typeof v.post === 'string') solveCount.set(v.post, (solveCount.get(v.post) || 0) + 1);
    let items = [...data.lib].filter(([, p]) => okDoc(p) && p.kind === tab && (!query || (p.title + ' ' + (p.desc || '') + ' ' + (p.name || '')).toLowerCase().includes(query)));
    items.sort((a, b) => (sort === 'top' ? (likeCount.get(b[0]) || 0) - (likeCount.get(a[0]) || 0) || b[1].created - a[1].created : (b[1].created || 0) - (a[1].created || 0)));
    if (!items.length) { listEl.append(h('div', { class: 'lib-empty' }, h('div', { class: 'big', text: KINDS[tab][0] }), h('p', { text: query ? 'Nothing matches that search.' : `No ${KINDS[tab][1].toLowerCase()} yet — be the first to post one!` }))); return; }
    const grid = h('div', { class: 'lib-grid' });
    items.slice(0, 300).forEach(([id, p]) => {
      const th = safeImg(p.thumb);
      const pic = th ? h('img', { class: 'lib-thumb', src: th, alt: '' }) : h('div', { class: 'lib-thumb lib-noth', text: p.kind === 'challenge' ? (p.lang === 'py' ? '🐍' : '🟨') : p.lang === 'python' ? '🐍' : '🎮' });
      const liked = iLike.has(id);
      const acts = h('div', { class: 'lib-acts' });
      if (p.kind === 'project') acts.append(h('button', { class: 'btn primary sm', html: `${icon('play', 11)} ${p.entry ? 'Play' : 'Open'}`, onclick: () => play(id, p) }), h('button', { class: 'btn sm', text: 'Remix', title: 'Open your own copy to change', onclick: () => remix(id, p) }));
      if (p.kind === 'sprite') acts.append(h('button', { class: 'btn primary sm', text: 'Add to project', onclick: () => useSprite(id, p) }), h('button', { class: 'btn sm', text: 'My assets', onclick: () => useSprite(id, p, 'mine') }), h('button', { class: 'icon-btn sm', title: 'Edit a copy in Pixel Studio', html: '🎨', onclick: () => useSprite(id, p, 'edit') }));
      if (p.kind === 'challenge') acts.append(h('button', { class: 'btn primary sm', html: `${icon('play', 11)} Solve`, onclick: () => solve(id, p) }), h('span', { class: 'muted small', text: `${solveCount.get(id) || 0} solved` }));
      acts.append(h('div', { class: 'grow' }), h('button', { class: 'lib-like' + (liked ? ' on' : ''), title: liked ? 'Unlike' : 'Like', 'aria-label': liked ? 'Unlike' : 'Like', html: `${liked ? '♥' : '♡'} ${likeCount.get(id) || 0}`, onclick: () => like(id) }));
      if (mine(p)) acts.append(h('button', { class: 'icon-btn sm', title: 'Delete my post', html: icon('trash', 12), onclick: () => remove(id) }));
      grid.append(h('div', { class: 'lib-card' }, pic, h('div', { class: 'lib-meta' }, h('b', { text: p.title }), h('span', { class: 'muted small', html: `<i class="lib-dot" style="background:${/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#888'}"></i>${esc(p.name || 'someone')} · ${ago(p.created || 0)}${p.remixOf ? ' · remix' : ''}` }), p.desc ? h('p', { class: 'lib-desc', text: p.desc }) : ''), acts));
    });
    listEl.append(grid); listEl.scrollTop = scroll;
  }
  function stars(jamId, postId, cat, cur, can) {
    const wrap = h('span', { class: 'lib-stars', role: 'radiogroup', 'aria-label': cat });
    for (let n = 1; n <= 5; n++) wrap.append(h('button', { class: n <= cur ? 'on' : '', text: '★', disabled: !can, 'aria-label': `${n} star${n > 1 ? 's' : ''}`, onclick: () => vote(jamId, postId, cat, n) }));
    return wrap;
  }
  function drawJams(el) {
    const jams = [...data.jams].filter(([, j]) => okDoc(j) && +j.ends && +j.voteEnds).sort((a, b) => b[1].created - a[1].created);
    if (jamOpen && data.jams.has(jamOpen)) return drawJam(el, jamOpen, data.jams.get(jamOpen));
    el.append(h('div', { class: 'lib-jamhead' }, h('p', { class: 'muted', text: 'A Game Jam is a theme and a deadline. Everyone makes a game on the theme, submits it, then everyone votes.' }), h('button', { class: 'btn primary', text: '🏁 Start a jam', onclick: () => newJam() })));
    if (!jams.length) { el.append(h('div', { class: 'lib-empty' }, h('div', { class: 'big', text: '🏁' }), h('p', { text: 'No jams yet. Start one and invite your friends!' }))); return; }
    const list = h('div', { class: 'lib-jams' });
    jams.forEach(([id, j]) => {
      const st = jamState(j); const n = [...data.jament.values()].filter((e) => e && e.jam === id).length;
      list.append(h('button', { class: 'lib-jam ' + st, onclick: () => { jamOpen = id; render(); } }, h('b', { text: j.title }), h('span', { class: 'muted small', text: `${n} game${n === 1 ? '' : 's'} · by ${j.name || 'someone'}` }),
        h('span', { class: 'lib-jam-st', text: st === 'open' ? `⏳ ${left(j.ends)} left to make games` : st === 'voting' ? `🗳️ Voting · ${left(j.voteEnds)} left` : '🏆 Finished' })));
    });
    el.append(list);
  }
  function drawJam(el, id, j) {
    const st = jamState(j);
    const entries = [...data.jament.values()].filter((e) => e && e.jam === id && data.lib.has(e.post));
    el.append(h('div', { class: 'lib-jamtop' }, h('button', { class: 'btn ghost sm', html: `${icon('arrowLeft', 12)} All jams`, onclick: () => { jamOpen = null; render(); } }),
      h('h3', { text: `🏁 ${j.title}` }), j.desc ? h('p', { class: 'muted', text: j.desc }) : '',
      h('div', { class: 'lib-count ' + st, text: st === 'open' ? `⏳ ${left(j.ends)} left to make & submit games` : st === 'voting' ? `🗳️ Voting is open — ${left(j.voteEnds)} left` : '🏆 This jam is over — here are the results' }),
      st === 'open' ? h('button', { class: 'btn primary', text: 'Submit my game', onclick: () => submitToJam(id) }) : '',
      mine(j) ? h('button', { class: 'btn ghost sm', text: 'Delete jam', onclick: async () => { if (await Q.confirm('Delete this jam?', 'Entries stay in the Library.', true)) { await B.del('jams', id).catch(() => {}); jamOpen = null; render(); } } }) : ''));
    if (!entries.length) { el.append(h('div', { class: 'lib-empty' }, h('p', { text: st === 'open' ? 'No games yet — make one and submit it!' : 'Nobody submitted a game.' }))); return; }
    const sc = scores(id);
    if (st === 'done' && sc.length) {
      const pod = h('div', { class: 'lib-podium' });
      sc.slice(0, 3).forEach((s, i) => { const p = data.lib.get(s.post); if (!p) return; pod.append(h('div', { class: 'lib-pod p' + (i + 1) }, h('div', { class: 'big', text: ['🥇', '🥈', '🥉'][i] }), h('b', { text: p.title }), h('span', { class: 'muted small', text: `${p.name || 'someone'} · ${s.total.toFixed(1)}/15 · ${s.votes} vote${s.votes === 1 ? '' : 's'}` }))); });
      el.append(pod);
    }
    const grid = h('div', { class: 'lib-grid' });
    entries.forEach((e) => {
      const p = data.lib.get(e.post); const myVote = data.jamvote.get(id + '__' + e.post + '__' + myId()) || {};
      const can = st === 'voting' && !mine(p) && !mine(e);
      const s = sc.find((x) => x.post === e.post);
      const th = safeImg(p.thumb);
      grid.append(h('div', { class: 'lib-card' }, th ? h('img', { class: 'lib-thumb', src: th, alt: '' }) : h('div', { class: 'lib-thumb lib-noth', text: '🎮' }),
        h('div', { class: 'lib-meta' }, h('b', { text: p.title }), h('span', { class: 'muted small', text: `${p.name || 'someone'}` })),
        st !== 'open' ? h('div', { class: 'lib-votes' }, ...[['fun', 'Fun'], ['creative', 'Creativity'], ['theme', 'Theme']].map(([c, l]) => h('div', { class: 'lib-vrow' }, h('span', { class: 'small', text: l }), st === 'done' ? h('span', { class: 'small', text: s ? s[c].toFixed(1) + ' ★' : '–' }) : stars(id, e.post, c, myVote[c] || 0, can))), st === 'voting' && !can ? h('p', { class: 'muted small', text: 'You can’t vote on your own game.' }) : '') : '',
        h('div', { class: 'lib-acts' }, h('button', { class: 'btn primary sm', html: `${icon('play', 11)} Play`, onclick: () => play(e.post, p) }), h('button', { class: 'btn sm', text: 'Remix', onclick: () => remix(e.post, p) }))));
    });
    el.append(grid);
  }

  Q.library = { open, close, postProject, postSprite, postChallenge, newJam, _data: data, get backend() { return B; } };
})();
