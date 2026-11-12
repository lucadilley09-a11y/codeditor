/* Codeditor — sandboxes: one scratch project per language for messing around, separate from lessons */
(() => {
  const { h, esc, toast } = Q;
  const STARTERS = {
    javascript: ['main.js', '// Your JavaScript sandbox — try anything, nothing here affects your lessons.\nconst name = "Player";\nconsole.log(`Hello, ${name}!`);\n'],
    typescript: ['main.ts', '// Your TypeScript sandbox\nconst hp: number = 100;\nconsole.log(`HP: ${hp}`);\n'],
    python: ['main.py', '# Your Python sandbox — try anything, nothing here affects your lessons.\nname = "Player"\nprint(f"Hello, {name}!")\n'],
    csharp: ['Main.cs', '// Your C# sandbox (C# can’t run in the browser — the Tutor tab explains your code)\nusing System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, Player!");\n    }\n}\n'],
    lua: ['main.lua', '-- Your Lua sandbox (Lua can’t run in the browser — the Tutor tab explains your code)\nlocal name = "Player"\nprint("Hello, " .. name .. "!")\n'],
    cpp: ['main.cpp', '// Your C++ sandbox (C++ can’t run in the browser — the Tutor tab explains your code)\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, Player!" << std::endl;\n    return 0;\n}\n'],
    web: ['index.html', '<!DOCTYPE html>\n<html>\n<head>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>My sandbox</h1>\n  <canvas id="game" width="400" height="240"></canvas>\n  <script src="main.js"></script>\n</body>\n</html>\n'],
  };
  const WEB_EXTRA = { 'style.css': 'body { font-family: system-ui, sans-serif; background: #111827; color: #f9fafb; }\ncanvas { background: #0b1020; border-radius: 8px; }\n', 'main.js': 'const ctx = document.getElementById("game").getContext("2d");\nctx.fillStyle = "#facc15";\nctx.fillRect(40, 40, 60, 60);\n' };
  const nameFor = (lang) => `Sandbox · ${lang === 'web' ? 'Web & games' : Q.langs.byId[lang]?.name || lang}`;
  const slug = (t) => (t || 'snippet').toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'snippet';

  function ensure(lang) {
    const name = nameFor(lang);
    const p = Q.fs.projects.find((x) => x.name === name);
    if (p) { Q.fs.switchProject(p.id); return false; }
    const [file, text] = STARTERS[lang] || [`main.${Q.langs.byId[lang]?.exts?.[0] || 'txt'}`, ''];
    Q.fs.importProject(name, lang === 'web' ? { [file]: text, ...WEB_EXTRA } : { [file]: text });
    return true;
  }
  function open(lang) {
    const fresh = ensure(lang);
    const first = lang === 'web' ? 'main.js' : (STARTERS[lang] || [])[0] || Q.fs.list()[0];
    setTimeout(() => { if (Q.fs.exists(first)) Q.app.openFile(first); else if (Q.fs.list()[0]) Q.app.openFile(Q.fs.list()[0]); if (lang === 'web') { Q.app.showRight('preview'); Q.app.refreshPreview(true); } }, 60);
    toast(fresh ? `Made your <b>${esc(nameFor(lang))}</b> — play freely here` : `Opened <b>${esc(nameFor(lang))}</b>`, 'info', 2200);
  }

  // copy a lesson's code into the sandbox as a new file (never overwrites anything)
  function playWith({ course, lesson, step, code }) {
    const isWeb = course.run === 'web';
    const lang = isWeb ? 'web' : course.lang;
    ensure(lang);
    const base = slug(lesson.title);
    let dir = base, k = 2;
    const taken = (p) => Q.fs.exists(p);
    if (isWeb) {
      while (taken(`${dir}/index.html`)) dir = `${base}-${k++}`;
      const mode = step.mode || course.mode || 'html';
      if (mode === 'html') Q.fs.write(`${dir}/index.html`, code);
      else if (mode === 'css') { Q.fs.write(`${dir}/style.css`, code); Q.fs.write(`${dir}/index.html`, (step.page || '<p>Hello</p>').includes('<html') ? step.page.replace('</head>', '<link rel="stylesheet" href="style.css"></head>') : `<!DOCTYPE html>\n<html>\n<head>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n${step.page || '<p>Hello</p>'}\n</body>\n</html>\n`); }
      else { const page = step.page || '<body></body>'; Q.fs.write(`${dir}/main.js`, code); Q.fs.write(`${dir}/index.html`, page.includes('</body>') ? page.replace('</body>', '<script src="main.js"></script>\n</body>') : page + '\n<script src="main.js"></script>'); }
      Q.bus.emit('fs:changed');
      const f = mode === 'html' ? `${dir}/index.html` : mode === 'css' ? `${dir}/style.css` : `${dir}/main.js`;
      setTimeout(() => { Q.app.openFile(f); Q.app.showRight('preview'); Q.app.refreshPreview(true); }, 60);
    } else {
      const ext = (STARTERS[lang] || [])[0]?.split('.').pop() || Q.langs.byId[lang]?.exts?.[0] || 'txt';
      let f = `${base}.${ext}`; while (taken(f)) f = `${base}-${k++}.${ext}`;
      Q.fs.write(f, code); Q.bus.emit('fs:changed');
      setTimeout(() => Q.app.openFile(f), 60);
    }
    toast(`Copied to your <b>${esc(nameFor(lang))}</b> — your lesson is untouched. Come back any time from <b>Learn</b>.`, 'success', 3800);
  }

  function pick() {
    const opts = [['web', 'Web & games', 'HTML · CSS · JS with live preview'], ['javascript', 'JavaScript', 'Runs in the console'], ['python', 'Python', 'Runs in the console'], ['typescript', 'TypeScript', 'Runs in the console'], ['csharp', 'C#', 'Write & get explanations'], ['lua', 'Lua', 'Write & get explanations'], ['cpp', 'C++', 'Write & get explanations']];
    const grid = h('div', { class: 'sb-grid' });
    let m;
    opts.forEach(([id, label, sub]) => grid.append(h('button', { class: 'sb-opt', html: `<b>${esc(label)}</b><span>${esc(sub)}</span>`, onclick: () => { document.querySelector('.modal-back')?.remove(); open(id); } })));
    m = Q.modal({ title: 'Open a sandbox', body: h('div', {}, h('p', { class: 'muted', text: 'A sandbox is a scratch space for trying things out. It’s saved separately — nothing you do here touches your lessons or projects.' }), grid), buttons: [{ label: 'Cancel', value: null }] });
    return m;
  }

  Q.sandbox = { open, pick, playWith };
})();
