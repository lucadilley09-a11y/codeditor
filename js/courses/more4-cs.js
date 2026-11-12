/* Codeditor — round 5: more C# teaching lessons (half plain C#, half Unity). Reviewed, not executed. */
(() => {
  const { tip, pre, read, quiz, predict, code, review: R, extend } = Q.kit;
  const { rule } = Q.gen;
  const has = (re, msg) => [re, msg];

  /* ---------------- plain C# ---------------- */
  extend('cs', 'logic', [
    { id: 'whileloops', title: 'while & do-while loops', xp: 30, recap: '<code>while</code> checks first; <code>do { } while (…);</code> always runs once. Make sure something changes so the loop can end.', steps: [
      read('Repeat until something changes', `<p>A <code>while</code> loop repeats as long as its condition is true:</p>${pre('int hp = 10;\nwhile (hp > 0) {\n    hp -= 3;\n    Console.WriteLine(hp);\n}')}<p>This prints 7, 4, 1, -2. Each turn changes <code>hp</code> — without that, the loop would never stop.</p>`),
      predict('int n = 1;\nwhile (n < 20) {\n    n = n * 2;\n}\nConsole.WriteLine(n);', ['16', '20', '32', '64'], 2, '1 → 2 → 4 → 8 → 16 → 32. At 32 the condition is false, so the loop stops.'),
      code({ task: 'Use a <code>while</code> loop to count <code>lives</code> down from 3 to 1, printing each number with <code>Console.WriteLine</code>, then lowering it by 1.', starter: 'int lives = 3;\n', hints: ['<code>while (lives > 0) { … }</code>', 'Inside: <code>Console.WriteLine(lives); lives--;</code>'],
        solution: 'int lives = 3;\nwhile (lives > 0)\n{\n    Console.WriteLine(lives);\n    lives--;\n}\n',
        check: R([has(/while\s*\(\s*lives\s*>\s*0\s*\)|while\s*\(\s*lives\s*>=\s*1\s*\)/, 'Loop <code>while (lives > 0)</code>.'), has(/Console\.WriteLine\s*\(\s*lives\s*\)/, 'Print <code>lives</code> inside the loop.'), has(/lives\s*(--|-=\s*1|=\s*lives\s*-\s*1)/, 'Lower <code>lives</code> by 1 each time.')]) }),
      read('do-while: at least once', `${pre('string answer;\ndo {\n    Console.Write("Play again? ");\n    answer = Console.ReadLine();\n} while (answer != "yes" && answer != "no");')}<p>The body runs <b>first</b>, then the condition is checked — perfect for menus that must show at least once.</p>`),
      code({ task: 'Write a <code>do</code>/<code>while</code> loop that adds 5 to <code>power</code> and keeps going while <code>power &lt; 30</code>.', starter: 'int power = 0;\n', hints: ['<code>do { power += 5; } while (power < 30);</code>'],
        solution: 'int power = 0;\ndo\n{\n    power += 5;\n} while (power < 30);\n',
        check: R([has(/\bdo\s*\{/, 'Start with <code>do {</code>.'), has(/power\s*\+=\s*5/, 'Add 5 with <code>power += 5;</code>'), rule('} while (power < 30);', 'End with <code>} while (power &lt; 30);</code>')]) }),
    ] },
    { id: 'switch', title: 'switch statements & expressions', xp: 30, recap: '<code>switch</code> picks one case; every case ends with <code>break</code>. A switch <i>expression</i> (<code>x switch { … }</code>) returns a value.', steps: [
      read('Choosing between many options', `${pre('switch (weapon) {\n    case "sword":\n        damage = 10;\n        break;\n    case "bow":\n        damage = 6;\n        break;\n    default:\n        damage = 1;\n        break;\n}')}<p>Each <code>case</code> needs a <code>break</code>. <code>default</code> catches everything else.</p>`),
      quiz('What runs when <code>weapon</code> is <code>"axe"</code> in the example?', ['Nothing', 'The sword case', 'The default case', 'An error'], 2),
      code({ task: 'Write a <code>switch</code> on <code>level</code>: case <b>1</b> sets <code>enemies = 3</code>, case <b>2</b> sets <code>enemies = 5</code>, and <code>default</code> sets <code>enemies = 8</code>. Don’t forget <code>break;</code>.', starter: 'int level = 2;\nint enemies = 0;\n', hints: ['<code>switch (level) { case 1: enemies = 3; break; … }</code>'],
        solution: 'int level = 2;\nint enemies = 0;\nswitch (level)\n{\n    case 1:\n        enemies = 3;\n        break;\n    case 2:\n        enemies = 5;\n        break;\n    default:\n        enemies = 8;\n        break;\n}\n',
        check: R([rule('switch (level)'), has(/case\s+1\s*:\s*enemies\s*=\s*3\s*;\s*break\s*;/, 'Case 1: <code>enemies = 3; break;</code>'), has(/case\s+2\s*:\s*enemies\s*=\s*5\s*;\s*break\s*;/, 'Case 2: <code>enemies = 5; break;</code>'), has(/default\s*:\s*enemies\s*=\s*8\s*;/, 'Default: <code>enemies = 8;</code>')]) }),
      read('Switch expressions', `<p>Newer C# can switch straight to a value:</p>${pre('string rank = score switch {\n    >= 1000 => "Gold",\n    >= 500  => "Silver",\n    _       => "Bronze"\n};')}<p><code>_</code> means “anything else”.</p>`),
      code({ task: 'Make <code>string label</code> using a switch expression on <code>hp</code>: <b>0</b> → <code>"Dead"</code>, <b>&lt; 30</b> → <code>"Low"</code>, anything else → <code>"OK"</code>.', starter: 'int hp = 25;\n', hints: ['<code>string label = hp switch { 0 => "Dead", < 30 => "Low", _ => "OK" };</code>'],
        solution: 'int hp = 25;\nstring label = hp switch\n{\n    0 => "Dead",\n    < 30 => "Low",\n    _ => "OK"\n};\n',
        check: R([rule('string label = hp switch'), rule('0 => "Dead"'), rule('< 30 => "Low"'), rule('_ => "OK"'), has(/\}\s*;/, 'Close with <code>};</code>')]) }),
    ] },
  ]);
  extend('cs', 'arrays', [
    { id: 'enums', title: 'Enums: named states', xp: 30, recap: '<code>enum State { Idle, Run, Jump }</code> gives readable names instead of magic numbers or strings.', steps: [
      read('No more magic strings', `<p>Typos in strings like <code>"jumpign"</code> cause silent bugs. An <b>enum</b> lists every allowed value:</p>${pre('enum State { Idle, Running, Jumping }\n\nState state = State.Idle;\nif (state == State.Jumping) { /* … */ }')}<p>The compiler catches typos, and the editor autocompletes them.</p>`),
      quiz('Why use an enum instead of strings for game states?', ['Enums are faster to type', 'Typos become compile errors and the options are listed in one place', 'Strings can’t be compared', 'Enums save the game'], 1),
      code({ task: 'Declare <code>enum Weather { Sunny, Rainy, Stormy }</code> and a variable <code>Weather today = Weather.Rainy;</code>', starter: '', hints: ['Enum values are separated by commas.'],
        solution: 'enum Weather { Sunny, Rainy, Stormy }\n\nWeather today = Weather.Rainy;\n',
        check: R([has(/enum\s+Weather\s*\{\s*Sunny\s*,\s*Rainy\s*,\s*Stormy\s*,?\s*\}/, 'Declare <code>enum Weather { Sunny, Rainy, Stormy }</code>.'), rule('Weather today = Weather.Rainy;')]) }),
      code({ task: 'Add an <code>if</code>: when <code>today == Weather.Stormy</code>, print <b>"Stay inside"</b>.', keep: true, hints: ['<code>if (today == Weather.Stormy) { Console.WriteLine("Stay inside"); }</code>'],
        solution: 'enum Weather { Sunny, Rainy, Stormy }\n\nWeather today = Weather.Rainy;\nif (today == Weather.Stormy)\n{\n    Console.WriteLine("Stay inside");\n}\n',
        check: R([rule('if (today == Weather.Stormy)'), rule('Console.WriteLine("Stay inside");')]) }),
    ] },
    { id: 'dicts', title: 'Dictionaries', xp: 35, recap: '<code>Dictionary&lt;string, int&gt;</code> maps keys to values. Use <code>ContainsKey</code> or <code>TryGetValue</code> before reading.', steps: [
      read('Look things up by name', `${pre('using System.Collections.Generic;\n\nvar prices = new Dictionary<string, int>();\nprices["potion"] = 25;\nprices["sword"] = 120;\nConsole.WriteLine(prices["sword"]);   // 120')}<p>Reading a missing key crashes, so check first:</p>${pre('if (prices.ContainsKey("bow")) { … }')}`),
      predict('var stock = new Dictionary<string, int>();\nstock["arrow"] = 10;\nstock["arrow"] += 5;\nConsole.WriteLine(stock["arrow"]);', ['10', '5', '15', 'Error'], 2),
      code({ task: 'Create <code>Dictionary&lt;string, int&gt; hp</code> and set <b>"goblin"</b> to 12 and <b>"troll"</b> to 40.', starter: 'using System.Collections.Generic;\n\n', hints: ['<code>var hp = new Dictionary<string, int>();</code> then <code>hp["goblin"] = 12;</code>'],
        solution: 'using System.Collections.Generic;\n\nvar hp = new Dictionary<string, int>();\nhp["goblin"] = 12;\nhp["troll"] = 40;\n',
        check: R([has(/(var|Dictionary\s*<\s*string\s*,\s*int\s*>)\s+hp\s*=\s*new\s+Dictionary\s*<\s*string\s*,\s*int\s*>\s*\(\s*\)/, 'Create <code>var hp = new Dictionary&lt;string, int&gt;();</code>'), has(/hp\s*\[\s*"goblin"\s*\]\s*=\s*12|\{\s*"goblin"\s*,\s*12\s*\}/, 'Set "goblin" to 12.'), has(/hp\s*\[\s*"troll"\s*\]\s*=\s*40|\{\s*"troll"\s*,\s*40\s*\}/, 'Set "troll" to 40.')]) }),
      code({ task: 'Loop over <code>hp</code> with <code>foreach (var pair in hp)</code> and print each <code>pair.Key</code> and <code>pair.Value</code>.', keep: true, hints: ['<code>Console.WriteLine($"{pair.Key}: {pair.Value}");</code>'],
        solution: 'using System.Collections.Generic;\n\nvar hp = new Dictionary<string, int>();\nhp["goblin"] = 12;\nhp["troll"] = 40;\nforeach (var pair in hp)\n{\n    Console.WriteLine($"{pair.Key}: {pair.Value}");\n}\n',
        check: R([has(/foreach\s*\(\s*(var|KeyValuePair\s*<\s*string\s*,\s*int\s*>)\s+pair\s+in\s+hp\s*\)/, 'Use <code>foreach (var pair in hp)</code>.'), has(/pair\.Key/, 'Print <code>pair.Key</code>.'), has(/pair\.Value/, 'Print <code>pair.Value</code>.')]) }),
    ] },
  ]);
  extend('cs', 'methods', [
    { id: 'random', title: 'Random numbers & Math', xp: 30, recap: '<code>new Random().Next(a, b)</code> gives a ≥ a and &lt; b. <code>Math.Max</code>, <code>Math.Min</code> and <code>Math.Clamp</code> keep numbers in range.', steps: [
      read('Dice, loot and crits', `${pre('Random rng = new Random();\nint roll = rng.Next(1, 7);   // 1 to 6 — the top number is NOT included\ndouble chance = rng.NextDouble(); // 0.0 to 1.0')}<p>Keep values in range with <code>Math</code>:</p>${pre('hp = Math.Max(hp - damage, 0);        // never below 0\nhp = Math.Clamp(hp + heal, 0, maxHp);  // between 0 and max')}`),
      quiz('Which gives a number from 1 to 10 (including 10)?', ['rng.Next(1, 10)', 'rng.Next(1, 11)', 'rng.Next(0, 10)', 'rng.Next(10)'], 1, 'The second number is excluded, so use 11.'),
      code({ task: 'Make <code>Random rng = new Random();</code> and <code>int damage = rng.Next(5, 11);</code> (5 to 10).', starter: '', hints: ['Remember the upper number is excluded.'],
        solution: 'Random rng = new Random();\nint damage = rng.Next(5, 11);\n',
        check: R([has(/(Random|var)\s+rng\s*=\s*new\s+Random\s*\(\s*\)\s*;/, 'Create <code>Random rng = new Random();</code>'), rule('int damage = rng.Next(5, 11);')]) }),
      code({ task: 'Lower <code>hp</code> by <code>damage</code>, but never below 0, using <code>Math.Max</code>.', starter: 'Random rng = new Random();\nint damage = rng.Next(5, 11);\nint hp = 20;\n', hints: ['<code>hp = Math.Max(hp - damage, 0);</code>'],
        solution: 'Random rng = new Random();\nint damage = rng.Next(5, 11);\nint hp = 20;\nhp = Math.Max(hp - damage, 0);\n',
        check: R([has(/hp\s*=\s*Math\.Max\s*\(\s*hp\s*-\s*damage\s*,\s*0\s*\)|hp\s*=\s*Math\.Max\s*\(\s*0\s*,\s*hp\s*-\s*damage\s*\)/, 'Use <code>hp = Math.Max(hp - damage, 0);</code>')]) }),
    ] },
  ]);
  extend('cs', 'props', [
    { id: 'statics', title: 'static & const', xp: 30, recap: '<code>static</code> members belong to the class (one shared copy). <code>const</code> values never change.', steps: [
      read('Shared by everyone', `${pre('public class Enemy {\n    public static int Count = 0;   // one number for ALL enemies\n    public const int MaxHp = 50;   // never changes\n\n    public Enemy() { Count++; }\n}\n\nnew Enemy(); new Enemy();\nConsole.WriteLine(Enemy.Count);  // 2')}<p>You use static members through the <b>class name</b>: <code>Enemy.Count</code>.</p>`),
      predict('public class Coin {\n    public static int Total = 0;\n    public Coin() { Total += 10; }\n}\n\nnew Coin(); new Coin(); new Coin();\nConsole.WriteLine(Coin.Total);', ['10', '0', '30', '3'], 2),
      code({ task: 'Write <code>public class Game</code> with <code>public const int MaxLevel = 10;</code> and <code>public static int Level = 1;</code>', starter: '', hints: ['Both go inside the class braces.'],
        solution: 'public class Game\n{\n    public const int MaxLevel = 10;\n    public static int Level = 1;\n}\n',
        check: R([rule('public class Game'), rule('public const int MaxLevel = 10;'), rule('public static int Level = 1;')]) }),
      code({ task: 'Add <code>public static void NextLevel()</code> that adds 1 to <code>Level</code> only if <code>Level &lt; MaxLevel</code>.', keep: true, hints: ['<code>if (Level < MaxLevel) { Level++; }</code>'],
        solution: 'public class Game\n{\n    public const int MaxLevel = 10;\n    public static int Level = 1;\n\n    public static void NextLevel()\n    {\n        if (Level < MaxLevel)\n        {\n            Level++;\n        }\n    }\n}\n',
        check: R([rule('public static void NextLevel()'), rule('if (Level < MaxLevel)'), has(/Level\s*(\+\+|\+=\s*1)/, 'Add 1 to <code>Level</code>.')]) }),
    ] },
  ]);
  extend('cs', 'inherit', [
    { id: 'interfaces', title: 'Interfaces', xp: 40, recap: 'An interface is a promise: <code>class Crate : IDamageable</code> must have every method the interface lists.', steps: [
      read('Different things, same ability', `<p>A crate, a barrel and an enemy can all take damage, but they aren’t related. An <b>interface</b> describes the ability:</p>${pre('public interface IDamageable {\n    void TakeDamage(int amount);\n}\n\npublic class Crate : IDamageable {\n    public int hp = 5;\n    public void TakeDamage(int amount) { hp -= amount; }\n}')}<p>Now your bullet can hit <i>anything</i> <code>IDamageable</code>.</p>`),
      quiz('A class says <code>: IDamageable</code> but has no <code>TakeDamage</code> method. What happens?', ['It works anyway', 'Compile error', 'TakeDamage does nothing', 'The interface is ignored'], 1),
      code({ task: 'Write <code>public interface IHealable</code> with one method: <code>void Heal(int amount);</code>', starter: '', hints: ['Interface methods have no body — just a semicolon.'],
        solution: 'public interface IHealable\n{\n    void Heal(int amount);\n}\n',
        check: R([rule('public interface IHealable'), rule('void Heal(int amount);')]) }),
      code({ task: 'Write <code>public class Player : IHealable</code> with <code>public int hp = 50;</code> and a <code>public void Heal(int amount)</code> that adds <code>amount</code> to <code>hp</code>.', keep: true, hints: ['<code>public void Heal(int amount) { hp += amount; }</code>'],
        solution: 'public interface IHealable\n{\n    void Heal(int amount);\n}\n\npublic class Player : IHealable\n{\n    public int hp = 50;\n    public void Heal(int amount)\n    {\n        hp += amount;\n    }\n}\n',
        check: R([rule('public class Player : IHealable'), rule('public int hp = 50;'), rule('public void Heal(int amount)'), has(/hp\s*\+=\s*amount|hp\s*=\s*hp\s*\+\s*amount/, 'Add <code>amount</code> to <code>hp</code>.')]) }),
    ] },
    { id: 'exceptions', title: 'Errors: try/catch & TryParse', xp: 35, recap: 'Wrap risky code in <code>try { } catch (Exception e) { }</code>. For number input, <code>int.TryParse</code> avoids crashes entirely.', steps: [
      read('When things go wrong', `${pre('try {\n    int n = int.Parse("abc");   // crashes: not a number\n} catch (FormatException e) {\n    Console.WriteLine("That’s not a number!");\n}')}<p>Better for player input — no exception at all:</p>${pre('if (int.TryParse(text, out int value)) {\n    // value is the number\n} else {\n    // text wasn’t a number\n}')}`),
      quiz('What does <code>int.TryParse("12", out int n)</code> return?', ['12', 'true', '"12"', 'false'], 1, 'It returns true/false for success, and puts the number into n.'),
      code({ task: 'Use <code>int.TryParse(input, out int bet)</code> in an <code>if</code>. If it works, print <code>bet</code>; otherwise print <b>"Invalid bet"</b>.', starter: 'string input = "50";\n', hints: ['<code>if (int.TryParse(input, out int bet)) { … } else { … }</code>'],
        solution: 'string input = "50";\nif (int.TryParse(input, out int bet))\n{\n    Console.WriteLine(bet);\n}\nelse\n{\n    Console.WriteLine("Invalid bet");\n}\n',
        check: R([rule('if (int.TryParse(input, out int bet))'), rule('Console.WriteLine(bet);'), has(/else[\s\S]*Console\.WriteLine\s*\(\s*"Invalid bet"\s*\)/, 'Print <b>"Invalid bet"</b> in the <code>else</code>.')]) }),
      code({ task: 'Wrap <code>int score = int.Parse(text);</code> in <code>try</code>, and <code>catch (FormatException)</code> printing <b>"Bad score"</b>.', starter: 'string text = "ten";\n', hints: ['<code>try { … } catch (FormatException) { … }</code>'],
        solution: 'string text = "ten";\ntry\n{\n    int score = int.Parse(text);\n}\ncatch (FormatException)\n{\n    Console.WriteLine("Bad score");\n}\n',
        check: R([has(/try\s*\{\s*int\s+score\s*=\s*int\.Parse\s*\(\s*text\s*\)\s*;/, 'Put <code>int score = int.Parse(text);</code> inside <code>try { }</code>.'), has(/catch\s*\(\s*FormatException(\s+\w+)?\s*\)/, 'Add <code>catch (FormatException)</code>.'), rule('Console.WriteLine("Bad score");')]) }),
    ] },
    { id: 'linq', title: 'LINQ: query your lists', xp: 40, recap: '<code>using System.Linq;</code> then <code>list.Where(x => …)</code>, <code>.Select(…)</code>, <code>.OrderBy(…)</code>, <code>.Sum()</code>, <code>.Max()</code>.', steps: [
      read('One line instead of a loop', `${pre('using System.Linq;\n\nint[] scores = { 40, 95, 70, 12 };\nvar high = scores.Where(s => s >= 50);      // 95, 70\nint best = scores.Max();                    // 95\nint total = scores.Sum();                   // 217\nvar sorted = scores.OrderBy(s => s);        // 12, 40, 70, 95')}<p><code>s => s >= 50</code> is a tiny function: “given s, keep it if s ≥ 50”.</p>`),
      predict('int[] hp = { 10, 0, 25, 0 };\nConsole.WriteLine(hp.Where(h => h > 0).Count());', ['4', '2', '35', '0'], 1),
      code({ task: 'Add <code>using System.Linq;</code> and make <code>int best = scores.Max();</code>', starter: 'int[] scores = { 40, 95, 70 };\n', hints: ['The using line goes at the top.'],
        solution: 'using System.Linq;\n\nint[] scores = { 40, 95, 70 };\nint best = scores.Max();\n',
        check: R([rule('using System.Linq;'), rule('int best = scores.Max();')]) }),
      code({ task: 'Make <code>var alive</code> = only the enemies with <code>hp &gt; 0</code>, using <code>Where</code>.', starter: 'using System.Linq;\n\nint[] hp = { 10, 0, 25 };\n', hints: ['<code>var alive = hp.Where(h => h > 0);</code>'],
        solution: 'using System.Linq;\n\nint[] hp = { 10, 0, 25 };\nvar alive = hp.Where(h => h > 0);\n',
        check: R([has(/var\s+alive\s*=\s*hp\.Where\s*\(\s*(\w+)\s*=>\s*\1\s*>\s*0\s*\)/, 'Use <code>var alive = hp.Where(h => h > 0);</code>')]) }),
    ] },
  ]);

  /* ---------------- Unity ---------------- */
  const mono = (name) => has(new RegExp(`class\\s+${name}\\s*:\\s*MonoBehaviour`), `Declare <code>public class ${name} : MonoBehaviour</code>.`);
  extend('cs', 'unity', [
    { id: 'vectors', title: 'Unity: Vector3 & transform', xp: 35, recap: '<code>transform.position</code> is a <code>Vector3</code>. Move with <code>transform.Translate(dir * speed * Time.deltaTime)</code>.', steps: [
      read('Where things are', `<p>Every GameObject has a <b>transform</b>: position, rotation and scale. Positions are <code>Vector3</code> (x, y, z):</p>${pre('transform.position = new Vector3(0, 2, 0);\ntransform.position += Vector3.right;   // move 1 unit right')}<p>To move smoothly, multiply by <code>Time.deltaTime</code> (seconds since last frame) so speed is the same on fast and slow computers.</p>`),
      quiz('Why multiply movement by <code>Time.deltaTime</code>?', ['To make it slower', 'So movement is per second, not per frame', 'Unity requires it', 'To add gravity'], 1),
      code({ task: 'In <code>Mover : MonoBehaviour</code>, add <code>public float speed = 3f;</code> and in <code>Update()</code> move right with <code>transform.Translate(Vector3.right * speed * Time.deltaTime);</code>', starter: 'using UnityEngine;\n\n', hints: ['<code>void Update() { … }</code> goes inside the class.'],
        solution: 'using UnityEngine;\n\npublic class Mover : MonoBehaviour\n{\n    public float speed = 3f;\n\n    void Update()\n    {\n        transform.Translate(Vector3.right * speed * Time.deltaTime);\n    }\n}\n',
        check: R([mono('Mover'), has(/public\s+float\s+speed\s*=\s*3f?\s*;/, 'Add <code>public float speed = 3f;</code>'), rule('void Update()'), rule('transform.Translate(Vector3.right * speed * Time.deltaTime);')]) }),
      code({ task: 'Use the arrow keys: read <code>float x = Input.GetAxis("Horizontal");</code> in Update and translate by <code>new Vector3(x, 0, 0) * speed * Time.deltaTime</code> instead.', keep: true, hints: ['Replace the old Translate line.'],
        solution: 'using UnityEngine;\n\npublic class Mover : MonoBehaviour\n{\n    public float speed = 3f;\n\n    void Update()\n    {\n        float x = Input.GetAxis("Horizontal");\n        transform.Translate(new Vector3(x, 0, 0) * speed * Time.deltaTime);\n    }\n}\n',
        check: R([rule('float x = Input.GetAxis("Horizontal");'), rule('transform.Translate(new Vector3(x, 0, 0) * speed * Time.deltaTime);')]) }),
    ] },
  ]);
  extend('cs', 'physics', [
    { id: 'raycast', title: 'Unity: Raycasts', xp: 40, recap: '<code>Physics2D.Raycast(origin, direction, distance)</code> returns a hit — check <code>hit.collider != null</code>.', steps: [
      read('Shooting invisible lines', `<p>A <b>raycast</b> shoots an invisible line and tells you what it hits — for ground checks, line of sight, laser guns:</p>${pre('RaycastHit2D hit = Physics2D.Raycast(transform.position, Vector2.down, 1.1f);\nif (hit.collider != null) {\n    // something is right below us\n}')}`),
      quiz('A raycast for “am I on the ground?” should point…', ['Vector2.up', 'Vector2.down', 'Vector2.right', 'Vector2.zero'], 1),
      code({ task: 'In <code>GroundCheck : MonoBehaviour</code>, write <code>bool IsGrounded()</code> that raycasts from <code>transform.position</code> down <b>1.1f</b> and returns <code>hit.collider != null</code>.', starter: 'using UnityEngine;\n\n', hints: ['<code>RaycastHit2D hit = Physics2D.Raycast(transform.position, Vector2.down, 1.1f);</code>'],
        solution: 'using UnityEngine;\n\npublic class GroundCheck : MonoBehaviour\n{\n    bool IsGrounded()\n    {\n        RaycastHit2D hit = Physics2D.Raycast(transform.position, Vector2.down, 1.1f);\n        return hit.collider != null;\n    }\n}\n',
        check: R([mono('GroundCheck'), rule('bool IsGrounded()'), rule('RaycastHit2D hit = Physics2D.Raycast(transform.position, Vector2.down, 1.1f);'), rule('return hit.collider != null;')]) }),
    ] },
  ]);
  extend('cs', 'collide', [
    { id: 'prefabs', title: 'Unity: Prefabs, Instantiate & Destroy', xp: 40, recap: '<code>Instantiate(prefab, position, Quaternion.identity)</code> spawns a copy; <code>Destroy(gameObject, seconds)</code> removes it.', steps: [
      read('Spawning things', `<p>A <b>prefab</b> is a saved GameObject you can copy at runtime — bullets, coins, enemies:</p>${pre('public GameObject bulletPrefab;\n\nvoid Fire() {\n    Instantiate(bulletPrefab, transform.position, Quaternion.identity);\n}')}<p>Clean up objects you don’t need: <code>Destroy(gameObject, 3f);</code> removes this object after 3 seconds.</p>`),
      quiz('What does <code>Quaternion.identity</code> mean when spawning?', ['Random rotation', 'No rotation', 'Face the player', 'Flip upside down'], 1),
      code({ task: 'In <code>Shooter : MonoBehaviour</code>, add <code>public GameObject bulletPrefab;</code>. In <code>Update()</code>, when <b>Space</b> is pressed (<code>Input.GetKeyDown(KeyCode.Space)</code>), spawn it at <code>transform.position</code> with no rotation.', starter: 'using UnityEngine;\n\n', hints: ['<code>Instantiate(bulletPrefab, transform.position, Quaternion.identity);</code>'],
        solution: 'using UnityEngine;\n\npublic class Shooter : MonoBehaviour\n{\n    public GameObject bulletPrefab;\n\n    void Update()\n    {\n        if (Input.GetKeyDown(KeyCode.Space))\n        {\n            Instantiate(bulletPrefab, transform.position, Quaternion.identity);\n        }\n    }\n}\n',
        check: R([mono('Shooter'), rule('public GameObject bulletPrefab;'), rule('if (Input.GetKeyDown(KeyCode.Space))'), rule('Instantiate(bulletPrefab, transform.position, Quaternion.identity);')]) }),
      code({ task: 'Write <code>Bullet : MonoBehaviour</code> whose <code>Start()</code> calls <code>Destroy(gameObject, 2f);</code> so bullets disappear after 2 seconds.', starter: 'using UnityEngine;\n\n', hints: ['<code>void Start() { Destroy(gameObject, 2f); }</code>'],
        solution: 'using UnityEngine;\n\npublic class Bullet : MonoBehaviour\n{\n    void Start()\n    {\n        Destroy(gameObject, 2f);\n    }\n}\n',
        check: R([mono('Bullet'), rule('void Start()'), has(/Destroy\s*\(\s*gameObject\s*,\s*2f?\s*\)\s*;/, 'Call <code>Destroy(gameObject, 2f);</code>')]) }),
    ] },
    { id: 'coroutines', title: 'Unity: Coroutines (waiting)', xp: 40, recap: 'An <code>IEnumerator</code> method with <code>yield return new WaitForSeconds(t)</code>, started with <code>StartCoroutine(…)</code>.', steps: [
      read('Doing things over time', `<p>To wait without freezing the game, use a <b>coroutine</b>:</p>${pre('IEnumerator Flash() {\n    sprite.enabled = false;\n    yield return new WaitForSeconds(0.2f);\n    sprite.enabled = true;\n}\n\nvoid Hit() {\n    StartCoroutine(Flash());\n}')}<p><code>yield return</code> pauses the method and comes back later; the rest of the game keeps running.</p>`),
      quiz('How do you start a coroutine named <code>Spawn</code>?', ['Spawn();', 'StartCoroutine(Spawn());', 'yield Spawn();', 'Invoke(Spawn);'], 1),
      code({ task: 'In <code>Spawner : MonoBehaviour</code>, write <code>IEnumerator SpawnWave()</code> that prints <b>"Wave!"</b> with <code>Debug.Log</code>, waits <b>3</b> seconds, then prints <b>"Next wave!"</b>.', starter: 'using System.Collections;\nusing UnityEngine;\n\n', hints: ['<code>yield return new WaitForSeconds(3f);</code>'],
        solution: 'using System.Collections;\nusing UnityEngine;\n\npublic class Spawner : MonoBehaviour\n{\n    IEnumerator SpawnWave()\n    {\n        Debug.Log("Wave!");\n        yield return new WaitForSeconds(3f);\n        Debug.Log("Next wave!");\n    }\n}\n',
        check: R([mono('Spawner'), rule('IEnumerator SpawnWave()'), rule('Debug.Log("Wave!");'), has(/yield\s+return\s+new\s+WaitForSeconds\s*\(\s*3f?\s*\)\s*;/, 'Wait with <code>yield return new WaitForSeconds(3f);</code>'), rule('Debug.Log("Next wave!");')]) }),
      code({ task: 'Add <code>void Start()</code> that calls <code>StartCoroutine(SpawnWave());</code>', keep: true, hints: ['Start runs once when the object appears.'],
        solution: 'using System.Collections;\nusing UnityEngine;\n\npublic class Spawner : MonoBehaviour\n{\n    void Start()\n    {\n        StartCoroutine(SpawnWave());\n    }\n\n    IEnumerator SpawnWave()\n    {\n        Debug.Log("Wave!");\n        yield return new WaitForSeconds(3f);\n        Debug.Log("Next wave!");\n    }\n}\n',
        check: R([rule('void Start()'), rule('StartCoroutine(SpawnWave());')]) }),
    ] },
  ]);
  extend('cs', 'manager', [
    { id: 'uibuttons', title: 'Unity: UI buttons', xp: 35, recap: 'Make a <code>public</code> method, then hook it up in the Button’s <b>On Click</b> list — or in code with <code>button.onClick.AddListener(Method)</code>.', steps: [
      read('Buttons call your methods', `<p>A UI <b>Button</b> calls a public method when clicked. You can hook it up in the Inspector, or in code:</p>${pre('using UnityEngine.UI;\n\npublic Button playButton;\n\nvoid Start() {\n    playButton.onClick.AddListener(Play);\n}\n\npublic void Play() {\n    Debug.Log("Play!");\n}')}<p>Note: <code>AddListener(Play)</code> — no brackets after Play. You’re passing the method, not calling it.</p>`),
      quiz('Which line is correct?', ['button.onClick.AddListener(Play());', 'button.onClick.AddListener(Play);', 'button.onClick = Play;', 'button.AddListener("Play");'], 1),
      code({ task: 'In <code>Menu : MonoBehaviour</code>, add <code>using UnityEngine.UI;</code>, a <code>public Button quitButton;</code>, and in <code>Start()</code> hook it to a <code>public void Quit()</code> method that calls <code>Application.Quit();</code>', starter: 'using UnityEngine;\n', hints: ['<code>quitButton.onClick.AddListener(Quit);</code>'],
        solution: 'using UnityEngine;\nusing UnityEngine.UI;\n\npublic class Menu : MonoBehaviour\n{\n    public Button quitButton;\n\n    void Start()\n    {\n        quitButton.onClick.AddListener(Quit);\n    }\n\n    public void Quit()\n    {\n        Application.Quit();\n    }\n}\n',
        check: R([rule('using UnityEngine.UI;'), mono('Menu'), rule('public Button quitButton;'), rule('quitButton.onClick.AddListener(Quit);'), rule('public void Quit()'), rule('Application.Quit();')]) }),
    ] },
    { id: 'scenes', title: 'Unity: Loading scenes', xp: 35, recap: '<code>using UnityEngine.SceneManagement;</code> then <code>SceneManager.LoadScene("Level2")</code>. Restart with <code>SceneManager.GetActiveScene().name</code>.', steps: [
      read('Menus, levels, game over', `${pre('using UnityEngine.SceneManagement;\n\nSceneManager.LoadScene("Level2");\n\n// restart the current level\nSceneManager.LoadScene(SceneManager.GetActiveScene().name);')}${tip('Scenes must be added in <b>File → Build Settings</b> before they can be loaded by name.')}`),
      quiz('A scene won’t load by name. The most likely cause?', ['Wrong using line', 'It isn’t added to Build Settings', 'Scenes can’t be loaded in code', 'The name needs .unity'], 1),
      code({ task: 'Write <code>LevelExit : MonoBehaviour</code> with <code>using UnityEngine.SceneManagement;</code>. In <code>OnTriggerEnter2D(Collider2D other)</code>, if <code>other.CompareTag("Player")</code>, load scene <b>"Level2"</b>.', starter: 'using UnityEngine;\n', hints: ['<code>SceneManager.LoadScene("Level2");</code>'],
        solution: 'using UnityEngine;\nusing UnityEngine.SceneManagement;\n\npublic class LevelExit : MonoBehaviour\n{\n    void OnTriggerEnter2D(Collider2D other)\n    {\n        if (other.CompareTag("Player"))\n        {\n            SceneManager.LoadScene("Level2");\n        }\n    }\n}\n',
        check: R([rule('using UnityEngine.SceneManagement;'), mono('LevelExit'), rule('void OnTriggerEnter2D(Collider2D other)'), rule('if (other.CompareTag("Player"))'), rule('SceneManager.LoadScene("Level2");')]) }),
      code({ task: 'Add <code>public void Restart()</code> that reloads the current scene.', keep: true, hints: ['<code>SceneManager.LoadScene(SceneManager.GetActiveScene().name);</code>'],
        solution: 'using UnityEngine;\nusing UnityEngine.SceneManagement;\n\npublic class LevelExit : MonoBehaviour\n{\n    void OnTriggerEnter2D(Collider2D other)\n    {\n        if (other.CompareTag("Player"))\n        {\n            SceneManager.LoadScene("Level2");\n        }\n    }\n\n    public void Restart()\n    {\n        SceneManager.LoadScene(SceneManager.GetActiveScene().name);\n    }\n}\n',
        check: R([rule('public void Restart()'), has(/SceneManager\.LoadScene\s*\(\s*SceneManager\.GetActiveScene\s*\(\s*\)\s*\.(name|buildIndex)\s*\)/, 'Reload with <code>SceneManager.LoadScene(SceneManager.GetActiveScene().name);</code>')]) }),
    ] },
    { id: 'saving', title: 'Unity: Saving with PlayerPrefs', xp: 35, recap: '<code>PlayerPrefs.SetInt("best", score)</code> saves; <code>PlayerPrefs.GetInt("best", 0)</code> loads (0 if nothing was saved).', steps: [
      read('Remember the high score', `${pre('// save\nPlayerPrefs.SetInt("highScore", score);\nPlayerPrefs.Save();\n\n// load (0 if never saved)\nint best = PlayerPrefs.GetInt("highScore", 0);')}<p>There are also <code>SetFloat</code>/<code>GetFloat</code> and <code>SetString</code>/<code>GetString</code>.</p>`),
      predict('PlayerPrefs.DeleteAll();\nint coins = PlayerPrefs.GetInt("coins", 5);\nDebug.Log(coins);', ['0', '5', 'null', 'Error'], 1, 'Nothing is saved, so the default (5) comes back.'),
      code({ task: 'Write <code>public void SaveBest(int score)</code>: if <code>score</code> is bigger than <code>PlayerPrefs.GetInt("best", 0)</code>, save it with <code>SetInt</code>.', starter: 'using UnityEngine;\n\npublic class Scores : MonoBehaviour\n{\n}\n', hints: ['<code>if (score > PlayerPrefs.GetInt("best", 0)) { PlayerPrefs.SetInt("best", score); }</code>'],
        solution: 'using UnityEngine;\n\npublic class Scores : MonoBehaviour\n{\n    public void SaveBest(int score)\n    {\n        if (score > PlayerPrefs.GetInt("best", 0))\n        {\n            PlayerPrefs.SetInt("best", score);\n        }\n    }\n}\n',
        check: R([rule('public void SaveBest(int score)'), rule('if (score > PlayerPrefs.GetInt("best", 0))'), rule('PlayerPrefs.SetInt("best", score);')]) }),
    ] },
    { id: 'audio', title: 'Unity: Sound effects', xp: 30, recap: 'Give the object an <b>AudioSource</b>; play one-off sounds with <code>audioSource.PlayOneShot(clip)</code>.', steps: [
      read('Beeps and booms', `${pre('public AudioClip jumpSound;\nAudioSource audioSource;\n\nvoid Start() {\n    audioSource = GetComponent<AudioSource>();\n}\n\nvoid Jump() {\n    audioSource.PlayOneShot(jumpSound);\n}')}<p><code>PlayOneShot</code> lets sounds overlap — good for quick effects. For music, set the clip and call <code>Play()</code>.</p>`),
      quiz('Which is best for a coin sound that can play many times quickly?', ['audioSource.Play()', 'audioSource.PlayOneShot(coinSound)', 'AudioClip.Play()', 'Destroy(audioSource)'], 1),
      code({ task: 'In <code>CoinSound : MonoBehaviour</code>: add <code>public AudioClip coinClip;</code> and <code>AudioSource source;</code>, set <code>source</code> in <code>Start()</code> with <code>GetComponent&lt;AudioSource&gt;()</code>, and write <code>public void Collect()</code> that plays the clip with <code>PlayOneShot</code>.', starter: 'using UnityEngine;\n\n', hints: ['<code>source.PlayOneShot(coinClip);</code>'],
        solution: 'using UnityEngine;\n\npublic class CoinSound : MonoBehaviour\n{\n    public AudioClip coinClip;\n    AudioSource source;\n\n    void Start()\n    {\n        source = GetComponent<AudioSource>();\n    }\n\n    public void Collect()\n    {\n        source.PlayOneShot(coinClip);\n    }\n}\n',
        check: R([mono('CoinSound'), rule('public AudioClip coinClip;'), has(/AudioSource\s+source\s*;/, 'Add a field <code>AudioSource source;</code>'), rule('source = GetComponent<AudioSource>();'), rule('public void Collect()'), rule('source.PlayOneShot(coinClip);')]) }),
    ] },
    { id: 'animator', title: 'Unity: Animation parameters', xp: 35, recap: 'The Animator switches animations using parameters: <code>anim.SetFloat("Speed", x)</code>, <code>anim.SetBool("Jumping", true)</code>, <code>anim.SetTrigger("Hit")</code>.', steps: [
      read('Telling the Animator what’s happening', `<p>Your Animator Controller has <b>parameters</b>, and arrows between animations that check them. Your script just updates the parameters:</p>${pre('Animator anim;\n\nvoid Start() { anim = GetComponent<Animator>(); }\n\nvoid Update() {\n    anim.SetFloat("Speed", Mathf.Abs(rb.linearVelocity.x));\n    if (hurt) anim.SetTrigger("Hit");\n}')}`),
      quiz('Which parameter type is best for a one-time “got hit” animation?', ['Float', 'Int', 'Bool', 'Trigger'], 3, 'A trigger fires once and resets itself.'),
      code({ task: 'In <code>PlayerAnim : MonoBehaviour</code>, get the <code>Animator anim</code> in <code>Start()</code>. In <code>Update()</code>, set the float <b>"Speed"</b> to <code>Mathf.Abs(Input.GetAxis("Horizontal"))</code>.', starter: 'using UnityEngine;\n\n', hints: ['<code>anim.SetFloat("Speed", Mathf.Abs(Input.GetAxis("Horizontal")));</code>'],
        solution: 'using UnityEngine;\n\npublic class PlayerAnim : MonoBehaviour\n{\n    Animator anim;\n\n    void Start()\n    {\n        anim = GetComponent<Animator>();\n    }\n\n    void Update()\n    {\n        anim.SetFloat("Speed", Mathf.Abs(Input.GetAxis("Horizontal")));\n    }\n}\n',
        check: R([mono('PlayerAnim'), has(/Animator\s+anim\s*;/, 'Add a field <code>Animator anim;</code>'), rule('anim = GetComponent<Animator>();'), rule('anim.SetFloat("Speed", Mathf.Abs(Input.GetAxis("Horizontal")));')]) }),
    ] },
  ]);
})();
