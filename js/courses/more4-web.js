/* Codeditor — round 5: new HTML & CSS teaching lessons */
(() => {
  const { tip, pre, tryit, read, quiz, code, extend } = Q.kit;
  const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const page = (body, css = '') => `<!DOCTYPE html><html><head><style>body{font-family:system-ui;padding:12px}${css}</style></head><body>${body}</body></html>`;

  /* ---------------- HTML ---------------- */
  extend('html', 'inputs', [
    { id: 'a11y', title: 'Accessible pages', xp: 30, recap: 'Every <code>&lt;img&gt;</code> needs <code>alt</code>; every input needs a <code>&lt;label for&gt;</code>; buttons need text.', steps: [
      read('Pages for everyone', `<p>Some players use <b>screen readers</b> that read the page aloud. They can’t see pictures or guess what an unlabeled box is for. Three habits fix most problems:</p>${pre('<img src="boss.png" alt="A giant red dragon">\n\n<label for="nick">Nickname</label>\n<input id="nick">\n\n<button>Start game</button>')}<p>The label’s <code>for</code> matches the input’s <code>id</code> — now clicking the label focuses the box, too.</p>`),
      quiz('What should <code>alt</code> text describe?', ['The file name', 'What the picture shows', 'The image size', 'Nothing — leave it empty always'], 1),
      code({ task: 'Add an image <code>logo.png</code> with alt text <b>Space Raiders logo</b>, then a label <b>Player name</b> connected to an input with <code>id="player"</code>.', starter: '', hints: ['<code>&lt;label for="player"&gt;Player name&lt;/label&gt;</code>'], solution: '<img src="logo.png" alt="Space Raiders logo">\n<label for="player">Player name</label>\n<input id="player">\n',
        check: (r, H) => { const img = H.el(r, 'img'); if (!img) return 'Add an <code>&lt;img&gt;</code>.'; if ((img.getAttribute('alt') || '').trim() !== 'Space Raiders logo') return 'Give the image <code>alt="Space Raiders logo"</code>.'; const l = H.el(r, 'label'); if (!l || l.textContent.trim() !== 'Player name') return 'Add <code>&lt;label for="player"&gt;Player name&lt;/label&gt;</code>.'; if (l.getAttribute('for') !== 'player') return 'The label needs <code>for="player"</code>.'; return H.el(r, 'input#player') ? true : 'Add <code>&lt;input id="player"&gt;</code>.'; } }),
    ] },
  ]);
  extend('html', 'semantic', [
    { id: 'details', title: 'Details, dialogs & extras', xp: 25, recap: '<code>&lt;details&gt;&lt;summary&gt;</code> makes a click-to-open section; <code>&lt;progress&gt;</code> shows a bar; <code>&lt;kbd&gt;</code> marks keys.', steps: [
      read('Built-in widgets', `<p>HTML has interactive pieces that need no JavaScript:</p>${tryit('<details>\n  <summary>How to play</summary>\n  <p>Use <kbd>←</kbd> <kbd>→</kbd> to move.</p>\n</details>\n\n<progress value="70" max="100"></progress>')}<p>Click the summary to open it. <code>&lt;progress&gt;</code> is perfect for health or loading bars.</p>`),
      quiz('Which element is the clickable title of a <code>&lt;details&gt;</code>?', ['<title>', '<summary>', '<h1>', '<label>'], 1),
      code({ task: 'Make a <code>&lt;details&gt;</code> with the summary <b>Controls</b> and inside it a paragraph with <code>&lt;kbd&gt;Space&lt;/kbd&gt;</code> in it.', starter: '', hints: ['<code>&lt;details&gt;&lt;summary&gt;Controls&lt;/summary&gt;&lt;p&gt;Press &lt;kbd&gt;Space&lt;/kbd&gt; to jump&lt;/p&gt;&lt;/details&gt;</code>'], solution: '<details>\n  <summary>Controls</summary>\n  <p>Press <kbd>Space</kbd> to jump.</p>\n</details>\n',
        check: (r, H) => !H.el(r, 'details') ? 'Add a <code>&lt;details&gt;</code>.' : H.text(r, 'details > summary') !== 'Controls' ? 'Give it <code>&lt;summary&gt;Controls&lt;/summary&gt;</code>.' : !H.el(r, 'details p kbd') ? 'Inside, add a <code>&lt;p&gt;</code> with <code>&lt;kbd&gt;Space&lt;/kbd&gt;</code>.' : H.text(r, 'details p kbd') !== 'Space' ? 'The kbd should say <b>Space</b>.' : true }),
      code({ keep: true, task: 'Below it, add a health bar: <code>&lt;progress&gt;</code> with <code>value="3"</code> and <code>max="5"</code>.', hints: ['<code>&lt;progress value="3" max="5"&gt;&lt;/progress&gt;</code>'], solution: '<details>\n  <summary>Controls</summary>\n  <p>Press <kbd>Space</kbd> to jump.</p>\n</details>\n<progress value="3" max="5"></progress>\n',
        check: (r, H) => { const p = H.el(r, 'progress'); return !p ? 'Add a <code>&lt;progress&gt;</code>.' : p.getAttribute('value') !== '3' || p.getAttribute('max') !== '5' ? 'Use <code>value="3"</code> and <code>max="5"</code>.' : true; } }),
    ] },
  ]);
  extend('html', 'media', [
    { id: 'canvas', title: 'The canvas: where games live', xp: 30, recap: '<code>&lt;canvas id="game" width="400" height="300"&gt;</code> gives JavaScript a drawing surface.', steps: [
      read('A drawing surface', `<p>Browser games draw on a <code>&lt;canvas&gt;</code>. HTML makes the canvas; JavaScript draws on it:</p>${tryit('<canvas id="game" width="300" height="150" style="background:#111"></canvas>\n<script>\n  const ctx = document.getElementById("game").getContext("2d");\n  ctx.fillStyle = "gold";\n  ctx.fillRect(20, 20, 50, 50);\n</script>')}${tip('Set the size with the <code>width</code> and <code>height</code> attributes, not CSS — CSS only stretches the picture.')}`),
      quiz('Where should a canvas’s drawing size be set?', ['In CSS width/height', 'In the width and height attributes', 'In the <title>', 'It can’t be set'], 1),
      code({ task: 'Add a canvas with <code>id="game"</code>, <code>width="480"</code> and <code>height="320"</code>.', starter: '', hints: ['<code>&lt;canvas id="game" width="480" height="320"&gt;&lt;/canvas&gt;</code>'], solution: '<canvas id="game" width="480" height="320"></canvas>\n',
        check: (r, H) => { const c = H.el(r, 'canvas'); return !c ? 'Add a <code>&lt;canvas&gt;</code>.' : c.id !== 'game' ? 'Give it <code>id="game"</code>.' : c.width !== 480 || c.height !== 320 ? 'Set <code>width="480"</code> and <code>height="320"</code>.' : true; } }),
      code({ keep: true, task: 'Add a <code>&lt;script&gt;</code> after it that fills a <b>red</b> 40×40 square at (10, 10).', hints: ['<code>const ctx = document.getElementById("game").getContext("2d"); ctx.fillStyle = "red"; ctx.fillRect(10, 10, 40, 40);</code>'], solution: '<canvas id="game" width="480" height="320"></canvas>\n<script>\n  const ctx = document.getElementById("game").getContext("2d");\n  ctx.fillStyle = "red";\n  ctx.fillRect(10, 10, 40, 40);\n</script>\n',
        check: (r, H) => { const c = H.el(r, 'canvas'); if (!c) return 'Keep your canvas.'; try { const d = c.getContext('2d').getImageData(25, 25, 1, 1).data; return d[0] > 200 && d[1] < 60 && d[3] > 200 ? true : 'I don’t see a red square at (10, 10). Check fillStyle and fillRect.'; } catch { return 'Couldn’t read the canvas.'; } } }),
    ] },
  ]);

  /* ---------------- CSS ---------------- */
  extend('css', 'box', [
    { id: 'shadows', title: 'Rounded corners, shadows & gradients', xp: 30, recap: '<code>border-radius</code> rounds; <code>box-shadow: x y blur color</code>; <code>background: linear-gradient(dir, a, b)</code>.', steps: [
      read('Make it pop', `${pre('.card {\n  border-radius: 12px;\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);\n  background: linear-gradient(to bottom, #7c5cff, #2a1b6b);\n}')}<p>These three properties make flat boxes look like buttons, cards and game panels.</p>`),
      quiz('In <code>box-shadow: 0 8px 20px black</code>, what is <code>20px</code>?', ['Horizontal offset', 'Vertical offset', 'Blur', 'Spread'], 2),
      code({ page: page('<button class="play">Play</button>'), task: 'Give <code>.play</code> a <code>border-radius</code> of <b>20px</b> and a <code>box-shadow</code> of <code>0 4px 10px black</code>.', starter: '', hints: ['<code>.play { border-radius: 20px; box-shadow: 0 4px 10px black; }</code>'], solution: '.play {\n  border-radius: 20px;\n  box-shadow: 0 4px 10px black;\n}\n',
        check: (r) => r.css('.play', 'border-top-left-radius') !== '20px' ? 'Set <code>border-radius: 20px;</code>' : !/rgb\(0, 0, 0\) 0px 4px 10px/.test(r.css('.play', 'box-shadow') || '') ? 'Set <code>box-shadow: 0 4px 10px black;</code>' : true }),
      code({ page: page('<div class="sky" style="height:80px"></div>'), task: 'Give <code>.sky</code> a background gradient from <b>skyblue</b> (top) to <b>white</b> (bottom): <code>linear-gradient(to bottom, skyblue, white)</code>.', starter: '', hints: ['Use the <code>background</code> property.'], solution: '.sky {\n  background: linear-gradient(to bottom, skyblue, white);\n}\n',
        check: (r) => /linear-gradient\(rgb\(135, 206, 235\), rgb\(255, 255, 255\)\)|linear-gradient\(to bottom, rgb\(135, 206, 235\), rgb\(255, 255, 255\)\)/.test(r.css('.sky', 'background-image') || '') || 'Use <code>background: linear-gradient(to bottom, skyblue, white);</code>' }),
    ] },
  ]);
  extend('css', 'classes', [
    { id: 'selectors', title: 'Smarter selectors', xp: 30, recap: '<code>.menu a</code> = links inside .menu; <code>li:first-child</code>, <code>li:nth-child(2)</code>, <code>a:hover</code>; <code>h1, h2</code> = both.', steps: [
      read('Picking exactly what you want', `${pre('.menu a        { color: gold; }     /* links INSIDE .menu */\nli:first-child  { font-weight: bold; }\nli:nth-child(even) { background: #222; }  /* zebra stripes */\nh1, h2          { font-family: monospace; }  /* both */')}`),
      quiz('Which selector matches only links inside <code>&lt;nav&gt;</code>?', ['nav, a', 'nav a', 'a.nav', 'nav > p'], 1),
      code({ page: page('<ul class="scores"><li>Ana 900</li><li>Bo 750</li><li>Cy 600</li></ul>'), task: 'Make the <b>first</b> item in <code>.scores</code> <code>gold</code> using <code>:first-child</code>.', starter: '', hints: ['<code>.scores li:first-child { color: gold; }</code>'], solution: '.scores li:first-child {\n  color: gold;\n}\n',
        check: (r) => r.css('.scores li:nth-child(1)', 'color') !== 'rgb(255, 215, 0)' ? 'Make the first item gold.' : r.css('.scores li:nth-child(2)', 'color') === 'rgb(255, 215, 0)' ? 'Only the <b>first</b> item should be gold.' : true }),
      code({ page: page('<ul class="scores"><li>Ana 900</li><li>Bo 750</li><li>Cy 600</li><li>Di 500</li></ul>'), task: 'Give every <b>even</b> row a background of <code>#eeeeee</code> with <code>:nth-child(even)</code>.', starter: '', hints: ['<code>.scores li:nth-child(even) { background: #eeeeee; }</code>'], solution: '.scores li:nth-child(even) {\n  background: #eeeeee;\n}\n',
        check: (r) => r.css('.scores li:nth-child(2)', 'background-color') !== 'rgb(238, 238, 238)' ? 'Row 2 should have the #eeeeee background.' : r.css('.scores li:nth-child(1)', 'background-color') === 'rgb(238, 238, 238)' ? 'Only even rows get the background.' : true }),
    ] },
  ]);
  extend('css', 'hover', [
    { id: 'pseudo', title: '::before & ::after', xp: 30, recap: '<code>.x::before { content: "★ "; }</code> adds decoration without changing the HTML.', steps: [
      read('Decorations for free', `${pre('.coin::before {\n  content: "🪙 ";\n}\n.new::after {\n  content: " NEW";\n  color: red;\n  font-size: 10px;\n}')}<p><code>::before</code> and <code>::after</code> add content inside the element — at the start or end. They need a <code>content</code> property, even if it’s just <code>""</code>.</p>`),
      quiz('A <code>::before</code> rule shows nothing. What’s missing most often?', ['display: block', 'content', 'color', 'position'], 1),
      code({ page: page('<p class="tip">Collect all the gems</p>'), task: 'Put <b>"Tip: "</b> before every <code>.tip</code> using <code>::before</code>.', starter: '', hints: ['<code>.tip::before { content: "Tip: "; }</code>'], solution: '.tip::before {\n  content: "Tip: ";\n}\n',
        check: (r) => { const el = r.doc.querySelector('.tip'); const c = el && r.win.getComputedStyle(el, '::before').content; return c === '"Tip: "' || 'Add <code>.tip::before { content: "Tip: "; }</code>'; } }),
    ] },
  ]);
})();
