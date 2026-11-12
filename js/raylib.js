/* Codeditor — raylib preview: translates simple raylib C++ games into JavaScript and runs them on a canvas.
   It understands the beginner subset used in the lessons (variables, functions, if/while/for, Rectangle/Vector2/Color,
   drawing, keyboard/mouse, GetFrameTime, collisions, text). Real C++ needs a compiler — this is a preview, not a compiler. */
(() => {
  /* ---------- C++ → JS ---------- */
  function stripComments(src) {
    let out = '', i = 0, q = null;
    while (i < src.length) {
      const c = src[i], n = src[i + 1];
      if (q) { out += c; if (c === '\\') { out += n || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
      if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
      if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      out += c; i++;
    }
    return out;
  }
  const TYPES = '(?:const\\s+)?(?:unsigned\\s+|signed\\s+|static\\s+)*(?:int|float|double|bool|char|auto|long|short|Color|Rectangle|Vector2|Texture2D|Texture|Sound|Music|Font|Image|std::string|string|size_t)(?:\\s*\\*|\\s*&)?';
  function transpile(src) {
    let s = stripComments(src);
    s = s.replace(/^\s*#.*$/gm, '').replace(/^\s*using\s+namespace\s+\w+\s*;/gm, '');
    s = s.replace(/std::to_string\s*\(/g, 'String(').replace(/std::/g, '').replace(/->/g, '.').replace(/\bnullptr\b|\bNULL\b/g, 'null');
    s = s.replace(/^\s*(cout|cin|printf)\b.*;\s*$/gm, '');
    s = s.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)[fFlLuU]+\b/g, '$1');  // 1.5f → 1.5
    // enums: enum class State { A, B }; → const State = { A: 0, B: 1 };
    s = s.replace(/enum\s+(?:class\s+)?(\w+)\s*\{([^}]*)\}\s*;/g, (m, n, body) => `const ${n} = {${body.split(',').map((x, k) => x.trim()).filter(Boolean).map((x, k) => { const [a, b] = x.split('='); return `${a.trim()}: ${b != null ? b.trim() : k}`; }).join(', ')}};`);
    const userTypes = [...s.matchAll(/const\s+(\w+)\s*=\s*\{/g)].map((m) => m[1]);
    // structs: struct Player { float x, y; int hp = 3; }; → a maker function with defaults
    const structs = [];
    s = s.replace(/struct\s+(\w+)\s*\{([^{}]*)\}\s*;/g, (m, name, body) => {
      const fields = [];
      body.split(';').forEach((decl) => { decl = decl.trim(); if (!decl) return; const mm = decl.match(new RegExp(`^${TYPES}\\s+(.*)$`)) || decl.match(/^\w+\s+(.*)$/); if (!mm) return; mm[1].split(',').forEach((part) => { const [n, v] = part.split('='); fields.push([n.trim(), v != null ? v.trim() : '0']); }); });
      structs.push(name);
      return `function __${name}(...a) { const o = {${fields.map(([n, v]) => `${n}: ${v}`).join(', ')}}; [${fields.map(([n]) => JSON.stringify(n)).join(', ')}].forEach((k, i) => { if (a[i] !== undefined) o[k] = a[i]; }); return o; }`;
    });
    structs.forEach((n) => {
      s = s.replace(new RegExp(`\\b${n}\\s+(\\w+)\\s*=\\s*\\{([^{}]*)\\}`, 'g'), `let $1 = __${n}($2)`);
      s = s.replace(new RegExp(`\\b${n}\\s*\\{([^{}]*)\\}`, 'g'), `__${n}($1)`);
      s = s.replace(new RegExp(`\\b${n}\\s+(\\w+)\\s*;`, 'g'), `let $1 = __${n}();`);
    });
    [...userTypes, ...structs].forEach((n) => { s = s.replace(new RegExp(`(^|[;{}(\\s])${n}\\s+(?=[A-Za-z_]\\w*\\s*(=|;|,|\\)))`, 'g'), '$1let '); });
    s = s.replace(/\b(\w+)::(\w+)/g, '$1.$2');
    // struct literals → helper calls
    s = s.replace(/\(\s*(Rectangle|Vector2|Color)\s*\)\s*\{/g, '__$1{').replace(/\b(Rectangle|Vector2|Color)\s*\{/g, '__$1{');
    s = s.replace(/__(Rectangle|Vector2|Color)\{([^{}]*)\}/g, '__$1($2)');
    s = s.replace(/\b(Rectangle|Vector2|Color)\s+(\w+)\s*=\s*\{([^{}]*)\}/g, 'let $2 = __$1($3)');
    // functions
    s = s.replace(new RegExp(`(^|\\n)\\s*(?:void|${TYPES})\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{`, 'g'), (m, pre, name, params) => {
      const ps = params.split(',').map((p) => p.trim()).filter((p) => p && p !== 'void').map((p) => p.replace(/=.*$/, '').trim().split(/[\s*&]+/).pop());
      return `${pre}${name === 'main' ? 'function* main' : 'function ' + name}(${ps.join(', ')}) {`;
    });
    // arrays: int xs[3] = {1,2,3};
    s = s.replace(new RegExp(`\\b${TYPES}\\s+(\\w+)\\s*\\[[^\\]]*\\]\\s*=\\s*\\{([^{}]*)\\}`, 'g'), 'let $1 = [$2]');
    s = s.replace(new RegExp(`\\b${TYPES}\\s+(\\w+)\\s*\\[\\s*(\\w+)\\s*\\]\\s*;`, 'g'), 'let $1 = new Array($2).fill(0);');
    // declarations
    s = s.replace(new RegExp(`\\b${TYPES}\\s+(?=[A-Za-z_]\\w*\\s*(=|;|,|\\)|:))`, 'g'), 'let ');
    s = s.replace(/\blet\s+(\w+)\s*;/g, 'let $1 = 0;');
    s = s.replace(/\bfor\s*\(\s*let\s+(\w+)\s*:\s*/g, 'for (let $1 of ');
    // casts
    s = s.replace(/\(\s*int\s*\)\s*\(/g, 'Math.trunc(').replace(/\(\s*int\s*\)\s*([\w.]+)/g, 'Math.trunc($1)').replace(/\(\s*(float|double)\s*\)\s*/g, '');
    s = s.replace(/static_cast\s*<\s*int\s*>\s*\(/g, 'Math.trunc(').replace(/static_cast\s*<\s*\w+\s*>\s*\(/g, '(');
    // one frame = one yield
    s = s.replace(/EndDrawing\s*\(\s*\)\s*;/g, 'EndDrawing(); yield;');
    return s;
  }

  /* ---------- the fake raylib (runs inside the preview page) ---------- */
  const RUNTIME = String.raw`
const __cv = document.getElementById('rl'), __g = __cv.getContext('2d');
const __col = (r, g, b, a = 255) => ({ r, g, b, a });
const LIGHTGRAY=__col(200,200,200),GRAY=__col(130,130,130),DARKGRAY=__col(80,80,80),YELLOW=__col(253,249,0),GOLD=__col(255,203,0),ORANGE=__col(255,161,0),PINK=__col(255,109,194),RED=__col(230,41,55),MAROON=__col(190,33,55),GREEN=__col(0,228,48),LIME=__col(0,158,47),DARKGREEN=__col(0,117,44),SKYBLUE=__col(102,191,255),BLUE=__col(0,121,241),DARKBLUE=__col(0,82,172),PURPLE=__col(200,122,255),VIOLET=__col(135,60,190),DARKPURPLE=__col(112,31,126),BEIGE=__col(211,176,131),BROWN=__col(127,106,79),DARKBROWN=__col(76,63,47),WHITE=__col(255,255,255),BLACK=__col(0,0,0),BLANK=__col(0,0,0,0),MAGENTA=__col(255,0,255),RAYWHITE=__col(245,245,245);
const __css = (c) => 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (c.a / 255) + ')';
const __Rectangle = (x = 0, y = 0, width = 0, height = 0) => ({ x, y, width, height });
const __Vector2 = (x = 0, y = 0) => ({ x, y });
const __Color = (r = 0, g = 0, b = 0, a = 255) => __col(r, g, b, a);
let __closed = false, __last = performance.now(), __dt = 1 / 60, __t0 = performance.now();
const __down = new Set(), __pressed = new Set(), __released = new Set(); let __mouse = { x: 0, y: 0 }, __mdown = new Set(), __mpressed = new Set();
const __K = { ArrowRight: 262, ArrowLeft: 263, ArrowDown: 264, ArrowUp: 265, Space: 32, Enter: 257, Escape: 256, Backspace: 259, Tab: 258, ShiftLeft: 340, ShiftRight: 344, ControlLeft: 341 };
const __code = (e) => __K[e.code] || (e.code.startsWith('Key') ? e.code.charCodeAt(3) : e.code.startsWith('Digit') ? e.code.charCodeAt(5) : 0);
addEventListener('keydown', (e) => { const k = __code(e); if (!__down.has(k)) __pressed.add(k); __down.add(k); if (k >= 262 || k === 32) e.preventDefault(); });
addEventListener('keyup', (e) => { const k = __code(e); __down.delete(k); __released.add(k); });
__cv.addEventListener('mousemove', (e) => { const r = __cv.getBoundingClientRect(); __mouse = { x: (e.clientX - r.left) * __cv.width / r.width, y: (e.clientY - r.top) * __cv.height / r.height }; });
__cv.addEventListener('mousedown', (e) => { __mdown.add(e.button); __mpressed.add(e.button); __cv.focus(); });
addEventListener('mouseup', (e) => __mdown.delete(e.button));
const KEY_RIGHT=262,KEY_LEFT=263,KEY_DOWN=264,KEY_UP=265,KEY_SPACE=32,KEY_ENTER=257,KEY_ESCAPE=256,KEY_BACKSPACE=259,KEY_TAB=258,KEY_LEFT_SHIFT=340,KEY_RIGHT_SHIFT=344,KEY_LEFT_CONTROL=341;
for (let c = 65; c <= 90; c++) self['KEY_' + String.fromCharCode(c)] = c; for (let c = 48; c <= 57; c++) self['KEY_' + String.fromCharCode(c)] = c; ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE'].forEach((n, i) => self['KEY_' + n] = 48 + i);
const MOUSE_BUTTON_LEFT=0,MOUSE_LEFT_BUTTON=0,MOUSE_BUTTON_RIGHT=2,MOUSE_RIGHT_BUTTON=2;
function InitWindow(w, h, title) { __cv.width = w; __cv.height = h; document.title = title; document.getElementById('rl-title').textContent = title; }
function SetTargetFPS() {} function CloseWindow() { __closed = true; } function WindowShouldClose() { return __closed; }
function BeginDrawing() {} function EndDrawing() { __pressed.clear(); __released.clear(); __mpressed.clear(); }
function ClearBackground(c) { __g.fillStyle = __css(c); __g.fillRect(0, 0, __cv.width, __cv.height); }
function DrawRectangle(x, y, w, h, c) { __g.fillStyle = __css(c); __g.fillRect(x, y, w, h); }
function DrawRectangleRec(r, c) { DrawRectangle(r.x, r.y, r.width, r.height, c); }
function DrawRectangleV(p, s, c) { DrawRectangle(p.x, p.y, s.x, s.y, c); }
function DrawRectangleLines(x, y, w, h, c) { __g.strokeStyle = __css(c); __g.lineWidth = 1; __g.strokeRect(x + .5, y + .5, w - 1, h - 1); }
function DrawRectangleLinesEx(r, t, c) { __g.strokeStyle = __css(c); __g.lineWidth = t; __g.strokeRect(r.x + t / 2, r.y + t / 2, r.width - t, r.height - t); }
function DrawCircle(x, y, r, c) { __g.fillStyle = __css(c); __g.beginPath(); __g.arc(x, y, r, 0, Math.PI * 2); __g.fill(); }
function DrawCircleV(p, r, c) { DrawCircle(p.x, p.y, r, c); }
function DrawCircleLines(x, y, r, c) { __g.strokeStyle = __css(c); __g.beginPath(); __g.arc(x, y, r, 0, Math.PI * 2); __g.stroke(); }
function DrawLine(a, b, x2, y2, c) { __g.strokeStyle = __css(c); __g.lineWidth = 1; __g.beginPath(); __g.moveTo(a, b); __g.lineTo(x2, y2); __g.stroke(); }
function DrawTriangle(a, b, c2, c) { __g.fillStyle = __css(c); __g.beginPath(); __g.moveTo(a.x, a.y); __g.lineTo(b.x, b.y); __g.lineTo(c2.x, c2.y); __g.fill(); }
function DrawPixel(x, y, c) { DrawRectangle(x, y, 1, 1, c); }
function DrawText(t, x, y, size, c) { __g.fillStyle = __css(c); __g.font = 'bold ' + size + 'px monospace'; __g.textBaseline = 'top'; __g.fillText(String(t), x, y); }
function MeasureText(t, size) { __g.font = 'bold ' + size + 'px monospace'; return Math.round(__g.measureText(String(t)).width); }
function DrawFPS(x, y) { DrawText(Math.round(1 / __dt) + ' FPS', x, y, 20, LIME); }
function TextFormat(f, ...a) { let i = 0; return String(f).replace(/%(\d*\.?\d*)([idfsu%])/g, (m, w, t) => { if (t === '%') return '%'; const v = a[i++]; if (t === 'f') return Number(v).toFixed(w.includes('.') ? +w.split('.')[1] : 6); if (t === 'i' || t === 'd' || t === 'u') return String(Math.trunc(v)); return String(v); }); }
function IsKeyDown(k) { return __down.has(k); } function IsKeyUp(k) { return !__down.has(k); } function IsKeyPressed(k) { return __pressed.has(k); } function IsKeyReleased(k) { return __released.has(k); }
function IsMouseButtonDown(b) { return __mdown.has(b); } function IsMouseButtonPressed(b) { return __mpressed.has(b); }
function GetMousePosition() { return __Vector2(__mouse.x, __mouse.y); } function GetMouseX() { return Math.round(__mouse.x); } function GetMouseY() { return Math.round(__mouse.y); }
function GetFrameTime() { return __dt; } function GetTime() { return (performance.now() - __t0) / 1000; }
function GetScreenWidth() { return __cv.width; } function GetScreenHeight() { return __cv.height; }
function GetRandomValue(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function CheckCollisionRecs(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function CheckCollisionCircles(c1, r1, c2, r2) { return Math.hypot(c1.x - c2.x, c1.y - c2.y) <= r1 + r2; }
function CheckCollisionPointRec(p, r) { return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height; }
function CheckCollisionCircleRec(c, rad, r) { const cx = Math.max(r.x, Math.min(c.x, r.x + r.width)), cy = Math.max(r.y, Math.min(c.y, r.y + r.height)); return Math.hypot(c.x - cx, c.y - cy) <= rad; }
function Fade(c, a) { return __col(c.r, c.g, c.b, Math.round(255 * a)); } const ColorAlpha = Fade;
function LoadTexture(path) { return { width: 48, height: 48, path: String(path) }; } function UnloadTexture() {}
function DrawTexture(t, x, y, tint) { __g.fillStyle = 'rgba(124,92,255,.35)'; __g.fillRect(x, y, t.width, t.height); __g.strokeStyle = __css(tint || WHITE); __g.strokeRect(x + .5, y + .5, t.width - 1, t.height - 1); __g.fillStyle = '#fff'; __g.font = '9px monospace'; __g.textBaseline = 'top'; __g.fillText(String(t.path).split('/').pop().slice(0, 8), x + 3, y + 3); }
function DrawTextureV(t, p, tint) { DrawTexture(t, p.x, p.y, tint); }
let __ac = null; function InitAudioDevice() {} function CloseAudioDevice() {} function LoadSound(p) { return { path: String(p) }; } function UnloadSound() {}
function PlaySound() { try { __ac = __ac || new AudioContext(); const o = __ac.createOscillator(), v = __ac.createGain(); o.type = 'square'; o.frequency.value = 660; v.gain.value = .05; o.connect(v).connect(__ac.destination); o.start(); o.stop(__ac.currentTime + .08); } catch (e) {} }
function Clamp(v, a, b) { return Math.max(a, Math.min(b, v)); } function Lerp(a, b, t) { return a + (b - a) * t; }
function Vector2Add(a, b) { return __Vector2(a.x + b.x, a.y + b.y); } function Vector2Subtract(a, b) { return __Vector2(a.x - b.x, a.y - b.y); } function Vector2Scale(a, s) { return __Vector2(a.x * s, a.y * s); } function Vector2Length(a) { return Math.hypot(a.x, a.y); } function Vector2Distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function Vector2Normalize(a) { const l = Math.hypot(a.x, a.y) || 1; return __Vector2(a.x / l, a.y / l); }
const sqrt = Math.sqrt, sin = Math.sin, cos = Math.cos, fabs = Math.abs, abs = Math.abs, floor = Math.floor, ceil = Math.ceil, pow = Math.pow, atan2 = Math.atan2, fminf = Math.min, fmaxf = Math.max, min = Math.min, max = Math.max, rand = () => Math.floor(Math.random() * 32767), srand = () => {}, time = () => 0, sqrtf = Math.sqrt, sinf = Math.sin, cosf = Math.cos;
const PI = Math.PI, DEG2RAD = Math.PI / 180, RAD2DEG = 180 / Math.PI;
`;

  function page(code) {
    let js, err = null;
    try { js = transpile(code); } catch (e) { err = e.message; }
    if (!err) { try { new Function(js + '\n;return 0;'); } catch (e) { if (e instanceof SyntaxError) err = e.message; } }
    const body = err
      ? `<div class="msg"><b>The raylib preview can’t read this program yet.</b><br>${String(err).replace(/</g, '&lt;')}<br><br>It understands the beginner raylib basics used in the lessons. Your C++ is still checked normally.</div>`
      : `<canvas id="rl" width="800" height="450" tabindex="0"></canvas>
<script>${RUNTIME}
try {
${js}
if (typeof main !== 'function') throw new Error('No int main() found.');
const __it = main();
function __step(now) { __dt = Math.min(0.1, (now - __last) / 1000) || 1 / 60; __last = now; let r; try { r = __it.next(); } catch (e) { __err(e); return; } if (!r.done && !__closed) requestAnimationFrame(__step); else document.getElementById('rl-state').textContent = 'program ended'; }
requestAnimationFrame(__step);
} catch (e) { __err(e); }
function __err(e) { const d = document.createElement('div'); d.className = 'msg'; d.innerHTML = '<b>Preview stopped:</b> ' + String(e && e.message || e).replace(/</g, '&lt;'); document.body.appendChild(d); }
<\/script>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#0b0e14;color:#cbd5e1;font:13px system-ui,sans-serif}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px;box-sizing:border-box}
.bar{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;align-items:center;font-size:12px;color:#94a3b8;text-align:center}.bar b{color:#e2e8f0}
canvas{max-width:100%;max-height:calc(100% - 44px);background:#000;image-rendering:pixelated;border-radius:6px;box-shadow:0 10px 30px -10px #000;outline:none}
.msg{max-width:520px;padding:14px 16px;border-radius:10px;background:#1a202c;border:1px solid #2d3748;line-height:1.5}
</style></head><body><div class="bar"><b id="rl-title">raylib preview</b><span>· click the game, then use the keys</span><span id="rl-state"></span></div>${body}</body></html>`;
  }

  function preview(code) {
    Q.app.showRight('preview');
    const f = document.getElementById('preview'); if (!f) return;
    requestAnimationFrame(() => { f.srcdoc = page(code); });
    Q.app.log?.('sys', 'raylib preview: running a simulated version of your game in the Preview tab.');
  }
  const isRaylib = (code) => /#include\s*[<"]raylib\.h[>"]/.test(code || '');
  Q.raylib = { transpile, page, preview, isRaylib };
})();
