/* Quill — editor adapter: Monaco (VS Code's editor) when online, built-in lightweight editor as an offline fallback */
(() => {
  const { h, esc, bus } = Q;
  const MONACO = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min';

  const completionProviders = []; // {langs:[...]|'*', fn(ctx) => items}

  /* ======================================================================
     Monaco implementation
     ====================================================================== */
  function loadMonaco(timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      if (window.monaco) return resolve(window.monaco);
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      window.MonacoEnvironment = {
        getWorkerUrl() {
          const src = `self.MonacoEnvironment={baseUrl:'${MONACO}/'};importScripts('${MONACO}/vs/base/worker/workerMain.js');`;
          return URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        },
      };
      const s = document.createElement('script');
      s.src = MONACO + '/vs/loader.js';
      s.onerror = () => { clearTimeout(timer); reject(new Error('load failed')); };
      s.onload = () => {
        try {
          window.require.config({ paths: { vs: MONACO + '/vs' } });
          window.require(['vs/editor/editor.main'], () => { clearTimeout(timer); resolve(window.monaco); }, (err) => { clearTimeout(timer); reject(err); });
        } catch (e) { clearTimeout(timer); reject(e); }
      };
      document.head.append(s);
    });
  }

  function makeMonaco(monaco, host, settings) {
    const models = new Map(); // id -> model
    const views = new Map();  // id -> viewState
    const decos = new Map();  // key|id -> ids
    let activeId = null;
    const changeFns = [], cursorFns = [], markerFns = [];

    // Treat every file as its own module so names don't clash between files
    const tsd = monaco.languages.typescript;
    const opts = { target: tsd.ScriptTarget.ES2020, allowNonTsExtensions: true, moduleDetection: 3, allowJs: true, checkJs: false, lib: ['es2020', 'dom'] };
    tsd.typescriptDefaults.setCompilerOptions(opts);
    tsd.javascriptDefaults.setCompilerOptions(opts);
    tsd.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });

    Q.themes.list.forEach((t) => monaco.editor.defineTheme(t.id, Q.themes.monacoTheme(t)));

    const ed = monaco.editor.create(host, {
      model: null, automaticLayout: true, theme: settings.theme,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontSize: settings.fontSize, tabSize: settings.tabSize, wordWrap: settings.wordWrap ? 'on' : 'off',
      lineNumbers: settings.lineNumbers ? 'on' : 'off', fontLigatures: settings.ligatures,
      padding: { top: 10 }, scrollBeyondLastLine: false, renderLineHighlight: 'all', roundedSelection: false,
      fixedOverflowWidgets: true, mouseWheelZoom: true, linkedEditing: true, 'semanticHighlighting.enabled': true,
      suggest: { preview: true, showStatusBar: true }, inlineSuggest: { enabled: true }, quickSuggestionsDelay: 80,
    });

    if (document.fonts) document.fonts.ready.then(() => monaco.editor.remeasureFonts());
    ed.onDidChangeCursorPosition(() => fireCursor());
    ed.onDidChangeCursorSelection(() => fireCursor());
    function fireCursor() {
      const m = ed.getModel(); if (!m) return;
      const p = ed.getPosition(); const sel = ed.getSelection();
      const info = { id: activeId, line: p.lineNumber, col: p.column, lineText: m.getLineContent(p.lineNumber), langId: m.getLanguageId(), selLength: m.getValueInRange(sel).length, lines: m.getLineCount() };
      cursorFns.forEach((f) => f(info));
    }

    monaco.editor.onDidChangeMarkers((uris) => {
      for (const [id, m] of models) if (uris.some((u) => u.toString() === m.uri.toString())) markerFns.forEach((f) => f(id));
    });

    // Bridge Quill completion providers into Monaco
    const registered = new Set();
    function registerFor(lang) {
      if (registered.has(lang)) return; registered.add(lang);
      monaco.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: lang === 'html' ? ['.', '#', '>', '*', '+', '!'] : undefined,
        provideCompletionItems(model, pos) {
          const before = model.getValueInRange({ startLineNumber: pos.lineNumber, startColumn: 1, endLineNumber: pos.lineNumber, endColumn: pos.column });
          const suggestions = [];
          completionProviders.forEach((p) => {
            if (p.langs !== '*' && !p.langs.includes(lang)) return;
            (p.fn({ before, langId: lang }) || []).forEach((it) => {
              const len = it.replaceLen != null ? it.replaceLen : (before.match(/[\w$!.-]*$/) || [''])[0].length;
              suggestions.push({
                label: it.label, kind: it.kind === 'emmet' ? monaco.languages.CompletionItemKind.Property : monaco.languages.CompletionItemKind.Snippet,
                insertText: it.insert, insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: it.detail || 'Quill snippet', documentation: it.doc ? { value: it.doc } : undefined,
                filterText: it.filter || it.label, sortText: it.sort || '0' + it.label,
                range: { startLineNumber: pos.lineNumber, startColumn: pos.column - len, endLineNumber: pos.lineNumber, endColumn: pos.column },
              });
            });
          });
          return { suggestions };
        },
      });
    }

    const uriFor = (id) => monaco.Uri.from({ scheme: 'file', path: '/' + id.replace(/^@/, '__') });

    const api = {
      kind: 'monaco', monaco, raw: ed,
      get activeId() { return activeId; },
      has: (id) => models.has(id),
      ensure(id, value, langId) {
        let m = models.get(id);
        if (!m) {
          m = monaco.editor.getModel(uriFor(id));
          if (m) m.setValue(value ?? ''); else m = monaco.editor.createModel(value ?? '', langId, uriFor(id));
          if (m.getLanguageId() !== langId) monaco.editor.setModelLanguage(m, langId);
          models.set(id, m);
          m.onDidChangeContent(() => changeFns.forEach((f) => f(id, m.getValue())));
          registerFor(langId);
        }
        return m;
      },
      open(id, value, langId) {
        const m = api.ensure(id, value, langId);
        if (activeId && models.has(activeId) && activeId !== id) views.set(activeId, ed.saveViewState());
        activeId = id;
        ed.setModel(m);
        if (views.has(id)) ed.restoreViewState(views.get(id));
        fireCursor();
      },
      showNothing() { if (activeId && models.has(activeId)) views.set(activeId, ed.saveViewState()); activeId = null; ed.setModel(null); },
      get(id) { const m = models.get(id); return m ? m.getValue() : null; },
      set(id, value) { const m = models.get(id); if (m && m.getValue() !== value) m.pushEditOperations([], [{ range: m.getFullModelRange(), text: value }], () => null); },
      close(id) { const m = models.get(id); if (m) { if (activeId === id) { ed.setModel(null); activeId = null; } m.dispose(); models.delete(id); views.delete(id); } },
      rename(from, to, langId) { const v = api.get(from); const wasActive = activeId === from; api.close(from); if (wasActive) api.open(to, v, langId); else api.ensure(to, v, langId); },
      setLang(id, langId) { const m = models.get(id); if (m) { monaco.editor.setModelLanguage(m, langId); registerFor(langId); fireCursor(); } },
      langOf(id) { const m = models.get(id); return m && m.getLanguageId(); },
      onChange: (f) => changeFns.push(f), onCursor: (f) => cursorFns.push(f), onMarkers: (f) => markerFns.push(f),
      applySettings(s) {
        ed.updateOptions({
          fontSize: s.fontSize, tabSize: s.tabSize, wordWrap: s.wordWrap ? 'on' : 'off', lineNumbers: s.lineNumbers ? 'on' : 'off',
          fontLigatures: s.ligatures, minimap: { enabled: !!s.minimap }, bracketPairColorization: { enabled: !!s.bracketColors },
          guides: { bracketPairs: s.bracketColors ? 'active' : false, indentation: !!s.indentGuides, highlightActiveIndentation: !!s.indentGuides },
          stickyScroll: { enabled: !!s.stickyScroll }, cursorSmoothCaretAnimation: s.smoothCaret ? 'on' : 'off', smoothScrolling: !!s.smoothCaret,
          cursorBlinking: s.smoothCaret ? 'smooth' : 'blink', colorDecorators: !!s.colorPreview, renderWhitespace: s.showWhitespace ? 'boundary' : 'none',
          autoClosingBrackets: s.autoClose ? 'languageDefined' : 'never', autoClosingQuotes: s.autoClose ? 'languageDefined' : 'never',
          wordBasedSuggestions: 'currentDocument', quickSuggestions: s.autocomplete ? { other: true, comments: false, strings: true } : false,
          suggestOnTriggerCharacters: !!s.autocomplete, parameterHints: { enabled: !!s.autocomplete }, hover: { enabled: s.hover !== false },
          lightbulb: { enabled: 'on' }, folding: true, showFoldingControls: 'mouseover', renderValidationDecorations: 'on',
        });
        monaco.editor.getModels().forEach((m) => m.updateOptions({ tabSize: s.tabSize, insertSpaces: true }));
      },
      setTheme(id) { monaco.editor.setTheme(id); },
      async format() {
        const a = ed.getAction('editor.action.formatDocument');
        if (a && a.isSupported()) { await a.run(); return true; }
        return false;
      },
      focus: () => ed.focus(),
      layout: () => ed.layout(),
      insert(text) {
        const sel = ed.getSelection(); if (!sel) return;
        ed.executeEdits('quill', [{ range: sel, text, forceMoveMarkers: true }]); ed.focus();
      },
      insertBelow(text) {
        const m = ed.getModel(); const p = ed.getPosition(); if (!m || !p) return;
        const line = p.lineNumber; const cur = m.getLineContent(line); const indent = cur.match(/^\s*/)[0] + (/[{:([]\s*$/.test(cur) ? ' '.repeat(Q.app?.settings.tabSize || 2) : '');
        const body = text.replace(/\n$/, '').split('\n').map((l) => (l ? indent + l : l)).join('\n');
        const end = m.getLineMaxColumn(line);
        if (!cur.trim()) ed.executeEdits('quill', [{ range: new monaco.Range(line, 1, line, end), text: body }]);
        else ed.executeEdits('quill', [{ range: new monaco.Range(line, end, line, end), text: '\n' + body }]);
        const first = cur.trim() ? line + 1 : line; const lastLine = first + body.split('\n').length - 1;
        ed.setSelection(new monaco.Range(first, 1, lastLine, m.getLineMaxColumn(lastLine)));
        ed.revealLineInCenterIfOutsideViewport(lastLine); ed.focus();
      },
      insertSnippet(snippet) { const c = ed.getContribution('snippetController2'); if (c) c.insert(snippet); else api.insert(snippet); ed.focus(); },
      reveal(line, col = 1) { ed.revealLineInCenter(line); ed.setPosition({ lineNumber: line, column: col }); ed.focus(); },
      selection() { const m = ed.getModel(); const s = ed.getSelection(); return m && s ? m.getValueInRange(s) : ''; },
      command(name) {
        const map = { find: 'actions.find', replace: 'editor.action.startFindReplaceAction', gotoLine: 'editor.action.gotoLine', comment: 'editor.action.commentLine', foldAll: 'editor.foldAll', unfoldAll: 'editor.unfoldAll', duplicate: 'editor.action.copyLinesDownAction', palette: 'editor.action.quickCommand', rename: 'editor.action.rename', undo: 'undo', redo: 'redo', selectAll: 'editor.action.selectAll', multiCursorNext: 'editor.action.addSelectionToNextFindMatch', zoomIn: 'editor.action.fontZoomIn', zoomOut: 'editor.action.fontZoomOut', upper: 'editor.action.transformToUppercase', lower: 'editor.action.transformToLowercase', sortLines: 'editor.action.sortLinesAscending', moveUp: 'editor.action.moveLinesUpAction', moveDown: 'editor.action.moveLinesDownAction', deleteLine: 'editor.action.deleteLines', trimWhitespace: 'editor.action.trimTrailingWhitespace' };
        ed.focus();
        if (name === 'undo' || name === 'redo') { ed.trigger('quill', name, null); return; }
        const a = ed.getAction(map[name] || name);
        if (a) a.run(); else ed.trigger('quill', map[name] || name, null);
      },
      markers(id) {
        const m = models.get(id); if (!m) return [];
        return monaco.editor.getModelMarkers({ resource: m.uri }).map((k) => ({ line: k.startLineNumber, col: k.startColumn, msg: k.message, severity: k.severity >= 8 ? 'error' : k.severity >= 4 ? 'warning' : 'info' }));
      },
      setMarkers(id, list) { // custom markers (e.g. Python errors)
        const m = models.get(id); if (!m) return;
        monaco.editor.setModelMarkers(m, 'quill', list.map((k) => ({ startLineNumber: k.line, endLineNumber: k.line, startColumn: 1, endColumn: m.getLineMaxColumn(Math.min(k.line, m.getLineCount())), message: k.msg, severity: k.severity === 'warning' ? 4 : 8 })));
      },
      decorate(key, id, list) {
        const m = models.get(id); if (!m) return;
        const k = key + '|' + id;
        const n = m.getLineCount();
        decos.set(k, m.deltaDecorations(decos.get(k) || [], list.filter((d) => d.line <= n).map((d) => {
          const lineLen = m.getLineMaxColumn(d.line);
          const range = d.after ? new monaco.Range(d.line, lineLen, d.line, lineLen) : new monaco.Range(d.line, d.start || 1, d.line, d.end || lineLen);
          return { range, options: d.after ? { after: { content: d.after, inlineClassName: d.className } } : { inlineClassName: d.className, isWholeLine: !!d.whole } };
        })));
      },
      cursorCoords() {
        const p = ed.getPosition(); if (!p) return null;
        const c = ed.getScrolledVisiblePosition(p); const r = host.getBoundingClientRect();
        return c ? { x: r.left + c.left, y: r.top + c.top + c.height / 2 } : null;
      },
      async transpileTS(id) {
        const m = models.get(id); if (!m) throw new Error('No TypeScript file open');
        const getWorker = await tsd.getTypeScriptWorker();
        const client = await getWorker(m.uri);
        const out = await client.getEmitOutput(m.uri.toString());
        if (!out.outputFiles.length) throw new Error('TypeScript produced no output');
        return out.outputFiles[0].text.replace(/^export \{\};?\s*$/m, '');
      },
      registerLang: registerFor,
      addTabHandler(fn) { ed.addCommand(monaco.KeyCode.Tab, () => { if (!fn()) ed.trigger('keyboard', 'tab', null); }, '!suggestWidgetVisible && !inSnippetMode && !editorHasSelection && !editorTabMovesFocus && !inlineSuggestionVisible'); },
      onKey(fn) { ed.onKeyDown((e) => fn(e.browserEvent)); },
      onType(fn) { ed.onDidChangeModelContent((e) => { if (!e.isUndoing && !e.isRedoing && e.changes.length === 1) fn(e.changes[0].text, activeId); }); },
      textBefore() { const m = ed.getModel(); const p = ed.getPosition(); return m ? m.getValueInRange({ startLineNumber: p.lineNumber, startColumn: 1, endLineNumber: p.lineNumber, endColumn: p.column }) : ''; },
      textAfter() { const m = ed.getModel(); const p = ed.getPosition(); return m ? m.getLineContent(p.lineNumber).slice(p.column - 1) : ''; },
      replaceBefore(len, text, cursorBack = 0) {
        const p = ed.getPosition();
        ed.executeEdits('quill', [{ range: new monaco.Range(p.lineNumber, p.column - len, p.lineNumber, p.column), text }]);
        if (cursorBack) { const q = ed.getPosition(); ed.setPosition({ lineNumber: q.lineNumber, column: q.column - cursorBack }); }
      },
    };
    api.applySettings(settings);
    return api;
  }

  /* ======================================================================
     Fallback: lightweight built-in editor (works fully offline)
     ====================================================================== */
  function highlighter(langId) {
    const L = Q.langs.byId[langId] || Q.langs.byId.plaintext;
    const kw = new Set((L.kw || '').split(/\s+/).filter(Boolean));
    const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (langId === 'html' || langId === 'xml') {
      const re = /(<!--[\s\S]*?(?:-->|$))|(<\/?[\w:-]+)|(\s[\w:@.-]+)(?==)|("[^"]*"?|'[^']*'?)|(\/?>)|(&\w+;)/g;
      return (src) => src.replace(re, (m, c, tag, attr, str, close, ent, off) => {
        if (c) return `\u0001comment\u0002${m}\u0003`;
        if (tag) return `\u0001tag\u0002${m}\u0003`;
        if (attr) return `\u0001attr\u0002${m}\u0003`;
        if (str) return `\u0001string\u0002${m}\u0003`;
        if (close) return `\u0001tag\u0002${m}\u0003`;
        if (ent) return `\u0001constant\u0002${m}\u0003`;
        return m;
      });
    }
    if (langId === 'css' || langId === 'scss') {
      const re = /(\/\*[\s\S]*?(?:\*\/|$)|\/\/.*)|("[^"\n]*"?|'[^'\n]*'?)|(@[\w-]+)|(#[0-9a-fA-F]{3,8}\b)|(-?\d*\.?\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?\b)|([\w-]+)(?=\s*:(?!:)[^{]*[;}\n])|(:{1,2}[\w-]+)|([.#][\w-]+)/g;
      return (src) => src.replace(re, (m, c, s, at, hex, num, prop, pseudo, sel) =>
        c ? `\u0001comment\u0002${m}\u0003` : s ? `\u0001string\u0002${m}\u0003` : at ? `\u0001keyword\u0002${m}\u0003` : hex ? `\u0001number\u0002${m}\u0003` : num ? `\u0001number\u0002${m}\u0003` : prop ? `\u0001prop\u0002${m}\u0003` : pseudo ? `\u0001keyword\u0002${m}\u0003` : sel ? `\u0001func\u0002${m}\u0003` : m);
    }
    if (langId === 'markdown') {
      const re = /(^#{1,6} .*$)|(\*\*[^*\n]+\*\*)|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\n]+\))|(^\s*[-*] )/gm;
      return (src) => src.replace(re, (m, hd, b, code, link, li) => hd ? `\u0001keyword\u0002${m}\u0003` : b ? `\u0001type\u0002${m}\u0003` : code ? `\u0001string\u0002${m}\u0003` : link ? `\u0001func\u0002${m}\u0003` : li ? `\u0001operator\u0002${m}\u0003` : m);
    }
    const cm = L.comment || {};
    const parts = [];
    if (langId === 'python') parts.push('"""[\\s\\S]*?(?:"""|$)|\'\'\'[\\s\\S]*?(?:\'\'\'|$)');
    if (cm.block) parts.push(reEsc(cm.block[0]) + '[\\s\\S]*?(?:' + reEsc(cm.block[1]) + '|$)');
    if (cm.line) parts.push(reEsc(cm.line) + '.*');
    const commentRe = parts.length ? parts.join('|') : '(?!x)x';
    const strRe = langId === 'javascript' || langId === 'typescript' ? '`(?:\\\\.|[^`\\\\])*`?|"(?:\\\\.|[^"\\\\\\n])*"?|\'(?:\\\\.|[^\'\\\\\\n])*\'?' : '[fbr]?"(?:\\\\.|[^"\\\\\\n])*"?|[fbr]?\'(?:\\\\.|[^\'\\\\\\n])*\'?';
    const re = new RegExp(`(${commentRe})|(${strRe})|(\\b\\d[\\d_]*\\.?\\d*(?:e[+-]?\\d+)?\\b|\\b0x[\\da-f]+\\b)|([A-Za-z_$][\\w$]*)(\\s*\\()?|([=+\\-*/%<>!&|^~?:]+)`, 'gi');
    return (src) => src.replace(re, (m, c, s, n, id, call, op) => {
      if (c) return `\u0001comment\u0002${m}\u0003`;
      if (s) return `\u0001string\u0002${m}\u0003`;
      if (n) return `\u0001number\u0002${m}\u0003`;
      if (id) {
        const cls = kw.has(id) ? 'keyword' : call ? 'func' : /^[A-Z]/.test(id) ? 'type' : null;
        const tail = call || '';
        return cls ? `\u0001${cls}\u0002${id}\u0003${tail}` : m;
      }
      if (op) return `\u0001operator\u0002${m}\u0003`;
      return m;
    });
  }
  const render = (marked) => esc(marked).replace(/\u0001(\w+)\u0002/g, '<span class="t-$1">').replace(/\u0003/g, '</span>');

  function makeFallback(host, settings) {
    host.innerHTML = '';
    const wrap = h('div', { class: 'fb-wrap' });
    const gutter = h('div', { class: 'fb-gutter' });
    const scroller = h('div', { class: 'fb-area' });
    const pre = h('pre', { class: 'fb-hl', 'aria-hidden': 'true' });
    const ta = h('textarea', { class: 'fb-ta', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', wrap: 'off' });
    scroller.append(pre, ta); wrap.append(gutter, scroller); host.append(wrap);
    const docs = new Map(); // id -> {value, lang, sel:[a,b], scroll:[x,y]}
    let activeId = null, opts = { ...settings };
    const changeFns = [], cursorFns = [], keyFns = [], typeFns = [];
    let hl = highlighter('plaintext');

    function paint() {
      const v = ta.value;
      pre.innerHTML = render(hl(v)) + '\n';
      const n = v.split('\n').length;
      if (gutter.childElementCount !== n) gutter.innerHTML = Array.from({ length: n }, (_, i) => `<div>${i + 1}</div>`).join('');
      syncScroll();
    }
    function syncScroll() { pre.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`; gutter.scrollTop = ta.scrollTop; }
    function fireCursor() {
      if (!activeId) return;
      const pos = ta.selectionStart, before = ta.value.slice(0, pos);
      const line = before.split('\n').length, ls = before.lastIndexOf('\n') + 1;
      const le = ta.value.indexOf('\n', pos);
      const info = { id: activeId, line, col: pos - ls + 1, lineText: ta.value.slice(ls, le < 0 ? undefined : le), langId: docs.get(activeId).lang, selLength: ta.selectionEnd - ta.selectionStart, lines: ta.value.split('\n').length };
      gutter.querySelectorAll('.cur').forEach((e) => e.classList.remove('cur'));
      const g = gutter.children[line - 1]; if (g) g.classList.add('cur');
      cursorFns.forEach((f) => f(info));
    }
    const ins = (text) => { ta.focus(); if (!document.execCommand('insertText', false, text)) { ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } };

    ta.addEventListener('input', (e) => {
      if (!activeId) return;
      docs.get(activeId).value = ta.value; paint();
      changeFns.forEach((f) => f(activeId, ta.value));
      if (e.inputType === 'insertText' && e.data) typeFns.forEach((f) => f(e.data, activeId));
      fireCursor();
    });
    ta.addEventListener('scroll', syncScroll);
    ['keyup', 'click', 'select'].forEach((ev) => ta.addEventListener(ev, fireCursor));
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
    ta.addEventListener('keydown', (e) => {
      for (const f of keyFns) { f(e); if (e.defaultPrevented) return; }
      const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value, tab = ' '.repeat(opts.tabSize);
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      if (e.key === 'Tab') {
        e.preventDefault();
        if (s === en && !e.shiftKey) return ins(tab);
        // indent / outdent selected lines
        const block = v.slice(lineStart, en);
        const out = e.shiftKey ? block.replace(new RegExp(`^ {1,${opts.tabSize}}`, 'gm'), '') : block.replace(/^/gm, tab);
        ta.setSelectionRange(lineStart, en); ins(out); ta.setSelectionRange(lineStart, lineStart + out.length);
      } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const line = v.slice(lineStart, s);
        let indent = line.match(/^\s*/)[0];
        const prev = line.trimEnd().slice(-1), next = v[s];
        const lang = docs.get(activeId)?.lang;
        if ('{[('.includes(prev) && prev || (lang === 'python' && prev === ':')) {
          if (prev && pairs[prev] === next) { ins('\n' + indent + tab + '\n' + indent); ta.setSelectionRange(s + 1 + indent.length + tab.length, s + 1 + indent.length + tab.length); return; }
          indent += tab;
        }
        ins('\n' + indent);
      } else if (opts.autoClose && pairs[e.key] && !e.ctrlKey) {
        if ((e.key === '"' || e.key === "'" || e.key === '`') && v[s] === e.key) { e.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
        e.preventDefault();
        const sel = v.slice(s, en);
        ins(e.key + sel + pairs[e.key]); ta.setSelectionRange(s + 1, s + 1 + sel.length);
      } else if (opts.autoClose && ')]}'.includes(e.key) && v[s] === e.key && s === en) {
        e.preventDefault(); ta.setSelectionRange(s + 1, s + 1);
      } else if (e.key === 'Backspace' && s === en && pairs[v[s - 1]] === v[s]) {
        e.preventDefault(); ta.setSelectionRange(s - 1, s + 1); ins('');
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault(); api.command('comment');
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault(); api.command('duplicate');
      } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault(); api.command(e.key === 'ArrowUp' ? 'moveUp' : 'moveDown');
      }
    });

    const api = {
      kind: 'fallback',
      get activeId() { return activeId; },
      has: (id) => docs.has(id),
      open(id, value, langId) {
        if (activeId && docs.has(activeId)) { const d = docs.get(activeId); d.sel = [ta.selectionStart, ta.selectionEnd]; d.scroll = [ta.scrollLeft, ta.scrollTop]; }
        if (!docs.has(id)) docs.set(id, { value: value ?? '', lang: langId, sel: [0, 0], scroll: [0, 0] });
        const d = docs.get(id); activeId = id; hl = highlighter(d.lang);
        wrap.style.display = '';
        ta.value = d.value; ta.setSelectionRange(...d.sel); ta.scrollLeft = d.scroll[0]; ta.scrollTop = d.scroll[1];
        paint(); fireCursor();
      },
      showNothing() { activeId = null; wrap.style.display = 'none'; },
      get(id) { return docs.has(id) ? docs.get(id).value : null; },
      set(id, value) { const d = docs.get(id); if (!d) return; d.value = value; if (id === activeId) { ta.value = value; paint(); } changeFns.forEach((f) => f(id, value)); },
      close(id) { docs.delete(id); if (activeId === id) api.showNothing(); },
      rename(from, to, langId) { const d = docs.get(from); if (!d) return; docs.delete(from); d.lang = langId; docs.set(to, d); if (activeId === from) { activeId = to; hl = highlighter(langId); paint(); } },
      setLang(id, langId) { const d = docs.get(id); if (d) { d.lang = langId; if (id === activeId) { hl = highlighter(langId); paint(); fireCursor(); } } },
      langOf(id) { return docs.get(id)?.lang; },
      onChange: (f) => changeFns.push(f), onCursor: (f) => cursorFns.push(f), onMarkers: () => {},
      applySettings(s) {
        opts = { ...s };
        wrap.style.setProperty('--fs', s.fontSize + 'px'); wrap.style.setProperty('--tab', s.tabSize);
        gutter.style.display = s.lineNumbers ? '' : 'none';
        wrap.classList.toggle('ligatures', !!s.ligatures);
        if (activeId) paint();
      },
      setTheme() {},
      async format() { return false; },
      focus: () => ta.focus(), layout: () => {},
      insert: (text) => ins(text),
      insertBelow(text) {
        const v = ta.value, s = ta.selectionStart;
        const ls = v.lastIndexOf('\n', s - 1) + 1; let le = v.indexOf('\n', s); if (le < 0) le = v.length;
        const cur = v.slice(ls, le); const indent = cur.match(/^\s*/)[0] + (/[{:([]\s*$/.test(cur) ? ' '.repeat(Q.app?.settings.tabSize || 2) : '');
        const body = text.replace(/\n$/, '').split('\n').map((l) => (l ? indent + l : l)).join('\n');
        ta.focus();
        if (!cur.trim()) { ta.setSelectionRange(ls, le); ins(body); ta.setSelectionRange(ls, ls + body.length); }
        else { ta.setSelectionRange(le, le); ins('\n' + body); ta.setSelectionRange(le + 1, le + 1 + body.length); }
        fireCursor();
      },
      insertSnippet(sn) {
        // strip snippet placeholders: ${1:foo} -> foo, $0/$1 -> cursor
        let cursor = -1; let out = '';
        sn.replace(/\$\{\d+:([^}]*)\}|\$\d+|[^$]+|\$/g, (m, ph) => { if (ph != null) out += ph; else if (/^\$\d+$/.test(m)) { if (cursor < 0) cursor = out.length; } else out += m; });
        const start = ta.selectionStart; ins(out);
        if (cursor >= 0) ta.setSelectionRange(start + cursor, start + cursor);
      },
      reveal(line, col = 1) {
        const lines = ta.value.split('\n'); let pos = 0;
        for (let i = 0; i < Math.min(line - 1, lines.length); i++) pos += lines[i].length + 1;
        pos += col - 1; ta.focus(); ta.setSelectionRange(pos, pos);
        ta.scrollTop = Math.max(0, (line - 6) * parseFloat(getComputedStyle(ta).lineHeight));
        syncScroll(); fireCursor();
      },
      selection: () => ta.value.slice(ta.selectionStart, ta.selectionEnd),
      command(name) {
        const v = ta.value, s = ta.selectionStart, en = ta.selectionEnd;
        const ls = v.lastIndexOf('\n', s - 1) + 1; let le = v.indexOf('\n', en); if (le < 0) le = v.length;
        const block = v.slice(ls, le);
        ta.focus();
        if (name === 'undo' || name === 'redo') document.execCommand(name);
        else if (name === 'selectAll') ta.select();
        else if (name === 'comment') {
          const cm = Q.langs.byId[docs.get(activeId)?.lang]?.comment || {};
          ta.setSelectionRange(ls, le);
          if (cm.line) {
            const all = block.split('\n').every((l) => !l.trim() || l.trimStart().startsWith(cm.line));
            ins(block.split('\n').map((l) => (all ? l.replace(new RegExp('^(\\s*)' + cm.line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' ?'), '$1') : l.trim() ? l.replace(/^(\s*)/, `$1${cm.line} `) : l)).join('\n'));
          } else if (cm.block) {
            const [a, b] = cm.block; const t = block.trim();
            ins(t.startsWith(a) && t.endsWith(b) ? block.replace(a + ' ', '').replace(a, '').replace(' ' + b, '').replace(b, '') : `${a} ${block} ${b}`);
          }
        } else if (name === 'duplicate') { ta.setSelectionRange(le, le); ins('\n' + block); }
        else if (name === 'deleteLine') { ta.setSelectionRange(ls, Math.min(le + 1, v.length)); ins(''); }
        else if (name === 'moveUp' || name === 'moveDown') {
          const lines = v.split('\n'); const li = v.slice(0, ls).split('\n').length - 1; const lj = v.slice(0, le).split('\n').length - 1;
          const t = name === 'moveUp' ? li - 1 : lj + 1; if (t < 0 || t >= lines.length) return;
          const moved = lines.splice(li, lj - li + 1); lines.splice(name === 'moveUp' ? li - 1 : li + 1, 0, ...moved);
          ta.select(); ins(lines.join('\n'));
          const ns = lines.slice(0, name === 'moveUp' ? li - 1 : li + 1).join('\n').length + (name === 'moveUp' ? (li - 1 > 0 ? 1 : 0) : 1);
          ta.setSelectionRange(ns + (s - ls), ns + (s - ls));
        }
        else if (name === 'upper' || name === 'lower') { const sel = v.slice(s, en); ins(name === 'upper' ? sel.toUpperCase() : sel.toLowerCase()); }
        else if (name === 'trimWhitespace') { const t = v.replace(/[ \t]+$/gm, ''); if (t !== v) { const pos = s; api.set(activeId, t); ta.setSelectionRange(Math.min(pos, t.length), Math.min(pos, t.length)); } }
        else if (name === 'gotoLine') { Q.prompt('Go to line', '').then((n) => n && api.reveal(parseInt(n, 10) || 1)); }
        else if (name === 'find' || name === 'replace') bus.emit('cmd', 'view.search');
        else if (name === 'zoomIn' || name === 'zoomOut') bus.emit('zoom', name === 'zoomIn' ? 1 : -1);
        fireCursor();
      },
      markers: () => [], setMarkers: () => {},
      decorate: () => {},
      cursorCoords() {
        // approximate using a mirror measurement
        const before = ta.value.slice(0, ta.selectionStart).split('\n');
        const cs = getComputedStyle(ta); const lh = parseFloat(cs.lineHeight); const cw = parseFloat(cs.fontSize) * 0.6;
        const r = ta.getBoundingClientRect();
        return { x: r.left + parseFloat(cs.paddingLeft) + before[before.length - 1].length * cw - ta.scrollLeft, y: r.top + parseFloat(cs.paddingTop) + (before.length - 0.5) * lh - ta.scrollTop };
      },
      async transpileTS(id) { // crude type stripper for offline mode
        return api.get(id)
          .replace(/^\s*(export\s+)?(type|interface)\s+\w+[^{=]*(=[^;]*;|\{[\s\S]*?^\})/gm, '')
          .replace(/(\(|,)\s*(\w+)\??\s*:\s*[\w<>[\]|&\s.'"]+?(?=[,)=])/g, '$1$2')
          .replace(/\)\s*:\s*[\w<>[\]|&\s.'"]+?(?=\s*(\{|=>))/g, ')')
          .replace(/(let|const|var)\s+(\w+)\s*:\s*[\w<>[\]|&\s.'"]+?(?=\s*[=;\n])/g, '$1 $2')
          .replace(/\s+as\s+[\w<>[\]]+/g, '')
          .replace(/(\w)\s*<\s*[A-Z]\w*(?:\s*(?:,|extends)[^>]*)?>\s*(?=\()/g, '$1')
          .replace(/\b(public|private|protected|readonly)\s+/g, '');
      },
      registerLang() {},
      addTabHandler(fn) { keyFns.push((e) => { if (e.key === 'Tab' && !e.shiftKey && ta.selectionStart === ta.selectionEnd && fn()) e.preventDefault(); }); },
      onKey: (f) => keyFns.push(f),
      onType: (f) => typeFns.push(f),
      textBefore() { const v = ta.value, s = ta.selectionStart; return v.slice(v.lastIndexOf('\n', s - 1) + 1, s); },
      textAfter() { const v = ta.value, s = ta.selectionStart; const e = v.indexOf('\n', s); return v.slice(s, e < 0 ? undefined : e); },
      replaceBefore(len, text, cursorBack = 0) { const s = ta.selectionStart; ta.setSelectionRange(s - len, s); ins(text); if (cursorBack) { const p = ta.selectionStart - cursorBack; ta.setSelectionRange(p, p); } },
    };
    api.applySettings(settings);
    api.showNothing();
    return api;
  }

  Q.editorFactory = {
    completionProviders,
    addCompletions(langs, fn) { completionProviders.push({ langs, fn }); },
    async create(host, settings, { forceFallback } = {}) {
      if (!forceFallback) {
        try {
          const monaco = await loadMonaco();
          host.innerHTML = '';
          return makeMonaco(monaco, host, settings);
        } catch (e) {
          console.warn('Monaco unavailable, using built-in editor:', e);
        }
      }
      return makeFallback(host, settings);
    },
  };
})();
