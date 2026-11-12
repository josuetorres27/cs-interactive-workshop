// CS Interactive Workshop - Visual theme.
//
// Two looks share every component: the tech lab (default) and the original
// wooden workshop ("madera"). The theme is a single attribute on <html>
// (data-theme="madera"; none means lab); the stylesheet does the rest.
// The choice is remembered per device. A tiny inline script in <head> applies
// it before the first paint, so there is no flash of the wrong theme.
//
// Canvas code cannot use CSS variables directly, so Theme.color() reads the
// computed value of a token (with a fallback for environments without CSS).
(function () {
  const KEY = 'csworkshop-theme';
  const THEMES = {
    lab:    { label: 'Laboratorio',      meta: '#a9b0b7' },
    madera: { label: 'Taller de madera', meta: '#c99560' },
  };
  const doc = typeof document !== 'undefined' ? document : null;
  let cache = {};

  function stored() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function current() {
    const el = doc && doc.documentElement;
    return el && el.getAttribute('data-theme') === 'madera' ? 'madera' : 'lab';
  }

  // Apply a theme without saving it (unknown names fall back to the lab).
  function apply(name) {
    const theme = THEMES[name] ? name : 'lab';
    const el = doc && doc.documentElement;
    if (el) {
      if (theme === 'lab') {
        if (el.removeAttribute) el.removeAttribute('data-theme');
        else el.setAttribute('data-theme', '');
      } else {
        el.setAttribute('data-theme', theme);
      }
    }
    const meta = doc && doc.querySelector && doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[theme].meta);
    cache = {};
    return theme;
  }

  // Apply, remember and announce a theme.
  function set(name) {
    const theme = apply(name);
    try { window.localStorage.setItem(KEY, theme); } catch (e) { /* storage unavailable */ }
    if (typeof window.dispatchEvent === 'function' && typeof window.Event === 'function') {
      window.dispatchEvent(new window.Event('themechange'));
    }
    return theme;
  }

  function toggle() {
    return set(current() === 'lab' ? 'madera' : 'lab');
  }

  // Computed value of a CSS custom property for the active theme.
  function color(name, fallback) {
    const k = current() + name;
    if (k in cache) return cache[k];
    let value = '';
    try {
      const cs = doc && typeof window.getComputedStyle === 'function' ? window.getComputedStyle(doc.documentElement) : null;
      if (cs && typeof cs.getPropertyValue === 'function') value = String(cs.getPropertyValue(name) || '').trim();
    } catch (e) { value = ''; }
    cache[k] = value || fallback;
    return cache[k];
  }

  apply(stored());
  window.Theme = { KEY, THEMES, current, apply, set, toggle, color };
})();
