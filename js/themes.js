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
  ];
  const LEGACY = { 'quill-dark': 'quill-night', 'quill-light': 'quill-day' };

  function applyCss(t) {
    const r = document.documentElement.style;
    Object.entries(t.ui).forEach(([k, v]) => r.setProperty('--' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), v));
    Object.entries(t.syn).forEach(([k, v]) => r.setProperty('--syn-' + k, v));
    document.documentElement.dataset.dark = t.dark ? '1' : '0';
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

  Q.themes = { list: T, get: (id) => T.find((t) => t.id === (LEGACY[id] || id)) || T[0], applyCss, monacoTheme };
})();
