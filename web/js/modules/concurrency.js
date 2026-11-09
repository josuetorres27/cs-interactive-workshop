// CS Interactive Lab - Concurrency & Parallel Systems Module
class ConcurrencyLab {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.activeSubtab = 'roundabout'; // 'roundabout' | 'heat' | 'patterns'
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

    // --- Heat Diffusion State ---
    this.heatRows = 40;
    this.heatCols = 50;
    this.heatGridA = [];
    this.heatGridB = [];
    this.heatThreads = 4;
    this.heatRunning = false;
    this.heatIterations = 0;
    this.heatAlpha = 0.22; // CFL safe (< 0.25)
  }

  init() {
    this.canvas = document.getElementById('concurrencyCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.initHeatGrid();
    this.setupEventListeners();
    this.startLoop();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = 440;
  }

  setupEventListeners() {
    // Subtabs
    document.querySelectorAll('.conc-subtab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.conc-subtab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.activeSubtab = e.currentTarget.dataset.subtab;
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
          statusEl.textContent = this.semaphoresEnabled ? 'ENABLED (Deadlock-Free)' : 'DISABLED (Coffman Circular Wait)';
          statusEl.style.color = this.semaphoresEnabled ? 'var(--emerald)' : 'var(--rose)';
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

    // Heat controls
    const btnRunHeat = document.getElementById('btnRunHeat');
    if (btnRunHeat) {
      btnRunHeat.addEventListener('click', () => {
        this.heatRunning = !this.heatRunning;
        btnRunHeat.textContent = this.heatRunning ? '⏸ Pause Heat Solver' : '▶ Run Heat Solver';
        btnRunHeat.className = this.heatRunning ? 'btn btn-danger' : 'btn btn-primary';
      });
    }

    const btnStepHeat = document.getElementById('btnStepHeat');
    if (btnStepHeat) {
      btnStepHeat.addEventListener('click', () => {
        this.stepHeatDiffusion();
        window.soundController.playTone(500, 'sine', 0.02);
      });
    }

    const btnResetHeat = document.getElementById('btnResetHeat');
    if (btnResetHeat) {
      btnResetHeat.addEventListener('click', () => {
        this.initHeatGrid();
      });
    }

    const heatThreadsSelect = document.getElementById('heatThreadsSelect');
    if (heatThreadsSelect) {
      heatThreadsSelect.addEventListener('change', (e) => {
        this.heatThreads = parseInt(e.target.value);
      });
    }
  }

  updateControlPanels() {
    const roundPanel = document.getElementById('roundaboutControls');
    const heatPanel = document.getElementById('heatControls');
    const patPanel = document.getElementById('patternsControls');
    const compPanel = document.getElementById('comparisonControls');
    const concViewport = document.getElementById('concurrencyViewport');
    const compViewport = document.getElementById('comparisonViewport');

    if (roundPanel) roundPanel.style.display = this.activeSubtab === 'roundabout' ? 'block' : 'none';
    if (heatPanel) heatPanel.style.display = this.activeSubtab === 'heat' ? 'block' : 'none';
    if (patPanel) patPanel.style.display = this.activeSubtab === 'patterns' ? 'block' : 'none';
    if (compPanel) compPanel.style.display = this.activeSubtab === 'comparison' ? 'block' : 'none';

    if (concViewport) concViewport.style.display = this.activeSubtab === 'comparison' ? 'none' : 'flex';
    if (compViewport) compViewport.style.display = this.activeSubtab === 'comparison' ? 'block' : 'none';
  }

  forceCoffmanDeadlock() {
    this.vehicles = [];
    this.quadrants.forEach(q => q.count = 0);
    this.semaphoresEnabled = false;
    const semToggle = document.getElementById('toggleSemaphores');
    if (semToggle) semToggle.checked = false;
    const statusEl = document.getElementById('semStatusText');
    if (statusEl) {
      statusEl.textContent = 'DISABLED (Coffman Circular Wait)';
      statusEl.style.color = 'var(--rose)';
    }

    const routes = [
      { startQuad: 0, targetQuad: 1, path: [0, 1], entry: 'W', exit: 'E' },
      { startQuad: 1, targetQuad: 2, path: [1, 2], entry: 'N', exit: 'S' },
      { startQuad: 2, targetQuad: 3, path: [2, 3], entry: 'E', exit: 'W' },
      { startQuad: 3, targetQuad: 0, path: [3, 0], entry: 'S', exit: 'N' }
    ];

    routes.forEach(r => {
      this.quadrants[r.startQuad].count++;
      this.vehicles.push({
        id: this.nextVehicleId++,
        entry: r.entry,
        exit: r.exit,
        path: r.path,
        pathIndex: 0,
        currentQuad: r.startQuad,
        progress: 0.95,
        speed: 0.015,
        state: 'IN_QUADRANT',
        blockedTime: 2000,
        color: '#f43f5e'
      });
    });

    this.deadlockDetected = true;
    window.soundController.playDeadlockAlert();
    const alertBanner = document.getElementById('deadlockAlertBanner');
    if (alertBanner) alertBanner.style.display = 'flex';
  }

  resolveCoffmanDeadlock() {
    this.semaphoresEnabled = true;
    const semToggle = document.getElementById('toggleSemaphores');
    if (semToggle) semToggle.checked = true;
    const statusEl = document.getElementById('semStatusText');
    if (statusEl) {
      statusEl.textContent = 'ENABLED (Deadlock-Free)';
      statusEl.style.color = 'var(--emerald)';
    }
    this.deadlockDetected = false;
    const alertBanner = document.getElementById('deadlockAlertBanner');
    if (alertBanner) alertBanner.style.display = 'none';

    if (this.vehicles.length > 0) {
      const v = this.vehicles[0];
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
        const canEnter = !this.semaphoresEnabled || 
          (this.quadrants[nextQuad].count < this.quadrantCapacity && 
           this.getTotalInRing() < 4 * this.quadrantCapacity - 1);

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
            const canAdvance = !this.semaphoresEnabled || this.quadrants[nextQuad].count < this.quadrantCapacity;

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
    
    if (inRingVehicles.length >= 4 && severelyBlocked.length === inRingVehicles.length && !this.semaphoresEnabled) {
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
    document.getElementById('concDeadlockState').textContent = this.deadlockDetected ? 'DEADLOCKED ⚠️' : (this.semaphoresEnabled ? 'LIVENESS OK ✅' : 'RISK (No Locks)');
    document.getElementById('concDeadlockState').style.color = this.deadlockDetected ? 'var(--rose)' : (this.semaphoresEnabled ? 'var(--emerald)' : 'var(--amber)');
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

    this.ctx.clearRect(0, 0, w, h);

    // Background road ring
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#111827';
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#374151';
    this.ctx.stroke();

    // Central island
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#06090e';
    this.ctx.fill();
    this.ctx.strokeStyle = '#1f2937';
    this.ctx.stroke();

    // Center icon / title
    this.ctx.fillStyle = this.deadlockDetected ? '#ef4444' : '#00f0ff';
    this.ctx.font = 'bold 12px ' + getComputedStyle(document.body).fontFamily;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(this.deadlockDetected ? 'DEADLOCK' : (this.semaphoresEnabled ? 'SEMAPHORES ON' : 'NO LOCKS'), cx, cy);

    // Draw 4 Quadrants dividing lines & capacity indicators
    const quadNames = ['NW (Q0)', 'NE (Q1)', 'SE (Q2)', 'SW (Q3)'];
    for (let i = 0; i < 4; i++) {
      const angle = (i * 0.5) * Math.PI;
      this.ctx.beginPath();
      this.ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
      this.ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Quadrant label & sem capacity
      const textAngle = angle + 0.25 * Math.PI;
      const labelR = outerR + 25;
      const lx = cx + labelR * Math.cos(textAngle);
      const ly = cy + labelR * Math.sin(textAngle);

      this.ctx.font = '10px monospace';
      this.ctx.fillStyle = this.quadrants[i].count >= this.quadrants[i].max ? '#f43f5e' : '#10b981';
      this.ctx.fillText(`${this.quadrants[i].name}: ${this.quadrants[i].count}/${this.quadrants[i].max}`, lx, ly);
    }

    // Draw approaches (North, East, South, West roads)
    const armWidth = 44;
    this.drawRoadArm(cx - armWidth / 2, 0, armWidth, cy - outerR, 'N');
    this.drawRoadArm(cx + outerR, cy - armWidth / 2, cx - outerR, armWidth, 'E');
    this.drawRoadArm(cx - armWidth / 2, cy + outerR, armWidth, h - (cy + outerR), 'S');
    this.drawRoadArm(0, cy - armWidth / 2, cx - outerR, armWidth, 'W');

    // Draw vehicles
    this.vehicles.forEach(v => {
      let vx = cx, vy = cy;

      if (v.state === 'WAITING_ENTRY') {
        const dist = 30 + v.id * 18 % 60;
        if (v.entry === 'N') { vx = cx - 12; vy = cy - outerR - dist; }
        else if (v.entry === 'E') { vx = cx + outerR + dist; vy = cy - 12; }
        else if (v.entry === 'S') { vx = cx + 12; vy = cy + outerR + dist; }
        else if (v.entry === 'W') { vx = cx - outerR - dist; vy = cy + 12; }
      } else if (v.state === 'IN_QUADRANT') {
        // Map quadrant progress to angle
        // Q0: PI to 1.5*PI, Q1: 1.5*PI to 2*PI, Q2: 0 to 0.5*PI, Q3: 0.5*PI to PI
        const qAngles = [Math.PI, 1.5 * Math.PI, 0, 0.5 * Math.PI];
        const baseAngle = qAngles[v.currentQuad];
        const curAngle = baseAngle + v.progress * (0.5 * Math.PI);
        vx = cx + trackR * Math.cos(curAngle);
        vy = cy + trackR * Math.sin(curAngle);
      } else if (v.state === 'EXITING') {
        const dist = v.progress * 80;
        if (v.exit === 'N') { vx = cx + 12; vy = cy - outerR - dist; }
        else if (v.exit === 'E') { vx = cx + outerR + dist; vy = cy + 12; }
        else if (v.exit === 'S') { vx = cx - 12; vy = cy + outerR + dist; }
        else if (v.exit === 'W') { vx = cx - outerR - dist; vy = cy - 12; }
      }

      // Render vehicle particle
      this.ctx.beginPath();
      this.ctx.arc(vx, vy, 7, 0, 2 * Math.PI);
      this.ctx.fillStyle = v.blockedTime > 1500 ? '#ef4444' : v.color;
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // Vehicle ID
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 8px monospace';
      this.ctx.fillText(v.id, vx, vy);
    });
  }

  drawRoadArm(x, y, w, h, label) {
    this.ctx.fillStyle = '#111827';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = '#374151';
    this.ctx.strokeRect(x, y, w, h);

    this.ctx.fillStyle = '#4b5563';
    this.ctx.font = '10px monospace';
    this.ctx.fillText(`Gate ${label}`, x + w / 2, y + h / 2);
  }

  // --- Heat Diffusion Engine ---
  initHeatGrid() {
    this.heatIterations = 0;
    this.heatGridA = [];
    this.heatGridB = [];
    for (let r = 0; r < this.heatRows; r++) {
      this.heatGridA[r] = new Float32Array(this.heatCols);
      this.heatGridB[r] = new Float32Array(this.heatCols);
      for (let c = 0; c < this.heatCols; c++) {
        // Boundary condition: top is hot (100C), bottom cold (0C)
        if (r === 0) {
          this.heatGridA[r][c] = 100.0;
          this.heatGridB[r][c] = 100.0;
        } else if (r === this.heatRows - 1) {
          this.heatGridA[r][c] = 0.0;
          this.heatGridB[r][c] = 0.0;
        } else {
          this.heatGridA[r][c] = 15.0;
          this.heatGridB[r][c] = 15.0;
        }
      }
    }
    // Inject central hot source
    for (let r = 16; r <= 24; r++) {
      for (let c = 20; c <= 30; c++) {
        this.heatGridA[r][c] = 95.0;
        this.heatGridB[r][c] = 95.0;
      }
    }
  }

  stepHeatDiffusion() {
    let maxDelta = 0;
    const rLen = this.heatRows;
    const cLen = this.heatCols;
    const alpha = this.heatAlpha;

    for (let r = 1; r < rLen - 1; r++) {
      for (let c = 1; c < cLen - 1; c++) {
        const u = this.heatGridA[r][c];
        const laplacian = this.heatGridA[r - 1][c] + this.heatGridA[r + 1][c] +
                          this.heatGridA[r][c - 1] + this.heatGridA[r][c + 1] - 4 * u;
        const nextU = u + alpha * laplacian;
        this.heatGridB[r][c] = nextU;
        const diff = Math.abs(nextU - u);
        if (diff > maxDelta) maxDelta = diff;
      }
    }

    // Pointer swap
    const temp = this.heatGridA;
    this.heatGridA = this.heatGridB;
    this.heatGridB = temp;

    this.heatIterations++;
    document.getElementById('heatIterCount').textContent = this.heatIterations;
    document.getElementById('heatMaxDelta').textContent = maxDelta.toFixed(4);
  }

  drawHeatDiffusion() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    const cellW = w / this.heatCols;
    const cellH = h / this.heatRows;

    for (let r = 0; r < this.heatRows; r++) {
      for (let c = 0; c < this.heatCols; c++) {
        const temp = this.heatGridA[r][c];
        this.ctx.fillStyle = this.getHeatColor(temp);
        this.ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Draw thread domain decomposition partition lines
    if (this.heatThreads > 1) {
      const rowsPerThread = Math.floor(this.heatRows / this.heatThreads);
      for (let t = 1; t < this.heatThreads; t++) {
        const splitY = t * rowsPerThread * cellH;
        this.ctx.beginPath();
        this.ctx.moveTo(0, splitY);
        this.ctx.lineTo(w, splitY);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([6, 6]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(`Thread Slicing [T${t-1} | T${t}]`, 10, splitY - 4);
      }
    }
  }

  getHeatColor(temp) {
    // Thermal gradient: 0 (Navy) -> 25 (Cyan) -> 50 (Emerald) -> 75 (Amber) -> 100 (Red/White)
    const t = Math.max(0, Math.min(100, temp)) / 100;
    if (t < 0.25) {
      const f = t / 0.25;
      return `rgb(0, ${Math.floor(f * 150)}, ${Math.floor(150 + f * 105)})`;
    } else if (t < 0.5) {
      const f = (t - 0.25) / 0.25;
      return `rgb(0, ${Math.floor(150 + f * 105)}, ${Math.floor(255 - f * 200)})`;
    } else if (t < 0.75) {
      const f = (t - 0.5) / 0.25;
      return `rgb(${Math.floor(f * 255)}, 255, 0)`;
    } else {
      const f = (t - 0.75) / 0.25;
      return `rgb(255, ${Math.floor(255 - f * 200)}, ${Math.floor(f * 200)})`;
    }
  }

  // --- Animation Loop ---
  startLoop() {
    let lastTime = performance.now();
    const frame = (now) => {
      const dt = now - lastTime;
      lastTime = now;

      if (this.activeSubtab === 'roundabout') {
        this.updateRoundabout(dt);
        this.drawRoundabout();
      } else if (this.activeSubtab === 'heat') {
        if (this.heatRunning) {
          this.stepHeatDiffusion();
        }
        this.drawHeatDiffusion();
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

    // Split canvas: Left Bounded Buffer, Right Dining Philosophers
    this.drawBoundedBufferWidget(20, 30, w / 2 - 40, h - 60);
    this.drawPhilosophersWidget(w / 2 + 20, 30, w / 2 - 40, h - 60);
  }

  drawBoundedBufferWidget(x, y, w, h) {
    this.ctx.fillStyle = '#101522';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = '#232d46';
    this.ctx.strokeRect(x, y, w, h);

    this.ctx.fillStyle = '#00f0ff';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.fillText('BOUNDED BUFFER (Ring Buffer Capacity = 8)', x + 15, y + 25);

    const slots = 8;
    const filled = 3 + Math.floor(Math.sin(Date.now() / 800) * 2.5);
    const slotW = (w - 40) / slots;
    const slotH = 50;
    const startY = y + 60;

    for (let i = 0; i < slots; i++) {
      const sx = x + 20 + i * slotW;
      this.ctx.fillStyle = i < filled ? '#10b981' : '#1e293b';
      this.ctx.fillRect(sx, startY, slotW - 4, slotH);
      this.ctx.strokeStyle = '#334155';
      this.ctx.strokeRect(sx, startY, slotW - 4, slotH);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '10px monospace';
      this.ctx.fillText(`[${i}]`, sx + 6, startY + 28);
    }

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '11px sans-serif';
    this.ctx.fillText(`• sem_empty = ${slots - filled} (slots available)`, x + 20, y + 140);
    this.ctx.fillText(`• sem_full  = ${filled} (items in buffer)`, x + 20, y + 165);
    this.ctx.fillText(`• pthread_mutex_t: UNLOCKED`, x + 20, y + 190);
  }

  drawPhilosophersWidget(x, y, w, h) {
    this.ctx.fillStyle = '#101522';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = '#232d46';
    this.ctx.strokeRect(x, y, w, h);

    this.ctx.fillStyle = '#8b5cf6';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.fillText('DINING PHILOSOPHERS (Dijkstra Hierarchy)', x + 15, y + 25);

    const pcx = x + w / 2;
    const pcy = y + h / 2 + 10;
    const radius = Math.min(w, h) * 0.32;

    // Table
    this.ctx.beginPath();
    this.ctx.arc(pcx, pcy, radius * 0.55, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#06090e';
    this.ctx.fill();
    this.ctx.strokeStyle = '#334155';
    this.ctx.stroke();

    const n = 5;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const px = pcx + radius * Math.cos(angle);
      const py = pcy + radius * Math.sin(angle);

      // Status: eating vs thinking
      const isEating = (Math.floor(Date.now() / 1500) + i) % 2 === 0;

      this.ctx.beginPath();
      this.ctx.arc(px, py, 14, 0, 2 * Math.PI);
      this.ctx.fillStyle = isEating ? '#10b981' : '#3b82f6';
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 9px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`P${i}`, px, py + 3);
    }
  }
}

window.concurrencyLab = new ConcurrencyLab();
