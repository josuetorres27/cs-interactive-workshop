// CS Interactive Lab - Master Application Orchestrator
class App {
  constructor() {
    this.currentTab = 'algorithms';
  }

  init() {
    this.setupTabs();
    this.setupGlobalControls();
    this.setupKeyboardShortcuts();

    // Initialize modules
    if (window.algorithmsLab) window.algorithmsLab.init();
    if (window.concurrencyLab) window.concurrencyLab.init();
    if (window.networkingLab) window.networkingLab.init();
    if (window.cheatsheetsLab) window.cheatsheetsLab.init();

    this.showToast('CS Interactive Lab initialized. Welcome!');
  }

  setupTabs() {
    const tabButtons = document.querySelectorAll('.header .nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        if (targetTab) this.switchTab(targetTab);
      });
    });

    // Course pills in Academic Hero
    document.querySelectorAll('.course-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.goto;
        if (target) {
          this.switchTab(target);
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
