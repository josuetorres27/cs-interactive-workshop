// Review round: problems as sub-stations, level stations that read as separate, rows without gaps,
// simulations that stop when you leave, and the small visual fixes (gear, lamps, subtitle, screws).
'use strict';

module.exports = (t, { createEnv, read }) => {
  const html = read('web/index.html');
  const css = read('web/css/styles.css');
  const TRACERS = ['problems-easy', 'problems-medium', 'problems-hard', 'datastructures-easy', 'datastructures-medium', 'sql'];

  const boot = (hash) => {
    const env = createEnv();
    env.load('js/tracer.js');
    ['interview', 'datastructures', 'sql'].forEach((m) => env.load(`js/modules/${m}.js`));
    if (hash) env.location.hash = hash;
    const { App } = env.load('js/app.js', ['App']);
    const app = new App(); app.init();
    const $ = (id) => env.document.getElementById(id);
    const open = (h) => { env.location.hash = h; app.handleRoute(); };
    return { env, app, $, open };
  };

  t.suite('review · problems are sub-stations', () => {
    t.test('every tracer station has a shelf slot at the top of its pane', () => TRACERS.forEach((id) => {
      const pane = html.slice(html.indexOf(`<section id="tab-${id}" class="tab-pane">`));
      t.ok(/^<section[^>]*>\s*<div class="problem-chooser" id="tracer-[\w-]+-chooser"><\/div>/.test(pane), id);
      t.includes(pane.slice(0, 200), `id="tracer-${id}-chooser"`, id);
    }));
    t.test('opening a station shows its problems, not the steps', () => {
      const { app, $ } = boot('#/workshop/problems-medium');
      t.eq(app.route, 'module'); t.eq(app.currentTab, 'problems-medium'); t.eq(app.currentProblem, null); t.eq(app.choosing, true);
      t.ok($('tab-problems-medium').classList.contains('choosing'));
      t.eq($('modSteps').hidden, true);
      t.eq((($('tracer-problems-medium-chooser').innerHTML).match(/class="station-card problem-card"/g) || []).length, 6);
    });
    t.test('choosing a problem opens it on Entiende, with its own title and steps', () => {
      const { app, $, env } = boot('#/workshop/problems-medium/number-of-islands');
      t.eq(app.currentProblem, 'number-of-islands'); t.eq(app.currentStep, 'learn'); t.eq(app.choosing, false);
      t.ok(!$('tab-problems-medium').classList.contains('choosing'));
      t.eq($('modSteps').hidden, false);
      t.eq($('activeMissionLabel').textContent, 'Contar islas');
      t.eq($('modCrumb').textContent, 'Problemas de Código / Problemas clásicos · Media /');
      t.eq(env.window.problemStations.medium.problem.id, 'number-of-islands');
    });
    t.test('each problem has its own address for every step', () => {
      const { app, open } = boot();
      open('#/workshop/problems-hard/trap-rain/play'); t.eq(app.currentProblem, 'trap-rain'); t.eq(app.currentStep, 'play');
      open('#/workshop/datastructures-medium/bst-insert/build'); t.eq(app.currentProblem, 'bst-insert'); t.eq(app.currentStep, 'build');
      t.eq(app.moduleHash('play'), '#/workshop/datastructures-medium/bst-insert/play');
      t.eq(app.moduleHash('learn'), '#/workshop/datastructures-medium/bst-insert');
    });
    t.test('the back button goes from a problem to its station, and from the station to the bench', () => {
      const { $, open } = boot();
      open('#/workshop/sql/group-having'); t.eq($('btnBackToWelcome').href, '#/workshop/sql');
      open('#/workshop/sql'); t.eq($('btnBackToWelcome').href, '#/area/databases');
    });
    t.test('an unknown problem (or an old step link) falls back to the shelf', () => {
      const { app, env, open } = boot();
      open('#/workshop/problems-easy/nope'); t.eq(app.choosing, true); t.eq(env.location.hash, '#/workshop/problems-easy');
      open('#/workshop/problems-easy/build'); t.eq(app.choosing, true);
    });
    t.test('the arrow keys only drive the tracer once a problem is open', () => {
      const { app, open } = boot();
      open('#/workshop/problems-easy'); t.eq(app.tracer(), null);
      open('#/workshop/problems-easy/binary-search/play'); t.ok(app.tracer()); t.eq(app.tracer().problem.id, 'binary-search');
    });
    t.test('Bit explains the shelf', () => {
      const { $ } = boot('#/workshop/sql');
      t.includes($('guideText').textContent, 'Escoge un problema');
    });
    t.test('solved problems get a check on their card', () => {
      const { env, app } = boot('#/workshop/problems-easy');
      env.window.account = { progress: { stations: { 'problems-easy': { items: { 'solve:binary-search': 1 } } } }, stats: () => ({ done: 0, total: 0 }) };
      // The fake DOM does not parse markup, so hand it the cards the shelf drew
      const shelf = env.document.getElementById('tracer-problems-easy-chooser').innerHTML;
      const cards = [...shelf.matchAll(/<a href="([^"]+)" class="station-card problem-card" data-problem="([\w-]+)">/g)].map(([, href, id]) => {
        const el = env.document.createElement('a'); el.setAttribute('href', href); el.dataset = { problem: id }; return el;
      });
      t.eq(cards.length, 4);
      env.document.__setQueryAll('.problem-card[data-problem]', cards);
      app.updateProgressBadges();
      const solved = cards.filter((c) => c.classList.contains('solved')).map((c) => c.dataset.problem);
      t.deepEq(solved, ['binary-search']);
      t.includes(cards.find((c) => c.dataset.problem === 'binary-search').querySelector('.card-progress').innerHTML, 'resuelto');
    });
    t.test('the tour starts at the problem statement, not at a picker', () => {
      const src = read('web/js/app.js');
      t.includes(src, "sel: `#tracer-${id} .tr-brief`"); t.notIncludes(src, '.tr-picker');
    });
    t.test('the shelf is in English too', () => {
      const env = createEnv(); env.localStorage.setItem('csworkshop-lang', 'en'); env.load('js/i18n.js');
      env.load('js/tracer.js'); env.load('js/modules/interview.js');
      const shelf = env.window.problemStations.easy.chooser();
      t.includes(shelf, 'Solve it'); t.notIncludes(shelf, 'Resolver');
    });
  });

  t.suite('review · level stations read as separate stations', () => {
    t.test('every level card names its level in the title', () => {
      ['Problemas clásicos · Fácil', 'Problemas clásicos · Media', 'Problemas clásicos · Difícil', 'Estructuras de datos · Fácil', 'Estructuras de datos · Media']
        .forEach((name) => t.includes(html, `<h3 class="station-name">${name}</h3>`, name));
    });
    t.test('the bench counts match the stations behind them', () => {
      const { MODULES } = createEnv().load('js/app.js', ['MODULES']);
      [...html.matchAll(/<a href="#\/area\/(\w+)" class="bench"[\s\S]*?<span class="bench-go">(\d+) estaci/g)].forEach(([, area, n]) => {
        t.eq(Number(n), Object.values(MODULES).filter((m) => m.area === area).length, area);
      });
    });
  });

  t.suite('review · rows without gaps', () => {
    t.test('station shelves wrap and centre a short last row', () => {
      t.ok(/\.shelf \{\s*display: flex; flex-wrap: wrap; justify-content: center;/.test(css));
      t.ok(/\.station \{ position: relative; flex: 0 1 300px;/.test(css));
    });
    t.test('About cards, benches and progress cards centre a short last row (three per row at most)', () => {
      t.includes(css, '.faq-board, .benches, .progress-stations { display: flex; flex-wrap: wrap; justify-content: center; }');
      t.includes(css, 'max-width: calc((100% - 2 * var(--row-gap)) / 3);');
      ['.faq-board {', '.benches {', '.progress-stations {'].forEach((sel) => t.ok(new RegExp(`\\${sel}[^}]*--row-gap:`).test(css), sel));
    });
    t.test('learn and implement cards grow to fill the last row', () => {
      t.includes(css, '.learn-grid { display: flex; flex-wrap: wrap; gap: 1.6rem; }');
      t.includes(css, '.learn-grid > * { flex: 1 1 300px; min-width: 0; }');
      t.includes(css, '.learn-grid > .learn-card.wide { flex-basis: 100%; }');
      t.notIncludes(css, 'grid-column: 1 / -1; }\n.amdahl');
    });
  });

  t.suite('review · simulations stop when you leave', () => {
    const fakes = (env) => {
      const calls = [];
      env.window.algorithmsStation = { isRunning: true, pause() { calls.push('sort'); this.isRunning = false; } };
      env.window.heatStation = { running: true, pause() { calls.push('heat'); this.running = false; } };
      return calls;
    };
    t.test('leaving the sorting station stops the race', () => {
      const { env, open } = boot('#/workshop/algorithms/play');
      const calls = fakes(env); env.window.heatStation.running = false;
      open('#/area/algorithms'); t.deepEq(calls, ['sort']);
    });
    t.test('leaving the heat station pauses the plate', () => {
      const { env, open } = boot('#/workshop/heat/play');
      const calls = fakes(env); env.window.algorithmsStation.isRunning = false;
      open('#/workshop'); t.deepEq(calls, ['heat']);
    });
    t.test('switching to another step also stops it', () => {
      const { env, app } = boot('#/workshop/algorithms/play');
      const calls = fakes(env); env.window.heatStation.running = false;
      app.setStep('learn'); t.deepEq(calls, ['sort']);
    });
    t.test('nothing is stopped twice when nothing runs', () => {
      const { env, open } = boot('#/workshop/algorithms/play');
      const calls = fakes(env); env.window.algorithmsStation.isRunning = false; env.window.heatStation.running = false;
      open('#/'); t.deepEq(calls, []);
    });
  });

  t.suite('review · visual fixes', () => {
    t.test('the gear is a toothed cog, not a ship\'s wheel', () => {
      const gear = html.match(/<symbol id="i-gear"[\s\S]*?<\/symbol>/)[0];
      t.notIncludes(gear, 'M12 2.8v2.4'); t.ok((gear.match(/ L/g) || []).length >= 31, 'eight teeth');
      t.includes(gear, '<circle cx="12" cy="12" r="3.2"/>');
    });
    t.test('the side lamps hang further from the centre', () => {
      t.includes(css, '.lamp-l { left: calc(50% - clamp(190px, 22vw, 400px)); }');
      t.includes(css, '.lamp-r { left: calc(50% + clamp(190px, 22vw, 400px)); }');
    });
    t.test('the subtitle starts with a capital letter in both languages', () => {
      t.includes(html, '<p class="sign-sub">Un taller de computación para aprender haciendo</p>');
      t.includes(read('web/js/i18n/en.js'), '"A computer science workshop for learning by doing"');
    });
    t.test('the corner screws are a slightly darker grey, not black', () => {
      t.includes(css, '--screw-head: radial-gradient(circle, #9aa2ad');
      t.ok(/\.screw \{[^}]*background: #9aa2ad;/.test(css));
    });
  });
};
