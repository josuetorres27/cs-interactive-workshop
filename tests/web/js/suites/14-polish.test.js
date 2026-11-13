// UI polish: the toast limit and the shared type, shape and colour system.
'use strict';

module.exports = (t, { createEnv, read }) => {
  const html = read('web/index.html');
  const css = read('web/css/styles.css');
  const block = (selector) => { const i = css.indexOf(selector + ' {'); return css.slice(i, css.indexOf('\n}', i)); };
  const lab = block(':root');
  const wood = block(':root[data-theme="madera"]');

  t.suite('polish · toasts', () => {
    const setup = () => {
      const env = createEnv();
      const { App, MAX_TOASTS } = env.load('js/app.js', ['App', 'MAX_TOASTS']);
      const app = Object.create(App.prototype);
      const box = env.document.getElementById('toastContainer');
      const visible = () => box.children.filter((el) => !el.dataset.gone).map((el) => el.textContent);
      return { app, box, visible, MAX_TOASTS };
    };
    t.test('the limit is three', () => t.eq(setup().MAX_TOASTS, 3));
    t.test('up to three toasts stack normally', () => {
      const { app, visible } = setup();
      ['a', 'b', 'c'].forEach((m) => app.showToast(m));
      t.deepEq(visible(), ['a', 'b', 'c']);
    });
    t.test('a fourth toast pushes the oldest one out', () => {
      const { app, visible } = setup();
      ['a', 'b', 'c', 'd'].forEach((m) => app.showToast(m));
      t.deepEq(visible(), ['b', 'c', 'd']);
    });
    t.test('hammering a button never shows more than three', () => {
      const { app, visible } = setup();
      for (let i = 0; i < 40; i++) { app.showToast(`Tema ${i}`); t.ok(visible().length <= 3, `after ${i + 1}`); }
      t.deepEq(visible(), ['Tema 37', 'Tema 38', 'Tema 39']);
    });
    t.test('toasts still expire on their own', async () => {
      const { app, visible } = setup();
      app.showToast('a'); app.showToast('b');
      await new Promise((r) => setImmediate(r));
      t.deepEq(visible(), []);
      app.showToast('c'); t.deepEq(visible(), ['c']);
    });
    t.test('without a container nothing breaks', () => {
      const env = createEnv();
      const { App } = env.load('js/app.js', ['App']);
      env.document.getElementById = () => null;
      Object.create(App.prototype).showToast('x'); t.ok(true);
    });
  });

  t.suite('polish · one type system per theme', () => {
    t.test('lab: Chakra Petch for headings and buttons, no handwriting', () => {
      t.ok(/--font-display:\s+'Chakra Petch'/.test(lab)); t.ok(/--font-hand:\s+'Fredoka'/.test(lab));
      t.includes(css, 'family=Chakra+Petch');
    });
    t.test('wood: Lilita One for headings and Patrick Hand for notes', () => {
      t.ok(/--font-display:\s+'Lilita One'/.test(wood)); t.ok(/--font-hand:\s+'Patrick Hand'/.test(wood));
    });
    t.test('font families are only ever set through the five tokens', () => {
      const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
      [...bare.matchAll(/font-family:\s*([^;}]+)/g)].forEach((m) => t.ok(/^var\(--(font-(display|sans|hand|mono|logo)|sign-sub-font)\)( !important)?$/.test(m[1].trim()), m[1]));
    });
    t.test('note text is resized with the face that renders it', () => {
      const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
      [...bare.matchAll(/([^{}]+)\{([^{}]*font-family: var\(--font-hand\)[^{}]*)\}/g)].forEach((m) => {
        const size = m[2].match(/font-size:\s*([^;]+)/);
        if (size) t.includes(size[1], 'var(--hand-scale)', m[1].trim());
      });
      t.ok(/--hand-scale:\s+\.86/.test(lab)); t.ok(/--hand-scale:\s+1;/.test(wood));
    });
  });

  t.suite('polish · buttons match the title sign', () => {
    t.test('pill and round shapes come from theme tokens', () => {
      t.notIncludes(css, 'border-radius: 999px');
      t.ok(/--pill:\s+10px/.test(lab)); t.ok(/--pill:\s+999px/.test(wood));
      t.ok(/--round:\s+12px/.test(lab)); t.ok(/--round:\s+50%/.test(wood));
      t.includes(block('.round-btn'), 'border-radius: var(--round)'); t.includes(block('.btn'), 'border-radius: var(--pill)');
    });
    t.test('lab buttons are uppercase and tracked like the sign; wooden ones are not', () => {
      t.includes(block('.btn'), 'text-transform: var(--btn-case)'); t.includes(block('.btn'), 'letter-spacing: var(--btn-track)');
      t.ok(/--btn-case:\s+uppercase/.test(lab)); t.ok(/--btn-case:\s+none/.test(wood));
    });
    t.test('the start button carries the same thin inner frame as the sign', () => {
      t.ok(/\.btn-hero\s+\{[^}]*outline: var\(--btn-inset\); outline-offset: -8px;/.test(css));
      t.includes(css, 'outline: 2px solid rgba(95, 216, 255, .30);');
    });
    t.test('buttons stay flat colours', () => t.ok(!/gradient/.test(block('.btn'))));
  });

  t.suite('polish · drawings follow the theme', () => {
    const arts = [...html.matchAll(/<div class="(?:bench-art|station-art)">[\s\S]*?<\/svg>/g)].map((m) => m[0]);
    t.test('every bench and station has a drawing', () => t.ok(arts.length >= 13, String(arts.length)));
    t.test('no drawing hard-codes the wooden ink or palette', () => {
      arts.forEach((a, i) => ['#3d2414', '#fbf3e2', '#f6c33b', '#e8512a', '#3d8fd6', '#4fb477'].forEach((c) => t.notIncludes(a.toLowerCase(), c, `art ${i}: ${c}`)));
    });
    t.test('drawings are inked with currentColor, which is the theme ink', () => {
      t.ok(arts.filter((a) => a.includes('stroke="currentColor"')).length >= 13);
      t.includes(css, '.bench-art, .station-art { color: var(--box-ink); }');
    });
    t.test('card accents are theme colours, not fixed hex values', () => {
      const accents = [...html.matchAll(/style="--accent:([^"]+)"/g)].map((m) => m[1]);
      t.ok(accents.length >= 13); accents.forEach((a) => t.ok(/^var\(--[\w-]+\)$/.test(a), a));
      accents.forEach((a) => { const name = a.slice(4, -1); t.ok(new RegExp(name + ':').test(lab), `${name} (lab)`); t.ok(new RegExp(name + ':').test(wood), `${name} (wood)`); });
    });
  });
};
