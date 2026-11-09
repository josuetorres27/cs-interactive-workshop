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
          window.app.showToast(`Copied '${this.currentFigure}' to clipboard!`);
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
      const item = document.createElement('div');
      item.className = `figure-item ${name === this.currentFigure ? 'selected' : ''}`;
      item.style.cssText = `
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        color: ${name === this.currentFigure ? 'var(--cyan)' : 'var(--text-dim)'};
        background: ${name === this.currentFigure ? 'var(--bg-tertiary)' : 'transparent'};
        border-left: 2px solid ${name === this.currentFigure ? 'var(--cyan)' : 'transparent'};
        margin-bottom: 2px;
      `;
      item.innerHTML = `<span>${name}</span> <span style="font-size:0.7rem; color:var(--text-muted);">&gt;</span>`;
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
    document.getElementById('figLinesCount').textContent = `${lines.length} lines`;
    document.getElementById('figCharsCount').textContent = `${text.length} chars`;

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

    this.workers.forEach(w => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: var(--bg-tertiary);
        border: 1px solid ${w.state === 'IDLE' ? 'var(--border-subtle)' : 'var(--cyan)'};
        border-radius: var(--radius-sm);
        padding: 0.6rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      `;

      let badgeColor = 'var(--text-muted)';
      if (w.state === 'DISPATCHED') badgeColor = 'var(--amber)';
      if (w.state === 'READING_DISK') badgeColor = 'var(--purple)';
      if (w.state === 'STREAMING') badgeColor = 'var(--emerald)';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-family:var(--font-mono);">
          <span>Worker Thread #${w.id}</span>
          <span style="color:${badgeColor}; font-weight:700;">${w.state}</span>
        </div>
        <div style="font-size:0.7rem; color:var(--text-dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${w.currentTask || 'Idle (listening on sem_wait)'}
        </div>
      `;
      container.appendChild(card);
    });
  }
}

window.networkingLab = new NetworkingLab();
