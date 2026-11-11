// CS Interactive Workshop - App orchestrator
// Screens: intro (#/) -> about (#/que-es) -> work areas (#/taller)
//          -> one area's stations (#/mesa/<area>) -> station (#/taller/<module>[/<step>])

const AREAS = {
  algoritmos:  { title: 'Algoritmos y Estructuras de Datos', line: 'Cómo se ordenan, guardan y recorren los datos.' },
  paralela:    { title: 'Programación Paralela y Concurrente', line: 'Hilos, sincronización y trabajo en paralelo.' },
  redes:       { title: 'Redes', line: 'Cómo viajan los datos entre computadoras.' },
  entrevistas: { title: 'Entrevistas Técnicas', line: 'Patrones para resolver problemas de entrevista, paso a paso.' },
  datos:       { title: 'Bases de Datos', line: 'Consultas SQL, ejecutadas cláusula por cláusula.' }
};

const MODULES = {
  algorithms:     { title: 'Ordenamiento',            area: 'algoritmos',  steps: true },
  datastructures: { title: 'Estructuras de datos',    area: 'algoritmos',  steps: true, tracer: 'dsStation' },
  concurrency:    { title: 'La Rotonda',              area: 'paralela',    steps: true },
  heat:           { title: 'Difusión de calor',       area: 'paralela',    steps: true },
  networking:     { title: 'Sockets TCP',             area: 'redes',       steps: true, tracer: 'networkingStation' },
  interview:      { title: 'Patrones de entrevista',  area: 'entrevistas', steps: true, tracer: 'interviewStation' },
  sql:            { title: 'SQL paso a paso',         area: 'datos',       steps: true, tracer: 'sqlStation' },
  cheatsheets:    { title: 'El Cuaderno',             area: null,          steps: false }
};
const MODULE_ORDER = ['algorithms', 'datastructures', 'concurrency', 'heat', 'networking', 'interview', 'sql', 'cheatsheets'];
const STEP_IDS = ['play', 'learn', 'build'];

// What Bit says on each screen/step
const TRACER_LINES = {
  play: 'Usa las flechas del teclado (← →) para avanzar línea por línea. Cambia la entrada para ver otro recorrido.',
  learn: 'Aquí está la idea detrás del problema que elegiste y cómo reconocer cuándo usarla.',
  build: 'Una plantilla para reusar el patrón y consejos para explicarlo en voz alta.'
};
const GUIDE_LINES = {
  taller: 'Primero escoge una mesa de trabajo: cada una corresponde a un curso o tema. Si vas a una entrevista, prueba «Entrevistas Técnicas».',
  area: 'Estas son las estaciones de esta mesa. Toca una para entrar.',
  algorithms: {
    play: 'Escoge un algoritmo, dale a Iniciar y escucha: cada barra suena según su altura.',
    learn: 'Aquí está la idea del algoritmo que elegiste y cuánto cuesta. Cambia de algoritmo en Experimenta y vuelve.',
    build: 'Este código cambia según el algoritmo que tengas seleccionado.'
  },
  concurrency: {
    play: 'Los autos son hilos. Apaga los semáforos o pulsa «Provocar deadlock» para ver la rotonda trabarse.',
    learn: 'Un deadlock necesita cuatro condiciones a la vez. Rompe una y desaparece.',
    build: 'Una versión simplificada de la rotonda con semáforos POSIX, lista para estudiar.'
  },
  heat: {
    play: 'Pon la velocidad en 1 y mira a cada hilo calcular su franja. Luego activa el hilo lento: verás a los demás esperando en la barrera.',
    learn: 'Doble búfer, franjas, barrera y reducción: las cuatro ideas que hacen correcto y rápido este cálculo.',
    build: 'El motor en C de este proyecto, con pthreads y OpenMP, y cómo correrlo para comparar.'
  },
  networking: {
    play: 'Envía una petición y mira cada paquete cruzar el cable. Usa ← y → para ir paso a paso.',
    learn: 'Cliente, servidor, socket y pool de hilos, explicados sin rodeos.',
    build: 'Un servidor TCP de verdad cabe en 30 líneas. Aquí lo tienes.'
  },
  interview: TRACER_LINES,
  datastructures: TRACER_LINES,
  sql: {
    play: 'Mira el orden de las líneas resaltadas: SQL no se ejecuta en el orden en que se escribe.',
    learn: TRACER_LINES.learn,
    build: 'Plantillas y trampas comunes de SQL, sobre todo con NULL.'
  },
  cheatsheets: 'Mueve los controles de Amdahl: verás por qué más núcleos no siempre es más rápido.'
};

// First-visit walkthroughs (coach marks)
const tracerTour = (id, what) => [
  { sel: `#tracer-${id} .tr-picker`, title: 'Escoge un problema', text: `Cada tarjeta es ${what}. La etiqueta dice qué tan difícil es.` },
  { sel: `#tracer-${id} .tr-code-wrap`, title: 'El código', text: 'La línea resaltada es la que se está ejecutando. Las más claras ya se ejecutaron.' },
  { sel: `#tracer-${id} .tr-controls`, title: 'Los controles', text: 'Avanza o retrocede paso a paso, o dale Reproducir. Con el teclado: ← y →.' },
  { sel: `#tracer-${id} .tr-stage`, title: 'Lo que pasa en memoria', text: 'Aquí ves los datos en cada paso. Debajo, la explicación y las variables (las que cambian se iluminan).' }
];
const TOURS = {
  algorithms: [
    { sel: '#algoSelect', title: 'Escoge un algoritmo', text: 'Hay ocho. Cada uno ordena de forma distinta. Empieza con Quick Sort.' },
    { sel: '#algoPresets', title: '¿Cómo empieza el arreglo?', text: 'Un arreglo invertido es el peor caso de varios algoritmos. Vale la pena probarlo.' },
    { sel: '#btnRunAlgo', title: '¡Dale play!', text: 'Mira y escucha. Puedes pausar cuando quieras.' },
    { sel: '#algoStage', title: 'El escenario', text: 'Amarillo compara, rojo intercambia y verde ya está en su lugar. Abajo ves el marcador.' },
    { sel: '#modSteps', title: 'Después, entiende', text: 'En «Entiende» está la idea y su costo. En «Implementa», el código.' }
  ],
  concurrency: [
    { sel: '#concSubtabs', title: 'Dos simulaciones', text: 'La rotonda y dos patrones clásicos: el buffer acotado y los filósofos comensales.' },
    { sel: '#concurrencyViewport', title: 'La rotonda', text: 'Cada auto es un hilo; cada cuadrante, un recurso con capacidad limitada.' },
    { sel: '#deadlockButtons', title: 'Rómpela', text: 'Provoca un deadlock y luego resuélvelo con un semáforo.' },
    { sel: '#modSteps', title: '¿Y por qué pasó?', text: 'La explicación está en «Entiende».' }
  ],
  heat: [
    { sel: '#heatCanvas', title: 'Una placa de metal', text: 'El color es la temperatura. Las líneas punteadas dividen la placa en franjas: una por hilo.' },
    { sel: '#heatThreadCtl', title: '¿Cuántos hilos?', text: 'Cambia entre 1 y 8. El resultado final es idéntico; lo que cambia es cuánto tarda.' },
    { sel: '#heatLanesPanel', title: 'Los hilos trabajando', text: 'Cada barra es un hilo. La parte rayada es tiempo perdido esperando en la barrera al más lento.' },
    { sel: '#heatChartPanel', title: '¿Cuándo parar?', text: 'Cuando el cambio más grande baja de ε, la placa llegó al equilibrio.' }
  ],
  networking: [
    { sel: '#netRequestForm', title: 'Lo que pide el cliente', text: 'Escoge una figura (o LIST) y envía la petición. Prueba también una figura que no existe o el método POST.' },
    { sel: '#netScene', title: 'Dos computadoras y un cable', text: 'A la izquierda el cliente, a la derecha el servidor con su disco, sus hilos y su registro. Los paquetes viajan por el cable.' },
    { sel: '#netPlayer', title: 'Paso a paso', text: 'Avanza, retrocede o reproduce. Los puntos muestran las fases: conexión, petición, servidor, respuesta y cierre.' },
    { sel: '#packetInspector', title: 'Abre el paquete', text: 'Cada paquete por capas: direcciones IPv6, el encabezado TCP y, si lleva datos, el mensaje HTTP parte por parte.' }
  ],
  interview: tracerTour('interview', 'un problema clásico de entrevista'),
  datastructures: tracerTour('datastructures', 'una estructura de datos con su operación típica'),
  sql: tracerTour('sql', 'una consulta sobre la misma base de ejemplo')
};

const BIT_SVG = `
<svg class="bit" viewBox="0 0 120 150" aria-hidden="true">
  <line x1="60" y1="30" x2="60" y2="12" stroke="#3d2414" stroke-width="4" stroke-linecap="round"/>
  <circle class="bulb" cx="60" cy="10" r="7" fill="#f6c33b" stroke="#3d2414" stroke-width="3.5"/>
  <path d="M30 108 14 126" stroke="#8d939c" stroke-width="7" stroke-linecap="round"/>
  <path d="M90 108 106 90" stroke="#8d939c" stroke-width="7" stroke-linecap="round"/>
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
</svg>`;

class App {
  constructor() {
    this.currentTab = null;
    this.currentArea = null;
    this.currentStep = 'play';
    this.route = 'intro';
    this.tour = null;
  }

  init() {
    document.querySelectorAll('.bit-slot').forEach(el => { el.innerHTML = BIT_SVG; });

    ['algorithmsStation', 'concurrencyStation', 'heatStation', 'networkingStation', 'cheatsheetsStation', 'interviewStation', 'dsStation', 'sqlStation']
      .forEach(name => { if (window[name]) window[name].init(); });

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
  handleRoute() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    this.endTour();
    this.stopTracers();

    if (parts[0] === 'que-es') return this.showScreen('about');
    if (parts[0] === 'perfil') return this.openProfile();
    if (parts[0] === 'mesa' && AREAS[parts[1]]) return this.openArea(parts[1]);
    if (parts[0] === 'taller' && MODULES[parts[1]]) {
      const step = STEP_IDS.includes(parts[2]) ? parts[2] : 'play';
      return this.openModule(parts[1], step);
    }
    if (parts[0] === 'taller') return this.showScreen('taller');
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
  openStation(tabId = 'algorithms') { this.go(`#/taller/${tabId}`); }
  showWelcome() { this.go('#/taller'); }

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

  openModule(tabId, step = 'play') {
    const isNewModule = this.currentTab !== tabId || this.route !== 'module';
    this.switchTab(tabId);
    this.showScreen('module');
    this.setStep(MODULES[tabId].steps ? step : 'play');
    if (isNewModule) window.soundController.playTone(720, 'sine', 0.04, 0.4);
    if (isNewModule && TOURS[tabId] && step === 'play' && !this.hasSeen(tabId)) {
      setTimeout(() => this.startTour(tabId), 450);
    }
  }

  switchTab(tabId) {
    if (!MODULES[tabId]) return;
    const mod = MODULES[tabId];
    this.currentTab = tabId;
    if (mod.area) this.currentArea = mod.area;
    document.getElementById('activeMissionLabel').textContent = mod.title;
    const back = document.getElementById('btnBackToWelcome');
    back.href = mod.area ? `#/mesa/${mod.area}` : '#/taller';
    document.getElementById('modCrumb').textContent = mod.area ? `${AREAS[mod.area].title} /` : 'Taller /';
    document.getElementById('modSteps').hidden = !mod.steps;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
  }

  tracer() {
    const mod = MODULES[this.currentTab];
    return mod && mod.tracer ? window[mod.tracer] : null;
  }
  stopTracers() {
    Object.values(MODULES).forEach(m => { if (m.tracer && window[m.tracer]) window[m.tracer].stop(); });
    if (window.networkingStation && window.networkingStation.exchange) window.networkingStation.stop();
  }

  setupSteps() {
    document.querySelectorAll('#modSteps .step').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = btn.dataset.step;
        history.replaceState(null, '', `#/taller/${this.currentTab}${step === 'play' ? '' : '/' + step}`);
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
        if (this.currentTab === 'concurrency' && window.concurrencyStation) window.concurrencyStation.resizeCanvas();
      });
    }
    this.updateGuide();
  }

  // ── Account and progress ─────────────────────────────────
  setupAccount() {
    const acc = window.account;
    if (!acc) return;
    acc.onChange((ev) => {
      this.renderAccountButton();
      this.updateProgressBadges();
      if (this.route === 'profile') this.renderProfile();
      if (ev.type === 'record' && ev.isNew) this.showToast(`Logrado: ${ev.label}`);
      if (ev.type === 'auth' && ev.user && this.signingIn) {
        this.signingIn = false;
        this.showToast(`Hola, ${ev.user.name.split(' ')[0]}. Tu progreso ahora se guarda en tu cuenta.`);
      }
      if (ev.type === 'error') this.showToast('No se pudo sincronizar tu cuenta. Tu progreso sigue en este dispositivo.');
    });

    const btnIn = document.getElementById('btnSignIn');
    btnIn.addEventListener('click', async () => {
      btnIn.disabled = true;
      this.signingIn = true;
      try { await acc.signIn(); } catch (e) {
        this.signingIn = false;
        if (!e || e.code !== 'auth/popup-closed-by-user') this.showToast(e && e.message ? e.message : 'No se pudo iniciar sesión.');
      } finally { btnIn.disabled = !acc.cloudAvailable; }
    });
    document.getElementById('btnSignOut').addEventListener('click', async () => {
      await acc.signOut();
      this.showToast('Sesión cerrada. Este dispositivo vuelve a modo invitado.');
    });
    document.getElementById('btnResetProgress').addEventListener('click', () => {
      const where = acc.signedIn ? 'de tu cuenta' : 'de este dispositivo';
      if (window.confirm(`¿Borrar todo tu progreso ${where}? No se puede deshacer.`)) {
        acc.reset();
        this.showToast('Progreso borrado.');
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
    btn.title = u ? `Mi espacio · ${u.name}` : 'Mi espacio';
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

    $('profileName').textContent = u ? u.name : 'Invitado';
    $('profileSub').textContent = u
      ? 'Tu progreso se guarda en tu cuenta y te sigue a cualquier dispositivo.'
      : 'Tu progreso se guarda solo en este dispositivo.';
    $('profileAvatar').innerHTML = u && u.photoURL
      ? `<img src="${encodeURI(u.photoURL)}" alt="" referrerpolicy="no-referrer">`
      : '<svg class="ic"><use href="#i-user"/></svg>';
    $('btnSignIn').hidden = !!u;
    $('btnSignIn').disabled = !acc.cloudAvailable;
    $('btnSignOut').hidden = !u;
    $('profileNote').textContent = !acc.cloudAvailable
      ? 'Las cuentas todavía no están activadas en este sitio. Mientras tanto, tu progreso se guarda en este dispositivo.'
      : u ? '' : 'Inicia sesión para guardar tu progreso en la nube. Lo que ya hiciste aquí se suma a tu cuenta.';
    $('profileLead').textContent = u ? `Hola, ${u.name.split(' ')[0]}. Esto es lo que llevas.` : 'Tu progreso en el taller.';

    const all = acc.overall();
    $('overallPct').textContent = `${all.percent}%`;
    $('overallArc').style.strokeDashoffset = String(314.16 * (1 - all.percent / 100));
    $('statItems').textContent = `${all.done} / ${all.total}`;
    $('statStations').textContent = `${all.stationsComplete} / ${all.stations}`;

    const last = acc.progress.last;
    const cont = $('btnContinue');
    if (last && MODULES[last.station]) {
      cont.href = `#/taller/${last.station}${last.step === 'play' ? '' : '/' + last.step}`;
      cont.innerHTML = `<svg class="ic"><use href="#i-arrow-r"/></svg>Continuar en ${esc(MODULES[last.station].title)}`;
    } else {
      cont.href = '#/taller';
      cont.innerHTML = '<svg class="ic"><use href="#i-arrow-r"/></svg>Empezar';
    }

    const stepNames = { play: 'Experimenta', learn: 'Entiende', build: 'Implementa' };
    const groups = [...Object.keys(AREAS).map((a) => ({ title: AREAS[a].title, ids: MODULE_ORDER.filter((m) => MODULES[m].area === a) })),
      { title: 'Repaso', ids: MODULE_ORDER.filter((m) => !MODULES[m].area) }];
    $('progressList').innerHTML = groups.filter((g) => g.ids.length).map((g) => `
      <section class="progress-area">
        <h3>${esc(g.title)}</h3>
        <div class="progress-stations">${g.ids.map((id) => {
          const st = acc.stats(id);
          const items = P.CHECKLISTS[id].items;
          const done = (acc.progress.stations[id] || { items: {} }).items;
          return `<article class="progress-station board">
            <div class="progress-station-head"><a href="#/taller/${id}">${esc(MODULES[id].title)}</a><span>${st.done} / ${st.total}</span></div>
            <div class="bar" role="progressbar" aria-valuenow="${st.percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${st.percent}%"></i></div>
            ${MODULES[id].steps ? `<div class="step-chips">${['play', 'learn', 'build'].map((s) => `<span class="step-chip ${st.steps[s] ? 'seen' : ''}">${stepNames[s]}</span>`).join('')}</div>` : ''}
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
      b.innerHTML = complete ? '<svg class="ic"><use href="#i-check"/></svg>completa' : `${done} / ${total}`;
    };
    document.querySelectorAll('.station-card[data-tab]').forEach((card) => {
      const st = acc.stats(card.dataset.tab);
      if (st.total) badge(card, st.done, st.total);
    });
    document.querySelectorAll('.bench').forEach((bench) => {
      const m = /#\/mesa\/(\w+)/.exec(bench.getAttribute('href') || '');
      const ids = m ? MODULE_ORDER.filter((id) => MODULES[id].area === m[1]) : [bench.dataset.tab].filter(Boolean);
      const sum = ids.reduce((acc2, id) => { const s = acc.stats(id); return { done: acc2.done + s.done, total: acc2.total + s.total }; }, { done: 0, total: 0 });
      if (sum.total) badge(bench, sum.done, sum.total);
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
    if (this.route === 'taller') text = GUIDE_LINES.taller;
    if (this.route === 'area') text = GUIDE_LINES.area;
    if (this.route === 'module') {
      const lines = GUIDE_LINES[this.currentTab];
      text = typeof lines === 'string' ? lines : lines[this.currentStep];
    }
    guide.hidden = !text;
    if (!text) return;
    document.getElementById('guideText').textContent = text;
    document.getElementById('guideTour').hidden = !(this.route === 'module' && TOURS[this.currentTab] && this.currentStep === 'play');
    // Speak up on the areas screen the first time; elsewhere Bit waits to be clicked
    // (the walkthrough already covers a module's first visit and the bubble would cover controls)
    bubble.hidden = this.route !== 'taller' || this.hasSeen(`guide-${this.guideKey()}`);
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
    document.getElementById('tourStep').textContent = `Paso ${this.tour.i + 1} de ${steps.length}`;
    document.getElementById('tourTitle').textContent = s.title;
    document.getElementById('tourText').textContent = s.text;
    document.getElementById('tourNext').textContent = this.tour.i === steps.length - 1 ? '¡Listo!' : 'Siguiente';
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
    const btnMute = document.getElementById('btnToggleSound');
    btnMute.addEventListener('click', () => {
      const isMuted = window.soundController.toggleMute();
      btnMute.innerHTML = `<svg class="ic"><use href="#i-${isMuted ? 'mute' : 'sound'}"/></svg>`;
      btnMute.title = isMuted ? 'Activar sonido' : 'Silenciar sonido';
      this.showToast(isMuted ? 'Sonido apagado' : 'Sonido encendido');
    });

    document.getElementById('btnToggleFullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    });

    document.getElementById('btnHelp').addEventListener('click', () => {
      if (this.route === 'module' && TOURS[this.currentTab]) this.startTour(this.currentTab);
      else if (['module', 'taller', 'area'].includes(this.route)) document.getElementById('guideBubble').hidden = false;
      else this.go('#/que-es');
    });
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return this.endTour(true);
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

  showToast(message, duration = 2600) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity .3s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
