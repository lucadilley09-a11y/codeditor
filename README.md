# Codeditor ✒️ — a code editor that teaches you to code

Codeditor is a browser-based code editor for 20+ languages with interactive lessons, a live tutor, and a big set of quality-of-life extensions. It runs entirely in your browser and can be installed as an app.

**Open it:** https://lucadilley09-a11y.github.io/codeditor/

## Features

**Editor**
- Monaco engine (the editor inside VS Code): IntelliSense, multi-cursor, find & replace, code folding, live TypeScript type checking
- Syntax highlighting for HTML, CSS, SCSS, JavaScript, TypeScript, Python, JSON, Markdown, C, C++, C#, Java, Rust, Go, Lua, SQL, PHP, Ruby, Kotlin, Swift, Shell, YAML, XML
- A built-in lightweight editor takes over when you're offline
- Multiple projects, folders, drag-and-drop import, rename/duplicate/delete, .zip export, and full backup/restore
- Command palette (`Ctrl+Shift+P`), quick open (`Ctrl+P`), project-wide search & replace, Zen mode
- 7 themes, resizable panels, adjustable font size and tab size

**Run code**
- HTML/CSS/JS: live preview with device sizes (phone, tablet, laptop) and console capture
- JavaScript & TypeScript: run in a sandboxed worker, with a Stop button for runaway loops
- Python: real CPython (Pyodide) running in the browser. Popular packages like numpy load automatically, and `input()` is supported.

**Learn**
- Courses: HTML, CSS, JavaScript, TypeScript, Python, Interactive Web Pages (DOM), Game Dev with Canvas
- Language tours: C, C++, Java, C#, Rust, Go, Lua, SQL
- Lessons mix short explanations, quizzes, "predict the output" questions and coding challenges that check your work instantly
- Hints, solutions, XP, levels, day streaks and 18 badges
- **Live Tutor:** explains whatever keyword, tag or property is under your cursor
- **Error explainer:** turns error messages into plain English with steps to fix them

**Extensions (each can be turned on or off)**
Bracket Pair Colorizer, Indent Guides, Sticky Scroll, Minimap, Smooth Caret, Color Preview & Picker, Render Whitespace, Emmet, Auto Close Tag, Path IntelliSense, Snippet Pack, Learning Hover Tips, TODO Highlighter, Error Lens, Bookmarks, Format on Save, Trim Trailing Whitespace, Run on Save, Word Count, Focus Timer, Power Mode, Typewriter Clicks

## Keyboard shortcuts
| Action | Keys |
|---|---|
| Run | `Ctrl+Enter` |
| Command palette | `Ctrl+Shift+P` / `F1` |
| Go to file | `Ctrl+P` |
| Save | `Ctrl+S` |
| Toggle sidebar / console / right panel | `Ctrl+B` / `Ctrl+J` / `Ctrl+Alt+B` |
| Search all files | `Ctrl+Shift+F` |
| Format document | `Shift+Alt+F` |
| Zen mode | `Ctrl+K Z` |
| Bookmarks | `Ctrl+Alt+K` toggle, `Ctrl+Alt+L` / `Ctrl+Alt+J` jump |
| All shortcuts | `Ctrl+K Ctrl+S` |

## Tech
Plain HTML, CSS and JavaScript with no build step. The Monaco editor and Pyodide load from jsDelivr. Everything you make is saved in your browser's localStorage. A service worker caches the app so it opens offline.
