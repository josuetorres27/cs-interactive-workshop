// Fine-tuning: the settings menu, the home credits, the About page, the footer and El Cuaderno (with its notebook).
'use strict';

module.exports = (t, { createEnv, read }) => {
  const html = read('web/index.html');
  const css = read('web/css/styles.css');
  const block = (selector) => { const i = css.indexOf(selector + ' {'); return css.slice(i, css.indexOf('\n}', i)); };
  const bar = html.match(/<div class="corner-bar">[\s\S]*?\n  <\/div>/)[0];
  const cuaderno = html.slice(html.indexOf('id="tab-cheatsheets"'), html.indexOf('<!-- Bit, the guide -->'));

  t.suite('tuning · settings menu', () => {
    t.test('the top bar keeps account, help, fullscreen and a gear', () => {
      const top = bar.replace(/<div id="settingsMenu"[\s\S]*?\n {6}<\/div>/, '');
      t.deepEq([...top.matchAll(/id="(btn\w+)"/g)].map((m) => m[1]), ['btnAccount', 'btnHelp', 'btnToggleFullscreen', 'btnSettings']);
      t.includes(bar, '<use href="#i-gear"/>'); t.includes(html, '<symbol id="i-gear"');
    });
    t.test('language, theme and sound live inside the gear menu', () => {
      const menu = bar.match(/<div id="settingsMenu"[\s\S]*?\n {6}<\/div>/)[0];
      t.deepEq([...menu.matchAll(/<button id="(\w+)"/g)].map((m) => m[1]), ['btnLang', 'btnTheme', 'btnToggleSound']);
      t.ok(/role="menu" hidden/.test(menu));
      t.ok(/aria-haspopup="true" aria-expanded="false" aria-controls="settingsMenu"/.test(bar));
    });
    t.test('the GitHub link left the top bar', () => t.notIncludes(bar, 'github.com'));

    const setup = (lang) => {
      const env = createEnv();
      if (lang) env.localStorage.setItem('csworkshop-lang', lang);
      env.window.location.reload = () => {};
      env.window.Event = class { constructor(type) { this.type = type; } };
      env.window.dispatchEvent = () => {};
      env.load('js/theme.js'); env.load('js/i18n.js');
      env.window.soundController.muted = false;
      env.window.soundController.toggleMute = () => (env.window.soundController.muted = !env.window.soundController.muted);
      const { App } = env.load('js/app.js', ['App']);
      const app = Object.create(App.prototype);
      const toasts = []; app.showToast = (m) => toasts.push(m);
      const menu = env.document.getElementById('settingsMenu'); menu.hidden = true;
      menu.contains = () => false;
      app.setupGlobalControls();
      const $ = (id) => env.document.getElementById(id);
      const value = (id) => $(id).querySelector('.settings-value').textContent;
      const label = (id) => $(id).querySelector('.settings-label').textContent;
      return { env, app, menu, $, value, label, toasts };
    };
    t.test('the gear opens and closes the menu and says so', () => {
      const { $, menu } = setup();
      $('btnSettings').click(); t.eq(menu.hidden, false); t.eq($('btnSettings').getAttribute('aria-expanded'), 'true');
      $('btnSettings').click(); t.eq(menu.hidden, true); t.eq($('btnSettings').getAttribute('aria-expanded'), 'false');
    });
    t.test('a click elsewhere or Escape closes it', () => {
      const { $, menu, env, app } = setup();
      $('btnSettings').click();
      env.document.__listeners.click.forEach((fn) => fn({ target: env.document.body }));
      t.eq(menu.hidden, true);
      $('btnSettings').click(); app.endTour = () => {}; app.setupKeyboardShortcuts();
      env.window.__listeners.keydown.forEach((fn) => fn({ key: 'Escape', target: env.document.body, preventDefault() {} }));
      t.eq(menu.hidden, true);
    });
    t.test('each row shows its setting and current value', () => {
      const { label, value } = setup();
      t.eq(label('btnLang'), 'Idioma'); t.eq(value('btnLang'), 'Español');
      t.eq(label('btnTheme'), 'Tema'); t.eq(value('btnTheme'), 'Laboratorio');
      t.eq(label('btnToggleSound'), 'Sonido'); t.eq(value('btnToggleSound'), 'Encendido');
    });
    t.test('the rows update when used', () => {
      const { $, value, toasts } = setup();
      $('btnTheme').click(); t.eq(value('btnTheme'), 'Madera'); t.eq($('btnTheme').getAttribute('aria-pressed'), 'true');
      $('btnToggleSound').click(); t.eq(value('btnToggleSound'), 'Apagado'); t.eq($('btnToggleSound').getAttribute('aria-pressed'), 'false');
      t.eq(toasts.length, 2);
    });
    t.test('the menu speaks English too', () => {
      const { label, value, $ } = setup('en');
      t.eq(label('btnLang'), 'Language'); t.eq(value('btnLang'), 'English');
      t.eq(label('btnTheme'), 'Theme'); t.eq(label('btnToggleSound'), 'Sound'); t.eq($('btnSettings').title, 'Settings');
    });
    t.test('the menu is a solid panel with hard shadows', () => {
      const m = block('.settings-menu');
      t.includes(m, 'border: var(--outline)'); t.includes(m, 'box-shadow: var(--drop)');
    });
  });

  t.suite('tuning · home, About and footer', () => {
    t.test('both credit lines on the title screen use the same letter size', () => {
      t.notIncludes(css, '.intro-credit {');
      t.ok(/font-size: \.95rem/.test(block('.intro-foot')));
    });
    t.test('"¿Listo?" is gone from the About page, the button stays', () => {
      const cta = html.match(/<div class="faq-cta">[\s\S]*?<\/div>/)[0];
      t.notIncludes(cta, '¿Listo?'); t.includes(cta, 'href="#/workshop"');
    });
    t.test('About cards move when you point at them', () => {
      t.includes(block('.faq'), 'transition: transform');
      t.ok(/\.faq:hover \{ transform: translateY\(-5px\)/.test(css));
    });
    t.test('the author card links to the code on GitHub', () => {
      const faq = html.match(/<h3>¿Quién lo hizo\?<\/h3>[\s\S]*?<\/article>/)[0];
      t.ok(/<a href="https:\/\/github\.com\/josuetorres27\/cs-interactive-workshop" target="_blank" rel="noopener" class="btn [^"]*"><svg class="ic"><use href="#i-github"\/><\/svg>Ver el código en GitHub<\/a>/.test(faq));
    });
    t.test('the footer only names the workshop and its author', () => {
      const foot = html.match(/<footer class="footer">([\s\S]*?)<\/footer>/)[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      t.eq(foot, 'CS Interactive Workshop · Creado por Josué Torres Sibaja');
    });
  });

  t.suite('tuning · El Cuaderno layout', () => {
    const cards = [...cuaderno.matchAll(/<article class="([^"]+)">\s*<h3>([^<]+)<\/h3>/g)].map((m) => [m[1], m[2]]);
    t.test('notes first, then the three references, all across the page', () => {
      t.deepEq(cards.map((c) => c[1]), ['Mis apuntes', 'Ley de Amdahl', 'Sincronización y sockets de un vistazo', 'Algoritmos de ordenamiento de un vistazo']);
      cards.forEach(([cls, h]) => t.includes(cls, 'wide', h));
    });
    t.test('the cheat sheet has its new name', () => { t.notIncludes(html, 'Chuleta de sincronización'); t.notIncludes(html, 'Forro'); });
    t.test('the wide cards split into two columns, and stack on phones', () => {
      t.ok(/\.amdahl-grid \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/.test(css));
      t.ok(/\.sync-grid \{ display: grid;/.test(css));
      t.ok(/@media \(max-width: 760px\) \{ \.amdahl-grid, \.sync-grid \{ grid-template-columns: 1fr; \} \}/.test(css));
      ['amdahlFraction', 'amdahlProcessors', 'amdahlSpeedupVal', 'amdahlMaxSpeedupVal', 'amdahlEfficiencyVal'].forEach((id) => t.includes(cuaderno, `id="${id}"`));
    });
    t.test('the notebook loads after El Cuaderno and starts with the other stations', () => {
      const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
      t.ok(scripts.indexOf('js/modules/notebook.js') > scripts.indexOf('js/modules/cheatsheets.js'));
      t.ok(scripts.indexOf('js/modules/notebook.js') < scripts.indexOf('js/app.js'));
      t.includes(read('web/js/app.js'), "'notebookStation'");
      t.includes(cuaderno, '<div id="notebook"></div>');
    });
  });

  t.suite('tuning · notebook model', () => {
    const env = createEnv(); env.load('js/modules/notebook.js');
    const N = env.window.Notebook;
    const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), raw: m }; };
    const make = (n = 1) => { let notes = []; for (let i = 0; i < n; i++) notes = N.create(notes, { now: 1000 + i }).notes; return notes; };

    t.test('a new note is blank, general and on top', () => {
      const { notes, note } = N.create(make(2), { now: 5000 });
      t.eq(notes[0].id, note.id); t.eq(note.title, ''); t.eq(note.body, ''); t.eq(note.topic, 'general'); t.eq(note.updated, 5000);
    });
    t.test('a note can be created inside a topic', () => t.eq(N.create([], { topic: 'sql' }).note.topic, 'sql'));
    t.test('ids are unique', () => { const ids = make(50).map((n) => n.id); t.eq(new Set(ids).size, 50); });
    t.test('editing changes only that note and its time', () => {
      const notes = make(2); const [a, b] = notes;
      const next = N.update(notes, a.id, { title: 'Mutex', body: 'lock / unlock', topic: 'concurrency' }, 9000);
      const a2 = next.find((n) => n.id === a.id);
      t.eq(a2.title, 'Mutex'); t.eq(a2.body, 'lock / unlock'); t.eq(a2.topic, 'concurrency'); t.eq(a2.updated, 9000);
      t.deepEq(next.find((n) => n.id === b.id), b); t.eq(notes[0].title, '');
    });
    t.test('an unknown topic is ignored', () => { const n = make(1); t.eq(N.update(n, n[0].id, { topic: 'cocina' })[0].topic, 'general'); });
    t.test('long texts are clipped', () => {
      const n = make(1); const u = N.update(n, n[0].id, { title: 'x'.repeat(500), body: 'y'.repeat(N.MAX_BODY + 50) })[0];
      t.eq(u.title.length, N.MAX_TITLE); t.eq(u.body.length, N.MAX_BODY);
    });
    t.test('removing deletes just that note', () => { const n = make(3); t.deepEq(N.remove(n, n[1].id).map((x) => x.id), [n[0].id, n[2].id]); });
    t.test('there is a limit on the number of notes', () => {
      let notes = []; for (let i = 0; i < N.MAX_NOTES; i++) notes = N.create(notes).notes;
      const r = N.create(notes); t.eq(r.note, null); t.eq(r.notes.length, N.MAX_NOTES);
    });
    t.test('notes survive a reload', () => {
      const s = store(); let notes = make(2); notes = N.update(notes, notes[0].id, { title: 'Big-O', body: 'n log n' });
      t.ok(N.save(s, notes)); t.deepEq(N.load(s), notes);
    });
    t.test('broken or hostile storage loads as an empty or cleaned list', () => {
      const s = store(); t.deepEq(N.load(s), []);
      s.setItem(N.KEY, '{not json'); t.deepEq(N.load(s), []);
      s.setItem(N.KEY, JSON.stringify({ a: 1 })); t.deepEq(N.load(s), []);
      s.setItem(N.KEY, JSON.stringify([null, 5, { id: 'a', title: 7, body: '<b>x</b>', topic: 'evil', updated: 'x', extra: 1 }, { id: 'a', title: 'dup' }]));
      t.deepEq(N.load(s), [{ id: 'a', title: '7', body: '<b>x</b>', topic: 'general', updated: 0 }]);
    });
    t.test('a full or blocked storage does not throw', () => t.eq(N.save({ setItem() { throw new Error('quota'); } }, make(1)), false));
    t.test('search looks in titles and text, ignoring case and accents, newest first', () => {
      let notes = make(3);
      notes = N.update(notes, notes[0].id, { title: 'Semáforos', topic: 'concurrency' }, 10);
      notes = N.update(notes, notes[1].id, { body: 'el SEMAFORO binario es un mutex', topic: 'concurrency' }, 30);
      notes = N.update(notes, notes[2].id, { title: 'JOIN', topic: 'sql' }, 20);
      t.deepEq(N.filter(notes, { q: 'semaforo' }).map((n) => n.updated), [30, 10]);
      t.deepEq(N.filter(notes, { topic: 'sql' }).map((n) => n.title), ['JOIN']);
      t.deepEq(N.filter(notes, { q: 'mutex', topic: 'sql' }), []);
      t.deepEq(N.filter(notes).map((n) => n.updated), [30, 20, 10]);
    });
    t.test('the list shows the title, else the first line, else a placeholder', () => {
      t.eq(N.heading({ title: ' Hilos ', body: 'x' }), 'Hilos');
      t.eq(N.heading({ title: '', body: '\n  primera línea\nsegunda' }), 'primera línea');
      t.eq(N.heading({ title: '', body: '' }), 'Nota sin título');
    });
    t.test('every workshop topic can be chosen, plus General', () => {
      t.deepEq(N.TOPICS.map((x) => x.id), ['general', 'algorithms', 'datastructures', 'concurrency', 'heat', 'networking', 'interview', 'sql']);
    });
    t.test('writing a note counts towards El Cuaderno', () => {
      const p = createEnv(); p.load('js/progress.js');
      t.ok(p.window.Progress.CHECKLISTS.cheatsheets.items.some((i) => i.id === 'note'));
    });
  });

  t.suite('tuning · notebook on the page', () => {
    const boot = (saved) => {
      const env = createEnv();
      if (saved) env.localStorage.setItem('csworkshop-notes', JSON.stringify(saved));
      env.load('js/modules/notebook.js');
      const st = env.window.notebookStation;
      const root = env.document.getElementById('notebook');
      st.init();
      const recorded = []; env.window.account = { record: (s, i) => recorded.push(`${s}:${i}`) };
      return { env, st, root, recorded, saved: () => JSON.parse(env.localStorage.getItem('csworkshop-notes') || '[]') };
    };
    t.test('it draws the toolbar, list and editor', () => {
      const { root } = boot();
      ['nb-new', 'nb-search', 'nb-filter', 'nb-list', 'nb-title', 'nb-topic', 'nb-body', 'nb-delete'].forEach((c) => t.ok(new RegExp(`class="[^"]*\\b${c}\\b`).test(root.innerHTML), c));
    });
    t.test('with no notes it shows the welcome text', () => { const { st } = boot(); t.eq(st.current, null); });
    t.test('it opens the newest saved note', () => {
      const { st } = boot([{ id: 'a', title: 'Vieja', body: '', topic: 'general', updated: 1 }, { id: 'b', title: 'Nueva', body: '', topic: 'sql', updated: 9 }]);
      t.eq(st.current, 'b');
    });
    t.test('New note creates one; pressing it again on a blank note does not pile up blanks', () => {
      const { st } = boot(); st.add(); st.add(); t.eq(st.notes.length, 1); t.eq(st.current, st.notes[0].id);
    });
    t.test('typing saves on its own and counts the first note', async () => {
      const { st, saved, recorded } = boot(); st.add();
      st.edit({ title: 'Deadlock', body: 'cuatro condiciones' });
      await new Promise((r) => setTimeout(r, 0));
      st.flush();
      t.eq(saved()[0].title, 'Deadlock'); t.deepEq(recorded, ['cheatsheets:note']);
    });
    t.test('a blank note does not count as written', () => { const { st, recorded } = boot(); st.add(); st.edit({ title: '  ' }); st.flush(); t.deepEq(recorded, []); });
    t.test('deleting a note with content asks first', () => {
      const { st, env, saved } = boot([{ id: 'a', title: 'Algo', body: 'x', topic: 'general', updated: 1 }]);
      env.window.confirm = () => false; st.del(); t.eq(saved().length, 1);
      env.window.confirm = () => true; st.del(); t.eq(saved().length, 0); t.eq(st.current, null);
    });
    t.test('a blank note is deleted without asking', () => {
      const { st, env } = boot(); let asked = false; env.window.confirm = () => { asked = true; return true; };
      st.add(); st.del(); t.eq(asked, false); t.eq(st.notes.length, 0);
    });
    t.test('note text is escaped in the list', () => {
      const { root } = boot([{ id: 'a', title: '<img src=x onerror=alert(1)>', body: '', topic: 'general', updated: 1 }]);
      const list = root.querySelector('.nb-list').innerHTML;
      t.notIncludes(list, '<img'); t.includes(list, '&lt;img');
    });
    t.test('the page without a notebook slot does nothing', () => {
      const env = createEnv(); env.load('js/modules/notebook.js'); env.document.getElementById = () => null;
      env.window.notebookStation.init(); t.ok(true);
    });
  });
};
