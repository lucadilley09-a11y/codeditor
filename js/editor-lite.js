/* Codeditor — built-in editor ("Codeditor editor").
   A textarea for input, a highlighted <pre> underneath, and a decoration layer for the current line,
   find matches, bracket pairs, error squiggles and inline messages. Adds autocomplete, find & replace,
   hover tips and a formatter, so it works fully where the Monaco engine can't load. */
(() => {
  const { h, esc, bus } = Q;
  const PT = 12, PL = 6; // must match .fb-ta padding (top / left)

  Q.makeLite = function makeLite(host, settings, { highlighter, render }) {
    host.innerHTML = '';
    const wrap = h('div', { class: 'fb-wrap' });
    const gutter = h('div', { class: 'fb-gutter' });
    const area = h('div', { class: 'fb-area' });
    const deco = h('div', { class: 'fb-layer', 'aria-hidden': 'true' });
    const pre = h('pre', { class: 'fb-hl', 'aria-hidden': 'true' });
    const over = h('div', { class: 'fb-layer', 'aria-hidden': 'true' });
    const ta = h('textarea', { class: 'fb-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', wrap: 'off', 'aria-label': 'Code editor' });
    const gin = h('div', { class: 'fb-gin' }); gutter.append(gin);
    area.append(deco, pre, over, ta); wrap.append(gutter, area); host.append(wrap);

    const docs = new Map(); // id -> {value, lang, sel, scroll, decos:{key:[...]}, markers:[]}
    let activeId = null, opts = { ...settings }, hl = highlighter('plaintext');
    const changeFns = [], cursorFns = [], keyFns = [], typeFns = [], markerFns = [];
    let cw = 8.4, lh = 22.4;

    /* ---------------- measuring ---------------- */
    const ctx2d = document.createElement('canvas').getContext('2d');
    function measure() {
      const cs = getComputedStyle(ta);
      ctx2d.font = `${cs.fontSize} ${cs.fontFamily}`;
      cw = ctx2d.measureText('MMMMMMMMMM').width / 10 || 8.4;
      lh = parseFloat(cs.lineHeight) || opts.fontSize * 1.6;
      wrap.style.setProperty('--cw', cw + 'px');
    }
    if (document.fonts) document.fonts.ready.then(() => { measure(); paintDeco(); });
    const tabW = () => opts.tabSize || 2;
    const vcol = (lineText, col) => { let v = 0; for (let i = 0; i < col && i < lineText.length; i++) v = lineText[i] === '\t' ? v + tabW() - (v % tabW()) : v + 1; return v; };

    /* ---------------- helpers ---------------- */
    const doc = () => docs.get(activeId);
    const lines = () => ta.value.split('\n');
    function posToLC(pos) { const before = ta.value.slice(0, pos); const line = before.split('\n').length; const ls = before.lastIndexOf('\n') + 1; return { line, col: pos - ls + 1 }; }
    function lcToPos(line, col) { const ls = lines(); let p = 0; for (let i = 0; i < Math.min(line - 1, ls.length); i++) p += ls[i].length + 1; return p + Math.min(col - 1, (ls[line - 1] || '').length); }
    const ins = (text) => { ta.focus(); if (!document.execCommand('insertText', false, text)) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } };

    /* ---------------- painting ---------------- */
    let paintQueued = false;
    function paint() {
      const v = ta.value;
      pre.innerHTML = render(hl(v)) + '\n';
      const n = v.split('\n').length;
      if (gin.childElementCount !== n) gin.innerHTML = Array.from({ length: n }, (_, i) => `<div>${i + 1}</div>`).join('');
      paintGutter(); syncScroll(); queueDeco();
    }
    function paintGutter() {
      const d = doc(); if (!d) return;
      const kids = gin.children; const cur = posToLC(ta.selectionStart).line;
      const err = new Set(), warn = new Set(), bm = new Set();
      (d.markers || []).forEach((m) => (m.severity === 'warning' ? warn : err).add(m.line));
      (d.decos.bm || []).forEach((x) => bm.add(x.line));
      for (let i = 0; i < kids.length; i++) { const L = i + 1; kids[i].className = (L === cur ? 'cur ' : '') + (err.has(L) ? 'err ' : warn.has(L) ? 'warn ' : '') + (bm.has(L) ? 'bm' : ''); }
    }
    function syncScroll() {
      const t = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
      pre.style.transform = t; deco.style.transform = t; over.style.transform = t;
      gin.style.transform = `translateY(${-ta.scrollTop}px)`;
      hideHover();
    }
    function queueDeco() { if (paintQueued) return; paintQueued = true; requestAnimationFrame(() => { paintQueued = false; paintDeco(); }); }
    const box = (cls, line, c1, c2, extra = '') => `<div class="fb-mark ${cls}" style="top:${PT + (line - 1) * lh}px;left:${PL + c1 * cw}px;width:${Math.max(2, (c2 - c1) * cw)}px${extra}"></div>`;
    function paintDeco() {
      const d = doc(); if (!d) { deco.innerHTML = over.innerHTML = ''; return; }
      const ls = lines(); let out = '', top = '';
      const cur = posToLC(ta.selectionStart).line;
      const lineBg = (cls, line) => `<div class="fb-deco ${cls}" style="top:${PT + (line - 1) * lh}px"></div>`;
      if (ta.selectionStart === ta.selectionEnd) out += lineBg('cur', cur);
      (d.markers || []).forEach((m) => { if (m.line <= ls.length) out += lineBg('err', m.line); });
      (d.decos.bm || []).forEach((x) => { if (x.line <= ls.length) out += lineBg('bm', x.line); });
      // inline decorations from extensions (TODO highlight, etc.)
      Object.entries(d.decos).forEach(([key, list]) => {
        if (key === 'bm') return;
        list.forEach((x) => {
          const t = ls[x.line - 1]; if (t == null) return;
          if (x.after && x.start) { out += `<div class="fb-mark ${x.className}" style="top:${PT + (x.line - 1) * lh}px;left:${PL + vcol(t, x.start - 1) * cw}px;width:${Math.max(6, 1.2 * cw)}px"></div>`; return; }
          if (x.className === 'blank-fill') { out += box('blank-fill', x.line, vcol(t, (x.start || 1) - 1), vcol(t, (x.end || t.length + 1) - 1)); return; }
          if (x.after) { top += `<div class="fb-after ${x.className.replace('errlens-', '')}" style="top:${PT + (x.line - 1) * lh}px;left:${PL + vcol(t, t.length) * cw}px">${esc(x.after)}</div>`; return; }
          if (x.className && /todo|fixme|note/.test(x.className)) out += box('todo', x.line, vcol(t, (x.start || 1) - 1), vcol(t, (x.end || t.length + 1) - 1));
        });
      });
      // error squiggles
      (d.markers || []).forEach((m) => { const t = ls[m.line - 1]; if (t == null) return; const s = t.search(/\S/); if (s < 0) return; top += `<div class="fb-squiggle" style="top:${PT + m.line * lh - 3}px;left:${PL + vcol(t, s) * cw}px;width:${(vcol(t, t.length) - vcol(t, s)) * cw}px"></div>`; });
      // find matches
      if (find.open && find.matches.length) {
        const first = Math.max(0, Math.floor(ta.scrollTop / lh) - 5), last = first + Math.ceil(ta.clientHeight / lh) + 10;
        find.matches.forEach((mm, i) => { const a = posToLC(mm[0]); if (a.line < first || a.line > last) return; const t = ls[a.line - 1]; const b = posToLC(mm[1]); out += box('find' + (i === find.i ? ' now' : ''), a.line, vcol(t, a.col - 1), b.line === a.line ? vcol(t, b.col - 1) : vcol(t, t.length)); });
      }
      // bracket pair
      const bp = bracketPair(); if (bp) bp.forEach((p) => { const a = posToLC(p); const t = ls[a.line - 1]; out += box('bracket', a.line, vcol(t, a.col - 1), vcol(t, a.col)); });
      // occurrences of a selected word
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      if (/^[\w$]{2,}$/.test(sel) && !find.open) {
        const re = new RegExp(`(?<![\\w$])${sel.replace(/\$/g, '\\$')}(?![\\w$])`, 'g'); let m, n = 0;
        while ((m = re.exec(ta.value)) && n++ < 300) { if (m.index === ta.selectionStart) continue; const a = posToLC(m.index); const t = ls[a.line - 1]; out += box('occ', a.line, vcol(t, a.col - 1), vcol(t, a.col - 1 + sel.length)); }
      }
      deco.innerHTML = out; over.innerHTML = top;
    }
    const PAIRS = { '(': ')', '[': ']', '{': '}' }, CLOSE = { ')': '(', ']': '[', '}': '{' };
    function bracketPair() {
      if (ta.selectionStart !== ta.selectionEnd) return null;
      const v = ta.value, p = ta.selectionStart;
      let at = -1;
      if (PAIRS[v[p]] || CLOSE[v[p]]) at = p; else if (PAIRS[v[p - 1]] || CLOSE[v[p - 1]]) at = p - 1;
      if (at < 0) return null;
      const ch = v[at], open = !!PAIRS[ch], want = open ? PAIRS[ch] : CLOSE[ch];
      let depth = 0;
      for (let i = at; open ? i < v.length : i >= 0; i += open ? 1 : -1) {
        if (Math.abs(i - at) > 20000) break;
        if (v[i] === ch) depth++; else if (v[i] === want && --depth === 0) return [at, i];
      }
      return null;
    }

    /* ---------------- cursor ---------------- */
    function fireCursor() {
      if (!activeId) return;
      const pos = ta.selectionStart, { line, col } = posToLC(pos);
      const v = ta.value; const ls = v.lastIndexOf('\n', pos - 1) + 1; let le = v.indexOf('\n', pos); if (le < 0) le = v.length;
      const info = { id: activeId, line, col, lineText: v.slice(ls, le), langId: doc().lang, selLength: ta.selectionEnd - ta.selectionStart, lines: v.split('\n').length };
      paintGutter(); queueDeco();
      cursorFns.forEach((f) => f(info));
    }

    /* ---------------- autocomplete ---------------- */
    const sug = { el: null, items: [], i: 0, replaceLen: 0 };
    function wordBefore() { const b = api.textBefore(); const lang = doc()?.lang; return (b.match(lang === 'css' || lang === 'scss' ? /[\w-]*$/ : /[\w$]*$/) || [''])[0]; }
    function gather(force) {
      const d = doc(); if (!d) return [];
      const before = api.textBefore(); const lang = d.lang; const w = wordBefore();
      const items = [], seen = new Set();
      const add = (it) => { const k = it.label + '|' + (it.kind || ''); if (seen.has(it.label)) return; seen.add(it.label); items.push(it); void k; };
      // providers (snippets, emmet, file paths)
      Q.editorFactory.completionProviders.forEach((p) => { if (p.langs !== '*' && !p.langs.includes(lang)) return; (p.fn({ before, langId: lang }) || []).forEach((it) => add({ ...it, kind: it.kind === 'emmet' ? 'em' : it.detail === 'Project file' ? 'wd' : 'sn' })); });
      if (w.length >= (force ? 0 : 2)) {
        const lw = w.toLowerCase();
        const dict = Q.tutorData?.[lang] || {};
        const kw = (Q.langs.byId[lang]?.kw || '').split(/\s+/).filter(Boolean);
        kw.forEach((k) => { if (k.toLowerCase().startsWith(lw) && k !== w) add({ label: k, insert: k, replaceLen: w.length, kind: 'kw', detail: 'keyword', doc: Object.prototype.hasOwnProperty.call(dict, k) ? dict[k][1] : '' }); });
        Object.keys(dict).forEach((k) => { if (k.toLowerCase().startsWith(lw) && k !== w && /^[\w$-]+$/.test(k)) add({ label: k, insert: k, replaceLen: w.length, kind: dict[k][0] === 'keyword' ? 'kw' : 'fn', detail: dict[k][0], doc: dict[k][1] }); });
        const words = new Set(ta.value.match(lang === 'css' ? /[A-Za-z_][\w-]{2,}/g : /[A-Za-z_$][\w$]{2,}/g) || []);
        words.forEach((k) => { if (k !== w && k.toLowerCase().startsWith(lw)) add({ label: k, insert: k, replaceLen: w.length, kind: 'wd', detail: 'in this file' }); });
      }
      const lw = w.toLowerCase();
      const score = (it) => (it.kind === 'sn' || it.kind === 'em' ? 0 : 1) + (it.label.startsWith(w) ? 0 : 0.5) + (it.kind === 'wd' ? 0.3 : 0) + it.label.length / 1000;
      return items.filter((it) => it.kind === 'em' || it.detail === 'Project file' || !lw || it.label.toLowerCase().startsWith(lw)).sort((a, b) => score(a) - score(b)).slice(0, 12);
    }
    function openSuggest(force) {
      if (!opts.autocomplete && !force) return closeSuggest();
      const items = gather(force);
      if (!items.length) return closeSuggest();
      sug.items = items; sug.i = 0;
      if (!sug.el) { sug.el = h('div', { class: 'fb-suggest', role: 'listbox' }); document.body.append(sug.el); }
      drawSuggest();
      const c = api.cursorCoords();
      const r = sug.el.getBoundingClientRect();
      sug.el.style.left = Math.min(c.x - 6, innerWidth - r.width - 8) + 'px';
      sug.el.style.top = (c.y + lh / 2 + r.height + 4 > innerHeight ? c.y - lh / 2 - r.height - 4 : c.y + lh / 2 + 4) + 'px';
    }
    function drawSuggest() {
      const w = wordBefore();
      sug.el.innerHTML = '';
      sug.items.forEach((it, i) => {
        const lab = esc(it.label); const n = w && it.label.toLowerCase().startsWith(w.toLowerCase()) ? w.length : 0;
        const row = h('div', { class: 'fb-sug' + (i === sug.i ? ' on' : ''), role: 'option', html: `<span class="k ${it.kind}">${{ kw: 'K', fn: 'ƒ', sn: '⧉', wd: 'ab', em: '<>' }[it.kind] || '·'}</span><span class="l">${n ? `<b>${esc(it.label.slice(0, n))}</b>${esc(it.label.slice(n))}` : lab}</span><span class="d">${esc(it.detail || '')}</span>` });
        row.onmousedown = (e) => { e.preventDefault(); sug.i = i; accept(); };
        sug.el.append(row);
      });
      const cur = sug.items[sug.i];
      if (cur && cur.doc) { const d = h('div', { class: 'fb-sdoc' }); d.innerHTML = cur.doc.startsWith('```') ? `<pre>${esc(cur.doc.replace(/```\w*\n?/g, ''))}</pre>` : cur.doc; sug.el.append(d); }
      sug.el.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
    }
    function closeSuggest() { if (sug.el) { sug.el.remove(); sug.el = null; } sug.items = []; }
    function accept() {
      const it = sug.items[sug.i]; if (!it) return closeSuggest();
      closeSuggest();
      if (it.replaceLen) api.replaceBefore(it.replaceLen, '');
      api.insertSnippet(it.insert);
    }

    /* ---------------- find & replace ---------------- */
    const find = { open: false, el: null, matches: [], i: 0, cs: false, re: false, word: false };
    function openFind(replace) {
      if (!find.el) {
        const q = h('input', { placeholder: 'Find', spellcheck: 'false', 'aria-label': 'Find' });
        const r = h('input', { placeholder: 'Replace', spellcheck: 'false', 'aria-label': 'Replace' });
        const cnt = h('span', { class: 'cnt' });
        const tg = (k, label, title) => { const b = h('button', { class: 'tg', text: label, title }); b.onclick = () => { find[k] = !find[k]; b.classList.toggle('on', find[k]); search(); q.focus(); }; return b; };
        const nav = (d) => h('button', { class: 'icon-btn sm', title: d > 0 ? 'Next match (Enter)' : 'Previous match (Shift+Enter)', html: Q.icon(d > 0 ? 'arrowRight' : 'arrowLeft', 13), onclick: () => step(d) });
        const rrow = h('div', { class: 'row' }, r, h('button', { class: 'sbtn', text: 'Replace', onclick: () => replaceOne(r.value) }), h('button', { class: 'sbtn', text: 'All', onclick: () => replaceAll(r.value) }));
        find.el = h('div', { class: 'fb-find', role: 'search' }, h('div', { class: 'row' }, q, tg('cs', 'Aa', 'Match case'), tg('word', 'ab', 'Whole word'), tg('re', '.*', 'Regular expression'), cnt, nav(-1), nav(1), h('button', { class: 'icon-btn sm', title: 'Close (Esc)', html: Q.icon('close', 13), onclick: closeFind })), rrow);
        find.q = q; find.r = r; find.cnt = cnt; find.rrow = rrow;
        q.oninput = () => search();
        const keys = (e) => { if (e.key === 'Escape') { e.preventDefault(); closeFind(); } else if (e.key === 'Enter' && e.target === q) { e.preventDefault(); step(e.shiftKey ? -1 : 1); } else if (e.key === 'Enter' && e.target === r) { e.preventDefault(); e.ctrlKey ? replaceAll(r.value) : replaceOne(r.value); } };
        q.onkeydown = keys; r.onkeydown = keys;
        area.append(find.el);
      }
      find.open = true; find.el.style.display = '';
      find.rrow.style.display = replace ? '' : 'none';
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      if (sel && !sel.includes('\n')) find.q.value = sel;
      find.q.focus(); find.q.select();
      search(true);
    }
    function closeFind() { if (!find.el) return; find.open = false; find.el.style.display = 'none'; find.matches = []; queueDeco(); ta.focus(); }
    function buildRe() {
      const q = find.q.value; if (!q) return null;
      try { const src = find.re ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return new RegExp(find.word ? `\\b${src}\\b` : src, find.cs ? 'g' : 'gi'); } catch { return null; }
    }
    function search(keepPos) {
      const re = buildRe(); find.matches = [];
      if (re) { let m, n = 0; while ((m = re.exec(ta.value)) && n++ < 5000) { if (!m[0].length) { re.lastIndex++; continue; } find.matches.push([m.index, m.index + m[0].length]); } }
      const from = ta.selectionStart;
      find.i = Math.max(0, find.matches.findIndex((mm) => mm[0] >= (keepPos ? from : from)));
      if (find.i < 0) find.i = 0;
      updateCount(); if (find.matches.length) reveal(find.matches[find.i]); queueDeco();
    }
    function updateCount() { const n = find.matches.length; find.cnt.textContent = find.q.value ? (n ? `${find.i + 1} of ${n}` : 'No results') : ''; find.cnt.classList.toggle('none', !!find.q.value && !n); }
    function reveal(mm) { const a = posToLC(mm[0]); const top = PT + (a.line - 1) * lh; if (top < ta.scrollTop + 20 || top > ta.scrollTop + ta.clientHeight - 60) ta.scrollTop = Math.max(0, top - ta.clientHeight / 3); ta.setSelectionRange(mm[0], mm[1]); syncScroll(); }
    function step(d) { if (!find.matches.length) return; find.i = (find.i + d + find.matches.length) % find.matches.length; updateCount(); reveal(find.matches[find.i]); queueDeco(); }
    function replaceOne(text) {
      const mm = find.matches[find.i]; if (!mm) return;
      ta.focus(); ta.setSelectionRange(mm[0], mm[1]); ins(text);
      search(true); find.q.focus();
    }
    function replaceAll(text) {
      const re = buildRe(); if (!re) return;
      const n = find.matches.length; if (!n) return;
      const out = ta.value.replace(re, find.re ? text : () => text);
      ta.focus(); ta.select(); ins(out); search(true); find.q.focus();
      Q.toast(`Replaced ${n} match${n === 1 ? '' : 'es'}`, 'success', 1200);
    }

    /* ---------------- hover tips ---------------- */
    let hoverT = null, hoverEl = null;
    function hideHover() { clearTimeout(hoverT); if (hoverEl) { hoverEl.remove(); hoverEl = null; } }
    ta.addEventListener('mousemove', (e) => {
      hideHover();
      if (!activeId || e.buttons) return;
      hoverT = setTimeout(() => {
        const r = ta.getBoundingClientRect();
        const line = Math.floor((e.clientY - r.top - PT + ta.scrollTop) / lh) + 1;
        const ls = lines(); const t = ls[line - 1]; if (t == null) return;
        let v = Math.floor((e.clientX - r.left - PL + ta.scrollLeft) / cw); if (v < 0 || v >= vcol(t, t.length)) return;
        let col = 0; while (col < t.length && vcol(t, col + 1) <= v) col++;
        const marker = (doc().markers || []).find((m) => m.line === line);
        let html = '';
        if (marker) html += `<div style="color:var(--bad)"><b style="color:var(--bad)">Error:</b> ${esc(marker.msg)}</div>`;
        if (Q.ext?.isOn('hoverTips') && Q.tutor?._lookup) {
          const res = Q.tutor._lookup({ id: activeId, line, col: col + 1, lineText: t, langId: doc().lang });
          if (res.entry) html += `${html ? '<div style="height:8px"></div>' : ''}<b>${esc(res.key)}</b><span class="k">${esc(res.entry[0])}</span><div>${res.entry[1]}</div>${res.entry[2] ? `<pre>${esc(res.entry[2])}</pre>` : ''}`;
        }
        if (!html || opts.hover === false) return;
        hoverEl = h('div', { class: 'fb-hover', html });
        document.body.append(hoverEl);
        const hr = hoverEl.getBoundingClientRect();
        const y = r.top + PT + (line - 1) * lh - ta.scrollTop;
        hoverEl.style.left = Math.min(Math.max(8, e.clientX - 20), innerWidth - hr.width - 8) + 'px';
        hoverEl.style.top = (y - hr.height - 6 > 8 ? y - hr.height - 6 : y + lh + 6) + 'px';
      }, 550);
    });
    ta.addEventListener('mouseleave', hideHover);

    /* ---------------- formatter ---------------- */
    const VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;
    function reindent(text, lang) {
      const tab = ' '.repeat(tabW());
      if (lang === 'json') { try { return JSON.stringify(JSON.parse(text), null, tabW()) + '\n'; } catch { return null; } }
      const out = []; let depth = 0, blank = 0, inBlock = false;
      if (lang === 'html' || lang === 'xml') {
        let raw = false;
        for (const line of text.split('\n')) {
          const t = line.trim();
          if (!t) { if (++blank <= 1 && out.length) out.push(''); continue; } blank = 0;
          if (raw) { if (/^<\/(script|style)/i.test(t)) { raw = false; depth = Math.max(0, depth - 1); out.push(tab.repeat(depth) + t); } else out.push(tab.repeat(depth) + t); continue; }
          const closesFirst = /^<\//.test(t);
          if (closesFirst) depth = Math.max(0, depth - 1);
          out.push(tab.repeat(depth) + t);
          const tags = t.replace(/<!--[\s\S]*?-->/g, '').match(/<\/?[a-zA-Z][\w-]*[^>]*>/g) || [];
          let d = closesFirst ? 1 : 0;
          tags.forEach((tg) => { const name = (tg.match(/^<\/?([\w-]+)/) || [])[1] || ''; if (tg.startsWith('</')) d--; else if (!VOID.test(name) && !tg.endsWith('/>')) d++; });
          depth = Math.max(0, depth + d);
          if (/<(script|style)\b[^>]*>(?![\s\S]*<\/\1>)/i.test(t) && !/<script[^>]*src=/i.test(t)) raw = true;
        }
        return out.join('\n').replace(/\n*$/, '\n');
      }
      if (lang === 'python' || lang === 'yaml' || lang === 'markdown' || lang === 'plaintext') return null;
      for (const line of text.split('\n')) {
        const t = line.trim();
        if (!t) { if (++blank <= 1 && out.length) out.push(''); continue; } blank = 0;
        if (inBlock) { out.push(tab.repeat(depth) + (t.startsWith('*') ? ' ' + t : t)); if (t.includes('*/')) inBlock = false; continue; }
        const lead = (t.match(/^[)\]}]+/) || [''])[0].length;
        depth = Math.max(0, depth - lead);
        const extra = /^(case\s.*|default):\s*$/.test(t) && depth > 0 ? -1 : 0;
        out.push(tab.repeat(Math.max(0, depth + extra)) + t);
        const code = t.replace(/\/\/.*$/, '').replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""').replace(/\/\*.*?\*\//g, '');
        if (/\/\*/.test(code) && !/\*\//.test(code)) inBlock = true;
        const opens = (code.match(/[({[]/g) || []).length, closes = (code.match(/[)\]}]/g) || []).length;
        depth = Math.max(0, depth + opens - (closes - lead));
      }
      return out.join('\n').replace(/\n*$/, '\n');
    }

    /* ---------------- events ---------------- */
    ta.addEventListener('input', (e) => {
      if (!activeId) return;
      doc().value = ta.value; paint();
      changeFns.forEach((f) => f(activeId, ta.value));
      if (e.inputType === 'insertText' && e.data && e.data.length === 1) {
        typeFns.forEach((f) => f(e.data, activeId));
        if (/[\w$-]/.test(e.data) || (doc().lang === 'html' && /[.#>*+!]/.test(e.data))) openSuggest(false); else closeSuggest();
      } else if (e.inputType === 'deleteContentBackward' && sug.el) openSuggest(false);
      else closeSuggest();
      if (find.open) search(true);
      fireCursor();
    });
    ta.addEventListener('scroll', () => { syncScroll(); queueDeco(); closeSuggest(); });
    ta.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== ta) closeSuggest(); }, 120));
    ['keyup', 'click', 'select'].forEach((ev) => ta.addEventListener(ev, (e) => { if (ev === 'keyup' && ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key) && sug.el) return; fireCursor(); }));
    ta.addEventListener('mousedown', closeSuggest);
    document.addEventListener('selectionchange', () => { if (document.activeElement === ta) queueDeco(); });

    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
    ta.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      // suggestion navigation
      if (sug.el) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sug.i = (sug.i + (e.key === 'ArrowDown' ? 1 : -1) + sug.items.length) % sug.items.length; drawSuggest(); return; }
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); accept(); return; }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSuggest(); return; }
      }
      if (mod && e.key === ' ') { e.preventDefault(); openSuggest(true); return; }
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); e.stopPropagation(); openFind(false); return; }
      if (mod && e.key.toLowerCase() === 'h') { e.preventDefault(); e.stopPropagation(); openFind(true); return; }
      if (e.key === 'Escape' && find.open) { e.preventDefault(); closeFind(); return; }
      for (const f of keyFns) { f(e); if (e.defaultPrevented) return; }
      const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value, tab = ' '.repeat(tabW());
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      if (e.key === 'Tab') {
        e.preventDefault();
        if (s === en && !e.shiftKey) return ins(tab.slice(vcol(v.slice(lineStart, s), s - lineStart) % tabW()));
        const block = v.slice(lineStart, en);
        const out = e.shiftKey ? block.replace(new RegExp(`^ {1,${tabW()}}`, 'gm'), '') : block.replace(/^/gm, tab);
        ta.setSelectionRange(lineStart, en); ins(out); ta.setSelectionRange(lineStart, lineStart + out.length);
      } else if (e.key === 'Enter' && !mod && !e.shiftKey) {
        e.preventDefault();
        const line = v.slice(lineStart, s);
        let indent = line.match(/^\s*/)[0];
        const prev = line.trimEnd().slice(-1), next = v[s];
        const lang = doc()?.lang;
        const opensTag = lang === 'html' && /<([a-zA-Z][\w-]*)[^<>]*>$/.test(line) && !VOID.test(line.match(/<([a-zA-Z][\w-]*)[^<>]*>$/)[1]) && v.slice(s).startsWith('</');
        if ((prev && '{[('.includes(prev)) || (lang === 'python' && prev === ':') || opensTag) {
          if ((prev && pairs[prev] === next) || opensTag) { ins('\n' + indent + tab + '\n' + indent); const p = s + 1 + indent.length + tab.length; ta.setSelectionRange(p, p); fireCursor(); return; }
          indent += tab;
        }
        ins('\n' + indent);
      } else if (opts.autoClose && pairs[e.key] && !mod && !e.altKey) {
        const sel = v.slice(s, en);
        if ((e.key === '"' || e.key === "'" || e.key === '`') && !sel) {
          if (v[s] === e.key) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
          if (/[\w$]/.test(v[s - 1] || '') || (e.key === "'" && /\w/.test(v[s - 1] || ''))) return; // don't pair after letters (it's, don't)
        }
        if (!sel && /[\w$]/.test(v[s] || '')) return; // don't pair right before a word
        e.preventDefault();
        ins(e.key + sel + pairs[e.key]); ta.setSelectionRange(s + 1, s + 1 + sel.length);
      } else if (opts.autoClose && ')]}'.includes(e.key) && v[s] === e.key && s === en) {
        e.preventDefault(); ta.setSelectionRange(s + 1, s + 1);
      } else if (e.key === 'Backspace' && s === en && pairs[v[s - 1]] === v[s] && v[s]) {
        e.preventDefault(); ta.setSelectionRange(s - 1, s + 1); ins('');
      } else if (e.key === 'Backspace' && s === en && s > lineStart && /^ +$/.test(v.slice(lineStart, s))) {
        // delete a whole indent level
        const n = ((s - lineStart - 1) % tabW()) + 1; e.preventDefault(); ta.setSelectionRange(s - n, s); ins('');
      } else if (mod && e.key === '/') { e.preventDefault(); api.command('comment'); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); api.command('deleteLine'); }
      else if (mod && e.key.toLowerCase() === 'd' && !e.shiftKey) { e.preventDefault(); selectNextOccurrence(); }
      else if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); e.stopPropagation(); api.command('gotoLine'); }
      else if (e.altKey && e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); api.command('duplicate'); }
      else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); api.command(e.key === 'ArrowUp' ? 'moveUp' : 'moveDown'); }
      else if (e.key === 'Home' && !e.shiftKey && !mod) { // smart home
        const first = lineStart + (v.slice(lineStart).match(/^\s*/)[0].length);
        e.preventDefault(); const p = s === first ? lineStart : first; ta.setSelectionRange(p, p); fireCursor();
      }
    });
    function selectNextOccurrence() {
      const v = ta.value; let s = ta.selectionStart, en = ta.selectionEnd;
      if (s === en) { while (s > 0 && /[\w$]/.test(v[s - 1])) s--; while (en < v.length && /[\w$]/.test(v[en])) en++; ta.setSelectionRange(s, en); queueDeco(); return; }
      const word = v.slice(s, en); let i = v.indexOf(word, en); if (i < 0) i = v.indexOf(word);
      if (i >= 0) { ta.setSelectionRange(i, i + word.length); reveal([i, i + word.length]); queueDeco(); }
    }

    /* ---------------- public API (same shape as the Monaco adapter) ---------------- */
    const api = {
      kind: 'fallback',
      get activeId() { return activeId; },
      has: (id) => docs.has(id),
      ensure(id, value, langId) { if (!docs.has(id)) docs.set(id, { value: value ?? '', lang: langId, sel: [0, 0], scroll: [0, 0], decos: {}, markers: [] }); return docs.get(id); },
      open(id, value, langId) {
        if (activeId && docs.has(activeId)) { const d = docs.get(activeId); d.sel = [ta.selectionStart, ta.selectionEnd]; d.scroll = [ta.scrollLeft, ta.scrollTop]; }
        const d = api.ensure(id, value, langId);
        activeId = id; hl = highlighter(d.lang);
        wrap.style.display = '';
        closeSuggest(); if (find.open) closeFind();
        ta.value = d.value; ta.setSelectionRange(...d.sel); ta.scrollLeft = d.scroll[0]; ta.scrollTop = d.scroll[1];
        measure(); paint(); fireCursor();
      },
      showNothing() { if (activeId && docs.has(activeId)) { const d = docs.get(activeId); d.sel = [ta.selectionStart, ta.selectionEnd]; d.scroll = [ta.scrollLeft, ta.scrollTop]; } activeId = null; wrap.style.display = 'none'; closeSuggest(); hideHover(); },
      get(id) { return docs.has(id) ? docs.get(id).value : null; },
      set(id, value) {
        const d = docs.get(id); if (!d) return;
        if (id === activeId) { if (ta.value === value) return; const s = ta.selectionStart; ta.focus(); ta.select(); ins(value); const p = Math.min(s, value.length); ta.setSelectionRange(p, p); return; }
        d.value = value; changeFns.forEach((f) => f(id, value));
      },
      close(id) { docs.delete(id); if (activeId === id) api.showNothing(); },
      rename(from, to, langId) { const d = docs.get(from); if (!d) return; docs.delete(from); d.lang = langId; docs.set(to, d); if (activeId === from) { activeId = to; hl = highlighter(langId); paint(); } },
      setLang(id, langId) { const d = docs.get(id); if (d) { d.lang = langId; if (id === activeId) { hl = highlighter(langId); paint(); fireCursor(); } } },
      langOf(id) { return docs.get(id)?.lang; },
      onChange: (f) => changeFns.push(f), onCursor: (f) => cursorFns.push(f), onMarkers: (f) => markerFns.push(f),
      applySettings(s) {
        opts = { ...s };
        wrap.style.setProperty('--fs', s.fontSize + 'px'); wrap.style.setProperty('--tab', s.tabSize);
        wrap.style.setProperty('--lh', Math.round(s.fontSize * 1.6) + 'px'); // whole pixels keep gutter and text aligned
        gutter.style.display = s.lineNumbers ? '' : 'none';
        wrap.classList.toggle('ligatures', !!s.ligatures);
        measure(); if (activeId) paint();
      },
      setTheme() {},
      async format() {
        const id = activeId; if (!id) return false;
        const out = reindent(ta.value, doc().lang);
        if (out == null) return false;
        if (out === ta.value) return true;
        const { line, col } = posToLC(ta.selectionStart);
        ta.focus(); ta.select(); ins(out);
        const p = lcToPos(line, Math.max(1, col)); ta.setSelectionRange(p, p); fireCursor();
        return true;
      },
      focus: () => ta.focus(), layout: () => queueDeco(),
      insert: (text) => ins(text),
      insertBelow(text) {
        const v = ta.value, s = ta.selectionStart;
        const ls = v.lastIndexOf('\n', s - 1) + 1; let le = v.indexOf('\n', s); if (le < 0) le = v.length;
        const cur = v.slice(ls, le); const indent = cur.match(/^\s*/)[0] + (/[{:([]\s*$/.test(cur) ? ' '.repeat(tabW()) : '');
        const body = text.replace(/\n$/, '').split('\n').map((l) => (l ? indent + l : l)).join('\n');
        ta.focus();
        if (!cur.trim()) { ta.setSelectionRange(ls, le); ins(body); ta.setSelectionRange(ls, ls + body.length); }
        else { ta.setSelectionRange(le, le); ins('\n' + body); ta.setSelectionRange(le + 1, le + 1 + body.length); }
        fireCursor();
      },
      insertSnippet(sn) {
        // parse ${n:default}, $n and escapes; select the first tab stop
        let out = '', stops = {};
        const re = /\\([$}\\])|\$\{(\d+)(?::((?:\\.|[^}])*))?\}|\$(\d+)|([\s\S])/g; let m;
        while ((m = re.exec(sn))) {
          if (m[1]) out += m[1];
          else if (m[2]) { const def = (m[3] || '').replace(/\\(.)/g, '$1'); if (!stops[m[2]]) stops[m[2]] = [out.length, out.length + def.length]; out += def; }
          else if (m[4]) { if (!stops[m[4]]) stops[m[4]] = [out.length, out.length]; }
          else out += m[5];
        }
        const s = ta.selectionStart;
        // keep the indentation of the current line for multi-line snippets
        const indent = (api.textBefore().match(/^\s*/) || [''])[0];
        const text = out.replace(/\n/g, '\n' + indent);
        const shift = (pos) => { const pre2 = out.slice(0, pos); return pos + (pre2.split('\n').length - 1) * indent.length; };
        ins(text);
        const keys = Object.keys(stops).map(Number).sort((a, b) => (a === 0) - (b === 0) || a - b);
        const st = keys.length ? stops[keys[0]] : null;
        if (st) ta.setSelectionRange(s + shift(st[0]), s + shift(st[1])); else ta.setSelectionRange(s + text.length, s + text.length);
        fireCursor();
      },
      select(l1, c1, l2, c2) { const a = lcToPos(l1, c1), b = lcToPos(l2, c2); ta.focus(); ta.setSelectionRange(a, b); syncScroll(); fireCursor(); queueDeco(); },
      reveal(line, col = 1) {
        const pos = lcToPos(line, col); ta.focus(); ta.setSelectionRange(pos, pos);
        const top = PT + (line - 1) * lh; if (top < ta.scrollTop || top > ta.scrollTop + ta.clientHeight - lh * 2) ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
        syncScroll(); fireCursor();
      },
      selection: () => ta.value.slice(ta.selectionStart, ta.selectionEnd),
      command(name) {
        const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
        const ls = v.lastIndexOf('\n', s - 1) + 1; let le = v.indexOf('\n', en > s && v[en - 1] === '\n' ? en - 1 : en); if (le < 0) le = v.length;
        const block = v.slice(ls, le);
        ta.focus();
        if (name === 'undo' || name === 'redo') document.execCommand(name);
        else if (name === 'selectAll') ta.select();
        else if (name === 'find') openFind(false);
        else if (name === 'replace') openFind(true);
        else if (name === 'comment') {
          const cm = Q.langs.byId[doc()?.lang]?.comment || {};
          ta.setSelectionRange(ls, le);
          if (cm.line) {
            const reL = new RegExp('^(\\s*)' + cm.line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' ?');
            const all = block.split('\n').every((l) => !l.trim() || reL.test(l));
            const minIndent = Math.min(...block.split('\n').filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
            const out = block.split('\n').map((l) => (all ? l.replace(reL, '$1') : l.trim() ? l.slice(0, minIndent) + cm.line + ' ' + l.slice(minIndent) : l)).join('\n');
            ins(out); ta.setSelectionRange(ls, ls + out.length);
          } else if (cm.block) {
            const [a, b] = cm.block; const t = block.trim(); const lead = block.match(/^\s*/)[0];
            const out = t.startsWith(a) && t.endsWith(b) ? lead + t.slice(a.length, t.length - b.length).trim() : `${lead}${a} ${t} ${b}`;
            ins(out); ta.setSelectionRange(ls, ls + out.length);
          }
        } else if (name === 'duplicate') { ta.setSelectionRange(le, le); ins('\n' + block); }
        else if (name === 'deleteLine') { ta.setSelectionRange(ls, Math.min(le + 1, v.length)); ins(''); }
        else if (name === 'moveUp' || name === 'moveDown') {
          const up = name === 'moveUp';
          if (up && ls === 0) return; if (!up && le >= v.length) return;
          if (up) { const ps = v.lastIndexOf('\n', ls - 2) + 1; const prevLine = v.slice(ps, ls - 1); ta.setSelectionRange(ps, le); ins(block + '\n' + prevLine); const off = s - ls; ta.setSelectionRange(ps + off, ps + off + (en - s)); }
          else { let ne = v.indexOf('\n', le + 1); if (ne < 0) ne = v.length; const nextLine = v.slice(le + 1, ne); ta.setSelectionRange(ls, ne); ins(nextLine + '\n' + block); const ns = ls + nextLine.length + 1 + (s - ls); ta.setSelectionRange(ns, ns + (en - s)); }
        }
        else if (name === 'upper' || name === 'lower') { const sel = v.slice(s, en); ins(name === 'upper' ? sel.toUpperCase() : sel.toLowerCase()); ta.setSelectionRange(s, en); }
        else if (name === 'sortLines') { ta.setSelectionRange(ls, le); ins(block.split('\n').sort((a, b) => a.localeCompare(b)).join('\n')); }
        else if (name === 'trimWhitespace') { const t = v.replace(/[ \t]+$/gm, ''); if (t !== v) { const pos = s; ta.select(); ins(t); ta.setSelectionRange(Math.min(pos, t.length), Math.min(pos, t.length)); } }
        else if (name === 'multiCursorNext') selectNextOccurrence();
        else if (name === 'gotoLine') Q.prompt('Go to line', '', `1 – ${lines().length}`).then((n) => n && api.reveal(Math.max(1, Math.min(parseInt(n, 10) || 1, lines().length))));
        else if (name === 'zoomIn' || name === 'zoomOut') bus.emit('zoom', name === 'zoomIn' ? 1 : -1);
        else if (name === 'foldAll' || name === 'unfoldAll') Q.toast('Folding is available in the full editor.', 'info');
        fireCursor();
      },
      markers(id) { return (docs.get(id)?.markers || []).map((m) => ({ ...m, severity: m.severity || 'error' })); },
      setMarkers(id, list) { const d = docs.get(id); if (!d) return; d.markers = list.map((m) => ({ ...m, severity: m.severity || 'error' })); if (id === activeId) { paintGutter(); queueDeco(); } markerFns.forEach((f) => f(id)); },
      decorate(key, id, list) { const d = docs.get(id); if (!d) return; d.decos[key] = list; if (id === activeId) { paintGutter(); queueDeco(); } },
      cursorCoords() {
        const { line, col } = posToLC(ta.selectionStart); const t = lines()[line - 1] || '';
        const r = ta.getBoundingClientRect();
        return { x: r.left + PL + vcol(t, col - 1) * cw - ta.scrollLeft, y: r.top + PT + (line - 0.5) * lh - ta.scrollTop };
      },
      async transpileTS(id) { // simple type stripper (the full editor uses the real TypeScript compiler)
        return api.get(id)
          .replace(/^\s*(export\s+)?(type|interface)\s+\w+[^{=]*(=[^;]*;|\{[\s\S]*?^\})/gm, '')
          .replace(/(\(|,)\s*(\w+)\??\s*:\s*[\w<>[\]|&\s.'"]+?(?=[,)=])/g, '$1$2')
          .replace(/\)\s*:\s*[\w<>[\]|&\s.'"]+?(?=\s*(\{|=>))/g, ')')
          .replace(/(let|const|var)\s+(\w+)\s*:\s*[\w<>[\]|&\s.'"]+?(?=\s*[=;\n])/g, '$1 $2')
          .replace(/\s+as\s+[\w<>[\]]+/g, '')
          .replace(/(\w)\s*<\s*[A-Z]\w*(?:\s*(?:,|extends)[^>]*)?>\s*(?=\()/g, '$1')
          .replace(/\b(public|private|protected|readonly)\s+/g, '')
          .replace(/^(\s*)(?!default\b)(#?\w+)[?!]?\s*:\s*[^=;,\n(){}]+?(?=\s*[=;])/gm, '$1$2'); // class fields: `hp: number = 3;`
      },
      registerLang() {},
      addTabHandler(fn) { keyFns.push((e) => { if (e.key === 'Tab' && !e.shiftKey && ta.selectionStart === ta.selectionEnd && fn()) e.preventDefault(); }); },
      onKey: (f) => keyFns.push(f),
      onType: (f) => typeFns.push(f),
      textBefore() { const v = ta.value, s = ta.selectionStart; return v.slice(v.lastIndexOf('\n', s - 1) + 1, s); },
      textAfter() { const v = ta.value, s = ta.selectionStart; const e = v.indexOf('\n', s); return v.slice(s, e < 0 ? undefined : e); },
      replaceBefore(len, text, cursorBack = 0) { const s = ta.selectionStart; ta.setSelectionRange(s - len, s); if (text || len) ins(text); if (cursorBack) { const p = ta.selectionStart - cursorBack; ta.setSelectionRange(p, p); } },
      _internals: { openSuggest, closeSuggest, openFind, closeFind, get sug() { return sug; }, get find() { return find; } },
    };
    api.applySettings(settings);
    api.showNothing();
    return api;
  };
})();
