// CS Interactive Lab - Progress model (pure data, no DOM, no network).
//
// A student's progress is a small JSON document:
//   { version, stations: { <station>: { visited, steps: {play,learn,build}, items: { <item>: firstDoneAt } } },
//     last: { station, step, at } }
// Each station has a checklist of concrete things to do; finishing them all
// completes the station. The same document is stored in localStorage for
// guests and in Firestore (users/{uid}.progress) for signed-in students.
(function (root) {
  const VERSION = 1;
  const STEPS = ['play', 'learn', 'build'];

  const run = (id, label) => ({ id: `run:${id}`, label: `Ejecutar ${label}` });
  const walk = (id, label) => ({ id: `solve:${id}`, label: `Recorrer «${label}» hasta el final` });

  const CHECKLISTS = {
    algorithms: {
      title: 'Ordenamiento',
      items: [run('quick', 'Quick Sort'), run('merge', 'Merge Sort'), run('heap', 'Heap Sort'), run('shell', 'Shell Sort'),
        run('insertion', 'Insertion Sort'), run('selection', 'Selection Sort'), run('bubble', 'Bubble Sort'), run('radix', 'Radix Sort')]
    },
    datastructures: {
      title: 'Estructuras de datos',
      items: [walk('valid-parens', 'Paréntesis balanceados'), walk('reverse-list', 'Invertir una lista enlazada'), walk('bst-insert', 'Insertar en un BST')]
    },
    concurrency: {
      title: 'La Rotonda',
      items: [
        { id: 'deadlock', label: 'Provocar un deadlock' },
        { id: 'resolve', label: 'Resolverlo con un semáforo' },
        { id: 'heat', label: 'Correr la difusión de calor en paralelo' },
        { id: 'patterns', label: 'Ver los patrones clásicos' }
      ]
    },
    networking: {
      title: 'Sockets TCP',
      items: [
        { id: 'exchange:figure', label: 'Descargar una figura del servidor' },
        { id: 'exchange:list', label: 'Pedir la lista de figuras (LIST)' },
        { id: 'exchange:notfound', label: 'Provocar un 404 Not Found' },
        { id: 'exchange:bad', label: 'Provocar un 400 Bad Request' }
      ]
    },
    interview: {
      title: 'Patrones de entrevista',
      items: [walk('two-sum-sorted', 'Par con suma objetivo'), walk('max-water', 'El contenedor con más agua'), walk('merge-intervals', 'Fusionar intervalos'),
        walk('longest-unique', 'Subcadena más larga sin repetir'), walk('trap-rain', 'Atrapar agua de lluvia'), walk('sliding-max', 'Máximo en ventana deslizante')]
    },
    sql: {
      title: 'SQL paso a paso',
      items: [walk('join-where', 'JOIN, WHERE y ORDER BY'), walk('group-having', 'GROUP BY y HAVING'), walk('left-join-null', 'LEFT JOIN para encontrar ausentes')]
    },
    cheatsheets: {
      title: 'El Cuaderno',
      items: [{ id: 'amdahl', label: 'Jugar con la Ley de Amdahl' }]
    }
  };

  function empty() { return { version: VERSION, stations: {}, last: null }; }

  const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);

  // Accept only known stations, steps and items; drop anything else.
  function sanitize(raw) {
    const out = empty();
    if (!isObj(raw) || !isObj(raw.stations)) return out;
    Object.keys(CHECKLISTS).forEach((id) => {
      const s = raw.stations[id];
      if (!isObj(s)) return;
      const clean = { visited: !!s.visited, steps: {}, items: {} };
      if (isObj(s.steps)) STEPS.forEach((st) => { if (s.steps[st]) clean.steps[st] = true; });
      if (isObj(s.items)) CHECKLISTS[id].items.forEach(({ id: item }) => {
        const v = s.items[item];
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) clean.items[item] = v;
      });
      out.stations[id] = clean;
    });
    if (isObj(raw.last) && CHECKLISTS[raw.last.station] && STEPS.includes(raw.last.step) && typeof raw.last.at === 'number') {
      out.last = { station: raw.last.station, step: raw.last.step, at: raw.last.at };
    }
    return out;
  }

  const clone = (p) => JSON.parse(JSON.stringify(p));
  const station = (p, id) => (p.stations[id] = p.stations[id] || { visited: false, steps: {}, items: {} });
  const hasItem = (stationId, item) => !!CHECKLISTS[stationId] && CHECKLISTS[stationId].items.some((i) => i.id === item);

  // Mark an item as done. Returns { progress, isNew, label }.
  function record(p, stationId, item, now = Date.now()) {
    const next = clone(p);
    if (!hasItem(stationId, item)) return { progress: next, isNew: false, label: null };
    const s = station(next, stationId);
    s.visited = true;
    const isNew = !s.items[item];
    if (isNew) s.items[item] = now;
    const label = CHECKLISTS[stationId].items.find((i) => i.id === item).label;
    return { progress: next, isNew, label };
  }

  // Remember that the student opened a station step.
  function visit(p, stationId, step = 'play', now = Date.now()) {
    const next = clone(p);
    if (!CHECKLISTS[stationId]) return next;
    const s = station(next, stationId);
    s.visited = true;
    if (STEPS.includes(step)) s.steps[step] = true;
    next.last = { station: stationId, step: STEPS.includes(step) ? step : 'play', at: now };
    return next;
  }

  // Combine two progress documents (e.g. guest progress into an account).
  // Nothing is ever lost: items keep their earliest completion time.
  function merge(a, b) {
    const A = sanitize(a), B = sanitize(b);
    const out = empty();
    Object.keys(CHECKLISTS).forEach((id) => {
      const x = A.stations[id], y = B.stations[id];
      if (!x && !y) return;
      const s = { visited: !!((x && x.visited) || (y && y.visited)), steps: {}, items: {} };
      STEPS.forEach((st) => { if ((x && x.steps[st]) || (y && y.steps[st])) s.steps[st] = true; });
      CHECKLISTS[id].items.forEach(({ id: item }) => {
        const t = [x && x.items[item], y && y.items[item]].filter(Boolean);
        if (t.length) s.items[item] = Math.min(...t);
      });
      out.stations[id] = s;
    });
    out.last = [A.last, B.last].filter(Boolean).sort((m, n) => n.at - m.at)[0] || null;
    return out;
  }

  function stationStats(p, stationId) {
    const list = CHECKLISTS[stationId];
    if (!list) return { done: 0, total: 0, percent: 0, complete: false, visited: false, steps: {} };
    const s = p.stations[stationId] || { visited: false, steps: {}, items: {} };
    const done = list.items.filter((i) => s.items[i.id]).length;
    const total = list.items.length;
    return { done, total, percent: Math.round((done / total) * 100), complete: done === total, visited: !!s.visited, steps: { ...s.steps } };
  }

  function overall(p) {
    let done = 0, total = 0, complete = 0;
    Object.keys(CHECKLISTS).forEach((id) => {
      const st = stationStats(p, id);
      done += st.done; total += st.total; if (st.complete) complete++;
    });
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0, stationsComplete: complete, stations: Object.keys(CHECKLISTS).length };
  }

  const api = { VERSION, STEPS, CHECKLISTS, empty, sanitize, record, visit, merge, stationStats, overall };
  root.Progress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
