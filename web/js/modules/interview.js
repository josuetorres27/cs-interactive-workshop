// CS Interactive Workshop - Classic coding problems (easy to hard), traced line by line.
(function () {
  const { TraceStation, Recorder, viz } = window.Tracer;

  const parseArgs = (text) => {
    try { return JSON.parse(`[${text}]`); } catch (e) {
      throw new Error(T('No pude leer la entrada. Revisa comas, comillas y corchetes, como en los ejemplos.', 'I could not read the input. Check the commas, quotes and brackets, as in the examples.'));
    }
  };
  const isNumArr = (a) => Array.isArray(a) && a.every((x) => typeof x === 'number' && Number.isFinite(x));
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };

  // ─────────────────────────────────────────────────────────────────────
  const twoSum = {
    id: 'two-sum-sorted',
    title: T('Par con suma objetivo', 'Pair with target sum'),
    difficulty: T('Media', 'Medium'),
    pattern: T('Dos punteros', 'Two pointers'),
    statement: T('<p>Te dan un arreglo <strong>ordenado</strong> y un número <code>target</code>. Devuelve los índices de dos elementos que sumen exactamente <code>target</code>, usando memoria constante.</p>', '<p>You are given a <strong>sorted</strong> array and a number <code>target</code>. Return the indices of two elements that add up to exactly <code>target</code>, using constant memory.</p>'),
    lang: 'python',
    code: [
      'def two_sum(nums, target):',
      '    l, r = 0, len(nums) - 1',
      '    while l < r:',
      '        s = nums[l] + nums[r]',
      '        if s == target:',
      '            return [l, r]',
      '        elif s < target:',
      '            l += 1',
      '        else:',
      '            r -= 1',
      '    return []'
    ],
    presets: ['[1, 3, 4, 6, 8, 11, 15], 14', '[2, 7, 11, 15], 9', '[1, 2, 4, 5, 9], 20'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 2 && isNumArr(a[0]) && typeof a[1] === 'number', T('Escribe el arreglo y el objetivo, por ejemplo: [2, 7, 11, 15], 9', 'Write the array and the target, for example: [2, 7, 11, 15], 9'));
      need(a[0].length >= 2 && a[0].length <= 14, T('Usa entre 2 y 14 números para que se vea bien.', 'Use between 2 and 14 numbers so it displays well.'));
      need(a[0].every((x, i) => i === 0 || a[0][i - 1] <= x), T('El arreglo tiene que venir ordenado: es justo lo que hace funcionar este patrón.', 'The array has to be sorted: that is exactly what makes this pattern work.'));
      return { nums: a[0], target: a[1] };
    },
    trace({ nums, target }) {
      const rec = new Recorder();
      let l = 0, r = nums.length - 1, s;
      const V = (found) => {
        const state = {};
        nums.forEach((_, i) => { if (i < l || i > r) state[i] = 'dim'; });
        if (found) { state[l] = 'ok'; state[r] = 'ok'; }
        return { nums, target, l, r, s, found: !!found };
      };
      const vars = () => (s === undefined ? { nums, target, l, r } : { nums, target, l, r, s });
      rec.step(2, vars(), V(), T('Ponemos <b>l</b> en el primer elemento y <b>r</b> en el último.', 'We put <b>l</b> on the first element and <b>r</b> on the last one.'));
      while (true) {
        if (!(l < r)) { rec.step(3, vars(), V(), T(`l ya no es menor que r: se cruzaron.`, `l is no longer less than r: they crossed.`)); break; }
        rec.step(3, vars(), V(), T(`l &lt; r (${l} &lt; ${r}), así que seguimos buscando.`, `l &lt; r (${l} &lt; ${r}), so we keep searching.`));
        s = nums[l] + nums[r];
        rec.step(4, vars(), V(), T(`Sumamos los extremos: ${nums[l]} + ${nums[r]} = <b>${s}</b>.`, `We add the two ends: ${nums[l]} + ${nums[r]} = <b>${s}</b>.`));
        if (s === target) {
          rec.step(5, vars(), V(true), T(`¡${s} es el objetivo!`, `${s} is the target!`));
          rec.step(6, vars(), V(true), T(`Devolvemos <b>[${l}, ${r}]</b>. Lo encontramos sin comparar todos los pares.`, `We return <b>[${l}, ${r}]</b>. We found it without comparing every pair.`));
          return rec.frames;
        }
        rec.step(5, vars(), V(), T(`${s} no es ${target}.`, `${s} is not ${target}.`));
        if (s < target) {
          rec.step(7, vars(), V(), T(`${s} &lt; ${target}: la suma se quedó corta y necesitamos un número más grande.`, `${s} &lt; ${target}: the sum fell short and we need a bigger number.`));
          l += 1;
          rec.step(8, vars(), V(), T('Movemos <b>l</b> a la derecha. Como el arreglo está ordenado, el siguiente número es mayor o igual.', 'We move <b>l</b> to the right. Since the array is sorted, the next number is greater or equal.'));
        } else {
          rec.step(7, vars(), V(), T(`${s} no es menor que ${target}...`, `${s} is not less than ${target}...`));
          rec.step(9, vars(), V(), T(`...así que se pasó: hay que achicar la suma.`, `...so it overshot: we need to shrink the sum.`));
          r -= 1;
          rec.step(10, vars(), V(), T('Movemos <b>r</b> a la izquierda, hacia números más pequeños.', 'We move <b>r</b> to the left, toward smaller numbers.'));
        }
      }
      rec.step(11, vars(), V(), T('Ningún par suma el objetivo: devolvemos una lista vacía.', 'No pair adds up to the target: we return an empty list.'));
      return rec.frames;
    },
    render(st) {
      const state = {}; const ptr = {};
      st.nums.forEach((_, i) => { if (i < st.l || i > st.r) state[i] = 'dim'; });
      if (st.found) { state[st.l] = 'ok'; state[st.r] = 'ok'; }
      (ptr[st.l] = ptr[st.l] || []).push('l');
      if (st.r >= 0) (ptr[st.r] = ptr[st.r] || []).push('r');
      return `${viz.cells(st.nums, { ptr, state })}
        <div class="vz-caption">${T('objetivo', 'target')} <b>${st.target}</b>${st.s !== undefined ? ` · ${T('suma actual', 'current sum')} <b>${st.s}</b>` : ''}</div>`;
    },
    learn: {
      idea: T(`<p>En lugar de probar todos los pares (O(n²)), usamos que el arreglo está ordenado. Si la suma de los extremos es muy pequeña, el número de la izquierda nunca va a servir con ningún otro: lo descartamos moviendo <b>l</b>. Si es muy grande, descartamos el de la derecha.</p>
             <p>Cada paso descarta un elemento para siempre, por eso basta una sola pasada.</p>`, `<p>Instead of trying every pair (O(n²)), we use the fact that the array is sorted. If the sum of the two ends is too small, the number on the left will never work with any other: we discard it by moving <b>l</b>. If it is too big, we discard the one on the right.</p>
             <p>Each step discards one element for good, which is why a single pass is enough.</p>`),
      signals: [T('El arreglo está <strong>ordenado</strong> (o puedes ordenarlo).', 'The array is <strong>sorted</strong> (or you can sort it).'), T('Buscas un <strong>par</strong> (o tripleta) que cumpla una condición sobre su suma.', 'You are looking for a <strong>pair</strong> (or triplet) that meets a condition on its sum.'), T('Te piden memoria O(1).', 'You are asked for O(1) memory.')],
      time: 'O(n)', space: 'O(1)',
      why: T('Cada iteración mueve un puntero hacia el otro, así que hay como máximo n − 1 iteraciones.', 'Each iteration moves one pointer toward the other, so there are at most n − 1 iterations.')
    },
    build: {
      template: T(`def two_pointers(nums, target):
    l, r = 0, len(nums) - 1
    while l < r:
        actual = combinar(nums[l], nums[r])
        if actual == target:
            return l, r
        if actual < target:
            l += 1      # necesito más
        else:
            r -= 1      # necesito menos
    return None`, `def two_pointers(nums, target):
    l, r = 0, len(nums) - 1
    while l < r:
        current = combine(nums[l], nums[r])
        if current == target:
            return l, r
        if current < target:
            l += 1      # need more
        else:
            r -= 1      # need less
    return None`),
      tips: [T('Antes de programar, di en voz alta <strong>por qué</strong> es seguro descartar un elemento. Es lo que el entrevistador quiere oír.', 'Before coding, say out loud <strong>why</strong> it is safe to discard an element. That is what the interviewer wants to hear.'), T('Pregunta si puede haber <strong>duplicados</strong> y si se permite usar el mismo elemento dos veces.', 'Ask whether there can be <strong>duplicates</strong> and whether you may use the same element twice.'), T('Si el arreglo no está ordenado, un diccionario da O(n) tiempo pero O(n) memoria: menciona ese trade-off.', 'If the array is not sorted, a hash map gives O(n) time but O(n) memory: mention that trade-off.')],
      similar: [T('Suma de tres números (3Sum): fija uno y aplica dos punteros al resto.', 'Three-number sum (3Sum): fix one and apply two pointers to the rest.'), T('Eliminar duplicados de un arreglo ordenado.', 'Remove duplicates from a sorted array.'), T('Verificar si una cadena es palíndromo.', 'Check whether a string is a palindrome.')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const container = {
    id: 'max-water',
    title: T('El contenedor con más agua', 'Container with most water'),
    difficulty: T('Media', 'Medium'),
    pattern: T('Dos punteros', 'Two pointers'),
    statement: T('<p>Cada número es la altura de una pared. Elige dos paredes que, junto con el piso, formen el recipiente con <strong>más área</strong>. El agua llega hasta la pared más baja.</p>', '<p>Each number is the height of a wall. Pick two walls that, together with the floor, form the container with the <strong>largest area</strong>. The water rises only as high as the shorter wall.</p>'),
    lang: 'python',
    code: [
      'def max_area(h):',
      '    l, r = 0, len(h) - 1',
      '    best = 0',
      '    while l < r:',
      '        area = (r - l) * min(h[l], h[r])',
      '        best = max(best, area)',
      '        if h[l] < h[r]:',
      '            l += 1',
      '        else:',
      '            r -= 1',
      '    return best'
    ],
    presets: ['[1, 8, 6, 2, 5, 4, 8, 3, 7]', '[4, 3, 2, 1, 4]', '[2, 6, 1, 3, 9, 4]'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && isNumArr(a[0]), T('Escribe una lista de alturas, por ejemplo: [1, 8, 6, 2, 5]', 'Write a list of heights, for example: [1, 8, 6, 2, 5]'));
      need(a[0].length >= 2 && a[0].length <= 14, T('Usa entre 2 y 14 alturas.', 'Use between 2 and 14 heights.'));
      need(a[0].every((x) => x >= 0 && x <= 30), T('Usa alturas entre 0 y 30.', 'Use heights between 0 and 30.'));
      return { h: a[0] };
    },
    trace({ h }) {
      const rec = new Recorder();
      let l = 0, r = h.length - 1, best = 0, area, bestBox = null;
      const V = (box) => ({ h, l, r, box, best: bestBox });
      const vars = () => (area === undefined ? { l, r, best } : { l, r, area, best });
      rec.step(2, vars(), V(), T('Empezamos con el recipiente más ancho posible: las dos paredes de los extremos.', 'We start with the widest possible container: the two walls at the ends.'));
      rec.step(3, vars(), V(), T('Todavía no hemos medido nada: best = 0.', 'We have not measured anything yet: best = 0.'));
      while (true) {
        if (!(l < r)) { rec.step(4, vars(), V(), T('Los punteros se juntaron: ya revisamos todo lo que valía la pena.', 'The pointers met: we have checked everything worth checking.')); break; }
        rec.step(4, vars(), V(), T(`l &lt; r: seguimos.`, `l &lt; r: we keep going.`));
        const level = Math.min(h[l], h[r]);
        area = (r - l) * level;
        const box = { l, r, h: level };
        rec.step(5, vars(), V(box), T(`Ancho ${r - l} × altura ${level} (la pared más baja) = <b>${area}</b>.`, `Width ${r - l} × height ${level} (the shorter wall) = <b>${area}</b>.`));
        const improved = area > best;
        best = Math.max(best, area);
        if (improved) bestBox = box;
        rec.step(6, vars(), V(box), improved ? T(`¡Nuevo récord! best = ${best}.`, `New record! best = ${best}.`) : T(`No supera el récord de ${best}.`, `It does not beat the record of ${best}.`));
        if (h[l] < h[r]) {
          rec.step(7, vars(), V(box), T(`La pared izquierda (${h[l]}) es la más baja: es la que limita el agua.`, `The left wall (${h[l]}) is the shorter one: it is what limits the water.`));
          l += 1;
          rec.step(8, vars(), V(), T('Movemos <b>l</b>. Mover la pared alta nunca podría mejorar: el ancho baja y la altura sigue limitada por la baja.', 'We move <b>l</b>. Moving the taller wall could never help: the width shrinks and the height is still limited by the shorter wall.'));
        } else {
          rec.step(7, vars(), V(box), T(`La pared derecha (${h[r]}) es la más baja o empatan.`, `The right wall (${h[r]}) is the shorter one, or they are tied.`));
          rec.step(9, vars(), V(box), T('Entonces descartamos la derecha.', 'So we discard the right one.'));
          r -= 1;
          rec.step(10, vars(), V(), T('Movemos <b>r</b> hacia adentro.', 'We move <b>r</b> inward.'));
        }
      }
      rec.step(11, vars(), V(), T(`La mejor área es <b>${best}</b>.`, `The best area is <b>${best}</b>.`));
      return rec.frames;
    },
    render(st) {
      const ptr = {};
      if (st.l < st.r || st.l === st.r) { (ptr[st.l] = ptr[st.l] || []).push('l'); (ptr[st.r] = ptr[st.r] || []).push('r'); }
      const state = {};
      st.h.forEach((_, i) => { if (i < st.l || i > st.r) state[i] = 'dim'; });
      return viz.bars(st.h, { ptr, state, box: st.box, best: st.best }) +
        `<div class="vz-legend"><span><i class="lg-box"></i>${T('recipiente actual', 'current container')}</span><span><i class="lg-best"></i>${T('mejor hasta ahora', 'best so far')}</span></div>`;
    },
    learn: {
      idea: T(`<p>Empezamos con el recipiente más ancho. Para encontrar uno mejor, el ancho siempre va a bajar, así que solo vale la pena si la altura sube. La altura la decide la pared <strong>más baja</strong>, así que esa es la única que conviene cambiar.</p>
             <p>Mover la pared alta es inútil: el nuevo recipiente sería más angosto y seguiría limitado por la misma pared baja.</p>`, `<p>We start with the widest container. To find a better one, the width will always shrink, so it is only worth it if the height goes up. The height is set by the <strong>shorter</strong> wall, so that is the only one worth changing.</p>
             <p>Moving the taller wall is useless: the new container would be narrower and still limited by the same short wall.</p>`),
      signals: [T('Te piden maximizar algo que depende de <strong>dos extremos</strong> y de la distancia entre ellos.', 'You are asked to maximize something that depends on <strong>two ends</strong> and the distance between them.'), T('La fuerza bruta compara todos los pares (O(n²)).', 'Brute force compares every pair (O(n²)).'), T('Puedes argumentar qué extremo nunca podrá mejorar el resultado.', 'You can argue which end can never improve the result.')],
      time: 'O(n)', space: 'O(1)',
      why: T('Cada paso descarta una pared para siempre, así que hay como máximo n − 1 pasos.', 'Each step discards one wall for good, so there are at most n − 1 steps.')
    },
    build: {
      template: `def max_area(h):
    l, r = 0, len(h) - 1
    best = 0
    while l < r:
        best = max(best, (r - l) * min(h[l], h[r]))
        if h[l] < h[r]:
            l += 1
        else:
            r -= 1
    return best`,
      tips: [T('Empieza explicando la fuerza bruta O(n²) y luego mejórala: mostrar el razonamiento cuenta más que llegar directo.', 'Start by explaining the O(n²) brute force and then improve it: showing your reasoning counts more than jumping straight to the answer.'), T('La parte clave es la <strong>prueba</strong>: "mover la pared alta nunca mejora". Ensáyala.', 'The key part is the <strong>proof</strong>: "moving the taller wall never helps". Practice it.'), T('No lo confundas con "atrapar agua de lluvia": aquí solo hay un recipiente y las paredes intermedias no estorban.', 'Do not confuse it with "trapping rain water": here there is only one container and the walls in between do not get in the way.')],
      similar: [T('Atrapar agua de lluvia (en esta misma estación).', 'Trapping rain water (in this same station).'), T('Par con suma objetivo (dos punteros desde los extremos).', 'Pair with target sum (two pointers from the ends).'), T('Cuadrados de un arreglo ordenado.', 'Squares of a sorted array.')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const mergeIntervals = {
    id: 'merge-intervals',
    title: T('Fusionar intervalos', 'Merge intervals'),
    difficulty: T('Media', 'Medium'),
    pattern: T('Intervalos', 'Intervals'),
    statement: T('<p>Te dan una lista de intervalos <code>[inicio, fin]</code>. Fusiona todos los que se traslapen y devuelve la lista resultante.</p>', '<p>You are given a list of intervals <code>[start, end]</code>. Merge all the ones that overlap and return the resulting list.</p>'),
    lang: 'python',
    code: [
      'def merge(intervals):',
      '    intervals.sort(key=lambda x: x[0])',
      '    merged = []',
      '    for start, end in intervals:',
      '        if merged and start <= merged[-1][1]:',
      '            merged[-1][1] = max(merged[-1][1], end)',
      '        else:',
      '            merged.append([start, end])',
      '    return merged'
    ],
    presets: ['[[8, 10], [1, 3], [2, 6], [15, 18], [9, 12]]', '[[1, 4], [4, 5]]', '[[5, 7], [1, 2], [6, 9], [3, 4], [2, 3]]'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && Array.isArray(a[0]) && a[0].every((iv) => isNumArr(iv) && iv.length === 2 && iv[0] <= iv[1]), T('Escribe una lista de pares [inicio, fin] con inicio ≤ fin.', 'Write a list of pairs [start, end] with start ≤ end.'));
      need(a[0].length >= 1 && a[0].length <= 9, T('Usa entre 1 y 9 intervalos.', 'Use between 1 and 9 intervals.'));
      need(a[0].every((iv) => iv[0] >= 0 && iv[1] <= 40), T('Usa valores entre 0 y 40.', 'Use values between 0 and 40.'));
      return { intervals: a[0] };
    },
    trace({ intervals }) {
      const rec = new Recorder();
      const orig = intervals.map((x) => x.slice());
      let list = orig.map((x) => x.slice());
      const merged = [];
      let cur = -1, sorted = false, start, end;
      const V = (extra = {}) => ({ list, merged, cur, sorted, ...extra });
      const vars = () => (start === undefined ? { intervals: list, merged } : { start, end, merged });
      rec.step(1, { intervals: list }, V(), T('Estos son los intervalos tal como llegan.', 'These are the intervals as they arrive.'));
      list = list.slice().sort((a, b) => a[0] - b[0]);
      sorted = true;
      rec.step(2, vars(), V(), T('Ordenamos por inicio. Así, cualquier intervalo que se traslape con el anterior queda justo a su lado.', 'We sort by start. That way, any interval that overlaps the previous one ends up right next to it.'));
      rec.step(3, vars(), V(), T('merged empieza vacía.', 'merged starts empty.'));
      for (let i = 0; i < list.length; i++) {
        cur = i; [start, end] = list[i];
        rec.step(4, vars(), V(), T(`Tomamos el intervalo [${start}, ${end}].`, `We take the interval [${start}, ${end}].`));
        const last = merged[merged.length - 1];
        if (last && start <= last[1]) {
          rec.step(5, vars(), V({ overlap: true }), T(`Empieza en ${start}, antes de que termine el último fusionado (${last[1]}): <b>se traslapan</b>.`, `It starts at ${start}, before the last merged one ends (${last[1]}): <b>they overlap</b>.`));
          last[1] = Math.max(last[1], end);
          rec.step(6, vars(), V({ grow: merged.length - 1 }), T(`Estiramos el último hasta ${last[1]}.`, `We stretch the last one to ${last[1]}.`));
        } else {
          rec.step(5, vars(), V(), merged.length ? T(`Empieza en ${start}, después de ${last[1]}: no se traslapan.`, `It starts at ${start}, after ${last[1]}: they do not overlap.`) : T('merged está vacía, no hay con quién comparar.', 'merged is empty, there is nothing to compare with.'));
          rec.step(7, vars(), V(), T('Entonces empieza un grupo nuevo...', 'So a new group starts...'));
          merged.push([start, end]);
          rec.step(8, vars(), V({ grow: merged.length - 1 }), T(`...y lo agregamos: [${start}, ${end}].`, `...and we add it: [${start}, ${end}].`));
        }
      }
      cur = list.length; // everything processed
      rec.step(9, vars(), V(), T(`Resultado: <b>${merged.map((m) => `[${m[0]}, ${m[1]}]`).join(', ')}</b>.`, `Result: <b>${merged.map((m) => `[${m[0]}, ${m[1]}]`).join(', ')}</b>.`));
      return rec.frames;
    },
    render(st) {
      const all = st.list.concat(st.merged);
      const lo = Math.min(...all.map((x) => x[0])), hi = Math.max(...all.map((x) => x[1]));
      const span = Math.max(1, hi - lo);
      const W = 560, padL = 74, padR = 18, rowH = 26;
      const X = (v) => padL + ((v - lo) / span) * (W - padL - padR);
      const rows = st.list.length;
      const H = (rows + 2) * rowH + 36;
      let s = `<svg class="vz-intervals" viewBox="0 0 ${W} ${H}">`;
      for (let v = lo; v <= hi; v++) {
        if (span > 20 && v % 5 !== 0 && v !== lo && v !== hi) continue;
        s += `<line x1="${X(v)}" x2="${X(v)}" y1="8" y2="${H - 22}" class="vz-grid"/><text x="${X(v)}" y="${H - 8}" class="vz-t-idx">${v}</text>`;
      }
      s += `<text x="8" y="${rowH - 6}" class="vz-row-label">${st.sorted ? T('ordenados', 'sorted') : T('entrada', 'input')}</text>`;
      st.list.forEach((iv, i) => {
        const y = 10 + i * rowH;
        const cls = i === st.cur ? (st.overlap ? 'cur over' : 'cur') : i < st.cur ? 'done' : '';
        s += `<rect x="${X(iv[0])}" y="${y}" width="${Math.max(X(iv[1]) - X(iv[0]), 6)}" height="16" rx="8" class="vz-iv ${cls}"/>`;
      });
      const my = 10 + rows * rowH + 10;
      s += `<line x1="8" x2="${W - 8}" y1="${my - 6}" y2="${my - 6}" class="vz-sep"/><text x="8" y="${my + 13}" class="vz-row-label">merged</text>`;
      st.merged.forEach((iv, i) => {
        s += `<rect x="${X(iv[0])}" y="${my}" width="${Math.max(X(iv[1]) - X(iv[0]), 6)}" height="18" rx="9" class="vz-iv merged ${i === st.grow ? 'grow' : ''}"/>`;
      });
      return s + '</svg>';
    },
    learn: {
      idea: T(`<p>Si los intervalos están <strong>ordenados por inicio</strong>, solo hay que comparar cada uno con el último que fusionamos: si empieza antes de que ese termine, se traslapan y basta con estirar el final. Si no, empieza un grupo nuevo.</p>
             <p>Sin ordenar tendrías que comparar cada intervalo con todos los demás.</p>`, `<p>If the intervals are <strong>sorted by start</strong>, you only need to compare each one with the last one you merged: if it starts before that one ends, they overlap and you just stretch the end. If not, a new group starts.</p>
             <p>Without sorting, you would have to compare each interval with all the others.</p>`),
      signals: [T('La entrada son <strong>rangos</strong>: horarios, reservas, segmentos.', 'The input is <strong>ranges</strong>: schedules, bookings, segments.'), T('Te preguntan por traslapes, huecos o cuántos recursos se usan a la vez.', 'You are asked about overlaps, gaps or how many resources are in use at once.'), T('Ordenar por inicio (o por fin) simplifica todo.', 'Sorting by start (or by end) simplifies everything.')],
      time: 'O(n log n)', space: 'O(n)',
      why: T('El costo lo domina el ordenamiento. El recorrido después es lineal.', 'The cost is dominated by the sort. The pass afterward is linear.')
    },
    build: {
      template: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged`,
      tips: [T('Aclara si <code>[1, 4]</code> y <code>[4, 5]</code> cuentan como traslapados (aquí sí, por el <code>&lt;=</code>).', 'Clarify whether <code>[1, 4]</code> and <code>[4, 5]</code> count as overlapping (here they do, because of the <code>&lt;=</code>).'), T('Usa <code>max</code> al estirar: un intervalo puede quedar completamente dentro del anterior.', 'Use <code>max</code> when stretching: an interval can sit completely inside the previous one.'), T('Pregunta si puedes modificar la entrada; si no, ordena una copia.', 'Ask whether you may modify the input; if not, sort a copy.')],
      similar: [T('Insertar un intervalo en una lista ya fusionada.', 'Insert an interval into an already merged list.'), T('Salas de reuniones: ¿cuántas salas necesitas como mínimo? (ordena inicios y finales).', 'Meeting rooms: what is the minimum number of rooms you need? (sort starts and ends).'), T('Eliminar la menor cantidad de intervalos para que ninguno se traslape (ordena por fin).', 'Remove the fewest intervals so that none overlap (sort by end).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const longestUnique = {
    id: 'longest-unique',
    title: T('Subcadena más larga sin repetir', 'Longest substring without repeats'),
    difficulty: T('Media', 'Medium'),
    pattern: T('Ventana deslizante', 'Sliding window'),
    statement: T('<p>Dada una cadena, encuentra la longitud de la <strong>subcadena contigua más larga</strong> en la que ningún carácter se repite.</p>', '<p>Given a string, find the length of the <strong>longest contiguous substring</strong> in which no character repeats.</p>'),
    lang: 'python',
    code: [
      'def longest_unique(s):',
      '    seen = {}',
      '    left = best = 0',
      '    for right, ch in enumerate(s):',
      '        if ch in seen and seen[ch] >= left:',
      '            left = seen[ch] + 1',
      '        seen[ch] = right',
      '        best = max(best, right - left + 1)',
      '    return best'
    ],
    presets: ['"abcabcbb"', '"pwwkew"', '"dvdfabca"'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && typeof a[0] === 'string', T('Escribe una cadena entre comillas, por ejemplo: "abcabcbb"', 'Write a string in quotes, for example: "abcabcbb"'));
      need(a[0].length >= 1 && a[0].length <= 16, T('Usa entre 1 y 16 caracteres.', 'Use between 1 and 16 characters.'));
      return { s: a[0] };
    },
    trace({ s }) {
      const rec = new Recorder();
      const seen = {};
      let left = 0, best = 0, right = -1, ch, bestWin = null;
      const V = (extra = {}) => ({ s, left, right, seen: { ...seen }, bestWin, ...extra });
      const vars = () => (right < 0 ? { seen, left, best } : { right, ch, left, seen, best });
      rec.step(2, { seen }, V(), T('seen guarda la <b>última posición</b> en la que vimos cada carácter.', 'seen stores the <b>last position</b> where we saw each character.'));
      rec.step(3, vars(), V(), T('La ventana empieza vacía en la posición 0.', 'The window starts empty at position 0.'));
      for (right = 0; right < s.length; right++) {
        ch = s[right];
        rec.step(4, vars(), V(), T(`La ventana crece: <b>right</b> = ${right}, ch = '${ch}'.`, `The window grows: <b>right</b> = ${right}, ch = '${ch}'.`));
        if (ch in seen && seen[ch] >= left) {
          rec.step(5, vars(), V({ clash: seen[ch] }), T(`'${ch}' ya está dentro de la ventana (posición ${seen[ch]}).`, `'${ch}' is already inside the window (position ${seen[ch]}).`));
          left = seen[ch] + 1;
          rec.step(6, vars(), V(), T(`Saltamos <b>left</b> a ${left}, justo después de la repetición. No hace falta avanzar de a uno.`, `We jump <b>left</b> to ${left}, right after the repeat. No need to advance one step at a time.`));
        } else {
          rec.step(5, vars(), V(), ch in seen ? T(`'${ch}' se vio antes, pero quedó fuera de la ventana: no estorba.`, `'${ch}' was seen before, but it is outside the window: it does not get in the way.`) : T(`'${ch}' es nuevo en la ventana.`, `'${ch}' is new in the window.`));
        }
        seen[ch] = right;
        rec.step(7, vars(), V({ hi: ch }), T(`Anotamos que '${ch}' está ahora en ${right}.`, `We note that '${ch}' is now at ${right}.`));
        const len = right - left + 1;
        if (len > best) bestWin = [left, right];
        best = Math.max(best, len);
        rec.step(8, vars(), V(), T(`La ventana mide ${len}. best = ${best}.`, `The window has length ${len}. best = ${best}.`));
      }
      right = s.length - 1;
      rec.step(9, vars(), V({ done: true }), T(`La respuesta es <b>${best}</b>${bestWin ? `: "${s.slice(bestWin[0], bestWin[1] + 1)}"` : ''}.`, `The answer is <b>${best}</b>${bestWin ? `: "${s.slice(bestWin[0], bestWin[1] + 1)}"` : ''}.`));
      return rec.frames;
    },
    render(st) {
      const state = {}; const ptr = {};
      st.s.split('').forEach((_, i) => {
        if (st.done && st.bestWin && i >= st.bestWin[0] && i <= st.bestWin[1]) state[i] = 'ok';
        else if (!st.done && i >= st.left && i <= st.right) state[i] = 'win';
        else state[i] = 'dim';
      });
      if (st.clash !== undefined) state[st.clash] = 'bad';
      if (!st.done) {
        (ptr[st.left] = ptr[st.left] || []).push('left');
        if (st.right >= 0) (ptr[st.right] = ptr[st.right] || []).push('right');
      }
      return viz.cells(st.s.split(''), { ptr, state }) + viz.map(st.seen, { title: 'seen', hi: st.hi });
    },
    learn: {
      idea: T(`<p>Mantenemos una <strong>ventana</strong> <code>[left, right]</code> sin repetidos. <b>right</b> avanza siempre; cuando el nuevo carácter ya está dentro de la ventana, <b>left</b> salta justo después de su aparición anterior.</p>
             <p>El diccionario con la última posición permite ese salto en O(1), en vez de encoger la ventana de a un carácter.</p>`, `<p>We keep a <strong>window</strong> <code>[left, right]</code> with no repeats. <b>right</b> always moves forward; when the new character is already inside the window, <b>left</b> jumps right past its previous occurrence.</p>
             <p>The dictionary with the last position makes that jump O(1), instead of shrinking the window one character at a time.</p>`),
      signals: [T('Te piden la subcadena o subarreglo <strong>contiguo</strong> más largo o más corto que cumpla algo.', 'You are asked for the longest or shortest <strong>contiguous</strong> substring or subarray that satisfies something.'), T('La condición se puede actualizar al agregar o quitar un elemento del borde.', 'The condition can be updated when you add or remove an element at the edge.'), T('La fuerza bruta revisa todas las subcadenas (O(n²) o peor).', 'Brute force checks every substring (O(n²) or worse).')],
      time: 'O(n)', space: 'O(k)',
      why: T('Cada carácter entra a la ventana una vez y left solo avanza. k es el tamaño del alfabeto.', 'Each character enters the window once and left only moves forward. k is the size of the alphabet.')
    },
    build: {
      template: T(`def ventana(s):
    estado = {}
    left = best = 0
    for right, x in enumerate(s):
        agregar(estado, x)
        while invalida(estado):
            quitar(estado, s[left])
            left += 1
        best = max(best, right - left + 1)
    return best`, `def window(s):
    state = {}
    left = best = 0
    for right, x in enumerate(s):
        add(state, x)
        while invalid(state):
            remove(state, s[left])
            left += 1
        best = max(best, right - left + 1)
    return best`),
      tips: [T('La condición <code>seen[ch] &gt;= left</code> es el detalle que más se olvida: sin ella, left podría retroceder.', 'The condition <code>seen[ch] &gt;= left</code> is the most forgotten detail: without it, left could move backward.'), T('Dibuja la ventana en la pizarra y narra cuándo crece y cuándo se encoge.', 'Draw the window on the whiteboard and narrate when it grows and when it shrinks.'), T('Si te piden la subcadena y no solo la longitud, guarda también dónde empezó la mejor ventana.', 'If you are asked for the substring and not just its length, also store where the best window started.')],
      similar: [T('Ventana mínima que contiene todos los caracteres de otra cadena (difícil).', 'Minimum window that contains all the characters of another string (hard).'), T('Subarreglo más largo con a lo sumo k ceros que puedes cambiar.', 'Longest subarray with at most k zeros you can flip.'), T('Reemplazo de caracteres más largo (con k cambios).', 'Longest character replacement (with k changes).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const trapRain = {
    id: 'trap-rain',
    title: T('Atrapar agua de lluvia', 'Trapping rain water'),
    difficulty: T('Difícil', 'Hard'),
    pattern: T('Dos punteros', 'Two pointers'),
    statement: T('<p>Cada número es la altura de una columna de ancho 1. Después de llover, ¿cuántas unidades de agua quedan <strong>atrapadas</strong> entre las columnas?</p>', '<p>Each number is the height of a column of width 1. After it rains, how many units of water are <strong>trapped</strong> between the columns?</p>'),
    lang: 'python',
    code: [
      'def trap(h):',
      '    l, r = 0, len(h) - 1',
      '    left_max = right_max = 0',
      '    water = 0',
      '    while l < r:',
      '        if h[l] < h[r]:',
      '            left_max = max(left_max, h[l])',
      '            water += left_max - h[l]',
      '            l += 1',
      '        else:',
      '            right_max = max(right_max, h[r])',
      '            water += right_max - h[r]',
      '            r -= 1',
      '    return water'
    ],
    presets: ['[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]', '[4, 2, 0, 3, 2, 5]', '[3, 0, 1, 0, 4, 0, 2]'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && isNumArr(a[0]), T('Escribe una lista de alturas, por ejemplo: [4, 2, 0, 3, 2, 5]', 'Write a list of heights, for example: [4, 2, 0, 3, 2, 5]'));
      need(a[0].length >= 2 && a[0].length <= 14, T('Usa entre 2 y 14 alturas.', 'Use between 2 and 14 heights.'));
      need(a[0].every((x) => x >= 0 && x <= 12 && Number.isInteger(x)), T('Usa enteros entre 0 y 12.', 'Use integers between 0 and 12.'));
      return { h: a[0] };
    },
    trace({ h }) {
      const rec = new Recorder();
      const w = h.map(() => 0);
      let l = 0, r = h.length - 1, lm = 0, rm = 0, water = 0;
      const V = (extra = {}) => ({ h, w: w.slice(), l, r, lm, rm, ...extra });
      const vars = () => ({ l, r, left_max: lm, right_max: rm, water });
      rec.step(2, { l, r }, V(), T('Un puntero en cada extremo.', 'One pointer at each end.'));
      rec.step(3, { l, r, left_max: lm, right_max: rm }, V(), T('left_max y right_max: la columna más alta vista desde cada lado.', 'left_max and right_max: the tallest column seen from each side.'));
      rec.step(4, vars(), V(), T('Todavía no hay agua.', 'There is no water yet.'));
      while (true) {
        if (!(l < r)) { rec.step(5, vars(), V(), T('Los punteros se encontraron.', 'The pointers met.')); break; }
        rec.step(5, vars(), V(), T('l &lt; r: seguimos.', 'l &lt; r: we keep going.'));
        if (h[l] < h[r]) {
          rec.step(6, vars(), V(), T(`h[l] = ${h[l]} &lt; h[r] = ${h[r]}: a la derecha hay una pared al menos así de alta, así que el agua en l depende solo de <b>left_max</b>.`, `h[l] = ${h[l]} &lt; h[r] = ${h[r]}: there is a wall at least this tall on the right, so the water at l depends only on <b>left_max</b>.`));
          lm = Math.max(lm, h[l]);
          rec.step(7, vars(), V(), `left_max = ${lm}.`);
          const add = lm - h[l];
          w[l] = add; water += add;
          rec.step(8, vars(), V({ fill: l }), add ? T(`Sobre la columna ${l} caben <b>${add}</b> unidades.`, `Column ${l} holds <b>${add}</b> units above it.`) : T(`La columna ${l} es la más alta hasta ahora: no guarda agua.`, `Column ${l} is the tallest so far: it holds no water.`));
          l += 1;
          rec.step(9, vars(), V(), T('Avanzamos l.', 'We move l forward.'));
        } else {
          rec.step(6, vars(), V(), T(`h[l] = ${h[l]} no es menor que h[r] = ${h[r]}.`, `h[l] = ${h[l]} is not less than h[r] = ${h[r]}.`));
          rec.step(10, vars(), V(), T('Entonces el lado derecho es el que limita: trabajamos con <b>right_max</b>.', 'So the right side is the limiting one: we work with <b>right_max</b>.'));
          rm = Math.max(rm, h[r]);
          rec.step(11, vars(), V(), `right_max = ${rm}.`);
          const add = rm - h[r];
          w[r] = add; water += add;
          rec.step(12, vars(), V({ fill: r }), add ? T(`Sobre la columna ${r} caben <b>${add}</b> unidades.`, `Column ${r} holds <b>${add}</b> units above it.`) : T(`La columna ${r} es la más alta desde la derecha: no guarda agua.`, `Column ${r} is the tallest seen from the right: it holds no water.`));
          r -= 1;
          rec.step(13, vars(), V(), T('Retrocedemos r.', 'We move r back.'));
        }
      }
      rec.step(14, vars(), V(), T(`En total quedan atrapadas <b>${water}</b> unidades.`, `In total, <b>${water}</b> units are trapped.`));
      return rec.frames;
    },
    render(st) {
      const ptr = {}; const state = {};
      if (st.l <= st.r) { (ptr[st.l] = ptr[st.l] || []).push('l'); (ptr[st.r] = ptr[st.r] || []).push('r'); }
      if (st.fill !== undefined) state[st.fill] = 'cur';
      const levels = [];
      if (st.lm) levels.push({ value: st.lm, label: 'left_max', color: 'sky' });
      if (st.rm) levels.push({ value: st.rm, label: 'right_max', color: 'tomato' });
      return viz.bars(st.h, { ptr, water: st.w, levels, state });
    },
    learn: {
      idea: T(`<p>Sobre cada columna cabe <code>min(máx. a su izquierda, máx. a su derecha) − altura</code>. La versión fácil calcula esos máximos con dos arreglos extra.</p>
             <p>El truco de dos punteros: si <code>h[l] &lt; h[r]</code>, sabemos que a la derecha existe una pared de al menos <code>h[r]</code>, así que el mínimo lo decide <code>left_max</code>. Podemos resolver la columna <b>l</b> sin conocer todo el lado derecho.</p>`, `<p>Each column holds <code>min(max to its left, max to its right) − height</code>. The easy version computes those maximums with two extra arrays.</p>
             <p>The two-pointer trick: if <code>h[l] &lt; h[r]</code>, we know there is a wall of at least <code>h[r]</code> on the right, so the minimum is decided by <code>left_max</code>. We can solve column <b>l</b> without knowing the whole right side.</p>`),
      signals: [T('El valor en cada posición depende de lo que hay a <strong>ambos lados</strong>.', 'The value at each position depends on what is on <strong>both sides</strong>.'), T('Una solución con arreglos de prefijos funciona, pero te piden memoria O(1).', 'A solution with prefix arrays works, but you are asked for O(1) memory.'), T('Alturas, barras, histogramas.', 'Heights, bars, histograms.')],
      time: 'O(n)', space: 'O(1)',
      why: T('Un recorrido con dos punteros. La versión con arreglos de máximos también es O(n), pero usa O(n) de memoria.', 'One pass with two pointers. The version with arrays of maximums is also O(n), but it uses O(n) memory.')
    },
    build: {
      template: T(`def trap(h):
    # Versión con prefijos: más fácil de explicar primero
    n = len(h)
    izq, der = [0] * n, [0] * n
    for i in range(n):
        izq[i] = max(izq[i - 1] if i else 0, h[i])
    for i in range(n - 1, -1, -1):
        der[i] = max(der[i + 1] if i < n - 1 else 0, h[i])
    return sum(min(izq[i], der[i]) - h[i] for i in range(n))`, `def trap(h):
    # Prefix version: easier to explain first
    n = len(h)
    left, right = [0] * n, [0] * n
    for i in range(n):
        left[i] = max(left[i - 1] if i else 0, h[i])
    for i in range(n - 1, -1, -1):
        right[i] = max(right[i + 1] if i < n - 1 else 0, h[i])
    return sum(min(left[i], right[i]) - h[i] for i in range(n))`),
      templateTitle: T('Primero la versión con prefijos (O(n) de memoria)', 'First, the prefix version (O(n) memory)'),
      tips: [T('En la entrevista, presenta primero la versión con prefijos y luego optimiza la memoria con dos punteros.', 'In the interview, present the prefix version first and then optimize the memory with two pointers.'), T('Prueba casos borde: lista vacía, una sola columna, alturas en escalera (nunca guarda agua).', 'Test edge cases: an empty list, a single column, staircase heights (they never hold water).'), T('Una alternativa es con una <strong>pila monótona</strong>: vale la pena mencionarla.', 'An alternative uses a <strong>monotonic stack</strong>: it is worth mentioning.')],
      similar: [T('El contenedor con más agua (más fácil, en esta estación).', 'Container with most water (easier, in this station).'), T('Rectángulo más grande en un histograma (pila monótona).', 'Largest rectangle in a histogram (monotonic stack).'), T('Atrapar agua en 2D (con un heap, muy difícil).', 'Trapping water in 2D (with a heap, very hard).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const slidingMax = {
    id: 'sliding-max',
    title: T('Máximo en ventana deslizante', 'Sliding window maximum'),
    difficulty: T('Difícil', 'Hard'),
    pattern: T('Cola monótona', 'Monotonic queue'),
    statement: T('<p>Dado un arreglo y un tamaño <code>k</code>, devuelve el <strong>máximo de cada ventana</strong> de k elementos consecutivos mientras la ventana se desliza de izquierda a derecha.</p>', '<p>Given an array and a size <code>k</code>, return the <strong>maximum of each window</strong> of k consecutive elements as the window slides from left to right.</p>'),
    lang: 'python',
    code: [
      'def max_window(nums, k):',
      '    dq, out = deque(), []',
      '    for i, x in enumerate(nums):',
      '        while dq and nums[dq[-1]] <= x:',
      '            dq.pop()',
      '        dq.append(i)',
      '        if dq[0] <= i - k:',
      '            dq.popleft()',
      '        if i >= k - 1:',
      '            out.append(nums[dq[0]])',
      '    return out'
    ],
    presets: ['[1, 3, -1, -3, 5, 3, 6, 7], 3', '[9, 8, 7, 6, 5, 4], 2', '[4, 2, 12, 3, 8, 1, 5], 3'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 2 && isNumArr(a[0]) && Number.isInteger(a[1]), T('Escribe el arreglo y k, por ejemplo: [1, 3, -1, -3, 5], 3', 'Write the array and k, for example: [1, 3, -1, -3, 5], 3'));
      need(a[0].length >= 1 && a[0].length <= 12, T('Usa entre 1 y 12 números.', 'Use between 1 and 12 numbers.'));
      need(a[1] >= 1 && a[1] <= a[0].length, T('k tiene que estar entre 1 y el largo del arreglo.', 'k has to be between 1 and the length of the array.'));
      return { nums: a[0], k: a[1] };
    },
    trace({ nums, k }) {
      const rec = new Recorder();
      let dq = [], out = [], i = -1, x;
      const V = (extra = {}) => ({ nums, k, i, dq: dq.slice(), out: out.slice(), ...extra });
      const vars = () => (i < 0 ? { k, dq, out } : { i, x, dq, out });
      rec.step(2, vars(), V(), T('dq guarda <b>índices</b> cuyos valores van de mayor a menor. El frente siempre es el máximo de la ventana.', 'dq stores <b>indices</b> whose values go from largest to smallest. The front is always the maximum of the window.'));
      for (i = 0; i < nums.length; i++) {
        x = nums[i];
        rec.step(3, vars(), V(), T(`Entra nums[${i}] = ${x}.`, `In comes nums[${i}] = ${x}.`));
        while (dq.length && nums[dq[dq.length - 1]] <= x) {
          rec.step(4, vars(), V({ kill: dq[dq.length - 1] }), T(`nums[${dq[dq.length - 1]}] = ${nums[dq[dq.length - 1]]} ≤ ${x}: ya nunca será máximo mientras ${x} esté en la ventana.`, `nums[${dq[dq.length - 1]}] = ${nums[dq[dq.length - 1]]} ≤ ${x}: it can never be the maximum while ${x} is in the window.`));
          dq.pop();
          rec.step(5, vars(), V(), T('Lo sacamos por atrás.', 'We remove it from the back.'));
        }
        rec.step(4, vars(), V(), dq.length ? T(`El último de dq (${nums[dq[dq.length - 1]]}) es mayor que ${x}: paramos.`, `The last one in dq (${nums[dq[dq.length - 1]]}) is greater than ${x}: we stop.`) : T('dq quedó vacía.', 'dq is now empty.'));
        dq.push(i);
        rec.step(6, vars(), V(), T(`Agregamos el índice ${i} al final.`, `We append index ${i} at the back.`));
        if (dq[0] <= i - k) {
          rec.step(7, vars(), V({ old: dq[0] }), T(`El índice ${dq[0]} ya salió de la ventana [${i - k + 1}, ${i}].`, `Index ${dq[0]} has already left the window [${i - k + 1}, ${i}].`));
          dq.shift();
          rec.step(8, vars(), V(), T('Lo sacamos por el frente.', 'We remove it from the front.'));
        } else {
          rec.step(7, vars(), V(), T('El frente sigue dentro de la ventana.', 'The front is still inside the window.'));
        }
        if (i >= k - 1) {
          rec.step(9, vars(), V(), T('La ventana ya está completa.', 'The window is now complete.'));
          out.push(nums[dq[0]]);
          rec.step(10, vars(), V({ emit: true }), T(`El máximo es el frente de dq: <b>${nums[dq[0]]}</b>.`, `The maximum is the front of dq: <b>${nums[dq[0]]}</b>.`));
        } else {
          rec.step(9, vars(), V(), T(`Aún no hay ${k} elementos en la ventana.`, `There are not yet ${k} elements in the window.`));
        }
      }
      i = nums.length - 1;
      rec.step(11, vars(), V({ done: true }), T(`Resultado: <b>[${out.join(', ')}]</b>.`, `Result: <b>[${out.join(', ')}]</b>.`));
      return rec.frames;
    },
    render(st) {
      const state = {}; const ptr = {};
      const lo = st.i - st.k + 1;
      st.nums.forEach((_, j) => {
        if (st.done) state[j] = '';
        else if (j >= Math.max(0, lo) && j <= st.i) state[j] = 'win';
        else state[j] = 'dim';
      });
      st.dq.forEach((j) => { if (!st.done) state[j] = 'win in-dq'; });
      if (st.dq.length && !st.done) state[st.dq[0]] = 'ok';
      if (st.kill !== undefined) state[st.kill] = 'bad';
      if (st.old !== undefined) state[st.old] = 'bad';
      if (st.i >= 0 && !st.done) (ptr[st.i] = ptr[st.i] || []).push('i');
      return viz.cells(st.nums, { ptr, state }) +
        viz.list(st.dq.map((j) => `${j}→${st.nums[j]}`), { title: T('dq (índice→valor)', 'dq (index→value)'), hiFirst: true }) +
        viz.list(st.out, { title: 'out', hiLast: !!st.emit });
    },
    learn: {
      idea: T(`<p>Una cola doble (deque) que guarda índices con valores <strong>decrecientes</strong>. Cuando entra un número, sacamos por atrás todos los menores o iguales: con él en la ventana, nunca serán el máximo. El frente siempre es el máximo actual.</p>
             <p>Por el frente sacamos el índice que ya quedó fuera de la ventana.</p>`, `<p>A double-ended queue (deque) that stores indices with <strong>decreasing</strong> values. When a number comes in, we remove from the back every value less than or equal to it: with it in the window, they will never be the maximum. The front is always the current maximum.</p>
             <p>From the front we remove the index that has already fallen out of the window.</p>`),
      signals: [T('Te piden el máximo o mínimo de <strong>cada ventana</strong> de tamaño fijo.', 'You are asked for the maximum or minimum of <strong>each window</strong> of fixed size.'), T('Un heap daría O(n log k); te piden O(n).', 'A heap would give O(n log k); you are asked for O(n).'), T('Hay elementos que se vuelven "inútiles" en cuanto aparece uno mejor.', 'Some elements become "useless" as soon as a better one shows up.')],
      time: 'O(n)', space: 'O(k)',
      why: T('Cada índice entra y sale de la deque como máximo una vez, aunque haya un while dentro del for.', 'Each index enters and leaves the deque at most once, even though there is a while inside the for.')
    },
    build: {
      template: `from collections import deque

def max_window(nums, k):
    dq, out = deque(), []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out`,
      tips: [T('Guarda <strong>índices</strong>, no valores: los necesitas para saber cuándo un elemento salió de la ventana.', 'Store <strong>indices</strong>, not values: you need them to know when an element has left the window.'), T('Explica el análisis amortizado: el while interno no hace el algoritmo O(n·k).', 'Explain the amortized analysis: the inner while does not make the algorithm O(n·k).'), T('Para el mínimo, solo invierte la comparación.', 'For the minimum, just flip the comparison.')],
      similar: [T('Subarreglo más corto con suma al menos K (deque monótona + prefijos).', 'Shortest subarray with sum at least K (monotonic deque + prefixes).'), T('Siguiente elemento mayor (pila monótona).', 'Next greater element (monotonic stack).'), T('Saltos máximos con puntaje (DP + deque).', 'Maximum-score jumps (DP + deque).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const esc = viz.esc;
  const put = (ptr, i, name) => { (ptr[i] = ptr[i] || []).push(name); };
  const isAlnum = (ch) => /[\p{L}\p{N}]/u.test(ch);
  const sayChar = (ch) => (ch === ' ' ? T('un espacio', 'a space') : `'${esc(ch)}'`);

  const palindrome = {
    id: 'valid-palindrome',
    title: T('¿Es palíndromo?', 'Is it a palindrome?'),
    difficulty: T('Fácil', 'Easy'),
    pattern: T('Dos punteros', 'Two pointers'),
    statement: T('<p>Una frase es un <strong>palíndromo</strong> si se lee igual de izquierda a derecha que de derecha a izquierda. Decide si la cadena lo es, sin fijarte en mayúsculas ni en los espacios y signos de puntuación.</p>', '<p>A phrase is a <strong>palindrome</strong> if it reads the same from left to right as from right to left. Decide whether the string is one, ignoring capitalization, spaces and punctuation.</p>'),
    lang: 'python',
    code: [
      'def is_palindrome(s):',
      '    l, r = 0, len(s) - 1',
      '    while l < r:',
      '        if not s[l].isalnum():',
      '            l += 1',
      '        elif not s[r].isalnum():',
      '            r -= 1',
      '        elif s[l].lower() != s[r].lower():',
      '            return False',
      '        else:',
      '            l += 1',
      '            r -= 1',
      '    return True'
    ],
    presets: ['"Anita lava la tina"', '"Yo hago yoga hoy"', '"Ana, 1 banana"'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && typeof a[0] === 'string', T('Escribe una frase entre comillas, por ejemplo: "Anita lava la tina"', 'Write a phrase in quotes, for example: "Anita lava la tina"'));
      const chars = Array.from(a[0]);
      need(chars.length >= 1 && chars.length <= 18, T('Usa entre 1 y 18 caracteres para que se vea bien.', 'Use between 1 and 18 characters so it displays well.'));
      return { s: a[0], chars };
    },
    trace({ s, chars }) {
      const rec = new Recorder();
      const mark = {};
      let l = 0, r = chars.length - 1;
      const V = (extra = {}) => ({ chars, l, r, mark, ...extra });
      const vars = () => ({ s, l, r });
      rec.step(2, vars(), V(), T('Ponemos <b>l</b> en el primer carácter y <b>r</b> en el último.', 'We put <b>l</b> on the first character and <b>r</b> on the last one.'));
      while (true) {
        if (!(l < r)) {
          rec.step(3, vars(), V(), l === r ? T('l y r llegaron al mismo carácter: el del centro no necesita pareja.', 'l and r reached the same character: the middle one does not need a partner.') : T('l y r se cruzaron: ya revisamos todas las parejas.', 'l and r crossed: we have checked every pair.'));
          break;
        }
        rec.step(3, vars(), V(), T(`l &lt; r (${l} &lt; ${r}): todavía quedan caracteres por comparar.`, `l &lt; r (${l} &lt; ${r}): there are still characters to compare.`));
        const a = chars[l], b = chars[r];
        if (!isAlnum(a)) {
          rec.step(4, vars(), V({ skip: l }), T(`En l hay ${sayChar(a)}, que no es letra ni número.`, `At l there is ${sayChar(a)}, which is neither a letter nor a digit.`));
          mark[l] = 'dim'; l += 1;
          rec.step(5, vars(), V(), T('Lo saltamos: avanzamos <b>l</b> sin comparar nada.', 'We skip it: we move <b>l</b> forward without comparing anything.'));
          continue;
        }
        rec.step(4, vars(), V(), T(`En l hay ${sayChar(a)}, que sí es letra o número.`, `At l there is ${sayChar(a)}, which is a letter or a digit.`));
        if (!isAlnum(b)) {
          rec.step(6, vars(), V({ skip: r }), T(`Pero en r hay ${sayChar(b)}, que no lo es.`, `But at r there is ${sayChar(b)}, which is not.`));
          mark[r] = 'dim'; r -= 1;
          rec.step(7, vars(), V(), T('Lo saltamos: retrocedemos <b>r</b> sin comparar nada.', 'We skip it: we move <b>r</b> back without comparing anything.'));
          continue;
        }
        rec.step(6, vars(), V(), T(`En r hay ${sayChar(b)}, que también lo es: ya tenemos una pareja para comparar.`, `At r there is ${sayChar(b)}, which is one too: now we have a pair to compare.`));
        const la = a.toLowerCase(), lb = b.toLowerCase();
        if (la !== lb) {
          rec.step(8, vars(), V({ bad: true }), T(`En minúsculas, '${esc(la)}' y '${esc(lb)}' son distintos.`, `In lowercase, '${esc(la)}' and '${esc(lb)}' are different.`));
          rec.step(9, vars(), V({ bad: true, end: true, answer: false }), T('Con una sola pareja distinta basta: <b>no</b> es palíndromo.', 'A single mismatched pair is enough: it is <b>not</b> a palindrome.'));
          return rec.frames;
        }
        rec.step(8, vars(), V({ match: true }), T(`En minúsculas, '${esc(la)}' y '${esc(lb)}' son iguales.`, `In lowercase, '${esc(la)}' and '${esc(lb)}' are equal.`));
        rec.step(10, vars(), V({ match: true }), T('Como coinciden, esta pareja queda confirmada...', 'Since they match, this pair is confirmed...'));
        mark[l] = 'ok'; l += 1;
        rec.step(11, vars(), V(), T('...avanzamos <b>l</b>...', '...we move <b>l</b> forward...'));
        mark[r] = 'ok'; r -= 1;
        rec.step(12, vars(), V(), T('...y retrocedemos <b>r</b>. Los dos punteros se acercan al centro.', '...and we move <b>r</b> back. The two pointers get closer to the middle.'));
      }
      rec.step(13, vars(), V({ end: true, answer: true }), T('Ninguna pareja falló: <b>sí</b> es palíndromo.', 'No pair failed: it <b>is</b> a palindrome.'));
      return rec.frames;
    },
    render(st) {
      const state = { ...st.mark }; const ptr = {};
      if (st.bad) { state[st.l] = 'bad'; state[st.r] = 'bad'; }
      else if (st.match) { state[st.l] = 'ok'; state[st.r] = 'ok'; }
      else if (st.skip !== undefined) state[st.skip] = 'cur';
      if (!st.end || st.bad) { put(ptr, st.l, 'l'); put(ptr, st.r, 'r'); }
      return viz.cells(st.chars.map((ch) => (ch === ' ' ? '␣' : ch)), { ptr, state, small: st.chars.length > 14 }) +
        (st.end ? `<div class="vz-verdict ${st.answer ? 'ok' : 'bad'}">${st.answer ? T('Es palíndromo', 'It is a palindrome') : T('No es palíndromo', 'Not a palindrome')}</div>` : '');
    },
    learn: {
      idea: T(`<p>Un palíndromo es simétrico: el primer carácter tiene que ser igual al último, el segundo al penúltimo, y así hasta el centro. Con un puntero en cada extremo comparamos esas parejas una por una.</p>
             <p>Los espacios y signos no participan, así que el puntero que cae en uno simplemente lo salta. No hace falta crear una copia "limpia" de la cadena.</p>`, `<p>A palindrome is symmetric: the first character must equal the last one, the second the second-to-last, and so on up to the middle. With a pointer at each end we compare those pairs one by one.</p>
             <p>Spaces and punctuation do not count, so the pointer that lands on one simply skips it. There is no need to build a "clean" copy of the string.</p>`),
      signals: [T('Te preguntan por <strong>simetría</strong>: algo que debe coincidir de afuera hacia adentro.', 'You are asked about <strong>symmetry</strong>: something that must match from the outside in.'), T('Puedes decidir mirando solo los dos extremos y acercándote al centro.', 'You can decide by looking only at the two ends and moving toward the middle.'), T('Te piden no usar memoria extra (nada de invertir la cadena).', 'You are asked not to use extra memory (no reversing the string).')],
      time: 'O(n)', space: 'O(1)',
      why: T('En cada vuelta se mueve al menos un puntero, y entre los dos recorren la cadena una sola vez.', 'Each iteration moves at least one pointer, and together they walk the string only once.')
    },
    build: {
      template: `def is_palindrome(s):
    l, r = 0, len(s) - 1
    while l < r:
        if not s[l].isalnum():
            l += 1
        elif not s[r].isalnum():
            r -= 1
        elif s[l].lower() != s[r].lower():
            return False
        else:
            l += 1
            r -= 1
    return True`,
      tips: [T('Pregunta qué caracteres cuentan: ¿solo letras y números?, ¿importan las mayúsculas?, ¿y las tildes? Aquí "á" y "a" son distintas.', 'Ask which characters count: only letters and digits? Does capitalization matter? What about accents? Here an accented "a" and a plain "a" are different.'), T('La versión de una línea (<code>limpia == limpia[::-1]</code>) funciona, pero gasta O(n) de memoria: menciónala y luego mejórala.', 'The one-line version (<code>clean == clean[::-1]</code>) works, but it spends O(n) memory: mention it and then improve on it.'), T('Prueba los casos borde: un solo carácter, solo signos de puntuación y largos pares e impares.', 'Test the edge cases: a single character, only punctuation, and even and odd lengths.')],
      similar: [T('Palíndromo permitiendo borrar un carácter como máximo.', 'Palindrome allowing you to delete at most one character.'), T('Invertir una cadena en el mismo arreglo.', 'Reverse a string in place.'), T('Par con suma objetivo (en esta misma estación).', 'Pair with target sum (in this same station).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const parentheses = {
    id: 'valid-parentheses',
    title: T('Paréntesis balanceados', 'Balanced parentheses'),
    difficulty: T('Fácil', 'Easy'),
    pattern: T('Pila', 'Stack'),
    statement: T('<p>Te dan una cadena hecha solo de <code>()</code>, <code>[]</code> y <code>{}</code>. Di si está <strong>bien balanceada</strong>: cada apertura se cierra con su pareja, y lo último que se abrió es lo primero que se cierra.</p>', '<p>You are given a string made only of <code>()</code>, <code>[]</code> and <code>{}</code>. Say whether it is <strong>properly balanced</strong>: every opener is closed by its partner, and the last thing opened is the first thing closed.</p>'),
    lang: 'python',
    code: [
      'def is_balanced(s):',
      "    closes = {'(': ')', '[': ']', '{': '}'}",
      '    stack = []',
      '    for ch in s:',
      '        if ch in closes:',
      '            stack.append(closes[ch])',
      '        elif not stack or stack.pop() != ch:',
      '            return False',
      '    return not stack'
    ],
    presets: ['"([{}])()"', '"{(])}"', '"[(()"'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && typeof a[0] === 'string', T('Escribe la cadena entre comillas, por ejemplo: "([{}])()"', 'Write the string in quotes, for example: "([{}])()"'));
      need(/^[()[\]{}]{1,16}$/.test(a[0]), T('Usa solo ( ) [ ] { } y hasta 16 caracteres.', 'Use only ( ) [ ] { } and up to 16 characters.'));
      return { s: a[0] };
    },
    trace({ s }) {
      const rec = new Recorder();
      const closes = { '(': ')', '[': ']', '{': '}' };
      const stack = [];
      let i = -1, ch;
      const V = (extra = {}) => ({ s, i, stack, ...extra });
      const vars = () => (i < 0 ? { stack } : { ch, stack });
      rec.step(2, {}, V(), T('Un diccionario que dice con qué cierre termina cada apertura.', 'A dictionary that says which closer ends each opener.'));
      rec.step(3, vars(), V(), T('En la pila vamos a anotar los <b>cierres que estamos esperando</b>. El más reciente queda arriba.', 'On the stack we will write down the <b>closers we are waiting for</b>. The most recent one stays on top.'));
      for (i = 0; i < s.length; i++) {
        ch = s[i];
        rec.step(4, vars(), V(), T(`Leemos '${ch}'.`, `We read '${ch}'.`));
        if (ch in closes) {
          rec.step(5, vars(), V(), T(`'${ch}' es una apertura.`, `'${ch}' is an opener.`));
          stack.push(closes[ch]);
          rec.step(6, vars(), V({ pushed: true }), T(`Apilamos el cierre que le corresponde: '${closes[ch]}'. Tiene que aparecer más adelante.`, `We push its matching closer: '${closes[ch]}'. It has to show up later.`));
          continue;
        }
        rec.step(5, vars(), V(), T(`'${ch}' no es una apertura, así que es un cierre.`, `'${ch}' is not an opener, so it is a closer.`));
        if (!stack.length) {
          rec.step(7, vars(), V({ bad: true }), T('La pila está vacía: nadie estaba esperando este cierre.', 'The stack is empty: nobody was waiting for this closer.'));
          rec.step(8, vars(), V({ bad: true, end: true, answer: false }), T('Sobra un cierre: la cadena <b>no</b> está balanceada.', 'There is an extra closer: the string is <b>not</b> balanced.'));
          return rec.frames;
        }
        const top = stack.pop();
        if (top !== ch) {
          rec.step(7, vars(), V({ bad: true }), T(`Sacamos el tope: esperábamos '${top}', pero llegó '${ch}'.`, `We pop the top: we expected '${top}', but '${ch}' arrived.`));
          rec.step(8, vars(), V({ bad: true, end: true, answer: false }), T('Se cerró algo en el orden equivocado: la cadena <b>no</b> está balanceada.', 'Something was closed in the wrong order: the string is <b>not</b> balanced.'));
          return rec.frames;
        }
        rec.step(7, vars(), V({ match: true }), T(`Sacamos el tope: esperábamos '${top}' y llegó '${ch}'. Coinciden, así que seguimos.`, `We pop the top: we expected '${top}' and '${ch}' arrived. They match, so we keep going.`));
      }
      i = s.length;
      const left = stack.length;
      rec.step(9, vars(), V({ end: true, bad: left > 0, answer: left === 0 }), left
        ? T(`Se acabó la cadena y ${left === 1 ? 'queda 1 cierre que nunca llegó' : `quedan ${left} cierres que nunca llegaron`}: <b>False</b>.`, `The string ended and ${left === 1 ? '1 closer never arrived' : `${left} closers never arrived`}: <b>False</b>.`)
        : T('Se acabó la cadena y no esperamos ningún cierre: <b>True</b>.', 'The string ended and we are not waiting for any closer: <b>True</b>.'));
      return rec.frames;
    },
    render(st) {
      const state = {}; const ptr = {};
      const chars = st.s.split('');
      chars.forEach((_, j) => { if (j < st.i) state[j] = 'dim'; });
      if (st.i >= 0 && st.i < chars.length) {
        state[st.i] = st.bad ? 'bad' : st.match ? 'ok' : 'cur';
        ptr[st.i] = ['i'];
      }
      return `<div class="vz-split">${viz.cells(chars, { ptr, state })}${viz.stack(st.stack, { title: T('stack (cierres esperados)', 'stack (expected closers)'), hiTop: !!st.pushed })}</div>` +
        (st.end ? `<div class="vz-verdict ${st.answer ? 'ok' : 'bad'}">${st.answer ? T('Balanceada', 'Balanced') : T('No balanceada', 'Not balanced')}</div>` : '');
    },
    learn: {
      idea: T(`<p>Lo último que se abre es lo primero que se tiene que cerrar. Ese orden (el último en entrar es el primero en salir) es justo el de una <strong>pila</strong>.</p>
             <p>Por cada apertura apilamos el cierre que esperamos. Cuando llega un cierre, tiene que ser exactamente el que está en el tope. Y al terminar, la pila debe quedar vacía: si no, quedó algo abierto.</p>`, `<p>The last thing opened is the first thing that has to be closed. That order (last in, first out) is exactly the order of a <strong>stack</strong>.</p>
             <p>For each opener we push the closer we expect. When a closer arrives, it has to be exactly the one on top. And at the end, the stack must be empty: if not, something was left open.</p>`),
      signals: [T('Hay cosas <strong>anidadas</strong>: paréntesis, etiquetas, bloques dentro de bloques.', 'There are <strong>nested</strong> things: parentheses, tags, blocks inside blocks.'), T('Lo que importa en cada momento es lo <strong>más reciente</strong> que quedó pendiente.', 'What matters at each moment is the <strong>most recent</strong> thing still pending.'), T('Necesitas emparejar cada elemento con uno anterior.', 'You need to match each element with an earlier one.')],
      time: 'O(n)', space: 'O(n)',
      why: T('Cada carácter se apila o desapila una sola vez. En el peor caso (todo aperturas) la pila guarda n elementos.', 'Each character is pushed or popped only once. In the worst case (all openers) the stack holds n elements.')
    },
    build: {
      template: `def is_balanced(s):
    closes = {'(': ')', '[': ']', '{': '}'}
    stack = []
    for ch in s:
        if ch in closes:
            stack.append(closes[ch])
        elif not stack or stack.pop() != ch:
            return False
    return not stack`,
      tips: [T('Hay tres formas de fallar: un cierre con la pila vacía, un cierre que no es el esperado y aperturas que sobran al final. Nómbralas antes de programar.', 'There are three ways to fail: a closer with an empty stack, a closer that is not the expected one, and openers left over at the end. Name them before coding.'), T('El orden en <code>not stack or stack.pop() != ch</code> importa: primero se revisa que la pila no esté vacía.', 'The order in <code>not stack or stack.pop() != ch</code> matters: first you check that the stack is not empty.'), T('Un contador solo alcanza si hay un único tipo de paréntesis. Con varios tipos necesitas la pila.', 'A counter is only enough if there is a single kind of bracket. With several kinds you need the stack.')],
      similar: [T('Mínimo de paréntesis que hay que agregar para balancear una cadena.', 'Minimum number of parentheses to add to balance a string.'), T('Evaluar una expresión en notación polaca inversa.', 'Evaluate an expression in reverse Polish notation.'), T('Rectángulo más grande del histograma (otra pila, en esta estación).', 'Largest rectangle in a histogram (another stack, in this station).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const binarySearch = {
    id: 'binary-search',
    title: T('Búsqueda binaria', 'Binary search'),
    difficulty: T('Fácil', 'Easy'),
    pattern: T('Búsqueda binaria', 'Binary search'),
    statement: T('<p>Te dan un arreglo <strong>ordenado</strong> y un número <code>target</code>. Devuelve el índice donde está, o <code>-1</code> si no aparece, sin revisar los elementos uno por uno.</p>', '<p>You are given a <strong>sorted</strong> array and a number <code>target</code>. Return the index where it is, or <code>-1</code> if it does not appear, without checking the elements one by one.</p>'),
    lang: 'python',
    code: [
      'def binary_search(nums, target):',
      '    lo, hi = 0, len(nums) - 1',
      '    while lo <= hi:',
      '        mid = (lo + hi) // 2',
      '        if nums[mid] == target:',
      '            return mid',
      '        elif nums[mid] < target:',
      '            lo = mid + 1',
      '        else:',
      '            hi = mid - 1',
      '    return -1'
    ],
    presets: ['[1, 3, 5, 7, 9, 11, 13, 15, 17], 13', '[2, 4, 6, 8, 10, 12], 5', '[-4, 0, 3, 8, 21, 34, 55, 89], -4'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 2 && isNumArr(a[0]) && typeof a[1] === 'number', T('Escribe el arreglo y el número que buscas, por ejemplo: [1, 3, 5, 7, 9], 7', 'Write the array and the number you are looking for, for example: [1, 3, 5, 7, 9], 7'));
      need(a[0].length >= 1 && a[0].length <= 14, T('Usa entre 1 y 14 números para que se vea bien.', 'Use between 1 and 14 numbers so it displays well.'));
      need(a[0].every((x, i) => i === 0 || a[0][i - 1] <= x), T('El arreglo tiene que venir ordenado: sin eso no se puede descartar la mitad.', 'The array has to be sorted: without that you cannot discard half of it.'));
      return { nums: a[0], target: a[1] };
    },
    trace({ nums, target }) {
      const rec = new Recorder();
      let lo = 0, hi = nums.length - 1, mid;
      const V = (extra = {}) => ({ nums, target, lo, hi, ...extra });
      const vars = () => (mid === undefined ? { target, lo, hi } : { target, lo, hi, mid });
      rec.step(2, vars(), V(), T('El objetivo puede estar en cualquier parte: el rango de búsqueda va de <b>lo</b> = 0 a <b>hi</b>, el último índice.', 'The target could be anywhere: the search range goes from <b>lo</b> = 0 to <b>hi</b>, the last index.'));
      while (true) {
        if (!(lo <= hi)) { rec.step(3, vars(), V(), T(`lo (${lo}) ya pasó a hi (${hi}): el rango quedó vacío.`, `lo (${lo}) has passed hi (${hi}): the range is empty.`)); break; }
        const left = hi - lo + 1;
        rec.step(3, vars(), V(), T(`lo ≤ hi (${lo} ≤ ${hi}): ${left === 1 ? 'queda 1 candidato' : `quedan ${left} candidatos`}.`, `lo ≤ hi (${lo} ≤ ${hi}): ${left === 1 ? '1 candidate left' : `${left} candidates left`}.`));
        mid = Math.floor((lo + hi) / 2);
        rec.step(4, vars(), V({ mid }), T(`Miramos el del medio: mid = (${lo} + ${hi}) // 2 = <b>${mid}</b>.`, `We look at the middle one: mid = (${lo} + ${hi}) // 2 = <b>${mid}</b>.`));
        if (nums[mid] === target) {
          rec.step(5, vars(), V({ mid, found: true }), T(`nums[${mid}] = ${nums[mid]}: ¡es el objetivo!`, `nums[${mid}] = ${nums[mid]}: it is the target!`));
          rec.step(6, vars(), V({ mid, found: true, answer: mid }), T(`Devolvemos el índice <b>${mid}</b>.`, `We return index <b>${mid}</b>.`));
          return rec.frames;
        }
        rec.step(5, vars(), V({ mid }), T(`nums[${mid}] = ${nums[mid]} no es ${target}.`, `nums[${mid}] = ${nums[mid]} is not ${target}.`));
        if (nums[mid] < target) {
          rec.step(7, vars(), V({ mid }), T(`${nums[mid]} &lt; ${target}: como el arreglo está ordenado, el objetivo solo puede estar a la derecha de mid.`, `${nums[mid]} &lt; ${target}: since the array is sorted, the target can only be to the right of mid.`));
          lo = mid + 1;
          rec.step(8, vars(), V(), T(`Descartamos de un golpe mid y todo lo que está a su izquierda: lo = ${lo}.`, `In one go we discard mid and everything to its left: lo = ${lo}.`));
        } else {
          rec.step(7, vars(), V({ mid }), T(`${nums[mid]} no es menor que ${target}...`, `${nums[mid]} is not less than ${target}...`));
          rec.step(9, vars(), V({ mid }), T('...así que es mayor: el objetivo solo puede estar a la izquierda de mid.', '...so it is greater: the target can only be to the left of mid.'));
          hi = mid - 1;
          rec.step(10, vars(), V(), T(`Descartamos de un golpe mid y todo lo que está a su derecha: hi = ${hi}.`, `In one go we discard mid and everything to its right: hi = ${hi}.`));
        }
      }
      rec.step(11, vars(), V({ answer: -1 }), T(`${target} no está en el arreglo: devolvemos <b>-1</b>.`, `${target} is not in the array: we return <b>-1</b>.`));
      return rec.frames;
    },
    render(st) {
      const state = {}; const ptr = {};
      st.nums.forEach((_, i) => { if (i < st.lo || i > st.hi) state[i] = 'dim'; });
      if (st.mid !== undefined) state[st.mid] = st.found ? 'ok' : 'cur';
      if (st.lo < st.nums.length) put(ptr, st.lo, 'lo');
      if (st.hi >= 0) put(ptr, st.hi, 'hi');
      if (st.mid !== undefined) put(ptr, st.mid, 'mid');
      return `${viz.cells(st.nums, { ptr, state })}
        <div class="vz-caption">${T('objetivo', 'target')} <b>${st.target}</b>${st.answer !== undefined ? ` · ${T('respuesta', 'answer')} <b>${st.answer}</b>` : ''}</div>`;
    },
    learn: {
      idea: T(`<p>Como el arreglo está ordenado, mirar el elemento del medio alcanza para saber de qué lado <strong>no</strong> puede estar el objetivo. Si el del medio es menor, todo lo que está a su izquierda también lo es, y se descarta completo.</p>
             <p>Cada comparación deja la mitad del rango. Con un millón de elementos bastan unas 20 comparaciones.</p>`, `<p>Since the array is sorted, looking at the middle element is enough to know which side the target <strong>cannot</strong> be on. If the middle one is smaller, everything to its left is smaller too, and the whole half is discarded.</p>
             <p>Each comparison leaves half of the range. With a million elements, about 20 comparisons are enough.</p>`),
      signals: [T('Los datos están <strong>ordenados</strong>, o hay una condición que pasa de falsa a verdadera una sola vez.', 'The data is <strong>sorted</strong>, or there is a condition that flips from false to true only once.'), T('Te piden algo mejor que O(n) para buscar.', 'You are asked for something better than O(n) to search.'), T('Puedes decidir con una sola comparación qué mitad descartar.', 'With a single comparison you can decide which half to discard.')],
      time: 'O(log n)', space: 'O(1)',
      why: T('El rango se parte a la mitad en cada vuelta: después de k vueltas quedan n / 2ᵏ candidatos.', 'The range is cut in half on every iteration: after k iterations, n / 2ᵏ candidates remain.')
    },
    build: {
      template: T(`def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:              # rango cerrado [lo, hi]
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1         # mid ya no sirve
        else:
            hi = mid - 1
    return -1`, `def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:              # closed range [lo, hi]
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1         # mid is no longer useful
        else:
            hi = mid - 1
    return -1`),
      tips: [T('Decide qué significan <b>lo</b> y <b>hi</b> (aquí, un rango cerrado) y respétalo en el <code>while</code> y en las dos actualizaciones. Casi todos los errores vienen de mezclar convenciones.', 'Decide what <b>lo</b> and <b>hi</b> mean (here, a closed range) and stick to it in the <code>while</code> and in both updates. Almost every bug comes from mixing conventions.'), T('Siempre mueve el límite <strong>más allá</strong> de mid (<code>mid + 1</code> o <code>mid - 1</code>). Si no, el ciclo puede quedarse pegado.', 'Always move the bound <strong>past</strong> mid (<code>mid + 1</code> or <code>mid - 1</code>). Otherwise the loop can get stuck.'), T('En lenguajes con enteros de tamaño fijo, <code>lo + (hi - lo) // 2</code> evita el desbordamiento. Menciónalo aunque en Python no haga falta.', 'In languages with fixed-size integers, <code>lo + (hi - lo) // 2</code> avoids overflow. Mention it even though Python does not need it.')],
      similar: [T('Primera y última posición de un número repetido.', 'First and last position of a repeated number.'), T('Buscar en un arreglo ordenado que fue rotado.', 'Search in a sorted array that was rotated.'), T('La raíz cuadrada entera de un número (búsqueda binaria sobre la respuesta).', 'The integer square root of a number (binary search on the answer).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const stock = {
    id: 'best-time-stock',
    title: T('Mejor día para comprar y vender', 'Best day to buy and sell'),
    difficulty: T('Fácil', 'Easy'),
    pattern: T('Una pasada con mínimo', 'One pass with a running minimum'),
    statement: T('<p>Cada número es el precio de una acción en un día. Puedes comprar <strong>una vez</strong> y vender una vez en un día posterior. ¿Cuál es la mayor ganancia posible? Si nunca conviene, la respuesta es 0.</p>', '<p>Each number is the price of a stock on one day. You can buy <strong>once</strong> and sell once on a later day. What is the largest possible profit? If it never pays off, the answer is 0.</p>'),
    lang: 'python',
    code: [
      'def max_profit(prices):',
      '    lowest = prices[0]',
      '    best = 0',
      '    for p in prices[1:]:',
      '        if p < lowest:',
      '            lowest = p',
      '        else:',
      '            best = max(best, p - lowest)',
      '    return best'
    ],
    presets: ['[7, 1, 5, 3, 6, 4]', '[9, 7, 4, 3, 1]', '[3, 8, 2, 5, 11, 6]'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && isNumArr(a[0]), T('Escribe una lista de precios, por ejemplo: [7, 1, 5, 3, 6, 4]', 'Write a list of prices, for example: [7, 1, 5, 3, 6, 4]'));
      need(a[0].length >= 2 && a[0].length <= 14, T('Usa entre 2 y 14 precios.', 'Use between 2 and 14 prices.'));
      need(a[0].every((x) => Number.isInteger(x) && x >= 0 && x <= 30), T('Usa precios enteros entre 0 y 30.', 'Use integer prices between 0 and 30.'));
      return { prices: a[0] };
    },
    trace({ prices }) {
      const rec = new Recorder();
      let lowest = prices[0], best = 0, i = 0, p, lowIdx = 0, buy = null, sell = null;
      const V = (extra = {}) => ({ prices, i, lowIdx, lowest, best, buy, sell, ...extra });
      const vars = () => (p === undefined ? { lowest, best } : { p, lowest, best });
      rec.step(2, { lowest }, V(), T(`El precio más bajo que conocemos es el del día 0: ${lowest}.`, `The lowest price we know is the one on day 0: ${lowest}.`));
      rec.step(3, vars(), V(), T('Todavía no hay ganancia: best = 0. Si los precios solo bajan, se queda así.', 'There is no profit yet: best = 0. If prices only go down, it stays that way.'));
      for (i = 1; i < prices.length; i++) {
        p = prices[i];
        rec.step(4, vars(), V(), T(`Día ${i}: el precio es ${p}.`, `Day ${i}: the price is ${p}.`));
        if (p < lowest) {
          rec.step(5, vars(), V(), T(`${p} &lt; ${lowest}: es el precio más barato que hemos visto.`, `${p} &lt; ${lowest}: it is the cheapest price we have seen.`));
          lowest = p; lowIdx = i;
          rec.step(6, vars(), V(), T('Lo guardamos como el mejor día para comprar de aquí en adelante. Vender hoy no dejaría ganancia.', 'We keep it as the best day to buy from here on. Selling today would leave no profit.'));
        } else {
          rec.step(5, vars(), V(), T(`${p} no es menor que ${lowest}: no es un mejor día para comprar.`, `${p} is not less than ${lowest}: it is not a better day to buy.`));
          rec.step(7, vars(), V(), T('Entonces vemos cuánto ganaríamos si vendiéramos hoy.', 'So we check how much we would earn if we sold today.'));
          const gain = p - lowest;
          const improved = gain > best;
          if (improved) { best = gain; buy = lowIdx; sell = i; }
          rec.step(8, vars(), V({ gain }), improved
            ? T(`Vender hoy deja ${p} − ${lowest} = <b>${gain}</b>. ¡Nuevo récord!`, `Selling today earns ${p} − ${lowest} = <b>${gain}</b>. New record!`)
            : T(`Vender hoy deja ${p} − ${lowest} = ${gain}, que no supera best = ${best}.`, `Selling today earns ${p} − ${lowest} = ${gain}, which does not beat best = ${best}.`));
        }
      }
      i = prices.length - 1;
      rec.step(9, vars(), V({ done: true, answer: best }), best
        ? T(`La mayor ganancia es <b>${best}</b>: comprar el día ${buy} (a ${prices[buy]}) y vender el día ${sell} (a ${prices[sell]}).`, `The largest profit is <b>${best}</b>: buy on day ${buy} (at ${prices[buy]}) and sell on day ${sell} (at ${prices[sell]}).`)
        : T('Nunca convino vender: la mayor ganancia es <b>0</b>.', 'Selling never paid off: the largest profit is <b>0</b>.'));
      return rec.frames;
    },
    render(st) {
      const ptr = {}; const state = {};
      if (st.done) {
        st.prices.forEach((_, j) => { if (j !== st.buy && j !== st.sell) state[j] = 'dim'; });
      } else {
        put(ptr, st.lowIdx, 'min');
        if (st.i > 0) { put(ptr, st.i, 'i'); state[st.i] = 'cur'; }
      }
      const deal = st.buy === null ? '' : T(` · comprar el día <b>${st.buy}</b>, vender el día <b>${st.sell}</b>`, ` · buy on day <b>${st.buy}</b>, sell on day <b>${st.sell}</b>`);
      return viz.bars(st.prices, { ptr, state, levels: st.done ? [] : [{ value: st.lowest, label: 'lowest', color: 'mint' }] }) +
        `<div class="vz-caption">${T('mejor ganancia', 'best profit')} <b>${st.best}</b>${deal}</div>`;
    },
    learn: {
      idea: T(`<p>Si decides vender hoy, lo mejor que pudiste hacer fue comprar en el día <strong>más barato de todos los anteriores</strong>. Entonces basta con recordar ese mínimo mientras avanzas.</p>
             <p>En cada día haces una de dos cosas: si el precio es un nuevo mínimo, lo guardas; si no, calculas la ganancia de vender hoy y te quedas con la mejor.</p>`, `<p>If you decide to sell today, the best you could have done was to buy on the <strong>cheapest of all the previous days</strong>. So it is enough to remember that minimum as you go.</p>
             <p>On each day you do one of two things: if the price is a new minimum, you keep it; if not, you compute the profit of selling today and keep the best one.</p>`),
      signals: [T('Buscas la mayor diferencia entre dos elementos donde <strong>el orden importa</strong> (primero uno, después el otro).', 'You are looking for the largest difference between two elements where <strong>order matters</strong> (first one, then the other).'), T('La fuerza bruta compara todos los pares de días (O(n²)).', 'Brute force compares every pair of days (O(n²)).'), T('Lo que necesitas del pasado se resume en un solo número: el mínimo, el máximo o una suma.', 'What you need from the past fits in a single number: the minimum, the maximum or a sum.')],
      time: 'O(n)', space: 'O(1)',
      why: T('Una sola pasada, y de todo lo anterior solo se guardan dos números: el mínimo y la mejor ganancia.', 'A single pass, and of everything before you only keep two numbers: the minimum and the best profit.')
    },
    build: {
      template: T(`def una_pasada(valores):
    resumen = valores[0]        # lo único que recuerdo del pasado
    mejor = 0
    for x in valores[1:]:
        mejor = max(mejor, combinar(x, resumen))
        resumen = actualizar(resumen, x)
    return mejor`, `def one_pass(values):
    summary = values[0]         # the only thing I remember from the past
    best = 0
    for x in values[1:]:
        best = max(best, combine(x, summary))
        summary = update(summary, x)
    return best`),
      tips: [T('Aclara las reglas: ¿una sola compra y una sola venta?, ¿se puede vender el mismo día? Cambian el problema por completo.', 'Clarify the rules: a single buy and a single sell? Can you sell on the same day? They change the problem completely.'), T('No sirve restar el máximo menos el mínimo de todo el arreglo: el mínimo podría venir <strong>después</strong> del máximo.', 'Subtracting the minimum from the maximum of the whole array does not work: the minimum might come <strong>after</strong> the maximum.'), T('Si los precios solo bajan, la respuesta es 0 (no comprar), no un número negativo.', 'If prices only go down, the answer is 0 (do not buy), not a negative number.')],
      similar: [T('Comprar y vender varias veces (sumar cada subida).', 'Buy and sell several times (add up every rise).'), T('Subarreglo de suma máxima (algoritmo de Kadane).', 'Maximum subarray sum (Kadane\'s algorithm).'), T('El contenedor con más agua (en esta misma estación).', 'Container with most water (in this same station).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const tuple = (p) => `(${p[0]}, ${p[1]})`;
  const key = (r, c) => `${r},${c}`;
  const DIRS = [[1, 0, T('Abajo', 'Below')], [-1, 0, T('Arriba', 'Above')], [0, 1, T('A la derecha', 'To the right')], [0, -1, T('A la izquierda', 'To the left')]];

  const islands = {
    id: 'number-of-islands',
    title: T('Contar islas', 'Number of islands'),
    difficulty: T('Media', 'Medium'),
    pattern: T('Recorrido de matriz (DFS)', 'Grid traversal (DFS)'),
    statement: T('<p>La matriz es un mapa: un <code>1</code> es tierra y un <code>0</code> es agua. Una <strong>isla</strong> es un grupo de celdas de tierra pegadas por arriba, abajo, izquierda o derecha (en diagonal no cuenta). ¿Cuántas islas hay en total?</p>', '<p>The grid is a map: a <code>1</code> is land and a <code>0</code> is water. An <strong>island</strong> is a group of land cells connected up, down, left or right (diagonals do not count). How many islands are there in total?</p>'),
    lang: 'python',
    code: [
      'def count_islands(grid):',
      '    rows, cols = len(grid), len(grid[0])',
      '    count = 0',
      '    for r in range(rows):',
      '        for c in range(cols):',
      '            if grid[r][c] == 1:',
      '                count += 1',
      '                stack = [(r, c)]',
      '                grid[r][c] = 0',
      '                while stack:',
      '                    i, j = stack.pop()',
      '                    for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):',
      '                        ni, nj = i + di, j + dj',
      '                        if 0 <= ni < rows and 0 <= nj < cols and grid[ni][nj] == 1:',
      '                            grid[ni][nj] = 0',
      '                            stack.append((ni, nj))',
      '    return count'
    ],
    presets: ['[[1, 1, 0, 0], [0, 1, 0, 1], [0, 0, 0, 1]]', '[[1, 0, 0], [0, 1, 0], [0, 0, 1]]', '[[1, 1, 0, 1, 1], [1, 0, 0, 0, 1], [0, 0, 1, 0, 0], [1, 0, 1, 1, 0]]'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && Array.isArray(a[0]) && a[0].length >= 1 && a[0].every((row) => Array.isArray(row) && row.length >= 1),
        T('Escribe el mapa como una lista de filas, por ejemplo: [[1, 1, 0], [0, 1, 0], [0, 0, 1]]', 'Write the map as a list of rows, for example: [[1, 1, 0], [0, 1, 0], [0, 0, 1]]'));
      need(a[0].every((row) => row.length === a[0][0].length), T('Todas las filas tienen que tener la misma cantidad de columnas.', 'All rows must have the same number of columns.'));
      need(a[0].length <= 6 && a[0][0].length <= 8, T('Usa un mapa de 6 filas por 8 columnas como máximo, para que se vea bien.', 'Use a map of at most 6 rows by 8 columns, so it displays well.'));
      need(a[0].every((row) => row.every((x) => x === 0 || x === 1 || x === '0' || x === '1')), T('Cada celda tiene que ser 1 (tierra) o 0 (agua).', 'Each cell has to be 1 (land) or 0 (water).'));
      return { grid: a[0].map((row) => row.map(Number)) };
    },
    trace({ grid }) {
      const rec = new Recorder();
      const g = grid.map((row) => row.slice());
      const rows = g.length, cols = g[0].length;
      const isl = {};
      let count = 0, r, c, i, j, ni, nj, stack = null;
      const V = (extra = {}) => ({ g, isl, count, stack, ...extra });
      const vars = () => {
        const v = { rows, cols, count };
        if (r !== undefined) v.r = r;
        if (c !== undefined) v.c = c;
        if (stack) v.stack = stack.map((p) => `§${tuple(p)}`);
        if (i !== undefined) { v.i = i; v.j = j; }
        if (ni !== undefined) { v.ni = ni; v.nj = nj; }
        return v;
      };
      rec.step(2, { rows, cols }, V(), T(`El mapa tiene ${rows === 1 ? '1 fila' : `${rows} filas`} y ${cols === 1 ? '1 columna' : `${cols} columnas`}. Un 1 es tierra y un 0 es agua.`, `The map has ${rows === 1 ? '1 row' : `${rows} rows`} and ${cols === 1 ? '1 column' : `${cols} columns`}. A 1 is land and a 0 is water.`));
      rec.step(3, vars(), V(), T('Todavía no hemos encontrado ninguna isla.', 'We have not found any island yet.'));
      for (r = 0; r < rows; r++) {
        rec.step(4, vars(), V(), T(`Recorremos la fila ${r}, celda por celda, de izquierda a derecha.`, `We walk row ${r}, cell by cell, from left to right.`));
        for (c = 0; c < cols; c++) {
          const scan = [r, c];
          if (g[r][c] !== 1) {
            const seen = isl[key(r, c)];
            rec.step(6, vars(), V({ scan }), seen !== undefined
              ? T(`(${r}, ${c}) ahora vale 0: era tierra de la isla ${seen + 1}, que ya contamos. No la contamos otra vez.`, `(${r}, ${c}) is now 0: it was land of island ${seen + 1}, which we already counted. We do not count it again.`)
              : T(`(${r}, ${c}) es agua: seguimos.`, `(${r}, ${c}) is water: we keep going.`));
            continue;
          }
          rec.step(6, vars(), V({ scan }), T(`(${r}, ${c}) es tierra que nadie ha visitado: <b>es una isla nueva</b>.`, `(${r}, ${c}) is land nobody has visited: <b>it is a new island</b>.`));
          count += 1;
          rec.step(7, vars(), V({ scan }), T(`La contamos: count = <b>${count}</b>.`, `We count it: count = <b>${count}</b>.`));
          stack = [[r, c]];
          rec.step(8, vars(), V({ scan }), T(`Ahora hay que recorrerla completa para no contarla dos veces. Empezamos una pila con (${r}, ${c}).`, `Now we have to walk the whole island so we do not count it twice. We start a stack with (${r}, ${c}).`));
          g[r][c] = 0; isl[key(r, c)] = count - 1;
          rec.step(9, vars(), V({ scan }), T('La ponemos en 0 (la "hundimos") para marcarla como visitada. El color muestra a qué isla pertenece.', 'We set it to 0 (we "sink" it) to mark it as visited. The color shows which island it belongs to.'));
          while (true) {
            if (!stack.length) {
              rec.step(10, vars(), V({ scan }), T(`La pila quedó vacía: ya recorrimos toda la isla ${count}. Seguimos buscando desde donde íbamos.`, `The stack is empty: we have walked all of island ${count}. We keep searching from where we were.`));
              break;
            }
            rec.step(10, vars(), V({ scan }), stack.length === 1 ? T('Queda 1 celda pendiente en la pila.', '1 cell is still pending on the stack.') : T(`Quedan ${stack.length} celdas pendientes en la pila.`, `${stack.length} cells are still pending on the stack.`));
            [i, j] = stack.pop();
            const pop = [i, j];
            rec.step(11, vars(), V({ scan, pop }), T(`Sacamos (${i}, ${j}) de la pila.`, `We pop (${i}, ${j}) from the stack.`));
            rec.step(12, vars(), V({ scan, pop }), T('Revisamos sus cuatro vecinas: abajo, arriba, derecha e izquierda. Las diagonales no cuentan.', 'We check its four neighbors: below, above, right and left. Diagonals do not count.'));
            DIRS.forEach(([di, dj, name]) => {
              ni = i + di; nj = j + dj;
              const inside = ni >= 0 && ni < rows && nj >= 0 && nj < cols;
              if (inside && g[ni][nj] === 1) {
                const look = [ni, nj];
                rec.step(14, vars(), V({ scan, pop, look }), T(`${name} está (${ni}, ${nj}), que es tierra sin visitar: es parte de esta misma isla.`, `${name} is (${ni}, ${nj}), unvisited land: it is part of this same island.`));
                g[ni][nj] = 0; isl[key(ni, nj)] = count - 1;
                rec.step(15, vars(), V({ scan, pop, look }), T('La hundimos de una vez, para que ninguna otra vecina la vuelva a agregar.', 'We sink it right away, so no other neighbor adds it again.'));
                stack.push([ni, nj]);
                rec.step(16, vars(), V({ scan, pop, look }), T('Y la apilamos: más adelante revisaremos a sus vecinas.', 'And we push it: later we will check its neighbors.'));
              } else if (!inside) {
                rec.step(14, vars(), V({ scan, pop }), T(`${name} nos saldríamos del mapa: (${ni}, ${nj}) no existe.`, `${name}, we would step off the map: (${ni}, ${nj}) does not exist.`));
              } else {
                rec.step(14, vars(), V({ scan, pop, look: [ni, nj] }), isl[key(ni, nj)] !== undefined
                  ? T(`${name} está (${ni}, ${nj}), que ya hundimos.`, `${name} is (${ni}, ${nj}), which we already sank.`)
                  : T(`${name} está (${ni}, ${nj}), que es agua.`, `${name} is (${ni}, ${nj}), which is water.`));
              }
            });
          }
        }
      }
      rec.step(17, vars(), V({ done: true, answer: count }), T(`Recorrimos todo el mapa. ${count === 1 ? 'Hay <b>1</b> isla' : `Hay <b>${count}</b> islas`}.`, `We walked the whole map. ${count === 1 ? 'There is <b>1</b> island' : `There are <b>${count}</b> islands`}.`));
      return rec.frames;
    },
    render(st) {
      const state = {};
      st.g.forEach((row, r) => row.forEach((v, c) => { state[key(r, c)] = st.isl[key(r, c)] !== undefined ? '' : v === 1 ? 'land' : 'water'; }));
      const add = (p, cls) => { if (p) state[key(p[0], p[1])] += ` ${cls}`; };
      add(st.scan, 'cur'); add(st.pop, 'pop'); add(st.look, 'look');
      return viz.grid(st.g, { state, group: st.isl }) +
        (st.stack ? viz.list(st.stack.map(tuple), { title: 'stack', hiLast: true }) : '') +
        `<div class="vz-caption">${T('islas encontradas', 'islands found')} <b>${st.count}</b></div>
        <div class="vz-legend"><span><i class="lg-land"></i>${T('tierra sin visitar', 'unvisited land')}</span><span><i class="lg-water"></i>${T('agua', 'water')}</span><span><i class="lg-sunk"></i>${T('isla ya contada', 'island already counted')}</span></div>`;
    },
    learn: {
      idea: T(`<p>Recorremos el mapa celda por celda. Cada vez que aparece tierra que nadie ha visitado, encontramos una isla nueva: sumamos uno y, antes de seguir, <strong>recorremos esa isla completa</strong> marcando todas sus celdas.</p>
             <p>Ese recorrido es un "relleno por inundación": desde una celda saltamos a sus vecinas de tierra, de ahí a las vecinas de ellas, y así hasta que no quede ninguna. Como cada celda queda marcada, ninguna isla se cuenta dos veces.</p>`, `<p>We walk the map cell by cell. Every time we find land nobody has visited, we have found a new island: we add one and, before moving on, <strong>we walk that whole island</strong>, marking all its cells.</p>
             <p>That walk is a "flood fill": from one cell we jump to its land neighbors, from there to their neighbors, and so on until none are left. Since every cell gets marked, no island is counted twice.</p>`),
      signals: [T('La entrada es una <strong>matriz</strong> y te preguntan por regiones o grupos de celdas conectadas.', 'The input is a <strong>grid</strong> and you are asked about regions or groups of connected cells.'), T('Las celdas vecinas funcionan como las aristas de un grafo, aunque nadie lo dibuje así.', 'Neighboring cells work like the edges of a graph, even if nobody draws it that way.'), T('Necesitas marcar lo ya visitado para no dar vueltas en círculo.', 'You need to mark what you have visited so you do not go around in circles.')],
      time: T('O(filas × columnas)', 'O(rows × columns)'), space: T('O(filas × columnas)', 'O(rows × columns)'),
      why: T('Cada celda se hunde una sola vez y se le revisan cuatro vecinas. En el peor caso (todo tierra) la pila puede guardar casi todas las celdas.', 'Each cell is sunk only once and its four neighbors are checked. In the worst case (all land) the stack can hold almost every cell.')
    },
    build: {
      template: T(`def recorrer_regiones(grid):
    rows, cols = len(grid), len(grid[0])
    visto = set()
    regiones = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1 and (r, c) not in visto:
                regiones += 1
                pendientes = [(r, c)]
                visto.add((r, c))
                while pendientes:
                    i, j = pendientes.pop()        # pop(0) o deque: BFS
                    for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ni, nj = i + di, j + dj
                        if (0 <= ni < rows and 0 <= nj < cols
                                and grid[ni][nj] == 1 and (ni, nj) not in visto):
                            visto.add((ni, nj))
                            pendientes.append((ni, nj))
    return regiones`, `def walk_regions(grid):
    rows, cols = len(grid), len(grid[0])
    seen = set()
    regions = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1 and (r, c) not in seen:
                regions += 1
                pending = [(r, c)]
                seen.add((r, c))
                while pending:
                    i, j = pending.pop()           # pop(0) or deque: BFS
                    for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ni, nj = i + di, j + dj
                        if (0 <= ni < rows and 0 <= nj < cols
                                and grid[ni][nj] == 1 and (ni, nj) not in seen):
                            seen.add((ni, nj))
                            pending.append((ni, nj))
    return regions`),
      templateTitle: T('Plantilla sin modificar la matriz (con un conjunto de visitados)', 'Template that does not modify the grid (with a visited set)'),
      tips: [T('Pregunta si puedes <strong>modificar la matriz</strong>. Si no, usa un conjunto de visitados como en la plantilla.', 'Ask whether you may <strong>modify the grid</strong>. If not, use a visited set as in the template.'), T('Marca la celda cuando la <strong>agregas</strong> a la pila, no cuando la sacas. Si no, la misma celda puede entrar varias veces.', 'Mark the cell when you <strong>push</strong> it onto the stack, not when you pop it. Otherwise the same cell can go in several times.'), T('DFS con pila o BFS con cola dan el mismo resultado aquí. La versión recursiva es más corta, pero en un mapa grande puede agotar la pila de llamadas: menciónalo.', 'DFS with a stack or BFS with a queue give the same result here. The recursive version is shorter, but on a big map it can exhaust the call stack: mention it.'), T('Confirma si las diagonales conectan. Normalmente no; si sí, son ocho vecinas en vez de cuatro.', 'Confirm whether diagonals connect. Usually they do not; if they do, there are eight neighbors instead of four.')],
      similar: [T('El área de la isla más grande (cuenta celdas mientras inundas).', 'Area of the largest island (count cells as you flood).'), T('Rellenar una región con un color nuevo (el "balde de pintura").', 'Fill a region with a new color (the "paint bucket").'), T('Naranjas que se pudren minuto a minuto (BFS desde varias celdas a la vez).', 'Oranges rotting minute by minute (BFS from several cells at once).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const showCost = (v) => (v === Infinity ? '∞' : String(v));

  const coinChange = {
    id: 'coin-change',
    title: T('Cambio con menos monedas', 'Coin change with fewest coins'),
    difficulty: T('Media', 'Medium'),
    pattern: T('Programación dinámica', 'Dynamic programming'),
    statement: T('<p>Tienes monedas de ciertos valores, todas las que quieras de cada una. ¿Cuál es la <strong>menor cantidad de monedas</strong> que suma exactamente <code>amount</code>? Si no hay forma de lograrlo, devuelve <code>-1</code>.</p>', '<p>You have coins of certain values, as many of each as you want. What is the <strong>fewest number of coins</strong> that adds up to exactly <code>amount</code>? If there is no way to do it, return <code>-1</code>.</p>'),
    lang: 'python',
    code: [
      'def coin_change(coins, amount):',
      "    dp = [0] + [float('inf')] * amount",
      '    for a in range(1, amount + 1):',
      '        for coin in coins:',
      '            if coin <= a and dp[a - coin] + 1 < dp[a]:',
      '                dp[a] = dp[a - coin] + 1',
      "    return dp[amount] if dp[amount] != float('inf') else -1"
    ],
    presets: ['[1, 3, 4], 6', '[2, 5], 9', '[4, 5], 7'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 2 && isNumArr(a[0]) && typeof a[1] === 'number', T('Escribe las monedas y el monto, por ejemplo: [1, 3, 4], 6', 'Write the coins and the amount, for example: [1, 3, 4], 6'));
      need(a[0].length >= 1 && a[0].length <= 4 && a[0].every((x) => Number.isInteger(x) && x >= 1 && x <= 12) && new Set(a[0]).size === a[0].length,
        T('Usa entre 1 y 4 monedas distintas, con valores enteros entre 1 y 12.', 'Use between 1 and 4 different coins, with integer values between 1 and 12.'));
      need(Number.isInteger(a[1]) && a[1] >= 1 && a[1] <= 12, T('Usa un monto entero entre 1 y 12.', 'Use an integer amount between 1 and 12.'));
      return { coins: a[0], amount: a[1] };
    },
    trace({ coins, amount }) {
      const rec = new Recorder();
      const dp = [0].concat(Array(amount).fill(Infinity));
      let a, coin;
      const V = (extra = {}) => ({ coins, amount, dp: dp.map(showCost), ...extra });
      const vars = () => {
        const v = { coins, amount };
        if (a !== undefined) v.a = a;
        if (coin !== undefined) v.coin = coin;
        v.dp = dp.map((x) => (x === Infinity ? '§inf' : x));
        return v;
      };
      rec.step(2, vars(), V(), T('dp[x] va a guardar la menor cantidad de monedas para formar x. Formar 0 cuesta 0 monedas; lo demás todavía no sabemos cómo formarlo (∞).', 'dp[x] will store the fewest coins needed to make x. Making 0 costs 0 coins; we do not yet know how to make the rest (∞).'));
      for (a = 1; a <= amount; a++) {
        rec.step(3, vars(), V({ a }), T(`Resolvemos el monto <b>${a}</b> apoyándonos en los montos más pequeños, que ya están resueltos.`, `We solve the amount <b>${a}</b> using the smaller amounts, which are already solved.`));
        for (const cn of coins) {
          coin = cn;
          const rest = a - coin;
          rec.step(4, vars(), V({ a, coin }), T(`Probamos que la última moneda sea una de ${coin}.`, `We try making the last coin a ${coin}.`));
          if (coin > a) {
            rec.step(5, vars(), V({ a, coin }), T(`La moneda de ${coin} es más grande que ${a}: no cabe.`, `The ${coin} coin is bigger than ${a}: it does not fit.`));
          } else if (dp[rest] === Infinity) {
            rec.step(5, vars(), V({ a, coin, from: rest }), T(`Faltaría formar ${rest}, y eso no se puede (dp[${rest}] = ∞): esta moneda no ayuda.`, `We would still need to make ${rest}, and that is impossible (dp[${rest}] = ∞): this coin does not help.`));
          } else if (dp[rest] + 1 < dp[a]) {
            rec.step(5, vars(), V({ a, coin, from: rest }), T(`Faltaría formar ${rest}, que cuesta ${dp[rest]}. Con esta moneda serían ${dp[rest] + 1}, mejor que ${showCost(dp[a])}.`, `We would still need to make ${rest}, which costs ${dp[rest]}. With this coin it would be ${dp[rest] + 1}, better than ${showCost(dp[a])}.`));
            dp[a] = dp[rest] + 1;
            rec.step(6, vars(), V({ a, coin, from: rest, improved: true }), T(`Anotamos dp[${a}] = <b>${dp[a]}</b>.`, `We write down dp[${a}] = <b>${dp[a]}</b>.`));
          } else {
            rec.step(5, vars(), V({ a, coin, from: rest }), T(`Faltaría formar ${rest}, que cuesta ${dp[rest]}. Con esta moneda serían ${dp[rest] + 1}, que no mejora el ${dp[a]} que ya tenemos.`, `We would still need to make ${rest}, which costs ${dp[rest]}. With this coin it would be ${dp[rest] + 1}, which does not beat the ${dp[a]} we already have.`));
          }
        }
      }
      const answer = dp[amount] === Infinity ? -1 : dp[amount];
      rec.step(7, vars(), V({ done: true, answer }), answer === -1
        ? T(`dp[${amount}] sigue en ∞: no hay forma de armar ${amount} con estas monedas. Devolvemos <b>-1</b>.`, `dp[${amount}] is still ∞: there is no way to make ${amount} with these coins. We return <b>-1</b>.`)
        : T(`La respuesta está en dp[${amount}]: ${answer === 1 ? 'basta <b>1</b> moneda' : `se necesitan <b>${answer}</b> monedas`}.`, `The answer is in dp[${amount}]: ${answer === 1 ? '<b>1</b> coin is enough' : `<b>${answer}</b> coins are needed`}.`));
      return rec.frames;
    },
    render(st) {
      const state = {}; const ptr = {};
      if (st.done) {
        state[st.amount] = st.answer === -1 ? 'bad' : 'ok';
      } else {
        st.dp.forEach((_, x) => { if (st.a !== undefined && x > st.a) state[x] = 'dim'; });
        if (st.a !== undefined) { state[st.a] = st.improved ? 'ok' : 'cur'; put(ptr, st.a, 'a'); }
        if (st.from !== undefined) { state[st.from] = 'win'; put(ptr, st.from, T('resto', 'rest')); }
      }
      const chips = st.coins.map((cn) => `<span class="vz-kv ${cn === st.coin ? 'hi' : ''}">${cn}</span>`).join('');
      return `<div class="vz-map"><span class="vz-label">coins</span>${chips}</div>
        ${viz.cells(st.dp, { ptr, state })}
        <div class="vz-caption">${T('dp[x] = menos monedas para formar x', 'dp[x] = fewest coins to make x')}${st.done ? ` · ${T('respuesta', 'answer')} <b>${st.answer}</b>` : ''}</div>`;
    },
    learn: {
      idea: T(`<p>Tomar siempre la moneda más grande no funciona: con monedas de 1, 3 y 4, para formar 6 ese atajo da 4 + 1 + 1 (tres monedas), pero 3 + 3 usa solo dos.</p>
             <p>La idea es fijarse en la <strong>última moneda</strong>. Si es de valor c, antes de ponerla había que formar <code>a − c</code> de la mejor manera posible, y eso es un problema más pequeño que ya resolvimos. Llenamos una tabla desde 0 hasta el monto, probando cada moneda como la última.</p>`, `<p>Always taking the biggest coin does not work: with coins of 1, 3 and 4, to make 6 that shortcut gives 4 + 1 + 1 (three coins), but 3 + 3 uses only two.</p>
             <p>The idea is to focus on the <strong>last coin</strong>. If its value is c, before adding it you had to make <code>a − c</code> in the best possible way, and that is a smaller problem we already solved. We fill a table from 0 up to the amount, trying each coin as the last one.</p>`),
      signals: [T('Te piden un <strong>mínimo, un máximo o una cantidad de formas</strong>, y probar todas las combinaciones explota.', 'You are asked for a <strong>minimum, a maximum or a number of ways</strong>, and trying every combination blows up.'), T('La respuesta de un tamaño se arma con respuestas de tamaños más pequeños.', 'The answer for one size is built from the answers for smaller sizes.'), T('Los mismos subproblemas se repiten una y otra vez (formar 3, formar 2…).', 'The same subproblems come up again and again (make 3, make 2…).')],
      time: T('O(monto × monedas)', 'O(amount × coins)'), space: T('O(monto)', 'O(amount)'),
      why: T('La tabla tiene monto + 1 casillas y, para llenar cada una, se prueba cada moneda una vez.', 'The table has amount + 1 cells and, to fill each one, every coin is tried once.')
    },
    build: {
      template: T(`def dp_de_abajo_hacia_arriba(opciones, objetivo):
    dp = [caso_base] + [PEOR] * objetivo      # dp[x] = mejor respuesta para x
    for x in range(1, objetivo + 1):
        for op in opciones:
            if op <= x:
                dp[x] = mejor(dp[x], dp[x - op] + costo(op))
    return dp[objetivo] if dp[objetivo] != PEOR else -1`, `def bottom_up_dp(options, target):
    dp = [base_case] + [WORST] * target       # dp[x] = best answer for x
    for x in range(1, target + 1):
        for op in options:
            if op <= x:
                dp[x] = better(dp[x], dp[x - op] + cost(op))
    return dp[target] if dp[target] != WORST else -1`),
      tips: [T('Antes de escribir código, di en una frase <strong>qué significa dp[x]</strong>. Si no puedes decirlo, todavía no tienes la solución.', 'Before writing code, say in one sentence <strong>what dp[x] means</strong>. If you cannot say it, you do not have the solution yet.'), T('Muestra con un ejemplo por qué el atajo de "la moneda más grande primero" falla: eso justifica usar programación dinámica.', 'Show with an example why the "biggest coin first" shortcut fails: that justifies using dynamic programming.'), T('Cuida el caso sin solución: usa un valor imposible (infinito o monto + 1) y conviértelo en -1 al final.', 'Handle the no-solution case: use an impossible value (infinity or amount + 1) and turn it into -1 at the end.'), T('La versión recursiva con memoria es equivalente; la tabla evita el límite de recursión.', 'The recursive version with memoization is equivalent; the table avoids the recursion limit.')],
      similar: [T('¿De cuántas formas distintas se puede dar el cambio?', 'In how many different ways can you make change?'), T('Subir una escalera dando pasos de 1 o 2 escalones.', 'Climb a staircase taking steps of 1 or 2 stairs.'), T('Menor cantidad de cuadrados perfectos que suman n.', 'Fewest perfect squares that add up to n.')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const largestRectangle = {
    id: 'largest-rectangle',
    title: T('Rectángulo más grande del histograma', 'Largest rectangle in a histogram'),
    difficulty: T('Difícil', 'Hard'),
    pattern: T('Pila monótona', 'Monotonic stack'),
    statement: T('<p>Cada número es la altura de una barra de ancho 1, todas pegadas una a la otra. ¿Cuál es el área del <strong>rectángulo más grande</strong> que cabe completo dentro de las barras?</p>', '<p>Each number is the height of a bar of width 1, all placed side by side. What is the area of the <strong>largest rectangle</strong> that fits entirely inside the bars?</p>'),
    lang: 'python',
    code: [
      'def largest_rectangle(h):',
      '    stack = []',
      '    best = 0',
      '    for i, x in enumerate(h + [0]):',
      '        while stack and h[stack[-1]] >= x:',
      '            height = h[stack.pop()]',
      '            left = stack[-1] + 1 if stack else 0',
      '            best = max(best, height * (i - left))',
      '        stack.append(i)',
      '    return best'
    ],
    presets: ['[2, 1, 5, 6, 2, 3]', '[6, 2, 5, 4, 5, 1, 6]', '[1, 2, 3, 4, 5]'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && isNumArr(a[0]), T('Escribe una lista de alturas, por ejemplo: [2, 1, 5, 6, 2, 3]', 'Write a list of heights, for example: [2, 1, 5, 6, 2, 3]'));
      need(a[0].length >= 1 && a[0].length <= 12, T('Usa entre 1 y 12 barras.', 'Use between 1 and 12 bars.'));
      need(a[0].every((x) => Number.isInteger(x) && x >= 0 && x <= 12), T('Usa enteros entre 0 y 12.', 'Use integers between 0 and 12.'));
      return { h: a[0] };
    },
    trace({ h }) {
      const rec = new Recorder();
      const n = h.length;
      const stack = [];
      let best = 0, i, x, height, left, bestBox = null;
      const V = (extra = {}) => ({ h, i, stack, best: bestBox, ...extra });
      const vars = () => {
        const v = {};
        if (i !== undefined) { v.i = i; v.x = x; }
        v.stack = stack;
        if (height !== undefined) v.height = height;
        if (left !== undefined) v.left = left;
        v.best = best;
        return v;
      };
      rec.step(2, { stack }, V(), T('La pila guarda <b>índices</b> de barras con alturas de menor a mayor: son las barras que todavía pueden seguir estirándose hacia la derecha.', 'The stack stores <b>indices</b> of bars with heights from smallest to largest: they are the bars that can still keep stretching to the right.'));
      rec.step(3, vars(), V(), T('Todavía no hemos medido ningún rectángulo.', 'We have not measured any rectangle yet.'));
      for (i = 0; i <= n; i++) {
        x = i < n ? h[i] : 0;
        rec.step(4, vars(), V(), i < n
          ? T(`Llega la barra ${i}, de altura ${x}.`, `Bar ${i} arrives, with height ${x}.`)
          : T('Se acabaron las barras. Agregamos una barra imaginaria de altura 0 para obligar a salir a todas las que siguen en la pila.', 'We ran out of bars. We add an imaginary bar of height 0 to force out every bar still on the stack.'));
        while (true) {
          if (!stack.length) { rec.step(5, vars(), V(), T('La pila está vacía: no hay ninguna barra que cerrar.', 'The stack is empty: there is no bar to close.')); break; }
          const t = stack[stack.length - 1];
          if (!(h[t] >= x)) {
            rec.step(5, vars(), V(), T(`La barra del tope (índice ${t}, altura ${h[t]}) es más baja que ${x}: todavía puede estirarse hacia la derecha, así que se queda.`, `The bar on top (index ${t}, height ${h[t]}) is shorter than ${x}: it can still stretch to the right, so it stays.`));
            break;
          }
          rec.step(5, vars(), V({ kill: t }), h[t] === x
            ? T(`La barra del tope (índice ${t}) mide lo mismo que la que llega (${x}): la cerramos aquí, y la nueva continuará ese mismo rectángulo.`, `The bar on top (index ${t}) is as tall as the incoming one (${x}): we close it here, and the new one will continue that same rectangle.`)
            : T(`La barra del tope (índice ${t}, altura ${h[t]}) es más alta que ${x}: su rectángulo ya no puede estirarse más hacia la derecha.`, `The bar on top (index ${t}, height ${h[t]}) is taller than ${x}: its rectangle cannot stretch any further to the right.`));
          stack.pop();
          height = h[t];
          rec.step(6, vars(), V({ kill: t }), T(`La sacamos de la pila. Su altura, ${height}, es la altura del rectángulo que vamos a medir.`, `We pop it from the stack. Its height, ${height}, is the height of the rectangle we are about to measure.`));
          left = stack.length ? stack[stack.length - 1] + 1 : 0;
          const box = { l: left - 0.5, r: i - 0.5, h: height };
          rec.step(7, vars(), V({ kill: t, box }), stack.length
            ? T(`Hacia la izquierda, la primera barra más baja es la del nuevo tope (índice ${stack[stack.length - 1]}). El rectángulo empieza justo después: left = ${left}.`, `To the left, the first shorter bar is the new top (index ${stack[stack.length - 1]}). The rectangle starts right after it: left = ${left}.`)
            : T('La pila quedó vacía: no hay ninguna barra más baja a la izquierda, así que el rectángulo empieza en 0.', 'The stack is empty: there is no shorter bar to the left, so the rectangle starts at 0.'));
          const area = height * (i - left);
          const improved = area > best;
          if (improved) { best = area; bestBox = box; }
          rec.step(8, vars(), V({ kill: t, box }), T(`Ancho ${i - left} (${i - left === 1 ? `solo la barra ${left}` : `de la barra ${left} a la ${i - 1}`}) × altura ${height} = <b>${area}</b>. ${improved ? '¡Nuevo récord!' : `No supera el récord de ${best}.`}`, `Width ${i - left} (${i - left === 1 ? `only bar ${left}` : `from bar ${left} to ${i - 1}`}) × height ${height} = <b>${area}</b>. ${improved ? 'New record!' : `It does not beat the record of ${best}.`}`));
        }
        stack.push(i);
        rec.step(9, vars(), V(), i < n ? T(`Apilamos el índice ${i}: su rectángulo queda abierto.`, `We push index ${i}: its rectangle stays open.`) : T('Apilamos el índice de la barra imaginaria y con eso termina el recorrido.', 'We push the index of the imaginary bar, and that ends the pass.'));
      }
      i = n;
      rec.step(10, vars(), V({ done: true, answer: best }), T(`El rectángulo más grande tiene área <b>${best}</b>.`, `The largest rectangle has area <b>${best}</b>.`));
      return rec.frames;
    },
    render(st) {
      const ptr = {}; const state = {};
      const open = new Set(st.stack);
      if (!st.done) {
        st.h.forEach((_, j) => { if (st.i !== undefined && j < st.i && !open.has(j)) state[j] = 'dim'; });
        if (st.kill !== undefined) state[st.kill] = 'cur';
        if (st.i !== undefined && st.i < st.h.length) put(ptr, st.i, 'i');
      }
      const items = st.stack.map((j) => `${j}→${j < st.h.length ? st.h[j] : 0}`);
      return viz.bars(st.h, { ptr, state, box: st.box || null, best: st.best }) +
        viz.list(items, { title: T('stack (índice→altura)', 'stack (index→height)'), hiLast: true }) +
        `<div class="vz-legend"><span><i class="lg-box"></i>${T('rectángulo que medimos', 'rectangle being measured')}</span><span><i class="lg-best"></i>${T('mejor hasta ahora', 'best so far')}</span></div>`;
    },
    learn: {
      idea: T(`<p>Piensa en cada barra como la <strong>altura</strong> de un rectángulo. Ese rectángulo se estira hacia los lados mientras las barras vecinas sean al menos igual de altas, y se detiene en la primera barra más baja de cada lado.</p>
             <p>La pila guarda barras de menor a mayor. Cuando llega una barra más baja que el tope, ya conocemos los dos límites de la barra del tope: a la derecha, la que acaba de llegar; a la izquierda, la que queda debajo de ella en la pila. La sacamos y medimos su rectángulo.</p>`, `<p>Think of each bar as the <strong>height</strong> of a rectangle. That rectangle stretches sideways as long as the neighboring bars are at least as tall, and it stops at the first shorter bar on each side.</p>
             <p>The stack keeps bars from shortest to tallest. When a bar shorter than the top arrives, we already know both limits of the top bar: on the right, the one that just arrived; on the left, the one just below it on the stack. We pop it and measure its rectangle.</p>`),
      signals: [T('Para cada elemento necesitas el <strong>primer elemento menor (o mayor)</strong> a su izquierda y a su derecha.', 'For each element you need the <strong>first smaller (or larger) element</strong> to its left and to its right.'), T('La fuerza bruta estira cada barra hacia los lados (O(n²)).', 'Brute force stretches each bar sideways (O(n²)).'), T('Hay elementos que quedan "resueltos" en cuanto aparece uno más bajo.', 'Some elements become "solved" as soon as a shorter one shows up.')],
      time: 'O(n)', space: 'O(n)',
      why: T('Cada índice entra a la pila una vez y sale una vez, aunque haya un while dentro del for.', 'Each index enters the stack once and leaves once, even though there is a while inside the for.')
    },
    build: {
      template: T(`def pila_monotona(valores):
    stack = []                       # índices con valores crecientes
    for i, x in enumerate(valores + [CENTINELA]):
        while stack and valores[stack[-1]] >= x:
            j = stack.pop()
            izquierda = stack[-1] if stack else -1
            resolver(j, izquierda, i)    # límites de j: izquierda e i
        stack.append(i)`, `def monotonic_stack(values):
    stack = []                       # indices with increasing values
    for i, x in enumerate(values + [SENTINEL]):
        while stack and values[stack[-1]] >= x:
            j = stack.pop()
            left = stack[-1] if stack else -1
            solve(j, left, i)            # limits of j: left and i
        stack.append(i)`),
      tips: [T('Empieza por la fuerza bruta: para cada barra, estírala a los dos lados. Luego pregunta qué trabajo se repite.', 'Start with brute force: for each bar, stretch it to both sides. Then ask which work is repeated.'), T('La barra imaginaria de altura 0 al final evita escribir un segundo ciclo para vaciar la pila. Explica para qué está.', 'The imaginary bar of height 0 at the end saves you from writing a second loop to empty the stack. Explain what it is for.'), T('El ancho es <code>i - left</code>, no <code>i - j</code>: la barra que sacas puede estirarse hacia la izquierda sobre barras más altas que ya salieron.', 'The width is <code>i - left</code>, not <code>i - j</code>: the bar you pop can stretch to the left over taller bars that were already popped.'), T('Prueba alturas repetidas y una escalera creciente: ahí aparecen los errores de <code>&gt;=</code> contra <code>&gt;</code>.', 'Test repeated heights and a rising staircase: that is where <code>&gt;=</code> versus <code>&gt;</code> bugs show up.')],
      similar: [T('Atrapar agua de lluvia (en esta misma estación; también sale con pila).', 'Trapping rain water (in this same station; it can also be solved with a stack).'), T('Temperaturas diarias: ¿cuántos días faltan para uno más cálido?', 'Daily temperatures: how many days until a warmer one?'), T('El rectángulo de unos más grande en una matriz (este problema, fila por fila).', 'Largest rectangle of ones in a matrix (this problem, row by row).')]
    }
  };

  // Ordered by difficulty: Fácil, Media, Difícil. Each level is its own station:
  // problems-easy, problems-medium and problems-hard.
  window.problemStations = window.Tracer.byLevel('problems', [
    palindrome, parentheses, binarySearch, stock,
    twoSum, container, mergeIntervals, longestUnique, islands, coinChange,
    trapRain, slidingMax, largestRectangle
  ]);
})();
