/* Quill — themes (UI colors + syntax colors, shared by Monaco and the fallback editor) */
(() => {
  const T = [
    {
      id: 'quill-dark', name: 'Quill Dark', dark: true,
      ui: { bg: '#0f1117', bg2: '#151821', bg3: '#1b1f2b', bg4: '#242938', border: '#262b3a', text: '#e6e8ef', text2: '#b4b9c9', muted: '#6f768c', accent: '#7c5cff', accent2: '#22d3ee', good: '#4ade80', warn: '#facc15', bad: '#f87171', sel: '#7c5cff40', line: '#ffffff08' },
      syn: { keyword: '#c792ea', string: '#a5e075', number: '#f78c6c', comment: '#5c6680', func: '#82aaff', type: '#ffcb6b', variable: '#e6e8ef', tag: '#f07178', attr: '#ffcb6b', operator: '#89ddff', constant: '#f78c6c', prop: '#82aaff' },
    },
    {
      id: 'quill-light', name: 'Quill Light', dark: false,
      ui: { bg: '#ffffff', bg2: '#f6f7fb', bg3: '#eceef5', bg4: '#e1e4ee', border: '#dde1ea', text: '#1f2330', text2: '#454b5e', muted: '#8a90a3', accent: '#6d4aff', accent2: '#0891b2', good: '#16a34a', warn: '#ca8a04', bad: '#dc2626', sel: '#6d4aff30', line: '#00000006' },
      syn: { keyword: '#7c3aed', string: '#15803d', number: '#c2410c', comment: '#9aa1b2', func: '#2563eb', type: '#b45309', variable: '#1f2330', tag: '#dc2626', attr: '#b45309', operator: '#0e7490', constant: '#c2410c', prop: '#2563eb' },
    },
    {
      id: 'midnight', name: 'Midnight Blue', dark: true,
      ui: { bg: '#0b1222', bg2: '#0f182c', bg3: '#152038', bg4: '#1c2a47', border: '#1d2b48', text: '#dbe5f7', text2: '#a9b8d6', muted: '#61739a', accent: '#38bdf8', accent2: '#a78bfa', good: '#34d399', warn: '#fbbf24', bad: '#fb7185', sel: '#38bdf840', line: '#ffffff07' },
      syn: { keyword: '#7dd3fc', string: '#86efac', number: '#fda4af', comment: '#4b5d82', func: '#c4b5fd', type: '#fcd34d', variable: '#dbe5f7', tag: '#7dd3fc', attr: '#c4b5fd', operator: '#94a3b8', constant: '#fda4af', prop: '#c4b5fd' },
    },
    {
      id: 'vampire', name: 'Vampire', dark: true,
      ui: { bg: '#1e1f29', bg2: '#22232e', bg3: '#2a2b38', bg4: '#343546', border: '#353747', text: '#f8f8f2', text2: '#c9cad6', muted: '#7f83a3', accent: '#ff79c6', accent2: '#8be9fd', good: '#50fa7b', warn: '#f1fa8c', bad: '#ff5555', sel: '#ff79c640', line: '#ffffff08' },
      syn: { keyword: '#ff79c6', string: '#f1fa8c', number: '#bd93f9', comment: '#6272a4', func: '#50fa7b', type: '#8be9fd', variable: '#f8f8f2', tag: '#ff79c6', attr: '#50fa7b', operator: '#ff79c6', constant: '#bd93f9', prop: '#8be9fd' },
    },
    {
      id: 'forest', name: 'Forest', dark: true,
      ui: { bg: '#11160f', bg2: '#161d14', bg3: '#1d261a', bg4: '#263222', border: '#273324', text: '#e3ead9', text2: '#b7c4a9', muted: '#6e7d63', accent: '#84cc16', accent2: '#f59e0b', good: '#84cc16', warn: '#f59e0b', bad: '#ef4444', sel: '#84cc1640', line: '#ffffff07' },
      syn: { keyword: '#e9b872', string: '#a3d977', number: '#f5a97f', comment: '#5d6b54', func: '#8ccfb4', type: '#e9d872', variable: '#e3ead9', tag: '#e98a72', attr: '#e9d872', operator: '#9ab89a', constant: '#f5a97f', prop: '#8ccfb4' },
    },
    {
      id: 'paper', name: 'Paper', dark: false,
      ui: { bg: '#fbf8f1', bg2: '#f3eee2', bg3: '#ebe4d4', bg4: '#e0d7c3', border: '#ddd3be', text: '#2d2a24', text2: '#57514a', muted: '#958c7c', accent: '#c2410c', accent2: '#0f766e', good: '#4d7c0f', warn: '#b45309', bad: '#b91c1c', sel: '#c2410c30', line: '#00000006' },
      syn: { keyword: '#a21caf', string: '#4d7c0f', number: '#c2410c', comment: '#a39a88', func: '#1d4ed8', type: '#a16207', variable: '#2d2a24', tag: '#b91c1c', attr: '#a16207', operator: '#0f766e', constant: '#c2410c', prop: '#1d4ed8' },
    },
    {
      id: 'contrast', name: 'High Contrast', dark: true,
      ui: { bg: '#000000', bg2: '#0a0a0a', bg3: '#141414', bg4: '#222222', border: '#4a4a4a', text: '#ffffff', text2: '#e5e5e5', muted: '#a3a3a3', accent: '#ffd400', accent2: '#00e5ff', good: '#00ff7f', warn: '#ffd400', bad: '#ff4d4d', sel: '#ffd40055', line: '#ffffff12' },
      syn: { keyword: '#ff9dfc', string: '#9dff9d', number: '#ffb86b', comment: '#9a9a9a', func: '#7fd4ff', type: '#ffe36b', variable: '#ffffff', tag: '#ff8f8f', attr: '#ffe36b', operator: '#00e5ff', constant: '#ffb86b', prop: '#7fd4ff' },
    },
  ];

  function applyCss(t) {
    const r = document.documentElement.style;
    Object.entries(t.ui).forEach(([k, v]) => r.setProperty('--' + k, v));
    Object.entries(t.syn).forEach(([k, v]) => r.setProperty('--syn-' + k, v));
    document.documentElement.dataset.dark = t.dark ? '1' : '0';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t.ui.bg2;
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
        'editor.selectionBackground': t.ui.sel, 'editor.inactiveSelectionBackground': t.ui.sel, 'editorCursor.foreground': t.ui.accent,
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

  Q.themes = { list: T, get: (id) => T.find((t) => t.id === id) || T[0], applyCss, monacoTheme };
})();
