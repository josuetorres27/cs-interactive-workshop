// CS Interactive Workshop - Data structures, traced line by line.
(function () {
  const { TraceStation, Recorder, viz } = window.Tracer;

  const parseArgs = (text) => {
    try { return JSON.parse(`[${text}]`); } catch (e) {
      throw new Error(T('No pude leer la entrada. Revisa comas, comillas y corchetes, como en los ejemplos.', 'I could not read the input. Check the commas, quotes and brackets, as in the examples.'));
    }
  };
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };
  const isNumArr = (a) => Array.isArray(a) && a.every((x) => typeof x === 'number' && Number.isFinite(x));

  // ─────────────────────────────────────────────────────────────────────
  const parens = {
    id: 'valid-parens',
    title: T('Paréntesis balanceados', 'Balanced parentheses'),
    difficulty: T('Fácil', 'Easy'),
    pattern: T('Pila', 'Stack'),
    statement: T('<p>Una cadena tiene <code>()</code>, <code>[]</code> y <code>{}</code>. ¿Está bien balanceada? Cada apertura debe cerrarse con su par y en el orden correcto.</p>',
      '<p>A string contains <code>()</code>, <code>[]</code> and <code>{}</code>. Is it properly balanced? Every opening bracket must be closed by its pair, in the right order.</p>'),
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
      need(a.length === 1 && typeof a[0] === 'string', T('Escribe la cadena entre comillas, por ejemplo: "{[()]}"', 'Write the string in quotes, for example: "{[()]}"'));
      need(/^[()[\]{}]{1,16}$/.test(a[0]), T('Usa solo ( ) [ ] { } y hasta 16 caracteres.', 'Use only ( ) [ ] { } and up to 16 characters.'));
      return { s: a[0] };
    },
    trace({ s }) {
      const rec = new Recorder();
      const pairs = { ')': '(', ']': '[', '}': '{' };
      const stack = [];
      let i = -1, ch;
      const V = (extra = {}) => ({ s, i, stack: stack.slice(), ...extra });
      const vars = () => (i < 0 ? { stack } : { ch, stack });
      rec.step(2, {}, V(), T('Un diccionario que dice qué apertura le corresponde a cada cierre.', 'A dictionary that says which opening bracket matches each closing one.'));
      rec.step(3, vars(), V(), T('La pila guarda las aperturas que todavía esperan su cierre.', 'The stack holds the opening brackets that are still waiting to be closed.'));
      for (i = 0; i < s.length; i++) {
        ch = s[i];
        rec.step(4, vars(), V(), T(`Leemos '${ch}'.`, `We read '${ch}'.`));
        if (ch in pairs) {
          rec.step(5, vars(), V(), T(`'${ch}' es un cierre.`, `'${ch}' is a closing bracket.`));
          if (!stack.length || stack[stack.length - 1] !== pairs[ch]) {
            rec.step(6, vars(), V({ bad: true }), stack.length ? T(`El tope es '${stack[stack.length - 1]}', pero '${ch}' necesita '${pairs[ch]}'.`, `The top is '${stack[stack.length - 1]}', but '${ch}' needs '${pairs[ch]}'.`) : T('La pila está vacía: este cierre no tiene pareja.', 'The stack is empty: this closing bracket has no partner.'));
            rec.step(7, vars(), V({ bad: true, end: true }), T('La cadena <b>no</b> está balanceada.', 'The string is <b>not</b> balanced.'));
            return rec.frames;
          }
          rec.step(6, vars(), V({ match: true }), T(`El tope '${stack[stack.length - 1]}' es su pareja.`, `The top '${stack[stack.length - 1]}' is its partner.`));
          stack.pop();
          rec.step(8, vars(), V(), T('Sacamos el tope: ese par quedó cerrado.', 'We pop the top: that pair is now closed.'));
        } else {
          rec.step(5, vars(), V(), T(`'${ch}' es una apertura.`, `'${ch}' is an opening bracket.`));
          rec.step(9, vars(), V(), T('Entonces...', 'So...'));
          stack.push(ch);
          rec.step(10, vars(), V({ pushed: true }), T(`...la apilamos. Espera su cierre.`, `...we push it. It waits for its closing bracket.`));
        }
      }
      i = s.length;
      rec.step(11, vars(), V({ end: true, bad: stack.length > 0 }), stack.length ? T(`Se acabó la cadena, pero ${stack.length === 1 ? 'queda 1 apertura' : `quedan ${stack.length} aperturas`} sin cerrar: <b>False</b>.`, `The string is over, but ${stack.length === 1 ? '1 opening bracket is' : `${stack.length} opening brackets are`} still unclosed: <b>False</b>.`) : T('Se acabó la cadena y la pila está vacía: <b>True</b>.', 'The string is over and the stack is empty: <b>True</b>.'));
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
        (st.end ? `<div class="vz-verdict ${st.bad ? 'bad' : 'ok'}">${st.bad ? T('No balanceada', 'Not balanced') : T('Balanceada', 'Balanced')}</div>` : '');
    },
    learn: {
      idea: T(`<p>Lo último que se abre es lo primero que se debe cerrar: exactamente el orden <strong>LIFO</strong> de una pila. Apilamos cada apertura y, al ver un cierre, el tope tiene que ser su pareja.</p>
             <p>Al final la pila debe quedar vacía; si no, quedaron aperturas sin cerrar.</p>`, `<p>The last thing opened is the first thing that must be closed: exactly the <strong>LIFO</strong> order of a stack. We push every opening bracket and, when we see a closing one, the top has to be its partner.</p>
             <p>At the end the stack must be empty; if not, some opening brackets were never closed.</p>`),
      signals: [T('Hay estructuras <strong>anidadas</strong>: paréntesis, etiquetas HTML, llamadas a funciones.', 'There are <strong>nested</strong> structures: parentheses, HTML tags, function calls.'), T('Necesitas "deshacer" o volver al estado anterior más reciente.', 'You need to "undo" or go back to the most recent previous state.'), T('Procesas algo y lo último pendiente es lo que importa.', 'You process something and the most recent pending item is the one that matters.')],
      time: 'O(n)', space: 'O(n)',
      why: T('Cada carácter se apila y desapila como mucho una vez.', 'Each character is pushed and popped at most once.')
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
      tips: [T('Revisa que la pila no esté vacía <strong>antes</strong> de mirar el tope: es el error más común.', 'Check that the stack is not empty <strong>before</strong> looking at the top: it is the most common mistake.'), T('No olvides el chequeo final: <code>"(("</code> no tiene errores de pareja, pero no está balanceada.', 'Do not forget the final check: <code>"(("</code> has no mismatched pairs, but it is not balanced.'), T('En C++ usa <code>std::stack&lt;char&gt;</code>; en Java, <code>ArrayDeque</code> en lugar de <code>Stack</code>.', 'In C++ use <code>std::stack&lt;char&gt;</code>; in Java, <code>ArrayDeque</code> instead of <code>Stack</code>.')],
      similar: [T('Evaluar una expresión en notación polaca inversa.', 'Evaluate an expression in reverse Polish notation.'), T('Simplificar una ruta de Unix (<code>/a/./b/../c</code>).', 'Simplify a Unix path (<code>/a/./b/../c</code>).'), T('Pila que devuelve el mínimo en O(1).', 'A stack that returns its minimum in O(1).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const reverseList = {
    id: 'reverse-list',
    title: T('Invertir una lista enlazada', 'Reverse a linked list'),
    difficulty: T('Fácil', 'Easy'),
    pattern: T('Lista enlazada', 'Linked list'),
    statement: T('<p>Dada la cabeza de una lista enlazada simple, inviértela <strong>en el lugar</strong> (sin crear nodos nuevos) y devuelve la nueva cabeza.</p>',
      '<p>Given the head of a singly linked list, reverse it <strong>in place</strong> (without creating new nodes) and return the new head.</p>'),
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
      need(a.length === 1 && Array.isArray(a[0]) && a[0].length >= 1 && a[0].length <= 7, T('Escribe los valores de la lista, entre 1 y 7, por ejemplo: [1, 2, 3]', 'Write the list values, between 1 and 7 of them, for example: [1, 2, 3]'));
      return { values: a[0] };
    },
    trace({ values }) {
      const rec = new Recorder();
      const n = values.length;
      const next = values.map((_, i) => (i + 1 < n ? i + 1 : null));
      let prev = null, curr = 0, nxt;
      const name = (i) => (i === null || i === undefined ? null : `§${T('nodo', 'node')}(${values[i]})`);
      const V = () => ({ values, next: next.slice(), ptr: nxt === undefined ? { prev, curr } : { prev, curr, nxt } });
      const vars = () => (nxt === undefined ? { prev: name(prev), curr: name(curr) } : { prev: name(prev), curr: name(curr), nxt: name(nxt) });
      rec.step(2, { prev: null }, { values, next: next.slice(), ptr: { prev } }, T('<b>prev</b> será la cabeza de la parte ya invertida. Al principio no hay nada.', '<b>prev</b> will be the head of the part already reversed. At the start there is nothing.'));
      rec.step(3, vars(), V(), T('<b>curr</b> es el nodo que vamos a voltear.', '<b>curr</b> is the node we are about to flip.'));
      while (true) {
        if (curr === null) { rec.step(4, vars(), V(), T('curr es None: ya volteamos todos los nodos.', 'curr is None: we have flipped every node.')); break; }
        rec.step(4, vars(), V(), T(`curr apunta a ${values[curr]}: seguimos.`, `curr points to ${values[curr]}: we keep going.`));
        nxt = next[curr];
        rec.step(5, vars(), V(), T('Guardamos el siguiente <b>antes</b> de romper el enlace; si no, perderíamos el resto de la lista.', 'We save the next node <b>before</b> breaking the link; otherwise we would lose the rest of the list.'));
        next[curr] = prev;
        rec.step(6, vars(), V(), prev === null ? T(`${values[curr]} ahora apunta a None: será la nueva cola.`, `${values[curr]} now points to None: it will be the new tail.`) : T(`Volteamos la flecha: ${values[curr]} ahora apunta a ${values[prev]}.`, `We flip the arrow: ${values[curr]} now points to ${values[prev]}.`));
        prev = curr;
        rec.step(7, vars(), V(), T('prev avanza al nodo recién volteado.', 'prev moves to the node we just flipped.'));
        curr = nxt;
        rec.step(8, vars(), V(), curr === null ? T('curr avanza a None.', 'curr moves to None.') : T(`curr avanza a ${values[curr]}.`, `curr moves to ${values[curr]}.`));
      }
      rec.step(9, vars(), V(), T(`Devolvemos prev: la nueva cabeza es <b>${values[prev]}</b>.`, `We return prev: the new head is <b>${values[prev]}</b>.`));
      return rec.frames;
    },
    render(st) {
      return viz.linked(st.values, st.next, st.ptr);
    },
    learn: {
      idea: T(`<p>Recorremos la lista una vez con tres punteros. En cada nodo: guardamos el siguiente (<b>nxt</b>), volteamos la flecha hacia atrás (<b>prev</b>) y avanzamos ambos.</p>
             <p>El orden importa: si volteas la flecha antes de guardar <code>curr.next</code>, pierdes el resto de la lista.</p>`, `<p>We walk the list once with three pointers. At each node: we save the next one (<b>nxt</b>), flip the arrow backwards (<b>prev</b>) and move both forward.</p>
             <p>The order matters: if you flip the arrow before saving <code>curr.next</code>, you lose the rest of the list.</p>`),
      signals: [T('Te piden modificar una lista enlazada <strong>sin memoria extra</strong>.', 'You are asked to modify a linked list <strong>without extra memory</strong>.'), T('Hay que invertir una parte: la segunda mitad, de k en k, entre dos posiciones.', 'You need to reverse a part of it: the second half, k nodes at a time, between two positions.'), T('Casi cualquier problema de listas termina usando este bloque.', 'Almost every list problem ends up using this building block.')],
      time: 'O(n)', space: 'O(1)',
      why: T('Cada nodo se visita una vez y solo usamos tres punteros.', 'Each node is visited once and we only use three pointers.')
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
      templateTitle: T('La misma idea en C++', 'The same idea in C++'),
      tips: [T('Dibuja tres cajas y las flechas en la pizarra antes de programar. Narra cada asignación.', 'Draw three boxes and the arrows on the whiteboard before coding. Narrate every assignment.'), T('Prueba con lista vacía, de un nodo y de dos nodos.', 'Test with an empty list, a one-node list and a two-node list.'), T('Te pueden pedir la versión <strong>recursiva</strong>: <code>reverse(head.next)</code> y luego <code>head.next.next = head</code>.', 'You may be asked for the <strong>recursive</strong> version: <code>reverse(head.next)</code> and then <code>head.next.next = head</code>.')],
      similar: [T('Invertir los nodos de k en k.', 'Reverse the nodes k at a time.'), T('¿Es la lista un palíndromo? (invierte la segunda mitad).', 'Is the list a palindrome? (reverse the second half).'), T('Detectar un ciclo (punteros lento y rápido).', 'Detect a cycle (slow and fast pointers).')]
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  const bst = {
    id: 'bst-insert',
    title: T('Insertar en un árbol binario de búsqueda', 'Insert into a binary search tree'),
    difficulty: T('Media', 'Medium'),
    pattern: T('Árbol binario de búsqueda', 'Binary search tree'),
    statement: T('<p>Inserta una secuencia de claves, una por una, en un <strong>árbol binario de búsqueda</strong>: los menores van a la izquierda y los mayores (o iguales) a la derecha.</p>',
      '<p>Insert a sequence of keys, one by one, into a <strong>binary search tree</strong>: smaller keys go to the left and larger (or equal) ones to the right.</p>'),
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
      need(a.length === 1 && isNumArr(a[0]), T('Escribe las claves, por ejemplo: [50, 30, 70, 20]', 'Write the keys, for example: [50, 30, 70, 20]'));
      need(a[0].length >= 1 && a[0].length <= 12, T('Usa entre 1 y 12 claves.', 'Use between 1 and 12 keys.'));
      need(a[0].every((x) => Number.isInteger(x) && x >= 0 && x <= 999), T('Usa enteros entre 0 y 999.', 'Use integers between 0 and 999.'));
      return { keys: a[0] };
    },
    trace({ keys }) {
      const rec = new Recorder();
      const nodes = [];
      let root = null, key, curr = null, path = [];
      const name = (id) => (id === null ? null : `§Node(${nodes[id].key})`);
      const V = (extra = {}) => ({ nodes: nodes.map((x) => ({ ...x })), root, path: path.slice(), cur: curr, ...extra });
      const vars = () => (key === undefined ? { keys, root: name(root) } : { key, curr: name(curr), root: name(root) });
      rec.step(18, vars(), V(), T('Empezamos con un árbol vacío.', 'We start with an empty tree.'));
      for (const k of keys) {
        key = k; curr = null; path = [];
        rec.step(19, vars(), V(), T(`Siguiente clave: <b>${k}</b>.`, `Next key: <b>${k}</b>.`));
        rec.step(20, vars(), V(), T(`Llamamos a insert(root, ${k}).`, `We call insert(root, ${k}).`));
        const id = nodes.length;
        rec.step(2, vars(), V(), T(`Creamos el nodo ${k} (todavía suelto).`, `We create node ${k} (not attached yet).`));
        if (root === null) {
          rec.step(3, vars(), V(), T('El árbol está vacío...', 'The tree is empty...'));
          nodes.push({ key: k, left: null, right: null });
          root = id;
          rec.step(4, vars(), V({ fresh: id }), T(`...así que ${k} se vuelve la raíz.`, `...so ${k} becomes the root.`));
          continue;
        }
        rec.step(3, vars(), V(), T('El árbol no está vacío.', 'The tree is not empty.'));
        curr = root; path = [root];
        rec.step(5, vars(), V(), T(`Empezamos a bajar desde la raíz (${nodes[root].key}).`, `We start going down from the root (${nodes[root].key}).`));
        while (true) {
          rec.step(6, vars(), V(), T('Bajamos un nivel.', 'We go down one level.'));
          if (k < nodes[curr].key) {
            rec.step(7, vars(), V(), T(`${k} &lt; ${nodes[curr].key}: vamos a la <b>izquierda</b>.`, `${k} &lt; ${nodes[curr].key}: we go <b>left</b>.`));
            if (nodes[curr].left === null) {
              rec.step(8, vars(), V(), T(`${nodes[curr].key} no tiene hijo izquierdo: ¡encontramos el lugar!`, `${nodes[curr].key} has no left child: we found the spot!`));
              nodes.push({ key: k, left: null, right: null });
              nodes[curr].left = id;
              rec.step(9, vars(), V({ fresh: id }), T(`Colgamos ${k} a la izquierda de ${nodes[curr].key}.`, `We hang ${k} to the left of ${nodes[curr].key}.`));
              rec.step(10, vars(), V({ fresh: id }), T(`Recorrimos ${path.length} nivel${path.length === 1 ? '' : 'es'}. La raíz no cambia.`, `We went through ${path.length} level${path.length === 1 ? '' : 's'}. The root does not change.`));
              break;
            }
            rec.step(8, vars(), V(), T('Ya hay un hijo izquierdo.', 'There is already a left child.'));
            curr = nodes[curr].left; path.push(curr);
            rec.step(11, vars(), V(), T(`Bajamos a ${nodes[curr].key}.`, `We go down to ${nodes[curr].key}.`));
          } else {
            rec.step(7, vars(), V(), T(`${k} ≥ ${nodes[curr].key}: no vamos a la izquierda...`, `${k} ≥ ${nodes[curr].key}: we do not go left...`));
            rec.step(12, vars(), V(), T('...vamos a la <b>derecha</b>.', '...we go <b>right</b>.'));
            if (nodes[curr].right === null) {
              rec.step(13, vars(), V(), T(`${nodes[curr].key} no tiene hijo derecho: ¡encontramos el lugar!`, `${nodes[curr].key} has no right child: we found the spot!`));
              nodes.push({ key: k, left: null, right: null });
              nodes[curr].right = id;
              rec.step(14, vars(), V({ fresh: id }), T(`Colgamos ${k} a la derecha de ${nodes[curr].key}.`, `We hang ${k} to the right of ${nodes[curr].key}.`));
              rec.step(15, vars(), V({ fresh: id }), T(`Recorrimos ${path.length} nivel${path.length === 1 ? '' : 'es'}. La raíz no cambia.`, `We went through ${path.length} level${path.length === 1 ? '' : 's'}. The root does not change.`));
              break;
            }
            rec.step(13, vars(), V(), T('Ya hay un hijo derecho.', 'There is already a right child.'));
            curr = nodes[curr].right; path.push(curr);
            rec.step(16, vars(), V(), T(`Bajamos a ${nodes[curr].key}.`, `We go down to ${nodes[curr].key}.`));
          }
        }
      }
      curr = null; path = [];
      const height = (id) => (id === null ? 0 : 1 + Math.max(height(nodes[id].left), height(nodes[id].right)));
      rec.step(19, vars(), V(), T(`Listo: ${nodes.length} nodos y altura ${height(root)}. ${height(root) === nodes.length && nodes.length > 2 ? 'Ojo: las claves venían ordenadas y el árbol quedó como una lista.' : ''}`, `Done: ${nodes.length} nodes and height ${height(root)}. ${height(root) === nodes.length && nodes.length > 2 ? 'Careful: the keys came in sorted order and the tree ended up shaped like a list.' : ''}`));
      return rec.frames;
    },
    render(st) {
      return viz.tree(st.nodes, st.root, { path: st.path, cur: st.cur, fresh: st.fresh });
    },
    learn: {
      idea: T(`<p>En un árbol binario de búsqueda, todo lo que está a la izquierda de un nodo es menor y todo lo que está a la derecha es mayor. Para insertar, bajamos comparando hasta encontrar un hueco vacío en el lado correcto.</p>
             <p>El costo depende de la <strong>altura</strong>. Con claves en orden aleatorio, la altura ronda log n; con claves ya ordenadas el árbol se degenera en una lista (prueba el ejemplo 3).</p>`, `<p>In a binary search tree, everything to the left of a node is smaller and everything to the right is larger. To insert, we go down comparing until we find an empty slot on the correct side.</p>
             <p>The cost depends on the <strong>height</strong>. With keys in random order, the height is around log n; with keys already sorted the tree degenerates into a list (try example 3).</p>`),
      signals: [T('Necesitas buscar, insertar y recorrer <strong>en orden</strong> datos que cambian.', 'You need to search, insert and traverse <strong>in order</strong> data that keeps changing.'), T('Te piden el k-ésimo menor, el sucesor o un rango de claves.', 'You are asked for the k-th smallest, the successor or a range of keys.'), T('Los arreglos ordenados se vuelven lentos al insertar en medio.', 'Sorted arrays become slow when you insert in the middle.')],
      time: 'O(h)', space: 'O(1)',
      why: T('h es la altura: O(log n) si el árbol está balanceado y O(n) en el peor caso. Los árboles AVL y rojinegros garantizan O(log n).', 'h is the height: O(log n) if the tree is balanced and O(n) in the worst case. AVL and red-black trees guarantee O(log n).')
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
      templateTitle: T('Buscar y recorrer en orden', 'Search and in-order traversal'),
      tips: [T('Pregunta qué hacer con claves <strong>repetidas</strong>: ignorarlas, contarlas o mandarlas a un lado.', 'Ask what to do with <strong>duplicate</strong> keys: ignore them, count them or send them to one side.'), T('Para validar un BST no basta comparar con los hijos: pasa un rango (mínimo, máximo) hacia abajo.', 'To validate a BST it is not enough to compare with the children: pass a range (minimum, maximum) down the tree.'), T('El recorrido en orden de un BST devuelve las claves ordenadas: úsalo como prueba rápida.', 'The in-order traversal of a BST returns the keys sorted: use it as a quick check.')],
      similar: [T('Validar si un árbol binario es un BST.', 'Check whether a binary tree is a BST.'), T('K-ésimo menor elemento en un BST.', 'K-th smallest element in a BST.'), T('Ancestro común más bajo en un BST.', 'Lowest common ancestor in a BST.')]
    }
  };

  // One station per difficulty: datastructures-easy and datastructures-medium.
  window.dsStations = window.Tracer.byLevel('datastructures', [parens, reverseList, bst]);
})();
