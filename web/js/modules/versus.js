// CS Interactive Workshop - Algorithm vs. algorithm
// Two sorting algorithms race on the very same array. Each sort is recorded first as a list of
// operations (compare two positions, swap two, write one value); the race then plays both lists
// side by side, one operation per side per tick. Whoever needs fewer operations finishes first,
// which is exactly the work that Big-O notation counts.
(function (root) {
  const NAMES = {
    quick: 'Quick Sort', merge: 'Merge Sort', heap: 'Heap Sort', shell: 'Shell Sort',
    insertion: 'Insertion Sort', selection: 'Selection Sort', bubble: 'Bubble Sort', radix: 'Radix Sort (LSD)'
  };
  // O(n log n) on average vs O(n²): used to spot the expected wins and the upsets
  const FAST = ['quick', 'merge', 'heap'];
  const SLOW = ['bubble', 'selection', 'insertion'];

  // The same starting arrays as the sorting station
  function makeArray(dist, n, rnd = Math.random) {
    const a = [];
    if (dist === 'nearly-sorted') {
      for (let i = 0; i < n; i++) a.push(Math.floor((i / n) * 90) + 10);
      for (let k = 0; k < Math.max(2, n / 10); k++) {
        const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n);
        [a[i], a[j]] = [a[j], a[i]];
      }
    } else if (dist === 'reversed') {
      for (let i = n - 1; i >= 0; i--) a.push(Math.floor((i / n) * 90) + 10);
    } else if (dist === 'few-unique') {
      const set = [20, 45, 70, 95];
      for (let i = 0; i < n; i++) a.push(set[Math.floor(rnd() * set.length)]);
    } else {
      for (let i = 0; i < n; i++) a.push(Math.floor(rnd() * 95) + 5);
    }
    return a;
  }

  // Every operation a sort makes on its own copy of the array
  function trace(algo, input) {
    const a = input.slice();
    const n = a.length;
    const ops = [];
    let comparisons = 0, writes = 0;
    const cmp = (i, j) => { ops.push({ t: 'cmp', i, j }); comparisons++; return a[i] - a[j]; };
    const swap = (i, j) => { ops.push({ t: 'swap', i, j }); writes++; [a[i], a[j]] = [a[j], a[i]]; };
    const set = (i, v) => { ops.push({ t: 'set', i, v }); writes++; a[i] = v; };

    const SORTS = {
      bubble() {
        for (let i = 0; i < n - 1; i++) {
          let swapped = false;
          for (let j = 0; j < n - i - 1; j++) if (cmp(j, j + 1) > 0) { swap(j, j + 1); swapped = true; }
          if (!swapped) break;
        }
      },
      selection() {
        for (let i = 0; i < n - 1; i++) {
          let min = i;
          for (let j = i + 1; j < n; j++) if (cmp(j, min) < 0) min = j;
          if (min !== i) swap(i, min);
        }
      },
      insertion() {
        for (let i = 1; i < n; i++) for (let j = i; j > 0 && cmp(j, j - 1) < 0; j--) swap(j, j - 1);
      },
      shell() {
        for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
          for (let i = gap; i < n; i++) for (let j = i; j >= gap && cmp(j, j - gap) < 0; j -= gap) swap(j, j - gap);
        }
      },
      merge() {
        const sort = (lo, hi) => {
          if (lo >= hi) return;
          const mid = Math.floor((lo + hi) / 2);
          sort(lo, mid); sort(mid + 1, hi);
          const tmp = [];
          let i = lo, j = mid + 1;
          while (i <= mid && j <= hi) tmp.push(cmp(i, j) <= 0 ? a[i++] : a[j++]);
          while (i <= mid) tmp.push(a[i++]);
          while (j <= hi) tmp.push(a[j++]);
          tmp.forEach((v, k) => set(lo + k, v));
        };
        sort(0, n - 1);
      },
      quick() {
        // Last element as the pivot, like the sorting station
        const sort = (lo, hi) => {
          if (lo >= hi) return;
          let i = lo - 1;
          for (let j = lo; j < hi; j++) if (cmp(j, hi) < 0) swap(++i, j);
          swap(i + 1, hi);
          sort(lo, i); sort(i + 2, hi);
        };
        sort(0, n - 1);
      },
      heap() {
        const sift = (size, i) => {
          for (;;) {
            let big = i;
            const l = 2 * i + 1, r = l + 1;
            if (l < size && cmp(l, big) > 0) big = l;
            if (r < size && cmp(r, big) > 0) big = r;
            if (big === i) return;
            swap(i, big); i = big;
          }
        };
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) sift(n, i);
        for (let end = n - 1; end > 0; end--) { swap(0, end); sift(end, 0); }
      },
      radix() {
        const max = Math.max(0, ...a);
        for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
          const out = new Array(n), count = new Array(10).fill(0);
          a.forEach((x) => count[Math.floor(x / exp) % 10]++);
          for (let d = 1; d < 10; d++) count[d] += count[d - 1];
          for (let i = n - 1; i >= 0; i--) out[--count[Math.floor(a[i] / exp) % 10]] = a[i];
          out.forEach((v, i) => set(i, v));
        }
      }
    };
    if (!SORTS[algo]) throw new Error(`Unknown algorithm: ${algo}`);
    SORTS[algo]();
    return { ops, comparisons, writes, sorted: a };
  }

  // Who won, and by how much
  function verdict(left, right) {
    const a = left.ops.length, b = right.ops.length;
    if (a === b) return { winner: null, ratio: 1 };
    const winner = a < b ? 'left' : 'right';
    return { winner, ratio: Math.max(a, b) / Math.max(1, Math.min(a, b)) };
  }

  // Operations per second for the speed slider (1..100): from a crawl to thousands
  const opsPerSecond = (speed) => 2 * Math.pow(1.075, speed);

  const fmt = (n) => n.toLocaleString(T('es-CR', 'en-US'));

  class VersusStation {
    constructor() {
      this.algos = { left: 'quick', right: 'bubble' };
      this.size = 40;
      this.dist = 'random';
      this.speed = 60;
      this.array = [];
      this.lanes = {};
      this.isRunning = false;
      this.raf = null;
      this.finished = false;
    }

    tc(name, fallback) { return root.Theme ? root.Theme.color(name, fallback) : fallback; }
    $(id) { return document.getElementById(id); }

    init() {
      if (!this.$('vsStage')) return;
      ['left', 'right'].forEach((side) => {
        const el = document.querySelector(`.vs-lane[data-side="${side}"]`);
        const canvas = el.querySelector('canvas');
        this.lanes[side] = { el, canvas, ctx: canvas.getContext('2d') };
      });
      this.bind();
      this.shuffle();
      if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', () => this.resizeCanvas());
    }

    bind() {
      const pick = (side) => (e) => { this.algos[side] = e.target.value; this.reset(); };
      this.$('vsLeft').addEventListener('change', pick('left'));
      this.$('vsRight').addEventListener('change', pick('right'));
      document.querySelectorAll('#vsPresets .chip').forEach((btn) => btn.addEventListener('click', () => {
        document.querySelectorAll('#vsPresets .chip').forEach((b) => b.classList.toggle('active', b === btn));
        this.dist = btn.dataset.dist;
        this.shuffle();
      }));
      this.$('vsSize').addEventListener('input', (e) => {
        this.size = parseInt(e.target.value, 10);
        this.$('vsSizeVal').textContent = this.size;
        this.shuffle();
      });
      this.$('vsSpeed').addEventListener('input', (e) => {
        this.speed = parseInt(e.target.value, 10);
        this.$('vsSpeedVal').textContent = `${this.speed}%`;
      });
      this.$('btnVsRun').addEventListener('click', () => (this.isRunning ? this.pause() : this.start()));
      this.$('btnVsShuffle').addEventListener('click', () => this.shuffle());
    }

    // A new starting array (the same one for both sides)
    shuffle() {
      this.stop();
      this.array = makeArray(this.dist, this.size);
      this.reset();
    }

    // Back to the starting line with the current array and algorithms
    reset() {
      this.stop();
      this.finished = false;
      this.acc = 0;
      ['left', 'right'].forEach((side) => {
        const lane = this.lanes[side];
        lane.run = trace(this.algos[side], this.array);
        lane.arr = this.array.slice();
        lane.pos = 0; lane.cmp = 0; lane.wr = 0; lane.hi = null;
        lane.el.querySelector('.vs-name').textContent = NAMES[this.algos[side]];
        lane.el.classList.remove('won', 'lost');
      });
      this.$('vsResult').hidden = true;
      this.render();
      this.resizeCanvas();
    }

    start() {
      if (this.finished) this.reset();
      this.isRunning = true;
      this.setButton();
      this.$('vsStatus').textContent = T('¡Corriendo!', 'Racing!');
      let last = null;
      const frame = (now) => {
        if (!this.isRunning) return;
        if (last === null) last = now;
        this.acc += (opsPerSecond(this.speed) * Math.min(100, now - last)) / 1000;
        last = now;
        const k = Math.floor(this.acc);
        this.acc -= k;
        if (k > 0) this.advance(k);
        if (!this.finished) this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    }

    // Both sides make the same number of operations; a side that already finished waits
    advance(k) {
      ['left', 'right'].forEach((side) => {
        const lane = this.lanes[side];
        for (let s = 0; s < k && lane.pos < lane.run.ops.length; s++) {
          const op = lane.run.ops[lane.pos++];
          if (op.t === 'cmp') { lane.cmp++; lane.hi = { cmp: [op.i, op.j] }; }
          else if (op.t === 'swap') { lane.wr++; [lane.arr[op.i], lane.arr[op.j]] = [lane.arr[op.j], lane.arr[op.i]]; lane.hi = { wr: [op.i, op.j] }; }
          else { lane.wr++; lane.arr[op.i] = op.v; lane.hi = { wr: [op.i] }; }
        }
        if (lane.pos >= lane.run.ops.length) lane.hi = null;
      });
      this.render();
      const done = ['left', 'right'].map((s) => this.lanes[s].pos >= this.lanes[s].run.ops.length);
      if (done[0] || done[1]) this.markLeader(done);
      if (done[0] && done[1]) this.finish();
    }

    markLeader(done) {
      const v = verdict(this.lanes.left.run, this.lanes.right.run);
      if (!v.winner) return;
      const loser = v.winner === 'left' ? 'right' : 'left';
      if (done[v.winner === 'left' ? 0 : 1]) {
        this.lanes[v.winner].el.classList.add('won');
        this.lanes[loser].el.classList.add('lost');
      }
    }

    finish() {
      this.finished = true;
      this.isRunning = false;
      this.setButton();
      this.$('vsStatus').textContent = T('Terminado', 'Finished');
      const L = this.lanes.left, R = this.lanes.right;
      const v = verdict(L.run, R.run);
      const box = this.$('vsResult');
      box.hidden = false;
      const name = (s) => NAMES[this.algos[s]];
      if (!v.winner) {
        this.$('vsResultTitle').textContent = T('¡Empate!', 'A tie!');
        this.$('vsResultText').textContent = T(`Los dos necesitaron ${fmt(L.run.ops.length)} operaciones.`, `Both needed ${fmt(L.run.ops.length)} operations.`);
      } else {
        const w = v.winner, l = w === 'left' ? 'right' : 'left';
        const times = v.ratio >= 1.95 ? T(`, ${v.ratio.toFixed(1)} veces más`, `, ${v.ratio.toFixed(1)} times as many`) : '';
        this.$('vsResultTitle').textContent = T(`¡Gana ${name(w)}!`, `${name(w)} wins!`);
        this.$('vsResultText').textContent = T(
          `${name(w)} terminó en ${fmt(this.lanes[w].run.ops.length)} operaciones; ${name(l)} necesitó ${fmt(this.lanes[l].run.ops.length)}${times}.`,
          `${name(w)} finished in ${fmt(this.lanes[w].run.ops.length)} operations; ${name(l)} needed ${fmt(this.lanes[l].run.ops.length)}${times}.`
        );
      }
      this.record(v);
      if (root.soundController) root.soundController.playSuccess();
    }

    record(v) {
      const acc = root.account;
      if (!acc) return;
      acc.record('versus', 'race');
      if (!v.winner) return;
      const w = this.algos[v.winner], l = this.algos[v.winner === 'left' ? 'right' : 'left'];
      if (FAST.includes(w) && SLOW.includes(l)) acc.record('versus', 'nlogn');
      if (SLOW.includes(w) && FAST.includes(l)) acc.record('versus', 'upset');
    }

    pause() {
      this.isRunning = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.setButton();
      if (this.$('vsStatus')) this.$('vsStatus').textContent = T('En pausa', 'Paused');
    }

    stop() {
      this.isRunning = false;
      if (this.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf);
      this.raf = null;
      this.setButton();
      if (this.$('vsStatus')) this.$('vsStatus').textContent = T('Listo', 'Ready');
    }

    setButton() {
      const btn = this.$('btnVsRun');
      if (!btn) return;
      btn.innerHTML = this.isRunning
        ? `<svg class="ic"><use href="#i-pause"/></svg>${T('Pausar', 'Pause')}`
        : `<svg class="ic"><use href="#i-play"/></svg>${T('¡Arranquen!', 'Go!')}`;
      btn.classList.toggle('btn-danger', this.isRunning);
      btn.classList.toggle('btn-primary', !this.isRunning);
    }

    resizeCanvas() {
      ['left', 'right'].forEach((side) => {
        const lane = this.lanes[side];
        if (!lane || !lane.canvas.parentElement) return;
        const w = lane.canvas.parentElement.getBoundingClientRect().width || 480;
        lane.canvas.width = Math.round(w);
        lane.canvas.height = Math.round(Math.min(260, Math.max(150, w * 0.5)));
      });
      this.render();
    }

    render() {
      ['left', 'right'].forEach((side) => {
        const lane = this.lanes[side];
        if (!lane || !lane.run) return;
        const total = lane.run.ops.length;
        const q = (sel) => lane.el.querySelector(sel);
        q('.vs-cmp').textContent = fmt(lane.cmp);
        q('.vs-wr').textContent = fmt(lane.wr);
        q('.vs-ops').textContent = `${fmt(lane.pos)} / ${fmt(total)}`;
        q('.vs-bar i').style.width = `${total ? (lane.pos / total) * 100 : 100}%`;
        this.draw(lane, lane.pos > 0 && lane.pos >= total);
      });
    }

    draw(lane, done) {
      const { ctx, canvas, arr, hi } = lane;
      if (!ctx) return;
      const w = canvas.width, h = canvas.height, n = arr.length;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = this.tc('--cv-floor', '#d4dce4');
      ctx.fillRect(0, h - 8, w, 8);
      const gap = n > 80 ? 1 : 2;
      const bw = Math.max(1, (w - (n + 1) * gap) / n);
      const cmp = (hi && hi.cmp) || [], wr = (hi && hi.wr) || [];
      for (let i = 0; i < n; i++) {
        const bh = (arr[i] / 100) * (h - 30);
        const x = gap + i * (bw + gap), y = h - bh - 8;
        ctx.fillStyle = done ? this.tc('--mint', '#2db886')
          : wr.includes(i) ? this.tc('--tomato', '#d8382e')
            : cmp.includes(i) ? this.tc('--sun-y', '#f5c518')
              : this.tc('--sky-b', '#2e6be6');
        const r = Math.min(3, bw / 2);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, [r, r, 0, 0]); else ctx.rect(x, y, bw, bh);
        ctx.fill();
        if (bw >= 6) { ctx.lineWidth = 2; ctx.strokeStyle = this.tc('--box-ink', '#1b2027'); ctx.stroke(); }
      }
    }
  }

  root.Versus = { NAMES, FAST, SLOW, makeArray, trace, verdict, opsPerSecond, VersusStation };
  root.versusStation = new VersusStation();
})(typeof window !== 'undefined' ? window : globalThis);
