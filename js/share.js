/* Codeditor — share a project as a link: the files are compressed into the link itself (#share=…) */
(() => {
  const { h, esc, toast } = Q;
  const PAGES = 'https://lucadilley09-a11y.github.io/codeditor/';
  const inClaude = () => /claude(usercontent)?\.(ai|com)$/.test(location.hostname) || (() => { try { return window.top !== window; } catch { return true; } })();
  const base = () => (inClaude() || !/^https?:/.test(location.protocol) ? PAGES : location.origin + location.pathname);

  const b64u = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = (s) => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); const out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; };
  async function pack(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (!window.CompressionStream) return 'j' + b64u(raw);
    const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    return 'z' + b64u(z);
  }
  async function unpack(s) {
    const kind = s[0], bytes = unb64u(s.slice(1));
    const raw = kind === 'z' ? new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()) : bytes;
    return JSON.parse(new TextDecoder().decode(raw));
  }

  async function link(project = Q.fs.project) {
    const files = {}; for (const [k, v] of Object.entries(project.files)) if (typeof v === 'string') files[k] = v;
    return base() + '#share=' + (await pack({ v: 1, name: project.name, files }));
  }

  async function dialog() {
    const url = await link();
    const kb = Math.round(url.length / 1024);
    const ta = h('textarea', { class: 'input', rows: 4, readonly: true, spellcheck: 'false', text: url });
    const body = h('div', {},
      h('p', { html: `Anyone with this link can open and play <b>${esc(Q.fs.project.name)}</b> — the whole project is packed inside the link, nothing is uploaded.` }),
      ta,
      h('p', { class: 'muted small', html: `${kb} KB link.${kb > 60 ? ' <b>Long links</b> may not fit in some chat apps — share the backup file instead.' : ''}${inClaude() ? ' Opens on the GitHub Pages version of Codeditor (turn on Pages in your repo settings).' : ''}` }));
    Q.modal({ title: 'Share as link', body, buttons: [{ label: 'Close', value: null }, { label: 'Copy link', primary: true, onclick: () => { Q.app.copyText ? Q.app.copyText(url, 'Link copied') : navigator.clipboard?.writeText(url).then(() => toast('Link copied', 'success', 1500)); return false; } }] });
    requestAnimationFrame(() => ta.select());
  }

  // opening a shared link
  async function maybeOpen() {
    const m = location.hash.match(/^#share=([\w-]+)$/); if (!m) return;
    let d; try { d = await unpack(m[1]); } catch { toast('That share link looks broken or incomplete.', 'error', 3500); return; }
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
    if (!d || !d.files || typeof d.files !== 'object') return;
    const n = Object.keys(d.files).length;
    const go = (play) => {
      Q.fs.importProject((d.name || 'Shared project') + ' (shared)', d.files);
      const first = Object.keys(d.files).find((f) => /\.html?$/.test(f)) || Object.keys(d.files)[0];
      if (first) Q.app.openFile(first);
      if (play) { Q.app.showRight('preview'); Q.app.refreshPreview(true); }
      toast('Shared project added to your projects', 'success', 2200);
    };
    Q.modal({ title: 'Open shared project?', body: `<p>Someone shared <b>${esc(d.name || 'a project')}</b> with you (${n} file${n === 1 ? '' : 's'}). It will be added as a new project — your own projects stay as they are.</p>`, buttons: [{ label: 'Not now', value: null }, { label: 'Open code', onclick: () => go(false) }, { label: 'Play it', primary: true, onclick: () => go(true) }] });
  }

  Q.share = { link, dialog, maybeOpen, pack, unpack };
})();
