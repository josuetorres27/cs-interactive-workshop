// CS Interactive Workshop - Optional student accounts.
//
// Guests: progress lives in localStorage on this device.
// Signed in (Google via Firebase Auth): progress lives in Firestore at
// users/{uid} and follows the student to any device. On sign-in the guest
// progress is merged into the account (nothing is lost); on sign-out the
// device starts again as a fresh guest, so shared classroom computers stay private.
//
// The cloud part is a pluggable "backend" so it can be faked in tests.
(function (root) {
  const P = root.Progress;
  const GUEST_KEY = 'csworkshop-progress';
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

  function loadScript(src, doc) {
    return new Promise((resolve, reject) => {
      const s = doc.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      doc.head.appendChild(s);
    });
  }

  // Real backend: Firebase compat SDK, loaded only when a config exists.
  function createFirebaseBackend(config, win = root) {
    let auth = null, db = null, fb = null;
    return {
      kind: 'firebase',
      async init() {
        const doc = win.document;
        await loadScript(`${SDK}/firebase-app-compat.js`, doc);
        await Promise.all([loadScript(`${SDK}/firebase-auth-compat.js`, doc), loadScript(`${SDK}/firebase-firestore-compat.js`, doc)]);
        fb = win.firebase;
        fb.initializeApp(config);
        auth = fb.auth();
        db = fb.firestore();
      },
      onAuth(cb) {
        auth.onAuthStateChanged((u) => cb(u ? { uid: u.uid, name: u.displayName || 'Estudiante', photoURL: u.photoURL || null } : null));
      },
      async signIn() {
        const provider = new fb.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
          await auth.signInWithPopup(provider);
        } catch (e) {
          // Popups are often blocked on phones: fall back to a full-page redirect.
          if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) await auth.signInWithRedirect(provider);
          else throw e;
        }
      },
      signOut() { return auth.signOut(); },
      async load(uid) {
        const snap = await db.collection('users').doc(uid).get();
        return snap.exists ? snap.data() : null;
      },
      save(uid, data) { return db.collection('users').doc(uid).set(data, { merge: true }); }
    };
  }

  class Account {
    constructor({ storage = null, backend = null, now = () => Date.now(), saveDelay = 1200, timers = root } = {}) {
      this.storage = storage;
      this.backend = backend;
      this.now = now;
      this.saveDelay = saveDelay;
      this.timers = timers;
      this.user = null;
      this.ready = false;
      this.error = null;
      this.progress = P.empty();
      this.listeners = [];
      this.saveTimer = null;
      this.pending = null;
    }

    get cloudAvailable() { return !!this.backend; }
    get signedIn() { return !!this.user; }

    async init() {
      this.progress = this.readGuest();
      this.emit({ type: 'init' });
      if (!this.backend) { this.ready = true; return; }
      try {
        await this.backend.init();
        this.backend.onAuth((u) => this.handleUser(u));
      } catch (e) {
        this.error = e;
        this.backend = null; // keep working as a guest
        this.ready = true;
        this.emit({ type: 'error', error: e });
      }
    }

    // ── Guest storage ──────────────────────────────────────
    readGuest() {
      try {
        const raw = this.storage && this.storage.getItem(GUEST_KEY);
        return raw ? P.sanitize(JSON.parse(raw)) : P.empty();
      } catch (e) { return P.empty(); }
    }
    writeGuest(p) {
      try { if (this.storage) this.storage.setItem(GUEST_KEY, JSON.stringify(p)); } catch (e) { /* storage blocked */ }
    }
    clearGuest() {
      try { if (this.storage) this.storage.removeItem(GUEST_KEY); } catch (e) { /* storage blocked */ }
    }

    // ── Auth state ─────────────────────────────────────────
    async handleUser(u) {
      if (!u) {
        const wasSignedIn = !!this.user;
        this.user = null;
        if (wasSignedIn) this.progress = P.empty();
        this.ready = true;
        this.emit({ type: 'auth', user: null });
        return;
      }
      this.user = u;
      try {
        const remote = await this.backend.load(u.uid);
        const guest = this.readGuest();
        this.progress = P.merge(remote && remote.progress, guest);
        const doc = { name: u.name, photoURL: u.photoURL, progress: this.progress, updatedAt: this.now() };
        if (!remote) doc.createdAt = this.now();
        await this.backend.save(u.uid, doc);
        this.clearGuest(); // it now lives in the account
      } catch (e) {
        this.error = e;
        this.emit({ type: 'error', error: e });
      }
      this.ready = true;
      this.emit({ type: 'auth', user: u });
    }

    async signIn() {
      if (!this.backend) throw new Error('Las cuentas todavía no están activadas en este sitio.');
      await this.backend.signIn();
    }

    async signOut() {
      if (!this.backend || !this.user) return;
      await this.flush();
      await this.backend.signOut();
    }

    // ── Progress ───────────────────────────────────────────
    record(stationId, item) {
      const { progress, isNew, label } = P.record(this.progress, stationId, item, this.now());
      this.progress = progress;
      this.persist();
      this.emit({ type: 'record', station: stationId, item, isNew, label });
      return isNew;
    }

    visit(stationId, step) {
      this.progress = P.visit(this.progress, stationId, step, this.now());
      this.persist();
      this.emit({ type: 'visit', station: stationId, step });
    }

    reset() {
      this.progress = P.empty();
      this.persist(true);
      this.emit({ type: 'reset' });
    }

    persist(immediate = false) {
      if (!this.user) { this.writeGuest(this.progress); return; }
      this.pending = { progress: this.progress, updatedAt: this.now() };
      if (this.saveTimer) this.timers.clearTimeout(this.saveTimer);
      if (immediate) { this.flush(); return; }
      this.saveTimer = this.timers.setTimeout(() => this.flush(), this.saveDelay);
    }

    async flush() {
      if (this.saveTimer) { this.timers.clearTimeout(this.saveTimer); this.saveTimer = null; }
      if (!this.pending || !this.user || !this.backend) return;
      const data = this.pending; this.pending = null;
      try { await this.backend.save(this.user.uid, data); } catch (e) { this.error = e; this.emit({ type: 'error', error: e }); }
    }

    onChange(fn) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter((f) => f !== fn); }; }
    emit(ev) { this.listeners.forEach((fn) => { try { fn(ev, this); } catch (e) { /* a broken listener must not break progress */ } }); }

    stats(stationId) { return P.stationStats(this.progress, stationId); }
    overall() { return P.overall(this.progress); }
  }

  root.Account = Account;
  root.createFirebaseBackend = createFirebaseBackend;
  if (root.document && root.Progress) {
    let storage = null;
    try { storage = root.localStorage; } catch (e) { storage = null; }
    const cfg = root.FIREBASE_CONFIG;
    root.account = new Account({ storage, backend: cfg && cfg.apiKey ? createFirebaseBackend(cfg) : null });
    root.addEventListener && root.addEventListener('pagehide', () => { root.account.flush(); });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { Account, createFirebaseBackend, GUEST_KEY };
})(typeof window !== 'undefined' ? window : globalThis);
