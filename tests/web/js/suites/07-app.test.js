// App orchestrator (web/js/app.js): data consistency, routing and storage.
'use strict';

module.exports = (t, { createEnv, read }) => {
  const html = read('web/index.html');
  const tracerSrc = read('web/js/tracer.js');
  const fresh = () => {
    const env = createEnv();
    const mod = env.load('js/app.js', ['App', 'AREAS', 'MODULES', 'TOURS', 'GUIDE_LINES', 'MODULE_ORDER', 'BIT_SVG']);
    return { env, ...mod };
  };
  const { AREAS, MODULES, TOURS, GUIDE_LINES, MODULE_ORDER, BIT_SVG } = fresh();

  t.suite('app · configuration', () => {
    t.test('every module belongs to an existing work area (or none)', () => Object.values(MODULES).forEach((m) => t.ok(m.area === null || AREAS[m.area], m.title)));
    t.test('every work area has at least one station', () => Object.keys(AREAS).forEach((a) => t.ok(Object.values(MODULES).some((m) => m.area === a), a)));
    t.test('MODULE_ORDER lists every module exactly once', () => t.deepEq(MODULE_ORDER.slice().sort(), Object.keys(MODULES).sort()));
    t.test('Bit has something to say on every step of every station', () => Object.keys(MODULES).forEach((id) => {
      const g = GUIDE_LINES[id]; t.ok(g, id);
      if (MODULES[id].steps) ['play', 'learn', 'build'].forEach((s) => t.ok(g[s], `${id}.${s}`));
    }));
    t.test('every station with steps has a first-visit tour', () => Object.keys(MODULES).filter((id) => MODULES[id].steps).forEach((id) => t.ok(TOURS[id] && TOURS[id].length >= 3, id)));
    t.test('every tour target exists in the page (or in the tracer markup)', () => {
      Object.entries(TOURS).forEach(([id, steps]) => steps.forEach(({ sel }) => {
        sel.split(/\s+/).forEach((part) => {
          if (part.startsWith('#')) t.ok(html.includes(`id="${part.slice(1)}"`), `${id}: ${part}`);
          else if (part.startsWith('.')) t.ok(html.includes(part.slice(1)) || tracerSrc.includes(part.slice(1)), `${id}: ${part}`);
        });
      }));
    });
    t.test('the tracer stations point at a global station object', () => Object.values(MODULES).filter((m) => m.tracer).forEach((m) => t.ok(/Station$/.test(m.tracer))));
    t.test('Bit the robot blinks', () => t.includes(BIT_SVG, 'class="blink"'));
  });

  t.suite('app · routing', () => {
    const at = (hash) => { const ctx = fresh(); const app = new ctx.App(); app.init(); ctx.env.location.hash = hash; app.handleRoute(); return app; };
    t.test('#/ opens the intro', () => t.eq(at('#/').route, 'intro'));
    t.test('an empty hash opens the intro', () => t.eq(at('').route, 'intro'));
    t.test('#/about opens the FAQ', () => t.eq(at('#/about').route, 'about'));
    t.test('#/workshop opens the work areas', () => t.eq(at('#/workshop').route, 'workshop'));
    t.test('#/area/networking opens the networking bench', () => { const a = at('#/area/networking'); t.eq(a.route, 'area'); t.eq(a.currentArea, 'networking'); });
    t.test('an unknown bench falls back to the intro', () => t.eq(at('#/area/kitchen').route, 'intro'));
    t.test('#/workshop/sql/learn opens the SQL station on "Entiende"', () => { const a = at('#/workshop/sql/learn'); t.eq(a.route, 'module'); t.eq(a.currentTab, 'sql'); t.eq(a.currentStep, 'learn'); });
    t.test('an unknown step falls back to "Entiende", the first step', () => t.eq(at('#/workshop/sql/oops').currentStep, 'learn'));
    t.test('an unknown station falls back to the work areas', () => t.eq(at('#/workshop/nada').route, 'workshop'));
    t.test('the old Spanish URLs still open the right screens and are rewritten to English', () => {
      [['#/que-es', 'about', '#/about'], ['#/perfil', 'profile', '#/profile'], ['#/taller', 'workshop', '#/workshop'],
        ['#/taller/sql/build', 'module', '#/workshop/sql/build'], ['#/mesa/redes', 'area', '#/area/networking']].forEach(([old, route, now]) => {
        const ctx = fresh(); const app = new ctx.App(); app.init(); ctx.env.location.hash = old; app.handleRoute();
        t.eq(app.route, route, old); t.eq(ctx.env.location.hash, now, old);
      });
    });
    t.test('every old bench name maps to an existing bench', () => {
      ['algoritmos', 'paralela', 'redes', 'entrevistas', 'datos'].forEach((old) => { const a = at('#/mesa/' + old); t.eq(a.route, 'area', old); t.ok(AREAS[a.currentArea], old); });
    });
    t.test('every URL the app builds is in English', () => {
      const urls = [...html.matchAll(/href="#\/([\w-]+)/g)].map((m) => m[1]);
      urls.forEach((u) => t.ok(['about', 'profile', 'workshop', 'area'].includes(u), u));
      t.ok(!/#\/(taller|mesa|que-es|perfil)/.test(read('web/js/app.js').replace(/LEGACY_[A-Z]+ = [^\n]*/g, '')));
    });
    t.test('opening a station remembers its bench', () => t.eq(at('#/workshop/interview').currentArea, 'problems'));
    t.test('the back button of a station leads to its bench', () => { const ctx = fresh(); const app = new ctx.App(); app.init(); app.switchTab('networking'); t.eq(ctx.env.document.getElementById('btnBackToWelcome').href, '#/area/networking'); });
    t.test('the notebook goes back to the work areas', () => { const ctx = fresh(); const app = new ctx.App(); app.init(); app.switchTab('cheatsheets'); t.eq(ctx.env.document.getElementById('btnBackToWelcome').href, '#/workshop'); });
    t.test('the breadcrumb names the bench', () => { const ctx = fresh(); const app = new ctx.App(); app.init(); app.switchTab('sql'); t.eq(ctx.env.document.getElementById('modCrumb').textContent, 'Bases de Datos /'); });
  });

  t.suite('app · memory of what the student has seen', () => {
    t.test('markSeen then hasSeen round-trips through localStorage', () => { const ctx = fresh(); const app = new ctx.App(); t.eq(app.hasSeen('x'), false); app.markSeen('x'); t.eq(app.hasSeen('x'), true); });
    t.test('a broken localStorage does not crash the app', () => {
      const ctx = fresh(); const app = new ctx.App();
      ctx.env.localStorage.getItem = () => { throw new Error('blocked'); };
      ctx.env.localStorage.setItem = () => { throw new Error('blocked'); };
      t.eq(app.hasSeen('y'), false); app.markSeen('y');
    });
  });
};
