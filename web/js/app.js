// CS Interactive Lab - Master Application Orchestrator
class App {
  constructor() {
    this.currentTab = 'algorithms';
  }

  init() {
    this.setupWelcomeView();
    this.setupTabs();
    this.setupGlobalControls();
    this.setupKeyboardShortcuts();

    // Initialize modules
    if (window.algorithmsLab) window.algorithmsLab.init();
    if (window.concurrencyLab) window.concurrencyLab.init();
    if (window.networkingLab) window.networkingLab.init();
    if (window.cheatsheetsLab) window.cheatsheetsLab.init();

    this.showToast('CS Interactive Lab listo. ¡Bienvenido!');
  }

  setupWelcomeView() {
    const btnEnterHero = document.getElementById('btnEnterLabHero');
    if (btnEnterHero) {
      btnEnterHero.addEventListener('click', () => {
        this.openLab('algorithms');
      });
    }

    document.querySelectorAll('.mission-card').forEach(card => {
      card.addEventListener('click', () => {
        const mission = card.dataset.launch;
        if (mission) this.openLab(mission);
      });
    });

    const btnBack = document.getElementById('btnBackToWelcome');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        this.showWelcome();
      });
    }

    const brand = document.querySelector('.brand');
    if (brand) {
      brand.addEventListener('click', (e) => {
        e.preventDefault();
        this.showWelcome();
      });
    }

    const btnNavHome = document.getElementById('btnNavHome');
    if (btnNavHome) {
      btnNavHome.addEventListener('click', () => {
        this.showWelcome();
      });
    }
  }

  openLab(tabId = 'algorithms') {
    const welcomeView = document.getElementById('view-welcome');
    const labView = document.getElementById('view-lab');
    if (welcomeView) welcomeView.style.display = 'none';
    if (labView) labView.style.display = 'block';

    const missionNames = {
      algorithms: 'Misión 1: Arena de Algoritmos (CI-0112)',
      concurrency: 'Misión 2: Rotonda & Concurrencia (CI-0117)',
      networking: 'Misión 3: Hack Studio & Sockets (CI-0123)',
      cheatsheets: 'Misión 4: Métricas & Recursos Teóricos'
    };

    const label = document.getElementById('activeMissionLabel');
    if (label && missionNames[tabId]) {
      label.textContent = missionNames[tabId];
    }

    this.switchTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.soundController.playTone(720, 'sine', 0.04, 0.4);
  }

  showWelcome() {
    const welcomeView = document.getElementById('view-welcome');
    const labView = document.getElementById('view-lab');
    if (welcomeView) welcomeView.style.display = 'block';
    if (labView) labView.style.display = 'none';

    document.querySelectorAll('.header .nav-tab-btn').forEach(btn => btn.classList.remove('active'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.soundController.playClick();
  }

  setupTabs() {
    const tabButtons = document.querySelectorAll('.header .nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        if (targetTab) this.openLab(targetTab);
      });
    });

    // Course pills in Academic Hero
    document.querySelectorAll('.course-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.goto;
        if (target) {
          this.openLab(target);
          const tabPane = document.getElementById(`tab-${target}`);
          if (tabPane) {
            tabPane.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  switchTab(tabId) {
    if (!tabId) return;
    this.currentTab = tabId;

    const welcomeView = document.getElementById('view-welcome');
    const labView = document.getElementById('view-lab');
    if (welcomeView && welcomeView.style.display !== 'none' && labView) {
      welcomeView.style.display = 'none';
      labView.style.display = 'block';
    }

    const missionNames = {
      algorithms: 'Misión 1: Arena de Algoritmos (CI-0112)',
      concurrency: 'Misión 2: Rotonda & Concurrencia (CI-0117)',
      networking: 'Misión 3: Hack Studio & Sockets (CI-0123)',
      cheatsheets: 'Misión 4: Métricas & Recursos Teóricos'
    };
    const label = document.getElementById('activeMissionLabel');
    if (label && missionNames[tabId]) {
      label.textContent = missionNames[tabId];
    }

    // Update tab buttons
    document.querySelectorAll('.header .nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update course chips in hero
    document.querySelectorAll('.course-chip').forEach(chip => {
      chip.classList.toggle('active-chip', chip.dataset.goto === tabId);
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    // Notify modules on tab switch for canvas redraws
    if (tabId === 'algorithms' && window.algorithmsLab) {
      setTimeout(() => window.algorithmsLab.resizeCanvas(), 50);
    } else if (tabId === 'concurrency' && window.concurrencyLab) {
      setTimeout(() => window.concurrencyLab.resizeCanvas(), 50);
    }

    window.soundController.playTone(500, 'sine', 0.02, 0.3);
  }

  setupGlobalControls() {
    // Sound mute button
    const btnMute = document.getElementById('btnToggleSound');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        const isMuted = window.soundController.toggleMute();
        btnMute.innerHTML = isMuted ? '🔇' : '🔊';
        btnMute.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
        this.showToast(isMuted ? 'Sound muted' : 'Sound enabled');
      });
    }

    // Fullscreen toggle
    const btnFullscreen = document.getElementById('btnToggleFullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === '1') this.switchTab('algorithms');
      if (e.key === '2') this.switchTab('concurrency');
      if (e.key === '3') this.switchTab('networking');
      if (e.key === '4') this.switchTab('cheatsheets');

      if (e.key === 'm' || e.key === 'M') {
        const btnMute = document.getElementById('btnToggleSound');
        if (btnMute) btnMute.click();
      }
    });
  }

  showToast(message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>●</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
