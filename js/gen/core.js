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

  /* ---------- wording variety: the same exercise, asked in different ways ---------- */
  const PHRASE = [
    [/^This should print /, ['This should print ', 'It’s supposed to print ', 'It’s meant to print ', 'It ought to print ']],
    [/^This should /, ['This should ', 'This is meant to ', 'The code should ', 'It’s supposed to ']],
    [/^This crashes/, ['This crashes', 'Running this crashes', 'This code crashes', 'Uh oh — this crashes']],
    [/^This won’t /, ['This won’t ', 'This doesn’t ', 'Right now this won’t ']],
    [/^This prints /, ['This prints ', 'Right now this prints ', 'At the moment it prints ']],
    [/^Make it print /, ['Make it print ', 'Get it to print ', 'Have it print ', 'Change it so it prints ']],
    [/^Print the /, ['Print the ', 'Show the ', 'Output the ', 'Display the ', 'Print out the ']],
    [/^Print each /, ['Print each ', 'Show each ', 'Print every ', 'Output each ']],
    [/^Print whether /, ['Print whether ', 'Show whether ', 'Print True/False for whether ']],
    [/^Print /, ['Print ', 'Show ', 'Output ', 'Display ', 'Print out ']],
    [/^Make a /, ['Make a ', 'Create a ', 'Build a ', 'Set up a ']],
    [/^Make an /, ['Make an ', 'Create an ', 'Build an ', 'Set up an ']],
    [/^Make the /, ['Make the ', 'Get the ', 'Change the code so the ']],
    [/^Write a /, ['Write a ', 'Create a ', 'Code a ', 'Make a ']],
    [/^Write (?=\w)/, ['Write ', 'Create ', 'Code ', 'Build ']],
    [/^Loop over /, ['Loop over ', 'Loop through ', 'Go through ', 'Walk through ']],
    [/^Count how many/, ['Count how many', 'Work out how many', 'Find out how many', 'Figure out how many']],
    [/^Add up /, ['Add up ', 'Total up ', 'Sum up ']],
    [/^Change the /, ['Change the ', 'Update the ', 'Edit the ']],
    [/^Use a /, ['Use a ', 'Using a ']],
    [/^Give the /, ['Give the ', 'Set the ']],
    [/^Ask for /, ['Ask for ', 'Ask the player for ', 'Ask the user for ']],
    [/^Create /, ['Create ', 'Make ', 'Set up ']],
    [/^Set /, ['Set ', 'Start with ', 'Make ', 'Begin with ']],
    [/^If /, ['If ', 'When ']],
    [/^Using /, ['Using ', 'With ']],
    [/^Given /, ['Given ', 'You have ', 'Starting from ']],
  ];
  // common phrases in the middle/end of a task
  const PHRASE_MID = [
    [/, and print it\./, [', and print it.', ', then print it.', ', then print the result.', ' — then print it.']],
    [/ on two lines\./, [' on two lines.', ' on separate lines.', ', each on its own line.']],
    [/, one per line\./, [', one per line.', ', each on its own line.', ' (one line each).']],
    [/ and print the count\./, [' and print the count.', ', then print how many.', ' and print that number.']],
    [/ and print the total\./, [' and print the total.', ', then print the total.', ' and show the total.']],
    [/, but stops one short\./, [', but stops one short.', ', but it misses the last one.', ', but it’s one short.']],
    [/ \(The checker types /, [' (The checker types ', ' (The test types ', ' (When checked, the input is ']],
  ];
  const CTX = ['🏆 Score screen', '🛒 Shop menu', '🐉 Boss fight', '🗺️ Level select', '🎒 Inventory', '💾 Save system', '🏎️ Racing game', '🚀 Space shooter', '🌾 Farm game', '🗝️ Dungeon crawler', '🧩 Puzzle game', '🍄 Platformer', '🏰 Tower defense', '🐾 Pet sim', '📜 Quest log', '📊 Leaderboard', '🧙 Character creator', '⚒️ Crafting menu', '🎣 Fishing minigame', '⛅ Weather system', '🎵 Rhythm game', '🧟 Zombie survival', '⚽ Sports game', '🃏 Card game'];
  const HEAD = {
    fix: ['<b>Fix the bug.</b>', '<b>Something’s broken.</b>', '<b>Bug hunt!</b>', '<b>Debug this.</b>', '<b>Find and fix the mistake.</b>', '<b>Spot it, fix it.</b>'],
    fill: ['<b>Fill in the box.</b>', '<b>Fill the gap.</b>', '<b>One piece is missing.</b>', '<b>Complete the line.</b>', '<b>What goes in the box?</b>'],
  };
  const PREDICT_Q = ['What will this print?', 'What’s the output?', 'What shows up in the console?', 'Run it in your head — what does it print?', 'What gets printed?', 'Predict the output.', 'What will you see when this runs?'];
  // swap the opening words of the first sentence (only plain text, never inside tags)
  function rephrase(task, g) {
    let t = String(task);
    for (const [re, alts] of PHRASE) { if (re.test(t)) { t = t.replace(re, g.pick(alts)); break; } }
    for (const [re, alts] of PHRASE_MID) if (re.test(t)) t = t.replace(re, g.pick(alts));
    return t;
  }
  const vary = { rephrase, CTX, HEAD, PREDICT_Q };

  /* turn a template into a lesson step */
  function make(courseId, tpl, seed, hard) {
    const p = packs[courseId];
    const g = G(seed, hard);
    let o;
    try { o = tpl.make(g); } catch (err) { console.warn('generator failed', courseId, tpl.id, err); return null; }
    const tag = `${tpl.skill} · ${KIND[tpl.kind]}`;
    const base = { tpl: tpl.id, course: courseId, gkind: tpl.kind, tag, generated: true, seed };
    // wording variety uses its own random stream, so it never changes the numbers in the level
    const w = G((seed ^ 0x9e3779b9) >>> 0);
    if (w.chance(0.45)) base.ctx = w.pick(CTX);
    if (tpl.kind === 'predict') return { type: 'predict', code: o.code, q: o.q || w.pick(PREDICT_Q), explain: o.explain, ...options(g, o.answer, o.wrong), ...base };
    if (tpl.kind === 'quiz') return { type: 'quiz', q: o.q, explain: o.explain, mono: !!o.mono, ...options(g, o.answer, o.wrong), ...base };
    const task = (HEAD[tpl.kind] ? w.pick(HEAD[tpl.kind]) + ' ' : '') + rephrase(o.task, w);
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
  /* ---------- new level types, made from existing templates (so every language gets them) ---------- */
  // write → order (arrange lines) / fill2 (several blanks); fix → spot (click the buggy line); predict → typeout / tf
  const DERIVE = { write: ['write', 'write', 'order', 'fill2', 'finish'], fix: ['fix', 'fix', 'spot'], predict: ['predict', 'typeout', 'tf'], fill: ['fill'], quiz: ['quiz'] };
  const BASE = { order: 'write', fill2: 'write', finish: 'write', spot: 'fix', typeout: 'predict', tf: 'predict', output: 'predict' };
  const KW = new Set('if else elif for while do return function def let const var local end then in of and or not new class public private static void int float double bool string true false True False None null nil self this print echo import from using include std cout endl auto break continue switch case default try catch except'.split(' '));
  const VERB = /^(Print|Show|Output|Display|Make|Create|Build|Set|Write|Code|Loop|Go|Walk|Count|Work|Find|Figure|Add|Total|Sum|Change|Update|Edit|Use|Using|Give|Ask|Store|Sort|Fill|Draw|Move|Return|Call|Get|Have|Put|Keep|Turn|Check|Start|Read|Save|Split|Join|Swap|Spawn|Pick|Clamp|Round)\b/;
  // "…so the code will <task>" when the task starts with a verb, otherwise "…does this: <Task>"
  const joinTask = (g, colon, will, t) => (VERB.test(t) ? `${g.pick(will)} ${t.replace(/^\w/, (c) => c.toLowerCase())}` : `${g.pick(colon)} ${t}`);
  const plainTask = (t) => String(t || '').replace(/^<b>[^<]*<\/b>\s*(—\s*replace <code>____<\/code>\.\s*)?/, '');
  function derive(step, vk, g) {
    if (!step || vk === step.type || vk === step.gkind) return step;
    const keep = { tag: step.tag.replace(/ · [^·]+$/, '') + ' · ' + ({ order: 'Arrange', fill2: 'Fill the boxes', spot: 'Spot the bug', typeout: 'Type the output', tf: 'True or false', finish: 'Finish it' }[vk]), tpl: step.tpl, generated: true, seed: step.seed, gkind: vk, vkind: vk, ctx: step.ctx };
    if (vk === 'order' && step.type === 'code' && step.solution) {
      const lines = step.solution.replace(/\s+$/, '').split('\n').filter((l) => l.trim());
      if (lines.length < 3 || lines.length > 10 || new Set(lines.map((l) => l.trim())).size < 3) return null;
      let sh = lines; for (let k = 0; k < 8 && sh.join('\n') === lines.join('\n'); k++) sh = g.shuffle(lines);
      if (sh.join('\n') === lines.join('\n')) return null;
      return { type: 'order', task: joinTask(g, ['<b>Put the lines in order</b> so the code does this:', '<b>Unscramble the code.</b> The goal:', '<b>The lines got mixed up!</b> Sort them. The program should do this:'], ['<b>Unscramble the code.</b> When it’s in order, it should', '<b>The lines got mixed up!</b> Sort them so the code will', '<b>Arrange the lines</b> so that the program will', '<b>Put the lines in order</b> to'], plainTask(step.task)), lines: sh, solution: lines.join('\n') + '\n', check: step.check, page: step.page, mode: step.mode, stdin: step.stdin, ...keep };
    }
    if (vk === 'fill2' && step.type === 'code' && step.solution) {
      const lines = step.solution.split('\n');
      const cands = [];
      lines.forEach((l, i) => { if (!l.trim() || /^\s*(\/\/|#|--|<!--)/.test(l)) return; const re = /"[^"\n]{1,24}"|'[^'\n]{1,24}'|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w]*(?=\s*\()|[A-Za-z_]\w{1,}/g; let m; const here = []; while ((m = re.exec(l))) { const t = m[0]; if (KW.has(t) || t.length > 26) continue; here.push({ i, at: m.index, t }); } if (here.length) cands.push(g.pick(here)); });
      if (cands.length < 2) return null;
      const pick = g.shuffle(cands).slice(0, Math.min(3, cands.length)).sort((a, b) => a.i - b.i);
      const out = lines.slice(); const answers = [];
      pick.forEach((c) => { out[c.i] = out[c.i].slice(0, c.at) + '____' + out[c.i].slice(c.at + c.t.length); answers.push(c.t); });
      const base = step.check;
      return { type: 'code', task: joinTask(g, [`<b>Fill in the ${pick.length} boxes</b> so the code does this:`, `<b>${pick.length} pieces are missing.</b> The goal:`], [`<b>${pick.length} pieces are missing.</b> Fill them in so the code will`, `<b>Complete the code</b> (${pick.length} boxes) so that it will`, `<b>Fill in the ${pick.length} boxes</b> to`], plainTask(step.task)), starter: out.join('\n'), solution: step.solution, blanks: answers, hints: [`There are ${pick.length} boxes. Read the task, then work out what each box needs. Press <b>Tab</b> to jump to the next box.`, `The boxes are: ${answers.map((a) => `<code>${esc(a)}</code>`).join(', ')}`], check: base, page: step.page, mode: step.mode, stdin: step.stdin, ...keep };
    }
    if (vk === 'finish' && step.type === 'code' && step.solution) {
      const lines = step.solution.replace(/\s+$/, '').split('\n');
      const real = lines.filter((l) => l.trim()).length;
      const given = (step.starter || '').replace(/\s+$/, '').split('\n').filter((l) => l.trim()).length;
      if (real < 3 || given >= real - 1) return null;
      let k = Math.max(given + 1, g.int(Math.ceil(lines.length / 3), lines.length - 1));
      while (k < lines.length && !lines[k - 1].trim()) k++;
      if (k >= lines.length) return null;
      const starter = lines.slice(0, k).join('\n') + '\n';
      if (Q.gen.packs[step.course]?.run === 'review') { try { if (step.check({ code: starter, logs: [], errors: [], out: '' }) === true) return null; } catch {} }
      return { type: 'code', task: joinTask(g, ['<b>Finish the code.</b> The first lines are done. The goal:', '<b>Half done!</b> The goal:'], ['<b>Finish the code.</b> The first lines are written — add the rest to', '<b>Half done!</b> Add the missing lines to', '<b>Pick up where it stops</b> and', '<b>Finish the job:</b>'], plainTask(step.task)), starter, solution: step.solution, hints: step.hints, check: step.check, page: step.page, mode: step.mode, stdin: step.stdin, ...keep };
    }
    if (vk === 'spot' && step.type === 'code' && step.starter != null && step.solution) {
      const A = step.starter.replace(/\s+$/, '').split('\n'), B = step.solution.replace(/\s+$/, '').split('\n');
      if (A.length !== B.length || A.length < 2) return null;
      const diff = A.map((l, i) => (l.trim() !== (B[i] || '').trim() ? i : -1)).filter((i) => i >= 0);
      if (diff.length !== 1) return null;
      return { type: 'spot', task: `${g.pick(['<b>Click the line with the bug.</b>', '<b>Which line is wrong?</b> Click it.', '<b>Find the broken line</b> and click it.', '<b>One line has a bug.</b> Click it.'])} ${plainTask(step.task)}`, code: A.join('\n'), bad: diff[0], fixed: B[diff[0]], solution: step.solution, ...keep };
    }
    if ((vk === 'typeout' || vk === 'tf') && step.type === 'predict' && step.code) {
      const ans = String(step.options[step.answer]);
      if (vk === 'typeout') return { type: 'typeout', q: g.pick(['Type exactly what this prints:', 'Type the output:', 'What appears in the console? Type it:', 'Write down exactly what you’d see:']), code: step.code, answer: ans, explain: step.explain, ...keep };
      const truth = g.chance(0.5); const wrongs = step.options.filter((_, i) => i !== step.answer);
      const shown = truth || !wrongs.length ? ans : String(g.pick(wrongs));
      return { type: 'tf', q: g.pick(['True or false?', 'Is this right?', 'Agree or disagree?', 'Check this claim:']), code: step.code, claim: shown, truth: shown === ans, actual: ans, explain: step.explain, ...keep };
    }
    return null;
  }
  // what makes two levels "the same" (identical text = a repeat)
  const sig = (s) => [s.type, s.vkind || '', s.code || s.starter || (s.lines || []).join('\n') || '', s.q || '', s.task || '', s.claim || ''].join('\u0001');
  const sigHash = (s) => hash(sig(s)).toString(36);

  /* pick n levels: no identical level twice, never the same template or level type twice in a row, avoid recently seen ones */
  function levels(courseId, pool, n, seed, { focus = [], focusShare = 0.6, bias, hard: forceHard, kinds, variety = true } = {}) {
    const g = G(seed);
    let usable = kinds ? pool.filter((t) => kinds.includes(t.kind) || kinds.some((k) => BASE[k] === t.kind)) : pool;
    if (!usable.length) usable = pool;
    const virtual = bias && BASE[bias];
    const foc = focus.filter((t) => usable.includes(t));
    const recent = new Set(st()?.recentLv || []);
    const out = []; const used = new Map(); const seen = new Set(); const dead = new Set();
    let prevT = null, prevK = null, tries = 0;
    const isBias = (k) => k === bias || (bias === 'output' && (k === 'typeout' || k === 'tf'));
    const kindsFor = (t) => {
      let all = variety && DERIVE[t.kind] ? DERIVE[t.kind] : [t.kind];
      if (kinds) { const ks = kinds.flatMap((k) => (k === 'output' ? ['typeout', 'tf'] : [k])); const f = all.filter((k) => ks.includes(k)); if (f.length) all = f; }
      return all;
    };
    while (out.length < n && tries < n * 12 && usable.length) {
      tries++;
      const strict = tries < n * 8; // never the same level type twice in a row (relaxed only if we run out of options)
      // themed lessons: the theme type on every other level (it can't be back-to-back), mixed in between
      const wantTheme = bias && !isBias(prevK) && g.r() < (virtual ? 0.95 : 0.7);
      let from = foc.length && g.r() < focusShare ? foc : usable;
      if (wantTheme) { const b = usable.filter((t) => t.kind === (BASE[bias] || bias)); if (b.length) from = b; }
      let cand = from.filter((t) => !dead.has(t.id) && t.id !== prevT && kindsFor(t).some((k) => k !== prevK));
      if (!cand.length) cand = usable.filter((t) => !dead.has(t.id) && t.id !== prevT && kindsFor(t).some((k) => k !== prevK));
      if (!cand.length && !strict) cand = usable.filter((t) => !dead.has(t.id));
      if (!cand.length) { if (strict) continue; break; }
      const fresh = cand.filter((t) => (used.get(t.id) || 0) === 0);
      const twice = cand.filter((t) => (used.get(t.id) || 0) < 2);
      const t = weighted(g, fresh.length ? fresh : twice.length ? twice : cand, courseId);
      // which level types to try for this template, best first
      let opts = kindsFor(t);
      if (virtual && BASE[bias] === t.kind) opts = wantTheme ? (bias === 'output' ? g.shuffle(['typeout', 'tf']) : [bias]) : g.shuffle(opts.filter((k) => !isBias(k)));
      else opts = g.shuffle(opts);
      opts = opts.filter((k) => k !== prevK || !strict);
      if (!opts.length) { if (!strict) opts = [t.kind]; else continue; }
      let made = null;
      for (const vk of opts) {
        for (let a = 0; a < 5 && !made; a++) {
          const base = make(courseId, t, (seed + (out.length + tries) * 7919 + a * 104729 + hash(t.id)) >>> 0, forceHard ?? isHard(courseId, t));
          if (!base) break;
          const s = vk === t.kind ? base : derive(base, vk, g);
          if (!s) break; // this template can't become that type — try the next type
          const k = sig(s);
          if (seen.has(k)) continue;
          if (a < 3 && recent.has(sigHash(s))) continue;
          made = s; seen.add(k);
        }
        if (made) break;
      }
      if (!made) { if (!opts.includes(t.kind) || !wantTheme) dead.add(t.id); continue; }
      if (!made.vkind) made.vkind = made.gkind || t.kind;
      used.set(t.id, (used.get(t.id) || 0) + 1);
      prevT = t.id; prevK = made.vkind;
      out.push(made);
    }
    return out;
  }
  // another version of the same level (for "missed levels come back later")
  function again(courseId, step) {
    const t = packs[courseId]?.templates.find((x) => x.id === step.tpl); if (!t) return null;
    const base = make(courseId, t, freshSeed(), false); const s = step.vkind ? derive(base, step.vkind, G(freshSeed())) || base : base; if (s) { s.retry = true; s.tag = s.tag + ' · retry'; }
    return s;
  }

  Q.gen = { vary, derive, sig, sigHash, DERIVE, BASE, G, hash, freshSeed, options, near, pack, packs, make, levels, again, record, skill, isHard, esc, POOL };
})();
