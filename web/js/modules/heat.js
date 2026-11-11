// CS Interactive Workshop - Heat diffusion station: a metal plate solved by threads.
// The physics and the thread model live in heatsim.js; this file draws them.
class HeatLab {
  constructor() {
    this.rows = 42;
    this.cols = 64;
    this.scenario = 'edge';
    this.threads = 4;
    this.split = 'even';
    this.slow = false;
    this.speed = 2;
    this.r = 0.24;
    this.eps = 0.01;
    this.brush = 'hot';
    this.running = false;
    this.status = 'idle';           // idle | running | converged | diverged
    this.colors = ['#3d8fd6', '#e8512a', '#4fb477', '#8b5fbf', '#f6c33b', '#2f8653', '#b13817', '#2565a3'];
    this.SLOW_FACTOR = 2.5;
  }

  $(id) { return document.getElementById(id); }

  init() {
    this.canvas = this.$('heatCanvas');
    if (!this.canvas || !window.HeatSim) return;
    this.ctx = this.canvas.getContext('2d');
    this.off = document.createElement('canvas');
    this.off.width = this.cols; this.off.height = this.rows;
    this.offCtx = this.off.getContext('2d');
    this.bind();
    this.reset();
    window.addEventListener('resize', () => { this.dirty = true; });
    const loop = () => { this.frame(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  // ── Controls ────────────────────────────────────────────
  bind() {
    const chips = (id, attr, fn) => this.$(id).addEventListener('click', (e) => {
      const b = e.target.closest(`[data-${attr}]`);
      if (!b) return;
      this.$(id).querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === b));
      fn(b.dataset[attr]);
    });
    chips('heatScenario', 'scenario', (v) => { this.scenario = v; this.reset(); });
    chips('heatThreadChips', 'threads', (v) => { this.threads = +v; this.applyLayout(); });
    chips('heatSplit', 'split', (v) => { this.split = v; this.applyLayout(); });
    chips('heatBrush', 'brush', (v) => { this.brush = v; });
    this.$('heatSlow').addEventListener('change', (e) => { this.slow = e.target.checked; this.applyLayout(); });
    this.$('heatSpeed').addEventListener('input', (e) => { this.speed = +e.target.value; this.renderSpeed(); });
    this.$('heatR').addEventListener('input', (e) => { this.r = +e.target.value / 100; this.renderR(); });
    this.$('heatPlay').addEventListener('click', () => this.togglePlay());
    this.$('heatStep').addEventListener('click', () => { this.pause(); this.stepOnce(); });
    this.$('heatReset').addEventListener('click', () => this.reset());

    // Paint heat (or cold) sources with the pointer
    const paint = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const j = ((e.clientX - rect.left) / rect.width) * this.cols;
      const i = ((e.clientY - rect.top) / rect.height) * this.rows;
      if (window.HeatSim.addHeat(this.plate, i, j, 2.2, this.brush === 'hot' ? 100 : 0)) {
        if (this.status === 'converged') this.status = this.running ? 'running' : 'idle';
        if (window.account) window.account.record('heat', 'paint');
        this.dirty = true;
      }
    };
    this.canvas.addEventListener('pointerdown', (e) => { this.painting = true; this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId); paint(e); });
    this.canvas.addEventListener('pointermove', (e) => { if (this.painting) paint(e); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => this.canvas.addEventListener(t, () => { this.painting = false; }));
  }

  reset() {
    this.pause();
    this.plate = window.HeatSim.createPlate(this.rows, this.cols, this.scenario);
    this.history = [];
    this.status = 'idle';
    this.applyLayout(true);
    this.renderSpeed();
    this.renderR();
  }

  // New bands / slow thread: finish the iteration in progress first, then re-split.
  applyLayout(fresh = false) {
    if (!fresh && this.sweep) this.finishSweep();
    this.bands = window.HeatSim.partition(this.rows, this.threads, this.split);
    this.slowFactors = this.slow ? [this.SLOW_FACTOR] : [];
    this.cost = window.HeatSim.iterationCost(this.bands, this.cols, this.slowFactors);
    this.totals = { busy: this.bands.map(() => 0), wait: this.bands.map(() => 0) };
    this.recent = [];
    this.newSweep();
    this.buildLanes();
    this.dirty = true;
    this.renderPanels(true);
  }

  newSweep() {
    this.sweep = { progress: this.bands.map(() => 0), done: this.bands.map(() => 0), local: this.bands.map(() => 0) };
  }

  togglePlay() { this.running ? this.pause() : this.play(); }
  play() {
    if (this.status === 'converged' || this.status === 'diverged') this.reset();
    this.running = true;
    this.status = 'running';
    this.renderPlayButton();
  }
  pause() {
    this.running = false;
    if (this.status === 'running') this.status = 'idle';
    this.renderPlayButton();
  }
  renderPlayButton() {
    const b = this.$('heatPlay');
    if (b) b.innerHTML = this.running ? '<svg class="ic"><use href="#i-pause"/></svg>Pausar' : '<svg class="ic"><use href="#i-play"/></svg>Iniciar';
  }

  // ── Simulation steps ────────────────────────────────────
  // Animated speeds (1-3): rows per frame for a normal-speed thread.
  rowRate() { return [0, 0.07, 0.16, 0.4][this.speed] || 0; }
  // Fast speeds (4-10): whole iterations per frame.
  itersPerFrame() { return this.speed <= 3 ? 0 : 2 ** (this.speed - 4); }

  tickAnimated() {
    const H = window.HeatSim;
    const s = this.sweep;
    let allDone = true;
    this.bands.forEach((b, t) => {
      const size = b.end - b.begin;
      if (s.done[t] >= size) return;
      s.progress[t] += this.rowRate() / (this.slowFactors[t] || 1);
      const target = Math.min(size, Math.floor(s.progress[t]));
      while (s.done[t] < target) {
        const row = b.begin + s.done[t];
        s.local[t] = Math.max(s.local[t], H.stepRows(this.plate, this.r, row, row + 1));
        s.done[t]++;
      }
      if (s.done[t] < size) allDone = false;
    });
    if (allDone) this.completeIteration();
  }

  // Computes whatever rows are still pending and closes the iteration.
  finishSweep() {
    const s = this.sweep;
    if (!s || s.done.every((d) => d === 0)) return;
    this.bands.forEach((b, t) => {
      const from = b.begin + s.done[t];
      if (from < b.end) s.local[t] = Math.max(s.local[t], window.HeatSim.stepRows(this.plate, this.r, from, b.end));
      s.done[t] = b.end - b.begin;
    });
    this.completeIteration();
  }

  completeIteration() {
    const global = window.HeatSim.finishIteration(this.plate, this.sweep.local);
    this.newSweep();
    this.afterIteration(global);
  }

  stepOnce() {
    if (this.status === 'converged' || this.status === 'diverged') return;
    if (this.sweep.done.some((d) => d > 0)) this.finishSweep();
    else this.afterIteration(window.HeatSim.iterate(this.plate, this.r, this.bands).maxDelta);
    this.dirty = true;
  }

  tickFast(n) {
    for (let k = 0; k < n && this.status === 'running'; k++) {
      this.afterIteration(window.HeatSim.iterate(this.plate, this.r, this.bands).maxDelta);
    }
  }

  afterIteration(global) {
    this.history.push(global);
    if (this.history.length > 4000) this.history.splice(0, this.history.length - 4000);
    this.cost.busy.forEach((b, t) => { this.totals.busy[t] += b; this.totals.wait[t] += this.cost.wait[t]; });
    this.recent.push(this.cost);
    if (this.recent.length > 6) this.recent.shift();

    const acc = window.account;
    if (acc) {
      if (this.threads === 8) acc.record('heat', 'threads8');
      if (this.bands.length > 1 && (this.slow || this.split === 'uneven')) acc.record('heat', 'imbalance');
    }
    if (!Number.isFinite(global) || global > 1e6) {
      this.running = false; this.status = 'diverged'; this.renderPlayButton();
      if (acc) acc.record('heat', 'unstable');
    } else if (global <= this.eps) {
      this.running = false; this.status = 'converged'; this.renderPlayButton();
      if (acc) acc.record('heat', 'converge');
      if (window.soundController) window.soundController.playSuccess();
    }
    this.dirty = true;
    this.panelsDirty = true;
  }

  frame() {
    if (!this.canvas.offsetParent) return;           // station hidden: do nothing
    if (this.running) {
      if (this.speed <= 3) this.tickAnimated(); else this.tickFast(this.itersPerFrame());
      this.dirty = true;
    }
    if (this.dirty) { this.draw(); this.dirty = false; }
    this.renderPanels(this.panelsDirty);
    this.panelsDirty = false;
  }

  // ── Drawing ─────────────────────────────────────────────
  draw() {
    const H = window.HeatSim;
    const { rows, cols, cur, next } = this.plate;
    const img = this.offCtx.createImageData(cols, rows);
    const animated = this.speed <= 3;
    // Rows already computed in this iteration show the new buffer: that is double buffering at work.
    const newRow = new Uint8Array(rows);
    if (animated) this.bands.forEach((b, t) => { for (let i = b.begin; i < b.begin + this.sweep.done[t]; i++) newRow[i] = 1; });
    for (let i = 0; i < rows; i++) {
      const src = newRow[i] ? next : cur;
      for (let j = 0; j < cols; j++) {
        const [r, g, b] = H.color(src[i * cols + j]);
        const p = (i * cols + j) * 4;
        img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = 255;
      }
    }
    this.offCtx.putImageData(img, 0, 0);

    const wrap = this.canvas.parentElement;
    const w = Math.max(240, wrap.clientWidth || 640);
    const h = Math.round(w * rows / cols);
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      this.canvas.style.height = `${h}px`;
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.off, 0, 0, w, h);

    const cell = h / rows;
    const ink = '#3d2414';
    // Band borders, thread tabs and the row each thread is computing
    this.bands.forEach((b, t) => {
      const y0 = b.begin * cell, y1 = b.end * cell;
      const color = this.colors[t % this.colors.length];
      if (t > 0) {
        ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
        ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke(); ctx.setLineDash([]);
      }
      const size = b.end - b.begin;
      if (animated && this.running && this.sweep.done[t] < size) {
        const ry = (b.begin + this.sweep.done[t]) * cell;
        ctx.strokeStyle = color; ctx.lineWidth = 3;
        ctx.strokeRect(1.5, ry + 1.5, w - 3, Math.max(cell - 3, 2));
      }
      const label = `H${t}`;
      ctx.font = '800 12px Nunito, sans-serif';
      const tw = ctx.measureText(label).width + 14, th = 18;
      const ty = Math.min(Math.max(y0 + (y1 - y0) / 2 - th / 2, 2), h - th - 2);
      ctx.fillStyle = color; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(6, ty, tw, th, 9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(label, 13, ty + th / 2 + 1);
      if (animated && this.running && this.sweep.done[t] >= size) {
        const msg = 'en la barrera';
        const mw = ctx.measureText(msg).width + 14;
        ctx.fillStyle = '#fbf3e2';
        ctx.beginPath(); ctx.roundRect(w - mw - 6, ty, mw, th, 9); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.fillText(msg, w - mw + 1, ty + th / 2 + 1);
      }
    });
  }

  // ── Panels ──────────────────────────────────────────────
  buildLanes() {
    const esc = (s) => String(s);
    this.$('heatLanes').innerHTML = this.bands.map((b, t) => `
      <div class="lane" style="--c:${this.colors[t % this.colors.length]}">
        <span class="lane-name">Hilo ${t}</span>
        <span class="lane-rows">filas ${b.begin}–${b.end - 1} (${b.end - b.begin})${this.slowFactors[t] ? ' · lento' : ''}</span>
        <div class="lane-bar"><i class="lane-busy"></i><i class="lane-wait"></i></div>
        <span class="lane-state" id="heatLaneState${esc(t)}">listo</span>
      </div>`).join('');
  }

  renderPanels(full) {
    const animated = this.speed <= 3;
    const span = this.cost.span;
    const lanes = this.$('heatLanes').querySelectorAll('.lane');
    this.bands.forEach((b, t) => {
      const lane = lanes[t];
      if (!lane) return;
      const size = b.end - b.begin;
      const busyShare = this.cost.busy[t] / span;
      const busy = animated && this.running ? busyShare * (this.sweep.done[t] / size) : busyShare;
      const waiting = animated && this.running && this.sweep.done[t] >= size;
      lane.querySelector('.lane-busy').style.width = `${(busy * 100).toFixed(1)}%`;
      lane.querySelector('.lane-wait').style.width = `${(animated && this.running ? (waiting ? (1 - busyShare) : 0) : (1 - busyShare)) * 100}%`;
      const state = this.status === 'converged' ? 'terminó' : this.status === 'diverged' ? 'se detuvo'
        : !this.running ? 'en pausa' : !animated ? 'calculando' : waiting ? 'en la barrera' : 'calculando';
      const el = lane.querySelector('.lane-state');
      if (el.textContent !== state) { el.textContent = state; el.dataset.state = state; }
    });

    if (!full) return;
    const it = this.plate.iteration;
    const last = this.history[this.history.length - 1];
    this.$('heatIter').textContent = it;
    this.$('heatDelta').textContent = last === undefined ? '—' : !Number.isFinite(last) || last > 1e6 ? 'explotó' : last >= 0.01 ? last.toFixed(3) : last.toExponential(1);
    this.$('heatSpeedup').textContent = `${this.cost.speedup.toFixed(2)}x`;
    this.$('heatEff').textContent = `${Math.round(this.cost.efficiency * 100)}%`;
    const waitShare = this.cost.wait.reduce((a, b) => a + b, 0) / (span * this.bands.length);
    this.$('heatWait').textContent = `${Math.round(waitShare * 100)}%`;
    this.renderTimeline();
    this.renderChart();
    this.renderNote(waitShare);
    const alert = this.$('heatAlert');
    alert.style.display = this.status === 'diverged' ? 'flex' : 'none';
  }

  renderTimeline() {
    const svg = this.$('heatTimeline');
    const iters = this.recent.length ? this.recent : [this.cost];
    const P = this.bands.length;
    const W = 560, laneH = 16, gap = 5, top = 6, left = 40;
    const H = top + P * (laneH + gap) + 18;
    const total = iters.reduce((s, c) => s + c.span, 0);
    const scale = (W - left - 8) / total;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tiempo ocupado y en espera por hilo"><defs><pattern id="heatHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#efe1c6"/><line x1="0" y1="0" x2="0" y2="6" stroke="#c9a06a" stroke-width="3"/></pattern></defs>`;
    for (let t = 0; t < P; t++) {
      const y = top + t * (laneH + gap);
      s += `<text x="${left - 8}" y="${y + laneH - 4}" class="hl-label">H${t}</text>`;
      let x = left;
      iters.forEach((c) => {
        const bw = c.busy[t] * scale, ww = c.wait[t] * scale;
        s += `<rect x="${x}" y="${y}" width="${Math.max(bw, 0.5)}" height="${laneH}" rx="3" fill="${this.colors[t % this.colors.length]}" stroke="#3d2414" stroke-width="2"/>`;
        if (ww > 0.5) s += `<rect x="${x + bw}" y="${y}" width="${ww}" height="${laneH}" fill="url(#heatHatch)" stroke="#3d2414" stroke-width="2"/>`;
        x += c.span * scale;
      });
    }
    let x = left;
    iters.forEach((c, k) => {
      x += c.span * scale;
      s += `<line x1="${x}" x2="${x}" y1="${top - 3}" y2="${top + P * (laneH + gap) - gap + 3}" stroke="#3d2414" stroke-width="3" stroke-dasharray="4 3"/>`;
      if (k === iters.length - 1) s += `<text x="${x}" y="${H - 3}" class="hl-axis" text-anchor="end">barrera</text>`;
    });
    s += '</svg>';
    svg.innerHTML = s;
  }

  renderChart() {
    const el = this.$('heatChart');
    const W = 560, H = 170, l = 46, r = 12, t = 12, b = 26;
    const hist = this.history.filter((d) => Number.isFinite(d) && d > 0);
    const logEps = Math.log10(this.eps);
    const maxLog = Math.max(2, ...hist.slice(0, 50).map((d) => Math.log10(d)));
    const minLog = logEps - 1;
    const n = Math.max(this.history.length, 50);
    const X = (i) => l + (i / n) * (W - l - r);
    const Y = (d) => t + (1 - (Math.min(Math.max(Math.log10(d), minLog), maxLog) - minLog) / (maxLog - minLog)) * (H - t - b);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cambio máximo por iteración">`;
    for (let e = Math.ceil(minLog); e <= Math.floor(maxLog); e++) {
      s += `<line x1="${l}" x2="${W - r}" y1="${Y(10 ** e)}" y2="${Y(10 ** e)}" class="hc-grid"/><text x="${l - 6}" y="${Y(10 ** e) + 4}" class="hc-axis" text-anchor="end">${e >= 0 ? 10 ** e : `1e${e}`}</text>`;
    }
    s += `<line x1="${l}" x2="${W - r}" y1="${Y(this.eps)}" y2="${Y(this.eps)}" class="hc-eps"/><text x="${W - r}" y="${Y(this.eps) - 6}" class="hc-eps-label" text-anchor="end">ε = ${this.eps}</text>`;
    if (hist.length > 1) {
      const step = Math.max(1, Math.floor(this.history.length / 220));
      const pts = [];
      for (let i = 0; i < this.history.length; i += step) {
        const d = this.history[i];
        if (Number.isFinite(d) && d > 0) pts.push(`${X(i).toFixed(1)},${Y(d).toFixed(1)}`);
      }
      const lastI = this.history.length - 1, lastD = this.history[lastI];
      if (Number.isFinite(lastD) && lastD > 0) pts.push(`${X(lastI).toFixed(1)},${Y(lastD).toFixed(1)}`);
      s += `<polyline points="${pts.join(' ')}" class="hc-line ${this.status === 'diverged' ? 'bad' : ''}"/>`;
    }
    s += `<line x1="${l}" x2="${W - r}" y1="${H - b}" y2="${H - b}" class="hc-base"/><text x="${W - r}" y="${H - 6}" class="hc-axis" text-anchor="end">iteración ${this.plate.iteration}</text>`;
    el.innerHTML = s + '</svg>';
  }

  renderNote(waitShare) {
    const it = this.plate.iteration;
    let title = 'Así trabajan los hilos', text;
    if (this.status === 'converged') {
      title = 'Equilibrio';
      text = `La placa dejó de cambiar en <b>${it} iteraciones</b>: ningún punto cambió más de ε = ${this.eps}. Prueba otro número de hilos: el resultado es exactamente el mismo.`;
    } else if (this.status === 'diverged') {
      title = 'Se volvió inestable';
      text = `Con r = ${this.r.toFixed(2)} (mayor que 1/4) cada paso amplifica el error en vez de suavizarlo. Baja r a 0.25 o menos y reinicia.`;
    } else if (this.bands.length > 1 && waitShare > 0.2) {
      title = 'Desbalance de carga';
      text = `Los hilos pasan en promedio el <b>${Math.round(waitShare * 100)}%</b> de cada iteración esperando en la barrera, porque nadie puede seguir hasta que termine el más lento. Por eso la aceleración baja a ${this.cost.speedup.toFixed(2)}x.`;
    } else if (this.running && this.speed <= 3) {
      text = 'Cada hilo calcula las filas de su franja al mismo tiempo que los demás. Las filas ya calculadas muestran la placa nueva; las demás todavía la vieja. Cuando todos llegan a la barrera, se intercambian las placas.';
    } else if (this.running) {
      text = `Iteración ${it}. Al final de cada una, los hilos se esperan en la barrera y comparan su cambio máximo para decidir si siguen.`;
    } else {
      text = `${this.bands.length === 1 ? 'Un solo hilo calcula toda la placa.' : `${this.bands.length} hilos se reparten las ${this.rows - 2} filas interiores.`} Dale Iniciar, o dibuja calor sobre la placa.`;
    }
    this.$('heatNoteTitle').textContent = title;
    this.$('heatNote').innerHTML = text;
  }

  renderSpeed() {
    const labels = ['', 'fila por fila', 'lento', 'normal'];
    this.$('heatSpeedVal').textContent = this.speed <= 3 ? labels[this.speed] : `${this.itersPerFrame()} it./cuadro`;
    if (this.speed > 3 && this.sweep && this.sweep.done.some((d) => d > 0)) this.finishSweep();
    this.dirty = true;
  }

  renderR() {
    const stable = window.HeatSim.isStable(this.r);
    this.$('heatRVal').textContent = this.r.toFixed(2);
    const hint = this.$('heatRHint');
    hint.textContent = stable ? 'Estable: r ≤ 1/4.' : 'Inestable: r > 1/4, el error crece en cada paso.';
    hint.classList.toggle('bad', !stable);
  }
}

window.heatLab = new HeatLab();
