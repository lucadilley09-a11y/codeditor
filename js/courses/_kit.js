/* Codeditor — helpers for writing lessons.
   Lessons are lists of steps:
     read(title, html)                      – explanation (use pre()/tryit() for code)
     quiz(question, options, answer, why)   – multiple choice
     predict(code, options, answer, why)    – "what will this print?"
     code({ task, starter, solution, hints, check, keep })
   For languages that can't run in a browser, review(rules) builds a check from [regex, message] pairs. */
(() => {
  const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tip = (t) => `<div class="tip"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/></svg><div>${t}</div></div>`;
  const pre = (c) => `<pre>${e(c)}</pre>`;
  const tryit = (c) => `<pre data-try>${e(c)}</pre>`;
  const read = (title, html) => ({ type: 'read', html: `<h4>${title}</h4>${html}` });
  const isCode = (o) => /[<>(){};=[\]"']|^\s*\d/.test(o);
  const quiz = (q, options, answer, explain, wrong) => ({ type: 'quiz', q, options, answer, explain, wrong, mono: options.some(isCode) });
  const predict = (code, options, answer, explain, q) => ({ type: 'predict', code, options, answer, explain, q });
  const code = (o) => ({ type: 'code', ...o });
  const strip = (c) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(^|\s)--(\s.*)?$/gm, '$1').replace(/^\s*#(?!include|!).*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
  // review: every rule is [regex, message]; regexes run on the code with comments removed
  const review = (rules, { keepComments } = {}) => (r) => { const s = keepComments ? r.code : strip(r.code); for (const [re, msg] of rules) { if (typeof re === 'function' ? !re(s, r.code) : !re.test(s)) return msg; } return true; };
  const course = (o) => { (Q.courses = Q.courses || []).push(o); return o; };
  const lines = (r) => r.logs.map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim());
  // compare printed lines with an expected list and explain the first difference
  const expectLines = (r, want) => {
    const got = lines(r).map((l) => l.trim());
    for (let i = 0; i < want.length; i++) if (got[i] !== String(want[i])) return got[i] == null ? `Line ${i + 1} should be “${e(want[i])}”, but nothing more was printed.` : `Line ${i + 1} should be “${e(want[i])}” but was “${e(got[i])}”.`;
    return got.length === want.length || `Print exactly ${want.length} line${want.length > 1 ? 's' : ''} (you printed ${got.length}).`;
  };
  // run a JS solution's function in isolation: fn(code, 'name') -> function or null
  const grab = (code, name) => { try { return new Function(code.replace(/console\.log/g, '(()=>{})') + `\n;return typeof ${name} !== 'undefined' ? ${name} : undefined;`)(); } catch { return undefined; } };
  Q.kit = { e, tip, pre, tryit, read, quiz, predict, code, review, course, lines, expectLines, grab, strip };
})();
