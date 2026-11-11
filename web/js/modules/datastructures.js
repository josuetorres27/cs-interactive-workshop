// CS Interactive Workshop - Data structures, traced line by line.
(function () {
  const { TraceStation, Recorder, viz } = window.Tracer;

  const parseArgs = (text) => {
    try { return JSON.parse(`[${text}]`); } catch (e) {
      throw new Error('No pude leer la entrada. Revisa comas, comillas y corchetes, como en los ejemplos.');
    }
  };
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };
  const isNumArr = (a) => Array.isArray(a) && a.every((x) => typeof x === 'number' && Number.isFinite(x));

  // ─────────────────────────────────────────────────────────────────────
  const parens = {
    id: 'valid-parens',
    title: 'Paréntesis balanceados',
    difficulty: 'Fácil',
    pattern: 'Pila',
    statement: '<p>Una cadena tiene <code>()</code>, <code>[]</code> y <code>{}</code>. ¿Está bien balanceada? Cada apertura debe cerrarse con su par y en el orden correcto.</p>',
    lang: 'python',
    code: [
      'def is_valid(s):',
      "    pairs = {')': '(', ']': '[', '}': '{'}",
      '    stack = []',
      '    for ch in s:',
      '        if ch in pairs:',
      '            if not stack or stack[-1] != pairs[ch]:',
      '                return False',
      '            stack.pop()',
      '        else:',
      '            stack.append(ch)',
      '    return not stack'
    ],
    presets: ['"{[()()]}"', '"([)]"', '"(()"'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && typeof a[0] === 'string', 'Escribe la cadena entre comillas, por ejemplo: "{[()]}"');
      need(/^[()[\]{}]{1,16}$/.test(a[0]), 'Usa solo ( ) [ ] { } y hasta 16 caracteres.');
      return { s: a[0] };
    },
    trace({ s }) {
      const rec = new Recorder();
      const pairs = { ')': '(', ']': '[', '}': '{' };
      const stack = [];
      let i = -1, ch;
      const V = (extra = {}) => ({ s, i, stack: stack.slice(), ...extra });
      const vars = () => (i < 0 ? { stack } : { ch, stack });
      rec.step(2, {}, V(), 'Un diccionario que dice qué apertura le corresponde a cada cierre.');
      rec.step(3, vars(), V(), 'La pila guarda las aperturas que todavía esperan su cierre.');
      for (i = 0; i < s.length; i++) {
        ch = s[i];
        rec.step(4, vars(), V(), `Leemos '${ch}'.`);
        if (ch in pairs) {
          rec.step(5, vars(), V(), `'${ch}' es un cierre.`);
          if (!stack.length || stack[stack.length - 1] !== pairs[ch]) {
            rec.step(6, vars(), V({ bad: true }), stack.length ? `El tope es '${stack[stack.length - 1]}', pero '${ch}' necesita '${pairs[ch]}'.` : 'La pila está vacía: este cierre no tiene pareja.');
            rec.step(7, vars(), V({ bad: true, end: true }), 'La cadena <b>no</b> está balanceada.');
            return rec.frames;
          }
          rec.step(6, vars(), V({ match: true }), `El tope '${stack[stack.length - 1]}' es su pareja.`);
          stack.pop();
          rec.step(8, vars(), V(), 'Sacamos el tope: ese par quedó cerrado.');
        } else {
          rec.step(5, vars(), V(), `'${ch}' es una apertura.`);
          rec.step(9, vars(), V(), 'Entonces...');
          stack.push(ch);
          rec.step(10, vars(), V({ pushed: true }), `...la apilamos. Espera su cierre.`);
        }
      }
      i = s.length;
      rec.step(11, vars(), V({ end: true, bad: stack.length > 0 }), stack.length ? `Se acabó la cadena, pero ${stack.length === 1 ? 'queda 1 apertura' : `quedan ${stack.length} aperturas`} sin cerrar: <b>False</b>.` : 'Se acabó la cadena y la pila está vacía: <b>True</b>.');
      return rec.frames;
    },
    render(st) {
      const state = {}; const ptr = {};
      st.s.split('').forEach((_, j) => { if (j < st.i) state[j] = 'dim'; });
      if (st.i >= 0 && st.i < st.s.length) {
        state[st.i] = st.bad ? 'bad' : st.match ? 'ok' : 'cur';
        ptr[st.i] = ['i'];
      }
      return `<div class="vz-split">${viz.cells(st.s.split(''), { ptr, state })}${viz.stack(st.stack, { hiTop: st.match || st.pushed })}</div>` +
        (st.end ? `<div class="vz-verdict ${st.bad ? 'bad' : 'ok'}">${st.bad ? 'No balanceada' : 'Balanceada'}</div>` : '');
    },
    learn: {
      idea: `<p>Lo último que se abre es lo primero que se debe cerrar: exactamente el orden <strong>LIFO</strong> de una pila. Apilamos cada apertura y, al ver un cierre, el tope tiene que ser su pareja.</p>
             <p>Al final la pila debe quedar vacía; si no, quedaron aperturas sin cerrar.</p>`,
      signals: ['Hay estructuras <strong>anidadas</strong>: paréntesis, etiquetas HTML, llamadas a funciones.', 'Necesitas "deshacer" o volver al estado anterior más reciente.', 'Procesas algo y lo último pendiente es lo que importa.'],
      time: 'O(n)', space: 'O(n)',
      why: 'Cada carácter se apila y desapila como mucho una vez.'
    },
    build: {
      template: `def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
        else:
            stack.append(ch)
    return not stack`,
      tips: ['Revisa que la pila no esté vacía <strong>antes</strong> de mirar el tope: es el error más común.', 'No olvides el chequeo final: <code>"(("</code> no tiene errores de pareja, pero no está balanceada.', 'En C++ usa <code>std::stack&lt;char&gt;</code>; en Java, <code>ArrayDeque</code> en lugar de <code>Stack</code>.'],
      similar: ['Evaluar una expresión en notación polaca inversa.', 'Simplificar una ruta de Unix (<code>/a/./b/../c</code>).', 'Pila que devuelve el mínimo en O(1).']
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const reverseList = {
    id: 'reverse-list',
    title: 'Invertir una lista enlazada',
    difficulty: 'Fácil',
    pattern: 'Lista enlazada',
    statement: '<p>Dada la cabeza de una lista enlazada simple, inviértela <strong>en el lugar</strong> (sin crear nodos nuevos) y devuelve la nueva cabeza.</p>',
    lang: 'python',
    code: [
      'def reverse(head):',
      '    prev = None',
      '    curr = head',
      '    while curr:',
      '        nxt = curr.next',
      '        curr.next = prev',
      '        prev = curr',
      '        curr = nxt',
      '    return prev'
    ],
    presets: ['[1, 2, 3, 4, 5]', '[7, 14]', '[42]'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && Array.isArray(a[0]) && a[0].length >= 1 && a[0].length <= 7, 'Escribe los valores de la lista, entre 1 y 7, por ejemplo: [1, 2, 3]');
      return { values: a[0] };
    },
    trace({ values }) {
      const rec = new Recorder();
      const n = values.length;
      const next = values.map((_, i) => (i + 1 < n ? i + 1 : null));
      let prev = null, curr = 0, nxt;
      const name = (i) => (i === null || i === undefined ? null : `§nodo(${values[i]})`);
      const V = () => ({ values, next: next.slice(), ptr: nxt === undefined ? { prev, curr } : { prev, curr, nxt } });
      const vars = () => (nxt === undefined ? { prev: name(prev), curr: name(curr) } : { prev: name(prev), curr: name(curr), nxt: name(nxt) });
      rec.step(2, { prev: null }, { values, next: next.slice(), ptr: { prev } }, '<b>prev</b> será la cabeza de la parte ya invertida. Al principio no hay nada.');
      rec.step(3, vars(), V(), '<b>curr</b> es el nodo que vamos a voltear.');
      while (true) {
        if (curr === null) { rec.step(4, vars(), V(), 'curr es None: ya volteamos todos los nodos.'); break; }
        rec.step(4, vars(), V(), `curr apunta a ${values[curr]}: seguimos.`);
        nxt = next[curr];
        rec.step(5, vars(), V(), 'Guardamos el siguiente <b>antes</b> de romper el enlace; si no, perderíamos el resto de la lista.');
        next[curr] = prev;
        rec.step(6, vars(), V(), prev === null ? `${values[curr]} ahora apunta a None: será la nueva cola.` : `Volteamos la flecha: ${values[curr]} ahora apunta a ${values[prev]}.`);
        prev = curr;
        rec.step(7, vars(), V(), 'prev avanza al nodo recién volteado.');
        curr = nxt;
        rec.step(8, vars(), V(), curr === null ? 'curr avanza a None.' : `curr avanza a ${values[curr]}.`);
      }
      rec.step(9, vars(), V(), `Devolvemos prev: la nueva cabeza es <b>${values[prev]}</b>.`);
      return rec.frames;
    },
    render(st) {
      return viz.linked(st.values, st.next, st.ptr);
    },
    learn: {
      idea: `<p>Recorremos la lista una vez con tres punteros. En cada nodo: guardamos el siguiente (<b>nxt</b>), volteamos la flecha hacia atrás (<b>prev</b>) y avanzamos ambos.</p>
             <p>El orden importa: si volteas la flecha antes de guardar <code>curr.next</code>, pierdes el resto de la lista.</p>`,
      signals: ['Te piden modificar una lista enlazada <strong>sin memoria extra</strong>.', 'Hay que invertir una parte: la segunda mitad, de k en k, entre dos posiciones.', 'Casi cualquier problema de listas termina usando este bloque.'],
      time: 'O(n)', space: 'O(1)',
      why: 'Cada nodo se visita una vez y solo usamos tres punteros.'
    },
    build: {
      template: `struct Node { int val; Node* next; };

Node* reverse(Node* head) {
    Node* prev = nullptr;
    Node* curr = head;
    while (curr) {
        Node* nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    return prev;
}`,
      templateTitle: 'La misma idea en C++',
      tips: ['Dibuja tres cajas y las flechas en la pizarra antes de programar. Narra cada asignación.', 'Prueba con lista vacía, de un nodo y de dos nodos.', 'Te pueden pedir la versión <strong>recursiva</strong>: <code>reverse(head.next)</code> y luego <code>head.next.next = head</code>.'],
      similar: ['Invertir los nodos de k en k.', '¿Es la lista un palíndromo? (invierte la segunda mitad).', 'Detectar un ciclo (punteros lento y rápido).']
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const bst = {
    id: 'bst-insert',
    title: 'Insertar en un árbol binario de búsqueda',
    difficulty: 'Media',
    pattern: 'Árbol binario de búsqueda',
    statement: '<p>Inserta una secuencia de claves, una por una, en un <strong>árbol binario de búsqueda</strong>: los menores van a la izquierda y los mayores (o iguales) a la derecha.</p>',
    lang: 'python',
    code: [
      'def insert(root, key):',
      '    node = Node(key)',
      '    if root is None:',
      '        return node',
      '    curr = root',
      '    while True:',
      '        if key < curr.key:',
      '            if curr.left is None:',
      '                curr.left = node',
      '                return root',
      '            curr = curr.left',
      '        else:',
      '            if curr.right is None:',
      '                curr.right = node',
      '                return root',
      '            curr = curr.right',
      '',
      'root = None',
      'for key in keys:',
      '    root = insert(root, key)'
    ],
    presets: ['[50, 30, 70, 20, 40, 60, 80, 35]', '[8, 3, 10, 1, 6, 14, 4, 7, 13]', '[1, 2, 3, 4, 5]'],
    parse(text) {
      const a = parseArgs(text);
      need(a.length === 1 && isNumArr(a[0]), 'Escribe las claves, por ejemplo: [50, 30, 70, 20]');
      need(a[0].length >= 1 && a[0].length <= 12, 'Usa entre 1 y 12 claves.');
      need(a[0].every((x) => Number.isInteger(x) && x >= 0 && x <= 999), 'Usa enteros entre 0 y 999.');
      return { keys: a[0] };
    },
    trace({ keys }) {
      const rec = new Recorder();
      const nodes = [];
      let root = null, key, curr = null, path = [];
      const name = (id) => (id === null ? null : `§Node(${nodes[id].key})`);
      const V = (extra = {}) => ({ nodes: nodes.map((x) => ({ ...x })), root, path: path.slice(), cur: curr, ...extra });
      const vars = () => (key === undefined ? { keys, root: name(root) } : { key, curr: name(curr), root: name(root) });
      rec.step(18, vars(), V(), 'Empezamos con un árbol vacío.');
      for (const k of keys) {
        key = k; curr = null; path = [];
        rec.step(19, vars(), V(), `Siguiente clave: <b>${k}</b>.`);
        rec.step(20, vars(), V(), `Llamamos a insert(root, ${k}).`);
        const id = nodes.length;
        rec.step(2, vars(), V(), `Creamos el nodo ${k} (todavía suelto).`);
        if (root === null) {
          rec.step(3, vars(), V(), 'El árbol está vacío...');
          nodes.push({ key: k, left: null, right: null });
          root = id;
          rec.step(4, vars(), V({ fresh: id }), `...así que ${k} se vuelve la raíz.`);
          continue;
        }
        rec.step(3, vars(), V(), 'El árbol no está vacío.');
        curr = root; path = [root];
        rec.step(5, vars(), V(), `Empezamos a bajar desde la raíz (${nodes[root].key}).`);
        while (true) {
          rec.step(6, vars(), V(), 'Bajamos un nivel.');
          if (k < nodes[curr].key) {
            rec.step(7, vars(), V(), `${k} &lt; ${nodes[curr].key}: vamos a la <b>izquierda</b>.`);
            if (nodes[curr].left === null) {
              rec.step(8, vars(), V(), `${nodes[curr].key} no tiene hijo izquierdo: ¡encontramos el lugar!`);
              nodes.push({ key: k, left: null, right: null });
              nodes[curr].left = id;
              rec.step(9, vars(), V({ fresh: id }), `Colgamos ${k} a la izquierda de ${nodes[curr].key}.`);
              rec.step(10, vars(), V({ fresh: id }), `Recorrimos ${path.length} nivel${path.length === 1 ? '' : 'es'}. La raíz no cambia.`);
              break;
            }
            rec.step(8, vars(), V(), 'Ya hay un hijo izquierdo.');
            curr = nodes[curr].left; path.push(curr);
            rec.step(11, vars(), V(), `Bajamos a ${nodes[curr].key}.`);
          } else {
            rec.step(7, vars(), V(), `${k} ≥ ${nodes[curr].key}: no vamos a la izquierda...`);
            rec.step(12, vars(), V(), '...vamos a la <b>derecha</b>.');
            if (nodes[curr].right === null) {
              rec.step(13, vars(), V(), `${nodes[curr].key} no tiene hijo derecho: ¡encontramos el lugar!`);
              nodes.push({ key: k, left: null, right: null });
              nodes[curr].right = id;
              rec.step(14, vars(), V({ fresh: id }), `Colgamos ${k} a la derecha de ${nodes[curr].key}.`);
              rec.step(15, vars(), V({ fresh: id }), `Recorrimos ${path.length} nivel${path.length === 1 ? '' : 'es'}. La raíz no cambia.`);
              break;
            }
            rec.step(13, vars(), V(), 'Ya hay un hijo derecho.');
            curr = nodes[curr].right; path.push(curr);
            rec.step(16, vars(), V(), `Bajamos a ${nodes[curr].key}.`);
          }
        }
      }
      curr = null; path = [];
      const height = (id) => (id === null ? 0 : 1 + Math.max(height(nodes[id].left), height(nodes[id].right)));
      rec.step(19, vars(), V(), `Listo: ${nodes.length} nodos y altura ${height(root)}. ${height(root) === nodes.length && nodes.length > 2 ? 'Ojo: las claves venían ordenadas y el árbol quedó como una lista.' : ''}`);
      return rec.frames;
    },
    render(st) {
      return viz.tree(st.nodes, st.root, { path: st.path, cur: st.cur, fresh: st.fresh });
    },
    learn: {
      idea: `<p>En un árbol binario de búsqueda, todo lo que está a la izquierda de un nodo es menor y todo lo que está a la derecha es mayor. Para insertar, bajamos comparando hasta encontrar un hueco vacío en el lado correcto.</p>
             <p>El costo depende de la <strong>altura</strong>. Con claves en orden aleatorio, la altura ronda log n; con claves ya ordenadas el árbol se degenera en una lista (prueba el ejemplo 3).</p>`,
      signals: ['Necesitas buscar, insertar y recorrer <strong>en orden</strong> datos que cambian.', 'Te piden el k-ésimo menor, el sucesor o un rango de claves.', 'Los arreglos ordenados se vuelven lentos al insertar en medio.'],
      time: 'O(h)', space: 'O(1)',
      why: 'h es la altura: O(log n) si el árbol está balanceado y O(n) en el peor caso. Los árboles AVL y rojinegros garantizan O(log n).'
    },
    build: {
      template: `class Node:
    def __init__(self, key):
        self.key = key
        self.left = self.right = None

def search(root, key):
    curr = root
    while curr and curr.key != key:
        curr = curr.left if key < curr.key else curr.right
    return curr

def inorder(root):        # devuelve las claves ordenadas
    if root is None:
        return []
    return inorder(root.left) + [root.key] + inorder(root.right)`,
      templateTitle: 'Buscar y recorrer en orden',
      tips: ['Pregunta qué hacer con claves <strong>repetidas</strong>: ignorarlas, contarlas o mandarlas a un lado.', 'Para validar un BST no basta comparar con los hijos: pasa un rango (mínimo, máximo) hacia abajo.', 'El recorrido en orden de un BST devuelve las claves ordenadas: úsalo como prueba rápida.'],
      similar: ['Validar si un árbol binario es un BST.', 'K-ésimo menor elemento en un BST.', 'Ancestro común más bajo en un BST.']
    }
  };

  window.dsStation = new TraceStation('datastructures', [parens, reverseList, bst]);
})();
