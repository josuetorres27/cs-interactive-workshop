// CS Interactive Workshop - Concurrency & Parallel Systems Module
class ConcurrencyStation {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.activeSubtab = 'roundabout'; // 'roundabout' | 'patterns'
    this.animationId = null;

    // --- Roundabout State ---
    this.semaphoresEnabled = true;
    this.vehicles = [];
    this.nextVehicleId = 1;
    this.quadrantCapacity = 2;
    this.quadrants = [
      { id: 0, name: 'NW', count: 0, max: 2, angleStart: Math.PI, angleEnd: 1.5 * Math.PI },
      { id: 1, name: 'NE', count: 0, max: 2, angleStart: 1.5 * Math.PI, angleEnd: 2 * Math.PI },
      { id: 2, name: 'SE', count: 0, max: 2, angleStart: 0, angleEnd: 0.5 * Math.PI },
      { id: 3, name: 'SW', count: 0, max: 2, angleStart: 0.5 * Math.PI, angleEnd: Math.PI }
    ];
    this.passedCount = 0;
    this.deadlockDetected = false;
    this.autoSpawn = true;
    this.lastSpawnTime = 0;
    this.spawnInterval = 1200; // ms
  }

  init() {
    this.canvas = document.getElementById('concurrencyCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupEventListeners();
    this.startLoop();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = Math.round(Math.min(440, Math.max(320, (rect.width || 800) * 0.62)));
  }

  setupEventListeners() {
    // Subtabs
    document.querySelectorAll('.conc-subtab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.conc-subtab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.activeSubtab = e.currentTarget.dataset.subtab;
        if (this.activeSubtab === 'patterns' && window.account) window.account.record('concurrency', 'patterns');
        this.updateControlPanels();
      });
    });

    // Semaphore Toggle
    const semToggle = document.getElementById('toggleSemaphores');
    if (semToggle) {
      semToggle.addEventListener('change', (e) => {
        this.semaphoresEnabled = e.target.checked;
        const statusEl = document.getElementById('semStatusText');
        if (statusEl) {
          statusEl.textContent = this.semaphoresEnabled ? 'Sin riesgo de deadlock' : 'Sin control: puede trabarse';
          statusEl.style.color = this.semaphoresEnabled ? 'var(--mint-dark)' : 'var(--tomato-dark)';
        }
      });
    }

    // Spawn Vehicle Button
    const btnSpawn = document.getElementById('btnSpawnVehicle');
    if (btnSpawn) {
      btnSpawn.addEventListener('click', () => {
        this.spawnVehicle();
        window.soundController.playClick();
      });
    }

    // Auto spawn toggle
    const autoSpawnToggle = document.getElementById('toggleAutoSpawn');
    if (autoSpawnToggle) {
      autoSpawnToggle.addEventListener('change', (e) => {
        this.autoSpawn = e.target.checked;
      });
    }

    // Traffic rate
    const trafficRate = document.getElementById('trafficRate');
    if (trafficRate) {
      trafficRate.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.spawnInterval = Math.max(300, 3000 - val * 25);
        document.getElementById('trafficRateVal').textContent = `${val}%`;
      });
    }

    // Clear Roundabout
    const btnClearRoundabout = document.getElementById('btnClearRoundabout');
    if (btnClearRoundabout) {
      btnClearRoundabout.addEventListener('click', () => {
        this.vehicles = [];
        this.quadrants.forEach(q => q.count = 0);
        this.deadlockDetected = false;
        const alertBanner = document.getElementById('deadlockAlertBanner');
        if (alertBanner) alertBanner.style.display = 'none';
      });
    }

    // Force Deadlock Button (Educational Coffman Demo)
    const btnForceDeadlock = document.getElementById('btnForceDeadlock');
    if (btnForceDeadlock) {
      btnForceDeadlock.addEventListener('click', () => {
        this.forceCoffmanDeadlock();
      });
    }

    // Resolve Deadlock Button
    const btnResolveDeadlock = document.getElementById('btnResolveDeadlock');
    if (btnResolveDeadlock) {
      btnResolveDeadlock.addEventListener('click', () => {
        this.resolveCoffmanDeadlock();
      });
    }
  }

  updateControlPanels() {
    const roundPanel = document.getElementById('roundaboutControls');
    const patPanel = document.getElementById('patternsControls');
    if (roundPanel) roundPanel.style.display = this.activeSubtab === 'roundabout' ? 'block' : 'none';
    if (patPanel) patPanel.style.display = this.activeSubtab === 'patterns' ? 'block' : 'none';

    // Only show the scoreboard cells that belong to the active simulation
    document.querySelectorAll('#concurrencyViewport [data-sim]').forEach(el => {
      el.style.display = el.dataset.sim === this.activeSubtab ? '' : 'none';
    });
    const alertBanner = document.getElementById('deadlockAlertBanner');
    if (alertBanner && this.activeSubtab !== 'roundabout') alertBanner.style.display = 'none';
  }

  forceCoffmanDeadlock() {
    this.vehicles = [];
    this.quadrants.forEach(q => q.count = 0);
    this.semaphoresEnabled = false;
    const semToggle = document.getElementById('toggleSemaphores');
    if (semToggle) semToggle.checked = false;
    const statusEl = document.getElementById('semStatusText');
    if (statusEl) {
      statusEl.textContent = 'Sin control: puede trabarse';
      statusEl.style.color = 'var(--tomato-dark)';
    }

    // Fill every quadrant to capacity; each car wants the next (full) quadrant.
    // That is a textbook circular wait.
    const entryOf = { 0: 'W', 1: 'N', 2: 'E', 3: 'S' };
    const exitOf = { 0: 'N', 1: 'E', 2: 'S', 3: 'W' };
    for (let q = 0; q < 4; q++) {
      for (let k = 0; k < this.quadrantCapacity; k++) {
        const route = [q, (q + 1) % 4, (q + 2) % 4];
        this.quadrants[q].count++;
        this.vehicles.push({
          id: this.nextVehicleId++,
          entry: entryOf[q],
          exit: exitOf[route[2]],
          route,
          routeIndex: 0,
          currentQuad: q,
          progress: k === 0 ? 1.0 : 0.55,
          speed: 0.015,
          state: 'IN_QUADRANT',
          blockedTime: 2000,
          color: '#f6c33b'
        });
      }
    }

    this.deadlockDetected = true;
    if (window.account) window.account.record('concurrency', 'deadlock');
    window.soundController.playDeadlockAlert();
    const alertBanner = document.getElementById('deadlockAlertBanner');
    if (alertBanner) alertBanner.style.display = 'flex';
  }

  resolveCoffmanDeadlock() {
    if (window.account) window.account.record('concurrency', 'resolve');
    this.semaphoresEnabled = true;
    const semToggle = document.getElementById('toggleSemaphores');
    if (semToggle) semToggle.checked = true;
    const statusEl = document.getElementById('semStatusText');
    if (statusEl) {
      statusEl.textContent = 'Sin riesgo de deadlock';
      statusEl.style.color = 'var(--mint-dark)';
    }
    this.deadlockDetected = false;
    const alertBanner = document.getElementById('deadlockAlertBanner');
    if (alertBanner) alertBanner.style.display = 'none';

    // Break the cycle: let one car leave the ring so the others can advance
    const v = this.vehicles.find(c => c.state === 'IN_QUADRANT');
    if (v) {
      v.state = 'EXITING';
      this.quadrants[v.currentQuad].count--;
      v.currentQuad = -1;
      v.progress = 0;
    }
    window.soundController.playTone(660, 'sine', 0.1, 0.4);
  }

  // --- Roundabout Simulator Engine ---
  spawnVehicle() {
    const approaches = ['N', 'E', 'S', 'W'];
    const entry = approaches[Math.floor(Math.random() * approaches.length)];
    let exits = approaches.filter(a => a !== entry);
    const exit = exits[Math.floor(Math.random() * exits.length)];

    // Path quadrants sequence
    // N entry -> Quadrant 1 (NE) -> Quadrant 2 (SE) -> Quadrant 3 (SW) -> Quadrant 0 (NW)
    const entryQuadMap = { 'N': 1, 'E': 2, 'S': 3, 'W': 0 };
    const exitQuadMap = { 'E': 1, 'S': 2, 'W': 3, 'N': 0 };

    const startQuad = entryQuadMap[entry];
    const targetQuad = exitQuadMap[exit];

    const route = [];
    let cur = startQuad;
    while (true) {
      route.push(cur);
      if (cur === targetQuad) break;
      cur = (cur + 1) % 4;
    }

    const vehicle = {
      id: this.nextVehicleId++,
      entry,
      exit,
      route,
      routeIndex: 0,
      state: 'WAITING_ENTRY', // 'WAITING_ENTRY' | 'IN_QUADRANT' | 'EXITING' | 'BLOCKED'
      currentQuad: -1,
      angle: 0,
      progress: 0,
      speed: 0.015 + Math.random() * 0.008,
      blockedTime: 0,
      color: `hsl(${Math.random() * 360}, 85%, 60%)`
    };

    this.vehicles.push(vehicle);
    window.soundController.playTone(320 + vehicle.id * 15 % 400, 'sine', 0.03, 0.4);
  }

  updateRoundabout(dt) {
    this.frameDt = dt;
    // Auto-spawn logic
    if (this.autoSpawn && Date.now() - this.lastSpawnTime > this.spawnInterval) {
      if (this.vehicles.length < 16) {
        this.spawnVehicle();
      }
      this.lastSpawnTime = Date.now();
    }

    // Quadrant counters recalculation
    const quadCounts = [0, 0, 0, 0];
    this.vehicles.forEach(v => {
      if (v.currentQuad >= 0 && v.currentQuad < 4) {
        quadCounts[v.currentQuad]++;
      }
    });
    for (let i = 0; i < 4; i++) {
      this.quadrants[i].count = quadCounts[i];
    }

    let allBlocked = true;
    let vehiclesInRing = 0;

    // Update each vehicle
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];

      if (v.state === 'WAITING_ENTRY') {
        const nextQuad = v.route[0];
        // A quadrant can physically hold `quadrantCapacity` cars (mutual exclusion).
        // The entry semaphore additionally keeps one free slot in the ring, which
        // makes a full circular wait impossible.
        const hasRoom = this.quadrants[nextQuad].count < this.quadrantCapacity;
        const entryPermit = !this.semaphoresEnabled || this.getTotalInRing() < 4 * this.quadrantCapacity - 1;
        const canEnter = hasRoom && entryPermit;

        if (canEnter) {
          v.state = 'IN_QUADRANT';
          v.currentQuad = nextQuad;
          this.quadrants[nextQuad].count++;
          v.progress = 0;
          v.blockedTime = 0;
        } else {
          v.blockedTime += dt;
        }
      } else if (v.state === 'IN_QUADRANT') {
        vehiclesInRing++;
        const targetQuad = v.route[v.routeIndex];
        v.progress += v.speed * (dt / 16);

        if (v.progress >= 1.0) {
          // Ready to move to next quadrant in route or exit
          if (v.routeIndex < v.route.length - 1) {
            const nextQuad = v.route[v.routeIndex + 1];
            const canAdvance = this.quadrants[nextQuad].count < this.quadrantCapacity;

            if (canAdvance) {
              this.quadrants[v.currentQuad].count--;
              v.routeIndex++;
              v.currentQuad = nextQuad;
              this.quadrants[nextQuad].count++;
              v.progress = 0;
              v.blockedTime = 0;
              allBlocked = false;
            } else {
              v.progress = 1.0;
              v.blockedTime += dt;
            }
          } else {
            // Exit roundabout
            v.state = 'EXITING';
            this.quadrants[v.currentQuad].count--;
            v.currentQuad = -1;
            v.progress = 0;
            allBlocked = false;
          }
        } else {
          allBlocked = false;
        }
      } else if (v.state === 'EXITING') {
        v.progress += v.speed * (dt / 16);
        if (v.progress >= 1.0) {
          this.vehicles.splice(i, 1);
          this.passedCount++;
          document.getElementById('concPassed').textContent = this.passedCount;
          window.soundController.playTone(880, 'triangle', 0.04, 0.4);
        }
      }
    }

    // Deadlock detection (Coffman cycle: all vehicles in ring blocked for > 2 seconds)
    const inRingVehicles = this.vehicles.filter(v => v.state === 'IN_QUADRANT');
    const severelyBlocked = inRingVehicles.filter(v => v.blockedTime > 1800);
    
    if (inRingVehicles.length >= 4 && severelyBlocked.length === inRingVehicles.length) {
      if (!this.deadlockDetected) {
        this.deadlockDetected = true;
        window.soundController.playDeadlockAlert();
        const alertBanner = document.getElementById('deadlockAlertBanner');
        if (alertBanner) alertBanner.style.display = 'flex';
      }
    } else {
      this.deadlockDetected = false;
      const alertBanner = document.getElementById('deadlockAlertBanner');
      if (alertBanner) alertBanner.style.display = 'none';
    }

    // Telemetry updates
    document.getElementById('concActive').textContent = this.vehicles.length;
    document.getElementById('concInRing').textContent = vehiclesInRing;
    document.getElementById('concDeadlockState').textContent = this.deadlockDetected ? 'Trabada' : (this.semaphoresEnabled ? 'Fluye' : 'En riesgo');
    document.getElementById('concDeadlockState').style.color = this.deadlockDetected ? 'var(--tomato-dark)' : (this.semaphoresEnabled ? 'var(--mint-dark)' : 'var(--amber)');
  }

  getTotalInRing() {
    return this.quadrants.reduce((sum, q) => sum + q.count, 0);
  }

  drawRoundabout() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(cx, cy) * 0.72;
    const innerR = outerR * 0.45;
    const trackR = (outerR + innerR) / 2;

    const fontFamily = getComputedStyle(document.body).fontFamily;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Approaches (North, East, South, West roads) go underneath the ring
    const armWidth = 48;
    this.drawRoadArm(cx - armWidth / 2, -4, armWidth, cy - outerR + 10, 'N');
    this.drawRoadArm(cx + outerR - 6, cy - armWidth / 2, cx - outerR + 10, armWidth, 'E');
    this.drawRoadArm(cx - armWidth / 2, cy + outerR - 6, armWidth, h - (cy + outerR) + 10, 'S');
    this.drawRoadArm(-4, cy - armWidth / 2, cx - outerR + 10, armWidth, 'O');

    // Road ring
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#5b4a3d';
    this.ctx.fill();
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = '#3d2414';
    this.ctx.stroke();

    // Lane marking
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, trackR, 0, 2 * Math.PI);
    this.ctx.strokeStyle = 'rgba(251, 244, 228, 0.35)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 10]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Central island (grass)
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    this.ctx.fillStyle = this.deadlockDetected ? '#f4a48a' : '#8fd3a5';
    this.ctx.fill();
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = '#3d2414';
    this.ctx.stroke();

    this.ctx.fillStyle = '#3d2414';
    this.ctx.font = `800 ${Math.max(11, Math.round(innerR / 4.5))}px ${fontFamily}`;
    this.ctx.fillText(this.deadlockDetected ? 'TRABADA' : (this.semaphoresEnabled ? 'CON SEMÁFOROS' : 'SIN CONTROL'), cx, cy);

    // Quadrant dividers & capacity labels
    const quadNames = ['NO', 'NE', 'SE', 'SO'];
    for (let i = 0; i < 4; i++) {
      const angle = (i * 0.5) * Math.PI;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
      this.ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
      this.ctx.strokeStyle = 'rgba(251, 244, 228, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      const textAngle = Math.PI + angle + 0.25 * Math.PI; // quadrant i spans [PI + i*PI/2, ...]
      const labelR = outerR + 30;
      const lx = cx + labelR * Math.cos(textAngle);
      const ly = cy + labelR * Math.sin(textAngle);
      const full = this.quadrants[i].count >= this.quadrants[i].max;

      this.ctx.font = `800 12px ${fontFamily}`;
      this.ctx.fillStyle = full ? '#b13817' : '#2f8653';
      this.ctx.fillText(`${quadNames[i]} ${this.quadrants[i].count}/${this.quadrants[i].max}`, lx, ly);
    }

    // Draw vehicles
    // Lanes: cars drive in on one side of each road and leave on the other
    const entryLane = (dir, dist) => {
      if (dir === 'N') return [cx - 12, cy - outerR - dist];
      if (dir === 'E') return [cx + outerR + dist, cy - 12];
      if (dir === 'S') return [cx + 12, cy + outerR + dist];
      return [cx - outerR - dist, cy + 12];
    };
    const exitLane = (dir, dist) => {
      if (dir === 'N') return [cx + 12, cy - outerR - dist];
      if (dir === 'E') return [cx + outerR + dist, cy + 12];
      if (dir === 'S') return [cx - 12, cy + outerR + dist];
      return [cx - outerR - dist, cy - 12];
    };
    // Quadrant start angles: Q0 PI..1.5PI, Q1 1.5PI..2PI, Q2 0..0.5PI, Q3 0.5PI..PI
    const qAngles = [Math.PI, 1.5 * Math.PI, 0, 0.5 * Math.PI];
    const exitQuad = { N: 0, E: 1, S: 2, W: 3 };
    const queued = { N: 0, E: 0, S: 0, W: 0 };
    // Time-based easing so the glide feels the same at any frame rate
    const frameDt = this.frameDt || 16;
    const follow = 1 - Math.exp(-frameDt / 50);
    const maxGlide = 0.375 * frameDt; // px per frame: a bit faster than ring traffic, so cars catch up smoothly

    this.vehicles.forEach(v => {
      let vx = cx, vy = cy;

      if (v.state === 'WAITING_ENTRY') {
        // Waiting cars line up on their approach road in arrival order
        [vx, vy] = entryLane(v.entry, 26 + queued[v.entry]++ * 22);
      } else if (v.state === 'IN_QUADRANT') {
        const curAngle = qAngles[v.currentQuad] + v.progress * (0.5 * Math.PI);
        vx = cx + trackR * Math.cos(curAngle);
        vy = cy + trackR * Math.sin(curAngle);
      } else if (v.state === 'EXITING') {
        // Leave the ring where the route ends, slide onto the exit lane, then drive away
        const exitAngle = qAngles[exitQuad[v.exit]] + 0.5 * Math.PI;
        const ringX = cx + trackR * Math.cos(exitAngle);
        const ringY = cy + trackR * Math.sin(exitAngle);
        if (v.progress < 0.3) {
          const t = v.progress / 0.3;
          const [lx, ly] = exitLane(v.exit, 0);
          vx = ringX + (lx - ringX) * t;
          vy = ringY + (ly - ringY) * t;
        } else {
          [vx, vy] = exitLane(v.exit, ((v.progress - 0.3) / 0.7) * 90);
        }
      }

      // Glide: the drawn position follows the logical one, so cars never jump
      // between the queue, the ring and the exit road. New cars roll in from
      // further up their road; cars fade in when they appear and out as they leave.
      if (v.drawX === undefined) {
        if (v.state === 'WAITING_ENTRY') [v.drawX, v.drawY] = entryLane(v.entry, 26 + (queued[v.entry] - 1) * 22 + 70);
        else { v.drawX = vx; v.drawY = vy; }
        v.fade = 0;
      }
      let stepX = (vx - v.drawX) * follow;
      let stepY = (vy - v.drawY) * follow;
      const stepLen = Math.hypot(stepX, stepY);
      if (stepLen > maxGlide) { stepX *= maxGlide / stepLen; stepY *= maxGlide / stepLen; }
      v.drawX += stepX;
      v.drawY += stepY;
      v.fade = Math.min(1, v.fade + frameDt / 300);
      let alpha = v.fade;
      if (v.state === 'EXITING' && v.progress > 0.75) alpha *= Math.max(0, 1 - (v.progress - 0.75) / 0.25);
      const px = v.drawX, py = v.drawY;

      // Render vehicle particle
      this.ctx.globalAlpha = alpha;
      this.ctx.beginPath();
      this.ctx.arc(px, py, 9, 0, 2 * Math.PI);
      this.ctx.fillStyle = v.blockedTime > 1500 ? '#e8512a' : v.color;
      this.ctx.fill();
      this.ctx.strokeStyle = '#3d2414';
      this.ctx.lineWidth = 3.5;
      this.ctx.stroke();

      // Vehicle ID
      this.ctx.fillStyle = '#3d2414';
      this.ctx.font = 'bold 9px "JetBrains Mono", monospace';
      this.ctx.fillText(v.id, px, py + 0.5);
      this.ctx.globalAlpha = 1;
    });
  }

  drawRoadArm(x, y, w, h, label) {
    this.ctx.fillStyle = '#5b4a3d';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = '#3d2414';
    this.ctx.strokeRect(x, y, w, h);

    this.ctx.fillStyle = 'rgba(251, 244, 228, 0.55)';
    this.ctx.font = `800 11px ${getComputedStyle(document.body).fontFamily}`;
    const vertical = h > w;
    const lx = x + w / 2;
    const ly = vertical ? (label === 'N' ? y + 16 : y + h - 16) : y + h / 2;
    const lx2 = vertical ? lx : (label === 'O' ? x + 16 : x + w - 16);
    this.ctx.fillText(label, lx2, ly);
  }

  // --- Animation Loop ---
  startLoop() {
    let lastTime = performance.now();
    const frame = (now) => {
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;

      // Nothing to animate while the canvas is off-screen (other screen/step)
      if (!this.canvas.offsetParent) {
        this.animationId = requestAnimationFrame(frame);
        return;
      }

      if (this.activeSubtab === 'roundabout') {
        this.updateRoundabout(dt);
        this.drawRoundabout();
      } else if (this.activeSubtab === 'patterns') {
        this.drawPatternsMonitor();
      }

      this.animationId = requestAnimationFrame(frame);
    };
    this.animationId = requestAnimationFrame(frame);
  }

  drawPatternsMonitor() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    // Side by side on wide screens, stacked on narrow ones
    if (w >= 640) {
      this.drawBoundedBufferWidget(16, 16, w / 2 - 24, h - 32);
      this.drawPhilosophersWidget(w / 2 + 8, 16, w / 2 - 24, h - 32);
    } else {
      this.drawBoundedBufferWidget(12, 12, w - 24, h / 2 - 18);
      this.drawPhilosophersWidget(12, h / 2 + 6, w - 24, h / 2 - 18);
    }
  }

  drawPanel(x, y, w, h, title) {
    const font = getComputedStyle(document.body).fontFamily;
    this.ctx.fillStyle = '#fbf4e4';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, 14);
    this.ctx.fill();
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeStyle = '#3d2414';
    this.ctx.stroke();
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.fillStyle = '#3d2414';
    this.ctx.font = `800 14px ${font}`;
    this.ctx.fillText(title, x + 16, y + 28);
    return font;
  }

  drawBoundedBufferWidget(x, y, w, h) {
    const font = this.drawPanel(x, y, w, h, 'Buffer acotado (capacidad 8)');

    const slots = 8;
    const filled = 3 + Math.floor(Math.sin(Date.now() / 800) * 2.5);
    const slotW = (w - 32) / slots;
    const slotH = Math.min(50, h * 0.25);
    const startY = y + 48;

    for (let i = 0; i < slots; i++) {
      const sx = x + 16 + i * slotW;
      this.ctx.beginPath();
      this.ctx.roundRect(sx, startY, slotW - 5, slotH, 6);
      this.ctx.fillStyle = i < filled ? '#4fb477' : '#f3e7cc';
      this.ctx.fill();
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = '#3d2414';
      this.ctx.stroke();

      this.ctx.fillStyle = i < filled ? '#ffffff' : '#a48663';
      this.ctx.font = `600 10px "JetBrains Mono", monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${i}`, sx + (slotW - 5) / 2, startY + slotH / 2 + 4);
    }

    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#7a5a3e';
    this.ctx.font = `700 13px ${font}`;
    const ty = startY + slotH + 28;
    this.ctx.fillText(`vacíos  (sem_empty) = ${slots - filled}`, x + 16, ty);
    this.ctx.fillText(`llenos  (sem_full)  = ${filled}`, x + 16, ty + 22);
    if (ty + 44 < y + h - 8) this.ctx.fillText('El mutex protege el índice de la cola.', x + 16, ty + 44);
  }

  drawPhilosophersWidget(x, y, w, h) {
    const font = this.drawPanel(x, y, w, h, 'Filósofos comensales');

    const pcx = x + w / 2;
    const pcy = y + 20 + (h - 20) / 2;
    const radius = Math.min(w, h - 40) * 0.34;

    // Table
    this.ctx.beginPath();
    this.ctx.arc(pcx, pcy, radius * 0.58, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#c99560';
    this.ctx.fill();
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeStyle = '#3d2414';
    this.ctx.stroke();

    // Two non-neighbours eat at a time (5 forks -> at most 2 eaters)
    const n = 5;
    const tick = Math.floor(Date.now() / 1500);
    const eating = new Set([tick % n, (tick + 2) % n]);

    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const px = pcx + radius * Math.cos(angle);
      const py = pcy + radius * Math.sin(angle);
      const isEating = eating.has(i);

      this.ctx.beginPath();
      this.ctx.arc(px, py, 16, 0, 2 * Math.PI);
      this.ctx.fillStyle = isEating ? '#4fb477' : '#3d8fd6';
      this.ctx.fill();
      this.ctx.lineWidth = 3.5;
      this.ctx.strokeStyle = '#3d2414';
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `800 11px ${font}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`F${i}`, px, py + 1);
      this.ctx.textBaseline = 'alphabetic';
    }

    this.ctx.textAlign = 'left';
    this.ctx.font = `700 12px ${font}`;
    this.ctx.fillStyle = '#2f8653';
    this.ctx.fillText('verde: come', x + 16, y + h - 14);
    this.ctx.fillStyle = '#2565a3';
    this.ctx.fillText('azul: piensa', x + 110, y + h - 14);
  }
}

window.concurrencyStation = new ConcurrencyStation();
