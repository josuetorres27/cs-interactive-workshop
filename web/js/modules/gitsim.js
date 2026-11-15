// CS Interactive Workshop - Git model (no DOM).
//
// A small, honest Git. Blobs, trees and commits are hashed exactly like Git hashes
// them (SHA-1 of "<type> <size>\0<body>"), so with the same files, author and date
// every hash here is the one real Git prints. On top of the object store:
//   * refs: branch names that point to commits,
//   * HEAD: points to a branch, or straight to a commit when detached,
//   * the index (staging area) and a flat working tree (no folders),
//   * the reflog: every move of HEAD, which is what makes "lost" commits recoverable.
// Merges are line based three-way merges with conflict markers. Rebase and revert
// stop on a conflict instead of leaving the student halfway, and switching branches
// asks for a clean tree. Those are the only simplifications.
(function (root) {
  const AUTHOR = { name: 'Bit', email: 'bit@taller.local', tz: '-0600' };
  const START = 1767290400; // Thu Jan 1 12:00:00 2026 -0600
  const STEP = 60;          // one minute between commits
  const SHORT = 7;

  class GitError extends Error {
    constructor(out, note = '') { super(out); this.note = note; }
  }

  // ── Bytes and SHA-1 ─────────────────────────────────────────
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  function utf8(str) {
    if (encoder) return encoder.encode(str);
    const bin = unescape(encodeURIComponent(str));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }

  function concat(parts) {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    parts.forEach((p) => { out.set(p, at); at += p.length; });
    return out;
  }

  function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  // FIPS 180-4, the same function Git uses for object names.
  function sha1(bytes) {
    if (typeof bytes === 'string') bytes = utf8(bytes);
    const len = bytes.length;
    const total = (((len + 9) + 63) >> 6) << 6;
    const buf = new Uint8Array(total);
    buf.set(bytes);
    buf[len] = 0x80;
    const view = new DataView(buf.buffer);
    view.setUint32(total - 8, Math.floor((len * 8) / 0x100000000));
    view.setUint32(total - 4, (len * 8) >>> 0);
    let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    const w = new Uint32Array(80);
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
      for (let i = 16; i < 80; i++) { const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]; w[i] = (x << 1) | (x >>> 31); }
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let i = 0; i < 80; i++) {
        let f, k;
        if (i < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
        else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
        else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else { f = b ^ c ^ d; k = 0xCA62C1D6; }
        const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
        e = d; d = c; c = ((b << 30) | (b >>> 2)) >>> 0; b = a; a = t;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    return [h0, h1, h2, h3, h4].map((h) => h.toString(16).padStart(8, '0')).join('');
  }

  // ── Objects, byte for byte like Git ─────────────────────────
  const asBytes = (body) => (typeof body === 'string' ? utf8(body) : body);
  const objectBytes = (type, body) => { const b = asBytes(body); return concat([utf8(`${type} ${b.length}\0`), b]); };
  const hashObject = (type, body) => sha1(objectBytes(type, body));
  const hashBlob = (content) => hashObject('blob', content);

  // Entries sorted by name, byte order (so "README.md" comes before "app.py")
  const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  function treeBody(entries) {
    const parts = [];
    entries.slice().sort(byName).forEach((e) => { parts.push(utf8(`${e.mode || '100644'} ${e.name}\0`)); parts.push(hexToBytes(e.sha)); });
    return concat(parts);
  }

  function commitBody({ tree, parents = [], author = AUTHOR, time, message }) {
    const who = `${author.name} <${author.email}> ${time} ${author.tz}`;
    return `tree ${tree}\n${parents.map((p) => `parent ${p}\n`).join('')}author ${who}\ncommitter ${who}\n\n${message}\n`;
  }

  // "Thu Jan 1 12:00:00 2026 -0600", like git log
  function gitDate(time, tz) {
    const sign = tz[0] === '-' ? -1 : 1;
    const offset = sign * (parseInt(tz.slice(1, 3), 10) * 60 + parseInt(tz.slice(3, 5), 10));
    const d = new Date((time + offset * 60) * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ${d.getUTCFullYear()} ${tz}`;
  }

  // ── Three-way merge, line by line ───────────────────────────
  const splitLines = (s) => (s ? s.match(/[^\n]*\n|[^\n]+$/g) : []);

  // Longest common subsequence as a map: index in x -> index in y
  function lcsPairs(x, y) {
    const n = x.length, m = y.length;
    const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const pairs = new Map();
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (x[i] === y[j]) { pairs.set(i, j); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    return pairs;
  }

  // diff3: lines of the base kept by both sides are anchors; between anchors a chunk changed
  // by one side takes that side, a chunk changed by both in the same way is taken once,
  // and a chunk changed differently by both is a conflict.
  function merge3(base, ours, theirs, labels = ['HEAD', 'theirs']) {
    const B = splitLines(base), A = splitLines(ours), C = splitLines(theirs);
    const ma = lcsPairs(B, A), mc = lcsPairs(B, C);
    const same = (p, q) => p.length === q.length && p.every((l, k) => l === q[k]);
    const block = (seg) => { const s = seg.join(''); return s && !s.endsWith('\n') ? `${s}\n` : s; };
    const out = [];
    let conflicts = 0, ib = 0, ia = 0, ic = 0;
    const anchors = [];
    for (let k = 0; k < B.length; k++) if (ma.has(k) && mc.has(k)) anchors.push(k);
    anchors.push(B.length);
    anchors.forEach((k) => {
      const last = k === B.length;
      const ea = last ? A.length : ma.get(k), ec = last ? C.length : mc.get(k);
      const sb = B.slice(ib, k), sa = A.slice(ia, ea), sc = C.slice(ic, ec);
      if (same(sa, sb)) out.push(...sc);
      else if (same(sc, sb) || same(sa, sc)) out.push(...sa);
      else {
        conflicts++;
        out.push(`<<<<<<< ${labels[0]}\n`, block(sa), '=======\n', block(sc), `>>>>>>> ${labels[1]}\n`);
      }
      if (!last) { out.push(B[k]); ib = k + 1; ia = ea + 1; ic = ec + 1; }
    });
    return { text: out.join(''), conflicts };
  }

  // Merge whole snapshots ({ name: content }); undefined means "no such file".
  function mergeFiles(base, ours, theirs, labels) {
    const names = [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort();
    const files = {};
    const conflicts = [];
    const kinds = {};
    names.forEach((n) => {
      const b = base[n], o = ours[n], t = theirs[n];
      let result;
      if (o === t) result = o;
      else if (o === b) result = t;
      else if (t === b) result = o;
      else if (o === undefined || t === undefined) {
        result = o === undefined ? t : o;
        conflicts.push(n); kinds[n] = 'modify/delete';
      } else {
        const m = merge3(b || '', o, t, labels);
        result = m.text;
        if (m.conflicts) { conflicts.push(n); kinds[n] = b === undefined ? 'add/add' : 'content'; }
      }
      if (result !== undefined) files[n] = result;
    });
    return { files, conflicts, kinds };
  }

  // ── Command line ────────────────────────────────────────────
  function tokenize(line) {
    const out = [];
    const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(>>|>)|([^\s"'>]+)/g;
    let m;
    while ((m = re.exec(line))) {
      if (m[1] !== undefined) out.push({ text: m[1].replace(/\\(.)/g, '$1'), quoted: true });
      else if (m[2] !== undefined) out.push({ text: m[2], quoted: true });
      else out.push({ text: m[3] || m[4], quoted: false, redirect: !!m[3] });
    }
    return out;
  }

  const FILE_NAME = /^[\w][\w.-]{0,40}$/;
  const BRANCH_NAME = /^(?!-)(?!.*\.\.)[\w./-]{1,40}$/;

  // ── The repository ──────────────────────────────────────────
  class Repo {
    constructor({ files = {}, time = START, author = AUTHOR } = {}) {
      this.objects = {};       // sha -> { type, size, data }
      this.order = [];         // commits in creation order (for drawing)
      this.refs = {};          // branch -> sha (an unborn branch is simply missing)
      this.head = { ref: 'main' };
      this.index = {};         // name -> blob sha
      this.work = { ...files }; // name -> content
      this.reflog = [];        // HEAD moves, oldest first: { sha, msg }
      this.merging = null;     // { theirs, label, conflicts: [] }
      this.time = time;
      this.author = author;
      this.ev = { created: [], moved: [] };
    }

    // Objects
    store(type, body, data) {
      const bytes = asBytes(body);
      const sha = hashObject(type, bytes);
      if (!this.objects[sha]) {
        this.objects[sha] = { type, size: bytes.length, data, seq: this.seq = (this.seq || 0) + 1 };
        if (type === 'commit') this.order.push(sha);
        this.ev.created.push(sha);
      }
      return sha;
    }
    writeBlob(content) { return this.store('blob', content, content); }
    writeTree(map) {
      const entries = Object.keys(map).sort().map((name) => ({ mode: '100644', name, sha: map[name] }));
      return this.store('tree', treeBody(entries), entries);
    }
    writeCommit(tree, parents, message) {
      const time = this.time;
      this.time += STEP;
      const body = commitBody({ tree, parents, author: this.author, time, message });
      return this.store('commit', body, { tree, parents: parents.slice(), time, message, author: this.author });
    }
    obj(sha) { return sha ? this.objects[sha] || null : null; }
    commit(sha) { const o = this.obj(sha); return o && o.type === 'commit' ? o.data : null; }
    treeMap(treeSha) { const map = {}; (this.objects[treeSha].data || []).forEach((e) => { map[e.name] = e.sha; }); return map; }
    blobsOf(commitSha) { return commitSha ? this.treeMap(this.commit(commitSha).tree) : {}; }
    filesOf(commitSha) {
      const out = {};
      Object.entries(this.blobsOf(commitSha)).forEach(([n, s]) => { out[n] = this.objects[s].data; });
      return out;
    }
    raw(sha) {
      const o = this.objects[sha];
      if (o.type === 'blob') return o.data;
      if (o.type === 'tree') return o.data.map((e) => `${e.mode} blob ${e.sha}\t${e.name}`).join('\n') + (o.data.length ? '\n' : '');
      return commitBody(o.data);
    }
    subject(sha) { return this.commit(sha).message.split('\n')[0]; }
    short(sha) { return sha ? sha.slice(0, SHORT) : ''; }

    // Refs and HEAD
    headSha() { return this.head.ref ? this.refs[this.head.ref] || null : this.head.sha; }
    branch() { return this.head.ref || null; }
    setRef(name, sha) {
      const from = this.refs[name] || null;
      this.refs[name] = sha;
      if (from !== sha) this.ev.moved.push({ ref: name, from, to: sha });
    }
    moveHead(sha, msg) {
      if (this.head.ref) this.setRef(this.head.ref, sha);
      else {
        const from = this.head.sha;
        this.head = { sha };
        if (from !== sha) this.ev.moved.push({ ref: 'HEAD', from, to: sha });
      }
      this.reflog.push({ sha, msg });
    }
    // HEAD itself changes target (another branch, or a commit when detaching)
    pointHead(head, msg) {
      const fromSha = this.headSha();
      const fromName = this.head.ref || null;
      this.head = head;
      this.ev.moved.push({ ref: 'HEAD', from: fromSha, to: this.headSha(), fromName, toName: head.ref || null });
      this.reflog.push({ sha: this.headSha(), msg });
    }

    // Revisions: HEAD, @, HEAD@{n}, branch, hash prefix, then ~n and ^n
    resolveBase(name) {
      if (name === 'HEAD' || name === '@') return this.headSha();
      const rl = /^(?:HEAD)?@\{(\d+)\}$/.exec(name);
      if (rl) { const e = this.reflog[this.reflog.length - 1 - Number(rl[1])]; return e ? e.sha : null; }
      if (Object.prototype.hasOwnProperty.call(this.refs, name)) return this.refs[name];
      if (/^[0-9a-f]{4,40}$/.test(name)) {
        const hits = Object.keys(this.objects).filter((s) => s.startsWith(name));
        if (hits.length > 1) throw new GitError(`error: short object ID ${name} is ambiguous`);
        return hits[0] || null;
      }
      return null;
    }
    resolve(rev) {
      if (!rev) return null;
      const m = /^(.+?)((?:[~^]\d*)*)$/.exec(rev);
      if (!m) return null;
      let sha = this.resolveBase(m[1]);
      const ops = [...m[2].matchAll(/([~^])(\d*)/g)];
      for (const [, op, digits] of ops) {
        if (!sha || !this.commit(sha)) return null;
        const n = digits === '' ? 1 : Number(digits);
        if (op === '~') {
          for (let i = 0; i < n && sha; i++) sha = this.commit(sha).parents[0] || null;
        } else if (n > 0) sha = this.commit(sha).parents[n - 1] || null;
      }
      return sha;
    }
    commitish(rev) {
      const sha = this.resolve(rev);
      if (!sha || !this.commit(sha)) {
        throw new GitError(`fatal: '${rev}' is not a commit`,
          T('Ese nombre no lleva a ningún commit. Prueba con una rama, HEAD, HEAD~1 o los primeros caracteres de un hash.', 'That name does not lead to any commit. Try a branch, HEAD, HEAD~1 or the first characters of a hash.'));
      }
      return sha;
    }

    // History
    ancestors(sha) {
      const seen = new Set();
      const stack = sha ? [sha] : [];
      while (stack.length) {
        const s = stack.pop();
        if (seen.has(s)) continue;
        seen.add(s);
        this.commit(s).parents.forEach((p) => stack.push(p));
      }
      return seen;
    }
    isAncestor(a, b) { return !!a && !!b && this.ancestors(b).has(a); }
    mergeBase(a, b) {
      const A = this.ancestors(a);
      const common = [...this.ancestors(b)].filter((s) => A.has(s));
      const best = common.filter((c) => !common.some((d) => d !== c && this.isAncestor(c, d)));
      return best.sort((x, y) => this.order.indexOf(y) - this.order.indexOf(x))[0] || null;
    }
    reachable() {
      const tips = [...Object.values(this.refs), this.headSha()].filter(Boolean);
      const all = new Set();
      tips.forEach((t) => this.ancestors(t).forEach((s) => all.add(s)));
      return all;
    }
    decorations(sha) {
      const out = [];
      const names = Object.keys(this.refs).filter((n) => this.refs[n] === sha).sort();
      if (!this.head.ref && this.head.sha === sha) out.push('HEAD');
      names.forEach((n) => out.push(this.head.ref === n ? `HEAD -> ${n}` : n));
      return out.sort((x, y) => (y.startsWith('HEAD') ? 1 : 0) - (x.startsWith('HEAD') ? 1 : 0));
    }

    // Working tree, index and HEAD compared
    status() {
      const H = this.blobsOf(this.headSha()), I = this.index, W = this.work;
      const conflicts = this.merging ? this.merging.conflicts.slice() : [];
      const staged = [], unstaged = [], untracked = [];
      [...new Set([...Object.keys(H), ...Object.keys(I)])].sort().forEach((n) => {
        if (conflicts.includes(n)) return;
        if (!(n in H)) staged.push({ name: n, kind: 'new' });
        else if (!(n in I)) staged.push({ name: n, kind: 'deleted' });
        else if (H[n] !== I[n]) staged.push({ name: n, kind: 'modified' });
      });
      Object.keys(I).sort().forEach((n) => {
        if (conflicts.includes(n)) return;
        if (!(n in W)) unstaged.push({ name: n, kind: 'deleted' });
        else if (hashBlob(W[n]) !== I[n]) unstaged.push({ name: n, kind: 'modified' });
      });
      Object.keys(W).sort().forEach((n) => { if (!(n in I) && !conflicts.includes(n)) untracked.push(n); });
      return { staged, unstaged, untracked, conflicts };
    }
    dirty() { const s = this.status(); return s.staged.length + s.unstaged.length + s.conflicts.length > 0; }
    requireClean(what) {
      if (this.merging) throw new GitError('error: you have not concluded your merge (MERGE_HEAD exists).', T('Hay un merge a medias: termínalo con git commit o cancélalo con git merge --abort.', 'There is a merge in progress: finish it with git commit or cancel it with git merge --abort.'));
      if (this.dirty()) {
        throw new GitError(`error: your local changes would be overwritten by ${what}.\nPlease commit your changes before you continue.`,
          T('Tienes cambios sin commit. En este taller, primero haz commit (o git reset --hard para descartarlos).', 'You have uncommitted changes. In this workshop, commit them first (or git reset --hard to throw them away).'));
      }
    }
    requireCommit() {
      if (!this.headSha()) throw new GitError(`fatal: your current branch '${this.head.ref}' does not have any commits yet`,T('Todavía no hay commits. Haz el primero con git add y git commit.', 'There are no commits yet. Make the first one with git add and git commit.'));
    }

    // Replace index and working tree with a commit (untracked files stay)
    checkout(sha) {
      const keep = {};
      Object.keys(this.work).forEach((n) => { if (!(n in this.index)) keep[n] = this.work[n]; });
      this.index = this.blobsOf(sha);
      this.work = { ...keep, ...this.filesOf(sha) };
    }

    // Run one command line. Never throws: errors come back with ok = false.
    run(line) {
      this.ev = { created: [], moved: [] };
      let res;
      try {
        res = this.exec(tokenize(String(line || '').trim())) || {};
      } catch (e) {
        if (!(e instanceof GitError)) throw e;
        res = { ok: false, out: e.message, note: e.note };
      }
      return { ok: res.ok !== false, out: res.out || '', note: res.note || '', clear: !!res.clear, created: this.ev.created.slice(), moved: this.ev.moved.slice() };
    }

    exec(tokens) {
      if (!tokens.length) return { out: '' };
      const cmd = tokens[0].text;
      const args = tokens.slice(1);
      const words = args.map((a) => a.text);
      switch (cmd) {
        case 'help': return this.help();
        case 'clear': return { clear: true };
        case 'ls': return { out: Object.keys(this.work).sort().join('  ') };
        case 'cat': {
          if (!words.length) throw new GitError('usage: cat <file>');
          return { out: words.map((f) => { if (!(f in this.work)) throw new GitError(`cat: ${f}: No such file or directory`); return this.work[f].replace(/\n$/, ''); }).join('\n') };
        }
        case 'echo': return this.echo(args);
        case 'touch': {
          words.forEach((f) => { this.checkName(f); if (!(f in this.work)) this.work[f] = ''; });
          return { note: T('Archivo creado en tu directorio de trabajo. Git todavía no lo sigue.', 'File created in your working directory. Git is not tracking it yet.') };
        }
        case 'rm': {
          words.forEach((f) => { if (!(f in this.work)) throw new GitError(`rm: cannot remove '${f}': No such file or directory`); delete this.work[f]; });
          return { note: T('Borraste el archivo de tu directorio de trabajo. Para que el borrado entre al próximo commit, usa git add (o git rm).', 'You deleted the file from your working directory. For the deletion to go into the next commit, use git add (or git rm).') };
        }
        case 'git': return this.git(words);
        default:
          throw new GitError(`${cmd}: command not found`, T('En este taller hay git y unos pocos comandos de consola: escribe help para verlos.', 'This workshop has git and a few shell commands: type help to see them.'));
      }
    }

    checkName(f) {
      if (!FILE_NAME.test(f)) throw new GitError(`error: invalid file name '${f}'`, T('Usa nombres simples, sin carpetas ni espacios: notas.txt, app.py...', 'Use simple names, without folders or spaces: notes.txt, app.py...'));
    }

    echo(args) {
      const r = args.findIndex((a) => a.redirect);
      const text = (r === -1 ? args : args.slice(0, r)).map((a) => a.text).join(' ');
      if (r === -1) return { out: text };
      const file = args[r + 1] && args[r + 1].text;
      if (!file) throw new GitError('syntax error near unexpected token `newline\'');
      this.checkName(file);
      const append = args[r].text === '>>';
      this.work[file] = (append && this.work[file] ? this.work[file] : '') + `${text}\n`;
      const tracked = file in this.index;
      return {
        note: tracked
          ? T(`Cambiaste ${file} en tu directorio de trabajo. Git lo nota, pero no entra al próximo commit hasta que hagas git add.`, `You changed ${file} in your working directory. Git notices, but it will not go into the next commit until you run git add.`)
          : T(`Creaste ${file}. Para Git es un archivo sin seguimiento (untracked) hasta que hagas git add.`, `You created ${file}. To Git it is an untracked file until you run git add.`)
      };
    }

    help() {
      return {
        out: [
          'git status | add <file>|. | commit -m "msg" [-a] | log [--oneline] [--all]',
          'git branch [name] [-d name] | switch [-c] <branch> | checkout [-b] <branch|commit>',
          'git merge <branch> [--no-ff] [--abort] | rebase <branch> | reset [--soft|--mixed|--hard] <commit>',
          'git revert <commit> | reflog | cat-file -t|-p|-s <hash> | hash-object [-w] <file> | rev-parse <rev>',
          'git checkout --ours|--theirs <file> | rm <file> | restore [--staged] <file>',
          'ls | cat <file> | echo "text" > <file> | echo "text" >> <file> | touch <file> | rm <file> | clear'
        ].join('\n'),
        note: T('Las revisiones aceptan HEAD, HEAD~2, HEAD^2, HEAD@{1}, ramas y los primeros 4 o más caracteres de un hash.', 'Revisions accept HEAD, HEAD~2, HEAD^2, HEAD@{1}, branches and the first 4 or more characters of a hash.')
      };
    }

    // ── git <subcommand> ──────────────────────────────────────
    git(w) {
      const sub = w[0];
      const a = w.slice(1);
      const map = {
        status: 'gStatus', add: 'gAdd', commit: 'gCommit', log: 'gLog', branch: 'gBranch', switch: 'gSwitch', checkout: 'gCheckout',
        merge: 'gMerge', rebase: 'gRebase', reset: 'gReset', revert: 'gRevert', reflog: 'gReflog', 'cat-file': 'gCatFile',
        'hash-object': 'gHashObject', 'rev-parse': 'gRevParse', rm: 'gRm', restore: 'gRestore'
      };
      if (!sub) return this.help();
      if (sub === 'init') return { out: 'Reinitialized existing Git repository in /taller/.git/', note: T('Este repositorio ya existe: el taller lo creó por ti.', 'This repository already exists: the workshop created it for you.') };
      if (!map[sub]) throw new GitError(`git: '${sub}' is not a git command. See 'git --help'.`, T('Ese comando no está en el taller. Escribe help para ver los que sí.', 'That command is not in the workshop. Type help to see the ones that are.'));
      return this[map[sub]](a);
    }

    gStatus() {
      const s = this.status();
      const lines = [];
      const sha = this.headSha();
      lines.push(this.head.ref ? `On branch ${this.head.ref}` : `HEAD detached at ${this.short(sha)}`);
      if (!sha) lines.push('', 'No commits yet');
      if (this.merging) lines.push('You have unmerged paths.', '  (fix conflicts and run "git commit")', '  (use "git merge --abort" to abort the merge)');
      const label = { new: 'new file:   ', modified: 'modified:   ', deleted: 'deleted:    ' };
      if (s.staged.length) lines.push('', 'Changes to be committed:', ...s.staged.map((f) => `\t${label[f.kind]}${f.name}`));
      if (s.conflicts.length) lines.push('', 'Unmerged paths:', '  (use "git add <file>..." to mark resolution)', ...s.conflicts.map((f) => `\tboth modified:   ${f}`));
      if (s.unstaged.length) lines.push('', 'Changes not staged for commit:', ...s.unstaged.map((f) => `\t${label[f.kind]}${f.name}`));
      if (s.untracked.length) lines.push('', 'Untracked files:', ...s.untracked.map((f) => `\t${f}`));
      if (!s.staged.length && !s.unstaged.length && !s.conflicts.length) {
        lines.push('', s.untracked.length ? 'nothing added to commit but untracked files present (use "git add" to track)' : 'nothing to commit, working tree clean');
      }
      return {
        out: lines.join('\n'),
        note: T('status compara tres cosas: tu directorio de trabajo, el índice (lo que irá al próximo commit) y el último commit.', 'status compares three things: your working directory, the index (what goes into the next commit) and the last commit.')
      };
    }

    stage(name) {
      if (name in this.work) this.index[name] = this.writeBlob(this.work[name]);
      else if (name in this.index) delete this.index[name];
      else throw new GitError(`fatal: pathspec '${name}' did not match any files`, T('Ese archivo no existe. Usa ls para ver tus archivos.', 'That file does not exist. Use ls to see your files.'));
      if (this.merging) this.merging.conflicts = this.merging.conflicts.filter((c) => c !== name);
    }

    gAdd(a) {
      if (!a.length) throw new GitError('Nothing specified, nothing added.', T('Dile a git add qué archivo agregar, o usa git add . para todos.', 'Tell git add which file to add, or use git add . for all of them.'));
      const before = this.ev.created.length;
      const wasConflict = this.merging ? this.merging.conflicts.slice() : [];
      if (a.includes('.') || a.includes('-A') || a.includes('--all')) {
        [...new Set([...Object.keys(this.work), ...Object.keys(this.index)])].forEach((n) => this.stage(n));
      } else a.forEach((n) => this.stage(n));
      const resolved = wasConflict.filter((c) => !this.merging || !this.merging.conflicts.includes(c));
      const blobs = this.ev.created.length - before;
      let note = blobs
        ? T(`Git guardó ${blobs === 1 ? 'un blob nuevo' : `${blobs} blobs nuevos`} en su base de objetos y anotó los archivos en el índice. Todavía no hay commit.`, `Git stored ${blobs === 1 ? 'a new blob' : `${blobs} new blobs`} in its object store and wrote the files down in the index. There is no commit yet.`)
        : T('El índice quedó al día con tu directorio de trabajo. No hizo falta ningún blob nuevo: Git ya tenía ese contenido.', 'The index is up to date with your working directory. No new blob was needed: Git already had that content.');
      if (resolved.length) {
        const left = this.merging ? this.merging.conflicts.length : 0;
        note = left
          ? T(`Marcaste ${resolved.join(', ')} como resuelto. Faltan ${left} archivo(s) con conflicto.`, `You marked ${resolved.join(', ')} as resolved. ${left} conflicted file(s) left.`)
          : T('Conflicto resuelto. Termina el merge con git commit.', 'Conflict resolved. Finish the merge with git commit.');
        const pending = resolved.filter((n) => (this.work[n] || '').includes('<<<<<<<'));
        if (pending.length) note += T(` Ojo: ${pending.join(', ')} todavía tiene marcadores de conflicto.`, ` Careful: ${pending.join(', ')} still has conflict markers.`);
      }
      return { out: '', note };
    }

    gRm(a) {
      const files = a.filter((x) => !x.startsWith('-'));
      if (!files.length) throw new GitError('usage: git rm <file>');
      files.forEach((f) => {
        if (!(f in this.index)) throw new GitError(`fatal: pathspec '${f}' did not match any files`);
        delete this.index[f];
        delete this.work[f];
      });
      return { out: files.map((f) => `rm '${f}'`).join('\n'), note: T('git rm borra el archivo y anota el borrado en el índice, listo para el próximo commit.', 'git rm deletes the file and records the deletion in the index, ready for the next commit.') };
    }

    gRestore(a) {
      const staged = a.includes('--staged') || a.includes('-S');
      const files = a.filter((x) => !x.startsWith('-'));
      if (!files.length) throw new GitError('fatal: you must specify path(s) to restore');
      const H = this.blobsOf(this.headSha());
      files.forEach((f) => {
        if (staged) {
          if (f in H) this.index[f] = H[f]; else delete this.index[f];
        } else {
          if (!(f in this.index)) throw new GitError(`error: pathspec '${f}' did not match any file(s) known to git`);
          this.work[f] = this.objects[this.index[f]].data;
        }
      });
      return {
        out: '',
        note: staged
          ? T('Sacaste el archivo del índice: el cambio sigue en tu directorio de trabajo, pero ya no entra al próximo commit.', 'You took the file out of the index: the change is still in your working directory, but it will not go into the next commit.')
          : T('Descartaste tus cambios: el archivo volvió a lo que tiene el índice.', 'You discarded your changes: the file went back to what the index has.')
      };
    }

    gCommit(a) {
      let msg = null;
      let all = false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] === '-m' || a[i] === '--message') msg = a[++i];
        else if (a[i] === '-a' || a[i] === '--all') all = true;
        else if (a[i] === '-am') { all = true; msg = a[++i]; }
      }
      if (all) Object.keys(this.index).forEach((n) => { if (!this.merging || !this.merging.conflicts.includes(n)) this.stage(n); });
      if (this.merging && this.merging.conflicts.length) {
        throw new GitError(`error: Committing is not possible because you have unmerged files.\nU\t${this.merging.conflicts.join('\nU\t')}`,
          T('Primero resuelve cada conflicto (edita el archivo o usa git checkout --ours/--theirs) y márcalo con git add.', 'First resolve each conflict (edit the file or use git checkout --ours/--theirs) and mark it with git add.'));
      }
      if (!msg && this.merging) msg = `Merge ${this.merging.label}`;
      if (!msg) throw new GitError('Aborting commit due to empty commit message.', T('Agrega un mensaje: git commit -m "Lo que hiciste".', 'Add a message: git commit -m "What you did".'));
      const parent = this.headSha();
      const tree = this.writeTree(this.index);
      if (!this.merging && parent && this.commit(parent).tree === tree) {
        const s = this.status();
        throw new GitError(s.unstaged.length || s.untracked.length ? 'no changes added to commit (use "git add")' : 'nothing to commit, working tree clean',
          T('El índice es igual al último commit: no hay nada que guardar. ¿Te faltó git add?', 'The index is the same as the last commit: there is nothing to save. Did you forget git add?'));
      }
      if (!parent && !Object.keys(this.index).length) throw new GitError('nothing to commit (create/copy files and use "git add" to track)', T('Agrega algún archivo al índice antes del primer commit.', 'Add some file to the index before the first commit.'));
      const parents = parent ? [parent] : [];
      const merging = this.merging;
      if (merging) parents.push(merging.theirs);
      const sha = this.writeCommit(tree, parents, msg);
      const kind = !parent ? 'commit (initial)' : merging ? 'commit (merge)' : 'commit';
      this.moveHead(sha, `${kind}: ${msg}`);
      this.merging = null;
      const where = this.head.ref || 'detached HEAD';
      const changed = this.changedCount(parent, sha);
      const where2 = this.head.ref
        ? T(`La rama ${this.head.ref} ahora apunta al commit nuevo.`, `The ${this.head.ref} branch now points to the new commit.`)
        : T('Ojo: HEAD está separado, así que este commit no está en ninguna rama.', 'Careful: HEAD is detached, so this commit is not on any branch.');
      return {
        out: `[${where}${parent ? '' : ' (root-commit)'} ${this.short(sha)}] ${msg}\n ${changed} file${changed === 1 ? '' : 's'} changed`,
        note: merging
          ? T(`Commit de merge: tiene dos padres, ${this.short(parents[0])} y ${this.short(parents[1])}. ${where2}`, `Merge commit: it has two parents, ${this.short(parents[0])} and ${this.short(parents[1])}. ${where2}`)
          : T(`Git creó un árbol (la foto de tus archivos) y un commit que apunta a ese árbol${parent ? ' y a su padre' : ''}. ${where2}`, `Git created a tree (the snapshot of your files) and a commit that points to that tree${parent ? ' and to its parent' : ''}. ${where2}`)
      };
    }

    changedCount(from, to) {
      const A = this.blobsOf(from), B = this.blobsOf(to);
      return [...new Set([...Object.keys(A), ...Object.keys(B)])].filter((n) => A[n] !== B[n]).length;
    }

    gLog(a) {
      const oneline = a.includes('--oneline');
      const all = a.includes('--all');
      const revs = a.filter((x) => !x.startsWith('-'));
      let shas;
      if (all) shas = this.reachable();
      else {
        const start = revs.length ? this.commitish(revs[0]) : this.headSha();
        if (!start) this.requireCommit();
        shas = this.ancestors(start);
      }
      const list = this.order.filter((s) => shas.has(s)).reverse();
      const deco = (s) => { const d = this.decorations(s); return d.length ? ` (${d.join(', ')})` : ''; };
      const out = oneline
        ? list.map((s) => `${this.short(s)}${deco(s)} ${this.subject(s)}`).join('\n')
        : list.map((s) => {
          const c = this.commit(s);
          const merge = c.parents.length > 1 ? `\nMerge: ${c.parents.map((p) => this.short(p)).join(' ')}` : '';
          return `commit ${s}${deco(s)}${merge}\nAuthor: ${c.author.name} <${c.author.email}>\nDate:   ${gitDate(c.time, c.author.tz)}\n\n${c.message.split('\n').map((l) => `    ${l}`).join('\n')}`;
        }).join('\n\n');
      return { out, note: T('log recorre los commits desde HEAD siguiendo a los padres. Los nombres entre paréntesis son las ramas que apuntan ahí.', 'log walks the commits from HEAD by following the parents. The names in parentheses are the branches that point there.') };
    }

    gBranch(a) {
      if (!a.length || a[0] === '--list') {
        const lines = [];
        if (!this.head.ref) lines.push(`* (HEAD detached at ${this.short(this.head.sha)})`);
        Object.keys(this.refs).sort().forEach((n) => lines.push(`${this.head.ref === n ? '*' : ' '} ${n}`));
        return { out: lines.join('\n'), note: T('Cada rama es solo un nombre que apunta a un commit. El asterisco marca la rama donde está HEAD.', 'Each branch is just a name that points to a commit. The asterisk marks the branch HEAD is on.') };
      }
      if (a[0] === '-d' || a[0] === '-D') {
        const name = a[1];
        if (!name || !(name in this.refs)) throw new GitError(`error: branch '${name || ''}' not found.`);
        if (this.head.ref === name) throw new GitError(`error: Cannot delete branch '${name}' checked out`, T('No puedes borrar la rama en la que estás. Cámbiate de rama primero.', 'You cannot delete the branch you are on. Switch branches first.'));
        if (a[0] === '-d' && !this.isAncestor(this.refs[name], this.headSha())) {
          throw new GitError(`error: The branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.`,
            T('Esa rama tiene commits que no están en tu rama actual. Si la borras, solo el reflog los recordaría.', 'That branch has commits that are not on your current branch. If you delete it, only the reflog would remember them.'));
        }
        const sha = this.refs[name];
        delete this.refs[name];
        this.ev.moved.push({ ref: name, from: sha, to: null });
        return { out: `Deleted branch ${name} (was ${this.short(sha)}).`, note: T('Borraste el nombre, no los commits: siguen en la base de objetos.', 'You deleted the name, not the commits: they are still in the object store.') };
      }
      const name = a[0];
      this.requireCommit();
      if (!BRANCH_NAME.test(name)) throw new GitError(`fatal: '${name}' is not a valid branch name`);
      if (name in this.refs) throw new GitError(`fatal: a branch named '${name}' already exists`);
      const sha = a[1] ? this.commitish(a[1]) : this.headSha();
      this.setRef(name, sha);
      return { out: '', note: T(`Creaste la rama ${name}: un puntero nuevo a ${this.short(sha)}. No se copió ningún archivo. HEAD sigue donde estaba.`, `You created the ${name} branch: a new pointer to ${this.short(sha)}. No file was copied. HEAD stays where it was.`) };
    }

    switchTo(name, create, start) {
      if (create) {
        if (!BRANCH_NAME.test(name || '')) throw new GitError(`fatal: '${name}' is not a valid branch name`);
        if (name in this.refs) throw new GitError(`fatal: a branch named '${name}' already exists`);
        this.requireCommit();
        const sha = start ? this.commitish(start) : this.headSha();
        if (sha !== this.headSha()) this.requireClean('checkout');
        const from = this.head.ref || this.short(this.headSha());
        this.setRef(name, sha);
        if (sha !== this.headSha()) this.checkout(sha);
        this.pointHead({ ref: name }, `checkout: moving from ${from} to ${name}`);
        return {
          out: `Switched to a new branch '${name}'`,
          note: T(`Creaste ${name} y te pasaste a ella. HEAD ahora apunta a ${name}, que apunta al mismo commit: tus archivos no cambiaron.`, `You created ${name} and moved onto it. HEAD now points to ${name}, which points to the same commit: your files did not change.`)
        };
      }
      if (!(name in this.refs)) {
        throw new GitError(`fatal: invalid reference: ${name}`, T('No existe una rama con ese nombre. Para crearla y pasarte a ella: git switch -c nombre.', 'There is no branch with that name. To create it and move onto it: git switch -c name.'));
      }
      if (this.head.ref === name) return { out: `Already on '${name}'` };
      const target = this.refs[name];
      if (target !== this.headSha()) this.requireClean('checkout');
      const from = this.head.ref || this.short(this.headSha());
      const wasDetached = !this.head.ref;
      const orphan = wasDetached && !Object.values(this.refs).some((s) => this.isAncestor(this.head.sha, s)) ? this.head.sha : null;
      this.checkout(target);
      this.pointHead({ ref: name }, `checkout: moving from ${from} to ${name}`);
      let out = `Switched to branch '${name}'`;
      let note = T(`HEAD ahora apunta a ${name}. Git cambió tus archivos por los del commit ${this.short(target)}.`, `HEAD now points to ${name}. Git replaced your files with the ones in commit ${this.short(target)}.`);
      if (orphan) {
        out = `Warning: you are leaving 1 commit behind, not connected to\nany of your branches:\n\n  ${this.short(orphan)} ${this.subject(orphan)}\n\n${out}`;
        note = T(`Dejaste atrás ${this.short(orphan)}: ya no está en ninguna rama. Todavía puedes rescatarlo con git branch nombre ${this.short(orphan)} (el reflog lo recuerda).`, `You left ${this.short(orphan)} behind: it is no longer on any branch. You can still rescue it with git branch name ${this.short(orphan)} (the reflog remembers it).`);
      }
      return { out, note };
    }

    detach(rev) {
      const sha = this.commitish(rev);
      if (sha !== this.headSha()) this.requireClean('checkout');
      const from = this.head.ref || this.short(this.headSha());
      this.checkout(sha);
      this.pointHead({ sha }, `checkout: moving from ${from} to ${this.short(sha)}`);
      return {
        out: `Note: switching to '${rev}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nHEAD is now at ${this.short(sha)} ${this.subject(sha)}`,
        note: T('HEAD separado: HEAD apunta directo a un commit, no a una rama. Si haces commits aquí, crea una rama antes de irte o se quedarán sin nombre.', 'Detached HEAD: HEAD points straight to a commit, not to a branch. If you commit here, create a branch before leaving or those commits will have no name.')
      };
    }

    gSwitch(a) {
      if (a[0] === '-c' || a[0] === '--create') return this.switchTo(a[1], true, a[2]);
      if (a[0] === '--detach' || a[0] === '-d') return this.detach(a[1] || 'HEAD');
      if (!a[0]) throw new GitError('fatal: missing branch or commit argument');
      if (!(a[0] in this.refs) && this.resolve(a[0])) {
        throw new GitError(`fatal: a branch is expected, got commit '${a[0]}'\nhint: If you want to detach HEAD at the commit, try again with the --detach option.`,
          T('switch solo cambia de rama. Para pararte en un commit: git switch --detach o git checkout con el hash.', 'switch only changes branches. To stand on a commit: git switch --detach or git checkout with the hash.'));
      }
      return this.switchTo(a[0], false);
    }

    gCheckout(a) {
      if (a[0] === '-b') return this.switchTo(a[1], true, a[2]);
      if (a[0] === '--ours' || a[0] === '--theirs') {
        if (!this.merging) throw new GitError('error: --ours/--theirs only make sense during a merge');
        const side = a[0] === '--ours' ? this.filesOf(this.headSha()) : this.filesOf(this.merging.theirs);
        a.slice(1).forEach((f) => {
          if (!this.merging.conflicts.includes(f)) throw new GitError(`error: path '${f}' does not have a conflict`);
          if (f in side) this.work[f] = side[f]; else delete this.work[f];
        });
        return { out: '', note: T(`Te quedaste con la versión ${a[0] === '--ours' ? 'de tu rama (ours)' : 'de la otra rama (theirs)'}. Ahora márcalo como resuelto con git add.`, `You kept the version ${a[0] === '--ours' ? 'from your branch (ours)' : 'from the other branch (theirs)'}. Now mark it as resolved with git add.`) };
      }
      if (a[0] === '--') return this.gRestore(a.slice(1));
      if (!a[0]) throw new GitError('fatal: you must specify a branch or commit');
      if (a[0] in this.refs) return this.switchTo(a[0], false);
      if (this.resolve(a[0])) return this.detach(a[0]);
      if (a[0] in this.index) return this.gRestore(a);
      throw new GitError(`error: pathspec '${a[0]}' did not match any file(s) known to git`);
    }

    gMerge(a) {
      if (a[0] === '--abort') {
        if (!this.merging) throw new GitError('fatal: There is no merge to abort (MERGE_HEAD missing).');
        this.merging = null;
        this.index = {};
        this.checkout(this.headSha());
        return { out: '', note: T('Merge cancelado: todo volvió a como estaba antes de git merge.', 'Merge cancelled: everything went back to how it was before git merge.') };
      }
      const noFF = a.includes('--no-ff');
      const rev = a.filter((x) => !x.startsWith('-'))[0];
      if (!rev) throw new GitError('fatal: No remote for the current branch.', T('Dile a git merge qué rama unir: git merge nombre.', 'Tell git merge which branch to bring in: git merge name.'));
      this.requireCommit();
      this.requireClean('merge');
      const ours = this.headSha();
      const theirs = this.commitish(rev);
      const label = rev in this.refs ? `branch '${rev}'` : `commit '${this.short(theirs)}'`;
      if (this.isAncestor(theirs, ours)) {
        return { out: 'Already up to date.', note: T('Todo lo de esa rama ya está en la tuya: no hay nada que unir.', 'Everything on that branch is already on yours: there is nothing to merge.') };
      }
      if (this.isAncestor(ours, theirs) && !noFF) {
        this.checkout(theirs);
        this.moveHead(theirs, `merge ${rev}: Fast-forward`);
        return {
          out: `Updating ${this.short(ours)}..${this.short(theirs)}\nFast-forward`,
          note: T(`Avance rápido: tu rama no tenía commits propios, así que Git solo movió el puntero hasta ${this.short(theirs)}. No hubo commit nuevo.`, `Fast-forward: your branch had no commits of its own, so Git just moved the pointer to ${this.short(theirs)}. There was no new commit.`)
        };
      }
      const base = this.mergeBase(ours, theirs);
      const [fb, fo, ft] = [this.filesOf(base), this.filesOf(ours), this.filesOf(theirs)];
      const m = mergeFiles(fb, fo, ft, ['HEAD', rev]);
      // Git only mentions the files both sides touched
      const lines = Object.keys(m.files).filter((n) => n in fo && n in ft && fo[n] !== fb[n] && ft[n] !== fb[n]).map((n) => `Auto-merging ${n}`);
      if (m.conflicts.length) {
        const oursBlobs = this.blobsOf(ours);
        this.index = {};
        Object.keys(m.files).forEach((n) => { if (!m.conflicts.includes(n)) this.index[n] = this.writeBlob(m.files[n]); else if (n in oursBlobs) this.index[n] = oursBlobs[n]; });
        const keep = {};
        Object.keys(this.work).forEach((n) => { if (!(n in oursBlobs)) keep[n] = this.work[n]; });
        this.work = { ...keep, ...m.files };
        this.merging = { theirs, label, conflicts: m.conflicts.slice() };
        return {
          ok: false,
          out: [...lines, ...m.conflicts.map((n) => `CONFLICT (${m.kinds[n]}): Merge conflict in ${n}`), 'Automatic merge failed; fix conflicts and then commit the result.'].join('\n'),
          note: T(`Conflicto: las dos ramas cambiaron las mismas líneas desde su ancestro común (${this.short(base)}). Abre el archivo con cat, decide qué queda (echo "..." > archivo, o git checkout --ours/--theirs), luego git add y git commit.`, `Conflict: both branches changed the same lines since their common ancestor (${this.short(base)}). Open the file with cat, decide what stays (echo "..." > file, or git checkout --ours/--theirs), then git add and git commit.`)
        };
      }
      const tree = this.writeTree(Object.fromEntries(Object.entries(m.files).map(([n, c]) => [n, this.writeBlob(c)])));
      const msg = `Merge ${label}`;
      const sha = this.writeCommit(tree, [ours, theirs], msg);
      this.checkout(sha);
      this.moveHead(sha, `merge ${rev}: Merge made by the 'ort' strategy.`);
      return {
        out: [...lines, "Merge made by the 'ort' strategy."].join('\n'),
        note: noFF && this.isAncestor(ours, theirs)
          ? T('Con --no-ff Git creó un commit de merge aunque podía avanzar rápido, para que quede registro de que esa rama existió.', 'With --no-ff Git created a merge commit even though it could fast-forward, so there is a record that the branch existed.')
          : T(`Merge de tres vías: Git comparó las dos puntas con su ancestro común (${this.short(base)}) y creó un commit con dos padres.`, `Three-way merge: Git compared both tips with their common ancestor (${this.short(base)}) and created a commit with two parents.`)
      };
    }

    gRebase(a) {
      const rev = a.filter((x) => !x.startsWith('-'))[0];
      if (a.includes('-i') || a.includes('--interactive')) throw new GitError('error: interactive rebase is not available in the workshop', T('El rebase interactivo abre un editor; aquí solo está git rebase rama.', 'Interactive rebase opens an editor; here there is only git rebase branch.'));
      if (!rev) throw new GitError('fatal: no upstream configured. Specify the branch to rebase onto.', T('Dile sobre qué rama poner tus commits: git rebase main.', 'Tell it which branch to put your commits on: git rebase main.'));
      this.requireCommit();
      this.requireClean('rebase');
      if (!this.head.ref) throw new GitError('fatal: rebase needs a branch in the workshop', T('Pásate a una rama antes de hacer rebase.', 'Move onto a branch before rebasing.'));
      const head = this.headSha();
      const onto = this.commitish(rev);
      const name = this.head.ref;
      if (this.isAncestor(onto, head)) return { out: `Current branch ${name} is up to date.`, note: T('Tu rama ya está encima de esa: no hay nada que mover.', 'Your branch is already on top of that one: there is nothing to move.') };
      if (this.isAncestor(head, onto)) {
        this.checkout(onto);
        this.moveHead(onto, `rebase (finish): refs/heads/${name} onto ${onto}`);
        return { out: `Successfully rebased and updated refs/heads/${name}.`, note: T('Tu rama no tenía commits propios: Git solo la movió hacia adelante.', 'Your branch had no commits of its own: Git just moved it forward.') };
      }
      const base = this.mergeBase(head, onto);
      const todo = [];
      for (let s = head; s && s !== base && !this.isAncestor(s, onto); s = this.commit(s).parents[0]) {
        if (this.commit(s).parents.length > 1) throw new GitError('error: the workshop does not rebase merge commits', T('Entre tu rama y la base hay un commit de merge. Rebase lo aplanaría; aquí no se permite.', 'There is a merge commit between your branch and the base. Rebase would flatten it; that is not allowed here.'));
        todo.unshift(s);
      }
      // Replay every commit; on a conflict nothing changes (the objects already written stay unreferenced)
      const saved = { time: this.time };
      let tip = onto;
      const picked = [];
      for (const c of todo) {
        const parent = this.commit(c).parents[0];
        const m = mergeFiles(this.filesOf(parent), this.filesOf(tip), this.filesOf(c), ['HEAD', this.short(c)]);
        if (m.conflicts.length) {
          this.time = saved.time;
          this.ev.created = this.ev.created.filter((s) => { if (this.objects[s].type === 'commit') { delete this.objects[s]; this.order.splice(this.order.indexOf(s), 1); return false; } return true; });
          throw new GitError(`CONFLICT (content): Merge conflict in ${m.conflicts[0]}\nerror: could not apply ${this.short(c)}... ${this.subject(c)}\nThe workshop aborted the rebase (git rebase --abort).`,
            T(`Al copiar ${this.short(c)} hubo un conflicto. Git real se detendría para que lo resuelvas; el taller cancela el rebase para que nada quede a medias. Prueba con git merge.`, `Copying ${this.short(c)} hit a conflict. Real Git would stop so you can resolve it; the workshop cancels the rebase so nothing is left halfway. Try git merge.`));
        }
        const tree = this.writeTree(Object.fromEntries(Object.entries(m.files).map(([n, x]) => [n, this.writeBlob(x)])));
        tip = this.writeCommit(tree, [tip], this.commit(c).message);
        picked.push([c, tip]);
      }
      this.checkout(tip);
      this.reflog.push({ sha: onto, msg: `rebase (start): checkout ${rev}` });
      picked.forEach(([c, n]) => this.reflog.push({ sha: n, msg: `rebase (pick): ${this.subject(c)}` }));
      this.setRef(name, tip);
      this.reflog.push({ sha: tip, msg: `rebase (finish): returning to refs/heads/${name}` });
      return {
        out: `Successfully rebased and updated refs/heads/${name}.`,
        note: T(`Rebase copió ${picked.length} commit(s) encima de ${rev}. Las copias tienen hashes nuevos porque cambió su padre; los originales quedaron sin rama (en gris).`, `Rebase copied ${picked.length} commit(s) on top of ${rev}. The copies have new hashes because their parent changed; the originals were left without a branch (in grey).`)
      };
    }

    gReset(a) {
      const modes = ['--soft', '--mixed', '--hard'];
      const mode = a.find((x) => modes.includes(x)) || '--mixed';
      const rest = a.filter((x) => !modes.includes(x));
      // git reset <file> unstages that file
      if (rest.length && !a.some((x) => modes.includes(x)) && rest.every((f) => !this.resolve(f) && (f in this.index || f in this.work))) return this.gRestore(['--staged', ...rest]);
      this.requireCommit();
      const target = this.commitish(rest[0] || 'HEAD');
      const before = this.headSha();
      const oldIndex = this.index;
      this.moveHead(target, `reset: moving to ${rest[0] || 'HEAD'}`);
      if (mode === '--hard') {
        // Untracked files survive a hard reset; everything Git tracks goes back to the commit
        const keep = {};
        Object.keys(this.work).forEach((n) => { if (!(n in oldIndex) && !(this.merging && this.merging.conflicts.includes(n))) keep[n] = this.work[n]; });
        this.work = { ...keep, ...this.filesOf(target) };
        this.merging = null;
      }
      if (mode !== '--soft') this.index = this.blobsOf(target);
      const lost = [...this.ancestors(before)].filter((s) => !this.reachable().has(s)).length;
      const lostNote = lost ? T(` ${lost} commit(s) quedaron sin rama, pero el reflog todavía los recuerda.`, ` ${lost} commit(s) were left without a branch, but the reflog still remembers them.`) : '';
      const s = this.status();
      const notes = {
        '--soft': T('reset --soft movió la rama y nada más: tus cambios siguen en el índice, listos para otro commit.', 'reset --soft moved the branch and nothing else: your changes are still in the index, ready for another commit.'),
        '--mixed': T('reset (mixed) movió la rama y vació el índice a ese commit: tus cambios siguen en tus archivos, sin agregar.', 'reset (mixed) moved the branch and reset the index to that commit: your changes are still in your files, unstaged.'),
        '--hard': T('reset --hard movió la rama, el índice y tus archivos: todo quedó como en ese commit. Lo que no estaba en un commit se perdió.', 'reset --hard moved the branch, the index and your files: everything is as it was in that commit. Whatever was not in a commit is gone.')
      };
      return {
        out: mode === '--hard' ? `HEAD is now at ${this.short(target)} ${this.subject(target)}` : (s.unstaged.length ? `Unstaged changes after reset:\n${s.unstaged.map((f) => `${f.kind === 'deleted' ? 'D' : 'M'}\t${f.name}`).join('\n')}` : ''),
        note: notes[mode] + lostNote
      };
    }

    gRevert(a) {
      const rev = a.filter((x) => !x.startsWith('-'))[0];
      if (!rev) throw new GitError('usage: git revert <commit>');
      this.requireCommit();
      this.requireClean('revert');
      const c = this.commitish(rev);
      const cc = this.commit(c);
      if (cc.parents.length > 1) throw new GitError(`error: commit ${this.short(c)} is a merge but no -m option was given.`, T('Revertir un merge necesita elegir un padre; el taller no lo incluye.', 'Reverting a merge needs you to pick a parent; the workshop does not include that.'));
      const parent = cc.parents[0] || null;
      const m = mergeFiles(this.filesOf(c), this.filesOf(this.headSha()), this.filesOf(parent), ['HEAD', `parent of ${this.short(c)}`]);
      if (m.conflicts.length) {
        throw new GitError(`error: could not revert ${this.short(c)}... ${this.subject(c)}\nThe workshop aborted the revert.`, T('Deshacer ese commit choca con cambios posteriores en las mismas líneas.', 'Undoing that commit clashes with later changes on the same lines.'));
      }
      const tree = this.writeTree(Object.fromEntries(Object.entries(m.files).map(([n, x]) => [n, this.writeBlob(x)])));
      const msg = `Revert "${this.subject(c)}"\n\nThis reverts commit ${c}.`;
      const sha = this.writeCommit(tree, [this.headSha()], msg);
      this.checkout(sha);
      this.moveHead(sha, `revert: Revert "${this.subject(c)}"`);
      return {
        out: `[${this.head.ref || 'detached HEAD'} ${this.short(sha)}] Revert "${this.subject(c)}"\n ${this.changedCount(c, parent)} file${this.changedCount(c, parent) === 1 ? '' : 's'} changed`,
        note: T(`Revert no borra historia: creó un commit nuevo que deshace los cambios de ${this.short(c)}. Es lo seguro cuando ese commit ya lo tienen otras personas.`, `Revert does not erase history: it created a new commit that undoes the changes of ${this.short(c)}. It is the safe choice when other people already have that commit.`)
      };
    }

    gReflog() {
      const out = this.reflog.slice().reverse().map((e, i) => `${this.short(e.sha)} HEAD@{${i}}: ${e.msg}`).join('\n');
      return { out, note: T('El reflog anota cada vez que HEAD se mueve. Aunque un commit ya no esté en ninguna rama, aquí sigue su hash: HEAD@{n} lo nombra.', 'The reflog writes down every time HEAD moves. Even if a commit is no longer on any branch, its hash is still here: HEAD@{n} names it.') };
    }

    gCatFile(a) {
      const flag = a.find((x) => ['-t', '-p', '-s'].includes(x));
      const rev = a.find((x) => !x.startsWith('-'));
      if (!flag || !rev) throw new GitError('usage: git cat-file (-t | -s | -p) <object>');
      let sha = this.resolve(rev);
      // <commit>^{tree} and <commit>:<file> reach inside a commit
      const tm = /^(.+)\^\{tree\}$/.exec(rev);
      if (tm) { const c = this.commitish(tm[1]); sha = this.commit(c).tree; }
      const fm = /^(.*):(.+)$/.exec(rev);
      if (!sha && fm) { const c = this.commitish(fm[1] || 'HEAD'); sha = this.blobsOf(c)[fm[2]] || null; }
      if (!sha) throw new GitError(`fatal: Not a valid object name ${rev}`);
      const o = this.objects[sha];
      if (flag === '-t') return { out: o.type, note: T('Hay tres tipos de objeto: blob (contenido), tree (lista de archivos) y commit (foto + padres + autor + mensaje).', 'There are three kinds of object: blob (content), tree (a list of files) and commit (snapshot + parents + author + message).') };
      if (flag === '-s') return { out: String(o.size), note: T('El tamaño es el del cuerpo, sin el encabezado "tipo tamaño\\0".', 'The size is the size of the body, without the "type size\\0" header.') };
      const notes = {
        blob: T('Un blob es solo el contenido: ni nombre ni fecha. Por eso dos archivos iguales comparten el mismo blob.', 'A blob is only the content: no name and no date. That is why two identical files share the same blob.'),
        tree: T('Un árbol lista los archivos: permisos, tipo, hash del blob y nombre. Es la foto de una carpeta.', 'A tree lists the files: mode, type, blob hash and name. It is the snapshot of a folder.'),
        commit: T('Un commit apunta a un árbol y a su(s) padre(s), y guarda autor, fecha y mensaje. Cambia cualquier cosa y cambia el hash.', 'A commit points to a tree and to its parent(s), and stores the author, date and message. Change anything and the hash changes.')
      };
      return { out: this.raw(sha).replace(/\n$/, ''), note: notes[o.type] };
    }

    gHashObject(a) {
      const write = a.includes('-w');
      const f = a.find((x) => !x.startsWith('-'));
      if (!f) throw new GitError('usage: git hash-object [-w] <file>');
      if (!(f in this.work)) throw new GitError(`fatal: could not open '${f}' for reading: No such file or directory`);
      const sha = write ? this.writeBlob(this.work[f]) : hashBlob(this.work[f]);
      return { out: sha, note: T(`El hash es el SHA-1 de "blob ${utf8(this.work[f]).length}\\0" más el contenido. El mismo contenido da el mismo hash en cualquier computadora.`, `The hash is the SHA-1 of "blob ${utf8(this.work[f]).length}\\0" plus the content. The same content gives the same hash on any computer.`) };
    }

    gRevParse(a) {
      const rev = a.find((x) => !x.startsWith('-'));
      if (!rev) throw new GitError('usage: git rev-parse <rev>');
      const sha = this.resolve(rev);
      if (!sha) throw new GitError(`fatal: ambiguous argument '${rev}': unknown revision`);
      return { out: sha, note: T('rev-parse traduce un nombre (rama, HEAD~1, HEAD@{2}...) al hash completo del commit.', 'rev-parse turns a name (branch, HEAD~1, HEAD@{2}...) into the full commit hash.') };
    }

    // Quiet helpers for building scenarios
    file(name, content) { this.work[name] = content; return this; }
    sh(...lines) {
      lines.forEach((l) => { const r = this.run(l); if (!r.ok) throw new Error(`setup "${l}": ${r.out}`); });
      return this;
    }
  }

  // ── Missions ────────────────────────────────────────────────
  // Each one builds a repository, says what to do and checks when it is done.
  const SCENARIOS = [
    {
      id: 'first-commit', item: 'commit',
      title: T('Tu primer commit', 'Your first commit'),
      brief: T('Un proyecto recién creado con un README.md. Todavía no hay ningún commit.', 'A brand new project with a README.md. There are no commits yet.'),
      goal: T('Agrega README.md al índice y haz tu primer commit. Luego míralo por dentro.', 'Add README.md to the index and make your first commit. Then look inside it.'),
      hint: T('git add README.md, luego git commit -m "Primer commit" y git cat-file -p HEAD.', 'git add README.md, then git commit -m "First commit" and git cat-file -p HEAD.'),
      tries: ['git status', 'git add README.md', `git commit -m "${T('Primer commit', 'First commit')}"`, 'git cat-file -p HEAD'],
      setup: (r) => r.file('README.md', T('# Mi proyecto\n', '# My project\n')),
      check: (r) => !!r.headSha()
    },
    {
      id: 'branch', item: 'branch',
      title: T('Una rama es un puntero', 'A branch is a pointer'),
      brief: T('main tiene dos commits. Quieres probar una idea sin tocar main.', 'main has two commits. You want to try an idea without touching main.'),
      goal: T('Crea la rama feature, haz un commit en ella y regresa a main.', 'Create the feature branch, make a commit on it and go back to main.'),
      hint: T('git switch -c feature, cambia app.py con echo, git commit -am "Idea" y git switch main.', 'git switch -c feature, change app.py with echo, git commit -am "Idea" and git switch main.'),
      tries: ['git switch -c feature', 'echo "print(42)" >> app.py', 'git commit -am "Idea"', 'git switch main'],
      setup: (r) => r.file('README.md', T('# Mi proyecto\n', '# My project\n')).sh('git add .', `git commit -m "${T('Primer commit', 'First commit')}"`)
        .file('app.py', "print('hola')\n").sh('git add app.py', `git commit -m "${T('Agrega app.py', 'Add app.py')}"`),
      check: (r) => !!r.refs.feature && !r.isAncestor(r.refs.feature, r.refs.main) && r.head.ref === 'main'
    },
    {
      id: 'conflict', item: 'conflict',
      title: T('Conflicto con un compañero', 'Conflict with a teammate'),
      brief: T('Tú y tu compañero cambiaron la misma línea de las notas de la reunión, cada quien en su rama.', 'You and your teammate changed the same line of the meeting notes, each on your own branch.'),
      goal: T('Une la rama companero en main y resuelve el conflicto.', 'Merge the teammate branch into main and resolve the conflict.'),
      hint: T('git merge companero, cat notas.txt para ver los marcadores, decide (por ejemplo git checkout --theirs notas.txt), git add notas.txt y git commit.', 'git merge teammate, cat notes.txt to see the markers, decide (for example git checkout --theirs notes.txt), git add notes.txt and git commit.'),
      tries: [`git merge ${T('companero', 'teammate')}`, `cat ${T('notas.txt', 'notes.txt')}`, `git checkout --theirs ${T('notas.txt', 'notes.txt')}`, `git add ${T('notas.txt', 'notes.txt')}`, 'git commit'],
      setup: (r) => {
        const f = T('notas.txt', 'notes.txt'), mate = T('companero', 'teammate');
        r.file(f, T('Reunión: lunes\nTema: proyecto final\n', 'Meeting: Monday\nTopic: final project\n')).sh('git add .', `git commit -m "${T('Notas de la reunión', 'Meeting notes')}"`, `git branch ${mate}`, `git switch ${mate}`)
          .file(f, T('Reunión: martes\nTema: proyecto final\n', 'Meeting: Tuesday\nTopic: final project\n')).sh(`git commit -am "${T('Mueve la reunión al martes', 'Move the meeting to Tuesday')}"`, 'git switch main')
          .file(f, T('Reunión: miércoles\nTema: proyecto final\n', 'Meeting: Wednesday\nTopic: final project\n')).sh(`git commit -am "${T('Mueve la reunión al miércoles', 'Move the meeting to Wednesday')}"`);
      },
      check: (r) => {
        const c = r.commit(r.headSha());
        return !r.merging && !!c && c.parents.length === 2 && c.parents.includes(r.refs[T('companero', 'teammate')]);
      }
    },
    {
      id: 'revert', item: 'revert',
      title: T('Deshacer sin reescribir', 'Undo without rewriting'),
      brief: T('Subiste un archivo con una contraseña y tus compañeros ya descargaron ese commit.', 'You pushed a file with a password and your teammates already pulled that commit.'),
      goal: T('Deshaz el último commit sin borrar historia: clave.txt no debe quedar en HEAD.', 'Undo the last commit without erasing history: secret.txt must not remain in HEAD.'),
      hint: T('Mira la historia con git log --oneline y usa git revert HEAD.', 'Look at the history with git log --oneline and use git revert HEAD.'),
      tries: ['git log --oneline', 'git revert HEAD', 'git log --oneline'],
      setup: (r, marks) => {
        r.file('README.md', T('# Mi proyecto\n', '# My project\n')).sh('git add .', `git commit -m "${T('Inicio', 'Start')}"`)
          .file('login.py', 'def login(user):\n    return True\n').sh('git add .', `git commit -m "${T('Agrega login', 'Add login')}"`)
          .file(T('clave.txt', 'secret.txt'), 'password=1234\n').sh('git add .', `git commit -m "${T('Configura la base de datos', 'Configure the database')}"`);
        marks.bad = r.headSha();
      },
      check: (r, marks) => !(T('clave.txt', 'secret.txt') in r.filesOf(r.headSha())) && r.headSha() !== marks.bad && r.isAncestor(marks.bad, r.headSha())
    },
    {
      id: 'detached', item: 'detached',
      title: T('HEAD separado', 'Detached HEAD'),
      brief: T('Fuiste a ver un commit viejo e hiciste un commit ahí. HEAD apunta a un commit, no a una rama.', 'You went to look at an old commit and made a commit there. HEAD points to a commit, not to a branch.'),
      goal: T('Guarda el experimento en una rama para que no se pierda.', 'Keep the experiment on a branch so it is not lost.'),
      hint: T('git status te dice dónde estás. git switch -c experimento crea la rama justo ahí.', 'git status tells you where you are. git switch -c experiment creates the branch right there.'),
      tries: ['git status', 'git log --oneline --all', `git switch -c ${T('experimento', 'experiment')}`],
      setup: (r, marks) => {
        r.file('README.md', T('# Mi proyecto\n', '# My project\n')).sh('git add .', `git commit -m "${T('Inicio', 'Start')}"`)
          .file('app.py', "print('v1')\n").sh('git add .', 'git commit -m "v1"')
          .file('app.py', "print('v2')\n").sh('git commit -am "v2"', 'git checkout HEAD~2')
          .file(T('idea.txt', 'idea.txt'), T('Probar otro algoritmo\n', 'Try another algorithm\n')).sh('git add .', `git commit -m "${T('Experimento', 'Experiment')}"`);
        marks.exp = r.headSha();
      },
      check: (r, marks) => Object.values(r.refs).some((s) => r.isAncestor(marks.exp, s))
    },
    {
      id: 'reflog', item: 'reflog',
      title: T('Rescate con reflog', 'Rescue with the reflog'),
      brief: T('Hiciste git reset --hard HEAD~2 y desaparecieron dos commits que sí querías.', 'You ran git reset --hard HEAD~2 and two commits you wanted disappeared.'),
      goal: T('Recupera los dos commits perdidos en main.', 'Get the two lost commits back on main.'),
      hint: T('git log ya no los muestra, pero git reflog sí. git reset --hard HEAD@{1} vuelve a donde estabas.', 'git log no longer shows them, but git reflog does. git reset --hard HEAD@{1} goes back to where you were.'),
      tries: ['git log --oneline', 'git reflog', 'git reset --hard HEAD@{1}'],
      setup: (r, marks) => {
        r.file('README.md', T('# Mi proyecto\n', '# My project\n')).sh('git add .', `git commit -m "${T('Inicio', 'Start')}"`)
          .file('api.py', 'def get():\n    pass\n').sh('git add .', `git commit -m "${T('Agrega la API', 'Add the API')}"`)
          .file('api.py', 'def get():\n    return []\n').sh(`git commit -am "${T('La API devuelve datos', 'The API returns data')}"`)
          .file('test_api.py', 'def test_get():\n    assert get() == []\n').sh('git add .', `git commit -m "${T('Pruebas de la API', 'API tests')}"`);
        marks.lost = r.headSha();
        r.sh('git reset --hard HEAD~2');
      },
      check: (r, marks) => r.isAncestor(marks.lost, r.refs.main)
    },
    {
      id: 'rebase', item: 'rebase',
      title: T('Rebase en línea recta', 'Rebase in a straight line'),
      brief: T('Trabajaste en feature mientras main avanzó con dos commits nuevos.', 'You worked on feature while main moved ahead with two new commits.'),
      goal: T('Pon los commits de feature encima de main, sin commit de merge.', 'Put the feature commits on top of main, without a merge commit.'),
      hint: T('Estando en feature: git rebase main. Mira cómo cambian los hashes de tus commits.', 'While on feature: git rebase main. Watch how the hashes of your commits change.'),
      tries: ['git log --oneline --all', 'git rebase main', 'git log --oneline'],
      setup: (r) => {
        r.file('README.md', T('# Mi proyecto\n', '# My project\n')).sh('git add .', `git commit -m "${T('Inicio', 'Start')}"`, 'git switch -c feature')
          .file('login.py', 'def login(user, pwd):\n    return check(user, pwd)\n').sh('git add .', 'git commit -m "Login"')
          .file('test_login.py', 'def test_login():\n    assert login("ana", "123")\n').sh('git add .', `git commit -m "${T('Pruebas del login', 'Login tests')}"`, 'git switch main')
          .file('ci.yml', 'run: pytest\n').sh('git add .', `git commit -m "${T('Configura CI', 'Set up CI')}"`)
          .file('README.md', T('# Mi proyecto\nCorre las pruebas con pytest.\n', '# My project\nRun the tests with pytest.\n')).sh(`git commit -am "${T('Actualiza el README', 'Update the README')}"`, 'git switch feature');
      },
      check: (r) => {
        const main = r.refs.main, feat = r.refs.feature;
        if (!main || !feat || feat === main || !r.isAncestor(main, feat)) return false;
        for (let s = feat; s && s !== main; s = r.commit(s).parents[0]) if (r.commit(s).parents.length > 1) return false;
        return true;
      }
    },
    {
      id: 'sandbox', item: null,
      title: T('Libre', 'Free play'),
      brief: T('Un repositorio vacío con un README.md. Prueba lo que quieras.', 'An empty repository with a README.md. Try whatever you like.'),
      goal: T('Sin misión: experimenta con cualquier comando.', 'No mission: experiment with any command.'),
      hint: T('Escribe help para ver todos los comandos.', 'Type help to see every command.'),
      tries: ['help', 'git add .', 'git commit -m "Hola"', 'git log'],
      setup: (r) => r.file('README.md', T('# Mi proyecto\n', '# My project\n')),
      check: () => false
    }
  ];

  // A fresh repository for one mission. Building it is not part of what the student did,
  // so the change log starts empty.
  function scenario(id) {
    const def = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
    const repo = new Repo();
    const marks = {};
    def.setup(repo, marks);
    repo.ev = { created: [], moved: [] };
    return { def, repo, marks, done: () => !!def.check(repo, marks) };
  }

  const api = {
    AUTHOR, START, STEP, SHORT, GitError, Repo, SCENARIOS, scenario,
    sha1, utf8, hashObject, hashBlob, treeBody, commitBody, gitDate, merge3, mergeFiles, tokenize
  };
  root.GitSim = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
