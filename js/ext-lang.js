/* Codeditor — extra extensions (all off by default): general helpers + one or two per language.
   Hint checkers are deliberately simple and friendly: they point at likely beginner mistakes, never block anything. */
(() => {
  const { debounce } = Q;
  const E = (id, name, desc, icon, color, cat, extra = {}) => ({ id, name, desc, icon, color, cat, on: false, ...extra });

  /* ---------------- hint checkers ---------------- */
  // each returns [{ line, msg }] for one file
  const stripStr = (l) => l.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
  const CHECKS = {
    typoCatcher: { langs: '*', run(code) {
      const T = { lenght: 'length', widht: 'width', heigth: 'height', hieght: 'height', retrun: 'return', reutrn: 'return', fucntion: 'function', funtion: 'function', pirnt: 'print', prnit: 'print', consloe: 'console', cosnole: 'console', flase: 'false', ture: 'true', dcoument: 'document', docuemnt: 'document', lable: 'label', positon: 'position', postion: 'position', velcoity: 'velocity', veloctiy: 'velocity', colour2: '', scroe: 'score', socre: 'score', plyer: 'player', palyer: 'player', ememy: 'enemy', enemey: 'enemy', Lenght: 'Length', Udpate: 'Update', Strat: 'Start', Dsetroy: 'Destroy', Instatiate: 'Instantiate', Instanciate: 'Instantiate' };
      const out = [];
      code.split('\n').forEach((l, i) => { const re = /\b[A-Za-z]+\b/g; let m; while ((m = re.exec(l))) if (T[m[0]]) { out.push({ line: i + 1, msg: `typo? “${m[0]}” → “${T[m[0]]}”` }); break; } });
      return out;
    } },
    pyHelper: { langs: ['python'], run(code) {
      const out = []; const lines = code.split('\n');
      lines.forEach((raw, i) => {
        const l = stripStr(raw).replace(/#.*/, ''); const t = l.trim(); if (!t) return;
        if (/^(if|elif|else|for|while|def|class|try|except|finally|with)\b/.test(t) && !/:\s*$/.test(t) && !/\\$/.test(t) && !/[([{,]$/.test(t)) out.push({ line: i + 1, msg: 'missing “:” at the end?' });
        else if (/\t/.test(raw.match(/^\s*/)[0]) && / /.test(raw.match(/^\s*/)[0])) out.push({ line: i + 1, msg: 'tabs and spaces mixed — use 4 spaces' });
        else if (/^ +/.test(raw) && raw.match(/^ */)[0].length % 4 !== 0 && !/^\s*[)\]},]/.test(raw) && !/[([{,\\]\s*$/.test(lines[i - 1] || '')) out.push({ line: i + 1, msg: 'indent is not a multiple of 4 spaces' });
        else if (/^(if|elif|while)\b[^=!<>]*[^=!<>]=[^=]/.test(t)) out.push({ line: i + 1, msg: 'use “==” to compare (one “=” sets a value)' });
        else if (/\bprint\s+["'\w]/.test(t) && !/\bprint\s*\(/.test(t)) out.push({ line: i + 1, msg: 'print needs brackets: print(...)' });
      });
      return out;
    } },
    pyNames: { langs: ['python'], run(code) {
      const out = [];
      code.split('\n').forEach((l, i) => { const m = l.match(/^\s*([a-z]+[A-Z]\w*)\s*=[^=]/) || l.match(/^\s*def\s+([a-z]+[A-Z]\w*)/); if (m) out.push({ line: i + 1, msg: `Python style: ${m[1]} → ${m[1].replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())}` }); });
      return out;
    } },
    jsEquality: { langs: ['javascript', 'typescript'], run(code) {
      const out = [];
      code.split('\n').forEach((l, i) => { const t = stripStr(l).replace(/\/\/.*/, ''); if (/[^=!<>]==[^=]/.test(t)) out.push({ line: i + 1, msg: 'use “===” — “==” converts types in surprising ways' }); else if (/!=[^=]/.test(t)) out.push({ line: i + 1, msg: 'use “!==” instead of “!=”' }); else if (/\bif\s*\([^)]*[^=!<>]=[^=>][^)]*\)/.test(t)) out.push({ line: i + 1, msg: 'one “=” inside if() sets a value — compare with “===”' }); });
      return out;
    } },
    jsDeclare: { langs: ['javascript', 'typescript'], run(code) {
      const declared = new Set([...code.matchAll(/\b(?:let|const|var|function|class)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]));
      [...code.matchAll(/\(([^()]*)\)\s*(?:=>|\{)/g)].forEach((m) => m[1].split(',').forEach((p) => declared.add(p.trim().replace(/=.*/, '').replace(/[{}[\].\s]/g, ''))));
      [...code.matchAll(/\bfor\s*\(\s*(?:let|const|var)\s+([A-Za-z_$][\w$]*)/g)].forEach((m) => declared.add(m[1]));
      const out = []; let depth = 0;
      code.split('\n').forEach((l, i) => { const m = l.match(/^\s*([A-Za-z_$][\w$]*)\s*=[^=>]/); if (m && !declared.has(m[1]) && !/^(window|document|module|exports|self)$/.test(m[1])) { declared.add(m[1]); out.push({ line: i + 1, msg: `“${m[1]}” was never declared — add let or const` }); } void depth; });
      return out;
    } },
    tsAny: { langs: ['typescript'], run(code) {
      const out = []; code.split('\n').forEach((l, i) => { if (/:\s*any\b|<any>|as any\b/.test(l)) out.push({ line: i + 1, msg: '“any” turns off type checking — try a real type' }); }); return out;
    } },
    htmlA11y: { langs: ['html'], run(code) {
      const out = []; const lines = code.split('\n');
      lines.forEach((l, i) => {
        if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(l)) out.push({ line: i + 1, msg: 'image needs alt="…" text for screen readers' });
        else if (/<button\b[^>]*>\s*<\/button>/i.test(l)) out.push({ line: i + 1, msg: 'empty button — add text or aria-label' });
        else if (/<a\b(?![^>]*\bhref=)[^>]*>/i.test(l)) out.push({ line: i + 1, msg: 'link without href' });
        else if (/<input\b(?![^>]*\b(aria-label|id)=)[^>]*>/i.test(l) && !/type=["']?(hidden|submit|button)/i.test(l)) out.push({ line: i + 1, msg: 'input needs a <label> (give it an id) or aria-label' });
      });
      if (/<html\b/i.test(code) && !/<html\b[^>]*\blang=/i.test(code)) { const i = lines.findIndex((l) => /<html\b/i.test(l)); out.push({ line: i + 1, msg: 'add lang="en" so browsers know the language' }); }
      return out;
    } },
    cssUnits: { langs: ['css', 'scss'], run(code) {
      const out = [];
      code.split('\n').forEach((l, i) => {
        const m = l.match(/^\s*(width|height|margin(?:-\w+)?|padding(?:-\w+)?|top|left|right|bottom|font-size|gap|border-radius|max-width|min-width|max-height|min-height)\s*:\s*([^;]+)/i);
        if (m && /(^|\s)[1-9]\d*(\.\d+)?(\s|$)/.test(m[2]) && !/calc|var\(/.test(m[2])) out.push({ line: i + 1, msg: `numbers need a unit here — like ${m[2].trim().match(/[1-9]\d*(\.\d+)?/)[0]}px` });
        else if (/^\s*[\w-]+\s+[^:{]+;\s*$/.test(l) && !/^\s*@/.test(l)) out.push({ line: i + 1, msg: 'missing “:” between property and value?' });
      });
      return out;
    } },
    unityHints: { langs: ['csharp'], run(code) {
      const out = []; const lines = code.split('\n'); let inUpdate = false, depth = 0, updDepth = -1;
      lines.forEach((l, i) => {
        const m = l.match(/\bvoid\s+(update|start|awake|fixedUpdate|fixedupdate|onCollisionEnter|oncollisionenter|onTriggerEnter|ontriggerenter|lateUpdate)\s*\(/);
        if (m) out.push({ line: i + 1, msg: `Unity won’t call “${m[1]}” — it’s case-sensitive: ${{ update: 'Update', start: 'Start', awake: 'Awake', fixedupdate: 'FixedUpdate', fixedUpdate: 'FixedUpdate', oncollisionenter: 'OnCollisionEnter', onCollisionEnter: 'OnCollisionEnter', ontriggerenter: 'OnTriggerEnter', onTriggerEnter: 'OnTriggerEnter', lateUpdate: 'LateUpdate' }[m[1]]}` });
        if (/\bvoid\s+Update\s*\(/.test(l)) { inUpdate = true; updDepth = depth; }
        if (inUpdate && /(GetComponent|FindObjectOfType|GameObject\.Find)\s*[<(]/.test(l)) out.push({ line: i + 1, msg: 'this runs every frame — find it once in Start() and keep it' });
        depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
        if (inUpdate && depth <= updDepth && /\}/.test(l)) inUpdate = false;
        const t = stripStr(l).replace(/\/\/.*/, '').trim();
        if (t && !/[;{}(,]$|^(if|else|for|foreach|while|using|namespace|class|public|private|protected|static|void|\[|#|\/\/|\*)/.test(t) && /[\w)\]"]$/.test(t) && /[=(]/.test(t)) out.push({ line: i + 1, msg: 'missing “;” at the end?' });
      });
      return out;
    } },
    robloxLint: { langs: ['lua'], run(code) {
      const out = [];
      code.split('\n').forEach((l, i) => {
        const t = stripStr(l).replace(/--.*/, '');
        if (/!=/.test(t)) out.push({ line: i + 1, msg: 'Lua uses “~=” for “not equal”' });
        else if (/(^|[^.\w])wait\s*\(/.test(t)) out.push({ line: i + 1, msg: 'use task.wait() — plain wait() is deprecated in Roblox' });
        else if (/(^|[^.\w])(spawn|delay)\s*\(/.test(t)) out.push({ line: i + 1, msg: 'use task.spawn / task.delay instead' });
        else if (/["'][^"']*["']\s*\+\s*\w|\w\s*\+\s*["']/.test(l)) out.push({ line: i + 1, msg: 'join text with “..” in Lua, not “+”' });
        else if (/^\s*(if|elseif)\b(.*)\bthen\b/.test(t) && /[^=~<>]=[^=]/.test(t.match(/^\s*(?:if|elseif)\b(.*)\bthen\b/)[1])) out.push({ line: i + 1, msg: 'compare with “==” (one “=” sets a value)' });
        else if (/^\s*(if|elseif)\b/.test(t) && !/\bthen\b/.test(t)) out.push({ line: i + 1, msg: 'missing “then”?' });
        else if (/\bgame\.Workspace\b/.test(t)) out.push({ line: i + 1, msg: 'tip: “workspace” is a shortcut for game.Workspace' });
      });
      return out;
    } },
    cppHelper: { langs: ['cpp', 'c'], run(code) {
      const out = []; const usingStd = /using\s+namespace\s+std/.test(code);
      code.split('\n').forEach((l, i) => {
        const t = stripStr(l).replace(/\/\/.*/, '').trim(); if (!t) return;
        if (/\b(cout|cin|endl|string|vector)\b/.test(t) && !usingStd && !/std::(cout|cin|endl|string|vector)/.test(t) && !/^#/.test(t)) out.push({ line: i + 1, msg: 'add std:: (like std::cout) or “using namespace std;”' });
        else if (/\bif\s*\([^)]*[^=!<>]=[^=][^)]*\)/.test(t)) out.push({ line: i + 1, msg: 'one “=” inside if() sets a value — compare with “==”' });
        else if (!/[;{}:,(]$|^(#|if|else|for|while|switch|do|class|struct|public|private|protected|template|namespace|\/\/|\*)/.test(t) && /[\w)\]"']$/.test(t) && /[=(<]/.test(t)) out.push({ line: i + 1, msg: 'missing “;” at the end?' });
      });
      if (/\bcout\b/.test(code) && !/#include\s*<iostream>/.test(code)) out.push({ line: 1, msg: 'cout needs #include <iostream>' });
      return out;
    } },
  };

  /* ---------------- snippet packs ---------------- */
  const S = (label, insert, detail) => ({ label, insert, detail });
  const PACKS = {
    unitySnippets: { langs: ['csharp'], items: [
      S('update', 'void Update()\n{\n    $0\n}', 'Update()'), S('start', 'void Start()\n{\n    $0\n}', 'Start()'), S('fixed', 'void FixedUpdate()\n{\n    $0\n}', 'FixedUpdate()'),
      S('serial', '[SerializeField] private ${1:float} ${2:speed} = ${3:5f};', '[SerializeField]'), S('getcomp', '${1:rb} = GetComponent<${2:Rigidbody2D}>();', 'GetComponent'),
      S('oncol', 'void OnCollisionEnter2D(Collision2D other)\n{\n    $0\n}', 'OnCollisionEnter2D'), S('ontrig', 'void OnTriggerEnter2D(Collider2D other)\n{\n    if (other.CompareTag("${1:Player}"))\n    {\n        $0\n    }\n}', 'OnTriggerEnter2D'),
      S('inst', 'Instantiate(${1:prefab}, ${2:transform.position}, Quaternion.identity);', 'Instantiate'), S('coroutine', 'IEnumerator ${1:Wait}()\n{\n    yield return new WaitForSeconds(${2:1f});\n    $0\n}', 'coroutine'),
      S('input', 'float ${1:x} = Input.GetAxis("${2:Horizontal}");', 'Input axis'), S('key', 'if (Input.GetKeyDown(KeyCode.${1:Space}))\n{\n    $0\n}', 'key press'),
      S('move', 'transform.Translate(Vector3.${1:right} * ${2:speed} * Time.deltaTime);', 'move with deltaTime'), S('log', 'Debug.Log(${1});', 'Debug.Log'),
    ] },
    robloxSnippets: { langs: ['lua'], items: [
      S('service', 'local ${1:Players} = game:GetService("${1:Players}")', 'GetService'), S('part', 'local part = Instance.new("Part")\npart.Size = Vector3.new(${1:4}, ${2:1}, ${3:4})\npart.Position = Vector3.new(0, ${4:10}, 0)\npart.Anchored = true\npart.Parent = workspace', 'new Part'),
      S('touched', '${1:part}.Touched:Connect(function(hit)\n\tlocal humanoid = hit.Parent:FindFirstChild("Humanoid")\n\tif humanoid then\n\t\t$0\n\tend\nend)', 'Touched'),
      S('playeradded', 'game:GetService("Players").PlayerAdded:Connect(function(player)\n\t$0\nend)', 'PlayerAdded'), S('leaderstats', 'local stats = Instance.new("Folder")\nstats.Name = "leaderstats"\nstats.Parent = player\n\nlocal ${1:coins} = Instance.new("IntValue")\n${1:coins}.Name = "${2:Coins}"\n${1:coins}.Parent = stats', 'leaderstats'),
      S('tween', 'local TweenService = game:GetService("TweenService")\nlocal info = TweenInfo.new(${1:1})\nTweenService:Create(${2:part}, info, { ${3:Position} = ${4:Vector3.new(0, 20, 0)} }):Play()', 'tween'),
      S('remote', 'local remote = game:GetService("ReplicatedStorage"):WaitForChild("${1:RemoteEvent}")\nremote.OnServerEvent:Connect(function(player, ${2:data})\n\t$0\nend)', 'RemoteEvent (server)'),
      S('debounce', 'local debounce = false\n${1:part}.Touched:Connect(function(hit)\n\tif debounce then return end\n\tdebounce = true\n\t$0\n\ttask.wait(${2:1})\n\tdebounce = false\nend)', 'debounce'),
      S('loop', 'while true do\n\t$0\n\ttask.wait(${1:1})\nend', 'game loop'),
    ] },
    raylibSnippets: { langs: ['cpp', 'c'], items: [
      S('raymain', '#include "raylib.h"\n\nint main() {\n    InitWindow(${1:800}, ${2:450}, "${3:My Game}");\n    SetTargetFPS(60);\n    while (!WindowShouldClose()) {\n        BeginDrawing();\n        ClearBackground(RAYWHITE);\n        $0\n        EndDrawing();\n    }\n    CloseWindow();\n    return 0;\n}', 'raylib game'),
      S('rect', 'DrawRectangle(${1:x}, ${2:y}, ${3:40}, ${4:40}, ${5:RED});', 'DrawRectangle'), S('circle', 'DrawCircle(${1:x}, ${2:y}, ${3:20}, ${4:BLUE});', 'DrawCircle'), S('text', 'DrawText("${1:Score}", ${2:10}, ${3:10}, ${4:20}, ${5:BLACK});', 'DrawText'),
      S('keydown', 'if (IsKeyDown(KEY_${1:RIGHT})) ${2:x} += ${3:200} * GetFrameTime();', 'IsKeyDown'), S('collide', 'if (CheckCollisionRecs(${1:a}, ${2:b})) {\n    $0\n}', 'CheckCollisionRecs'),
    ] },
    pySnippetsPlus: { langs: ['python'], items: [
      S('dataclass', 'from dataclasses import dataclass\n\n@dataclass\nclass ${1:Player}:\n    ${2:name}: str\n    ${3:hp}: int = ${4:100}', 'dataclass'), S('menu', 'while True:\n    choice = input("${1:Choose: 1) Play 2) Quit} ")\n    if choice == "1":\n        $0\n    elif choice == "2":\n        break', 'game menu'),
      S('enumerate', 'for ${1:i}, ${2:item} in enumerate(${3:items}):\n    $0', 'enumerate'), S('dictloop', 'for ${1:key}, ${2:value} in ${3:data}.items():\n    $0', 'dict loop'), S('choice', 'import random\n${1:pick} = random.choice(${2:items})', 'random.choice'),
    ] },
  };

  /* ---------------- general extras ---------------- */
  const PREVIEW = {
    fpsMeter: `<script>(function(){var d=document.createElement('div');d.style.cssText='position:fixed;top:6px;right:6px;z-index:2147483647;font:600 11px/1 monospace;color:#4ade80;background:rgba(0,0,0,.65);padding:4px 6px;border-radius:5px;pointer-events:none';var n=0,t=performance.now();function f(now){n++;if(now-t>=500){d.textContent=Math.round(n*1000/(now-t))+' FPS';n=0;t=now;}requestAnimationFrame(f);}addEventListener('DOMContentLoaded',function(){document.body.appendChild(d);requestAnimationFrame(f);});})();<\/script>`,
    coordHelper: `<script>(function(){addEventListener('load',function(){var cs=[].slice.call(document.querySelectorAll('canvas'));cs.forEach(function(c){var o=document.createElement('canvas');var r=c.getBoundingClientRect();o.width=c.width;o.height=c.height;o.style.cssText='position:absolute;pointer-events:none;z-index:2147483646;left:'+(r.left+scrollX)+'px;top:'+(r.top+scrollY)+'px;width:'+r.width+'px;height:'+r.height+'px';document.body.appendChild(o);var g=o.getContext('2d');g.strokeStyle='rgba(255,255,255,.12)';g.fillStyle='rgba(255,255,255,.45)';g.font='9px monospace';for(var x=0;x<=c.width;x+=50){g.beginPath();g.moveTo(x+.5,0);g.lineTo(x+.5,c.height);g.stroke();if(x)g.fillText(x,x+2,9);}for(var y=0;y<=c.height;y+=50){g.beginPath();g.moveTo(0,y+.5);g.lineTo(c.width,y+.5);g.stroke();if(y)g.fillText(y,2,y-2);}var tip=document.createElement('div');tip.style.cssText='position:fixed;z-index:2147483647;font:600 11px monospace;color:#fff;background:rgba(0,0,0,.7);padding:3px 6px;border-radius:4px;pointer-events:none;display:none';document.body.appendChild(tip);c.addEventListener('mousemove',function(e){var b=c.getBoundingClientRect();var mx=Math.round((e.clientX-b.left)*c.width/b.width),my=Math.round((e.clientY-b.top)*c.height/b.height);tip.textContent='x '+mx+'  y '+my;tip.style.display='block';tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY+12)+'px';});c.addEventListener('mouseleave',function(){tip.style.display='none';});});});})();<\/script>`,
    slowMo: `<script>(function(){var raf=window.requestAnimationFrame.bind(window),skip=0;window.requestAnimationFrame=function(cb){return raf(function loop(t){if((skip=(skip+1)%3)!==0)return raf(loop);cb(t);});};var pn=performance.now.bind(performance),start=pn();performance.now=function(){return start+(pn()-start)/3;};})();<\/script>`,
  };

  const LIST = [
    // general
    E('typoCatcher', 'Typo Catcher', 'Spots common coding typos like “lenght”, “retrun” or “pirnt” and shows the fix at the end of the line.', 'check', '#facc15', 'Extras'),
    E('rainbowIndent', 'Rainbow Indent', 'Colors each indentation level so nested code is easy to follow — great for Python.', 'format', '#c084fc', 'Extras'),
    E('fpsMeter', 'FPS Meter', 'Shows frames per second in the corner of your game preview.', 'timer', '#4ade80', 'Extras', { preview: true }),
    E('coordHelper', 'Coordinate Helper', 'Draws a grid over canvases in the preview and shows the mouse x/y — perfect for placing things in games.', 'target', '#22d3ee', 'Extras', { preview: true }),
    E('slowMo', 'Slow Motion Preview', 'Runs your game preview at ⅓ speed so you can watch collisions and movement up close.', 'timer', '#fb923c', 'Extras', { preview: true }),
    E('consoleTime', 'Console Timestamps', 'Adds the time to each console line so you can see when things happened.', 'timer', '#94a3b8', 'Extras'),
    // per language
    E('pyHelper', 'Python Helper', 'Flags missing colons, uneven indentation, “=” used to compare and print without brackets.', 'bulb', '#60a5fa', 'Python'),
    E('pyNames', 'PEP 8 Names', 'Suggests Python-style snake_case names (playerScore → player_score).', 'edit', '#60a5fa', 'Python'),
    E('pySnippetsPlus', 'Python Game Snippets', 'Extra snippets: dataclass, game menu, enumerate, dict loop, random.choice.', 'box', '#60a5fa', 'Python'),
    E('jsEquality', 'Strict Equality Hints', 'Suggests “===” instead of “==” and warns about “=” inside if().', 'bulb', '#facc15', 'JavaScript & TypeScript'),
    E('jsDeclare', 'Undeclared Variable Hints', 'Warns when you assign to a name that was never declared with let or const.', 'alert', '#facc15', 'JavaScript & TypeScript'),
    E('tsAny', 'No “any” Hints', 'Points out “any” in TypeScript, which switches type checking off.', 'alert', '#3b82f6', 'JavaScript & TypeScript'),
    E('htmlA11y', 'Accessibility Hints', 'Checks for images without alt text, empty buttons, unlabeled inputs and links without href.', 'eye', '#f97316', 'HTML & CSS'),
    E('cssUnits', 'CSS Units Checker', 'Catches numbers without units (width: 100 → 100px) and missing colons.', 'format', '#3b82f6', 'HTML & CSS'),
    E('unityHints', 'Unity Helper', 'Catches lowercase update()/start() Unity won’t call, slow GetComponent in Update and missing semicolons.', 'bulb', '#a78bfa', 'C# & Unity'),
    E('unitySnippets', 'Unity Snippets', 'update, start, serial, getcomp, ontrig, inst, coroutine, key, move and more.', 'box', '#a78bfa', 'C# & Unity'),
    E('robloxLint', 'Roblox Lua Helper', 'Flags “!=” (use ~=), old wait()/spawn(), “+” for joining text, and missing then.', 'bulb', '#6366f1', 'Lua & Roblox'),
    E('robloxSnippets', 'Roblox Snippets', 'service, part, touched, playeradded, leaderstats, tween, remote, debounce, loop.', 'box', '#6366f1', 'Lua & Roblox'),
    E('cppHelper', 'C++ Helper', 'Flags missing std::, missing semicolons, “=” inside if() and missing #include <iostream>.', 'bulb', '#38bdf8', 'C++'),
    E('raylibSnippets', 'raylib Snippets', 'raymain, rect, circle, text, keydown, collide — the raylib basics.', 'box', '#38bdf8', 'C++'),
  ];
  LIST.forEach((e) => Q.ext.register(e));
  const on = (id) => Q.ext.isOn(id);

  // preview injections
  Q.ext.previewHead = () => Object.keys(PREVIEW).filter(on).map((k) => PREVIEW[k]).join('');

  Q.ext.onInit((app) => {
    const ed = app.editor;
    // snippet packs
    Q.editorFactory.addCompletions('*', ({ before, langId }) => {
      const out = []; const w = (before.match(/[\w:]*$/) || [''])[0]; if (!w) return out;
      for (const [id, p] of Object.entries(PACKS)) if (on(id) && p.langs.includes(langId)) p.items.forEach((s) => { if (s.label.startsWith(w.toLowerCase())) out.push({ ...s, replaceLen: w.length, doc: '```\n' + s.insert.replace(/\$\{\d+:?([^}]*)\}|\$\d/g, '$1') + '\n```' }); });
      return out;
    });
    // hint checkers → end-of-line hints
    const lint = (id) => {
      if (!id || !ed.has(id)) return;
      const lang = ed.langOf(id); const code = ed.get(id) || '';
      for (const [k, c] of Object.entries(CHECKS)) {
        const active = on(k) && (c.langs === '*' || c.langs.includes(lang));
        let list = [];
        if (active) { try { list = c.run(code).slice(0, 40); } catch (e) { console.warn(k, e); } }
        ed.decorate('x-' + k, id, list.map((d) => ({ line: d.line, after: '  ◆ ' + d.msg, className: 'lint-hint' })));
      }
      rainbow(id);
    };
    const later = debounce((id) => lint(id), 450);
    ed.onChange((id) => { if (id === ed.activeId) later(id); });
    const origAct = Q.ext.onActivate; Q.ext.onActivate = (id) => { origAct(id); lint(id); };
    Q.ext.onToggle.push(() => { lint(ed.activeId); if (LIST.some((e) => e.preview)) app.refreshPreview?.(true); });
    // rainbow indent (works in both editors through line decorations)
    function rainbow(id) {
      if (!on('rainbowIndent')) return ed.decorate('x-rainbow', id, []);
      const out = [];
      (ed.get(id) || '').split('\n').forEach((l, i) => { const n = l.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length; const lvl = Math.min(6, Math.floor(n / 2)); if (n && l.trim()) out.push({ line: i + 1, start: 1, end: Math.min(l.match(/^[ \t]*/)[0].length + 1, l.length + 1), className: 'rb-' + (Math.floor(lvl / (ed.langOf(id) === 'python' ? 2 : 1)) % 6) }); });
      ed.decorate('x-rainbow', id, out);
    }
    lint(ed.activeId);
  });
  Q.ext.checks = CHECKS;
})();
