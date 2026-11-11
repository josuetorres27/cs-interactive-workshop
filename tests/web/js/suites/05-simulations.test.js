// Sorting, concurrency and Amdahl simulations (algorithms.js, concurrency.js, cheatsheets.js).
'use strict';

module.exports = (t, { createEnv }) => {
  const ALGOS = ['quick', 'merge', 'heap', 'shell', 'insertion', 'selection', 'bubble', 'radix'];
  const DISTS = ['random', 'reversed'];
  const isSorted = (a) => a.every((x, i) => i === 0 || a[i - 1] <= x);
  const sameItems = (a, b) => JSON.stringify(a.slice().sort((x, y) => x - y)) === JSON.stringify(b.slice().sort((x, y) => x - y));

  const freshAlgo = (seed = 5) => {
    const env = createEnv({ seed });
    env.load('js/modules/algorithms.js');
    const lab = env.window.algorithmsStation;
    lab.init();
    lab.delay = 0;
    return { env, lab };
  };

  t.suite('simulations · sorting algorithms really sort', () => {
    ALGOS.forEach((algo) => DISTS.forEach((dist) => {
      t.test(`${algo} sorts a ${dist} array of 40 and keeps the same values`, async () => {
        const { lab } = freshAlgo(ALGOS.indexOf(algo) + 11);
        lab.arraySize = 40; lab.generateArray(dist);
        const before = lab.array.slice();
        lab.currentAlgo = algo;
        await lab.start();
        t.ok(isSorted(lab.array), `${algo} result not sorted: ${lab.array}`);
        t.ok(sameItems(lab.array, before), 'values changed');
      });
    }));
  });

  t.suite('simulations · sorting module details', () => {
    t.test('complexity data exists for all eight algorithms', () => { const { lab } = freshAlgo(); ALGOS.forEach((a) => t.ok(lab.complexities[a], a)); });
    t.test('a C++ snippet exists for all eight algorithms', () => { const { lab } = freshAlgo(); ALGOS.forEach((a) => t.includes(lab.snippets[a], '(', a)); });
    t.test('stable algorithms are flagged correctly', () => {
      const { lab } = freshAlgo();
      t.deepEq(ALGOS.filter((a) => lab.complexities[a].stable).sort(), ['bubble', 'insertion', 'merge', 'radix']);
    });
    t.test('a reversed array is non-increasing before sorting', () => { const { lab } = freshAlgo(); lab.generateArray('reversed'); t.ok(lab.array.every((x, i) => i === 0 || lab.array[i - 1] >= x)); });
    t.test('"few unique" arrays use at most 4 distinct values', () => { const { lab } = freshAlgo(); lab.generateArray('few-unique'); t.ok(new Set(lab.array).size <= 4); });
    t.test('generated arrays have the requested size', () => { const { lab } = freshAlgo(); lab.arraySize = 77; lab.generateArray('random'); t.eq(lab.array.length, 77); });
    t.test('radix sort never compares elements', async () => {
      const { lab } = freshAlgo(); lab.arraySize = 30; lab.generateArray('random'); lab.currentAlgo = 'radix'; await lab.start();
      t.eq(lab.comparisons, 0);
    });
    t.test('comparison sorts count comparisons', async () => {
      const { lab } = freshAlgo(); lab.arraySize = 30; lab.generateArray('random'); lab.currentAlgo = 'quick'; await lab.start();
      t.ok(lab.comparisons > 0);
    });
    t.test('after a run finishes the lab is ready to run again', async () => {
      const { lab } = freshAlgo(); lab.arraySize = 20; lab.generateArray('random'); await lab.start();
      t.eq(lab.isRunning, false);
    });
    t.test('selecting an algorithm updates the complexity panel', () => {
      const { env, lab } = freshAlgo(); lab.currentAlgo = 'merge'; lab.updateComplexityBadges();
      t.eq(env.document.getElementById('badgeWorst').textContent, 'O(n log n)');
      t.eq(env.document.getElementById('badgeStable').textContent, 'Sí');
    });
    t.test('the explanation texts contain no emojis', () => {
      const { lab } = freshAlgo();
      Object.values(lab.intuitions).forEach((i) => t.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(i.title + i.concept + i.tip)));
    });
  });

  const freshConc = (seed = 3) => {
    const env = createEnv({ seed });
    env.load('js/modules/concurrency.js');
    const lab = env.window.concurrencyStation;
    lab.init();
    lab.autoSpawn = false;
    return { env, lab };
  };
  // Run the roundabout for `frames` frames of 16 ms, keeping traffic flowing.
  const simulate = (lab, frames, { every = 8, max = 16, check } = {}) => {
    for (let f = 0; f < frames; f++) {
      if (f % every === 0 && lab.vehicles.length < max) lab.spawnVehicle();
      lab.updateRoundabout(16);
      if (check) check(lab);
    }
  };

  t.suite('simulations · roundabout (semaphores and deadlock)', () => {
    t.test('vehicle routes start at the entry quadrant and end at the exit quadrant', () => {
      const { lab } = freshConc();
      const entryQ = { N: 1, E: 2, S: 3, W: 0 }, exitQ = { E: 1, S: 2, W: 3, N: 0 };
      for (let i = 0; i < 60; i++) {
        lab.spawnVehicle(); const v = lab.vehicles[lab.vehicles.length - 1];
        t.eq(v.route[0], entryQ[v.entry]); t.eq(v.route[v.route.length - 1], exitQ[v.exit]);
        v.route.slice(1).forEach((q, k) => t.eq(q, (v.route[k] + 1) % 4));
        t.ok(v.entry !== v.exit);
      }
    });
    t.test('with semaphores, quadrant capacity is never exceeded', () => {
      const { lab } = freshConc(); simulate(lab, 4000, { every: 4, check: (l) => l.quadrants.forEach((q) => t.ok(q.count <= l.quadrantCapacity)) });
    });
    t.test('with semaphores, the ring never holds more than 4·cap − 1 cars', () => {
      const { lab } = freshConc(); simulate(lab, 4000, { every: 4, check: (l) => t.ok(l.getTotalInRing() <= 4 * l.quadrantCapacity - 1) });
    });
    t.test('with semaphores, heavy traffic never deadlocks', () => {
      const { lab } = freshConc(); simulate(lab, 6000, { every: 3, check: (l) => t.ok(!l.deadlockDetected) });
    });
    t.test('with semaphores, cars keep leaving the roundabout', () => { const { lab } = freshConc(); simulate(lab, 3000); t.ok(lab.passedCount > 10); });
    t.test('without semaphores, heavy traffic eventually deadlocks', () => {
      const { lab } = freshConc(9); lab.semaphoresEnabled = false;
      let hit = false; simulate(lab, 20000, { every: 2, check: (l) => { if (l.deadlockDetected) hit = true; } });
      t.ok(hit, 'expected a circular wait to form');
    });
    t.test('"Provocar deadlock" fills every quadrant to capacity', () => {
      const { lab } = freshConc(); lab.forceCoffmanDeadlock();
      t.eq(lab.vehicles.length, 4 * lab.quadrantCapacity);
      lab.quadrants.forEach((q) => t.eq(q.count, lab.quadrantCapacity));
    });
    t.test('"Provocar deadlock" turns the semaphores off and flags the deadlock', () => {
      const { lab } = freshConc(); lab.forceCoffmanDeadlock(); t.eq(lab.semaphoresEnabled, false); t.eq(lab.deadlockDetected, true);
    });
    t.test('a forced deadlock stays stuck: nobody advances', () => {
      const { lab } = freshConc(); lab.forceCoffmanDeadlock();
      for (let i = 0; i < 500; i++) lab.updateRoundabout(16);
      t.eq(lab.passedCount, 0); t.eq(lab.deadlockDetected, true);
    });
    t.test('"Resolver" re-enables the semaphores and releases one car', () => {
      const { lab } = freshConc(); lab.forceCoffmanDeadlock(); lab.resolveCoffmanDeadlock();
      t.eq(lab.semaphoresEnabled, true); t.eq(lab.vehicles.filter((v) => v.state === 'EXITING').length, 1);
    });
    t.test('after "Resolver" the traffic drains completely', () => {
      const { lab } = freshConc(); lab.forceCoffmanDeadlock(); lab.resolveCoffmanDeadlock();
      for (let i = 0; i < 3000; i++) lab.updateRoundabout(16);
      t.eq(lab.vehicles.length, 0); t.eq(lab.passedCount, 8); t.eq(lab.deadlockDetected, false);
    });
  });

  t.suite('simulations · Amdahl calculator', () => {
    const amdahl = (f, n) => {
      const env = createEnv();
      env.load('js/modules/cheatsheets.js');
      env.document.getElementById('amdahlFraction').value = String(f);
      env.document.getElementById('amdahlProcessors').value = String(n);
      env.window.cheatsheetsStation.init();
      const g = (id) => env.document.getElementById(id).textContent;
      return { speed: g('amdahlSpeedupVal'), max: g('amdahlMaxSpeedupVal'), eff: g('amdahlEfficiencyVal'), procs: g('amdahlProcVal') };
    };
    t.test('85% parallel on 8 cores gives 3.90x', () => t.eq(amdahl(85, 8).speed, '3.90x'));
    t.test('85% parallel can never pass 6.67x', () => t.eq(amdahl(85, 8).max, '6.67x'));
    t.test('efficiency is speedup divided by cores', () => t.eq(amdahl(85, 8).eff, '48.8%'));
    t.test('one core means no speedup', () => t.eq(amdahl(50, 1).speed, '1.00x'));
    t.test('99% parallel has a 100x ceiling', () => t.eq(amdahl(99, 64).max, '100.00x'));
    t.test('the core count is labelled in Spanish', () => t.eq(amdahl(85, 8).procs, '8 núcleos'));
  });
};
