// =============================================================================
// accent.js — per-user accent colour for the whole UI
// -----------------------------------------------------------------------------
// Overrides the design-token vars the app uses for its highlight colour
// (--primary + hover drive buttons & active nav; --accent + hover + bg drive
// links, chips, focus rings, progress bars). Six presets incl. the default
// black. Choice is saved in localStorage and auto-applied on load, so admin.html
// and app.html stay in sync within a browser. Load this early (after errlog.js).
//   window.TATAMI_ACCENTS, getAccent(), applyAccent(id), selectAccent(id),
//   accentSwatchesHtml()
// =============================================================================
(function () {
  var ACCENTS = {
    black:   { label: 'Black',   primary: '#1a1a1a', hover: '#000000', bg: '#f1f3f5', swatch: '#1a1a1a' },
    blue:    { label: 'Blue',    primary: '#2563eb', hover: '#1d4ed8', bg: '#eff6ff', swatch: '#2563eb' },
    emerald: { label: 'Emerald', primary: '#059669', hover: '#047857', bg: '#ecfdf5', swatch: '#059669' },
    violet:  { label: 'Violet',  primary: '#7c3aed', hover: '#6d28d9', bg: '#f5f3ff', swatch: '#7c3aed' },
    rose:    { label: 'Rose',    primary: '#e11d48', hover: '#be123c', bg: '#fff1f2', swatch: '#e11d48' },
    amber:   { label: 'Amber',   primary: '#d97706', hover: '#b45309', bg: '#fffbeb', swatch: '#d97706' }
  };
  var KEY = 'tatami_accent';

  function getAccent() { try { return localStorage.getItem(KEY) || 'black'; } catch (e) { return 'black'; } }

  function applyAccent(id, save) {
    var r = document.documentElement.style;
    var props = ['--primary', '--primary-hover', '--accent', '--accent-hover', '--accent-bg'];
    if (id === 'black' || !ACCENTS[id]) {
      // Revert to the stylesheet (keeps light/dark defaults intact).
      props.forEach(function (p) { r.removeProperty(p); });
      id = 'black';
    } else {
      var a = ACCENTS[id];
      r.setProperty('--primary', a.primary);
      r.setProperty('--primary-hover', a.hover);
      r.setProperty('--accent', a.primary);
      r.setProperty('--accent-hover', a.hover);
      r.setProperty('--accent-bg', a.bg);
    }
    if (save !== false) { try { localStorage.setItem(KEY, id); } catch (e) {} }
  }

  // Apply colours live + refresh any rendered swatch rings (no full re-render,
  // so it won't wipe unsaved form input).
  function selectAccent(id) {
    applyAccent(id);
    var sw = ACCENTS[id] ? ACCENTS[id].swatch : '#1a1a1a';
    document.querySelectorAll('[data-accent]').forEach(function (b) {
      var on = b.getAttribute('data-accent') === id;
      b.style.boxShadow = on ? '0 0 0 2px ' + sw : '0 0 0 1px var(--border)';
    });
  }

  function accentSwatchesHtml() {
    var cur = getAccent();
    return Object.keys(ACCENTS).map(function (id) {
      var a = ACCENTS[id];
      var ring = cur === id ? '0 0 0 2px ' + a.swatch : '0 0 0 1px var(--border)';
      return '<button type="button" data-accent="' + id + '" onclick="selectAccent(\'' + id + '\')" title="' + a.label + '" aria-label="' + a.label + '"' +
        ' style="width:30px;height:30px;border-radius:50%;cursor:pointer;background:' + a.swatch +
        ';border:2px solid var(--surface);box-shadow:' + ring + ';padding:0"></button>';
    }).join('');
  }

  window.TATAMI_ACCENTS = ACCENTS;
  window.getAccent = getAccent;
  window.applyAccent = applyAccent;
  window.selectAccent = selectAccent;
  window.accentSwatchesHtml = accentSwatchesHtml;

  // Apply the saved accent immediately on load.
  applyAccent(getAccent(), false);
})();
