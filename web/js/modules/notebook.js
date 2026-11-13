// CS Interactive Workshop - "Mis apuntes": a real notebook inside El Cuaderno.
//
// Notes live on this device (localStorage). The model (window.Notebook) is pure and
// tested on its own; NotebookStation only draws it and reacts to the user.
(function () {
  const KEY = 'csworkshop-notes';
  const MAX_NOTES = 200;
  const MAX_TITLE = 80;
  const MAX_BODY = 20000;

  // Topics follow the workshop; 'general' is for everything else
  const TOPICS = [
    { id: 'general', label: T('General', 'General') },
    { id: 'algorithms', label: T('Ordenamiento', 'Sorting') },
    { id: 'datastructures', label: T('Estructuras de datos', 'Data structures') },
    { id: 'concurrency', label: T('Concurrencia', 'Concurrency') },
    { id: 'heat', label: T('Paralelismo', 'Parallelism') },
    { id: 'networking', label: T('Redes', 'Networking') },
    { id: 'interview', label: T('Problemas de código', 'Coding problems') },
    { id: 'sql', label: T('Bases de datos', 'Databases') }
  ];
  const TOPIC_IDS = TOPICS.map((t) => t.id);

  const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
  const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  // Keep only well-formed notes; drop anything else
  function sanitize(list) {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    return list.filter((n) => n && typeof n === 'object' && typeof n.id === 'string' && !seen.has(n.id) && seen.add(n.id))
      .slice(0, MAX_NOTES)
      .map((n) => ({
        id: n.id,
        title: clip(n.title, MAX_TITLE),
        body: clip(n.body, MAX_BODY),
        topic: TOPIC_IDS.includes(n.topic) ? n.topic : 'general',
        updated: Number.isFinite(n.updated) ? n.updated : 0
      }));
  }

  function load(storage) {
    try { return sanitize(JSON.parse(storage.getItem(KEY) || '[]')); } catch (e) { return []; }
  }
  function save(storage, notes) {
    try { storage.setItem(KEY, JSON.stringify(sanitize(notes))); return true; } catch (e) { return false; }
  }

  // Newest first
  const sorted = (notes) => notes.slice().sort((a, b) => b.updated - a.updated);

  function create(notes, { topic = 'general', now = Date.now() } = {}) {
    if (notes.length >= MAX_NOTES) return { notes, note: null };
    const note = { id: newId(), title: '', body: '', topic: TOPIC_IDS.includes(topic) ? topic : 'general', updated: now };
    return { notes: [note, ...notes], note };
  }

  function update(notes, id, patch, now = Date.now()) {
    return notes.map((n) => (n.id !== id ? n : {
      ...n,
      title: 'title' in patch ? clip(patch.title, MAX_TITLE) : n.title,
      body: 'body' in patch ? clip(patch.body, MAX_BODY) : n.body,
      topic: 'topic' in patch && TOPIC_IDS.includes(patch.topic) ? patch.topic : n.topic,
      updated: now
    }));
  }

  const remove = (notes, id) => notes.filter((n) => n.id !== id);

  // Search title and body (accent- and case-insensitive), optionally within one topic
  const fold = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function filter(notes, { q = '', topic = 'all' } = {}) {
    const needle = fold(q.trim());
    return sorted(notes).filter((n) => (topic === 'all' || n.topic === topic) && (!needle || fold(`${n.title}\n${n.body}`).includes(needle)));
  }

  // What the list shows: the title, or the first line of the text
  function heading(note) {
    const first = note.body.split('\n').map((l) => l.trim()).find(Boolean) || '';
    return note.title.trim() || clip(first, 60) || T('Nota sin título', 'Untitled note');
  }

  const isEmpty = (note) => !note.title.trim() && !note.body.trim();

  window.Notebook = { KEY, MAX_NOTES, MAX_TITLE, MAX_BODY, TOPICS, sanitize, load, save, create, update, remove, filter, heading, isEmpty };

  // ── UI ───────────────────────────────────────────────────────────────
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const topicLabel = (id) => (TOPICS.find((t) => t.id === id) || TOPICS[0]).label;
  const when = (ms) => {
    if (!ms) return '';
    try { return new Date(ms).toLocaleDateString(window.I18n && window.I18n.lang === 'en' ? 'en-US' : 'es-CR', { day: 'numeric', month: 'short' }); } catch (e) { return ''; }
  };

  class NotebookStation {
    constructor() {
      this.notes = [];
      this.current = null;
      this.query = '';
      this.topic = 'all';
      this.saveTimer = null;
    }

    init() {
      this.root = document.getElementById('notebook');
      if (!this.root) return;
      this.storage = window.localStorage;
      this.notes = load(this.storage);
      this.root.innerHTML = this.skeleton();
      this.$ = (sel) => this.root.querySelector(sel);
      this.bind();
      const first = filter(this.notes)[0];
      this.open(first ? first.id : null);
    }

    skeleton() {
      const options = (withAll) => (withAll ? `<option value="all">${T('Todos los temas', 'All topics')}</option>` : '') +
        TOPICS.map((t) => `<option value="${t.id}">${esc(t.label)}</option>`).join('');
      return `
        <div class="nb">
          <aside class="nb-side">
            <div class="nb-tools">
              <button class="btn btn-primary btn-sm nb-new" type="button"><svg class="ic"><use href="#i-plus"/></svg>${T('Nueva nota', 'New note')}</button>
              <input type="search" class="nb-search" placeholder="${T('Buscar en tus notas', 'Search your notes')}" aria-label="${T('Buscar en tus notas', 'Search your notes')}">
              <select class="nb-filter" aria-label="${T('Filtrar por tema', 'Filter by topic')}">${options(true)}</select>
            </div>
            <ul class="nb-list" role="listbox" aria-label="${T('Tus notas', 'Your notes')}"></ul>
            <p class="nb-count"></p>
          </aside>
          <div class="nb-editor">
            <div class="nb-empty">
              <p>${T('Aquí puedes anotar lo que quieras recordar: una idea, un truco, una duda para el profe.', 'Write down anything you want to remember: an idea, a trick, a question for your teacher.')}</p>
              <p>${T('Tus notas se guardan solas en este dispositivo.', 'Your notes save themselves on this device.')}</p>
            </div>
            <div class="nb-form" hidden>
              <div class="nb-head">
                <input type="text" class="nb-title" maxlength="${MAX_TITLE}" placeholder="${T('Título', 'Title')}" aria-label="${T('Título de la nota', 'Note title')}">
                <select class="nb-topic" aria-label="${T('Tema de la nota', 'Note topic')}">${options(false)}</select>
              </div>
              <textarea class="nb-body" maxlength="${MAX_BODY}" placeholder="${T('Escribe tu nota…', 'Write your note…')}" aria-label="${T('Texto de la nota', 'Note text')}"></textarea>
              <div class="nb-foot">
                <span class="nb-status" aria-live="polite"></span>
                <button class="btn btn-ghost btn-sm nb-delete" type="button"><svg class="ic"><use href="#i-trash"/></svg>${T('Borrar nota', 'Delete note')}</button>
              </div>
            </div>
          </div>
        </div>`;
    }

    bind() {
      this.$('.nb-new').addEventListener('click', () => this.add());
      this.$('.nb-search').addEventListener('input', (e) => { this.query = e.target.value; this.renderList(); });
      this.$('.nb-filter').addEventListener('change', (e) => { this.topic = e.target.value; this.renderList(); });
      this.$('.nb-list').addEventListener('click', (e) => { const li = e.target.closest('[data-id]'); if (li) this.open(li.dataset.id); });
      this.$('.nb-list').addEventListener('keydown', (e) => {
        const li = e.target.closest('[data-id]');
        if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.open(li.dataset.id); }
      });
      this.$('.nb-title').addEventListener('input', (e) => this.edit({ title: e.target.value }));
      this.$('.nb-body').addEventListener('input', (e) => this.edit({ body: e.target.value }));
      this.$('.nb-topic').addEventListener('change', (e) => this.edit({ topic: e.target.value }));
      this.$('.nb-delete').addEventListener('click', () => this.del());
    }

    add() {
      // Reuse the open note if it is still blank, instead of piling up empty ones
      const open = this.notes.find((n) => n.id === this.current);
      if (open && isEmpty(open)) { this.$('.nb-title').focus(); return; }
      const { notes, note } = create(this.notes, { topic: this.topic === 'all' ? 'general' : this.topic });
      if (!note) { this.status(T('Llegaste al máximo de notas.', 'You reached the maximum number of notes.')); return; }
      this.notes = notes;
      this.persist();
      this.query = ''; this.$('.nb-search').value = '';
      this.open(note.id);
      this.$('.nb-title').focus();
    }

    open(id) {
      this.flush();
      this.current = id && this.notes.some((n) => n.id === id) ? id : null;
      const note = this.notes.find((n) => n.id === this.current);
      this.$('.nb-form').hidden = !note;
      this.$('.nb-empty').hidden = !!note;
      if (note) {
        this.$('.nb-title').value = note.title;
        this.$('.nb-body').value = note.body;
        this.$('.nb-topic').value = note.topic;
        this.status(note.updated ? T(`Guardada · ${when(note.updated)}`, `Saved · ${when(note.updated)}`) : '');
      }
      this.renderList();
    }

    edit(patch) {
      if (!this.current) return;
      this.notes = update(this.notes, this.current, patch);
      this.status(T('Guardando…', 'Saving…'));
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.flush(), 400);
      this.renderList();
    }

    // Write pending changes now
    flush() {
      if (!this.saveTimer) return;
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      const ok = this.persist();
      this.status(ok ? T('Guardada', 'Saved') : T('No se pudo guardar en este navegador.', 'This browser could not save it.'));
      const note = this.notes.find((n) => n.id === this.current);
      if (ok && note && !isEmpty(note) && window.account) window.account.record('cheatsheets', 'note');
    }

    persist() { return save(this.storage, this.notes); }

    del() {
      const note = this.notes.find((n) => n.id === this.current);
      if (!note) return;
      if (!isEmpty(note) && !window.confirm(T(`¿Borrar «${heading(note)}»? No se puede deshacer.`, `Delete "${heading(note)}"? This cannot be undone.`))) return;
      clearTimeout(this.saveTimer); this.saveTimer = null;
      this.notes = remove(this.notes, note.id);
      this.persist();
      const next = filter(this.notes, { q: this.query, topic: this.topic })[0];
      this.open(next ? next.id : null);
    }

    status(text) { const el = this.$('.nb-status'); if (el) el.textContent = text; }

    renderList() {
      const shown = filter(this.notes, { q: this.query, topic: this.topic });
      const list = this.$('.nb-list');
      list.innerHTML = shown.length ? shown.map((n) => `
        <li class="nb-item${n.id === this.current ? ' active' : ''}" data-id="${n.id}" role="option" tabindex="0" aria-selected="${n.id === this.current}">
          <span class="nb-item-title">${esc(heading(n))}</span>
          <span class="nb-item-meta"><span class="nb-tag" data-topic="${n.topic}">${esc(topicLabel(n.topic))}</span>${esc(when(n.updated))}</span>
        </li>`).join('')
        : `<li class="nb-none">${this.notes.length ? T('Ninguna nota coincide.', 'No notes match.') : T('Todavía no tienes notas.', 'You have no notes yet.')}</li>`;
      const total = this.notes.length;
      this.$('.nb-count').textContent = T(`${total} nota${total === 1 ? '' : 's'}`, `${total} note${total === 1 ? '' : 's'}`);
    }
  }

  window.notebookStation = new NotebookStation();
})();
