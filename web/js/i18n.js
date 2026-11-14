// CS Interactive Workshop - Languages (Spanish is the source, English is the translation).
//
// The language is fixed for the life of a page: switching saves the choice and reloads.
// That keeps every station simple, because any text can be written inline as
//   T('texto en español', 'English text')
// and template literals work as usual: T(`Paso ${i} de ${n}`, `Step ${i} of ${n}`).
//
// The markup in index.html stays in Spanish. In English, translateDom() swaps it using
// the dictionary in js/i18n/en.js, keyed by the Spanish text (whitespace collapsed):
//   - an element whose content is only text and inline tags (<strong>, <code>, <a>...)
//     is translated as one block, so sentences keep a natural word order;
//   - anything else is translated text node by text node;
//   - title, aria-label, placeholder and alt attributes are translated too.
(function () {
  const KEY = 'csworkshop-lang';
  const LANGS = { es: { label: 'Español', short: 'ES' }, en: { label: 'English', short: 'EN' } };
  const INLINE = ['STRONG', 'B', 'EM', 'I', 'CODE', 'A', 'BR', 'SPAN', 'KBD', 'SUB', 'SUP', 'SMALL', 'U', 'MARK'];
  const SKIP = ['SCRIPT', 'STYLE', 'PRE', 'CODE', 'TEXTAREA'];
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const doc = typeof document !== 'undefined' ? document : null;

  function stored() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  const lang = LANGS[stored()] ? stored() : 'es';
  const missing = [];

  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const dict = () => (lang === 'en' && window.I18N_EN) || null;

  // Inline text: the Spanish original, or its translation when one is given and the page is in English.
  function t(es, en) {
    return lang === 'en' && en !== undefined && en !== null ? en : es;
  }

  function lookup(key) {
    const d = dict();
    if (!d || !key || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(key)) return null;
    if (Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    if (missing.indexOf(key) === -1) missing.push(key);
    return null;
  }

  const stripTags = (html) => String(html).replace(/<[^>]*>/g, '');

  // True when every element below `el` is inline and safe to rebuild from the dictionary.
  function isBlock(el) {
    const all = el.querySelectorAll ? el.querySelectorAll('*') : [];
    if (!all.length) return false;
    for (let i = 0; i < all.length; i++) {
      const c = all[i];
      if (INLINE.indexOf(c.tagName) === -1 || c.id) return false;
    }
    return true;
  }

  function translateText(node) {
    const key = norm(node.nodeValue);
    const en = lookup(key);
    if (en === null) return;
    const raw = node.nodeValue;
    const lead = /^\s/.test(raw) ? ' ' : '';
    const tail = /\s$/.test(raw) ? ' ' : '';
    node.nodeValue = lead + stripTags(en) + tail;
  }

  function translateAttrs(el) {
    if (!el.getAttribute) return;
    ATTRS.forEach((a) => {
      const v = el.getAttribute(a);
      if (!v) return;
      const en = lookup(norm(v));
      if (en !== null) el.setAttribute(a, stripTags(en));
    });
  }

  function walk(el) {
    if (!el || SKIP.indexOf(el.tagName) !== -1) return;
    if (el.getAttribute && el.getAttribute('data-i18n') === 'off') return;
    translateAttrs(el);
    if (isBlock(el)) {
      const all = el.querySelectorAll('*');
      for (let i = 0; i < all.length; i++) translateAttrs(all[i]);
      const en = lookup(norm(el.textContent));
      if (en !== null) el.innerHTML = en;
      return;
    }
    const kids = Array.prototype.slice.call(el.childNodes || []);
    kids.forEach((n) => {
      if (n.nodeType === 3) translateText(n);
      else if (n.nodeType === 1) walk(n);
    });
  }

  // Translate the static page. Does nothing in Spanish.
  function translateDom(root) {
    if (lang !== 'en' || !doc) return;
    walk(root || doc.body);
    const title = lookup(norm(doc.title || ''));
    if (title !== null) doc.title = stripTags(title);
  }

  // Save the choice and reload so every station is rebuilt in that language.
  function set(next) {
    const value = LANGS[next] ? next : 'es';
    try { window.localStorage.setItem(KEY, value); } catch (e) { /* storage unavailable */ }
    if (value !== lang && window.location && typeof window.location.reload === 'function') window.location.reload();
    return value;
  }
  const other = () => (lang === 'es' ? 'en' : 'es');
  const toggle = () => set(other());

  if (doc && doc.documentElement) doc.documentElement.setAttribute('lang', lang);
  window.I18n = { KEY, LANGS, lang, t, set, toggle, other, translateDom, missing, norm };
  window.T = t;

  // The scripts sit at the end of <body>, so the page is already parsed here
  if (doc && doc.body) translateDom(doc.body);
  if (doc && doc.documentElement && doc.documentElement.classList) doc.documentElement.classList.remove('i18n-wait');
})();
