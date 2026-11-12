// Visual identity: title-screen decor, Bit's two drawings and the shared card style.
'use strict';

module.exports = (t, { createEnv, read }) => {
  const html = read('web/index.html');
  const css = read('web/css/styles.css');
  const { BIT_SVG } = createEnv().load('js/app.js', ['BIT_SVG']);
  const intro = html.slice(html.indexOf('id="screen-intro"'), html.indexOf('id="screen-about"'));
  const block = (selector) => { const i = css.indexOf(selector + ' {'); return css.slice(i, css.indexOf('\n}', i)); };

  t.suite('identity · title screen (lab)', () => {
    t.test('three lamps hang from the ceiling, each with its cone of light', () => {
      const lamps = [...intro.matchAll(/<div class="lamp[^"]* theme-lab"[\s\S]*?<\/div>/g)].map((m) => m[0]);
      t.eq(lamps.length, 3);
      lamps.forEach((l) => { t.includes(l, 'class="lamp-cone"'); t.includes(l, 'class="lamp-glow"'); });
      t.eq(lamps.filter((l) => l.includes('lamp-side')).length, 2);
    });
    t.test('the lamp shades are black', () => t.eq((intro.match(/fill="#20262e"/g) || []).length, 3));
    t.test('the floating robot arm is gone; a monitor is bolted to the wall instead', () => {
      t.notIncludes(html, 'robot-arm'); t.notIncludes(css, 'robot-arm');
      const monitor = intro.match(/<div class="lab-deco wall-monitor theme-lab"[\s\S]*?<\/div>/)[0];
      t.ok(/<g fill="#c9d0d8" stroke="#1b2027" stroke-width="3">\s*(<circle [^>]*\/>){4}/.test(monitor), 'four screws');
      t.includes(monitor, 'class="hud-spin"');
    });
    t.test('Bit\'s blueprint is still taped to the wall', () => t.includes(intro, 'class="lab-deco blueprint theme-lab"'));
    t.test('side decor steps aside on narrow screens', () => {
      t.ok(/@media \(max-width: 900px\) \{\s*\.lab-deco\.wall-monitor, \.pegboard, \.wood-deco\.shelf-deco \{ display: none; \}/.test(css));
      t.ok(/@media \(max-width: 1000px\) \{\s*\.lamp-side \{ display: none; \}/.test(css));
    });
  });

  t.suite('identity · title sign', () => {
    t.test('the lab title uses a technical typeface, the wooden one keeps the toy lettering', () => {
      t.ok(/--font-logo:\s+'Orbitron'/.test(block(':root')));
      t.ok(/--font-logo:\s+'Lilita One'/.test(block(':root[data-theme="madera"]')));
      t.includes(css, 'family=Orbitron');
      t.includes(block('.logo'), 'font-family: var(--font-logo)');
    });
    t.test('"¿Qué es esto?" lives in Bit\'s bubble, not under the start button', () => {
      const actions = intro.match(/<div class="intro-actions">[\s\S]*?<\/div>/)[0];
      t.notIncludes(actions, 'que-es'); t.notIncludes(actions, '#/about');
      const bubble = intro.match(/<div class="intro-bubble bubble"[^>]*>[\s\S]*?<\/div>/)[0];
      t.includes(bubble, '<a href="#/about" class="bubble-link">¿Qué es esto?</a>');
      t.notIncludes(bubble, 'aria-hidden');
    });
    t.test('the bubble stays visible on phones so the link is never lost', () => {
      t.ok(!/#screen-intro \.intro-bubble \{ display: none; \}/.test(css));
    });
  });

  t.suite('identity · Bit', () => {
    const lab = BIT_SVG.slice(BIT_SVG.indexOf('<g class="bit-lab">'), BIT_SVG.indexOf('<g class="bit-wood">'));
    const wood = BIT_SVG.slice(BIT_SVG.indexOf('<g class="bit-wood">'));
    t.test('Bit has one drawing per theme and only one is shown', () => {
      t.ok(lab.length > 500 && wood.length > 500);
      t.includes(css, '.bit .bit-wood { display: none; }');
      t.includes(css, ':root[data-theme="madera"] .bit .bit-lab { display: none; }');
    });
    t.test('the lab drawing has no wood colours and the wooden one has no lab ink', () => {
      ['#c68a50', '#e6bd85', '#a96f3c', '#3d2414'].forEach((c) => t.notIncludes(lab, c, c));
      t.notIncludes(wood, '#1b2027');
    });
    t.test('both arms are outlined in ink, like the rest of the body', () => {
      [[lab, '#1b2027'], [wood, '#3d2414']].forEach(([svg, ink]) => {
        const arms = [...svg.matchAll(/<g class="arm arm-[lr]">([\s\S]*?)<\/g>/g)].map((m) => m[1]);
        t.eq(arms.length, 2);
        arms.forEach((a) => {
          const widths = [...a.matchAll(/<path [^>]*stroke="([^"]+)" stroke-width="(\d+)"/g)].map((m) => [m[1], Number(m[2])]);
          t.eq(widths[0][0], ink); t.ok(widths[0][1] - widths[1][1] >= 6, 'outline thicker than the arm');
          t.includes(a, `stroke="${ink}" stroke-width="3.5"`);
        });
      });
    });
    t.test('both drawings blink', () => { t.includes(lab, 'class="blink"'); t.includes(wood, 'class="blink"'); });
    t.test('Bit hops and waves when you point at him', () => {
      t.ok(/\.bit-slot:hover \.bit[^{]*\{ animation: bit-hop/.test(css));
      t.ok(/\.bit-slot:hover \.arm-r[^{]*\{ animation: bit-wave/.test(css));
      ['bit-hop', 'bit-wave', 'bit-idle'].forEach((k) => t.includes(css, `@keyframes ${k}`));
    });
  });

  t.suite('identity · cards', () => {
    t.test('El Cuaderno is a bench like every other work area', () => {
      t.notIncludes(css, '.bench.notebook'); t.notIncludes(html, 'bench notebook');
      t.ok(/<a href="#\/workshop\/cheatsheets" class="bench" data-tab="cheatsheets"/.test(html));
    });
    t.test('every About card is the same panel, with no one-off textures or tilt', () => {
      const cards = [...html.matchAll(/<article class="([^"]*)">/g)].map((m) => m[1]).filter((c) => c.startsWith('faq'));
      t.ok(cards.length >= 6); cards.forEach((c) => t.eq(c, 'faq'));
      const faq = block('.faq');
      t.includes(faq, 'background: var(--screws), var(--grain), var(--ply);');
      t.notIncludes(faq, 'rotate'); t.notIncludes(css, '.faq.lined');
    });
    t.test('About cards and benches share background, outline and shadow', () => {
      ['background: var(--screws), var(--grain), var(--ply);', 'border: var(--outline);', 'box-shadow: var(--drop);'].forEach((d) => {
        t.includes(block('.faq'), d); t.includes(block('.bench'), d);
      });
    });
  });

  t.suite('identity · title screen (wood)', () => {
    t.test('the wooden wall has Bit\'s hand-drawn plan, a board of tools and a shelf', () => {
      ['class="wood-deco plan theme-wood"', 'class="pegboard theme-wood"', 'class="wood-deco shelf-deco theme-wood"'].forEach((c) => t.includes(intro, c));
    });
    t.test('the pegboard holds six tools', () => {
      const board = intro.match(/<div class="pegboard theme-wood"[\s\S]*?<\/div>/)[0];
      ['Hammer', 'Screwdriver', 'Wrench', 'Pliers', 'Try square', 'Handsaw'].forEach((tool) => t.includes(board, `<!-- ${tool} -->`));
    });
    t.test('the plan is a pencil sketch labelled by hand', () => {
      const plan = intro.match(/<div class="wood-deco plan theme-wood"[\s\S]*?<\/div>/)[0];
      t.includes(plan, 'font-family="Patrick Hand, cursive"'); t.includes(plan, 'hecho a mano');
    });
  });
};
