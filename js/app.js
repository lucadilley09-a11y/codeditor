/* Quill — application shell */
(async () => {
  const { $, $$, h, esc, icon, toast, modal, prompt, confirm, contextMenu, download, bus, store, debounce, clamp } = Q;
  const fs = Q.fs;
  const app = document.getElementById('app');

  /* ===================== Settings ===================== */
  const DEFAULTS = { theme: 'quill-dark', fontSize: 14, tabSize: 2, wordWrap: false, lineNumbers: true, ligatures: true, autoClose: true, autocomplete: true, hover: true, livePreview: true, previewDelay: 350, tutorFollow: true, sidebarW: 260, rightW: 420, panelH: 200, hideSidebar: false, hideRight: false, hidePanel: false, view: 'files', rview: 'preview', confirmDelete: true };
  const settings = { ...DEFAULTS, ...store.get('settings', {}) };
  const saveSettings = () => store.set('settings', settings);
  const editorOpts = () => ({ ...settings, ...Q.ext.editorFlags() });

  Q.themes.applyCss(Q.themes.get(settings.theme));
  document.documentElement.style.setProperty('--sidebar-w', settings.sidebarW + 'px');
  document.documentElement.style.setProperty('--right-w', settings.rightW + 'px');
  document.documentElement.style.setProperty('--panel-h', settings.panelH + 'px');
  app.classList.toggle('no-sidebar', settings.hideSidebar);
  app.classList.toggle('no-right', settings.hideRight);
  app.classList.toggle('no-panel', settings.hidePanel);

  /* ===================== Commands ===================== */
  const commands = new Map();
  const cmd = (id, label, cat, run, key) => commands.set(id, { id, label, cat, run, key });
  const exec = (id, ...a) => { const c = commands.get(id); if (c) return c.run(...a); console.warn('no command', id); };
  bus.on('cmd', (id, ...a) => exec(id, ...a));

  /* ===================== State ===================== */
  const virtuals = new Map(); // id -> {title, lang, cls}
  let editor = null;
  let lastCursor = null;
  let lastRunErrors = []; // {id, line, msg}
  const openFolders = new Set(fs.project.openFolders || []);

  const isVirtual = (id) => id && id.startsWith('@');
  const tabs = () => fs.project.tabs;
  const langOfId = (id) => (isVirtual(id) ? virtuals.get(id)?.lang : Q.langs.forPath(id).id);
  const titleOf = (id) => (isVirtual(id) ? virtuals.get(id)?.title : id.split('/').pop());

  /* ===================== Layout chrome ===================== */
  function buildChrome() {
    $('.cmdbox-ic').innerHTML = icon('search', 14);
    // activity bar
    const acts = [['files', 'files', 'Explorer (Ctrl+Shift+E)'], ['search', 'search', 'Search (Ctrl+Shift+F)'], ['learn', 'learn', 'Learn'], ['extensions', 'ext', 'Extensions'], ['settings', 'gear', 'Settings (Ctrl+,)']];
    const bar = $('#activitybar');
    acts.forEach(([v, ic, title]) => bar.append(h('button', { class: 'act', 'data-act': v, title, html: icon(ic, 22), onclick: () => showView(v, true) })));
    bar.append(h('div', { class: 'act-spacer' }));
    bar.append(h('button', { class: 'act', title: 'Keyboard shortcuts', html: icon('keyboard', 21), onclick: () => exec('help.keys') }));
    bar.append(h('button', { class: 'act', title: 'Toggle theme', html: icon('palette', 21), onclick: () => exec('theme.pick') }));

    // run + layout buttons
    renderRunBtn(false);
    $('#runbtn').onclick = () => (runActive ? exec('run.stop') : exec('run.run'));
    const lb = $('#layoutbtns');
    [['sidebar', 'view.sidebar', 'Toggle sidebar (Ctrl+B)'], ['panel', 'view.panel', 'Toggle console (Ctrl+J)'], ['rightbar', 'view.right', 'Toggle right panel (Ctrl+Alt+B)'], ['zen', 'view.zen', 'Zen mode (Ctrl+K Z)']].forEach(([ic, c, t]) =>
      lb.append(h('button', { class: 'icon-btn', title: t, html: icon(ic, 17), onclick: () => exec(c) })));

    // panel tabs
    const pt = $('#ptabs');
    pt.append(h('button', { class: 'ptab on', 'data-p': 'console', html: 'Console <span class="count" id="ccount">0</span>', onclick: () => showPanel('console') }));
    pt.append(h('button', { class: 'ptab', 'data-p': 'problems', html: 'Problems <span class="count" id="pcount">0</span>', onclick: () => showPanel('problems') }));
    const tools = $('#paneltools');
    tools.append(h('input', { class: 'stdin', id: 'stdin', placeholder: 'Input lines (a; b; c)', title: 'Values for input()/prompt(), separated by ;' }));
    tools.append(h('button', { class: 'icon-btn sm', title: 'Clear console (Ctrl+L)', html: icon('trash', 14), onclick: () => exec('console.clear') }));
    tools.append(h('button', { class: 'icon-btn sm', title: 'Hide panel', html: icon('close', 14), onclick: () => exec('view.panel') }));
    $$('.pview')[0].classList.add('on');

    // right tabs
    const rt = $('#rtabs');
    [['preview', 'eye', 'Preview'], ['lesson', 'learn', 'Lesson'], ['tutor', 'bulb', 'Tutor']].forEach(([v, ic, label]) =>
      rt.append(h('button', { class: 'rtab', 'data-r': v, html: `${icon(ic, 14)}${label}`, onclick: () => showRight(v) })));

    // tab actions
    const ta = $('#tabactions');
    ta.append(h('button', { class: 'icon-btn sm', title: 'Format document (Shift+Alt+F)', html: icon('format', 15), onclick: () => exec('edit.format') }));
    ta.append(h('button', { class: 'icon-btn sm', title: 'More…', html: icon('sparkle', 15), onclick: (e) => { const r = e.currentTarget.getBoundingClientRect(); contextMenu(r.left, r.bottom + 4, [
      { label: 'Find', icon: 'search', key: 'Ctrl+F', action: () => exec('edit.find') },
      { label: 'Replace', icon: 'edit', key: 'Ctrl+H', action: () => exec('edit.replace') },
      { label: 'Go to line…', icon: 'arrowRight', key: 'Ctrl+G', action: () => exec('edit.gotoLine') },
      '-',
      { label: 'Fold all', icon: 'chevron', action: () => editor.command('foldAll') },
      { label: 'Unfold all', icon: 'chevron', action: () => editor.command('unfoldAll') },
      { label: 'Change language mode', icon: 'box', action: () => exec('lang.pick') },
      '-',
      { label: 'Download this file', icon: 'download', action: () => exec('file.download') },
      { label: 'Close all tabs', icon: 'close', action: () => exec('tabs.closeAll') },
    ]); } }));

    buildMenus();
  }

  function renderRunBtn(running) {
    $('#runbtn').innerHTML = running ? `${icon('stop', 13)}<span>Stop</span>` : `${icon('play', 13)}<span>Run</span>`;
    $('#runbtn').classList.toggle('running', running);
  }

  function showView(v, toggle) {
    if (toggle && settings.view === v && !settings.hideSidebar) { exec('view.sidebar'); return; }
    settings.view = v; saveSettings();
    if (settings.hideSidebar) { settings.hideSidebar = false; app.classList.remove('no-sidebar'); }
    $$('.view').forEach((el) => el.classList.toggle('on', el.dataset.view === v));
    $$('.act[data-act]').forEach((el) => el.classList.toggle('on', el.dataset.act === v));
    if (v === 'search') setTimeout(() => $('#sq')?.focus(), 30);
    if (v === 'learn') Q.learn.renderSidebar();
    if (v === 'extensions') renderExtensions();
    if (v === 'settings') renderSettings();
  }
  function showPanel(p) {
    $$('.ptab').forEach((t) => t.classList.toggle('on', t.dataset.p === p));
    $$('.pview').forEach((t) => t.classList.toggle('on', t.dataset.pview === p));
    if (settings.hidePanel) exec('view.panel');
  }
  function showRight(v) {
    settings.rview = v; saveSettings();
    if (settings.hideRight) { settings.hideRight = false; app.classList.remove('no-right'); }
    app.classList.add('show-right');
    $$('.rtab').forEach((t) => t.classList.toggle('on', t.dataset.r === v));
    $$('.rview').forEach((t) => t.classList.toggle('on', t.dataset.rview === v));
    if (v === 'preview') refreshPreview(true);
    if (v === 'tutor') Q.tutor.refresh();
  }

  /* ===================== Menus ===================== */
  function buildMenus() {
    const menus = {
      File: ['file.new', 'file.newFolder', 'file.import', '-', 'project.new', 'project.switch', 'project.rename', '-', 'file.save', 'file.download', 'project.zip', 'project.backup', 'project.restore'],
      Edit: ['edit.undo', 'edit.redo', '-', 'edit.find', 'edit.replace', 'search.all', '-', 'edit.comment', 'edit.duplicate', 'edit.format', 'edit.gotoLine'],
      View: ['palette', 'quickOpen', '-', 'view.sidebar', 'view.panel', 'view.right', 'view.zen', '-', 'theme.pick', 'zoom.in', 'zoom.out', 'zoom.reset'],
      Run: ['run.run', 'run.stop', 'preview.refresh', 'preview.newTab', '-', 'console.clear'],
      Learn: ['learn.open', 'learn.continue', 'tutor.open', 'learn.badges'],
      Help: ['help.keys', 'help.welcome', 'help.about'],
    };
    const host = $('#menus');
    Object.entries(menus).forEach(([name, ids]) => {
      const b = h('button', { class: 'menu-btn', text: name });
      b.onclick = () => {
        const r = b.getBoundingClientRect();
        b.classList.add('open');
        contextMenu(r.left, r.bottom + 2, ids.map((id) => id === '-' ? '-' : { label: commands.get(id)?.label || id, key: commands.get(id)?.key, action: () => exec(id) }));
        const off = () => { b.classList.remove('open'); removeEventListener('mousedown', off, true); };
        setTimeout(() => addEventListener('mousedown', off, true));
      };
      host.append(b);
    });
  }

  /* ===================== Tabs ===================== */
  function renderTabs() {
    const el = $('#tabs'); el.innerHTML = '';
    const all = [...tabs(), ...[...virtuals.keys()]];
    all.forEach((id) => {
      const v = virtuals.get(id);
      const t = h('div', { class: 'tab' + (id === editor?.activeId ? ' on' : '') + (v ? ' lesson-tab' : ''), draggable: !v, title: v ? v.title : id },
        h('span', { html: v ? icon('learn', 14) : Q.langs.badge(id) }),
        h('span', { class: 'nm', text: titleOf(id) }),
        h('button', { class: 'x', html: icon('close', 12), title: 'Close (Ctrl+W)', onclick: (e) => { e.stopPropagation(); closeTab(id); } }));
      t.onclick = () => activate(id);
      t.onauxclick = (e) => { if (e.button === 1) closeTab(id); };
      t.oncontextmenu = (e) => { e.preventDefault(); contextMenu(e.clientX, e.clientY, [
        { label: 'Close', icon: 'close', action: () => closeTab(id) },
        { label: 'Close others', action: () => all.filter((x) => x !== id).forEach(closeTab) },
        { label: 'Close all', action: () => exec('tabs.closeAll') },
        ...(v ? [] : ['-', { label: 'Rename…', icon: 'edit', action: () => renamePath(id) }, { label: 'Reveal in explorer', icon: 'files', action: () => revealInTree(id) }, { label: 'Download', icon: 'download', action: () => download(titleOf(id), fs.read(id)) }]),
      ]); };
      if (!v) {
        t.ondragstart = (e) => { e.dataTransfer.setData('quill/tab', id); t.classList.add('dragging'); };
        t.ondragend = () => t.classList.remove('dragging');
        t.ondragover = (e) => e.preventDefault();
        t.ondrop = (e) => { const from = e.dataTransfer.getData('quill/tab'); if (!from || from === id) return; e.preventDefault(); const arr = tabs(); arr.splice(arr.indexOf(from), 1); arr.splice(arr.indexOf(id), 0, from); fs.save(); renderTabs(); };
      }
      el.append(t);
    });
    const on = el.querySelector('.tab.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    renderCrumbs();
    $('#welcome').classList.toggle('on', !editor?.activeId);
    if (!editor?.activeId) renderWelcome();
  }

  function openFile(path, { line, col } = {}) {
    if (!fs.exists(path)) return;
    if (!tabs().includes(path)) tabs().push(path);
    activate(path);
    if (line) setTimeout(() => editor.reveal(line, col || 1), 30);
  }
  function openVirtual(id, { title, lang, value, cls }) {
    virtuals.set(id, { title, lang, cls });
    if (editor.has(id)) { editor.set(id, value); editor.setLang(id, lang); }
    activate(id, value);
  }
  function closeVirtual(id) { if (!virtuals.has(id)) return; virtuals.delete(id); editor.close(id); if (!editor.activeId) { const t = tabs(); t.length ? activate(t[t.length - 1]) : (editor.showNothing(), renderTabs()); } else renderTabs(); }

  function activate(id, value) {
    if (isVirtual(id)) {
      const v = virtuals.get(id); if (!v) return;
      editor.open(id, value, v.lang);
    } else {
      if (!fs.exists(id)) return;
      editor.open(id, fs.read(id), Q.langs.forPath(id).id);
      fs.project.active = id; fs.save();
    }
    renderTabs(); highlightTree(); updateProblems();
    Q.ext.onActivate(id);
    bus.emit('tab:activated', id);
    if (!isVirtual(id)) refreshPreview();
    setTimeout(() => editor.focus(), 0);
  }

  function closeTab(id) {
    if (isVirtual(id)) { bus.emit('virtual:closed', id); closeVirtual(id); return; }
    const arr = tabs(); const i = arr.indexOf(id);
    if (i < 0) return;
    arr.splice(i, 1); fs.save();
    const wasActive = editor.activeId === id;
    editor.close(id);
    if (wasActive) {
      const next = arr[Math.min(i, arr.length - 1)] || [...virtuals.keys()][0];
      if (next) activate(next); else { editor.showNothing(); fs.project.active = null; }
    }
    renderTabs(); highlightTree();
  }

  function renderCrumbs() {
    const id = editor?.activeId; const el = $('#breadcrumbs');
    if (!id) { el.innerHTML = ''; return; }
    if (isVirtual(id)) { el.innerHTML = `${icon('learn', 13)} <span>Lesson</span><span class="sep">›</span><b>${esc(titleOf(id))}</b>`; return; }
    const parts = id.split('/');
    el.innerHTML = `<span>${esc(fs.project.name)}</span>` + parts.map((p, i) => `<span class="sep">›</span>${i === parts.length - 1 ? `${Q.langs.badge(id)}<b>${esc(p)}</b>` : `<span>${esc(p)}</span>`}`).join('');
  }

  /* ===================== Explorer ===================== */
  function renderExplorer() {
    const v = $('[data-view="files"]'); v.innerHTML = '';
    const head = h('div', { class: 'view-head' }, h('span', { text: 'Explorer' }), h('div', { class: 'tools' },
      h('button', { class: 'icon-btn sm', title: 'New file', html: icon('filePlus', 15), onclick: () => exec('file.new') }),
      h('button', { class: 'icon-btn sm', title: 'New folder', html: icon('folderPlus', 15), onclick: () => exec('file.newFolder') }),
      h('button', { class: 'icon-btn sm', title: 'Import files from your computer', html: icon('upload', 15), onclick: () => exec('file.import') }),
      h('button', { class: 'icon-btn sm', title: 'Download project as .zip', html: icon('zip', 15), onclick: () => exec('project.zip') })));
    const proj = h('button', { class: 'proj-switch', title: 'Switch project', onclick: () => exec('project.switch') }, h('span', { html: icon('project', 15) }), h('span', { class: 'name', text: fs.project.name }), h('span', { html: icon('chevron', 13) }));
    const tree = h('div', { class: 'tree', id: 'tree', tabindex: 0 });
    v.append(head, proj, h('div', { class: 'view-body' }, tree));
    buildTree(tree);
  }

  function buildTree(tree) {
    tree.innerHTML = '';
    const files = fs.list(); const folders = fs.folders();
    const childrenOf = (dir) => {
      const pre = dir ? dir + '/' : '';
      const subdirs = new Set(), fl = [];
      folders.forEach((f) => { if (f.startsWith(pre) && f !== dir) { const rest = f.slice(pre.length); if (!rest.includes('/')) subdirs.add(f); } });
      files.forEach((f) => { if (f.startsWith(pre)) { const rest = f.slice(pre.length); if (!rest.includes('/')) fl.push(f); else subdirs.add(pre + rest.split('/')[0]); } });
      return { dirs: [...subdirs].sort(), files: fl.sort() };
    };
    const addLevel = (dir, depth, parentEl) => {
      const { dirs, files: fl } = childrenOf(dir);
      dirs.forEach((d) => {
        const open = openFolders.has(d);
        const n = h('div', { class: 'node folder' + (open ? ' open' : ''), style: { paddingLeft: 8 + depth * 14 + 'px' }, 'data-path': d },
          h('span', { class: 'chev', html: icon('chevron', 12) }), h('span', { html: icon(open ? 'folderOpen' : 'folder', 15) }), h('span', { class: 'nm', text: d.split('/').pop() }),
          h('span', { class: 'acts' }, h('button', { class: 'icon-btn sm', title: 'New file here', html: icon('filePlus', 13), onclick: (e) => { e.stopPropagation(); newFile(d); } })));
        n.onclick = () => { open ? openFolders.delete(d) : openFolders.add(d); fs.project.openFolders = [...openFolders]; fs.save(); buildTree(tree); };
        n.oncontextmenu = (e) => { e.preventDefault(); contextMenu(e.clientX, e.clientY, [
          { label: 'New file…', icon: 'filePlus', action: () => newFile(d) },
          { label: 'New folder…', icon: 'folderPlus', action: () => newFolder(d) },
          '-', { label: 'Rename…', icon: 'edit', action: () => renamePath(d) },
          { label: 'Delete folder', icon: 'trash', danger: true, action: () => deletePath(d) },
        ]); };
        dropTarget(n, d);
        parentEl.append(n);
        if (open) addLevel(d, depth + 1, parentEl);
      });
      fl.forEach((f) => {
        const n = h('div', { class: 'node file' + (f === editor?.activeId ? ' active' : ''), style: { paddingLeft: 22 + depth * 14 + 'px' }, 'data-path': f, draggable: true },
          h('span', { html: Q.langs.badge(f) }), h('span', { class: 'nm', text: f.split('/').pop() }),
          h('span', { class: 'acts' },
            h('button', { class: 'icon-btn sm', title: 'Rename', html: icon('edit', 13), onclick: (e) => { e.stopPropagation(); renamePath(f); } }),
            h('button', { class: 'icon-btn sm', title: 'Delete', html: icon('trash', 13), onclick: (e) => { e.stopPropagation(); deletePath(f); } })));
        n.onclick = () => openFile(f);
        n.ondragstart = (e) => e.dataTransfer.setData('quill/file', f);
        n.oncontextmenu = (e) => { e.preventDefault(); contextMenu(e.clientX, e.clientY, [
          { label: 'Open', icon: 'files', action: () => openFile(f) },
          { label: 'Rename…', icon: 'edit', key: 'F2', action: () => renamePath(f) },
          { label: 'Duplicate', icon: 'copy', action: () => duplicatePath(f) },
          { label: 'Download', icon: 'download', action: () => download(f.split('/').pop(), fs.read(f)) },
          { label: 'Copy path', icon: 'copy', action: () => navigator.clipboard?.writeText(f) },
          '-', { label: 'Delete', icon: 'trash', danger: true, key: 'Del', action: () => deletePath(f) },
        ]); };
        parentEl.append(n);
      });
    };
    addLevel('', 0, tree);
    dropTarget(tree, '');
    if (!files.length && !folders.length) tree.append(h('div', { class: 'dropzone-hint', html: 'No files yet.<br>Click <b>+</b> above, or drop files here.' }));
  }
  function dropTarget(el, dir) {
    el.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('quill/file')) { e.preventDefault(); e.stopPropagation(); el.classList.add('drop'); } });
    el.addEventListener('dragleave', () => el.classList.remove('drop'));
    el.addEventListener('drop', (e) => {
      const f = e.dataTransfer.getData('quill/file'); el.classList.remove('drop');
      if (!f) return; e.preventDefault(); e.stopPropagation();
      const to = (dir ? dir + '/' : '') + f.split('/').pop();
      if (to !== f) { if (fs.exists(to)) return toast(`${to} already exists`, 'error'); fs.rename(f, to); if (dir) openFolders.add(dir); }
    });
  }
  function highlightTree() { $$('#tree .node.file').forEach((n) => n.classList.toggle('active', n.dataset.path === editor?.activeId)); }
  function revealInTree(path) { const parts = path.split('/'); parts.pop(); let acc = ''; parts.forEach((p) => { acc = acc ? acc + '/' + p : p; openFolders.add(acc); }); showView('files'); renderExplorer(); }

  const validName = (n) => n && !/[\\:*?"<>|]/.test(n) && !n.startsWith('/') && !n.split('/').some((s) => s === '..' || s === '');
  async function newFile(dir = '') {
    const name = await prompt(dir ? `New file in ${dir}/` : 'New file name', '', 'e.g. index.html, main.py, notes/todo.md');
    if (!name) return;
    if (!validName(name)) return toast('That file name has characters that aren’t allowed.', 'error');
    const path = (dir ? dir + '/' : '') + name;
    if (fs.exists(path)) return toast('That file already exists.', 'error');
    fs.write(path, starterFor(path));
    if (dir) openFolders.add(dir);
    openFile(path);
    Q.learn.badge('creator');
  }
  function starterFor(path) {
    const ext = path.split('.').pop().toLowerCase();
    const name = path.split('/').pop();
    const s = {
      html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${name.replace(/\.\w+$/, '')}</title>\n</head>\n<body>\n  \n</body>\n</html>\n`,
      py: `# ${name}\n\n`, md: `# ${name.replace(/\.\w+$/, '')}\n\n`, json: '{\n  \n}\n',
      c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, world!\\n");\n    return 0;\n}\n',
      cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}\n',
      java: `public class ${name.replace(/\.java$/, '')} {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n`,
      rs: 'fn main() {\n    println!("Hello, world!");\n}\n', go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, world!")\n}\n',
      cs: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, world!");\n    }\n}\n',
      lua: 'print("Hello, world!")\n', rb: 'puts "Hello, world!"\n', sh: '#!/bin/bash\necho "Hello, world!"\n',
    };
    return s[ext] ?? '';
  }
  async function newFolder(dir = '') {
    const name = await prompt('New folder name', '', 'e.g. images');
    if (!name) return;
    if (!validName(name)) return toast('That folder name isn’t allowed.', 'error');
    const path = (dir ? dir + '/' : '') + name;
    fs.mkdir(path); openFolders.add(path); if (dir) openFolders.add(dir);
    fs.project.openFolders = [...openFolders]; renderExplorer();
  }
  async function renamePath(path) {
    const name = await prompt('Rename', path, '');
    if (!name || name === path) return;
    if (!validName(name)) return toast('That name isn’t allowed.', 'error');
    if (fs.exists(name)) return toast('Something with that name already exists.', 'error');
    fs.rename(path, name);
  }
  async function duplicatePath(path) {
    const dot = path.lastIndexOf('.'); let i = 1, np;
    do { np = dot > 0 ? `${path.slice(0, dot)}-copy${i > 1 ? i : ''}${path.slice(dot)}` : `${path}-copy${i > 1 ? i : ''}`; i++; } while (fs.exists(np));
    fs.write(np, fs.read(path)); openFile(np);
  }
  async function deletePath(path) {
    const isFile = fs.exists(path);
    if (settings.confirmDelete && !(await confirm(`Delete ${isFile ? 'file' : 'folder'}?`, `<b>${esc(path)}</b>${isFile ? '' : ' and everything inside it'} will be permanently deleted.`))) return;
    fs.remove(path);
    toast(`Deleted ${esc(path)}`, 'info');
  }

  bus.on('fs:renamed', (from, to) => {
    const arr = tabs();
    arr.forEach((t, i) => {
      if (t === from || t.startsWith(from + '/')) { const nt = to + t.slice(from.length); arr[i] = nt; if (editor.has(t)) editor.rename(t, nt, Q.langs.forPath(nt).id); }
    });
    fs.save(); renderTabs();
  });
  bus.on('fs:changed', () => {
    // close tabs whose files vanished
    tabs().filter((t) => !fs.exists(t)).forEach((t) => closeTab(t));
    renderExplorer(); refreshPreview();
  });
  bus.on('project:switched', () => loadProject());
  bus.on('project:renamed', () => renderExplorer());

  function loadProject() {
    // close every non-virtual model
    [...(editor._known || [])].forEach((id) => { if (!isVirtual(id)) editor.close(id); });
    editor._known = new Set();
    openFolders.clear(); (fs.project.openFolders || []).forEach((f) => openFolders.add(f));
    fs.project.tabs = (fs.project.tabs || []).filter((t) => fs.exists(t));
    renderExplorer();
    const act = fs.project.active && fs.exists(fs.project.active) ? fs.project.active : fs.project.tabs[0];
    if (act) activate(act); else { editor.showNothing(); renderTabs(); }
    clearConsole(); refreshPreview(true); lastRunErrors = []; Q.tutor.clearError(); updateProblems();
    document.title = `${fs.project.name} — Quill`;
  }

  /* ===================== Search view ===================== */
  function renderSearch() {
    const v = $('[data-view="search"]'); v.innerHTML = '';
    const opts = { case: false, word: false, regex: false };
    const q = h('input', { class: 'input', id: 'sq', placeholder: 'Search in project', spellcheck: 'false' });
    const r = h('input', { class: 'input', placeholder: 'Replace with', spellcheck: 'false' });
    const optBtns = h('div', { class: 'sopts' }, ...[['case', 'Aa', 'Match case'], ['word', 'ab', 'Whole word'], ['regex', '.*', 'Regular expression']].map(([k, t, ti]) => {
      const b = h('button', { class: 'sopt', text: t, title: ti }); b.onclick = () => { opts[k] = !opts[k]; b.classList.toggle('on', opts[k]); run(); }; return b;
    }));
    const results = h('div');
    const replAll = h('button', { class: 'btn', text: 'Replace all', title: 'Replace in all files' });
    v.append(h('div', { class: 'view-head' }, h('span', { text: 'Search' })), h('div', { class: 'sfield' }, q, optBtns), h('div', { class: 'sfield' }, r, replAll), h('div', { class: 'view-body' }, results));
    const build = () => {
      if (!q.value) return null;
      try { const src = opts.regex ? q.value : q.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return new RegExp(opts.word ? `\\b${src}\\b` : src, opts.case ? 'g' : 'gi'); } catch { return null; }
    };
    const run = debounce(() => {
      results.innerHTML = '';
      const re = build(); if (!re) return;
      let total = 0, nfiles = 0;
      fs.list().forEach((f) => {
        const lines = fs.read(f).split('\n'); const hits = [];
        lines.forEach((l, i) => { re.lastIndex = 0; if (re.test(l)) hits.push(i); });
        if (!hits.length) return;
        nfiles++; total += hits.length;
        results.append(h('div', { class: 'sres-file', html: `${Q.langs.badge(f)}<span>${esc(f)}</span><span class="count">${hits.length}</span>`, onclick: () => openFile(f) }));
        hits.slice(0, 60).forEach((i) => {
          const l = lines[i]; re.lastIndex = 0;
          const trimmed = l.trimStart(); const off = l.length - trimmed.length;
          const html = esc(trimmed).replace(new RegExp(re.source, re.flags), (m) => `<mark>${m}</mark>`);
          const m = l.search(new RegExp(re.source, re.flags.replace('g', '')));
          results.append(h('div', { class: 'sres-line', html: `<span style="color:var(--muted)">${i + 1}</span>  ${html}`, onclick: () => openFile(f, { line: i + 1, col: Math.max(1, m + 1) }) }));
          void off;
        });
      });
      results.prepend(h('div', { class: 'ssum', text: total ? `${total} result${total > 1 ? 's' : ''} in ${nfiles} file${nfiles > 1 ? 's' : ''}` : 'No results' }));
    }, 150);
    q.oninput = run;
    replAll.onclick = async () => {
      const re = build(); if (!re) return;
      let n = 0;
      fs.list().forEach((f) => { const src = fs.read(f); const out = src.replace(re, () => { n++; return r.value; }); if (out !== src) { fs.write(f, out); if (editor.has(f)) editor.set(f, out); } });
      toast(`Replaced ${n} occurrence${n === 1 ? '' : 's'}`, 'success'); run();
    };
  }

  /* ===================== Console & problems ===================== */
  const consoleEl = () => $('#console');
  let ccount = 0, lastLine = null;
  function clearConsole() { consoleEl().innerHTML = '<div class="console-empty">Output appears here. Press <kbd>Ctrl</kbd> <kbd>Enter</kbd> to run.</div>'; ccount = 0; lastLine = null; $('#ccount').textContent = '0'; $('#ccount').classList.remove('bad'); }
  function log(type, text, { line, file, lang } = {}) {
    const c = consoleEl();
    c.querySelector('.console-empty')?.remove();
    // collapse identical consecutive messages
    if (lastLine && lastLine.dataset.t === type && lastLine.dataset.v === text) {
      let cnt = lastLine.querySelector('.cnt'); if (!cnt) { cnt = h('span', { class: 'cnt', text: '1' }); lastLine.insertBefore(cnt, lastLine.children[1]); }
      cnt.textContent = +cnt.textContent + 1; return;
    }
    const gl = { log: '›', info: 'i', warn: '!', error: '✕', sys: '' }[type] ?? '›';
    const row = h('div', { class: 'cl ' + type, 'data-t': type, 'data-v': text }, h('span', { class: 'gl', text: gl }), h('span', { class: 'tx', text }));
    if (line && file) row.append(h('span', { class: 'ln', text: `${file.split('/').pop()}:${line}`, onclick: () => (isVirtual(file) ? activate(file) : openFile(file)) || setTimeout(() => editor.reveal(line), 40) }));
    if (type === 'error') row.append(h('button', { class: 'explain', html: `${icon('bulb', 12)}Explain`, onclick: () => { Q.tutor.explainError(text, lang || langOfId(editor.activeId)); showRight('tutor'); } }));
    c.append(row); lastLine = row;
    c.parentElement.scrollTop = c.parentElement.scrollHeight;
    ccount++; $('#ccount').textContent = ccount;
    if (type === 'error') { $('#ccount').classList.add('bad'); if (settings.hidePanel) exec('view.panel'); }
  }
  Q.log = log;

  function updateProblems() {
    const el = $('#problems'); if (!el) return;
    const items = [];
    const ids = new Set([...tabs(), ...virtuals.keys()]);
    ids.forEach((id) => editor.has(id) && editor.markers(id).forEach((m) => items.push({ ...m, id })));
    lastRunErrors.forEach((e) => items.push({ ...e, severity: 'error' }));
    el.innerHTML = items.length ? '' : '<div class="console-empty">No problems detected. Nice! ✨</div>';
    items.forEach((m) => el.append(h('div', { class: 'prob ' + m.severity, html: `${icon(m.severity === 'error' ? 'alert' : 'info', 14)}<span>${esc(m.msg)}</span><span class="where">${esc(titleOf(m.id) || '')}${m.line ? ':' + m.line : ''}</span>`, onclick: () => { activate(m.id); if (m.line) setTimeout(() => editor.reveal(m.line, m.col || 1), 30); } })));
    const errs = items.filter((m) => m.severity === 'error').length, warns = items.filter((m) => m.severity === 'warning').length;
    $('#pcount').textContent = items.length; $('#pcount').classList.toggle('bad', errs > 0);
    const sb = $('#sb-problems'); if (sb) sb.innerHTML = `${icon('alert', 13)}${errs} ${icon('info', 13)}${warns}`;
    if (sb) sb.className = 'sbi' + (errs ? ' err' : warns ? ' warn' : '');
    Q.ext.onMarkers(editor.activeId);
  }

  /* ===================== Preview ===================== */
  let previewEntry = null, previewDevice = 'full';
  function buildPreviewBar() {
    const bar = $('#previewbar'); bar.innerHTML = '';
    const sel = h('select', { id: 'pentry', title: 'Page to preview' });
    sel.onchange = () => { previewEntry = sel.value; refreshPreview(true); };
    bar.append(
      h('button', { class: 'icon-btn sm', title: 'Refresh preview', html: icon('refresh', 14), onclick: () => refreshPreview(true) }),
      h('div', { class: 'urlbox' }, h('span', { html: icon('lock', 12) }), sel),
      h('button', { class: 'icon-btn sm', id: 'dev-btn', title: 'Device size', html: icon('split', 14), onclick: (e) => { const r = e.currentTarget.getBoundingClientRect(); contextMenu(r.left - 120, r.bottom + 4, [
        ['full', 'Fill panel'], ['phone', 'Phone · 375×667'], ['tablet', 'Tablet · 768×1024'], ['laptop', 'Laptop · 1280×800']].map(([k, l]) => ({ label: (previewDevice === k ? '✓ ' : '   ') + l, action: () => setDevice(k) }))); } }),
      h('button', { class: 'icon-btn sm', title: 'Open in new browser tab', html: icon('external', 14), onclick: () => exec('preview.newTab') }));
  }
  function setDevice(k) {
    previewDevice = k;
    const host = $('#previewhost');
    const dims = { phone: [375, 667], tablet: [768, 1024], laptop: [1280, 800] }[k];
    host.classList.toggle('device', !!dims);
    if (dims) { host.style.setProperty('--dw', dims[0] + 'px'); host.style.setProperty('--dh', dims[1] + 'px'); }
  }
  function htmlFiles() { return fs.list().filter((f) => /\.(html?|svg)$/i.test(f)); }
  function pickEntry() {
    const id = editor?.activeId;
    const hf = htmlFiles();
    if (id && !isVirtual(id) && /\.(html?|svg)$/i.test(id)) return id;
    if (previewEntry && fs.exists(previewEntry)) return previewEntry;
    return hf.find((f) => /(^|\/)index\.html?$/i.test(f)) || hf[0] || null;
  }
  const previewFrame = () => $('#preview');
  function setPreviewMsg(html) {
    const host = $('#previewhost');
    host.querySelector('.preview-msg, .md-preview')?.remove();
    if (html) host.append(h('div', { class: html.startsWith('<md>') ? 'md-preview' : 'preview-msg', html: html.replace(/^<md>/, '') }));
  }
  function refreshPreview(force) {
    if (settings.rview !== 'preview' || settings.hideRight) return;
    if (!force && !settings.livePreview) return;
    const id = editor?.activeId;
    const sel = $('#pentry');
    if (id && !isVirtual(id) && /\.md$/i.test(id)) { setPreviewMsg('<md>' + Q.md(editor.get(id) ?? fs.read(id))); fillEntry(sel, null); return; }
    const entry = pickEntry();
    fillEntry(sel, entry);
    if (!entry) {
      const lang = id ? langOfId(id) : null;
      const runnable = { python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript' }[lang];
      setPreviewMsg(`<div><div class="big">${runnable ? '▶' : '🖼️'}</div><b>${runnable ? `Run your ${runnable} with Ctrl+Enter` : 'No page to preview'}</b><p>${runnable ? 'Output appears in the Console below.' : 'Create an <code>index.html</code> to see a live preview here.'}</p></div>`);
      return;
    }
    setPreviewMsg(null);
    const read = (p) => (editor.has(p) ? editor.get(p) : fs.read(p));
    previewFrame().srcdoc = Q.runner.buildPage(entry, read);
  }
  function fillEntry(sel, entry) {
    if (!sel) return;
    const hf = htmlFiles();
    sel.innerHTML = hf.length ? hf.map((f) => `<option ${f === entry ? 'selected' : ''}>${esc(f)}</option>`).join('') : '<option>(no html file)</option>';
  }
  const livePreview = debounce(() => refreshPreview(), 350);
  addEventListener('message', (e) => {
    const d = e.data; if (!d || !d.__quill) return;
    if (e.source !== previewFrame().contentWindow) return;
    if (d.type === 'clear') return clearConsole();
    let file = null;
    if (d.line && d.type === 'error') { const entry = pickEntry(); file = entry; }
    log(d.type, d.text, { line: d.line, file, lang: 'javascript' });
  });

  /* ===================== Run ===================== */
  let runActive = false;
  const stdinLines = () => ($('#stdin').value ? $('#stdin').value.split(';').map((s) => s.trim()) : []);
  async function runActiveFile() {
    const id = editor.activeId;
    if (!id) return toast('Open a file to run it.', 'info');
    if (isVirtual(id)) return bus.emit('virtual:run', id);
    await Q.ext.beforeRun(id);
    const lang = langOfId(id);
    const code = editor.get(id);
    lastRunErrors = [];
    Q.learn.badge('first-run');
    Q.learn.stat('runs');
    if (lang === 'html' || lang === 'css' || lang === 'xml' || (lang === 'javascript' && htmlFiles().length && pageUses(id))) {
      clearConsole(); log('sys', `Reloaded preview · ${new Date().toLocaleTimeString()}`);
      showRight('preview'); refreshPreview(true); return;
    }
    if (lang === 'markdown') { showRight('preview'); refreshPreview(true); return; }
    if (lang === 'javascript' || lang === 'typescript') {
      clearConsole(); showPanel('console');
      let js = code;
      if (lang === 'typescript') {
        try { js = await editor.transpileTS(id); } catch (e) { log('error', 'TypeScript: ' + e.message); return; }
        if (editor.kind === 'fallback') log('sys', 'Offline mode: types were stripped with a simple converter.');
      }
      log('sys', `Running ${titleOf(id)}…`);
      setRunning(true);
      const t0 = performance.now();
      const res = await Q.runner.runJS(js, { onEvent: (d) => { if (d.type === 'clear') return clearConsole(); log(d.type, d.text, { line: d.line, file: d.line ? id : null, lang }); if (d.type === 'error') { lastRunErrors.push({ id, line: d.line, msg: d.text }); updateProblems(); } }, stdin: stdinLines() });
      setRunning(false);
      if (!res.errors.length) log('sys', `Finished in ${Math.round(performance.now() - t0)} ms`);
      return;
    }
    if (lang === 'python') {
      clearConsole(); showPanel('console');
      if (Q.runner.pyState !== 'ready') log('sys', 'Starting Python (downloads ~10 MB the first time)…');
      setRunning(true);
      const t0 = performance.now(); let started = false;
      const res = await Q.runner.runPython(code, { stdin: stdinLines(), onEvent: (d) => {
        if (!started) { started = true; }
        log(d.type === 'warn' ? 'warn' : d.type, d.text, { line: d.line, file: d.line ? id : null, lang: 'python' });
        if (d.type === 'error') { lastRunErrors.push({ id, line: d.line, msg: d.last || d.text }); editor.setMarkers(id, d.line ? [{ line: d.line, msg: d.last || d.text }] : []); updateProblems(); }
      } });
      setRunning(false);
      if (!res.errors.length) { editor.setMarkers(id, []); log('sys', `Finished in ${Math.round(performance.now() - t0)} ms`); }
      return;
    }
    const L = Q.langs.byId[lang];
    log('sys', `${L?.name || lang} can’t run inside a browser, but you still get highlighting, the Tutor and lessons. Open the Learn tab for a ${L?.name || ''} tour!`);
    showPanel('console');
  }
  function pageUses(jsPath) { return htmlFiles().some((f) => fs.read(f).includes(jsPath.split('/').pop())); }
  function setRunning(v) { runActive = v; renderRunBtn(v); }

  /* ===================== Status bar ===================== */
  function buildStatus() {
    const L = $('#sbleft'), R = $('#sbright');
    L.innerHTML = ''; R.innerHTML = '';
    L.append(h('button', { class: 'sbi', id: 'sb-proj', title: 'Switch project', html: `${icon('project', 13)}<span>${esc(fs.project.name)}</span>`, onclick: () => exec('project.switch') }));
    L.append(h('button', { class: 'sbi', id: 'sb-problems', title: 'Problems', onclick: () => showPanel('problems') }));
    L.append(h('span', { class: 'sbi', id: 'sb-py', title: 'Python runtime', html: '<i class="pydot"></i>Python' }));
    L.append(h('span', { class: 'sbi', id: 'sb-engine', title: '' }));
    R.append(h('div', { id: 'sb-ext', style: { display: 'flex', height: '100%' } }));
    R.append(h('button', { class: 'sbi', id: 'sb-pos', title: 'Go to line (Ctrl+G)', onclick: () => exec('edit.gotoLine') }));
    R.append(h('button', { class: 'sbi', id: 'sb-tab', title: 'Indentation', onclick: () => exec('settings.tabSize') }));
    R.append(h('span', { class: 'sbi', text: 'UTF-8' }));
    R.append(h('button', { class: 'sbi', id: 'sb-lang', title: 'Change language mode', onclick: () => exec('lang.pick') }));
    R.append(h('button', { class: 'sbi', id: 'sb-theme', title: 'Change theme', html: icon('palette', 13), onclick: () => exec('theme.pick') }));
    updateStatus();
  }
  function updateStatus(info = lastCursor) {
    $('#sb-proj span').textContent = fs.project.name;
    $('#sb-tab').textContent = `Spaces: ${settings.tabSize}`;
    const id = editor?.activeId;
    $('#sb-lang').textContent = id ? Q.langs.byId[editor.langOf(id) || langOfId(id)]?.name || 'Plain Text' : '';
    $('#sb-pos').textContent = info && id ? `Ln ${info.line}, Col ${info.col}${info.selLength ? ` (${info.selLength} selected)` : ''}` : '';
    $('#sb-engine').textContent = editor?.kind === 'fallback' ? 'Offline editor' : '';
    $('#sb-engine').title = editor?.kind === 'fallback' ? 'The full editor engine loads from the internet. You are using Quill’s built-in lightweight editor.' : '';
  }
  bus.on('py:status', (s, err) => {
    const dot = $('#sb-py .pydot'); if (!dot) return;
    dot.className = 'pydot ' + (s === 'ready' ? 'ready' : s === 'loading' ? 'loading' : s === 'error' ? 'error' : '');
    $('#sb-py').title = { loading: 'Python is loading…', ready: 'Python ready', error: 'Python failed to load: ' + (err || ''), stopped: 'Python stopped (restarts on next run)' }[s] || 'Python';
    if (s === 'ready') log('sys', 'Python ready ✓');
    if (s === 'error') toast('Python couldn’t load. It needs internet the first time.', 'error', 4000);
  });

  /* ===================== Palette ===================== */
  function fuzzy(q, s) {
    if (!q) return { score: 1, html: esc(s) };
    const ql = q.toLowerCase(), sl = s.toLowerCase();
    let i = 0, score = 0, html = '', last = -2;
    for (let j = 0; j < s.length; j++) {
      if (i < ql.length && sl[j] === ql[i]) { score += j === last + 1 ? 3 : 1; if (j === 0 || /[\s/._-]/.test(s[j - 1])) score += 2; html += `<b>${esc(s[j])}</b>`; last = j; i++; }
      else html += esc(s[j]);
    }
    return i === ql.length ? { score: score - s.length * 0.01, html } : null;
  }
  function palette(initial = '') {
    $$('.palette-back').forEach((p) => p.remove());
    const back = h('div', { class: 'palette-back' });
    const input = h('input', { placeholder: 'Type a file name · ">" for commands · ":" go to line · "#" lessons', spellcheck: 'false', value: initial });
    const list = h('div', { class: 'plist2' });
    back.append(h('div', { class: 'palette' }, input, list));
    document.body.append(back);
    let items = [], sel = 0;
    const close = () => { back.remove(); editor?.focus(); };
    const render = () => {
      const v = input.value;
      items = [];
      if (v.startsWith('>')) {
        const q = v.slice(1).trim();
        commands.forEach((c) => { if (!c.label) return; const m = fuzzy(q, `${c.cat}: ${c.label}`); if (m) items.push({ html: m.html, score: m.score, desc: c.key || '', run: () => c.run() }); });
      } else if (v.startsWith(':')) {
        const n = parseInt(v.slice(1), 10);
        items.push({ html: n ? `Go to line <b>${n}</b>` : 'Type a line number', run: () => n && editor.reveal(n), score: 1 });
      } else if (v.startsWith('#')) {
        const q = v.slice(1).trim();
        Q.learn.allLessons().forEach((l) => { const m = fuzzy(q, `${l.course.title} › ${l.lesson.title}`); if (m) items.push({ html: m.html, score: m.score, desc: l.done ? '✓ done' : `+${l.lesson.xp || 20} XP`, run: () => Q.learn.open(l.course.id, l.lesson.id) }); });
      } else {
        fs.list().forEach((f) => { const m = fuzzy(v.trim(), f); if (m) items.push({ html: `${Q.langs.badge(f)} ${m.html}`, score: m.score + (tabs().includes(f) ? 0.5 : 0), desc: '', run: () => openFile(f) }); });
        if (v.trim()) commands.forEach((c) => { const m = fuzzy(v.trim(), c.label || ''); if (m && m.score > v.length * 2) items.push({ html: `<span class="pcat">${c.cat}</span>${m.html}`, score: m.score - 5, desc: c.key || '', run: () => c.run() }); });
      }
      items.sort((a, b) => b.score - a.score);
      items = items.slice(0, 80); sel = 0;
      list.innerHTML = items.length ? '' : '<div class="pempty">No matches</div>';
      items.forEach((it, i) => { const el = h('div', { class: 'pi' + (i === 0 ? ' on' : ''), html: `<span class="pl">${it.html}</span><span class="pd">${esc(it.desc || '')}</span>` }); el.onmousemove = () => setSel(i); el.onclick = () => { close(); it.run(); }; list.append(el); });
    };
    const setSel = (i) => { sel = clamp(i, 0, items.length - 1); [...list.children].forEach((c, j) => c.classList.toggle('on', j === sel)); list.children[sel]?.scrollIntoView({ block: 'nearest' }); };
    input.oninput = render;
    input.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(sel - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); const it = items[sel]; close(); it && it.run(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    };
    back.onmousedown = (e) => { if (e.target === back) close(); };
    render(); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
  }

  /* ===================== Welcome ===================== */
  function renderWelcome() {
    const w = $('#welcome');
    const cont = Q.learn.nextLesson();
    const recent = fs.projects.slice(0, 5);
    w.innerHTML = '';
    const root = h('div', { class: 'welcome' });
    root.append(h('h1', { html: `<img src="icon.svg" width="36" height="36" alt="">Quill` }), h('p', { class: 'sub', text: 'Write code in 20+ languages — and learn while you do it.' }));
    if (cont) root.append(h('div', { class: 'continue-card', onclick: () => Q.learn.open(cont.course.id, cont.lesson.id) },
      h('div', { class: 'course-ic', style: { '--c': cont.course.color }, text: cont.course.badge }),
      h('div', {}, h('div', { class: 'meta', text: 'Continue learning' }), h('div', { class: 'big', text: `${cont.course.title}: ${cont.lesson.title}` })),
      h('span', { class: 'go btn primary', html: `Start ${icon('arrowRight', 14)}` })));
    const col = (title, links) => h('div', { class: 'wcol' }, h('h4', { text: title }), ...links.map(([ic, label, fn, small]) => h('button', { class: 'wlink', html: `${icon(ic, 16)}<span>${label}</span>${small ? `<small>${small}</small>` : ''}`, onclick: fn })));
    root.append(h('div', { class: 'wgrid' },
      col('Start', [['filePlus', 'New file…', () => exec('file.new'), 'Ctrl+Alt+N'], ['project', 'New project from template…', () => exec('project.new')], ['upload', 'Import files…', () => exec('file.import')], ['search', 'Quick open', () => exec('quickOpen'), 'Ctrl+P']]),
      col('Learn', [['learn', 'Browse courses', () => exec('learn.open')], ['bulb', 'Open the live Tutor', () => exec('tutor.open')], ['trophy', 'Badges & progress', () => exec('learn.badges')], ['keyboard', 'Keyboard shortcuts', () => exec('help.keys'), 'Ctrl+K Ctrl+S']]),
      col('Recent projects', recent.map((p) => ['folder', esc(p.name), () => fs.switchProject(p.id), `${Object.keys(p.files).length} files`]))));
    w.append(root);
  }

  /* ===================== Extensions view ===================== */
  function renderExtensions() {
    const v = $('[data-view="extensions"]'); v.innerHTML = '';
    const on = Q.ext.list.filter((e) => Q.ext.isOn(e.id)).length;
    const q = h('input', { class: 'input', placeholder: 'Filter extensions' });
    const body = h('div', { class: 'view-body' });
    v.append(h('div', { class: 'view-head' }, h('span', { text: `Extensions · ${on}/${Q.ext.list.length} on` })), h('div', { class: 'sfield' }, q), body);
    const draw = () => {
      body.innerHTML = '';
      const f = q.value.toLowerCase();
      const cats = [...new Set(Q.ext.list.map((e) => e.cat))];
      cats.forEach((cat) => {
        const list = Q.ext.list.filter((e) => e.cat === cat && (!f || (e.name + e.desc).toLowerCase().includes(f)));
        if (!list.length) return;
        body.append(h('div', { class: 'section-label', text: cat }));
        list.forEach((e) => {
          const sw = h('button', { class: 'switch' + (Q.ext.isOn(e.id) ? ' on' : ''), title: Q.ext.isOn(e.id) ? 'Disable' : 'Enable', 'aria-label': 'Toggle ' + e.name });
          sw.onclick = () => { Q.ext.toggle(e.id); sw.classList.toggle('on', Q.ext.isOn(e.id)); v.querySelector('.view-head span').textContent = `Extensions · ${Q.ext.list.filter((x) => Q.ext.isOn(x.id)).length}/${Q.ext.list.length} on`; };
          body.append(h('div', { class: 'ext' }, h('div', { class: 'ext-ic', style: { '--c': e.color }, html: icon(e.icon, 18) }), h('div', { class: 'ext-info' }, h('div', { class: 'ext-name', text: e.name }), h('div', { class: 'ext-desc', text: e.desc })), sw));
        });
      });
    };
    q.oninput = draw; draw();
  }

  /* ===================== Settings view ===================== */
  function renderSettings() {
    const v = $('[data-view="settings"]'); v.innerHTML = '';
    const body = h('div', { class: 'view-body' });
    v.append(h('div', { class: 'view-head' }, h('span', { text: 'Settings' })), body);
    const grid = h('div', { class: 'theme-grid' });
    Q.themes.list.forEach((t) => {
      const b = h('button', { class: 'theme-sw' + (t.id === settings.theme ? ' on' : ''), title: t.name }, h('div', { class: 'pv', style: { background: t.ui.bg }, html: `<i style="width:70%;background:${t.syn.keyword}"></i><i style="width:45%;background:${t.syn.string}"></i><i style="width:58%;background:${t.syn.func}"></i>` }), h('div', { class: 'tn', text: t.name }));
      b.onclick = () => { setTheme(t.id); $$('.theme-sw', grid).forEach((x) => x.classList.toggle('on', x === b)); };
      grid.append(b);
    });
    body.append(h('div', { class: 'set-group' }, h('h5', { text: 'Theme' }), grid));
    const num = (key, label, min, max) => { const i = h('input', { type: 'number', min, max, value: settings[key] }); i.onchange = () => { settings[key] = clamp(+i.value || DEFAULTS[key], min, max); i.value = settings[key]; applySettings(); }; return h('div', { class: 'set' }, h('label', { text: label }), i); };
    const tog = (key, label) => { const s = h('button', { class: 'switch' + (settings[key] ? ' on' : '') }); s.onclick = () => { settings[key] = !settings[key]; s.classList.toggle('on', settings[key]); applySettings(); }; return h('div', { class: 'set' }, h('label', { text: label }), s); };
    body.append(h('div', { class: 'set-group' }, h('h5', { text: 'Editor' }), num('fontSize', 'Font size', 9, 32), num('tabSize', 'Tab size', 1, 8), tog('wordWrap', 'Word wrap'), tog('lineNumbers', 'Line numbers'), tog('ligatures', 'Font ligatures (=> ≠)'), tog('autoClose', 'Auto-close brackets & quotes'), tog('autocomplete', 'Autocomplete suggestions'), tog('hover', 'Hover info')));
    body.append(h('div', { class: 'set-group' }, h('h5', { text: 'Workspace' }), tog('livePreview', 'Live preview while typing'), tog('tutorFollow', 'Tutor follows your cursor'), tog('confirmDelete', 'Confirm before deleting')));
    body.append(h('div', { class: 'set-group' }, h('h5', { text: 'Data' }),
      h('div', { class: 'set' }, h('button', { class: 'btn', html: `${icon('download', 14)} Backup everything`, onclick: () => exec('project.backup') }), h('button', { class: 'btn', html: `${icon('upload', 14)} Restore`, onclick: () => exec('project.restore') })),
      h('div', { class: 'set' }, h('button', { class: 'btn ghost', text: 'Reset settings to defaults', onclick: async () => { if (await confirm('Reset settings?', 'Your files and progress stay. Only settings change.', false)) { Object.assign(settings, DEFAULTS); applySettings(); setTheme(DEFAULTS.theme); renderSettings(); } } }))));
  }
  function applySettings() { saveSettings(); editor.applySettings(editorOpts()); updateStatus(); }
  function setTheme(id) { settings.theme = id; saveSettings(); const t = Q.themes.get(id); Q.themes.applyCss(t); editor.setTheme(id); toast(`Theme: ${t.name}`, 'info', 1200); }

  /* ===================== Resizers ===================== */
  function initResizers() {
    $$('.resizer').forEach((r) => {
      r.addEventListener('mousedown', (e) => {
        e.preventDefault(); r.classList.add('drag');
        const kind = r.dataset.resize; const sx = e.clientX, sy = e.clientY;
        const start = { sidebar: settings.sidebarW, right: settings.rightW, panel: settings.panelH }[kind];
        document.body.style.cursor = kind === 'panel' ? 'row-resize' : 'col-resize';
        $$('iframe').forEach((f) => (f.style.pointerEvents = 'none'));
        const move = (ev) => {
          if (kind === 'sidebar') { settings.sidebarW = clamp(start + ev.clientX - sx, 170, 560); document.documentElement.style.setProperty('--sidebar-w', settings.sidebarW + 'px'); }
          if (kind === 'right') { settings.rightW = clamp(start - (ev.clientX - sx), 260, innerWidth * 0.7); document.documentElement.style.setProperty('--right-w', settings.rightW + 'px'); }
          if (kind === 'panel') { settings.panelH = clamp(start - (ev.clientY - sy), 60, innerHeight * 0.7); document.documentElement.style.setProperty('--panel-h', settings.panelH + 'px'); }
          editor?.layout();
        };
        const up = () => { r.classList.remove('drag'); document.body.style.cursor = ''; $$('iframe').forEach((f) => (f.style.pointerEvents = '')); removeEventListener('mousemove', move); removeEventListener('mouseup', up); saveSettings(); };
        addEventListener('mousemove', move); addEventListener('mouseup', up);
      });
      r.addEventListener('dblclick', () => { const k = r.dataset.resize; if (k === 'sidebar') settings.sidebarW = DEFAULTS.sidebarW; if (k === 'right') settings.rightW = DEFAULTS.rightW; if (k === 'panel') settings.panelH = DEFAULTS.panelH; document.documentElement.style.setProperty('--sidebar-w', settings.sidebarW + 'px'); document.documentElement.style.setProperty('--right-w', settings.rightW + 'px'); document.documentElement.style.setProperty('--panel-h', settings.panelH + 'px'); saveSettings(); });
    });
  }

  /* ===================== Import / drag & drop ===================== */
  async function importFiles(fileList, dir = '') {
    let n = 0;
    for (const f of fileList) {
      if (f.size > 2_000_000) { toast(`${esc(f.name)} is too big (max 2 MB)`, 'error'); continue; }
      const text = await f.text();
      if (/\u0000/.test(text.slice(0, 1000))) { toast(`${esc(f.name)} looks like a binary file — only text files are supported`, 'error'); continue; }
      const path = (dir ? dir + '/' : '') + (f.webkitRelativePath || f.name);
      fs.write(path, text, true); n++;
      if (n === 1) setTimeout(() => openFile(path), 50);
    }
    if (n) { bus.emit('fs:changed'); toast(`Imported ${n} file${n > 1 ? 's' : ''}`, 'success'); }
  }
  function initDrop() {
    let depth = 0;
    addEventListener('dragenter', (e) => { if (e.dataTransfer.types.includes('Files')) { depth++; document.body.classList.add('drag-over'); } });
    addEventListener('dragleave', (e) => { if (e.dataTransfer.types.includes('Files') && --depth <= 0) { depth = 0; document.body.classList.remove('drag-over'); } });
    addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
    addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); depth = 0; document.body.classList.remove('drag-over'); importFiles(e.dataTransfer.files); });
  }
  function pickFiles(opts = {}) {
    return new Promise((res) => { const i = h('input', { type: 'file', multiple: true, accept: opts.accept || '' }); i.onchange = () => res(i.files); i.click(); });
  }

  /* ===================== Projects UI ===================== */
  function newProjectDialog() {
    let tpl = 'web';
    const name = h('input', { class: 'input', placeholder: 'Project name', value: 'Untitled project' });
    const grid = h('div', { class: 'tpl-grid' });
    Object.entries(fs.TEMPLATES).forEach(([k, t]) => { const b = h('button', { class: 'tpl' + (k === tpl ? ' on' : ''), html: `<b>${esc(t.name)}</b><span>${esc(t.desc)}</span>` }); b.onclick = () => { tpl = k; $$('.tpl', grid).forEach((x) => x.classList.toggle('on', x === b)); }; grid.append(b); });
    const body = h('div', {}, h('p', { text: 'Name' }), name, h('p', { text: 'Template', style: { marginTop: '12px' } }), grid);
    modal({ title: 'New project', body, wide: true, buttons: [{ label: 'Cancel', value: null }, { label: 'Create project', primary: true, onclick: () => { fs.createProject(name.value.trim() || 'Untitled project', tpl); toast('Project created', 'success'); } }] });
    setTimeout(() => name.select(), 40);
  }
  function switchProjectDialog() {
    const list = h('div', { class: 'plist' });
    let m;
    const draw = () => {
      list.innerHTML = '';
      fs.projects.forEach((p) => {
        const it = h('div', { class: 'pitem' + (p.id === fs.project.id ? ' on' : '') }, h('span', { html: icon('project', 16) }), h('div', { style: { flex: 1 } }, h('div', { class: 'nm', text: p.name }), h('div', { class: 'meta', text: `${Object.keys(p.files).length} files · edited ${new Date(p.updated).toLocaleDateString()}` })),
          h('button', { class: 'icon-btn sm', title: 'Rename', html: icon('edit', 13), onclick: async (e) => { e.stopPropagation(); const n = await prompt('Rename project', p.name); if (n) { fs.renameProject(p.id, n); draw(); buildStatus(); } } }),
          h('button', { class: 'icon-btn sm', title: 'Delete', html: icon('trash', 13), onclick: async (e) => { e.stopPropagation(); if (await confirm('Delete project?', `<b>${esc(p.name)}</b> and all its files will be deleted. Download a .zip first if you want a copy.`)) { fs.deleteProject(p.id); draw(); } } }));
        it.onclick = () => { m.close(); if (p.id !== fs.project.id) fs.switchProject(p.id); };
        list.append(it);
      });
    };
    draw();
    m = modal({ title: 'Projects', body: list, wide: true, buttons: [{ label: 'New project…', primary: true, onclick: () => { setTimeout(newProjectDialog, 200); } }] });
  }

  /* ===================== Keyboard ===================== */
  let chord = null;
  function onKey(e) {
    const mod = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (chord) {
      const c = chord; chord = null;
      if (c === 'k' && mod && k === 's') { stop(); return exec('help.keys'); }
      if (c === 'k' && k === 'z') { stop(); return exec('view.zen'); }
      if (c === 'k' && mod && k === 't') { stop(); return exec('theme.pick'); }
    }
    if (mod && !e.shiftKey && !e.altKey && k === 'k') { stop(); chord = 'k'; setTimeout(() => (chord = null), 1500); return; }
    if (mod && k === 'enter') { stop(); return exec('run.run'); }
    if (mod && !e.shiftKey && k === 's') { stop(); return exec('file.save'); }
    if (mod && !e.shiftKey && k === 'p') { stop(); return exec('quickOpen'); }
    if (mod && e.shiftKey && k === 'p') { stop(); return exec('palette'); }
    if (e.key === 'F1') { stop(); return exec('palette'); }
    if (mod && !e.shiftKey && !e.altKey && k === 'b') { stop(); return exec('view.sidebar'); }
    if (mod && e.altKey && k === 'b') { stop(); return exec('view.right'); }
    if (mod && !e.shiftKey && k === 'j') { stop(); return exec('view.panel'); }
    if (mod && k === 'l' && e.shiftKey) { stop(); return exec('console.clear'); }
    if (mod && e.shiftKey && k === 'e') { stop(); return showView('files'); }
    if (mod && e.shiftKey && k === 'f') { stop(); return exec('search.all'); }
    if (mod && e.altKey && k === 'n') { stop(); return exec('file.new'); }
    if (mod && !e.shiftKey && k === ',') { stop(); return showView('settings'); }
    if (mod && e.altKey && !e.shiftKey && k === 'w' || (e.altKey && !mod && k === 'w')) { stop(); if (editor.activeId) closeTab(editor.activeId); return; }
    if (mod && e.key === 'Tab') { stop(); const all = [...tabs(), ...virtuals.keys()]; if (all.length > 1) { const i = all.indexOf(editor.activeId); activate(all[(i + (e.shiftKey ? -1 : 1) + all.length) % all.length]); } return; }
    if (e.altKey && e.shiftKey && k === 'f') { stop(); return exec('edit.format'); }
    if (mod && (k === '=' || k === '+')) { stop(); return exec('zoom.in'); }
    if (mod && k === '-') { stop(); return exec('zoom.out'); }
    if (mod && k === '0') { stop(); return exec('zoom.reset'); }
    if (e.key === 'Escape' && app.classList.contains('zen')) { stop(); return exec('view.zen'); }
    if (e.key === 'F2' && document.activeElement?.closest?.('#tree')) { stop(); const a = editor.activeId; if (a && !isVirtual(a)) renamePath(a); }
  }

  /* ===================== Command registry ===================== */
  function registerCommands() {
    cmd('palette', 'Command palette', 'View', () => palette('>'), 'Ctrl+Shift+P');
    cmd('quickOpen', 'Go to file…', 'View', () => palette(''), 'Ctrl+P');
    cmd('file.new', 'New file…', 'File', () => newFile(), 'Ctrl+Alt+N');
    cmd('file.newFolder', 'New folder…', 'File', () => newFolder());
    cmd('file.import', 'Import files from computer…', 'File', async () => importFiles(await pickFiles()));
    cmd('file.save', 'Save', 'File', async () => { const id = editor.activeId; if (!id) return; await Q.ext.onSave(id); if (!isVirtual(id)) fs.write(id, editor.get(id)); fs.saveNow(); toast('Saved', 'success', 1000); }, 'Ctrl+S');
    cmd('file.download', 'Download current file', 'File', () => { const id = editor.activeId; if (!id) return; download(isVirtual(id) ? 'lesson.' + (Q.langs.byId[langOfId(id)]?.exts[0] || 'txt') : id.split('/').pop(), editor.get(id)); });
    cmd('file.rename', 'Rename current file…', 'File', () => { const id = editor.activeId; if (id && !isVirtual(id)) renamePath(id); });
    cmd('file.delete', 'Delete current file', 'File', () => { const id = editor.activeId; if (id && !isVirtual(id)) deletePath(id); });
    cmd('project.new', 'New project…', 'Project', newProjectDialog);
    cmd('project.switch', 'Switch project…', 'Project', switchProjectDialog);
    cmd('project.rename', 'Rename project…', 'Project', async () => { const n = await prompt('Rename project', fs.project.name); if (n) { fs.renameProject(fs.project.id, n); buildStatus(); } });
    cmd('project.zip', 'Download project as .zip', 'Project', () => { download(fs.project.name.replace(/[^\w-]+/g, '-') + '.zip', Q.zip(fs.project.files)); Q.learn.badge('shipper'); });
    cmd('project.backup', 'Backup everything (.json)', 'Project', () => download(`quill-backup-${new Date().toISOString().slice(0, 10)}.json`, fs.exportAll(), 'application/json'));
    cmd('project.restore', 'Restore from backup…', 'Project', async () => {
      const files = await pickFiles({ accept: '.json' }); if (!files[0]) return;
      try { const d = JSON.parse(await files[0].text()); if (!d.quill || !d.projects) throw 0;
        if (!(await confirm('Restore backup?', 'This replaces all current projects, progress and settings.', false))) return;
        store.set('projects', d.projects); store.set('learn', d.progress || {}); store.set('settings', d.settings || {}); store.set('currentProject', Object.keys(d.projects)[0]); location.reload();
      } catch { toast('That file isn’t a Quill backup.', 'error'); }
    });
    cmd('edit.undo', 'Undo', 'Edit', () => editor.command('undo'), 'Ctrl+Z');
    cmd('edit.redo', 'Redo', 'Edit', () => editor.command('redo'), 'Ctrl+Y');
    cmd('edit.find', 'Find', 'Edit', () => editor.command('find'), 'Ctrl+F');
    cmd('edit.replace', 'Replace', 'Edit', () => editor.command('replace'), 'Ctrl+H');
    cmd('edit.comment', 'Toggle line comment', 'Edit', () => editor.command('comment'), 'Ctrl+/');
    cmd('edit.duplicate', 'Duplicate line', 'Edit', () => editor.command('duplicate'), 'Shift+Alt+↓');
    cmd('edit.moveUp', 'Move line up', 'Edit', () => editor.command('moveUp'), 'Alt+↑');
    cmd('edit.moveDown', 'Move line down', 'Edit', () => editor.command('moveDown'), 'Alt+↓');
    cmd('edit.deleteLine', 'Delete line', 'Edit', () => editor.command('deleteLine'), 'Ctrl+Shift+K');
    cmd('edit.upper', 'Transform to UPPERCASE', 'Edit', () => editor.command('upper'));
    cmd('edit.lower', 'Transform to lowercase', 'Edit', () => editor.command('lower'));
    cmd('edit.sort', 'Sort lines ascending', 'Edit', () => editor.command('sortLines'));
    cmd('edit.gotoLine', 'Go to line…', 'Edit', () => editor.command('gotoLine'), 'Ctrl+G');
    cmd('edit.multi', 'Add cursor at next match', 'Edit', () => editor.command('multiCursorNext'), 'Ctrl+D');
    cmd('edit.format', 'Format document', 'Edit', async () => { if (!(await editor.format())) toast(editor.kind === 'fallback' ? 'Formatting needs the full editor (online).' : 'No formatter for this language — but indentation is up to you!', 'info'); }, 'Shift+Alt+F');
    cmd('search.all', 'Search in all files', 'Edit', () => showView('search'), 'Ctrl+Shift+F');
    cmd('view.sidebar', 'Toggle sidebar', 'View', () => { settings.hideSidebar = !settings.hideSidebar; app.classList.toggle('no-sidebar', settings.hideSidebar); saveSettings(); editor.layout(); }, 'Ctrl+B');
    cmd('view.panel', 'Toggle console panel', 'View', () => { settings.hidePanel = !settings.hidePanel; app.classList.toggle('no-panel', settings.hidePanel); saveSettings(); editor.layout(); }, 'Ctrl+J');
    cmd('view.right', 'Toggle right panel', 'View', () => { settings.hideRight = !settings.hideRight; app.classList.toggle('no-right', settings.hideRight); app.classList.toggle('show-right', !settings.hideRight); saveSettings(); if (!settings.hideRight) showRight(settings.rview); editor.layout(); }, 'Ctrl+Alt+B');
    cmd('view.zen', 'Toggle Zen mode', 'View', () => { app.classList.toggle('zen'); toast(app.classList.contains('zen') ? 'Zen mode — press Esc to exit' : 'Zen mode off', 'info', 1400); editor.layout(); }, 'Ctrl+K Z');
    cmd('view.explorer', 'Show explorer', 'View', () => showView('files'), 'Ctrl+Shift+E');
    cmd('view.search', 'Show search', 'View', () => showView('search'));
    cmd('view.extensions', 'Show extensions', 'View', () => showView('extensions'));
    cmd('view.settings', 'Open settings', 'View', () => showView('settings'), 'Ctrl+,');
    cmd('zoom.in', 'Zoom in (font size +)', 'View', () => { settings.fontSize = Math.min(32, settings.fontSize + 1); applySettings(); }, 'Ctrl+=');
    cmd('zoom.out', 'Zoom out (font size −)', 'View', () => { settings.fontSize = Math.max(9, settings.fontSize - 1); applySettings(); }, 'Ctrl+-');
    cmd('zoom.reset', 'Reset zoom', 'View', () => { settings.fontSize = DEFAULTS.fontSize; applySettings(); }, 'Ctrl+0');
    bus.on('zoom', (d) => exec(d > 0 ? 'zoom.in' : 'zoom.out'));
    cmd('theme.pick', 'Change color theme…', 'View', () => {
      const b = $('#sb-theme').getBoundingClientRect();
      contextMenu(b.left - 150, b.top - 8 - Q.themes.list.length * 30, Q.themes.list.map((t) => ({ label: (t.id === settings.theme ? '✓ ' : '   ') + t.name, action: () => setTheme(t.id) })));
    }, 'Ctrl+K Ctrl+T');
    Q.themes.list.forEach((t) => cmd('theme.' + t.id, t.name, 'Theme', () => setTheme(t.id)));
    cmd('lang.pick', 'Change language mode…', 'Edit', () => {
      const id = editor.activeId; if (!id) return;
      const sel = h('select', { class: 'input' }, ...Q.langs.list.map((l) => h('option', { value: l.id, selected: l.id === editor.langOf(id), text: l.name })));
      modal({ title: 'Language mode', body: sel, buttons: [{ label: 'Cancel' }, { label: 'Apply', primary: true, onclick: () => { editor.setLang(id, sel.value); updateStatus(); } }] });
    });
    cmd('settings.tabSize', 'Change tab size…', 'Edit', async () => { const n = await prompt('Spaces per tab', String(settings.tabSize)); if (n) { settings.tabSize = clamp(parseInt(n, 10) || 2, 1, 8); applySettings(); } });
    cmd('tabs.closeAll', 'Close all tabs', 'View', () => { [...tabs(), ...virtuals.keys()].forEach(closeTab); });
    cmd('tabs.close', 'Close tab', 'View', () => editor.activeId && closeTab(editor.activeId), 'Alt+W');
    cmd('run.run', 'Run current file', 'Run', runActiveFile, 'Ctrl+Enter');
    cmd('run.stop', 'Stop running code', 'Run', () => { if (Q.runner.stop()) log('sys', 'Stopped.'); setRunning(false); });
    cmd('preview.refresh', 'Refresh preview', 'Run', () => { showRight('preview'); refreshPreview(true); });
    cmd('preview.newTab', 'Open preview in new tab', 'Run', () => { const entry = pickEntry(); if (!entry) return toast('No HTML page to open.', 'info'); const read = (p) => (editor.has(p) ? editor.get(p) : fs.read(p)); const url = URL.createObjectURL(new Blob([Q.runner.buildPage(entry, read, { hook: false })], { type: 'text/html' })); window.open(url, '_blank'); });
    cmd('console.clear', 'Clear console', 'Run', clearConsole, 'Ctrl+Shift+L');
    cmd('learn.open', 'Open courses', 'Learn', () => showView('learn'));
    cmd('learn.continue', 'Continue next lesson', 'Learn', () => { const n = Q.learn.nextLesson(); if (n) Q.learn.open(n.course.id, n.lesson.id); else toast('You finished every lesson! 🏆', 'success'); });
    cmd('learn.badges', 'Badges & progress', 'Learn', () => Q.learn.showBadges());
    cmd('tutor.open', 'Open live Tutor', 'Learn', () => showRight('tutor'));
    cmd('help.keys', 'Keyboard shortcuts', 'Help', () => {
      const rows = [...commands.values()].filter((c) => c.key).map((c) => `<tr><td>${esc(c.label)}</td><td>${c.key.split('+').map((k) => `<kbd>${esc(k)}</kbd>`).join(' ')}</td></tr>`).join('');
      const extra = [['Multi-cursor (click)', 'Alt+Click'], ['Rename symbol', 'F2'], ['Trigger suggestions', 'Ctrl+Space'], ['Expand Emmet (HTML)', 'Tab'], ['Next / previous tab', 'Ctrl+Tab']].map(([a, b]) => `<tr><td>${a}</td><td>${b.split('+').map((k) => `<kbd>${k}</kbd>`).join(' ')}</td></tr>`).join('');
      modal({ title: 'Keyboard shortcuts', wide: true, body: `<table class="keys-table">${rows}${extra}</table>` });
    }, 'Ctrl+K Ctrl+S');
    cmd('help.welcome', 'Show welcome screen', 'Help', () => { editor.showNothing(); renderTabs(); });
    cmd('help.about', 'About Quill', 'Help', () => modal({ title: 'About Quill', body: `<p><b>Quill</b> — a learn-as-you-code editor.</p><p>Editor engine: ${editor.kind === 'monaco' ? 'Monaco (the editor inside VS Code)' : 'Quill built-in (offline mode)'}<br>Python: Pyodide (CPython compiled to WebAssembly)<br>Languages highlighted: ${Q.langs.list.length} · Courses: ${Q.learn.courses.length}</p><p>Your files, progress and settings are stored only in this browser.</p>` }));
  }

  /* ===================== Boot ===================== */
  buildChrome();
  registerCommands();
  renderSearch();
  buildStatus();
  buildPreviewBar();
  setDevice('full');
  clearConsole();
  initResizers();
  initDrop();
  addEventListener('keydown', onKey, true);
  app.classList.remove('loading');

  editor = await Q.editorFactory.create($('#editor'), editorOpts());
  editor._known = new Set();
  $('#editor-loading').remove();
  editor.onChange((id, value) => {
    if (!isVirtual(id) && fs.exists(id)) { fs.write(id, value); if (/\.(html?|css|js|svg|md)$/i.test(id)) livePreview(); }
    if (lastRunErrors.some((e) => e.id === id)) { lastRunErrors = lastRunErrors.filter((e) => e.id !== id); if (langOfId(id) === 'python') editor.setMarkers(id, []); updateProblems(); }
  });
  const origOpen = editor.open.bind(editor);
  editor.open = (id, v, l) => { editor._known.add(id); origOpen(id, v, l); };
  editor.onCursor((info) => { lastCursor = info; updateStatus(info); if (settings.tutorFollow) Q.tutor.onCursor(info); Q.ext.onCursor(info); });
  editor.onMarkers(debounce(() => updateProblems(), 250));

  Q.app = { reapply: () => editor.applySettings(editorOpts()), settings, editor, exec, openFile, openVirtual, closeVirtual, activate, showRight, showPanel, showView, log, clearConsole, refreshPreview, isVirtual, langOfId, renderTabs, setRunning, updateProblems, cmd, get virtuals() { return virtuals; } };

  Q.ext.init(Q.app);
  Q.tutor.init($('#tutor'));
  Q.learn.init(Q.app);
  editor.applySettings(editorOpts());

  renderExplorer();
  loadProject();
  showView(settings.view);
  showRight(settings.rview === 'lesson' && !Q.learn.active ? 'preview' : settings.rview);
  updateProblems();

  if (!store.get('welcomed', false)) {
    store.set('welcomed', true);
    setTimeout(() => toast('Welcome to Quill! Open <b>Learn</b> 🎓 on the left to start a course.', 'info', 5000), 600);
  }
  if (editor.kind === 'fallback') setTimeout(() => toast('Offline mode: using Quill’s built-in editor. Connect to the internet for the full editor.', 'info', 5000), 900);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
