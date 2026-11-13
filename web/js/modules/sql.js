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

  const tbl = (title, columns, rows, rowCls = [], note = '') => ({ title, columns, rows, rowCls, note });
  const render = (st) => `<div class="vz-tables">${st.tables.map((t) => viz.table(t)).join('')}</div>`;
  const phase = (n, name) => `§${n} · ${name}`;
  // Labels shown in the variables panel
  const PASO = T('paso', 'step'), FILAS = T('filas', 'rows'), GRUPOS = T('grupos', 'groups');
  const DEPENDE = T('Depende del plan', 'Depends on the plan');

  const schemaLearn = T(`<p>La base de ejemplo tiene dos tablas: <code>estudiantes(id, nombre, carrera)</code> y <code>matriculas(estudiante_id, curso, nota)</code>. Una nota en <code>NULL</code> significa que el curso todavía no tiene calificación.</p>`,
    `<p>The sample database has two tables: <code>estudiantes(id, nombre, carrera)</code> (students) and <code>matriculas(estudiante_id, curso, nota)</code> (enrollments: student, course, grade). A <code>NULL</code> grade means the course has not been graded yet.</p>`);

  // ─────────────────────────────────────────────────────────────────────
  const joinWhere = {
    id: 'join-where',
    title: T('JOIN, WHERE y ORDER BY', 'JOIN, WHERE and ORDER BY'),
    difficulty: T('Media', 'Medium'),
    pattern: T('Orden lógico de ejecución', 'Logical order of execution'),
    statement: T('<p>Lista el nombre, el curso y la nota de cada matrícula <strong>aprobada</strong> (nota ≥ 70), de la nota más alta a la más baja.</p>',
      '<p>List the name, course and grade of every <strong>passing</strong> enrollment (grade ≥ 70), from the highest grade to the lowest.</p>'),
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
      rec.step(2, { [PASO]: phase(1, 'FROM'), [FILAS]: est.length }, { tables: [tbl('estudiantes e', ESTUDIANTES.columns, est)] },
        T('Aunque se escribe primero, <b>SELECT no se ejecuta primero</b>. El motor empieza por FROM: ¿de dónde salen las filas?',
          'Even though it is written first, <b>SELECT does not run first</b>. The engine starts with FROM: where do the rows come from?'));
      rec.step(3, { [PASO]: phase(2, 'JOIN'), [FILAS]: est.length }, { tables: [tbl('estudiantes e', ESTUDIANTES.columns, est), tbl('matriculas m', MATRICULAS.columns, MATRICULAS.rows)] },
        T('JOIN trae la segunda tabla. Cada matrícula se va a pegar con el estudiante cuyo <code>id</code> coincide con su <code>estudiante_id</code>.',
          'JOIN brings in the second table. Each enrollment will be paired with the student whose <code>id</code> matches its <code>estudiante_id</code>.'));
      const joined = MATRICULAS.rows.map((m) => { const e = est.find((x) => x[0] === m[0]); return [e[0], e[1], e[2], m[1], m[2]]; });
      const jCols = ['e.id', 'e.nombre', 'e.carrera', 'm.curso', 'm.nota'];
      rec.step(3, { [PASO]: phase(2, 'JOIN'), [FILAS]: joined.length }, { tables: [tbl('estudiantes ⋈ matriculas', jCols, joined, joined.map(() => 'new'))] },
        T(`Resultado del JOIN: ${joined.length} filas, una por matrícula. Sofía no aparece porque no tiene matrículas (es un INNER JOIN).`,
          `Result of the JOIN: ${joined.length} rows, one per enrollment. The student with id 5 does not appear because she has no enrollments (it is an INNER JOIN).`));
      const keep = joined.map((r) => r[4] !== null && r[4] >= 70);
      rec.step(4, { [PASO]: phase(3, 'WHERE'), [FILAS]: joined.length }, { tables: [tbl(T('filtrando…', 'filtering…'), jCols, joined, keep.map((k) => (k ? 'keep' : 'drop')), T('Diego tiene nota NULL: NULL >= 70 no es verdadero ni falso, es desconocido, y WHERE solo deja pasar lo verdadero.', 'Diego has a NULL grade: NULL >= 70 is neither true nor false, it is unknown, and WHERE only lets true through.'))] },
        T('WHERE revisa <b>fila por fila</b>. Las tachadas no cumplen la condición.', 'WHERE checks <b>row by row</b>. The crossed-out rows do not meet the condition.'));
      const filtered = joined.filter((_, i) => keep[i]);
      rec.step(4, { [PASO]: phase(3, 'WHERE'), [FILAS]: filtered.length }, { tables: [tbl(T('después de WHERE', 'after WHERE'), jCols, filtered)] },
        T(`Quedan ${filtered.length} filas.`, `${filtered.length} rows remain.`));
      const projected = filtered.map((r) => [r[1], r[3], r[4]]);
      const pCols = ['nombre', 'curso', 'nota'];
      rec.step(1, { [PASO]: phase(4, 'SELECT'), [FILAS]: projected.length }, { tables: [tbl('SELECT e.nombre, m.curso, m.nota', pCols, projected)] },
        T('Recién ahora corre SELECT: se queda solo con las columnas pedidas. Por eso <b>no puedes usar en WHERE un alias</b> definido en SELECT.',
          'Only now does SELECT run: it keeps just the requested columns. That is why <b>you cannot use in WHERE an alias</b> defined in SELECT.'));
      const sorted = projected.slice().sort((a, b) => b[2] - a[2]);
      rec.step(5, { [PASO]: phase(5, 'ORDER BY'), [FILAS]: sorted.length }, { tables: [tbl(T('resultado final', 'final result'), pCols, sorted, sorted.map(() => 'keep'))] },
        T('Por último ORDER BY ordena. Aquí sí se pueden usar los alias del SELECT.', 'Finally, ORDER BY sorts. Here you can use the aliases from SELECT.'));
      return rec.frames;
    },
    render,
    learn: {
      idea: `${schemaLearn}${T(`<p>SQL se <strong>escribe</strong> en un orden pero se <strong>ejecuta</strong> en otro: <code>FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT</code>.</p><p>Ese orden explica muchos errores: WHERE no ve los alias del SELECT porque todavía no existen, y ORDER BY sí los ve porque corre después.</p>`,
        `<p>SQL is <strong>written</strong> in one order but <strong>executed</strong> in another: <code>FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT</code>.</p><p>That order explains many errors: WHERE cannot see the SELECT aliases because they do not exist yet, while ORDER BY can see them because it runs afterwards.</p>`)}`,
      signals: [T('Necesitas datos de <strong>dos tablas</strong> relacionadas por una llave.', 'You need data from <strong>two tables</strong> related by a key.'), T('El filtro es sobre filas individuales (no sobre grupos): va en WHERE.', 'The filter applies to individual rows (not to groups): it goes in WHERE.'), T('Te piden un orden específico en el resultado.', 'You are asked for a specific order in the result.')],
      time: DEPENDE, space: DEPENDE,
      why: T('Con un índice sobre <code>matriculas(estudiante_id)</code>, el JOIN no necesita revisar todas las combinaciones. Sin índices, el motor puede terminar comparando cada fila con cada fila.',
        'With an index on <code>matriculas(estudiante_id)</code>, the JOIN does not need to check every combination. Without indexes, the engine may end up comparing every row with every other row.')
    },
    build: {
      templateTitle: T('Las cláusulas, en el orden en que se ejecutan', 'The clauses, in the order they run'),
      template: T(`SELECT   columnas, agregados       -- 6
FROM     tabla_a a                 -- 1
JOIN     tabla_b b ON b.fk = a.id  -- 2
WHERE    condición por fila        -- 3
GROUP BY columnas                  -- 4
HAVING   condición por grupo       -- 5
ORDER BY columnas                  -- 7
LIMIT    n;                        -- 8`, `SELECT   columns, aggregates       -- 6
FROM     table_a a                 -- 1
JOIN     table_b b ON b.fk = a.id  -- 2
WHERE    per-row condition         -- 3
GROUP BY columns                   -- 4
HAVING   per-group condition       -- 5
ORDER BY columns                   -- 7
LIMIT    n;                        -- 8`),
      tips: [T('Comparar con NULL usando <code>=</code> nunca es verdadero: usa <code>IS NULL</code> o <code>IS NOT NULL</code>.', 'Comparing with NULL using <code>=</code> is never true: use <code>IS NULL</code> or <code>IS NOT NULL</code>.'), T('Evita <code>SELECT *</code> en código real: trae columnas que no necesitas y se rompe si cambia la tabla.', 'Avoid <code>SELECT *</code> in real code: it fetches columns you do not need and breaks if the table changes.'), T('Crea índices sobre las columnas que usas en JOIN y WHERE. Revisa el plan con <code>EXPLAIN</code>.', 'Create indexes on the columns you use in JOIN and WHERE. Check the plan with <code>EXPLAIN</code>.')],
      similar: [T('Los 3 estudiantes con mejor nota en cada curso (funciones de ventana).', 'The 3 students with the best grade in each course (window functions).'), T('Estudiantes que llevan Redes y Algoritmos a la vez.', 'Students taking both Redes and Algoritmos.'), T('Curso con más reprobados.', 'The course with the most failing grades.')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const groupHaving = {
    id: 'group-having',
    title: T('GROUP BY y HAVING', 'GROUP BY and HAVING'),
    difficulty: T('Media', 'Medium'),
    pattern: T('Agregación', 'Aggregation'),
    statement: T('<p>Para cada curso con <strong>al menos 2 notas</strong>, muestra cuántas notas tiene y su promedio, del mejor promedio al peor.</p>',
      '<p>For each course with <strong>at least 2 grades</strong>, show how many grades it has and their average, from the best average to the worst.</p>'),
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
      rec.step(2, { [PASO]: phase(1, 'FROM'), [FILAS]: rows.length }, { tables: [tbl('matriculas m', cols, rows)] }, T('FROM: partimos de todas las matrículas.', 'FROM: we start from all the enrollments.'));
      const keep = rows.map((r) => r[2] !== null);
      rec.step(3, { [PASO]: phase(2, 'WHERE'), [FILAS]: rows.length }, { tables: [tbl(T('filtrando…', 'filtering…'), cols, rows, keep.map((k) => (k ? 'keep' : 'drop')))] }, T('WHERE quita la fila sin nota. Se filtra <b>antes</b> de agrupar, fila por fila.', 'WHERE removes the row with no grade. Filtering happens <b>before</b> grouping, row by row.'));
      const f = rows.filter((_, i) => keep[i]);
      const courses = [...new Set(f.map((r) => r[1]))];
      const grouped = courses.flatMap((c) => f.filter((r) => r[1] === c));
      const gCls = grouped.map((r) => `g${courses.indexOf(r[1])}`);
      rec.step(4, { [PASO]: phase(3, 'GROUP BY'), [FILAS]: grouped.length, [GRUPOS]: courses.length }, { tables: [tbl(T('agrupando por curso', 'grouping by course'), cols, grouped, gCls)] },
        T(`GROUP BY junta las filas con el mismo curso: ${courses.length} grupos (un color por grupo).`, `GROUP BY gathers the rows with the same course: ${courses.length} groups (one color per group).`));
      const summary = courses.map((c) => { const g = f.filter((r) => r[1] === c); const avg = g.reduce((s, r) => s + r[2], 0) / g.length; return [c, g.length, +avg.toFixed(2)]; });
      const sCols = ['curso', 'COUNT(*)', 'AVG(nota)'];
      rec.step(4, { [PASO]: phase(3, 'GROUP BY'), [GRUPOS]: summary.length }, { tables: [tbl(T('un renglón por grupo', 'one row per group'), sCols, summary, summary.map((_, i) => `g${i}`))] },
        T('Cada grupo se resume en <b>una sola fila</b>. Desde aquí solo existen las columnas agrupadas y los agregados.', 'Each group is summarized in <b>a single row</b>. From here on, only the grouped columns and the aggregates exist.'));
      const hk = summary.map((r) => r[1] >= 2);
      rec.step(5, { [PASO]: phase(4, 'HAVING'), [GRUPOS]: summary.length }, { tables: [tbl(T('filtrando grupos…', 'filtering groups…'), sCols, summary, hk.map((k) => (k ? 'keep' : 'drop')))] },
        T('HAVING es como WHERE, pero para <b>grupos</b>: puede usar COUNT, AVG, etc. Concurrente tiene una sola nota y sale.', 'HAVING is like WHERE, but for <b>groups</b>: it can use COUNT, AVG, etc. Concurrente has a single grade and is dropped.'));
      const h = summary.filter((_, i) => hk[i]);
      const pCols = ['curso', 'notas', 'promedio'];
      rec.step(1, { [PASO]: phase(5, 'SELECT'), [FILAS]: h.length }, { tables: [tbl(T('SELECT con alias', 'SELECT with aliases'), pCols, h)] }, T('SELECT pone nombres (alias) a las columnas: <code>notas</code> y <code>promedio</code>.', 'SELECT gives the columns names (aliases): <code>notas</code> (grade count) and <code>promedio</code> (average).'));
      const sorted = h.slice().sort((a, b) => b[2] - a[2]);
      rec.step(6, { [PASO]: phase(6, 'ORDER BY'), [FILAS]: sorted.length }, { tables: [tbl(T('resultado final', 'final result'), pCols, sorted, sorted.map(() => 'keep'))] }, T('ORDER BY usa el alias <code>promedio</code>, que ya existe porque SELECT corrió antes.', 'ORDER BY uses the alias <code>promedio</code>, which already exists because SELECT ran before it.'));
      return rec.frames;
    },
    render,
    learn: {
      idea: `${schemaLearn}${T(`<p><strong>WHERE</strong> filtra filas antes de agrupar; <strong>HAVING</strong> filtra grupos después. Si la condición usa un agregado (COUNT, AVG, SUM…), tiene que ir en HAVING.</p><p>Después de GROUP BY, cada grupo es una fila: en SELECT solo puedes poner columnas del GROUP BY o agregados.</p>`,
        `<p><strong>WHERE</strong> filters rows before grouping; <strong>HAVING</strong> filters groups afterwards. If the condition uses an aggregate (COUNT, AVG, SUM…), it has to go in HAVING.</p><p>After GROUP BY, each group is one row: in SELECT you can only put GROUP BY columns or aggregates.</p>`)}`,
      signals: [T('La pregunta dice "<strong>por cada</strong> curso, cliente, mes…".', 'The question says "<strong>for each</strong> course, customer, month…".'), T('Te piden contar, sumar o promediar.', 'You are asked to count, sum or average.'), T('Hay una condición sobre el resultado de esa cuenta: va en HAVING.', 'There is a condition on the result of that calculation: it goes in HAVING.')],
      time: T('O(n log n) o O(n)', 'O(n log n) or O(n)'), space: T('O(grupos)', 'O(groups)'),
      why: T('El motor agrupa ordenando las filas o con una tabla hash. Filtrar en WHERE primero reduce el trabajo de agrupar.', 'The engine groups by sorting the rows or with a hash table. Filtering in WHERE first reduces the grouping work.')
    },
    build: {
      templateTitle: T('Plantilla de agregación', 'Aggregation template'),
      template: T(`SELECT   clave, COUNT(*) AS n, AVG(valor) AS prom
FROM     tabla
WHERE    filtro_por_fila          -- antes de agrupar
GROUP BY clave
HAVING   COUNT(*) >= 2            -- filtro por grupo
ORDER BY prom DESC;`, `SELECT   key, COUNT(*) AS n, AVG(value) AS avg
FROM     table_name
WHERE    per_row_filter           -- before grouping
GROUP BY key
HAVING   COUNT(*) >= 2            -- per-group filter
ORDER BY avg DESC;`),
      tips: [T('<code>COUNT(*)</code> cuenta filas; <code>COUNT(columna)</code> no cuenta los NULL. Aquí daría lo mismo porque WHERE ya los quitó.', '<code>COUNT(*)</code> counts rows; <code>COUNT(column)</code> does not count NULLs. Here it would make no difference because WHERE already removed them.'), T('AVG ignora los NULL: el promedio no los trata como cero.', 'AVG ignores NULLs: the average does not treat them as zero.'), T('Si un filtro no usa agregados, ponlo en WHERE: es más claro y más eficiente.', 'If a filter does not use aggregates, put it in WHERE: it is clearer and more efficient.')],
      similar: [T('Clientes con más de 5 pedidos en el último mes.', 'Customers with more than 5 orders in the last month.'), T('Departamento con el salario promedio más alto.', 'The department with the highest average salary.'), T('Cursos donde nadie reprobó (MIN(nota) ≥ 70).', 'Courses where nobody failed (MIN(nota) ≥ 70).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const antiJoin = {
    id: 'left-join-null',
    title: T('LEFT JOIN para encontrar ausentes', 'LEFT JOIN to find what is missing'),
    difficulty: T('Media', 'Medium'),
    pattern: 'Anti-join',
    statement: T('<p>¿Qué estudiantes <strong>no tienen ninguna matrícula</strong>? Una pregunta de entrevista muy común.</p>',
      '<p>Which students <strong>have no enrollments at all</strong>? A very common interview question.</p>'),
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
      rec.step(2, { [PASO]: phase(1, 'FROM'), [FILAS]: est.length }, { tables: [tbl('estudiantes e', ESTUDIANTES.columns, est)] }, T('Partimos de todos los estudiantes.', 'We start from all the students.'));
      const joined = [];
      const cls = [];
      est.forEach((e) => {
        const ms = MATRICULAS.rows.filter((m) => m[0] === e[0]);
        if (ms.length) ms.forEach((m) => { joined.push([e[0], e[1], m[0], m[1]]); cls.push(''); });
        else { joined.push([e[0], e[1], null, null]); cls.push('new'); }
      });
      const jCols = ['e.id', 'e.nombre', 'm.estudiante_id', 'm.curso'];
      rec.step(3, { [PASO]: phase(2, 'LEFT JOIN'), [FILAS]: joined.length }, { tables: [tbl('estudiantes ⟕ matriculas', jCols, joined, cls)] },
        T('LEFT JOIN conserva <b>todos</b> los estudiantes de la izquierda. Si no hay matrícula que coincida, rellena las columnas de la derecha con NULL (fila resaltada).',
          'LEFT JOIN keeps <b>all</b> the students on the left. If no enrollment matches, it fills the right-hand columns with NULL (highlighted row).'));
      const keep = joined.map((r) => r[2] === null);
      rec.step(4, { [PASO]: phase(3, 'WHERE'), [FILAS]: joined.length }, { tables: [tbl(T('filtrando…', 'filtering…'), jCols, joined, keep.map((k) => (k ? 'keep' : 'drop')))] },
        T('Nos quedamos solo con las filas donde la parte derecha quedó en NULL: esos estudiantes no tenían pareja.', 'We keep only the rows where the right-hand side ended up NULL: those students had no match.'));
      const res = joined.filter((_, i) => keep[i]).map((r) => [r[1]]);
      rec.step(1, { [PASO]: phase(4, 'SELECT'), [FILAS]: res.length }, { tables: [tbl(T('resultado final', 'final result'), ['nombre'], res, res.map(() => 'keep'))] },
        T(`Resultado: ${res.map((r) => r[0]).join(', ')}.`, `Result: ${res.length} student${res.length === 1 ? '' : 's'} with no enrollments, shown in the table.`));
      return rec.frames;
    },
    render,
    learn: {
      idea: `${schemaLearn}${T(`<p>Un <strong>LEFT JOIN</strong> devuelve todas las filas de la tabla izquierda, tengan o no pareja. Las que no tienen pareja traen NULL en las columnas de la derecha.</p><p>Filtrar por <code>IS NULL</code> en una columna de la derecha que nunca es NULL en datos reales (como la llave) deja exactamente "los que no tienen pareja". A esto se le llama anti-join.</p>`,
        `<p>A <strong>LEFT JOIN</strong> returns every row of the left table, whether or not it has a match. The ones without a match carry NULL in the right-hand columns.</p><p>Filtering with <code>IS NULL</code> on a right-hand column that is never NULL in real data (such as the key) leaves exactly "the ones without a match". This is called an anti-join.</p>`)}`,
      signals: [T('La pregunta tiene un "<strong>sin</strong>", "nunca" o "ninguno".', 'The question has a "<strong>without</strong>", "never" or "none".'), T('Necesitas lo que existe en una tabla pero no en otra.', 'You need what exists in one table but not in another.'), T('Un INNER JOIN perdería justo las filas que buscas.', 'An INNER JOIN would lose exactly the rows you are looking for.')],
      time: DEPENDE, space: DEPENDE,
      why: T('Con un índice en la llave foránea, el motor resuelve cada búsqueda rápido. <code>NOT EXISTS</code> suele generar el mismo plan.', 'With an index on the foreign key, the engine resolves each lookup quickly. <code>NOT EXISTS</code> usually produces the same plan.')
    },
    build: {
      templateTitle: T('Tres formas de escribir un anti-join', 'Three ways to write an anti-join'),
      template: T(`-- 1. LEFT JOIN + IS NULL
SELECT e.nombre FROM estudiantes e
LEFT JOIN matriculas m ON m.estudiante_id = e.id
WHERE m.estudiante_id IS NULL;

-- 2. NOT EXISTS (la más recomendada)
SELECT e.nombre FROM estudiantes e
WHERE NOT EXISTS (SELECT 1 FROM matriculas m WHERE m.estudiante_id = e.id);

-- 3. NOT IN (cuidado con los NULL)
SELECT nombre FROM estudiantes
WHERE id NOT IN (SELECT estudiante_id FROM matriculas);`, `-- 1. LEFT JOIN + IS NULL
SELECT e.nombre FROM estudiantes e
LEFT JOIN matriculas m ON m.estudiante_id = e.id
WHERE m.estudiante_id IS NULL;

-- 2. NOT EXISTS (the most recommended)
SELECT e.nombre FROM estudiantes e
WHERE NOT EXISTS (SELECT 1 FROM matriculas m WHERE m.estudiante_id = e.id);

-- 3. NOT IN (watch out for NULLs)
SELECT nombre FROM estudiantes
WHERE id NOT IN (SELECT estudiante_id FROM matriculas);`),
      tips: [T('Filtra por una columna de la derecha que <strong>no pueda ser NULL</strong> en los datos (la llave), no por una opcional como la nota.', 'Filter on a right-hand column that <strong>cannot be NULL</strong> in the data (the key), not on an optional one like the grade.'), T('Si la subconsulta de <code>NOT IN</code> devuelve algún NULL, el resultado queda vacío. <code>NOT EXISTS</code> no tiene ese problema.', 'If the <code>NOT IN</code> subquery returns any NULL, the result is empty. <code>NOT EXISTS</code> does not have that problem.'), T('Una condición sobre la tabla derecha en WHERE convierte el LEFT JOIN en INNER; ponla en el ON si quieres conservar filas.', 'A condition on the right-hand table in WHERE turns the LEFT JOIN into an INNER JOIN; put it in the ON clause if you want to keep rows.')],
      similar: [T('Clientes que nunca compraron.', 'Customers who never bought anything.'), T('Productos que no se vendieron este mes.', 'Products that did not sell this month.'), T('Empleados sin jefe asignado.', 'Employees with no assigned manager.')]
    }
  };

  window.sqlStation = new TraceStation('sql', [joinWhere, groupHaving, antiJoin]);
})();
