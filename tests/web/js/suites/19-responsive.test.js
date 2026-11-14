// Phones and tablets: the step tabs fit, titles wrap, the player stays in reach, Bit does not
// cover a station, and the tablet layout (834×1194) uses its extra room.
'use strict';

module.exports = (t, { createEnv, read }) => {
  const css = read('web/css/styles.css');
  // The body of the first @media block with this exact condition that contains `marker`
  const block = (cond, marker) => {
    let at = 0;
    for (;;) {
      const i = css.indexOf(`@media ${cond} {`, at);
      if (i < 0) return '';
      let depth = 0, j = css.indexOf('{', i);
      for (let k = j; k < css.length; k++) {
        if (css[k] === '{') depth++;
        else if (css[k] === '}' && --depth === 0) { const body = css.slice(j + 1, k); if (!marker || body.includes(marker)) return body; at = k; break; }
      }
    }
  };

  t.suite('responsive · phones', () => {
    const phone = block('(max-width: 600px)', '.steps');
    t.test('the three step tabs share the bar without scrolling sideways', () => {
      t.includes(phone, '.step { flex: 1 1 0; min-width: 0;');
      t.includes(phone, '.step-n { flex: none; width: 18px; height: 18px;');
    });
    t.test('long station titles wrap instead of being cut', () => t.includes(phone, '.mod-title h2 { white-space: normal;'));
    t.test('the player fits on one row', () => {
      t.includes(phone, '.tr-controls .round-btn.sm { width: 34px; height: 34px; }');
      t.includes(phone, '.tr-controls .tr-play { flex: 1; min-width: 0;');
    });
    t.test('the heat station code stays inside its card', () => {
      t.includes(block('(max-width: 900px)', '.stencil'), '.stencil > pre { justify-self: stretch; min-width: 0; max-width: 100%; }');
    });
    t.test('the networking scene stacks only on phones', () => {
      t.includes(block('(max-width: 700px)', '.net-scene'), '.net-scene { grid-template-columns: 1fr; }');
      t.includes(block('(max-width: 900px)', '.net-scene'), '.net-scene { grid-template-columns: minmax(0, 1fr) 96px minmax(0, 1fr); }');
    });
  });

  t.suite('responsive · one column (phones and tablets)', () => {
    const narrow = block('(max-width: 900px)', '.mod-bar');
    const tracer = block('(max-width: 900px)', '.tr-main');
    t.test('the station title scrolls away instead of sticking over the content', () => t.includes(narrow, '.mod-bar { position: relative; padding-top: 70px; }'));
    t.test('the tracer reads code, variables, player, then the stage, with the player stuck in reach', () => {
      t.includes(tracer, '.tr-left, .tr-right { display: contents; }');
      t.includes(tracer, '.tr-main .tr-controls { position: sticky; top: 64px; z-index: 6; }');
    });
    t.test('Bit steps aside inside a station (his bubble still opens from ?)', () => {
      t.includes(narrow, 'body[data-route="module"] #guideBit { display: none; }');
      t.notIncludes(narrow, 'body[data-route="module"] .guide {');
    });
    t.test('race counters go two per row', () => t.includes(narrow, '.vs-stats > div:last-child { grid-column: 1 / -1; }'));
    t.test('the app tells the page which screen is showing', () => {
      const env = createEnv();
      const { App } = env.load('js/app.js', ['App']);
      const app = new App(); app.init();
      env.location.hash = '#/workshop/heat/play'; app.handleRoute();
      t.eq(env.document.body.dataset.route, 'module');
      env.location.hash = '#/workshop'; app.handleRoute();
      t.eq(env.document.body.dataset.route, 'workshop');
    });
  });

  t.suite('responsive · tablet (834×1194)', () => {
    const tablet = block('(min-width: 601px) and (max-width: 1024px)');
    const portrait = block('(min-width: 601px) and (max-width: 900px)');
    t.test('workbench cards keep a bigger drawing', () => {
      t.includes(tablet, '.bench { grid-template-columns: 100px 1fr;');
      t.includes(tablet, '.bench-art { width: 100px; }');
    });
    t.test('bench stations and problem cards are larger', () => {
      t.includes(tablet, '#areaShelf .station { flex: 0 1 240px; }');
      t.includes(tablet, '.problem-shelf .station { flex-basis: 340px; }');
    });
    t.test('the control clipboards spread over two columns above the stage', () => {
      t.includes(portrait, '.workspace-grid > .clipboard { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));');
      t.includes(portrait, '.workspace-grid > .clipboard > div:not(.ctl) { grid-column: 1 / -1; }');
    });
  });
};
