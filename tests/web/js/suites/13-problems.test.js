// Coding problems catalogue (web/js/modules/interview.js): the seven problems added on top of the
// original six, the difficulty ordering, the grouped picker and the matrix visual.
'use strict';

module.exports = (t, { createEnv, mulberry32, read }) => {
  const env = createEnv();
  env.load('js/tracer.js');
  env.load('js/modules/interview.js');
  const stn = { problems: env.window.problemStations.all }; // the whole catalogue, all levels
  const levels = env.window.problemStations;
  const { viz } = env.window.Tracer;
  const P = Object.fromEntries(stn.problems.map((p) => [p.id, p]));
  const last = (frames) => frames[frames.length - 1];
  const answer = (id, args) => last(P[id].trace(args)).viz.answer;
  const rand = mulberry32(1313);
  const ri = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const randArr = (n, lo, hi) => Array.from({ length: n }, () => ri(lo, hi));

  const CATALOGUE = [
    ['valid-palindrome', 'Fácil'], ['valid-parentheses', 'Fácil'], ['binary-search', 'Fácil'], ['best-time-stock', 'Fácil'],
    ['two-sum-sorted', 'Media'], ['max-water', 'Media'], ['merge-intervals', 'Media'], ['longest-unique', 'Media'], ['number-of-islands', 'Media'], ['coin-change', 'Media'],
    ['trap-rain', 'Difícil'], ['sliding-max', 'Difícil'], ['largest-rectangle', 'Difícil']
  ];
  const NEW = ['valid-palindrome', 'valid-parentheses', 'binary-search', 'best-time-stock', 'number-of-islands', 'coin-change', 'largest-rectangle'];

  // Reference implementations, written independently of the traced code
  const ref = {
    palindrome: (s) => { const clean = Array.from(s).filter((ch) => /[\p{L}\p{N}]/u.test(ch)).map((ch) => ch.toLowerCase()); return clean.join('') === clean.slice().reverse().join(''); },
    balanced: (s) => { let prev; do { prev = s; s = s.replace(/\(\)|\[\]|\{\}/g, ''); } while (s !== prev); return s === ''; },
    profit: (p) => { let b = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) b = Math.max(b, p[j] - p[i]); return b; },
    islands: (grid) => {
      const g = grid.map((row) => row.slice()); let n = 0;
      const sink = (r, c) => { if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] !== 1) return; g[r][c] = 0; sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1); };
      g.forEach((row, r) => row.forEach((_, c) => { if (g[r][c] === 1) { n++; sink(r, c); } }));
      return n;
    },
    coins: (coins, amount) => { // breadth-first over reachable amounts
      let frontier = [0]; const seen = new Set([0]);
      for (let used = 0; frontier.length; used++) {
        if (frontier.includes(amount)) return used;
        const next = [];
        frontier.forEach((a) => coins.forEach((c) => { if (a + c <= amount && !seen.has(a + c)) { seen.add(a + c); next.push(a + c); } }));
        frontier = next;
      }
      return -1;
    },
    rectangle: (h) => { let b = 0; for (let i = 0; i < h.length; i++) { let low = Infinity; for (let j = i; j < h.length; j++) { low = Math.min(low, h[j]); b = Math.max(b, low * (j - i + 1)); } } return b; }
  };

  t.suite('problems · catalogue', () => {
    t.test('thirteen problems are offered, in this order', () => t.deepEq(stn.problems.map((p) => p.id), CATALOGUE.map(([id]) => id)));
    t.test('every problem has the expected difficulty', () => CATALOGUE.forEach(([id, d]) => t.eq(P[id].difficulty, d, id)));
    t.test('the catalogue is ordered by difficulty', () => {
      const rank = { 'Fácil': 0, 'Media': 1, 'Difícil': 2 };
      const ranks = stn.problems.map((p) => rank[p.difficulty]);
      t.ok(ranks.every((r) => r !== undefined), 'unknown difficulty');
      t.deepEq(ranks, ranks.slice().sort((a, b) => a - b));
    });
    t.test('ids are unique', () => t.eq(new Set(stn.problems.map((p) => p.id)).size, 13));
    t.test('there are 4 easy, 6 medium and 3 hard problems', () => {
      const count = (d) => stn.problems.filter((p) => p.difficulty === d).length;
      t.deepEq([count('Fácil'), count('Media'), count('Difícil')], [4, 6, 3]);
    });
    t.test('the new problems are complete (statement, code, three presets, learn, build)', () => NEW.forEach((id) => {
      const p = P[id];
      t.ok(p.title && p.pattern && p.statement.startsWith('<p>'), id); t.eq(p.lang, 'python', id); t.ok(p.code[0].startsWith('def '), id);
      t.eq(p.presets.length, 3, id);
      t.ok(p.learn.idea && p.learn.signals.length >= 3 && p.learn.time && p.learn.space && p.learn.why, id);
      t.ok(p.build.template && p.build.tips.length >= 3 && p.build.similar.length === 3, id);
    }));
    t.test('the progress checklist lists the same problems in the same order', () => {
      const e = createEnv(); e.load('js/progress.js');
      const lists = e.window.Progress.CHECKLISTS;
      const all = ['problems-easy', 'problems-medium', 'problems-hard'].flatMap((s) => lists[s].items.map((i) => i.id));
      t.deepEq(all, CATALOGUE.map(([id]) => `solve:${id}`));
    });
  });

  t.suite('problems · station cards, one per level', () => {
    const html = read('web/index.html');
    const cards = (area) => [...html.matchAll(new RegExp(`<div class="station" data-area="${area}">[\\s\\S]*?</a>`, 'g'))].map((m) => m[0]);
    const tag = (c) => (c.match(/<span class="diff (\w+)">([^<]+)<\/span>/) || []).slice(1).join(' ');
    t.test('Problemas de Código has an easy, a medium and a hard station, in that order', () => {
      t.deepEq(cards('problems').map((c) => c.match(/data-tab="([\w-]+)"/)[1]), ['problems-easy', 'problems-medium', 'problems-hard']);
      t.deepEq(cards('problems').map(tag), ['easy Fácil', 'mid Media', 'hard Difícil']);
    });
    t.test('data structures are split the same way (easy and medium)', () => {
      const ds = cards('algorithms').filter((c) => c.includes('datastructures'));
      t.deepEq(ds.map((c) => c.match(/data-tab="([\w-]+)"/)[1]), ['datastructures-easy', 'datastructures-medium']);
      t.deepEq(ds.map(tag), ['easy Fácil', 'mid Media']);
    });
    t.test('the old combined stations are gone', () => { t.notIncludes(html, 'data-tab="interview"'); t.notIncludes(html, 'data-tab="datastructures"'); t.notIncludes(html, 'id="tab-interview"'); });
  });

  t.suite('problems · one station per difficulty', () => {
    const LEVEL = { 'Fácil': 'easy', 'Media': 'medium', 'Difícil': 'hard' };
    t.test('there are three stations: easy, medium and hard', () => ['easy', 'medium', 'hard'].forEach((l) => t.eq(levels[l].id, `problems-${l}`, l)));
    t.test('each station holds only its own level, in catalogue order', () => ['easy', 'medium', 'hard'].forEach((l) => {
      t.deepEq(levels[l].problems.map((p) => p.id), CATALOGUE.filter(([, d]) => LEVEL[d] === l).map(([id]) => id), l);
    }));
    t.test('together they hold every problem exactly once', () => {
      const ids = ['easy', 'medium', 'hard'].flatMap((l) => levels[l].problems.map((p) => p.id));
      t.eq(ids.length, 13); t.eq(new Set(ids).size, 13);
    });
    t.test('a single-level station has a flat picker with no difficulty badges', () => ['easy', 'medium', 'hard'].forEach((l) => {
      const html = levels[l].skeleton();
      t.notIncludes(html, 'tr-group', l); t.notIncludes(html, 'class="diff ', l);
      levels[l].problems.forEach((p) => t.includes(html, `data-id="${p.id}"`, p.id));
    }));
    t.test('a mixed catalogue still gets badges (short) or rows (long)', () => {
      const { TraceStation } = env.window.Tracer;
      const mixed = [levels.easy.problems[0], levels.medium.problems[0], levels.hard.problems[0]];
      t.eq((new TraceStation('demo', mixed).skeleton().match(/class="diff /g) || []).length, 3);
      t.eq((new TraceStation('demo', stn.problems).skeleton().match(/class="tr-group"/g) || []).length, 3);
    });
    t.test('byLevel skips levels with no problems', () => {
      const only = env.window.Tracer.byLevel('x', levels.easy.problems);
      t.ok(only.easy); t.eq(only.medium, undefined); t.eq(only.hard, undefined); t.eq(only.all.length, 4);
    });
  });

  t.suite('problems · matrix visual (viz.grid)', () => {
    const g = [[1, 0, 1], [0, 1, 0]];
    t.test('draws one cell per value', () => t.eq((viz.grid(g).match(/class="vz-mx-cell /g) || []).length, 6));
    t.test('labels rows and columns', () => t.eq((viz.grid(g).match(/class="vz-mx-idx"/g) || []).length, 5));
    t.test('tells the stylesheet how many columns there are', () => t.includes(viz.grid(g), '--cols:3'));
    t.test('applies per-cell state classes', () => t.includes(viz.grid(g, { state: { '1,1': 'land cur' } }), 'vz-mx-cell land cur'));
    t.test('colours cells by group, cycling through the palette', () => {
      const html = viz.grid(g, { group: { '0,0': 0, '0,2': 1, '1,1': 4 } });
      t.includes(html, 'isl c-sky'); t.eq((html.match(/isl c-mint/g) || []).length, 2);
    });
    t.test('escapes values', () => t.includes(viz.grid([['<b>']]), '&lt;b&gt;'));
    t.test('an empty matrix says so', () => t.includes(viz.grid([]), 'matriz vacía'));
  });

  t.suite('problems · every frame of the new problems is well formed', () => {
    NEW.forEach((id) => {
      const p = P[id];
      t.test(`${id}: parse accepts its presets`, () => p.presets.forEach((text) => t.ok(p.parse(text), text)));
      t.test(`${id}: frames point at real code lines, explain themselves and render`, () => {
        p.presets.forEach((text) => {
          const args = p.parse(text);
          const frames = p.trace(args);
          t.ok(frames.length >= 4 && frames.length <= 200, `${text}: ${frames.length} frames`);
          frames.forEach((f, i) => {
            t.ok(Number.isInteger(f.line) && f.line >= 2 && f.line <= p.code.length, `frame ${i} line ${f.line}`);
            t.ok(p.code[f.line - 1].trim().length > 0, `frame ${i} on a blank line`);
            t.ok(typeof f.note === 'string' && f.note.length > 5, `frame ${i} has no note`);
            const html = p.render(f.viz, args);
            t.ok(typeof html === 'string' && html.includes('<'), `frame ${i} has no markup`);
            t.notIncludes(html, 'undefined'); t.notIncludes(html, 'NaN'); t.notIncludes(f.note, 'undefined'); t.notIncludes(f.note, 'NaN');
          });
        });
      });
      t.test(`${id}: the trace ends on a return line with an answer`, () => p.presets.forEach((text) => {
        const f = last(p.trace(p.parse(text)));
        t.ok(/^\s*return\b/.test(p.code[f.line - 1]), p.code[f.line - 1]); t.ok(f.viz.answer !== undefined, text);
      }));
      t.test(`${id}: rejects malformed text with the shared message`, () => t.throws(() => p.parse('[1, 2'), /No pude leer/));
      t.test(`${id}: rejects an empty entry`, () => t.throws(() => p.parse(''), /Escribe/));
    });
  });

  t.suite('problems · is it a palindrome? (two pointers)', () => {
    const run = (s) => answer('valid-palindrome', P['valid-palindrome'].parse(JSON.stringify(s)));
    P['valid-palindrome'].presets.forEach((text) => t.test(`preset ${text}: matches the reference`, () => { const s = JSON.parse(text); t.eq(run(s), ref.palindrome(s)); }));
    t.test('the presets cover both answers', () => t.deepEq(P['valid-palindrome'].presets.map((x) => run(JSON.parse(x))), [true, true, false]));
    ['a', 'ab', 'aa', 'Aa', '.,', 'a.', '.a,', 'ab_a', 'No lemon, no melon', '0P', 'Ábá', 'abcba', 'abccba', 'abcda', '1a2', 'ñ Ñ'].forEach((s) => {
      t.test(`"${s}" matches the reference`, () => t.eq(run(s), ref.palindrome(s)));
    });
    for (let k = 0; k < 6; k++) {
      const s = Array.from({ length: ri(1, 18) }, () => 'aAb ,'[ri(0, 4)]).join('');
      t.test(`random case ${k + 1}: "${s}"`, () => t.eq(run(s), ref.palindrome(s)));
    }
    t.test('a mismatch stops on "return False"', () => t.eq(last(P['valid-palindrome'].trace(P['valid-palindrome'].parse('"abca"'))).line, 9));
    t.test('rejects something that is not a string', () => t.throws(() => P['valid-palindrome'].parse('[1, 2]'), /comillas/));
    t.test('rejects more than 18 characters', () => t.throws(() => P['valid-palindrome'].parse('"abcdefghijklmnopqrs"'), /18/));
    t.test('rejects an empty string', () => t.throws(() => P['valid-palindrome'].parse('""'), /entre 1 y 18/));
  });

  t.suite('problems · balanced parentheses (stack)', () => {
    const run = (s) => answer('valid-parentheses', { s });
    P['valid-parentheses'].presets.forEach((text) => t.test(`preset ${text}: matches the reference`, () => { const s = JSON.parse(text); t.eq(run(s), ref.balanced(s)); }));
    t.test('the presets cover both answers', () => t.deepEq(P['valid-parentheses'].presets.map((x) => run(JSON.parse(x))), [true, false, false]));
    ['()', ')(', '(', ')', '([)]', '{[]}', '(((', '())', '[]{}()', '(()', '}{', '((()))[]', '([{}])}'].forEach((s) => {
      t.test(`"${s}" matches the reference`, () => t.eq(run(s), ref.balanced(s)));
    });
    for (let k = 0; k < 8; k++) {
      const s = Array.from({ length: ri(1, 10) }, () => '()[]{}'[ri(0, 5)]).join('');
      t.test(`random case ${k + 1}: "${s}"`, () => t.eq(run(s), ref.balanced(s)));
    }
    t.test('a closer on an empty stack stops on "return False"', () => t.eq(last(P['valid-parentheses'].trace({ s: ')' })).line, 8));
    t.test('the stack holds the closers still expected', () => t.deepEq(last(P['valid-parentheses'].trace({ s: '([{' })).vars.stack, [')', ']', '}']));
    t.test('rejects other characters', () => t.throws(() => P['valid-parentheses'].parse('"(a)"'), /Usa solo/));
    t.test('rejects more than 16 characters', () => t.throws(() => P['valid-parentheses'].parse('"(((((((((((((((((("'), /16/));
  });

  t.suite('problems · binary search', () => {
    const check = (nums, target) => {
      const frames = P['binary-search'].trace({ nums, target }); const a = last(frames).viz.answer;
      if (nums.includes(target)) t.eq(nums[a], target); else t.eq(a, -1);
      return frames;
    };
    P['binary-search'].presets.forEach((text) => t.test(`preset ${text}: finds it only if it is there`, () => { const { nums, target } = P['binary-search'].parse(text); check(nums, target); }));
    t.test('the presets cover found and not found', () => t.deepEq(P['binary-search'].presets.map((x) => answer('binary-search', P['binary-search'].parse(x))), [6, -1, 0]));
    for (let k = 0; k < 8; k++) {
      const nums = [...new Set(randArr(ri(1, 14), -20, 40))].sort((a, b) => a - b);
      const target = rand() < 0.6 ? nums[ri(0, nums.length - 1)] : ri(-25, 45);
      t.test(`random case ${k + 1}: [${nums}] target ${target}`, () => check(nums, target));
    }
    t.test('every position of an array can be found', () => { const nums = [1, 4, 6, 9, 12, 15, 20]; nums.forEach((x, i) => t.eq(answer('binary-search', { nums, target: x }), i)); });
    t.test('a single element: found and not found', () => { t.eq(answer('binary-search', { nums: [5], target: 5 }), 0); t.eq(answer('binary-search', { nums: [5], target: 6 }), -1); });
    t.test('it never looks at more than log2(n) + 1 elements', () => {
      const nums = Array.from({ length: 14 }, (_, i) => i * 2);
      [-1, 0, 13, 26, 27].forEach((target) => t.ok(check(nums, target).filter((f) => f.line === 4).length <= 4, `target ${target}`));
    });
    t.test('rejects an unsorted array', () => t.throws(() => P['binary-search'].parse('[3, 1, 2], 2'), /ordenado/));
    t.test('rejects a missing target', () => t.throws(() => P['binary-search'].parse('[1, 2, 3]'), /Escribe/));
    t.test('rejects more than 14 numbers', () => t.throws(() => P['binary-search'].parse('[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], 3'), /14/));
  });

  t.suite('problems · best day to buy and sell', () => {
    P['best-time-stock'].presets.forEach((text) => t.test(`preset ${text}: matches brute force`, () => { const { prices } = P['best-time-stock'].parse(text); t.eq(answer('best-time-stock', { prices }), ref.profit(prices)); }));
    t.test('the presets give 5, 0 and 9', () => t.deepEq(P['best-time-stock'].presets.map((x) => answer('best-time-stock', P['best-time-stock'].parse(x))), [5, 0, 9]));
    for (let k = 0; k < 8; k++) {
      const prices = randArr(ri(2, 14), 0, 30);
      t.test(`random case ${k + 1}: [${prices}]`, () => {
        const f = last(P['best-time-stock'].trace({ prices }));
        t.eq(f.viz.answer, ref.profit(prices)); t.eq(f.vars.best, f.viz.answer);
        if (f.viz.answer > 0) { t.ok(f.viz.buy < f.viz.sell); t.eq(prices[f.viz.sell] - prices[f.viz.buy], f.viz.answer); }
      });
    }
    t.test('prices that only fall give 0, never a negative number', () => t.eq(answer('best-time-stock', { prices: [9, 5, 2] }), 0));
    t.test('the minimum after the maximum does not count', () => t.eq(answer('best-time-stock', { prices: [5, 10, 1, 3] }), 5));
    t.test('rejects a single price', () => t.throws(() => P['best-time-stock'].parse('[5]'), /entre 2 y 14/));
    t.test('rejects prices above 30', () => t.throws(() => P['best-time-stock'].parse('[1, 99]'), /entre 0 y 30/));
    t.test('rejects non-integer prices', () => t.throws(() => P['best-time-stock'].parse('[1.5, 2]'), /enteros/));
  });

  t.suite('problems · number of islands (flood fill)', () => {
    const count = (grid) => { const f = last(P['number-of-islands'].trace({ grid })); t.eq(f.vars.count, f.viz.answer); return f.viz.answer; };
    P['number-of-islands'].presets.forEach((text) => t.test(`preset ${text}: matches the recursive reference`, () => { const { grid } = P['number-of-islands'].parse(text); t.eq(count(grid), ref.islands(grid)); }));
    t.test('the presets have 2, 3 and 4 islands', () => t.deepEq(P['number-of-islands'].presets.map((x) => count(P['number-of-islands'].parse(x).grid)), [2, 3, 4]));
    t.test('only water: 0 islands', () => t.eq(count([[0, 0, 0], [0, 0, 0]]), 0));
    t.test('only land: 1 big island', () => t.eq(count([[1, 1, 1], [1, 1, 1], [1, 1, 1]]), 1));
    t.test('diagonal neighbours do not connect', () => { t.eq(count([[1, 0], [0, 1]]), 2); t.eq(count([[1, 0, 1], [0, 1, 0], [1, 0, 1]]), 5); });
    t.test('a ring of land around a lake is one island', () => t.eq(count([[1, 1, 1], [1, 0, 1], [1, 1, 1]]), 1));
    t.test('a snake-shaped island is one island', () => t.eq(count([[1, 1, 1, 1], [0, 0, 0, 1], [1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 1]]), 1));
    t.test('a single cell: land or water', () => { t.eq(count([[1]]), 1); t.eq(count([[0]]), 0); });
    t.test('one row and one column', () => { t.eq(count([[1, 0, 1, 1, 0, 1]]), 3); t.eq(count([[1], [1], [0], [1]]), 2); });
    for (let k = 0; k < 10; k++) {
      const rows = ri(1, 6), cols = ri(1, 8), density = [0.3, 0.5, 0.7][k % 3];
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (rand() < density ? 1 : 0)));
      t.test(`random ${rows}x${cols} map ${k + 1}: ${JSON.stringify(grid)}`, () => t.eq(count(grid), ref.islands(grid)));
    }
    t.test('the trace does not modify the grid it was given', () => { const grid = [[1, 1], [0, 1]]; P['number-of-islands'].trace({ grid }); t.deepEq(grid, [[1, 1], [0, 1]]); });
    t.test('every land cell ends up sunk and painted with its island', () => {
      const grid = [[1, 0, 1], [1, 0, 0]]; const v = last(P['number-of-islands'].trace({ grid })).viz;
      t.deepEq(v.g, [[0, 0, 0], [0, 0, 0]]); t.deepEq(v.isl, { '0,0': 0, '1,0': 0, '0,2': 1 });
    });
    t.test('the biggest map allowed (6x8, all land) still finishes', () => {
      const grid = Array.from({ length: 6 }, () => Array(8).fill(1)); const frames = P['number-of-islands'].trace({ grid });
      t.eq(last(frames).viz.answer, 1); t.ok(frames.length < 600, `${frames.length} frames`);
      frames.forEach((f) => t.ok(P['number-of-islands'].render(f.viz).includes('vz-matrix')));
    });
    t.test('accepts "1" and "0" written as text', () => t.deepEq(P['number-of-islands'].parse('[["1", "0"], ["0", "1"]]').grid, [[1, 0], [0, 1]]));
    t.test('rejects a flat list', () => t.throws(() => P['number-of-islands'].parse('[1, 0, 1]'), /lista de filas/));
    t.test('rejects rows of different lengths', () => t.throws(() => P['number-of-islands'].parse('[[1, 0], [1]]'), /misma cantidad/));
    t.test('rejects more than 6 rows', () => t.throws(() => P['number-of-islands'].parse('[[1],[1],[1],[1],[1],[1],[1]]'), /6 filas/));
    t.test('rejects more than 8 columns', () => t.throws(() => P['number-of-islands'].parse('[[1,0,1,0,1,0,1,0,1]]'), /8 columnas/));
    t.test('rejects values other than 0 and 1', () => t.throws(() => P['number-of-islands'].parse('[[1, 2], [0, 1]]'), /tierra/));
    t.test('rejects an empty map', () => { t.throws(() => P['number-of-islands'].parse('[]'), /lista de filas/); t.throws(() => P['number-of-islands'].parse('[[]]'), /lista de filas/); });
  });

  t.suite('problems · coin change (bottom-up DP)', () => {
    P['coin-change'].presets.forEach((text) => t.test(`preset ${text}: matches breadth-first search`, () => { const a = P['coin-change'].parse(text); t.eq(answer('coin-change', a), ref.coins(a.coins, a.amount)); }));
    t.test('the presets give 2, 3 and -1', () => t.deepEq(P['coin-change'].presets.map((x) => answer('coin-change', P['coin-change'].parse(x))), [2, 3, -1]));
    for (let k = 0; k < 10; k++) {
      const coins = [...new Set(randArr(ri(1, 4), 1, 9))]; const amount = ri(1, 12);
      t.test(`random case ${k + 1}: [${coins}], ${amount}`, () => t.eq(answer('coin-change', { coins, amount }), ref.coins(coins, amount)));
    }
    t.test('taking the biggest coin first would be wrong here', () => t.eq(answer('coin-change', { coins: [1, 3, 4], amount: 6 }), 2));
    t.test('the order of the coins does not matter', () => t.eq(answer('coin-change', { coins: [4, 1, 3], amount: 6 }), 2));
    t.test('an unreachable amount gives -1', () => t.eq(answer('coin-change', { coins: [5], amount: 3 }), -1));
    t.test('unknown amounts are shown as inf in the variables and ∞ in the picture', () => {
      const f = P['coin-change'].trace({ coins: [2], amount: 3 })[0];
      t.deepEq(f.vars.dp, [0, '§inf', '§inf', '§inf']); t.deepEq(f.viz.dp, ['0', '∞', '∞', '∞']);
    });
    t.test('the biggest input allowed stays readable', () => t.ok(P['coin-change'].trace({ coins: [1, 2, 3, 4], amount: 12 }).length <= 160));
    t.test('rejects a missing amount', () => t.throws(() => P['coin-change'].parse('[1, 2, 5]'), /Escribe/));
    t.test('rejects a coin of value 0', () => t.throws(() => P['coin-change'].parse('[0, 2], 4'), /monedas/));
    t.test('rejects repeated coins', () => t.throws(() => P['coin-change'].parse('[2, 2], 4'), /distintas/));
    t.test('rejects more than 4 coins', () => t.throws(() => P['coin-change'].parse('[1, 2, 3, 4, 5], 6'), /entre 1 y 4/));
    t.test('rejects an amount above 12', () => t.throws(() => P['coin-change'].parse('[1, 2], 50'), /monto/));
    t.test('rejects an amount of 0', () => t.throws(() => P['coin-change'].parse('[1, 2], 0'), /monto/));
  });

  t.suite('problems · largest rectangle in a histogram (monotonic stack)', () => {
    P['largest-rectangle'].presets.forEach((text) => t.test(`preset ${text}: matches brute force`, () => { const { h } = P['largest-rectangle'].parse(text); t.eq(answer('largest-rectangle', { h }), ref.rectangle(h)); }));
    t.test('the presets give 10, 12 and 9', () => t.deepEq(P['largest-rectangle'].presets.map((x) => answer('largest-rectangle', P['largest-rectangle'].parse(x))), [10, 12, 9]));
    for (let k = 0; k < 10; k++) {
      const h = randArr(ri(1, 12), 0, k % 2 ? 3 : 12); // low ceilings force repeated heights
      t.test(`random case ${k + 1}: [${h}]`, () => { const f = last(P['largest-rectangle'].trace({ h })); t.eq(f.viz.answer, ref.rectangle(h)); t.eq(f.vars.best, f.viz.answer); });
    }
    t.test('equal heights form one wide rectangle', () => t.eq(answer('largest-rectangle', { h: [3, 3, 3, 3] }), 12));
    t.test('a single bar is its own rectangle', () => t.eq(answer('largest-rectangle', { h: [7] }), 7));
    t.test('bars of height 0 split the histogram', () => t.eq(answer('largest-rectangle', { h: [2, 2, 0, 3] }), 4));
    t.test('all zeros give 0', () => t.eq(answer('largest-rectangle', { h: [0, 0] }), 0));
    t.test('the best rectangle drawn has the answer as its area', () => {
      const v = last(P['largest-rectangle'].trace({ h: [2, 1, 5, 6, 2, 3] })).viz;
      t.eq((v.best.r - v.best.l) * v.best.h, 10); t.deepEq(v.best, { l: 1.5, r: 3.5, h: 5 });
    });
    t.test('the biggest input allowed stays readable', () => t.ok(P['largest-rectangle'].trace({ h: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }).length <= 120));
    t.test('rejects an empty list', () => t.throws(() => P['largest-rectangle'].parse('[]'), /entre 1 y 12/));
    t.test('rejects negative heights', () => t.throws(() => P['largest-rectangle'].parse('[2, -1]'), /entre 0 y 12/));
    t.test('rejects more than 12 bars', () => t.throws(() => P['largest-rectangle'].parse('[1,1,1,1,1,1,1,1,1,1,1,1,1]'), /12 barras/));
  });
};
