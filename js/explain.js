/* Codeditor — explanations for missed levels:
   - trace(code, lang): runs a "what will this print?" snippet step by step and returns each line with variable values and output
   - fixDiff(starter, solution): highlights what changed between buggy code and the fix */
(() => {
  const { h, esc } = Q;
  const MARK = '\u0001T';

  /* ---------- JavaScript: add a snapshot call after each statement line ---------- */
  function instrumentJS(code) {
    const lines = code.split('\n');
    const names = [...new Set([...code.matchAll(/\b(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))];
    const grab = `{${names.map((n) => `${JSON.stringify(n)}: __g(() => ${n})`).join(', ')}}`;
    const out = [];
    lines.forEach((l, i) => {
      out.push(l);
      const t = l.trim(), next = (lines.slice(i + 1).find((x) => x.trim()) || '').trim();
      if (!t || !/;\s*(\/\/.*)?$/.test(t) || /^for\s*\(/.test(t) || /^(else|catch|finally)\b/.test(next) || /^\.|^[?:]/.test(next)) return;
      out.push(`__t(${i + 1}, ${grab});`);
    });
    const pre = `const __N = '\\u0001T'; let __n = 0;
const __f = (v) => { try { if (typeof v === 'string') return JSON.stringify(v); if (typeof v === 'function') return 'function'; if (v === undefined) return 'undefined'; const s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch { return String(v); } };
const __g = (f) => { try { return __f(f()); } catch { return undefined; } };
const __t = (line, vars) => { if (++__n > 300) return; const o = {}; for (const k in vars) if (vars[k] !== undefined && vars[k] !== 'function') o[k] = vars[k].length > 48 ? vars[k].slice(0, 45) + '…' : vars[k]; console.log(__N + JSON.stringify([line, o])); };\n`;
    return pre + out.join('\n');
  }
  async function traceJS(code) {
    const r = await Q.runner.runJS(instrumentJS(code), { timeout: 3000, settle: 50 });
    if (r.errors?.length && !r.logs.some((l) => String(l).startsWith(MARK))) return null;
    const rows = []; let pending = [];
    for (const l of r.logs) {
      const s = String(l);
      if (s.startsWith(MARK)) { const [line, vars] = JSON.parse(s.slice(MARK.length)); rows.push({ line, vars, out: pending }); pending = []; }
      else pending.push(s);
    }
    if (pending.length && rows.length) rows[rows.length - 1].out.push(...pending);
    return rows;
  }

  /* ---------- Python: sys.settrace records every line ---------- */
  function wrapPy(code) {
    return `import sys as __s, json as __j
__src = ${JSON.stringify(code)}
__ev = []
_trbuf = []
class __W:
    def write(self, s):
        _trbuf.append(s)
        return len(s)
    def flush(self): pass
def __fmt(v):
    r = repr(v)
    return r if len(r) <= 48 else r[:45] + '…'
def __vars(d):
    return {k: __fmt(v) for k, v in list(d.items()) if not k.startswith('__') and not k.startswith('_tr') and not callable(v) and type(v).__name__ != 'module'}
def __tr(frame, event, arg):
    if frame.f_code.co_filename != '<trace>': return None
    if event == 'line' and len(__ev) < 300:
        __ev.append([frame.f_lineno, __vars(frame.f_locals), len(''.join(_trbuf))])
    return __tr
__g = {'__name__': '__main__'}
__old = __s.stdout
__s.stdout = __W()
__err = None
try:
    __s.settrace(__tr)
    exec(compile(__src, '<trace>', 'exec'), __g)
except Exception as e:
    __err = type(e).__name__ + ': ' + str(e)
finally:
    __s.settrace(None)
    __s.stdout = __old
print(${JSON.stringify(MARK)} + __j.dumps({'ev': __ev, 'out': ''.join(_trbuf), 'end': __vars(__g), 'err': __err}))
`;
  }
  async function tracePy(code) {
    const r = await Q.runner.runPython(wrapPy(code), { timeout: 12000 });
    const line = (r.logs || []).map(String).find((l) => l.startsWith(MARK));
    if (!line) return null;
    const d = JSON.parse(line.slice(MARK.length));
    // a 'line' event fires before the line runs: the state after line i is the state at event i+1
    return d.ev.map(([ln, , pos], i) => {
      const nxt = d.ev[i + 1];
      const vars = nxt ? nxt[1] : d.end;
      const end = nxt ? nxt[2] : d.out.length;
      const out = d.out.slice(pos, end).split('\n').filter((x, k, a) => x !== '' || k < a.length - 1);
      return { line: ln, vars, out };
    });
  }

  async function trace(code, run) {
    try {
      if (run === 'py') return await tracePy(code);
      if (run === 'js' || run === 'ts' || run === 'web') return /\b(document|window|canvas|ctx)\b/.test(code) ? null : await traceJS(code);
    } catch (e) { console.warn('trace failed', e); }
    return null;
  }

  /* ---------- render ---------- */
  function renderTrace(rows, code) {
    const lines = code.split('\n');
    const box = h('div', { class: 'trace' });
    if (!rows || !rows.length) { box.append(h('p', { class: 'muted small', text: 'No step-by-step view for this one — compare the code with the explanation above.' })); return box; }
    let prev = {};
    const tbl = h('div', { class: 'trace-rows' });
    rows.slice(0, 120).forEach((r, i) => {
      const changed = Object.entries(r.vars || {}).filter(([k, v]) => prev[k] !== v);
      prev = { ...prev, ...r.vars };
      tbl.append(h('div', { class: 'trace-row' },
        h('span', { class: 'trace-n', text: String(i + 1) }),
        h('span', { class: 'trace-l', text: `line ${r.line}` }),
        h('code', { class: 'trace-c', text: (lines[r.line - 1] || '').trim() }),
        h('span', { class: 'trace-v', html: changed.map(([k, v]) => `<b>${esc(k)}</b> = ${esc(v)}`).join(' · ') }),
        h('span', { class: 'trace-o', html: (r.out || []).map((o) => `<span>▸ ${esc(o)}</span>`).join('') })));
    });
    if (rows.length > 120) tbl.append(h('div', { class: 'muted small', text: `…and ${rows.length - 120} more steps` }));
    box.append(h('div', { class: 'trace-head', html: '<span>Step</span><span>Line</span><span>Code</span><span>Values after</span><span>Prints</span>' }), tbl);
    return box;
  }

  /* ---------- bug-fix diff ---------- */
  function markDiff(a, b) {
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    let j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
    const w = (s, cls) => esc(s.slice(0, i)) + `<mark class="${cls}">${esc(s.slice(i, s.length - j))}</mark>` + esc(s.slice(s.length - j));
    return [w(a, 'del'), w(b, 'add')];
  }
  function fixDiff(starter, solution) {
    const A = (starter || '').split('\n'), B = (solution || '').split('\n');
    const box = h('div', { class: 'fixdiff' });
    const n = Math.max(A.length, B.length);
    const changed = [];
    for (let k = 0; k < n; k++) if ((A[k] ?? '').trimEnd() !== (B[k] ?? '').trimEnd()) changed.push(k);
    if (!changed.length) { box.append(h('p', { class: 'muted small', text: 'Your code matches the fix — check spelling and spacing.' })); return box; }
    // when lines were added or removed, show the fixed version with changed lines highlighted
    const sameShape = A.length === B.length;
    const show = new Set(); changed.forEach((k) => [k - 1, k, k + 1].forEach((x) => x >= 0 && x < n && show.add(x)));
    let last = -2;
    [...show].sort((x, y) => x - y).forEach((k) => {
      if (last >= 0 && k > last + 1) box.append(h('div', { class: 'fd-gap', text: '⋯' }));
      last = k;
      if (!changed.includes(k)) { box.append(h('div', { class: 'fd-line', html: `<span class="fd-n">${k + 1}</span><code>${esc(B[k] ?? '')}</code>` })); return; }
      if (sameShape) {
        const [d, a] = markDiff(A[k], B[k]);
        box.append(h('div', { class: 'fd-line fd-del', html: `<span class="fd-n">${k + 1}</span><code>${d}</code>` }), h('div', { class: 'fd-line fd-add', html: `<span class="fd-n">${k + 1}</span><code>${a}</code>` }));
      } else {
        if (A[k] != null) box.append(h('div', { class: 'fd-line fd-del', html: `<span class="fd-n">${k + 1}</span><code>${esc(A[k])}</code>` }));
        if (B[k] != null) box.append(h('div', { class: 'fd-line fd-add', html: `<span class="fd-n">${k + 1}</span><code>${esc(B[k])}</code>` }));
      }
    });
    return box;
  }

  Q.explain = { trace, renderTrace, fixDiff, instrumentJS };
})();
