// CS Interactive Lab - Networking & Distributed Systems Module
class NetworkingLab {
  constructor() {
    this.currentFigure = 'batman';
    this.allFigures = [];
    this.categories = {
      heroes: ['batman', 'mcqueen', 'spiderman_1', 'spiderman_2'],
      gaming: ['charizard', 'gengar', 'goomba', 'jigglypuff', 'mario', 'pikachu', 'yoshi'],
      tech: ['computer']
    };
    this.currentCategory = 'all';
    this.animEnabled = false;
    this.typingTimer = null;
    this.rawAscii = '';

    // Distributed Client-Server Simulation
    this.workers = [
      { id: 1, state: 'IDLE', currentTask: null },
      { id: 2, state: 'IDLE', currentTask: null },
      { id: 3, state: 'IDLE', currentTask: null },
      { id: 4, state: 'IDLE', currentTask: null }
    ];
    this.packetsSent = 0;
    this.bytesTransferred = 0;
  }

  init() {
    this.allFigures = window.EMBEDDED_ASSETS ? Object.keys(window.EMBEDDED_ASSETS) : [
      'batman', 'charizard', 'computer', 'gengar', 'goomba', 'jigglypuff',
      'mario', 'mcqueen', 'pikachu', 'spiderman_1', 'spiderman_2', 'yoshi'
    ];

    this.setupEventListeners();
    this.renderFigureList();
    this.loadFigure('batman');
    this.updateWorkerPoolUI();
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('netSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderFigureList());
    }

    // Category filter pills
    document.querySelectorAll('.net-cat-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('.net-cat-pill').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentCategory = e.currentTarget.dataset.cat;
        this.renderFigureList();
      });
    });

    // Font size & line height controls
    const fontSizeSlider = document.getElementById('asciiFontSize');
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const display = document.getElementById('asciiDisplay');
        if (display) display.style.fontSize = `${val}px`;
        document.getElementById('asciiFontSizeVal').textContent = `${val}px`;
      });
    }

    // Copy to clipboard
    const btnCopy = document.getElementById('btnCopyAscii');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        if (!this.rawAscii) return;
        navigator.clipboard.writeText(this.rawAscii).then(() => {
          window.app.showToast(`«${this.currentFigure}» copiada al portapapeles`);
          window.soundController.playTone(900, 'sine', 0.05);
        });
      });
    }

    // Download text
    const btnDownload = document.getElementById('btnDownloadAscii');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        if (!this.rawAscii) return;
        const blob = new Blob([this.rawAscii], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFigure}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Send packet simulation
    const btnSendReq = document.getElementById('btnSendSocketReq');
    if (btnSendReq) {
      btnSendReq.addEventListener('click', () => {
        this.simulateSocketRequest();
      });
    }
  }

  renderFigureList() {
    const listEl = document.getElementById('netFigureList');
    if (!listEl) return;
    const query = document.getElementById('netSearchInput')?.value.toLowerCase().trim() || '';

    const filtered = this.allFigures.filter(name => {
      const matchQuery = name.toLowerCase().includes(query);
      const matchCat = this.currentCategory === 'all' || 
        (this.categories[this.currentCategory] && this.categories[this.currentCategory].includes(name));
      return matchQuery && matchCat;
    });

    listEl.innerHTML = '';
    filtered.forEach(name => {
      const item = document.createElement('button');
      item.className = `figure-item ${name === this.currentFigure ? 'selected' : ''}`;
      item.textContent = name.replace('_', ' ');
      item.title = name;
      item.addEventListener('click', () => {
        this.loadFigure(name);
        window.soundController.playTone(600, 'sine', 0.02);
      });
      listEl.appendChild(item);
    });
  }

  async loadFigure(name) {
    this.currentFigure = name;
    this.renderFigureList();
    document.getElementById('currentFigTitle').textContent = name.toUpperCase();
    const uriInput = document.getElementById('socketUriInput');
    if (uriInput) uriInput.value = `/figures/${name}`;

    let text = null;

    // Check embedded dictionary
    if (window.EMBEDDED_ASSETS && window.EMBEDDED_ASSETS[name]) {
      text = window.EMBEDDED_ASSETS[name];
    }

    // If not found, attempt fetch
    if (!text) {
      try {
        const res = await fetch(`assets/ascii_figures/${name}.txt`);
        if (res.ok) text = await res.text();
      } catch (e) {
        // Fallback
      }
    }

    if (!text) {
      text = `[ERROR: Figure '${name}' not found]`;
    }

    this.rawAscii = text;
    const lines = text.split('\n');
    document.getElementById('figLinesCount').textContent = `${lines.length} líneas`;
    document.getElementById('figCharsCount').textContent = `${text.length} caracteres`;

    const display = document.getElementById('asciiDisplay');
    if (display) {
      display.textContent = text;
    }
  }

  simulateSocketRequest() {
    const method = document.getElementById('socketMethodSelect')?.value || 'GET';
    const uri = document.getElementById('socketUriInput')?.value || `/figures/${this.currentFigure}`;

    this.packetsSent++;
    const payloadBytes = this.rawAscii.length + 180;
    this.bytesTransferred += payloadBytes;

    document.getElementById('netPacketsCount').textContent = this.packetsSent;
    document.getElementById('netBytesCount').textContent = `${(this.bytesTransferred / 1024).toFixed(1)} KB`;

    // Pick idle worker
    const idleWorker = this.workers.find(w => w.state === 'IDLE') || this.workers[0];
    idleWorker.state = 'DISPATCHED';
    idleWorker.currentTask = `${method} ${uri}`;
    this.updateWorkerPoolUI();

    window.soundController.playPacketTick();

    // Inspector request
    const inspector = document.getElementById('packetInspector');
    if (inspector) {
      inspector.textContent = 
`>> [CLIENT OUTBOUND PACKET -> PORT 8080]
${method} ${uri} HTTP/1.1
Host: 127.0.0.1:8080
User-Agent: CS-Interactive-Lab/2.0 (VSocket/C++)
Accept: text/plain, */*
Connection: keep-alive

[Status: Dispatched to Thread Worker #${idleWorker.id}]`;
    }

    // Step 2: Reading disk
    setTimeout(() => {
      idleWorker.state = 'READING_DISK';
      this.updateWorkerPoolUI();

      // Step 3: Response streaming
      setTimeout(() => {
        idleWorker.state = 'STREAMING';
        this.updateWorkerPoolUI();
        window.soundController.playTone(850, 'triangle', 0.03);

        if (inspector) {
          inspector.textContent = 
`<< [SERVER RESPONSE INBOUND <- 127.0.0.1:8080]
HTTP/1.1 200 OK
Date: ${new Date().toUTCString()}
Server: POSIX-MultiThread-ASCII/2.0 (Linux/x86_64)
Content-Type: text/plain; charset=utf-8
Content-Length: ${this.rawAscii.length}
Worker-Thread: pthread_${idleWorker.id}
Connection: keep-alive

${this.rawAscii.substring(0, 300)}...
[+ ${this.rawAscii.length - 300} bytes streamed]`;
        }

        setTimeout(() => {
          idleWorker.state = 'IDLE';
          idleWorker.currentTask = null;
          this.updateWorkerPoolUI();
        }, 400);

      }, 250);
    }, 200);
  }

  updateWorkerPoolUI() {
    const container = document.getElementById('workerPoolContainer');
    if (!container) return;
    container.innerHTML = '';

    const labels = { IDLE: 'libre', DISPATCHED: 'recibe', READING_DISK: 'lee disco', STREAMING: 'responde' };

    this.workers.forEach(w => {
      const card = document.createElement('div');
      card.className = `worker ${w.state === 'IDLE' ? '' : 'busy'}`;

      const top = document.createElement('div');
      top.className = 'worker-top';
      const name = document.createElement('span');
      name.textContent = `Hilo ${w.id}`;
      const state = document.createElement('span');
      state.className = `worker-state s-${w.state}`;
      state.textContent = labels[w.state] || w.state;
      top.append(name, state);

      const task = document.createElement('div');
      task.className = 'worker-task';
      task.textContent = w.currentTask || 'esperando en sem_wait()';

      card.append(top, task);
      container.appendChild(card);
    });
  }
}

window.networkingLab = new NetworkingLab();
