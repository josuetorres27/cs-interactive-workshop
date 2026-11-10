// Tracer engine (web/js/tracer.js): highlighting, formatting, recorder, visuals, UI.
'use strict';

module.exports = (t, { createEnv }) => {
  const env = createEnv();
  env.load('js/tracer.js');
  const T = env.window.Tracer;
  const { viz } = T;

  t.suite('tracer · syntax highlighting', () => {
    t.test('Python keywords are highlighted', () => t.includes(T.highlight('def f(x):', 'python'), '<span class="t-k">def</span>'));
    t.test('Python builtins are highlighted', () => t.includes(T.highlight('n = len(a)', 'python'), '<span class="t-b">len</span>'));
    t.test('numbers are highlighted', () => t.includes(T.highlight('x = 42', 'python'), '<span class="t-n">42</span>'));
    t.test('strings are highlighted', () => t.includes(T.highlight("s = 'hola'", 'python'), '<span class="t-s">'));
    t.test('comments are highlighted', () => t.includes(T.highlight('x = 1  # nota', 'python'), '<span class="t-c"># nota</span>'));
    t.test('SQL keywords are matched case-insensitively', () => t.includes(T.highlight('select a from t', 'sql'), '<span class="t-k">select</span>'));
    t.test('SQL aggregate functions are highlighted', () => t.includes(T.highlight('COUNT(*)', 'sql'), '<span class="t-b">COUNT</span>'));
    t.test('SQL line comments are highlighted', () => t.includes(T.highlight('x -- note', 'sql'), '<span class="t-c">-- note</span>'));
    t.test('HTML characters in code are escaped', () => { const h = T.highlight('if a < b and c > d:', 'python'); t.includes(h, '&lt;'); t.notIncludes(h, '< b'); });
    t.test('identifiers are left plain', () => t.eq(T.highlight('foo', 'python'), 'foo'));
  });

  t.suite('tracer · value formatting', () => {
    t.test('null is None in Python', () => t.eq(T.fmt(null, 'python'), 'None'));
    t.test('null is NULL in SQL', () => t.eq(T.fmt(null, 'sql'), 'NULL'));
    t.test('booleans are True/False in Python', () => t.eq(T.fmt(true, 'python'), 'True'));
    t.test('strings are quoted', () => t.eq(T.fmt('ab', 'python'), "'ab'"));
    t.test('"§" marks raw text that is not quoted', () => t.eq(T.fmt('§Node(5)', 'python'), 'Node(5)'));
    t.test('arrays are printed like Python lists', () => t.eq(T.fmt([1, [2, 3]], 'python'), '[1, [2, 3]]'));
    t.test('objects are printed like dictionaries', () => t.eq(T.fmt({ a: 1 }, 'python'), "{'a': 1}"));
    t.test('numbers are printed as is', () => t.eq(T.fmt(3.5, 'python'), '3.5'));
  });

  t.suite('tracer · recorder', () => {
    t.test('frames are deep copies (later mutation does not leak)', () => {
      const r = new T.Recorder(); const arr = [1, 2];
      r.step(1, { arr }, { arr }, 'x'); arr.push(3);
      t.deepEq(r.frames[0].vars.arr, [1, 2]); t.deepEq(r.frames[0].viz.arr, [1, 2]);
    });
    t.test('frames keep line and note', () => {
      const r = new T.Recorder(); r.step(7, {}, {}, 'hola');
      t.eq(r.frames[0].line, 7); t.eq(r.frames[0].note, 'hola');
    });
  });

  t.suite('tracer · visual primitives', () => {
    t.test('cells renders one box per value', () => t.eq((viz.cells([1, 2, 3]).match(/class="vz-cell /g) || []).length, 3));
    t.test('cells shows pointer chips', () => t.includes(viz.cells([1, 2], { ptr: { 1: ['r'] } }), '>r</span>'));
    t.test('cells applies state classes', () => t.includes(viz.cells([1], { state: { 0: 'ok' } }), 'vz-cell ok'));
    t.test('cells escapes values', () => t.includes(viz.cells(['<b>']), '&lt;b&gt;'));
    t.test('bars draws one bar per height', () => t.eq((viz.bars([1, 2, 3]).match(/class="vz-bar /g) || []).length, 3));
    t.test('bars draws water only where there is water', () => t.eq((viz.bars([2, 0, 2], { water: [0, 2, 0] }).match(/vz-water/g) || []).length, 1));
    t.test('bars labels level lines', () => t.includes(viz.bars([1, 3], { levels: [{ value: 2, label: 'left_max', color: 'sky' }] }), 'left_max'));
    t.test('bars draws the best container outline', () => t.includes(viz.bars([1, 3], { best: { l: 0, r: 1, h: 1 } }), 'vz-best'));
    t.test('map says "vacío" when empty', () => t.includes(viz.map({}, { title: 'seen' }), 'vacío'));
    t.test('map highlights the requested key', () => t.includes(viz.map({ a: 1, b: 2 }, { hi: 'b' }), 'vz-kv hi'));
    t.test('list highlights the first item when asked', () => t.includes(viz.list([1, 2], { hiFirst: true }), 'vz-kv hi'));
    t.test('list says "vacío" when empty', () => t.includes(viz.list([]), 'vacío'));
    t.test('stack marks the top', () => t.includes(viz.stack(['(', '[']), 'tope'));
    t.test('stack shows the last pushed item first', () => { const h = viz.stack(['(', '[']); t.ok(h.indexOf('[') < h.indexOf('(')); });
    t.test('empty stack says "vacía"', () => t.includes(viz.stack([]), 'vacía'));
    t.test('table renders NULL cells in italics', () => t.includes(viz.table({ columns: ['a'], rows: [[null]] }), '<i>NULL</i>'));
    t.test('table counts rows with singular/plural', () => { t.includes(viz.table({ columns: ['a'], rows: [[1]] }), '1 fila<'); t.includes(viz.table({ columns: ['a'], rows: [[1], [2]] }), '2 filas'); });
    t.test('table applies row classes', () => t.includes(viz.table({ columns: ['a'], rows: [[1]], rowCls: ['drop'] }), 'class="drop"'));
    t.test('linked list draws forward links as straight lines', () => t.includes(viz.linked([1, 2], [1, null]), '<line'));
    t.test('linked list draws reversed links as curves', () => t.includes(viz.linked([1, 2], [null, 0]), 'vz-link back'));
    t.test('linked list marks null pointers', () => t.includes(viz.linked([1], [null]), '∅'));
    t.test('tree of nothing says the tree is empty', () => t.includes(viz.tree([], null), 'árbol vacío'));
    t.test('tree draws one circle per node', () => t.eq((viz.tree([{ key: 2, left: 1, right: null }, { key: 1, left: null, right: null }], 0).match(/<circle/g) || []).length, 2));
    t.test('tree marks the freshly inserted node', () => t.includes(viz.tree([{ key: 2, left: 1, right: null }, { key: 1, left: null, right: null }], 0, { fresh: 1 }), 'vz-tnode fresh'));
  });

  t.suite('tracer · station UI with a fake DOM', () => {
    const { Recorder } = T;
    const problem = (id) => ({
      id, title: `P ${id}`, difficulty: 'Media', pattern: 'X', statement: '<p>s</p>', lang: 'python',
      code: ['a = 1', 'b = 2', 'c = 3'], presets: ['1', '2'],
      parse(text) { if (!/^\d+$/.test(text.trim())) throw new Error('solo números'); return +text; },
      trace(n) { const r = new Recorder(); for (let i = 0; i < 3 + n; i++) r.step((i % 3) + 1, { i }, { i }, `paso ${i}`); return r.frames; },
      render(v) { return `<b>${v.i}</b>`; },
      learn: { idea: '<p>i</p>', signals: ['s'], time: 'O(1)', space: 'O(1)', why: 'w' },
      build: { template: 'x = 1', tips: ['t'], similar: ['s'] }
    });
    const lab = new T.TraceLab('demo', [problem('a'), problem('b')]);
    lab.init();
    t.test('init selects the first problem', () => t.eq(lab.problem.id, 'a'));
    t.test('init runs the first preset', () => t.eq(lab.frames.length, 4));
    t.test('the step counter shows position and total', () => t.eq(lab.$('.tr-count').textContent, '1 / 4'));
    t.test('go() clamps past the end', () => { lab.go(99); t.eq(lab.idx, 3); });
    t.test('go() clamps below zero', () => { lab.go(-5); t.eq(lab.idx, 0); });
    t.test('next() advances one step', () => { lab.go(0); lab.next(); t.eq(lab.idx, 1); });
    t.test('prev() goes back one step', () => { lab.go(2); lab.prev(); t.eq(lab.idx, 1); });
    t.test('the narration shows the current note', () => { lab.go(2); t.eq(lab.$('.tr-note-text').innerHTML, 'paso 2'); });
    t.test('invalid input shows the error and keeps the old trace', () => {
      lab.run('abc');
      t.eq(lab.$('.tr-error').textContent, 'solo números'); t.eq(lab.frames.length, 4);
    });
    t.test('valid custom input re-runs the trace', () => { lab.run('3'); t.eq(lab.frames.length, 6); t.eq(lab.$('.tr-error').textContent, ''); });
    t.test('select() switches problem and resets to step 1', () => { lab.select('b'); t.eq(lab.problem.id, 'b'); t.eq(lab.idx, 0); });
    t.test('stop() clears playback', () => { lab.play(); t.ok(lab.timer !== null); lab.stop(); t.eq(lab.timer, null); });
    t.test('learn and build pages are rendered from the problem data', () => {
      t.includes(lab.learnEl.innerHTML, 'O(1)'); t.includes(lab.buildEl.innerHTML, 'Plantilla del patrón');
    });
  });
};
