/* Quill courses — Python */
(() => {
  const C = (Q.courses = Q.courses || []);
  const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tip = (t) => `<div class="tip"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/></svg><div>${t}</div></div>`;
  const L = (r) => r.logs.map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim());
  const firstDiff = (got, want) => { for (let i = 0; i < want.length; i++) if ((got[i] ?? '').trim() !== want[i]) return `Line ${i + 1} should be “${e(want[i])}” but was “${e(got[i] ?? 'nothing')}”.`; return got.length === want.length || `Print exactly ${want.length} line${want.length > 1 ? 's' : ''}.`; };

  C.push({
    id: 'py', title: 'Python for Beginners', badge: 'PY', color: '#60a5fa', lang: 'python', ext: 'py', run: 'py',
    desc: 'Friendly & powerful', lessons: [
      { id: 'print', title: 'Hello, Python', xp: 15, recap: '<code>print()</code> shows output. Strings go in quotes.', steps: [
        { type: 'read', html: `<h4>Your first Python</h4><p>Python reads almost like English. <code>print()</code> displays things:</p><pre data-try>print("Hello!")\nprint(7 * 6)\nprint("Score:", 100)</pre><p>Separate several things with commas — Python adds spaces between them.</p>${tip('Python runs right in your browser. The first run downloads the engine, so it takes a few seconds.')}` },
        { type: 'predict', code: 'print("Hi", "there")\nprint(3 + 4)', options: ['Hi there / 7', 'Hithere / 7', 'Hi, there / 3 + 4', '"Hi" "there" / 7'], answer: 0 },
        { type: 'code', task: 'Print exactly <b>I am learning Python!</b>', starter: '# write your code below\n', hints: ['<code>print("…")</code>'], solution: 'print("I am learning Python!")\n',
          check: (r) => L(r).some((l) => l.trim() === 'I am learning Python!') || (L(r).length ? `You printed “${e(L(r)[0])}”.` : 'Nothing was printed yet.') },
      ] },
      { id: 'vars', title: 'Variables & types', xp: 20, recap: 'No keyword needed: <code>name = value</code>. Types: int, float, str, bool.', steps: [
        { type: 'read', html: `<h4>Storing values</h4><pre data-try>name = "Ada"\nage = 36          # int\nheight = 1.68     # float\nis_coder = True   # bool (capital T!)\nprint(name, age, type(age))</pre><p>Use <code>snake_case</code> for names in Python. Change a variable just by assigning again.</p>` },
        { type: 'predict', code: 'x = 5\nx = x * 2\nx = x + 1\nprint(x)', options: ['5', '10', '11', '6'], answer: 2 },
        { type: 'quiz', q: 'Which is a valid Python boolean?', mono: true, options: ['true', 'TRUE', 'True', '"True"'], answer: 2, explain: 'Python booleans are capitalized: <code>True</code> and <code>False</code>.' },
        { type: 'code', task: 'Make variables <code>city</code> (a string) and <code>temp</code> (a number). Print them like: <b>Paris is 21 degrees</b> (any city/number).', starter: '', hints: ['<code>print(city, "is", temp, "degrees")</code>'], solution: 'city = "Paris"\ntemp = 21\nprint(city, "is", temp, "degrees")\n',
          check: (r) => (!/^\s*city\s*=/m.test(r.code) || !/^\s*temp\s*=/m.test(r.code) ? 'Create both <code>city</code> and <code>temp</code> variables.' : L(r).some((l) => / is -?\d+(\.\d+)? degrees$/.test(l.trim())) || 'Print like “Paris is 21 degrees”.') },
      ] },
      { id: 'strings', title: 'Strings & f-strings', xp: 20, recap: '<code>f"{var}"</code> puts values in text. <code>.upper()</code>, <code>len()</code>, slicing.', steps: [
        { type: 'read', html: `<h4>Text tricks</h4><pre data-try>name = "python"\nprint(name.upper())        # PYTHON\nprint(len(name))           # 6\nprint(name[0], name[-1])   # p n\nprint(f"I love {name}!")   # f-string</pre><p>An <b>f-string</b> starts with <code>f</code> and lets you put any expression in <code>{}</code>.</p>` },
        { type: 'predict', code: 'word = "hello"\nprint(word[1:4])', options: ['hel', 'ell', 'ello', 'h'], answer: 1, explain: 'Slicing [1:4] takes positions 1, 2, 3 (not 4).' },
        { type: 'code', task: 'Use an f-string to print <b>Mia has 7 coins</b> from the variables.', starter: 'player = "Mia"\ncoins = 7\n\n', hints: ['<code>print(f"{player} has {coins} coins")</code>'], solution: 'player = "Mia"\ncoins = 7\n\nprint(f"{player} has {coins} coins")\n',
          check: (r) => (!/f["']/.test(r.code) ? 'Use an f-string: <code>f"…"</code>' : L(r).some((l) => l.trim() === 'Mia has 7 coins') || 'Output should be “Mia has 7 coins”.') },
      ] },
      { id: 'input', title: 'Asking for input', xp: 20, recap: '<code>input()</code> always returns a string — convert with <code>int()</code>.', steps: [
        { type: 'read', html: `<h4>Talking to the user</h4><pre>name = input("What's your name? ")\nage = int(input("Age? "))\nprint(f"Hi {name}, next year you'll be {age + 1}")</pre><p><code>input()</code> always gives back <b>text</b>. Use <code>int()</code> or <code>float()</code> to do math with it.</p>${tip('In Quill, type answers in the console’s <b>Input</b> box before running, separated by <code>;</code> — e.g. <code>Ada; 12</code>. For this lesson the checker types “Sam” and “9” for you.')}` },
        { type: 'quiz', q: 'Someone types 5. What does <code>input() + input()</code> give if they type 5 both times?', mono: true, options: ['10', '"55"', '55 (as a number)', 'Error'], answer: 1, explain: 'Both are strings, so + joins them: "5" + "5" = "55".' },
        { type: 'code', stdin: ['Sam', '9'], task: 'Ask for a name and an age. Print <b>Hi Sam, in 10 years you will be 19</b> (using whatever they typed).', starter: 'name = input("Name? ")\nage = input("Age? ")\n\n', hints: ['Convert: <code>age = int(age)</code>', '<code>print(f"Hi {name}, in 10 years you will be {age + 10}")</code>'], solution: 'name = input("Name? ")\nage = int(input("Age? "))\n\nprint(f"Hi {name}, in 10 years you will be {age + 10}")\n',
          check: (r) => L(r).some((l) => l.includes('Hi Sam, in 10 years you will be 19')) || 'With inputs “Sam” and “9”, expected “Hi Sam, in 10 years you will be 19”. Did you convert age with int()?' },
      ] },
      { id: 'if', title: 'if, elif, else', xp: 25, recap: 'Colon at the end, indent the block. <code>and</code> / <code>or</code> / <code>not</code>.', steps: [
        { type: 'read', html: `<h4>Decisions & indentation</h4><pre data-try>temp = 30\nif temp > 25:\n    print("Hot")\nelif temp > 15:\n    print("Nice")\nelse:\n    print("Cold")</pre><p>The <b>colon</b> starts a block; the <b>indented</b> lines belong to it. Python is strict about this — 4 spaces is the standard.</p>` },
        { type: 'predict', code: 'n = 0\nif n:\n    print("yes")\nelse:\n    print("no")', options: ['yes', 'no', 'Error', 'Nothing'], answer: 1, explain: '0 counts as False in Python. Empty strings and empty lists too!' },
        { type: 'code', task: 'Print <b>even</b> or <b>odd</b> for the number <code>n</code>.', starter: 'n = 17\n\n', hints: ['<code>n % 2 == 0</code> is True for even numbers.', 'Don’t forget the colons and indentation.'], solution: 'n = 17\n\nif n % 2 == 0:\n    print("even")\nelse:\n    print("odd")\n',
          check: (r) => (L(r).join() !== 'odd' ? `For n = 17 I expected “odd”, got “${e(L(r).join(' '))}”.` : /n\s*=\s*17/.test(r.code) && /%\s*2/.test(r.code) || 'Use the <code>%</code> operator so it works for any n.') },
      ] },
      { id: 'loops', title: 'Loops', xp: 25, recap: '<code>for x in range(n)</code> and <code>while condition:</code>', steps: [
        { type: 'read', html: `<h4>for & while</h4><pre data-try>for i in range(3):\n    print("Lap", i)\n\nfor letter in "hey":\n    print(letter)\n\ncount = 3\nwhile count > 0:\n    print(count)\n    count -= 1\nprint("Liftoff!")</pre><p><code>range(1, 6)</code> = 1, 2, 3, 4, 5 (stops before 6). <code>range(0, 10, 2)</code> counts by 2.</p>` },
        { type: 'predict', code: 'total = 0\nfor n in range(1, 4):\n    total += n\nprint(total)', options: ['3', '6', '10', '4'], answer: 1, explain: '1 + 2 + 3 = 6' },
        { type: 'code', task: 'Print a times table for 7: <b>7 x 1 = 7</b> up to <b>7 x 10 = 70</b>.', starter: '', hints: ['<code>for i in range(1, 11):</code>', '<code>print(f"7 x {i} = {7 * i}")</code>'], solution: 'for i in range(1, 11):\n    print(f"7 x {i} = {7 * i}")\n',
          check: (r) => firstDiff(L(r), Array.from({ length: 10 }, (_, k) => `7 x ${k + 1} = ${7 * (k + 1)}`)) },
      ] },
      { id: 'functions', title: 'Functions', xp: 30, recap: '<code>def name(params):</code> … <code>return value</code>', steps: [
        { type: 'read', html: `<h4>def</h4><pre data-try>def greet(name, greeting="Hello"):\n    return f"{greeting}, {name}!"\n\nprint(greet("Ada"))\nprint(greet("Linus", "Hey"))</pre><p>Parameters can have <b>default values</b>. <code>return</code> hands the result back.</p>` },
        { type: 'quiz', q: 'What’s the difference between print and return inside a function?', options: ['No difference', 'print shows text; return gives a value back to the caller', 'return shows text; print gives a value back', 'return ends the program'], answer: 1 },
        { type: 'code', task: 'Write <code>celsius_to_f(c)</code> that returns <code>c * 9 / 5 + 32</code>. Then print <code>celsius_to_f(100)</code>.', starter: 'def celsius_to_f(c):\n    pass\n\nprint(celsius_to_f(100))\n', hints: ['Replace <code>pass</code> with a <code>return</code> line.'], solution: 'def celsius_to_f(c):\n    return c * 9 / 5 + 32\n\nprint(celsius_to_f(100))\n',
          check: (r) => (!/return/.test(r.code) ? 'Use <code>return</code>.' : L(r).some((l) => l.trim() === '212.0' || l.trim() === '212') || 'celsius_to_f(100) should be 212.') },
        { type: 'code', task: 'Write <code>count_vowels(text)</code> returning how many a, e, i, o, u are in the text. Print <code>count_vowels("programming is fun")</code>.', starter: 'def count_vowels(text):\n    count = 0\n    \n    return count\n\nprint(count_vowels("programming is fun"))\n', hints: ['Loop: <code>for ch in text:</code>', '<code>if ch in "aeiou": count += 1</code>'], solution: 'def count_vowels(text):\n    count = 0\n    for ch in text:\n        if ch in "aeiou":\n            count += 1\n    return count\n\nprint(count_vowels("programming is fun"))\n',
          check: (r) => L(r).some((l) => l.trim() === '5') || 'There are 5 vowels in “programming is fun”.' },
      ] },
      { id: 'lists', title: 'Lists', xp: 25, recap: '<code>[]</code>, <code>.append()</code>, <code>len()</code>, slicing, comprehensions.', steps: [
        { type: 'read', html: `<h4>Collections</h4><pre data-try>scores = [88, 92, 75]\nscores.append(100)\nprint(scores[0], scores[-1])  # first, last\nprint(len(scores), max(scores), sum(scores))\nscores.sort()\nprint(scores)\nsquares = [n * n for n in range(5)]  # comprehension\nprint(squares)</pre>` },
        { type: 'predict', code: 'a = [3, 1, 2]\na.append(0)\na.sort()\nprint(a[1])', options: ['0', '1', '2', '3'], answer: 1, explain: 'Sorted: [0, 1, 2, 3] → a[1] is 1.' },
        { type: 'code', task: 'Given <code>words</code>, build a new list with only words longer than 4 letters, in UPPERCASE, and print it.', starter: 'words = ["sun", "planet", "moon", "galaxy", "star", "comet"]\n\n', hints: ['A comprehension with a condition: <code>[w.upper() for w in words if len(w) > 4]</code>'], solution: 'words = ["sun", "planet", "moon", "galaxy", "star", "comet"]\n\nlong_words = [w.upper() for w in words if len(w) > 4]\nprint(long_words)\n',
          check: (r) => L(r).some((l) => l.trim() === "['PLANET', 'GALAXY', 'COMET']") || "Expected ['PLANET', 'GALAXY', 'COMET']." },
      ] },
      { id: 'dicts', title: 'Dictionaries', xp: 30, recap: '<code>{"key": value}</code>, <code>d[key]</code>, <code>.get()</code>, <code>.items()</code>.', steps: [
        { type: 'read', html: `<h4>Look things up by name</h4><pre data-try>stock = {"apples": 5, "pears": 2}\nstock["kiwis"] = 9\nstock["apples"] -= 1\nprint(stock["apples"])\nprint(stock.get("plums", 0))\nfor fruit, n in stock.items():\n    print(fruit, n)</pre>` },
        { type: 'code', task: 'Count how many times each letter appears in <code>word</code> using a dictionary, then print the dictionary.', starter: 'word = "banana"\ncounts = {}\n\n', hints: ['Loop over the letters.', '<code>counts[ch] = counts.get(ch, 0) + 1</code>'], solution: 'word = "banana"\ncounts = {}\n\nfor ch in word:\n    counts[ch] = counts.get(ch, 0) + 1\nprint(counts)\n',
          check: (r) => L(r).some((l) => l.trim() === "{'b': 1, 'a': 3, 'n': 2}") || "Expected {'b': 1, 'a': 3, 'n': 2}." },
      ] },
      { id: 'classes', title: 'Classes & objects', xp: 35, recap: '<code>class</code>, <code>__init__</code>, <code>self</code>, methods.', steps: [
        { type: 'read', html: `<h4>Making your own types</h4><pre data-try>class Pet:\n    def __init__(self, name, sound):\n        self.name = name\n        self.sound = sound\n\n    def speak(self):\n        return f"{self.name} says {self.sound}"\n\ndog = Pet("Rex", "woof")\nprint(dog.speak())</pre><p><code>__init__</code> runs when you create an object. <code>self</code> is the object itself.</p>` },
        { type: 'code', task: 'Create a class <code>BankAccount</code> with a <code>balance</code> starting at 0, plus <code>deposit(amount)</code> and <code>withdraw(amount)</code>. <code>withdraw</code> should refuse (print <b>Insufficient funds</b>) if there isn’t enough money.', starter: 'class BankAccount:\n    pass\n\nacct = BankAccount()\nacct.deposit(50)\nacct.withdraw(20)\nprint(acct.balance)\nacct.withdraw(100)\nprint(acct.balance)\n', hints: ['<code>def __init__(self): self.balance = 0</code>', 'In withdraw: <code>if amount > self.balance: print("Insufficient funds")</code> else subtract.'], solution: 'class BankAccount:\n    def __init__(self):\n        self.balance = 0\n\n    def deposit(self, amount):\n        self.balance += amount\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            print("Insufficient funds")\n        else:\n            self.balance -= amount\n\nacct = BankAccount()\nacct.deposit(50)\nacct.withdraw(20)\nprint(acct.balance)\nacct.withdraw(100)\nprint(acct.balance)\n',
          check: (r) => firstDiff(L(r), ['30', 'Insufficient funds', '30']), success: 'You’ve completed Python for Beginners — that’s a real foundation! 🐍' },
      ] },
    ],
  });
})();
