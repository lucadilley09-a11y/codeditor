/* Quill — live Tutor: explains what's under your cursor, recognises patterns, and translates error messages */
(() => {
  const { h, esc, icon, debounce } = Q;
  let root = null, last = null, lastErr = null, pinnedErr = false;

  const PATTERNS = {
    javascript: [
      [/=>/, '=>', 'Arrow function', 'A short way to write a function. <code>(a, b) => a + b</code> takes a and b and returns their sum.', 'const double = n => n * 2;\nbtn.addEventListener("click", () => go());'],
      [/`[^`]*\$\{/, '${ }', 'Template literal', 'Backtick strings can include values with <code>${...}</code> — no more gluing strings with +.', 'const msg = `Hi ${name}, you have ${n} points`;'],
      [/===|!==/, '===', 'Strict equality', '<code>===</code> checks value <b>and</b> type. Prefer it over <code>==</code>, which converts types in surprising ways.', '5 === "5"  // false\n5 == "5"   // true (!)'],
      [/(?<![=!<>])=(?!=|>)/, '=', 'Assignment', 'A single <code>=</code> <b>stores</b> a value. To <b>compare</b>, use <code>===</code>.', 'let x = 5;      // store\nif (x === 5)    // compare'],
      [/\+\+|--/, '++', 'Increment / decrement', '<code>x++</code> adds 1 to x, <code>x--</code> subtracts 1.', 'let lives = 3;\nlives--; // 2'],
      [/\+=|-=|\*=|\/=/, '+=', 'Compound assignment', '<code>x += 5</code> is shorthand for <code>x = x + 5</code>.', 'score += 10;'],
      [/&&|\|\|/, '&& ||', 'Logical operators', '<code>&&</code> = AND (both true), <code>||</code> = OR (either true), <code>!</code> = NOT.', 'if (hasKey && doorLocked) open();'],
      [/\?.*:/, '? :', 'Ternary operator', 'A one-line if/else: <code>condition ? ifTrue : ifFalse</code>.', 'const label = score > 50 ? "win" : "lose";'],
      [/\.\.\.\w/, '...', 'Spread / rest', '<code>...</code> spreads an array/object out, or gathers extra arguments.', 'const all = [...a, ...b];\nfunction sum(...nums) {}'],
      [/\{\s*\w+\s*(,\s*\w+\s*)*\}\s*=/, '{ } =', 'Destructuring', 'Pulls properties out of an object into variables in one go.', 'const { name, age } = user;'],
      [/\/\//, '//', 'Comment', 'Everything after <code>//</code> is ignored by the computer — notes for humans.', '// TODO: add sound'],
      [/%/, '%', 'Remainder (modulo)', '<code>a % b</code> gives what’s left after dividing. Great for “every Nth” and even/odd checks.', '7 % 2  // 1 (odd)\n8 % 2  // 0 (even)'],
    ],
    python: [
      [/:\s*(#.*)?$/, ':', 'Block start', 'A colon starts a block. The lines below must be <b>indented</b> (4 spaces) to belong to it.', 'if hungry:\n    eat()\nprint("done")  # not indented = outside'],
      [/\[[^\]]+ for [^\]]+ in /, '[… for … in …]', 'List comprehension', 'Builds a list in one line: <code>[expression for item in sequence]</code>.', 'squares = [n * n for n in range(5)]'],
      [/\bf["']/, 'f"…"', 'f-string', 'Put variables straight into text with <code>{}</code>.', 'print(f"{name} scored {score}")'],
      [/==|!=/, '==', 'Comparison', '<code>==</code> checks if two values are equal; <code>!=</code> checks they’re different.', 'if answer == 42: ...'],
      [/(?<![=!<>])=(?!=)/, '=', 'Assignment', 'A single <code>=</code> stores a value in a variable. Comparison uses <code>==</code>.', 'age = 12'],
      [/\+=|-=|\*=/, '+=', 'Compound assignment', '<code>x += 1</code> means <code>x = x + 1</code>.', 'score += 10'],
      [/\/\//, '//', 'Floor division', '<code>//</code> divides and rounds down to a whole number.', '7 // 2  # 3'],
      [/%/, '%', 'Remainder (modulo)', 'What’s left after division.', '10 % 3  # 1'],
      [/\*\*/, '**', 'Power', '<code>a ** b</code> is a to the power of b.', '2 ** 10  # 1024'],
      [/#/, '#', 'Comment', 'Python ignores everything after <code>#</code>.', '# this is a note'],
    ],
    css: [
      [/\{/, '{ }', 'Rule block', 'A <b>selector</b> picks elements, then <code>{ property: value; }</code> pairs style them.', 'h1 {\n  color: tomato;\n}'],
      [/^\s*\./, '.class', 'Class selector', 'A dot targets every element with that class.', '.card { padding: 1rem; }'],
      [/^\s*#/, '#id', 'ID selector', 'A hash targets the one element with that id.', '#player { left: 10px; }'],
      [/#[0-9a-f]{3,8}\b/i, '#hex', 'Hex color', 'Colors as red-green-blue in hexadecimal. <code>#ff0000</code> = red.', 'color: #7c5cff;'],
    ],
    html: [
      [/<!--/, '<!-- -->', 'Comment', 'HTML comments aren’t shown on the page.', '<!-- nav goes here -->'],
      [/<\w+[^>]*\s[\w-]+=/, 'attr="…"', 'Attributes', 'Extra settings on a tag, written as <code>name="value"</code>.', '<img src="a.png" alt="A">'],
    ],
  };
  PATTERNS.typescript = [[/:\s*[A-Za-z_]+(\[\])?\s*[=,)]/, ': type', 'Type annotation', 'After a colon you say what type something is. TypeScript checks it for you while you type.', 'let hp: number = 100;\nfunction greet(name: string): string {}'], ...PATTERNS.javascript];
  PATTERNS.scss = PATTERNS.css;

  const TIPS = {
    javascript: ['<kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs your file.', 'Use <code>console.log()</code> everywhere when debugging.', 'Hover a function to see what it expects.', 'Type <code>log</code> then Tab for a console.log snippet.'],
    python: ['Indentation matters — use 4 spaces per level.', 'Type answers for <code>input()</code> in the console’s Input box, separated by <code>;</code>.', 'f-strings: <code>f"Hi {name}"</code>.', 'Popular packages like numpy load automatically when imported.'],
    html: ['Type <code>!</code> and press Tab for a full HTML page skeleton (Emmet).', 'Try Emmet: <code>ul>li*3</code> then Tab.', 'Every <code>&lt;img&gt;</code> needs an <code>alt</code>.'],
    css: ['Click a color swatch to open a color picker.', 'Use <code>display: flex</code> to line things up.', '<code>* { box-sizing: border-box; }</code> makes sizing predictable.'],
  };

  function wordAt(text, col, re) {
    let s = col - 1, e = col - 1;
    while (s > 0 && re.test(text[s - 1])) s--;
    while (e < text.length && re.test(text[e])) e++;
    return text.slice(s, e);
  }

  function effectiveLang(info) {
    if (info.langId !== 'html') return info.langId;
    const full = Q.app?.editor.get(info.id) || '';
    const lines = full.split('\n');
    let off = 0; for (let i = 0; i < info.line - 1; i++) off += lines[i].length + 1;
    off += info.col - 1;
    const before = full.slice(0, off).toLowerCase();
    if (before.lastIndexOf('<style') > before.lastIndexOf('</style')) return 'css';
    if (before.lastIndexOf('<script') > before.lastIndexOf('</script') && !/<script[^>]*$/.test(before)) return 'javascript';
    return 'html';
  }

  function lookup(info) {
    const lang = effectiveLang(info);
    const dict = Q.tutorData[lang];
    const t = info.lineText;
    let word = wordAt(t, info.col, lang === 'css' || lang === 'scss' ? /[\w-]/ : /[\w$]/);
    if (!word && info.col > 1) word = wordAt(t, info.col - 1, /[\w$-]/);
    let entry = null, key = word;
    if (dict && word) {
      entry = dict[word] || (lang === 'sql' ? dict[word.toUpperCase()] : null) || (lang === 'css' && dict[word.replace(/^-+/, '')]);
      if (!entry && lang === 'python' && word === 'f') entry = dict.f;
      if (!entry && lang === 'css') {
        // property under cursor → try the part before ':' on the line
        const prop = (t.match(/^\s*([\w-]+)\s*:/) || [])[1];
        if (prop && dict[prop] && t.indexOf(prop) <= info.col) { entry = dict[prop]; key = prop; }
      }
    }
    const pats = (PATTERNS[lang] || []).filter((p) => p[0].test(t)).slice(0, 2);
    return { lang, key, entry, pats };
  }

  function docsUrl(lang, word) {
    const q = encodeURIComponent(word);
    if (lang === 'python') return `https://docs.python.org/3/search.html?q=${q}`;
    if (['javascript', 'typescript', 'html', 'css', 'scss'].includes(lang)) return `https://developer.mozilla.org/en-US/search?q=${q}+${lang === 'scss' ? 'css' : lang}`;
    return `https://www.google.com/search?q=${q}+${encodeURIComponent(Q.langs.byId[lang]?.name || lang)}`;
  }

  function card({ cls = '', key, kind, desc, ex, tip, lang, docs = true }) {
    const c = h('div', { class: 'tcard ' + cls });
    c.append(h('div', { class: 'tk', html: `<code>${esc(key)}</code><span class="kind">${esc(kind)}</span>` }));
    c.append(h('p', { html: desc }));
    if (ex) c.append(h('pre', { text: ex }));
    if (tip) c.append(h('div', { class: 'tip', style: { display: 'flex', gap: '8px', color: 'var(--text2)', marginBottom: '10px', fontSize: '12.5px' }, html: `${icon('bulb', 14)}<span>${tip}</span>` }));
    const row = h('div', { class: 'row' });
    if (ex) {
      row.append(h('button', { class: 'btn', html: `${icon('plus', 13)} Insert example`, onclick: () => Q.app.editor.insert(ex + '\n') }));
      row.append(h('button', { class: 'btn ghost', html: `${icon('copy', 13)} Copy`, onclick: () => { navigator.clipboard?.writeText(ex); Q.toast('Copied', 'success', 900); } }));
    }
    if (docs && key) row.append(h('a', { class: 'btn ghost', href: docsUrl(lang, key), target: '_blank', rel: 'noopener', html: `${icon('external', 13)} Docs` }));
    c.append(row);
    return c;
  }

  function render() {
    if (!root) return;
    root.innerHTML = '';
    root.append(h('div', { class: 'tutor-head', html: `<i class="live"></i><span>Live Tutor — follows your cursor</span>` }));
    if (lastErr) {
      root.append(errorCard(lastErr));
      root.append(h('button', { class: 'btn ghost', style: { marginBottom: '12px' }, html: `${icon('close', 13)} Dismiss explanation`, onclick: () => { lastErr = null; pinnedErr = false; render(); } }));
      if (!last) return;
    }
    if (!last) return idle();
    const { lang, key, entry, pats } = lookup(last);
    if (entry) {
      const [kind, desc, ex, tip] = entry;
      root.append(card({ key, kind, desc, ex, tip, lang }));
      Q.learn?.stat('tutorLookups');
    }
    pats.forEach(([, k, name, desc, ex]) => root.append(card({ cls: 'pattern', key: k, kind: name, desc, ex, lang, docs: false })));
    if (!entry && !pats.length) idle(lang);
  }

  function idle(lang) {
    const l = lang || last?.langId;
    const L = Q.langs.byId[l];
    const d = h('div', { class: 'tutor-idle' });
    const hasDict = !!Q.tutorData[l];
    d.innerHTML = `<div class="big">💡</div><p><b>Put your cursor on a ${l === 'html' ? 'tag or attribute' : l === 'css' ? 'property' : 'keyword or function'}</b> and I’ll explain it in plain English${hasDict ? '' : ' (I know the most about HTML, CSS, JavaScript, TypeScript and Python)'}.</p><p>When your code errors, click <b>Explain</b> next to the error in the Console.</p>`;
    const tips = TIPS[l] || TIPS.javascript;
    d.append(h('div', { class: 'section-label', style: { padding: '10px 0 0' }, text: `${L ? L.name + ' ' : ''}tips` }));
    d.append(h('ul', { class: 'tips-list', html: tips.map((t) => `<li>${icon('sparkle', 14)}<span>${t}</span></li>`).join('') }));
    root.append(d);
  }

  /* ---------- Error explainer ---------- */
  const ERRORS = [
    // JavaScript
    [/(\w+) is not defined/, (m) => [`<code>${esc(m[1])}</code> doesn’t exist (yet)`, `You used the name <code>${esc(m[1])}</code>, but JavaScript has never seen it. Usually it’s a typo, the variable was declared somewhere it can’t be seen, or you forgot to create it.`, ['Check the spelling — names are case-sensitive (<code>Score</code> ≠ <code>score</code>).', `Make sure you declared it with <code>let</code>/<code>const</code> before using it.`, m[1] === 'document' || m[1] === 'window' ? 'Plain .js files run without a web page. To use <code>document</code>, link your script from an HTML file with <code>&lt;script src="…"&gt;</code> and run the HTML.' : 'If it’s declared inside <code>{ }</code>, it only exists inside those braces.'], `let score = 0;\nconsole.log(score);`]],
    [/Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading '([^']+)'\))?/, (m) => [`Reading <code>.${esc(m[2] || '…')}</code> of ${m[1]}`, `You tried to get <code>${esc(m[2] || 'a property')}</code> from something that is <code>${m[1]}</code> — there’s nothing there to read from.`, ['If it came from <code>querySelector</code>/<code>getElementById</code>, the element wasn’t found: check the id/class spelling, and make sure the script runs after the HTML (put <code>&lt;script&gt;</code> at the end of body).', 'Log the value right before the error line to see what it really is.', 'Use optional chaining to be safe: <code>obj?.prop</code>.'], `const el = document.getElementById("score");\nif (el) el.textContent = "10";`]],
    [/(\S+) is not a function/, (m) => [`<code>${esc(m[1])}</code> isn’t a function`, `You put <code>()</code> after something to call it, but it isn’t a function. Maybe it’s a typo, a number/string, or the method doesn’t exist on that type.`, ['Check spelling and capitalization (e.g. <code>getElementByID</code> should be <code>getElementById</code>).', 'Methods like <code>map</code>/<code>forEach</code> only exist on arrays — check what type your value is with <code>console.log(typeof x)</code>.'], '']],
    [/Assignment to constant variable/, () => ['Changing a const', 'You declared this with <code>const</code>, which can’t be reassigned.', ['If the value needs to change, declare it with <code>let</code> instead.'], 'let lives = 3;\nlives = 2; // ok with let']],
    [/Unexpected token|Unexpected end of input|missing \) after|Unexpected identifier|Invalid or unexpected token/, (m) => ['Syntax error', 'JavaScript couldn’t understand the structure of your code — something is missing or extra. <i>' + esc(m[0]) + '</i>', ['Look for a missing <code>)</code>, <code>}</code>, <code>]</code> or quote near the line shown (or just above it).', '“Unexpected end of input” almost always means a missing closing <code>}</code>.', 'Use Format Document (Shift+Alt+F) — wrong indentation reveals unbalanced brackets.'], '']],
    [/Identifier '(\w+)' has already been declared/, (m) => ['Declared twice', `<code>${esc(m[1])}</code> was declared with let/const more than once in the same scope.`, ['Remove the second <code>let</code>/<code>const</code> — just assign: <code>x = 5</code>.', 'Or pick a different name.'], '']],
    [/Maximum call stack size exceeded|RecursionError/, () => ['Infinite recursion', 'A function keeps calling itself (directly or indirectly) and never stops.', ['Make sure your recursive function has a <b>base case</b> that returns without calling itself.', 'Check event handlers or setters that trigger themselves.'], 'function countdown(n) {\n  if (n === 0) return; // base case\n  countdown(n - 1);\n}']],
    [/TimeoutError/, () => ['Your code ran too long', 'It probably has a loop that never ends.', ['Check the loop condition actually becomes false at some point.', 'Make sure the loop variable changes inside the loop (e.g. <code>i++</code>).'], 'let i = 0;\nwhile (i < 10) {\n  i++; // without this, it never ends!\n}']],
    // Python
    [/NameError: name '(\w+)' is not defined/, (m) => [`<code>${esc(m[1])}</code> doesn’t exist`, `Python doesn’t know the name <code>${esc(m[1])}</code>.`, ['Check spelling and capitals.', 'Did you assign it before this line?', m[1].match(/^(true|false|null|none)$/i) ? `In Python it’s <code>${{ true: 'True', false: 'False', null: 'None', none: 'None' }[m[1].toLowerCase()]}</code> (capitalized).` : 'Text needs quotes: <code>"hello"</code>, otherwise Python thinks it’s a variable name.'], `name = "Ada"\nprint(name)`]],
    [/IndentationError: (.*)/, (m) => ['Indentation problem', `Python uses indentation to know which lines belong together. <i>${esc(m[1])}</i>`, ['After a line ending in <code>:</code>, indent the next line by 4 spaces.', 'Lines in the same block must line up exactly.', 'Don’t mix tabs and spaces.'], 'if x > 0:\n    print("positive")\n    print("still inside")\nprint("outside")']],
    [/SyntaxError: (.*)/, (m) => ['Syntax error', `Python couldn’t read this line. <i>${esc(m[1])}</i>`, ['Missing <code>:</code> at the end of <code>if</code>/<code>for</code>/<code>def</code>/<code>while</code> lines?', 'Unclosed bracket or quote on this line or the one above?', 'Using <code>=</code> where you meant <code>==</code> in a condition?'], 'if score == 10:\n    print("Perfect!")']],
    [/TypeError: can only concatenate str \(not "(\w+)"\) to str|unsupported operand type\(s\) for \+: '(\w+)' and '(\w+)'/, (m) => ['Mixing text and numbers', 'You tried to <code>+</code> a string and a number together. Python won’t guess which you meant.', ['Convert the number to text: <code>"Score: " + str(score)</code>', 'Or use an f-string: <code>f"Score: {score}"</code>', 'If it came from <code>input()</code>, convert with <code>int()</code> to do math.'], 'age = int(input("Age? "))\nprint(f"Next year you’ll be {age + 1}")']],
    [/TypeError: (.*)/, (m) => ['Type error', `An operation got the wrong kind of value. <i>${esc(m[1])}</i>`, ['Print the values involved with <code>print(type(x))</code> to see their types.', 'Check you’re passing the right number of arguments to functions.'], '']],
    [/ZeroDivisionError/, () => ['Dividing by zero', 'Math doesn’t allow dividing by 0.', ['Check the divisor before dividing: <code>if count != 0:</code>'], 'avg = total / count if count else 0']],
    [/IndexError: (list|string|tuple) index out of range/, (m) => ['Index out of range', `You asked for a position in a ${m[1]} that doesn’t exist. Positions start at 0, so the last one is <code>len(x) - 1</code>.`, ['Use <code>x[-1]</code> for the last item.', 'Loop with <code>for item in x:</code> instead of indexes.'], 'items = ["a", "b"]\nprint(items[1])   # "b"\nprint(items[-1])  # "b"']],
    [/KeyError: (.*)/, (m) => ['Missing dictionary key', `The dictionary has no key ${esc(m[1])}.`, ['Check spelling/case of the key.', 'Use <code>d.get(key, default)</code> to avoid the error.'], 'age = user.get("age", 0)']],
    [/ValueError: invalid literal for int\(\) with base 10: (.*)/, (m) => ['Not a whole number', `<code>int()</code> couldn’t turn ${esc(m[1])} into a number.`, ['Make sure the text only contains digits.', 'Use <code>float()</code> for decimals like "3.5".', 'Wrap it in try/except to handle bad input.'], 'try:\n    n = int(text)\nexcept ValueError:\n    print("Please type a number")']],
    [/AttributeError: '(\w+)' object has no attribute '(\w+)'/, (m) => [`<code>${esc(m[1])}</code> has no <code>.${esc(m[2])}</code>`, `Values of type <code>${esc(m[1])}</code> don’t have a <code>${esc(m[2])}</code> method or property.`, ['Check spelling (e.g. <code>append</code>, not <code>add</code>, for lists).', `Print <code>dir(x)</code> to see what a ${esc(m[1])} can do.`], '']],
    [/ModuleNotFoundError: No module named '([\w.]+)'/, (m) => ['Module not found', `Python couldn’t find a module called <code>${esc(m[1])}</code>.`, ['Check the spelling.', 'Only pure-Python and Pyodide-supported packages work in the browser (numpy, pandas, matplotlib… do).'], '']],
  ];

  function errorCard(err) {
    const { text, lang } = err;
    let found = null;
    for (const [re, fn] of ERRORS) { const m = text.match(re); if (m) { found = fn(m); break; } }
    const c = h('div', { class: 'tcard err' });
    if (!found) {
      c.append(h('div', { class: 'tk', html: `<code>Error</code><span class="kind">${esc(Q.langs.byId[lang]?.name || '')}</span>` }));
      c.append(h('p', { html: `<b>What it says:</b> ${esc(text.split('\n').pop())}` }));
      c.append(h('p', { html: 'Read the last line of the message — it names the problem. The line number tells you <i>where</i> it noticed; the real mistake is often on that line or just above it.' }));
      c.append(h('a', { class: 'btn ghost', href: `https://www.google.com/search?q=${encodeURIComponent(text.split('\n').pop() + ' ' + (Q.langs.byId[lang]?.name || ''))}`, target: '_blank', rel: 'noopener', html: `${icon('external', 13)} Search the web` }));
      return c;
    }
    const [title, what, fixes, ex] = found;
    c.append(h('div', { class: 'tk', html: `<code>Error explained</code><span class="kind">${esc(Q.langs.byId[lang]?.name || '')}</span>` }));
    c.append(h('h4', { html: title, style: { margin: '2px 0 8px', color: 'var(--text)' } }));
    c.append(h('p', { html: what }));
    c.append(h('div', { class: 'section-label', style: { padding: '2px 0 6px' }, text: 'How to fix it' }));
    c.append(h('ul', { style: { margin: '0 0 10px', paddingLeft: '18px', color: 'var(--text2)', lineHeight: 1.6 }, html: fixes.map((f) => `<li>${f}</li>`).join('') }));
    if (ex) { c.append(h('div', { class: 'section-label', style: { padding: '2px 0 6px' }, text: 'Example' })); c.append(h('pre', { text: ex })); }
    c.append(h('p', { style: { fontSize: '12px', color: 'var(--muted)', margin: 0 }, html: `Original: <code>${esc(text.split('\n').pop().slice(0, 160))}</code>` }));
    return c;
  }

  Q.tutor = {
    init(el) { root = el; render(); },
    onCursor: debounce((info) => { last = info; if (!pinnedErr) lastErr = null; if (Q.app?.settings.rview === 'tutor') render(); }, 140),
    refresh: render,
    clearError() { lastErr = null; pinnedErr = false; render(); },
    explainError(text, lang) { lastErr = { text, lang }; pinnedErr = true; render(); Q.learn?.badge('debugger'); },
    explainText: (text) => { for (const [re] of ERRORS) if (re.test(text)) return true; return false; },
    errorHtml: (text, lang) => errorCard({ text, lang }),
    lookupWord(lang, word) { return Q.tutorData[lang]?.[word] || null; },
  };
})();
