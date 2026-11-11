// Heat diffusion: model (heatsim.js) and station (heat.js).
'use strict';

module.exports = (t, { createEnv, read }) => {
  const env = createEnv();
  env.load('js/modules/heatsim.js');
  const H = env.window.HeatSim;
  const at = (p, i, j) => p.cur[i * p.cols + j];
  const same = (a, b) => a.cur.length === b.cur.length && a.cur.every((v, k) => v === b.cur[k]);

  // Independent, straightforward implementation to compare against
  const reference = (scenario, rows, cols, r, iterations) => {
    const p = H.createPlate(rows, cols, scenario);
    let cur = Array.from(p.cur), next = Array.from(p.cur);
    for (let it = 0; it < iterations; it++) {
      for (let i = 1; i < rows - 1; i++) for (let j = 1; j < cols - 1; j++) {
        const k = i * cols + j;
        next[k] = p.fixed[k] ? cur[k] : cur[k] + r * (cur[k - cols] + cur[k + cols] + cur[k - 1] + cur[k + 1] - 4 * cur[k]);
      }
      [cur, next] = [next, cur];
    }
    return cur;
  };

  t.suite('heat · plate and scenarios', () => {
    t.test('"Borde caliente" has a 100° top edge and cold sides', () => {
      const p = H.createPlate(10, 12, 'edge');
      for (let j = 0; j < 12; j++) t.eq(at(p, 0, j), 100);
      t.eq(at(p, 5, 0), 0); t.eq(at(p, 9, 6), 0);
    });
    t.test('borders are fixed cells, the interior is free', () => {
      const p = H.createPlate(6, 6, 'edge');
      t.eq(p.fixed[0], 1); t.eq(p.fixed[6 * 2 + 5], 1); t.eq(p.fixed[6 * 2 + 2], 0);
    });
    t.test('"Fuente central" fixes a hot disc in the middle', () => {
      const p = H.createPlate(42, 64, 'center');
      const k = 21 * 64 + 32; t.eq(p.cur[k], 100); t.eq(p.fixed[k], 1);
    });
    t.test('"Dos fuentes" creates two separate hot spots', () => {
      const p = H.createPlate(42, 64, 'two');
      t.eq(at(p, Math.round(0.32 * 41), Math.round(0.25 * 63)), 100);
      t.eq(at(p, Math.round(0.68 * 41), Math.round(0.75 * 63)), 100);
      t.eq(at(p, 21, 32), 0);
    });
    t.test('"Se enfría" starts with a hot interior and cold edges', () => { const p = H.createPlate(8, 8, 'cooling'); t.eq(at(p, 4, 4), 100); t.eq(at(p, 0, 4), 0); });
    t.test('unknown scenarios fall back to the hot edge', () => t.eq(at(H.createPlate(5, 5, 'lava'), 0, 2), 100));
    t.test('plates smaller than 3x3 are rejected', () => t.throws(() => H.createPlate(2, 9), /3x3/));
    t.test('painting fixes cells, ignores borders and wakes the solver', () => {
      const p = H.createPlate(20, 20, 'edge'); p.lastDelta = 0.001;
      const n = H.addHeat(p, 10, 10, 2.2, 100);
      t.ok(n > 0); t.eq(at(p, 10, 10), 100); t.eq(p.fixed[10 * 20 + 10], 1); t.eq(p.lastDelta, Infinity);
      t.eq(H.addHeat(p, 0, 0, 0.5, 50), 0);
    });
  });

  t.suite('heat · splitting rows between threads', () => {
    t.test('even split: contiguous bands covering every interior row, sizes differ by at most 1', () => {
      [1, 2, 3, 4, 5, 6, 7, 8].forEach((p) => {
        const bands = H.partition(42, p);
        t.eq(bands[0].begin, 1); t.eq(bands[bands.length - 1].end, 41);
        bands.slice(1).forEach((b, k) => t.eq(b.begin, bands[k].end));
        const sizes = bands.map((b) => b.end - b.begin);
        t.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `${p} threads`);
      });
    });
    t.test('the split matches the C engine formula (first bands get the extra rows)', () => {
      t.deepEq(H.partition(12, 3).map((b) => b.end - b.begin), [4, 3, 3]);
    });
    t.test('more threads than rows are clamped', () => t.eq(H.partition(5, 8).length, 3));
    t.test('uneven split gives thread 0 half of the plate', () => {
      const b = H.partition(42, 4, 'uneven');
      t.eq(b[0].end - b[0].begin, 20); t.eq(b[b.length - 1].end, 41);
      b.slice(1).forEach((x, k) => t.eq(x.begin, b[k].end));
    });
    t.test('an uneven split of one thread is just the whole plate', () => t.deepEq(H.partition(10, 1, 'uneven'), [{ begin: 1, end: 9 }]));
  });

  t.suite('heat · the stencil', () => {
    t.test('one hot neighbour above gives r × 100 in the centre', () => {
      const p = H.createPlate(3, 3, 'edge');
      H.iterate(p, 0.25, H.partition(3, 1));
      t.eq(at(p, 1, 1), 25);
    });
    t.test('fixed cells never change', () => {
      const p = H.createPlate(30, 30, 'center'); const k = 15 * 30 + 15;
      for (let i = 0; i < 50; i++) H.iterate(p, 0.24, H.partition(30, 4));
      t.eq(p.cur[k], 100);
    });
    t.test('each iteration swaps the buffers and counts', () => {
      const p = H.createPlate(10, 10, 'edge'); const before = p.cur;
      H.iterate(p, 0.2, H.partition(10, 2));
      t.eq(p.next, before); t.eq(p.iteration, 1);
    });
    t.test('the result matches a plain reference implementation exactly', () => {
      const p = H.createPlate(17, 23, 'two');
      for (let i = 0; i < 40; i++) H.iterate(p, 0.23, H.partition(17, 3));
      t.deepEq(Array.from(p.cur), reference('two', 17, 23, 0.23, 40));
    });
    t.test('the maximum principle holds: values stay between 0 and 100', () => {
      const p = H.createPlate(30, 40, 'two');
      for (let i = 0; i < 200; i++) H.iterate(p, 0.25, H.partition(30, 4));
      t.ok(p.cur.every((v) => v >= 0 && v <= 100));
    });
    t.test('the reduction keeps the largest change of all threads', () => {
      const p = H.createPlate(6, 6, 'edge');
      t.eq(H.finishIteration(p, [0.1, 0.7, 0.3]), 0.7);
    });
    t.test('a NaN in any thread poisons the reduction (so divergence is caught)', () => {
      const p = H.createPlate(6, 6, 'edge');
      t.ok(Number.isNaN(H.finishIteration(p, [0.1, NaN, 0.3])));
    });
  });

  t.suite('heat · same answer with any number of threads', () => {
    Object.keys(H.SCENARIOS).forEach((sc) => {
      t.test(`${sc}: 1, 2, 4 and 8 threads (even and uneven) give the identical plate`, () => {
        const base = H.createPlate(42, 64, sc);
        const rb = H.solve(base, 0.24, H.partition(42, 1), 0.05);
        [2, 4, 8].forEach((n) => ['even', 'uneven'].forEach((mode) => {
          const p = H.createPlate(42, 64, sc);
          const r = H.solve(p, 0.24, H.partition(42, n, mode), 0.05);
          t.eq(r.iterations, rb.iterations, `${n} ${mode}`); t.ok(same(p, base), `${n} ${mode}`);
        }));
      });
    });
    t.test('converged runs end below epsilon', () => {
      const p = H.createPlate(30, 30, 'edge'); const r = H.solve(p, 0.24, H.partition(30, 4), 0.01);
      t.eq(r.status, 'converged'); t.ok(p.lastDelta <= 0.01);
    });
    t.test('a smaller epsilon needs more iterations', () => {
      const a = H.solve(H.createPlate(30, 30, 'edge'), 0.24, H.partition(30, 2), 0.1);
      const b = H.solve(H.createPlate(30, 30, 'edge'), 0.24, H.partition(30, 2), 0.001);
      t.ok(a.iterations < b.iterations);
    });
    t.test('r above 1/4 diverges', () => t.eq(H.solve(H.createPlate(42, 64, 'edge'), 0.3, H.partition(42, 4), 0.01).status, 'diverged'));
    t.test('r = 1/4 is the stability limit and stays stable', () => t.eq(H.solve(H.createPlate(30, 30, 'center'), 0.25, H.partition(30, 4), 0.01).status, 'converged'));
    t.test('isStable accepts (0, 1/4] only', () => { t.ok(H.isStable(0.25)); t.ok(!H.isStable(0.26)); t.ok(!H.isStable(0)); });
    t.test('the iteration limit is respected', () => t.eq(H.solve(H.createPlate(30, 30, 'edge'), 0.2, H.partition(30, 2), 1e-12, 37).status, 'limit'));
  });

  t.suite('heat · cost model (busy vs. waiting at the barrier)', () => {
    t.test('one thread: no barrier cost, speedup 1', () => { const c = H.iterationCost(H.partition(42, 1), 64); t.eq(c.speedup, 1); t.eq(c.wait[0], 0); });
    t.test('four even threads speed up almost 4x', () => { const c = H.iterationCost(H.partition(42, 4), 64); t.ok(c.speedup > 3.8 && c.speedup < 4); t.ok(c.efficiency <= 1); });
    t.test('an uneven split wastes time waiting', () => {
      const even = H.iterationCost(H.partition(42, 4), 64), uneven = H.iterationCost(H.partition(42, 4, 'uneven'), 64);
      t.ok(uneven.speedup < even.speedup / 1.5);
    });
    t.test('a slow thread drags everyone down', () => {
      const even = H.iterationCost(H.partition(42, 4), 64), slow = H.iterationCost(H.partition(42, 4), 64, [2.5]);
      t.ok(slow.speedup < even.speedup / 2);
    });
    t.test('the slowest thread waits only for the barrier itself', () => {
      const c = H.iterationCost(H.partition(42, 4), 64, [2.5]);
      t.near(c.wait[0], H.BARRIER_COST * 62, 1e-9); t.ok(c.wait.slice(1).every((w) => w > c.wait[0]));
    });
  });

  t.suite('heat · colours', () => {
    t.test('0° is deep blue and 100° is tomato red', () => { t.deepEq(H.color(0), [43, 76, 126]); t.deepEq(H.color(100), [232, 81, 42]); });
    t.test('temperatures outside 0-100 are clamped', () => { t.deepEq(H.color(-20), H.color(0)); t.deepEq(H.color(500), H.color(100)); });
    t.test('a blown-up value is drawn white', () => t.deepEq(H.color(NaN), [255, 255, 255]));
    t.test('the palette uses the workshop colours at 25/50/75', () => { t.deepEq(H.color(25), [61, 143, 214]); t.deepEq(H.color(50), [143, 211, 165]); t.deepEq(H.color(75), [246, 195, 59]); });
  });

  // ── The station on a fake DOM ──────────────────────────────────────
  const station = (setup) => {
    const e = createEnv();
    e.load('js/modules/heatsim.js');
    e.load('js/progress.js'); e.load('js/account.js');
    e.load('js/modules/heat.js');
    if (setup) setup(e);
    const stn = e.window.heatStation;
    stn.init();
    return { e, stn, $: (id) => e.document.getElementById(id) };
  };
  const chip = ($, id, attr, value) => $(id).dispatch('click', { target: { closest: () => ({ dataset: { [attr]: value } }) } });
  const run = (stn, max = 5000) => { let n = 0; while (stn.running && n++ < max) stn.frame(); return n; };

  t.suite('heat · station UI', () => {
    t.test('starts with the hot-edge plate split between 4 threads', () => {
      const { stn, $ } = station();
      t.eq(stn.bands.length, 4); t.eq(stn.plate.scenario, 'edge'); t.eq(($('heatLanes').innerHTML.match(/class="lane"/g) || []).length, 4);
    });
    t.test('choosing 8 threads re-splits the plate', () => {
      const { stn, $ } = station(); chip($, 'heatThreadChips', 'threads', '8');
      t.eq(stn.bands.length, 8); t.eq(($('heatLanes').innerHTML.match(/class="lane"/g) || []).length, 8);
    });
    t.test('"Una iteración" advances exactly one iteration', () => { const { stn, $ } = station(); $('heatStep').click(); t.eq(stn.plate.iteration, 1); });
    t.test('slow speeds compute row by row and then pass the barrier', () => {
      const { stn, $ } = station(); $('heatPlay').click();
      stn.frame();
      t.eq(stn.plate.iteration, 0); t.ok(stn.sweep.progress.every((p) => p > 0));
      let guard = 0; while (stn.plate.iteration === 0 && guard++ < 500) stn.frame();
      t.eq(stn.plate.iteration, 1); t.ok(stn.sweep.done.every((d) => d === 0));
    });
    t.test('with a slow thread, the others reach the barrier first and wait', () => {
      const { stn, $ } = station((e) => { e.document.getElementById('heatSlow').checked = true; });
      $('heatSlow').dispatch('change', { target: { checked: true } }); $('heatPlay').click();
      let guard = 0; while (stn.sweep.done[1] < stn.bands[1].end - stn.bands[1].begin && guard++ < 500) stn.frame();
      t.ok(stn.sweep.done[0] < stn.bands[0].end - stn.bands[0].begin, 'thread 0 still computing');
      stn.renderPanels(false);
      t.eq($('heatLanes').querySelector('.lane-state').textContent !== undefined, true);
    });
    t.test('fast speeds run many iterations per frame until equilibrium', () => {
      const { stn, $ } = station(); $('heatSpeed').dispatch('input', { target: { value: '10' } }); $('heatPlay').click();
      const frames = run(stn);
      t.eq(stn.status, 'converged'); t.ok(frames < 20); t.ok(stn.plate.lastDelta <= stn.eps);
    });
    t.test('animated and fast runs reach the identical plate', () => {
      const a = station(); a.$('heatSpeed').dispatch('input', { target: { value: '3' } }); a.$('heatPlay').click();
      let guard = 0; while (a.stn.plate.iteration < 30 && guard++ < 20000) a.stn.frame();
      a.stn.pause();
      const p = H.createPlate(42, 64, 'edge'); for (let i = 0; i < a.stn.plate.iteration; i++) H.iterate(p, 0.24, H.partition(42, 1));
      t.ok(same(a.stn.plate, p));
    });
    t.test('changing threads mid-iteration finishes it first (nothing is lost)', () => {
      const { stn, $ } = station(); $('heatPlay').click();
      let guard = 0; while (stn.sweep.done.every((d) => d === 0) && guard++ < 100) stn.frame();
      t.eq(stn.plate.iteration, 0); t.ok(stn.sweep.done.some((d) => d > 0), 'some rows already computed');
      chip($, 'heatThreadChips', 'threads', '2');
      t.eq(stn.plate.iteration, 1); t.eq(stn.bands.length, 2);
      const p = H.createPlate(42, 64, 'edge'); H.iterate(p, 0.24, H.partition(42, 4)); t.ok(same(stn.plate, p));
    });
    t.test('r above 1/4 makes the plate blow up and stops with a warning', () => {
      const { stn, $ } = station(); $('heatR').dispatch('input', { target: { value: '30' } });
      $('heatSpeed').dispatch('input', { target: { value: '10' } }); $('heatPlay').click(); run(stn);
      t.eq(stn.status, 'diverged'); t.eq($('heatAlert').style.display, 'flex'); t.includes($('heatRHint').textContent, 'Inestable');
    });
    t.test('the timeline and the convergence chart are drawn', () => {
      const { stn, $ } = station(); $('heatStep').click(); $('heatStep').click(); stn.frame();
      t.includes($('heatTimeline').innerHTML, 'barrera'); t.includes($('heatChart').innerHTML, 'ε = 0.01');
    });
    t.test('an unbalanced split explains the load imbalance', () => {
      const { stn, $ } = station(); chip($, 'heatSplit', 'split', 'uneven'); stn.frame();
      t.eq($('heatNoteTitle').textContent, 'Desbalance de carga');
    });
    t.test('painting on the plate adds a fixed source', () => {
      const { stn, $ } = station();
      $('heatCanvas').dispatch('pointerdown', { clientX: 400, clientY: 200, pointerId: 1 });
      t.ok(stn.plate.fixed.some((f, k) => f && Math.floor(k / 64) > 0 && Math.floor(k / 64) < 41 && k % 64 > 0 && k % 64 < 63));
    });
    t.test('reset goes back to iteration 0', () => { const { stn, $ } = station(); $('heatStep').click(); $('heatReset').click(); t.eq(stn.plate.iteration, 0); t.eq(stn.status, 'idle'); });
    t.test('progress: equilibrium, 8 threads, imbalance, painting and instability are recorded', () => {
      const { e, stn, $ } = station();
      chip($, 'heatThreadChips', 'threads', '8'); chip($, 'heatSplit', 'split', 'uneven');
      $('heatSpeed').dispatch('input', { target: { value: '10' } }); $('heatPlay').click(); run(stn);
      $('heatCanvas').dispatch('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 });
      $('heatR').dispatch('input', { target: { value: '30' } }); $('heatPlay').click(); run(stn);
      const items = e.window.account.progress.stations.heat.items;
      ['converge', 'threads8', 'imbalance', 'paint', 'unstable'].forEach((k) => t.ok(items[k], k));
    });
    t.test('nothing runs while the station is hidden', () => {
      const { stn, $ } = station(); $('heatPlay').click(); stn.canvas.offsetParent = null;
      for (let i = 0; i < 50; i++) stn.frame();
      t.eq(stn.plate.iteration, 0);
    });
  });

  t.suite('heat · C engine sources', () => {
    const c = read('core-c-engines/concurrency/simulations/heat-diffusion/common/heat.c');
    const omp = read('core-c-engines/concurrency/simulations/heat-diffusion/common/heat_omp.c');
    t.test('pthreads uses one barrier per iteration with parity slots', () => { t.includes(c, 'parity'); t.includes(c, 'deltas[parity * s->threads + tid]'); });
    t.test('per-thread slots are padded to a cache line', () => t.includes(c, 'char pad[CACHE_LINE - sizeof(double)]'));
    t.test('the spinning barrier is sense-reversing and yields', () => { t.includes(c, 'atomic_fetch_sub_explicit'); t.includes(c, 'sched_yield()'); });
    t.test('a start gate prevents deadlock when thread creation fails', () => t.includes(c, 'open_gate(s, rc == HEAT_OK ? 1 : -1)'));
    t.test('OpenMP opens one parallel region for the whole solve', () => { t.includes(omp, '#pragma omp parallel num_threads(threads)'); t.includes(omp, 'reduction(max:step_delta)'); });
    t.test('the C tests link the real library, not a copy', () => t.includes(read('tests/Makefile'), '$(HEAT_DIR)/heat.c $(HEAT_DIR)/heat_omp.c'));
  });
};
