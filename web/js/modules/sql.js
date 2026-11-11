// CS Interactive Workshop - SQL step by step: queries walked in logical execution order.
(function () {
  const { TraceStation, Recorder, viz } = window.Tracer;

  // Small sample database used by every query
  const ESTUDIANTES = {
    columns: ['id', 'nombre', 'carrera'],
    rows: [[1, 'Ana', 'Computación'], [2, 'Luis', 'Computación'], [3, 'María', 'Matemática'], [4, 'Diego', 'Computación'], [5, 'Sofía', 'Física']]
  };
  const MATRICULAS = {
    columns: ['estudiante_id', 'curso', 'nota'],
    rows: [[1, 'Redes', 88], [1, 'Algoritmos', 72], [2, 'Redes', 65], [2, 'Concurrente', 91], [3, 'Algoritmos', 58], [4, 'Concurrente', null], [4, 'Algoritmos', 95]]
  };

  const T = (title, columns, rows, rowCls = [], note = '') => ({ title, columns, rows, rowCls, note });
  const render = (st) => `<div class="vz-tables">${st.tables.map((t) => viz.table(t)).join('')}</div>`;
  const phase = (n, name) => `§${n} · ${name}`;

  const schemaLearn = `<p>La base de ejemplo tiene dos tablas: <code>estudiantes(id, nombre, carrera)</code> y <code>matriculas(estudiante_id, curso, nota)</code>. Una nota en <code>NULL</code> significa que el curso todavía no tiene calificación.</p>`;

  // ─────────────────────────────────────────────────────────────────────
  const joinWhere = {
    id: 'join-where',
    title: 'JOIN, WHERE y ORDER BY',
    difficulty: 'Media',
    pattern: 'Orden lógico de ejecución',
    statement: '<p>Lista el nombre, el curso y la nota de cada matrícula <strong>aprobada</strong> (nota ≥ 70), de la nota más alta a la más baja.</p>',
    lang: 'sql',
    code: [
      'SELECT e.nombre, m.curso, m.nota',
      'FROM estudiantes e',
      'JOIN matriculas m ON m.estudiante_id = e.id',
      'WHERE m.nota >= 70',
      'ORDER BY m.nota DESC;'
    ],
    trace() {
      const rec = new Recorder();
      const est = ESTUDIANTES.rows;
      rec.step(2, { paso: phase(1, 'FROM'), filas: est.length }, { tables: [T('estudiantes e', ESTUDIANTES.columns, est)] },
        'Aunque se escribe primero, <b>SELECT no se ejecuta primero</b>. El motor empieza por FROM: ¿de dónde salen las filas?');
      rec.step(3, { paso: phase(2, 'JOIN'), filas: est.length }, { tables: [T('estudiantes e', ESTUDIANTES.columns, est), T('matriculas m', MATRICULAS.columns, MATRICULAS.rows)] },
        'JOIN trae la segunda tabla. Cada matrícula se va a pegar con el estudiante cuyo <code>id</code> coincide con su <code>estudiante_id</code>.');
      const joined = MATRICULAS.rows.map((m) => { const e = est.find((x) => x[0] === m[0]); return [e[0], e[1], e[2], m[1], m[2]]; });
      const jCols = ['e.id', 'e.nombre', 'e.carrera', 'm.curso', 'm.nota'];
      rec.step(3, { paso: phase(2, 'JOIN'), filas: joined.length }, { tables: [T('estudiantes ⋈ matriculas', jCols, joined, joined.map(() => 'new'))] },
        `Resultado del JOIN: ${joined.length} filas, una por matrícula. Sofía no aparece porque no tiene matrículas (es un INNER JOIN).`);
      const keep = joined.map((r) => r[4] !== null && r[4] >= 70);
      rec.step(4, { paso: phase(3, 'WHERE'), filas: joined.length }, { tables: [T('filtrando…', jCols, joined, keep.map((k) => (k ? 'keep' : 'drop')), 'Diego tiene nota NULL: NULL >= 70 no es verdadero ni falso, es desconocido, y WHERE solo deja pasar lo verdadero.')] },
        'WHERE revisa <b>fila por fila</b>. Las tachadas no cumplen la condición.');
      const filtered = joined.filter((_, i) => keep[i]);
      rec.step(4, { paso: phase(3, 'WHERE'), filas: filtered.length }, { tables: [T('después de WHERE', jCols, filtered)] },
        `Quedan ${filtered.length} filas.`);
      const projected = filtered.map((r) => [r[1], r[3], r[4]]);
      const pCols = ['nombre', 'curso', 'nota'];
      rec.step(1, { paso: phase(4, 'SELECT'), filas: projected.length }, { tables: [T('SELECT e.nombre, m.curso, m.nota', pCols, projected)] },
        'Recién ahora corre SELECT: se queda solo con las columnas pedidas. Por eso <b>no puedes usar en WHERE un alias</b> definido en SELECT.');
      const sorted = projected.slice().sort((a, b) => b[2] - a[2]);
      rec.step(5, { paso: phase(5, 'ORDER BY'), filas: sorted.length }, { tables: [T('resultado final', pCols, sorted, sorted.map(() => 'keep'))] },
        'Por último ORDER BY ordena. Aquí sí se pueden usar los alias del SELECT.');
      return rec.frames;
    },
    render,
    learn: {
      idea: `${schemaLearn}<p>SQL se <strong>escribe</strong> en un orden pero se <strong>ejecuta</strong> en otro: <code>FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT</code>.</p><p>Ese orden explica muchos errores: WHERE no ve los alias del SELECT porque todavía no existen, y ORDER BY sí los ve porque corre después.</p>`,
      signals: ['Necesitas datos de <strong>dos tablas</strong> relacionadas por una llave.', 'El filtro es sobre filas individuales (no sobre grupos): va en WHERE.', 'Te piden un orden específico en el resultado.'],
      time: 'Depende del plan', space: 'Depende del plan',
      why: 'Con un índice sobre <code>matriculas(estudiante_id)</code>, el JOIN no necesita revisar todas las combinaciones. Sin índices, el motor puede terminar comparando cada fila con cada fila.'
    },
    build: {
      templateTitle: 'Las cláusulas, en el orden en que se ejecutan',
      template: `SELECT   columnas, agregados       -- 6
FROM     tabla_a a                 -- 1
JOIN     tabla_b b ON b.fk = a.id  -- 2
WHERE    condición por fila        -- 3
GROUP BY columnas                  -- 4
HAVING   condición por grupo       -- 5
ORDER BY columnas                  -- 7
LIMIT    n;                        -- 8`,
      tips: ['Comparar con NULL usando <code>=</code> nunca es verdadero: usa <code>IS NULL</code> o <code>IS NOT NULL</code>.', 'Evita <code>SELECT *</code> en código real: trae columnas que no necesitas y se rompe si cambia la tabla.', 'Crea índices sobre las columnas que usas en JOIN y WHERE. Revisa el plan con <code>EXPLAIN</code>.'],
      similar: ['Los 3 estudiantes con mejor nota en cada curso (funciones de ventana).', 'Estudiantes que llevan Redes y Algoritmos a la vez.', 'Curso con más reprobados.']
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const groupHaving = {
    id: 'group-having',
    title: 'GROUP BY y HAVING',
    difficulty: 'Media',
    pattern: 'Agregación',
    statement: '<p>Para cada curso con <strong>al menos 2 notas</strong>, muestra cuántas notas tiene y su promedio, del mejor promedio al peor.</p>',
    lang: 'sql',
    code: [
      'SELECT m.curso, COUNT(*) AS notas, AVG(m.nota) AS promedio',
      'FROM matriculas m',
      'WHERE m.nota IS NOT NULL',
      'GROUP BY m.curso',
      'HAVING COUNT(*) >= 2',
      'ORDER BY promedio DESC;'
    ],
    trace() {
      const rec = new Recorder();
      const rows = MATRICULAS.rows;
      const cols = ['estudiante_id', 'curso', 'nota'];
      rec.step(2, { paso: phase(1, 'FROM'), filas: rows.length }, { tables: [T('matriculas m', cols, rows)] }, 'FROM: partimos de todas las matrículas.');
      const keep = rows.map((r) => r[2] !== null);
      rec.step(3, { paso: phase(2, 'WHERE'), filas: rows.length }, { tables: [T('filtrando…', cols, rows, keep.map((k) => (k ? 'keep' : 'drop')))] }, 'WHERE quita la fila sin nota. Se filtra <b>antes</b> de agrupar, fila por fila.');
      const f = rows.filter((_, i) => keep[i]);
      const courses = [...new Set(f.map((r) => r[1]))];
      const grouped = courses.flatMap((c) => f.filter((r) => r[1] === c));
      const gCls = grouped.map((r) => `g${courses.indexOf(r[1])}`);
      rec.step(4, { paso: phase(3, 'GROUP BY'), filas: grouped.length, grupos: courses.length }, { tables: [T('agrupando por curso', cols, grouped, gCls)] },
        `GROUP BY junta las filas con el mismo curso: ${courses.length} grupos (un color por grupo).`);
      const summary = courses.map((c) => { const g = f.filter((r) => r[1] === c); const avg = g.reduce((s, r) => s + r[2], 0) / g.length; return [c, g.length, +avg.toFixed(2)]; });
      const sCols = ['curso', 'COUNT(*)', 'AVG(nota)'];
      rec.step(4, { paso: phase(3, 'GROUP BY'), grupos: summary.length }, { tables: [T('un renglón por grupo', sCols, summary, summary.map((_, i) => `g${i}`))] },
        'Cada grupo se resume en <b>una sola fila</b>. Desde aquí solo existen las columnas agrupadas y los agregados.');
      const hk = summary.map((r) => r[1] >= 2);
      rec.step(5, { paso: phase(4, 'HAVING'), grupos: summary.length }, { tables: [T('filtrando grupos…', sCols, summary, hk.map((k) => (k ? 'keep' : 'drop')))] },
        'HAVING es como WHERE, pero para <b>grupos</b>: puede usar COUNT, AVG, etc. Concurrente tiene una sola nota y sale.');
      const h = summary.filter((_, i) => hk[i]);
      const pCols = ['curso', 'notas', 'promedio'];
      rec.step(1, { paso: phase(5, 'SELECT'), filas: h.length }, { tables: [T('SELECT con alias', pCols, h)] }, 'SELECT pone nombres (alias) a las columnas: <code>notas</code> y <code>promedio</code>.');
      const sorted = h.slice().sort((a, b) => b[2] - a[2]);
      rec.step(6, { paso: phase(6, 'ORDER BY'), filas: sorted.length }, { tables: [T('resultado final', pCols, sorted, sorted.map(() => 'keep'))] }, 'ORDER BY usa el alias <code>promedio</code>, que ya existe porque SELECT corrió antes.');
      return rec.frames;
    },
    render,
    learn: {
      idea: `${schemaLearn}<p><strong>WHERE</strong> filtra filas antes de agrupar; <strong>HAVING</strong> filtra grupos después. Si la condición usa un agregado (COUNT, AVG, SUM…), tiene que ir en HAVING.</p><p>Después de GROUP BY, cada grupo es una fila: en SELECT solo puedes poner columnas del GROUP BY o agregados.</p>`,
      signals: ['La pregunta dice "<strong>por cada</strong> curso, cliente, mes…".', 'Te piden contar, sumar o promediar.', 'Hay una condición sobre el resultado de esa cuenta: va en HAVING.'],
      time: 'O(n log n) o O(n)', space: 'O(grupos)',
      why: 'El motor agrupa ordenando las filas o con una tabla hash. Filtrar en WHERE primero reduce el trabajo de agrupar.'
    },
    build: {
      templateTitle: 'Plantilla de agregación',
      template: `SELECT   clave, COUNT(*) AS n, AVG(valor) AS prom
FROM     tabla
WHERE    filtro_por_fila          -- antes de agrupar
GROUP BY clave
HAVING   COUNT(*) >= 2            -- filtro por grupo
ORDER BY prom DESC;`,
      tips: ['<code>COUNT(*)</code> cuenta filas; <code>COUNT(columna)</code> no cuenta los NULL. Aquí daría lo mismo porque WHERE ya los quitó.', 'AVG ignora los NULL: el promedio no los trata como cero.', 'Si un filtro no usa agregados, ponlo en WHERE: es más claro y más eficiente.'],
      similar: ['Clientes con más de 5 pedidos en el último mes.', 'Departamento con el salario promedio más alto.', 'Cursos donde nadie reprobó (MIN(nota) ≥ 70).']
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const antiJoin = {
    id: 'left-join-null',
    title: 'LEFT JOIN para encontrar ausentes',
    difficulty: 'Media',
    pattern: 'Anti-join',
    statement: '<p>¿Qué estudiantes <strong>no tienen ninguna matrícula</strong>? Una pregunta de entrevista muy común.</p>',
    lang: 'sql',
    code: [
      'SELECT e.nombre',
      'FROM estudiantes e',
      'LEFT JOIN matriculas m ON m.estudiante_id = e.id',
      'WHERE m.estudiante_id IS NULL;'
    ],
    trace() {
      const rec = new Recorder();
      const est = ESTUDIANTES.rows;
      rec.step(2, { paso: phase(1, 'FROM'), filas: est.length }, { tables: [T('estudiantes e', ESTUDIANTES.columns, est)] }, 'Partimos de todos los estudiantes.');
      const joined = [];
      const cls = [];
      est.forEach((e) => {
        const ms = MATRICULAS.rows.filter((m) => m[0] === e[0]);
        if (ms.length) ms.forEach((m) => { joined.push([e[0], e[1], m[0], m[1]]); cls.push(''); });
        else { joined.push([e[0], e[1], null, null]); cls.push('new'); }
      });
      const jCols = ['e.id', 'e.nombre', 'm.estudiante_id', 'm.curso'];
      rec.step(3, { paso: phase(2, 'LEFT JOIN'), filas: joined.length }, { tables: [T('estudiantes ⟕ matriculas', jCols, joined, cls)] },
        'LEFT JOIN conserva <b>todos</b> los estudiantes de la izquierda. Si no hay matrícula que coincida, rellena las columnas de la derecha con NULL (fila resaltada).');
      const keep = joined.map((r) => r[2] === null);
      rec.step(4, { paso: phase(3, 'WHERE'), filas: joined.length }, { tables: [T('filtrando…', jCols, joined, keep.map((k) => (k ? 'keep' : 'drop')))] },
        'Nos quedamos solo con las filas donde la parte derecha quedó en NULL: esos estudiantes no tenían pareja.');
      const res = joined.filter((_, i) => keep[i]).map((r) => [r[1]]);
      rec.step(1, { paso: phase(4, 'SELECT'), filas: res.length }, { tables: [T('resultado final', ['nombre'], res, res.map(() => 'keep'))] },
        `Resultado: ${res.map((r) => r[0]).join(', ')}.`);
      return rec.frames;
    },
    render,
    learn: {
      idea: `${schemaLearn}<p>Un <strong>LEFT JOIN</strong> devuelve todas las filas de la tabla izquierda, tengan o no pareja. Las que no tienen pareja traen NULL en las columnas de la derecha.</p><p>Filtrar por <code>IS NULL</code> en una columna de la derecha que nunca es NULL en datos reales (como la llave) deja exactamente "los que no tienen pareja". A esto se le llama anti-join.</p>`,
      signals: ['La pregunta tiene un "<strong>sin</strong>", "nunca" o "ninguno".', 'Necesitas lo que existe en una tabla pero no en otra.', 'Un INNER JOIN perdería justo las filas que buscas.'],
      time: 'Depende del plan', space: 'Depende del plan',
      why: 'Con un índice en la llave foránea, el motor resuelve cada búsqueda rápido. <code>NOT EXISTS</code> suele generar el mismo plan.'
    },
    build: {
      templateTitle: 'Tres formas de escribir un anti-join',
      template: `-- 1. LEFT JOIN + IS NULL
SELECT e.nombre FROM estudiantes e
LEFT JOIN matriculas m ON m.estudiante_id = e.id
WHERE m.estudiante_id IS NULL;

-- 2. NOT EXISTS (la más recomendada)
SELECT e.nombre FROM estudiantes e
WHERE NOT EXISTS (SELECT 1 FROM matriculas m WHERE m.estudiante_id = e.id);

-- 3. NOT IN (cuidado con los NULL)
SELECT nombre FROM estudiantes
WHERE id NOT IN (SELECT estudiante_id FROM matriculas);`,
      tips: ['Filtra por una columna de la derecha que <strong>no pueda ser NULL</strong> en los datos (la llave), no por una opcional como la nota.', 'Si la subconsulta de <code>NOT IN</code> devuelve algún NULL, el resultado queda vacío. <code>NOT EXISTS</code> no tiene ese problema.', 'Una condición sobre la tabla derecha en WHERE convierte el LEFT JOIN en INNER; ponla en el ON si quieres conservar filas.'],
      similar: ['Clientes que nunca compraron.', 'Productos que no se vendieron este mes.', 'Empleados sin jefe asignado.']
    }
  };

  window.sqlLab = new TraceStation('sql', [joinWhere, groupHaving, antiJoin]);
})();
