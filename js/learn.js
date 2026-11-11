/* Codeditor — learning engine: courses, lessons, checks, XP, streaks, badges */
(() => {
  const { h, esc, icon, toast, store, bus, modal, debounce } = Q;
  const courses = (Q.courses = Q.courses || []);
  const LORDER = Q.langInfo.list.map((l) => l.id);
  courses.forEach((c, i) => (c._i = i));
  courses.sort((a, b) => (LORDER.indexOf(a.lang) - LORDER.indexOf(b.lang)) || ((a.order ?? 50) - (b.order ?? 50)) || a._i - b._i);
  // estimated minutes for a lesson: reading takes a while, quizzes are quick, coding takes longest
  const dur = (m) => { if (m < 55) return `about ${Math.max(5, Math.round(m / 5) * 5)} min`; const h = Math.round(m / 30) / 2; return `about ${h} hour${h === 1 ? '' : 's'}`; };
  const minutes = (l) => Math.max(2, Math.round(l.steps.reduce((m, st) => m + (st.type === 'read' ? 1.5 : st.type === 'code' ? 3 : 0.75), 0)));

  const BADGES = [
    ['first-run', '🚀', 'Liftoff', 'Run code for the first time'],
    ['first-lesson', '🎓', 'Student', 'Finish your first lesson'],
    ['five-lessons', '📚', 'Bookworm', 'Finish 5 lessons'],
    ['ten-lessons', '🧠', 'Big Brain', 'Finish 10 lessons'],
    ['twentyfive-lessons', '🦾', 'Unstoppable', 'Finish 25 lessons'],
    ['course-complete', '🏆', 'Graduate', 'Complete a whole course'],
    ['polyglot', '🌍', 'Polyglot', 'Finish lessons in 3 different languages'],
    ['perfect', '💯', 'Flawless', 'Finish a lesson without a single mistake'],
    ['streak-3', '🔥', 'On Fire', 'Learn 3 days in a row'],
    ['streak-7', '☄️', 'Unbreakable', 'Learn 7 days in a row'],
    ['debugger', '🐞', 'Bug Hunter', 'Ask the Tutor to explain an error'],
    ['creator', '✍️', 'Creator', 'Create a new file'],
    ['shipper', '📦', 'Shipper', 'Export or share a project'],
    ['tinkerer', '🧩', 'Tinkerer', 'Toggle an extension'],
    ['night-owl', '🦉', 'Night Owl', 'Finish a lesson after 10 pm'],
    ['early-bird', '🐦', 'Early Bird', 'Finish a lesson before 7 am'],
    ['curious', '💡', 'Curious Mind', 'Look up 50 things with the Tutor'],
    ['tourist', '🗺️', 'World Tourist', 'Finish a lesson in 3 review-only languages'],
    ['level-5', '⭐', 'Rising Star', 'Reach level 5'],
    ['level-10', '🌟', 'Superstar', 'Reach level 10'],
    ['xp-1000', '💎', 'Gem Collector', 'Earn 1,000 XP'],
    ['fifty-lessons', '🏛️', 'Scholar', 'Finish 50 lessons'],
    ['hundred-lessons', '👑', 'Grandmaster', 'Finish 100 lessons'],
    ['two-courses', '🎖️', 'Double Major', 'Complete 2 whole courses'],
    ['streak-14', '🌋', 'Volcanic', 'Learn 14 days in a row'],
    ['streak-30', '🌞', 'Sun Never Sets', 'Learn 30 days in a row'],
    ['quiz-whiz', '🎯', 'Quiz Whiz', 'Answer 25 questions right on the first try'],
    ['first-try', '⚡', 'First Try', 'Pass 10 coding challenges on the first attempt'],
    ['comeback', '🔁', 'Comeback Kid', 'Pass a challenge after 3 or more tries'],
    ['no-hints', '🥷', 'Ninja', 'Finish a coding lesson without hints or the solution'],
    ['game-dev', '🎮', 'Game Dev', 'Finish your first game development lesson'],
    ['pixel-artist', '🎨', 'Pixel Artist', 'Draw your first sprite'],
    ['sound-designer', '🔊', 'Sound Designer', 'Make your first sound effect'],
    ['first-game', '🕹️', 'Shipped It', 'Finish the final game project'],
    ['polyglot-5', '🗣️', 'Linguist', 'Finish lessons in 5 different languages'],
    ['polyglot-10', '🌐', 'Babel', 'Finish lessons in 10 different languages'],
    ['explorer', '🧭', 'Explorer', 'Open lessons in 3 different languages'],
    ['exterminator', '🔨', 'Exterminator', 'Have 10 errors explained'],
    ['runner', '🏃', 'Marathon', 'Run your code 50 times'],
    ['architect', '🏗️', 'Architect', 'Have 3 projects'],
    ['stylist', '🖌️', 'Stylist', 'Change the color theme'],
    ['weekend', '🏖️', 'Weekend Warrior', 'Finish a lesson on a weekend'],
    ['collector', '🏅', 'Collector', 'Unlock 15 badges'],
  ];

  const state = Object.assign({ done: {}, xp: 0, streak: { last: null, count: 0 }, badges: {}, stats: {}, code: {}, perfect: {} }, store.get('learn', {}));
  const save = debounce(() => store.set('learn', state), 200);
  const key = (c, l) => `${c}/${l}`;
  const today = () => new Date().toLocaleDateString('en-CA');

  /* ---------- Levels ---------- */
  function levelInfo(xp = state.xp) {
    let lvl = 1, need = 100, base = 0;
    while (xp >= base + need) { base += need; lvl++; need = 100 + (lvl - 1) * 50; }
    return { lvl, into: xp - base, need, pct: Math.round(((xp - base) / need) * 100) };
  }
  const TITLES = ['Newbie', 'Apprentice', 'Tinkerer', 'Builder', 'Coder', 'Hacker', 'Engineer', 'Architect', 'Wizard', 'Legend'];
  const titleFor = (lvl) => TITLES[Math.min(TITLES.length - 1, Math.floor((lvl - 1) / 2))];

  function renderXP(bump) {
    const el = document.getElementById('xp'); if (!el) return;
    const L = levelInfo();
    el.innerHTML = `<div class="xp-ring" style="--p:${L.pct}"><span>${L.lvl}</span></div><span class="xp-num">${state.xp} XP</span>${state.streak.count ? `<span class="xp-streak" title="Day streak">${icon('flame', 13)}${state.streak.count}</span>` : ''}`;
    el.title = `Level ${L.lvl} · ${titleFor(L.lvl)} — ${L.into}/${L.need} XP to next level`;
    el.onclick = () => Q.learn.showBadges();
    if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }

  function addXP(n, why) {
    const before = levelInfo().lvl;
    state.xp += n; save(); renderXP(true);
    toast(`+${n} XP${why ? ' · ' + why : ''}`, 'xp', 1800);
    const after = levelInfo().lvl;
    if (after >= 5) badge('level-5'); if (after >= 10) badge('level-10'); if (state.xp >= 1000) badge('xp-1000');
    if (after > before) setTimeout(() => { Q.confetti(160); toast(`Level up! You’re now level ${after} — ${titleFor(after)} 🎉`, 'success', 4000); }, 500);
  }
  function badge(id) {
    if (state.badges[id]) return;
    const b = BADGES.find((x) => x[0] === id); if (!b) return;
    state.badges[id] = Date.now(); save();
    if (Object.keys(state.badges).length >= 15) setTimeout(() => badge('collector'), 1500);
    setTimeout(() => toast(`Badge unlocked: ${b[1]} <b>${b[2]}</b> — ${b[3]}`, 'xp', 4200), 300);
    if (document.querySelector('[data-view="learn"].on')) Q.learn.renderSidebar();
  }
  function stat(k, by = 1) {
    state.stats[k] = (state.stats[k] || 0) + by; save();
    const n = state.stats[k];
    if (k === 'tutorLookups' && n >= 50) badge('curious');
    if (k === 'quizFirst' && n >= 25) badge('quiz-whiz');
    if (k === 'firstTry' && n >= 10) badge('first-try');
    if (k === 'explains' && n >= 10) badge('exterminator');
    if (k === 'runs' && n >= 50) badge('runner');
  }
  function touchStreak() {
    const t = today();
    if (state.streak.last === t) return;
    const y = new Date(Date.now() - 864e5).toLocaleDateString('en-CA');
    state.streak.count = state.streak.last === y ? state.streak.count + 1 : 1;
    state.streak.last = t; save();
    if (state.streak.count >= 3) badge('streak-3');
    if (state.streak.count >= 7) badge('streak-7');
    if (state.streak.count >= 14) badge('streak-14');
    if (state.streak.count >= 30) badge('streak-30');
  }
  // expire a broken streak on load
  (() => { const y = new Date(Date.now() - 864e5).toLocaleDateString('en-CA'); if (state.streak.last && state.streak.last !== today() && state.streak.last !== y) { state.streak.count = 0; save(); } })();

  /* ---------- Lesson session ---------- */
  let app = null;
  let S = null; // { course, lesson, i, attempts, mistakes, solved:{}, hint }
  const host = () => document.getElementById('lesson');
  const tabId = () => S && `@lesson/${S.course.id}-${S.lesson.id}.${S.course.ext}`;
  const step = () => S && S.lesson.steps[S.i];
  const hasCode = (l) => l.steps.some((s) => s.type === 'code');

  function lockedBy(course, lesson) {
    if (state.done[key(course.id, lesson.id)]) return null; // finished lessons never lock, even if new ones were added before them
    const i = course.lessons.indexOf(lesson);
    const first = course.lessons.findIndex((l) => !state.done[key(course.id, l.id)]);
    return first >= 0 && i > first ? course.lessons[first] : null;
  }
  function open(courseId, lessonId, { force } = {}) {
    const course = courses.find((c) => c.id === courseId); if (!course) return;
    const lesson = course.lessons.find((l) => l.id === lessonId) || course.lessons[0];
    const need = !force && lockedBy(course, lesson);
    if (need) {
      modal({ title: 'This lesson builds on earlier ones', body: `<p><b>${esc(lesson.title)}</b> uses ideas from lessons you haven’t finished yet. The next one in order is <b>${esc(need.title)}</b>.</p><p>Each lesson builds on the one before it, so going in order makes everything click.</p>`, buttons: [
        { label: 'Open anyway', onclick: () => { open(courseId, lessonId, { force: true }); } },
        { label: `Go to “${need.title}”`, primary: true, onclick: () => { open(courseId, need.id, { force: true }); } },
      ] });
      return;
    }
    state.langsOpened = [...new Set([...(state.langsOpened || []), course.lang])];
    if (state.langsOpened.length >= 3) badge('explorer');
    if (!state.lang) state.lang = course.lang;
    if (S && tabId() && app.virtuals.has(tabId())) { persistCode(); app.closeVirtual(tabId()); }
    S = { course, lesson, i: 0, attempts: 0, mistakes: 0, solved: {}, hint: 0, usedHints: false };
    state.current = { course: course.id, lesson: lesson.id }; save();
    app.showRight('lesson');
    if (hasCode(lesson)) {
      const first = lesson.steps.find((s) => s.type === 'code');
      const saved = state.code[key(course.id, lesson.id)];
      app.openVirtual(tabId(), { title: `${lesson.title}.${course.ext}`, lang: course.lang, value: saved ?? first.starter ?? '' });
    }
    render();
    Q.learn.renderSidebar();
  }
  function close() {
    if (!S) return;
    persistCode();
    const id = tabId(); S = null;
    app.focusLearn && app.focusLearn(false);
    if (app.virtuals.has(id)) app.closeVirtual(id);
    render(); Q.learn.renderSidebar();
  }
  function persistCode() { if (S && hasCode(S.lesson) && app.editor.has(tabId())) { state.code[key(S.course.id, S.lesson.id)] = app.editor.get(tabId()); save(); } }

  function go(i) {
    if (!S) return;
    persistCode();
    const prev = step();
    S.i = Math.max(0, Math.min(S.lesson.steps.length, i)); S.attempts = 0; S.hint = 0;
    const st = step();
    if (st && st.type === 'code' && st.starter != null && !st.keep && prev !== st) {
      // only replace code when the step brings new starter code and hasn't been solved before
      if (!S.solved[S.i]) { if (app.editor.has(tabId())) app.editor.set(tabId(), st.starter); else app.openVirtual(tabId(), { title: `${S.lesson.title}.${S.course.ext}`, lang: S.course.lang, value: st.starter }); }
    }
    if (st && st.type === 'code' && app.virtuals.has(tabId())) app.activate(tabId());
    render();
  }

  /* ---------- Rendering ---------- */
  function render() {
    const el = host(); if (!el) return;
    el.innerHTML = '';
    if (!S) return renderEmpty(el);
    const { course, lesson } = S;
    const steps = lesson.steps;
    el.append(h('div', { class: 'lhead' },
      h('div', { class: 'lcrumb', html: `<span class="fbadge" style="--c:${course.color}">${esc(course.badge)}</span>${esc(course.title)} · Lesson ${course.lessons.indexOf(lesson) + 1} of ${course.lessons.length}` }),
      h('div', { class: 'ltitle', text: lesson.title }),
      h('div', { class: 'lsteps' }, ...steps.map((s, j) => h('div', { class: 'lstep' + (j < S.i || S.solved[j] ? ' done' : '') + (j === S.i ? ' on' : ''), title: `Step ${j + 1}`, onclick: () => (j <= S.i || S.solved[j - 1] || state.done[key(course.id, lesson.id)]) && go(j) })))));
    const body = h('div', { class: 'lbody' });
    const foot = h('div', { class: 'lfoot' });
    el.append(body, foot);
    if (S.i >= steps.length) return renderDone(body, foot);
    const st = step();
    const back = h('button', { class: 'btn ghost', html: `${icon('arrowLeft', 14)}`, title: 'Previous step', disabled: S.i === 0, onclick: () => go(S.i - 1) });
    foot.append(back);
    if (st.type === 'read') renderRead(st, body, foot);
    else if (st.type === 'quiz' || st.type === 'predict') renderQuiz(st, body, foot);
    else if (st.type === 'code') renderCode(st, body, foot);
    body.scrollTop = 0;
  }

  function richText(html) {
    const d = h('div', { html });
    // code blocks with data-try get a "Try it" button that inserts into the lesson editor
    d.querySelectorAll('pre').forEach((pre) => {
      if (!pre.hasAttribute('data-try') || !app.virtuals.has(tabId())) return;
      pre.append(h('button', { class: 'tryit', text: 'Try it', onclick: () => { app.activate(tabId()); app.editor.insertBelow(pre.textContent.replace(/Try it$/, '').trim()); } }));
    });
    return d;
  }

  function renderRead(st, body, foot) {
    body.append(richText(st.html));
    foot.append(h('div', { class: 'grow' }), h('button', { class: 'btn primary', html: `Continue ${icon('arrowRight', 14)}`, onclick: () => { S.solved[S.i] = true; go(S.i + 1); } }));
  }

  function renderQuiz(st, body, foot) {
    body.append(h('h4', { html: st.type === 'predict' ? (st.q || 'What will this print?') : st.q }));
    if (st.intro) body.append(richText(st.intro));
    if (st.code) body.append(h('pre', { text: st.code }));
    const opts = h('div', { class: 'qopts' });
    const fb = h('div');
    const next = h('button', { class: 'btn primary', html: `Continue ${icon('arrowRight', 14)}`, disabled: !S.solved[S.i], onclick: () => go(S.i + 1) });
    const mono = st.type === 'predict' || st.mono;
    st.options.forEach((o, j) => {
      const b = h('button', { class: 'qopt' + (mono ? '' : ' txt'), html: `<span class="k">${'ABCDEF'[j]}</span><span>${esc(o)}</span>` });
      if (S.solved[S.i] && j === st.answer) b.classList.add('right');
      b.onclick = () => {
        if (S.solved[S.i]) return;
        if (j === st.answer) {
          b.classList.add('right'); S.solved[S.i] = true; next.disabled = false;
          fb.innerHTML = ''; fb.append(h('div', { class: 'feedback good', html: `${icon('check', 16)}<div><b>${pick(['Correct!', 'Nailed it!', 'Exactly right!', 'Yes!', 'Spot on!'])}</b> ${st.explain || ''}</div>` }));
          if (S.attempts === 0) { state.xp += 2; save(); renderXP(true); }
          stat('quizzes'); if (S.attempts === 0) stat('quizFirst');
        } else {
          b.classList.add('wrong'); b.disabled = true; S.attempts++; S.mistakes++;
          fb.innerHTML = ''; fb.append(h('div', { class: 'feedback bad', html: `${icon('close', 16)}<div><b>Not quite.</b> ${st.wrong?.[j] || 'Have another look and try again.'}</div>` }));
        }
      };
      opts.append(b);
    });
    body.append(opts, fb);
    if (S.solved[S.i]) fb.append(h('div', { class: 'feedback good', html: `${icon('check', 16)}<div>${st.explain || 'Correct!'}</div>` }));
    foot.append(h('div', { class: 'grow' }), next);
    // keyboard: 1-4 / A-D to answer
    body.tabIndex = -1;
  }

  let previewFrame = null;
  function renderCode(st, body, foot) {
    if (st.html && !st.task) body.append(richText(st.html));
    else if (st.intro) body.append(richText(st.intro));
    body.append(h('div', { class: 'task', html: `<div class="lab">${icon('target', 13)} Your task</div>${st.task}` }));
    const fb = h('div', { id: 'lesson-fb' });
    body.append(fb);
    if (S.solved[S.i]) fb.append(h('div', { class: 'feedback good', html: `${icon('check', 16)}<div><b>Solved!</b> ${st.success || ''}</div>` }));
    // live preview for web lessons
    if (S.course.run === 'web') {
      previewFrame = h('iframe', { sandbox: 'allow-scripts allow-modals', style: { width: '100%', height: '200px', border: '1px solid var(--border)', borderRadius: '6px', background: '#fff' }, title: 'Lesson preview' });
      body.append(h('div', { class: 'section-label', style: { padding: '4px 0 6px' }, text: 'Live preview' }), previewFrame);
      updatePreview();
    } else previewFrame = null;
    const hints = st.hints || [];
    const hintBtn = h('button', { class: 'btn ghost', html: `${icon('bulb', 14)} Hint`, title: 'Get a hint', disabled: !hints.length, onclick: () => {
      const hi = hints[Math.min(S.hint, hints.length - 1)]; S.hint++; S.usedHints = true;
      fb.innerHTML = ''; fb.append(h('div', { class: 'feedback hint', html: `${icon('bulb', 16)}<div><b>Hint ${Math.min(S.hint, hints.length)}/${hints.length}:</b> ${hi}</div>` }));
    } });
    const solBtn = h('button', { class: 'btn ghost', html: `${icon('eye', 14)} Solution`, title: 'Show the solution', disabled: !st.solution, onclick: async () => {
      if (!(await Q.confirm('Show the solution?', 'Try once more first — struggling a bit is how your brain learns! The solution will replace your code.', false))) return;
      app.editor.set(tabId(), st.solution); app.activate(tabId()); S.mistakes++; S.usedSolution = true;
    } });
    const checkBtn = h('button', { class: 'btn primary', id: 'lesson-check', html: `${icon('play', 12)} Check <kbd style="background:transparent;border-color:#fff6;color:#fff">Ctrl ⏎</kbd>`, onclick: () => check() });
    const nextBtn = h('button', { class: 'btn good', html: `Continue ${icon('arrowRight', 14)}`, onclick: () => go(S.i + 1) });
    foot.append(hintBtn, solBtn, h('div', { class: 'grow' }), S.solved[S.i] ? nextBtn : checkBtn);
    if (app.virtuals.has(tabId()) && app.editor.activeId !== tabId()) app.activate(tabId());
  }

  const updatePreview = debounce(() => {
    if (!S || !previewFrame || !previewFrame.isConnected || S.course.run !== 'web') return;
    const st = step(); if (!st || st.type !== 'code') return;
    previewFrame.srcdoc = buildWeb(st, app.editor.get(tabId()) || '');
  }, 250);
  function buildWeb(st, code) {
    const mode = st.mode || S.course.mode || 'html';
    if (mode === 'html') return code;
    if (mode === 'css') return (st.page || '<p>Hello</p>').replace('</head>', `<style>${code}</style></head>`).replace(/^(?![\s\S]*<\/head>)/, `<style>${code}</style>`);
    const trap = '<script>window.__quillErrs=[];addEventListener("error",function(e){__quillErrs.push({type:"error",text:(e.error&&e.error.name?e.error.name+": ":"")+e.message})});<\/script>';
    return (st.page || '<body></body>').replace('<body>', '<body>' + trap).replace('</body>', `<script>${code.replace(/<\/script/gi, '<\\/script')}<\/script></body>`);
  }

  async function check() {
    if (!S) return;
    const st = step(); if (!st || st.type !== 'code') return;
    const code = app.editor.get(tabId()) ?? '';
    const btn = document.getElementById('lesson-check'); if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div> Checking…'; }
    const fb = document.getElementById('lesson-fb');
    const r = { code, logs: [], errors: [], out: '' };
    app.clearConsole();
    try {
      const run = S.course.run;
      const onEvent = (d) => app.log(d.type === 'warn' ? 'warn' : d.type, d.text, { line: d.line, file: d.line ? tabId() : null, lang: S.course.lang });
      if (run === 'js' || run === 'ts') {
        let js = code;
        if (run === 'ts') js = await app.editor.transpileTS(tabId());
        Object.assign(r, await Q.runner.runJS(js, { onEvent, timeout: 4000 }));
      } else if (run === 'py') {
        if (Q.runner.pyState !== 'ready') app.log('sys', 'Starting Python (first time takes a few seconds)…');
        Object.assign(r, await Q.runner.runPython(code, { onEvent, timeout: 10000, stdin: st.stdin || [] }));
        if (r.unavailable) throw new Error('offline');
      } else if (run === 'web') {
        const frame = document.getElementById('checkframe');
        await new Promise((res) => { frame.onload = res; frame.srcdoc = buildWeb(st, code); setTimeout(res, 1500); });
        await new Promise((res) => setTimeout(res, 60));
        r.doc = frame.contentDocument; r.win = frame.contentWindow;
        if (r.win.__quillErrs) r.errors = r.win.__quillErrs.slice();
        r.css = (sel, prop) => { const e = r.doc.querySelector(sel); return e ? r.win.getComputedStyle(e).getPropertyValue(prop).trim() : null; };
      }
      r.out = r.logs.join('\n');
      if (r.logs.length || r.errors.length) app.showPanel('console');
      let res;
      if (r.errors.length) res = false; else try { res = st.check(r, H); } catch (e) { res = 'Something in your code stopped the check from running: ' + esc(e.message); }
      if (res === true && !r.errors.length) return success(st, fb);
      S.attempts++; S.mistakes++;
      stat('failedChecks');
      fb.innerHTML = '';
      if (r.errors.length) {
        const e = r.errors[0];
        const box = h('div', { class: 'feedback bad', html: `${icon('alert', 16)}<div><b>Your code hit an error${e.line ? ' on line ' + e.line : ''}.</b><br><code>${esc((e.last || e.text).split('\n').pop())}</code></div>` });
        fb.append(box, Q.tutor.errorHtml(e.text, S.course.lang, { line: e.line, file: tabId() }));
      } else {
        const msg = typeof res === 'string' ? res : 'Not quite yet — compare your code with the task and try again.';
        fb.append(h('div', { class: 'feedback bad', html: `${icon('close', 16)}<div><b>${pick(['Almost!', 'Not yet.', 'Close!', 'Keep going.'])}</b> ${msg}</div>` }));
        if (S.attempts >= 2 && st.hints?.length && S.hint === 0) fb.append(h('div', { class: 'feedback hint', html: `${icon('bulb', 16)}<div>Stuck? Click <b>Hint</b> below for a nudge.</div>` }));
      }
    } catch (e) {
      fb.innerHTML = '';
      fb.append(h('div', { class: 'feedback bad', html: `${icon('alert', 16)}<div>${e.message === 'offline' ? 'Python needs an internet connection the first time it loads. Connect and press Check again.' : 'Couldn’t run the check: ' + esc(e.message)}</div>` }));
    } finally {
      const b = document.getElementById('lesson-check'); if (b) { b.disabled = false; b.innerHTML = `${icon('play', 12)} Check <kbd style="background:transparent;border-color:#fff6;color:#fff">Ctrl ⏎</kbd>`; }
    }
  }
  function success(st, fb) {
    S.solved[S.i] = true; persistCode();
    stat('checks');
    if (S.attempts === 0) stat('firstTry');
    if (S.attempts >= 3) badge('comeback');
    fb.innerHTML = '';
    fb.append(h('div', { class: 'feedback good', html: `${icon('check', 16)}<div><b>${pick(['Perfect!', 'You got it!', 'Brilliant!', 'Correct!', 'Great work!', 'Boom! 💥'])}</b> ${st.success || ''}</div>` }));
    const foot = host().querySelector('.lfoot');
    const cb = document.getElementById('lesson-check');
    if (cb) cb.replaceWith(h('button', { class: 'btn good', html: `Continue ${icon('arrowRight', 14)}`, onclick: () => go(S.i + 1) }));
    host().querySelectorAll('.lstep')[S.i]?.classList.add('done');
    void foot;
  }

  function renderDone(body, foot) {
    const { course, lesson } = S;
    const k = key(course.id, lesson.id);
    const first = !state.done[k];
    const xp = lesson.xp || 20;
    if (first) {
      state.done[k] = Date.now();
      const n = Object.keys(state.done).length;
      stat('lessons');
      touchStreak();
      addXP(xp + (S.mistakes === 0 ? 5 : 0), S.mistakes === 0 ? 'flawless bonus' : 'lesson complete');
      badge('first-lesson');
      if (n >= 5) badge('five-lessons'); if (n >= 10) badge('ten-lessons'); if (n >= 25) badge('twentyfive-lessons');
      if (S.mistakes === 0) badge('perfect');
      const hr = new Date().getHours(); if (hr >= 22) badge('night-owl'); if (hr < 7) badge('early-bird');
      if (course.lessons.every((l) => state.done[key(course.id, l.id)])) { badge('course-complete'); setTimeout(() => toast(`You completed the <b>${esc(course.title)}</b> course! 🏆`, 'success', 5000), 800); }
      const langs = new Set(Object.keys(state.done).map((x) => courses.find((c) => c.id === x.split('/')[0])?.lang)); if (langs.size >= 3) badge('polyglot');
      if (langs.size >= 5) badge('polyglot-5'); if (langs.size >= 10) badge('polyglot-10');
      const reviewLangs = new Set(Object.keys(state.done).map((x) => courses.find((c) => c.id === x.split('/')[0])).filter((c) => c && c.run === 'none').map((c) => c.lang)); if (reviewLangs.size >= 3) badge('tourist');
      const fullCourses = courses.filter((c) => c.lessons.every((l) => state.done[key(c.id, l.id)])).length; if (fullCourses >= 2) badge('two-courses');
      if (n >= 50) badge('fifty-lessons'); if (n >= 100) badge('hundred-lessons');
      if ([0, 6].includes(new Date().getDay())) badge('weekend');
      if (hasCode(lesson) && !S.usedHints && !S.usedSolution) badge('no-hints');
      if (course.id === 'game') badge('game-dev');
      if (course.id === 'game' && lesson.id === 'sprites') badge('pixel-artist');
      if (course.id === 'game' && lesson.id === 'sound') badge('sound-designer');
      if (course.id === 'game' && lesson.id === 'final') badge('first-game');
      Q.confetti();
    }
    const idx = course.lessons.indexOf(lesson);
    const nextL = course.lessons[idx + 1];
    body.append(h('div', { class: 'done-card' },
      h('div', { class: 'big', text: S.mistakes === 0 ? '🌟' : '🎉' }),
      h('h3', { text: 'Lesson complete!' }),
      h('p', { text: S.mistakes === 0 ? 'Flawless — not a single mistake.' : `You worked through ${S.mistakes} mistake${S.mistakes === 1 ? '' : 's'} — that’s exactly how learning works.` }),
      first ? h('div', { class: 'xp-gain', html: `${icon('star', 15)} +${xp + (S.mistakes === 0 ? 5 : 0)} XP` }) : h('div', { class: 'xp-gain', html: `${icon('check', 15)} Already completed` }),
      lesson.recap ? h('div', { class: 'tip', style: { textAlign: 'left' }, html: `${icon('book', 16)}<div><b>Recap:</b> ${lesson.recap}</div>` }) : ''));
    foot.append(h('button', { class: 'btn ghost', text: 'Review', onclick: () => go(0) }), h('div', { class: 'grow' }));
    if (nextL) foot.append(h('button', { class: 'btn primary', html: `Next: ${esc(nextL.title)} ${icon('arrowRight', 14)}`, onclick: () => open(course.id, nextL.id) }));
    else foot.append(h('button', { class: 'btn primary', html: `Back to courses ${icon('learn', 14)}`, onclick: () => { close(); app.showView('learn'); } }));
    Q.learn.renderSidebar();
  }

  function renderEmpty(el) {
    const n = nextLesson();
    const d = h('div', { class: 'lesson-empty' });
    d.innerHTML = `<h3>🎓 Learn by doing</h3><p>Pick a course in the <b>Learn</b> panel on the left. Every lesson mixes short explanations, quick quizzes and real coding challenges that check your work instantly.</p>`;
    if (n) d.append(h('button', { class: 'btn primary', html: `Start: ${esc(n.course.title)} — ${esc(n.lesson.title)} ${icon('arrowRight', 14)}`, onclick: () => open(n.course.id, n.lesson.id) }));
    d.append(h('p', { style: { marginTop: '16px' }, html: `<b>Level ${levelInfo().lvl}</b> · ${state.xp} XP · ${Object.keys(state.done).length} lessons done` }));
    el.append(d);
  }

  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- Sidebar ---------- */
  const expanded = new Set(store.get('learnOpen', []));
  const LI = () => Q.langInfo;
  const langName = (id) => Q.langs.byId[id]?.name || id;
  const dots = (n) => `<span class="diff" title="Difficulty ${n} of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  function langStats(id) {
    const cs = courses.filter((c) => c.lang === id);
    const ls = cs.flatMap((c) => c.lessons.map((l) => ({ c, l })));
    return { courses: cs, lessons: ls.length, done: ls.filter(({ c, l }) => state.done[key(c.id, l.id)]).length, mins: ls.reduce((m, { l }) => m + minutes(l), 0) };
  }
  function renderSidebar() {
    const v = document.querySelector('[data-view="learn"]'); if (!v) return;
    const scroll = v.querySelector('.view-body')?.scrollTop || 0;
    v.innerHTML = '';
    const L = levelInfo();
    const body = h('div', { class: 'view-body' });
    v.append(h('div', { class: 'view-head' }, h('span', { text: 'Learn' }), h('div', { class: 'tools' }, h('button', { class: 'icon-btn sm', title: 'Badges & stats', html: icon('trophy', 15), onclick: () => showBadges() }))), body);
    body.append(h('button', { class: 'learn-hero', title: 'Progress & badges', onclick: () => showBadges() },
      h('div', { class: 'lh-top', html: `<span class="lvl">Level ${L.lvl}</span><span class="lt">${titleFor(L.lvl)}</span><span class="lstreak">${icon('flame', 13)}${state.streak.count}</span>` }),
      h('div', { class: 'bar', html: `<i style="width:${L.pct}%"></i>` }),
      h('div', { class: 'stats', html: `<span>${L.into} / ${L.need} XP</span><span>${Object.keys(state.badges).length} of ${BADGES.length} badges</span>` })));
    const lang = state.lang;
    if (!lang) {
      body.append(h('div', { class: 'pick-card' },
        h('div', { class: 'pc-title', text: 'Pick your first language' }),
        h('p', { text: 'Not sure? JavaScript gets a real game on screen fastest. Python is the gentlest start.' }),
        h('div', { class: 'pc-quick' }, ...['javascript', 'python', 'csharp', 'lua'].map((id) => h('button', { class: 'pc-chip', html: `${Q.langs.badge(null, id)}<span>${esc(langName(id))}</span>`, onclick: () => showPicker(id) }))),
        h('button', { class: 'btn primary', style: { width: '100%' }, html: `${icon('learn', 14)} Compare all ${LI().list.length} languages`, onclick: () => showPicker() })));
    } else {
      const info = LI().byId[lang] || {}; const st = langStats(lang); const Lg = Q.langs.byId[lang];
      body.append(h('div', { class: 'path-card', style: { '--c': Lg?.color } },
        h('div', { class: 'pa-top' }, h('div', { class: 'course-ic', text: Lg?.badge || '' }), h('div', { class: 'pa-name' }, h('b', { text: langName(lang) }), h('span', { html: `${dots(info.difficulty || 1)} ${LI().LEVEL[info.difficulty || 1]}` })), h('button', { class: 'btn ghost', text: 'Change', onclick: () => showPicker(lang) })),
        h('div', { class: 'course-bar', style: { '--c': Lg?.color }, html: `<i style="width:${st.lessons ? (st.done / st.lessons) * 100 : 0}%"></i>` }),
        h('div', { class: 'pa-meta', text: `${st.done} of ${st.lessons} lessons · ${dur(st.mins)} total` })));
      const n = nextLesson();
      if (n) body.append(h('div', { style: { padding: '0 8px 10px' } }, h('button', { class: 'btn primary', style: { width: '100%', height: '36px' }, html: `${icon('play', 12)} ${S ? 'Next' : 'Continue'}: ${esc(n.lesson.title)}`, onclick: () => open(n.course.id, n.lesson.id) })));
      st.courses.forEach((c, ci) => body.append(courseBox(c, ci, st.courses)));
      const related = courses.filter((c) => c.lang !== lang && (c.related || []).includes(lang));
      if (related.length) { body.append(h('div', { class: 'section-label', text: 'Pairs well with' })); related.forEach((c) => body.append(courseBox(c, 0, [c]))); }
    }
    body.append(h('div', { class: 'section-label', text: `Badges · ${Object.keys(state.badges).length}/${BADGES.length}` }));
    body.append(h('div', { class: 'badges' }, ...BADGES.map(([id, e, name, desc]) => h('div', { class: 'bdg' + (state.badges[id] ? ' got' : ''), title: `${name} — ${desc}${state.badges[id] ? ' ✓' : ''}`, text: e }))));
    body.scrollTop = scroll;
  }
  function courseBox(c, ci, list) {
    const done = c.lessons.filter((l) => state.done[key(c.id, l.id)]).length;
    const prevDone = ci === 0 || list.slice(0, ci).every((p) => p.lessons.every((l) => state.done[key(p.id, l.id)]));
    const isOpen = expanded.has(c.id) || S?.course.id === c.id || (!expanded.size && ci === 0);
    const box = h('div', { class: 'course' + (isOpen ? ' open' : ''), style: { '--c': c.color } });
    const total = c.lessons.reduce((m, l) => m + minutes(l), 0);
    const head = h('button', { class: 'course-head' }, h('div', { class: 'course-ic', text: c.badge }), h('div', { class: 'course-info' }, h('div', { class: 'course-title', text: c.title }), h('div', { class: 'course-meta', text: `${done}/${c.lessons.length} lessons · ~${total < 90 ? total + ' min' : Math.round(total / 6) / 10 + ' h'}${c.run === 'none' ? ' · reviewed' : ''}` }), h('div', { class: 'course-bar', html: `<i style="width:${(done / c.lessons.length) * 100}%"></i>` })), h('span', { html: icon('chevron', 14), style: { color: 'var(--muted)', transform: isOpen ? 'rotate(90deg)' : '', transition: 'transform .2s' } }));
    head.onclick = () => { isOpen ? expanded.delete(c.id) : expanded.add(c.id); store.set('learnOpen', [...expanded]); renderSidebar(); };
    const ls = h('div', { class: 'lessons' });
    if (c.desc2) ls.append(h('p', { class: 'course-desc', html: c.desc2 }));
    if (!prevDone) ls.append(h('p', { class: 'course-desc', html: `${icon('info', 13)} Best after finishing <b>${esc(list[ci - 1].title)}</b>.` }));
    const firstUndone = c.lessons.findIndex((l) => !state.done[key(c.id, l.id)]);
    c.lessons.forEach((l, j) => {
      const d = !!state.done[key(c.id, l.id)];
      const locked = firstUndone >= 0 && j > firstUndone;
      ls.append(h('button', { class: 'lsn' + (d ? ' done' : '') + (j === firstUndone ? ' current' : '') + (locked ? ' locked' : '') + (S?.lesson === l ? ' active' : ''), onclick: () => open(c.id, l.id) },
        h('span', { class: 'st', html: d ? icon('check', 11) : locked ? icon('lock', 10) : String(j + 1) }), h('span', { class: 'ln', text: l.title }), h('span', { class: 'xpv', text: `${minutes(l)} min` })));
    });
    box.append(head, ls);
    return box;
  }

  /* ---------- Language picker ---------- */
  function showPicker(sel) {
    const info = LI();
    let cur = sel || state.lang || 'javascript';
    const grid = h('div', { class: 'lp-grid' });
    const detail = h('div', { class: 'lp-detail' });
    const draw = () => {
      grid.innerHTML = '';
      info.GROUPS.forEach(([g, label]) => {
        grid.append(h('div', { class: 'lp-group', text: label }));
        const row = h('div', { class: 'lp-row' });
        info.list.filter((x) => x.group === g).forEach((x) => {
          const st = langStats(x.id);
          row.append(h('button', { class: 'lp-tile' + (x.id === cur ? ' on' : '') + (x.id === state.lang ? ' mine' : ''), style: { '--c': Q.langs.byId[x.id]?.color }, onclick: () => { cur = x.id; draw(); }, html: `<span class="course-ic">${esc(Q.langs.byId[x.id]?.badge || '')}</span><span class="lp-name">${esc(langName(x.id))}</span>${dots(x.difficulty)}${st.done ? `<span class="lp-prog">${st.done}/${st.lessons}</span>` : ''}` }));
        });
        grid.append(row);
      });
      const x = info.byId[cur]; const st = langStats(cur); const Lg = Q.langs.byId[cur];
      detail.innerHTML = '';
      detail.style.setProperty('--c', Lg?.color);
      detail.append(
        h('div', { class: 'lpd-head' }, h('div', { class: 'course-ic big', text: Lg?.badge || '' }), h('div', {}, h('h3', { text: langName(cur) }), h('div', { class: 'lpd-diff', html: `${dots(x.difficulty)} <b>${info.LEVEL[x.difficulty]}</b> to learn` }))),
        h('p', { class: 'lpd-tag', text: x.tagline }),
        h('div', { class: 'lpd-cols' },
          h('div', {}, h('div', { class: 'lpd-label good', text: 'Great for' }), h('ul', { html: x.good.map((g) => `<li>${esc(g)}</li>`).join('') })),
          h('div', {}, h('div', { class: 'lpd-label bad', text: 'Watch out for' }), h('ul', { html: x.cons.map((g) => `<li>${esc(g)}</li>`).join('') }))),
        h('div', { class: 'lpd-games', html: `${icon('play', 12)}<span><b>In games:</b> ${esc(x.games)}</span>` }),
        h('div', { class: 'lpd-run', html: x.runs ? `${icon('check', 13)} Your code runs right here in the browser.` : `${icon('info', 13)} Needs its own tools to run, so lessons here check how your code is written.` }),
        h('div', { class: 'lpd-courses', html: st.courses.map((c) => `<div><b>${esc(c.title)}</b><span>${c.lessons.length} lessons</span></div>`).join('') + `<div class="tot"><span>${st.courses.length > 1 ? st.lessons + ' lessons · ' : ''}${dur(st.mins)}</span></div>` }));
      const go = h('button', { class: 'btn primary', style: { width: '100%', height: '38px', marginTop: '6px' }, html: `${state.lang === cur ? 'Keep learning' : 'Start learning'} ${esc(langName(cur))} ${icon('arrowRight', 14)}` });
      go.onclick = () => { state.lang = cur; save(); m.close(); app.showView('learn'); renderSidebar(); const n = nextLesson(); if (n && n.course.lang === cur) open(n.course.id, n.lesson.id); };
      detail.append(go);
    };
    const body = h('div', { class: 'lp' }, grid, detail);
    const m = modal({ title: 'Choose a language', body, wide: true });
    m.el.closest('.modal').classList.add('xwide');
    draw();
  }

  function showBadges() {
    const L = levelInfo();
    const st = state.stats;
    const html = `<div style="display:flex;gap:16px;align-items:center;margin-bottom:14px">
      <div class="xp-ring" style="--p:${L.pct};width:64px;height:64px;font-size:22px"><span>${L.lvl}</span></div>
      <div><div style="font-size:18px;font-weight:700;color:var(--text)">Level ${L.lvl} · ${titleFor(L.lvl)}</div><div>${state.xp} XP total · ${L.need - L.into} XP to level ${L.lvl + 1}</div><div>🔥 ${state.streak.count} day streak</div></div></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;text-align:center">
      ${[['Lessons', Object.keys(state.done).length], ['Checks passed', st.checks || 0], ['Code runs', st.runs || 0], ['Tutor lookups', st.tutorLookups || 0]].map(([a, b]) => `<div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px"><div style="font-size:20px;font-weight:700;color:var(--text)">${b}</div><div style="font-size:11px">${a}</div></div>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">${BADGES.map(([id, e, n, d]) => `<div style="display:flex;gap:10px;align-items:center;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);${state.badges[id] ? '' : 'opacity:.4;filter:grayscale(1)'}"><span style="font-size:24px">${e}</span><div><div style="font-weight:600;color:var(--text);font-size:12.5px">${n}</div><div style="font-size:11px;line-height:1.3">${d}</div></div></div>`).join('')}</div>`;
    modal({ title: 'Progress & badges', body: html, wide: true });
  }

  function allLessons() { return courses.flatMap((c) => c.lessons.map((l) => ({ course: c, lesson: l, done: !!state.done[key(c.id, l.id)] }))); }
  function nextLesson() {
    if (state.current) {
      const c = courses.find((x) => x.id === state.current.course);
      if (c) { const l = c.lessons.find((x) => !state.done[key(c.id, x.id)]); if (l) return { course: c, lesson: l }; }
    }
    const pool = state.lang ? [...courses.filter((c) => c.lang === state.lang), ...courses] : courses;
    for (const c of pool) { const l = c.lessons.find((x) => !state.done[key(c.id, x.id)]); if (l) return { course: c, lesson: l }; }
    return null;
  }

  /* ---------- Check helpers handed to every check(r, H) ---------- */
  const H = {
    printed: (r, s) => r.logs.some((l) => l.trim() === String(s)),
    get: (r, name) => { try { return r.win.eval(name); } catch { return undefined; } },
    printedIncl: (r, s) => r.out.toLowerCase().includes(String(s).toLowerCase()),
    lines: (r) => r.logs.map((l) => l.trim()).filter(Boolean),
    has: (r, re) => re.test(r.code),
    noComments: (code) => code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$|#.*$/gm, ''),
    el: (r, sel) => r.doc && r.doc.querySelector(sel),
    els: (r, sel) => (r.doc ? [...r.doc.querySelectorAll(sel)] : []),
    text: (r, sel) => (r.doc?.querySelector(sel)?.textContent || '').trim(),
    rgb: (hex) => { const n = parseInt(hex.replace('#', ''), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`; },
  };

  Q.learn = {
    courses, H,
    init(a) {
      app = a;
      renderXP();
      bus.on('virtual:run', (id) => { if (S && id === tabId()) { const st = step(); if (st?.type === 'code' && !S.solved[S.i]) check(); else runLessonCode(); } });
      bus.on('virtual:closed', (id) => { if (S && id === tabId()) { persistCode(); } });
      app.editor.onChange((id) => { if (S && id === tabId()) { updatePreview(); persistCodeDebounced(); } });
      render();
    },
    open, close, check, renderSidebar, showBadges, showPicker, minutes, allLessons, nextLesson, badge, stat, addXP,
    get active() { return !!S; },
    get state() { return state; },
  };
  const persistCodeDebounced = debounce(persistCode, 800);

  async function runLessonCode() {
    // free run (no check) — used after a step is solved or on read steps
    const code = app.editor.get(tabId()) || '';
    app.clearConsole(); app.showPanel('console');
    const onEvent = (d) => app.log(d.type === 'warn' ? 'warn' : d.type, d.text, { line: d.line, file: d.line ? tabId() : null, lang: S.course.lang });
    if (S.course.run === 'js') await Q.runner.runJS(code, { onEvent, timeout: 5000 });
    else if (S.course.run === 'ts') await Q.runner.runJS(await app.editor.transpileTS(tabId()), { onEvent, timeout: 5000 });
    else if (S.course.run === 'py') {
      const box = document.getElementById('stdin'), st = step();
      const stdin = box && box.value.trim() ? box.value.split(';').map((x) => x.trim()) : [].concat((st && st.stdin) || []);
      await Q.runner.runPython(code, { onEvent, timeout: 15000, stdin });
    }
    else if (S.course.run === 'web') { updatePreview(); app.log('sys', 'Preview updated.'); }
    else app.log('sys', `${Q.langs.byId[S.course.lang]?.name} can’t run in the browser — press Check to have your code reviewed.`);
  }
})();
