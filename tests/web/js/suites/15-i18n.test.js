// Languages: the engine (js/i18n.js), the markup dictionary (js/i18n/en.js) and the inline T() texts.
'use strict';

module.exports = (t, { createEnv, read }) => {
  const html = read('web/index.html');
  const SPANISH = /[áéíóúñÁÉÍÓÚÑ¿¡]/;
  // Proper names keep their accents in English
  const clean = (s) => String(s).replace(/Josué/g, 'Josue');

  // Tiny DOM, just enough for translateDom()
  const text = (value) => ({ nodeType: 3, nodeValue: value });
  const el = (tag, attrs, ...kids) => {
    const node = {
      nodeType: 1, tagName: tag.toUpperCase(), id: (attrs && attrs.id) || '', attrs: { ...(attrs || {}) }, childNodes: kids, html: null,
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      querySelectorAll() { const out = []; const go = (n) => n.childNodes.forEach((c) => { if (c.nodeType === 1) { out.push(c); go(c); } }); go(this); return out; },
      get textContent() { return this.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.textContent)).join(''); },
      set innerHTML(v) { this.html = v; this.childNodes = []; }
    };
    return node;
  };

  const boot = (lang, dict) => {
    const env = createEnv();
    if (lang) env.localStorage.setItem('csworkshop-lang', lang);
    let reloads = 0;
    env.window.location.reload = () => { reloads++; };
    if (dict) env.window.I18N_EN = dict;
    env.load('js/i18n.js');
    return { env, I18n: env.window.I18n, T: env.window.T, reloads: () => reloads };
  };

  t.suite('i18n · language choice', () => {
    t.test('Spanish is the default', () => { const { I18n, env } = boot(); t.eq(I18n.lang, 'es'); t.eq(env.document.documentElement.getAttribute('lang'), 'es'); });
    t.test('a saved "en" is applied on load', () => { const { I18n, env } = boot('en'); t.eq(I18n.lang, 'en'); t.eq(env.document.documentElement.getAttribute('lang'), 'en'); });
    t.test('an unknown saved language falls back to Spanish', () => t.eq(boot('fr').I18n.lang, 'es'));
    t.test('T() returns the Spanish in Spanish and the English in English', () => {
      t.eq(boot().T('Hola', 'Hello'), 'Hola'); t.eq(boot('en').T('Hola', 'Hello'), 'Hello');
    });
    t.test('T() falls back to the Spanish when there is no translation', () => t.eq(boot('en').T('Quick Sort'), 'Quick Sort'));
    t.test('template literals translate with their values', () => {
      const { T } = boot('en'); const i = 2, n = 5;
      t.eq(T(`Paso ${i} de ${n}`, `Step ${i} of ${n}`), 'Step 2 of 5');
    });
    t.test('switching saves the choice and reloads the page once', () => {
      const { I18n, env, reloads } = boot();
      t.eq(I18n.other(), 'en'); I18n.toggle();
      t.eq(env.localStorage.getItem('csworkshop-lang'), 'en'); t.eq(reloads(), 1);
    });
    t.test('choosing the current language does not reload', () => { const { I18n, reloads } = boot('en'); I18n.set('en'); t.eq(reloads(), 0); });
    t.test('toggling from English goes back to Spanish', () => { const { I18n, env } = boot('en'); I18n.toggle(); t.eq(env.localStorage.getItem('csworkshop-lang'), 'es'); });
  });

  t.suite('i18n · translating the markup', () => {
    const dict = {
      'Iniciar': 'Start', 'Un taller donde los temas se ven y se tocan.': 'A workshop where topics are <strong>seen and touched</strong>.',
      'Ayuda': 'Help', '1Entiende': '<span class="step-n">1</span>Understand', 'Velocidad': 'Speed'
    };
    t.test('a plain text node is replaced, keeping its surrounding spaces', () => {
      const { I18n } = boot('en', dict); const n = text(' Iniciar\n  '); I18n.translateDom(el('button', null, el('svg', null), n));
      t.eq(n.nodeValue, ' Start ');
    });
    t.test('a sentence with inline tags is translated as one block', () => {
      const { I18n } = boot('en', dict);
      const p = el('p', null, text('Un taller donde los temas se '), el('strong', null, text('ven y se tocan')), text('.'));
      I18n.translateDom(el('div', null, el('h2', null, text('x')), p));
      t.eq(p.html, 'A workshop where topics are <strong>seen and touched</strong>.');
    });
    t.test('a step tab keeps its number badge', () => {
      const { I18n } = boot('en', dict); const b = el('button', null, el('span', { class: 'step-n' }, text('1')), text('Entiende'));
      I18n.translateDom(el('nav', null, b, el('div', null))); t.eq(b.html, '<span class="step-n">1</span>Understand');
    });
    t.test('elements that carry an id are never rebuilt (scripts hold on to them)', () => {
      const { I18n } = boot('en', dict); const label = text('Velocidad'); const value = el('span', { id: 'algoSpeedVal' }, text('60%'));
      const row = el('div', null, label, value); I18n.translateDom(el('section', null, row, el('div', null)));
      t.eq(row.html, null); t.eq(label.nodeValue, 'Speed'); t.eq(value.childNodes[0].nodeValue, '60%');
    });
    t.test('title and aria-label are translated', () => {
      const { I18n } = boot('en', dict); const b = el('button', { title: 'Ayuda', 'aria-label': 'Ayuda' }, el('svg', null));
      I18n.translateDom(el('div', null, b)); t.eq(b.attrs.title, 'Help'); t.eq(b.attrs['aria-label'], 'Help');
    });
    t.test('code samples and opted-out elements are left alone', () => {
      const { I18n } = boot('en', dict); const inCode = text('Iniciar'); const off = text('Iniciar');
      I18n.translateDom(el('div', null, el('pre', null, inCode), el('button', { 'data-i18n': 'off' }, off), el('p', null)));
      t.eq(inCode.nodeValue, 'Iniciar'); t.eq(off.nodeValue, 'Iniciar');
    });
    t.test('text that is not in the dictionary stays and is reported as missing', () => {
      const { I18n } = boot('en', dict); const n = text('Texto nuevo'); I18n.translateDom(el('div', null, n, el('svg', null)));
      t.eq(n.nodeValue, 'Texto nuevo'); t.deepEq(I18n.missing, ['Texto nuevo']);
    });
    t.test('numbers and symbols are not looked up', () => {
      const { I18n } = boot('en', dict); I18n.translateDom(el('div', null, text('0.00 s'.replace('s', '')), text('→ 42 %'), el('svg', null)));
      t.deepEq(I18n.missing, []);
    });
    t.test('in Spanish the page is not touched', () => {
      const { I18n } = boot('es', dict); const n = text('Iniciar'); I18n.translateDom(el('div', null, n, el('svg', null))); t.eq(n.nodeValue, 'Iniciar');
    });
  });

  t.suite('i18n · page wiring', () => {
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
    t.test('the dictionary and the engine load right after the theme, before every station', () => {
      t.deepEq(scripts.slice(0, 3), ['js/theme.js', 'js/i18n/en.js', 'js/i18n.js']);
    });
    t.test('English pages are hidden until translated, with a safety timeout', () => {
      const head = html.slice(0, html.indexOf('</head>'));
      t.includes(head, "localStorage.getItem('csworkshop-lang')==='en'"); t.includes(head, "classList.add('i18n-wait')"); t.includes(head, 'setTimeout');
      t.includes(read('web/css/styles.css'), '.i18n-wait body { visibility: hidden; }');
      t.includes(read('web/js/i18n.js'), "classList.remove('i18n-wait')");
    });
    t.test('the top bar has a language button that is not itself translated', () => {
      t.ok(/<button id="btnLang" class="round-btn lang-btn"[^>]*data-i18n="off">EN<\/button>/.test(html));
    });
    t.test('the button names the other language and toggles on click', () => {
      const run = (lang) => {
        const env = createEnv(); if (lang) env.localStorage.setItem('csworkshop-lang', lang);
        let reloads = 0; env.window.location.reload = () => { reloads++; };
        env.load('js/i18n.js');
        const { App } = env.load('js/app.js', ['App']);
        const app = Object.create(App.prototype); app.showToast = () => {}; app.setupGlobalControls();
        const btn = env.document.getElementById('btnLang');
        return { btn, env, reloads: () => reloads };
      };
      const es = run(); t.eq(es.btn.textContent, 'EN'); t.eq(es.btn.title, 'Switch to English');
      es.btn.click(); t.eq(es.env.localStorage.getItem('csworkshop-lang'), 'en'); t.eq(es.reloads(), 1);
      const en = run('en'); t.eq(en.btn.textContent, 'ES'); t.eq(en.btn.title, 'Cambiar a español');
    });
  });

  t.suite('i18n · markup dictionary', () => {
    const env = createEnv(); env.load('js/i18n/en.js');
    const dict = env.window.I18N_EN;
    const keys = Object.keys(dict);
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·');
    t.test('the dictionary is not empty and has no blank translations', () => {
      t.ok(keys.length > 300, String(keys.length)); keys.forEach((k) => t.ok(typeof dict[k] === 'string' && dict[k].trim(), k));
    });
    t.test('no translation still contains Spanish characters', () => keys.forEach((k) => t.ok(!SPANISH.test(clean(dict[k])), `${k} -> ${dict[k]}`)));
    t.test('translations only use inline tags', () => keys.forEach((k) => {
      [...dict[k].matchAll(/<\/?([a-z0-9]+)/gi)].forEach((m) => t.ok(['strong', 'b', 'em', 'i', 'code', 'a', 'br', 'span', 'kbd', 'sub', 'sup', 'small', 'u', 'mark'].includes(m[1].toLowerCase()), `${k}: <${m[1]}>`));
    }));
    t.test('every visible text of the page is covered by the dictionary', () => {
      const body = html.slice(html.indexOf('<body'))
        .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '\u0001').replace(/<[^>]*data-i18n="off"[^>]*>[^<]*/g, '');
      const all = keys.join('\n');
      const runs = body.split(/<[^>]*>/).map((s) => norm(decode(s))).filter((s) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}/.test(s));
      const missing = [...new Set(runs)].filter((r) => !r.split('\u0001').map(norm).filter(Boolean).every((part) => all.includes(part)));
      t.deepEq(missing.slice(0, 12), []);
    });
    t.test('every tooltip and accessible label is covered', () => {
      const out = [];
      [...html.matchAll(/ (?:title|aria-label|placeholder|alt)="([^"]+)"/g)].forEach((m) => {
        const k = norm(decode(m[1])); if (/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(k) && !(k in dict)) out.push(k);
      });
      // the language button describes itself in the other language on purpose
      t.deepEq(out.filter((k) => k !== 'Switch to English'), []);
    });
  });

  t.suite('i18n · stations speak English', () => {
    const english = () => {
      const env = createEnv(); env.localStorage.setItem('csworkshop-lang', 'en'); env.window.location.reload = () => {};
      env.load('js/i18n.js'); return env;
    };
    // Every string reachable from a value (skipping code samples)
    const strings = (value, out = [], depth = 0) => {
      if (typeof value === 'string') out.push(value);
      else if (Array.isArray(value)) value.forEach((v) => strings(v, out, depth + 1));
      else if (value && typeof value === 'object' && depth < 6) Object.entries(value).forEach(([k, v]) => { if (!['code', 'presets', 'lang', 'figures'].includes(k) && typeof v !== 'function') strings(v, out, depth + 1); });
      return out;
    };
    const noSpanish = (list, where) => list.forEach((s) => t.ok(!SPANISH.test(clean(s)), `${where}: ${s.slice(0, 90)}`));

    t.test('work areas, stations, Bit and the tours', () => {
      const env = english();
      const { AREAS, MODULES, GUIDE_LINES, TRACER_LINES, TOURS } = env.load('js/app.js', ['AREAS', 'MODULES', 'GUIDE_LINES', 'TRACER_LINES', 'TOURS']);
      noSpanish(strings({ AREAS, MODULES, GUIDE_LINES, TRACER_LINES, TOURS }), 'app.js');
      t.ok(AREAS.problems.title !== 'Problemas de Código');
    });
    t.test('in Spanish the same data is untouched', () => {
      const env = createEnv(); env.load('js/i18n.js');
      const { AREAS } = env.load('js/app.js', ['AREAS']); t.eq(AREAS.problems.title, 'Problemas de Código');
    });
    ['interview', 'datastructures', 'sql'].forEach((mod) => {
      t.test(`${mod}: catalogue, statements and every step of every preset`, () => {
        const env = english(); env.load('js/tracer.js'); env.load(`js/modules/${mod}.js`);
        const station = env.window[{ interview: 'interviewStation', datastructures: 'dsStation', sql: 'sqlStation' }[mod]];
        const problems = station.problems || station.items || [];
        t.ok(problems.length > 0, 'problems');
        problems.forEach((p) => {
          noSpanish(strings(p), `${mod}/${p.id}`);
          (p.presets || []).forEach((preset) => {
            const input = typeof preset === 'string' ? preset : (preset.value || preset.text || preset.input || '');
            const frames = p.trace(p.parse(input));
            noSpanish(strings(frames.map((f) => [f.note, f.text, f.explain, f.msg].filter((x) => typeof x === 'string'))), `${mod}/${p.id} trace`);
          });
        });
      });
    });
    t.test('the tracer controls (picker, input, player, step counter) are in English', () => {
      const env = english(); env.load('js/tracer.js'); env.load('js/modules/interview.js');
      const st = env.window.interviewStation;
      const html = env.window.Tracer.TraceStation.prototype.skeleton.call({ problems: st.problems });
      const visible = html.replace(/<[^>]*\b(title|aria-label)="([^"]*)"[^>]*>/g, ' $2 ').replace(/<[^>]+>/g, ' ');
      noSpanish([visible], 'tracer skeleton');
      ['Reproducir', 'Entrada', 'Probar', 'Paso'].forEach((w) => t.ok(!new RegExp(`\\b${w}\\b`).test(visible), w));
      const src = read('web/js/tracer.js');
      ['Pausar', 'Reproducir', 'Ejemplo ${i + 1}', 'Paso ${this.idx + 1}'].forEach((w) => t.ok(src.split(w).length - 1 === src.split(`T(\`${w}`).length - 1 + src.split(`T('${w}`).length - 1, `${w} is wrapped in T()`));
    });
    t.test('progress checklists', () => {
      const env = english(); env.load('js/progress.js');
      noSpanish(strings(env.window.Progress.CHECKLISTS), 'progress.js');
    });
    t.test('no station file calls T() with a single argument by mistake', () => {
      ['js/app.js', 'js/account.js', 'js/progress.js', 'js/tracer.js', 'js/modules/algorithms.js', 'js/modules/concurrency.js', 'js/modules/heat.js', 'js/modules/networking.js', 'js/modules/httpsim.js', 'js/modules/cheatsheets.js', 'js/modules/interview.js', 'js/modules/datastructures.js', 'js/modules/sql.js'].forEach((f) => {
        const src = read('web/' + f);
        t.ok(/\bT\(/.test(src), `${f} has translations`);
        [...src.matchAll(/\bT\('((?:[^'\\]|\\.)*)'\)/g)].forEach((m) => t.ok(false, `${f}: T('${m[1].slice(0, 50)}') has no English`));
      });
    });
  });
};
