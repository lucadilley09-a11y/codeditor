/* Codeditor — round 5: more C++ lessons (language gaps + raylib games). Reviewed, not executed; raylib lessons get a simulated preview. */
(() => {
  const { tip, pre, read, quiz, predict, code, review: R, extend } = Q.kit;
  const { rule } = Q.gen;
  const has = (re, msg) => [re, msg];

  /* ---------------- C++ language ---------------- */
  extend('cpp', 'control', [
    { id: 'switchwhile', title: 'switch & while', xp: 30, recap: '<code>switch</code> picks a case (don’t forget <code>break</code>); <code>while</code> repeats while a condition holds.', steps: [
      read('Menus and repeat-until', `${pre('int choice = 2;\nswitch (choice) {\n    case 1: std::cout << "Play";  break;\n    case 2: std::cout << "Options"; break;\n    default: std::cout << "Quit";\n}\n\nint hp = 10;\nwhile (hp > 0) {\n    hp -= 4;\n}')}${tip('Without <code>break</code>, C++ “falls through” into the next case too!')}`),
      predict('int n = 3;\nint steps = 0;\nwhile (n < 50) {\n    n *= 3;\n    steps++;\n}\nstd::cout << steps;', ['2', '3', '4', '81'], 1, '3 → 9 → 27 → 81: three steps.'),
      code({ task: 'Write a <code>switch</code> on <code>dir</code>: <code>\'w\'</code> → <code>y -= 1;</code>, <code>\'s\'</code> → <code>y += 1;</code>. Each case ends with <code>break;</code>.', starter: 'char dir = \'w\';\nint y = 5;\n', hints: ['<code>case \'w\': y -= 1; break;</code>'],
        solution: 'char dir = \'w\';\nint y = 5;\nswitch (dir) {\n    case \'w\': y -= 1; break;\n    case \'s\': y += 1; break;\n}\n',
        check: R([rule('switch (dir)'), has(/case\s*'w'\s*:\s*y\s*(-=\s*1|--)\s*;\s*break\s*;/, 'Case \'w\': <code>y -= 1; break;</code>'), has(/case\s*'s'\s*:\s*y\s*(\+=\s*1|\+\+)\s*;\s*break\s*;/, 'Case \'s\': <code>y += 1; break;</code>')]) }),
    ] },
  ]);
  extend('cpp', 'functions', [
    { id: 'refs', title: 'References & const', xp: 35, recap: '<code>void heal(int& hp)</code> changes the caller’s variable. <code>const std::string& name</code> avoids copying and promises not to change it.', steps: [
      read('Passing by reference', `${pre('void heal(int hp)  { hp += 10; }   // changes a COPY — caller sees nothing\nvoid heal2(int& hp) { hp += 10; }  // & = the caller’s own variable\n\nint life = 50;\nheal(life);   // life is still 50\nheal2(life);  // life is now 60')}<p>For big things like strings, pass <code>const std::string&amp;</code>: no copy, and the function can’t change it.</p>`),
      predict('void boost(int& s) { s *= 2; }\n\nint speed = 4;\nboost(speed);\nboost(speed);\nstd::cout << speed;', ['4', '8', '16', '2'], 2),
      code({ task: 'Write <code>void damage(int&amp; hp, int amount)</code> that subtracts <code>amount</code> from <code>hp</code>.', starter: '', hints: ['The <code>&</code> goes after the type: <code>int& hp</code>.'],
        solution: 'void damage(int& hp, int amount) {\n    hp -= amount;\n}\n',
        check: R([has(/void\s+damage\s*\(\s*int\s*&\s*hp\s*,\s*int\s+amount\s*\)/, 'Signature: <code>void damage(int& hp, int amount)</code>'), has(/hp\s*(-=\s*amount|=\s*hp\s*-\s*amount)/, 'Subtract <code>amount</code> from <code>hp</code>.')]) }),
      code({ task: 'Write <code>void greet(const std::string&amp; name)</code> that prints <code>"Hi " &lt;&lt; name</code> with <code>std::cout</code>.', starter: '#include <iostream>\n#include <string>\n\n', hints: ['<code>std::cout << "Hi " << name << std::endl;</code>'],
        solution: '#include <iostream>\n#include <string>\n\nvoid greet(const std::string& name) {\n    std::cout << "Hi " << name << std::endl;\n}\n',
        check: R([has(/void\s+greet\s*\(\s*const\s+(std::)?string\s*&\s*name\s*\)/, 'Signature: <code>void greet(const std::string& name)</code>'), has(/cout\s*<<\s*"Hi "\s*<<\s*name/, 'Print <code>"Hi " << name</code>.')]) }),
    ] },
  ]);
  extend('cpp', 'vectors', [
    { id: 'rangefor', title: 'auto & range-for loops', xp: 30, recap: '<code>for (auto&amp; e : enemies)</code> visits every item. Use <code>&amp;</code> to change items, <code>const auto&amp;</code> to just read.', steps: [
      read('Loop over everything', `${pre('std::vector<int> hp = { 10, 25, 7 };\n\nfor (int h : hp) std::cout << h;        // copies each value\nfor (auto& h : hp) h += 5;              // changes the real items\nfor (const auto& h : hp) std::cout << h; // read only, no copy')}<p><code>auto</code> lets the compiler work out the type for you.</p>`),
      predict('std::vector<int> v = { 1, 2, 3 };\nfor (int x : v) x *= 10;\nstd::cout << v[0];', ['10', '1', '0', '30'], 1, 'Without &, x is a copy — the vector doesn’t change.'),
      code({ task: 'Add 1 to every score in <code>scores</code> using <code>for (auto&amp; s : scores)</code>.', starter: '#include <vector>\n\nstd::vector<int> scores = { 3, 8, 5 };\n', hints: ['<code>for (auto& s : scores) { s += 1; }</code>'],
        solution: '#include <vector>\n\nstd::vector<int> scores = { 3, 8, 5 };\nfor (auto& s : scores) {\n    s += 1;\n}\n',
        check: R([has(/for\s*\(\s*(auto|int)\s*&\s*s\s*:\s*scores\s*\)/, 'Loop with <code>for (auto& s : scores)</code>.'), has(/\bs\s*(\+=\s*1|\+\+)|\+\+\s*s\b/, 'Add 1 to <code>s</code>.')]) }),
    ] },
    { id: 'arrays', title: 'std::array & grids', xp: 35, recap: '<code>std::array&lt;int, 5&gt;</code> is a fixed-size list. A 2D grid is an array of arrays: <code>grid[row][col]</code>.', steps: [
      read('Fixed-size lists and maps', `${pre('#include <array>\n\nstd::array<int, 3> lanes = { 0, 120, 240 };\nstd::cout << lanes.size();   // 3\n\n// a tiny tile map: 0 = floor, 1 = wall\nint map[3][4] = {\n    { 1, 1, 1, 1 },\n    { 1, 0, 0, 1 },\n    { 1, 1, 1, 1 },\n};\nstd::cout << map[1][2];      // 0')}`),
      quiz('In <code>map[1][2]</code>, which number is the row?', ['1', '2', 'Both', 'Neither'], 0),
      code({ task: 'Make <code>std::array&lt;int, 4&gt; ammo = { 6, 6, 3, 0 };</code>', starter: '#include <array>\n\n', hints: ['Size goes in the angle brackets.'],
        solution: '#include <array>\n\nstd::array<int, 4> ammo = { 6, 6, 3, 0 };\n',
        check: R([rule('std::array<int, 4> ammo = { 6, 6, 3, 0 };')]) }),
      code({ task: 'Count the walls: loop over every row <code>r</code> (0–2) and column <code>c</code> (0–3) of <code>map</code> and add 1 to <code>walls</code> when <code>map[r][c] == 1</code>.', starter: 'int map[3][4] = {\n    { 1, 1, 1, 1 },\n    { 1, 0, 0, 1 },\n    { 1, 1, 1, 1 },\n};\nint walls = 0;\n', hints: ['Two nested <code>for</code> loops.'],
        solution: 'int map[3][4] = {\n    { 1, 1, 1, 1 },\n    { 1, 0, 0, 1 },\n    { 1, 1, 1, 1 },\n};\nint walls = 0;\nfor (int r = 0; r < 3; r++) {\n    for (int c = 0; c < 4; c++) {\n        if (map[r][c] == 1) walls++;\n    }\n}\n',
        check: R([has(/for\s*\(\s*int\s+r\s*=\s*0\s*;\s*r\s*<\s*3\s*;/, 'Loop rows: <code>for (int r = 0; r < 3; r++)</code>'), has(/for\s*\(\s*int\s+c\s*=\s*0\s*;\s*c\s*<\s*4\s*;/, 'Loop columns: <code>for (int c = 0; c < 4; c++)</code>'), rule('if (map[r][c] == 1)'), has(/walls\s*(\+\+|\+=\s*1)/, 'Add 1 to <code>walls</code>.')]) }),
    ] },
  ]);
  extend('cpp', 'structs', [
    { id: 'enumclass', title: 'enum class: game states', xp: 30, recap: '<code>enum class State { Menu, Playing, Over };</code> — use it as <code>State::Playing</code>.', steps: [
      read('Named states, safely', `${pre('enum class State { Menu, Playing, GameOver };\n\nState state = State::Menu;\nif (state == State::Playing) { /* update the game */ }')}<p><code>enum class</code> values must be written with their name (<code>State::Menu</code>), so they never clash with other names.</p>`),
      quiz('How do you write the Playing value?', ['Playing', 'State.Playing', 'State::Playing', '"Playing"'], 2),
      code({ task: 'Declare <code>enum class Dir { Up, Down, Left, Right };</code> and <code>Dir facing = Dir::Left;</code>', starter: '', hints: ['Don’t forget the semicolon after the enum.'],
        solution: 'enum class Dir { Up, Down, Left, Right };\n\nDir facing = Dir::Left;\n',
        check: R([has(/enum\s+class\s+Dir\s*\{\s*Up\s*,\s*Down\s*,\s*Left\s*,\s*Right\s*,?\s*\}\s*;/, 'Declare <code>enum class Dir { Up, Down, Left, Right };</code>'), rule('Dir facing = Dir::Left;')]) }),
    ] },
  ]);
  extend('cpp', 'inherit', [
    { id: 'templates', title: 'Templates', xp: 40, recap: '<code>template &lt;typename T&gt;</code> writes one function for many types: <code>T biggest(T a, T b)</code>.', steps: [
      read('One function, any type', `${pre('template <typename T>\nT biggest(T a, T b) {\n    return a > b ? a : b;\n}\n\nbiggest(3, 9);        // int → 9\nbiggest(2.5, 1.0);    // double → 2.5')}<p>This is how <code>std::vector&lt;T&gt;</code> works — it’s a template!</p>`),
      quiz('What does <code>T</code> stand for in <code>template &lt;typename T&gt;</code>?', ['Text', 'Whatever type the function is used with', 'Template', 'True'], 1),
      code({ task: 'Write <code>template &lt;typename T&gt; T clampTo(T v, T lo, T hi)</code> that returns <code>lo</code> if v &lt; lo, <code>hi</code> if v &gt; hi, otherwise <code>v</code>.', starter: '', hints: ['Two ifs, then <code>return v;</code>'],
        solution: 'template <typename T>\nT clampTo(T v, T lo, T hi) {\n    if (v < lo) return lo;\n    if (v > hi) return hi;\n    return v;\n}\n',
        check: R([has(/template\s*<\s*(typename|class)\s+T\s*>/, 'Start with <code>template &lt;typename T&gt;</code>.'), rule('T clampTo(T v, T lo, T hi)'), rule('if (v < lo) return lo;'), rule('if (v > hi) return hi;'), rule('return v;')]) }),
    ] },
    { id: 'lambdas', title: 'Lambdas & sorting', xp: 40, recap: 'A lambda is a tiny inline function: <code>[](int a, int b) { return a &gt; b; }</code>. Pass it to <code>std::sort</code> to choose the order.', steps: [
      read('Functions without names', `${pre('#include <algorithm>\n\nstd::vector<int> scores = { 40, 95, 70 };\nstd::sort(scores.begin(), scores.end());   // 40 70 95\n\nstd::sort(scores.begin(), scores.end(), [](int a, int b) {\n    return a > b;                            // 95 70 40\n});')}<p>The <code>[]</code> starts a lambda. It can “capture” variables from around it: <code>[&amp;]</code> captures everything by reference.</p>`),
      quiz('With <code>return a &gt; b;</code> as the sort rule, the list ends up…', ['Smallest first', 'Biggest first', 'Unchanged', 'Random'], 1),
      code({ task: 'Sort <code>times</code> from <b>fastest</b> (smallest) to slowest with <code>std::sort(times.begin(), times.end());</code>, then sort <code>scores</code> highest-first using a lambda.', starter: '#include <algorithm>\n#include <vector>\n\nstd::vector<float> times = { 31.5f, 28.2f, 40.1f };\nstd::vector<int> scores = { 40, 95, 70 };\n', hints: ['<code>std::sort(scores.begin(), scores.end(), [](int a, int b) { return a > b; });</code>'],
        solution: '#include <algorithm>\n#include <vector>\n\nstd::vector<float> times = { 31.5f, 28.2f, 40.1f };\nstd::vector<int> scores = { 40, 95, 70 };\nstd::sort(times.begin(), times.end());\nstd::sort(scores.begin(), scores.end(), [](int a, int b) { return a > b; });\n',
        check: R([rule('std::sort(times.begin(), times.end());'), has(/std::sort\s*\(\s*scores\.begin\s*\(\s*\)\s*,\s*scores\.end\s*\(\s*\)\s*,\s*\[\s*&?\s*\]\s*\(\s*int\s+(\w+)\s*,\s*int\s+(\w+)\s*\)\s*\{\s*return\s+\1\s*>\s*\2\s*;\s*\}\s*\)/, 'Sort scores with a lambda: <code>[](int a, int b) { return a > b; }</code>')]) }),
    ] },
  ]);
  extend('cpp', 'maps', [
    { id: 'files', title: 'Saving & loading files', xp: 35, recap: '<code>std::ofstream out("save.txt"); out &lt;&lt; score;</code> writes; <code>std::ifstream in("save.txt"); in &gt;&gt; score;</code> reads.', steps: [
      read('A save file', `${pre('#include <fstream>\n\n// save\nstd::ofstream out("save.txt");\nout << level << " " << coins;\nout.close();\n\n// load\nstd::ifstream in("save.txt");\nif (in) {\n    in >> level >> coins;\n}')}${tip('<code>if (in)</code> checks the file actually opened — the first time you play there’s no save yet.')}`),
      quiz('Which type <b>writes</b> to a file?', ['std::ifstream', 'std::ofstream', 'std::cin', 'std::string'], 1),
      code({ task: 'Save <code>best</code>: open <code>std::ofstream out("best.txt");</code> and write <code>best</code> into it with <code>&lt;&lt;</code>.', starter: '#include <fstream>\n\nint best = 4200;\n', hints: ['<code>out << best;</code>'],
        solution: '#include <fstream>\n\nint best = 4200;\nstd::ofstream out("best.txt");\nout << best;\nout.close();\n',
        check: R([rule('std::ofstream out("best.txt");'), rule('out << best;')]) }),
      code({ task: 'Load it back: open <code>std::ifstream in("best.txt");</code> and, if it opened, read into <code>best</code> with <code>&gt;&gt;</code>.', starter: '#include <fstream>\n\nint best = 0;\n', hints: ['<code>if (in) { in >> best; }</code>'],
        solution: '#include <fstream>\n\nint best = 0;\nstd::ifstream in("best.txt");\nif (in) {\n    in >> best;\n}\n',
        check: R([rule('std::ifstream in("best.txt");'), has(/if\s*\(\s*in(\.is_open\s*\(\s*\))?\s*\)/, 'Check it opened with <code>if (in)</code>.'), rule('in >> best;')]) }),
    ] },
    { id: 'random', title: 'Random numbers with <random>', xp: 30, recap: 'Make one <code>std::mt19937 rng(std::random_device{}())</code>, then <code>std::uniform_int_distribution&lt;int&gt; d6(1, 6); d6(rng)</code>.', steps: [
      read('Proper dice rolls', `${pre('#include <random>\n\nstd::mt19937 rng(std::random_device{}());   // create ONCE\nstd::uniform_int_distribution<int> d6(1, 6);  // 1 to 6, both included\nint roll = d6(rng);')}<p>Unlike <code>rand() % 6</code>, this gives fair results and is easy to read.</p>`),
      quiz('With <code>uniform_int_distribution&lt;int&gt; d(1, 6)</code>, can you roll a 6?', ['Yes — both ends are included', 'No — 6 is excluded', 'Only sometimes', 'It returns 0–5'], 0),
      code({ task: 'Create <code>std::mt19937 rng(std::random_device{}());</code>, a distribution <code>loot</code> from <b>1</b> to <b>100</b>, and <code>int roll = loot(rng);</code>', starter: '#include <random>\n\n', hints: ['<code>std::uniform_int_distribution<int> loot(1, 100);</code>'],
        solution: '#include <random>\n\nstd::mt19937 rng(std::random_device{}());\nstd::uniform_int_distribution<int> loot(1, 100);\nint roll = loot(rng);\n',
        check: R([rule('std::mt19937 rng(std::random_device{}());'), rule('std::uniform_int_distribution<int> loot(1, 100);'), rule('int roll = loot(rng);')]) }),
    ] },
  ]);

  /* ---------------- raylib ---------------- */
  const W = (body, extra = '') => `#include "raylib.h"\n${extra}\nint main() {\n    InitWindow(800, 450, "My Game");\n    SetTargetFPS(60);\n${body}\n    CloseWindow();\n    return 0;\n}\n`;
  const loop = (update, draw, bg = 'RAYWHITE') => `    while (!WindowShouldClose()) {\n${update}        BeginDrawing();\n        ClearBackground(${bg});\n${draw}        EndDrawing();\n    }`;
  extend('cpp', 'loop', [
    { id: 'raywindow', title: 'raylib: your first window', xp: 35, recap: '<code>InitWindow</code>, then <code>while (!WindowShouldClose())</code> with <code>BeginDrawing()</code> … <code>EndDrawing()</code>, then <code>CloseWindow()</code>.', steps: [
      read('A real game window', `<p><b>raylib</b> is a small C library for making games. Every raylib game has the same shape:</p>${pre(W(loop('', '        DrawText("Hello, raylib!", 300, 200, 30, DARKGRAY);\n')))}<p>The <code>while</code> loop runs 60 times a second — once per <b>frame</b>. Click <b>Run game</b> below the task to see a simulated preview.</p>`),
      quiz('What goes between <code>BeginDrawing()</code> and <code>EndDrawing()</code>?', ['Loading files', 'Everything you draw this frame', 'InitWindow', 'Nothing'], 1),
      code({ task: 'Complete the game loop: inside it, <code>BeginDrawing()</code>, <code>ClearBackground(SKYBLUE);</code>, draw the text <b>"Level 1"</b> at (20, 20) size 30 in <code>WHITE</code>, then <code>EndDrawing()</code>.', starter: W('    while (!WindowShouldClose()) {\n\n    }'), hints: ['<code>DrawText("Level 1", 20, 20, 30, WHITE);</code>'],
        solution: W(loop('', '        DrawText("Level 1", 20, 20, 30, WHITE);\n', 'SKYBLUE')),
        check: R([rule('while (!WindowShouldClose())'), rule('BeginDrawing();'), rule('ClearBackground(SKYBLUE);'), rule('DrawText("Level 1", 20, 20, 30, WHITE);'), rule('EndDrawing();')]) }),
    ] },
    { id: 'rayshapes', title: 'raylib: drawing shapes', xp: 35, recap: '<code>DrawRectangle(x, y, w, h, color)</code>, <code>DrawCircle(x, y, radius, color)</code>, <code>DrawLine(x1, y1, x2, y2, color)</code>. (0, 0) is the top-left.', steps: [
      read('Rectangles, circles, lines', `${pre('DrawRectangle(100, 300, 600, 40, DARKGREEN);   // ground\nDrawCircle(400, 120, 50, GOLD);                 // sun\nDrawLine(0, 340, 800, 340, BLACK);')}<p>Like the HTML canvas, y grows <b>downward</b>: (0, 0) is the top-left corner.</p>`),
      quiz('Where is (0, 450) in an 800×450 window?', ['Top-left', 'Bottom-left', 'Center', 'Top-right'], 1),
      code({ task: 'Draw a house: a <code>BROWN</code> rectangle at (300, 200) size 200×150, and a <code>RED</code> circle (the sun) at (650, 90) radius 40.', starter: W(loop('', '        // draw here\n')), hints: ['<code>DrawRectangle(300, 200, 200, 150, BROWN);</code>'],
        solution: W(loop('', '        DrawRectangle(300, 200, 200, 150, BROWN);\n        DrawCircle(650, 90, 40, RED);\n')),
        check: R([rule('DrawRectangle(300, 200, 200, 150, BROWN);'), rule('DrawCircle(650, 90, 40, RED);'), has(/BeginDrawing[\s\S]*DrawRectangle[\s\S]*EndDrawing/, 'Draw between BeginDrawing and EndDrawing.')]) }),
    ] },
    { id: 'rayinput', title: 'raylib: keyboard movement', xp: 40, recap: '<code>IsKeyDown(KEY_RIGHT)</code> is true while held; <code>IsKeyPressed(KEY_SPACE)</code> only on the first frame.', steps: [
      read('Moving with the arrows', `${pre('int x = 400;\n// inside the loop, before drawing:\nif (IsKeyDown(KEY_RIGHT)) x += 4;\nif (IsKeyDown(KEY_LEFT))  x -= 4;\n\nDrawCircle(x, 225, 20, MAROON);')}<p><code>IsKeyDown</code> = held; <code>IsKeyPressed</code> = just pressed this frame (good for jumping or shooting).</p>`),
      quiz('Which is best for “press Space once to jump”?', ['IsKeyDown(KEY_SPACE)', 'IsKeyPressed(KEY_SPACE)', 'IsKeyUp(KEY_SPACE)', 'GetKeyPressed()'], 1),
      code({ task: 'Make the player move: declare <code>int x = 400;</code> and <code>int y = 225;</code> before the loop. In the loop, change <code>x</code> by 4 with LEFT/RIGHT and <code>y</code> by 4 with UP/DOWN, then draw a <code>MAROON</code> circle at (x, y) radius 20.', starter: W(loop('', '')), hints: ['<code>if (IsKeyDown(KEY_UP)) y -= 4;</code> — up is minus!'],
        solution: W('    int x = 400;\n    int y = 225;\n' + loop('        if (IsKeyDown(KEY_RIGHT)) x += 4;\n        if (IsKeyDown(KEY_LEFT)) x -= 4;\n        if (IsKeyDown(KEY_UP)) y -= 4;\n        if (IsKeyDown(KEY_DOWN)) y += 4;\n', '        DrawCircle(x, y, 20, MAROON);\n')),
        check: R([rule('int x = 400;'), rule('int y = 225;'), rule('if (IsKeyDown(KEY_RIGHT)) x += 4;'), rule('if (IsKeyDown(KEY_LEFT)) x -= 4;'), rule('if (IsKeyDown(KEY_UP)) y -= 4;'), rule('if (IsKeyDown(KEY_DOWN)) y += 4;'), rule('DrawCircle(x, y, 20, MAROON);')]) }),
    ] },
    { id: 'raydt', title: 'raylib: smooth speed with GetFrameTime', xp: 35, recap: 'Use <code>float</code> positions and move by <code>speed * GetFrameTime()</code> so speed is per second.', steps: [
      read('Per second, not per frame', `<p>Moving 4 pixels per frame is faster on a 144 Hz screen than a 60 Hz one. Multiply by <code>GetFrameTime()</code> (seconds since last frame):</p>${pre('float x = 100.0f;\nfloat speed = 300.0f;   // pixels per second\n\nx += speed * GetFrameTime();')}`),
      quiz('At 60 FPS, roughly what does <code>GetFrameTime()</code> return?', ['60', '1', '0.0167', '16'], 2),
      code({ task: 'Make a box slide right forever: <code>float x = 0.0f;</code> and <code>float speed = 200.0f;</code>; each frame add <code>speed * GetFrameTime()</code> to <code>x</code>, wrap back to 0 when <code>x &gt; 800</code>, and draw a <code>BLUE</code> 50×50 rectangle at (x, 200).', starter: W(loop('', '')), hints: ['<code>if (x > 800) x = 0;</code>'],
        solution: W('    float x = 0.0f;\n    float speed = 200.0f;\n' + loop('        x += speed * GetFrameTime();\n        if (x > 800) x = 0;\n', '        DrawRectangle(x, 200, 50, 50, BLUE);\n')),
        check: R([rule('float x = 0.0f;'), rule('float speed = 200.0f;'), rule('x += speed * GetFrameTime();'), rule('if (x > 800) x = 0;'), has(/DrawRectangle\s*\(\s*(\(int\)\s*)?x\s*,\s*200\s*,\s*50\s*,\s*50\s*,\s*BLUE\s*\)/, 'Draw <code>DrawRectangle(x, 200, 50, 50, BLUE);</code>')]) }),
    ] },
    { id: 'raycollide', title: 'raylib: Rectangles & collisions', xp: 40, recap: '<code>Rectangle r = { x, y, width, height };</code> and <code>CheckCollisionRecs(a, b)</code> returns true when they overlap.', steps: [
      read('Did they touch?', `${pre('Rectangle player = { 100, 200, 40, 40 };\nRectangle coin   = { 400, 210, 20, 20 };\n\nif (CheckCollisionRecs(player, coin)) {\n    score++;\n}\nDrawRectangleRec(player, BLUE);')}<p>A <code>Rectangle</code> keeps x, y, width and height together — and raylib can test overlaps for you.</p>`),
      quiz('What does <code>CheckCollisionRecs</code> return?', ['The overlap size', 'true or false', 'A new Rectangle', 'The distance'], 1),
      code({ task: 'Before the loop make <code>Rectangle player = { 100, 200, 40, 40 };</code>, <code>Rectangle coin = { 500, 210, 20, 20 };</code> and <code>int score = 0;</code>. In the loop: move <code>player.x</code> right by 4 when RIGHT is held; if it collides with <code>coin</code>, add 1 to <code>score</code> and set <code>coin.x = 100;</code>. Draw both with <code>DrawRectangleRec</code> (BLUE, GOLD).', starter: W(loop('', '')), hints: ['<code>if (CheckCollisionRecs(player, coin)) { score++; coin.x = 100; }</code>'],
        solution: W('    Rectangle player = { 100, 200, 40, 40 };\n    Rectangle coin = { 500, 210, 20, 20 };\n    int score = 0;\n' + loop('        if (IsKeyDown(KEY_RIGHT)) player.x += 4;\n        if (CheckCollisionRecs(player, coin)) {\n            score++;\n            coin.x = 100;\n        }\n', '        DrawRectangleRec(player, BLUE);\n        DrawRectangleRec(coin, GOLD);\n')),
        check: R([rule('Rectangle player = { 100, 200, 40, 40 };'), rule('Rectangle coin = { 500, 210, 20, 20 };'), rule('int score = 0;'), rule('if (IsKeyDown(KEY_RIGHT)) player.x += 4;'), rule('if (CheckCollisionRecs(player, coin))'), has(/score\s*(\+\+|\+=\s*1)/, 'Add 1 to <code>score</code>.'), rule('coin.x = 100;'), rule('DrawRectangleRec(player, BLUE);'), rule('DrawRectangleRec(coin, GOLD);')]) }),
    ] },
    { id: 'raytext', title: 'raylib: score text & TextFormat', xp: 30, recap: '<code>DrawText(TextFormat("Score: %i", score), 10, 10, 20, BLACK);</code> — <code>%i</code> is an int, <code>%.1f</code> a float.', steps: [
      read('Showing numbers', `<p><code>DrawText</code> only takes text, so turn numbers into text with <code>TextFormat</code> (like printf):</p>${pre('DrawText(TextFormat("Score: %i", score), 10, 10, 20, BLACK);\nDrawText(TextFormat("Time: %.1f", time), 10, 40, 20, GRAY);')}<p>Center text with <code>MeasureText</code>: <code>int w = MeasureText("GAME OVER", 40);</code> then x = (800 - w) / 2.</p>`),
      quiz('Which placeholder shows an <code>int</code>?', ['%s', '%i', '%f', '%c'], 1),
      code({ task: 'Count frames: <code>int frames = 0;</code> before the loop, add 1 each frame, and draw <code>TextFormat("Frames: %i", frames)</code> at (10, 10), size 20, <code>DARKGRAY</code>.', starter: W(loop('', '')), hints: ['<code>frames++;</code> inside the loop'],
        solution: W('    int frames = 0;\n' + loop('        frames++;\n', '        DrawText(TextFormat("Frames: %i", frames), 10, 10, 20, DARKGRAY);\n')),
        check: R([rule('int frames = 0;'), has(/frames\s*(\+\+|\+=\s*1)/, 'Add 1 to <code>frames</code> each frame.'), rule('DrawText(TextFormat("Frames: %i", frames), 10, 10, 20, DARKGRAY);')]) }),
    ] },
    { id: 'raytextures', title: 'raylib: images (textures)', xp: 35, recap: '<code>Texture2D t = LoadTexture("hero.png");</code> after InitWindow, <code>DrawTexture(t, x, y, WHITE)</code> in the loop, <code>UnloadTexture(t)</code> at the end.', steps: [
      read('Drawing pictures', `${pre('Texture2D hero = LoadTexture("hero.png");   // after InitWindow!\n\n// in the loop:\nDrawTexture(hero, x, y, WHITE);             // WHITE = no tint\n\n// after the loop:\nUnloadTexture(hero);')}${tip('Textures live on the graphics card, so they can only be loaded <b>after</b> <code>InitWindow</code>. The preview shows a placeholder box where your image goes.')}`),
      quiz('Why must <code>LoadTexture</code> come after <code>InitWindow</code>?', ['It doesn’t matter', 'Textures need the graphics device the window creates', 'InitWindow deletes textures', 'For speed'], 1),
      code({ task: 'Load <code>Texture2D ship = LoadTexture("ship.png");</code> after the window opens, draw it at (360, 300) with <code>WHITE</code> in the loop, and call <code>UnloadTexture(ship);</code> before <code>CloseWindow()</code>.', starter: W(loop('', '')), hints: ['Put UnloadTexture right after the loop ends.'],
        solution: W('    Texture2D ship = LoadTexture("ship.png");\n' + loop('', '        DrawTexture(ship, 360, 300, WHITE);\n') + '\n    UnloadTexture(ship);'),
        check: R([rule('Texture2D ship = LoadTexture("ship.png");'), rule('DrawTexture(ship, 360, 300, WHITE);'), rule('UnloadTexture(ship);'), has(/InitWindow[\s\S]*LoadTexture/, 'Load the texture <b>after</b> InitWindow.'), has(/UnloadTexture\s*\(\s*ship\s*\)\s*;\s*CloseWindow/, 'Unload it just before <code>CloseWindow()</code>.')]) }),
    ] },
    { id: 'raysound', title: 'raylib: sound effects', xp: 30, recap: '<code>InitAudioDevice()</code>, <code>Sound s = LoadSound("jump.wav")</code>, <code>PlaySound(s)</code>; clean up with <code>UnloadSound</code> and <code>CloseAudioDevice</code>.', steps: [
      read('Beep!', `${pre('InitAudioDevice();\nSound jump = LoadSound("jump.wav");\n\n// in the loop\nif (IsKeyPressed(KEY_SPACE)) PlaySound(jump);\n\n// at the end\nUnloadSound(jump);\nCloseAudioDevice();')}`),
      quiz('What must you call before loading any sound?', ['InitWindow()', 'InitAudioDevice()', 'PlaySound()', 'BeginDrawing()'], 1),
      code({ task: 'Call <code>InitAudioDevice();</code>, load <code>Sound coin = LoadSound("coin.wav");</code>, and play it when <b>Space</b> is pressed (<code>IsKeyPressed</code>). After the loop: <code>UnloadSound(coin);</code> and <code>CloseAudioDevice();</code>', starter: W(loop('', '')), hints: ['<code>if (IsKeyPressed(KEY_SPACE)) PlaySound(coin);</code>'],
        solution: W('    InitAudioDevice();\n    Sound coin = LoadSound("coin.wav");\n' + loop('        if (IsKeyPressed(KEY_SPACE)) PlaySound(coin);\n', '        DrawText("Press SPACE", 320, 210, 24, GRAY);\n') + '\n    UnloadSound(coin);\n    CloseAudioDevice();'),
        check: R([rule('InitAudioDevice();'), rule('Sound coin = LoadSound("coin.wav");'), rule('if (IsKeyPressed(KEY_SPACE)) PlaySound(coin);'), rule('UnloadSound(coin);'), rule('CloseAudioDevice();')]) }),
    ] },
    { id: 'raystates', title: 'raylib: title screen & game over', xp: 45, recap: 'Keep an <code>enum class Screen</code> and pick what to update and draw with <code>if</code>/<code>switch</code> each frame.', steps: [
      read('Screens', `${pre('enum class Screen { Title, Playing, Over };\nScreen screen = Screen::Title;\n\n// in the loop\nif (screen == Screen::Title && IsKeyPressed(KEY_ENTER)) screen = Screen::Playing;\n...\nif (screen == Screen::Title) DrawText("PRESS ENTER", 290, 200, 30, DARKGRAY);')}<p>Every frame, ask “which screen am I on?” and only update and draw that one.</p>`),
      quiz('Where do you switch from Title to Playing?', ['In InitWindow', 'In the loop, when Enter is pressed', 'After CloseWindow', 'In a texture'], 1),
      code({ task: 'Add <code>enum class Screen { Title, Playing };</code> above <code>main</code> and <code>Screen screen = Screen::Title;</code> before the loop. In the loop: if on Title and Enter is pressed, switch to Playing. Draw <b>"PRESS ENTER"</b> on the Title screen and <b>"PLAYING"</b> on the Playing screen (both at (300, 200), size 30, DARKGRAY).', starter: W(loop('', '')), hints: ['<code>if (screen == Screen::Title && IsKeyPressed(KEY_ENTER)) screen = Screen::Playing;</code>'],
        solution: W('    Screen screen = Screen::Title;\n' + loop('        if (screen == Screen::Title && IsKeyPressed(KEY_ENTER)) screen = Screen::Playing;\n', '        if (screen == Screen::Title) DrawText("PRESS ENTER", 300, 200, 30, DARKGRAY);\n        if (screen == Screen::Playing) DrawText("PLAYING", 300, 200, 30, DARKGRAY);\n'), 'enum class Screen { Title, Playing };\n'),
        check: R([has(/enum\s+class\s+Screen\s*\{\s*Title\s*,\s*Playing\s*,?\s*\}\s*;/, 'Declare <code>enum class Screen { Title, Playing };</code>'), rule('Screen screen = Screen::Title;'), rule('if (screen == Screen::Title && IsKeyPressed(KEY_ENTER)) screen = Screen::Playing;'), rule('if (screen == Screen::Title) DrawText("PRESS ENTER", 300, 200, 30, DARKGRAY);'), rule('if (screen == Screen::Playing) DrawText("PLAYING", 300, 200, 30, DARKGRAY);')]) }),
    ] },
  ]);
})();
