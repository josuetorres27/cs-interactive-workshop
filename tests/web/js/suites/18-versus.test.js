// Second review round: the algorithm vs. algorithm station, the tracer layout (code, variables,
// controls), outlined step tabs, titles that are never cut, straight notes and pages that fit.
'use strict';

module.exports = (t, { createEnv, read }) => {
  const html = read('web/index.html');
  const css = read('web/css/styles.css');
  const ALGOS = ['quick', 'merge', 'heap', 'shell', 'insertion', 'selection', 'bubble', 'radix'];
  const DISTS = ['random', 'nearly-sorted', 'reversed', 'few-unique'];
  const isSorted = (a) => a.every((x, i) => i === 0 || a[i - 1] <= x);

  const versus = (seed = 3) => {
    const env = createEnv({ seed });
    env.load('js/modules/versus.js');
    return { env, V: env.window.Versus, stn: env.window.versusStation };
  };

  t.suite('versus · the recorded races are real sorts', () => {
    const { V, env } = versus();
    ALGOS.forEach((algo) => DISTS.forEach((dist) => {
      t.test(`${algo} on a ${dist} array of 50`, () => {
        const input = V.makeArray(dist, 50, env.random);
        const run = V.trace(algo, input);
        t.ok(isSorted(run.sorted), `${algo}/${dist} not sorted`);
        t.deepEq(run.sorted, input.slice().sort((a, b) => a - b));
        t.eq(run.ops.length, run.comparisons + run.writes);
        // Replaying the operations on the input gives the same sorted array
        const a = input.slice();
        run.ops.forEach((op) => { if (op.t === 'swap') [a[op.i], a[op.j]] = [a[op.j], a[op.i]]; else if (op.t === 'set') a[op.i] = op.v; });
        t.deepEq(a, run.sorted);
      });
    }));
    t.test('Radix Sort never compares', () => t.eq(V.trace('radix', V.makeArray('random', 40, env.random)).comparisons, 0));
    t.test('the input array is never touched', () => {
      const input = [5, 3, 9, 1]; V.trace('quick', input); t.deepEq(input, [5, 3, 9, 1]);
    });
    t.test('an unknown algorithm is an error', () => t.throws(() => V.trace('bogo', [2, 1])));
  });

  t.suite('versus · who wins', () => {
    const { V, env } = versus(7);
    t.test('Quick Sort beats Bubble Sort on a random array', () => {
      const a = V.makeArray('random', 60, env.random);
      t.eq(V.verdict(V.trace('quick', a), V.trace('bubble', a)).winner, 'left');
    });
    t.test('Insertion Sort beats Quick Sort on a nearly sorted array (the upset)', () => {
      const a = V.makeArray('nearly-sorted', 60, env.random);
      t.eq(V.verdict(V.trace('insertion', a), V.trace('quick', a)).winner, 'left');
    });
    t.test('the same algorithm on both sides is a tie', () => {
      const a = V.makeArray('random', 30, env.random);
      t.deepEq(V.verdict(V.trace('heap', a), V.trace('heap', a)), { winner: null, ratio: 1 });
    });
    t.test('the ratio says how many times as many operations the loser needed', () => {
      const v = V.verdict({ ops: new Array(10) }, { ops: new Array(35) });
      t.eq(v.winner, 'left'); t.eq(v.ratio, 3.5);
    });
    t.test('the speed slider goes from a crawl to thousands of operations per second', () => {
      t.ok(V.opsPerSecond(1) < 3); t.ok(V.opsPerSecond(100) > 2000); t.ok(V.opsPerSecond(60) > V.opsPerSecond(59));
    });
  });

  t.suite('versus · the station', () => {
    const race = (left, right, dist = 'random') => {
      const { env, stn } = versus(11);
      const recorded = [];
      env.window.account = { record: (st, item) => recorded.push(`${st}:${item}`) };
      stn.init();
      stn.algos = { left, right }; stn.dist = dist; stn.shuffle();
      stn.speed = 100; stn.start();
      let now = 0;
      for (let i = 0; i < 2000 && !stn.finished; i++) { now += 100; env.rafs[env.rafs.length - 1](now); }
      return { env, stn, recorded };
    };
    t.test('a race runs to the end and both sides end sorted', () => {
      const { stn } = race('merge', 'selection');
      t.ok(stn.finished); t.eq(stn.isRunning, false);
      t.ok(isSorted(stn.lanes.left.arr)); t.ok(isSorted(stn.lanes.right.arr));
    });
    t.test('the winner lane is marked and the result names it', () => {
      const { env, stn } = race('quick', 'bubble');
      t.ok(stn.lanes.left.el.classList.contains('won')); t.ok(stn.lanes.right.el.classList.contains('lost'));
      t.eq(env.document.getElementById('vsResult').hidden, false);
      t.eq(env.document.getElementById('vsResultTitle').textContent, '¡Gana Quick Sort!');
    });
    t.test('finishing records the race, and an n log n beating an n² ticks that item', () => {
      t.deepEq(race('quick', 'bubble').recorded, ['versus:race', 'versus:nlogn']);
    });
    t.test('an n² beating an n log n is an upset', () => {
      t.deepEq(race('insertion', 'quick', 'nearly-sorted').recorded, ['versus:race', 'versus:upset']);
    });
    t.test('both sides always make the same number of operations per tick', () => {
      const { stn } = versus(2);
      stn.init(); stn.algos = { left: 'heap', right: 'bubble' }; stn.reset();
      stn.advance(25);
      t.eq(stn.lanes.left.pos, 25); t.eq(stn.lanes.right.pos, 25);
    });
    t.test('pausing stops the race where it is', () => {
      const { env, stn } = versus(4);
      stn.init(); stn.start(); t.eq(stn.isRunning, true);
      stn.pause(); t.eq(stn.isRunning, false);
      t.eq(env.document.getElementById('vsStatus').textContent, 'En pausa');
    });
    t.test('leaving the station pauses a running race', () => {
      const env = createEnv();
      env.load('js/modules/versus.js');
      const { App } = env.load('js/app.js', ['App']);
      const app = new App(); app.init();
      env.location.hash = '#/workshop/versus/play'; app.handleRoute();
      env.window.versusStation.start(); t.eq(env.window.versusStation.isRunning, true);
      env.location.hash = '#/area/algorithms'; app.handleRoute();
      t.eq(env.window.versusStation.isRunning, false);
    });
    t.test('it is a station of the algorithms bench, with its card, pane, steps and checklist', () => {
      const { MODULES, MODULE_ORDER, GUIDE_LINES, TOURS } = createEnv().load('js/app.js', ['MODULES', 'MODULE_ORDER', 'GUIDE_LINES', 'TOURS']);
      t.eq(MODULES.versus.area, 'algorithms'); t.eq(MODULES.versus.steps, true);
      t.eq(MODULE_ORDER[1], 'versus');
      t.ok(GUIDE_LINES.versus.play && GUIDE_LINES.versus.learn && GUIDE_LINES.versus.build);
      t.ok(TOURS.versus.length >= 3);
      t.includes(html, '<a href="#/workshop/versus" class="station-card" data-tab="versus"');
      t.includes(html, '<section id="tab-versus" class="tab-pane">');
      ['play', 'learn', 'build'].forEach((s) => t.ok(new RegExp(`id="tab-versus"[\\s\\S]*?data-step="${s}"[\\s\\S]*?MODULE: CONCURRENCY`).test(html), s));
      t.includes(html, '<script src="js/modules/versus.js"></script>');
      const env = createEnv(); env.load('js/progress.js');
      t.deepEq(env.window.Progress.CHECKLISTS.versus.items.map((i) => i.id), ['race', 'nlogn', 'upset']);
    });
    t.test('the algorithms bench says it has 4 stations', () => t.ok(/area\/algorithms" class="bench"[\s\S]*?4 estaciones/.test(html)));
    t.test('the station speaks English', () => {
      const env = createEnv(); env.localStorage.setItem('csworkshop-lang', 'en'); env.window.location.reload = () => {};
      env.load('js/i18n.js'); env.load('js/modules/versus.js');
      const stn = env.window.versusStation; stn.init();
      stn.algos = { left: 'quick', right: 'bubble' }; stn.reset(); stn.advance(1e6);
      t.eq(env.document.getElementById('vsResultTitle').textContent, 'Quick Sort wins!');
      t.includes(env.document.getElementById('vsResultText').textContent, 'operations');
    });
  });

  t.suite('review 2 · the tracer reads top to bottom: code, variables, controls', () => {
    const env = createEnv(); env.load('js/tracer.js'); env.load('js/modules/interview.js');
    const sk = env.window.Tracer.TraceStation.prototype.skeleton.call({ problems: env.window.problemStations.all });
    const left = sk.slice(sk.indexOf('class="tr-left"'), sk.indexOf('class="tr-right"'));
    const right = sk.slice(sk.indexOf('class="tr-right"'));
    t.test('the left column is code, then variables, then the player and its timeline', () => {
      const at = (s) => left.indexOf(s);
      ['tr-code-wrap', 'tr-vars', 'tr-controls', 'tr-scrub'].forEach((c) => t.ok(at(c) > 0, c));
      t.ok(at('tr-code-wrap') < at('tr-vars') && at('tr-vars') < at('tr-controls') && at('tr-controls') < at('tr-scrub'));
    });
    t.test('the right column keeps the stage and the step note', () => {
      t.includes(right, 'tr-stage'); t.includes(right, 'tr-note'); t.notIncludes(right, 'tr-vars');
    });
    t.test('a long code or variable list scrolls inside its box', () => {
      t.includes(css, '.tr-code { max-height: min(460px, 44vh); overflow: auto;');
      t.ok(/\.tr-vars-body \{[^}]*max-height: 13rem; overflow: auto;/.test(css));
    });
  });

  t.suite('review 2 · styles', () => {
    t.test('the step tabs have the same black outline as the other panels', () => {
      t.ok(/\.steps \{[^}]*border: var\(--outline\);/.test(css));
    });
    t.test('station titles leave room for their outline and shadow, so no letter is cut', () => {
      t.ok(/\.mod-title h2 \{[^}]*padding: \.14em \.2em \.24em \.08em; margin: -\.14em 0 -\.24em -\.08em;/.test(css));
    });
    t.test('the hand-written notes hang straight', () => {
      const note = css.match(/\n\.note \{[^}]*\}/)[0];
      t.notIncludes(note, 'rotate'); t.ok(!/\.tr-note \{[^}]*rotate/.test(css));
    });
    t.test('the footer no longer forces a scrollbar under a full-height screen', () => {
      t.includes(css, 'body { display: flex; flex-direction: column; }');
      t.includes(css, 'body > main { flex: 1 0 auto; }');
      t.includes(css, '.screen { position: relative; z-index: 1; display: none; }');
      t.includes(css, '#screen-intro { min-height: 100vh; }');
    });
    t.test('a screen that fits the window shares the spare height above and below its content', () => {
      t.includes(css, 'body > main { display: flex; flex-direction: column; }');
      t.includes(css, '.screen.is-active:not(#screen-intro) { flex: 1 0 auto; display: flex; flex-direction: column; }');
      t.includes(css, '.screen.is-active:not(#screen-intro):not(#screen-module) > .wrap { margin-block: auto; }');
      // In a station only the problem shelf is centred, so the steps never jump around
      t.includes(css, '#screen-module.is-active:has(.tab-pane.active.choosing) > .mod-body { margin-block: auto;');
    });
    t.test('benches and bench stations are compact enough to fit one screen', () => {
      t.ok(/\.bench \{[^}]*grid-template-columns: 84px 1fr;/.test(css));
      t.includes(css, '#areaShelf .station { flex: 0 1 216px; min-width: 196px; }');
      t.includes(css, '#areaShelf .station-art { aspect-ratio: 16 / 9;');
    });
  });
};
