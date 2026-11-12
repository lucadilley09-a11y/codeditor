/* Codeditor — progression: ranks & theme unlocks, daily goal, refresher (spaced repetition) & rusty lessons,
   stats page, home card, and sound effects. */
(() => {
  const { h, esc, icon, toast } = Q;
  const S = () => Q.learn.state;
  const DAY = 864e5;
  const today = () => new Date().toLocaleDateString('en-CA');

  /* ================= ranks ================= */
  const TIERS = [['Iron', '#9aa3ad'], ['Bronze', '#c98a54'], ['Silver', '#c3ccd6'], ['Gold', '#f2c14e'], ['Platinum', '#4fd1c5'], ['Emerald', '#34d399'], ['Diamond', '#7cc4ff'], ['Master', '#c084fc']];
  const list = [];
  TIERS.forEach(([t, color]) => ['III', 'II', 'I'].forEach((n) => list.push({ name: `${t} ${n}`, tier: t, div: n, color })));
  [['Grandmaster', '#f87171'], ['Challenger', '#fbbf24'], ['Legend', '#f472b6'], ['Mythic', '#a78bfa']].forEach(([t, color]) => list.push({ name: t, tier: t, div: '', color }));
  const idxFor = (lvl) => Math.min(list.length - 1, lvl - 1); // one rank per level
  const index = () => idxFor(Q.learn.levelInfo().lvl);
  const of = (xp) => list[idxFor(Q.learn.levelInfo(xp).lvl)];
  const badgeHtml = (r, size = 18) => `<span class="rank-badge" style="--rc:${r.color};--rs:${size}px" title="${esc(r.name)}"><i>${r.div || r.tier[0]}</i></span>`;
  Q.ranks = { list, index, of, badgeHtml, current: () => list[index()] };

  /* ================= daily goal ================= */
  const GOALS = { casual: ['Casual', 20], regular: ['Regular', 50], serious: ['Serious', 100], intense: ['Intense', 200] };
  const goal = () => GOALS[S().goal || 'regular'];
  const todayXP = () => S().days?.[today()]?.xp || 0;

  /* XP hook (called by learn.addXP) */
  function onXP(n, beforeLvl) {
    const s = S();
    const afterLvl = Q.learn.levelInfo().lvl;
    if (idxFor(afterLvl) > idxFor(beforeLvl)) {
      const r = list[idxFor(afterLvl)];
      const themes = Q.themes.list.filter((t) => t.rank && t.rank > idxFor(beforeLvl) && t.rank <= idxFor(afterLvl));
      setTimeout(() => { play('rank'); toast(`${badgeHtml(r, 16)} Rank up! You’re now <b>${esc(r.name)}</b>${themes.length ? ` · unlocked theme <b>${themes.map((t) => esc(t.name)).join(', ')}</b>` : ''}`, 'success', 5000); Q.confetti(140); }, 700);
    }
    const g = goal()[1], t = todayXP();
    if (t >= g && t - n < g) {
      s.goalDays = s.goalDays || {}; s.goalDays[today()] = 1; Q.learn.save();
      setTimeout(() => toast(`${icon('target', 14)} Daily goal reached — ${t} / ${g} XP`, 'success', 3500), 1200);
      const last7 = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - i * DAY).toLocaleDateString('en-CA'));
      if (last7.every((d) => s.goalDays[d])) Q.learn.badge('goal-7');
    }
    renderHomeCard();
  }

  /* ================= spaced repetition & rusty lessons ================= */
  const GAPS = [1, 3, 7, 14, 30];
  const rev = (k) => (S().review = S().review || {})[k];
  const dueAt = (k) => { const r = rev(k); if (r) return r.due; const d = S().done[k]; return d ? d + GAPS[0] * DAY : Infinity; };
  const isRusty = (c, l) => { const k = `${c}/${l}`; return !!S().done[k] && Date.now() > dueAt(k); };
  function graded(k, ok) {
    const s = S(); s.review = s.review || {};
    const r = s.review[k] || { box: 0 };
    const wasRusty = Date.now() > dueAt(k);
    if (ok) { r.box = Math.min(GAPS.length - 1, (s.review[k] ? r.box + 1 : 1)); r.due = Date.now() + GAPS[r.box] * DAY; if (wasRusty) { s.rustyFixed = (s.rustyFixed || 0) + 1; if (s.rustyFixed >= 20) Q.learn.badge('rusty-fix'); } }
    else { r.box = 0; r.due = Date.now(); }
    s.review[k] = r; Q.learn.save();
  }
  // a quick question about a finished lesson: its own quiz/predict steps, or a generated one
  function questionFor(c, l, seed) {
    const own = (l.base || (l.regen ? [] : l.steps)).filter((s) => s.type === 'quiz' || s.type === 'predict');
    const p = Q.gen?.packs[c.id];
    const tpls = p ? p.templates.filter((t) => (t.kind === 'predict' || t.kind === 'quiz') && t.ai != null && t.ai <= (l.ai ?? c.lessons.filter((x) => x.hand).indexOf(l))) : [];
    const g = Q.gen.G(seed);
    if (tpls.length && (!own.length || g.chance(0.6))) { const near = tpls.filter((t) => t.ai >= (l.ai ?? 0) - 1); return Q.gen.make(c.id, g.pick(near.length ? near : tpls), seed, false); }
    return own.length ? g.pick(own) : null;
  }
  function pickQuestions(n) {
    const cands = [];
    for (const c of Q.learn.courses) for (const l of c.lessons) { if (l.optional || l.kind === 'test' || !S().done[`${c.id}/${l.id}`]) continue; cands.push({ c, l, k: `${c.id}/${l.id}`, due: dueAt(`${c.id}/${l.id}`) }); }
    cands.sort((a, b) => a.due - b.due); // most overdue first
    const out = []; let seed = Q.gen.freshSeed();
    for (const x of cands) { if (out.length >= n) break; const q = questionFor(x.c, x.l, seed++); if (q) out.push({ ...x, q }); }
    return out;
  }
  const rustyCount = () => { let n = 0; for (const c of Q.learn.courses) for (const l of c.lessons) if (!l.optional && isRusty(c.id, l.id)) n++; return n; };

  function refresher({ hoursAway = 2, manual = false } = {}) {
    const n = manual ? 5 : Math.max(3, Math.min(8, 3 + Math.floor(Math.log2(Math.max(1, hoursAway / 2)))));
    const qs = pickQuestions(n);
    if (!qs.length) { if (manual) toast('Finish a lesson first — then the refresher has something to review.', 'info', 2600); return; }
    let i = 0, right = 0;
    const back = h('div', { class: 'modal-back' });
    const box = h('div', { class: 'modal refresher' });
    back.append(box); document.body.append(back); requestAnimationFrame(() => back.classList.add('in'));
    const close = () => { back.classList.remove('in'); setTimeout(() => back.remove(), 160); S().refreshedAt = Date.now(); Q.learn.save(); renderHomeCard(); Q.learn.renderSidebar(); };
    back.onclick = (e) => { if (e.target === back) close(); };
    function show() {
      box.innerHTML = '';
      if (i >= qs.length) {
        const xp = right * 3;
        if (xp) Q.learn.addXP(xp, 'refresher');
        box.append(h('div', { class: 'rf-done' }, h('div', { class: 'big', text: right === qs.length ? '🧠' : '💪' }), h('h3', { text: 'Refreshed!' }), h('p', { text: `${right} of ${qs.length} right. ${right < qs.length ? 'The ones you missed will come back soon.' : 'Your memory is in great shape.'}` })), h('div', { class: 'rf-foot' }, h('div', { class: 'grow' }), h('button', { class: 'btn primary', text: 'Back to it', onclick: close })));
        return;
      }
      const { c, l, k, q } = qs[i];
      const head = h('div', { class: 'rf-head' }, h('span', { class: 'rf-k', html: `${icon('refresh', 13)} Quick refresher` }), h('span', { class: 'rf-dots', html: qs.map((_, j) => `<i class="${j < i ? 'd' : j === i ? 'on' : ''}"></i>`).join('') }), h('button', { class: 'icon-btn', title: 'Skip refresher', html: icon('close', 14), onclick: close }));
      const from = h('div', { class: 'rf-from', html: `<span class="fbadge" style="--c:${c.color}">${esc(c.badge)}</span> ${esc(l.title)}${isRusty(c.id, l.id) ? ' <span class="rf-rust">rusty</span>' : ''}` });
      const body = h('div', { class: 'rf-body' }, h('h4', { html: q.type === 'predict' ? (q.q || 'What will this print?') : q.q }));
      if (q.code) body.append(h('pre', { text: q.code }));
      const fb = h('div');
      const next = h('button', { class: 'btn primary', text: i === qs.length - 1 ? 'Finish' : 'Next', disabled: true, onclick: () => { i++; show(); } });
      let answered = false;
      const opts = h('div', { class: 'qopts' }, ...q.options.map((o, j) => { const b = h('button', { class: 'qopt' + (q.type === 'predict' || q.mono ? '' : ' txt'), html: `<span class="k">${'ABCDEF'[j]}</span><span>${esc(o)}</span>` }); b.onclick = () => { if (answered) return; answered = true; const ok = j === q.answer; b.classList.add(ok ? 'right' : 'wrong'); if (!ok) opts.children[q.answer].classList.add('right'); if (ok) right++; graded(k, ok); if (q.tpl) Q.gen.record(c.id, q.tpl, ok); play(ok ? 'right' : 'wrong'); fb.innerHTML = ''; fb.append(h('div', { class: 'feedback ' + (ok ? 'good' : 'bad'), html: `${icon(ok ? 'check' : 'close', 16)}<div><b>${ok ? 'Right!' : 'Not quite.'}</b> ${q.explain || ''}</div>` })); next.disabled = false; }; return b; }));
      body.append(opts, fb);
      box.append(head, from, body, h('div', { class: 'rf-foot' }, h('div', { class: 'grow' }), next));
    }
    show();
  }

  /* ---------- show the refresher after 2+ hours away ---------- */
  function seen() { S().lastSeen = Date.now(); Q.learn.save(); }
  function boot() {
    const last = S().lastSeen;
    seen();
    setInterval(() => { if (!document.hidden) seen(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) seen(); else maybe(); });
    addEventListener('beforeunload', seen);
    const maybe = (since = S().lastSeen) => { const hrs = (Date.now() - since) / 36e5; if (hrs >= 2 && Object.keys(S().done).length) setTimeout(() => refresher({ hoursAway: hrs }), 900); };
    if (last) maybe(last);
    renderHomeCard();
  }

  /* ================= stats page ================= */
  const skillOf = (k) => { const [cid, tid] = k.split('/'); const t = Q.gen?.packs[cid]?.templates.find((x) => x.id === tid); return t ? `${Q.learn.courses.find((c) => c.id === cid)?.badge || cid} · ${t.skill}` : null; };
  function showStats() {
    const s = S();
    const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * DAY); const k = d.toLocaleDateString('en-CA'); return { k, d, xp: s.days?.[k]?.xp || 0 }; });
    const maxXp = Math.max(goal()[1], ...days.map((d) => d.xp));
    const bars = `<svg class="st-bars" viewBox="0 0 300 90" preserveAspectRatio="none">${days.map((d, i) => `<rect x="${i * 10 + 1}" y="${86 - (d.xp / maxXp) * 80}" width="8" height="${Math.max(1, (d.xp / maxXp) * 80)}" rx="2" class="${d.xp >= goal()[1] ? 'hit' : ''}"><title>${d.k}: ${d.xp} XP</title></rect>`).join('')}<line x1="0" x2="300" y1="${86 - (goal()[1] / maxXp) * 80}" y2="${86 - (goal()[1] / maxXp) * 80}" class="goal"/></svg>`;
    const agg = {};
    Object.entries(s.skill || {}).forEach(([k, v]) => { const n = skillOf(k); if (!n) return; const a = (agg[n] = agg[n] || { ok: 0, bad: 0 }); a.ok += v.ok; a.bad += v.bad; });
    const skills = Object.entries(agg).filter(([, v]) => v.ok + v.bad >= 2).map(([n, v]) => ({ n, pct: Math.round((v.ok / (v.ok + v.bad)) * 100), total: v.ok + v.bad })).sort((a, b) => b.pct - a.pct);
    const strong = skills.filter((x) => x.pct >= 80).slice(0, 5), weak = skills.filter((x) => x.pct < 80).reverse().slice(0, 5);
    const skillRow = (x) => `<div class="st-row"><span class="st-n">${esc(x.n)}</span><span class="st-meter"><i style="width:${x.pct}%" class="${x.pct >= 80 ? 'g' : x.pct >= 50 ? 'm' : 'b'}"></i></span><span class="st-v">${x.pct}%</span></div>`;
    const tl = Object.entries(s.timeLang || {}).sort((a, b) => b[1] - a[1]); const tmax = Math.max(1, ...tl.map(([, v]) => v));
    const fmtT = (sec) => (sec < 3600 ? `${Math.round(sec / 60)} min` : `${(sec / 3600).toFixed(1)} h`);
    const weeks = 18; const start = new Date(Date.now() - (weeks * 7 - 1) * DAY); start.setDate(start.getDate() - start.getDay());
    const cells = Array.from({ length: weeks * 7 }, (_, i) => { const d = new Date(start.getTime() + i * DAY); const k = d.toLocaleDateString('en-CA'); const xp = s.days?.[k]?.xp || 0; const lv = d > new Date() ? -1 : xp === 0 ? 0 : xp < goal()[1] / 2 ? 1 : xp < goal()[1] ? 2 : xp < goal()[1] * 2 ? 3 : 4; return `<i class="l${lv}" title="${k}: ${xp} XP"></i>`; }).join('');
    const r = Q.ranks.current(); const L = Q.learn.levelInfo();
    const goalSel = Object.entries(GOALS).map(([id, [nm, xp]]) => `<button class="gl${(s.goal || 'regular') === id ? ' on' : ''}" data-g="${id}"><b>${nm}</b><span>${xp} XP</span></button>`).join('');
    const m = Q.modal({ title: 'Your stats', wide: true, cls: 'stats-modal', body: `
      <div class="st-top">${badgeHtml(r, 30)}<div><div class="st-rank">${esc(r.name)}</div><div class="muted small">Level ${L.lvl} · ${s.xp} XP · ${L.need - L.into} XP to ${esc(list[Math.min(list.length - 1, index() + 1)].name)}</div></div><div class="st-streak">${icon('flame', 15)} ${s.streak.count} day streak</div></div>
      <div class="st-sec"><h5>Daily goal</h5><div class="st-goals">${goalSel}</div></div>
      <div class="st-sec"><h5>XP per day · last 30 days</h5>${bars}</div>
      <div class="st-grid2"><div class="st-sec"><h5>Strongest skills</h5>${strong.map(skillRow).join('') || '<p class="muted small">Get 80%+ on a skill to see it here.</p>'}</div>
      <div class="st-sec"><h5>Needs practice</h5>${weak.map(skillRow).join('') || `<p class="muted small">${skills.length ? 'Nothing below 80% — nice!' : 'Do some practice levels to see this.'}</p>`}</div></div>
      <div class="st-grid2"><div class="st-sec"><h5>Time per language</h5>${tl.map(([lang, sec]) => `<div class="st-row"><span class="st-n">${esc(Q.langs.byId[lang]?.name || lang)}</span><span class="st-meter"><i style="width:${(sec / tmax) * 100}%;background:${Q.langs.byId[lang]?.color || 'var(--accent)'}"></i></span><span class="st-v">${fmtT(sec)}</span></div>`).join('') || '<p class="muted small">Nothing yet.</p>'}</div>
      <div class="st-sec"><h5>Streak calendar</h5><div class="st-cal">${cells}</div></div></div>`, buttons: [{ label: 'Close', primary: true }] });
    setTimeout(() => document.querySelectorAll('.stats-modal .gl').forEach((b) => (b.onclick = () => { S().goal = b.dataset.g; Q.learn.save(); document.querySelectorAll('.stats-modal .gl').forEach((x) => x.classList.toggle('on', x === b)); renderHomeCard(); })), 0);
    return m;
  }

  /* ================= home card ================= */
  function homeCard() {
    const s = S(); const r = Q.ranks.current(); const [gn, gx] = goal(); const t = todayXP(); const rusty = rustyCount();
    const el = h('div', { class: 'home-card' },
      h('button', { class: 'hc-item', title: 'Your stats', onclick: showStats, html: `${badgeHtml(r, 22)}<span><b>${esc(r.name)}</b><small>${s.xp} XP</small></span>` }),
      h('div', { class: 'hc-item', title: 'Day streak', html: `<span class="hc-flame">${icon('flame', 16)}</span><span><b>${s.streak.count}</b><small>day streak</small></span>` }),
      h('button', { class: 'hc-item', title: `Daily goal: ${gn}`, onclick: showStats, html: `<span class="hc-ring" style="--p:${Math.min(100, Math.round((t / gx) * 100))}"></span><span><b>${t}/${gx}</b><small>XP today</small></span>` }),
      h('button', { class: 'hc-item', title: 'Review what you’ve learned', onclick: () => refresher({ manual: true }), html: `<span class="hc-ref${rusty ? ' rusty' : ''}">${icon('refresh', 15)}</span><span><b>${rusty ? `${rusty} rusty` : 'All fresh'}</b><small>Refresher</small></span>` }));
    return el;
  }
  function renderHomeCard() { const old = document.querySelector('#welcome .home-card'); if (old) old.replaceWith(homeCard()); }

  /* ================= sounds ================= */
  let ac = null;
  const PACKS = {
    retro: { right: [['square', 660, 0.06], ['square', 990, 0.09]], wrong: [['sawtooth', 220, 0.08], ['sawtooth', 160, 0.12]], levelup: [['square', 523, 0.07], ['square', 659, 0.07], ['square', 784, 0.07], ['square', 1047, 0.14]], rank: [['square', 392, 0.08], ['square', 523, 0.08], ['square', 659, 0.08], ['square', 784, 0.08], ['square', 1047, 0.2]] },
    soft: { right: [['sine', 880, 0.12]], wrong: [['sine', 260, 0.16]], levelup: [['sine', 660, 0.1], ['sine', 880, 0.1], ['sine', 1100, 0.18]], rank: [['triangle', 523, 0.1], ['triangle', 784, 0.1], ['triangle', 1047, 0.25]] },
  };
  function play(name) {
    const st = Q.app?.settings; if (!st || st.sound === false) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      let t = ac.currentTime;
      const vol = (st.soundPack || 'retro') === 'retro' ? 0.045 : 0.08;
      for (const [type, f, d] of (PACKS[st.soundPack || 'retro'] || PACKS.retro)[name] || []) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.85;
      }
    } catch { /* audio not available */ }
  }
  Q.sound = { play };

  Q.refresher = { show: refresher, isRusty, rustyCount, graded };
  Q.progress = { onXP, homeCard, renderHomeCard, showStats, boot, goal, todayXP };
})();
