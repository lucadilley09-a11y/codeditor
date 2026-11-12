/* Codeditor — themes (UI colors + syntax colors, shared by Monaco and the fallback editor) */
(() => {
  const T = [
    {
      id: 'quill-night', name: 'Codeditor Dark', dark: true,
      ui: { shell: '#0a0d13', bg: '#10141c', bg2: '#141923', bg3: '#1a202c', bg4: '#232a39', border: '#212837', text: '#e8ebf1', text2: '#aab2c2', muted: '#6c7588', accent: '#f2b544', onAccent: '#1d1405', accent2: '#5cc8e4', good: '#4ade80', warn: '#fb923c', bad: '#f87171', sel: '#f2b54430', line: '#ffffff07' },
      syn: { keyword: '#c9a3ff', string: '#a6dba0', number: '#f6a96a', comment: '#5b6477', func: '#7db7ff', type: '#f2cc60', variable: '#e8ebf1', tag: '#ff8f85', attr: '#f2cc60', operator: '#8bd5e8', constant: '#f6a96a', prop: '#7db7ff' },
    },
    {
      id: 'quill-day', name: 'Codeditor Light', dark: false,
      ui: { shell: '#e9ebf0', bg: '#ffffff', bg2: '#f7f8fa', bg3: '#eff1f5', bg4: '#e4e7ed', border: '#dfe3ea', text: '#1a1e27', text2: '#4a5263', muted: '#8a92a3', accent: '#e0a12a', onAccent: '#1d1405', accent2: '#0e7490', good: '#15803d', warn: '#c2410c', bad: '#dc2626', sel: '#e0a12a33', line: '#00000005' },
      syn: { keyword: '#7c3aed', string: '#15803d', number: '#c2410c', comment: '#9aa1b0', func: '#1d4ed8', type: '#a16207', variable: '#1a1e27', tag: '#dc2626', attr: '#a16207', operator: '#0e7490', constant: '#c2410c', prop: '#1d4ed8' },
    },
    {
      id: 'midnight', name: 'Deep Sea', dark: true,
      ui: { shell: '#070d1a', bg: '#0c1426', bg2: '#101a30', bg3: '#16223b', bg4: '#1d2b49', border: '#1b2844', text: '#dbe5f7', text2: '#a3b3d3', muted: '#5f7299', accent: '#38bdf8', onAccent: '#04121d', accent2: '#a78bfa', good: '#34d399', warn: '#fbbf24', bad: '#fb7185', sel: '#38bdf838', line: '#ffffff07' },
      syn: { keyword: '#7dd3fc', string: '#86efac', number: '#fda4af', comment: '#4b5d82', func: '#c4b5fd', type: '#fcd34d', variable: '#dbe5f7', tag: '#7dd3fc', attr: '#c4b5fd', operator: '#94a3b8', constant: '#fda4af', prop: '#c4b5fd' },
    },
    {
      id: 'vampire', name: 'Vampire', dark: true,
      ui: { shell: '#17181f', bg: '#1f2029', bg2: '#23242e', bg3: '#2b2c39', bg4: '#353647', border: '#30323f', text: '#f8f8f2', text2: '#c9cad6', muted: '#7f83a3', accent: '#ff79c6', onAccent: '#2a0a1d', accent2: '#8be9fd', good: '#50fa7b', warn: '#f1fa8c', bad: '#ff5555', sel: '#ff79c640', line: '#ffffff08' },
      syn: { keyword: '#ff79c6', string: '#f1fa8c', number: '#bd93f9', comment: '#6272a4', func: '#50fa7b', type: '#8be9fd', variable: '#f8f8f2', tag: '#ff79c6', attr: '#50fa7b', operator: '#ff79c6', constant: '#bd93f9', prop: '#8be9fd' },
    },
    {
      id: 'forest', name: 'Forest', dark: true,
      ui: { shell: '#0c100b', bg: '#121810', bg2: '#161d14', bg3: '#1d261a', bg4: '#263222', border: '#243020', text: '#e3ead9', text2: '#b7c4a9', muted: '#6e7d63', accent: '#a3d65c', onAccent: '#132008', accent2: '#f0b35b', good: '#84cc16', warn: '#f59e0b', bad: '#ef4444', sel: '#a3d65c38', line: '#ffffff07' },
      syn: { keyword: '#e9b872', string: '#a3d977', number: '#f5a97f', comment: '#5d6b54', func: '#8ccfb4', type: '#e9d872', variable: '#e3ead9', tag: '#e98a72', attr: '#e9d872', operator: '#9ab89a', constant: '#f5a97f', prop: '#8ccfb4' },
    },
    {
      id: 'paper', name: 'Paper', dark: false,
      ui: { shell: '#ebe5d8', bg: '#fbf8f1', bg2: '#f4efe4', bg3: '#ece5d6', bg4: '#e1d8c5', border: '#ddd3bf', text: '#2d2a24', text2: '#57514a', muted: '#958c7c', accent: '#0f766e', onAccent: '#ffffff', accent2: '#b45309', good: '#4d7c0f', warn: '#b45309', bad: '#b91c1c', sel: '#0f766e2e', line: '#00000006' },
      syn: { keyword: '#a21caf', string: '#4d7c0f', number: '#c2410c', comment: '#a39a88', func: '#1d4ed8', type: '#a16207', variable: '#2d2a24', tag: '#b91c1c', attr: '#a16207', operator: '#0f766e', constant: '#c2410c', prop: '#1d4ed8' },
    },
    {
      id: 'contrast', name: 'High Contrast', dark: true,
      ui: { shell: '#000000', bg: '#050505', bg2: '#0d0d0d', bg3: '#171717', bg4: '#242424', border: '#5a5a5a', text: '#ffffff', text2: '#e5e5e5', muted: '#b0b0b0', accent: '#ffd400', onAccent: '#000000', accent2: '#00e5ff', good: '#00ff7f', warn: '#ff9f1a', bad: '#ff4d4d', sel: '#ffd40055', line: '#ffffff12' },
      syn: { keyword: '#ff9dfc', string: '#9dff9d', number: '#ffb86b', comment: '#a8a8a8', func: '#7fd4ff', type: '#ffe36b', variable: '#ffffff', tag: '#ff8f8f', attr: '#ffe36b', operator: '#00e5ff', constant: '#ffb86b', prop: '#7fd4ff' },
    },
    /* ---- unlockable themes (rank = rank index needed, see progress.js) ---- */
    { id: 'ocean', name: 'Ocean', dark: true, rank: 1,
      ui: { shell: '#04131a', bg: '#071c25', bg2: '#0a2430', bg3: '#0e2e3c', bg4: '#14394a', border: '#123442', text: '#d8f3f7', text2: '#9cc7cf', muted: '#5b8a94', accent: '#2dd4bf', onAccent: '#022722', accent2: '#60a5fa', good: '#4ade80', warn: '#fbbf24', bad: '#fb7185', sel: '#2dd4bf33', line: '#ffffff07' },
      syn: { keyword: '#5eead4', string: '#a7f3d0', number: '#fdba74', comment: '#4b7580', func: '#93c5fd', type: '#fde68a', variable: '#d8f3f7', tag: '#5eead4', attr: '#93c5fd', operator: '#99f6e4', constant: '#fdba74', prop: '#93c5fd' } },
    { id: 'terminal', name: 'Retro Terminal', dark: true, rank: 3, mono: true,
      ui: { shell: '#000000', bg: '#030803', bg2: '#061006', bg3: '#0a180a', bg4: '#102410', border: '#123312', text: '#4ade80', text2: '#22c55e', muted: '#15803d', accent: '#4ade80', onAccent: '#021a07', accent2: '#a3e635', good: '#86efac', warn: '#facc15', bad: '#f87171', sel: '#4ade8033', line: '#4ade800a' },
      syn: { keyword: '#bbf7d0', string: '#86efac', number: '#a3e635', comment: '#166534', func: '#4ade80', type: '#d9f99d', variable: '#4ade80', tag: '#bbf7d0', attr: '#a3e635', operator: '#22c55e', constant: '#a3e635', prop: '#86efac' },
      css: 'body{font-family:var(--mono)!important}#app::after{content:"";position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#00000022 0 1px,transparent 1px 3px);z-index:9999}' },
    { id: 'sakura', name: 'Sakura', dark: false, rank: 4,
      ui: { shell: '#f6e9ee', bg: '#fffafc', bg2: '#fdf2f6', bg3: '#f9e6ee', bg4: '#f2d5e1', border: '#efd6e1', text: '#3d2430', text2: '#71495b', muted: '#a8869a', accent: '#e05a8b', onAccent: '#ffffff', accent2: '#7c3aed', good: '#15803d', warn: '#c2410c', bad: '#be123c', sel: '#e05a8b2e', line: '#00000005' },
      syn: { keyword: '#c026d3', string: '#15803d', number: '#c2410c', comment: '#b49aa8', func: '#db2777', type: '#a16207', variable: '#3d2430', tag: '#be123c', attr: '#a16207', operator: '#7c3aed', constant: '#c2410c', prop: '#db2777' } },
    { id: 'pastel', name: 'Pastel', dark: false, rank: 6,
      ui: { shell: '#eef0fb', bg: '#fbfbff', bg2: '#f4f5fd', bg3: '#eceefb', bg4: '#e0e3f7', border: '#e2e5f6', text: '#2e3150', text2: '#5b5f86', muted: '#9a9dbd', accent: '#8b7cf6', onAccent: '#ffffff', accent2: '#f59eb5', good: '#34a77b', warn: '#e39a4c', bad: '#e5677d', sel: '#8b7cf62e', line: '#00000005' },
      syn: { keyword: '#8b7cf6', string: '#3fa77d', number: '#e3894c', comment: '#b2b5d0', func: '#5b8def', type: '#d39b2f', variable: '#2e3150', tag: '#e5677d', attr: '#d39b2f', operator: '#5bb3c9', constant: '#e3894c', prop: '#5b8def' } },
    { id: 'synthwave', name: 'Synthwave', dark: true, rank: 9,
      ui: { shell: '#120a24', bg: '#1a1033', bg2: '#21143f', bg3: '#2a1a4d', bg4: '#36215f', border: '#35205c', text: '#f5e8ff', text2: '#c9b2e8', muted: '#8a6fb5', accent: '#ff4fd8', onAccent: '#24001c', accent2: '#36f9f6', good: '#72f1b8', warn: '#fede5d', bad: '#fe4450', sel: '#ff4fd833', line: '#ffffff08' },
      syn: { keyword: '#fede5d', string: '#ff8b39', number: '#f97e72', comment: '#7a5ea8', func: '#36f9f6', type: '#fe4450', variable: '#f5e8ff', tag: '#72f1b8', attr: '#fede5d', operator: '#ff4fd8', constant: '#f97e72', prop: '#36f9f6' },
      css: '.btn.primary,#runbtn{box-shadow:0 0 14px #ff4fd866}.ltitle,.w-hero h1{text-shadow:0 0 18px #ff4fd855}' },
    { id: 'aero', name: 'Frutiger Aero', dark: false, rank: 12,
      ui: { shell: '#bfe4f7', bg: '#f4fbff', bg2: '#e8f6fd', bg3: '#d9eff9', bg4: '#c6e6f5', border: '#b8dcee', text: '#0d3550', text2: '#2f5d7a', muted: '#6d93ab', accent: '#22a7f0', onAccent: '#ffffff', accent2: '#5ec43a', good: '#3aa635', warn: '#e08a1e', bad: '#d93a3a', sel: '#22a7f033', line: '#00000005' },
      syn: { keyword: '#0b74c4', string: '#3a9a1f', number: '#d4760f', comment: '#8bb0c4', func: '#1592d6', type: '#b0791a', variable: '#0d3550', tag: '#d93a3a', attr: '#b0791a', operator: '#14a3a3', constant: '#d4760f', prop: '#1592d6' },
      css: 'body{background:linear-gradient(180deg,#8fd3f4 0%,#d7f1fb 55%,#b6e59e 100%)!important}#app{background:transparent!important}.sheet,#sidebar,.titlebar,#statusbar,.modal{background:linear-gradient(180deg,#ffffffd9,#eaf7fdcc)!important;backdrop-filter:blur(14px);box-shadow:inset 0 1px 0 #fff,0 6px 24px #0b5c8a22}.btn.primary{background:linear-gradient(180deg,#7fd3ff,#1d9be0 52%,#1488cc)!important;border:1px solid #0f77b5!important;box-shadow:inset 0 1px 0 #ffffffb0;border-radius:99px!important}' },
    { id: 'metro', name: 'Frutiger Metro', dark: true, rank: 15,
      ui: { shell: '#0f0f12', bg: '#17171b', bg2: '#1d1d22', bg3: '#26262c', bg4: '#303038', border: '#2c2c33', text: '#ffffff', text2: '#c8c8d0', muted: '#85858f', accent: '#00a4ef', onAccent: '#ffffff', accent2: '#7fba00', good: '#7fba00', warn: '#ffb900', bad: '#f25022', sel: '#00a4ef33', line: '#ffffff06' },
      syn: { keyword: '#00a4ef', string: '#7fba00', number: '#ffb900', comment: '#6a6a74', func: '#f25022', type: '#ffb900', variable: '#ffffff', tag: '#00a4ef', attr: '#7fba00', operator: '#c8c8d0', constant: '#ffb900', prop: '#00a4ef' },
      css: '.sheet,.modal,.btn,.qopt,.lsn,.unit-head,.course,.tab,.cmdbox,.feedback,.task{border-radius:0!important}.btn.primary{font-weight:600;letter-spacing:.3px}' },
    { id: 'eco', name: 'Frutiger Eco', dark: false, rank: 18,
      ui: { shell: '#d7ecc9', bg: '#f8fdf3', bg2: '#eef8e5', bg3: '#e2f2d4', bg4: '#d2e9c0', border: '#cbe3b6', text: '#1f3a1a', text2: '#46663b', muted: '#7f9b72', accent: '#4caf50', onAccent: '#ffffff', accent2: '#2196f3', good: '#2e7d32', warn: '#e09422', bad: '#d84343', sel: '#4caf5033', line: '#00000005' },
      syn: { keyword: '#2e7d32', string: '#558b2f', number: '#d67a12', comment: '#9bb38d', func: '#1976d2', type: '#9a7b12', variable: '#1f3a1a', tag: '#d84343', attr: '#9a7b12', operator: '#00897b', constant: '#d67a12', prop: '#1976d2' },
      css: 'body{background:radial-gradient(120% 80% at 50% 0%,#e9f7dc,#bfe0a5)!important}#app{background:transparent!important}.sheet,#sidebar,.titlebar,#statusbar,.modal{background:linear-gradient(180deg,#ffffffd6,#f1faeacc)!important;backdrop-filter:blur(12px)}.btn.primary{background:linear-gradient(180deg,#8bd36b,#43a047)!important;border-radius:99px!important;box-shadow:inset 0 1px 0 #ffffffa0}' },
    { id: 'luxury', name: 'Gold Luxury', dark: true, rank: 21,
      ui: { shell: '#0b0906', bg: '#12100c', bg2: '#181510', bg3: '#211c15', bg4: '#2b251b', border: '#2e2719', text: '#f3e9d2', text2: '#c9b994', muted: '#8a7a58', accent: '#d4af37', onAccent: '#1a1404', accent2: '#e8d6a0', good: '#9bc16b', warn: '#e0a23a', bad: '#d0614b', sel: '#d4af3733', line: '#ffffff06' },
      syn: { keyword: '#d4af37', string: '#c9d6a3', number: '#e8b86a', comment: '#6e6146', func: '#f0d58a', type: '#e8d6a0', variable: '#f3e9d2', tag: '#d4af37', attr: '#e8d6a0', operator: '#bfa76a', constant: '#e8b86a', prop: '#f0d58a' },
      css: '.ltitle,.w-hero h1,.cert-name{background:linear-gradient(180deg,#f8e7a8,#c99a2e);-webkit-background-clip:text;background-clip:text;color:transparent!important}' },
    { id: 'cyberpunk', name: 'Cyberpunk', dark: true, rank: 22,
      ui: { shell: '#08080d', bg: '#0e0e16', bg2: '#13131e', bg3: '#1a1a28', bg4: '#232335', border: '#262638', text: '#f0f0ff', text2: '#b4b4d0', muted: '#6e6e92', accent: '#fcee0a', onAccent: '#111100', accent2: '#00f0ff', good: '#00ff9f', warn: '#ff9f00', bad: '#ff003c', sel: '#fcee0a30', line: '#ffffff06' },
      syn: { keyword: '#ff003c', string: '#00ff9f', number: '#fcee0a', comment: '#5a5a7e', func: '#00f0ff', type: '#fcee0a', variable: '#f0f0ff', tag: '#ff003c', attr: '#00f0ff', operator: '#ff9f00', constant: '#fcee0a', prop: '#00f0ff' },
      css: '.btn.primary{clip-path:polygon(0 0,100% 0,100% 70%,92% 100%,0 100%)}' },
    { id: 'vapor', name: 'Vaporwave', dark: false, rank: 23,
      ui: { shell: '#ffd6f1', bg: '#fff5fc', bg2: '#ffeaf8', bg3: '#fbdcf3', bg4: '#f3c8ea', border: '#f1c6e6', text: '#3a1d4a', text2: '#6f3f86', muted: '#a77fbd', accent: '#00b3c6', onAccent: '#ffffff', accent2: '#ff71ce', good: '#05a37a', warn: '#e08a1e', bad: '#e0306a', sel: '#00b3c62e', line: '#00000005' },
      syn: { keyword: '#ff00aa', string: '#05a37a', number: '#7b2ff7', comment: '#c3a3d3', func: '#008ea0', type: '#b4519b', variable: '#3a1d4a', tag: '#e0306a', attr: '#7b2ff7', operator: '#00b3c6', constant: '#7b2ff7', prop: '#008ea0' },
      css: 'body{background:linear-gradient(180deg,#ffd6f1,#c9f3ff)!important}#app{background:transparent!important}' },
    { id: 'aurora', name: 'Aurora', dark: true, rank: 24,
      ui: { shell: '#060b14', bg: '#0a1120', bg2: '#0e172a', bg3: '#131e35', bg4: '#1a2744', border: '#1b2742', text: '#e6f1ff', text2: '#a9bddb', muted: '#6880a8', accent: '#7cf5c4', onAccent: '#032518', accent2: '#b794f6', good: '#7cf5c4', warn: '#fcd34d', bad: '#fb7185', sel: '#7cf5c42e', line: '#ffffff07' },
      syn: { keyword: '#b794f6', string: '#7cf5c4', number: '#fca5a5', comment: '#4c628a', func: '#7dd3fc', type: '#fde68a', variable: '#e6f1ff', tag: '#7cf5c4', attr: '#b794f6', operator: '#93c5fd', constant: '#fca5a5', prop: '#7dd3fc' },
      css: 'body{background:radial-gradient(90% 60% at 20% 0%,#0f3b3a 0%,transparent 60%),radial-gradient(80% 60% at 90% 10%,#2b1b54 0%,transparent 60%),#060b14!important}#app{background:transparent!important}' },
  ];
  const LEGACY = { 'quill-dark': 'quill-night', 'quill-light': 'quill-day' };

  function applyCss(t) {
    const r = document.documentElement.style;
    Object.entries(t.ui).forEach(([k, v]) => r.setProperty('--' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), v));
    Object.entries(t.syn).forEach(([k, v]) => r.setProperty('--syn-' + k, v));
    document.documentElement.dataset.dark = t.dark ? '1' : '0';
    let ex = document.getElementById('theme-extra'); if (!ex) { ex = document.createElement('style'); ex.id = 'theme-extra'; document.head.append(ex); }
    ex.textContent = t.css || '';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t.ui.shell;
  }

  function monacoTheme(t) {
    const s = (c) => c.replace('#', '');
    const r = (token, color, style) => ({ token, foreground: s(color), ...(style ? { fontStyle: style } : {}) });
    return {
      base: t.dark ? 'vs-dark' : 'vs', inherit: true,
      rules: [
        r('', t.syn.variable), r('comment', t.syn.comment, 'italic'), r('keyword', t.syn.keyword), r('keyword.flow', t.syn.keyword),
        r('string', t.syn.string), r('string.escape', t.syn.operator), r('number', t.syn.number), r('regexp', t.syn.string),
        r('type', t.syn.type), r('type.identifier', t.syn.type), r('identifier', t.syn.variable), r('delimiter', t.syn.operator),
        r('operator', t.syn.operator), r('tag', t.syn.tag), r('metatag', t.syn.tag), r('attribute.name', t.syn.attr),
        r('attribute.value', t.syn.string), r('attribute.value.number', t.syn.number), r('attribute.value.unit', t.syn.number),
        r('attribute.value.hex', t.syn.number), r('property', t.syn.prop), r('variable', t.syn.variable), r('variable.predefined', t.syn.constant),
        r('constant', t.syn.constant), r('predefined', t.syn.func), r('function', t.syn.func), r('key', t.syn.prop),
        r('string.key.json', t.syn.prop), r('string.value.json', t.syn.string), r('keyword.json', t.syn.constant),
        r('tag.id.pug', t.syn.func), r('tag.class.pug', t.syn.func), r('meta', t.syn.keyword), r('annotation', t.syn.type),
        r('emphasis', t.syn.variable, 'italic'), r('strong', t.syn.variable, 'bold'), r('keyword.md', t.syn.keyword), r('string.link', t.syn.func),
      ],
      colors: {
        'editor.background': t.ui.bg, 'editor.foreground': t.ui.text, 'editorLineNumber.foreground': t.ui.muted + '99',
        'editorLineNumber.activeForeground': t.ui.text2, 'editor.lineHighlightBackground': t.ui.line, 'editor.lineHighlightBorder': '#00000000',
        'editor.selectionBackground': t.ui.sel, 'editorStickyScroll.shadow': '#00000000', 'editor.inactiveSelectionBackground': t.ui.sel, 'editorCursor.foreground': t.ui.accent,
        'editorIndentGuide.background1': t.ui.border, 'editorIndentGuide.activeBackground1': t.ui.muted,
        'editorWidget.background': t.ui.bg3, 'editorWidget.border': t.ui.border, 'editorSuggestWidget.background': t.ui.bg3,
        'editorSuggestWidget.border': t.ui.border, 'editorSuggestWidget.selectedBackground': t.ui.bg4, 'editorHoverWidget.background': t.ui.bg3,
        'editorHoverWidget.border': t.ui.border, 'minimap.background': t.ui.bg, 'scrollbarSlider.background': t.ui.muted + '33',
        'scrollbarSlider.hoverBackground': t.ui.muted + '55', 'editorGutter.background': t.ui.bg, 'focusBorder': t.ui.accent + '88',
        'input.background': t.ui.bg2, 'input.border': t.ui.border, 'list.hoverBackground': t.ui.bg4, 'list.activeSelectionBackground': t.ui.bg4,
        'editorBracketMatch.background': t.ui.accent + '25', 'editorBracketMatch.border': t.ui.accent + '80', 'editor.findMatchHighlightBackground': t.ui.warn + '40',
        'editorStickyScroll.background': t.ui.bg2, 'editorStickyScrollHover.background': t.ui.bg3,
      },
    };
  }

  Q.themes = { isUnlocked: (id) => { const t = T.find((x) => x.id === id); return !t || !t.rank || (Q.ranks ? Q.ranks.index() >= t.rank : false); }, list: T, get: (id) => T.find((t) => t.id === (LEGACY[id] || id)) || T[0], applyCss, monacoTheme };
})();
