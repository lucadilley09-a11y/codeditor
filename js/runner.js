/* Codeditor — code runners: web preview, JavaScript (worker), TypeScript, Python (Pyodide worker) */
(() => {
  // Python ships with the app (py/ folder): the hosted page may not download data files from other sites
  const PYODIDE = new URL('py/', location.href).href;
  const PY_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  // a page opened straight from a file can't load the bundled copy into a worker, so go to the CDN first there
  const PY_BASES = location.protocol === 'file:' ? [PY_CDN, PYODIDE] : [PYODIDE, PY_CDN];

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
  /* ---------- loop guard: a loop that never ends would freeze the whole app (the page shares our thread).
     Every loop checks the clock now and then; if one task runs for 3 s without a break, it throws. ---------- */
  const LG_HEAD = 'var __lgT=Date.now(),__lgN=0;setInterval(function(){__lgT=Date.now()},100);function __lg(){if((++__lgN&2047)===0&&Date.now()-__lgT>3000){__lgT=Date.now();throw new Error("Infinite loop? A loop ran for over 3 seconds, so it was stopped.")}return false}\n';
  function guardJS(code) {
    if (!/\b(for|while|do)\b/.test(code)) return code;
    const g = code.replace(/\b(for|while)(\s*)\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\)(\s*)\{/g, (m, k, a, c, b) => `${k}${a}(${c})${b}{ if (__lg()) break;`)
      .replace(/\bdo(\s*)\{/g, (m, a) => `do${a}{ if (__lg()) break;`);
    return LG_HEAD + g;
  }
  function guardHTML(html) {
    return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
      if (/\bsrc\s*=/i.test(attrs)) return m;
      const t = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
      if (t && !/javascript|module|babel/i.test(t)) return m;
      return `<script${attrs}>${guardJS(body)}</script>`;
    });
  }
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
    if (hook) html = guardHTML(html);
    const A = Q.assets ? Q.assets.previewScript(entry, readFile) : { map: {}, script: '' };
    if (A.script) html = Q.assets.rewriteHTML(html, entry, A.map);
    const head = (hook ? HOOK + (Q.ext && Q.ext.previewHead ? Q.ext.previewHead() : '') : '') + A.script;
    if (head) {
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + head);
      else html = head + html;
    }
    return html;
  }

  /* ---------- JavaScript in a Web Worker ---------- */
  const JS_WORKER = `
    ${FMT}
    var __stdin = [];
    var __n = 0, __LIMIT = 3000;
    var __send = function (type, args) {
      if (++__n > __LIMIT) { if (__n === __LIMIT + 1) postMessage({ type: 'flood' }); throw new Error('__quill_flood'); }
      var t = Array.prototype.map.call(args, function (a) { return __fmt(a); }).join(' ');
      if (t.length > 20000) t = t.slice(0, 20000) + '… (cut)';
      postMessage({ type: type, text: t });
    };
    ['log','info','warn','error','debug'].forEach(function (k) { console[k] = function () { __send(k === 'debug' ? 'log' : k, arguments); }; });
    console.table = function (t) { __send('log', [t]); };
    console.clear = function () { postMessage({ type: 'clear' }); };
    self.alert = function (m) { __send('info', ['[alert] ' + (m === undefined ? '' : m)]); };
    self.prompt = function (m) { var v = __stdin.length ? __stdin.shift() : null; __send('info', ['[prompt] ' + (m || '') + ' → ' + (v === null ? 'null (type input lines in the console Input box)' : v)]); return v; };
    self.addEventListener('unhandledrejection', function (e) { __send('error', ['Uncaught (in promise)', e.reason]); });
    onmessage = function (e) {
      __stdin = e.data.stdin || []; __n = 0; __LIMIT = e.data.limit || 3000;
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
  let jsCur = null;
  const floodMsg = (n) => `TooMuchOutput: Your code printed more than ${n} lines, so it was stopped. Is there a loop that never ends?`;
  function runJS(code, { onEvent, timeout = 0, settle = 350, stdin = [], limit = 3000 } = {}) {
    stopJS();
    return new Promise((resolve) => {
      const w = new Worker(jsWorkerUrl);
      jsWorker = w;
      const logs = [], errors = [];
      let done = false, settleTimer, hardTimer;
      const finish = (timedOut, stopped) => {
        if (done) return; done = true;
        clearTimeout(settleTimer); clearTimeout(hardTimer);
        if (timeout) { w.terminate(); if (jsWorker === w) jsWorker = null; }
        if (jsCur && jsCur.w === w) jsCur = null;
        resolve({ logs, errors, timedOut, stopped: !!stopped });
      };
      jsCur = { w, stop: () => { if (done) return; w.terminate(); if (jsWorker === w) jsWorker = null; finish(false, true); } };
      w.onmessage = (e) => {
        const d = e.data;
        if (d.type === 'flood') { const x = { type: 'error', text: floodMsg(limit), last: 'TooMuchOutput' }; errors.push(x); onEvent && onEvent(x); w.terminate(); if (jsCur && jsCur.w === w) jsCur = null; if (jsWorker === w) jsWorker = null; done = true; clearTimeout(settleTimer); clearTimeout(hardTimer); resolve({ logs, errors, timedOut: true }); return; }
        if (d.type === 'sync-done') { if (timeout) settleTimer = setTimeout(() => finish(false), settle); else finish(false); return; }
        if (d.type === 'error') errors.push(d); else if (d.type !== 'clear') logs.push(d.text);
        onEvent && onEvent(d);
      };
      w.onerror = (e) => { const d = { type: 'error', text: e.message }; errors.push(d); onEvent && onEvent(d); e.preventDefault(); finish(false); };
      if (timeout) hardTimer = setTimeout(() => { const d = { type: 'error', text: 'TimeoutError: Your code ran for more than ' + timeout / 1000 + 's — is there an infinite loop?' }; errors.push(d); onEvent && onEvent(d); finish(true); }, timeout);
      w.postMessage({ code, stdin, limit });
    });
  }
  function stopJS() { if (jsCur) { jsCur.stop(); return true; } if (jsWorker) { jsWorker.terminate(); jsWorker = null; return true; } return false; }

  /* ---------- Python via Pyodide in a Web Worker ---------- */
  const PY_WORKER = `
    // try the bundled copy first; if it can't load (opened from a downloaded file, files missing), use the CDN
    const BASES = ${JSON.stringify(PY_BASES)};
    let base = null;
    for (const u of BASES) { try { importScripts(u + 'pyodide.js'); base = u; break; } catch (_) {} }
    const load = async () => {
      let lastErr;
      for (const u of BASES.slice(BASES.indexOf(base))) {
        try { const p = await loadPyodide({ indexURL: u, stdLibURL: u + (u.includes('cdn.jsdelivr') ? 'python_stdlib.zip' : 'python_stdlib.wasm') }); return p; } catch (e) { lastErr = e; }
      }
      throw lastErr || new Error('Python could not be loaded');
    };
    let py = null, stdin = [], LIMIT = 3000, outN = 0, outB = 0, pend = '', flooded = false; const dec = new TextDecoder();
    const flood = () => { if (!flooded) { flooded = true; postMessage({ type: 'flood' }); } };
    const emit = (t) => { if (++outN > LIMIT) { flood(); throw new Error('too much output'); } postMessage({ type: 'log', text: t }); };
    const ready = (base ? load() : Promise.reject(new Error('Python could not be downloaded — check your internet connection.'))).then((p) => {
      py = p;
      py.setStdout({ write: (buf) => { outB += buf.length; if (outB > LIMIT * 1000) { flood(); throw new Error('too much output'); } pend += dec.decode(buf, { stream: true }); let i; while ((i = pend.indexOf('\\n')) >= 0) { emit(pend.slice(0, i)); pend = pend.slice(i + 1); } if (pend.length > 20000) { emit(pend.slice(0, 20000) + '… (cut)'); pend = ''; } return buf.length; } });
      py.setStderr({ batched: (s) => { if (++outN > LIMIT) { flood(); throw new Error('too much output'); } postMessage({ type: 'warn', text: s }); } });
      py.setStdin({ stdin: () => { if (stdin.length) { const v = stdin.shift(); postMessage({ type: 'info', text: '› ' + v }); return v; } postMessage({ type: 'warn', text: 'input() needs a value — type lines in the console Input box before running.' }); return ''; } });
      postMessage({ type: 'ready' });
    }).catch((e) => postMessage({ type: 'fatal', text: String(e) }));
    onmessage = async (e) => {
      await ready;
      if (!py) return postMessage({ type: 'done', failed: true });
      stdin = e.data.stdin || []; LIMIT = e.data.limit || 3000; outN = 0; outB = 0; pend = ''; flooded = false;
      const ns = py.globals.get('dict')();
      try {
        try { await py.loadPackagesFromImports(e.data.code, { messageCallback: (m) => postMessage({ type: 'info', text: m }) }); } catch (_) {}
        await py.runPythonAsync(e.data.code, { globals: ns, filename: '<exec>' });
        try { py.runPython('import sys\\nsys.stdout.flush()\\nsys.stderr.flush()'); } catch (_) {}
        if (pend) { postMessage({ type: 'log', text: pend }); pend = ''; }
        postMessage({ type: 'done' });
      } catch (err) {
        if (flooded) return;
        try { py.runPython('import sys\\nsys.stdout.flush()\\nsys.stderr.flush()'); } catch (_) {}
        if (pend) { postMessage({ type: 'log', text: pend }); pend = ''; }
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

  /* ---------- Python diagnostics: test each loading step, report what breaks ---------- */
  const DIAG_WORKER = `
    const U = '${PYODIDE}', say = (t) => postMessage(t);
    (async () => {
      try { importScripts(U + 'pyodide.js'); say('worker importScripts pyodide.js: ok (' + typeof loadPyodide + ')'); } catch (e) { say('worker importScripts pyodide.js: FAIL ' + e.message); }
      try { importScripts(U + 'pyodide.asm.js'); say('worker importScripts pyodide.asm.js: ok'); } catch (e) { say('worker importScripts pyodide.asm.js: FAIL ' + e.message); }
      for (const f of ['pyodide-lock.json', 'python_stdlib.wasm']) {
        try { const r = await fetch(U + f); const b = await r.arrayBuffer(); say('worker fetch ' + f + ': ' + r.status + ' ' + b.byteLength + 'B'); } catch (e) { say('worker fetch ' + f + ': FAIL ' + e.message); }
      }
      try { const r = await fetch(U + 'pyodide.asm.wasm'); const b = await r.arrayBuffer(); say('worker fetch wasm: ' + r.status + ' ' + b.byteLength + 'B');
        try { await WebAssembly.compile(b); say('worker wasm compile: ok'); } catch (e) { say('worker wasm compile: FAIL ' + e.message); } } catch (e) { say('worker fetch wasm: FAIL ' + e.message); }
      say('done');
    })();`;
  function pyDiag(out) {
    const t0 = performance.now(), T = () => ((performance.now() - t0) / 1000).toFixed(1) + 's ';
    out('Python check-up: testing each step…');
    out('page: origin=' + location.origin + ' isolated=' + self.crossOriginIsolated);
    fetch(PYODIDE + 'pyodide-lock.json').then((r) => out(T() + 'page fetch lock: ' + r.status)).catch((e) => out(T() + 'page fetch lock: FAIL ' + e.message));
    try { const x = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]); WebAssembly.compile(x).then(() => out(T() + 'page tiny wasm compile: ok')).catch((e) => out(T() + 'page tiny wasm compile: FAIL ' + e.message)); } catch (e) { out('page wasm: FAIL ' + e.message); }
    let w; try { w = new Worker(URL.createObjectURL(new Blob([DIAG_WORKER], { type: 'text/javascript' }))); } catch (e) { out('blob worker: FAIL ' + e.message); return; }
    out('blob worker: started');
    w.onmessage = (e) => { out(T() + e.data); if (e.data === 'done') w.terminate(); };
    w.onerror = (e) => { out(T() + 'worker error: ' + (e.message || 'unknown')); e.preventDefault(); };
    setTimeout(() => { out(T() + 'check-up stopped after 90s'); w.terminate(); }, 90000);
  }
  function pyReady(limit = 60000) {
    ensurePy();
    if (pyState === 'ready') return Promise.resolve(true);
    return new Promise((r) => {
      let settled = false; const fin = (v) => { if (!settled) { settled = true; clearTimeout(t); r(v); } };
      const t = setTimeout(() => { // loading hung (slow or blocked network): give up and reset so the next try starts fresh
        pyReadyWaiters = pyReadyWaiters.filter((f) => f !== fin);
        if (pyState === 'loading' && !pyReadyWaiters.length) { pyWorker && pyWorker.terminate(); pyWorker = null; pyState = 'error'; Q.bus.emit('py:status', 'error', 'Python took too long to load'); }
        fin(false);
      }, limit);
      pyReadyWaiters.push(fin);
    });
  }

  let pyChain = Promise.resolve(), pyCur = null;
  // one Python run at a time: a second run waits for the first instead of stealing its output
  function runPython(code, opts = {}) {
    const p = pyChain.then(() => runPython1(code, opts));
    pyChain = p.catch(() => {});
    return p;
  }
  async function runPython1(code, { onEvent, timeout = 0, stdin = [], limit = 3000 } = {}) {
    const ok = await pyReady();
    if (!ok) { const d = { type: 'error', text: 'Python could not load. It downloads from the internet the first time — check your connection and try again.' }; onEvent && onEvent(d); return { logs: [], errors: [d], unavailable: true }; }
    return new Promise((resolve) => {
      const logs = [], errors = []; let timer;
      const out = []; // stdout may arrive chunked by line
      pyListener = (d) => {
        if (d.type === 'flood') { clearTimeout(timer); pyListener = null; if (pyWorker) { pyWorker.terminate(); pyWorker = null; pyState = 'idle'; Q.bus.emit('py:status', 'stopped'); } const x = { type: 'error', text: floodMsg(limit), last: 'TooMuchOutput' }; errors.push(x); onEvent && onEvent(x); pyCur = null; resolve({ logs: out, errors, timedOut: true }); return; }
        if (d.type === 'done') { clearTimeout(timer); pyListener = null; pyCur = null; resolve({ logs: out.join('\n').split('\n').filter((l, i, a) => !(i === a.length - 1 && l === '')), errors }); return; }
        if (d.type === 'error') errors.push(d); else if (d.type === 'log') out.push(d.text);
        if (d.type !== 'error' || true) logs.push(d.text);
        onEvent && onEvent(d);
      };
      pyCur = { stop: (why) => { clearTimeout(timer); pyCur = null; if (why) { errors.push(why); onEvent && onEvent(why); } resolve({ logs: out, errors, timedOut: !!why, stopped: !why }); } };
      if (timeout) timer = setTimeout(() => { const cur = pyCur; killPy(); cur && cur.stop({ type: 'error', text: 'TimeoutError: Your code ran for more than ' + timeout / 1000 + 's — is there an infinite loop?', last: 'TimeoutError' }); }, timeout);
      pyWorker.postMessage({ code, stdin, limit });
    });
  }
  function killPy() { if (pyWorker) pyWorker.terminate(); pyWorker = null; pyListener = null; pyState = 'idle'; Q.bus.emit('py:status', 'stopped'); }
  function stopPython() {
    if (pyWorker && pyState === 'ready' && pyListener) { const cur = pyCur; killPy(); cur && cur.stop(null); return true; }
    return false;
  }

  Q.runner = {
    buildPage, guardJS, guardHTML, runJS, stopJS, runPython, stopPython, pyReady, pyDiag,
    get pyState() { return pyState; },
    stop() { return stopJS() | stopPython(); },
  };
})();
