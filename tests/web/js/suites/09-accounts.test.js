// Optional accounts: progress model, account service, station hooks, rules.
'use strict';

module.exports = (t, { createEnv, read }) => {
  const base = createEnv();
  base.load('js/progress.js');
  const P = base.window.Progress;
  const T0 = 1700000000000;

  // A fake Firebase backend with the same interface as createFirebaseBackend().
  const fakeBackend = (remote = null, opts = {}) => {
    let authCb = null;
    const calls = { saves: [], loads: 0 };
    return {
      calls,
      kind: 'fake',
      async init() { if (opts.failInit) throw new Error('offline'); },
      onAuth(cb) { authCb = cb; },
      async signIn() { await authCb({ uid: 'u1', name: 'Ana Pérez', photoURL: null }); },
      async signOut() { await authCb(null); },
      async load() { calls.loads++; return remote ? JSON.parse(JSON.stringify(remote)) : null; },
      async save(uid, data) {
        if (opts.failSave) throw new Error('permission-denied');
        calls.saves.push({ uid, data: JSON.parse(JSON.stringify(data)) });
        remote = { ...(remote || {}), ...data };
      }
    };
  };
  // Manual timers so debounced saves can be controlled.
  const manualTimers = () => { let fn = null; return { setTimeout(f) { fn = f; return 1; }, clearTimeout() { fn = null; }, fire() { const f = fn; fn = null; if (f) return f(); }, get pending() { return !!fn; } }; };
  const newAccount = ({ backend = null, storage } = {}) => {
    const env = createEnv();
    env.load('js/progress.js');
    env.load('js/account.js');
    const timers = manualTimers();
    let clock = T0;
    const acc = new env.window.Account({ storage: storage || env.localStorage, backend, timers, now: () => ++clock });
    return { env, acc, timers };
  };

  t.suite('accounts · progress model', () => {
    t.test('a new progress document is empty', () => { const p = P.empty(); t.eq(p.version, 1); t.deepEq(p.stations, {}); t.eq(p.last, null); });
    t.test('recording a checklist item marks it done with its label', () => {
      const r = P.record(P.empty(), 'interview', 'solve:trap-rain', T0);
      t.eq(r.isNew, true); t.eq(r.progress.stations.interview.items['solve:trap-rain'], T0); t.includes(r.label, 'Atrapar agua');
    });
    t.test('recording the same item again keeps the first time', () => {
      const a = P.record(P.empty(), 'sql', 'solve:join-where', T0).progress;
      const b = P.record(a, 'sql', 'solve:join-where', T0 + 99);
      t.eq(b.isNew, false); t.eq(b.progress.stations.sql.items['solve:join-where'], T0);
    });
    t.test('unknown items are ignored', () => t.eq(P.record(P.empty(), 'sql', 'solve:nope', T0).isNew, false));
    t.test('unknown stations are ignored', () => t.deepEq(P.record(P.empty(), 'cocina', 'x', T0).progress.stations, {}));
    t.test('recording never mutates the previous document', () => { const p = P.empty(); P.record(p, 'cheatsheets', 'amdahl', T0); t.deepEq(p.stations, {}); });
    t.test('visiting a step remembers it and where the student left off', () => {
      const p = P.visit(P.empty(), 'networking', 'learn', T0);
      t.eq(p.stations.networking.steps.learn, true); t.deepEq(p.last, { station: 'networking', step: 'learn', at: T0 });
    });
    t.test('visiting with an unknown step falls back to "play"', () => t.eq(P.visit(P.empty(), 'sql', 'dance', T0).last.step, 'play'));
    t.test('station stats count done items and completion', () => {
      let p = P.empty(); ['solve:join-where', 'solve:group-having'].forEach((i) => { p = P.record(p, 'sql', i, T0).progress; });
      const s = P.stationStats(p, 'sql'); t.eq(s.done, 2); t.eq(s.total, 3); t.eq(s.percent, 67); t.eq(s.complete, false);
    });
    t.test('completing every item completes the station', () => {
      let p = P.empty(); P.CHECKLISTS.datastructures.items.forEach((i) => { p = P.record(p, 'datastructures', i.id, T0).progress; });
      t.eq(P.stationStats(p, 'datastructures').complete, true); t.eq(P.overall(p).stationsComplete, 1);
    });
    t.test('the whole workshop has 33 checklist items across 8 stations', () => { const o = P.overall(P.empty()); t.eq(o.total, 33); t.eq(o.stations, 8); });
    t.test('merging keeps items from both sides with the earliest time', () => {
      const a = P.record(P.empty(), 'sql', 'solve:join-where', T0 + 50).progress;
      let b = P.record(P.empty(), 'sql', 'solve:join-where', T0).progress;
      b = P.record(b, 'interview', 'solve:max-water', T0).progress;
      const m = P.merge(a, b);
      t.eq(m.stations.sql.items['solve:join-where'], T0); t.eq(m.stations.interview.items['solve:max-water'], T0);
    });
    t.test('merging combines visited steps', () => {
      const m = P.merge(P.visit(P.empty(), 'sql', 'learn', T0), P.visit(P.empty(), 'sql', 'build', T0));
      t.deepEq(m.stations.sql.steps, { learn: true, build: true });
    });
    t.test('merging keeps the most recent "last visited"', () => {
      const m = P.merge(P.visit(P.empty(), 'sql', 'play', T0), P.visit(P.empty(), 'networking', 'play', T0 + 5));
      t.eq(m.last.station, 'networking');
    });
    t.test('merging tolerates missing or broken documents', () => { t.deepEq(P.merge(null, 'garbage'), P.empty()); t.deepEq(P.merge(undefined, P.empty()), P.empty()); });
    t.test('sanitize drops unknown stations, unknown items and bad timestamps', () => {
      const s = P.sanitize({ stations: { sql: { items: { 'solve:join-where': T0, 'solve:hack': T0, 'solve:group-having': -4 }, steps: { learn: true, evil: true } }, evil: {} } });
      t.deepEq(Object.keys(s.stations), ['sql']); t.deepEq(s.stations.sql.items, { 'solve:join-where': T0 }); t.deepEq(s.stations.sql.steps, { learn: true });
    });
    t.test('sanitize turns non-objects into an empty document', () => { t.deepEq(P.sanitize([]), P.empty()); t.deepEq(P.sanitize('x'), P.empty()); });
  });

  t.suite('accounts · checklists match the real stations', () => {
    const env = createEnv();
    env.load('js/tracer.js');
    ['interview', 'datastructures', 'sql'].forEach((f) => env.load(`js/modules/${f}.js`));
    env.load('js/modules/algorithms.js');
    const { MODULES } = env.load('js/app.js', ['MODULES']);
    const ids = (lab) => lab.problems.map((p) => `solve:${p.id}`).sort();
    const list = (station) => P.CHECKLISTS[station].items.map((i) => i.id).sort();
    t.test('every station in the workshop has a checklist and vice versa', () => t.deepEq(Object.keys(P.CHECKLISTS).sort(), Object.keys(MODULES).sort()));
    t.test('interview checklist lists every interview problem', () => t.deepEq(list('interview'), ids(env.window.interviewStation)));
    t.test('data structures checklist lists every problem', () => t.deepEq(list('datastructures'), ids(env.window.dsStation)));
    t.test('SQL checklist lists every query', () => t.deepEq(list('sql'), ids(env.window.sqlStation)));
    t.test('sorting checklist lists every algorithm', () => t.deepEq(list('algorithms'), Object.keys(env.window.algorithmsStation.complexities).map((a) => `run:${a}`).sort()));
    t.test('every checklist item has a readable label', () => Object.values(P.CHECKLISTS).forEach((c) => c.items.forEach((i) => t.ok(i.label.length > 8, i.id))));
  });

  t.suite('accounts · guest mode', () => {
    t.test('without Firebase config the cloud is unavailable', () => { const { acc } = newAccount(); t.eq(acc.cloudAvailable, false); });
    t.test('signing in without Firebase explains why', async () => {
      const { acc } = newAccount(); let msg = '';
      try { await acc.signIn(); } catch (e) { msg = e.message; }
      t.includes(msg, 'no están activadas');
    });
    t.test('guest progress is saved on the device', async () => {
      const { env, acc } = newAccount(); await acc.init(); acc.record('cheatsheets', 'amdahl');
      t.includes(env.localStorage.getItem('cslab-progress'), 'amdahl');
    });
    t.test('guest progress is restored on the next visit', async () => {
      const first = newAccount(); await first.acc.init(); first.acc.record('sql', 'solve:join-where');
      const second = newAccount({ storage: first.env.localStorage }); await second.acc.init();
      t.eq(second.acc.stats('sql').done, 1);
    });
    t.test('corrupted saved progress starts fresh instead of crashing', async () => {
      const { env, acc } = newAccount(); env.localStorage.setItem('cslab-progress', '{oops'); await acc.init(); t.eq(acc.overall().done, 0);
    });
    t.test('reset clears the saved progress', async () => {
      const { acc } = newAccount(); await acc.init(); acc.record('cheatsheets', 'amdahl'); acc.reset(); t.eq(acc.overall().done, 0);
    });
  });

  t.suite('accounts · signing in with Google (fake Firebase)', () => {
    const signedIn = async (remote = null, opts = {}) => {
      const backend = fakeBackend(remote, opts);
      const ctx = newAccount({ backend });
      await ctx.acc.init();
      return { ...ctx, backend };
    };
    t.test('guest progress is merged into the account on sign-in', async () => {
      const { acc, backend } = await signedIn({ progress: P.record(P.empty(), 'sql', 'solve:join-where', T0).progress });
      acc.record('interview', 'solve:max-water');
      await backend.signIn();
      t.eq(acc.signedIn, true); t.eq(acc.stats('sql').done, 1); t.eq(acc.stats('interview').done, 1);
    });
    t.test('the merged progress is saved to the account right away', async () => {
      const { acc, backend } = await signedIn(); acc.record('cheatsheets', 'amdahl'); await backend.signIn();
      t.eq(backend.calls.saves.length, 1); t.eq(backend.calls.saves[0].uid, 'u1'); t.ok(backend.calls.saves[0].data.progress.stations.cheatsheets);
    });
    t.test('a new account gets a creation date', async () => { const { backend } = await signedIn(); await backend.signIn(); t.ok(backend.calls.saves[0].data.createdAt); });
    t.test('an existing account keeps its creation date', async () => { const { backend } = await signedIn({ createdAt: 1, progress: {} }); await backend.signIn(); t.eq(backend.calls.saves[0].data.createdAt, undefined); });
    t.test('only the name and photo are stored, never the email', async () => {
      const { backend } = await signedIn(); await backend.signIn();
      t.deepEq(Object.keys(backend.calls.saves[0].data).sort(), ['createdAt', 'name', 'photoURL', 'progress', 'updatedAt']);
    });
    t.test('the device forgets guest progress once it is in the account', async () => {
      const { env, acc, backend } = await signedIn(); acc.record('cheatsheets', 'amdahl'); await backend.signIn();
      t.eq(env.localStorage.getItem('cslab-progress'), null);
    });
    t.test('signed-in progress is saved after a short delay, not on every click', async () => {
      const { acc, backend, timers } = await signedIn(); await backend.signIn();
      acc.record('sql', 'solve:join-where'); acc.record('sql', 'solve:group-having');
      t.eq(backend.calls.saves.length, 1); t.ok(timers.pending);
      await timers.fire();
      t.eq(backend.calls.saves.length, 2); t.eq(Object.keys(backend.calls.saves[1].data.progress.stations.sql.items).length, 2);
    });
    t.test('signing out flushes pending changes first', async () => {
      const { acc, backend } = await signedIn(); await backend.signIn(); acc.record('cheatsheets', 'amdahl');
      await acc.signOut();
      t.ok(backend.calls.saves.some((s) => s.data.progress && s.data.progress.stations.cheatsheets));
    });
    t.test('after signing out the device is a fresh guest', async () => {
      const { acc, backend } = await signedIn(); await backend.signIn(); acc.record('cheatsheets', 'amdahl'); await acc.signOut();
      t.eq(acc.signedIn, false); t.eq(acc.overall().done, 0);
    });
    t.test('if Firebase cannot load, the workshop keeps working as a guest', async () => {
      const { acc } = await signedIn(null, { failInit: true });
      t.eq(acc.cloudAvailable, false); t.ok(acc.error); acc.record('cheatsheets', 'amdahl'); t.eq(acc.overall().done, 1);
    });
    t.test('a failed cloud save is reported without crashing', async () => {
      const { acc, backend } = await signedIn(null, { failSave: true }); const events = [];
      acc.onChange((e) => events.push(e.type)); await backend.signIn();
      t.ok(events.includes('error')); t.eq(acc.signedIn, true);
    });
  });

  t.suite('accounts · change notifications', () => {
    t.test('listeners hear about new achievements', async () => {
      const { acc } = newAccount(); await acc.init(); const ev = [];
      acc.onChange((e) => ev.push(e)); acc.record('cheatsheets', 'amdahl');
      t.eq(ev[0].type, 'record'); t.eq(ev[0].isNew, true);
    });
    t.test('unsubscribed listeners stop hearing', async () => {
      const { acc } = newAccount(); await acc.init(); let n = 0;
      const off = acc.onChange(() => n++); off(); acc.record('cheatsheets', 'amdahl'); t.eq(n, 0);
    });
    t.test('a broken listener does not break progress', async () => {
      const { acc } = newAccount(); await acc.init(); acc.onChange(() => { throw new Error('boom'); });
      acc.record('cheatsheets', 'amdahl'); t.eq(acc.overall().done, 1);
    });
  });

  t.suite('accounts · stations record what students do', () => {
    const withAccount = () => {
      const env = createEnv();
      env.load('js/progress.js'); env.load('js/account.js');
      return env;
    };
    t.test('walking a trace to the last line records the problem', () => {
      const env = withAccount(); env.load('js/tracer.js'); env.load('js/modules/sql.js');
      const lab = env.window.sqlStation; lab.init(); lab.go(lab.frames.length - 1);
      t.eq(env.window.account.stats('sql').done, 1);
    });
    t.test('stopping halfway through a trace records nothing', () => {
      const env = withAccount(); env.load('js/tracer.js'); env.load('js/modules/sql.js');
      const lab = env.window.sqlStation; lab.init(); lab.go(2);
      t.eq(env.window.account.stats('sql').done, 0);
    });
    t.test('finishing a sort records that algorithm', async () => {
      const env = withAccount(); env.load('js/modules/algorithms.js');
      const lab = env.window.algorithmsStation; lab.init(); lab.delay = 0; lab.arraySize = 12; lab.generateArray('random'); lab.currentAlgo = 'heap';
      await lab.start();
      t.ok(env.window.account.progress.stations.algorithms.items['run:heap']);
    });
    t.test('provoking and resolving the deadlock records both', () => {
      const env = withAccount(); env.load('js/modules/concurrency.js');
      const lab = env.window.concurrencyLab; lab.forceCoffmanDeadlock(); lab.resolveCoffmanDeadlock();
      const items = env.window.account.progress.stations.concurrency.items; t.ok(items.deadlock && items.resolve);
    });
    t.test('finishing a 404 exchange records it', () => {
      const env = withAccount(); env.load('js/modules/figuresData.js'); env.load('js/tracer.js'); env.load('js/modules/httpsim.js'); env.load('js/modules/networking.js');
      env.document.getElementById('netCommand').value = 'GET';
      const lab = env.window.networkingStation; lab.init();
      env.document.getElementById('netFigure').value = 'unicornio'; lab.prepare(); lab.go(lab.exchange.steps.length - 1);
      t.ok(env.window.account.progress.stations.networking.items['exchange:notfound']);
    });
  });

  t.suite('accounts · page, route and rules', () => {
    const html = read('web/index.html');
    const rules = read('firestore.rules');
    t.test('#/perfil opens "Mi espacio"', () => {
      const env = createEnv(); env.load('js/progress.js'); env.load('js/account.js');
      const { App } = env.load('js/app.js', ['App']); const app = new App(); app.init();
      env.location.hash = '#/perfil'; app.handleRoute(); t.eq(app.route, 'profile');
    });
    t.test('the profile explains when accounts are not active yet', () => {
      const env = createEnv(); env.load('js/progress.js'); env.load('js/account.js');
      const { App } = env.load('js/app.js', ['App']); const app = new App(); app.init(); app.renderProfile();
      t.includes(env.document.getElementById('profileNote').textContent, 'no están activadas');
      t.eq(env.document.getElementById('btnSignIn').disabled, true);
    });
    t.test('the profile shows the signed-in name', () => {
      const env = createEnv(); env.load('js/progress.js'); env.load('js/account.js');
      const { App } = env.load('js/app.js', ['App']); const app = new App(); app.init();
      env.window.account.user = { uid: 'u1', name: 'Ana Pérez', photoURL: null }; app.renderProfile();
      t.eq(env.document.getElementById('profileName').textContent, 'Ana Pérez'); t.eq(env.document.getElementById('btnSignOut').hidden, false);
    });
    t.test('every corner of the page links to "Mi espacio"', () => t.includes(html, 'href="#/perfil" id="btnAccount"'));
    t.test('account scripts load before the stations', () => ['firebase-config.js', 'progress.js', 'account.js'].forEach((f) => t.ok(html.indexOf(`js/${f}`) < html.indexOf('js/modules/algorithms.js'), f)));
    t.test('the Firebase SDK version is pinned', () => t.ok(/firebasejs\/\d+\.\d+\.\d+/.test(read('web/js/account.js'))));
    t.test('rules only open users/{uid} to its owner', () => { t.includes(rules, 'match /users/{uid}'); t.includes(rules, 'request.auth.uid == uid'); });
    t.test('rules deny everything else by default', () => t.includes(rules, 'allow read, write: if false;'));
    t.test('rules only accept the expected fields', () => t.includes(rules, "hasOnly(['name', 'photoURL', 'progress', 'createdAt', 'updatedAt'])"));
    t.test('firebase.json deploys the rules', () => t.eq(JSON.parse(read('firebase.json')).firestore.rules, 'firestore.rules'));
  });
};
