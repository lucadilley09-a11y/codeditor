/* Quill — built-in quality-of-life extensions (each can be toggled in the Extensions view) */
(() => {
  const { h, icon, store, debounce, toast, esc } = Q;
  let app = null;

  const LIST = [
    // Appearance
    { id: 'bracketColors', name: 'Bracket Pair Colorizer', desc: 'Colors matching brackets so you can see which ( ) [ ] { } belong together.', icon: 'sparkle', color: '#f472b6', cat: 'Appearance', on: true, flag: true },
    { id: 'indentGuides', name: 'Indent Guides', desc: 'Thin vertical lines that show each indentation level.', icon: 'format', color: '#a78bfa', cat: 'Appearance', on: true, flag: true },
    { id: 'stickyScroll', name: 'Sticky Scroll', desc: 'Keeps the current function/class header pinned at the top while you scroll.', icon: 'arrowRight', color: '#60a5fa', cat: 'Appearance', on: true, flag: true },
    { id: 'minimap', name: 'Minimap', desc: 'A zoomed-out map of your file on the right edge for fast scrolling.', icon: 'sidebar', color: '#22d3ee', cat: 'Appearance', on: true, flag: true },
    { id: 'smoothCaret', name: 'Smooth Caret & Scrolling', desc: 'Animated cursor movement and smooth scrolling.', icon: 'wand', color: '#4ade80', cat: 'Appearance', on: true, flag: true },
    { id: 'colorPreview', name: 'Color Preview & Picker', desc: 'Shows a swatch next to CSS colors — click it for a color picker.', icon: 'palette', color: '#fb923c', cat: 'Appearance', on: true, flag: true },
    { id: 'showWhitespace', name: 'Render Whitespace', desc: 'Shows dots for spaces between words — handy for Python indentation.', icon: 'eye', color: '#94a3b8', cat: 'Appearance', on: false, flag: true },
    // Coding helpers
    { id: 'emmet', name: 'Emmet', desc: 'Type HTML abbreviations like ul>li*3 or div.card and press Tab to expand. Type ! + Tab for a full page.', icon: 'wand', color: '#f97316', cat: 'Coding helpers', on: true },
    { id: 'autoCloseTag', name: 'Auto Close Tag', desc: 'Typing <div> automatically adds the matching </div>.', icon: 'check', color: '#f97316', cat: 'Coding helpers', on: true },
    { id: 'pathComplete', name: 'Path IntelliSense', desc: 'Suggests your project’s file names inside src="…", href="…" and url(…).', icon: 'files', color: '#facc15', cat: 'Coding helpers', on: true },
    { id: 'snippets', name: 'Snippet Pack', desc: 'Shortcuts for common code: log, fn, for, qs, ael, def, ifmain, flexcenter, gameloop and many more.', icon: 'box', color: '#7c5cff', cat: 'Coding helpers', on: true },
    { id: 'hoverTips', name: 'Learning Hover Tips', desc: 'Hover any keyword to see a beginner-friendly explanation from the Tutor.', icon: 'bulb', color: '#22d3ee', cat: 'Coding helpers', on: true },
    { id: 'todoHighlight', name: 'TODO Highlighter', desc: 'Makes TODO, FIXME, NOTE, HACK and BUG comments stand out.', icon: 'flame', color: '#facc15', cat: 'Coding helpers', on: true },
    { id: 'errorLens', name: 'Error Lens', desc: 'Shows error and warning messages right at the end of the line.', icon: 'alert', color: '#f87171', cat: 'Coding helpers', on: true },
    { id: 'bookmarks', name: 'Bookmarks', desc: 'Mark lines with Ctrl+Alt+K, jump between them with Ctrl+Alt+L / Ctrl+Alt+J.', icon: 'star', color: '#facc15', cat: 'Coding helpers', on: true },
    // On save
    { id: 'formatOnSave', name: 'Format on Save', desc: 'Automatically tidies indentation and spacing when you press Ctrl+S.', icon: 'format', color: '#4ade80', cat: 'On save', on: false },
    { id: 'trimOnSave', name: 'Trim Trailing Whitespace', desc: 'Removes invisible spaces at line ends on save.', icon: 'trash', color: '#94a3b8', cat: 'On save', on: true },
    { id: 'runOnSave', name: 'Run on Save', desc: 'Runs JS, TS and Python files every time you save.', icon: 'play', color: '#7c5cff', cat: 'On save', on: false },
    // Productivity
    { id: 'wordCount', name: 'Word & Line Count', desc: 'Shows words and lines of the current file in the status bar.', icon: 'book', color: '#60a5fa', cat: 'Productivity', on: true },
    { id: 'focusTimer', name: 'Focus Timer', desc: 'A 25-minute Pomodoro timer in the status bar. Click to start/pause, right-click to reset.', icon: 'timer', color: '#fb923c', cat: 'Productivity', on: false },
    // Fun
    { id: 'powerMode', name: 'Power Mode', desc: 'Sparks fly from your cursor while you type. Pure fun.', icon: 'flame', color: '#f43f5e', cat: 'Fun', on: false },
    { id: 'keyClicks', name: 'Typewriter Clicks', desc: 'Soft mechanical-keyboard sounds as you type.', icon: 'keyboard', color: '#a78bfa', cat: 'Fun', on: false },
  ];
  const saved = store.get('extensions', {});
  const state = Object.fromEntries(LIST.map((e) => [e.id, saved[e.id] ?? e.on]));
  const isOn = (id) => !!state[id];

  /* ---------------- Emmet ---------------- */
  const SELF = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'col', 'embed', 'wbr']);
  const INLINE = new Set(['a', 'span', 'strong', 'em', 'b', 'i', 'img', 'input', 'button', 'label', 'code', 'small', 'li', 'td', 'th', 'option', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'title', 'br', 'textarea']);
  const TAGS = new Set('a abbr address article aside audio b blockquote body br button canvas caption code col dd details dialog div dl dt em fieldset figure footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input label legend li link main nav ol optgroup option p pre progress script section select small source span strong style sub summary sup table tbody td template textarea tfoot th thead title tr u ul video'.split(' '));
  const DEFAULT_ATTRS = { a: ' href="$H"', img: ' src="$H" alt=""', link: ' rel="stylesheet" href="$H"', script: ' src="$H"', input: ' type="text"', form: ' action=""', label: ' for=""', iframe: ' src="$H"' };
  const LOREM = 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum nihil minima ea fugit natus.';
  const SKELETON = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${1:Document}</title>\n</head>\n<body>\n  $0\n</body>\n</html>';
  const escSn = (s) => s.replace(/\\/g, '\\\\').replace(/\$/g, '\\$').replace(/\}/g, '\\}');

  function emmet(abbr) {
    if (abbr === '!' || abbr === 'html:5') return SKELETON;
    if (/^lorem\d*$/.test(abbr)) { const n = +abbr.slice(5) || 0; return n ? LOREM.split(' ').concat(LOREM.split(' ')).slice(0, n).join(' ').replace(/[.,]$/, '') + '.' : LOREM; }
    if (!/^[a-z.#[]/i.test(abbr)) return null;
    // tokenize into segments + operators, respecting [] and {}
    const parts = []; let buf = '', depth = 0;
    for (const ch of abbr) {
      if (ch === '[' || ch === '{') depth++;
      if (ch === ']' || ch === '}') depth--;
      if (depth === 0 && (ch === '>' || ch === '+' || ch === '^')) { parts.push(buf, ch); buf = ''; } else buf += ch;
    }
    parts.push(buf);
    const segRe = /^([a-z][\w-]*)?((?:[.#][\w$-]+)*)(\[[^\]]*\])?(\{[^}]*\})?(\*\d+)?$/i;
    const root = { children: [] }; const stack = [root]; let last = null;
    for (let i = 0; i < parts.length; i += 2) {
      const seg = parts[i]; const op = parts[i - 1];
      const m = seg.match(segRe); if (!m || !seg) return null;
      const parentHint = op === '>' && last ? last.tag : stack[stack.length - 1].tag;
      let tag = m[1] || ({ ul: 'li', ol: 'li', table: 'tr', tr: 'td', select: 'option' }[parentHint] || 'div');
      if (m[1] && !TAGS.has(tag.toLowerCase()) && !tag.includes('-') && !m[2] && !m[3] && !m[4] && !m[5] && parts.length === 1) return null;
      const node = { tag, cls: [], id: null, attrs: m[3] ? m[3].slice(1, -1) : '', text: m[4] ? m[4].slice(1, -1) : '', count: m[5] ? +m[5].slice(1) : 1, children: [] };
      (m[2].match(/[.#][\w$-]+/g) || []).forEach((x) => (x[0] === '.' ? node.cls.push(x.slice(1)) : (node.id = x.slice(1))));
      if (op === '>' && last) stack.push(last);
      else if (op === '^') { if (stack.length > 1) stack.pop(); }
      stack[stack.length - 1].children.push(node);
      last = node;
    }
    if (parts.length === 1 && !/[.#[{*]/.test(abbr) && !TAGS.has(abbr.toLowerCase())) return null;
    let cursorUsed = false;
    const render = (nodes, indent) => nodes.flatMap((n) => Array.from({ length: n.count }, (_, k) => {
      const num = (s) => s.replace(/\$+/g, (d) => String(k + 1).padStart(d.length, '0'));
      let attrs = '';
      if (n.id) attrs += ` id="${escSn(num(n.id))}"`;
      if (n.cls.length) attrs += ` class="${escSn(num(n.cls.join(' ')))}"`;
      if (n.attrs) attrs += ' ' + n.attrs.split(/\s+(?=[\w-]+(?:=|$))/).map((a) => { const [k2, ...v] = a.split('='); const val = v.join('=').replace(/^["']|["']$/g, ''); return `${k2}="${escSn(num(val))}"`; }).join(' ');
      else if (DEFAULT_ATTRS[n.tag]) attrs += DEFAULT_ATTRS[n.tag].replace('$H', cursorUsed ? '' : (cursorUsed = true, '$1'));
      const pad = '  '.repeat(indent);
      if (SELF.has(n.tag)) return `${pad}<${n.tag}${attrs}>`;
      const text = n.text ? escSn(num(n.text)) : '';
      if (!n.children.length) {
        const inner = text || (cursorUsed ? '' : (cursorUsed = true, '$1'));
        return `${pad}<${n.tag}${attrs}>${inner}</${n.tag}>`;
      }
      const kids = render(n.children, indent + 1).join('\n');
      return `${pad}<${n.tag}${attrs}>${text}\n${kids}\n${pad}</${n.tag}>`;
    })).flat();
    const out = render(root.children, 0).join('\n');
    return out + (cursorUsed ? '' : '$0');
  }

  /* ---------------- Snippets ---------------- */
  const S = (label, insert, detail) => ({ label, insert, detail });
  const SNIP = {
    javascript: [
      S('log', 'console.log(${1});', 'console.log()'), S('fn', 'function ${1:name}(${2}) {\n  $0\n}', 'function'), S('af', '(${1}) => {\n  $0\n}', 'arrow function'),
      S('for', 'for (let ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n  $0\n}', 'for loop'), S('forof', 'for (const ${1:item} of ${2:items}) {\n  $0\n}', 'for…of loop'),
      S('if', 'if (${1:condition}) {\n  $0\n}', 'if'), S('ife', 'if (${1:condition}) {\n  $2\n} else {\n  $0\n}', 'if/else'), S('while', 'while (${1:condition}) {\n  $0\n}', 'while loop'),
      S('qs', 'document.querySelector("${1}")', 'querySelector'), S('qsa', 'document.querySelectorAll("${1}")', 'querySelectorAll'),
      S('ael', '${1:el}.addEventListener("${2:click}", (e) => {\n  $0\n});', 'addEventListener'), S('timeout', 'setTimeout(() => {\n  $0\n}, ${1:1000});', 'setTimeout'),
      S('interval', 'setInterval(() => {\n  $0\n}, ${1:1000});', 'setInterval'), S('class', 'class ${1:Name} {\n  constructor(${2}) {\n    $0\n  }\n}', 'class'),
      S('try', 'try {\n  $1\n} catch (err) {\n  console.error(err);\n}', 'try/catch'), S('fetch', 'const res = await fetch("${1:url}");\nconst data = await res.json();', 'fetch JSON'),
      S('gameloop', 'let last = performance.now();\nfunction loop(now) {\n  const dt = (now - last) / 1000;\n  last = now;\n  update(dt);\n  draw();\n  requestAnimationFrame(loop);\n}\nrequestAnimationFrame(loop);\n\nfunction update(dt) {\n  $0\n}\n\nfunction draw() {\n}', 'game loop'),
      S('rand', 'Math.floor(Math.random() * ${1:10})', 'random integer'), S('map', '${1:arr}.map((${2:x}) => ${0})', 'array.map'), S('filter', '${1:arr}.filter((${2:x}) => ${0})', 'array.filter'),
    ],
    python: [
      S('pr', 'print(${1})', 'print()'), S('fp', 'print(f"${1}")', 'print f-string'), S('def', 'def ${1:name}(${2}):\n    ${0:pass}', 'function'),
      S('for', 'for ${1:item} in ${2:items}:\n    ${0:pass}', 'for loop'), S('fori', 'for ${1:i} in range(${2:10}):\n    ${0:pass}', 'for range'), S('while', 'while ${1:condition}:\n    ${0:pass}', 'while loop'),
      S('if', 'if ${1:condition}:\n    ${0:pass}', 'if'), S('ife', 'if ${1:condition}:\n    ${2:pass}\nelse:\n    ${0:pass}', 'if/else'), S('ifmain', 'if __name__ == "__main__":\n    ${0:main()}', 'main guard'),
      S('class', 'class ${1:Name}:\n    def __init__(self${2}):\n        ${0:pass}', 'class'), S('try', 'try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    print(e)', 'try/except'),
      S('with', 'with open("${1:file.txt}") as f:\n    ${0:data = f.read()}', 'with open'), S('lc', '[${1:x} for ${1:x} in ${2:items}]', 'list comprehension'), S('dc', '{${1:k}: ${2:v} for ${1:k}, ${2:v} in ${3:items}}', 'dict comprehension'),
      S('rand', 'import random\nrandom.randint(${1:1}, ${2:6})', 'random int'),
    ],
    css: [
      S('flexcenter', 'display: flex;\njustify-content: center;\nalign-items: center;', 'center with flexbox'), S('grid3', 'display: grid;\ngrid-template-columns: repeat(${1:3}, 1fr);\ngap: ${2:1rem};', 'grid columns'),
      S('media', '@media (max-width: ${1:600px}) {\n  $0\n}', 'media query'), S('keyframes', '@keyframes ${1:name} {\n  from { $2 }\n  to { $0 }\n}', 'animation'),
      S('transition', 'transition: ${1:all} ${2:0.2s} ${3:ease};', 'transition'), S('reset', '* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}', 'CSS reset'), S('vars', ':root {\n  --${1:brand}: ${2:#7c5cff};\n}', 'CSS variables'),
    ],
    c: [S('main', '#include <stdio.h>\n\nint main(void) {\n    $0\n    return 0;\n}', 'main'), S('pf', 'printf("${1}\\n"${2});', 'printf'), S('for', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    $0\n}', 'for')],
    cpp: [S('main', '#include <iostream>\n\nint main() {\n    $0\n    return 0;\n}', 'main'), S('cout', 'std::cout << ${1} << std::endl;', 'cout'), S('for', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    $0\n}', 'for')],
    java: [S('main', 'public static void main(String[] args) {\n    $0\n}', 'main'), S('sout', 'System.out.println(${1});', 'println'), S('for', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    $0\n}', 'for')],
    csharp: [S('cw', 'Console.WriteLine(${1});', 'WriteLine'), S('mono', 'using UnityEngine;\n\npublic class ${1:NewBehaviour} : MonoBehaviour {\n    void Start() {\n        $0\n    }\n\n    void Update() {\n    }\n}', 'Unity MonoBehaviour')],
    rust: [S('main', 'fn main() {\n    $0\n}', 'main'), S('pl', 'println!("{}", ${1});', 'println!'), S('fn', 'fn ${1:name}(${2}) -> ${3:i32} {\n    $0\n}', 'fn')],
    go: [S('main', 'package main\n\nimport "fmt"\n\nfunc main() {\n    $0\n}', 'main'), S('pl', 'fmt.Println(${1})', 'Println'), S('iferr', 'if err != nil {\n    return err\n}', 'if err')],
    lua: [S('fn', 'local function ${1:name}(${2})\n  $0\nend', 'function'), S('for', 'for ${1:i} = 1, ${2:10} do\n  $0\nend', 'for'), S('pairs', 'for ${1:k}, ${2:v} in pairs(${3:t}) do\n  $0\nend', 'pairs loop')],
    html: [S('lorem', LOREM, 'placeholder text'), S('script:src', '<script src="${1:script.js}"></script>', 'script tag'), S('link:css', '<link rel="stylesheet" href="${1:style.css}">', 'stylesheet link')],
  };
  SNIP.typescript = [...SNIP.javascript, S('interface', 'interface ${1:Name} {\n  ${2:key}: ${3:string};\n}', 'interface'), S('type', 'type ${1:Name} = ${0};', 'type alias')];
  SNIP.scss = SNIP.css;

  /* ---------------- Hover tips (Monaco) ---------------- */
  const toMd = (html) => html.replace(/<code>(.*?)<\/code>/g, '`$1`').replace(/<\/?b>/g, '**').replace(/<\/?i>/g, '_').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  /* ---------------- Sounds ---------------- */
  let audio = null;
  function click() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime, len = 0.03;
      const buf = audio.createBuffer(1, audio.sampleRate * len, audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
      const src = audio.createBufferSource(); src.buffer = buf;
      const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 900;
      const g = audio.createGain(); g.gain.value = 0.35;
      src.connect(f).connect(g).connect(audio.destination); src.start(t);
    } catch (_) {}
  }
  function chime() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784].forEach((fr, i) => { const o = audio.createOscillator(); const g = audio.createGain(); o.frequency.value = fr; g.gain.setValueAtTime(0.0001, audio.currentTime + i * 0.15); g.gain.exponentialRampToValueAtTime(0.2, audio.currentTime + i * 0.15 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + i * 0.15 + 0.5); o.connect(g).connect(audio.destination); o.start(audio.currentTime + i * 0.15); o.stop(audio.currentTime + i * 0.15 + 0.6); });
    } catch (_) {}
  }

  /* ---------------- Power mode sparks ---------------- */
  function sparks() {
    const p = app.editor.cursorCoords(); if (!p) return;
    const colors = ['#7c5cff', '#22d3ee', '#facc15', '#f472b6', '#4ade80'];
    for (let i = 0; i < 6; i++) {
      const s = h('div', { class: 'spark', style: { left: p.x + 'px', top: p.y + 'px', background: colors[(Math.random() * colors.length) | 0] } });
      document.body.append(s);
      const vx = (Math.random() - 0.5) * 60, vy = -Math.random() * 50 - 10;
      s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${vx}px, ${vy + 40}px) scale(.2)`, opacity: 0 }], { duration: 500 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.4,1)' }).onfinish = () => s.remove();
    }
  }

  /* ---------------- Focus timer ---------------- */
  const timer = { left: 25 * 60, running: false, t: null, mode: 'focus' };
  function renderTimer() {
    const el = document.getElementById('sb-timer'); if (!el) return;
    const m = Math.floor(timer.left / 60), s = timer.left % 60;
    el.innerHTML = `${icon('timer', 13)}${timer.mode === 'break' ? 'Break ' : ''}${m}:${String(s).padStart(2, '0')}`;
    el.classList.toggle('running', timer.running);
  }
  function toggleTimer() {
    timer.running = !timer.running;
    clearInterval(timer.t);
    if (timer.running) timer.t = setInterval(() => {
      timer.left--;
      if (timer.left <= 0) {
        chime();
        if (timer.mode === 'focus') { timer.mode = 'break'; timer.left = 5 * 60; toast('Focus session done! Take a 5-minute break. ☕', 'success', 6000); Q.confetti(60); }
        else { timer.mode = 'focus'; timer.left = 25 * 60; timer.running = false; clearInterval(timer.t); toast('Break over — ready for another round?', 'info', 5000); }
      }
      renderTimer();
    }, 1000);
    renderTimer();
  }

  /* ---------------- Bookmarks ---------------- */
  const marks = store.get('bookmarks', {}); // id -> [lines]
  function paintMarks(id) { if (!id || !app.editor.has(id)) return; app.editor.decorate('bm', id, isOn('bookmarks') ? (marks[id] || []).map((line) => ({ line, className: 'bookmark-line', whole: true })) : []); }
  function toggleMark() {
    const id = app.editor.activeId; const c = Q.app && lastCursor; if (!id || !c) return;
    const arr = (marks[id] = marks[id] || []); const i = arr.indexOf(c.line);
    i >= 0 ? arr.splice(i, 1) : arr.push(c.line); arr.sort((a, b) => a - b);
    store.set('bookmarks', marks); paintMarks(id);
    toast(i >= 0 ? `Bookmark removed (line ${c.line})` : `Bookmarked line ${c.line}`, 'info', 1000);
  }
  function jumpMark(dir) {
    const id = app.editor.activeId; const arr = marks[id] || []; if (!arr.length || !lastCursor) return toast('No bookmarks in this file. Add one with Ctrl+Alt+K.', 'info');
    const cur = lastCursor.line;
    const next = dir > 0 ? arr.find((l) => l > cur) ?? arr[0] : [...arr].reverse().find((l) => l < cur) ?? arr[arr.length - 1];
    app.editor.reveal(next);
  }

  /* ---------------- Hooks ---------------- */
  let lastCursor = null;
  const scanTodos = debounce((id) => {
    if (!id || !app.editor.has(id)) return;
    if (!isOn('todoHighlight')) return app.editor.decorate('todo', id, []);
    const lines = (app.editor.get(id) || '').split('\n'); const out = [];
    lines.forEach((l, i) => { const re = /\b(TODO|FIXME|HACK|NOTE|BUG|XXX)\b:?/g; let m; while ((m = re.exec(l))) out.push({ line: i + 1, start: m.index + 1, end: m.index + 1 + m[0].length, className: /FIXME|BUG|XXX/.test(m[1]) ? 'fixme-hl' : m[1] === 'NOTE' ? 'note-hl' : 'todo-hl' }); });
    app.editor.decorate('todo', id, out);
  }, 200);
  function lens(id) {
    if (!id || !app.editor.has(id)) return;
    if (!isOn('errorLens')) return app.editor.decorate('lens', id, []);
    const seen = new Set(); const out = [];
    app.editor.markers(id).sort((a, b) => (a.severity === 'error' ? -1 : 1)).forEach((m) => { if (seen.has(m.line)) return; seen.add(m.line); out.push({ line: m.line, after: '  ● ' + m.msg.split('\n')[0].slice(0, 120), className: 'errlens-' + m.severity }); });
    app.editor.decorate('lens', id, out);
  }
  const countWords = debounce(() => {
    const el = document.getElementById('sb-words'); if (!el) return;
    const id = app.editor.activeId;
    if (!id || !isOn('wordCount')) { el.textContent = ''; return; }
    const t = app.editor.get(id) || '';
    const w = (t.match(/[A-Za-z0-9_']+/g) || []).length;
    el.textContent = `${w} words · ${t.split('\n').length} lines`;
  }, 300);

  function renderStatus() {
    const host = document.getElementById('sb-ext'); if (!host) return;
    host.innerHTML = '';
    if (isOn('wordCount')) { host.append(h('span', { class: 'sbi', id: 'sb-words' })); countWords(); }
    if (isOn('focusTimer')) {
      const b = h('button', { class: 'sbi timer', id: 'sb-timer', title: 'Focus timer — click to start/pause, right-click to reset', onclick: toggleTimer });
      b.oncontextmenu = (e) => { e.preventDefault(); clearInterval(timer.t); Object.assign(timer, { left: 25 * 60, running: false, mode: 'focus' }); renderTimer(); };
      host.append(b); renderTimer();
    }
  }

  function filesFor(prefix, curId) {
    const dir = curId && !app.isVirtual(curId) ? curId.split('/').slice(0, -1).join('/') : '';
    return Q.fs.list().filter((f) => f !== curId).map((f) => (dir && f.startsWith(dir + '/') ? f.slice(dir.length + 1) : dir ? '../'.repeat(dir.split('/').length) + f : f)).filter((f) => f.toLowerCase().startsWith(prefix.toLowerCase()));
  }

  Q.ext = {
    list: LIST, isOn,
    emmet,
    editorFlags() { const o = {}; LIST.filter((e) => e.flag).forEach((e) => (o[e.id] = isOn(e.id))); return o; },
    toggle(id) {
      state[id] = !state[id]; store.set('extensions', state);
      const e = LIST.find((x) => x.id === id);
      toast(`${e.name} ${state[id] ? 'enabled' : 'disabled'}`, 'info', 1200);
      app.reapply(); renderStatus();
      const a = app.editor.activeId; scanTodos(a); lens(a); paintMarks(a);
      if (id === 'focusTimer' && !state[id]) { clearInterval(timer.t); timer.running = false; }
      Q.learn.badge('tinkerer');
    },
    init(a) {
      app = a;
      const ed = app.editor;
      // completion providers
      Q.editorFactory.addCompletions('*', ({ before, langId }) => {
        const out = [];
        if (isOn('snippets') && SNIP[langId]) {
          const w = (before.match(/[\w:]*$/) || [''])[0];
          if (w) SNIP[langId].forEach((s) => { if (s.label.startsWith(w.toLowerCase()) || s.label.startsWith(w)) out.push({ ...s, replaceLen: w.length, doc: '```\n' + s.insert.replace(/\$\{\d+:?([^}]*)\}|\$\d/g, '$1') + '\n```' }); });
        }
        if (isOn('emmet') && langId === 'html') {
          const m = before.match(/(?:^|[\s>])([\w.#\-[\]="'{}*+^$!:]+)$/);
          if (m && !/<[^>]*$/.test(before)) { const ex = emmet(m[1]); if (ex && ex.includes('<') || (ex && m[1].startsWith('lorem'))) out.push({ label: m[1], filter: m[1], insert: ex, kind: 'emmet', replaceLen: m[1].length, detail: 'Emmet abbreviation', doc: '```html\n' + ex.replace(/\$\{\d+:?([^}]*)\}|\$\d/g, '$1') + '\n```', sort: '!' }); }
        }
        if (isOn('pathComplete') && (langId === 'html' || langId === 'css' || langId === 'markdown')) {
          const m = before.match(/(?:src|href)=["']([^"']*)$/) || before.match(/url\(\s*["']?([^"')]*)$/) || before.match(/\]\(([^)]*)$/);
          if (m) filesFor(m[1], ed.activeId).slice(0, 40).forEach((f) => out.push({ label: f, insert: f, replaceLen: m[1].length, detail: 'Project file', filter: f, sort: '!' + f }));
        }
        return out;
      });
      ['html', 'css', 'javascript', 'typescript', 'python', 'markdown', ...Object.keys(SNIP)].forEach((l) => ed.registerLang(l));
      // Emmet on Tab
      if (ed.addTabHandler) ed.addTabHandler(() => {
        if (!isOn('emmet')) return false;
        const id = ed.activeId; const lang = ed.langOf(id);
        if (lang !== 'html') return false;
        const before = ed.textBefore();
        const m = before.match(/(?:^|[\s>])([\w.#\-[\]="'{}*+^$!:]+)$/);
        if (!m || /<[^>]*$/.test(before)) return false;
        const ex = emmet(m[1]); if (!ex) return false;
        ed.replaceBefore(m[1].length, ''); ed.insertSnippet(ex); return true;
      });
      // typing hooks
      ed.onType((text, id) => {
        if (isOn('powerMode')) sparks();
        if (isOn('keyClicks')) click();
        if (text === '>' && isOn('autoCloseTag') && ed.langOf(id) === 'html') setTimeout(() => {
          const before = ed.textBefore(); const m = before.match(/<([a-zA-Z][\w-]*)(?:\s[^<>]*)?>$/);
          if (!m || before.endsWith('/>') || SELF.has(m[1].toLowerCase())) return;
          if (ed.textAfter().startsWith(`</${m[1]}`)) return;
          ed.replaceBefore(0, `</${m[1]}>`, `</${m[1]}>`.length);
        }, 0);
      });
      ed.onChange((id) => { if (id === ed.activeId) { scanTodos(id); countWords(); } });
      // hover tips
      if (ed.kind === 'monaco') {
        const monaco = ed.monaco;
        ['javascript', 'typescript', 'python', 'html', 'css', 'scss', 'c', 'cpp', 'java', 'csharp', 'rust', 'go', 'lua', 'sql'].forEach((lang) => monaco.languages.registerHoverProvider(lang, {
          provideHover(model, pos) {
            if (!isOn('hoverTips')) return null;
            const w = model.getWordAtPosition(pos); if (!w) return null;
            let word = w.word;
            if (lang === 'css') { const line = model.getLineContent(pos.lineNumber); const m = line.slice(0, w.endColumn - 1).match(/[\w-]+$/); if (m) word = m[0]; }
            const dict = Q.tutorData[lang] || {}; const ent = dict[word] || (lang === 'sql' && dict[word.toUpperCase()]);
            if (!ent) return null;
            return { range: new monaco.Range(pos.lineNumber, w.startColumn, pos.lineNumber, w.endColumn), contents: [{ value: `**🎓 ${word}** · _${ent[0]}_` }, { value: toMd(ent[1]) }, ...(ent[2] ? [{ value: '```' + lang + '\n' + ent[2] + '\n```' }] : []), ...(ent[3] ? [{ value: '💡 ' + toMd(ent[3]) }] : [])] };
          },
        }));
      }
      // commands
      app.cmd('bookmark.toggle', 'Toggle bookmark', 'Edit', toggleMark, 'Ctrl+Alt+K');
      app.cmd('bookmark.next', 'Next bookmark', 'Edit', () => jumpMark(1), 'Ctrl+Alt+L');
      app.cmd('bookmark.prev', 'Previous bookmark', 'Edit', () => jumpMark(-1), 'Ctrl+Alt+J');
      app.cmd('timer.toggle', 'Start/pause focus timer', 'View', () => { if (!isOn('focusTimer')) Q.ext.toggle('focusTimer'); toggleTimer(); });
      app.cmd('emmet.wrap', 'Emmet: expand abbreviation', 'Edit', () => { const before = ed.textBefore(); const m = before.match(/([\w.#\-[\]="'{}*+^$!:]+)$/); const ex = m && emmet(m[1]); if (ex) { ed.replaceBefore(m[1].length, ''); ed.insertSnippet(ex); } else toast('No Emmet abbreviation before the cursor.', 'info'); });
      LIST.forEach((e) => app.cmd('ext.' + e.id, `Toggle extension: ${e.name}`, 'Extensions', () => Q.ext.toggle(e.id)));
      addEventListener('keydown', (e) => {
        if (!(e.ctrlKey || e.metaKey) || !e.altKey || !isOn('bookmarks')) return;
        const k = e.key.toLowerCase();
        if (k === 'k') { e.preventDefault(); e.stopPropagation(); toggleMark(); }
        if (k === 'l') { e.preventDefault(); e.stopPropagation(); jumpMark(1); }
        if (k === 'j') { e.preventDefault(); e.stopPropagation(); jumpMark(-1); }
      }, true);
      renderStatus();
    },
    onActivate(id) { scanTodos(id); lens(id); paintMarks(id); countWords(); },
    onMarkers(id) { lens(id); },
    onCursor(info) { lastCursor = info; },
    async beforeRun() {},
    async onSave(id) {
      if (isOn('trimOnSave')) app.editor.command('trimWhitespace');
      if (isOn('formatOnSave')) await app.editor.format();
      if (isOn('runOnSave') && ['javascript', 'typescript', 'python'].includes(app.editor.langOf(id)) && !app.isVirtual(id)) setTimeout(() => app.exec('run.run'), 50);
    },
  };
})();
