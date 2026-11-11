// Data structures and SQL stations (web/js/modules/datastructures.js, sql.js).
'use strict';

module.exports = (t, { createEnv, mulberry32 }) => {
  const env = createEnv();
  env.load('js/tracer.js');
  env.load('js/modules/datastructures.js');
  env.load('js/modules/sql.js');
  const ds = Object.fromEntries(env.window.dsStation.problems.map((p) => [p.id, p]));
  const sql = Object.fromEntries(env.window.sqlStation.problems.map((p) => [p.id, p]));
  const last = (frames) => frames[frames.length - 1];
  const rand = mulberry32(77);
  const ri = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

  const balanced = (s) => {
    const st = []; const pairs = { ')': '(', ']': '[', '}': '{' };
    for (const c of s) { if (pairs[c]) { if (st.pop() !== pairs[c]) return false; } else st.push(c); }
    return st.length === 0;
  };

  t.suite('data structures · balanced brackets (stack)', () => {
    const p = ds['valid-parens'];
    const verdict = (s) => last(p.trace({ s })).viz.bad === false;
    p.presets.forEach((text) => {
      t.test(`preset ${text}`, () => { const s = p.parse(text).s; t.eq(verdict(s), balanced(s)); });
    });
    for (let k = 0; k < 8; k++) {
      const s = Array.from({ length: ri(1, 12) }, () => '()[]{}'[ri(0, 5)]).join('');
      t.test(`random case ${k + 1}: "${s}"`, () => t.eq(verdict(s), balanced(s)));
    }
    t.test('the stack is empty at the end of a balanced string', () => t.deepEq(last(p.trace({ s: '([]{})' })).viz.stack, []));
    t.test('a lone closing bracket fails immediately', () => t.eq(p.trace({ s: ')' }).length <= 6, true));
    t.test('rejects characters that are not brackets', () => t.throws(() => p.parse('"(a)"')));
    t.test('rejects strings longer than 16', () => t.throws(() => p.parse('"((((((((((((((((("')));
  });

  t.suite('data structures · reverse a linked list', () => {
    const p = ds['reverse-list'];
    const follow = (viz) => { const out = []; let i = viz.ptr.prev; let guard = 0; while (i !== null && i !== undefined && guard++ < 20) { out.push(viz.values[i]); i = viz.next[i]; } return out; };
    p.presets.forEach((text) => {
      t.test(`preset ${text}: walking from the new head gives the reversed list`, () => {
        const values = p.parse(text).values; t.deepEq(follow(last(p.trace({ values })).viz), values.slice().reverse());
      });
    });
    t.test('the old head becomes the tail (points to None)', () => t.eq(last(p.trace({ values: [1, 2, 3] })).viz.next[0], null));
    t.test('curr ends as None', () => t.eq(last(p.trace({ values: [1, 2, 3] })).viz.ptr.curr, null));
    t.test('no node is lost or duplicated', () => { const vals = [4, 8, 15, 16, 23, 42]; t.deepEq(follow(last(p.trace({ values: vals })).viz).sort((a, b) => a - b), vals.slice().sort((a, b) => a - b)); });
    t.test('rejects lists longer than 7', () => t.throws(() => p.parse('[1,2,3,4,5,6,7,8]')));
  });

  t.suite('data structures · binary search tree insertion', () => {
    const p = ds['bst-insert'];
    const inorder = (nodes, id) => (id === null || id === undefined ? [] : [...inorder(nodes, nodes[id].left), nodes[id].key, ...inorder(nodes, nodes[id].right)]);
    const height = (nodes, id) => (id === null || id === undefined ? 0 : 1 + Math.max(height(nodes, nodes[id].left), height(nodes, nodes[id].right)));
    const isBST = (nodes, id, lo = -Infinity, hi = Infinity) => id === null || id === undefined || (nodes[id].key >= lo && nodes[id].key < hi + 1e-9 && isBST(nodes, nodes[id].left, lo, nodes[id].key - 1e-9) && isBST(nodes, nodes[id].right, nodes[id].key, hi));
    p.presets.forEach((text) => {
      t.test(`preset ${text}: in-order traversal is sorted`, () => {
        const keys = p.parse(text).keys; const v = last(p.trace({ keys })).viz;
        t.deepEq(inorder(v.nodes, v.root), keys.slice().sort((a, b) => a - b));
      });
    });
    for (let k = 0; k < 5; k++) {
      const keys = Array.from({ length: ri(1, 12) }, () => ri(0, 99));
      t.test(`random case ${k + 1}: [${keys}] keeps the BST property`, () => {
        const v = last(p.trace({ keys })).viz;
        t.ok(isBST(v.nodes, v.root)); t.eq(v.nodes.length, keys.length);
      });
    }
    t.test('sorted keys degenerate into a list (height = n)', () => { const v = last(p.trace({ keys: [1, 2, 3, 4, 5] })).viz; t.eq(height(v.nodes, v.root), 5); });
    t.test('the first key becomes the root', () => { const v = last(p.trace({ keys: [50, 30, 70] })).viz; t.eq(v.nodes[v.root].key, 50); });
    t.test('the final note warns about degenerate trees', () => t.includes(last(p.trace({ keys: [1, 2, 3, 4] })).note, 'como una lista'));
    t.test('rejects negative keys', () => t.throws(() => p.parse('[-1, 2]')));
  });

  t.suite('SQL · logical execution order', () => {
    const rows = (frame) => frame.viz.tables[frame.viz.tables.length - 1].rows;
    t.test('JOIN query executes FROM, JOIN, WHERE, SELECT, ORDER BY', () => t.deepEq([...new Set(sql['join-where'].trace().map((f) => f.line))], [2, 3, 4, 1, 5]));
    t.test('JOIN query returns the approved enrolments, best first', () => t.deepEq(rows(last(sql['join-where'].trace())), [['Diego', 'Algoritmos', 95], ['Luis', 'Concurrente', 91], ['Ana', 'Redes', 88], ['Ana', 'Algoritmos', 72]]));
    t.test('JOIN drops Sofía, who has no enrolments', () => t.ok(!JSON.stringify(sql['join-where'].trace()[2].viz).includes('Sofía')));
    t.test('WHERE marks the NULL grade as dropped', () => { const f = sql['join-where'].trace()[3]; const i = rows(f).findIndex((r) => r[4] === null); t.eq(f.viz.tables[0].rowCls[i], 'drop'); });
    t.test('GROUP BY query runs WHERE before GROUP BY and HAVING', () => t.deepEq([...new Set(sql['group-having'].trace().map((f) => f.line))], [2, 3, 4, 5, 1, 6]));
    t.test('GROUP BY computes count and average per course', () => {
      const f = sql['group-having'].trace().find((x) => x.line === 4 && x.vars.grupos && !x.vars.filas);
      t.deepEq(rows(f), [['Redes', 2, 76.5], ['Algoritmos', 3, 75], ['Concurrente', 1, 91]]);
    });
    t.test('HAVING removes the course with a single grade', () => t.deepEq(rows(last(sql['group-having'].trace())).map((r) => r[0]), ['Redes', 'Algoritmos']));
    t.test('the final GROUP BY result is ordered by average', () => { const r = rows(last(sql['group-having'].trace())); t.ok(r[0][2] >= r[1][2]); });
    t.test('LEFT JOIN keeps every student (8 rows)', () => t.eq(rows(sql['left-join-null'].trace()[1]).length, 8));
    t.test('LEFT JOIN fills missing matches with NULL', () => t.ok(rows(sql['left-join-null'].trace()[1]).some((r) => r[1] === 'Sofía' && r[2] === null)));
    t.test('anti-join returns only Sofía', () => t.deepEq(rows(last(sql['left-join-null'].trace())), [['Sofía']]));
    t.test('every SQL frame says which clause is running', () => Object.values(sql).forEach((p) => p.trace().forEach((f) => t.ok(/^§\d · /.test(f.vars.paso)))));
    t.test('every SQL frame renders an HTML table', () => Object.values(sql).forEach((p) => p.trace().forEach((f) => t.includes(p.render(f.viz), '<table>'))));
    t.test('SQL problems take no custom input', () => Object.values(sql).forEach((p) => t.ok(!p.presets)));
  });
};
