/* Codeditor — procedural level generator.
   Templates make one level from a seeded random generator. The course builder (build.js) uses them to
   pad hand-written lessons, create practice lessons, unit tests, test-outs and challenges. */
(() => {
  const K = () => Q.kit;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- seeded random ---------- */
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const freshSeed = () => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;

  // generic word pools with a light game touch
  const POOL = {
    num: ['total', 'count', 'sum', 'value', 'result', 'amount', 'score', 'points', 'coins', 'lives', 'level', 'speed', 'size', 'steps', 'width', 'height', 'damage', 'bonus'],
    list: ['items', 'scores', 'values', 'numbers', 'prices', 'names', 'words', 'colors', 'levels', 'tasks'],
    name: ['Ava', 'Leo', 'Mia', 'Kai', 'Zoe', 'Sam', 'Eli', 'Ivy', 'Max', 'Nia', 'Ray', 'Una', 'Ben', 'Lia', 'Tom', 'Ada'],
    word: ['apple', 'river', 'pixel', 'cloud', 'stone', 'robot', 'tiger', 'lemon', 'comet', 'music', 'garden', 'rocket', 'castle', 'planet', 'bridge', 'candle'],
    item: ['key', 'map', 'gem', 'coin', 'book', 'lamp', 'rope', 'shield', 'bow', 'cup', 'hat', 'ring'],
    color: ['red', 'green', 'blue', 'gold', 'purple', 'orange', 'teal', 'pink'],
  };

  function G(seed, hard = false) {
    const r = mulberry(seed);
    const g = {
      r, hard, seed,
      int: (a, b) => a + Math.floor(r() * (b - a + 1)),
      pick: (a) => a[Math.floor(r() * a.length)],
      chance: (p) => r() < p,
      shuffle: (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
    };
    g.picks = (a, n) => g.shuffle(a).slice(0, n);
    g.ints = (n, a, b) => Array.from({ length: n }, () => g.int(a, b));
    g.num = () => g.pick(POOL.num); g.list = () => g.pick(POOL.list); g.name = () => g.pick(POOL.name);
    g.word = () => g.pick(POOL.word); g.item = () => g.pick(POOL.item); g.color = () => g.pick(POOL.color);
    g.vars = (n, pool = POOL.num) => g.picks(pool, n); // n different variable names
    g.words = (n) => g.picks(POOL.word, n);
    return g;
  }

  /* ---------- answer options for predict / quiz ---------- */
  function options(g, answer, wrong) {
    const a = String(answer);
    const set = [...new Set(wrong.map(String).filter((w) => w !== a))];
    const opts = g.shuffle([a, ...g.picks(set, 3)]);
    return { options: opts, answer: opts.indexOf(a) };
  }
  // numeric distractors near an answer
  const near = (g, n, extra = []) => [n + 1, n - 1, n * 2, n + 10, n - 10, Math.floor(n / 2), n + g.int(2, 5), ...extra].filter((x) => x !== n && Number.isFinite(x));

  /* ---------- registry ---------- */
  const packs = {}; // courseId -> { run: 'out' | 'review' | 'web', templates: [] }
  const KIND = { write: 'Write it', fix: 'Fix the bug', predict: 'Predict', fill: 'Fill the blank', quiz: 'Quick quiz' };
  function pack(courseId, run, templates) { const p = (packs[courseId] = packs[courseId] || { run, templates: [] }); p.templates.push(...templates.map((t) => ({ ...t, course: courseId }))); return p; }

  const noBlank = (r) => (/____/.test(r.code) ? 'Replace the <code>____</code> with real code.' : true);

  /* turn a template into a lesson step */
  function make(courseId, tpl, seed, hard) {
    const p = packs[courseId];
    const g = G(seed, hard);
    let o;
    try { o = tpl.make(g); } catch (err) { console.warn('generator failed', courseId, tpl.id, err); return null; }
    const tag = `${tpl.skill} · ${KIND[tpl.kind]}`;
    const base = { tpl: tpl.id, gkind: tpl.kind, tag, generated: true, seed };
    if (tpl.kind === 'predict') return { type: 'predict', code: o.code, q: o.q, explain: o.explain, ...options(g, o.answer, o.wrong), ...base };
    if (tpl.kind === 'quiz') return { type: 'quiz', q: o.q, explain: o.explain, mono: !!o.mono, ...options(g, o.answer, o.wrong), ...base };
    const task = (tpl.kind === 'fix' ? '<b>Fix the bug.</b> ' : tpl.kind === 'fill' ? '<b>Fill in the blank</b> — replace <code>____</code>. ' : '') + o.task;
    const starter = tpl.kind === 'fix' ? o.bug : tpl.kind === 'fill' ? o.blank : (o.starter ?? '');
    let check;
    if (p.run === 'review') {
      const rules = [[(s, raw) => !/____/.test(raw), 'Replace the <code>____</code> with real code.'], ...(o.rules || [])];
      check = K().review(rules, { keepComments: o.keepComments });
    } else {
      check = (r, H) => {
        const b = noBlank(r); if (b !== true) return b;
        const src = (p.strip || K().strip)(r.code);
        for (const [re, msg] of o.need || []) if (typeof re === 'function' ? !re(src, r.code) : !re.test(src)) return msg;
        if (o.check) { const v = o.check(r, H); if (v !== true) return v; }
        return o.expect ? K().expectLines(r, o.expect) : true;
      };
    }
    return { type: 'code', task, starter, solution: o.solution, hints: o.hints?.length >= 2 ? o.hints : (() => { const a = autoHints(tpl, starter, o.solution); return o.hints?.length ? [o.hints[0], a[1]].filter(Boolean) : a; })(), check, page: o.page, mode: o.mode, stdin: o.stdin, success: o.success, ...base };
  }


  /* two-step hints for generated levels: a nudge, then nearly the answer */
  function autoHints(tpl, starter, solution) {
    if (!solution) return [];
    const code = (t) => `<code>${Q.esc(t.trim())}</code>`;
    const sol = solution.split('\n'), st = (starter || '').split('\n');
    const real = (l) => l.trim() && !/^\s*(#|\/\/|--)/.test(l);
    if (tpl.kind === 'fix') {
      let i = sol.findIndex((l, k) => (st[k] ?? '').trim() !== l.trim());
      if (i < 0) i = 0;
      return [`Run it and compare what happens with the task. Only one small thing is wrong — look closely around <b>line ${i + 1}</b>.`,
        `Line ${i + 1} should be: ${code(sol[i] || '')}`];
    }
    if (tpl.kind === 'fill') {
      const i = st.findIndex((l) => l.includes('____'));
      return [`What does the task need here? Think about <b>${Q.esc(tpl.skill)}</b> — the blank is one small piece of code.`,
        i >= 0 && sol[i] != null ? `Line ${i + 1} becomes: ${code(sol[i])}` : `The answer is: ${code(solution.split('\n').find(real) || solution)}`];
    }
    const lines = sol.filter(real);
    return [`This one is about <b>${Q.esc(tpl.skill)}</b>. Work out the first thing the task needs, then add one line at a time.`,
      lines.length > 1 ? `Start with ${code(lines[0])} — ${lines.length} lines in total.` : `You need just one line, like: ${code(lines[0] || solution)}`];
  }

  /* ---------- adaptive skill tracking ---------- */
  const st = () => Q.learn?.state;
  function skill(courseId, tplId) { const s = st(); if (!s) return { ok: 0, bad: 0 }; s.skill = s.skill || {}; return (s.skill[`${courseId}/${tplId}`] = s.skill[`${courseId}/${tplId}`] || { ok: 0, bad: 0, seen: 0 }); }
  function record(courseId, tplId, ok) { const k = skill(courseId, tplId); if (ok) k.ok++; else k.bad++; k.last = Date.now(); Q.learn?.save?.(); }
  // weak skills get picked more; strong ones get harder variants
  const weight = (courseId, tpl) => { const k = skill(courseId, tpl.id); const n = k.ok + k.bad; return 1 + (n ? (k.bad / n) * 3 : 0.5); };
  const isHard = (courseId, tpl) => { const k = skill(courseId, tpl.id); return k.ok >= 3 && k.bad / (k.ok + k.bad) < 0.25; };
  function weighted(g, list, courseId) { const ws = list.map((t) => weight(courseId, t)); let x = g.r() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < list.length; i++) { x -= ws[i]; if (x <= 0) return list[i]; } return list[list.length - 1]; }

  /* pick n levels from a template pool, keeping kinds varied and avoiding repeats where possible */
  function levels(courseId, pool, n, seed, { focus = [], focusShare = 0.6, bias, hard: forceHard, kinds } = {}) {
    const g = G(seed);
    let usable = kinds ? pool.filter((t) => kinds.includes(t.kind)) : pool;
    if (!usable.length) usable = pool;
    const foc = focus.filter((t) => usable.includes(t));
    const out = []; const used = new Map();
    for (let i = 0; i < n && usable.length; i++) {
      let from = foc.length && g.r() < focusShare ? foc : usable;
      if (bias && g.r() < 0.5) { const b = from.filter((t) => t.kind === bias); if (b.length) from = b; }
      // prefer templates not used yet in this set
      const fresh = from.filter((t) => (used.get(t.id) || 0) === 0);
      const t = weighted(g, fresh.length ? fresh : from, courseId);
      used.set(t.id, (used.get(t.id) || 0) + 1);
      const s = make(courseId, t, (seed + i * 7919 + hash(t.id)) >>> 0, forceHard ?? isHard(courseId, t));
      if (s) out.push(s);
    }
    return out;
  }
  // another version of the same level (for "missed levels come back later")
  function again(courseId, step) {
    const t = packs[courseId]?.templates.find((x) => x.id === step.tpl); if (!t) return null;
    const s = make(courseId, t, freshSeed(), false); if (s) { s.retry = true; s.tag = s.tag + ' · retry'; }
    return s;
  }

  Q.gen = { G, hash, freshSeed, options, near, pack, packs, make, levels, again, record, skill, isHard, esc, POOL };
})();
