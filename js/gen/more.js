/* Codeditor — extra level generators (build 14): more exercise shapes per skill, so practice doesn't feel the same.
   JS answers are computed by running the solution; Python answers are worked out here and verified against real python3 in tests. */
(() => {
  const { near, pack, rule } = Q.gen;
  const esc = Q.gen.esc;
  const c = (s) => `<code>${esc(s)}</code>`;
  const lines = (a) => a.map((x) => `<b>${esc(x)}</b>`).join(', ');

  /* ======================= JavaScript ======================= */
  const fmt = (v) => (Array.isArray(v) ? v.map(fmt).join(',') : typeof v === 'object' && v ? JSON.stringify(v) : String(v));
  const run = (code) => { const out = []; new Function('console', code)({ log: (...a) => out.push(a.map(fmt).join(' ')), warn() {}, error() {} }); return out; };
  const J = (id, after, skill, kind, make) => ({ id, after, skill, kind, make: (g) => { const o = make(g); if (kind === 'predict' && o.answer == null) o.answer = run(o.code).join(' · '); else if (kind !== 'predict' && kind !== 'quiz' && !o.expect) o.expect = run(o.solution); return o; } });
  const jn = (g) => g.pick(['score', 'coins', 'gold', 'hp', 'ammo', 'fuel', 'mana', 'gems', 'xp', 'stars']);

  pack('js', 'out', [
    J('x-swap', 'vars', 'Variables', 'write', (g) => {
      const [a, b] = g.pick([['left', 'right'], ['p1', 'p2'], ['first', 'second'], ['red', 'blue']]); const x = g.int(1, 50), y = g.int(51, 99);
      return { task: `${c(a)} is ${x} and ${c(b)} is ${y}. Swap them, then print ${c(a)} and then ${c(b)}.`, starter: `let ${a} = ${x};\nlet ${b} = ${y};\n`, solution: `let ${a} = ${x};\nlet ${b} = ${y};\n[${a}, ${b}] = [${b}, ${a}];\nconsole.log(${a});\nconsole.log(${b});\n`, need: [[new RegExp(`console\\.log\\(\\s*${a}\\s*\\)`), `Print the variable <code>${a}</code>, not the number.`]], hints: [`Use a temporary variable, or <code>[${a}, ${b}] = [${b}, ${a}];</code>`] };
    }),
    J('x-template', 'strings', 'Template strings', 'write', (g) => {
      const n = g.name(), k = g.int(2, 99), [what, unit] = g.pick([['scored', 'points'], ['found', 'gems'], ['beat', 'enemies'], ['collected', 'coins']]);
      return { task: `Using a template string (backticks), print ${lines([`${n} ${what} ${k} ${unit}`])}.`, starter: `const name = "${n}";\nconst amount = ${k};\n`, solution: `const name = "${n}";\nconst amount = ${k};\nconsole.log(\`\${name} ${what} \${amount} ${unit}\`);\n`, need: [[/`[^`]*\$\{\s*name\s*\}[^`]*\$\{\s*amount\s*\}/, 'Use <code>`${name} … ${amount} …`</code>.']] };
    }),
    J('x-ternary', 'if', 'If / else', 'predict', (g) => {
      const v = jn(g), x = g.int(0, 100), t = g.int(20, 80), [yes, no] = g.pick([['"win"', '"lose"'], ['"open"', '"locked"'], ['"fast"', '"slow"'], ['"day"', '"night"']]);
      return { code: `const ${v} = ${x};\nconsole.log(${v} >= ${t} ? ${yes} : ${no});`, wrong: [yes.replace(/"/g, ''), no.replace(/"/g, ''), 'true', 'false'] };
    }),
    J('x-includes', 'arrays', 'Arrays', 'predict', (g) => {
      const ws = g.words(3), w = g.chance(0.5) ? g.pick(ws) : g.item(), m = g.pick(['includes', 'indexOf']);
      return { code: `const bag = ${JSON.stringify(ws)};\nconsole.log(bag.${m}("${w}"));`, wrong: m === 'includes' ? ['true', 'false', 'undefined', '"' + w + '"'] : ['-1', '0', '1', '2', '3', 'true'] };
    }),
    J('x-sum', 'patterns', 'Totals', 'write', (g) => {
      const v = g.pick(['scores', 'damage', 'prices', 'laps']), xs = g.ints(g.int(4, 6), 2, 40);
      return { task: `Add up every number in ${c(v)} with a loop (or ${c('reduce')}) and print the total.`, starter: `const ${v} = [${xs.join(', ')}];\n`, solution: `const ${v} = [${xs.join(', ')}];\nlet total = 0;\nfor (const n of ${v}) {\n  total += n;\n}\nconsole.log(total);\n`, need: [[/\bfor\b|\.reduce\s*\(|\.forEach\s*\(/, 'Use a loop or <code>reduce</code> — don’t type the answer.']] };
    }),
    J('x-halve', 'while', 'While loops', 'write', (g) => {
      const n = g.int(40, 900), d = g.pick([2, 3]);
      return { task: `Start with ${c(`let n = ${n};`)}. While ${c('n')} is at least 1, divide it by ${d} (rounding down with ${c('Math.floor')}) and count the steps. Print the number of steps.`, solution: `let n = ${n};\nlet steps = 0;\nwhile (n >= 1) {\n  n = Math.floor(n / ${d});\n  steps++;\n}\nconsole.log(steps);\n`, need: [[/\bwhile\b/, 'Use a <code>while</code> loop.']] };
    }),
    J('x-objkey', 'objects', 'Objects', 'predict', (g) => {
      const it = g.picks(['sword', 'bow', 'shield', 'potion', 'map', 'key'], 3), vals = g.ints(3, 1, 30), k = g.pick(it);
      return { code: `const prices = { ${it.map((x, i) => `${x}: ${vals[i]}`).join(', ')} };\nconst item = "${k}";\nconsole.log(prices[item] * 2);`, wrong: near(g, vals[it.indexOf(k)] * 2, ['undefined', 'NaN', vals[it.indexOf(k)]]) };
    }),
    J('x-default', 'functions', 'Functions', 'predict', (g) => {
      const a = g.int(2, 9), b = g.int(2, 9), d = g.int(2, 5), [f, op] = g.pick([['area', '*'], ['total', '+'], ['gap', '-']]);
      const fn = (x, y) => (op === '*' ? x * y : op === '+' ? x + y : x - y);
      return { code: `function ${f}(a, b = ${d}) {\n  return a ${op} b;\n}\nconsole.log(${f}(${a}), ${f}(${a}, ${b}));`, wrong: [`NaN ${fn(a, b)}`, `${fn(a, b)} ${fn(a, b)}`, `${fn(a, d)} ${fn(a, d)}`, `${a} ${fn(a, b)}`, `undefined ${fn(a, b)}`] };
    }),
    J('x-obo-fix', 'loops', 'Loops', 'fix', (g) => {
      const ws = g.words(g.int(3, 4));
      return { task: `This should print each word once, but it prints ${c('undefined')} at the end.`, bug: `const words = ${JSON.stringify(ws)};\nfor (let i = 0; i <= words.length; i++) {\n  console.log(words[i]);\n}\n`, solution: `const words = ${JSON.stringify(ws)};\nfor (let i = 0; i < words.length; i++) {\n  console.log(words[i]);\n}\n`, hints: ['The last index is <code>length - 1</code>. Should the loop use <code>&lt;=</code> or <code>&lt;</code>?'] };
    }),
    J('x-repeat', 'strings', 'Strings', 'predict', (g) => {
      const w = g.pick(['ab', 'ha', 'xo', '=-', '*']), n = g.int(2, 4), m = g.pick(['repeat', 'pad']);
      return m === 'repeat' ? { code: `console.log("${w}".repeat(${n}));`, wrong: [w + n, w.repeat(n - 1), w.repeat(n + 1), `${w} ${w}`] }
        : (() => { const v = g.int(1, 99), w2 = n + 2; return { code: `console.log(String(${v}).padStart(${w2}, "0"));`, wrong: [String(v), String(v).padEnd(w2, '0'), '0' + v, '00' + v, '000' + v] }; })();
    }),
    J('x-map', 'methods', 'Array methods', 'predict', (g) => {
      const xs = g.ints(3, 1, 9), k = g.int(2, 5), [m, body] = g.pick([['map', `x * ${k}`], ['map', `x + ${k}`], ['filter', `x > ${k}`]]);
      return { code: `const nums = [${xs.join(', ')}];\nconsole.log(nums.${m}((x) => ${body}));`, wrong: [xs.join(','), xs.map((x) => x * k).join(','), xs.map((x) => x + k).join(','), xs.filter((x) => x >= k).join(','), 'undefined'] };
    }),
    J('x-switch-fix', 'switch', 'Switch', 'fix', (g) => {
      const [a, b] = g.picks(['"easy"', '"normal"', '"hard"'], 2), x = g.int(1, 5), y = x + g.int(2, 6);
      return { task: `With difficulty ${esc(a)} this should print only <b>${x}</b>, but it prints two numbers.`, bug: `const mode = ${a};\nswitch (mode) {\n  case ${a}:\n    console.log(${x});\n  case ${b}:\n    console.log(${y});\n    break;\n}\n`, solution: `const mode = ${a};\nswitch (mode) {\n  case ${a}:\n    console.log(${x});\n    break;\n  case ${b}:\n    console.log(${y});\n    break;\n}\n`, hints: ['Without <code>break</code>, a case “falls through” into the next one.'] };
    }),
    J('x-count-if', 'loops', 'Counting', 'predict', (g) => {
      const xs = g.ints(5, 1, 20), t = g.int(5, 15);
      return { code: `const rolls = [${xs.join(', ')}];\nlet big = 0;\nfor (const r of rolls) {\n  if (r > ${t}) big++;\n}\nconsole.log(big);`, wrong: near(g, xs.filter((x) => x > t).length, [xs.filter((x) => x >= t).length]) };
    }),
  ]);

  /* ======================= Python ======================= */
  const P = (id, after, skill, kind, make) => ({ id, after, skill, kind, make });
  const L = (a) => `[${a.map((x) => (typeof x === 'string' ? `'${x}'` : x)).join(', ')}]`;
  const pn = (g) => g.pick(['score', 'coins', 'gold', 'hp', 'ammo', 'fuel', 'mana', 'gems', 'xp', 'stars']);
  const pyRound = (x) => { const f = Math.floor(x), d = x - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 ? f + 1 : f); };

  pack('py', 'out', [
    P('y-swap', 'vars', 'Variables', 'write', (g) => {
      const [a, b] = g.pick([['left', 'right'], ['p1', 'p2'], ['first', 'second'], ['red', 'blue']]); const x = g.int(1, 50), y = g.int(51, 99);
      return { task: `${c(a)} is ${x} and ${c(b)} is ${y}. Swap them, then print ${c(a)} and then ${c(b)}.`, starter: `${a} = ${x}\n${b} = ${y}\n`, solution: `${a} = ${x}\n${b} = ${y}\n${a}, ${b} = ${b}, ${a}\nprint(${a})\nprint(${b})\n`, expect: [String(y), String(x)], need: [[new RegExp(`print\\(\\s*${a}\\s*\\)`), `Print the variable <code>${a}</code>, not the number.`]], hints: [`Python can swap in one line: <code>${a}, ${b} = ${b}, ${a}</code>`] };
    }),
    P('y-round', 'math', 'Math', 'predict', (g) => {
      const a = g.int(1, 40), d = g.pick([1, 2, 3, 4, 6, 7, 8, 9]); const x = a + d / 10;
      return { code: `print(round(${x.toFixed(1)}))`, answer: String(pyRound(x)), wrong: [String(a), String(a + 1), x.toFixed(1), String(a - 1)] };
    }),
    P('y-maxmin', 'lists', 'Lists', 'write', (g) => {
      const xs = g.ints(g.int(4, 6), 1, 99), [what, f] = g.pick([['biggest', 'max'], ['smallest', 'min']]);
      const v = f === 'max' ? Math.max(...xs) : Math.min(...xs);
      return { task: `Print the ${what} number in ${c('times')}, then how many numbers there are. Use ${c(f + '()')} and ${c('len()')}.`, starter: `times = ${L(xs)}\n`, solution: `times = ${L(xs)}\nprint(${f}(times))\nprint(len(times))\n`, expect: [String(v), String(xs.length)], need: [[new RegExp(`${f}\\s*\\(`), `Use <code>${f}()</code>.`], [/len\s*\(/, 'Use <code>len()</code>.']] };
    }),
    P('y-count', 'strings', 'Strings', 'predict', (g) => {
      const w = g.pick(['banana', 'balloon', 'mississippi', 'cocoa', 'pepper', 'letter', 'bubble', 'giggle']); const ch = g.pick([...new Set(w.split(''))]);
      const n = w.split(ch).length - 1;
      return { code: `print("${w}".count("${ch}"))`, answer: String(n), wrong: near(g, n, [w.length]) };
    }),
    P('y-join', 'listtools', 'Lists', 'predict', (g) => {
      const ws = g.words(3), sep = g.pick(['-', ', ', ' + ', '/', '']);
      return { code: `parts = ${L(ws)}\nprint("${sep}".join(parts))`, answer: ws.join(sep), wrong: [ws.join(' '), ws.join(','), `${L(ws)}`, ws.join(sep) + sep] };
    }),
    P('y-double', 'while', 'While loops', 'write', (g) => {
      const n = g.int(20, 900), k = g.pick([2, 3]); let x = 1; while (x < n) x *= k;
      return { task: `Start with ${c('x = 1')}. While ${c('x')} is less than ${n}, multiply it by ${k}. Then print ${c('x')}.`, solution: `x = 1\nwhile x < ${n}:\n    x *= ${k}\nprint(x)\n`, expect: [String(x)], need: [[/while\s/, 'Use a <code>while</code> loop.']] };
    }),
    P('y-get', 'dicts', 'Dictionaries', 'predict', (g) => {
      const it = g.picks(['sword', 'bow', 'shield', 'potion', 'map', 'key'], 3), vals = g.ints(3, 1, 30); const k = g.chance(0.5) ? g.pick(it) : g.pick(['axe', 'rope', 'lamp']);
      const d = g.int(0, 5); const ans = it.includes(k) ? vals[it.indexOf(k)] : d;
      return { code: `stock = {${it.map((x, i) => `"${x}": ${vals[i]}`).join(', ')}}\nprint(stock.get("${k}", ${d}))`, answer: String(ans), wrong: ['None', 'KeyError', String(d), ...vals.map(String)] };
    }),
    P('y-default', 'params', 'Functions', 'predict', (g) => {
      const a = g.int(2, 9), b = g.int(2, 9), d = g.int(2, 5), [f, op, fn] = g.pick([['area', '*', (x, y) => x * y], ['total', '+', (x, y) => x + y], ['gap', '-', (x, y) => x - y]]);
      return { code: `def ${f}(a, b=${d}):\n    return a ${op} b\n\nprint(${f}(${a}), ${f}(${a}, ${b}))`, answer: `${fn(a, d)} ${fn(a, b)}`, wrong: [`${fn(a, b)} ${fn(a, b)}`, `${fn(a, d)} ${fn(a, d)}`, `${a} ${fn(a, b)}`, 'TypeError'] };
    }),
    P('y-doubled', 'listtools', 'Lists', 'write', (g) => {
      const xs = g.ints(g.int(3, 5), 1, 20), k = g.int(2, 4);
      return { task: `Make a new list called ${c('boosted')} with every number in ${c('base')} times ${k}, then print it.`, starter: `base = ${L(xs)}\n`, solution: `base = ${L(xs)}\nboosted = [n * ${k} for n in base]\nprint(boosted)\n`, expect: [L(xs.map((x) => x * k))], need: [[/\bfor\b/, 'Use a loop or a list comprehension.'], [/boosted/, 'Call the new list <code>boosted</code>.']] };
    }),
    P('y-indent', 'for', 'For loops', 'fix', (g) => {
      const a = g.int(0, 3), b = a + g.int(2, 4);
      return { task: `This stops with an IndentationError. It should print ${a} to ${b - 1}.`, bug: `for i in range(${a}, ${b}):\nprint(i)\n`, solution: `for i in range(${a}, ${b}):\n    print(i)\n`, expect: Array.from({ length: b - a }, (_, i) => String(a + i)), hints: ['The code inside a loop is indented (4 spaces).'] };
    }),
    P('y-reverse', 'slicing', 'Slicing', 'write', (g) => {
      const w = g.word();
      return { task: `Print ${c('word')} backwards using a slice.`, starter: `word = "${w}"\n`, solution: `word = "${w}"\nprint(word[::-1])\n`, expect: [w.split('').reverse().join('')], need: [[/\[\s*:\s*:\s*-1\s*\]/, 'A slice with step <code>-1</code> goes backwards: <code>[::-1]</code>.']] };
    }),
    P('y-build', 'patterns', 'Strings', 'predict', (g) => {
      const w = g.pick(['abc', 'cat', 'sun', 'top', 'red', 'map']), front = g.chance(0.5);
      return { code: `s = ""\nfor ch in "${w}":\n    s = ${front ? 'ch + s' : 's + ch + ch'}\nprint(s)`, answer: front ? w.split('').reverse().join('') : w.split('').map((x) => x + x).join(''), wrong: [w, w.split('').reverse().join(''), w + w, w.split('').map((x) => x + x).join('')] };
    }),
    P('y-counter', 'classes', 'Classes', 'predict', (g) => {
      const a = g.int(1, 5), b = g.int(1, 5), s = g.int(0, 10);
      return { code: `class Counter:\n    def __init__(self, start):\n        self.n = start\n    def add(self, k):\n        self.n += k\n\nc = Counter(${s})\nc.add(${a})\nc.add(${b})\nprint(c.n)`, answer: String(s + a + b), wrong: near(g, s + a + b, [a + b, s]) };
    }),
    P('y-nested', 'nested', 'Logic', 'predict', (g) => {
      const hp = g.int(0, 100), has = g.chance(0.5);
      const out = hp > 50 ? (has ? 'attack' : 'explore') : hp > 0 ? 'heal' : 'game over';
      return { code: `hp = ${hp}\nhas_sword = ${has ? 'True' : 'False'}\nif hp > 50:\n    if has_sword:\n        print("attack")\n    else:\n        print("explore")\nelif hp > 0:\n    print("heal")\nelse:\n    print("game over")`, answer: out, wrong: ['attack', 'explore', 'heal', 'game over'] };
    }),
  ]);

  /* ======================= C# (reviewed) ======================= */
  const T = (id, after, skill, kind, make) => ({ id, after, skill, kind, make });
  pack('cs', 'review', [
    T('cx-ternary', 'logic', 'If / else', 'write', (g) => {
      const x0 = g.int(0, 30); const [yes, no, v, op, t] = g.pick([['Alive', 'Dead', 'hp', '>', 0], ['Open', 'Locked', 'keys', '>=', g.int(1, 3)], ['Fast', 'Slow', 'speed', '>', g.int(5, 20)]]);
      return { task: `Set ${c('label')} with one line using the ternary operator: "${yes}" if ${c(`${v} ${op} ${t}`)}, otherwise "${no}".`, starter: `int ${v} = ${x0};\n`, solution: `int ${v} = ${x0};\nstring label = ${v} ${op} ${t} ? "${yes}" : "${no}";\n`, rules: [rule(`string label = ${v} ${op} ${t} ? "${yes}" : "${no}";`, `Use <code>string label = condition ? "${yes}" : "${no}";</code>`)] };
    }),
    T('cx-foreach', 'arrays', 'Loops', 'write', (g) => {
      const xs = g.ints(4, 1, 50);
      return { task: `Use ${c('foreach')} to add every number in ${c('scores')} to ${c('total')}.`, starter: `int[] scores = { ${xs.join(', ')} };\nint total = 0;\n`, solution: `int[] scores = { ${xs.join(', ')} };\nint total = 0;\nforeach (int s in scores) {\n    total += s;\n}\n`, rules: [[/foreach\s*\(\s*(int|var)\s+(\w+)\s+in\s+scores\s*\)/, 'Write <code>foreach (int s in scores)</code>.'], [/total\s*\+=\s*\w+\s*;/, 'Add each one with <code>total += s;</code>']] };
    }),
    T('cx-return', 'methods', 'Methods', 'write', (g) => {
      const [name, op, k] = g.pick([['Double', '*', 2], ['Triple', '*', 3], ['AddTen', '+', 10], ['Half', '/', 2]]);
      return { task: `Write a method ${c(`int ${name}(int x)`)} that returns ${c(`x ${op} ${k}`)}.`, solution: `int ${name}(int x) {\n    return x ${op} ${k};\n}\n`, rules: [rule(`int ${name}(int x)`), rule(`return x ${op} ${k};`)] };
    }),
    T('cx-compound', 'basics', 'Variables', 'fill', (g) => {
      const [op, n] = g.pick([['+=', g.int(2, 50)], ['-=', g.int(2, 20)], ['*=', g.int(2, 5)]]);
      return { task: { '+=': `Add ${n} to ${c('score')} in one short step.`, '-=': `Take ${n} away from ${c('score')} in one short step.`, '*=': `Multiply ${c('score')} by ${n} in one short step.` }[op], blank: `int score = 10;\nscore ____ ${n};\n`, solution: `int score = 10;\nscore ${op} ${n};\n`, rules: [rule(`score ${op} ${n};`)] };
    }),
    T('cx-loop-fix', 'logic', 'Loops', 'fix', () => ({ task: 'This loop never ends — the game freezes. Make it count down.', bug: 'int lives = 3;\nwhile (lives > 0) {\n    Console.WriteLine(lives);\n}\n', solution: 'int lives = 3;\nwhile (lives > 0) {\n    Console.WriteLine(lives);\n    lives--;\n}\n', rules: [[/lives\s*(--|-=\s*1|=\s*lives\s*-\s*1)\s*;/, 'Make <code>lives</code> smaller each time, e.g. <code>lives--;</code>']] })),
  ]);

  /* ======================= Lua (reviewed) ======================= */
  pack('lua', 'review', [
    T('lx-concat', 'basics', 'Strings', 'write', (g) => {
      const [label, v] = g.pick([['Score: ', 'score'], ['Coins: ', 'coins'], ['HP: ', 'hp'], ['Level ', 'level']]); const x0 = g.int(1, 99);
      return { task: `Print ${c(label + 'N')} by joining the text and ${c(v)} with ${c('..')}.`, starter: `local ${v} = ${x0}\n`, solution: `local ${v} = ${x0}\nprint("${label}" .. ${v})\n`, rules: [[new RegExp(`print\\s*\\(\\s*"${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*\\.\\.\\s*${v}\\s*\\)`), `Write <code>print("${esc(label)}" .. ${v})</code>.`]] };
    }),
    T('lx-ne', 'logic', 'Logic', 'fill', () => ({ task: 'Lua’s “not equal” is different from other languages. Fill it in.', blank: 'if answer ____ 42 then\n    print("Wrong")\nend\n', solution: 'if answer ~= 42 then\n    print("Wrong")\nend\n', rules: [rule('if answer ~= 42 then', 'Lua uses <code>~=</code> for “not equal”.')] })),
    T('lx-countdown', 'logic', 'Loops', 'fill', (g) => {
      const n = g.int(3, 10);
      return { task: `Count down from ${n} to 1.`, blank: `for i = ${n}, 1, ____ do\n    print(i)\nend\n`, solution: `for i = ${n}, 1, -1 do\n    print(i)\nend\n`, rules: [rule(`for i = ${n}, 1, -1 do`, 'The third number is the step. To count down, step by <code>-1</code>.')] };
    }),
    T('lx-ipairs', 'tables', 'Tables', 'write', (g) => {
      const ws = g.words(3);
      return { task: `Loop over ${c('items')} with ${c('ipairs')} and print each value.`, starter: `local items = {${ws.map((w) => `"${w}"`).join(', ')}}\n`, solution: `local items = {${ws.map((w) => `"${w}"`).join(', ')}}\nfor i, item in ipairs(items) do\n    print(item)\nend\n`, rules: [[/for\s+\w+\s*,\s*(\w+)\s+in\s+ipairs\s*\(\s*items\s*\)\s+do/, 'Write <code>for i, item in ipairs(items) do</code>.'], [/print\s*\(\s*\w+\s*\)[\s\S]*\bend\b/, 'Print the value and close the loop with <code>end</code>.']] };
    }),
    T('lx-end-fix', 'functions', 'Functions', 'fix', (g) => {
      const [f, body] = g.pick([['heal', 'hp = hp + 10'], ['addCoin', 'coins = coins + 1'], ['levelUp', 'level = level + 1']]);
      return { task: 'This function is missing something, so the script won’t run.', bug: `function ${f}()\n    ${body}\n\n${f}()\n`, solution: `function ${f}()\n    ${body}\nend\n\n${f}()\n`, rules: [[new RegExp(`function\\s+${f}\\s*\\(\\s*\\)[\\s\\S]*?\\bend\\b[\\s\\S]*${f}\\s*\\(\\s*\\)`), 'Every <code>function</code> needs an <code>end</code>.']] };
    }),
  ]);

  /* ======================= C++ (reviewed) ======================= */
  pack('cpp', 'review', [
    T('px-cout', 'basics', 'Output', 'write', (g) => {
      const [label, v] = g.pick([['HP: ', 'hp'], ['Score: ', 'score'], ['Ammo: ', 'ammo']]); const x0 = g.int(1, 99);
      return { task: `Print ${c(label)} followed by ${c(v)}’s value on one line using ${c('cout')}, ${c('<<')} and ${c('endl')}.`, starter: `int ${v} = ${x0};\n`, solution: `int ${v} = ${x0};\ncout << "${label}" << ${v} << endl;\n`, rules: [[new RegExp(`cout\\s*<<\\s*"${label}"\\s*<<\\s*${v}\\s*<<\\s*endl\\s*;`), `Write <code>cout &lt;&lt; "${label}" &lt;&lt; ${v} &lt;&lt; endl;</code>`]] };
    }),
    T('px-const', 'basics', 'Variables', 'fill', (g) => {
      const n = g.int(3, 10);
      return { task: `${c('MAX_LIVES')} should never change. Fill in the keyword.`, blank: `____ int MAX_LIVES = ${n};\n`, solution: `const int MAX_LIVES = ${n};\n`, rules: [rule(`const int MAX_LIVES = ${n};`)] };
    }),
    T('px-rangefor', 'vectors', 'Vectors', 'write', (g) => {
      const xs = g.ints(4, 1, 30);
      return { task: `Use a range-based ${c('for')} loop to add every number in ${c('dmg')} to ${c('total')}.`, starter: `vector<int> dmg = {${xs.join(', ')}};\nint total = 0;\n`, solution: `vector<int> dmg = {${xs.join(', ')}};\nint total = 0;\nfor (int d : dmg) {\n    total += d;\n}\n`, rules: [[/for\s*\(\s*(int|auto|const\s+int&?|auto&?)\s*&?\s*(\w+)\s*:\s*dmg\s*\)/, 'Write <code>for (int d : dmg)</code>.'], [/total\s*\+=\s*\w+\s*;/, 'Add each one with <code>total += d;</code>']] };
    }),
    T('px-ref-fix', 'functions', 'Functions', 'fix', (g) => {
      const k = g.int(5, 30);
      return { task: `${c('heal')} should change the player’s ${c('hp')}, but it only changes a copy. Pass it by reference.`, bug: `void heal(int hp) {\n    hp += ${k};\n}\n`, solution: `void heal(int& hp) {\n    hp += ${k};\n}\n`, rules: [[/void\s+heal\s*\(\s*int\s*&\s*hp\s*\)/, 'Add <code>&amp;</code>: <code>int&amp; hp</code>.']] };
    }),
    T('px-elseif', 'control', 'If / else', 'fill', (g) => {
      const t = g.int(50, 90);
      return { task: 'Check a second condition when the first one is false.', blank: `if (hp > ${t}) {\n    cout << "Strong";\n} ____ (hp > 0) {\n    cout << "Hurt";\n}\n`, solution: `if (hp > ${t}) {\n    cout << "Strong";\n} else if (hp > 0) {\n    cout << "Hurt";\n}\n`, rules: [rule('} else if (hp > 0) {', 'Use <code>else if</code>.')] };
    }),
  ]);
})();
