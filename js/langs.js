/* Quill — language registry */
(() => {
  const C = 'abstract as async await break case catch class const continue default delete do else enum export extends false final finally for from function if implements import in instanceof interface let new null of package private protected public return static super switch this throw true try typeof var void while with yield';
  const L = [
    { id: 'html', name: 'HTML', exts: ['html', 'htm'], badge: 'HTML', color: '#f97316', run: 'web', comment: { block: ['<!--', '-->'] } },
    { id: 'css', name: 'CSS', exts: ['css'], badge: 'CSS', color: '#3b82f6', run: 'web', comment: { block: ['/*', '*/'] }, kw: 'important media keyframes import from to root hover focus active before after' },
    { id: 'scss', name: 'SCSS', exts: ['scss'], badge: 'SCSS', color: '#ec4899', comment: { line: '//', block: ['/*', '*/'] }, kw: 'mixin include extend if else each for function return use' },
    { id: 'javascript', name: 'JavaScript', exts: ['js', 'mjs', 'cjs', 'jsx'], badge: 'JS', color: '#facc15', run: 'js', comment: { line: '//', block: ['/*', '*/'] }, kw: C + ' console document window' },
    { id: 'typescript', name: 'TypeScript', exts: ['ts', 'tsx'], badge: 'TS', color: '#3b82f6', run: 'ts', comment: { line: '//', block: ['/*', '*/'] }, kw: C + ' type number string boolean any unknown never readonly keyof declare namespace' },
    { id: 'python', name: 'Python', exts: ['py', 'pyw'], badge: 'PY', color: '#60a5fa', run: 'py', comment: { line: '#' }, kw: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield print range len input int str float list dict set tuple self' },
    { id: 'json', name: 'JSON', exts: ['json', 'jsonc'], badge: '{ }', color: '#a3a3a3', comment: { line: '//' }, kw: 'true false null' },
    { id: 'markdown', name: 'Markdown', exts: ['md', 'markdown'], badge: 'MD', color: '#94a3b8', comment: { block: ['<!--', '-->'] } },
    { id: 'c', name: 'C', exts: ['c', 'h'], badge: 'C', color: '#94a3b8', comment: { line: '//', block: ['/*', '*/'] }, kw: 'auto break case char const continue default do double else enum extern float for goto if include define int long register return short signed sizeof static struct switch typedef union unsigned void volatile while printf scanf main NULL' },
    { id: 'cpp', name: 'C++', exts: ['cpp', 'cc', 'cxx', 'hpp'], badge: 'C++', color: '#38bdf8', comment: { line: '//', block: ['/*', '*/'] }, kw: 'auto bool break case catch char class const constexpr continue default delete do double else enum explicit false float for friend if include inline int long namespace new nullptr operator private protected public return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void while std cout cin endl string vector main' },
    { id: 'csharp', name: 'C#', exts: ['cs'], badge: 'C#', color: '#a78bfa', comment: { line: '//', block: ['/*', '*/'] }, kw: 'abstract as base bool break byte case catch char class const continue decimal default delegate do double else enum event false finally float for foreach if in int interface internal is long namespace new null object out override private protected public readonly ref return sealed short static string struct switch this throw true try typeof uint using var virtual void while Console WriteLine async await get set' },
    { id: 'java', name: 'Java', exts: ['java'], badge: 'JAVA', color: '#ef4444', comment: { line: '//', block: ['/*', '*/'] }, kw: 'abstract boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch this throw throws true false try void while String System out println main var' },
    { id: 'rust', name: 'Rust', exts: ['rs'], badge: 'RS', color: '#fb923c', comment: { line: '//', block: ['/*', '*/'] }, kw: 'as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while println String Vec Option Some None Ok Err i32 u32 f64 usize bool' },
    { id: 'go', name: 'Go', exts: ['go'], badge: 'GO', color: '#22d3ee', comment: { line: '//', block: ['/*', '*/'] }, kw: 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var true false nil fmt Println int string bool error make len append' },
    { id: 'lua', name: 'Lua', exts: ['lua'], badge: 'LUA', color: '#6366f1', comment: { line: '--' }, kw: 'and break do else elseif end false for function goto if in local nil not or repeat return then true until while print pairs ipairs table require' },
    { id: 'sql', name: 'SQL', exts: ['sql'], badge: 'SQL', color: '#f59e0b', comment: { line: '--', block: ['/*', '*/'] }, kw: 'select from where insert into values update set delete create table drop alter join left right inner outer on group by order having limit as and or not null primary key foreign references distinct count sum avg min max SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP ALTER JOIN LEFT RIGHT INNER ON GROUP BY ORDER HAVING LIMIT AS AND OR NOT NULL PRIMARY KEY DISTINCT COUNT' },
    { id: 'php', name: 'PHP', exts: ['php'], badge: 'PHP', color: '#818cf8', comment: { line: '//', block: ['/*', '*/'] }, kw: 'echo function if else elseif foreach for while return class public private protected new array true false null as static' },
    { id: 'ruby', name: 'Ruby', exts: ['rb'], badge: 'RB', color: '#f43f5e', comment: { line: '#' }, kw: 'def end if elsif else unless while until for in do class module return true false nil puts require yield self' },
    { id: 'kotlin', name: 'Kotlin', exts: ['kt', 'kts'], badge: 'KT', color: '#c084fc', comment: { line: '//', block: ['/*', '*/'] }, kw: 'fun val var if else when for while return class object interface true false null println' },
    { id: 'swift', name: 'Swift', exts: ['swift'], badge: 'SW', color: '#fb7185', comment: { line: '//', block: ['/*', '*/'] }, kw: 'func let var if else guard for in while return class struct enum true false nil print import' },
    { id: 'shell', name: 'Shell', exts: ['sh', 'bash', 'zsh'], badge: 'SH', color: '#4ade80', comment: { line: '#' }, kw: 'if then else elif fi for in do done while case esac function echo export local return' },
    { id: 'yaml', name: 'YAML', exts: ['yml', 'yaml'], badge: 'YML', color: '#f87171', comment: { line: '#' }, kw: 'true false null' },
    { id: 'xml', name: 'XML / SVG', exts: ['xml', 'svg'], badge: 'XML', color: '#fbbf24', run: 'web', comment: { block: ['<!--', '-->'] } },
    { id: 'plaintext', name: 'Plain Text', exts: ['txt', 'text', 'log'], badge: 'TXT', color: '#737373', comment: {} },
  ];
  const byId = Object.fromEntries(L.map((l) => [l.id, l]));
  const byExt = {};
  L.forEach((l) => l.exts.forEach((e) => (byExt[e] = l)));

  function forPath(path = '') {
    const ext = path.split('.').pop().toLowerCase();
    return byExt[ext] || byId.plaintext;
  }
  function badge(path, langId) {
    const l = langId ? byId[langId] : forPath(path);
    return `<span class="fbadge" style="--c:${l.color}">${l.badge}</span>`;
  }
  Q.langs = { list: L, byId, byExt, forPath, badge };
})();
