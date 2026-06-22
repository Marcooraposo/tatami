// =============================================================================
// errlog.js — lightweight client-side error capture (P4 beta hardening)
// -----------------------------------------------------------------------------
// Self-contained, no dependencies. Records uncaught errors + promise rejections
// to a capped ring buffer in localStorage so they can be inspected/downloaded
// for support. Deliberately silent (no alarming UI). Load this FIRST, before any
// other app script, so it catches early failures too.
//   window.tatamiErrorLog.get()      -> array of recent entries
//   window.tatamiErrorLog.download() -> save them as JSON
//   window.tatamiErrorLog.clear()    -> wipe
// =============================================================================
(function () {
  var KEY = 'tatami_errlog', MAX = 25;
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function write(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-MAX))); } catch (e) {} }
  function log(entry) {
    entry.at = new Date().toISOString();
    entry.path = location.pathname;
    var a = read(); a.push(entry); write(a);
  }
  window.addEventListener('error', function (e) {
    log({
      type: 'error',
      message: String((e && e.message) || (e && e.error && e.error.message) || 'error'),
      source: ((e && e.filename) || '') + ':' + ((e && e.lineno) || 0) + ':' + ((e && e.colno) || 0),
      stack: (e && e.error && e.error.stack) ? String(e.error.stack).slice(0, 1000) : ''
    });
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    log({
      type: 'unhandledrejection',
      message: String((r && r.message) || r || 'rejection'),
      stack: (r && r.stack) ? String(r.stack).slice(0, 1000) : ''
    });
  });
  window.tatamiErrorLog = {
    get: read,
    clear: function () { write([]); },
    download: function () {
      var blob = new Blob([JSON.stringify(read(), null, 2)], { type: 'application/json' });
      var u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = 'openmat-errorlog.json'; document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(u);
    }
  };
})();
