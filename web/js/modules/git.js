// CS Interactive Workshop - Git station: a terminal, the commit graph and Git's insides
// (working tree, index, objects and refs), all driven by the model in gitsim.js.
class GitStation {
  constructor() {
    this.mission = 'first-commit';
    this.sc = null;
    this.lines = [];
    this.history = [];
    this.hpos = 0;
    this.last = null;
    this.selected = null;
    this.view = null;
    this.note = '';
    this.solved = {};
  }

  $(id) { return document.getElementById(id); }
  esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  init() {
    if (!window.GitSim || !this.$('gitSim')) return;
    const G = window.GitSim;
    this.$('gitMissions').innerHTML = G.SCENARIOS.map((s) => `<button type="button" class="chip" data-mission="${s.id}">${this.esc(s.title)}</button>`).join('');
    this.$('gitMissions').addEventListener('click', (e) => { const b = e.target.closest('[data-mission]'); if (b) this.load(b.dataset.mission); });
    this.$('gitForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.$('gitInput');
      const line = input.value;
      input.value = '';
      this.exec(line);
    });
    this.$('gitInput').addEventListener('keydown', (e) => this.recall(e));
    this.$('gitTries').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (!b) return;
      this.$('gitInput').value = b.dataset.cmd;
      this.$('gitInput').focus();
    });
    this.$('gitHint').addEventListener('click', () => { this.$('gitHintText').hidden = !this.$('gitHintText').hidden; });
    this.$('gitReset').addEventListener('click', () => this.load(this.mission));
    const pick = (e) => {
      const f = e.target.closest('[data-file]');
      if (f) return this.inspectFile(f.dataset.file, f.dataset.where);
      const o = e.target.closest('[data-sha]');
      if (o) this.inspect(o.getAttribute('data-sha'));
    };
    ['gitGraph', 'gitObjList', 'gitObjView', 'gitAreas', 'gitRefs'].forEach((id) => this.$(id).addEventListener('click', pick));
    this.renderLearn();
    this.renderBuild();
    this.load(this.mission);
  }

  // A fresh repository for a mission
  load(id) {
    const G = window.GitSim;
    this.sc = G.scenario(id);
    this.mission = this.sc.def.id;
    this.lines = [{ kind: 'info', text: T('# Escribe un comando y pulsa Enter. help muestra todos.', '# Type a command and press Enter. help shows them all.') }];
    this.last = null;
    this.view = null;
    this.selected = this.sc.repo.headSha();
    this.note = this.sc.def.brief;
    this.$('gitHintText').hidden = true;
    this.$('gitMissions').querySelectorAll('[data-mission]').forEach((b) => b.classList.toggle('active', b.dataset.mission === this.mission));
    this.render();
  }

  // Up and down walk through the commands already typed
  recall(e) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    if (!this.history.length) return;
    e.preventDefault();
    this.hpos = Math.max(0, Math.min(this.history.length, this.hpos + (e.key === 'ArrowUp' ? -1 : 1)));
    this.$('gitInput').value = this.history[this.hpos] || '';
  }

  exec(line) {
    const text = String(line || '').trim();
    if (!text || !this.sc) return null;
    this.history.push(text);
    this.hpos = this.history.length;
    const res = this.sc.repo.run(text);
    if (res.clear) this.lines = [];
    else {
      this.lines.push({ kind: 'cmd', text });
      if (res.out) this.lines.push({ kind: res.ok ? 'out' : 'err', text: res.out });
    }
    this.lines = this.lines.slice(-160);
    this.last = res;
    const commits = res.created.filter((s) => this.sc.repo.objects[s].type === 'commit');
    if (commits.length) this.selected = commits[commits.length - 1];
    else if (res.created.length) this.selected = res.created[res.created.length - 1];
    if (this.view && this.view.sha && !this.sc.repo.objects[this.view.sha]) this.view = null;
    if (res.note) this.note = res.note;
    const done = this.checkMission();
    if (window.soundController) window.soundController.playTone(res.ok ? 640 : 220, 'sine', 0.03, 0.25);
    this.render(done);
    return res;
  }

  // Finishing a mission counts toward the station checklist (once per page visit is enough)
  checkMission() {
    const def = this.sc.def;
    if (!def.item || !this.sc.done()) return false;
    const fresh = !this.solved[def.id];
    this.solved[def.id] = true;
    if (window.account) window.account.record('git', def.item);
    return fresh;
  }

  // ── Rendering ─────────────────────────────────────────────
  render(justSolved = false) {
    this.renderMission(justSolved);
    this.renderTerminal();
    this.renderGraph();
    this.renderAreas();
    this.renderObjects();
    this.$('gitNoteTitle').textContent = justSolved ? T('¡Misión cumplida!', 'Mission complete!') : T('Qué pasó', 'What happened');
    this.$('gitNote').textContent = this.note;
  }

  renderMission() {
    const def = this.sc.def;
    const done = def.item && this.sc.done();
    this.$('gitMissionTitle').textContent = def.title;
    this.$('gitMissionBrief').textContent = def.brief;
    this.$('gitMissionGoal').textContent = def.goal;
    this.$('gitHintText').textContent = def.hint;
    const state = this.$('gitMissionState');
    state.hidden = !def.item;
    state.textContent = done ? T('Cumplida', 'Done') : T('En curso', 'In progress');
    state.classList.toggle('done', !!done);
    this.$('gitTries').innerHTML = def.tries.map((c) => `<button type="button" class="chip git-try" data-cmd="${this.esc(c)}"><code>${this.esc(c)}</code></button>`).join('');
  }

  prompt() {
    const r = this.sc.repo;
    const where = r.head.ref || r.short(r.head.sha);
    return `(${where}${r.merging ? '|MERGING' : ''}) $`;
  }

  renderTerminal() {
    this.$('gitPrompt').textContent = this.prompt();
    const out = this.$('gitOut');
    out.innerHTML = this.lines.map((l) => {
      if (l.kind === 'cmd') return `<span class="git-line-cmd">$ ${this.esc(l.text)}</span>`;
      if (l.kind === 'info') return `<span class="git-line-info">${this.esc(l.text)}</span>`;
      return `<span class="git-line-${l.kind}">${this.esc(l.text)}</span>`;
    }).join('\n');
    out.scrollTop = 1e6;
  }

  // Lanes: main first, then the other branches, a detached HEAD and finally commits no ref
  // reaches (left behind by reset, rebase or a deleted branch). Columns follow creation order.
  layout(repo = this.sc.repo) {
    const reach = repo.reachable();
    const tips = [];
    if (repo.refs.main) tips.push(repo.refs.main);
    Object.keys(repo.refs).sort().forEach((n) => { if (n !== 'main') tips.push(repo.refs[n]); });
    if (!repo.head.ref && repo.head.sha) tips.push(repo.head.sha);
    const lost = repo.order.filter((s) => !reach.has(s));
    const lostParents = new Set();
    lost.forEach((s) => repo.commit(s).parents.forEach((p) => lostParents.add(p)));
    lost.slice().reverse().forEach((s) => { if (!lostParents.has(s)) tips.push(s); });
    const lane = new Map();
    let lanes = 0;
    tips.forEach((t) => {
      let used = false;
      for (let s = t; s && !lane.has(s); s = repo.commit(s).parents[0]) { lane.set(s, lanes); used = true; }
      if (used) lanes++;
    });
    repo.order.forEach((s) => { if (!lane.has(s)) lane.set(s, lanes++); });
    const labels = (s) => {
      const out = Object.keys(repo.refs).filter((n) => repo.refs[n] === s).sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a < b ? -1 : 1))
        .map((n) => ({ text: n, head: repo.head.ref === n }));
      if (!repo.head.ref && repo.head.sha === s) out.unshift({ text: 'HEAD', head: true, detached: true });
      return out;
    };
    const DX = 78, X0 = 40, DY = 66;
    const firstLabels = Math.max(1, ...repo.order.filter((s) => lane.get(s) === 0).map((s) => labels(s).length));
    const Y0 = 34 + firstLabels * 20;
    const nodes = repo.order.map((s, i) => ({
      sha: s, short: repo.short(s), subject: repo.subject(s), x: X0 + i * DX, y: Y0 + lane.get(s) * DY, lane: lane.get(s),
      parents: repo.commit(s).parents, reachable: reach.has(s), labels: labels(s)
    }));
    return { nodes, lanes, width: X0 * 2 + Math.max(0, nodes.length - 1) * DX + 60, height: Y0 + Math.max(0, lanes - 1) * DY + 40 };
  }

  renderGraph() {
    const repo = this.sc.repo;
    const box = this.$('gitGraphBox');
    if (!repo.order.length) {
      box.innerHTML = `<p class="git-empty">${T('Todavía no hay commits: la historia empieza con el primero.', 'No commits yet: history starts with the first one.')}</p>`;
      return;
    }
    const L = this.layout(repo);
    const at = new Map(L.nodes.map((n) => [n.sha, n]));
    const COLORS = ['var(--sky-b)', 'var(--mint)', 'var(--plum)', 'var(--sun-y)', 'var(--tomato)', 'var(--teal)'];
    const fresh = new Set(this.last ? this.last.created : []);
    const edges = [];
    L.nodes.forEach((n) => n.parents.forEach((p) => {
      const q = at.get(p);
      if (!q) return;
      const d = q.y === n.y ? `M${q.x} ${q.y}H${n.x}` : `M${q.x} ${q.y}C${q.x + 40} ${q.y} ${n.x - 40} ${n.y} ${n.x} ${n.y}`;
      edges.push(`<path class="git-edge${n.reachable ? '' : ' lost'}" d="${d}"/>`);
    }));
    const nodes = L.nodes.map((n) => {
      const cls = ['git-node', n.reachable ? '' : 'lost', fresh.has(n.sha) ? 'is-new' : '', this.selected === n.sha ? 'is-sel' : '', n.parents.length > 1 ? 'merge' : ''].filter(Boolean).join(' ');
      const pills = n.labels.map((l, k) => {
        const text = l.head && !l.detached ? `HEAD→${l.text}` : l.text;
        const w = text.length * 7 + 16;   // 11px monospace is about 6.6px per character
        const y = n.y - 22 - k * 20;
        return `<g class="git-pill${l.head ? ' head' : ''}${l.detached ? ' detached' : ''}"><rect x="${n.x - w / 2}" y="${y - 9}" width="${w}" height="17" rx="8.5"/><text x="${n.x}" y="${y + 3.5}">${this.esc(text)}</text></g>`;
      }).join('');
      return `<g class="${cls}" data-sha="${n.sha}" tabindex="0" role="button" aria-label="${this.esc(`${n.short} ${n.subject}`)}"><title>${this.esc(`${n.short} ${n.subject}`)}</title>`
        + `<circle cx="${n.x}" cy="${n.y}" r="12" style="fill:${n.reachable ? COLORS[n.lane % COLORS.length] : 'var(--paper)'}"/>`
        + `<text class="git-sha" x="${n.x}" y="${n.y + 28}">${n.short}</text>${pills}</g>`;
    }).join('');
    box.innerHTML = `<svg class="git-svg" viewBox="0 0 ${L.width} ${L.height}" width="${L.width}" height="${L.height}" role="img" aria-label="${T('Grafo de commits', 'Commit graph')}">${edges.join('')}${nodes}</svg>`;
    box.scrollLeft = 1e6;
  }

  renderAreas() {
    const r = this.sc.repo;
    const st = r.status();
    const H = r.blobsOf(r.headSha());
    const mark = {};
    st.untracked.forEach((n) => { mark[n] = ['U', 'new', T('sin seguimiento', 'untracked')]; });
    st.unstaged.forEach((f) => { mark[f.name] = f.kind === 'deleted' ? ['D', 'del', T('borrado', 'deleted')] : ['M', 'mod', T('modificado', 'modified')]; });
    st.conflicts.forEach((n) => { mark[n] = ['!', 'conflict', T('conflicto', 'conflict')]; });
    const staged = {};
    st.staged.forEach((f) => { staged[f.name] = f.kind === 'new' ? ['A', 'new', T('nuevo', 'new')] : f.kind === 'deleted' ? ['D', 'del', T('borrado', 'deleted')] : ['M', 'mod', T('modificado', 'modified')]; });
    const item = (name, where, badge) => `<li><button type="button" class="git-file${badge ? ` ${badge[1]}` : ''}" data-file="${this.esc(name)}" data-where="${where}"${badge ? ` title="${this.esc(badge[2])}"` : ''}>${badge ? `<b class="git-badge">${badge[0]}</b>` : ''}${this.esc(name)}</button></li>`;
    const list = (items) => (items.length ? `<ul>${items.join('')}</ul>` : `<p class="git-none">${T('(vacío)', '(empty)')}</p>`);
    const workNames = [...new Set([...Object.keys(r.work), ...st.unstaged.filter((f) => f.kind === 'deleted').map((f) => f.name)])].sort();
    const indexNames = [...new Set([...Object.keys(r.index), ...st.staged.filter((f) => f.kind === 'deleted').map((f) => f.name)])].sort();
    this.$('gitWork').innerHTML = list(workNames.map((n) => item(n, 'work', mark[n])));
    this.$('gitIndex').innerHTML = list(indexNames.map((n) => item(n, 'index', staged[n])));
    this.$('gitHead').innerHTML = list(Object.keys(H).sort().map((n) => item(n, 'head', null)));
    this.$('gitHeadLabel').textContent = r.headSha() ? `${T('último commit', 'last commit')} · ${r.short(r.headSha())}` : T('sin commits', 'no commits');
  }

  renderObjects() {
    const r = this.sc.repo;
    const moved = new Map((this.last ? this.last.moved : []).map((m) => [m.ref, m]));
    const refRow = (name, value, m) => `<li class="git-ref${m ? ' moved' : ''}"><b>${this.esc(name)}</b><span class="git-arrow">→</span>${value}${m && m.from && m.from !== m.to ? `<s>${r.short(m.from)}</s>` : ''}</li>`;
    const shaBtn = (s) => (s ? `<button type="button" class="git-link" data-sha="${s}">${r.short(s)}</button>` : `<i>${T('sin commits', 'no commits')}</i>`);
    const rows = [refRow('HEAD', r.head.ref ? `<span class="git-symref">refs/heads/${this.esc(r.head.ref)}</span>` : shaBtn(r.head.sha), moved.get('HEAD'))];
    Object.keys(r.refs).sort().forEach((n) => rows.push(refRow(`refs/heads/${n}`, shaBtn(r.refs[n]), moved.get(n))));
    if (r.head.ref && !(r.head.ref in r.refs)) rows.push(refRow(`refs/heads/${r.head.ref}`, `<i>${T('todavía no existe', 'does not exist yet')}</i>`, null));
    this.$('gitRefs').innerHTML = rows.join('');

    const all = Object.keys(r.objects).sort((a, b) => r.objects[b].seq - r.objects[a].seq);
    const count = (t) => all.filter((s) => r.objects[s].type === t).length;
    this.$('gitObjCount').textContent = T(`${count('commit')} commits · ${count('tree')} árboles · ${count('blob')} blobs`, `${count('commit')} commits · ${count('tree')} trees · ${count('blob')} blobs`);
    const fresh = new Set(this.last ? this.last.created : []);
    const summary = (s) => {
      const o = r.objects[s];
      if (o.type === 'commit') return r.subject(s);
      if (o.type === 'tree') return T(`${o.data.length} archivo(s)`, `${o.data.length} file(s)`);
      const first = o.data.split('\n')[0];
      return first.length > 26 ? `${first.slice(0, 26)}…` : first || T('(vacío)', '(empty)');
    };
    this.$('gitObjList').innerHTML = all.length
      ? all.map((s) => `<li><button type="button" class="git-obj t-${r.objects[s].type}${fresh.has(s) ? ' is-new' : ''}${this.selected === s ? ' is-sel' : ''}" data-sha="${s}"><span class="git-type">${r.objects[s].type}</span><code>${r.short(s)}</code><span class="git-sum">${this.esc(summary(s))}</span></button></li>`).join('')
      : `<li class="git-none">${T('La base de objetos está vacía: git add guarda el primer blob.', 'The object store is empty: git add stores the first blob.')}</li>`;
    this.renderView();
  }

  // The selected object (or file), exactly as git cat-file -p would print it
  renderView() {
    const r = this.sc.repo;
    const v = this.view || (this.selected && r.objects[this.selected] ? { sha: this.selected } : null);
    const box = this.$('gitObjView');
    if (!v) { box.innerHTML = `<p class="git-none">${T('Toca un objeto, un archivo o un commit del grafo para ver qué guarda.', 'Tap an object, a file or a commit in the graph to see what it stores.')}</p>`; return; }
    if (v.file) {
      box.innerHTML = `<div class="git-view-head"><code>cat ${this.esc(v.file)}</code><span>${T('directorio de trabajo, todavía no es un objeto', 'working directory, not an object yet')}</span></div><pre class="git-view-body">${this.esc(r.work[v.file] || '')}</pre>`;
      return;
    }
    const o = r.objects[v.sha];
    const body = this.esc(r.raw(v.sha)).replace(/\b[0-9a-f]{40}\b/g, (h) => (r.objects[h] ? `<button type="button" class="git-link" data-sha="${h}">${h}</button>` : h));
    box.innerHTML = `<div class="git-view-head"><code>git cat-file -p ${r.short(v.sha)}</code><span class="git-type t-${o.type}">${o.type} · ${o.size} bytes</span></div>`
      + `<pre class="git-view-body">${body || `<i>${T('(vacío)', '(empty)')}</i>`}</pre>`
      + `<p class="git-view-hash">${T('Nombre', 'Name')} = SHA-1("${o.type} ${o.size}\\0" + ${T('contenido', 'content')}) = <code>${v.sha}</code></p>`;
  }

  inspect(sha) {
    if (!this.sc.repo.objects[sha]) return;
    this.selected = sha;
    this.view = { sha };
    this.renderGraph();
    this.renderObjects();
  }

  inspectFile(name, where) {
    const r = this.sc.repo;
    if (where === 'work') { this.view = { file: name }; this.renderView(); return; }
    const sha = where === 'index' ? r.index[name] : r.blobsOf(r.headSha())[name];
    if (sha) this.inspect(sha);
  }

  // ── Understand and Implement ──────────────────────────────
  renderLearn() {
    const box = this.$('gitLearn');
    if (!box) return;
    box.innerHTML = `
      <article class="learn-card wide">
        <h3>${T('¿Qué es un commit, de verdad?', 'What is a commit, really?')}</h3>
        <p>${T('Git es una base de datos de <strong>objetos</strong> que se nombran por su contenido. Hay tres tipos:', 'Git is a database of <strong>objects</strong> named after their content. There are three kinds:')}</p>
        <div class="flow"><span>blob</span><svg class="ic"><use href="#i-arrow-r"/></svg><span>tree</span><svg class="ic"><use href="#i-arrow-r"/></svg><span>commit</span></div>
        <ul class="plain">
          <li>${T('<strong>blob</strong>: el contenido de un archivo, sin nombre ni fecha.', '<strong>blob</strong>: the content of a file, with no name and no date.')}</li>
          <li>${T('<strong>tree</strong>: la lista de archivos de una carpeta, cada uno con el hash de su blob.', '<strong>tree</strong>: the list of files in a folder, each with the hash of its blob.')}</li>
          <li>${T('<strong>commit</strong>: un tree, sus padres, el autor, la fecha y el mensaje.', '<strong>commit</strong>: a tree, its parents, the author, the date and the message.')}</li>
        </ul>
        <p>${T('El nombre de cada objeto es el SHA-1 de <code>"tipo tamaño\\0"</code> más su contenido. Por eso el mismo archivo tiene el mismo hash en cualquier computadora, y por eso cambiar una coma en un commit viejo cambia su hash y el de todos los que vienen después.', 'The name of every object is the SHA-1 of <code>"type size\\0"</code> plus its content. That is why the same file has the same hash on any computer, and why changing a comma in an old commit changes its hash and the hash of every commit after it.')}</p>
      </article>
      <article class="learn-card">
        <h3>${T('Una rama pesa 41 bytes', 'A branch weighs 41 bytes')}</h3>
        <p class="analogy">${T('Una rama es un separador de libro, no una copia del libro.', 'A branch is a bookmark, not a copy of the book.')}</p>
        <p>${T('<code>.git/refs/heads/main</code> guarda solo el hash de un commit. <strong>HEAD</strong> dice en qué rama estás (<code>ref: refs/heads/main</code>). Hacer commit crea un objeto nuevo y mueve la rama hacia él. Con HEAD separado, HEAD guarda un hash directamente y los commits nuevos no quedan en ninguna rama.', '<code>.git/refs/heads/main</code> stores just the hash of a commit. <strong>HEAD</strong> says which branch you are on (<code>ref: refs/heads/main</code>). Committing creates a new object and moves the branch to it. With a detached HEAD, HEAD holds a hash directly and new commits are not on any branch.')}</p>
      </article>
      <article class="learn-card">
        <h3>${T('Las tres áreas', 'The three areas')}</h3>
        <div class="flow"><span>${T('trabajo', 'working')}</span><svg class="ic"><use href="#i-arrow-r"/></svg><span>git add</span><svg class="ic"><use href="#i-arrow-r"/></svg><span>${T('índice', 'index')}</span><svg class="ic"><use href="#i-arrow-r"/></svg><span>git commit</span><svg class="ic"><use href="#i-arrow-r"/></svg><span>${T('repositorio', 'repository')}</span></div>
        <p>${T('Tus archivos son el <strong>directorio de trabajo</strong>. <code>git add</code> guarda su contenido como blobs y lo anota en el <strong>índice</strong>: la foto del próximo commit. <code>git commit</code> convierte el índice en un tree y crea el commit. Por eso puedes hacer commit de una parte de tus cambios.', 'Your files are the <strong>working directory</strong>. <code>git add</code> stores their content as blobs and writes it down in the <strong>index</strong>: the snapshot of the next commit. <code>git commit</code> turns the index into a tree and creates the commit. That is why you can commit only part of your changes.')}</p>
      </article>
      <article class="learn-card">
        <h3>${T('Merge: avance rápido o tres vías', 'Merge: fast-forward or three-way')}</h3>
        <p>${T('Si tu rama no tiene commits propios, Git solo <strong>avanza el puntero</strong>. Si las dos ramas avanzaron, busca su <strong>ancestro común</strong> y compara cada lado contra él: lo que cambió un solo lado entra solo; lo que cambiaron los dos en las mismas líneas es un <strong>conflicto</strong>. El resultado es un commit con dos padres.', 'If your branch has no commits of its own, Git just <strong>moves the pointer forward</strong>. If both branches moved, it finds their <strong>common ancestor</strong> and compares each side against it: what one side changed goes in by itself; what both changed on the same lines is a <strong>conflict</strong>. The result is a commit with two parents.')}</p>
      </article>
      <article class="learn-card">
        <h3>${T('Rebase reescribe', 'Rebase rewrites')}</h3>
        <p>${T('Rebase <strong>copia</strong> tus commits encima de otra rama. Como cambia el padre, cambia el hash: son commits nuevos, y los viejos quedan sin rama. Regla de oro: no hagas rebase de commits que otras personas ya tienen.', 'Rebase <strong>copies</strong> your commits on top of another branch. Since the parent changes, the hash changes: they are new commits, and the old ones are left without a branch. Golden rule: do not rebase commits other people already have.')}</p>
      </article>
      <article class="learn-card">
        <h3>${T('reset contra revert', 'reset versus revert')}</h3>
        <ul class="plain">
          <li>${T('<code>reset --soft</code> mueve la rama; tus cambios quedan en el índice.', '<code>reset --soft</code> moves the branch; your changes stay in the index.')}</li>
          <li>${T('<code>reset</code> (mixed) mueve la rama y el índice; tus archivos no cambian.', '<code>reset</code> (mixed) moves the branch and the index; your files do not change.')}</li>
          <li>${T('<code>reset --hard</code> mueve todo: lo que no estaba en un commit se pierde.', '<code>reset --hard</code> moves everything: whatever was not in a commit is lost.')}</li>
          <li>${T('<code>revert</code> no mueve nada hacia atrás: crea un commit que deshace otro. Es lo correcto en ramas compartidas.', '<code>revert</code> moves nothing backwards: it creates a commit that undoes another one. It is the right choice on shared branches.')}</li>
        </ul>
      </article>
      <article class="learn-card">
        <h3>${T('La red de seguridad: el reflog', 'The safety net: the reflog')}</h3>
        <p>${T('Cada vez que HEAD se mueve, Git lo anota en el <strong>reflog</strong>. Un commit sin rama no desaparece: sigue en la base de objetos y <code>HEAD@{n}</code> lo nombra. Por defecto, las entradas del reflog duran 90 días (30 si el commit ya no está en ninguna rama) antes de que la limpieza las borre.', 'Every time HEAD moves, Git writes it down in the <strong>reflog</strong>. A commit without a branch does not disappear: it is still in the object store and <code>HEAD@{n}</code> names it. By default, reflog entries last 90 days (30 if the commit is no longer on any branch) before cleanup removes them.')}</p>
      </article>`;
  }

  renderBuild() {
    const box = this.$('gitBuild');
    if (!box) return;
    const code = (lines) => `<pre class="code">${lines.map((l) => this.esc(l)).join('\n').replace(/(\/\*[^*]*\*\/)/g, '<span class="c">$1</span>')}</pre>`;
    box.innerHTML = `
      <article class="learn-card wide">
        <h3>${T('minigit: el corazón de Git en C', 'minigit: the heart of Git in C')}</h3>
        <p>${T('El motor de este proyecto (<code>core-c-engines/vcs</code>) guarda blobs, trees y commits exactamente como Git, menos la compresión zlib. Sus hashes son los de Git real, y sus 42 pruebas lo comprueban.', 'This project\'s engine (<code>core-c-engines/vcs</code>) stores blobs, trees and commits exactly like Git, minus the zlib compression. Its hashes are real Git\'s, and its 42 tests check it.')}</p>
        ${code(GitStation.HASH_SNIPPET)}
        ${code(GitStation.REF_SNIPPET)}
      </article>
      <article class="learn-card">
        <h3>${T('Compílalo y compáralo con Git', 'Build it and compare it with Git')}</h3>
<pre class="code">make -C core-c-engines/vcs
mkdir demo &amp;&amp; cd demo
printf 'hello\\n' &gt; hello.txt
../core-c-engines/vcs/bin/minigit init
../core-c-engines/vcs/bin/minigit hash-object -w hello.txt
git hash-object hello.txt        <span class="c"># ${T('el mismo hash', 'the same hash')}</span>
../core-c-engines/vcs/bin/minigit commit -m "Primer commit"
../core-c-engines/vcs/bin/minigit cat-file -p HEAD
cat .minigit/refs/heads/main     <span class="c"># ${T('una rama: 41 bytes', 'a branch: 41 bytes')}</span></pre>
        <p class="ctl-hint">${T('Con MINIGIT_AUTHOR_DATE="1767290400 -0600" los hashes de los commits también coinciden con los de Git.', 'With MINIGIT_AUTHOR_DATE="1767290400 -0600" the commit hashes match Git\'s too.')}</p>
      </article>
      <article class="learn-card">
        <h3>${T('Comandos que te salvan', 'Commands that save you')}</h3>
        <ul class="plain">
          <li>${T('<code>git log --oneline --graph --all</code>: el grafo completo en la consola.', '<code>git log --oneline --graph --all</code>: the whole graph in the console.')}</li>
          <li>${T('<code>git switch -c rescate</code>: ponle nombre a donde estás antes de irte.', '<code>git switch -c rescue</code>: give a name to where you are before leaving.')}</li>
          <li>${T('<code>git restore archivo</code>: descarta cambios que no querías.', '<code>git restore file</code>: throw away changes you did not want.')}</li>
          <li>${T('<code>git reflog</code> y <code>git reset --hard HEAD@{1}</code>: deshaz el último movimiento.', '<code>git reflog</code> and <code>git reset --hard HEAD@{1}</code>: undo the last move.')}</li>
          <li>${T('<code>git merge --abort</code>: sal de un merge que se complicó.', '<code>git merge --abort</code>: get out of a merge that went wrong.')}</li>
        </ul>
      </article>
      <article class="learn-card">
        <h3>${T('En equipo', 'In a team')}</h3>
        <ul class="plain">
          <li>${T('Una rama por tarea y commits pequeños, con mensajes que digan qué cambia.', 'One branch per task and small commits, with messages that say what changes.')}</li>
          <li>${T('Antes de abrir un pull request, trae lo último de main (merge o rebase de tu propia rama).', 'Before opening a pull request, bring in the latest main (merge or rebase your own branch).')}</li>
          <li>${T('Nunca hagas rebase ni push --force de una rama compartida.', 'Never rebase or push --force a shared branch.')}</li>
          <li>${T('Pon los binarios y secretos en <code>.gitignore</code>: lo que entra en un commit queda en la historia.', 'Put binaries and secrets in <code>.gitignore</code>: whatever goes into a commit stays in the history.')}</li>
        </ul>
      </article>`;
  }
}

// Excerpts of core-c-engines/vcs/src/minigit.c (a test checks they match the file)
GitStation.HASH_SNIPPET = [
  '/* The name of an object is the SHA-1 of its header plus its body */',
  'void mg_hash_object(const char *type, const unsigned char *body, size_t len, char hex[MG_HEX_SIZE]) {',
  '    char header[32];',
  '    int n = snprintf(header, sizeof header, "%s %zu", type, len);',
  '    mg_sha1_ctx ctx;',
  '    mg_sha1_init(&ctx);',
  '    mg_sha1_update(&ctx, header, (size_t)n + 1);   /* the \'\\0\' is part of the header */',
  '    mg_sha1_update(&ctx, body, len);',
  '    unsigned char digest[20];',
  '    mg_sha1_final(&ctx, digest);',
  '    mg_to_hex(digest, hex);',
  '}'
];
GitStation.REF_SNIPPET = [
  '/* A branch is a 41-byte file: the hash of a commit and a newline */',
  'int mg_update_ref(const char *gitdir, const char *branch, const char *hex) {',
  '    unsigned char raw[20];',
  '    if (!valid_branch(branch) || mg_from_hex(hex, raw) != 0) return -1;',
  '    char path[1024], line[MG_HEX_SIZE + 1];',
  '    snprintf(path, sizeof path, "%s/refs/heads/%s", gitdir, branch);',
  '    snprintf(line, sizeof line, "%s\\n", hex);',
  '    return write_file(path, line, 41);',
  '}'
];

window.gitStation = new GitStation();
