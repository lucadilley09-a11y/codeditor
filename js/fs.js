/* Codeditor — virtual file system & projects (persisted in localStorage) */
(() => {
  const { store, uid, bus } = Q;

  const TEMPLATES = {
    web: {
      name: 'Web page', desc: 'HTML + CSS + JavaScript with live preview',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="card">
    <h1>Hello, Codeditor! 👋</h1>
    <p>Edit <code>index.html</code>, <code>style.css</code> and <code>script.js</code> — the preview updates as you type.</p>
    <button id="btn">Click me</button>
    <p id="count">Clicks: 0</p>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
        'style.css': `* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: linear-gradient(135deg, #1e1b4b, #0f172a);
  color: #e2e8f0;
}

.card {
  padding: 2rem 2.5rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  text-align: center;
}

button {
  font: inherit;
  padding: 0.6rem 1.4rem;
  border: 0;
  border-radius: 6px;
  background: #7c5cff;
  color: white;
  cursor: pointer;
}

button:hover { background: #6a48f5; }
`,
        'script.js': `const btn = document.getElementById('btn');
const count = document.getElementById('count');
let clicks = 0;

btn.addEventListener('click', () => {
  clicks++;
  count.textContent = 'Clicks: ' + clicks;
  console.log('Button clicked', clicks, 'times');
});
`,
      },
      open: ['index.html', 'style.css', 'script.js'],
    },
    game: {
      name: 'Canvas game', desc: 'A tiny 2D game loop with keyboard controls',
      files: {
        'index.html': `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Canvas Game</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <canvas id="game" width="640" height="400"></canvas>
  <p class="hint">Arrow keys / WASD to move · collect the gems</p>
  <script src="game.js"></script>
</body>
</html>
`,
        'style.css': `body { margin: 0; background: #0b1020; color: #94a3b8; display: grid; place-items: center; min-height: 100vh; font-family: system-ui; }
canvas { background: #111833; border: 2px solid #26305a; image-rendering: pixelated; max-width: 100%; }
.hint { font-size: 13px; }
`,
        'game.js': `const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const player = { x: 300, y: 180, size: 24, speed: 220, color: '#7c5cff' };
const keys = {};
let gem = spawnGem();
let score = 0;
let last = performance.now();

addEventListener('keydown', (e) => (keys[e.key.toLowerCase()] = true));
addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));

function spawnGem() {
  return { x: 20 + Math.random() * 600, y: 20 + Math.random() * 360, r: 8 };
}

function update(dt) {
  if (keys['arrowleft'] || keys['a']) player.x -= player.speed * dt;
  if (keys['arrowright'] || keys['d']) player.x += player.speed * dt;
  if (keys['arrowup'] || keys['w']) player.y -= player.speed * dt;
  if (keys['arrowdown'] || keys['s']) player.y += player.speed * dt;

  // keep the player on screen
  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));

  // collision with the gem
  const cx = player.x + player.size / 2, cy = player.y + player.size / 2;
  if (Math.hypot(cx - gem.x, cy - gem.y) < player.size / 2 + gem.r) {
    score++;
    gem = spawnGem();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(gem.x, gem.y, gem.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px system-ui';
  ctx.fillText('Score: ' + score, 12, 24);
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
`,
      },
      open: ['game.js', 'index.html'],
    },
    python: {
      name: 'Python script', desc: 'Runs right in your browser',
      files: {
        'main.py': `# Press Ctrl+Enter (or the ▶ Run button) to run this file.

def greet(name):
    return f"Hello, {name}!"

names = ["Ada", "Linus", "Grace"]
for n in names:
    print(greet(n))

squares = [x * x for x in range(1, 6)]
print("Squares:", squares)
`,
      },
      open: ['main.py'],
    },
    js: {
      name: 'JavaScript playground', desc: 'Plain JS with console output',
      files: {
        'main.js': `// Press Ctrl+Enter to run. Output shows in the Console below.

const fruits = ['apple', 'banana', 'cherry'];

fruits.forEach((fruit, i) => {
  console.log(\`\${i + 1}. \${fruit}\`);
});

const total = [3, 7, 12].reduce((sum, n) => sum + n, 0);
console.log('Total:', total);
`,
      },
      open: ['main.js'],
    },
    blank: { name: 'Blank', desc: 'An empty project', files: { 'README.md': '# New project\n\nStart creating files with the **+** button in the Explorer.\n' }, open: ['README.md'] },
  };

  const WELCOME_MD = `# Welcome to Codeditor ✒️

Codeditor is a code editor that **teaches you while you code**.

- **Learn** (🎓 in the left bar): bite-sized interactive courses for HTML, CSS, JavaScript, Python, TypeScript and quick tours of 10 more languages.
- **Tutor** (right panel): put your cursor on any keyword, tag or property and get a plain-English explanation.
- **Run** with \`Ctrl+Enter\`. Web projects show a live preview; JS, TS and Python print to the Console.
- **Extensions** (blocks icon): turn quality-of-life helpers on and off.
- \`Ctrl+Shift+P\` opens the command palette, \`Ctrl+P\` jumps to any file.

Everything saves automatically in your browser. Use **File → Download project** for a .zip backup.
`;

  let projects = store.get('projects', null);
  let currentId = store.get('currentProject', null);

  function makeProject(name, tplKey = 'web') {
    const tpl = TEMPLATES[tplKey] || TEMPLATES.blank;
    const files = { ...tpl.files };
    const p = { id: uid(), name, files, folders: [], tabs: [...tpl.open], active: tpl.open[0], created: Date.now(), updated: Date.now() };
    return p;
  }

  if (!projects || !Object.keys(projects).length) {
    const p = makeProject('My First Game', 'game');
    p.tabs = []; p.active = null; // first launch opens on the welcome screen
    projects = { [p.id]: p };
    currentId = p.id;
    store.set('projects', projects); store.set('currentProject', currentId); // claim it now so other open copies reuse it
  }
  if (!projects[currentId]) currentId = Object.keys(projects)[0];

  // another open copy may have saved too: keep the newest version of each project, never drop one we didn't delete
  const deleted = new Set();
  function mergeStored() {
    const other = store.get('projects', {}) || {};
    for (const [id, p] of Object.entries(other)) {
      if (deleted.has(id)) continue;
      if (!projects[id] || (p.updated || 0) > (projects[id].updated || 0)) projects[id] = p; // newest copy wins, open project included (the app refreshes open editors)
    }
  }
  const write = () => { store.set('projects', projects); store.set('currentProject', currentId); }; // other copies' saves are merged in as they happen (watch below)
  const save = Q.debounce(write, 250);
  const saveNow = write;
  store.watch?.('projects', () => { mergeStored(); bus.emit('projects:changed'); });

  const fs = {
    TEMPLATES,
    get project() { return projects[currentId]; },
    get projects() { return Object.values(projects).sort((a, b) => b.updated - a.updated); },
    save, saveNow,
    list() { return Object.keys(this.project.files).sort(); },
    exists(path) { return path in this.project.files; },
    read(path) { return this.project.files[path]; },
    write(path, content, silent) {
      const isNew = !(path in this.project.files);
      this.project.files[path] = content;
      this.project.updated = Date.now();
      // make sure parent folders exist
      const parts = path.split('/'); parts.pop();
      let acc = '';
      parts.forEach((p) => { acc = acc ? acc + '/' + p : p; if (!this.project.folders.includes(acc)) this.project.folders.push(acc); });
      save();
      if (isNew && !silent) bus.emit('fs:changed');
    },
    remove(path) {
      const p = this.project;
      if (path in p.files) delete p.files[path];
      else {
        Object.keys(p.files).forEach((f) => { if (f.startsWith(path + '/')) delete p.files[f]; });
        p.folders = p.folders.filter((f) => f !== path && !f.startsWith(path + '/'));
      }
      save(); bus.emit('fs:changed');
    },
    rename(from, to) {
      const p = this.project;
      if (from in p.files) { p.files[to] = p.files[from]; delete p.files[from]; }
      else {
        Object.keys(p.files).forEach((f) => { if (f.startsWith(from + '/')) { p.files[to + f.slice(from.length)] = p.files[f]; delete p.files[f]; } });
        p.folders = p.folders.map((f) => (f === from || f.startsWith(from + '/') ? to + f.slice(from.length) : f));
      }
      save(); bus.emit('fs:renamed', from, to); bus.emit('fs:changed');
    },
    mkdir(path) { if (!this.project.folders.includes(path)) this.project.folders.push(path); save(); bus.emit('fs:changed'); },
    folders() { return [...this.project.folders].sort(); },
    resolve(base, rel) { // resolve a relative URL inside the project
      if (/^(https?:|data:|blob:|\/\/)/.test(rel)) return null;
      rel = rel.split(/[?#]/)[0];
      const stack = rel.startsWith('/') ? [] : base.split('/').slice(0, -1);
      rel.replace(/^\//, '').split('/').forEach((seg) => { if (seg === '..') stack.pop(); else if (seg && seg !== '.') stack.push(seg); });
      return stack.join('/');
    },
    createProject(name, tpl) { const p = makeProject(name, tpl); projects[p.id] = p; currentId = p.id; saveNow(); bus.emit('project:switched'); return p; },
    switchProject(id) { if (projects[id]) { currentId = id; saveNow(); bus.emit('project:switched'); } },
    renameProject(id, name) { projects[id].name = name; saveNow(); bus.emit('project:renamed'); },
    deleteProject(id) {
      delete projects[id]; deleted.add(id);
      if (!Object.keys(projects).length) { const p = makeProject('My Project', 'web'); projects[p.id] = p; }
      if (!projects[currentId]) currentId = Object.keys(projects)[0];
      saveNow(); bus.emit('project:switched');
    },
    importProject(name, files) { const p = makeProject(name, 'blank'); p.files = files; p.tabs = []; p.active = null; projects[p.id] = p; currentId = p.id; saveNow(); bus.emit('project:switched'); },
    exportAll() { return JSON.stringify({ quill: 1, projects, progress: store.get('learn', {}), settings: store.get('settings', {}) }, null, 1); },
  };
  Q.fs = fs;
})();
