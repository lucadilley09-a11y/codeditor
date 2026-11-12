/* Codeditor — unit projects and capstones for JavaScript and Python */
(() => {
  const { e, tip, pre, read, code, extend, expectLines, grab } = Q.kit;
  const fmt = (v) => (Array.isArray(v) ? v.map(fmt).join(',') : typeof v === 'object' && v ? JSON.stringify(v) : String(v));
  const run = (src, swaps = []) => { let s = src; for (const [re, v] of swaps) s = s.replace(re, v); const out = []; try { new Function('console', s)({ log: (...a) => out.push(a.map(fmt).join(' ')), warn() {}, error() {} }); } catch { return null; } return out; };
  const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x.trim() === b[i].trim());
  // check = output must equal the model answer's output, and stay right when the inputs change
  const outCheck = (solution, swaps = [], need = []) => (r) => {
    for (const [re, msg] of need) if (!re.test(r.code)) return msg;
    for (const sw of swaps) { const want = run(solution, sw), got = run(r.code, sw); if (!same(got, want)) return `Your code should still work when the numbers change — try ${e(String(sw[0][1]))}.`; }
    return expectLines(r, run(solution));
  };
  const creative = (html, bonus = 75) => ({ type: 'read', creative: true, bonus, html: `<h4>Make it your own</h4>${html}<p class="muted">This step isn’t auto-checked. When you’ve added something you’re proud of, mark it done for bonus XP.</p>` });
  // load several names from ONE run of the code, so classes are the same objects
  const grabAll = (src, names) => { try { return new Function(src.replace(/console\.log/g, '(()=>{})') + `\n;return { ${names.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ')} };`)(); } catch { return {}; } };
  const proj = (id, title, xp, steps, recap) => ({ id, title, xp, kind: 'project', recap, steps });

  /* ============================== JavaScript ============================== */
  const LOOT1 = 'const roll = 37;\n\nif (roll >= 90) {\n  console.log("Legendary");\n} else if (roll >= 60) {\n  console.log("Rare");\n} else {\n  console.log("Common");\n}\n';
  const LOOT2 = 'const roll = 37;\n\nlet rarity;\nif (roll >= 90) {\n  rarity = "Legendary";\n} else if (roll >= 60) {\n  rarity = "Rare";\n} else {\n  rarity = "Common";\n}\n\nlet gold;\nswitch (rarity) {\n  case "Legendary":\n    gold = 100;\n    break;\n  case "Rare":\n    gold = 25;\n    break;\n  default:\n    gold = 5;\n}\nconsole.log(`${rarity}: ${gold} gold`);\n';
  const LOOT3 = LOOT2 + 'console.log(gold >= 25 ? "Nice find!" : "Better luck next time.");\n';
  const R = (n) => [[/roll\s*=\s*37/, `roll = ${n}`]];
  extend('js', 'switch', [proj('loot', 'Unit project: Loot roller', 40, [
    read('What you’ll build', `<p>A loot roller like the ones in RPGs: a random roll decides how rare the drop is and how much gold it’s worth. You’ll use <b>if / else</b>, <b>switch</b> and a <b>ternary</b> — everything from this unit.</p>`),
    code({ task: '<b>Step 1.</b> Print <b>Legendary</b> if <code>roll</code> is 90 or more, <b>Rare</b> if it’s 60 or more, otherwise <b>Common</b>.', starter: 'const roll = 37;\n', solution: LOOT1, hints: ['Check the biggest case first: <code>if (roll >= 90)</code>, then <code>else if (roll >= 60)</code>.'], check: outCheck(LOOT1, [R(95), R(60), R(12)], [[/if\s*\(/, 'Use if / else.']]) }),
    code({ task: '<b>Step 2.</b> Store the rarity in <code>let rarity</code> instead of printing it. Then use a <code>switch</code> to set <code>gold</code>: Legendary 100, Rare 25, anything else 5. Print one line like <b>Common: 5 gold</b>.', keep: true, solution: LOOT2, hints: ['Each case ends with <code>break;</code>', 'Print with a template: <code>`${rarity}: ${gold} gold`</code>'], check: outCheck(LOOT2, [R(95), R(70)], [[/switch\s*\(\s*rarity\s*\)/, 'Use <code>switch (rarity)</code>.']]) }),
    code({ task: '<b>Step 3.</b> Add a second line using a ternary: <b>Nice find!</b> when gold is 25 or more, otherwise <b>Better luck next time.</b>', keep: true, solution: LOOT3, check: outCheck(LOOT3, [R(95), R(70)], [[/\?[\s\S]*:/, 'Use a ternary: <code>cond ? a : b</code>.']]) }),
  ], 'Decisions with if, switch and ternaries, working together.')]);

  const MAP0 = 'const W = 8;\nconst H = 5;\nconst PX = 3;\nconst PY = 2;\n';
  const MAP1 = MAP0 + '\nfor (let y = 0; y < H; y++) {\n  let line = "";\n  for (let x = 0; x < W; x++) {\n    line += ".";\n  }\n  console.log(line);\n}\n';
  const MAP2 = MAP0 + '\nfor (let y = 0; y < H; y++) {\n  let line = "";\n  for (let x = 0; x < W; x++) {\n    if (y === 0 || y === H - 1 || x === 0 || x === W - 1) {\n      line += "#";\n    } else {\n      line += ".";\n    }\n  }\n  console.log(line);\n}\n';
  const MAP3 = MAP0 + '\nfor (let y = 0; y < H; y++) {\n  let line = "";\n  for (let x = 0; x < W; x++) {\n    if (x === PX && y === PY) {\n      line += "@";\n    } else if (y === 0 || y === H - 1 || x === 0 || x === W - 1) {\n      line += "#";\n    } else {\n      line += ".";\n    }\n  }\n  console.log(line);\n}\n';
  const MS = [[[/W\s*=\s*8/, 'W = 6'], [/H\s*=\s*5/, 'H = 4']], [[/PX\s*=\s*3/, 'PX = 1'], [/PY\s*=\s*2/, 'PY = 1']]];
  extend('js', 'nested', [proj('dungeon', 'Unit project: Dungeon map', 45, [
    read('What you’ll build', `<p>Roguelike games draw their maps with characters. You’ll draw a room with walls and a player:</p>${pre('########\n#......#\n#..@...#\n#......#\n########')}<p>Use the constants <code>W</code>, <code>H</code>, <code>PX</code>, <code>PY</code> — the checker changes them to make sure your loops really work.</p>`),
    code({ task: '<b>Step 1.</b> Print <code>H</code> rows of <code>W</code> dots using nested loops.', starter: MAP0, solution: MAP1, check: outCheck(MAP1, [MS[0]], [[/for[\s\S]*for/, 'Use nested loops.']]) }),
    code({ task: '<b>Step 2.</b> Make the outside edge walls: use <code>#</code> on the first and last row and the first and last column.', keep: true, hints: ['A cell is on the edge when <code>y === 0 || y === H - 1 || x === 0 || x === W - 1</code>.'], solution: MAP2, check: outCheck(MAP2, [MS[0]]) }),
    code({ task: '<b>Step 3.</b> Draw the player <code>@</code> at column <code>PX</code>, row <code>PY</code>.', keep: true, hints: ['Check for the player first, before the wall check.'], solution: MAP3, check: outCheck(MAP3, [MS[0], MS[1]]) }),
  ], 'Nested loops + conditions = drawing any grid you like.')]);

  const DMG1 = 'function damage(attack, defense) {\n  return Math.max(1, attack - defense);\n}\n\nconsole.log(damage(12, 5));\nconsole.log(damage(3, 9));\n';
  const DMG2 = 'function damage(attack, defense) {\n  return Math.max(1, attack - defense);\n}\n\nfunction critical(amount, isCrit = false) {\n  return isCrit ? amount * 2 : amount;\n}\n\nconsole.log(critical(damage(12, 5)));\nconsole.log(critical(damage(12, 5), true));\n';
  const DMG3 = DMG2 + '\nfunction totalDamage(hits) {\n  let total = 0;\n  for (const h of hits) {\n    total += critical(damage(h.attack, h.defense), h.crit);\n  }\n  return total;\n}\n\nconsole.log(totalDamage([{ attack: 10, defense: 4, crit: false }, { attack: 8, defense: 2, crit: true }, { attack: 2, defense: 9 }]));\n';
  const fnTest = (name, cases) => (r) => { const f = grab(r.code, name); if (typeof f !== 'function') return `Define <code>function ${name}</code>.`; for (const [args, want] of cases) { let got; try { got = f(...args); } catch (err) { return `${name} threw: ${e(err.message)}`; } if (got !== want) return `${name}(${args.map((a) => JSON.stringify(a)).join(', ')}) should return ${want}, not ${got}.`; } return expectLines(r, run(r.code) || []); };
  extend('js', 'scope', [proj('calc', 'Unit project: Damage calculator', 45, [
    read('What you’ll build', '<p>Every RPG has a damage formula hidden inside. You’ll build one from small functions that call each other: base damage, critical hits, and a total over many hits.</p>'),
    code({ task: '<b>Step 1.</b> Write <code>damage(attack, defense)</code> returning attack − defense, but never less than 1. Print <code>damage(12, 5)</code> and <code>damage(3, 9)</code>.', starter: '', solution: DMG1, check: fnTest('damage', [[[12, 5], 7], [[3, 9], 1], [[20, 1], 19]]) }),
    code({ task: '<b>Step 2.</b> Add <code>critical(amount, isCrit = false)</code> that doubles the amount on a crit. Replace your prints with <code>critical(damage(12, 5))</code> and <code>critical(damage(12, 5), true)</code>.', keep: true, solution: DMG2, check: fnTest('critical', [[[7], 7], [[7, true], 14], [[1, false], 1]]) }),
    code({ task: '<b>Step 3.</b> Write <code>totalDamage(hits)</code>: each hit is <code>{ attack, defense, crit }</code>. Add up <code>critical(damage(…), crit)</code> for every hit and print the total for the hits in the solution’s example.', keep: true, hints: ['Loop with <code>for (const h of hits)</code>.'], solution: DMG3, check: (r) => { const f = grab(r.code, 'totalDamage'); if (typeof f !== 'function') return 'Define <code>function totalDamage(hits)</code>.'; if (!/totalDamage[\s\S]*critical\s*\(\s*damage\s*\(/.test(r.code)) return 'Use <code>critical(damage(…), …)</code> inside totalDamage.'; const v = f([{ attack: 5, defense: 1, crit: true }, { attack: 1, defense: 5 }]); return v === 9 || `totalDamage should give 9 for a 5/1 crit plus a 1/5 hit (got ${v}).`; } }),
  ], 'Small functions that call each other are easier to test and change.')]);

  const LB0 = 'const players = [\n  { name: "Ava", score: 1200 },\n  { name: "Leo", score: 860 },\n  { name: "Mia", score: 2140 },\n  { name: "Kai", score: 990 },\n  { name: "Zoe", score: 1530 },\n];\n';
  const LB1 = LB0 + '\nplayers.sort((a, b) => b.score - a.score);\nplayers.forEach((p, i) => {\n  console.log(`${i + 1}. ${p.name} - ${p.score}`);\n});\n';
  const LB2 = LB0 + '\nplayers.sort((a, b) => b.score - a.score);\nplayers.slice(0, 3).forEach((p, i) => {\n  console.log(`${i + 1}. ${p.name} - ${p.score}`);\n});\n';
  const LB3 = LB2 + 'const over = players.filter((p) => p.score >= 1000).length;\nconsole.log(`Players over 1000: ${over}`);\n';
  const LS = [[[/score:\s*860/, 'score: 9999']]];
  extend('js', 'callbacks', [proj('leaderboard', 'Unit project: Leaderboard', 50, [
    read('What you’ll build', '<p>An online leaderboard: sort the players, show the top three with their rank, and count how many beat 1000 points. This is exactly how a real high-score screen is built.</p>'),
    code({ task: '<b>Step 1.</b> Sort <code>players</code> by score, highest first, and print every player as <b>1. Mia - 2140</b>.', starter: LB0, hints: ['<code>players.sort((a, b) => b.score - a.score)</code>', '<code>forEach((p, i) => …)</code> gives you the index for the rank.'], solution: LB1, check: outCheck(LB1, LS, [[/\.sort\s*\(/, 'Use <code>.sort()</code>.']]) }),
    code({ task: '<b>Step 2.</b> Only show the <b>top 3</b> (use <code>slice</code>).', keep: true, solution: LB2, check: outCheck(LB2, LS, [[/\.slice\s*\(/, 'Use <code>.slice(0, 3)</code>.']]) }),
    code({ task: '<b>Step 3.</b> Add a last line <b>Players over 1000: N</b> using <code>filter</code>.', keep: true, solution: LB3, check: outCheck(LB3, LS, [[/\.filter\s*\(/, 'Use <code>.filter()</code>.']]) }),
  ], 'sort, slice, filter and forEach — the everyday tools for lists of data.')]);

  // the arena battle becomes the JavaScript capstone, with extra steps
  const arena = Q.courses.find((c) => c.id === 'js').lessons.find((l) => l.id === 'project');
  if (arena) {
    arena.kind = 'capstone'; arena.badge = 'cap-js'; arena.title = 'Capstone: Arena battle'; arena.xp = 150;
    const base = arena.steps[arena.steps.length - 1].solution;
    const MAGE = '\nclass Mage extends Fighter {\n  constructor(name, hp, attack, magic) {\n    super(name, hp, attack);\n    this.magic = magic;\n  }\n  hit(other) {\n    other.hp = Math.max(0, other.hp - this.attack - this.magic);\n  }\n}\n';
    const TOUR = '\nfunction tournament(list) {\n  let champ = list[0];\n  for (let i = 1; i < list.length; i++) {\n    const winner = battle(champ, list[i]);\n    champ = winner === champ.name ? champ : list[i];\n  }\n  return champ.name;\n}\n';
    arena.steps.push(
      code({ task: '<b>Step 4.</b> Add <code>class Mage extends Fighter</code>. Its constructor takes a 4th value, <code>magic</code>, and its <code>hit(other)</code> deals attack + magic damage (never below 0 hp).', keep: true, hints: ['Call <code>super(name, hp, attack)</code> first, then store <code>this.magic</code>.'], solution: base + MAGE,
        check: (r) => { const { Fighter: F, Mage: M } = grabAll(r.code, ['Fighter', 'Mage']); if (typeof M !== 'function') return 'Define <code>class Mage extends Fighter</code>.'; try { const m = new M('M', 10, 3, 2); if (!(m instanceof F)) return 'Mage must extend Fighter.'; const t = new F('T', 20, 1); m.hit(t); if (t.hp !== 15) return 'A Mage with attack 3 and magic 2 should take 5 hp.'; const w = new F('W', 2, 1); m.hit(w); return w.hp === 0 || 'hp should never go below 0.'; } catch (err) { return 'Mage threw an error: ' + e(err.message); } } }),
      code({ task: '<b>Step 5.</b> Write <code>tournament(list)</code>: the first fighter is champion; they battle each next fighter in turn, and whoever wins becomes champion. Return the final champion’s <b>name</b>.', keep: true, hints: ['<code>battle</code> returns the winner’s name — compare it with <code>champ.name</code>.'], solution: base + MAGE + TOUR,
        check: (r) => { const { Fighter: F, tournament: t, battle: b } = grabAll(r.code, ['Fighter', 'tournament', 'battle']); if (typeof t !== 'function') return 'Define <code>function tournament(list)</code>.'; try { const mk = () => [new F('A', 10, 2), new F('B', 30, 5), new F('C', 8, 1)]; const L = mk(); let ch = L[0]; for (let i = 1; i < L.length; i++) { const w = b(ch, L[i]); ch = w === ch.name ? ch : L[i]; } const got = t(mk()); return got === ch.name || `With A(10,2), B(30,5), C(8,1) the champion should be ${ch.name}, not ${got}.`; } catch (err) { return 'tournament threw: ' + e(err.message); } } }),
      creative('<p>Ideas: a healing potion that a fighter drinks once when below 10 hp; a <code>speed</code> stat that decides who attacks first; critical hits on every third attack; or a bracket tournament with 8 fighters.</p>', 100));
  }

  /* ============================== Python ============================== */
  const ends = (want) => (r) => { const ls = r.logs.map((l) => l.trim()).filter(Boolean); return want.every((w, i) => ls[ls.length - want.length + i]?.endsWith(w)) || `It should end with: ${want.map((w) => `“${e(w)}”`).join(', ')}.`; };
  const has = (re, msg) => (r) => re.test(r.code) || msg;
  const all = (...fs) => (r) => { for (const f of fs) { const v = f(r); if (v !== true) return v; } return true; };
  const PC1 = 'name = input("Name? ")\nrole = input("Class? ")\nprint(f"Welcome, {name} the {role}!")\n';
  const PC2 = 'name = input("Name? ")\nrole = input("Class? ")\nmsg = f"Welcome, {name} the {role}!"\nprint("=" * len(msg))\nprint(msg)\nprint("=" * len(msg))\n';
  const PC3 = PC2 + 'print(f"{role.upper()} · level 1 · {len(name) * 10} hp")\n';
  extend('py', 'input', [proj('creator', 'Unit project: Character creator', 40, [
    read('What you’ll build', `<p>The first screen of every RPG: pick a name and a class. The checker types <b>Ava</b> and <b>mage</b> for you.</p>${pre('======================\nWelcome, Ava the mage!\n======================\nMAGE · level 1 · 30 hp')}`),
    code({ stdin: ['Ava', 'mage'], task: '<b>Step 1.</b> Ask for a name and a class with <code>input()</code> and print <b>Welcome, Ava the mage!</b> (using what was typed).', starter: '', solution: PC1, check: all(has(/input\s*\(/, 'Use <code>input()</code>.'), ends(['Welcome, Ava the mage!'])) }),
    code({ stdin: ['Ava', 'mage'], keep: true, task: '<b>Step 2.</b> Put the message in a variable and print a line of <code>=</code> above and below it, exactly as long as the message.', hints: ['<code>"=" * len(msg)</code>'], solution: PC2, check: all(has(/len\s*\(\s*msg\s*\)/, 'Use <code>len(msg)</code> so it fits any name.'), ends(['======================', 'Welcome, Ava the mage!', '======================'])) }),
    code({ stdin: ['Ava', 'mage'], keep: true, task: '<b>Step 3.</b> Print a stats line: the class in capitals, “level 1”, and hp = name length × 10, like <b>MAGE · level 1 · 30 hp</b>.', solution: PC3, check: all(has(/\.upper\s*\(\s*\)/, 'Use <code>.upper()</code>.'), ends(['MAGE · level 1 · 30 hp'])) }),
  ], 'input, f-strings, string methods and len().')]);

  const PD1 = 'for i in range(1, 11):\n    roll = (i * 7) % 6 + 1\n    print(roll, end=" ")\nprint()\n';
  const PD2 = 'total = 0\nsixes = 0\nfor i in range(1, 11):\n    roll = (i * 7) % 6 + 1\n    print(roll, end=" ")\n    total += roll\n    if roll == 6:\n        sixes += 1\nprint()\nprint("Total:", total)\nprint("Sixes:", sixes)\n';
  const PD3 = PD2 + 'print("Average:", total / 10)\n';
  extend('py', 'patterns', [proj('dice', 'Unit project: Dice stats', 40, [
    read('What you’ll build', '<p>Games that use dice need to know if the dice are fair. You’ll “roll” 10 dice with a formula, then calculate the total, how many sixes came up, and the average.</p>'),
    code({ task: '<b>Step 1.</b> For i from 1 to 10, the roll is <code>(i * 7) % 6 + 1</code>. Print all 10 rolls on one line, separated by spaces.', starter: '', hints: ['<code>print(roll, end=" ")</code> keeps printing on the same line.', 'Finish with an empty <code>print()</code>.'], solution: PD1, check: (r) => expectLines(r, ['2 3 4 5 6 1 2 3 4 5']) }),
    code({ task: '<b>Step 2.</b> While looping, add up the rolls and count the sixes. After the loop print <b>Total: 35</b> and <b>Sixes: 1</b>.', keep: true, solution: PD2, check: all(has(/\+=/, 'Use accumulators with <code>+=</code>.'), (r) => expectLines(r, ['2 3 4 5 6 1 2 3 4 5', 'Total: 35', 'Sixes: 1'])) }),
    code({ task: '<b>Step 3.</b> Print the average: <b>Average: 3.5</b>.', keep: true, solution: PD3, check: (r) => expectLines(r, ['2 3 4 5 6 1 2 3 4 5', 'Total: 35', 'Sixes: 1', 'Average: 3.5']) }),
  ], 'Accumulators and counters inside a loop.')]);

  const PS1 = 'def with_tax(price, percent=20):\n    return price + price * percent // 100\n\nprint(with_tax(50))\nprint(with_tax(50, 10))\n';
  const PS2 = 'def with_tax(price, percent=20):\n    return price + price * percent // 100\n\ndef can_afford(coins, price):\n    return coins >= price\n\nprint(with_tax(50))\nprint(with_tax(50, 10))\nprint(can_afford(30, 60))\n';
  const PS3 = 'def with_tax(price, percent=20):\n    return price + price * percent // 100\n\ndef can_afford(coins, price):\n    return coins >= price\n\ndef buy(coins, price):\n    cost = with_tax(price)\n    if can_afford(coins, cost):\n        return coins - cost, True\n    return coins, False\n\nprint(with_tax(50))\nprint(with_tax(50, 10))\nprint(can_afford(30, 60))\nleft, ok = buy(100, 50)\nprint(left, ok)\nleft, ok = buy(40, 50)\nprint(left, ok)\n';
  extend('py', 'params', [proj('shop', 'Unit project: Shop functions', 45, [
    read('What you’ll build', '<p>A game shop built from three small functions: add tax to a price, check if you can afford it, and buy it (returning your coins left <i>and</i> whether it worked).</p>'),
    code({ task: '<b>Step 1.</b> Write <code>with_tax(price, percent=20)</code> returning <code>price + price * percent // 100</code>. Print <code>with_tax(50)</code> and <code>with_tax(50, 10)</code>.', starter: '', solution: PS1, check: all(has(/def\s+with_tax\s*\(\s*price\s*,\s*percent\s*=\s*20\s*\)/, 'Use <code>def with_tax(price, percent=20):</code>'), (r) => expectLines(r, ['60', '55'])) }),
    code({ task: '<b>Step 2.</b> Add <code>can_afford(coins, price)</code> returning True when coins ≥ price. Print <code>can_afford(30, 60)</code>.', keep: true, solution: PS2, check: all(has(/def\s+can_afford/, 'Define <code>can_afford</code>.'), (r) => expectLines(r, ['60', '55', 'False'])) }),
    code({ task: '<b>Step 3.</b> Add <code>buy(coins, price)</code>: it adds tax, and if you can afford it returns <code>coins - cost, True</code>; otherwise <code>coins, False</code>. Print the results of <code>buy(100, 50)</code> and <code>buy(40, 50)</code> as <b>40 True</b> and <b>40 False</b>.', keep: true, hints: ['Use both of your other functions inside buy.', 'Unpack with <code>left, ok = buy(100, 50)</code>.'], solution: PS3, check: all(has(/def\s+buy[\s\S]*with_tax\s*\([\s\S]*can_afford\s*\(/, 'Make buy use with_tax and can_afford.'), (r) => expectLines(r, ['60', '55', 'False', '40 True', '40 False'])) }),
  ], 'Default arguments, returning two values, and functions calling functions.')]);

  const PI1 = 'def add_item(inv, name, qty=1):\n    inv[name] = inv.get(name, 0) + qty\n\ninv = {}\nadd_item(inv, "potion", 2)\nadd_item(inv, "arrow", 10)\nadd_item(inv, "potion")\nprint(inv)\n';
  const PI2 = 'def add_item(inv, name, qty=1):\n    inv[name] = inv.get(name, 0) + qty\n\ndef remove_item(inv, name):\n    if inv.get(name, 0) == 0:\n        return False\n    inv[name] -= 1\n    if inv[name] == 0:\n        del inv[name]\n    return True\n\ninv = {}\nadd_item(inv, "potion", 2)\nadd_item(inv, "arrow", 10)\nadd_item(inv, "potion")\nprint(remove_item(inv, "bomb"))\nremove_item(inv, "potion")\nprint(inv)\n';
  const PI3 = PI2.replace('print(inv)\n', '') .replace('inv = {}', 'def report(inv):\n    for name in sorted(inv):\n        print(f"{name}: {inv[name]}")\n\ninv = {}') + 'report(inv)\n';
  extend('py', 'dictloop', [proj('inventory', 'Unit project: Inventory manager', 50, [
    read('What you’ll build', '<p>A real inventory system: add items (stacking duplicates), remove one at a time (deleting empty stacks), and print a neat sorted report.</p>'),
    code({ task: '<b>Step 1.</b> Write <code>add_item(inv, name, qty=1)</code> that adds qty to the item’s count (starting from 0 with <code>.get</code>). Run the example and print the dict.', starter: '', solution: PI1, check: all(has(/\.get\s*\(/, 'Use <code>inv.get(name, 0)</code>.'), (r) => expectLines(r, ["{'potion': 3, 'arrow': 10}"])) }),
    code({ task: '<b>Step 2.</b> Write <code>remove_item(inv, name)</code>: return False if there are none; otherwise take one away, delete the key when it hits 0, and return True.', keep: true, solution: PI2, check: all(has(/def\s+remove_item/, 'Define <code>remove_item</code>.'), (r) => expectLines(r, ['False', "{'potion': 2, 'arrow': 10}"])) }),
    code({ task: '<b>Step 3.</b> Write <code>report(inv)</code> that prints each item as <b>name: qty</b> in alphabetical order, and call it instead of printing the dict.', keep: true, hints: ['<code>for name in sorted(inv):</code>'], solution: PI3, check: all(has(/sorted\s*\(/, 'Use <code>sorted()</code>.'), (r) => expectLines(r, ['False', 'arrow: 10', 'potion: 2'])) }),
  ], 'Dictionaries with .get, del and sorted loops.')]);

  const ROOMS = 'rooms = {\n    "hall": {"north": "library", "east": "kitchen"},\n    "library": {"south": "hall"},\n    "kitchen": {"west": "hall", "north": "vault"},\n    "vault": {"south": "kitchen"},\n}\n';
  const A1 = ROOMS + '\ndef move(room, direction):\n    return rooms[room].get(direction, room)\n\nprint(move("hall", "north"))\nprint(move("hall", "west"))\n';
  const LOOPA = (cmds, locked, extra = '') => `${ROOMS}items = {"library": "key"}\ninventory = []\n\ndef move(room, direction):\n    return rooms[room].get(direction, room)\n\nroom = "hall"\n${cmds}\nfor cmd in commands:\n    if cmd == "take":\n        if room in items:\n            inventory.append(items.pop(room))\n            print("Took the " + inventory[-1])\n        else:\n            print("Nothing here")\n${extra}    else:\n${locked ? '        nxt = move(room, cmd)\n        if nxt == "vault" and "key" not in inventory:\n            print("The vault is locked.")\n        else:\n            room = nxt\n            print("You are in the " + room)\n            if room == "vault":\n                print("You found the treasure!")\n                break\n' : '        room = move(room, cmd)\n        print("You are in the " + room)\n'}`;
  const A2 = LOOPA('commands = ["north", "take", "south", "east"]', false);
  const A3 = LOOPA('commands = ["east", "north", "west", "north", "take", "south", "east", "north"]', true);
  const A4 = LOOPA('commands = input("> ").split()', true, '    elif cmd == "look":\n        print("Exits: " + ", ".join(sorted(rooms[room])))\n');
  const W3 = ['You are in the kitchen', 'The vault is locked.', 'You are in the hall', 'You are in the library', 'Took the key', 'You are in the hall', 'You are in the kitchen', 'You are in the vault', 'You found the treasure!'];
  extend('py', '$', [{ id: 'adventure', title: 'Capstone: Text adventure', xp: 200, kind: 'capstone', badge: 'cap-py', recap: 'Dictionaries for the world, a loop for the game, functions for actions — a complete game.', steps: [
    read('The final project', `<p>You’ll build a classic <b>text adventure</b>: rooms connected by exits, an item to pick up, a locked vault, and treasure. Every piece uses something from this course.</p>${pre('> look east north west north take south east north\nExits: east, north\nYou are in the kitchen\nThe vault is locked.\n…\nYou found the treasure!')}`),
    code({ task: '<b>Step 1.</b> The <code>rooms</code> dict maps each room to its exits. Write <code>move(room, direction)</code> that returns the room in that direction, or the same room if there’s no exit. Print <code>move("hall", "north")</code> and <code>move("hall", "west")</code>.', starter: ROOMS, hints: ['<code>rooms[room].get(direction, room)</code>'], solution: A1, check: all(has(/def\s+move/, 'Define <code>move</code>.'), (r) => expectLines(r, ['library', 'hall'])) }),
    code({ task: '<b>Step 2.</b> Add <code>items = {"library": "key"}</code> and an empty <code>inventory</code> list. Start in the hall and loop over <code>commands = ["north", "take", "south", "east"]</code>: <b>take</b> moves the room’s item into your inventory and prints <b>Took the key</b> (or <b>Nothing here</b>); any other command moves and prints <b>You are in the …</b>.', keep: true, hints: ['<code>items.pop(room)</code> removes and returns the item.'], solution: A2, check: (r) => expectLines(r, ['You are in the library', 'Took the key', 'You are in the hall', 'You are in the kitchen']) }),
    code({ task: '<b>Step 3.</b> Lock the vault: moving into it without the key prints <b>The vault is locked.</b> and you stay put. Entering it with the key prints <b>You are in the vault</b>, then <b>You found the treasure!</b>, and ends the loop. Use the longer command list from the solution’s example: east, north, west, north, take, south, east, north.', keep: true, hints: ['Work out the next room first, then decide whether you may enter.', '<code>break</code> ends the loop.'], solution: A3, check: all(has(/break/, 'End the game with <code>break</code>.'), (r) => expectLines(r, W3)) }),
    code({ stdin: ['look east north west north take south east north'], keep: true, task: '<b>Step 4.</b> Read the commands from the player: <code>commands = input("> ").split()</code>. Add a <b>look</b> command that prints <b>Exits: east, north</b> (the exits in alphabetical order). The checker types the commands for you.', hints: ['<code>", ".join(sorted(rooms[room]))</code>'], solution: A4, check: all(has(/input\s*\(/, 'Read the commands with <code>input()</code>.'), ends(['Exits: east, north', ...W3])) }),
    creative('<p>Ideas: more rooms on a bigger map, a monster that blocks a door until you fight it, a score for each item found, or a <code>help</code> command listing what you can type.</p>', 100),
  ] }]);
})();
