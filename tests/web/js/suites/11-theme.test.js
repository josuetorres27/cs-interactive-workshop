// Visual theme: the lab (default) and the optional wooden workshop.
'use strict';

module.exports = (t, { createEnv, read }) => {
  const html = read('web/index.html');
  const css = read('web/css/styles.css');

  // Fresh page with theme.js loaded, optionally with a saved choice
  const boot = (saved) => {
    const env = createEnv();
    if (saved !== undefined) env.localStorage.setItem('csworkshop-theme', saved);
    const events = [];
    env.window.Event = class { constructor(type) { this.type = type; } };
    env.window.dispatchEvent = (e) => events.push(e.type);
    env.load('js/theme.js');
    return { env, Theme: env.window.Theme, html: env.document.documentElement, events };
  };

  // Custom properties declared inside the first block that starts with `selector {`
  const tokensOf = (selector) => {
    const start = css.indexOf(selector + ' {');
    const body = css.slice(start, css.indexOf('\n}', start));
    return new Set([...body.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]));
  };

  t.suite('theme · switching', () => {
    t.test('the lab is the default theme', () => {
      const { Theme, html: el } = boot();
      t.eq(Theme.current(), 'lab'); t.ok(el.getAttribute('data-theme') !== 'madera');
    });
    t.test('a saved "madera" choice is applied on load', () => {
      const { Theme, html: el } = boot('madera');
      t.eq(Theme.current(), 'madera'); t.eq(el.getAttribute('data-theme'), 'madera');
    });
    t.test('an unknown saved value falls back to the lab', () => t.eq(boot('neon').Theme.current(), 'lab'));
    t.test('toggle switches back and forth and remembers the choice', () => {
      const { env, Theme } = boot();
      t.eq(Theme.toggle(), 'madera'); t.eq(env.localStorage.getItem('csworkshop-theme'), 'madera');
      t.eq(Theme.toggle(), 'lab'); t.eq(env.localStorage.getItem('csworkshop-theme'), 'lab');
    });
    t.test('set() announces the change with a themechange event', () => {
      const { Theme, events } = boot();
      Theme.set('madera'); t.deepEq(events, ['themechange']);
    });
    t.test('the browser bar colour follows the theme', () => {
      const { env, Theme } = boot();
      const meta = new env.FakeElement('meta');
      env.document.querySelector = (sel) => (sel === 'meta[name="theme-color"]' ? meta : null);
      Theme.set('madera'); t.eq(meta.getAttribute('content'), Theme.THEMES.madera.meta);
      Theme.set('lab'); t.eq(meta.getAttribute('content'), Theme.THEMES.lab.meta);
    });
    t.test('color() falls back to the lab colour without a stylesheet', () => t.eq(boot().Theme.color('--box-ink', '#1b2027'), '#1b2027'));
    t.test('color() reads the computed token when CSS is available', () => {
      const { env, Theme } = boot();
      env.window.getComputedStyle = () => ({ getPropertyValue: (n) => (n === '--box-ink' ? ' #3d2414 ' : '') });
      t.eq(Theme.color('--box-ink', '#1b2027'), '#3d2414');
      t.eq(Theme.color('--missing', '#abcdef'), '#abcdef');
    });
  });

  t.suite('theme · page and stylesheet', () => {
    t.test('the wooden theme recolours every component token of the lab', () => {
      const lab = tokensOf(':root');
      const wood = tokensOf(':root[data-theme="madera"]');
      const COMPONENT = /^--(box|ply|paper|metal|tomato|sun-y|mint|sky-b|plum|text-|surface|code-|tr-|track|chip|viz-|sign-|btn-|rgb-|logo-|cv-)/;
      t.deepEq([...lab].filter((v) => COMPONENT.test(v) && !wood.has(v)), []);
      [...wood].filter((v) => !['--grain', '--woodgrain'].includes(v)).forEach((v) => t.ok(lab.has(v), `lab is missing ${v}`));
    });
    t.test('every canvas token read by the stations exists in both themes', () => {
      const lab = tokensOf(':root');
      const wood = tokensOf(':root[data-theme="madera"]');
      ['js/modules/heat.js', 'js/modules/algorithms.js', 'js/modules/concurrency.js'].forEach((f) => {
        [...read('web/' + f).matchAll(/'(--[\w-]+)'/g)].forEach((m) => { t.ok(lab.has(m[1]), `${f}: ${m[1]} (lab)`); t.ok(wood.has(m[1]), `${f}: ${m[1]} (madera)`); });
      });
    });
    t.test('the saved theme is applied in <head>, before the stylesheet paints', () => {
      const head = html.slice(0, html.indexOf('</head>'));
      t.ok(head.indexOf('csworkshop-theme') !== -1 && head.indexOf('csworkshop-theme') < head.indexOf('css/styles.css'));
    });
    t.test('theme.js loads before every other script', () => {
      const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
      t.eq(scripts[0], 'js/theme.js');
    });
    t.test('the top bar has a theme button with an icon and pressed state', () => {
      t.ok(/<button id="btnTheme"[^>]*aria-pressed="false"[^>]*><svg class="ic"><use href="#i-theme"\/>/.test(html));
      t.includes(html, '<symbol id="i-theme"');
    });
    t.test('each theme has its own decor and hides the other', () => {
      t.includes(html, 'class="lamp theme-lab"'); t.includes(html, 'class="lamp theme-wood"'); t.includes(html, 'class="pegboard theme-wood"');
      t.includes(css, '.theme-wood { display: none; }');
      t.includes(css, ':root[data-theme="madera"] .theme-lab { display: none; }');
    });
  });

  t.suite('theme · stations', () => {
    t.test('the button toggles the theme and updates its label', () => {
      const env = createEnv();
      env.window.Event = class { constructor(type) { this.type = type; } };
      env.window.dispatchEvent = () => {};
      env.load('js/theme.js');
      const btn = env.document.getElementById('btnTheme');
      const { App } = env.load('js/app.js', ['App']);
      const app = Object.create(App.prototype);
      app.showToast = () => {};
      app.setupGlobalControls();
      t.eq(btn.getAttribute('aria-pressed'), 'false');
      btn.click();
      t.eq(env.window.Theme.current(), 'madera');
      t.eq(btn.getAttribute('aria-pressed'), 'true');
      t.eq(btn.getAttribute('aria-label'), 'Cambiar al laboratorio');
    });
    t.test('heat thread colours come from the theme tokens', () => {
      const env = createEnv();
      env.load('js/theme.js');
      const { HeatStation } = env.load('js/modules/heat.js', ['HeatStation']);
      const h = new HeatStation();
      t.eq(h.colors.length, 8); t.eq(h.colors[0], '#2e6be6');
    });
  });
};
