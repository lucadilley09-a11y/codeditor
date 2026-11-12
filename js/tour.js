/* Codeditor — first-time tour: 4 spotlight bubbles, shown once, skippable */
(() => {
  const { h, store } = Q;
  const STEPS = [
    { sel: '[data-act="learn"]', title: 'Pick a language', text: 'Open <b>Learn</b> to choose a course. Every course builds up to real games.', side: 'right' },
    { sel: '#right', before: () => Q.app?.showRight?.('lesson'), title: 'Your lesson lives here', text: 'Read, answer quick questions, then write code. Press <b>Check</b> to test it — you’ll see instantly if it works.', side: 'left' },
    { sel: '#runbtn', title: 'Run any time', text: 'Try your code with <b>Run</b> or <kbd>Ctrl</kbd>+<kbd>Enter</kbd>. Output shows in the console below.', side: 'bottom' },
    { sel: '#xp', title: 'Rank up', text: 'Earn XP to climb ranks and unlock themes. Click here for stats — the <b>refresher</b> keeps old lessons fresh.', side: 'bottom' },
  ];
  let host = null;
  function close() { host?.remove(); host = null; store.set('toured', true); removeEventListener('resize', place); }
  let i = 0;
  function place() {
    if (!host) return;
    const st = STEPS[i];
    if (st.before && !st._ran) { st._ran = true; try { st.before(); } catch {} return requestAnimationFrame(place); }
    const el = document.querySelector(st.sel);
    const r = el && el.offsetParent !== null ? el.getBoundingClientRect() : null;
    const spot = host.querySelector('.tour-spot'), bub = host.querySelector('.tour-bubble');
    const pad = 6;
    if (r && r.width) Object.assign(spot.style, { display: '', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    else spot.style.display = 'none';
    bub.querySelector('.tour-k').textContent = `${i + 1} of ${STEPS.length}`;
    bub.querySelector('.tour-t').textContent = st.title;
    bub.querySelector('.tour-x').innerHTML = st.text;
    bub.querySelector('.tour-next').textContent = i === STEPS.length - 1 ? 'Let’s go!' : 'Next';
    const bw = Math.min(300, innerWidth - 24), bh = bub.offsetHeight || 150;
    let x, y;
    if (!r || !r.width) { x = (innerWidth - bw) / 2; y = (innerHeight - bh) / 2; }
    else if (st.side === 'right' && r.right + bw + 24 < innerWidth) { x = r.right + 16; y = r.top; }
    else if (st.side === 'left' && r.left - bw - 24 > 0) { x = r.left - bw - 16; y = r.top + 40; }
    else { x = Math.min(innerWidth - bw - 12, Math.max(12, r.right - bw)); y = r.bottom + 14; if (y + bh > innerHeight - 12) y = Math.max(12, r.top - bh - 14); }
    Object.assign(bub.style, { width: bw + 'px', left: Math.max(12, x) + 'px', top: Math.max(12, Math.min(innerHeight - bh - 12, y)) + 'px' });
  }
  function start() {
    if (host) return;
    i = 0; STEPS.forEach((s) => delete s._ran);
    host = h('div', { class: 'tour' },
      h('div', { class: 'tour-spot' }),
      h('div', { class: 'tour-bubble', role: 'dialog', 'aria-label': 'Quick tour' },
        h('div', { class: 'tour-k' }), h('div', { class: 'tour-t' }), h('div', { class: 'tour-x' }),
        h('div', { class: 'tour-foot' },
          h('button', { class: 'btn ghost', text: 'Skip', onclick: close }),
          h('button', { class: 'btn primary tour-next', onclick: () => { i++; if (i >= STEPS.length) close(); else place(); } }))));
    host.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.body.append(host);
    addEventListener('resize', place);
    requestAnimationFrame(place);
    host.querySelector('.tour-next').focus();
  }
  // first visit: once the app is ready and nothing else is on screen
  function maybe() {
    if (store.get('toured', false) || (Q.learn?.state?.xp || 0) > 0) return;
    if (innerWidth < 600) return; // phones: the layout is different, skip
    if (document.querySelector('.modal-back')) return setTimeout(maybe, 2500);
    start();
  }
  Q.tour = { start, close, maybe };
  addEventListener('load', () => setTimeout(maybe, 1800));
})();

/* ---------- "What's new" after an update + weekly backup reminder ---------- */
(() => {
  const { h, store, icon } = Q;
  const BUILD = '14';
  const NEW = [
    ['No more white screen', 'Code that prints forever (or loops forever) is now stopped safely instead of crashing the page.'],
    ['Python in downloaded copies', 'If the bundled Python can’t load, it now downloads Python automatically instead.'],
    ['Fresh wording', 'Every level is asked in different ways, with little game settings like 🐉 Boss fight or 🛒 Shop menu.'],
    ['More exercises', 'New exercise types for every skill in JavaScript, Python, C#, Lua and C++.'],
    ['Finish the code', 'A new level type: the first lines are written, you finish the rest.'],
  ];
  function card(cls, title, body, actions) {
    document.querySelector('.notice.' + cls)?.remove();
    const el = h('div', { class: 'notice ' + cls, role: 'status' }, h('div', { class: 'notice-h' }, h('b', { text: title }), h('button', { class: 'icon-btn sm', title: 'Close', html: icon('close', 14), onclick: () => el.remove() })), body, h('div', { class: 'notice-a' }, ...actions(() => el.remove())));
    document.body.append(el); requestAnimationFrame(() => el.classList.add('in'));
    return el;
  }
  function whatsNew(force) {
    if (!force && store.get('seenBuild', null) === BUILD) return;
    store.set('seenBuild', BUILD);
    const list = h('ul', { class: 'wn' }, ...NEW.map(([t, d]) => h('li', { html: `<b>${Q.esc(t)}</b> — ${Q.esc(d)}` })));
    card('wn-card', 'What’s new in Codeditor', list, (close) => [h('button', { class: 'btn primary sm', text: 'Nice!', onclick: close })]);
  }
  const WEEK = 7 * 864e5;
  function backupNag() {
    const s = Q.learn?.state; if (!s || (s.xp || 0) < 100) return;
    const last = Math.max(store.get('lastBackupAt', 0), store.get('lastBackupNag', 0));
    if (Date.now() - last < WEEK) return;
    if (document.querySelector('.notice, .modal-back, .tour')) return setTimeout(backupNag, 30000); // one thing at a time
    store.set('lastBackupNag', Date.now());
    card('bk-card', 'Back up your progress?', h('p', { text: 'School computers can wipe browser data. A backup file keeps your progress, projects and settings safe — restore it any time.' }),
      (close) => [h('button', { class: 'btn ghost sm', text: 'Later', onclick: close }), h('button', { class: 'btn primary sm', html: `${icon('download', 13)} Download backup`, onclick: () => { close(); Q.app.exec('project.backupFile'); } })]);
  }
  Q.notices = { whatsNew, backupNag, BUILD };
  addEventListener('load', () => setTimeout(() => {
    const s = Q.learn?.state;
    if (!store.get('toured', false) && !(s?.xp > 0)) { store.set('seenBuild', BUILD); return; } // brand-new: the tour covers it
    if (document.querySelector('.modal-back, .tour')) return setTimeout(() => { whatsNew(); }, 6000);
    whatsNew();
    setTimeout(backupNag, 8000);
  }, 2600));
})();
