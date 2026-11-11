// CS Interactive Workshop - Networking station: a client and a server exchanging
// HTTP over TCP, step by step. The protocol logic lives in httpsim.js.
class NetworkingLab {
  constructor() {
    this.exchange = null;
    this.idx = 0;
    this.timer = null;
    this.method = 'GET';
    this.phases = [
      { id: 'open', label: 'Conexión TCP' },
      { id: 'request', label: 'Petición HTTP' },
      { id: 'server', label: 'Servidor' },
      { id: 'response', label: 'Respuesta HTTP' },
      { id: 'close', label: 'Cierre' }
    ];
  }

  $(id) { return document.getElementById(id); }

  init() {
    if (!window.HttpSim || !this.$('netSim')) return;
    const figs = Object.keys(window.EMBEDDED_ASSETS || {});
    this.figures = figs;
    const figSel = this.$('netFigure');
    figSel.innerHTML = figs.map((f) => `<option value="${f}">${f}</option>`).join('') +
      '<option value="unicornio">unicornio (no existe)</option>';
    figSel.value = figs.includes('batman') ? 'batman' : figs[0];

    this.$('netFiles').innerHTML = figs.map((f) => `<span class="net-file" data-file="${f}">${f}</span>`).join('');

    this.$('netCommand').addEventListener('change', () => {
      figSel.disabled = this.$('netCommand').value === 'LIST';
      this.prepare();
    });
    figSel.addEventListener('change', () => this.prepare());
    this.$('netMethod').addEventListener('click', (e) => {
      const b = e.target.closest('[data-method]');
      if (!b) return;
      this.method = b.dataset.method;
      this.$('netMethod').querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === b));
      this.prepare();
    });
    this.$('netRequestForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.prepare();
      this.play();
    });

    this.$('netFirst').addEventListener('click', () => { this.stop(); this.go(0); });
    this.$('netPrev').addEventListener('click', () => this.prev());
    this.$('netNext').addEventListener('click', () => { this.stop(); this.next(); });
    this.$('netLast').addEventListener('click', () => { this.stop(); this.go(this.exchange.steps.length - 1); });
    this.$('netPlay').addEventListener('click', () => this.togglePlay());
    this.$('netTimeline').addEventListener('click', (e) => {
      const d = e.target.closest('[data-step-idx]');
      if (d) { this.stop(); this.go(+d.dataset.stepIdx); }
    });

    this.prepare();
  }

  options() {
    return { command: this.$('netCommand').value, figure: this.$('netFigure').value, method: this.method };
  }

  // Build a fresh exchange for the current form values and show its first step.
  prepare() {
    this.stop();
    this.exchange = window.HttpSim.buildExchange(this.options());
    this.renderTimeline();
    this.go(0, true);
  }

  go(i, instant = false) {
    const steps = this.exchange.steps;
    const prevIdx = this.idx;
    this.idx = Math.max(0, Math.min(i, steps.length - 1));
    this.render(instant || this.idx !== prevIdx + 1);
  }
  next() {
    if (this.idx < this.exchange.steps.length - 1) {
      this.go(this.idx + 1);
      const p = this.exchange.steps[this.idx].packet;
      if (p && window.soundController.playPacketTick) window.soundController.playPacketTick();
    } else this.stop();
  }
  prev() { this.stop(); this.go(this.idx - 1, true); }

  togglePlay() { this.timer ? this.stop() : this.play(); }
  play() {
    if (this.idx >= this.exchange.steps.length - 1) this.go(0, true);
    this.setPlay(true);
    const tick = () => {
      const panel = this.$('netSim');
      if (!panel || !panel.offsetParent || this.idx >= this.exchange.steps.length - 1) return this.stop();
      this.next();
      const step = this.exchange.steps[this.idx];
      this.timer = setTimeout(tick, step.packet ? 1900 : 1500);
    };
    this.timer = setTimeout(tick, 350);
  }
  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.setPlay(false);
  }
  setPlay(on) {
    const b = this.$('netPlay');
    if (b) b.innerHTML = on ? '<svg class="ic"><use href="#i-pause"/></svg>Pausar' : '<svg class="ic"><use href="#i-play"/></svg>Reproducir';
  }

  // ── Rendering ─────────────────────────────────────────────
  renderTimeline() {
    const steps = this.exchange.steps;
    this.$('netTimeline').innerHTML = this.phases.map((ph) => {
      const dots = steps.map((s, i) => (s.phase === ph.id ? `<button class="net-dot" data-step-idx="${i}" title="${s.title}" aria-label="${s.title}"></button>` : '')).join('');
      return `<div class="net-phase" data-phase="${ph.id}"><span class="net-phase-label">${ph.label}</span><span class="net-dots">${dots}</span></div>`;
    }).join('');
  }

  render(instant) {
    const steps = this.exchange.steps;
    const s = steps[this.idx];
    const esc = window.Tracer ? window.Tracer.esc : (x) => String(x);

    // Machines
    this.setState('netClientState', s.client);
    this.setState('netServerState', s.server);
    const screen = this.$('netClientScreen');
    screen.textContent = s.screen || '$ _';
    screen.scrollTop = 0;
    this.$('netServerLog').textContent = s.log.join('\n');
    this.$('netServerLog').scrollTop = 1e6;
    this.$('netThreads').innerHTML = s.threads.map((t) => `<span class="net-thread ${t.state === 'terminado' ? 'done' : ''}">${esc(t.name)}<i>${esc(t.state)}</i></span>`).join('');
    const route = this.exchange.response.route;
    const lookedUp = ['server', 'response'].includes(s.phase) && s.title !== 'Lee la petición';
    this.$('netFiles').querySelectorAll('.net-file').forEach((f) => {
      f.classList.toggle('hit', lookedUp && route === 'figure' && f.dataset.file === this.exchange.response.figure);
      f.classList.toggle('scan', lookedUp && route === 'list');
    });
    this.$('netServer').classList.toggle('miss', lookedUp && route === 'notfound');
    this.$('netClient').classList.toggle('busy', !!s.packet && s.packet.dir === 'c2s');
    this.$('netServer').classList.toggle('busy', (!!s.packet && s.packet.dir === 's2c') || s.phase === 'server');

    // Packet on the wire
    this.animatePacket(s.packet, instant);

    // Timeline + player
    this.$('netTimeline').querySelectorAll('.net-dot').forEach((d) => {
      const i = +d.dataset.stepIdx;
      d.classList.toggle('cur', i === this.idx);
      d.classList.toggle('done', i < this.idx);
    });
    this.$('netTimeline').querySelectorAll('.net-phase').forEach((p) => p.classList.toggle('active', p.dataset.phase === s.phase));
    this.$('netCount').textContent = `${this.idx + 1} / ${steps.length}`;
    this.$('netFirst').disabled = this.$('netPrev').disabled = this.idx === 0;
    this.$('netLast').disabled = this.$('netNext').disabled = this.idx === steps.length - 1;

    // Finishing an exchange counts toward the station checklist
    if (this.idx === steps.length - 1 && window.account) {
      const kind = { figure: 'figure', list: 'list', notfound: 'notfound', bad: 'bad' }[this.exchange.response.route];
      if (kind) window.account.record('networking', `exchange:${kind}`);
    }

    // Narration + inspector
    this.$('netNoteTitle').textContent = `Paso ${this.idx + 1} · ${s.title}`;
    this.$('netNote').innerHTML = s.note;
    this.renderInspector(s);
  }

  setState(id, state) {
    const el = this.$(id);
    el.textContent = state || '—';
    el.dataset.state = state || '';
  }

  animatePacket(p, instant) {
    const el = this.$('netPacket');
    const wire = this.$('netWire');
    if (!p) { el.hidden = true; return; }
    el.hidden = false;
    this.$('netPacketLabel').textContent = p.label;
    el.className = `net-packet ${p.payload ? 'data' : 'ctrl'} ${p.dir}`;
    // The cable is horizontal on wide screens and vertical when the machines stack
    const cable = wire.querySelector('.net-cable');
    const vertical = cable ? cable.offsetHeight > cable.offsetWidth : false;
    const axis = vertical ? 'top' : 'left';
    const other = vertical ? 'left' : 'top';
    const from = p.dir === 'c2s' ? 8 : 92;
    const to = 100 - from;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.style.transition = 'none';
    el.style[other] = '50%';
    el.style[axis] = `${instant || reduce ? to : from}%`;
    if (instant || reduce) return;
    void el.offsetWidth; // restart the transition
    el.style.transition = `${axis} 1.15s cubic-bezier(.45, .05, .35, 1)`;
    el.style[axis] = `${to}%`;
  }

  renderInspector(s) {
    const esc = window.Tracer ? window.Tracer.esc : (x) => String(x);
    const p = s.packet;
    const show = (id, on) => { this.$(id).hidden = !on; };
    const sim = window.HttpSim;

    if (p) {
      this.$('netInspTitle').textContent = `Paquete en el cable · ${p.label}`;
      this.$('netInspMeta').textContent = [p.dir === 'c2s' ? 'cliente → servidor' : 'servidor → cliente', p.part].filter(Boolean).join(' · ');
      show('netLayerIp', true); show('netLayerTcp', true); show('netLayerEmpty', false);
      this.$('netIp').innerHTML = `${esc(p.tcp.src.split(']')[0].slice(1))} <span class="net-arrow">→</span> ${esc(p.tcp.dst.split(']')[0].slice(1))}`;
      const t = p.tcp;
      this.$('netTcp').innerHTML = `
        <div><dt>puerto origen</dt><dd>${esc(t.src.split(']:')[1])}</dd></div>
        <div><dt>puerto destino</dt><dd>${esc(t.dst.split(']:')[1])}</dd></div>
        <div><dt>seq</dt><dd>${t.seq}</dd></div>
        <div><dt>ack</dt><dd>${t.ack === null ? '—' : t.ack}</dd></div>
        <div><dt>flags</dt><dd>${t.flags.map((f) => `<span class="flag f-${f}">${f}</span>`).join('')}</dd></div>
        <div><dt>datos</dt><dd>${t.len} bytes</dd></div>`;
      show('netLayerHttp', !!p.payload);
      if (p.payload) this.$('netHttp').innerHTML = this.anatomy(p.payload, p.part && !p.part.startsWith('segmento 1 '));
    } else if (s.preview) {
      this.$('netInspTitle').textContent = s.preview.kind === 'request' ? 'Mensaje que arma el cliente' : 'Mensaje que arma el servidor';
      this.$('netInspMeta').textContent = `${sim.byteLength(s.preview.raw)} bytes, todavía no sale`;
      show('netLayerIp', false); show('netLayerTcp', false); show('netLayerEmpty', false); show('netLayerHttp', true);
      this.$('netHttp').innerHTML = this.anatomy(s.preview.raw, false);
    } else {
      this.$('netInspTitle').textContent = 'Paquete en el cable';
      this.$('netInspMeta').textContent = '';
      show('netLayerIp', false); show('netLayerTcp', false); show('netLayerHttp', false); show('netLayerEmpty', true);
    }
  }

  // Color the parts of an HTTP message; continuation segments are pure body.
  anatomy(raw, continuation, maxBody = 700) {
    const esc = window.Tracer ? window.Tracer.esc : (x) => String(x);
    const crlf = '<span class="h-crlf">\\r\\n</span>';
    const body = (txt) => {
      const extra = txt.length > maxBody ? `<span class="h-more">… (+${txt.length - maxBody} caracteres más)</span>` : '';
      return txt.length ? `<span class="h-body">${esc(txt.slice(0, maxBody))}</span>${extra}` : '<span class="h-more">(sin cuerpo)</span>';
    };
    if (continuation) return body(raw);
    const sep = raw.indexOf('\r\n\r\n');
    const head = sep === -1 ? raw : raw.slice(0, sep);
    const lines = head.split('\r\n');
    let html = `<span class="h-start">${esc(lines[0])}</span>${crlf}\n`;
    lines.slice(1).forEach((l) => {
      const i = l.indexOf(':');
      html += `<span class="h-head"><b>${esc(l.slice(0, i))}</b>${esc(l.slice(i))}</span>${crlf}\n`;
    });
    html += `${crlf}<span class="h-more"> ← línea vacía: terminan los encabezados</span>\n`;
    if (sep !== -1) html += body(raw.slice(sep + 4));
    return html;
  }
}

window.networkingLab = new NetworkingLab();
