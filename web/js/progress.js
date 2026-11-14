// CS Interactive Workshop - Progress model (pure data, no DOM, no network).
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

  const run = (id, label) => ({ id: `run:${id}`, label: T(`Ejecutar ${label}`, `Run ${label}`) });
  const walk = (id, label) => ({ id: `solve:${id}`, label: T(`Recorrer «${label}» hasta el final`, `Walk through "${label}" to the end`) });

  const CHECKLISTS = {
    algorithms: {
      title: T('Ordenamiento', 'Sorting'),
      items: [run('quick', 'Quick Sort'), run('merge', 'Merge Sort'), run('heap', 'Heap Sort'), run('shell', 'Shell Sort'),
        run('insertion', 'Insertion Sort'), run('selection', 'Selection Sort'), run('bubble', 'Bubble Sort'), run('radix', 'Radix Sort')]
    },
    versus: {
      title: T('Algoritmo vs. algoritmo', 'Algorithm vs. algorithm'),
      items: [
        { id: 'race', label: T('Terminar una carrera', 'Finish a race') },
        { id: 'nlogn', label: T('Ver a un O(n log n) ganarle a un O(n²)', 'Watch an O(n log n) beat an O(n²)') },
        { id: 'upset', label: T('Ver a un O(n²) ganarle a un O(n log n)', 'Watch an O(n²) beat an O(n log n)') }
      ]
    },
    'datastructures-easy': {
      title: T('Estructuras de datos · Fácil', 'Data structures · Easy'),
      items: [walk('valid-parens', T('Paréntesis balanceados', 'Balanced parentheses')), walk('reverse-list', T('Invertir una lista enlazada', 'Reverse a linked list'))]
    },
    'datastructures-medium': {
      title: T('Estructuras de datos · Media', 'Data structures · Medium'),
      items: [walk('bst-insert', T('Insertar en un BST', 'Insert into a BST'))]
    },
    concurrency: {
      title: T('La Rotonda', 'The Roundabout'),
      items: [
        { id: 'deadlock', label: T('Provocar un deadlock', 'Cause a deadlock') },
        { id: 'resolve', label: T('Resolverlo con un semáforo', 'Fix it with a semaphore') },
        { id: 'patterns', label: T('Ver los patrones clásicos', 'See the classic patterns') }
      ]
    },
    heat: {
      title: T('Difusión de calor', 'Heat diffusion'),
      items: [
        { id: 'converge', label: T('Llevar la placa al equilibrio', 'Bring the plate to equilibrium') },
        { id: 'threads8', label: T('Repartir la placa entre 8 hilos', 'Split the plate among 8 threads') },
        { id: 'imbalance', label: T('Ver a los hilos esperar en la barrera', 'Watch the threads wait at the barrier') },
        { id: 'paint', label: T('Dibujar una fuente de calor', 'Paint a heat source') },
        { id: 'unstable', label: T('Romper la estabilidad con r > 1/4', 'Break stability with r > 1/4') }
      ]
    },
    networking: {
      title: 'Sockets TCP',
      items: [
        { id: 'exchange:figure', label: T('Descargar una figura del servidor', 'Download a figure from the server') },
        { id: 'exchange:list', label: T('Pedir la lista de figuras (LIST)', 'Ask for the list of figures (LIST)') },
        { id: 'exchange:notfound', label: T('Provocar un 404 Not Found', 'Trigger a 404 Not Found') },
        { id: 'exchange:bad', label: T('Provocar un 400 Bad Request', 'Trigger a 400 Bad Request') }
      ]
    },
    'problems-easy': {
      title: T('Problemas clásicos · Fácil', 'Classic problems · Easy'),
      items: [
        walk('valid-palindrome', T('¿Es palíndromo?', 'Is it a palindrome?')), walk('valid-parentheses', T('Paréntesis balanceados', 'Balanced parentheses')), walk('binary-search', T('Búsqueda binaria', 'Binary search')),
        walk('best-time-stock', T('Mejor día para comprar y vender', 'Best day to buy and sell'))
      ]
    },
    'problems-medium': {
      title: T('Problemas clásicos · Media', 'Classic problems · Medium'),
      items: [
        walk('two-sum-sorted', T('Par con suma objetivo', 'Pair with a target sum')), walk('max-water', T('El contenedor con más agua', 'Container with the most water')), walk('merge-intervals', T('Fusionar intervalos', 'Merge intervals')),
        walk('longest-unique', T('Subcadena más larga sin repetir', 'Longest substring without repeats')), walk('number-of-islands', T('Contar islas', 'Number of islands')), walk('coin-change', T('Cambio con menos monedas', 'Coin change with the fewest coins'))
      ]
    },
    'problems-hard': {
      title: T('Problemas clásicos · Difícil', 'Classic problems · Hard'),
      items: [
        walk('trap-rain', T('Atrapar agua de lluvia', 'Trapping rain water')), walk('sliding-max', T('Máximo en ventana deslizante', 'Sliding window maximum')), walk('largest-rectangle', T('Rectángulo más grande del histograma', 'Largest rectangle in a histogram'))
      ]
    },
    sql: {
      title: T('SQL paso a paso', 'SQL step by step'),
      items: [walk('join-where', T('JOIN, WHERE y ORDER BY', 'JOIN, WHERE and ORDER BY')), walk('group-having', T('GROUP BY y HAVING', 'GROUP BY and HAVING')), walk('left-join-null', T('LEFT JOIN para encontrar ausentes', 'LEFT JOIN to find what is missing'))]
    },
    cheatsheets: {
      title: T('El Cuaderno', 'The Notebook'),
      items: [{ id: 'amdahl', label: T('Jugar con la Ley de Amdahl', 'Play with Amdahl\'s Law') }, { id: 'note', label: T('Escribir tu primera nota', 'Write your first note') }]
    }
  };

  // Stations that were later split by difficulty. Their saved progress is handed to the new
  // stations: each item goes to the level that now owns it, and visits and steps go to all of them.
  const LEGACY = {
    interview: ['problems-easy', 'problems-medium', 'problems-hard'],
    datastructures: ['datastructures-easy', 'datastructures-medium']
  };

  function empty() { return { version: VERSION, stations: {}, last: null }; }

  const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);

  // Accept only known stations, steps and items; drop anything else.
  function sanitize(raw) {
    const out = empty();
    if (!isObj(raw) || !isObj(raw.stations)) return out;
    const sources = (id) => [raw.stations[id], ...Object.keys(LEGACY).filter((old) => LEGACY[old].includes(id)).map((old) => raw.stations[old])].filter(isObj);
    const valid = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
    Object.keys(CHECKLISTS).forEach((id) => {
      const found = sources(id);
      if (!found.length) return;
      const clean = { visited: false, steps: {}, items: {} };
      found.forEach((s) => {
        if (s.visited) clean.visited = true;
        if (isObj(s.steps)) STEPS.forEach((st) => { if (s.steps[st]) clean.steps[st] = true; });
        if (isObj(s.items)) CHECKLISTS[id].items.forEach(({ id: item }) => {
          const v = s.items[item];
          if (valid(v)) clean.items[item] = clean.items[item] ? Math.min(clean.items[item], v) : v;
        });
      });
      out.stations[id] = clean;
    });
    const lastStation = isObj(raw.last) && (LEGACY[raw.last.station] ? LEGACY[raw.last.station][0] : raw.last.station);
    if (lastStation && CHECKLISTS[lastStation] && STEPS.includes(raw.last.step) && typeof raw.last.at === 'number') {
      out.last = { station: lastStation, step: raw.last.step, at: raw.last.at };
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

  const api = { VERSION, STEPS, CHECKLISTS, LEGACY, empty, sanitize, record, visit, merge, stationStats, overall };
  root.Progress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
