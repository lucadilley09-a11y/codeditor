/* Quill — live Tutor: explains what's under your cursor, recognises patterns, and translates error messages */
(() => {
  const { h, esc, icon, debounce } = Q;
  let root = null, last = null, lastErr = null, lastCounted = '';

  // Safe dictionary lookup (never returns inherited things like "constructor" or "toString")
  const own = (obj, k) => (obj && k && Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : null);

  /* =====================================================================
     Line scanner: knows whether a column is code, inside a string, or a comment
     ===================================================================== */
  const LINE_CM = { javascript: '//', typescript: '//', c: '//', cpp: '//', csharp: '//', java: '//', rust: '//', go: '//', kotlin: '//', swift: '//', scss: '//', php: '//', python: '#', ruby: '#', shell: '#', yaml: '#', lua: '--', sql: '--' };
  const BLOCK_CM = new Set(['javascript', 'typescript', 'c', 'cpp', 'csharp', 'java', 'rust', 'go', 'kotlin', 'swift', 'scss', 'php', 'css', 'sql']);
  const QUOTES = { javascript: '"\'`', typescript: '"\'`', go: '"\'`', python: '"\'', css: '"\'', scss: '"\'', html: '"\'', sql: '\'"' };

  function scan(text, lang) {
    const n = text.length;
    const ctx = new Array(n).fill('code');
    const tag = new Array(n).fill(false);
    const lc = LINE_CM[lang];
    const quotes = QUOTES[lang] || '"\'';
    // whole-line block-comment continuation like " * foo" or "/* ..."
    if (BLOCK_CM.has(lang) && /^\s*\*(\s|\/|$)/.test(text)) { ctx.fill('comment'); return { ctx, tag, code: '' }; }
    const stack = []; // string frames: {q, fmt}
    let i = 0, inTag = false, blockEnd = null;
    while (i < n) {
      const ch = text[i];
      const top = stack[stack.length - 1];
      if (blockEnd) { ctx[i] = 'comment'; if (text.startsWith(blockEnd, i)) { for (let k = 0; k < blockEnd.length; k++) ctx[i + k] = 'comment'; i += blockEnd.length; blockEnd = null; continue; } i++; continue; }
      if (top && top.q) {
        // inside a string
        ctx[i] = 'string'; tag[i] = inTag;
        if (ch === '\\' && lang !== 'html' && lang !== 'css') { ctx[i + 1] = 'string'; i += 2; continue; }
        if (ch === top.q) { stack.pop(); i++; continue; }
        if (top.fmt === 'js' && ch === '$' && text[i + 1] === '{') { ctx[i + 1] = 'string'; stack.push({ code: true }); i += 2; continue; }
        if (top.fmt === 'py' && ch === '{') { if (text[i + 1] === '{') { ctx[i + 1] = 'string'; i += 2; continue; } stack.push({ code: true }); i++; continue; }
        i++; continue;
      }
      // code (top-level or inside ${ } / { } of a template / f-string)
      if (top && top.code && ch === '}') { stack.pop(); ctx[i] = 'string'; i++; continue; }
      tag[i] = inTag;
      if (lang === 'html') {
        if (text.startsWith('<!--', i)) { blockEnd = '-->'; continue; }
        if (!inTag && ch === '<' && /[a-zA-Z/!]/.test(text[i + 1] || '')) { inTag = true; tag[i] = true; i++; continue; }
        if (inTag && ch === '>') { tag[i] = true; inTag = false; i++; continue; }
        if (inTag && (ch === '"' || ch === "'")) { stack.push({ q: ch }); ctx[i] = 'string'; tag[i] = true; i++; continue; }
        i++; continue;
      }
      if (lc && text.startsWith(lc, i)) { for (let k = i; k < n; k++) ctx[k] = 'comment'; break; }
      if (BLOCK_CM.has(lang) && text.startsWith('/*', i)) { blockEnd = '*/'; ctx[i] = ctx[i + 1] = 'comment'; i += 2; continue; }
      if (quotes.includes(ch)) {
        let fmt = null;
        if (ch === '`' && (lang === 'javascript' || lang === 'typescript')) fmt = 'js';
        if (lang === 'python' && /[fF]/.test(text[i - 1] || '') && !/\w/.test(text[i - 2] || '')) fmt = 'py';
        if (lang === 'python' && /[rRbBuU]?[fF][rR]?$/.test(text.slice(Math.max(0, i - 2), i)) && !/\w/.test(text[i - 3] || '')) fmt = 'py';
        stack.push({ q: ch, fmt }); ctx[i] = 'string'; i++; continue;
      }
      i++;
    }
    // code-only version of the line: strings blanked, comments removed
    let code = '';
    for (let k = 0; k < n; k++) code += ctx[k] === 'code' ? text[k] : ctx[k] === 'string' ? (text[k] === '"' || text[k] === "'" || text[k] === '`' ? text[k] : ' ') : '';
    return { ctx, tag, code };
  }

  /* =====================================================================
     Patterns: recognised constructs on the current line
     raw: test against the full line (incl. strings/comments) instead of code only
     ===================================================================== */
  const P = (re, key, name, desc, ex, opts = {}) => ({ re, key, name, desc, ex, ...opts });
  const PATTERNS = {
    javascript: [
      P(/=>/, '=>', 'Arrow function', 'A short way to write a function. <code>(a, b) => a + b</code> takes a and b and returns their sum.', 'const double = (n) => n * 2;\nbtn.addEventListener("click", () => go());'),
      P(/`[^`]*\$\{/, '${ }', 'Template literal', 'Backtick strings can include values with <code>${...}</code> — no more gluing strings together with +.', 'const msg = `Hi ${name}, you have ${n} points`;', { raw: true }),
      P(/===|!==/, '===', 'Strict equality', '<code>===</code> checks value <b>and</b> type. Prefer it over <code>==</code>, which converts types in surprising ways.', '5 === "5"  // false\n5 == "5"   // true (!)'),
      P(/(?<![=!<>==])==(?!=)|!=(?!=)/, '==', 'Loose equality', '<code>==</code> converts types before comparing, which causes surprises. Use <code>===</code> (and <code>!==</code>) instead.', '0 == ""    // true (!)\n0 === ""   // false'),
      P(/(?<![=!<>+\-*/%&|^?])=(?![=>])/, '=', 'Assignment', 'A single <code>=</code> <b>stores</b> a value. To <b>compare</b> two values, use <code>===</code>.', 'let x = 5;      // store\nif (x === 5) {} // compare'),
      P(/\+\+|--/, '++', 'Increment / decrement', '<code>x++</code> adds 1 to x; <code>x--</code> subtracts 1.', 'let lives = 3;\nlives--; // 2'),
      P(/[+\-*/%]=(?!=)/, '+=', 'Compound assignment', '<code>x += 5</code> is shorthand for <code>x = x + 5</code>. Works with <code>-= *= /= %=</code> too.', 'score += 10;'),
      P(/&&|\|\|/, '&& ||', 'Logical operators', '<code>&&</code> = AND (both true), <code>||</code> = OR (at least one true), <code>!</code> = NOT.', 'if (hasKey && !doorOpen) open();'),
      P(/\?\?/, '??', 'Nullish coalescing', '<code>a ?? b</code> uses <code>b</code> only when <code>a</code> is null or undefined.', 'const name = input ?? "Guest";'),
      P(/\?\./, '?.', 'Optional chaining', '<code>a?.b</code> reads <code>b</code> only if <code>a</code> exists, instead of crashing.', 'const city = user?.address?.city;'),
      P(/(?<![?.])\?(?![?.:])[^:]*:/, '? :', 'Ternary operator', 'A one-line if/else: <code>condition ? valueIfTrue : valueIfFalse</code>.', 'const label = score > 50 ? "win" : "lose";'),
      P(/\.\.\.[\w[{]/, '...', 'Spread / rest', '<code>...</code> spreads an array or object out, or gathers extra arguments into an array.', 'const all = [...a, ...b];\nfunction sum(...nums) {}'),
      P(/(const|let|var)\s*[{[]/, '{ } =', 'Destructuring', 'Pulls values out of an object or array into separate variables in one go.', 'const { name, age } = user;\nconst [first, second] = list;'),
      P(/%/, '%', 'Remainder (modulo)', '<code>a % b</code> gives what’s left over after dividing. Great for even/odd checks and “every Nth time”.', '7 % 2  // 1 (odd)\n8 % 2  // 0 (even)'),
    ],
    python: [
      P(/:\s*$/, ':', 'Block start', 'A colon starts a block. The lines below it must be <b>indented</b> (4 spaces) to belong to it.', 'if hungry:\n    eat()\nprint("done")  # not indented = outside the if'),
      P(/\[[^\]]+\bfor\b[^\]]+\bin\b/, '[… for … in …]', 'List comprehension', 'Builds a list in one line: <code>[expression for item in sequence]</code>, optionally with <code>if</code>.', 'squares = [n * n for n in range(5)]\nevens = [n for n in nums if n % 2 == 0]'),
      P(/(^|[^\w])[rRbB]?[fF][rR]?["']/, 'f"…"', 'f-string', 'An f-string puts values straight into text: anything inside <code>{ }</code> is evaluated.', 'print(f"{name} scored {score}")', { raw: true }),
      P(/==|!=/, '==', 'Comparison', '<code>==</code> checks if two values are equal; <code>!=</code> checks they’re different.', 'if answer == 42:\n    print("Correct!")'),
      P(/(?<![=!<>+\-*/%&|^:])=(?!=)/, '=', 'Assignment', 'A single <code>=</code> stores a value in a variable (or passes a named argument, like <code>end=""</code>). Comparing uses <code>==</code>.', 'age = 12\nprint("hi", end="")'),
      P(/[+\-*/%]=(?!=)/, '+=', 'Compound assignment', '<code>x += 1</code> means <code>x = x + 1</code>. Python has no <code>++</code>.', 'score += 10'),
      P(/\/\//, '//', 'Floor division', '<code>//</code> divides and rounds down to a whole number.', '7 // 2   # 3\n7 / 2    # 3.5'),
      P(/\*\*/, '**', 'Power', '<code>a ** b</code> is a to the power of b.', '2 ** 10  # 1024'),
      P(/(?<![\w"'])%(?!\s*\()/, '%', 'Remainder (modulo)', 'What’s left over after dividing.', '10 % 3  # 1'),
      P(/\blambda\b/, 'lambda', 'Lambda', 'A tiny unnamed function written on one line.', 'double = lambda n: n * 2'),
    ],
    css: [
      P(/\{/, '{ }', 'Rule', 'A <b>selector</b> picks elements, then <code>property: value;</code> pairs inside <code>{ }</code> style them.', 'h1 {\n  color: tomato;\n}'),
      P(/^\s*\.[\w-]/, '.class', 'Class selector', 'A dot targets every element with that class.', '.card { padding: 1rem; }'),
      P(/^\s*#[\w-]+\s*[{,]/, '#id', 'ID selector', 'A hash targets the one element with that id.', '#player { left: 10px; }'),
      P(/:\s*#[0-9a-f]{3,8}\b/i, '#hex', 'Hex color', 'A color written as red-green-blue in hexadecimal: <code>#ff0000</code> is red, <code>#00ff00</code> green.', 'color: #7c5cff;', { raw: true }),
      P(/var\(--/, 'var(--x)', 'CSS variable', 'Reuses a value you defined once with <code>--name: value</code>.', ':root { --brand: #7c5cff; }\nbutton { background: var(--brand); }'),
    ],
    html: [
      P(/<\w+[^>]*\s[\w-]+=/, 'name="value"', 'Attributes', 'Extra settings on a tag, written as <code>name="value"</code> inside the opening tag.', '<img src="cat.png" alt="A cat">'),
    ],
  };
  PATTERNS.typescript = [P(/\w\??\s*:\s*[A-Za-z_][\w<>[\]|, ]*\s*[=,);{]/, ': type', 'Type annotation', 'After a colon you say what type something is. TypeScript checks it for you as you type.', 'let hp: number = 100;\nfunction greet(name: string): string {}'), ...PATTERNS.javascript];
  PATTERNS.scss = PATTERNS.css;
  const COMMENT_CARD = {
    html: ['<!-- -->', 'HTML comment', 'Comments aren’t shown on the page — they’re notes for people reading the code.', '<!-- navigation goes here -->'],
    css: ['/* */', 'Comment', 'CSS ignores everything between <code>/*</code> and <code>*/</code>.', '/* main colors */'],
    python: ['#', 'Comment', 'Python ignores everything after <code>#</code> on a line. Use comments to explain <i>why</i> your code does something.', '# the player starts with 3 lives\nlives = 3'],
    lua: ['--', 'Comment', 'Lua ignores everything after <code>--</code>.', '-- spawn enemies'], sql: ['--', 'Comment', 'SQL ignores everything after <code>--</code>.', '-- top players'],
    _: ['//', 'Comment', 'Everything after <code>//</code> (or between <code>/*</code> and <code>*/</code>) is ignored by the computer — notes for humans.', '// TODO: add sound effects'],
  };
  COMMENT_CARD.ruby = COMMENT_CARD.shell = COMMENT_CARD.yaml = COMMENT_CARD.python;

  // Words that mean something different after a dot (e.g. map.get vs the "get" keyword)
  const MEMBER = {
    javascript: {
      get: ['method', '<code>.get(key)</code> reads a value from a Map (or other collections like URLSearchParams).', 'const ages = new Map();\nages.set("Ada", 36);\nages.get("Ada"); // 36'],
      set: ['method', '<code>.set(key, value)</code> stores a value in a Map.', 'scores.set("Ada", 90);'],
      has: ['method', '<code>.has(x)</code> checks whether a Map or Set contains something.', 'seen.has("apple") // true or false'],
      delete: ['method', '<code>.delete(x)</code> removes an entry from a Map or Set.', 'seen.delete("apple");'],
      catch: ['method', '<code>.catch()</code> runs if a Promise fails.', 'fetch(url)\n  .then((r) => r.json())\n  .catch((err) => console.error(err));'],
      finally: ['method', '<code>.finally()</code> runs when a Promise settles, success or failure.', 'load().finally(() => hideSpinner());'],
      default: ['property', 'The <code>default</code> export of a module.', 'import("./mod.js").then((m) => m.default());'],
      for: null, if: null, new: null, class: null, this: null, constructor: null,
    },
  };
  MEMBER.typescript = MEMBER.javascript;

  // Which lesson teaches a word: lang -> lessonRef -> words
  const LESSONS = {
    javascript: { 'js/hello': 'console log', 'js/vars': 'let const var', 'js/strings': 'toUpperCase trim split length slice includes', 'js/if': 'if else switch case default', 'js/loops': 'for while do break continue of', 'js/functions': 'function return', 'js/arrays': 'push pop Array indexOf', 'js/objects': 'Object', 'js/methods': 'map filter reduce forEach find some every', 'js/classes': 'class constructor new this extends super static', 'dom/select': 'document querySelector querySelectorAll getElementById textContent innerHTML style classList', 'dom/events': 'addEventListener', 'dom/create': 'createElement append', 'game/draw': 'canvas getContext fillRect fillStyle', 'game/loop': 'requestAnimationFrame clearRect' },
    typescript: { 'ts/types': 'number string boolean any unknown', 'ts/fns': 'void never', 'ts/interfaces': 'interface readonly implements', 'ts/unions': 'type generic keyof' },
    python: { 'py/print': 'print', 'py/vars': 'True False None type', 'py/strings': 'f upper lower strip split join replace format', 'py/input': 'input int str float', 'py/if': 'if elif else and or not', 'py/loops': 'for while range in break continue enumerate', 'py/functions': 'def return lambda pass', 'py/lists': 'list append pop sort sorted len sum max min', 'py/dicts': 'dict get items keys', 'py/classes': 'class self __init__' },
    html: { 'html/tags': 'h1 h2 h3', 'html/text': 'p strong em br', 'html/links': 'a img href src alt', 'html/lists': 'ul ol li', 'html/skeleton': 'html head body title meta DOCTYPE link script style', 'html/forms': 'form input label button textarea select placeholder type', 'html/semantic': 'header nav main footer section article div span' },
    css: { 'css/rules': 'color background background-color', 'css/box': 'margin padding border border-radius box-sizing width height', 'css/classes': 'class id', 'css/text': 'font-family font-size font-weight text-align line-height', 'css/flex': 'display flex justify-content align-items flex-direction gap', 'css/grid': 'grid grid-template-columns fr', 'css/hover': 'hover transition transform animation keyframes' },
  };
  const lessonIndex = {};
  Object.entries(LESSONS).forEach(([lang, map]) => { lessonIndex[lang] = {}; Object.entries(map).forEach(([ref, words]) => words.split(' ').forEach((w) => (lessonIndex[lang][w] = ref))); });
  lessonIndex.scss = lessonIndex.css;
  function lessonFor(lang, word) {
    const ref = own(lessonIndex[lang], word) || (lang === 'typescript' ? own(lessonIndex.javascript, word) : null);
    if (!ref || !Q.learn) return null;
    const [cid, lid] = ref.split('/');
    const course = Q.learn.courses.find((c) => c.id === cid); const lesson = course?.lessons.find((l) => l.id === lid);
    return lesson ? { course, lesson, done: !!Q.learn.state.done[ref] } : null;
  }

  const TIPS = {
    javascript: ['<kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs your file.', 'Use <code>console.log()</code> everywhere when debugging.', 'Hover a function to see what it expects.', 'Type <code>log</code> and pick the suggestion for a console.log snippet.'],
    typescript: ['Red squiggles are type errors — hover them to read the message.', 'Let TypeScript infer simple types: <code>let n = 5</code> is already a number.', 'Prefer <code>unknown</code> over <code>any</code>.'],
    python: ['Indentation matters — use 4 spaces per level.', 'Type answers for <code>input()</code> in the console’s Input box, separated by <code>;</code>.', 'f-strings: <code>f"Hi {name}"</code>.', 'Packages like numpy load automatically when you import them.'],
    html: ['Type <code>!</code> and press Tab for a full HTML page skeleton (Emmet).', 'Try Emmet: <code>ul>li*3</code> then Tab.', 'Every <code>&lt;img&gt;</code> needs an <code>alt</code>.'],
    css: ['Click a color swatch to open a color picker.', 'Use <code>display: flex</code> to line things up.', '<code>* { box-sizing: border-box; }</code> makes sizing predictable.'],
    markdown: ['<code>#</code> makes a heading, <code>**bold**</code>, <code>*italic*</code>.', 'Lists start with <code>-</code> or <code>1.</code>', 'The preview on the right updates as you type.'],
    general: ['<kbd>Ctrl</kbd>+<kbd>P</kbd> jumps to any file.', '<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> opens every command.', 'Open <b>Learn</b> on the left for a tour of this language.'],
  };
  TIPS.scss = TIPS.css;

  /* =====================================================================
     Lookup
     ===================================================================== */
  function wordAt(text, col, re) {
    let s = col - 1, e = col - 1;
    while (s > 0 && re.test(text[s - 1])) s--;
    while (e < text.length && re.test(text[e])) e++;
    return { word: text.slice(s, e), start: s };
  }

  function effectiveLang(info) {
    if (info.langId !== 'html') return info.langId;
    const full = Q.app?.editor.get(info.id) || '';
    const lines = full.split('\n');
    let off = 0; for (let i = 0; i < info.line - 1 && i < lines.length; i++) off += lines[i].length + 1;
    off += info.col - 1;
    const before = full.slice(0, off).toLowerCase();
    if (before.lastIndexOf('<style') > before.lastIndexOf('</style') && /<style[^>]*>/.test(before.slice(before.lastIndexOf('<style')))) return 'css';
    const so = before.lastIndexOf('<script');
    if (so > before.lastIndexOf('</script') && /<script[^>]*>/.test(before.slice(so)) && !/<script[^>]*\bsrc=/.test(before.slice(so))) return 'javascript';
    return 'html';
  }

  function lookup(info) {
    const lang = effectiveLang(info);
    const dict = Q.tutorData[lang];
    const t = info.lineText || '';
    const sc = scan(t, lang);
    const wre = lang === 'css' || lang === 'scss' ? /[\w-]/ : /[\w$]/;
    let { word, start } = wordAt(t, info.col, wre);
    if (!word && info.col > 1) ({ word, start } = wordAt(t, info.col - 1, wre));
    const where = word ? sc.ctx[start] : sc.ctx[Math.max(0, Math.min(info.col - 1, t.length - 1))] || 'code';
    const res = { lang, key: word, entry: null, pats: [], where, note: null };

    if (where === 'comment') {
      const todo = /\b(TODO|FIXME|NOTE|HACK|BUG)\b/.test(t);
      const c = COMMENT_CARD[lang] || COMMENT_CARD._;
      res.pats.push(P(null, c[0], c[1], c[2] + (todo ? ' Words like <code>TODO</code> and <code>FIXME</code> mark things to come back to — the TODO Highlighter extension makes them stand out.' : ''), c[3]));
      return res;
    }
    if (where === 'string' && !(lang === 'html' && !sc.tag[start])) {
      // inside a string: explain strings, unless it's an HTML attribute value
      res.note = lang === 'html' ? null : 'string';
    } else if (dict && word) {
      const prev = t[start - 1];
      if (lang === 'html') {
        // only tags/attributes inside < >, never the visible page text
        if (sc.tag[start]) {
          const isName = /<[!/]?\s*$/.test(t.slice(0, start));
          const w = word.toLowerCase() === 'doctype' ? 'DOCTYPE' : word.toLowerCase();
          let e = null;
          if (isName) { e = own(dict, w); if (e && e[0] !== 'tag' && e[0] !== 'declaration') e = null; }
          else { e = own(Q.tutorData.htmlAttr, w) || own(dict, w); if (e && e[0] !== 'attribute') e = /^on\w+/.test(w) ? own(Q.tutorData.htmlAttr, 'onclick') : /^data-/.test(w) ? own(Q.tutorData.htmlAttr, 'data') : null; }
          if (!e && !isName && /^on\w+$/.test(w)) e = own(Q.tutorData.htmlAttr, 'onclick');
          if (!e && !isName && /^data-/.test(w)) e = own(Q.tutorData.htmlAttr, 'data');
          if (e) { res.entry = e; res.key = w; }
        }
      } else if (lang === 'css' || lang === 'scss') {
        let w = word.replace(/^-(webkit|moz|ms|o)-/, '').replace(/^-+/, '');
        const unit = w.match(/^[\d.]+([a-z%]+)$/i);
        if (unit) w = unit[1];
        res.entry = own(dict, w); res.key = w;
        if (!res.entry) {
          const isSelector = !/:/.test(t.slice(0, start)) || /^\s*[^:]*\{/.test(t) || /^\s*[\w.#\-\s,>+~[\]="]*$/.test(t);
          const tagE = own(Q.tutorData.html, w);
          if (isSelector && tagE && tagE[0] === 'tag' && prev !== '.' && prev !== '#') {
            res.entry = ['selector', `This selector styles every <code>&lt;${esc(w)}&gt;</code> element on the page. ${tagE[1]}`, `${w} {\n  color: tomato;\n}`];
          } else {
            const prop = (t.match(/^\s*([\w-]+)\s*:/) || [])[1];
            if (prop && own(dict, prop) && start > t.indexOf(prop)) { res.entry = own(dict, prop); res.key = prop; }
          }
        }
      } else {
        const memberDict = own(MEMBER, lang);
        if (prev === '.' && memberDict && Object.prototype.hasOwnProperty.call(memberDict, word)) res.entry = memberDict[word];
        else {
          let e = own(dict, word) || (lang === 'sql' ? own(dict, word.toUpperCase()) : null);
          if (e && prev === '.' && ['keyword', 'operator', 'value', 'declaration', 'type'].includes(e[0])) e = null;
          if (lang === 'python' && word === 'f' && !/^["']/.test(t.slice(start + 1))) e = null; // a variable named f, not an f-string
          res.entry = e;
        }
      }
    }
    // patterns on the code part of the line (strings & comments removed)
    const pats = PATTERNS[lang] || [];
    for (const p of pats) { if (res.pats.length >= 2) break; if (p.re.test(p.raw ? t : sc.code)) res.pats.push(p); }
    if (res.entry) res.pats = res.pats.filter((p) => p.key !== res.key);
    return res;
  }

  function docsUrl(lang, word) {
    const q = encodeURIComponent(word);
    if (lang === 'python') return `https://docs.python.org/3/search.html?q=${q}`;
    if (['javascript', 'typescript', 'html', 'css', 'scss'].includes(lang)) return `https://developer.mozilla.org/en-US/search?q=${q}+${lang === 'scss' ? 'css' : lang}`;
    return `https://www.google.com/search?q=${q}+${encodeURIComponent(Q.langs.byId[lang]?.name || lang)}`;
  }

  function copy(text) {
    const ok = () => Q.toast('Copied', 'success', 900);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
    function fallback() { const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; document.body.append(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (_) { Q.toast('Couldn’t copy — select the example and press Ctrl+C', 'error'); } ta.remove(); }
  }

  function card({ cls = '', key, kind, desc, ex, tip, lang, docs = true, lesson }) {
    const c = h('div', { class: 'tcard ' + cls });
    c.append(h('div', { class: 'tk', html: `<code>${esc(key)}</code><span class="kind">${esc(kind)}</span>` }));
    c.append(h('p', { html: desc }));
    if (ex) c.append(h('pre', { text: ex }));
    if (tip) c.append(h('div', { class: 'ttip', html: `${icon('bulb', 14)}<span>${tip}</span>` }));
    const row = h('div', { class: 'row' });
    if (ex) {
      row.append(h('button', { class: 'btn', title: 'Insert this example on a new line below your cursor', html: `${icon('plus', 13)} Insert example`, onclick: () => Q.app.editor.insertBelow(['python', 'html', 'markdown'].includes(lang) ? ex : ex.replace(/\{ \.\.\. \}/g, '{ /* … */ }').replace(/\.\.\.(?=\s*\))/g, '/* … */')) }));
      row.append(h('button', { class: 'btn ghost', html: `${icon('copy', 13)} Copy`, onclick: () => copy(ex) }));
    }
    if (docs && key) row.append(h('a', { class: 'btn ghost', href: docsUrl(lang, key), target: '_blank', rel: 'noopener', html: `${icon('external', 13)} Docs` }));
    c.append(row);
    if (lesson) c.append(h('button', { class: 'tlesson', html: `${icon('learn', 14)}<span>${lesson.done ? 'Review' : 'Practice this'}: <b>${esc(lesson.lesson.title)}</b> <small>${esc(lesson.course.title)}</small></span>${lesson.done ? icon('check', 14) : icon('arrowRight', 14)}`, onclick: () => Q.learn.open(lesson.course.id, lesson.lesson.id) }));
    return c;
  }

  function render() {
    if (!root) return;
    try { renderInner(); } catch (e) { console.error('Tutor error', e); root.innerHTML = ''; idle(); }
  }
  function renderInner() {
    root.innerHTML = '';
    root.append(h('div', { class: 'tutor-head', html: `<i class="live"></i><span>Live Tutor — follows your cursor</span>` }));
    if (lastErr) {
      root.append(errorCard(lastErr));
      root.append(h('button', { class: 'btn ghost', style: { marginBottom: '12px' }, html: `${icon('close', 13)} Dismiss explanation`, onclick: () => { lastErr = null; render(); } }));
    }
    const active = Q.app?.editor.activeId;
    if (!last || !active || last.id !== active) return lastErr ? null : idle(active ? Q.app.langOfId(active) : null);
    const r = lookup(last);
    if (r.entry) {
      const [kind, desc, ex, tip] = r.entry;
      root.append(card({ key: r.key, kind, desc, ex, tip, lang: r.lang, lesson: lessonFor(r.lang, r.key) }));
      const k = r.lang + ':' + r.key;
      if (k !== lastCounted) { lastCounted = k; Q.learn?.stat('tutorLookups'); }
    }
    if (!r.entry && r.where === 'code' && r.key && /^[A-Za-z_$][\w$]*$/.test(r.key) && ['javascript', 'typescript', 'python'].includes(r.lang)) {
      const src = Q.app.editor.get(last.id) || '';
      const k = r.key.replace(/\$/g, '\\$');
      const kind = new RegExp(`\\b(def|function)\\s+${k}\\b|\\b${k}\\s*=\\s*(async\\s*)?(\\([^)]*\\)|\\w+)\\s*=>|\\b${k}\\s*=\\s*lambda\\b`).test(src) ? 'function' : new RegExp(`\\bclass\\s+${k}\\b`).test(src) ? 'class' : 'variable';
      const uses = (src.match(new RegExp(`(?<![\\w$])${k}(?![\\w$])`, 'g')) || []).length;
      const what = { function: 'a <b>function</b> you defined', class: 'a <b>class</b> you defined', variable: 'a <b>name you created</b> — probably a variable or parameter' }[kind];
      root.append(card({ cls: 'pattern', key: r.key, kind: 'your code', desc: `<code>${esc(r.key)}</code> is ${what}. It appears ${uses} time${uses === 1 ? '' : 's'} in this file. Good names describe what they hold — like <code>${r.lang === 'python' ? 'player_score' : 'playerScore'}</code> rather than <code>x</code>.`, lang: r.lang, docs: false }));
    }
    if (r.note === 'string' && !r.entry) {
      const fmt = r.lang === 'python' ? ['"…"', 'String', 'You’re inside a <b>string</b> — text the computer treats as data, not code. Put values inside text with an f-string: <code>f"Hi {name}"</code>.', 'greeting = "Hello"\nprint(f"{greeting}, {name}!")'] : ['"…"', 'String', 'You’re inside a <b>string</b> — text the computer treats as data, not code. Use backticks and <code>${…}</code> to put values inside text.', 'const msg = `Hello, ${name}!`;'];
      if (['javascript', 'typescript', 'python'].includes(r.lang)) root.append(card({ cls: 'pattern', key: fmt[0], kind: fmt[1], desc: fmt[2], ex: fmt[3], lang: r.lang, docs: false }));
    }
    r.pats.forEach((p) => root.append(card({ cls: 'pattern', key: p.key, kind: p.name, desc: p.desc, ex: p.ex, lang: r.lang, docs: false })));
    if (root.querySelectorAll('.tcard').length === (lastErr ? 1 : 0)) idle(r.lang, r.key);
  }

  function idle(lang, word) {
    const L = Q.langs.byId[lang];
    const hasDict = !!Q.tutorData[lang];
    const what = lang === 'html' ? 'tag or attribute' : lang === 'css' || lang === 'scss' ? 'property or value' : 'keyword or function';
    const d = h('div', { class: 'tutor-idle' });
    if (!lang) d.innerHTML = '<div class="big">💡</div><p><b>Open a file and click on any code</b> — I’ll explain what you’re looking at in plain English.</p>';
    else if (word && hasDict) d.innerHTML = `<div class="big">🤔</div><p>I don’t have a note on <code>${esc(word)}</code> yet — it might be a name you made up yourself (a variable or function), which is totally normal.</p><p>Move your cursor onto a ${what} and I’ll explain it.</p>`;
    else d.innerHTML = `<div class="big">💡</div><p><b>Put your cursor on a ${what}</b> and I’ll explain it in plain English.${hasDict ? '' : ` I know the most about HTML, CSS, JavaScript, TypeScript and Python${L ? `, and the basics of ${esc(L.name)}` : ''}.`}</p>`;
    d.append(h('p', { html: 'When your code errors, click <b>Explain</b> next to the error in the Console.' }));
    const tips = TIPS[lang] || TIPS.general;
    d.append(h('div', { class: 'section-label', style: { padding: '10px 0 0' }, text: `${L && TIPS[lang] ? L.name + ' ' : ''}tips` }));
    d.append(h('ul', { class: 'tips-list', html: tips.map((t) => `<li>${icon('sparkle', 14)}<span>${t}</span></li>`).join('') }));
    root.append(d);
  }

  /* =====================================================================
     Error explainer
     Each entry: [regex, lang group ('js' | 'py'), builder(match, fullText) -> [title, what, fixes[], example]]
     ===================================================================== */
  const did = (t) => { const m = t.match(/Did you mean:? '([^']+)'\??/); return m ? `Python suggests <code>${esc(m[1])}</code> — did you mean that?` : null; };
  const ERRORS = [
    /* ---------- JavaScript / TypeScript ---------- */
    [/is not valid JSON|Unexpected token .* in JSON|JSON\.parse/, 'js', () => ['Invalid JSON', '<code>JSON.parse()</code> was given text that isn’t valid JSON.', ['JSON needs double quotes around keys and strings: <code>{"name": "Ada"}</code>.', 'Log the text before parsing it to see what you really got — it might be an HTML error page or empty.'], 'const data = JSON.parse(\'{"score": 10}\');']],
    [/Cannot access '(\w+)' before initialization/, 'js', (m) => [`<code>${esc(m[1])}</code> used too early`, `You used <code>${esc(m[1])}</code> on a line <b>above</b> where it’s created with <code>let</code>/<code>const</code>.`, ['Move the declaration above the line that uses it.', 'If it’s a function stored in a variable, define it before calling it — or use a <code>function</code> declaration, which is available everywhere.'], `const speed = 5;\nmove(speed); // ok: declared first`]],
    [/([\w$.]+) is not defined/, 'js', (m) => [`<code>${esc(m[1])}</code> doesn’t exist (yet)`, `You used the name <code>${esc(m[1])}</code>, but JavaScript has never seen it. Usually it’s a typo, it was declared somewhere it can’t be seen, or it was never created.`, ['Check the spelling — names are case-sensitive (<code>Score</code> ≠ <code>score</code>).', 'Make sure you declared it with <code>let</code>/<code>const</code> before using it.', m[1] === 'document' || m[1] === 'window' ? 'Plain .js files run without a web page. To use <code>document</code>, link your script from an HTML file with <code>&lt;script src="…"&gt;</code> and run the HTML.' : 'If it’s declared inside <code>{ }</code>, it only exists inside those braces.'], `let score = 0;\nconsole.log(score);`]],
    [/Cannot (read|set) propert(?:y|ies) (?:'([^']+)' )?of (undefined|null)(?: \((?:reading|setting) '([^']+)'\))?/, 'js', (m) => { const prop = m[4] || m[2] || '…'; const rw = m[1] === 'set' ? 'set' : 'read'; return [`${rw === 'set' ? 'Setting' : 'Reading'} <code>.${esc(prop)}</code> on ${m[3]}`, `You tried to ${rw} <code>${esc(prop)}</code> on something that is <code>${m[3]}</code> — there’s nothing there.`, ['If it came from <code>querySelector</code>/<code>getElementById</code>, the element wasn’t found: check the id/class spelling (and the <code>#</code> or <code>.</code> in the selector).', 'Make sure the script runs after the HTML exists — put <code>&lt;script&gt;</code> at the end of <code>&lt;body&gt;</code>.', 'Log the value right before the error line to see what it really is.'], `const el = document.querySelector("#score");\nif (el) el.textContent = "10";`]; }],
    [/([^\s:][^:]*?) is not a function/, 'js', (m) => [`<code>${esc(m[1])}</code> isn’t a function`, `You put <code>( )</code> after something to call it, but it isn’t a function.`, ['Check spelling and capitals — e.g. <code>getElementByID</code> should be <code>getElementById</code>, <code>addEventListner</code> → <code>addEventListener</code>.', 'Methods like <code>map</code>/<code>forEach</code> only exist on arrays. Check the type with <code>console.log(typeof x)</code>.', 'Did you reuse a function’s name for a variable?'], '']],
    [/(\S+) is not iterable/, 'js', (m) => ['Can’t loop over that', `<code>${esc(m[1])}</code> isn’t a list-like thing, so <code>for…of</code> or <code>...</code> can’t go through it.`, ['Make sure it’s an array (or string, Map, Set).', 'To loop over an object’s keys use <code>for (const key in obj)</code> or <code>Object.entries(obj)</code>.'], 'for (const [key, value] of Object.entries(obj)) {\n  console.log(key, value);\n}']],
    [/(\S+) is not a constructor/, 'js', (m) => ['Can’t use “new” here', `<code>${esc(m[1])}</code> can’t be created with <code>new</code>.`, ['Only classes (and constructor functions) work with <code>new</code>.', 'Check the class name is spelled and capitalized correctly.'], '']],
    [/Assignment to constant variable/, 'js', () => ['Changing a const', 'You declared this with <code>const</code>, which can’t be reassigned.', ['If the value needs to change, declare it with <code>let</code> instead.'], 'let lives = 3;\nlives = 2; // fine with let']],
    [/Identifier '(\w+)' has already been declared/, 'js', (m) => ['Declared twice', `<code>${esc(m[1])}</code> was declared with let/const more than once in the same place.`, ['Remove the second <code>let</code>/<code>const</code> and just assign: <code>x = 5</code>.', 'Or give the second one a different name.'], '']],
    [/await is only valid|Unexpected reserved word/, 'js', () => ['await outside async', '<code>await</code> only works inside a function marked <code>async</code>.', ['Add <code>async</code> before the function: <code>async function load() { … }</code>.', 'For callbacks: <code>btn.addEventListener("click", async () => { … })</code>.'], 'async function load() {\n  const res = await fetch(url);\n}']],
    [/missing \) after argument list/, 'js', () => ['Missing )', 'A function call is missing its closing <code>)</code> — or something between the brackets is broken, like a missing comma or quote.', ['Count the <code>(</code> and <code>)</code> on that line.', 'Check commas between arguments and that every string has both quotes.'], 'console.log("Score:", score);']],
    [/Unexpected end of input/, 'js', () => ['Something isn’t closed', 'JavaScript reached the end of your file while still waiting for a closing bracket or quote.', ['Almost always a missing <code>}</code> — every <code>{</code> needs one.', 'Format the document (Shift+Alt+F): the indentation shows where the block went wrong.'], '']],
    [/Invalid or unexpected token/, 'js', () => ['Strange character', 'There’s a character JavaScript doesn’t understand — often an unclosed string or “smart quotes” pasted from a document.', ['Check every string has matching quotes on the same line (use backticks for multi-line text).', 'Replace curly quotes <code>“ ”</code> with straight quotes <code>" "</code>.'], '']],
    [/Invalid left-hand side in assignment/, 'js', () => ['Can’t assign to that', 'Something on the left of <code>=</code> can’t store a value.', ['Comparing? Use <code>===</code> instead of <code>=</code>.', 'Only variables and properties can be on the left of <code>=</code>.'], 'if (score === 10) { … }']],
    [/Unexpected (token|identifier|string|number|template string)/, 'js', (m, t) => ['Syntax error', `JavaScript couldn’t understand the structure of your code. <i>${esc((t.match(/Unexpected[^\n]*/) || [''])[0])}</i>`, ['Look for a missing <code>)</code>, <code>}</code>, <code>]</code>, comma or quote on that line or just above it.', 'Two things side by side with nothing between them (like <code>let a b</code>) usually means a missing operator or comma.', 'Format the document (Shift+Alt+F) — odd indentation reveals unbalanced brackets.'], '']],
    [/Invalid array length/, 'js', () => ['Bad array size', 'You tried to make an array with a negative or non-whole size.', ['Check the number passed to <code>new Array(n)</code> or <code>.length = n</code>.'], '']],
    [/Failed to fetch|NetworkError/, 'js', () => ['Network request failed', '<code>fetch</code> couldn’t reach the server.', ['Check the URL and your internet connection.', 'Many sites block requests from other websites (CORS) — try a public API that allows it.'], '']],
    [/Maximum call stack size exceeded/, 'js', () => ['Infinite recursion', 'A function keeps calling itself (directly or through another function) and never stops.', ['Make sure your recursive function has a <b>base case</b> that returns without calling itself.', 'Check for setters or event handlers that trigger themselves.'], 'function countdown(n) {\n  if (n === 0) return; // base case\n  countdown(n - 1);\n}']],
    /* ---------- Python ---------- */
    [/NameError: name '(\w+)' is not defined/, 'py', (m, t) => { const fix = { true: 'True', false: 'False', null: 'None', none: 'None', nil: 'None', undefined: 'None' }[m[1].toLowerCase()]; return [`<code>${esc(m[1])}</code> doesn’t exist`, `Python doesn’t know the name <code>${esc(m[1])}</code>.`, [did(t), fix ? `In Python it’s <code>${fix}</code> (capitalized).` : 'Check spelling and capitals.', 'Did you assign it <b>before</b> this line?', 'Text needs quotes: <code>"hello"</code> — without them Python thinks it’s a variable name.'].filter(Boolean), `name = "Ada"\nprint(name)`]; }],
    [/UnboundLocalError|local variable '(\w+)' referenced before assignment|cannot access local variable '(\w+)'/, 'py', (m) => { const v = m[1] || m[2] || 'x'; return ['Changing an outside variable', `Inside a function you assigned to <code>${esc(v)}</code>, so Python treats it as a new local variable — but you read it before giving it a value.`, [`To change the outside variable, add <code>global ${esc(v)}</code> at the top of the function.`, 'Better: pass the value in as a parameter and <code>return</code> the new value.'], `score = 0\n\ndef add_point():\n    global score\n    score += 1`]; }],
    [/IndentationError: (.*)|TabError: (.*)/, 'py', (m) => ['Indentation problem', `Python uses indentation to know which lines belong together. <i>${esc(m[1] || m[2])}</i>`, [/expected an indented block/.test(m[1] || '') ? 'The line after one ending in <code>:</code> must be indented (4 spaces). If the block is empty, write <code>pass</code>.' : /unexpected indent/.test(m[1] || '') ? 'This line is indented but shouldn’t be — line it up with the code around it.' : 'Lines in the same block must line up exactly.', 'Don’t mix tabs and spaces.'], 'if x > 0:\n    print("positive")\n    print("still inside")\nprint("outside")']],
    [/SyntaxError: expected ':'/, 'py', () => ['Missing colon', 'Lines that start a block — <code>if</code>, <code>elif</code>, <code>else</code>, <code>for</code>, <code>while</code>, <code>def</code>, <code>class</code> — must end with <code>:</code>.', ['Add a <code>:</code> at the end of that line.'], 'for i in range(3):\n    print(i)']],
    [/SyntaxError: (unterminated string literal|EOL while scanning|unterminated triple-quoted)/, 'py', () => ['Unclosed string', 'A string starts with a quote but never ends.', ['Add the missing closing quote — the same kind you opened with (<code>"</code> or <code>\'</code>).', 'For text with apostrophes, wrap it in double quotes: <code>"don’t"</code>.'], 'msg = "It\'s working!"']],
    [/SyntaxError: '(.)' was never closed|SyntaxError: unexpected EOF/, 'py', (m) => ['Bracket never closed', `An opening <code>${esc(m[1] || '(')}</code> has no matching closing bracket.`, ['Count your brackets on that line — every <code>(</code>, <code>[</code> and <code>{</code> needs a partner.', 'The error line may be <i>after</i> the real mistake — check the line above too.'], 'print(len([1, 2, 3]))']],
    [/Missing parentheses in call to '(\w+)'/, 'py', (m) => ['print needs brackets', `In Python 3, <code>${esc(m[1])}</code> is a function, so it needs parentheses.`, [`Write <code>${esc(m[1])}("…")</code> instead of <code>${esc(m[1])} "…"</code>.`], 'print("Hello!")']],
    [/Maybe you meant '==' or ':=' instead of '='|cannot assign to (comparison|expression|literal)/, 'py', () => ['= vs ==', 'You used a single <code>=</code> (store a value) where Python expected a comparison.', ['To compare, use <code>==</code>: <code>if answer == 42:</code>'], 'if answer == 42:\n    print("Correct!")']],
    [/SyntaxError: (.*)/, 'py', (m) => ['Syntax error', `Python couldn’t read this line. <i>${esc(m[1])}</i>`, ['Missing <code>:</code> at the end of an <code>if</code>/<code>for</code>/<code>def</code>/<code>while</code> line?', 'An unclosed bracket or quote on this line or the one above?', 'Using <code>=</code> where you meant <code>==</code>?'], 'if score == 10:\n    print("Perfect!")']],
    [/EOFError/, 'py', () => ['input() got no answer', 'Your program asked for input, but there was nothing to read.', ['In Quill, type the answers in the console’s <b>Input</b> box <i>before</i> pressing Run, separated by <code>;</code> — for example <code>Ada; 12</code>.'], 'name = input("Name? ")']],
    [/can only concatenate str \(not "(\w+)"\) to str|unsupported operand type\(s\) for \+: '(int|float)' and 'str'|unsupported operand type\(s\) for \+: 'str' and '(int|float)'/, 'py', () => ['Mixing text and numbers', 'You tried to <code>+</code> a string and a number together. Python won’t guess which one you meant.', ['To build text: <code>"Score: " + str(score)</code>, or easier, an f-string: <code>f"Score: {score}"</code>.', 'If the number came from <code>input()</code>, convert it with <code>int()</code> before doing math.'], 'age = int(input("Age? "))\nprint(f"Next year you’ll be {age + 1}")']],
    [/'(<|>|<=|>=)' not supported between instances of '(\w+)' and '(\w+)'/, 'py', (m) => ['Comparing different types', `You compared a <code>${esc(m[2])}</code> with a <code>${esc(m[3])}</code>. Python can’t tell which is bigger.`, ['If one came from <code>input()</code>, convert it: <code>int(input(…))</code>.'], 'guess = int(input("Guess: "))\nif guess > 10: ...']],
    [/'(\w+)' object is not callable/, 'py', (m) => ['Not a function', `You put <code>( )</code> after a <code>${esc(m[1])}</code> value, as if it were a function.`, ['Did you name a variable the same as a function (like <code>list = […]</code> or <code>sum = 0</code>)? Rename the variable.', 'Missing an operator? <code>2(3 + 4)</code> should be <code>2 * (3 + 4)</code>.'], '']],
    [/'(\w+)' object is not subscriptable/, 'py', (m) => ['Can’t use [ ] on that', `<code>[ ]</code> works on lists, strings and dicts — but this is a <code>${esc(m[1])}</code>.`, ['Check that the variable holds what you think: <code>print(type(x))</code>.', 'Calling a function? Use <code>( )</code>, not <code>[ ]</code>.'], '']],
    [/(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:were|was) given/, 'py', (m) => ['Too many arguments', `<code>${esc(m[1])}()</code> expects ${m[2]} argument(s) but got ${m[3]}.`, [+m[3] === +m[2] + 1 ? 'Is it a method in a class? Methods need <code>self</code> as their first parameter: <code>def ' + esc(m[1]) + '(self, …):</code>' : 'Check how many values you pass in the call.'], 'class Dog:\n    def bark(self):\n        print("Woof")']],
    [/(\w+)\(\) missing (\d+) required positional arguments?: (.*)/, 'py', (m) => ['Missing argument', `<code>${esc(m[1])}()</code> needs a value for ${esc(m[3])}.`, ['Pass the missing value when you call it.', 'Or give the parameter a default: <code>def f(x=0):</code>'], '']],
    [/TypeError: (.*)/, 'py', (m) => ['Wrong type of value', `An operation got the wrong kind of value. <i>${esc(m[1])}</i>`, ['Print the values involved with <code>print(type(x))</code> to see their types.', 'Check you’re passing the right number and kind of arguments.'], '']],
    [/ZeroDivisionError/, 'py', () => ['Dividing by zero', 'Math doesn’t allow dividing by 0.', ['Check the divisor before dividing: <code>if count != 0:</code>'], 'average = total / count if count else 0']],
    [/IndexError: (list|string|tuple|range object) (?:assignment )?index out of range/, 'py', (m) => ['Index out of range', `You asked for a position in a ${esc(m[1])} that doesn’t exist. Positions start at 0, so the last one is <code>len(x) - 1</code>.`, ['Use <code>x[-1]</code> for the last item.', 'Loop with <code>for item in x:</code> instead of indexes.', 'To add a new item use <code>.append()</code>, not <code>x[i] = …</code>.'], 'items = ["a", "b"]\nprint(items[-1])  # "b"']],
    [/KeyError: (.*)/, 'py', (m) => ['Missing dictionary key', `The dictionary has no key ${esc(m[1])}.`, ['Check spelling and capitals of the key.', 'Use <code>d.get(key, default)</code> to avoid the error.', 'Check with <code>if key in d:</code> first.'], 'age = user.get("age", 0)']],
    [/ValueError: invalid literal for int\(\) with base 10: (.*)/, 'py', (m) => ['Not a whole number', `<code>int()</code> couldn’t turn ${esc(m[1])} into a number.`, [m[1] === "''" ? 'The text was empty — did <code>input()</code> get an answer? Type it in the console’s Input box.' : 'Make sure the text only contains digits.', 'Use <code>float()</code> for decimals like "3.5".', 'Wrap it in try/except to handle bad input.'], 'try:\n    n = int(text)\nexcept ValueError:\n    print("Please type a number")']],
    [/ValueError: (too many values to unpack|not enough values to unpack)(.*)/, 'py', (m) => ['Unpacking mismatch', `${esc(m[1])}${esc(m[2])} — the number of names on the left doesn’t match the number of values on the right.`, ['Count both sides: <code>a, b = (1, 2)</code> needs exactly 2 values.'], 'x, y = (3, 4)']],
    [/ValueError: (.*)/, 'py', (m) => ['Bad value', `The type was right but the value wasn’t. <i>${esc(m[1])}</i>`, ['Print the value right before this line to see what it is.'], '']],
    [/AttributeError: '(\w+)' object has no attribute '(\w+)'/, 'py', (m, t) => [`<code>${esc(m[1])}</code> has no <code>.${esc(m[2])}</code>`, `Values of type <code>${esc(m[1])}</code> don’t have a <code>${esc(m[2])}</code> method or property.`, [did(t), m[1] === 'list' && m[2] === 'add' ? 'Lists use <code>.append()</code> (sets use <code>.add()</code>).' : m[1] === 'NoneType' ? 'The value is <code>None</code> — often a function that forgot to <code>return</code>, or a method like <code>.sort()</code> that returns nothing.' : 'Check spelling and capitals.', `Print <code>dir(x)</code> to see what a ${esc(m[1])} can do.`].filter(Boolean), '']],
    [/AttributeError: module '(\w+)' has no attribute '(\w+)'/, 'py', (m, t) => ['Not in that module', `The <code>${esc(m[1])}</code> module has nothing called <code>${esc(m[2])}</code>.`, [did(t), 'Check the spelling.', 'Did you name your own file the same as the module (like <code>random.py</code>)? Rename it.'].filter(Boolean), '']],
    [/ModuleNotFoundError: No module named '([\w.]+)'/, 'py', (m) => ['Module not found', `Python couldn’t find a module called <code>${esc(m[1])}</code>.`, ['Check the spelling.', 'In the browser, pure-Python and Pyodide-supported packages work (numpy, pandas, matplotlib and more). Packages that need a real computer, like pygame, don’t.'], '']],
    [/FileNotFoundError/, 'py', () => ['File not found', 'Python couldn’t find that file.', ['In Quill, Python runs in a separate in-browser space and can’t see your project files yet. Put the data straight into your code as a string or list instead.'], 'data = """line one\nline two"""\nfor line in data.splitlines():\n    print(line)']],
    [/RecursionError/, 'py', () => ['Infinite recursion', 'A function keeps calling itself and never stops.', ['Add a <b>base case</b> that returns without calling itself again.'], 'def countdown(n):\n    if n == 0:\n        return\n    countdown(n - 1)']],
    [/AssertionError/, 'py', () => ['Assertion failed', 'An <code>assert</code> statement found something that wasn’t True.', ['Print the values being checked to see what they actually are.'], '']],
    /* ---------- any ---------- */
    [/TimeoutError/, 'any', () => ['Your code ran too long', 'It probably has a loop that never ends.', ['Make sure the loop condition becomes false at some point.', 'Make sure the loop variable changes inside the loop (e.g. <code>i++</code> or <code>n -= 1</code>).'], 'let i = 0;\nwhile (i < 10) {\n  i++; // without this, it never ends!\n}']],
    [/Python could not load/, 'any', () => ['Python didn’t load', 'Python runs in your browser and downloads about 10 MB the first time.', ['Check your internet connection and run again — after the first time it’s cached.'], '']],
  ];

  function match(text, lang) {
    const group = lang === 'python' ? 'py' : ['javascript', 'typescript', 'html'].includes(lang) ? 'js' : null;
    const lines = String(text).split('\n').filter((l) => l.trim());
    const lastLine = lines[lines.length - 1] || '';
    for (const pass of [lastLine, text]) {
      for (const [re, g, fn] of ERRORS) {
        if (group && g !== 'any' && g !== group) continue;
        const m = pass.match(re);
        if (m) return fn(m, String(text));
      }
    }
    return null;
  }

  function errorCard(err) {
    const { text, lang, line, file } = err;
    const found = match(text, lang);
    const lastLine = String(text).split('\n').filter((l) => l.trim()).pop() || '';
    const c = h('div', { class: 'tcard err' });
    const goto = line ? h('button', { class: 'btn', html: `${icon('arrowRight', 13)} Go to line ${line}`, onclick: () => { if (file) { Q.app.isVirtual(file) ? Q.app.activate(file) : Q.app.openFile(file); } setTimeout(() => Q.app.editor.reveal(line), 30); } }) : null;
    if (!found) {
      c.append(h('div', { class: 'tk', html: `<code>Error</code><span class="kind">${esc(Q.langs.byId[lang]?.name || '')}</span>` }));
      c.append(h('p', { html: `<b>What it says:</b> <code>${esc(lastLine.slice(0, 200))}</code>` }));
      c.append(h('p', { html: 'The last line of an error names the problem; the line number tells you <i>where</i> the computer noticed it. The real mistake is usually on that line or just above it.' }));
      const row = h('div', { class: 'row' }, goto, h('a', { class: 'btn ghost', href: `https://www.google.com/search?q=${encodeURIComponent(lastLine.slice(0, 120) + ' ' + (Q.langs.byId[lang]?.name || ''))}`, target: '_blank', rel: 'noopener', html: `${icon('external', 13)} Search the web` }));
      c.append(row);
      return c;
    }
    const [title, what, fixes, ex] = found;
    c.append(h('div', { class: 'tk', html: `<code>Error explained</code><span class="kind">${esc(Q.langs.byId[lang]?.name || '')}${line ? ' · line ' + line : ''}</span>` }));
    c.append(h('h4', { html: title, style: { margin: '2px 0 8px', color: 'var(--text)' } }));
    c.append(h('p', { html: what }));
    c.append(h('div', { class: 'section-label', style: { padding: '2px 0 6px' }, text: 'How to fix it' }));
    c.append(h('ul', { class: 'tfix', html: fixes.map((f) => `<li>${f}</li>`).join('') }));
    if (ex) { c.append(h('div', { class: 'section-label', style: { padding: '2px 0 6px' }, text: 'Example' })); c.append(h('pre', { text: ex })); }
    if (goto) c.append(h('div', { class: 'row', style: { marginBottom: '10px' } }, goto));
    c.append(h('p', { class: 'torig', html: `Original: <code>${esc(lastLine.slice(0, 200))}</code>` }));
    return c;
  }

  Q.tutor = {
    init(el) { root = el; render(); },
    onCursor: debounce((info) => { last = info; if (Q.app?.settings.rview === 'tutor' && !Q.app?.settings.hideRight) render(); }, 140),
    refresh: render,
    clearError() { lastErr = null; render(); },
    explainError(text, lang, where = {}) { lastErr = { text, lang, line: where.line, file: where.file }; render(); Q.learn?.badge('debugger'); },
    canExplain: (text, lang) => !!match(text, lang),
    errorHtml: (text, lang, where = {}) => errorCard({ text, lang, ...where }),
    // exposed for tests
    _lookup: lookup, _scan: scan, _match: match, _show(info) { last = info; render(); },
  };
})();
