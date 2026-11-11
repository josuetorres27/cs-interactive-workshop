// CS Interactive Workshop - Technical interview patterns, traced line by line.
(function () {
  const { TraceStation, Recorder, viz } = window.Tracer;

  const parseArgs = (text) => {
    try { return JSON.parse(`[${text}]`); } catch (e) {
      throw new Error('No pude leer la entrada. Revisa comas, comillas y corchetes, como en los ejemplos.');
    }
  };
  const isNumArr = (a) => Array.isArray(a) && a.every((x) => typeof x === 'number' && Number.isFinite(x));
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };

  // ─────────────────────────────────────────────────────────────────────
  const twoSum = {
    id: 'two-sum-sorted',
    title: 'Par con suma objetivo',
    difficulty: 'Media',
    pattern: 'Dos punteros',
    statement: '<p>Te dan un arreglo <strong>ordenado</strong> y un número <code>target</code>. Devuelve los índices de dos elementos que sumen exactamente <code>target</code>, usando memoria constante.</p>',
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
      need(a.length === 2 && isNumArr(a[0]) && typeof a[1] === 'number', 'Escribe el arreglo y el objetivo, por ejemplo: [2, 7, 11, 15], 9');
      need(a[0].length >= 2 && a[0].length <= 14, 'Usa entre 2 y 14 números para que se vea bien.');
      need(a[0].every((x, i) => i === 0 || a[0][i - 1] <= x), 'El arreglo tiene que venir ordenado: es justo lo que hace funcionar este patrón.');
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
      rec.step(2, vars(), V(), 'Ponemos <b>l</b> en el primer elemento y <b>r</b> en el último.');
      while (true) {
        if (!(l < r)) { rec.step(3, vars(), V(), `l ya no es menor que r: se cruzaron.`); break; }
        rec.step(3, vars(), V(), `l &lt; r (${l} &lt; ${r}), así que seguimos buscando.`);
        s = nums[l] + nums[r];
        rec.step(4, vars(), V(), `Sumamos los extremos: ${nums[l]} + ${nums[r]} = <b>${s}</b>.`);
        if (s === target) {
          rec.step(5, vars(), V(true), `¡${s} es el objetivo!`);
          rec.step(6, vars(), V(true), `Devolvemos <b>[${l}, ${r}]</b>. Lo encontramos sin comparar todos los pares.`);
          return rec.frames;
        }
        rec.step(5, vars(), V(), `${s} no es ${target}.`);
        if (s < target) {
          rec.step(7, vars(), V(), `${s} &lt; ${target}: la suma se quedó corta y necesitamos un número más grande.`);
          l += 1;
          rec.step(8, vars(), V(), 'Movemos <b>l</b> a la derecha. Como el arreglo está ordenado, el siguiente número es mayor o igual.');
        } else {
          rec.step(7, vars(), V(), `${s} no es menor que ${target}...`);
          rec.step(9, vars(), V(), `...así que se pasó: hay que achicar la suma.`);
          r -= 1;
          rec.step(10, vars(), V(), 'Movemos <b>r</b> a la izquierda, hacia números más pequeños.');
        }
      }
      rec.step(11, vars(), V(), 'Ningún par suma el objetivo: devolvemos una lista vacía.');
      return rec.frames;
    },
    render(st) {
      const state = {}; const ptr = {};
      st.nums.forEach((_, i) => { if (i < st.l || i > st.r) state[i] = 'dim'; });
      if (st.found) { state[st.l] = 'ok'; state[st.r] = 'ok'; }
      (ptr[st.l] = ptr[st.l] || []).push('l');
      if (st.r >= 0) (ptr[st.r] = ptr[st.r] || []).push('r');
      return `${viz.cells(st.nums, { ptr, state })}
        <div class="vz-caption">objetivo <b>${st.target}</b>${st.s !== undefined ? ` · suma actual <b>${st.s}</b>` : ''}</div>`;
    },
    learn: {
      idea: `<p>En lugar de probar todos los pares (O(n²)), usamos que el arreglo está ordenado. Si la suma de los extremos es muy pequeña, el número de la izquierda nunca va a servir con ningún otro: lo descartamos moviendo <b>l</b>. Si es muy grande, descartamos el de la derecha.</p>
             <p>Cada paso descarta un elemento para siempre, por eso basta una sola pasada.</p>`,
      signals: ['El arreglo está <strong>ordenado</strong> (o puedes ordenarlo).', 'Buscas un <strong>par</strong> (o tripleta) que cumpla una condición sobre su suma.', 'Te piden memoria O(1).'],
      time: 'O(n)', space: 'O(1)',
      why: 'Cada iteración mueve un puntero hacia el otro, así que hay como máximo n − 1 iteraciones.'
    },
    build: {
      template: `def two_pointers(nums, target):
    l, r = 0, len(nums) - 1
    while l < r:
        actual = combinar(nums[l], nums[r])
        if actual == target:
            return l, r
        if actual < target:
            l += 1      # necesito más
        else:
            r -= 1      # necesito menos
    return None`,
      tips: ['Antes de programar, di en voz alta <strong>por qué</strong> es seguro descartar un elemento. Es lo que el entrevistador quiere oír.', 'Pregunta si puede haber <strong>duplicados</strong> y si se permite usar el mismo elemento dos veces.', 'Si el arreglo no está ordenado, un diccionario da O(n) tiempo pero O(n) memoria: menciona ese trade-off.'],
      similar: ['Suma de tres números (3Sum): fija uno y aplica dos punteros al resto.', 'Eliminar duplicados de un arreglo ordenado.', 'Verificar si una cadena es palíndromo.']
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const container = {
    id: 'max-water',
    title: 'El contenedor con más agua',
    difficulty: 'Media',
    pattern: 'Dos punteros',
    statement: '<p>Cada número es la altura de una pared. Elige dos paredes que, junto con el piso, formen el recipiente con <strong>más área</strong>. El agua llega hasta la pared más baja.</p>',
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
      need(a.length === 1 && isNumArr(a[0]), 'Escribe una lista de alturas, por ejemplo: [1, 8, 6, 2, 5]');
      need(a[0].length >= 2 && a[0].length <= 14, 'Usa entre 2 y 14 alturas.');
      need(a[0].every((x) => x >= 0 && x <= 30), 'Usa alturas entre 0 y 30.');
      return { h: a[0] };
    },
    trace({ h }) {
      const rec = new Recorder();
      let l = 0, r = h.length - 1, best = 0, area, bestBox = null;
      const V = (box) => ({ h, l, r, box, best: bestBox });
      const vars = () => (area === undefined ? { l, r, best } : { l, r, area, best });
      rec.step(2, vars(), V(), 'Empezamos con el recipiente más ancho posible: las dos paredes de los extremos.');
      rec.step(3, vars(), V(), 'Todavía no hemos medido nada: best = 0.');
      while (true) {
        if (!(l < r)) { rec.step(4, vars(), V(), 'Los punteros se juntaron: ya revisamos todo lo que valía la pena.'); break; }
        rec.step(4, vars(), V(), `l &lt; r: seguimos.`);
        const level = Math.min(h[l], h[r]);
        area = (r - l) * level;
        const box = { l, r, h: level };
        rec.step(5, vars(), V(box), `Ancho ${r - l} × altura ${level} (la pared más baja) = <b>${area}</b>.`);
        const improved = area > best;
        best = Math.max(best, area);
        if (improved) bestBox = box;
        rec.step(6, vars(), V(box), improved ? `¡Nuevo récord! best = ${best}.` : `No supera el récord de ${best}.`);
        if (h[l] < h[r]) {
          rec.step(7, vars(), V(box), `La pared izquierda (${h[l]}) es la más baja: es la que limita el agua.`);
          l += 1;
          rec.step(8, vars(), V(), 'Movemos <b>l</b>. Mover la pared alta nunca podría mejorar: el ancho baja y la altura sigue limitada por la baja.');
        } else {
          rec.step(7, vars(), V(box), `La pared derecha (${h[r]}) es la más baja o empatan.`);
          rec.step(9, vars(), V(box), 'Entonces descartamos la derecha.');
          r -= 1;
          rec.step(10, vars(), V(), 'Movemos <b>r</b> hacia adentro.');
        }
      }
      rec.step(11, vars(), V(), `La mejor área es <b>${best}</b>.`);
      return rec.frames;
    },
    render(st) {
      const ptr = {};
      if (st.l < st.r || st.l === st.r) { (ptr[st.l] = ptr[st.l] || []).push('l'); (ptr[st.r] = ptr[st.r] || []).push('r'); }
      const state = {};
      st.h.forEach((_, i) => { if (i < st.l || i > st.r) state[i] = 'dim'; });
      return viz.bars(st.h, { ptr, state, box: st.box, best: st.best }) +
        '<div class="vz-legend"><span><i class="lg-box"></i>recipiente actual</span><span><i class="lg-best"></i>mejor hasta ahora</span></div>';
    },
    learn: {
      idea: `<p>Empezamos con el recipiente más ancho. Para encontrar uno mejor, el ancho siempre va a bajar, así que solo vale la pena si la altura sube. La altura la decide la pared <strong>más baja</strong>, así que esa es la única que conviene cambiar.</p>
             <p>Mover la pared alta es inútil: el nuevo recipiente sería más angosto y seguiría limitado por la misma pared baja.</p>`,
      signals: ['Te piden maximizar algo que depende de <strong>dos extremos</strong> y de la distancia entre ellos.', 'La fuerza bruta compara todos los pares (O(n²)).', 'Puedes argumentar qué extremo nunca podrá mejorar el resultado.'],
      time: 'O(n)', space: 'O(1)',
      why: 'Cada paso descarta una pared para siempre, así que hay como máximo n − 1 pasos.'
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
      tips: ['Empieza explicando la fuerza bruta O(n²) y luego mejórala: mostrar el razonamiento cuenta más que llegar directo.', 'La parte clave es la <strong>prueba</strong>: "mover la pared alta nunca mejora". Ensáyala.', 'No lo confundas con "atrapar agua de lluvia": aquí solo hay un recipiente y las paredes intermedias no estorban.'],
      similar: ['Atrapar agua de lluvia (en esta misma estación).', 'Par con suma objetivo (dos punteros desde los extremos).', 'Cuadrados de un arreglo ordenado.']
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const mergeIntervals = {
    id: 'merge-intervals',
    title: 'Fusionar intervalos',
    difficulty: 'Media',
    pattern: 'Intervalos',
    statement: '<p>Te dan una lista de intervalos <code>[inicio, fin]</code>. Fusiona todos los que se traslapen y devuelve la lista resultante.</p>',
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
      need(a.length === 1 && Array.isArray(a[0]) && a[0].every((iv) => isNumArr(iv) && iv.length === 2 && iv[0] <= iv[1]), 'Escribe una lista de pares [inicio, fin] con inicio ≤ fin.');
      need(a[0].length >= 1 && a[0].length <= 9, 'Usa entre 1 y 9 intervalos.');
      need(a[0].every((iv) => iv[0] >= 0 && iv[1] <= 40), 'Usa valores entre 0 y 40.');
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
      rec.step(1, { intervals: list }, V(), 'Estos son los intervalos tal como llegan.');
      list = list.slice().sort((a, b) => a[0] - b[0]);
      sorted = true;
      rec.step(2, vars(), V(), 'Ordenamos por inicio. Así, cualquier intervalo que se traslape con el anterior queda justo a su lado.');
      rec.step(3, vars(), V(), 'merged empieza vacía.');
      for (let i = 0; i < list.length; i++) {
        cur = i; [start, end] = list[i];
        rec.step(4, vars(), V(), `Tomamos el intervalo [${start}, ${end}].`);
        const last = merged[merged.length - 1];
        if (last && start <= last[1]) {
          rec.step(5, vars(), V({ overlap: true }), `Empieza en ${start}, antes de que termine el último fusionado (${last[1]}): <b>se traslapan</b>.`);
          last[1] = Math.max(last[1], end);
          rec.step(6, vars(), V({ grow: merged.length - 1 }), `Estiramos el último hasta ${last[1]}.`);
        } else {
          rec.step(5, vars(), V(), merged.length ? `Empieza en ${start}, después de ${last[1]}: no se traslapan.` : 'merged está vacía, no hay con quién comparar.');
          rec.step(7, vars(), V(), 'Entonces empieza un grupo nuevo...');
          merged.push([start, end]);
          rec.step(8, vars(), V({ grow: merged.length - 1 }), `...y lo agregamos: [${start}, ${end}].`);
        }
      }
      cur = list.length; // everything processed
      rec.step(9, vars(), V(), `Resultado: <b>${merged.map((m) => `[${m[0]}, ${m[1]}]`).join(', ')}</b>.`);
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
      s += `<text x="8" y="${rowH - 6}" class="vz-row-label">${st.sorted ? 'ordenados' : 'entrada'}</text>`;
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
      idea: `<p>Si los intervalos están <strong>ordenados por inicio</strong>, solo hay que comparar cada uno con el último que fusionamos: si empieza antes de que ese termine, se traslapan y basta con estirar el final. Si no, empieza un grupo nuevo.</p>
             <p>Sin ordenar tendrías que comparar cada intervalo con todos los demás.</p>`,
      signals: ['La entrada son <strong>rangos</strong>: horarios, reservas, segmentos.', 'Te preguntan por traslapes, huecos o cuántos recursos se usan a la vez.', 'Ordenar por inicio (o por fin) simplifica todo.'],
      time: 'O(n log n)', space: 'O(n)',
      why: 'El costo lo domina el ordenamiento. El recorrido después es lineal.'
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
      tips: ['Aclara si <code>[1, 4]</code> y <code>[4, 5]</code> cuentan como traslapados (aquí sí, por el <code>&lt;=</code>).', 'Usa <code>max</code> al estirar: un intervalo puede quedar completamente dentro del anterior.', 'Pregunta si puedes modificar la entrada; si no, ordena una copia.'],
      similar: ['Insertar un intervalo en una lista ya fusionada.', 'Salas de reuniones: ¿cuántas salas necesitas como mínimo? (ordena inicios y finales).', 'Eliminar la menor cantidad de intervalos para que ninguno se traslape (ordena por fin).']
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const longestUnique = {
    id: 'longest-unique',
    title: 'Subcadena más larga sin repetir',
    difficulty: 'Media',
    pattern: 'Ventana deslizante',
    statement: '<p>Dada una cadena, encuentra la longitud de la <strong>subcadena contigua más larga</strong> en la que ningún carácter se repite.</p>',
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
      need(a.length === 1 && typeof a[0] === 'string', 'Escribe una cadena entre comillas, por ejemplo: "abcabcbb"');
      need(a[0].length >= 1 && a[0].length <= 16, 'Usa entre 1 y 16 caracteres.');
      return { s: a[0] };
    },
    trace({ s }) {
      const rec = new Recorder();
      const seen = {};
      let left = 0, best = 0, right = -1, ch, bestWin = null;
      const V = (extra = {}) => ({ s, left, right, seen: { ...seen }, bestWin, ...extra });
      const vars = () => (right < 0 ? { seen, left, best } : { right, ch, left, seen, best });
      rec.step(2, { seen }, V(), 'seen guarda la <b>última posición</b> en la que vimos cada carácter.');
      rec.step(3, vars(), V(), 'La ventana empieza vacía en la posición 0.');
      for (right = 0; right < s.length; right++) {
        ch = s[right];
        rec.step(4, vars(), V(), `La ventana crece: <b>right</b> = ${right}, ch = '${ch}'.`);
        if (ch in seen && seen[ch] >= left) {
          rec.step(5, vars(), V({ clash: seen[ch] }), `'${ch}' ya está dentro de la ventana (posición ${seen[ch]}).`);
          left = seen[ch] + 1;
          rec.step(6, vars(), V(), `Saltamos <b>left</b> a ${left}, justo después de la repetición. No hace falta avanzar de a uno.`);
        } else {
          rec.step(5, vars(), V(), ch in seen ? `'${ch}' se vio antes, pero quedó fuera de la ventana: no estorba.` : `'${ch}' es nuevo en la ventana.`);
        }
        seen[ch] = right;
        rec.step(7, vars(), V({ hi: ch }), `Anotamos que '${ch}' está ahora en ${right}.`);
        const len = right - left + 1;
        if (len > best) bestWin = [left, right];
        best = Math.max(best, len);
        rec.step(8, vars(), V(), `La ventana mide ${len}. best = ${best}.`);
      }
      right = s.length - 1;
      rec.step(9, vars(), V({ done: true }), `La respuesta es <b>${best}</b>${bestWin ? `: "${s.slice(bestWin[0], bestWin[1] + 1)}"` : ''}.`);
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
      idea: `<p>Mantenemos una <strong>ventana</strong> <code>[left, right]</code> sin repetidos. <b>right</b> avanza siempre; cuando el nuevo carácter ya está dentro de la ventana, <b>left</b> salta justo después de su aparición anterior.</p>
             <p>El diccionario con la última posición permite ese salto en O(1), en vez de encoger la ventana de a un carácter.</p>`,
      signals: ['Te piden la subcadena o subarreglo <strong>contiguo</strong> más largo o más corto que cumpla algo.', 'La condición se puede actualizar al agregar o quitar un elemento del borde.', 'La fuerza bruta revisa todas las subcadenas (O(n²) o peor).'],
      time: 'O(n)', space: 'O(k)',
      why: 'Cada carácter entra a la ventana una vez y left solo avanza. k es el tamaño del alfabeto.'
    },
    build: {
      template: `def ventana(s):
    estado = {}
    left = best = 0
    for right, x in enumerate(s):
        agregar(estado, x)
        while invalida(estado):
            quitar(estado, s[left])
            left += 1
        best = max(best, right - left + 1)
    return best`,
      tips: ['La condición <code>seen[ch] &gt;= left</code> es el detalle que más se olvida: sin ella, left podría retroceder.', 'Dibuja la ventana en la pizarra y narra cuándo crece y cuándo se encoge.', 'Si te piden la subcadena y no solo la longitud, guarda también dónde empezó la mejor ventana.'],
      similar: ['Ventana mínima que contiene todos los caracteres de otra cadena (difícil).', 'Subarreglo más largo con a lo sumo k ceros que puedes cambiar.', 'Reemplazo de caracteres más largo (con k cambios).']
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const trapRain = {
    id: 'trap-rain',
    title: 'Atrapar agua de lluvia',
    difficulty: 'Difícil',
    pattern: 'Dos punteros',
    statement: '<p>Cada número es la altura de una columna de ancho 1. Después de llover, ¿cuántas unidades de agua quedan <strong>atrapadas</strong> entre las columnas?</p>',
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
      need(a.length === 1 && isNumArr(a[0]), 'Escribe una lista de alturas, por ejemplo: [4, 2, 0, 3, 2, 5]');
      need(a[0].length >= 2 && a[0].length <= 14, 'Usa entre 2 y 14 alturas.');
      need(a[0].every((x) => x >= 0 && x <= 12 && Number.isInteger(x)), 'Usa enteros entre 0 y 12.');
      return { h: a[0] };
    },
    trace({ h }) {
      const rec = new Recorder();
      const w = h.map(() => 0);
      let l = 0, r = h.length - 1, lm = 0, rm = 0, water = 0;
      const V = (extra = {}) => ({ h, w: w.slice(), l, r, lm, rm, ...extra });
      const vars = () => ({ l, r, left_max: lm, right_max: rm, water });
      rec.step(2, { l, r }, V(), 'Un puntero en cada extremo.');
      rec.step(3, { l, r, left_max: lm, right_max: rm }, V(), 'left_max y right_max: la columna más alta vista desde cada lado.');
      rec.step(4, vars(), V(), 'Todavía no hay agua.');
      while (true) {
        if (!(l < r)) { rec.step(5, vars(), V(), 'Los punteros se encontraron.'); break; }
        rec.step(5, vars(), V(), 'l &lt; r: seguimos.');
        if (h[l] < h[r]) {
          rec.step(6, vars(), V(), `h[l] = ${h[l]} &lt; h[r] = ${h[r]}: a la derecha hay una pared al menos así de alta, así que el agua en l depende solo de <b>left_max</b>.`);
          lm = Math.max(lm, h[l]);
          rec.step(7, vars(), V(), `left_max = ${lm}.`);
          const add = lm - h[l];
          w[l] = add; water += add;
          rec.step(8, vars(), V({ fill: l }), add ? `Sobre la columna ${l} caben <b>${add}</b> unidades.` : `La columna ${l} es la más alta hasta ahora: no guarda agua.`);
          l += 1;
          rec.step(9, vars(), V(), 'Avanzamos l.');
        } else {
          rec.step(6, vars(), V(), `h[l] = ${h[l]} no es menor que h[r] = ${h[r]}.`);
          rec.step(10, vars(), V(), 'Entonces el lado derecho es el que limita: trabajamos con <b>right_max</b>.');
          rm = Math.max(rm, h[r]);
          rec.step(11, vars(), V(), `right_max = ${rm}.`);
          const add = rm - h[r];
          w[r] = add; water += add;
          rec.step(12, vars(), V({ fill: r }), add ? `Sobre la columna ${r} caben <b>${add}</b> unidades.` : `La columna ${r} es la más alta desde la derecha: no guarda agua.`);
          r -= 1;
          rec.step(13, vars(), V(), 'Retrocedemos r.');
        }
      }
      rec.step(14, vars(), V(), `En total quedan atrapadas <b>${water}</b> unidades.`);
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
      idea: `<p>Sobre cada columna cabe <code>min(máx. a su izquierda, máx. a su derecha) − altura</code>. La versión fácil calcula esos máximos con dos arreglos extra.</p>
             <p>El truco de dos punteros: si <code>h[l] &lt; h[r]</code>, sabemos que a la derecha existe una pared de al menos <code>h[r]</code>, así que el mínimo lo decide <code>left_max</code>. Podemos resolver la columna <b>l</b> sin conocer todo el lado derecho.</p>`,
      signals: ['El valor en cada posición depende de lo que hay a <strong>ambos lados</strong>.', 'Una solución con arreglos de prefijos funciona, pero te piden memoria O(1).', 'Alturas, barras, histogramas.'],
      time: 'O(n)', space: 'O(1)',
      why: 'Un recorrido con dos punteros. La versión con arreglos de máximos también es O(n), pero usa O(n) de memoria.'
    },
    build: {
      template: `def trap(h):
    # Versión con prefijos: más fácil de explicar primero
    n = len(h)
    izq, der = [0] * n, [0] * n
    for i in range(n):
        izq[i] = max(izq[i - 1] if i else 0, h[i])
    for i in range(n - 1, -1, -1):
        der[i] = max(der[i + 1] if i < n - 1 else 0, h[i])
    return sum(min(izq[i], der[i]) - h[i] for i in range(n))`,
      templateTitle: 'Primero la versión con prefijos (O(n) de memoria)',
      tips: ['En la entrevista, presenta primero la versión con prefijos y luego optimiza la memoria con dos punteros.', 'Prueba casos borde: lista vacía, una sola columna, alturas en escalera (nunca guarda agua).', 'Una alternativa es con una <strong>pila monótona</strong>: vale la pena mencionarla.'],
      similar: ['El contenedor con más agua (más fácil, en esta estación).', 'Rectángulo más grande en un histograma (pila monótona).', 'Atrapar agua en 2D (con un heap, muy difícil).']
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const slidingMax = {
    id: 'sliding-max',
    title: 'Máximo en ventana deslizante',
    difficulty: 'Difícil',
    pattern: 'Cola monótona',
    statement: '<p>Dado un arreglo y un tamaño <code>k</code>, devuelve el <strong>máximo de cada ventana</strong> de k elementos consecutivos mientras la ventana se desliza de izquierda a derecha.</p>',
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
      need(a.length === 2 && isNumArr(a[0]) && Number.isInteger(a[1]), 'Escribe el arreglo y k, por ejemplo: [1, 3, -1, -3, 5], 3');
      need(a[0].length >= 1 && a[0].length <= 12, 'Usa entre 1 y 12 números.');
      need(a[1] >= 1 && a[1] <= a[0].length, 'k tiene que estar entre 1 y el largo del arreglo.');
      return { nums: a[0], k: a[1] };
    },
    trace({ nums, k }) {
      const rec = new Recorder();
      let dq = [], out = [], i = -1, x;
      const V = (extra = {}) => ({ nums, k, i, dq: dq.slice(), out: out.slice(), ...extra });
      const vars = () => (i < 0 ? { k, dq, out } : { i, x, dq, out });
      rec.step(2, vars(), V(), 'dq guarda <b>índices</b> cuyos valores van de mayor a menor. El frente siempre es el máximo de la ventana.');
      for (i = 0; i < nums.length; i++) {
        x = nums[i];
        rec.step(3, vars(), V(), `Entra nums[${i}] = ${x}.`);
        while (dq.length && nums[dq[dq.length - 1]] <= x) {
          rec.step(4, vars(), V({ kill: dq[dq.length - 1] }), `nums[${dq[dq.length - 1]}] = ${nums[dq[dq.length - 1]]} ≤ ${x}: ya nunca será máximo mientras ${x} esté en la ventana.`);
          dq.pop();
          rec.step(5, vars(), V(), 'Lo sacamos por atrás.');
        }
        rec.step(4, vars(), V(), dq.length ? `El último de dq (${nums[dq[dq.length - 1]]}) es mayor que ${x}: paramos.` : 'dq quedó vacía.');
        dq.push(i);
        rec.step(6, vars(), V(), `Agregamos el índice ${i} al final.`);
        if (dq[0] <= i - k) {
          rec.step(7, vars(), V({ old: dq[0] }), `El índice ${dq[0]} ya salió de la ventana [${i - k + 1}, ${i}].`);
          dq.shift();
          rec.step(8, vars(), V(), 'Lo sacamos por el frente.');
        } else {
          rec.step(7, vars(), V(), 'El frente sigue dentro de la ventana.');
        }
        if (i >= k - 1) {
          rec.step(9, vars(), V(), 'La ventana ya está completa.');
          out.push(nums[dq[0]]);
          rec.step(10, vars(), V({ emit: true }), `El máximo es el frente de dq: <b>${nums[dq[0]]}</b>.`);
        } else {
          rec.step(9, vars(), V(), `Aún no hay ${k} elementos en la ventana.`);
        }
      }
      i = nums.length - 1;
      rec.step(11, vars(), V({ done: true }), `Resultado: <b>[${out.join(', ')}]</b>.`);
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
        viz.list(st.dq.map((j) => `${j}→${st.nums[j]}`), { title: 'dq (índice→valor)', hiFirst: true }) +
        viz.list(st.out, { title: 'out', hiLast: !!st.emit });
    },
    learn: {
      idea: `<p>Una cola doble (deque) que guarda índices con valores <strong>decrecientes</strong>. Cuando entra un número, sacamos por atrás todos los menores o iguales: con él en la ventana, nunca serán el máximo. El frente siempre es el máximo actual.</p>
             <p>Por el frente sacamos el índice que ya quedó fuera de la ventana.</p>`,
      signals: ['Te piden el máximo o mínimo de <strong>cada ventana</strong> de tamaño fijo.', 'Un heap daría O(n log k); te piden O(n).', 'Hay elementos que se vuelven "inútiles" en cuanto aparece uno mejor.'],
      time: 'O(n)', space: 'O(k)',
      why: 'Cada índice entra y sale de la deque como máximo una vez, aunque haya un while dentro del for.'
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
      tips: ['Guarda <strong>índices</strong>, no valores: los necesitas para saber cuándo un elemento salió de la ventana.', 'Explica el análisis amortizado: el while interno no hace el algoritmo O(n·k).', 'Para el mínimo, solo invierte la comparación.'],
      similar: ['Subarreglo más corto con suma al menos K (deque monótona + prefijos).', 'Siguiente elemento mayor (pila monótona).', 'Saltos máximos con puntaje (DP + deque).']
    }
  };

  window.interviewStation = new TraceStation('interview', [twoSum, container, mergeIntervals, longestUnique, trapRain, slidingMax]);
})();
