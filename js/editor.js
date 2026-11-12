/* Codeditor — editor adapter: Monaco (VS Code's editor) when online, built-in lightweight editor as an offline fallback */
(() => {
  const { h, esc, bus } = Q;
  // Monaco ships with the app: the hosted page blocks stylesheets and fonts from other sites
  const MONACO = new URL('vendor/monaco', location.href).href;

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

  /* end-of-line labels (error lens, hints): a generated CSS ::after rule per message — works in every Monaco version */
  const afterRules = new Map(); let afterSheet = null;
  function afterClass(text, cls) {
    const key = (cls || '') + '\u0000' + text;
    let name = afterRules.get(key);
    if (name) return name + (cls ? ' ' + cls : '');
    name = 'eol-' + afterRules.size.toString(36);
    afterRules.set(key, name);
    if (!afterSheet) { afterSheet = document.createElement('style'); afterSheet.id = 'eol-labels'; document.head.append(afterSheet); }
    try { afterSheet.sheet.insertRule(`.monaco-editor .${name}::after { content: ${JSON.stringify(text)}; white-space: pre; pointer-events: none; }`, afterSheet.sheet.cssRules.length); } catch {}
    return name + (cls ? ' ' + cls : '');
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

    // Bridge Codeditor completion providers into Monaco
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
                detail: it.detail || 'Codeditor snippet', documentation: it.doc ? { value: it.doc } : undefined,
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
          fontFamily: s.monoStack || "'JetBrains Mono', monospace",
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
        setTimeout(() => monaco.editor.remeasureFonts(), 50);
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
      select(l1, c1, l2, c2) { ed.setSelection(new monaco.Range(l1, c1, l2, c2)); ed.revealRangeInCenterIfOutsideViewport(new monaco.Range(l1, c1, l2, c2)); ed.focus(); },
      reveal(line, col = 1) { ed.revealLineInCenter(line); ed.setPosition({ lineNumber: line, column: col }); ed.focus(); },
      selection() { const m = ed.getModel(); const s = ed.getSelection(); return m && s ? m.getValueInRange(s) : ''; },
      command(name) {
        if (!ed.getModel()) return Q.toast('Open a file first.', 'info', 1500);
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
          const at = d.after && d.start ? Math.min(d.start, lineLen) : lineLen;
          const range = d.after ? new monaco.Range(d.line, at, d.line, at) : new monaco.Range(d.line, d.start || 1, d.line, d.end || lineLen);
          return { range, options: d.after ? { [d.start ? 'beforeContentClassName' : 'afterContentClassName']: afterClass(d.after, d.className), stickiness: 1 } : { inlineClassName: d.className, isWholeLine: !!d.whole } };
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

  function makeFallback(host, settings, reason) { const api = Q.makeLite(host, settings, { highlighter, render }); api.reason = reason; return api; }

  Q.editorFactory = {
    completionProviders,
    addCompletions(langs, fn) { completionProviders.push({ langs, fn }); },
    async create(host, settings, { forceFallback } = {}) {
      let reason = 'forced';
      if (!forceFallback) {
        try {
          // Monaco needs its own stylesheet; some hosts (like sandboxed pages) block it, so check first
          await new Promise((res, rej) => {
            const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = MONACO + '/vs/editor/editor.main.css';
            const t = setTimeout(() => rej(new Error('offline')), 6000);
            l.onload = () => { clearTimeout(t); res(); }; l.onerror = () => { clearTimeout(t); rej(new Error(navigator.onLine ? 'blocked' : 'offline')); };
            document.head.append(l);
          });
          const monaco = await loadMonaco();
          host.innerHTML = '';
          const api = makeMonaco(monaco, host, settings);
          api.reason = 'ok';
          return api;
        } catch (e) {
          reason = e && e.message === 'blocked' ? 'blocked' : 'offline';
          console.info('Using the built-in editor (' + reason + ')');
        }
      }
      return makeFallback(host, settings, reason);
    },
  };
})();
