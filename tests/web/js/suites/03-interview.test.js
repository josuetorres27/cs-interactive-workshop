// Interview pattern problems (web/js/modules/interview.js) vs. reference solutions.
'use strict';

module.exports = (t, { createEnv, mulberry32 }) => {
  const env = createEnv();
  env.load('js/tracer.js');
  env.load('js/modules/interview.js');
  const lab = env.window.interviewLab;
  const P = Object.fromEntries(lab.problems.map((p) => [p.id, p]));
  const last = (frames) => frames[frames.length - 1];
  const rand = mulberry32(2024);
  const ri = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const randArr = (n, lo, hi) => Array.from({ length: n }, () => ri(lo, hi));

  // Reference implementations, written independently of the traced code
  const ref = {
    pairExists: (nums, target) => nums.some((x, i) => nums.some((y, j) => i < j && x + y === target)),
    maxArea: (h) => { let b = 0; for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) b = Math.max(b, (j - i) * Math.min(h[i], h[j])); return b; },
    merge: (iv) => {
      const s = iv.map((x) => x.slice()).sort((a, b) => a[0] - b[0]); const out = [];
      s.forEach(([a, b]) => { if (out.length && a <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b); else out.push([a, b]); });
      return out;
    },
    longest: (s) => { let b = 0; for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) { const w = s.slice(i, j + 1); if (new Set(w).size === w.length) b = Math.max(b, w.length); } return b; },
    trap: (h) => h.reduce((acc, x, i) => acc + Math.max(0, Math.min(Math.max(...h.slice(0, i + 1)), Math.max(...h.slice(i))) - x), 0),
    windowMax: (nums, k) => nums.slice(0, nums.length - k + 1).map((_, i) => Math.max(...nums.slice(i, i + k)))
  };
  const runP = (id, text) => { const p = P[id]; const args = p.parse(text); return { args, frames: p.trace(args) }; };

  t.suite('interview · catalogue', () => {
    t.test('six problems are offered', () => t.eq(lab.problems.length, 6));
    t.test('the station is mostly medium and hard', () => t.ok(lab.problems.every((p) => ['Media', 'Difícil'].includes(p.difficulty))));
    t.test('at least two problems are hard', () => t.ok(lab.problems.filter((p) => p.difficulty === 'Difícil').length >= 2));
    t.test('every problem has three presets', () => lab.problems.forEach((p) => t.eq(p.presets.length, 3, p.id)));
    t.test('every problem has learn and build content', () => lab.problems.forEach((p) => { t.ok(p.learn.idea && p.learn.signals.length); t.ok(p.build.template && p.build.tips.length && p.build.similar.length); }));
  });

  t.suite('interview · every frame is well formed', () => {
    lab.problems.forEach((p) => {
      t.test(`${p.id}: frames point at real, non-blank code lines and render`, () => {
        p.presets.forEach((text) => {
          const args = p.parse(text);
          p.trace(args).forEach((f, i) => {
            t.ok(f.line >= 1 && f.line <= p.code.length, `frame ${i} line ${f.line}`);
            t.ok(p.code[f.line - 1].trim().length > 0, `frame ${i} on a blank line`);
            const html = p.render(f.viz, args);
            t.notIncludes(html, 'undefined'); t.notIncludes(html, 'NaN');
          });
        });
      });
    });
  });

  t.suite('interview · pair with target sum (two pointers)', () => {
    P['two-sum-sorted'].presets.forEach((text) => {
      t.test(`preset ${text}: answer matches brute force`, () => {
        const { args, frames } = runP('two-sum-sorted', text); const f = last(frames);
        if (f.line === 6) t.eq(args.nums[f.vars.l] + args.nums[f.vars.r], args.target);
        else t.ok(!ref.pairExists(args.nums, args.target));
      });
    });
    for (let k = 0; k < 4; k++) {
      const nums = randArr(ri(2, 12), 0, 30).sort((a, b) => a - b);
      const target = rand() < 0.6 ? nums[ri(0, nums.length - 1)] + nums[ri(0, nums.length - 1)] : ri(0, 70);
      t.test(`random case ${k + 1}: [${nums}] target ${target}`, () => {
        const frames = P['two-sum-sorted'].trace({ nums, target }); const f = last(frames);
        if (f.line === 6) { t.ok(f.vars.l < f.vars.r); t.eq(nums[f.vars.l] + nums[f.vars.r], target); } else t.ok(!ref.pairExists(nums, target));
      });
    }
    t.test('rejects an unsorted array', () => t.throws(() => P['two-sum-sorted'].parse('[3, 1, 2], 4'), /ordenado/));
    t.test('rejects a missing target', () => t.throws(() => P['two-sum-sorted'].parse('[1, 2, 3]')));
    t.test('rejects malformed text', () => t.throws(() => P['two-sum-sorted'].parse('[1, 2'), /No pude leer/));
  });

  t.suite('interview · container with most water', () => {
    P['max-water'].presets.forEach((text) => {
      t.test(`preset ${text}: best area matches brute force`, () => { const { args, frames } = runP('max-water', text); t.eq(last(frames).vars.best, ref.maxArea(args.h)); });
    });
    for (let k = 0; k < 4; k++) {
      const h = randArr(ri(2, 14), 0, 30);
      t.test(`random case ${k + 1}: [${h}]`, () => t.eq(last(P['max-water'].trace({ h })).vars.best, ref.maxArea(h)));
    }
    t.test('rejects heights above 30', () => t.throws(() => P['max-water'].parse('[1, 99]')));
    t.test('rejects a single wall', () => t.throws(() => P['max-water'].parse('[5]')));
  });

  t.suite('interview · merge intervals', () => {
    P['merge-intervals'].presets.forEach((text) => {
      t.test(`preset: result matches the reference`, () => { const { args, frames } = runP('merge-intervals', text); t.deepEq(last(frames).vars.merged, ref.merge(args.intervals)); });
    });
    for (let k = 0; k < 4; k++) {
      const intervals = Array.from({ length: ri(1, 9) }, () => { const a = ri(0, 35); return [a, a + ri(0, 5)]; });
      t.test(`random case ${k + 1}: ${JSON.stringify(intervals)}`, () => t.deepEq(last(P['merge-intervals'].trace({ intervals })).vars.merged, ref.merge(intervals)));
    }
    t.test('touching intervals merge ([1,4] and [4,5])', () => t.deepEq(last(P['merge-intervals'].trace({ intervals: [[1, 4], [4, 5]] })).vars.merged, [[1, 5]]));
    t.test('contained intervals do not shrink the result', () => t.deepEq(last(P['merge-intervals'].trace({ intervals: [[1, 10], [2, 3]] })).vars.merged, [[1, 10]]));
    t.test('rejects start greater than end', () => t.throws(() => P['merge-intervals'].parse('[[5, 1]]')));
  });

  t.suite('interview · longest substring without repeats', () => {
    P['longest-unique'].presets.forEach((text) => {
      t.test(`preset ${text}: matches brute force`, () => { const { args, frames } = runP('longest-unique', text); t.eq(last(frames).vars.best, ref.longest(args.s)); });
    });
    for (let k = 0; k < 4; k++) {
      const s = Array.from({ length: ri(1, 16) }, () => 'abcde'[ri(0, 4)]).join('');
      t.test(`random case ${k + 1}: "${s}"`, () => t.eq(last(P['longest-unique'].trace({ s })).vars.best, ref.longest(s)));
    }
    t.test('a string of one repeated letter has answer 1', () => t.eq(last(P['longest-unique'].trace({ s: 'aaaa' })).vars.best, 1));
    t.test('rejects strings longer than 16', () => t.throws(() => P['longest-unique'].parse('"abcdefghijklmnopq"')));
  });

  t.suite('interview · trapping rain water', () => {
    P['trap-rain'].presets.forEach((text) => {
      t.test(`preset ${text}: matches prefix-max reference`, () => { const { args, frames } = runP('trap-rain', text); t.eq(last(frames).vars.water, ref.trap(args.h)); });
    });
    for (let k = 0; k < 4; k++) {
      const h = randArr(ri(2, 14), 0, 12);
      t.test(`random case ${k + 1}: [${h}]`, () => t.eq(last(P['trap-rain'].trace({ h })).vars.water, ref.trap(h)));
    }
    t.test('a staircase traps nothing', () => t.eq(last(P['trap-rain'].trace({ h: [1, 2, 3, 4] })).vars.water, 0));
    t.test('rejects non-integer heights', () => t.throws(() => P['trap-rain'].parse('[1.5, 2]')));
  });

  t.suite('interview · sliding window maximum', () => {
    P['sliding-max'].presets.forEach((text) => {
      t.test(`preset ${text}: matches brute force`, () => { const { args, frames } = runP('sliding-max', text); t.deepEq(last(frames).vars.out, ref.windowMax(args.nums, args.k)); });
    });
    for (let k = 0; k < 4; k++) {
      const nums = randArr(ri(1, 12), -9, 20); const w = ri(1, nums.length);
      t.test(`random case ${k + 1}: [${nums}], k=${w}`, () => t.deepEq(last(P['sliding-max'].trace({ nums, k: w })).vars.out, ref.windowMax(nums, w)));
    }
    t.test('k = 1 returns the array itself', () => t.deepEq(last(P['sliding-max'].trace({ nums: [3, 1, 2], k: 1 })).vars.out, [3, 1, 2]));
    t.test('rejects k larger than the array', () => t.throws(() => P['sliding-max'].parse('[1, 2], 5')));
  });
};
