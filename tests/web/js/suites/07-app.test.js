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
    t.test('#/que-es opens the FAQ', () => t.eq(at('#/que-es').route, 'about'));
    t.test('#/taller opens the work areas', () => t.eq(at('#/taller').route, 'taller'));
    t.test('#/mesa/redes opens the networking bench', () => { const a = at('#/mesa/redes'); t.eq(a.route, 'area'); t.eq(a.currentArea, 'redes'); });
    t.test('an unknown bench falls back to the intro', () => t.eq(at('#/mesa/cocina').route, 'intro'));
    t.test('#/taller/sql/learn opens the SQL station on "Entiende"', () => { const a = at('#/taller/sql/learn'); t.eq(a.route, 'module'); t.eq(a.currentTab, 'sql'); t.eq(a.currentStep, 'learn'); });
    t.test('an unknown step falls back to "Entiende", the first step', () => t.eq(at('#/taller/sql/oops').currentStep, 'learn'));
    t.test('an unknown station falls back to the work areas', () => t.eq(at('#/taller/nada').route, 'taller'));
    t.test('opening a station remembers its bench', () => t.eq(at('#/taller/interview').currentArea, 'entrevistas'));
    t.test('the back button of a station leads to its bench', () => { const ctx = fresh(); const app = new ctx.App(); app.init(); app.switchTab('networking'); t.eq(ctx.env.document.getElementById('btnBackToWelcome').href, '#/mesa/redes'); });
    t.test('the notebook goes back to the work areas', () => { const ctx = fresh(); const app = new ctx.App(); app.init(); app.switchTab('cheatsheets'); t.eq(ctx.env.document.getElementById('btnBackToWelcome').href, '#/taller'); });
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
