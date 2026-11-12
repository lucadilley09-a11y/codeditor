/* Codeditor — round 5: more Lua lessons, mostly Roblox (Luau). Reviewed, not executed. */
(() => {
  const { tip, pre, read, quiz, predict, code, review: R, extend } = Q.kit;
  const { rule } = Q.gen;
  const has = (re, msg) => [re, msg];
  const conn = (obj, ev, msg) => has(new RegExp(`${obj.replace('.', '\\.')}\\.${ev}\\s*:\\s*Connect\\s*\\(\\s*function`), msg || `Connect to <code>${obj}.${ev}</code> with <code>:Connect(function(…)</code>.`);

  /* ---------------- core Lua ---------------- */
  extend('lua', 'math', [
    { id: 'strings', title: 'Strings: joining & tools', xp: 25, recap: 'Join text with <code>..</code>; <code>#s</code> is the length; <code>string.upper</code>, <code>string.sub</code>, <code>string.format</code> help a lot.', steps: [
      read('Text in Lua', `${pre('local name = "Nova"\nprint("Hello, " .. name .. "!")    -- join with ..\nprint(#name)                       -- 4 (length)\nprint(string.upper(name))          -- NOVA\nprint(string.sub(name, 1, 2))      -- No\nprint(string.format("%s has %d coins", name, 12))')}${tip('Lua uses <code>..</code> to join text. <code>+</code> is only for numbers.')}`),
      predict('local a = "Level "\nlocal b = 3\nprint(a .. b .. "!")', ['Level 3!', 'Level3!', 'Error', 'Level + 3!'], 0),
      code({ task: 'Make <code>local msg</code> by joining <code>"Coins: "</code> and <code>coins</code>, then <code>print(msg)</code>.', starter: 'local coins = 42\n', hints: ['<code>local msg = "Coins: " .. coins</code>'],
        solution: 'local coins = 42\nlocal msg = "Coins: " .. coins\nprint(msg)\n',
        check: R([rule('local msg = "Coins: " .. coins'), rule('print(msg)')]) }),
      code({ task: 'Print the name in capitals with <code>string.upper(hero)</code>, then print its length with <code>#hero</code>.', starter: 'local hero = "pip"\n', hints: ['Two print lines.'],
        solution: 'local hero = "pip"\nprint(string.upper(hero))\nprint(#hero)\n',
        check: R([has(/print\s*\(\s*(string\.upper\s*\(\s*hero\s*\)|hero\s*:\s*upper\s*\(\s*\))\s*\)/, 'Print <code>string.upper(hero)</code>.'), rule('print(#hero)')]) }),
    ] },
  ]);
  extend('lua', 'while', [
    { id: 'forloops', title: 'Numeric for loops', xp: 25, recap: '<code>for i = 1, 10 do … end</code> counts up; add a third number to step: <code>for i = 10, 1, -1 do</code>.', steps: [
      read('Counting loops', `${pre('for i = 1, 3 do\n    print(i)        -- 1, 2, 3\nend\n\nfor i = 10, 0, -5 do\n    print(i)        -- 10, 5, 0\nend')}<p>Both ends are <b>included</b>. The third number is the step.</p>`),
      predict('local total = 0\nfor i = 1, 4 do\n    total = total + i\nend\nprint(total)', ['4', '10', '6', '9'], 1),
      code({ task: 'Count down from <b>5</b> to <b>1</b> with a numeric <code>for</code> loop, printing each number.', starter: '', hints: ['<code>for i = 5, 1, -1 do</code>'],
        solution: 'for i = 5, 1, -1 do\n    print(i)\nend\n',
        check: R([has(/for\s+(\w+)\s*=\s*5\s*,\s*1\s*,\s*-1\s+do\s+print\s*\(\s*\1\s*\)\s+end/, 'Use <code>for i = 5, 1, -1 do print(i) end</code>.')]) }),
    ] },
  ]);
  extend('lua', 'functions', [
    { id: 'scope', title: 'local, scope & returning values', xp: 30, recap: 'Always use <code>local</code>. Functions can return several values: <code>return x, y</code>.', steps: [
      read('Keep variables local', `<p>Without <code>local</code>, a variable is <b>global</b> — every script can change it, which causes weird bugs. Roblox scripts should almost always use <code>local</code>:</p>${pre('local speed = 16          -- good\nscore = 0                 -- global, avoid')}<p>Functions can hand back <b>several</b> values:</p>${pre('local function minMax(a, b)\n    if a < b then return a, b end\n    return b, a\nend\n\nlocal lo, hi = minMax(9, 4)   -- lo = 4, hi = 9')}`),
      quiz('Why use <code>local</code> for variables?', ['It’s faster to type', 'Other scripts can’t accidentally change them', 'Globals don’t work in Roblox', 'It saves them'], 1),
      code({ task: 'Write <code>local function center(x, y)</code> that returns <b>x / 2</b> and <b>y / 2</b>, then store them with <code>local cx, cy = center(800, 600)</code>.', starter: '', hints: ['<code>return x / 2, y / 2</code>'],
        solution: 'local function center(x, y)\n    return x / 2, y / 2\nend\n\nlocal cx, cy = center(800, 600)\n',
        check: R([rule('local function center(x, y)'), rule('return x / 2, y / 2'), rule('local cx, cy = center(800, 600)')]) }),
    ] },
  ]);

  /* ---------------- Roblox ---------------- */
  extend('lua', 'roblox', [
    { id: 'services', title: 'Roblox: services & workspace', xp: 30, recap: 'Get services with <code>game:GetService("Players")</code>. The 3D world is <code>workspace</code>.', steps: [
      read('The Roblox game tree', `<p>Everything in a Roblox game lives in a tree under <code>game</code>. The big branches are <b>services</b>:</p>${pre('local Players = game:GetService("Players")\nlocal ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal TweenService = game:GetService("TweenService")\n\nprint(workspace.Baseplate)    -- workspace = the 3D world')}${tip('Use <code>GetService</code> rather than <code>game.Players</code> — it always works, even for services that haven’t loaded yet.')}`),
      quiz('What does <code>:</code> in <code>game:GetService("Players")</code> mean?', ['It’s a typo', 'Call a method on game (passing game itself)', 'Get a property', 'Make a comment'], 1),
      code({ task: 'Get the <b>Players</b> and <b>Lighting</b> services into locals with <code>GetService</code>.', starter: '', hints: ['<code>local Lighting = game:GetService("Lighting")</code>'],
        solution: 'local Players = game:GetService("Players")\nlocal Lighting = game:GetService("Lighting")\n',
        check: R([rule('local Players = game:GetService("Players")'), rule('local Lighting = game:GetService("Lighting")')]) }),
      code({ task: 'Make it night: set <code>Lighting.ClockTime</code> to <b>0</b>.', keep: true, hints: ['<code>Lighting.ClockTime = 0</code>'],
        solution: 'local Players = game:GetService("Players")\nlocal Lighting = game:GetService("Lighting")\nLighting.ClockTime = 0\n',
        check: R([rule('Lighting.ClockTime = 0')]) }),
    ] },
    { id: 'instances', title: 'Roblox: creating parts', xp: 35, recap: '<code>Instance.new("Part")</code>, set properties, then set <code>.Parent = workspace</code> last.', steps: [
      read('Making things with code', `${pre('local part = Instance.new("Part")\npart.Name = "Platform"\npart.Size = Vector3.new(8, 1, 8)\npart.Position = Vector3.new(0, 10, 0)\npart.Anchored = true                -- don’t fall\npart.BrickColor = BrickColor.new("Bright blue")\npart.Parent = workspace             -- now it appears')}${tip('Set <code>Parent</code> last — it’s faster, and the part appears already set up.')}`),
      quiz('A part you made falls through the map instantly. What did you probably forget?', ['part.Parent = workspace', 'part.Anchored = true', 'part.Size', 'part.Name'], 1),
      code({ task: 'Create a part named <b>"Lava"</b>, size <b>10, 1, 10</b>, anchored, colored <code>BrickColor.new("Really red")</code>, and parent it to <code>workspace</code>.', starter: '', hints: ['Start with <code>local lava = Instance.new("Part")</code>'],
        solution: 'local lava = Instance.new("Part")\nlava.Name = "Lava"\nlava.Size = Vector3.new(10, 1, 10)\nlava.Anchored = true\nlava.BrickColor = BrickColor.new("Really red")\nlava.Parent = workspace\n',
        check: R([has(/local\s+(\w+)\s*=\s*Instance\.new\s*\(\s*"Part"\s*\)/, 'Create it with <code>local lava = Instance.new("Part")</code>.'), has(/\.Name\s*=\s*"Lava"/, 'Name it <b>"Lava"</b>.'), has(/\.Size\s*=\s*Vector3\.new\s*\(\s*10\s*,\s*1\s*,\s*10\s*\)/, 'Size: <code>Vector3.new(10, 1, 10)</code>'), has(/\.Anchored\s*=\s*true/, 'Anchor it.'), has(/\.BrickColor\s*=\s*BrickColor\.new\s*\(\s*"Really red"\s*\)/, 'Color it <code>BrickColor.new("Really red")</code>.'), has(/\.Parent\s*=\s*workspace/, 'Parent it to <code>workspace</code>.')]) }),
      code({ task: 'Use a <code>for</code> loop to make <b>5</b> anchored parts in a row, each at <code>Vector3.new(i * 6, 5, 0)</code>.', starter: '', hints: ['Put the Instance.new code inside <code>for i = 1, 5 do … end</code>'],
        solution: 'for i = 1, 5 do\n    local step = Instance.new("Part")\n    step.Anchored = true\n    step.Position = Vector3.new(i * 6, 5, 0)\n    step.Parent = workspace\nend\n',
        check: R([has(/for\s+i\s*=\s*1\s*,\s*5\s+do/, 'Loop with <code>for i = 1, 5 do</code>.'), has(/Instance\.new\s*\(\s*"Part"\s*\)/, 'Create a part inside the loop.'), has(/\.Position\s*=\s*Vector3\.new\s*\(\s*i\s*\*\s*6\s*,\s*5\s*,\s*0\s*\)/, 'Position: <code>Vector3.new(i * 6, 5, 0)</code>'), has(/\.Anchored\s*=\s*true/, 'Anchor each part.'), has(/\.Parent\s*=\s*workspace/, 'Parent each part to workspace.')]) }),
    ] },
    { id: 'cframe', title: 'Roblox: Vector3 & CFrame', xp: 35, recap: '<code>Vector3</code> is a position or size. <code>CFrame</code> is position <i>and</i> rotation: <code>CFrame.new(pos) * CFrame.Angles(0, math.rad(90), 0)</code>.', steps: [
      read('Position vs CFrame', `${pre('part.Position = Vector3.new(0, 20, 0)                 -- just where\npart.CFrame = CFrame.new(0, 20, 0)                    -- where (and facing)\npart.CFrame = part.CFrame * CFrame.Angles(0, math.rad(45), 0)  -- turn 45°')}<p>Angles in Roblox are <b>radians</b>, so use <code>math.rad(degrees)</code>.</p>`),
      quiz('How do you turn a part 90° around the Y axis?', ['part.Rotation = 90', 'part.CFrame = part.CFrame * CFrame.Angles(0, math.rad(90), 0)', 'part.CFrame + 90', 'part:Rotate(90)'], 1),
      code({ task: 'Write a loop that spins <code>part</code> forever: each time, multiply its CFrame by <code>CFrame.Angles(0, math.rad(5), 0)</code>, then <code>task.wait()</code>.', starter: 'local part = workspace.Spinner\n', hints: ['<code>while true do … end</code>'],
        solution: 'local part = workspace.Spinner\nwhile true do\n    part.CFrame = part.CFrame * CFrame.Angles(0, math.rad(5), 0)\n    task.wait()\nend\n',
        check: R([rule('while true do'), rule('part.CFrame = part.CFrame * CFrame.Angles(0, math.rad(5), 0)'), has(/task\.wait\s*\(/, 'Add <code>task.wait()</code> so the loop doesn’t freeze the game.')]) }),
    ] },
    { id: 'touched', title: 'Roblox: Touched & debounce', xp: 40, recap: '<code>part.Touched:Connect(function(hit) … end)</code>. Find the player with <code>hit.Parent:FindFirstChild("Humanoid")</code>. Use a debounce so it fires once.', steps: [
      read('When something touches a part', `${pre('local lava = workspace.Lava\n\nlava.Touched:Connect(function(hit)\n    local humanoid = hit.Parent:FindFirstChild("Humanoid")\n    if humanoid then\n        humanoid.Health = 0\n    end\nend)')}<p><code>hit</code> is the body part that touched (like a foot) — its <b>Parent</b> is the character model.</p>`),
      quiz('Why check <code>if humanoid then</code>?', ['To make it faster', 'Not everything that touches is a character — hit might be another part', 'Humanoid is always nil', 'Roblox requires it'], 1),
      code({ task: 'Make <code>pad</code> heal: when touched by a character, set <code>humanoid.Health = humanoid.MaxHealth</code>.', starter: 'local pad = workspace.HealPad\n', hints: ['Use <code>pad.Touched:Connect(function(hit) … end)</code>'],
        solution: 'local pad = workspace.HealPad\npad.Touched:Connect(function(hit)\n    local humanoid = hit.Parent:FindFirstChild("Humanoid")\n    if humanoid then\n        humanoid.Health = humanoid.MaxHealth\n    end\nend)\n',
        check: R([conn('pad', 'Touched'), rule('local humanoid = hit.Parent:FindFirstChild("Humanoid")'), rule('if humanoid then'), rule('humanoid.Health = humanoid.MaxHealth')]) }),
      read('Debounce', `<p>Touched fires <b>many times</b> a second while a foot rests on the part. A <b>debounce</b> lets the code run once, then waits:</p>${pre('local busy = false\npad.Touched:Connect(function(hit)\n    if busy then return end\n    busy = true\n    -- do the thing once\n    task.wait(2)\n    busy = false\nend)')}`),
      code({ task: 'Add a debounce: a <code>local busy = false</code>, return early when busy, set it to true, and after <code>task.wait(3)</code> set it back to false.', keep: true, hints: ['<code>if busy then return end</code> goes first inside the function.'],
        solution: 'local pad = workspace.HealPad\nlocal busy = false\npad.Touched:Connect(function(hit)\n    if busy then return end\n    local humanoid = hit.Parent:FindFirstChild("Humanoid")\n    if humanoid then\n        busy = true\n        humanoid.Health = humanoid.MaxHealth\n        task.wait(3)\n        busy = false\n    end\nend)\n',
        check: R([rule('local busy = false'), rule('if busy then return end'), rule('busy = true'), rule('task.wait(3)'), has(/task\.wait\s*\(\s*3\s*\)[\s\S]*busy\s*=\s*false/, 'Set <code>busy = false</code> after waiting.')]) }),
    ] },
    { id: 'clicks', title: 'Roblox: ClickDetector', xp: 30, recap: 'Put a <b>ClickDetector</b> in a part; <code>detector.MouseClick:Connect(function(player) … end)</code> tells you who clicked.', steps: [
      read('Clickable parts', `${pre('local button = workspace.Button\nlocal detector = button.ClickDetector\n\ndetector.MouseClick:Connect(function(player)\n    print(player.Name .. " clicked!")\nend)')}<p>The function receives the <b>player</b> who clicked — handy for giving them rewards.</p>`),
      quiz('What does MouseClick pass to your function?', ['The mouse position', 'The player who clicked', 'The part', 'Nothing'], 1),
      code({ task: 'When <code>detector</code> is clicked, change <code>door.Transparency</code> to <b>1</b> and <code>door.CanCollide</code> to <b>false</b> (open the door).', starter: 'local door = workspace.Door\nlocal detector = workspace.DoorButton.ClickDetector\n', hints: ['<code>detector.MouseClick:Connect(function(player) … end)</code>'],
        solution: 'local door = workspace.Door\nlocal detector = workspace.DoorButton.ClickDetector\ndetector.MouseClick:Connect(function(player)\n    door.Transparency = 1\n    door.CanCollide = false\nend)\n',
        check: R([conn('detector', 'MouseClick'), rule('door.Transparency = 1'), rule('door.CanCollide = false')]) }),
    ] },
    { id: 'prompts', title: 'Roblox: ProximityPrompt', xp: 30, recap: 'A <b>ProximityPrompt</b> shows “Press E”. Use <code>prompt.Triggered:Connect(function(player) … end)</code>.', steps: [
      read('Press E to interact', `<p>Put a <b>ProximityPrompt</b> inside a part and Roblox shows a key hint when players get close:</p>${pre('local prompt = workspace.Chest.ProximityPrompt\nprompt.ActionText = "Open"\nprompt.HoldDuration = 1    -- hold E for 1 second\n\nprompt.Triggered:Connect(function(player)\n    print(player.Name .. " opened the chest")\nend)')}`),
      quiz('Which event fires when the player finishes using a ProximityPrompt?', ['Touched', 'Triggered', 'MouseClick', 'Activated'], 1),
      code({ task: 'Set <code>prompt.ActionText</code> to <b>"Buy"</b>, and when triggered, give the player <b>Coins</b>: <code>player.leaderstats.Coins.Value -= 10</code>.', starter: 'local prompt = workspace.Shop.ProximityPrompt\n', hints: ['<code>prompt.Triggered:Connect(function(player) … end)</code>'],
        solution: 'local prompt = workspace.Shop.ProximityPrompt\nprompt.ActionText = "Buy"\nprompt.Triggered:Connect(function(player)\n    player.leaderstats.Coins.Value -= 10\nend)\n',
        check: R([rule('prompt.ActionText = "Buy"'), conn('prompt', 'Triggered'), has(/player\.leaderstats\.Coins\.Value\s*(-=\s*10|=\s*player\.leaderstats\.Coins\.Value\s*-\s*10)/, 'Subtract 10 from <code>player.leaderstats.Coins.Value</code>.')]) }),
    ] },
    { id: 'tweens', title: 'Roblox: TweenService', xp: 35, recap: '<code>TweenService:Create(part, TweenInfo.new(seconds), { Position = … }):Play()</code> animates smoothly.', steps: [
      read('Smooth movement', `${pre('local TweenService = game:GetService("TweenService")\nlocal info = TweenInfo.new(2)   -- 2 seconds\nlocal goal = { Position = Vector3.new(0, 30, 0) }\n\nlocal tween = TweenService:Create(part, info, goal)\ntween:Play()')}<p>Tweens can animate almost any property: <code>Transparency</code>, <code>Size</code>, <code>Color</code>, <code>CFrame</code>…</p>`),
      quiz('A tween was created but nothing moves. What’s missing?', ['tween:Play()', 'task.wait()', 'part.Anchored = false', 'TweenInfo.new()'], 0),
      code({ task: 'Tween <code>platform</code> to <code>Vector3.new(0, 25, 0)</code> over <b>3</b> seconds.', starter: 'local TweenService = game:GetService("TweenService")\nlocal platform = workspace.Lift\n', hints: ['<code>TweenService:Create(platform, TweenInfo.new(3), { Position = Vector3.new(0, 25, 0) }):Play()</code>'],
        solution: 'local TweenService = game:GetService("TweenService")\nlocal platform = workspace.Lift\nlocal tween = TweenService:Create(platform, TweenInfo.new(3), { Position = Vector3.new(0, 25, 0) })\ntween:Play()\n',
        check: R([has(/TweenService\s*:\s*Create\s*\(\s*platform\s*,\s*TweenInfo\.new\s*\(\s*3\s*\)\s*,\s*\{\s*Position\s*=\s*Vector3\.new\s*\(\s*0\s*,\s*25\s*,\s*0\s*\)\s*\}\s*\)/, 'Create it with <code>TweenService:Create(platform, TweenInfo.new(3), { Position = Vector3.new(0, 25, 0) })</code>.'), has(/:\s*Play\s*\(\s*\)/, 'Start it with <code>:Play()</code>.')]) }),
    ] },
  ]);
  extend('lua', 'leaderstats', [
    { id: 'humanoid', title: 'Roblox: characters & Humanoid', xp: 35, recap: '<code>player.CharacterAdded:Connect(function(char) … end)</code>; the <code>Humanoid</code> has <code>Health</code>, <code>WalkSpeed</code>, <code>JumpPower</code> and a <code>Died</code> event.', steps: [
      read('Every character has a Humanoid', `${pre('Players.PlayerAdded:Connect(function(player)\n    player.CharacterAdded:Connect(function(character)\n        local humanoid = character:WaitForChild("Humanoid")\n        humanoid.WalkSpeed = 24\n        humanoid.Died:Connect(function()\n            print(player.Name .. " fell!")\n        end)\n    end)\nend)')}${tip('Use <code>WaitForChild</code> — the Humanoid might not exist yet the instant the character appears.')}`),
      quiz('Why <code>character:WaitForChild("Humanoid")</code> instead of <code>character.Humanoid</code>?', ['It’s shorter', 'The Humanoid may not have loaded yet', 'Humanoid is private', 'It heals the player'], 1),
      code({ task: 'When a character spawns, get its Humanoid with <code>WaitForChild</code> and set <code>JumpPower</code> to <b>80</b>.', starter: 'local Players = game:GetService("Players")\n\nPlayers.PlayerAdded:Connect(function(player)\n\nend)\n', hints: ['Inside: <code>player.CharacterAdded:Connect(function(character) … end)</code>'],
        solution: 'local Players = game:GetService("Players")\n\nPlayers.PlayerAdded:Connect(function(player)\n    player.CharacterAdded:Connect(function(character)\n        local humanoid = character:WaitForChild("Humanoid")\n        humanoid.JumpPower = 80\n    end)\nend)\n',
        check: R([conn('player', 'CharacterAdded'), rule('local humanoid = character:WaitForChild("Humanoid")'), rule('humanoid.JumpPower = 80')]) }),
    ] },
    { id: 'remotes', title: 'Roblox: RemoteEvents', xp: 45, recap: 'Client → server: <code>remote:FireServer(data)</code> and <code>remote.OnServerEvent:Connect(function(player, data) … end)</code>. Never trust the client blindly.', steps: [
      read('Talking between client and server', `<p>LocalScripts run on each player’s device; Scripts run on the server. They talk through a <b>RemoteEvent</b> in ReplicatedStorage:</p>${pre('-- LocalScript (client)\nremote:FireServer("sword")\n\n-- Script (server)\nremote.OnServerEvent:Connect(function(player, item)\n    print(player.Name .. " wants " .. item)\nend)')}${tip('The server gets <code>player</code> automatically as the first argument. Always check requests on the server — exploiters can send anything.')}`),
      quiz('On the server, what is the <b>first</b> argument of an OnServerEvent function?', ['The data sent', 'The player who fired it', 'The RemoteEvent', 'Nothing'], 1),
      code({ task: 'Server: get <code>BuyEvent</code> from ReplicatedStorage with <code>WaitForChild</code>, and when it fires, print <code>player.Name .. " bought " .. item</code>.', starter: 'local ReplicatedStorage = game:GetService("ReplicatedStorage")\n', hints: ['<code>local buy = ReplicatedStorage:WaitForChild("BuyEvent")</code>'],
        solution: 'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal buy = ReplicatedStorage:WaitForChild("BuyEvent")\n\nbuy.OnServerEvent:Connect(function(player, item)\n    print(player.Name .. " bought " .. item)\nend)\n',
        check: R([has(/local\s+(\w+)\s*=\s*ReplicatedStorage\s*:\s*WaitForChild\s*\(\s*"BuyEvent"\s*\)/, 'Get it with <code>ReplicatedStorage:WaitForChild("BuyEvent")</code>.'), has(/\.OnServerEvent\s*:\s*Connect\s*\(\s*function\s*\(\s*player\s*,\s*item\s*\)/, 'Connect <code>OnServerEvent</code> with <code>function(player, item)</code>.'), rule('print(player.Name .. " bought " .. item)')]) }),
      code({ task: 'Client: write the LocalScript side — get the same event and call <code>FireServer("shield")</code>.', starter: 'local ReplicatedStorage = game:GetService("ReplicatedStorage")\n', hints: ['<code>buy:FireServer("shield")</code>'],
        solution: 'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal buy = ReplicatedStorage:WaitForChild("BuyEvent")\nbuy:FireServer("shield")\n',
        check: R([has(/ReplicatedStorage\s*:\s*WaitForChild\s*\(\s*"BuyEvent"\s*\)/, 'Get the event with <code>WaitForChild("BuyEvent")</code>.'), has(/\w+\s*:\s*FireServer\s*\(\s*"shield"\s*\)/, 'Fire it: <code>buy:FireServer("shield")</code>.')]) }),
    ] },
    { id: 'guis', title: 'Roblox: GUIs & LocalScripts', xp: 40, recap: 'GUIs live in <code>StarterGui</code>; change them from a LocalScript. <code>button.Activated:Connect(…)</code> handles clicks and taps.', steps: [
      read('On-screen UI', `<p>A <b>ScreenGui</b> in StarterGui is copied into each player’s <code>PlayerGui</code>. A LocalScript inside it can update text and react to buttons:</p>${pre('local label = script.Parent.ScoreLabel\nlocal button = script.Parent.PlayButton\n\nlabel.Text = "Score: 0"\nbutton.Activated:Connect(function()\n    label.Text = "Let’s go!"\nend)')}${tip('<code>Activated</code> works for mouse clicks <b>and</b> touch taps — better than MouseButton1Click.')}`),
      quiz('Where should code that changes a player’s GUI run?', ['A server Script', 'A LocalScript', 'A ModuleScript in ServerStorage', 'The command bar'], 1),
      code({ task: 'When <code>button</code> is activated, add 1 to <code>clicks</code> and show it in <code>label.Text</code> as <b>"Clicks: "</b> .. clicks.', starter: 'local label = script.Parent.Label\nlocal button = script.Parent.Button\nlocal clicks = 0\n', hints: ['<code>button.Activated:Connect(function() … end)</code>'],
        solution: 'local label = script.Parent.Label\nlocal button = script.Parent.Button\nlocal clicks = 0\nbutton.Activated:Connect(function()\n    clicks += 1\n    label.Text = "Clicks: " .. clicks\nend)\n',
        check: R([conn('button', 'Activated'), has(/clicks\s*(\+=\s*1|=\s*clicks\s*\+\s*1)/, 'Add 1 to <code>clicks</code>.'), rule('label.Text = "Clicks: " .. clicks')]) }),
    ] },
    { id: 'datastores', title: 'Roblox: saving with DataStores', xp: 45, recap: '<code>DataStoreService:GetDataStore("Coins")</code>, then <code>store:GetAsync(key)</code> / <code>store:SetAsync(key, value)</code> wrapped in <code>pcall</code>.', steps: [
      read('Keep progress between visits', `${pre('local DataStoreService = game:GetService("DataStoreService")\nlocal coinStore = DataStoreService:GetDataStore("Coins")\n\n-- load\nlocal ok, saved = pcall(function()\n    return coinStore:GetAsync(player.UserId)\nend)\n\n-- save\npcall(function()\n    coinStore:SetAsync(player.UserId, coins.Value)\nend)')}${tip('DataStore calls can fail (network!), so always wrap them in <code>pcall</code>. Use <code>player.UserId</code> as the key — names can change.')}`),
      quiz('Why wrap DataStore calls in <code>pcall</code>?', ['To make them faster', 'They can fail, and pcall stops the error from breaking your script', 'Roblox requires pcall for everything', 'To encrypt the data'], 1),
      code({ task: 'Get a DataStore named <b>"Wins"</b>. In <code>PlayerRemoving</code>, save <code>player.leaderstats.Wins.Value</code> using <code>SetAsync(player.UserId, …)</code> inside <code>pcall</code>.', starter: 'local Players = game:GetService("Players")\nlocal DataStoreService = game:GetService("DataStoreService")\n', hints: ['<code>Players.PlayerRemoving:Connect(function(player) pcall(function() … end) end)</code>'],
        solution: 'local Players = game:GetService("Players")\nlocal DataStoreService = game:GetService("DataStoreService")\nlocal winStore = DataStoreService:GetDataStore("Wins")\n\nPlayers.PlayerRemoving:Connect(function(player)\n    pcall(function()\n        winStore:SetAsync(player.UserId, player.leaderstats.Wins.Value)\n    end)\nend)\n',
        check: R([has(/local\s+(\w+)\s*=\s*DataStoreService\s*:\s*GetDataStore\s*\(\s*"Wins"\s*\)/, 'Get the store with <code>DataStoreService:GetDataStore("Wins")</code>.'), conn('Players', 'PlayerRemoving'), has(/pcall\s*\(\s*function/, 'Wrap the save in <code>pcall(function() … end)</code>.'), has(/:\s*SetAsync\s*\(\s*player\.UserId\s*,\s*player\.leaderstats\.Wins\.Value\s*\)/, 'Save with <code>SetAsync(player.UserId, player.leaderstats.Wins.Value)</code>.')]) }),
    ] },
    { id: 'modules', title: 'Roblox: ModuleScripts', xp: 40, recap: 'A ModuleScript returns a table: <code>local M = {} … return M</code>. Use it with <code>require(path)</code>.', steps: [
      read('Share code between scripts', `${pre('-- ModuleScript "Shop" in ReplicatedStorage\nlocal Shop = {}\nShop.prices = { sword = 100, shield = 60 }\n\nfunction Shop.canAfford(coins, item)\n    return coins >= Shop.prices[item]\nend\n\nreturn Shop')}${pre('-- any other script\nlocal Shop = require(game.ReplicatedStorage.Shop)\nprint(Shop.canAfford(80, "shield"))   -- true')}`),
      quiz('A ModuleScript must end with…', ['end', 'return the table', 'print()', 'nothing special'], 1),
      code({ task: 'Write a ModuleScript: <code>local Stats = {}</code>, a function <code>Stats.damage(level)</code> returning <code>level * 5 + 10</code>, and <code>return Stats</code>.', starter: '', hints: ['<code>function Stats.damage(level) return level * 5 + 10 end</code>'],
        solution: 'local Stats = {}\n\nfunction Stats.damage(level)\n    return level * 5 + 10\nend\n\nreturn Stats\n',
        check: R([rule('local Stats = {}'), rule('function Stats.damage(level)'), rule('return level * 5 + 10'), has(/return\s+Stats\s*$/, 'End with <code>return Stats</code>.')]) }),
    ] },
    { id: 'tasklib', title: 'Roblox: the task library', xp: 30, recap: '<code>task.wait(s)</code> pauses, <code>task.spawn(fn)</code> runs alongside, <code>task.delay(s, fn)</code> runs later. They replace old <code>wait</code>/<code>spawn</code>/<code>delay</code>.', steps: [
      read('Timing things', `${pre('task.wait(2)                         -- pause this script 2 seconds\n\ntask.delay(5, function()             -- run in 5 seconds, don’t wait for it\n    print("Boom!")\nend)\n\ntask.spawn(function()                -- run right now, alongside\n    while true do\n        print("tick")\n        task.wait(1)\n    end\nend)')}`),
      quiz('You want a bomb to explode in 3 seconds without pausing the rest of your script. Use…', ['task.wait(3)', 'task.delay(3, explode)', 'wait(3)', 'task.spawn(3)'], 1),
      code({ task: 'Use <code>task.delay(10, …)</code> to set <code>gate.Transparency = 1</code> after 10 seconds.', starter: 'local gate = workspace.Gate\n', hints: ['<code>task.delay(10, function() gate.Transparency = 1 end)</code>'],
        solution: 'local gate = workspace.Gate\ntask.delay(10, function()\n    gate.Transparency = 1\nend)\n',
        check: R([has(/task\.delay\s*\(\s*10\s*,\s*function\s*\(\s*\)/, 'Use <code>task.delay(10, function() … end)</code>.'), rule('gate.Transparency = 1')]) }),
    ] },
    { id: 'cloning', title: 'Roblox: cloning from storage', xp: 35, recap: 'Keep templates in <code>ServerStorage</code>, copy with <code>:Clone()</code>, then set Parent. Clean up with <code>:Destroy()</code> or <code>Debris:AddItem</code>.', steps: [
      read('Spawning enemies and coins', `${pre('local ServerStorage = game:GetService("ServerStorage")\nlocal coinTemplate = ServerStorage.Coin\n\nlocal coin = coinTemplate:Clone()\ncoin.Position = Vector3.new(math.random(-50, 50), 5, math.random(-50, 50))\ncoin.Parent = workspace')}<p>Remove things later with <code>coin:Destroy()</code>, or automatically: <code>game:GetService("Debris"):AddItem(coin, 10)</code>.</p>`),
      quiz('Why keep templates in ServerStorage instead of workspace?', ['They load faster', 'They don’t appear in the game until you clone them', 'Clone only works there', 'Players can’t see workspace'], 1),
      code({ task: 'Every <b>5</b> seconds (forever), clone <code>ServerStorage.Zombie</code>, set its Parent to <code>workspace</code>.', starter: 'local ServerStorage = game:GetService("ServerStorage")\n', hints: ['<code>while true do … task.wait(5) end</code>'],
        solution: 'local ServerStorage = game:GetService("ServerStorage")\nwhile true do\n    local zombie = ServerStorage.Zombie:Clone()\n    zombie.Parent = workspace\n    task.wait(5)\nend\n',
        check: R([rule('while true do'), has(/local\s+(\w+)\s*=\s*ServerStorage\.Zombie\s*:\s*Clone\s*\(\s*\)/, 'Clone it: <code>local zombie = ServerStorage.Zombie:Clone()</code>.'), has(/\.Parent\s*=\s*workspace/, 'Set the clone’s Parent to workspace.'), rule('task.wait(5)')]) }),
    ] },
  ]);
})();
