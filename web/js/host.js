// Host layer: everything that touches files goes through here, so the same drawing code runs as
// the Mac app (Tauri: real files, save dialogs, autosave to the project file) and as the web app
// on iPhone / iPad / any browser (share sheet or download, file picker).
'use strict';
(() => {
  const ua = navigator.userAgent || '';
  // iPadOS reports itself as a Mac; touch points give it away.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const coarse = matchMedia('(pointer: coarse)').matches;
  const baseName = p => String(p || '').split(/[\\/]/).pop();

  function makeTauriHost() {
    const T = window.__TAURI__;
    const invoke = T.core.invoke;
    // console output and errors end up in the native log (Console.app / CI)
    for (const lvl of ['log', 'warn', 'error']) {
      const orig = console[lvl].bind(console);
      console[lvl] = (...a) => {
        orig(...a);
        try { invoke('debug_log', { level: lvl, msg: a.map(x => x instanceof Error ? (x.stack || x.message) : typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ') }); } catch (e) {}
      };
    }
    addEventListener('error', e => console.error('uncaught', e.message, (e.filename || '') + ':' + e.lineno));
    addEventListener('unhandledrejection', e => console.error('unhandled rejection', e.reason && (e.reason.stack || e.reason.message || e.reason)));
    let selftestDir = null;
    const writeBytes = async (path, blob) => {
      const u8 = blob instanceof Uint8Array ? blob : new Uint8Array(await blob.arrayBuffer());
      await invoke('write_binary', u8, { headers: { 'x-path': encodeURIComponent(path) } });
    };
    return {
      kind: 'app', ios: false, touch: false, baseName,
      // Exports (PDF, PNG): a native save dialog, then write the file.
      async exportFile(filename, blob) {
        const ext = filename.split('.').pop();
        const path = selftestDir ? selftestDir + '/' + filename
          : await invoke('pick_save_file', { title: 'Spara ' + ext.toUpperCase(), defaultName: filename, filterName: ext.toUpperCase(), exts: [ext] });
        if (!path) return { status: 'cancelled' };
        await writeBytes(path, blob);
        return { status: 'saved', path, name: baseName(path) };
      },
      async pickProject() {
        const path = await invoke('pick_open_file', { title: 'Öppna ritning' });
        if (!path) return null;
        const text = await invoke('read_text', { path });
        if (text == null) throw new Error('Filen gick inte att läsa.');
        return { path, name: baseName(path), text };
      },
      async saveProjectAs(defaultName, text) {
        const path = await invoke('pick_save_file', { title: 'Spara ritning', defaultName, filterName: 'Setplan-ritning', exts: ['setplan'] });
        if (!path) return null;
        await invoke('write_text', { path, text });
        return { path, name: baseName(path) };
      },
      writeProject: (path, text) => invoke('write_text', { path, text }),
      readProject: path => invoke('read_text', { path }),
      exists: path => invoke('file_exists', { path }),
      reveal: path => invoke('reveal', { path }),
      // Finder double-click / "Open With" / drop on the Dock icon
      async onOpenFiles(cb) {
        const take = async () => { const p = await invoke('take_pending_opens'); if (p && p.length) cb(p); };
        await T.event.listen('open-paths-ready', take);
        await take();
      },
      setTitle: t => { try { T.window.getCurrentWindow().setTitle(t); } catch (e) {} },
      // let the last change reach the disk before the window closes
      onBeforeQuit(flush) {
        const go = async () => { try { await flush(); } finally { invoke('quit_now'); } };
        T.event.listen('flush-before-quit', go);
        T.window.getCurrentWindow().onCloseRequested(go);
      },
      async selftest() { selftestDir = await invoke('selftest_dir'); return selftestDir; },
      appVersion: () => T.app.getVersion(),
    };
  }

  function makeWebHost() {
    const fileIn = () => document.getElementById('fileIn');
    async function share(file) {
      if (!navigator.canShare || !navigator.canShare({ files: [file] })) return null;
      try { await navigator.share({ files: [file] }); return 'shared'; }
      catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
        if (e && e.name === 'NotAllowedError') return 'needs-tap';   // the user gesture expired while the file was built
        throw e;
      }
    }
    function download(file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return 'downloaded';
    }
    const preferShare = ios || coarse;
    return {
      kind: 'web', ios, touch: coarse || ios, baseName,
      // iPhone/iPad: the share sheet ("Spara i Filer", AirDrop, Mail, Skriv ut). Computers: a download.
      async exportFile(filename, blob, type) {
        const file = new File([blob], filename, { type: type || blob.type || 'application/octet-stream' });
        if (preferShare) {
          const r = await share(file);
          if (r) return { status: r, file, name: filename };
        }
        return { status: download(file), name: filename };
      },
      shareAgain: file => share(file).then(r => r || download(file)),
      pickProject() {
        return new Promise((resolve, reject) => {
          const el = fileIn();
          const done = () => { el.removeEventListener('change', onChange); el.removeEventListener('cancel', onCancel); };
          const onCancel = () => { done(); resolve(null); };
          const onChange = () => {
            done();
            const f = el.files && el.files[0];
            el.value = '';
            if (!f) return resolve(null);
            f.text().then(text => resolve({ path: null, name: f.name, text }), reject);
          };
          el.addEventListener('change', onChange);
          el.addEventListener('cancel', onCancel);
          // iOS greys out files whose type it doesn't know, so no filter there
          if (ios) el.removeAttribute('accept'); else el.setAttribute('accept', '.setplan,.json,application/json');
          el.click();
        });
      },
      async saveProjectAs(defaultName, text) {
        const r = await this.exportFile(defaultName, new Blob([text], { type: 'application/json' }), 'application/json');
        return r.status === 'cancelled' ? null : { path: null, name: defaultName, status: r.status, file: r.file };
      },
      async writeProject() { throw new Error('no file system'); },
      async readProject() { return null; },
      async exists() { return false; },
      async reveal() {},
      async onOpenFiles() {},
      setTitle: t => { document.title = t; },
      onBeforeQuit() {},
      async selftest() { return null; },
      appVersion: async () => 'web',
    };
  }

  window.Host = window.__TAURI__ ? makeTauriHost() : makeWebHost();
})();
