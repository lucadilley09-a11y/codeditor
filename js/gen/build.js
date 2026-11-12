/* Codeditor — course builder. Runs once after every course and generator pack has loaded:
   1. pads each hand-written lesson to 8–12 levels (warm-up first, generated practice after)
   2. inserts required practice lessons so the course reaches its target size
   3. groups lessons into units of ~10 with an optional test-out first and a required unit test last
   4. adds optional timed challenges every ~8 lessons and right after each unit project */
(() => {
  const { G, hash, levels, packs } = Q.gen;
  const TARGET = { js: 80, py: 80, cs: 80, lua: 80, cpp: 80, game: 40, dom: 24 };
  const VARIANTS = [['Practice', null], ['Drill', 'write'], ['Bug hunt', 'fix'], ['Predict it', 'predict'], ['Fill the gaps', 'fill'], ['Mixed review', null], ['Remix', null]];
  const short = (t) => t.replace(/^(Project|Unit project|Capstone|Final project):\s*/i, '');
  const skillsOf = (tpls) => [...new Set(tpls.map((t) => t.skill))];
  const UNIT = 9;

  // levels are generated the first time anything reads lesson.steps, not all at startup
  function lazySteps(L, seed) {
    Object.defineProperty(L, 'steps', { configurable: true, enumerable: true,
      get() { const v = L.regen(seed); Object.defineProperty(L, 'steps', { value: v, writable: true, configurable: true, enumerable: true }); return v; },
      set(v) { Object.defineProperty(L, 'steps', { value: v, writable: true, configurable: true, enumerable: true }); } });
  }
  function buildCourse(c) {
    const p = packs[c.id]; if (!p || c.built) return;
    c.built = true;
    const hand = c.lessons.slice();
    const index = new Map(hand.map((l, i) => [l.id, i]));
    p.templates.forEach((t) => { if (index.has(t.after)) t.ai = index.get(t.after); else { console.warn(`generator ${c.id}/${t.id}: unknown lesson "${t.after}"`); t.ai = 0; } });
    const avail = (i) => p.templates.filter((t) => t.ai <= i);
    const at = (i) => p.templates.filter((t) => t.ai === i);
    const recent = (i) => p.templates.filter((t) => t.ai === i || t.ai === i - 1);
    const between = (a, b) => p.templates.filter((t) => t.ai >= a && t.ai <= b);

    /* 1. pad hand-written lessons */
    hand.forEach((L, i) => {
      const base = L.steps.slice();
      L.base = base; L.hand = true;
      const prevQuiz = i > 0 ? (hand[i - 1].base || []).filter((s) => s.type === 'quiz' || s.type === 'predict') : [];
      L.regen = (seed) => {
        const g = G(seed);
        const steps = [];
        if (i > 0) {
          // warm-up: one quick question about the previous lesson
          const quick = at(i - 1).filter((t) => t.kind === 'predict' || t.kind === 'quiz');
          let w = quick.length ? levels(c.id, quick, 1, seed ^ 0x51ed)[0] : null;
          if (!w && prevQuiz.length) w = { ...g.pick(prevQuiz) };
          if (w) { w.tag = 'Warm-up · ' + (w.tag ? w.tag.split(' · ')[0] : short(hand[i - 1].title)); w.warmup = true; steps.push(w); }
        }
        steps.push(...base);
        const target = g.int(8, 10);
        const pool = at(i).length ? at(i) : recent(i).length ? recent(i) : avail(i);
        if (steps.length < target && pool.length) {
          const extra = levels(c.id, avail(i), target - steps.length, seed, { focus: pool, focusShare: 0.75 });
          const last = steps[steps.length - 1];
          if (last && last.creative) steps.splice(steps.length - 1, 0, ...extra); else steps.push(...extra);
        }
        return steps;
      };
      lazySteps(L, hash(c.id + '/' + L.id));
    });

    /* 2. practice lessons */
    const positions = hand.map((_, i) => i).filter((i) => avail(i).length >= 3);
    const need = Math.max(0, (TARGET[c.id] || 0) - hand.length - Math.floor((TARGET[c.id] || 0) / 12) + 1);
    const extra = hand.map(() => 0);
    for (let k = 0; k < need && positions.length; k++) extra[positions[Math.floor((k * positions.length) / need)]]++;
    const seq = [];
    hand.forEach((L, i) => {
      seq.push(L);
      for (let j = 0; j < extra[i]; j++) {
        const [vname, bias] = VARIANTS[(i * 3 + j) % VARIANTS.length];
        const P = { id: `${L.id}~p${j + 1}`, title: `${vname}: ${short(L.title)}`, xp: 15, gen: 'practice', ai: i,
          recap: 'Generated practice — the levels are new every time you open this lesson.',
          regen: (seed) => {
            const g = G(seed); const n = g.int(8, 12);
            const sk = skillsOf(recent(i)).slice(0, 4);
            const intro = { type: 'read', html: `<h4>${vname}</h4><p>${n - 1} levels, generated just for you — they change every time you open this lesson. Levels you miss come back at the end for another try.</p>${sk.length ? `<p class="muted">Focus: ${sk.map(Q.gen.esc).join(' · ')}</p>` : ''}` };
            return [intro, ...levels(c.id, avail(i), n - 1, seed, { focus: recent(i), bias })];
          } };
        lazySteps(P, hash(c.id + '/' + P.id));
        seq.push(P);
      }
    });

    /* 3. units */
    const units = []; let cur = [];
    seq.forEach((L, k) => {
      cur.push(L);
      const nextIsEnd = k === seq.length - 1;
      const isProj = L.kind === 'project' && cur.length >= UNIT - 3;
      if (cur.length >= UNIT + 2 || (cur.length >= UNIT && !(seq[k + 1]?.kind === 'project')) || isProj || nextIsEnd) { units.push(cur); cur = []; }
    });
    if (cur.length) units.push(cur);
    // fold a tiny last unit into the previous one
    if (units.length > 1 && units[units.length - 1].length < 4) { const last = units.pop(); units[units.length - 1].push(...last); }

    const out = []; c.units = [];
    units.forEach((ls, u) => {
      const n = u + 1;
      const hs = ls.filter((l) => l.hand);
      const lo = hs.length ? index.get(hs[0].id) : ls[0].ai ?? 0;
      const hi = hs.length ? index.get(hs[hs.length - 1].id) : ls[ls.length - 1].ai ?? lo;
      const tpls = between(lo, hi);
      const title = `Unit ${n}: ${short((hs[0] || ls[0]).title)}`;
      const unit = { n, title, lessons: [] };
      const add = (l) => { l.unit = n; unit.lessons.push(l); out.push(l); };
      if (tpls.length >= 3) {
        const T = { id: `unit${n}-out`, title: `Test out of Unit ${n}`, kind: 'testout', optional: true, xp: 10, ai: hi,
          recap: 'Pass with 80% to mark the whole unit as done.',
          regen: (seed) => [{ type: 'read', html: `<h4>Already know this?</h4><p>Score <b>80%</b> on these ${10} levels and every lesson in <b>${Q.gen.esc(title)}</b> is marked as done. Fail and nothing changes — you just do the lessons.</p><p class="muted">Skills: ${skillsOf(tpls).map(Q.gen.esc).join(' · ')}</p>` }, ...levels(c.id, tpls, 10, seed, { focusShare: 0 })] };
        lazySteps(T, hash(c.id + T.id)); add(T);
      }
      let sinceChallenge = 0;
      ls.forEach((l) => {
        add(l); sinceChallenge++;
        const anchor = l.ai ?? index.get(l.id);
        const closer = l.kind === 'project';
        if ((closer || sinceChallenge >= 8) && avail(anchor).length >= 3) {
          sinceChallenge = 0;
          const C = { id: `ch-${l.id}`, title: `Challenge: ${short(hand[anchor].title)}`, kind: 'challenge', optional: true, xp: 50, ai: anchor,
            recap: 'Challenges are optional. Beat the timer for stars and bonus XP.',
            regen: (seed) => { const g = G(seed); return levels(c.id, avail(anchor).filter((t) => t.kind !== 'predict' && t.kind !== 'quiz'), g.int(3, 5), seed, { focus: recent(anchor), hard: true }); } };
          lazySteps(C, hash(c.id + C.id)); add(C);
        }
      });
      if (tpls.length >= 3) {
        const T = { id: `unit${n}-test`, title: `Unit ${n} test`, kind: 'test', xp: 40, ai: hi,
          recap: 'Unit tests mix everything from the unit. 80% passes.',
          regen: (seed) => [{ type: 'read', html: `<h4>Unit ${n} test</h4><p>10 levels mixing everything from this unit. You need <b>80%</b> to pass. If you don’t make it, you’ll see what you missed, practise it, and try again with new levels.</p>` }, ...levels(c.id, tpls, 10, seed, { focusShare: 0 })] };
        lazySteps(T, hash(c.id + T.id)); add(T);
      }
      c.units.push(unit);
    });
    c.lessons = out;
  }

  // existing end-of-course projects are unit projects
  const KINDS = { py: { rpg: 'project' }, game: { final: 'project' }, dom: { clicker: 'project' } };
  Q.gen.build = () => (Q.courses || []).forEach((c) => { Object.entries(KINDS[c.id] || {}).forEach(([id, k]) => { const l = c.lessons.find((x) => x.id === id); if (l && !l.kind) l.kind = k; }); buildCourse(c); });
  Q.gen.TARGET = TARGET;
  Q.gen.build(); // build.js loads after every course file and generator pack
})();
