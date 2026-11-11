// CS Interactive Workshop - Tracer: a line-by-line code walkthrough ("debugger") engine.
//
// A station is a list of problems. Each problem provides:
//   id, title, difficulty ('Fácil' | 'Media' | 'Difícil'), pattern, statement (html),
//   lang ('python' | 'sql'), code (array of lines),
//   presets (array of input strings, optional), parse(text) -> args (throws Error),
//   trace(args) -> frames [{ line, vars, viz, note }],
//   render(vizState, args) -> html string for the stage,
//   learn { idea, signals[], time, space, why }, build { template, tips[], similar[] }
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

  // ── Syntax highlighting (tiny, good enough for short snippets) ──────────
  const PY_KW = new Set('def return if elif else while for in not and or is None True False lambda class break continue from import'.split(' '));
  const PY_BUILTIN = new Set('len max min enumerate range sorted deque print Node append pop popleft sort'.split(' '));
  const SQL_KW = new Set('SELECT FROM JOIN LEFT RIGHT INNER OUTER ON WHERE GROUP BY HAVING ORDER DESC ASC AS IS NOT NULL AND OR LIMIT DISTINCT IN'.split(' '));
  const SQL_FN = new Set('COUNT AVG SUM MIN MAX'.split(' '));

  function highlight(line, lang) {
    const re = lang === 'sql'
      ? /('[^']*'|--.*$|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w]*|\s+|.)/g
      : /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#.*$|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w]*|\s+|.)/g;
    return line.replace(re, (tok) => {
      if (/^["']/.test(tok)) return `<span class="t-s">${esc(tok)}</span>`;
      if (/^(#|--)/.test(tok)) return `<span class="t-c">${esc(tok)}</span>`;
      if (/^\d/.test(tok)) return `<span class="t-n">${esc(tok)}</span>`;
      if (lang === 'sql') {
        if (SQL_KW.has(tok.toUpperCase())) return `<span class="t-k">${esc(tok)}</span>`;
        if (SQL_FN.has(tok.toUpperCase())) return `<span class="t-b">${esc(tok)}</span>`;
      } else {
        if (PY_KW.has(tok)) return `<span class="t-k">${esc(tok)}</span>`;
        if (PY_BUILTIN.has(tok)) return `<span class="t-b">${esc(tok)}</span>`;
      }
      return esc(tok);
    });
  }

  // ── Value formatting for the variables panel ───────────────────────────
  function fmt(v, lang) {
    if (v === null || v === undefined) return lang === 'sql' ? 'NULL' : 'None';
    if (typeof v === 'boolean') return lang === 'sql' ? String(v).toUpperCase() : (v ? 'True' : 'False');
    if (typeof v === 'string') return v.startsWith('§') ? v.slice(1) : `'${v}'`; // '§' = raw text
    if (Array.isArray(v)) return `[${v.map((x) => fmt(x, lang)).join(', ')}]`;
    if (typeof v === 'object') return `{${Object.entries(v).map(([k, x]) => `${fmt(k, lang)}: ${fmt(x, lang)}`).join(', ')}}`;
    return String(v);
  }

  // ── Frame recorder used by every problem's trace() ─────────────────────
  class Recorder {
    constructor() { this.frames = []; }
    step(line, vars, viz, note) { this.frames.push({ line, vars: clone(vars), viz: clone(viz), note }); }
  }

  // ── Shared visual primitives (return html strings) ─────────────────────
  const PTR_COLOR = { l: 'sky', left: 'sky', lo: 'sky', r: 'tomato', right: 'tomato', hi: 'tomato', i: 'plum', prev: 'plum', curr: 'sky', nxt: 'mint', top: 'tomato', head: 'mint' };

  const viz = {
    esc,
    // Row of boxes with index on top and pointer chips below.
    cells(values, { ptr = {}, state = {}, small = false } = {}) {
      return `<div class="vz-cells${small ? ' small' : ''}">${values.map((v, i) => `
        <div class="vz-col">
          <div class="vz-idx">${i}</div>
          <div class="vz-cell ${state[i] || ''}">${esc(v)}</div>
          <div class="vz-ptrs">${(ptr[i] || []).map((p) => `<span class="vz-ptr c-${PTR_COLOR[p] || 'plum'}">${esc(p)}</span>`).join('')}</div>
        </div>`).join('')}</div>`;
    },

    // Bar chart (heights) as SVG, with optional water, container box and pointers.
    bars(heights, { ptr = {}, water = null, box = null, best = null, levels = [], state = {} } = {}) {
      const n = heights.length;
      const unit = 34, gap = 6, padX = 12, top = 16, chartH = 170;
      const maxH = Math.max(1, ...heights, ...(levels.map((l) => l.value)));
      const scale = chartH / maxH;
      const padR = levels.length ? 78 : padX; // room for level labels on the right
      const W = padX + n * unit + padR;
      const chartR = padX + n * unit;
      const H = top + chartH + 58;
      const x = (i) => padX + i * unit;
      const y = (h) => top + chartH - h * scale;
      let s = `<svg class="vz-bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="barras">`;
      if (best) s += `<rect x="${x(best.l) + unit / 2}" y="${y(best.h)}" width="${(best.r - best.l) * unit}" height="${best.h * scale}" class="vz-best"/>`;
      if (box) s += `<rect x="${x(box.l) + unit / 2}" y="${y(box.h)}" width="${(box.r - box.l) * unit}" height="${box.h * scale}" class="vz-box"/>`;
      heights.forEach((h, i) => {
        if (water && water[i] > 0) s += `<rect x="${x(i) + gap / 2}" y="${y(h + water[i])}" width="${unit - gap}" height="${water[i] * scale}" class="vz-water"/>`;
        s += `<rect x="${x(i) + gap / 2}" y="${y(h)}" width="${unit - gap}" height="${Math.max(h * scale, 1)}" rx="3" class="vz-bar ${state[i] || ''}"/>`;
        s += `<text x="${x(i) + unit / 2}" y="${top + chartH + 14}" class="vz-t-idx">${i}</text>`;
        s += `<text x="${x(i) + unit / 2}" y="${y(h) - 4}" class="vz-t-val">${h}</text>`;
        (ptr[i] || []).forEach((p, k) => {
          s += `<g class="vz-svgptr c-${PTR_COLOR[p] || 'plum'}"><rect x="${x(i) + 3}" y="${top + chartH + 22 + k * 18}" width="${unit - 6}" height="15" rx="7"/><text x="${x(i) + unit / 2}" y="${top + chartH + 33 + k * 18}">${esc(p)}</text></g>`;
        });
      });
      levels.forEach((lv) => {
        s += `<line x1="${padX}" x2="${chartR + 4}" y1="${y(lv.value)}" y2="${y(lv.value)}" class="vz-level c-${lv.color}"/><text x="${chartR + 8}" y="${y(lv.value) + 4}" class="vz-t-level c-${lv.color}">${esc(lv.label)}</text>`;
      });
      s += `<line x1="${padX - 4}" x2="${chartR + 4}" y1="${top + chartH}" y2="${top + chartH}" class="vz-floor"/>`;
      return s + '</svg>';
    },

    // Key/value chips for dictionaries / hash maps.
    map(obj, { title = '', hi = null } = {}) {
      const entries = Object.entries(obj);
      return `<div class="vz-map"><span class="vz-label">${esc(title)}</span>${entries.length ? entries.map(([k, v]) => `<span class="vz-kv ${String(k) === String(hi) ? 'hi' : ''}"><b>${esc(k)}</b>${esc(v)}</span>`).join('') : '<span class="vz-empty">vacío</span>'}</div>`;
    },

    // Horizontal list of chips (queues, output lists).
    list(items, { title = '', hiFirst = false, hiLast = false } = {}) {
      return `<div class="vz-map"><span class="vz-label">${esc(title)}</span>${items.length ? items.map((v, i) => `<span class="vz-kv ${(hiFirst && i === 0) || (hiLast && i === items.length - 1) ? 'hi' : ''}">${esc(v)}</span>`).join('') : '<span class="vz-empty">vacío</span>'}</div>`;
    },

    // Vertical stack (top at the top).
    stack(items, { title = 'pila', hiTop = false } = {}) {
      const rev = items.slice().reverse();
      return `<div class="vz-stack"><span class="vz-label">${esc(title)}</span><div class="vz-stack-body">${rev.length ? rev.map((v, i) => `<div class="vz-slot ${i === 0 && hiTop ? 'hi' : ''}">${esc(v)}${i === 0 ? '<span class="vz-top">tope</span>' : ''}</div>`).join('') : '<div class="vz-empty">vacía</div>'}</div></div>`;
    },

    // Relational table. rows: arrays; rowCls: per-row class (drop, keep, new, g0..g4).
    table({ title = '', columns = [], rows = [], rowCls = [], note = '' }) {
      return `<div class="vz-table"><div class="vz-table-title">${esc(title)}<span>${rows.length} fila${rows.length === 1 ? '' : 's'}</span></div>
        <div class="vz-table-scroll"><table><thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r, i) => `<tr class="${rowCls[i] || ''}">${r.map((c) => `<td>${c === null ? '<i>NULL</i>' : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        ${note ? `<div class="vz-table-note">${esc(note)}</div>` : ''}</div>`;
    },

    // Singly linked list. next[i] = index or null. ptr = { name: index | null }.
    linked(values, next, ptr = {}) {
      const n = values.length, step = 92, w = 54, h = 40, padX = 24, rowY = 64;
      const W = padX * 2 + (n - 1) * step + w + 60;
      const H = 170;
      const cx = (i) => padX + i * step;
      let s = `<svg class="vz-linked" viewBox="0 0 ${W} ${H}"><defs><marker id="vzArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="vz-arrowhead"/></marker></defs>`;
      values.forEach((v, i) => {
        const j = next[i];
        if (j === null || j === undefined) {
          s += `<text x="${cx(i) + w + 10}" y="${rowY + h / 2 + 4}" class="vz-null">∅</text>`;
        } else if (j === i + 1) {
          s += `<line x1="${cx(i) + w}" y1="${rowY + h / 2}" x2="${cx(j) - 2}" y2="${rowY + h / 2}" class="vz-link" marker-end="url(#vzArrow)"/>`;
        } else {
          const x1 = cx(i) + w / 2, x2 = cx(j) + w / 2, yb = rowY + h;
          s += `<path d="M${x1} ${yb} C ${x1} ${yb + 44}, ${x2} ${yb + 44}, ${x2} ${yb + 2}" class="vz-link back" marker-end="url(#vzArrow)"/>`;
        }
      });
      values.forEach((v, i) => {
        s += `<rect x="${cx(i)}" y="${rowY}" width="${w}" height="${h}" rx="8" class="vz-node"/><text x="${cx(i) + w / 2}" y="${rowY + h / 2 + 5}" class="vz-node-t">${esc(v)}</text>`;
      });
      const byIdx = {};
      Object.entries(ptr).forEach(([name, idx]) => { const k = idx === null || idx === undefined ? 'null' : idx; (byIdx[k] = byIdx[k] || []).push(name); });
      Object.entries(byIdx).forEach(([k, names]) => {
        const px = k === 'null' ? cx(n - 1) + w + 30 : cx(+k) + w / 2;
        names.forEach((name, m) => {
          const py = rowY - 14 - m * 19;
          s += `<g class="vz-svgptr c-${PTR_COLOR[name] || 'plum'}"><rect x="${px - 24}" y="${py - 12}" width="48" height="16" rx="8"/><text x="${px}" y="${py}">${esc(name)}</text></g>`;
        });
      });
      return s + '</svg>';
    },

    // Binary tree. nodes: [{key,left,right}] (indices), root index. hi: path ids, cur: current id, fresh: new id.
    tree(nodes, root, { path = [], cur = null, fresh = null } = {}) {
      if (root === null || root === undefined) return '<div class="vz-empty big">árbol vacío (root = None)</div>';
      const pos = {}; let order = 0, maxDepth = 0;
      const walk = (id, d) => { if (id === null || id === undefined) return; walk(nodes[id].left, d + 1); pos[id] = { x: order++, d }; maxDepth = Math.max(maxDepth, d); walk(nodes[id].right, d + 1); };
      walk(root, 0);
      const ux = 48, uy = 62, pad = 28;
      const W = pad * 2 + (order - 1) * ux, H = pad * 2 + maxDepth * uy;
      const X = (id) => pad + pos[id].x * ux, Y = (id) => pad + pos[id].d * uy;
      let s = `<svg class="vz-tree" viewBox="${-8} 0 ${Math.max(W, 120) + 16} ${H + 4}">`;
      Object.keys(pos).forEach((id) => {
        ['left', 'right'].forEach((side) => {
          const c = nodes[id][side];
          if (c !== null && c !== undefined && pos[c]) s += `<line x1="${X(id)}" y1="${Y(id)}" x2="${X(c)}" y2="${Y(c)}" class="vz-edge ${path.includes(+id) && (path.includes(c) || c === fresh) ? 'hi' : ''}"/>`;
        });
      });
      Object.keys(pos).forEach((id) => {
        const k = +id;
        const cls = k === fresh ? 'fresh' : k === cur ? 'cur' : path.includes(k) ? 'path' : '';
        s += `<circle cx="${X(k)}" cy="${Y(k)}" r="18" class="vz-tnode ${cls}"/><text x="${X(k)}" y="${Y(k) + 5}" class="vz-node-t">${esc(nodes[k].key)}</text>`;
      });
      return s + '</svg>';
    }
  };

  // ── The station UI ─────────────────────────────────────────────────────
  class TraceLab {
    constructor(id, problems) {
      this.id = id;
      this.problems = problems;
      this.problem = null;
      this.args = null;
      this.frames = [];
      this.idx = 0;
      this.timer = null;
      this.speed = 900;
    }

    init() {
      this.root = document.getElementById(`tracer-${this.id}`);
      this.learnEl = document.getElementById(`tracer-${this.id}-learn`);
      this.buildEl = document.getElementById(`tracer-${this.id}-build`);
      if (!this.root) return;
      this.root.innerHTML = this.skeleton();
      this.$ = (sel) => this.root.querySelector(sel);
      this.bind();
      this.select(this.problems[0].id);
    }

    skeleton() {
      const diffCls = { 'Fácil': 'easy', 'Media': 'mid', 'Difícil': 'hard' };
      return `
        <div class="tr-picker" role="tablist">
          ${this.problems.map((p) => `<button class="tr-pick" data-id="${p.id}" role="tab"><span class="diff ${diffCls[p.difficulty] || 'mid'}">${p.difficulty}</span>${esc(p.title)}</button>`).join('')}
        </div>
        <div class="tr-brief">
          <div class="tr-statement">
            <span class="tr-pattern"></span>
            <h3 class="tr-title"></h3>
            <div class="tr-text"></div>
          </div>
          <div class="tr-input">
            <div class="ctl-label">Entrada</div>
            <div class="chips tr-presets"></div>
            <form class="tr-custom">
              <input type="text" class="tr-field" spellcheck="false" aria-label="Entrada personalizada">
              <button class="btn btn-sm" type="submit"><svg class="ic"><use href="#i-play"/></svg>Probar</button>
            </form>
            <div class="tr-error" role="alert"></div>
          </div>
        </div>
        <div class="tr-main">
          <div class="tr-left">
            <div class="tr-controls">
              <button class="round-btn sm tr-first" title="Al inicio" aria-label="Al inicio"><svg class="ic"><use href="#i-first"/></svg></button>
              <button class="round-btn sm tr-prev" title="Paso anterior (←)" aria-label="Paso anterior"><svg class="ic"><use href="#i-back"/></svg></button>
              <button class="btn btn-primary btn-sm tr-play"><svg class="ic"><use href="#i-play"/></svg>Reproducir</button>
              <button class="round-btn sm tr-next" title="Siguiente paso (→)" aria-label="Siguiente paso"><svg class="ic"><use href="#i-step"/></svg></button>
              <button class="round-btn sm tr-last" title="Al final" aria-label="Al final"><svg class="ic"><use href="#i-last"/></svg></button>
              <span class="tr-count"></span>
            </div>
            <input type="range" class="tr-scrub" min="0" max="0" value="0" aria-label="Línea de tiempo">
            <div class="tr-code-wrap"><div class="tr-code-head"><span class="tr-lang"></span><span class="tr-line-no"></span></div><div class="tr-code" role="list"></div></div>
          </div>
          <div class="tr-right">
            <div class="tr-stage"><div class="tr-viz"></div></div>
            <div class="note tr-note"><strong class="tr-note-title">Paso</strong><span class="tr-note-text"></span></div>
            <div class="tr-vars"><div class="tr-vars-head">Variables</div><div class="tr-vars-body"></div></div>
          </div>
        </div>`;
    }

    bind() {
      this.$('.tr-picker').addEventListener('click', (e) => {
        const b = e.target.closest('.tr-pick');
        if (b) { this.select(b.dataset.id); window.soundController.playTone(600, 'sine', 0.02, 0.3); }
      });
      this.$('.tr-presets').addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        this.$('.tr-field').value = b.dataset.value;
        this.run(b.dataset.value);
      });
      this.$('.tr-custom').addEventListener('submit', (e) => { e.preventDefault(); this.run(this.$('.tr-field').value); });
      this.$('.tr-first').addEventListener('click', () => this.go(0));
      this.$('.tr-prev').addEventListener('click', () => this.prev());
      this.$('.tr-next').addEventListener('click', () => this.next());
      this.$('.tr-last').addEventListener('click', () => this.go(this.frames.length - 1));
      this.$('.tr-play').addEventListener('click', () => this.togglePlay());
      this.$('.tr-scrub').addEventListener('input', (e) => { this.stop(); this.go(+e.target.value); });
    }

    select(id) {
      this.stop();
      this.problem = this.problems.find((p) => p.id === id) || this.problems[0];
      const p = this.problem;
      this.root.querySelectorAll('.tr-pick').forEach((b) => b.classList.toggle('active', b.dataset.id === p.id));
      this.$('.tr-pattern').textContent = p.pattern;
      this.$('.tr-title').textContent = p.title;
      this.$('.tr-text').innerHTML = p.statement;
      this.$('.tr-lang').textContent = p.lang === 'sql' ? 'SQL' : 'Python';

      const hasInput = p.presets && p.presets.length;
      this.$('.tr-input').hidden = !hasInput;
      if (hasInput) {
        this.$('.tr-presets').innerHTML = p.presets.map((v, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-value="${esc(v)}">Ejemplo ${i + 1}</button>`).join('');
        this.$('.tr-field').value = p.presets[0];
        this.$('.tr-field').placeholder = p.presets[0];
      }

      this.$('.tr-code').innerHTML = p.code.map((line, i) => `<div class="tr-line" role="listitem" data-line="${i + 1}"><span class="tr-gutter">${i + 1}</span><code>${highlight(line, p.lang) || ' '}</code></div>`).join('');
      this.renderLearn();
      this.renderBuild();
      this.run(hasInput ? p.presets[0] : '');
    }

    run(text) {
      const p = this.problem;
      const err = this.$('.tr-error');
      this.stop();
      try {
        this.args = p.parse ? p.parse(text) : null;
        this.frames = p.trace(this.args);
        err.textContent = '';
        this.$('.tr-field').classList.remove('bad');
        this.root.querySelectorAll('.tr-presets .chip').forEach((c) => c.classList.toggle('active', c.dataset.value === text));
      } catch (e) {
        err.textContent = e.message || 'No pude leer esa entrada.';
        this.$('.tr-field').classList.add('bad');
        return;
      }
      this.$('.tr-scrub').max = this.frames.length - 1;
      this.go(0);
    }

    go(i) {
      if (!this.frames.length) return;
      this.idx = Math.max(0, Math.min(i, this.frames.length - 1));
      this.renderFrame();
    }
    next() { if (this.idx < this.frames.length - 1) { this.go(this.idx + 1); window.soundController.playTone(520 + (this.frames[this.idx].line % 8) * 40, 'sine', 0.02, 0.25); } else this.stop(); }
    prev() { this.stop(); this.go(this.idx - 1); }

    togglePlay() { this.timer ? this.stop() : this.play(); }
    play() {
      if (this.idx >= this.frames.length - 1) this.go(0);
      this.setPlayButton(true);
      this.timer = setInterval(() => {
        if (!this.root.offsetParent || this.idx >= this.frames.length - 1) return this.stop();
        this.next();
      }, this.speed);
    }
    stop() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.setPlayButton(false);
    }
    setPlayButton(playing) {
      const b = this.$('.tr-play');
      if (b) b.innerHTML = playing ? '<svg class="ic"><use href="#i-pause"/></svg>Pausar' : '<svg class="ic"><use href="#i-play"/></svg>Reproducir';
    }

    renderFrame() {
      const p = this.problem;
      const f = this.frames[this.idx];
      const prevF = this.frames[this.idx - 1];

      // Code: current line + lines already visited
      const visited = new Set(this.frames.slice(0, this.idx).map((x) => x.line));
      const code = this.$('.tr-code');
      code.querySelectorAll('.tr-line').forEach((el) => {
        const n = +el.dataset.line;
        el.classList.toggle('cur', n === f.line);
        el.classList.toggle('ran', visited.has(n) && n !== f.line);
      });
      const cur = code.querySelector('.tr-line.cur');
      if (cur) {
        const top = cur.offsetTop - code.offsetTop, h = code.clientHeight;
        if (top < code.scrollTop + 20 || top > code.scrollTop + h - 40) code.scrollTop = top - h / 3;
      }
      this.$('.tr-line-no').textContent = `línea ${f.line}`;

      // Stage
      this.$('.tr-viz').innerHTML = p.render(f.viz, this.args);

      // Narration
      this.$('.tr-note-title').textContent = `Paso ${this.idx + 1} de ${this.frames.length}`;
      this.$('.tr-note-text').innerHTML = f.note || '';

      // Variables (flag the ones that just changed)
      const body = this.$('.tr-vars-body');
      const entries = Object.entries(f.vars || {});
      body.innerHTML = entries.length ? entries.map(([k, v]) => {
        const changed = prevF && JSON.stringify((prevF.vars || {})[k]) !== JSON.stringify(v);
        return `<div class="tr-var ${changed ? 'changed' : ''}"><span>${esc(k)}</span><code>${esc(fmt(v, p.lang))}</code></div>`;
      }).join('') : '<div class="vz-empty">Todavía no hay variables.</div>';

      this.$('.tr-scrub').value = this.idx;
      this.$('.tr-count').textContent = `${this.idx + 1} / ${this.frames.length}`;
      this.$('.tr-first').disabled = this.$('.tr-prev').disabled = this.idx === 0;
      this.$('.tr-last').disabled = this.$('.tr-next').disabled = this.idx === this.frames.length - 1;

      // Reaching the last line counts as walking the problem through
      if (this.idx === this.frames.length - 1 && window.account) window.account.record(this.id, `solve:${p.id}`);
    }

    renderLearn() {
      if (!this.learnEl) return;
      const L = this.problem.learn;
      this.learnEl.innerHTML = `
        <div class="learn-grid">
          <article class="learn-card wide">
            <span class="tag">${esc(this.problem.pattern)}</span>
            <h3>${esc(this.problem.title)}: la idea</h3>
            ${L.idea}
          </article>
          <article class="learn-card">
            <h3>¿Cómo lo reconozco?</h3>
            <ul class="plain">${L.signals.map((s) => `<li>${s}</li>`).join('')}</ul>
          </article>
          <article class="learn-card">
            <h3>¿Cuánto cuesta?</h3>
            <dl class="kv"><dt>Tiempo</dt><dd>${esc(L.time)}</dd><dt>Memoria extra</dt><dd>${esc(L.space)}</dd></dl>
            <p style="margin-top:.8rem">${L.why}</p>
          </article>
        </div>`;
    }

    renderBuild() {
      if (!this.buildEl) return;
      const B = this.problem.build;
      const lang = this.problem.lang;
      this.buildEl.innerHTML = `
        <div class="learn-grid">
          <article class="learn-card wide">
            <h3>${esc(B.templateTitle || 'Plantilla del patrón')}</h3>
            <pre class="code">${B.template.split('\n').map((l) => highlight(l, lang)).join('\n')}</pre>
          </article>
          <article class="learn-card">
            <h3>Consejos para la entrevista</h3>
            <ul class="plain">${B.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
          </article>
          <article class="learn-card">
            <h3>Practica con problemas parecidos</h3>
            <ul class="plain">${B.similar.map((t) => `<li>${t}</li>`).join('')}</ul>
          </article>
        </div>`;
    }
  }

  window.Tracer = { TraceLab, Recorder, viz, highlight, esc, fmt };
})();
