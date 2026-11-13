/* Codeditor — bug journal (errors you then fixed) and code replay (watch a capstone being written) */
(() => {
  const { h, esc, icon, toast } = Q;
  const S = () => Q.learn.state;

  /* ===================== bug journal ===================== */
  const pending = new Map(); // where -> {err, code, lang, c, l, title}
  const shortErr = (e) => String(e?.last || e?.text || '').split('\n').filter(Boolean).pop()?.slice(0, 140) || 'Error';
  function firstDiff(a, b) {
    const A = a.split('\n'), B = b.split('\n');
    for (let i = 0; i < Math.max(A.length, B.length); i++) if ((A[i] ?? '').trim() !== (B[i] ?? '').trim()) return i;
    return -1;
  }
  function noteError({ where, err, code, lang, c, l, title }) {
    if (!where || !code) return;
    pending.set(where, { err, code, lang, c, l, title, at: Date.now() });
  }
  function noteSuccess({ where, code }) {
    const p = pending.get(where); if (!p) return;
    pending.delete(where);
    if (!code || code === p.code || Date.now() - p.at > 30 * 60000) return;
    let i = p.err?.line ? p.err.line - 1 : -1;
    const A = p.code.split('\n'), B = code.split('\n');
    if (i < 0 || (A[i] ?? '').trim() === (B[i] ?? '').trim()) i = firstDiff(p.code, code);
    if (i < 0) return;
    const bad = (A[i] ?? '').trim(), good = (B[i] ?? '').trim();
    if (!bad || !good || bad === good || bad.length > 160 || good.length > 160) return;
    const s = S(); s.journal = s.journal || [];
    if (s.journal.some((j) => j.bad === bad && j.good === good)) return;
    s.journal.unshift({ err: shortErr(p.err), bad, good, lang: p.lang, c: p.c || null, l: p.l || null, title: p.title || '', at: Date.now() });
    s.journal = s.journal.slice(0, 60);
    Q.learn.save();
    if (s.journal.length === 1) toast(`Saved to your <b>bug journal</b> — you fixed <code>${esc(shortErr(p.err).slice(0, 50))}</code>`, 'info', 3500);
  }
  const list = () => S().journal || [];

  // a refresher question from a bug you fixed before
  function question(seed = 1) {
    const all = list().filter((j) => j.c && j.l); if (!all.length) return null;
    const j = all[seed % all.length];
    const c = Q.learn.courses.find((x) => x.id === j.c); const l = c?.lessons.find((x) => x.id === j.l); if (!c || !l) return null;
    const others = all.filter((x) => x !== j && x.lang === j.lang).map((x) => x.good).filter((g) => g !== j.good);
    const opts = [...new Set([j.good, j.bad, ...others])].slice(0, 4);
    if (opts.length < 2) return null;
    // shuffle (seeded)
    for (let i = opts.length - 1; i > 0; i--) { const k = (seed * 31 + i * 17) % (i + 1); [opts[i], opts[k]] = [opts[k], opts[i]]; }
    return { c, l, k: `${c.id}/${l.id}`, q: { type: 'quiz', mono: true, q: `From your bug journal: this line caused <code>${esc(j.err)}</code>. Which version fixed it?`, code: j.bad, options: opts, answer: opts.indexOf(j.good), explain: `You fixed it with <code>${esc(j.good)}</code>.` } };
  }

  function show() {
    const items = list();
    const body = h('div', { class: 'journal' });
    if (!items.length) body.append(h('p', { class: 'muted', text: 'When your code hits an error and you fix it, the bug and your fix get saved here. The refresher will quiz you on them later.' }));
    items.forEach((j) => body.append(h('div', { class: 'jr' },
      h('div', { class: 'jr-top', html: `<span class="jr-err">${esc(j.err)}</span><span class="muted small">${esc(j.title || '')} · ${new Date(j.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>` }),
      h('div', { class: 'fd-line fd-del', html: `<code>${esc(j.bad)}</code>` }),
      h('div', { class: 'fd-line fd-add', html: `<code>${esc(j.good)}</code>` }))));
    Q.modal({ title: `Bug journal · ${items.length} fixed`, wide: true, body, buttons: [{ label: 'Close', primary: true }] });
  }

  /* ===================== code replay ===================== */
  let dbp;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('codeditor-replay', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('frames');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('frames', mode); const q = fn(t.objectStore('frames')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  const lastSaved = new Map();
  async function record(key, code) {
    if (!key || code == null || lastSaved.get(key) === code) return;
    lastSaved.set(key, code);
    try {
      const frames = (await run('readonly', (st) => st.get(key))) || [];
      if (frames.length && frames[frames.length - 1].code === code) return;
      frames.push({ t: Date.now(), code });
      while (frames.length > 400) frames.splice(1, 1); // keep the first frame, drop the oldest middle ones
      await run('readwrite', (st) => st.put(frames, key));
    } catch {}
  }
  const frames = async (key) => { try { return (await run('readonly', (st) => st.get(key))) || []; } catch { return []; } };

  async function showReplay(course) {
    const cap = course.lessons.find((l) => l.kind === 'capstone');
    const fr = cap ? await frames(`${course.id}/${cap.id}`) : [];
    if (fr.length < 2) return toast('No replay yet — it records while you write the capstone.', 'info', 2600);
    const pre = h('pre', { class: 'replay-code' });
    const bar = h('input', { type: 'range', min: 0, max: fr.length - 1, value: 0, class: 'replay-bar' });
    const label = h('span', { class: 'muted small replay-t' });
    let i = 0, timer = null, speed = 1, typing = null;
    const setFrame = (k, animate) => {
      i = k; bar.value = k; label.textContent = `${k + 1} / ${fr.length} · ${new Date(fr[k].t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      clearInterval(typing);
      const prev = k > 0 ? fr[k - 1].code : '', next = fr[k].code;
      if (!animate || next.length < prev.length) { pre.textContent = next; return; }
      // type the new characters in
      let a = 0; while (a < prev.length && a < next.length && prev[a] === next[a]) a++;
      let b = 0; while (b < prev.length - a && b < next.length - a && prev[prev.length - 1 - b] === next[next.length - 1 - b]) b++;
      const mid = next.slice(a, next.length - b); let n = 0;
      const step = Math.max(1, Math.ceil(mid.length / 40));
      typing = setInterval(() => { n = Math.min(mid.length, n + step); pre.textContent = next.slice(0, a) + mid.slice(0, n) + next.slice(next.length - b); if (n >= mid.length) clearInterval(typing); }, 16);
    };
    const playBtn = h('button', { class: 'btn primary', html: `${icon('play', 12)} Play` });
    const stop = () => { clearInterval(timer); timer = null; playBtn.innerHTML = `${icon('play', 12)} Play`; };
    const play = () => { if (i >= fr.length - 1) setFrame(0); playBtn.textContent = 'Pause'; timer = setInterval(() => { if (i >= fr.length - 1) return stop(); setFrame(i + 1, true); }, 900 / speed); };
    playBtn.onclick = () => (timer ? stop() : play());
    const speedBtn = h('button', { class: 'btn ghost', text: '1×', onclick: () => { speed = speed === 1 ? 3 : speed === 3 ? 8 : 1; speedBtn.textContent = speed + '×'; if (timer) { stop(); play(); } } });
    bar.oninput = () => { stop(); setFrame(+bar.value); };
    setFrame(0);
    const body = h('div', { class: 'replay' }, pre, h('div', { class: 'replay-ctl' }, playBtn, speedBtn, bar, label));
    Q.modal({ title: `Replay · ${cap.title}`, wide: true, body, buttons: [{ label: 'Close', primary: true }], onClose: () => { stop(); clearInterval(typing); } });
    setTimeout(play, 400);
  }

  Q.journal = { noteError, noteSuccess, list, question, show };
  Q.replay = { record, frames, show: showReplay };
})();

/* ===================== mistake heatmap: what kind of mistakes you make, per language ===================== */
(() => {
  const CATS = [
    ['typo', 'Typos & names', 'A name is misspelled or used before it exists. Read the error’s name carefully and compare spelling and capitals.'],
    ['syntax', 'Syntax', 'Brackets, quotes, colons or indentation are off. Check the line in the error and the one just before it.'],
    ['types', 'Mixing types', 'Text and numbers got mixed up, or something was used the wrong way (like calling a non-function). Check what each value really is.'],
    ['offbyone', 'Off by one', 'Loops or counts are one too many or one too few. Check < vs <=, and whether you start at 0 or 1.'],
    ['output', 'Wrong output', 'The code runs but prints something else. Compare your output with the task line by line.'],
    ['structure', 'Missing a step', 'Part of the task is missing (a function, a call, a check). Re-read the task and tick off each part.'],
    ['loops', 'Endless loops', 'The code never stopped. Make sure each loop changes something so its condition becomes false.'],
    ['reading', 'Reading code', 'Predicting what code does. Trace it slowly, line by line, writing down each value.'],
  ];
  function classify({ err, msg, quiz }) {
    if (quiz) return 'reading';
    const t = String(err?.text || err?.last || '');
    if (t) {
      if (/Timeout|infinite loop|took too long|TooMuchOutput/i.test(t)) return 'loops';
      if (/NameError|ReferenceError|is not defined|has no attribute|undefined (variable|method)|Cannot find name/i.test(t)) return 'typo';
      if (/SyntaxError|IndentationError|Unexpected (token|identifier|end)|unterminated|missing \)|EOL|invalid syntax|expected/i.test(t)) return 'syntax';
      if (/TypeError|is not a function|can only concatenate|unsupported operand|ValueError|not iterable/i.test(t)) return 'types';
      return 'syntax';
    }
    const m = String(msg || '').replace(/<[^>]+>/g, '');
    const nums = m.match(/should be [“"]?(-?\d+(?:\.\d+)?)[”"]?.*but was [“"]?(-?\d+(?:\.\d+)?)/i);
    if (nums && Math.abs(+nums[1] - +nums[2]) === 1) return 'offbyone';
    const lines = m.match(/(\d+) lines?.*?(?:but|got|printed) (\d+)/i);
    if (lines && Math.abs(+lines[1] - +lines[2]) === 1) return 'offbyone';
    if (/should (print|be|show)|but was|expected|printed|output/i.test(m)) return 'output';
    return 'structure';
  }
  function note(info, lang) {
    const s = Q.learn?.state; if (!s || !lang) return;
    const c = classify(info);
    s.mistakes = s.mistakes || {}; const row = (s.mistakes[c] = s.mistakes[c] || {});
    row[lang] = (row[lang] || 0) + 1; Q.learn.save();
  }
  function html() {
    const s = Q.learn?.state; const m = s?.mistakes || {};
    const langs = [...new Set(Object.values(m).flatMap((r) => Object.keys(r)))];
    if (!langs.length) return '<p class="muted small">Your mistakes show up here once you’ve done some levels — it shows which kinds you make most, per language.</p>';
    const max = Math.max(1, ...Object.values(m).flatMap((r) => Object.values(r)));
    const name = (l) => Q.esc(Q.langs?.byId?.[l]?.name || l);
    const head = `<div class="hm-row hm-head" style="--n:${langs.length}"><span></span>${langs.map((l) => `<span>${name(l)}</span>`).join('')}</div>`;
    const rows = CATS.filter(([k]) => m[k]).map(([k, label]) => `<div class="hm-row" style="--n:${langs.length}"><span class="hm-l">${label}</span>${langs.map((l) => { const v = m[k][l] || 0; return `<span class="hm-c" style="--a:${v ? 0.15 + 0.85 * (v / max) : 0}" title="${label} · ${name(l)}: ${v}">${v || ''}</span>`; }).join('')}</div>`).join('');
    const top = CATS.map(([k, label, tip]) => [k, label, tip, Object.values(m[k] || {}).reduce((a, b) => a + b, 0)]).sort((a, b) => b[3] - a[3])[0];
    return `<div class="hm">${head}${rows}</div>${top && top[3] ? `<p class="hm-tip"><b>Most common: ${top[1]}.</b> ${top[2]}</p>` : ''}`;
  }
  Q.mistakes = { note, classify, html, CATS };
})();
