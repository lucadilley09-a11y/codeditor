/* Quill — code runners: web preview, JavaScript (worker), TypeScript, Python (Pyodide worker) */
(() => {
  const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

  // Shared value formatter (stringified into iframes/workers too)
  const FMT = `function __fmt(v, d) {
    d = d || 0;
    try {
      if (v === null) return 'null';
      if (v === undefined) return 'undefined';
      if (typeof v === 'string') return d ? JSON.stringify(v) : v;
      if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
      if (typeof v === 'symbol') return v.toString();
      if (typeof v === 'function') return '[Function ' + (v.name || 'anonymous') + ']';
      if (v instanceof Error) return v.name + ': ' + v.message;
      if (typeof Element !== 'undefined' && v instanceof Element) return '<' + v.tagName.toLowerCase() + (v.id ? '#' + v.id : '') + (v.className && typeof v.className === 'string' ? '.' + v.className.trim().split(/\\s+/).join('.') : '') + '>';
      if (d > 3) return Array.isArray(v) ? '[…]' : '{…}';
      if (Array.isArray(v)) return '[' + v.slice(0, 100).map(function (x) { return __fmt(x, d + 1); }).join(', ') + (v.length > 100 ? ', …' : '') + ']';
      if (v instanceof Map) return 'Map(' + v.size + ') {' + Array.from(v).slice(0, 50).map(function (e) { return __fmt(e[0], d + 1) + ' => ' + __fmt(e[1], d + 1); }).join(', ') + '}';
      if (v instanceof Set) return 'Set(' + v.size + ') {' + Array.from(v).slice(0, 50).map(function (x) { return __fmt(x, d + 1); }).join(', ') + '}';
      var keys = Object.keys(v);
      var name = v.constructor && v.constructor.name && v.constructor.name !== 'Object' ? v.constructor.name + ' ' : '';
      return name + '{ ' + keys.slice(0, 50).map(function (k) { return k + ': ' + __fmt(v[k], d + 1); }).join(', ') + (keys.length > 50 ? ', …' : '') + ' }';
    } catch (e) { return String(v); }
  }`;

  const HOOK = `<script>(function(){
    ${FMT}
    var send = function (type, args) { try { parent.postMessage({ __quill: 1, type: type, text: Array.prototype.map.call(args, function (a) { return __fmt(a); }).join(' ') }, '*'); } catch (e) {} };
    ['log','info','warn','error','debug'].forEach(function (k) { var o = console[k]; console[k] = function () { send(k === 'debug' ? 'log' : k, arguments); o && o.apply(console, arguments); }; });
    console.table = function (t) { send('log', [t]); };
    console.clear = function () { parent.postMessage({ __quill: 1, type: 'clear' }, '*'); };
    window.addEventListener('error', function (e) { parent.postMessage({ __quill: 1, type: 'error', text: (e.error && e.error.name ? e.error.name + ': ' : '') + e.message, line: e.lineno, file: e.filename }, '*'); });
    window.addEventListener('unhandledrejection', function (e) { send('error', ['Uncaught (in promise)', e.reason]); });
  })();<\/script>`;

  /* ---------- Web preview page builder ---------- */
  function buildPage(entry, readFile, { hook = true } = {}) {
    let html = readFile(entry);
    if (html == null) return '<p>Missing ' + entry + '</p>';
    const fsr = Q.fs;
    if (entry.endsWith('.svg')) return `<!DOCTYPE html><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff">${html}</body>`;
    // inline stylesheets
    html = html.replace(/<link\b[^>]*?href=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
      if (!/stylesheet/i.test(tag)) return tag;
      const p = fsr.resolve(entry, href); const css = p != null ? readFile(p) : null;
      return css != null ? `<style data-file="${p}">\n${css}\n</style>` : tag;
    });
    // inline scripts (keeps type="module" etc.)
    html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tag, a, src, b) => {
      const p = fsr.resolve(entry, src); let js = p != null ? readFile(p) : null;
      if (js == null) return tag;
      js = js.replace(/<\/script/gi, '<\\/script');
      return `<script${a}${b} data-file="${p}">\n${js}\n<\/script>`;
    });
    if (hook) {
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + HOOK);
      else html = HOOK + html;
    }
    return html;
  }

  /* ---------- JavaScript in a Web Worker ---------- */
  const JS_WORKER = `
    ${FMT}
    var __stdin = [];
    var __send = function (type, args) { postMessage({ type: type, text: Array.prototype.map.call(args, function (a) { return __fmt(a); }).join(' ') }); };
    ['log','info','warn','error','debug'].forEach(function (k) { console[k] = function () { __send(k === 'debug' ? 'log' : k, arguments); }; });
    console.table = function (t) { __send('log', [t]); };
    console.clear = function () { postMessage({ type: 'clear' }); };
    self.alert = function (m) { __send('info', ['[alert] ' + (m === undefined ? '' : m)]); };
    self.prompt = function (m) { var v = __stdin.length ? __stdin.shift() : null; __send('info', ['[prompt] ' + (m || '') + ' → ' + (v === null ? 'null (type input lines in the console Input box)' : v)]); return v; };
    self.addEventListener('unhandledrejection', function (e) { __send('error', ['Uncaught (in promise)', e.reason]); });
    onmessage = function (e) {
      __stdin = e.data.stdin || [];
      try {
        (0, eval)(e.data.code + '\\n//# sourceURL=quill-user.js');
        postMessage({ type: 'sync-done' });
      } catch (err) {
        var m = String(err && err.stack || '').match(/quill-user\\.js:(\\d+)/);
        postMessage({ type: 'error', text: (err && err.name ? err.name + ': ' + err.message : String(err)), line: m ? +m[1] : null });
        postMessage({ type: 'sync-done', failed: true });
      }
    };`;
  let jsWorker = null;
  const jsWorkerUrl = URL.createObjectURL(new Blob([JS_WORKER], { type: 'text/javascript' }));

  /**
   * Run JS. onEvent receives {type, text, line}. Resolves with {logs, errors, timedOut}
   * settle: ms to wait for async output after the synchronous part finishes.
   */
  function runJS(code, { onEvent, timeout = 0, settle = 350, stdin = [] } = {}) {
    stopJS();
    return new Promise((resolve) => {
      const w = new Worker(jsWorkerUrl);
      jsWorker = w;
      const logs = [], errors = [];
      let done = false, settleTimer, hardTimer;
      const finish = (timedOut) => {
        if (done) return; done = true;
        clearTimeout(settleTimer); clearTimeout(hardTimer);
        if (timeout) { w.terminate(); if (jsWorker === w) jsWorker = null; }
        resolve({ logs, errors, timedOut });
      };
      w.onmessage = (e) => {
        const d = e.data;
        if (d.type === 'sync-done') { if (timeout) settleTimer = setTimeout(() => finish(false), settle); else finish(false); return; }
        if (d.type === 'error') errors.push(d); else if (d.type !== 'clear') logs.push(d.text);
        onEvent && onEvent(d);
      };
      w.onerror = (e) => { const d = { type: 'error', text: e.message }; errors.push(d); onEvent && onEvent(d); e.preventDefault(); finish(false); };
      if (timeout) hardTimer = setTimeout(() => { const d = { type: 'error', text: 'TimeoutError: Your code ran for more than ' + timeout / 1000 + 's — is there an infinite loop?' }; errors.push(d); onEvent && onEvent(d); finish(true); }, timeout);
      w.postMessage({ code, stdin });
    });
  }
  function stopJS() { if (jsWorker) { jsWorker.terminate(); jsWorker = null; return true; } return false; }

  /* ---------- Python via Pyodide in a Web Worker ---------- */
  const PY_WORKER = `
    importScripts('${PYODIDE}pyodide.js');
    let py = null, stdin = [];
    const ready = loadPyodide({ indexURL: '${PYODIDE}' }).then((p) => {
      py = p;
      py.setStdout({ batched: (s) => postMessage({ type: 'log', text: s }) });
      py.setStderr({ batched: (s) => postMessage({ type: 'warn', text: s }) });
      py.setStdin({ stdin: () => { if (stdin.length) { const v = stdin.shift(); postMessage({ type: 'info', text: '› ' + v }); return v; } postMessage({ type: 'warn', text: 'input() needs a value — type lines in the console Input box before running.' }); return ''; } });
      postMessage({ type: 'ready' });
    }).catch((e) => postMessage({ type: 'fatal', text: String(e) }));
    onmessage = async (e) => {
      await ready;
      if (!py) return postMessage({ type: 'done', failed: true });
      stdin = e.data.stdin || [];
      const ns = py.globals.get('dict')();
      try {
        try { await py.loadPackagesFromImports(e.data.code, { messageCallback: (m) => postMessage({ type: 'info', text: m }) }); } catch (_) {}
        await py.runPythonAsync(e.data.code, { globals: ns, filename: '<exec>' });
        postMessage({ type: 'done' });
      } catch (err) {
        const msg = String(err.message || err);
        const lines = [...msg.matchAll(/File "<exec>", line (\\d+)/g)];
        const tb = msg.split('\\n').filter((l) => l.trim());
        // keep only the user-relevant part of the traceback
        const start = tb.findIndex((l) => l.includes('"<exec>"'));
        const shown = (start >= 0 ? tb.slice(start) : tb.slice(-3)).join('\\n');
        postMessage({ type: 'error', text: shown, last: tb[tb.length - 1], line: lines.length ? +lines[lines.length - 1][1] : null });
        postMessage({ type: 'done', failed: true });
      } finally { ns.destroy && ns.destroy(); }
    };`;
  let pyWorker = null, pyState = 'idle', pyListener = null, pyReadyWaiters = [];

  function ensurePy() {
    if (pyWorker) return;
    pyState = 'loading'; Q.bus.emit('py:status', pyState);
    pyWorker = new Worker(URL.createObjectURL(new Blob([PY_WORKER], { type: 'text/javascript' })));
    pyWorker.onmessage = (e) => {
      const d = e.data;
      if (d.type === 'ready') { pyState = 'ready'; Q.bus.emit('py:status', pyState); pyReadyWaiters.forEach((f) => f(true)); pyReadyWaiters = []; return; }
      if (d.type === 'fatal') { pyState = 'error'; Q.bus.emit('py:status', pyState, d.text); pyReadyWaiters.forEach((f) => f(false)); pyReadyWaiters = []; pyWorker.terminate(); pyWorker = null; return; }
      pyListener && pyListener(d);
    };
    pyWorker.onerror = (e) => { e.preventDefault(); pyState = 'error'; Q.bus.emit('py:status', pyState, e.message || 'Could not load Python (are you offline?)'); pyReadyWaiters.forEach((f) => f(false)); pyReadyWaiters = []; pyWorker && pyWorker.terminate(); pyWorker = null; };
  }
  function pyReady() { ensurePy(); return pyState === 'ready' ? Promise.resolve(true) : new Promise((r) => pyReadyWaiters.push(r)); }

  async function runPython(code, { onEvent, timeout = 0, stdin = [] } = {}) {
    const ok = await pyReady();
    if (!ok) { const d = { type: 'error', text: 'Python could not load. It downloads from the internet the first time — check your connection and try again.' }; onEvent && onEvent(d); return { logs: [], errors: [d], unavailable: true }; }
    return new Promise((resolve) => {
      const logs = [], errors = []; let timer;
      const out = []; // stdout may arrive chunked by line
      pyListener = (d) => {
        if (d.type === 'done') { clearTimeout(timer); pyListener = null; resolve({ logs: out.join('\n').split('\n').filter((l, i, a) => !(i === a.length - 1 && l === '')), errors }); return; }
        if (d.type === 'error') errors.push(d); else if (d.type === 'log') out.push(d.text);
        if (d.type !== 'error' || true) logs.push(d.text);
        onEvent && onEvent(d);
      };
      if (timeout) timer = setTimeout(() => { stopPython(); const d = { type: 'error', text: 'TimeoutError: Your code ran for more than ' + timeout / 1000 + 's — is there an infinite loop?', last: 'TimeoutError' }; errors.push(d); onEvent && onEvent(d); resolve({ logs: out, errors, timedOut: true }); }, timeout);
      pyWorker.postMessage({ code, stdin });
    });
  }
  function stopPython() {
    if (pyWorker && pyState === 'ready' && pyListener) { pyWorker.terminate(); pyWorker = null; pyListener = null; pyState = 'idle'; Q.bus.emit('py:status', 'stopped'); return true; }
    return false;
  }

  Q.runner = {
    buildPage, runJS, stopJS, runPython, stopPython, pyReady,
    get pyState() { return pyState; },
    stop() { return stopJS() | stopPython(); },
  };
})();
