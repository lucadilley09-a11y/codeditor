/* Quill courses — language tours (read, predict & write; checked by code review since these don't run in a browser) */
(() => {
  const C = (Q.courses = Q.courses || []);
  const strip = (c) => c.replace(/\/\*[\s\S]*?\*\/|\/\/.*$|(^|\s)--(\s.*)?$|^\s*#(?!include).*$/gm, '$1');
  const need = (code, rules) => { const s = strip(code); for (const [re, msg] of rules) if (!re.test(s)) return msg; return true; };
  const note = '<div class="tip"><svg class="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg><div>This language can’t run inside a browser, so <b>Check</b> reviews your code’s structure instead of running it.</div></div>';

  const tour = (o) => C.push({ tour: true, run: 'none', ...o });

  tour({ id: 'tour-c', title: 'C Tour', badge: 'C', color: '#94a3b8', lang: 'c', ext: 'c', desc: 'Close to the metal', lessons: [
    { id: 'basics', title: 'Hello, C', xp: 20, steps: [
      { type: 'read', html: `<h4>The grandparent language</h4><p>C (1972) powers operating systems, game engines and microcontrollers. It’s <b>compiled</b> to machine code and very fast — but you manage details yourself.</p><pre>#include &lt;stdio.h&gt;\n\nint main(void) {\n    int lives = 3;\n    printf("Lives: %d\\n", lives);\n    return 0;\n}</pre><ul><li>Every statement ends with <code>;</code></li><li>Variables have fixed types: <code>int</code>, <code>float</code>, <code>char</code></li><li><code>printf</code> uses placeholders: <code>%d</code> int, <code>%f</code> float, <code>%s</code> string</li></ul>${note}` },
      { type: 'predict', code: 'int a = 7;\nint b = 2;\nprintf("%d", a / b);', options: ['3.5', '3', '4', '3.0'], answer: 1, explain: 'Dividing two ints throws away the decimal part.' },
      { type: 'code', task: 'Write a <code>main</code> function that declares <code>int score = 42;</code> and prints it with <code>printf</code> and <code>%d</code>.', starter: '#include <stdio.h>\n\n', hints: ['<code>int main(void) { … return 0; }</code>', '<code>printf("%d\\n", score);</code>'], solution: '#include <stdio.h>\n\nint main(void) {\n    int score = 42;\n    printf("Score: %d\\n", score);\n    return 0;\n}\n',
        check: (r) => need(r.code, [[/int\s+main\s*\(/, 'Add <code>int main(void) { … }</code>.'], [/int\s+score\s*=\s*42\s*;/, 'Declare <code>int score = 42;</code> (with the semicolon).'], [/printf\s*\(\s*"[^"]*%d[^"]*"\s*,\s*score\s*\)\s*;/, 'Print with <code>printf("…%d…", score);</code>'], [/return\s+0\s*;/, 'End main with <code>return 0;</code>']]) },
    ] },
    { id: 'flow', title: 'Loops & functions', xp: 20, steps: [
      { type: 'read', html: `<h4>Familiar shapes</h4><p>C’s <code>if</code>, <code>for</code> and <code>while</code> look just like JavaScript’s (JS borrowed them!). Functions declare their return type first:</p><pre>int square(int n) {\n    return n * n;\n}\n\nfor (int i = 0; i &lt; 5; i++) {\n    printf("%d\\n", square(i));\n}</pre>` },
      { type: 'quiz', q: 'What does <code>void</code> mean as a return type?', options: ['Returns 0', 'Returns nothing', 'Returns any type', 'The function is empty'], answer: 1 },
      { type: 'code', task: 'Write a function <code>int add(int a, int b)</code> that returns the sum.', starter: '', hints: ['<code>int add(int a, int b) { return a + b; }</code>'], solution: 'int add(int a, int b) {\n    return a + b;\n}\n',
        check: (r) => need(r.code, [[/int\s+add\s*\(\s*int\s+a\s*,\s*int\s+b\s*\)/, 'Use the signature <code>int add(int a, int b)</code>.'], [/return\s+(a\s*\+\s*b|b\s*\+\s*a)\s*;/, 'Return <code>a + b;</code>']]) },
    ] },
  ] });

  tour({ id: 'tour-cpp', title: 'C++ Tour', badge: 'C++', color: '#38bdf8', lang: 'cpp', ext: 'cpp', desc: 'Games & performance', lessons: [
    { id: 'basics', title: 'Hello, C++', xp: 20, steps: [
      { type: 'read', html: `<h4>C with superpowers</h4><p>C++ is the language of Unreal Engine and most AAA games. It adds classes, strings and a big standard library to C.</p><pre>#include &lt;iostream&gt;\n#include &lt;string&gt;\n\nint main() {\n    std::string name = "Ada";\n    std::cout &lt;&lt; "Hello, " &lt;&lt; name &lt;&lt; std::endl;\n}</pre><p><code>std::cout &lt;&lt;</code> sends things to the output, one after another.</p>${note}` },
      { type: 'predict', code: 'int x = 5;\nstd::cout << x << x + 1;', options: ['56', '5 6', '11', 'x x+1'], answer: 0, explain: 'No spaces are added automatically.' },
      { type: 'code', task: 'Print <b>Hello, C++!</b> using <code>std::cout</code> inside <code>main</code>.', starter: '#include <iostream>\n\n', hints: ['<code>int main() { std::cout << "Hello, C++!" << std::endl; }</code>'], solution: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, C++!" << std::endl;\n    return 0;\n}\n',
        check: (r) => need(r.code, [[/int\s+main\s*\(/, 'Add a <code>main</code> function.'], [/(std::)?cout\s*<<\s*"Hello, C\+\+!"/, 'Use <code>std::cout << "Hello, C++!"</code>.'], [/;\s*\n?[\s\S]*\}/, 'Don’t forget the semicolon.']]) },
    ] },
    { id: 'classes', title: 'Classes & vectors', xp: 25, steps: [
      { type: 'read', html: `<h4>Objects and lists</h4><pre>#include &lt;vector&gt;\n\nclass Player {\npublic:\n    int hp = 100;\n    void hit(int d) { hp -= d; }\n};\n\nstd::vector&lt;int&gt; scores = {10, 20};\nscores.push_back(30);</pre><p><code>std::vector</code> is a growable array — like a JS array, but every item has the same type.</p>` },
      { type: 'quiz', q: 'Which adds 5 to the end of <code>std::vector&lt;int&gt; v</code>?', mono: true, options: ['v.push(5);', 'v.append(5);', 'v.push_back(5);', 'v += 5;'], answer: 2 },
      { type: 'code', task: 'Write a class <code>Enemy</code> with a public <code>int hp = 50;</code> and a method <code>void damage(int amount)</code> that subtracts from hp.', starter: '', hints: ['<code>class Enemy { public: … };</code> — note the semicolon after the closing brace!'], solution: 'class Enemy {\npublic:\n    int hp = 50;\n    void damage(int amount) {\n        hp -= amount;\n    }\n};\n',
        check: (r) => need(r.code, [[/class\s+Enemy\s*\{/, 'Declare <code>class Enemy { … };</code>'], [/public\s*:/, 'Add <code>public:</code> so the members can be used outside.'], [/int\s+hp\s*=\s*50\s*;/, 'Add <code>int hp = 50;</code>'], [/void\s+damage\s*\(\s*int\s+\w+\s*\)/, 'Add <code>void damage(int amount)</code>.'], [/hp\s*-=|hp\s*=\s*hp\s*-/, 'Subtract the amount from hp.'], [/\}\s*;\s*$/, 'Classes end with <code>};</code> — don’t forget the semicolon.']]) },
    ] },
  ] });

  tour({ id: 'tour-java', title: 'Java Tour', badge: 'JAVA', color: '#ef4444', lang: 'java', ext: 'java', desc: 'Minecraft’s language', lessons: [
    { id: 'basics', title: 'Hello, Java', xp: 20, steps: [
      { type: 'read', html: `<h4>Everything lives in a class</h4><p>Java runs Minecraft, Android apps and huge business systems. Every program starts in a <code>main</code> method inside a class:</p><pre>public class Main {\n    public static void main(String[] args) {\n        String name = "Steve";\n        int blocks = 64;\n        System.out.println(name + " has " + blocks + " blocks");\n    }\n}</pre>${note}` },
      { type: 'quiz', q: 'Which prints a line in Java?', mono: true, options: ['print("hi");', 'console.log("hi");', 'System.out.println("hi");', 'echo "hi";'], answer: 2 },
      { type: 'code', task: 'Inside <code>main</code>, declare <code>int diamonds = 3;</code> and print <code>"Diamonds: " + diamonds</code>.', starter: 'public class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n', hints: ['<code>System.out.println("Diamonds: " + diamonds);</code>'], solution: 'public class Main {\n    public static void main(String[] args) {\n        int diamonds = 3;\n        System.out.println("Diamonds: " + diamonds);\n    }\n}\n',
        check: (r) => need(r.code, [[/int\s+diamonds\s*=\s*3\s*;/, 'Declare <code>int diamonds = 3;</code>'], [/System\.out\.println\s*\(\s*"Diamonds: "\s*\+\s*diamonds\s*\)\s*;/, 'Print with <code>System.out.println("Diamonds: " + diamonds);</code>']]) },
    ] },
    { id: 'methods', title: 'Methods & loops', xp: 20, steps: [
      { type: 'read', html: `<h4>Methods</h4><pre>static int triple(int n) {\n    return n * 3;\n}\n\nfor (int i = 1; i &lt;= 3; i++) {\n    System.out.println(triple(i));\n}</pre><p>Java needs the type of every parameter and the return value.</p>` },
      { type: 'predict', code: 'int total = 0;\nfor (int i = 0; i < 4; i++) {\n    total += i;\n}\nSystem.out.println(total);', options: ['4', '6', '10', '3'], answer: 1, explain: '0 + 1 + 2 + 3 = 6' },
      { type: 'code', task: 'Write <code>static boolean isAdult(int age)</code> that returns true when age is 18 or more.', starter: '', hints: ['<code>return age >= 18;</code>'], solution: 'static boolean isAdult(int age) {\n    return age >= 18;\n}\n',
        check: (r) => need(r.code, [[/static\s+boolean\s+isAdult\s*\(\s*int\s+age\s*\)/, 'Use the signature <code>static boolean isAdult(int age)</code>.'], [/return\s+age\s*>=\s*18\s*;|return\s+18\s*<=\s*age\s*;/, 'Return <code>age >= 18;</code>']]) },
    ] },
  ] });

  tour({ id: 'tour-cs', title: 'C# Tour', badge: 'C#', color: '#a78bfa', lang: 'csharp', ext: 'cs', desc: 'Unity games', lessons: [
    { id: 'basics', title: 'Hello, C#', xp: 20, steps: [
      { type: 'read', html: `<h4>The Unity language</h4><p>C# is used for Unity games, Windows apps and web servers. It looks like Java with nicer features, like string interpolation:</p><pre>using System;\n\nclass Program {\n    static void Main() {\n        var hp = 100;\n        Console.WriteLine($"HP: {hp}");\n    }\n}</pre><p><code>var</code> lets the compiler infer the type. <code>$"…{x}…"</code> works like JS template literals.</p>${note}` },
      { type: 'quiz', q: 'In Unity, a script that controls a game object usually inherits from…', options: ['GameObject', 'MonoBehaviour', 'Program', 'Unity'], answer: 1, explain: '<code>public class Player : MonoBehaviour</code> — then Unity calls <code>Start()</code> and <code>Update()</code> for you.' },
      { type: 'code', task: 'Print <b>Score: 10</b> using <code>Console.WriteLine</code> and string interpolation with a variable <code>score</code>.', starter: 'using System;\n\nclass Program {\n    static void Main() {\n        \n    }\n}\n', hints: ['<code>int score = 10;</code>', '<code>Console.WriteLine($"Score: {score}");</code>'], solution: 'using System;\n\nclass Program {\n    static void Main() {\n        int score = 10;\n        Console.WriteLine($"Score: {score}");\n    }\n}\n',
        check: (r) => need(r.code, [[/(int|var)\s+score\s*=\s*10\s*;/, 'Declare <code>score</code> = 10.'], [/Console\.WriteLine\s*\(\s*\$"Score: \{score\}"\s*\)\s*;/, 'Use <code>Console.WriteLine($"Score: {score}");</code>']]) },
    ] },
    { id: 'unity', title: 'A Unity script', xp: 25, steps: [
      { type: 'read', html: `<h4>Update runs every frame</h4><pre>using UnityEngine;\n\npublic class Mover : MonoBehaviour {\n    public float speed = 5f;\n\n    void Update() {\n        float x = Input.GetAxis("Horizontal");\n        transform.Translate(x * speed * Time.deltaTime, 0, 0);\n    }\n}</pre><p><code>Time.deltaTime</code> keeps movement smooth no matter the frame rate — the same idea as the <code>dt</code> in Quill’s canvas game template.</p>` },
      { type: 'quiz', q: 'Why multiply by <code>Time.deltaTime</code>?', options: ['To slow the game down', 'So speed is per second, not per frame', 'It’s required syntax', 'To use less memory'], answer: 1 },
      { type: 'code', task: 'Write a <code>Spinner : MonoBehaviour</code> class with <code>public float speed = 90f;</code> and an <code>Update()</code> that calls <code>transform.Rotate(0, 0, speed * Time.deltaTime);</code>', starter: 'using UnityEngine;\n\n', hints: ['<code>public class Spinner : MonoBehaviour { … }</code>'], solution: 'using UnityEngine;\n\npublic class Spinner : MonoBehaviour {\n    public float speed = 90f;\n\n    void Update() {\n        transform.Rotate(0, 0, speed * Time.deltaTime);\n    }\n}\n',
        check: (r) => need(r.code, [[/class\s+Spinner\s*:\s*MonoBehaviour/, 'Declare <code>public class Spinner : MonoBehaviour</code>.'], [/public\s+float\s+speed\s*=\s*90f?\s*;/, 'Add <code>public float speed = 90f;</code>'], [/void\s+Update\s*\(\s*\)/, 'Add <code>void Update()</code>.'], [/transform\.Rotate\s*\([^)]*speed\s*\*\s*Time\.deltaTime/, 'Rotate by <code>speed * Time.deltaTime</code>.']]) },
    ] },
  ] });

  tour({ id: 'tour-rust', title: 'Rust Tour', badge: 'RS', color: '#fb923c', lang: 'rust', ext: 'rs', desc: 'Fast & safe', lessons: [
    { id: 'basics', title: 'Hello, Rust', xp: 25, steps: [
      { type: 'read', html: `<h4>Safety without slowness</h4><p>Rust is as fast as C++ but the compiler prevents whole categories of bugs. Variables are <b>immutable by default</b>:</p><pre>fn main() {\n    let name = "Ferris";\n    let mut count = 0;   // mut = can change\n    count += 1;\n    println!("{} counted to {}", name, count);\n}</pre><p><code>println!</code> has a <code>!</code> because it’s a <b>macro</b>. <code>{}</code> placeholders get filled in order.</p>${note}` },
      { type: 'quiz', q: 'What happens with <code>let x = 5; x = 6;</code>?', options: ['x becomes 6', 'Compile error — x isn’t mut', 'Runtime crash', 'x stays 5 silently'], answer: 1 },
      { type: 'code', task: 'In <code>main</code>, make a mutable <code>level</code> starting at 1, add 1 to it, and print it with <code>println!</code>.', starter: 'fn main() {\n    \n}\n', hints: ['<code>let mut level = 1;</code>', '<code>println!("Level {}", level);</code>'], solution: 'fn main() {\n    let mut level = 1;\n    level += 1;\n    println!("Level {}", level);\n}\n',
        check: (r) => need(r.code, [[/let\s+mut\s+level\s*=\s*1\s*;/, 'Declare <code>let mut level = 1;</code>'], [/level\s*\+=\s*1|level\s*=\s*level\s*\+\s*1/, 'Add 1 to level.'], [/println!\s*\(\s*"[^"]*\{\}[^"]*"\s*,\s*level\s*\)/, 'Print it: <code>println!("Level {}", level);</code>']]) },
    ] },
    { id: 'match', title: 'Functions & match', xp: 25, steps: [
      { type: 'read', html: `<h4>Expressions everywhere</h4><pre>fn grade(score: u32) -&gt; &amp;'static str {\n    match score {\n        90..=100 =&gt; "A",\n        70..=89  =&gt; "B",\n        _        =&gt; "C",\n    }\n}</pre><p>The last expression (no semicolon) is the return value. <code>match</code> must cover every case — <code>_</code> means “anything else”.</p>` },
      { type: 'predict', code: 'fn double(n: i32) -> i32 {\n    n * 2\n}\nprintln!("{}", double(21));', options: ['21', '42', 'Error: missing return', '()'], answer: 1, explain: 'No semicolon → n * 2 is returned.' },
      { type: 'code', task: 'Write <code>fn square(n: i32) -&gt; i32</code> that returns n times n.', starter: '', hints: ['<code>fn square(n: i32) -> i32 { n * n }</code>'], solution: 'fn square(n: i32) -> i32 {\n    n * n\n}\n',
        check: (r) => need(r.code, [[/fn\s+square\s*\(\s*n\s*:\s*i32\s*\)\s*->\s*i32/, 'Use the signature <code>fn square(n: i32) -> i32</code>.'], [/n\s*\*\s*n/, 'Multiply n by itself.']]) },
    ] },
  ] });

  tour({ id: 'tour-go', title: 'Go Tour', badge: 'GO', color: '#22d3ee', lang: 'go', ext: 'go', desc: 'Simple servers', lessons: [
    { id: 'basics', title: 'Hello, Go', xp: 20, steps: [
      { type: 'read', html: `<h4>Simple on purpose</h4><p>Go was made at Google to be easy to read. It’s great for servers and command-line tools.</p><pre>package main\n\nimport "fmt"\n\nfunc main() {\n    name := "Gopher"   // := declares + infers type\n    fmt.Println("Hi,", name)\n}</pre>${note}` },
      { type: 'quiz', q: 'Go’s only loop keyword is…', options: ['while', 'for', 'loop', 'repeat'], answer: 1, explain: '<code>for</code> does everything: <code>for i := 0; i < 3; i++</code>, <code>for cond { }</code>, <code>for { }</code>.' },
      { type: 'code', task: 'In <code>main</code>, declare <code>lives := 3</code> and print it with <code>fmt.Println</code>.', starter: 'package main\n\nimport "fmt"\n\n', hints: ['<code>func main() { … }</code>'], solution: 'package main\n\nimport "fmt"\n\nfunc main() {\n    lives := 3\n    fmt.Println("Lives:", lives)\n}\n',
        check: (r) => need(r.code, [[/func\s+main\s*\(\s*\)/, 'Add <code>func main()</code>.'], [/lives\s*:=\s*3/, 'Declare <code>lives := 3</code>.'], [/fmt\.Println\s*\([^)]*lives/, 'Print lives with <code>fmt.Println</code>.']]) },
    ] },
    { id: 'funcs', title: 'Functions', xp: 20, steps: [
      { type: 'read', html: `<h4>Types come after names</h4><pre>func add(a int, b int) int {\n    return a + b\n}\n\n// functions can return two values!\nfunc divide(a, b float64) (float64, error) { … }</pre>` },
      { type: 'code', task: 'Write <code>func max(a int, b int) int</code> that returns the bigger number.', starter: '', hints: ['<code>if a > b { return a }</code> then <code>return b</code>'], solution: 'func max(a int, b int) int {\n    if a > b {\n        return a\n    }\n    return b\n}\n',
        check: (r) => need(r.code, [[/func\s+max\s*\(\s*a\s+int\s*,\s*b\s+int\s*\)\s*int|func\s+max\s*\(\s*a\s*,\s*b\s+int\s*\)\s*int/, 'Use <code>func max(a int, b int) int</code>.'], [/if\s+a\s*>\s*b|if\s+b\s*>\s*a|if\s+a\s*>=\s*b|if\s+b\s*<\s*a/, 'Compare a and b with <code>if</code>.'], [/return\s+a[\s\S]*return\s+b|return\s+b[\s\S]*return\s+a/, 'Return the bigger one in each case.']]) },
    ] },
  ] });

  tour({ id: 'tour-lua', title: 'Lua Tour', badge: 'LUA', color: '#6366f1', lang: 'lua', ext: 'lua', desc: 'Roblox & modding', lessons: [
    { id: 'basics', title: 'Hello, Lua', xp: 20, steps: [
      { type: 'read', html: `<h4>Tiny and everywhere</h4><p>Lua powers Roblox (as Luau), World of Warcraft add-ons and Love2D games. Blocks end with <code>end</code>:</p><pre>local coins = 10\nif coins &gt;= 10 then\n  print("Rich!")\nend\n\nfor i = 1, 3 do\n  print("Lap " .. i)   -- .. joins strings\nend</pre><p><b>Tables</b> start counting at 1, not 0!</p>${note}` },
      { type: 'predict', code: 'local t = {"a", "b", "c"}\nprint(t[1])', options: ['a', 'b', 'nil', 'Error'], answer: 0, explain: 'Lua tables start at index 1.' },
      { type: 'code', task: 'Write a <code>local function greet(name)</code> that prints <code>"Hello, " .. name</code>, then call it.', starter: '', hints: ['<code>local function greet(name)</code> … <code>end</code>', 'Call it: <code>greet("Roblox")</code>'], solution: 'local function greet(name)\n  print("Hello, " .. name)\nend\n\ngreet("Roblox")\n',
        check: (r) => need(r.code, [[/local\s+function\s+greet\s*\(\s*name\s*\)/, 'Define <code>local function greet(name)</code>.'], [/print\s*\(\s*"Hello, "\s*\.\.\s*name\s*\)/, 'Print <code>"Hello, " .. name</code>.'], [/\bend\b/, 'Close the function with <code>end</code>.'], [/greet\s*\(\s*["'][^"']*["']\s*\)\s*$/m, 'Call your function, e.g. <code>greet("Ada")</code>.']]) },
    ] },
    { id: 'tables', title: 'Tables & loops', xp: 20, steps: [
      { type: 'read', html: `<h4>One structure to rule them all</h4><pre>local player = { name = "Ada", hp = 100 }\nplayer.hp = player.hp - 10\n\nfor key, value in pairs(player) do\n  print(key, value)\nend</pre><p><code>pairs</code> loops over every key; <code>ipairs</code> over list items in order.</p>` },
      { type: 'code', task: 'Make a table <code>enemy</code> with <code>name = "Slime"</code> and <code>hp = 20</code>, then subtract 5 from its hp.', starter: '', hints: ['<code>local enemy = { name = "Slime", hp = 20 }</code>', '<code>enemy.hp = enemy.hp - 5</code>'], solution: 'local enemy = { name = "Slime", hp = 20 }\nenemy.hp = enemy.hp - 5\n',
        check: (r) => need(r.code, [[/local\s+enemy\s*=\s*\{/, 'Create <code>local enemy = { … }</code>.'], [/name\s*=\s*"Slime"/, 'Set <code>name = "Slime"</code>.'], [/hp\s*=\s*20/, 'Set <code>hp = 20</code>.'], [/enemy\.hp\s*=\s*enemy\.hp\s*-\s*5/, 'Subtract: <code>enemy.hp = enemy.hp - 5</code> (Lua has no -=).']]) },
    ] },
  ] });

  tour({ id: 'tour-sql', title: 'SQL Tour', badge: 'SQL', color: '#f59e0b', lang: 'sql', ext: 'sql', desc: 'Talk to databases', lessons: [
    { id: 'select', title: 'Asking questions', xp: 20, steps: [
      { type: 'read', html: `<h4>Querying data</h4><p>SQL asks a database questions. Imagine a <code>players</code> table with columns <code>name</code>, <code>score</code>, <code>team</code>.</p><pre>SELECT name, score\nFROM players\nWHERE score &gt; 100\nORDER BY score DESC;</pre><ul><li><code>SELECT</code> which columns (<code>*</code> = all)</li><li><code>WHERE</code> filters rows</li><li><code>ORDER BY … DESC</code> sorts biggest first</li></ul>${note}` },
      { type: 'quiz', q: 'Which query gets every column for players on team “red”?', mono: true, options: ["SELECT players WHERE team = 'red';", "SELECT * FROM players WHERE team = 'red';", "GET * FROM players IF team = 'red';", "SELECT * WHERE team = 'red' FROM players;"], answer: 1 },
      { type: 'code', task: 'Select the <code>name</code> of players with a <code>score</code> of at least 50, sorted by score from highest to lowest.', starter: '', hints: ['<code>SELECT name FROM players WHERE score >= 50</code>', 'Add <code>ORDER BY score DESC;</code>'], solution: 'SELECT name\nFROM players\nWHERE score >= 50\nORDER BY score DESC;\n',
        check: (r) => need(r.code, [[/select\s+name\s+from\s+players/i, 'Start with <code>SELECT name FROM players</code>.'], [/where\s+score\s*>=\s*50/i, 'Filter with <code>WHERE score >= 50</code>.'], [/order\s+by\s+score\s+desc/i, 'Sort with <code>ORDER BY score DESC</code>.']]) },
    ] },
    { id: 'modify', title: 'Changing data', xp: 20, steps: [
      { type: 'read', html: `<h4>INSERT, UPDATE, DELETE</h4><pre>INSERT INTO players (name, score) VALUES ('Ada', 90);\nUPDATE players SET score = 95 WHERE name = 'Ada';\nDELETE FROM players WHERE score &lt; 10;</pre><p>⚠️ Always include <code>WHERE</code> on UPDATE and DELETE — without it, <b>every row</b> changes!</p>` },
      { type: 'quiz', q: 'What does <code>DELETE FROM players;</code> do?', options: ['Nothing — it needs WHERE', 'Deletes the first row', 'Deletes every row', 'Deletes the table structure'], answer: 2 },
      { type: 'code', task: "Add a player named <b>Linus</b> with score <b>70</b> to the <code>players</code> table.", starter: '', hints: ["<code>INSERT INTO players (name, score) VALUES ('Linus', 70);</code>"], solution: "INSERT INTO players (name, score) VALUES ('Linus', 70);\n",
        check: (r) => need(r.code, [[/insert\s+into\s+players/i, 'Use <code>INSERT INTO players</code>.'], [/\(\s*name\s*,\s*score\s*\)/i, 'List the columns: <code>(name, score)</code>.'], [/values\s*\(\s*'Linus'\s*,\s*70\s*\)/i, "Values: <code>('Linus', 70)</code> — text in single quotes."]]) },
    ] },
  ] });
})();
