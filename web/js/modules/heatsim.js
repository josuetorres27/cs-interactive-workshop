// CS Interactive Workshop - Heat diffusion model (no DOM).
//
// Same method as the C engines in core-c-engines/concurrency/simulations/heat-diffusion:
// explicit 5-point stencil with double buffering, interior rows split into one
// contiguous band per thread, one barrier per iteration and a max reduction to
// decide convergence. Because every new value is computed only from the
// previous grid, the result is identical whatever the number of threads or the
// order in which rows are computed.
//
// Extra for the workshop: interior "sources" (fixed cells) that the student paints,
// and a small cost model to show busy vs. waiting time at the barrier.
(function (root) {
  const SCENARIOS = {
    edge: { label: 'Borde caliente', borders: { top: 100, bottom: 0, left: 0, right: 0 }, interior: 0, sources: [] },
    center: { label: 'Fuente central', borders: { top: 0, bottom: 0, left: 0, right: 0 }, interior: 0, sources: [{ y: 0.5, x: 0.5, r: 0.13, t: 100 }] },
    two: { label: 'Dos fuentes', borders: { top: 0, bottom: 0, left: 0, right: 0 }, interior: 0, sources: [{ y: 0.32, x: 0.25, r: 0.1, t: 100 }, { y: 0.68, x: 0.75, r: 0.1, t: 100 }] },
    cooling: { label: 'Placa que se enfría', borders: { top: 0, bottom: 0, left: 0, right: 0 }, interior: 100, sources: [] }
  };

  const STABLE_R = 0.25;
  const BARRIER_COST = 0.15; // fraction of a row's work, paid once per iteration by the team

  // ── Plate ──────────────────────────────────────────────────────────
  function createPlate(rows, cols, scenarioId = 'edge') {
    if (rows < 3 || cols < 3) throw new Error('La placa necesita al menos 3x3 celdas.');
    const sc = SCENARIOS[scenarioId] || SCENARIOS.edge;
    const n = rows * cols;
    const plate = { rows, cols, scenario: scenarioId, cur: new Float64Array(n), next: new Float64Array(n), fixed: new Uint8Array(n), iteration: 0, lastDelta: Infinity };
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const k = i * cols + j;
        let v = sc.interior, edge = false;
        if (j === 0) { v = sc.borders.left; edge = true; }
        if (j === cols - 1) { v = sc.borders.right; edge = true; }
        if (i === 0) { v = sc.borders.top; edge = true; }
        if (i === rows - 1) { v = sc.borders.bottom; edge = true; }
        plate.cur[k] = v; plate.next[k] = v; plate.fixed[k] = edge ? 1 : 0;
      }
    }
    sc.sources.forEach((s) => addHeat(plate, s.y * (rows - 1), s.x * (cols - 1), s.r * Math.min(rows, cols), s.t));
    return plate;
  }

  // Paint a fixed circular source (temperature t) centred at (ci, cj).
  function addHeat(plate, ci, cj, radius, t) {
    const { rows, cols } = plate;
    let changed = 0;
    for (let i = 1; i < rows - 1; i++) {
      for (let j = 1; j < cols - 1; j++) {
        if ((i - ci) ** 2 + (j - cj) ** 2 > radius * radius) continue;
        const k = i * cols + j;
        plate.cur[k] = t; plate.next[k] = t; plate.fixed[k] = 1;
        changed++;
      }
    }
    if (changed) plate.lastDelta = Infinity;
    return changed;
  }

  // ── Decomposition (same formula as heat_partition in heat.c) ──────
  function partition(rows, threads, mode = 'even') {
    const interior = rows - 2;
    const p = Math.max(1, Math.min(threads, interior));
    const sizes = [];
    if (mode === 'uneven' && p > 1) {
      // Thread 0 gets half of the plate, the rest share the other half.
      const first = Math.ceil(interior / 2);
      const rest = interior - first;
      sizes.push(first);
      for (let t = 1; t < p; t++) sizes.push(Math.floor(rest / (p - 1)) + (t - 1 < rest % (p - 1) ? 1 : 0));
    } else {
      for (let t = 0; t < p; t++) sizes.push(Math.floor(interior / p) + (t < interior % p ? 1 : 0));
    }
    let begin = 1;
    return sizes.map((size) => { const band = { begin, end: begin + size }; begin += size; return band; });
  }

  // ── Kernel: rows [begin, end) of next from cur; returns max |change| ──
  function stepRows(plate, r, begin, end) {
    const { cols, cur, next, fixed } = plate;
    let max = 0;
    for (let i = begin; i < end; i++) {
      const row = i * cols;
      for (let j = 1; j < cols - 1; j++) {
        const k = row + j;
        if (fixed[k]) { next[k] = cur[k]; continue; }
        const u = cur[k];
        const v = u + r * (cur[k - cols] + cur[k + cols] + cur[k - 1] + cur[k + 1] - 4 * u);
        next[k] = v;
        const d = Math.abs(v - u);
        if (d > max) max = d;
      }
    }
    return max;
  }

  // Reduction + swap, done once every thread reached the barrier.
  function finishIteration(plate, localMaxes) {
    const global = localMaxes.reduce((m, d) => (d > m || Number.isNaN(d) ? d : m), 0);
    const tmp = plate.cur; plate.cur = plate.next; plate.next = tmp;
    plate.iteration++;
    plate.lastDelta = global;
    return global;
  }

  // One whole iteration for all bands (used in fast mode and by tests).
  function iterate(plate, r, bands) {
    const locals = bands.map((b) => stepRows(plate, r, b.begin, b.end));
    return { maxDelta: finishIteration(plate, locals), locals };
  }

  // Run until converged, diverged or out of iterations.
  function solve(plate, r, bands, epsilon, maxIterations = 100000) {
    while (plate.iteration < maxIterations) {
      const { maxDelta } = iterate(plate, r, bands);
      if (!Number.isFinite(maxDelta) || maxDelta > 1e6) return { status: 'diverged', iterations: plate.iteration };
      if (maxDelta <= epsilon) return { status: 'converged', iterations: plate.iteration };
    }
    return { status: 'limit', iterations: plate.iteration };
  }

  // ── Cost model (work units = cells updated) ───────────────────────
  // slow[t] multiplies the time thread t needs per row (1 = normal).
  function iterationCost(bands, cols, slow = []) {
    const perRow = cols - 2;
    const busy = bands.map((b, t) => (b.end - b.begin) * perRow * (slow[t] || 1));
    const span = Math.max(...busy) + (bands.length > 1 ? BARRIER_COST * perRow : 0);
    const wait = busy.map((b) => span - b);
    const serial = bands.reduce((s, b) => s + (b.end - b.begin) * perRow, 0);
    return { busy, wait, span, serial, speedup: serial / span, efficiency: serial / span / bands.length };
  }

  // ── Colour (flat palette shared with the rest of the workshop) ─────────
  const STOPS = [
    [0, [43, 76, 126]],    // deep blue
    [25, [61, 143, 214]],  // sky
    [50, [143, 211, 165]], // mint
    [75, [246, 195, 59]],  // sun
    [100, [232, 81, 42]]   // tomato
  ];
  function color(t) {
    if (!Number.isFinite(t)) return [255, 255, 255];
    const v = Math.max(0, Math.min(100, t));
    for (let s = 1; s < STOPS.length; s++) {
      if (v <= STOPS[s][0]) {
        const [t0, c0] = STOPS[s - 1], [t1, c1] = STOPS[s];
        const f = (v - t0) / (t1 - t0);
        return [0, 1, 2].map((ch) => Math.round(c0[ch] + (c1[ch] - c0[ch]) * f));
      }
    }
    return STOPS[STOPS.length - 1][1].slice();
  }

  const isStable = (r) => r > 0 && r <= STABLE_R;

  const api = { SCENARIOS, STABLE_R, BARRIER_COST, createPlate, addHeat, partition, stepRows, finishIteration, iterate, solve, iterationCost, color, isStable };
  root.HeatSim = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
