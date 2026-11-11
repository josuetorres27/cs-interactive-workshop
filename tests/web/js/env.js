// A minimal fake browser so the real web/js files can run inside Node.
//
// Every file is evaluated with `new Function(...)`, passing our fake
// window/document/timers as parameters, so the code under test is exactly
// the code the browser runs (no copies, no bundler).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const WEB = path.join(ROOT, 'web');

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

// Deterministic PRNG so "random" tests are reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Canvas 2D context where every method is a no-op and every property is settable.
function fakeContext() {
  const store = {
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    measureText: (text) => ({ width: String(text).length * 7 })
  };
  return new Proxy(store, {
    get(target, prop) { return prop in target ? target[prop] : () => {}; },
    set(target, prop, value) { target[prop] = value; return true; }
  });
}

class FakeClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach((x) => this.set.add(x)); }
  remove(...c) { c.forEach((x) => this.set.delete(x)); }
  toggle(c, force) {
    const on = force === undefined ? !this.set.has(c) : !!force;
    if (on) this.set.add(c); else this.set.delete(c);
    return on;
  }
  contains(c) { return this.set.has(c); }
}

class FakeElement {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.textContent = '';
    this._html = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.className = '';
    this.classList = new FakeClassList();
    this.offsetParent = {};       // "visible" by default
    this.clientWidth = 800; this.clientHeight = 400;
    this.offsetWidth = 800; this.offsetHeight = 14;
    this.offsetTop = 0; this.scrollTop = 0;
    this.parentElement = null;
    this._queries = new Map();
    this.type = '';
    this.max = 0;
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); this._queries.clear(); }
  get parentElementSafe() { return this.parentElement || new FakeElement(); }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  removeEventListener() {}
  dispatch(type, extra = {}) {
    const ev = { type, target: this, currentTarget: this, preventDefault() {}, stopPropagation() {}, ...extra };
    (this.listeners[type] || []).forEach((fn) => fn(ev));
    return ev;
  }
  click() { this.dispatch('click'); }
  appendChild(c) { this.children.push(c); c.parentElement = this; return c; }
  append(...cs) { cs.forEach((c) => this.appendChild(c)); }
  remove() {}
  querySelector(sel) {
    if (!this._queries.has(sel)) { const el = new FakeElement('div'); el.parentElement = this; this._queries.set(sel, el); }
    return this._queries.get(sel);
  }
  querySelectorAll() { return []; }
  closest() { return null; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  getBoundingClientRect() { return { top: 0, left: 0, right: 800, bottom: 400, width: 800, height: 400 }; }
  getContext() { return fakeContext(); }
  scrollIntoView() {}
  focus() {}
}

function createEnv({ seed = 1 } = {}) {
  const byId = new Map();
  const queryAll = new Map();
  const docListeners = {};
  const timers = [];
  const rafs = [];

  const document = {
    body: new FakeElement('body'),
    documentElement: new FakeElement('html'),
    fullscreenElement: null,
    getElementById(id) {
      if (!byId.has(id)) { const el = new FakeElement('div', id); el.parentElement = new FakeElement(); byId.set(id, el); }
      return byId.get(id);
    },
    createElement(tag) { return new FakeElement(tag); },
    querySelector(sel) {
      const m = /^#([\w-]+)$/.exec(sel);
      return m ? document.getElementById(m[1]) : new FakeElement();
    },
    querySelectorAll(sel) { return queryAll.get(sel) || []; },
    addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
    // test helpers
    __setQueryAll(sel, els) { queryAll.set(sel, els); },
    __listeners: docListeners
  };

  const storage = new Map();
  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear()
  };

  const location = { hash: '' };
  const seededMath = Object.create(Math);
  seededMath.random = mulberry32(seed);

  const sound = new Proxy({}, { get: (t, p) => (p in t ? t[p] : () => {}), set: (t, p, v) => { t[p] = v; return true; } });

  const winListeners = {};
  const window = {
    soundController: sound,
    innerWidth: 1280, innerHeight: 800,
    addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); },
    scrollTo() {}, scrollBy() {},
    matchMedia: () => ({ matches: false }),
    __listeners: winListeners
  };

  const globals = {
    window,
    document,
    localStorage,
    location,
    history: { replaceState(_s, _t, url) { location.hash = url; } },
    navigator: { clipboard: { writeText: async () => {} } },
    performance: { now: () => Date.now() },
    // Timers run as microtasks so async sorting finishes instantly.
    setTimeout: (fn) => { timers.push(fn); Promise.resolve().then(fn); return timers.length; },
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: (fn) => { rafs.push(fn); return rafs.length; },
    cancelAnimationFrame: () => {},
    getComputedStyle: () => ({ fontFamily: 'Fredoka', flexDirection: 'row' }),
    innerWidth: 1280, innerHeight: 800,
    scrollTo: () => {}, scrollBy: () => {},
    Math: seededMath,
    TextEncoder, TextDecoder,
    Blob: class { constructor(parts) { this.parts = parts; } },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} },
    module: undefined
  };
  window.document = document;
  window.localStorage = localStorage;
  window.location = location;

  // Evaluate a web file. `exports` lists top-level names to hand back
  // (needed for files like app.js that declare classes/consts at top level).
  function load(rel, exports = []) {
    const src = read(path.join('web', rel));
    const names = Object.keys(globals);
    const body = `${src}\n;return { ${exports.join(', ')} };`;
    // eslint-disable-next-line no-new-func
    const fn = new Function(...names, body);
    return fn(...names.map((n) => globals[n]));
  }

  return { window, document, globals, load, location, localStorage, rafs, random: seededMath.random, FakeElement };
}

module.exports = { createEnv, read, ROOT, WEB, mulberry32, FakeElement };
