// CS Interactive Workshop - App orchestrator
// Screens: intro (#/) -> about (#/about) -> work areas (#/workshop)
//          -> one area's stations (#/area/<area>) -> station (#/workshop/<module>[/<step>])

const AREAS = {
  algorithms:  { title: T('Algoritmos y Estructuras de Datos', 'Algorithms and Data Structures'), line: T('Cómo se ordenan, guardan y recorren los datos.', 'How data is sorted, stored and traversed.') },
  parallel:    { title: T('Programación Paralela y Concurrente', 'Parallel and Concurrent Programming'), line: T('Hilos, sincronización y trabajo en paralelo.', 'Threads, synchronization and parallel work.') },
  networking:  { title: T('Redes', 'Networking'), line: T('Cómo viajan los datos entre computadoras.', 'How data travels between computers.') },
  problems:    { title: T('Problemas de Código', 'Coding Problems'), line: T('Problemas clásicos de programación, de fáciles a difíciles, paso a paso.', 'Classic programming problems, from easy to hard, step by step.') },
  databases:   { title: T('Bases de Datos', 'Databases'), line: T('Consultas SQL, ejecutadas cláusula por cláusula.', 'SQL queries, executed clause by clause.') }
};

const MODULES = {
  algorithms:     { title: T('Ordenamiento', 'Sorting'),                 area: 'algorithms',   steps: true },
  versus:         { title: T('Algoritmo vs. algoritmo', 'Algorithm vs. algorithm'), area: 'algorithms', steps: true },
  'datastructures-easy':   { title: T('Estructuras de datos · Fácil', 'Data structures · Easy'),   area: 'algorithms', steps: true, tracer: 'dsStations.easy' },
  'datastructures-medium': { title: T('Estructuras de datos · Media', 'Data structures · Medium'), area: 'algorithms', steps: true, tracer: 'dsStations.medium' },
  concurrency:    { title: T('La Rotonda', 'The Roundabout'),            area: 'parallel',      steps: true },
  heat:           { title: T('Difusión de calor', 'Heat diffusion'),     area: 'parallel',      steps: true },
  networking:     { title: T('Sockets TCP', 'TCP sockets'),              area: 'networking',    steps: true, tracer: 'networkingStation' },
  'problems-easy':   { title: T('Problemas clásicos · Fácil', 'Classic problems · Easy'),       area: 'problems', steps: true, tracer: 'problemStations.easy' },
  'problems-medium': { title: T('Problemas clásicos · Media', 'Classic problems · Medium'),     area: 'problems', steps: true, tracer: 'problemStations.medium' },
  'problems-hard':   { title: T('Problemas clásicos · Difícil', 'Classic problems · Hard'),     area: 'problems', steps: true, tracer: 'problemStations.hard' },
  sql:            { title: T('SQL paso a paso', 'SQL step by step'),     area: 'databases',     steps: true, tracer: 'sqlStation' },
  cheatsheets:    { title: T('El Cuaderno', 'The Notebook'),             area: null,          steps: false }
};
const MODULE_ORDER = ['algorithms', 'versus', 'datastructures-easy', 'datastructures-medium', 'concurrency', 'heat', 'networking',
  'problems-easy', 'problems-medium', 'problems-hard', 'sql', 'cheatsheets'];
const STEP_IDS = ['play', 'learn', 'build'];
const MAX_TOASTS = 3;

// Spanish URLs from before the routes were renamed
const LEGACY_ROUTES = { 'que-es': 'about', perfil: 'profile', taller: 'workshop', mesa: 'area' };
const LEGACY_AREAS = { algoritmos: 'algorithms', paralela: 'parallel', redes: 'networking', entrevistas: 'problems', interviews: 'problems', datos: 'databases' };
// Stations that were split by difficulty: old links open the easiest level
const LEGACY_MODULES = { interview: 'problems-easy', datastructures: 'datastructures-easy' };
// A tracer station lives at a dotted path on window (e.g. 'problemStations.easy')
const stationAt = (path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), window);

// What Bit says on each screen/step
const TRACER_LINES = {
  play: T('Usa las flechas del teclado (← →) para avanzar línea por línea. Cambia la entrada para ver otro recorrido.', 'Use the arrow keys (← →) to move line by line. Change the input to see a different run.'),
  learn: T('Aquí está la idea detrás del problema que elegiste y cómo reconocer cuándo usarla.', 'Here is the idea behind the problem you picked and how to recognize when to use it.'),
  build: T('Una plantilla para reusar el patrón y consejos para explicarlo en voz alta.', 'A template for reusing the pattern and tips for explaining it out loud.')
};
const GUIDE_LINES = {
  workshop: T('Primero escoge una mesa de trabajo: cada una corresponde a un curso o tema. Si quieres practicar para entrevistas, prueba «Problemas de Código».', 'First pick a workbench: each one matches a course or topic. If you want to practice for interviews, try "Coding Problems".'),
  area: T('Estas son las estaciones de esta mesa. Toca una para entrar.', 'These are the stations at this workbench. Tap one to go in.'),
  chooser: T('Escoge un problema. Cada uno tiene su idea, su recorrido paso a paso y su código para practicar.', 'Pick a problem. Each one has its idea, its step-by-step walkthrough and its code to practice.'),
  algorithms: {
    play: T('Escoge un algoritmo, dale a Iniciar y escucha: cada barra suena según su altura.', 'Pick an algorithm, press Start and listen: each bar sounds according to its height.'),
    learn: T('Aquí está la idea del algoritmo que elegiste y cuánto cuesta. Cambia de algoritmo en Experimenta y vuelve.', 'Here is the idea behind the algorithm you picked and how much it costs. Switch algorithms in Experiment and come back.'),
    build: T('Este código cambia según el algoritmo que tengas seleccionado.', 'This code changes with the algorithm you have selected.')
  },
  versus: {
    play: T('Escoge dos algoritmos y dale a ¡Arranquen!: los dos ordenan el mismo arreglo, una operación a la vez.', 'Pick two algorithms and press Go!: both sort the same array, one operation at a time.'),
    learn: T('Gana el que hace menos operaciones. Aquí ves por qué, y cuánto cuesta cada algoritmo.', 'The one that makes fewer operations wins. Here you see why, and how much each algorithm costs.'),
    build: T('Arma tu propia carrera en C++: cuenta comparaciones y mide el tiempo.', 'Build your own race in C++: count comparisons and measure the time.')
  },
  concurrency: {
    play: T('Los autos son hilos. Apaga los semáforos o pulsa «Provocar deadlock» para ver la rotonda trabarse.', 'The cars are threads. Turn off the semaphores or press "Cause deadlock" to watch the roundabout lock up.'),
    learn: T('Un deadlock necesita cuatro condiciones a la vez. Rompe una y desaparece.', 'A deadlock needs four conditions at once. Break one and it goes away.'),
    build: T('Una versión simplificada de la rotonda con semáforos POSIX, lista para estudiar.', 'A simplified version of the roundabout with POSIX semaphores, ready to study.')
  },
  heat: {
    play: T('Pon la velocidad en 1 y mira a cada hilo calcular su franja. Luego activa el hilo lento: verás a los demás esperando en la barrera.', 'Set the speed to 1 and watch each thread compute its strip. Then turn on the slow thread: you will see the others waiting at the barrier.'),
    learn: T('Doble búfer, franjas, barrera y reducción: las cuatro ideas que hacen correcto y rápido este cálculo.', 'Double buffering, strips, barrier and reduction: the four ideas that make this computation correct and fast.'),
    build: T('El motor en C de este proyecto, con pthreads y OpenMP, y cómo correrlo para comparar.', 'The C engine of this project, with pthreads and OpenMP, and how to run it to compare.')
  },
  networking:  {
    play: T('Envía una petición y mira cada paquete cruzar el cable. Usa ← y → para ir paso a paso.', 'Send a request and watch each packet cross the wire. Use ← and → to go step by step.'),
    learn: T('Cliente, servidor, socket y pool de hilos, explicados sin rodeos.', 'Client, server, socket and thread pool, explained plainly.'),
    build: T('Un servidor TCP de verdad cabe en 30 líneas. Aquí lo tienes.', 'A real TCP server fits in 30 lines. Here it is.')
  },
  'problems-easy': TRACER_LINES,
  'problems-medium': TRACER_LINES,
  'problems-hard': TRACER_LINES,
  'datastructures-easy': TRACER_LINES,
  'datastructures-medium': TRACER_LINES,
  sql: {
    play: T('Mira el orden de las líneas resaltadas: SQL no se ejecuta en el orden en que se escribe.', 'Watch the order of the highlighted lines: SQL does not run in the order it is written.'),
    learn: TRACER_LINES.learn,
    build: T('Plantillas y trampas comunes de SQL, sobre todo con NULL.', 'SQL templates and common pitfalls, especially with NULL.')
  },
  cheatsheets: T('Mueve los controles de Amdahl: verás por qué más núcleos no siempre es más rápido.', 'Move the Amdahl controls: you will see why more cores is not always faster.')
};

// First-visit walkthroughs (coach marks)
const tracerTour = (id, what) => [
  { sel: `#tracer-${id} .tr-brief`, title: T('El problema', 'The problem'), text: T(`Esto es ${what}: lo que se pide y la entrada. Escoge un ejemplo o escribe la tuya.`, `This is ${what}: what is asked and the input. Pick an example or type your own.`) },
  { sel: `#tracer-${id} .tr-code-wrap`, title: T('El código', 'The code'), text: T('La línea resaltada es la que se está ejecutando. Las más claras ya se ejecutaron.', 'The highlighted line is the one running now. The lighter ones have already run.') },
  { sel: `#tracer-${id} .tr-controls`, title: T('Los controles', 'The controls'), text: T('Avanza o retrocede paso a paso, o dale Reproducir. Con el teclado: ← y →.', 'Go forward or back step by step, or press Play. With the keyboard: ← and →.') },
  { sel: `#tracer-${id} .tr-stage`, title: T('Lo que pasa en memoria', 'What happens in memory'), text: T('Aquí ves los datos en cada paso. Debajo, la explicación y las variables (las que cambian se iluminan).', 'Here you see the data at each step. Below, the explanation and the variables (the ones that change light up).') }
];
const TOURS = {
  algorithms: [
    { sel: '#algoSelect', title: T('Escoge un algoritmo', 'Pick an algorithm'), text: T('Hay ocho. Cada uno ordena de forma distinta. Empieza con Quick Sort.', 'There are eight. Each one sorts in a different way. Start with Quick Sort.') },
    { sel: '#algoPresets', title: T('¿Cómo empieza el arreglo?', 'How does the array start?'), text: T('Un arreglo invertido es el peor caso de varios algoritmos. Vale la pena probarlo.', 'A reversed array is the worst case for several algorithms. It is worth trying.') },
    { sel: '#btnRunAlgo', title: T('¡Dale play!', 'Press play!'), text: T('Mira y escucha. Puedes pausar cuando quieras.', 'Watch and listen. You can pause whenever you like.') },
    { sel: '#algoStage', title: T('El escenario', 'The stage'), text: T('Amarillo compara, rojo intercambia y verde ya está en su lugar. Abajo ves el marcador.', 'Yellow compares, red swaps and green is already in place. The scoreboard is below.') },
    { sel: '#modSteps', title: T('Después, entiende', 'Then, understand'), text: T('En «Entiende» está la idea y su costo. En «Implementa», el código.', 'The idea and its cost are in "Understand". The code is in "Implement".') }
  ],
  versus: [
    { sel: '#vsPicks', title: T('Escoge a los retadores', 'Pick the challengers'), text: T('Dos de los ocho algoritmos. Empieza con Quick Sort contra Bubble Sort.', 'Two of the eight algorithms. Start with Quick Sort against Bubble Sort.') },
    { sel: '#vsPresets', title: T('La misma pista para los dos', 'The same track for both'), text: T('Los dos ordenan exactamente el mismo arreglo. Prueba también Casi ordenado.', 'Both sort exactly the same array. Also try Nearly sorted.') },
    { sel: '#btnVsRun', title: T('¡Arranquen!', 'Go!'), text: T('En cada tic, cada uno hace una operación: comparar o escribir.', 'On every tick, each one makes one operation: a comparison or a write.') },
    { sel: '#vsStage', title: T('La pista', 'The track'), text: T('La barra de abajo muestra cuánto le falta a cada uno. Gana el que necesita menos operaciones.', 'The bar below shows how much each one has left. The one that needs fewer operations wins.') }
  ],
  concurrency: [
    { sel: '#concSubtabs', title: T('Dos simulaciones', 'Two simulations'), text: T('La rotonda y dos patrones clásicos: el buffer acotado y los filósofos comensales.', 'The roundabout and two classic patterns: the bounded buffer and the dining philosophers.') },
    { sel: '#concurrencyViewport', title: T('La rotonda', 'The roundabout'), text: T('Cada auto es un hilo; cada cuadrante, un recurso con capacidad limitada.', 'Each car is a thread; each quadrant, a resource with limited capacity.') },
    { sel: '#deadlockButtons', title: T('Rómpela', 'Break it'), text: T('Provoca un deadlock y luego resuélvelo con un semáforo.', 'Cause a deadlock and then resolve it with a semaphore.') },
    { sel: '#modSteps', title: T('¿Y por qué pasó?', 'So why did it happen?'), text: T('La explicación está en «Entiende».', 'The explanation is in "Understand".') }
  ],
  heat: [
    { sel: '#heatCanvas', title: T('Una placa de metal', 'A metal plate'), text: T('El color es la temperatura. Las líneas punteadas dividen la placa en franjas: una por hilo.', 'The color is the temperature. The dotted lines split the plate into strips: one per thread.') },
    { sel: '#heatThreadCtl', title: T('¿Cuántos hilos?', 'How many threads?'), text: T('Cambia entre 1 y 8. El resultado final es idéntico; lo que cambia es cuánto tarda.', 'Switch between 1 and 8. The final result is identical; what changes is how long it takes.') },
    { sel: '#heatLanesPanel', title: T('Los hilos trabajando', 'The threads at work'), text: T('Cada barra es un hilo. La parte rayada es tiempo perdido esperando en la barrera al más lento.', 'Each bar is a thread. The striped part is time lost waiting at the barrier for the slowest one.') },
    { sel: '#heatChartPanel', title: T('¿Cuándo parar?', 'When to stop?'), text: T('Cuando el cambio más grande baja de ε, la placa llegó al equilibrio.', 'When the largest change drops below ε, the plate has reached equilibrium.') }
  ],
  networking: [
    { sel: '#netRequestForm', title: T('Lo que pide el cliente', 'What the client asks for'), text: T('Escoge una figura (o LIST) y envía la petición. Prueba también una figura que no existe o el método POST.', 'Pick a figure (or LIST) and send the request. Also try a figure that does not exist or the POST method.') },
    { sel: '#netScene', title: T('Dos computadoras y un cable', 'Two computers and a wire'), text: T('A la izquierda el cliente, a la derecha el servidor con su disco, sus hilos y su registro. Los paquetes viajan por el cable.', 'On the left the client, on the right the server with its disk, its threads and its log. The packets travel along the wire.') },
    { sel: '#netPlayer', title: T('Paso a paso', 'Step by step'), text: T('Avanza, retrocede o reproduce. Los puntos muestran las fases: conexión, petición, servidor, respuesta y cierre.', 'Go forward, go back or play. The dots show the phases: connection, request, server, response and close.') },
    { sel: '#packetInspector', title: T('Abre el paquete', 'Open the packet'), text: T('Cada paquete por capas: direcciones IPv6, el encabezado TCP y, si lleva datos, el mensaje HTTP parte por parte.', 'Each packet layer by layer: IPv6 addresses, the TCP header and, if it carries data, the HTTP message part by part.') }
  ],
  ...Object.fromEntries(['easy', 'medium', 'hard'].map((l) => [`problems-${l}`, tracerTour(`problems-${l}`, T('un problema clásico de programación', 'a classic programming problem'))])),
  ...Object.fromEntries(['easy', 'medium'].map((l) => [`datastructures-${l}`, tracerTour(`datastructures-${l}`, T('una estructura de datos con su operación típica', 'a data structure with its typical operation'))])),
  sql: tracerTour('sql', T('una consulta sobre la misma base de ejemplo', 'a query on the same sample database'))
};

// Bit is drawn twice, once per theme; the stylesheet shows the one that matches.
// Lab Bit: steel plating, yellow ear pods and a glowing core. Wooden Bit: pine boards and three buttons.
const BIT_SVG = `
<svg class="bit" viewBox="0 0 120 150" aria-hidden="true">
  <g class="bit-lab">
    <line x1="60" y1="30" x2="60" y2="12" stroke="#1b2027" stroke-width="4" stroke-linecap="round"/>
    <circle class="bulb" cx="60" cy="10" r="7" fill="#5fd8ff" stroke="#1b2027" stroke-width="3.5"/>
    <g class="arm arm-l">
      <path d="M30 108 14 126" stroke="#1b2027" stroke-width="13" stroke-linecap="round"/>
      <path d="M30 108 14 126" stroke="#aeb8c3" stroke-width="6" stroke-linecap="round"/>
      <circle cx="13" cy="127" r="6.5" fill="#f5c518" stroke="#1b2027" stroke-width="3.5"/>
    </g>
    <g class="arm arm-r">
      <path d="M90 108 106 90" stroke="#1b2027" stroke-width="13" stroke-linecap="round"/>
      <path d="M90 108 106 90" stroke="#aeb8c3" stroke-width="6" stroke-linecap="round"/>
      <circle cx="107" cy="89" r="6.5" fill="#f5c518" stroke="#1b2027" stroke-width="3.5"/>
    </g>
    <rect x="30" y="98" width="60" height="46" rx="8" fill="#c2cad3" stroke="#1b2027" stroke-width="4"/>
    <path d="M34 140h52" stroke="#f5c518" stroke-width="3" stroke-linecap="round"/>
    <rect x="38" y="105" width="44" height="30" rx="5" fill="#2a3038" stroke="#1b2027" stroke-width="3"/>
    <circle cx="60" cy="120" r="9.5" fill="#0f1720" stroke="#1b2027" stroke-width="3"/>
    <circle class="core" cx="60" cy="120" r="5.5" fill="#7fe6ff"/>
    <circle cx="45" cy="120" r="2.4" fill="#f5c518"/><circle cx="75" cy="120" r="2.4" fill="#d8382e"/>
    <rect x="50" y="92" width="20" height="8" fill="#5a636e" stroke="#1b2027" stroke-width="3"/>
    <rect x="6" y="54" width="9" height="18" rx="3" fill="#f5c518" stroke="#1b2027" stroke-width="3"/>
    <rect x="105" y="54" width="9" height="18" rx="3" fill="#f5c518" stroke="#1b2027" stroke-width="3"/>
    <rect x="14" y="30" width="92" height="66" rx="12" fill="#e3e8ee" stroke="#1b2027" stroke-width="4"/>
    <path d="M26 37h68" stroke="#c3ccd6" stroke-width="2" stroke-linecap="round"/>
    <path d="M60 31v6M22 90h10M88 90h10" stroke="#c3ccd6" stroke-width="2" stroke-linecap="round"/>
    <rect x="27" y="44" width="66" height="42" rx="10" fill="#131a22" stroke="#1b2027" stroke-width="3.5"/>
    <path d="M33 53l9-5" stroke="rgba(255,255,255,.22)" stroke-width="3" stroke-linecap="round"/>
    <rect class="blink" x="40" y="55" width="11" height="15" rx="5" fill="#7fe6ff"/>
    <rect class="blink" x="69" y="55" width="11" height="15" rx="5" fill="#7fe6ff"/>
    <path d="M51 76q9 6 18 0" stroke="#7fe6ff" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <g class="bit-wood">
    <line x1="60" y1="30" x2="60" y2="12" stroke="#3d2414" stroke-width="4" stroke-linecap="round"/>
    <circle class="bulb" cx="60" cy="10" r="7" fill="#f6c33b" stroke="#3d2414" stroke-width="3.5"/>
    <g class="arm arm-l">
      <path d="M30 108 14 126" stroke="#3d2414" stroke-width="13" stroke-linecap="round"/>
      <path d="M30 108 14 126" stroke="#8d939c" stroke-width="6" stroke-linecap="round"/>
      <circle cx="13" cy="127" r="6.5" fill="#c68a50" stroke="#3d2414" stroke-width="3.5"/>
    </g>
    <g class="arm arm-r">
      <path d="M90 108 106 90" stroke="#3d2414" stroke-width="13" stroke-linecap="round"/>
      <path d="M90 108 106 90" stroke="#8d939c" stroke-width="6" stroke-linecap="round"/>
      <circle cx="107" cy="89" r="6.5" fill="#c68a50" stroke="#3d2414" stroke-width="3.5"/>
    </g>
    <rect x="30" y="98" width="60" height="46" rx="6" fill="#c68a50" stroke="#3d2414" stroke-width="4"/>
    <path d="M34 106h52M34 116h52M34 136h52" stroke="#a96f3c" stroke-width="1.6"/>
    <circle cx="46" cy="126" r="5" fill="#e8512a" stroke="#3d2414" stroke-width="2.5"/>
    <circle cx="60" cy="126" r="5" fill="#f6c33b" stroke="#3d2414" stroke-width="2.5"/>
    <circle cx="74" cy="126" r="5" fill="#3d8fd6" stroke="#3d2414" stroke-width="2.5"/>
    <rect x="50" y="92" width="20" height="8" fill="#8d939c" stroke="#3d2414" stroke-width="3"/>
    <rect x="14" y="30" width="92" height="66" rx="9" fill="#e6bd85" stroke="#3d2414" stroke-width="4"/>
    <path d="M18 40c20-3 60-3 84 0M18 88c22 2 60 2 84 0" stroke="#c9975c" stroke-width="1.6" fill="none"/>
    <g stroke="#3d2414" stroke-width="1.6"><circle cx="21" cy="37" r="3.6" fill="#c9ced6"/><circle cx="99" cy="37" r="3.6" fill="#c9ced6"/><circle cx="21" cy="89" r="3.6" fill="#c9ced6"/><circle cx="99" cy="89" r="3.6" fill="#c9ced6"/></g>
    <rect x="27" y="44" width="66" height="42" rx="9" fill="#2f3b3a" stroke="#3d2414" stroke-width="3.5"/>
    <rect class="blink" x="40" y="55" width="11" height="15" rx="5" fill="#8ff0c0"/>
    <rect class="blink" x="69" y="55" width="11" height="15" rx="5" fill="#8ff0c0"/>
    <path d="M51 76q9 6 18 0" stroke="#8ff0c0" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

class App {
  constructor() {
    this.currentTab = null;
    this.currentArea = null;
    this.currentStep = 'learn';
    this.route = 'intro';
    this.tour = null;
  }

  init() {
    document.querySelectorAll('.bit-slot').forEach(el => { el.innerHTML = BIT_SVG; });

    ['algorithmsStation', 'versusStation', 'concurrencyStation', 'heatStation', 'networkingStation', 'cheatsheetsStation', 'notebookStation', 'sqlStation']
      .forEach(name => { if (window[name]) window[name].init(); });
    Object.values(MODULES).forEach(m => { const st = m.tracer && m.tracer.includes('.') && stationAt(m.tracer); if (st) st.init(); });

    this.setupAccount();
    this.setupSteps();
    this.setupGuide();
    this.setupTour();
    this.setupGlobalControls();
    this.setupKeyboardShortcuts();

    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  // ── Routing ───────────────────────────────────────────────
  // Old Spanish URLs (shared links, bookmarks) still work: they are rewritten to the English ones
  legacyParts(parts) {
    const first = LEGACY_ROUTES[parts[0]] || parts[0];
    const renamedArea = first === 'area' && LEGACY_AREAS[parts[1]];
    const splitModule = first === 'workshop' && LEGACY_MODULES[parts[1]];
    if (first === parts[0] && !renamedArea && !splitModule) return parts;
    const next = [first, ...parts.slice(1)];
    if (renamedArea) next[1] = renamedArea;
    if (splitModule) next[1] = splitModule;
    return next;
  }

  handleRoute() {
    let parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const english = this.legacyParts(parts);
    if (english !== parts) {
      parts = english;
      history.replaceState(null, '', `#/${parts.join('/')}`);
    }
    this.endTour();
    this.stopTracers();

    if (parts[0] === 'about') return this.showScreen('about');
    if (parts[0] === 'profile') return this.openProfile();
    if (parts[0] === 'area' && AREAS[parts[1]]) return this.openArea(parts[1]);
    if (parts[0] === 'workshop' && MODULES[parts[1]]) {
      // Stations made of problems: #/workshop/<station> is the problem shelf,
      // #/workshop/<station>/<problem>[/<step>] is one problem with its three steps
      const ps = this.problemStation(parts[1]);
      if (ps) {
        const problem = ps.problems.some((p) => p.id === parts[2]) ? parts[2] : null;
        if (!problem && parts.length > 2) history.replaceState(null, '', `#/workshop/${parts[1]}`);
        const step = problem && STEP_IDS.includes(parts[3]) ? parts[3] : 'learn';
        return this.openModule(parts[1], step, problem);
      }
      const step = STEP_IDS.includes(parts[2]) ? parts[2] : 'learn';
      return this.openModule(parts[1], step);
    }
    if (parts[0] === 'workshop') return this.showScreen('workshop');
    return this.showScreen('intro');
  }

  go(hash) {
    if (location.hash === hash) this.handleRoute();
    else location.hash = hash;
  }

  showScreen(route) {
    const prev = this.route;
    this.route = route;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('is-active', s.dataset.route === route));
    document.body.classList.toggle('on-intro', route === 'intro');
    if (prev !== route) window.scrollTo({ top: 0 });
    this.updateGuide();
  }

  // Kept for compatibility: open a module by id
  openStation(tabId = 'algorithms') { this.go(`#/workshop/${tabId}`); }
  showWelcome() { this.go('#/workshop'); }

  openArea(areaId) {
    this.currentArea = areaId;
    const area = AREAS[areaId];
    document.getElementById('areaTitle').textContent = area.title;
    document.getElementById('areaLine').textContent = area.line;
    let count = 0;
    document.querySelectorAll('#areaShelf .station').forEach(st => {
      const show = st.dataset.area === areaId || st.dataset.area === 'all';
      st.hidden = !show;
      if (show) count++;
    });
    document.getElementById('areaShelf').dataset.count = count;
    this.showScreen('area');
  }

  openModule(tabId, step = 'learn', problem = null) {
    const isNewModule = this.currentTab !== tabId || this.route !== 'module' || this.currentProblem !== problem;
    const ps = this.problemStation(tabId);
    this.currentProblem = ps ? problem : null;
    this.choosing = !!ps && !problem;
    this.switchTab(tabId);
    if (ps) this.showProblem(tabId, ps, problem);
    this.showScreen('module');
    if (this.choosing) this.currentStep = null;
    else this.setStep(MODULES[tabId].steps ? step : 'play');
    if (this.choosing) this.updateGuide();
    if (isNewModule) window.soundController.playTone(720, 'sine', 0.04, 0.4);
  }

  // A tracer station whose problems are picked from a shelf before the steps
  problemStation(tabId) {
    const mod = MODULES[tabId];
    const st = mod && mod.tracer ? stationAt(mod.tracer) : null;
    return st && typeof st.chooser === 'function' && Array.isArray(st.problems) ? st : null;
  }

  showProblem(tabId, ps, problem) {
    const mod = MODULES[tabId];
    const pane = document.getElementById(`tab-${tabId}`);
    if (pane) pane.classList.toggle('choosing', !problem);
    document.getElementById('modSteps').hidden = !problem;
    if (!problem) return;
    if (!ps.problem || ps.problem.id !== problem) ps.select(problem);
    document.getElementById('activeMissionLabel').textContent = ps.problem.title;
    document.getElementById('modCrumb').textContent = `${mod.area ? AREAS[mod.area].title + ' / ' : ''}${mod.title} /`;
    document.getElementById('btnBackToWelcome').href = `#/workshop/${tabId}`;
  }

  // The address of the current station (and problem) at a given step
  moduleHash(step) {
    const base = `#/workshop/${this.currentTab}${this.currentProblem ? '/' + this.currentProblem : ''}`;
    return step === 'learn' ? base : `${base}/${step}`;
  }

  switchTab(tabId) {
    if (!MODULES[tabId]) return;
    const mod = MODULES[tabId];
    this.currentTab = tabId;
    if (mod.area) this.currentArea = mod.area;
    document.getElementById('activeMissionLabel').textContent = mod.title;
    const back = document.getElementById('btnBackToWelcome');
    back.href = mod.area ? `#/area/${mod.area}` : '#/workshop';
    document.getElementById('modCrumb').textContent = mod.area ? `${AREAS[mod.area].title} /` : T('Taller /', 'Workshop /');
    document.getElementById('modSteps').hidden = !mod.steps;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
  }

  tracer() {
    const mod = MODULES[this.currentTab];
    if (this.choosing) return null;
    return mod && mod.tracer ? stationAt(mod.tracer) || null : null;
  }
  stopTracers() {
    Object.values(MODULES).forEach(m => { const st = m.tracer && stationAt(m.tracer); if (st) st.stop(); });
    if (window.networkingStation && window.networkingStation.exchange) window.networkingStation.stop();
    // Running simulations end when you leave them (another screen, station or step)
    const sorting = window.algorithmsStation;
    if (sorting && sorting.isRunning) sorting.pause();
    const race = window.versusStation;
    if (race && race.isRunning) race.pause();
    const heat = window.heatStation;
    if (heat && heat.running) heat.pause();
  }

  setupSteps() {
    document.querySelectorAll('#modSteps .step').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = btn.dataset.step;
        history.replaceState(null, '', this.moduleHash(step));
        this.setStep(step);
        window.soundController.playTone(520, 'sine', 0.02, 0.3);
      });
    });
  }

  setStep(step) {
    this.currentStep = step;
    if (step !== 'play') this.stopTracers();
    document.querySelectorAll('#modSteps .step').forEach(b => b.classList.toggle('active', b.dataset.step === step));
    const pane = document.getElementById(`tab-${this.currentTab}`);
    if (pane) pane.querySelectorAll('.step-pane').forEach(p => p.classList.toggle('active', p.dataset.step === step));

    if (window.account && this.route === 'module' && this.currentTab) window.account.visit(this.currentTab, step);

    // Canvases need a size once they become visible
    if (step === 'play') {
      requestAnimationFrame(() => {
        if (this.currentTab === 'algorithms' && window.algorithmsStation) window.algorithmsStation.resizeCanvas();
        if (this.currentTab === 'versus' && window.versusStation) window.versusStation.resizeCanvas();
        if (this.currentTab === 'concurrency' && window.concurrencyStation) window.concurrencyStation.resizeCanvas();
      });
    }
    this.updateGuide();
    // The walkthrough belongs to the experiment, so it starts the first time you get there
    if (step === 'play' && this.route === 'module' && TOURS[this.currentTab] && !this.tour && !this.hasSeen(this.currentTab)) {
      const id = this.currentTab;
      setTimeout(() => { if (this.route === 'module' && this.currentTab === id && this.currentStep === 'play' && !this.tour) this.startTour(id); }, 450);
    }
  }

  // ── Account and progress ─────────────────────────────────
  setupAccount() {
    const acc = window.account;
    if (!acc) return;
    acc.onChange((ev) => {
      this.renderAccountButton();
      this.updateProgressBadges();
      if (this.route === 'profile') this.renderProfile();
      if (ev.type === 'record' && ev.isNew) this.showToast(T(`Logrado: ${ev.label}`, `Done: ${ev.label}`));
      if (ev.type === 'auth' && ev.user && this.signingIn) {
        this.signingIn = false;
        this.showToast(T(`Hola, ${ev.user.name.split(' ')[0]}. Tu progreso ahora se guarda en tu cuenta.`, `Hi, ${ev.user.name.split(' ')[0]}. Your progress is now saved to your account.`));
      }
      if (ev.type === 'error') this.showToast(T('No se pudo sincronizar tu cuenta. Tu progreso sigue en este dispositivo.', 'Your account could not be synced. Your progress is still on this device.'));
    });

    const btnIn = document.getElementById('btnSignIn');
    btnIn.addEventListener('click', async () => {
      btnIn.disabled = true;
      this.signingIn = true;
      try { await acc.signIn(); } catch (e) {
        this.signingIn = false;
        if (!e || e.code !== 'auth/popup-closed-by-user') this.showToast(e && e.message ? e.message : T('No se pudo iniciar sesión.', 'Could not sign in.'));
      } finally { btnIn.disabled = !acc.cloudAvailable; }
    });
    document.getElementById('btnSignOut').addEventListener('click', async () => {
      await acc.signOut();
      this.showToast(T('Sesión cerrada. Este dispositivo vuelve a modo invitado.', 'Signed out. This device is back in guest mode.'));
    });
    document.getElementById('btnResetProgress').addEventListener('click', () => {
      const where = acc.signedIn ? T('de tu cuenta', 'from your account') : T('de este dispositivo', 'from this device');
      if (window.confirm(T(`¿Borrar todo tu progreso ${where}? No se puede deshacer.`, `Delete all your progress ${where}? This cannot be undone.`))) {
        acc.reset();
        this.showToast(T('Progreso borrado.', 'Progress deleted.'));
      }
    });

    acc.init();
  }

  openProfile() {
    this.showScreen('profile');
    this.renderProfile();
  }

  renderAccountButton() {
    const acc = window.account;
    const btn = document.getElementById('btnAccount');
    if (!acc || !btn) return;
    const u = acc.user;
    btn.classList.toggle('signed-in', !!u);
    btn.title = u ? T(`Mi espacio · ${u.name}`, `My space · ${u.name}`) : T('Mi espacio', 'My space');
    btn.innerHTML = u && u.photoURL
      ? `<img src="${encodeURI(u.photoURL)}" alt="" referrerpolicy="no-referrer">`
      : '<svg class="ic"><use href="#i-user"/></svg>';
  }

  renderProfile() {
    const acc = window.account;
    if (!acc) return;
    const P = window.Progress;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const u = acc.user;
    const $ = (id) => document.getElementById(id);

    $('profileName').textContent = u ? u.name : T('Invitado', 'Guest');
    $('profileSub').textContent = u
      ? T('Tu progreso se guarda en tu cuenta y te sigue a cualquier dispositivo.', 'Your progress is saved to your account and follows you to any device.')
      : T('Tu progreso se guarda solo en este dispositivo.', 'Your progress is saved only on this device.');
    $('profileAvatar').innerHTML = u && u.photoURL
      ? `<img src="${encodeURI(u.photoURL)}" alt="" referrerpolicy="no-referrer">`
      : '<svg class="ic"><use href="#i-user"/></svg>';
    $('btnSignIn').hidden = !!u;
    $('btnSignIn').disabled = !acc.cloudAvailable;
    $('btnSignOut').hidden = !u;
    $('profileNote').textContent = !acc.cloudAvailable
      ? T('Las cuentas todavía no están activadas en este sitio. Mientras tanto, tu progreso se guarda en este dispositivo.', 'Accounts are not enabled on this site yet. In the meantime, your progress is saved on this device.')
      : u ? '' : T('Inicia sesión para guardar tu progreso en la nube. Lo que ya hiciste aquí se suma a tu cuenta.', 'Sign in to save your progress in the cloud. What you have already done here is added to your account.');
    $('profileLead').textContent = u ? T(`Hola, ${u.name.split(' ')[0]}. Esto es lo que llevas.`, `Hi, ${u.name.split(' ')[0]}. Here is what you have done so far.`) : T('Tu progreso en el taller.', 'Your progress in the workshop.');

    const all = acc.overall();
    $('overallPct').textContent = `${all.percent}%`;
    $('overallArc').style.strokeDashoffset = String(314.16 * (1 - all.percent / 100));
    $('statItems').textContent = `${all.done} / ${all.total}`;
    $('statStations').textContent = `${all.stationsComplete} / ${all.stations}`;

    const last = acc.progress.last;
    const cont = $('btnContinue');
    if (last && MODULES[last.station]) {
      cont.href = `#/workshop/${last.station}${last.step === 'learn' ? '' : '/' + last.step}`;
      cont.innerHTML = `<svg class="ic"><use href="#i-arrow-r"/></svg>${T('Continuar en', 'Continue in')} ${esc(MODULES[last.station].title)}`;
    } else {
      cont.href = '#/workshop';
      cont.innerHTML = `<svg class="ic"><use href="#i-arrow-r"/></svg>${T('Empezar', 'Start')}`;
    }

    const stepNames = { play: T('Experimenta', 'Experiment'), learn: T('Entiende', 'Understand'), build: T('Implementa', 'Implement') };
    const groups = [...Object.keys(AREAS).map((a) => ({ title: AREAS[a].title, ids: MODULE_ORDER.filter((m) => MODULES[m].area === a) })),
      { title: T('Repaso', 'Review'), ids: MODULE_ORDER.filter((m) => !MODULES[m].area) }];
    $('progressList').innerHTML = groups.filter((g) => g.ids.length).map((g) => `
      <section class="progress-area">
        <h3>${esc(g.title)}</h3>
        <div class="progress-stations">${g.ids.map((id) => {
          const st = acc.stats(id);
          const items = P.CHECKLISTS[id].items;
          const done = (acc.progress.stations[id] || { items: {} }).items;
          return `<article class="progress-station board">
            <div class="progress-station-head"><a href="#/workshop/${id}">${esc(MODULES[id].title)}</a><span>${st.done} / ${st.total}</span></div>
            <div class="bar" role="progressbar" aria-valuenow="${st.percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${st.percent}%"></i></div>
            ${MODULES[id].steps ? `<div class="step-chips">${['learn', 'play', 'build'].map((s) => `<span class="step-chip ${st.steps[s] ? 'seen' : ''}">${stepNames[s]}</span>`).join('')}</div>` : ''}
            <ul class="checklist">${items.map((i) => `<li class="${done[i.id] ? 'done' : ''}"><span class="tick"><svg class="ic"><use href="#i-check"/></svg></span>${esc(i.label)}</li>`).join('')}</ul>
          </article>`;
        }).join('')}</div>
      </section>`).join('');
  }

  // Small "3 / 6" badges on bench and station cards.
  updateProgressBadges() {
    const acc = window.account;
    if (!acc) return;
    const badge = (el, done, total) => {
      let b = el.querySelector('.card-progress');
      if (!done) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('span'); b.className = 'card-progress'; el.appendChild(b); }
      const complete = done === total;
      b.classList.toggle('complete', complete);
      b.innerHTML = complete ? `<svg class="ic"><use href="#i-check"/></svg>${T('completa', 'complete')}` : `${done} / ${total}`;
    };
    document.querySelectorAll('.station-card[data-tab]').forEach((card) => {
      const st = acc.stats(card.dataset.tab);
      if (st.total) badge(card, st.done, st.total);
    });
    document.querySelectorAll('.bench').forEach((bench) => {
      const m = /#\/area\/(\w+)/.exec(bench.getAttribute('href') || '');
      const ids = m ? MODULE_ORDER.filter((id) => MODULES[id].area === m[1]) : [bench.dataset.tab].filter(Boolean);
      const sum = ids.reduce((acc2, id) => { const s = acc.stats(id); return { done: acc2.done + s.done, total: acc2.total + s.total }; }, { done: 0, total: 0 });
      if (sum.total) badge(bench, sum.done, sum.total);
    });
    // Problem cards inside a station: a check once walked through to the end
    const items = (id) => ((acc.progress && acc.progress.stations && acc.progress.stations[id]) || {}).items || {};
    document.querySelectorAll('.problem-card[data-problem]').forEach((card) => {
      const m = /#\/workshop\/([\w-]+)\//.exec(card.getAttribute('href') || '');
      const solved = !!(m && items(m[1])[`solve:${card.dataset.problem}`]);
      card.classList.toggle('solved', solved);
      let b = card.querySelector('.card-progress');
      if (!solved) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('span'); b.className = 'card-progress complete'; card.appendChild(b); }
      b.innerHTML = `<svg class="ic"><use href="#i-check"/></svg>${T('resuelto', 'solved')}`;
    });
  }

  // ── Bit, the guide ───────────────────────────────────────
  setupGuide() {
    const bit = document.getElementById('guideBit');
    const toggle = () => {
      const bubble = document.getElementById('guideBubble');
      bubble.hidden = !bubble.hidden;
      window.soundController.playTone(880, 'sine', 0.03, 0.3);
    };
    bit.addEventListener('click', toggle);
    bit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    document.getElementById('guideClose').addEventListener('click', () => {
      document.getElementById('guideBubble').hidden = true;
      this.markSeen(`guide-${this.guideKey()}`);
    });
    document.getElementById('guideTour').addEventListener('click', () => {
      document.getElementById('guideBubble').hidden = true;
      this.startTour(this.currentTab);
    });
  }

  guideKey() {
    if (this.route === 'module') return MODULES[this.currentTab].steps ? `${this.currentTab}-${this.currentStep}` : this.currentTab;
    return this.route;
  }

  updateGuide() {
    const guide = document.getElementById('guide');
    const bubble = document.getElementById('guideBubble');
    let text = null;
    if (this.route === 'workshop') text = GUIDE_LINES.workshop;
    if (this.route === 'area') text = GUIDE_LINES.area;
    if (this.route === 'module' && this.choosing) text = GUIDE_LINES.chooser;
    else if (this.route === 'module') {
      const lines = GUIDE_LINES[this.currentTab];
      text = typeof lines === 'string' ? lines : lines[this.currentStep];
    }
    guide.hidden = !text;
    if (!text) return;
    document.getElementById('guideText').textContent = text;
    document.getElementById('guideTour').hidden = !(this.route === 'module' && TOURS[this.currentTab] && this.currentStep === 'play');
    // Speak up on the areas screen the first time; elsewhere Bit waits to be clicked
    // (the walkthrough already covers a module's first visit and the bubble would cover controls)
    bubble.hidden = this.route !== 'workshop' || this.hasSeen(`guide-${this.guideKey()}`);
  }

  // ── Coach-mark tour ──────────────────────────────────────
  setupTour() {
    document.getElementById('tourNext').addEventListener('click', () => this.nextTourStep());
    document.getElementById('tourSkip').addEventListener('click', () => this.endTour(true));
    window.addEventListener('resize', () => { if (this.tour) this.placeTour(); });
    window.addEventListener('scroll', () => { if (this.tour) this.placeTour(); }, { passive: true });
  }

  startTour(id) {
    if (!TOURS[id]) return;
    if (this.currentStep !== 'play') this.setStep('play');
    this.tour = { id, i: 0 };
    document.getElementById('guideBubble').hidden = true;
    document.getElementById('tourSpot').hidden = false;
    document.getElementById('tourCard').hidden = false;
    this.renderTourStep();
  }

  renderTourStep() {
    const steps = TOURS[this.tour.id];
    const s = steps[this.tour.i];
    document.getElementById('tourStep').textContent = T(`Paso ${this.tour.i + 1} de ${steps.length}`, `Step ${this.tour.i + 1} of ${steps.length}`);
    document.getElementById('tourTitle').textContent = s.title;
    document.getElementById('tourText').textContent = s.text;
    document.getElementById('tourNext').textContent = this.tour.i === steps.length - 1 ? T('¡Listo!', 'Done!') : T('Siguiente', 'Next');
    const target = document.querySelector(s.sel);
    if (target) {
      const r = target.getBoundingClientRect();
      if (r.top < 80 || r.bottom > innerHeight - 40) window.scrollBy(0, r.top - innerHeight / 3);
    }
    this.placeTour();
  }

  placeTour() {
    const s = TOURS[this.tour.id][this.tour.i];
    const target = document.querySelector(s.sel);
    const spot = document.getElementById('tourSpot');
    const card = document.getElementById('tourCard');
    if (!target) return;
    const r = target.getBoundingClientRect();
    const pad = 8;
    Object.assign(spot.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });

    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 18;
    let top, left;
    if (r.right + gap + cw < innerWidth - 16) { left = r.right + gap; top = r.top; }
    else if (r.bottom + gap + ch < innerHeight - 16) { top = r.bottom + gap; left = r.left; }
    else { top = r.top - ch - gap; left = r.left; }
    left = Math.max(16, Math.min(left, innerWidth - cw - 16));
    top = Math.max(16, Math.min(top, innerHeight - ch - 16));
    Object.assign(card.style, { top: `${top}px`, left: `${left}px` });
  }

  nextTourStep() {
    if (!this.tour) return;
    window.soundController.playTone(660, 'sine', 0.03, 0.3);
    if (this.tour.i >= TOURS[this.tour.id].length - 1) return this.endTour(true);
    this.tour.i++;
    this.renderTourStep();
  }

  endTour(markDone = false) {
    if (!this.tour) return;
    if (markDone) this.markSeen(this.tour.id);
    this.tour = null;
    document.getElementById('tourSpot').hidden = true;
    document.getElementById('tourCard').hidden = true;
  }

  hasSeen(key) {
    try { return localStorage.getItem(`csworkshop-seen-${key}`) === '1'; } catch (e) { return false; }
  }
  markSeen(key) {
    try { localStorage.setItem(`csworkshop-seen-${key}`, '1'); } catch (e) { /* storage unavailable */ }
  }

  // ── Global controls ──────────────────────────────────────
  setupGlobalControls() {
    // The gear opens a small menu with the language, the theme and the sound
    const btnSettings = document.getElementById('btnSettings');
    const menu = document.getElementById('settingsMenu');
    const row = (btn, label, value) => {
      if (!btn) return;
      const l = btn.querySelector && btn.querySelector('.settings-label');
      const v = btn.querySelector && btn.querySelector('.settings-value');
      if (l) l.textContent = label;
      if (v) v.textContent = value;
    };
    this.closeSettings = () => {
      if (!menu || menu.hidden) return;
      menu.hidden = true;
      if (btnSettings) btnSettings.setAttribute('aria-expanded', 'false');
    };
    if (btnSettings && menu) {
      btnSettings.addEventListener('click', (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        menu.hidden = !menu.hidden;
        btnSettings.setAttribute('aria-expanded', String(!menu.hidden));
      });
      document.addEventListener('click', (e) => { if (!menu.hidden && e && e.target && !(menu.contains && menu.contains(e.target))) this.closeSettings(); });
      btnSettings.title = T('Ajustes', 'Settings');
      btnSettings.setAttribute('aria-label', T('Ajustes', 'Settings'));
    }

    const btnMute = document.getElementById('btnToggleSound');
    const syncSound = () => {
      const muted = !!(window.soundController && window.soundController.muted);
      row(btnMute, T('Sonido', 'Sound'), muted ? T('Apagado', 'Off') : T('Encendido', 'On'));
      const icon = btnMute.querySelector && btnMute.querySelector('use');
      if (icon) icon.setAttribute('href', `#i-${muted ? 'mute' : 'sound'}`);
      btnMute.setAttribute('aria-pressed', String(!muted));
      btnMute.title = muted ? T('Activar sonido', 'Turn sound on') : T('Silenciar sonido', 'Mute sound');
    };
    syncSound();
    btnMute.addEventListener('click', () => {
      const isMuted = window.soundController.toggleMute();
      syncSound();
      this.showToast(isMuted ? T('Sonido apagado', 'Sound off') : T('Sonido encendido', 'Sound on'));
    });

    // Language: the row shows the current language; a click switches to the other one
    const btnLang = document.getElementById('btnLang');
    if (btnLang && window.I18n) {
      const next = window.I18n.other();
      const label = next === 'en' ? 'Switch to English' : 'Cambiar a español';
      row(btnLang, T('Idioma', 'Language'), window.I18n.LANGS[window.I18n.lang].label);
      btnLang.title = label;
      btnLang.setAttribute('aria-label', `${T('Idioma', 'Language')}: ${window.I18n.LANGS[window.I18n.lang].label}. ${label}`);
      btnLang.addEventListener('click', () => window.I18n.toggle());
    }

    // Visual theme: lab (default) or the original wooden workshop
    const btnTheme = document.getElementById('btnTheme');
    const syncTheme = () => {
      if (!btnTheme || !window.Theme) return;
      const wood = window.Theme.current() === 'madera';
      const label = wood ? T('Cambiar al laboratorio', 'Switch to the lab') : T('Cambiar al taller de madera', 'Switch to the wooden workshop');
      btnTheme.title = label;
      btnTheme.setAttribute('aria-label', label);
      btnTheme.setAttribute('aria-pressed', String(wood));
      row(btnTheme, T('Tema', 'Theme'), wood ? T('Madera', 'Wood') : T('Laboratorio', 'Lab'));
    };
    if (btnTheme && window.Theme) {
      syncTheme();
      btnTheme.addEventListener('click', () => {
        const theme = window.Theme.toggle();
        syncTheme();
        const themeEn = { lab: 'Lab', madera: 'Wooden workshop' };
        this.showToast(T(`Tema: ${window.Theme.THEMES[theme].label}`, `Theme: ${themeEn[theme] || window.Theme.THEMES[theme].label}`));
      });
      // Canvas stations repaint on resize; reuse that to pick up the new colours
      window.addEventListener('themechange', () => window.dispatchEvent(new Event('resize')));
    }

    document.getElementById('btnToggleFullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    });

    document.getElementById('btnHelp').addEventListener('click', () => {
      if (this.route === 'module' && TOURS[this.currentTab]) this.startTour(this.currentTab);
      else if (['module', 'workshop', 'area'].includes(this.route)) document.getElementById('guideBubble').hidden = false;
      else this.go('#/about');
    });
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (this.closeSettings) this.closeSettings(); return this.endTour(true); }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) && e.target.type !== 'range') return;
      if (this.tour && (e.key === 'Enter' || e.key === 'ArrowRight')) { e.preventDefault(); return this.nextTourStep(); }

      // Step through code in the tracer stations
      const tr = this.route === 'module' && this.currentStep === 'play' ? this.tracer() : null;
      if (tr && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        if (e.key === 'ArrowRight') { tr.stop(); tr.next(); } else tr.prev();
        return;
      }
      if (tr && e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); tr.togglePlay(); return; }

      if (e.key === 'm' || e.key === 'M') document.getElementById('btnToggleSound').click();
    });
  }

  // At most MAX_TOASTS are visible: a new one pushes the oldest out
  showToast(message, duration = 2600) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    this.toasts = (this.toasts || []).filter((el) => el.isConnected !== false && !el.dataset.gone);
    while (this.toasts.length >= MAX_TOASTS) {
      const oldest = this.toasts.shift();
      oldest.dataset.gone = '1';
      oldest.remove();
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    this.toasts.push(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity .3s ease';
      toast.style.opacity = '0';
      setTimeout(() => { toast.dataset.gone = '1'; toast.remove(); }, 300);
    }, duration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
