// Page, stylesheet and asset integrity (web/index.html, web/css, web/js, web/assets).
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = (t, { read, WEB, createEnv }) => {
  const html = read('web/index.html');
  const css = read('web/css/styles.css');
  const jsFiles = ['js/app.js', 'js/audio.js', 'js/tracer.js', ...fs.readdirSync(path.join(WEB, 'js', 'modules')).filter((f) => f.endsWith('.js')).map((f) => `js/modules/${f}`)];
  const js = Object.fromEntries(jsFiles.map((f) => [f, read(`web/${f}`)]));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{2705}\u{23E9}-\u{23FA}]/u;

  t.suite('integrity · HTML structure', () => {
    t.test('the page is declared in Spanish and is mobile-ready', () => { t.includes(html, '<html lang="es">'); t.includes(html, 'name="viewport"'); });
    t.test('the title starts with the product name', () => t.includes(html, '<title>CS Interactive Lab'));
    t.test('attributes are separated by spaces (no "a"b= glitches)', () => t.deepEq(html.match(/="[^"\n]*"[a-zA-Z-]+=/g) || [], []));
    t.test('element ids are unique', () => { const dup = ids.filter((id, i) => ids.indexOf(id) !== i); t.deepEq(dup, []); });
    t.test('every script tag points to an existing file', () => [...html.matchAll(/<script src="([^"]+)"/g)].forEach((m) => t.ok(fs.existsSync(path.join(WEB, m[1])), m[1])));
    t.test('the HTTP model loads before the networking station', () => t.ok(html.indexOf('httpsim.js') < html.indexOf('modules/networking.js')));
    t.test('the tracer engine loads before the tracer stations', () => ['interview', 'datastructures', 'sql'].forEach((m) => t.ok(html.indexOf('js/tracer.js') < html.indexOf(`modules/${m}.js`))));
    t.test('app.js loads last', () => { const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]); t.eq(srcs[srcs.length - 1], 'js/app.js'); });
    t.test('every icon used has a symbol in the sprite', () => {
      const used = new Set([...(html + Object.values(js).join('\n')).matchAll(/href="#(i-[\w-]+)"/g)].map((m) => m[1]));
      used.forEach((i) => t.includes(html, `<symbol id="${i}"`, i));
    });
    t.test('every internal link goes to a real route', () => {
      const env = createEnv(); const { AREAS, MODULES } = env.load('js/app.js', ['AREAS', 'MODULES']);
      [...html.matchAll(/href="#\/([^"]*)"/g)].map((m) => m[1].split('/').filter(Boolean)).forEach((p) => {
        const ok = p.length === 0 || p[0] === 'que-es' || p[0] === 'perfil' || (p[0] === 'lab' && (!p[1] || MODULES[p[1]])) || (p[0] === 'mesa' && AREAS[p[1]]);
        t.ok(ok, p.join('/'));
      });
    });
    t.test('every station card has a matching station pane', () => [...html.matchAll(/data-tab="([^"]+)"/g)].forEach((m) => t.includes(html, `id="tab-${m[1]}"`, m[1])));
    t.test('stations with steps have Experimenta, Entiende and Implementa panes', () => {
      ['algorithms', 'concurrency', 'networking', 'interview', 'datastructures', 'sql'].forEach((id) => {
        const start = html.indexOf(`id="tab-${id}"`); const end = html.indexOf('<section id="tab-', start + 10);
        const pane = html.slice(start, end === -1 ? undefined : end);
        ['play', 'learn', 'build'].forEach((s) => t.includes(pane, `data-step="${s}"`, `${id}.${s}`));
      });
    });
    t.test('the networking station no longer advertises port 8080', () => t.notIncludes(html, '8080'));
  });

  t.suite('integrity · JavaScript references', () => {
    jsFiles.forEach((f) => {
      t.test(`${f}: every getElementById target exists in the page`, () => {
        [...js[f].matchAll(/getElementById\('([^'$`]+)'\)/g)].forEach((m) => t.ok(ids.includes(m[1]), `#${m[1]}`));
      });
    });
  });

  t.suite('integrity · no emojis anywhere', () => {
    t.test('index.html has no emojis', () => t.ok(!EMOJI.test(html)));
    t.test('styles.css has no emojis', () => t.ok(!EMOJI.test(css)));
    t.test('JavaScript files have no emojis', () => jsFiles.forEach((f) => t.ok(!EMOJI.test(js[f]), f)));
  });

  t.suite('integrity · stylesheet', () => {
    t.test('braces are balanced', () => t.eq((css.match(/{/g) || []).length, (css.match(/}/g) || []).length));
    t.test('every custom property used is defined somewhere', () => {
      const defined = new Set([...(css + html).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
      const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
      used.forEach((v) => t.ok(defined.has(v), v));
    });
    t.test('the legacy theme variables used by the tests and modules still exist', () => ['--bg-primary:', '--cyan:', '--emerald:', '--rose:', '--amber:'].forEach((v) => t.includes(css, v)));
    t.test('the workshop has no ropes or tape left', () => { t.notIncludes(css, '.rope'); t.notIncludes(css, '.tape'); t.notIncludes(html, 'class="tape'); });
    t.test('code blocks disable ligatures so >= stays >=', () => t.includes(css, 'font-variant-ligatures: none'));
    t.test('reduced-motion users get no animations', () => t.includes(css, 'prefers-reduced-motion'));
  });

  t.suite('integrity · ASCII figures', () => {
    const env = createEnv(); env.load('js/modules/figuresData.js');
    const embedded = env.window.EMBEDDED_ASSETS;
    const dir = path.join(WEB, 'assets', 'ascii_figures');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt'));
    t.test('there are 12 figures', () => t.eq(Object.keys(embedded).length, 12));
    t.test('every asset file has an embedded copy', () => files.forEach((f) => t.ok(embedded[f.replace('.txt', '')], f)));
    t.test('embedded copies match the asset files exactly', () => files.forEach((f) => t.eq(embedded[f.replace('.txt', '')], fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n'), f)));
    t.test('the web copies match the C++ engine figures', () => files.forEach((f) => {
      const engine = path.join(WEB, '..', 'core-c-engines', 'networking', 'ascii_figures', f);
      t.eq(fs.readFileSync(engine, 'utf8').replace(/\r\n/g, '\n'), fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n'), f);
    }));
  });
};
