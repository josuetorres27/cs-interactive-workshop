// CS Interactive Workshop - Algorithms & Data Structures Module
class AlgorithmsStation {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.array = [];
    this.arraySize = 50;
    this.delay = 20;
    this.isRunning = false;
    this.isPaused = false;
    this.shouldStop = false;
    
    this.comparisons = 0;
    this.swaps = 0;
    this.startTime = 0;
    this.timerInterval = null;

    this.currentAlgo = 'quick';
    this.highlightIndices = { active: [], comparing: [], sorted: [] };

    this.complexities = {
      bubble: { name: 'Bubble Sort', timeBest: 'O(n)', timeAvg: 'O(n²)', timeWorst: 'O(n²)', space: 'O(1)', stable: true },
      selection: { name: 'Selection Sort', timeBest: 'O(n²)', timeAvg: 'O(n²)', timeWorst: 'O(n²)', space: 'O(1)', stable: false },
      insertion: { name: 'Insertion Sort', timeBest: 'O(n)', timeAvg: 'O(n²)', timeWorst: 'O(n²)', space: 'O(1)', stable: true },
      shell: { name: 'Shell Sort', timeBest: 'O(n log n)', timeAvg: 'O(n^(4/3))', timeWorst: 'O(n²)', space: 'O(1)', stable: false },
      merge: { name: 'Merge Sort', timeBest: 'O(n log n)', timeAvg: 'O(n log n)', timeWorst: 'O(n log n)', space: 'O(n)', stable: true },
      quick: { name: 'Quick Sort', timeBest: 'O(n log n)', timeAvg: 'O(n log n)', timeWorst: 'O(n²)', space: 'O(log n)', stable: false },
      heap: { name: 'Heap Sort', timeBest: 'O(n log n)', timeAvg: 'O(n log n)', timeWorst: 'O(n log n)', space: 'O(1)', stable: false },
      radix: { name: 'Radix Sort (LSD)', timeBest: 'O(nk)', timeAvg: 'O(nk)', timeWorst: 'O(nk)', space: 'O(n + k)', stable: true }
    };

    this.intuitions = {
      quick: {
        title: "Quick Sort",
        concept: "Elige un elemento pivote y reparte el arreglo: los menores a la izquierda, los mayores a la derecha. Después repite lo mismo en cada lado. Es el más usado en la práctica porque aprovecha muy bien la memoria caché.",
        tip: "Si el pivote siempre cae en un extremo (por ejemplo, un arreglo ya ordenado y pivote al final), se degrada a O(n²)."
      },
      merge: {
        title: "Merge Sort",
        concept: "Parte el arreglo a la mitad una y otra vez hasta tener pedazos de un elemento, y luego los va mezclando en orden.",
        tip: "Siempre es O(n log n), incluso en el peor caso, y es estable. El precio: necesita O(n) de memoria extra."
      },
      heap: {
        title: "Heap Sort",
        concept: "Convierte el arreglo en un montículo (heap) donde el mayor está en la raíz. Lo manda al final, rearma el montículo y repite.",
        tip: "O(n log n) garantizado sin memoria extra, pero no es estable y salta mucho por la memoria."
      },
      shell: {
        title: "Shell Sort",
        concept: "Es Insertion Sort con saltos: primero compara elementos lejanos y va reduciendo la distancia hasta comparar vecinos.",
        tip: "Los saltos grandes mueven rápido los elementos que están muy fuera de lugar, sin usar memoria extra."
      },
      insertion: {
        title: "Insertion Sort",
        concept: "Como ordenar cartas en la mano: toma cada elemento y córrelo a la izquierda hasta que quede en su lugar.",
        tip: "En arreglos casi ordenados o muy pequeños es el más rápido de todos: llega a O(n)."
      },
      selection: {
        title: "Selection Sort",
        concept: "Busca el menor de lo que falta por ordenar y lo pone al inicio. Repite hasta terminar.",
        tip: "Hace muy pocos intercambios (a lo sumo n), pero siempre O(n²) comparaciones, sin importar cómo empiece el arreglo."
      },
      bubble: {
        title: "Bubble Sort",
        concept: "Compara vecinos y los intercambia si están al revés. Los valores grandes van flotando hacia el final.",
        tip: "Es ideal para aprender qué es una inversión y qué significa ser estable, pero casi nunca se usa en producción."
      },
      radix: {
        title: "Radix Sort (LSD)",
        concept: "No compara nunca. Ordena los números dígito por dígito, empezando por las unidades, usando conteo.",
        tip: "Rompe el límite de Ω(n log n) de los algoritmos que comparan: corre en O(n·k), con k = cantidad de dígitos."
      }
    };

    // Reference implementations shown in the "Implementa" step
    this.snippets = {
      quick: `int partition(std::vector<int>& a, int lo, int hi) {
  std::swap(a[lo + rand() % (hi - lo + 1)], a[hi]); // pivote aleatorio
  int pivot = a[hi], i = lo - 1;
  for (int j = lo; j < hi; ++j)
    if (a[j] < pivot) std::swap(a[++i], a[j]);
  std::swap(a[i + 1], a[hi]);
  return i + 1;
}

void quickSort(std::vector<int>& a, int lo, int hi) {
  if (lo >= hi) return;
  int p = partition(a, lo, hi);
  quickSort(a, lo, p - 1);
  quickSort(a, p + 1, hi);
}`,
      merge: `void merge(std::vector<int>& a, int lo, int mid, int hi) {
  std::vector<int> tmp;
  tmp.reserve(hi - lo + 1);
  int i = lo, j = mid + 1;
  while (i <= mid && j <= hi)
    tmp.push_back(a[i] <= a[j] ? a[i++] : a[j++]); // <= lo hace estable
  while (i <= mid) tmp.push_back(a[i++]);
  while (j <= hi)  tmp.push_back(a[j++]);
  std::copy(tmp.begin(), tmp.end(), a.begin() + lo);
}

void mergeSort(std::vector<int>& a, int lo, int hi) {
  if (lo >= hi) return;
  int mid = lo + (hi - lo) / 2;
  mergeSort(a, lo, mid);
  mergeSort(a, mid + 1, hi);
  merge(a, lo, mid, hi);
}`,
      heap: `void siftDown(std::vector<int>& a, int n, int i) {
  while (true) {
    int big = i, l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && a[l] > a[big]) big = l;
    if (r < n && a[r] > a[big]) big = r;
    if (big == i) return;
    std::swap(a[i], a[big]);
    i = big;
  }
}

void heapSort(std::vector<int>& a) {
  int n = a.size();
  for (int i = n / 2 - 1; i >= 0; --i) siftDown(a, n, i); // armar el heap
  for (int end = n - 1; end > 0; --end) {
    std::swap(a[0], a[end]);   // el mayor va al final
    siftDown(a, end, 0);
  }
}`,
      shell: `void shellSort(std::vector<int>& a) {
  int n = a.size();
  for (int gap = n / 2; gap > 0; gap /= 2) {
    for (int i = gap; i < n; ++i) {
      int x = a[i], j = i;
      while (j >= gap && a[j - gap] > x) {
        a[j] = a[j - gap];
        j -= gap;
      }
      a[j] = x;
    }
  }
}`,
      insertion: `void insertionSort(std::vector<int>& a) {
  for (size_t i = 1; i < a.size(); ++i) {
    int x = a[i];
    size_t j = i;
    while (j > 0 && a[j - 1] > x) { // > (y no >=) lo hace estable
      a[j] = a[j - 1];
      --j;
    }
    a[j] = x;
  }
}`,
      selection: `void selectionSort(std::vector<int>& a) {
  for (size_t i = 0; i + 1 < a.size(); ++i) {
    size_t min = i;
    for (size_t j = i + 1; j < a.size(); ++j)
      if (a[j] < a[min]) min = j;
    if (min != i) std::swap(a[i], a[min]); // a lo sumo n-1 intercambios
  }
}`,
      bubble: `void bubbleSort(std::vector<int>& a) {
  for (size_t pass = 0; pass + 1 < a.size(); ++pass) {
    bool swapped = false;
    for (size_t j = 0; j + 1 < a.size() - pass; ++j)
      if (a[j] > a[j + 1]) { std::swap(a[j], a[j + 1]); swapped = true; }
    if (!swapped) break;   // ya estaba ordenado: mejor caso O(n)
  }
}`,
      radix: `void radixSort(std::vector<int>& a) {   // enteros no negativos
  int max = *std::max_element(a.begin(), a.end());
  std::vector<int> out(a.size());
  for (int exp = 1; max / exp > 0; exp *= 10) {
    int count[10] = {0};
    for (int x : a) count[(x / exp) % 10]++;
    for (int d = 1; d < 10; ++d) count[d] += count[d - 1];
    for (int i = (int)a.size() - 1; i >= 0; --i)   // de atrás: estable
      out[--count[(a[i] / exp) % 10]] = a[i];
    a = out;
  }
}`
    };
  }

  // Colour of a theme token (falls back to the lab colour without a stylesheet)
  tc(name, fallback) { return typeof window !== 'undefined' && window.Theme ? window.Theme.color(name, fallback) : fallback; }

  init() {
    this.canvas = document.getElementById('algoCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupEventListeners();
    this.generateArray('random');
    this.updateComplexityBadges();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = Math.round(Math.min(420, Math.max(240, (rect.width || 800) * 0.55)));
    this.draw();
  }

  setupEventListeners() {
    const algoSelect = document.getElementById('algoSelect');
    if (algoSelect) {
      algoSelect.addEventListener('change', (e) => {
        this.currentAlgo = e.target.value;
        this.updateComplexityBadges();
      });
    }

    const sizeInput = document.getElementById('arraySize');
    if (sizeInput) {
      sizeInput.addEventListener('input', (e) => {
        this.arraySize = parseInt(e.target.value);
        document.getElementById('arraySizeVal').textContent = this.arraySize;
        if (!this.isRunning) this.generateArray('random');
      });
    }

    const speedInput = document.getElementById('algoSpeed');
    if (speedInput) {
      speedInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        this.delay = Math.max(1, 101 - val);
        document.getElementById('algoSpeedVal').textContent = `${val}%`;
      });
    }

    const distSelect = document.getElementById('arrayDist');
    if (distSelect) {
      distSelect.addEventListener('change', (e) => {
        if (!this.isRunning) this.generateArray(e.target.value);
      });
    }

    const btnRun = document.getElementById('btnRunAlgo');
    if (btnRun) {
      btnRun.addEventListener('click', () => {
        if (this.isRunning) {
          this.pause();
        } else {
          this.start();
        }
      });
    }

    const btnReset = document.getElementById('btnResetAlgo');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.stop();
        const dist = document.getElementById('arrayDist')?.value || 'random';
        this.generateArray(dist);
      });
    }

    // Educational Preset Buttons (1-Click for Students)
    document.querySelectorAll('.preset-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const dist = e.currentTarget.dataset.dist;
        const distSelect = document.getElementById('arrayDist');
        if (distSelect) distSelect.value = dist;
        if (!this.isRunning) this.generateArray(dist);
      });
    });
  }

  generateArray(type = 'random') {
    this.array = [];
    const size = this.arraySize;

    if (type === 'random') {
      for (let i = 0; i < size; i++) {
        this.array.push(Math.floor(Math.random() * 95) + 5);
      }
    } else if (type === 'nearly-sorted') {
      for (let i = 0; i < size; i++) {
        this.array.push(Math.floor((i / size) * 90) + 10);
      }
      for (let i = 0; i < Math.max(2, size / 10); i++) {
        const a = Math.floor(Math.random() * size);
        const b = Math.floor(Math.random() * size);
        [this.array[a], this.array[b]] = [this.array[b], this.array[a]];
      }
    } else if (type === 'reversed') {
      for (let i = size - 1; i >= 0; i--) {
        this.array.push(Math.floor((i / size) * 90) + 10);
      }
    } else if (type === 'few-unique') {
      const set = [20, 45, 70, 95];
      for (let i = 0; i < size; i++) {
        this.array.push(set[Math.floor(Math.random() * set.length)]);
      }
    }

    this.resetMetrics();
    this.highlightIndices = { active: [], comparing: [], sorted: [] };
    this.draw();
  }

  resetMetrics() {
    this.comparisons = 0;
    this.swaps = 0;
    if (this.timerInterval) clearInterval(this.timerInterval);
    document.getElementById('algoComparisons').textContent = '0';
    document.getElementById('algoSwaps').textContent = '0';
    document.getElementById('algoTime').textContent = '0.00s';
    document.getElementById('algoStatus').textContent = 'Listo';
  }

  updateComplexityBadges() {
    const data = this.complexities[this.currentAlgo];
    if (!data) return;
    document.getElementById('badgeBest').textContent = data.timeBest;
    document.getElementById('badgeAvg').textContent = data.timeAvg;
    document.getElementById('badgeWorst').textContent = data.timeWorst;
    document.getElementById('badgeSpace').textContent = data.space;
    document.getElementById('badgeStable').textContent = data.stable ? 'Sí' : 'No';

    const codeTitle = document.getElementById('algoCodeTitle');
    const codeEl = document.getElementById('algoCode');
    if (codeTitle) codeTitle.textContent = `${data.name} en C++`;
    if (codeEl && this.snippets[this.currentAlgo]) codeEl.textContent = this.snippets[this.currentAlgo];

    // Update Student Intuition Card
    const info = this.intuitions[this.currentAlgo];
    if (info) {
      const titleEl = document.getElementById('algoIntuitionTitle');
      const conceptEl = document.getElementById('algoIntuitionConcept');
      const tipEl = document.getElementById('algoIntuitionTip');
      if (titleEl) titleEl.textContent = info.title;
      if (conceptEl) conceptEl.textContent = info.concept;
      if (tipEl) tipEl.textContent = info.tip;
    }
  }

  draw() {
    if (!this.canvas || !this.ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = this.tc('--cv-floor', '#d4dce4'); // floor
    this.ctx.fillRect(0, h - 10, w, 10);

    const n = this.array.length;
    const barWidth = Math.max(1, (w - (n + 1) * 2) / n);
    const maxVal = 100;

    for (let i = 0; i < n; i++) {
      const val = this.array[i];
      const barHeight = (val / maxVal) * (h - 40);
      const x = 2 + i * (barWidth + 2);
      const y = h - barHeight - 10;

      if (this.highlightIndices.sorted.includes(i)) {
        this.ctx.fillStyle = this.tc('--mint', '#2db886'); // in place
      } else if (this.highlightIndices.comparing.includes(i)) {
        this.ctx.fillStyle = this.tc('--tomato', '#d8382e'); // swapping
      } else if (this.highlightIndices.active.includes(i)) {
        this.ctx.fillStyle = this.tc('--sun-y', '#f5c518'); // comparing
      } else {
        this.ctx.fillStyle = this.tc('--sky-b', '#2e6be6'); // unsorted
      }

      const r = Math.min(4, barWidth / 2);
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, barWidth, barHeight, [r, r, 0, 0]);
      this.ctx.fill();
      if (barWidth >= 6) {
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = this.tc('--box-ink', '#1b2027');
        this.ctx.stroke();
      }
    }
  }

  async sleep() {
    return new Promise(resolve => setTimeout(resolve, this.delay));
  }

  async start() {
    this.isRunning = true;
    this.isPaused = false;
    this.shouldStop = false;

    const btnRun = document.getElementById('btnRunAlgo');
    if (btnRun) {
      btnRun.innerHTML = '<svg class="ic"><use href="#i-pause"/></svg>Detener';
      btnRun.classList.remove('btn-primary');
      btnRun.classList.add('btn-danger');
    }

    document.getElementById('algoStatus').textContent = 'Ordenando';
    this.startTime = performance.now();
    this.timerInterval = setInterval(() => {
      const elapsed = (performance.now() - this.startTime) / 1000;
      document.getElementById('algoTime').textContent = `${elapsed.toFixed(2)}s`;
    }, 50);

    try {
      switch (this.currentAlgo) {
        case 'bubble': await this.bubbleSort(); break;
        case 'selection': await this.selectionSort(); break;
        case 'insertion': await this.insertionSort(); break;
        case 'shell': await this.shellSort(); break;
        case 'merge': await this.mergeSort(0, this.array.length - 1); break;
        case 'quick': await this.quickSort(0, this.array.length - 1); break;
        case 'heap': await this.heapSort(); break;
        case 'radix': await this.radixSort(); break;
      }

      if (!this.shouldStop) {
        await this.sweepComplete();
        document.getElementById('algoStatus').textContent = '¡Ordenado!';
        if (window.account) window.account.record('algorithms', `run:${this.currentAlgo}`);
        window.soundController.playSuccess();
      }
    } catch (e) {
      // Interrupted
    } finally {
      this.isRunning = false;
      this.cleanupRun();
    }
  }

  pause() {
    this.isRunning = false;
    this.isPaused = true;
    this.shouldStop = true;
    this.cleanupRun();
    document.getElementById('algoStatus').textContent = 'Detenido';
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.shouldStop = true;
    this.cleanupRun();
  }

  cleanupRun() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const btnRun = document.getElementById('btnRunAlgo');
    if (btnRun) {
      btnRun.innerHTML = '<svg class="ic"><use href="#i-play"/></svg>Iniciar';
      btnRun.classList.remove('btn-danger');
      btnRun.classList.add('btn-primary');
    }
    this.highlightIndices.active = [];
    this.highlightIndices.comparing = [];
    this.draw();
  }

  async compare(i, j) {
    if (this.shouldStop) throw new Error('Stopped');
    this.comparisons++;
    document.getElementById('algoComparisons').textContent = this.comparisons;
    this.highlightIndices.active = [i, j];
    this.draw();
    window.soundController.playSortTone(this.array[i]);
    await this.sleep();
    return this.array[i] - this.array[j];
  }

  async swap(i, j) {
    if (this.shouldStop) throw new Error('Stopped');
    this.swaps++;
    document.getElementById('algoSwaps').textContent = this.swaps;
    this.highlightIndices.comparing = [i, j];
    [this.array[i], this.array[j]] = [this.array[j], this.array[i]];
    this.draw();
    window.soundController.playSortTone(this.array[j]);
    await this.sleep();
  }

  async sweepComplete() {
    this.highlightIndices.active = [];
    this.highlightIndices.comparing = [];
    for (let i = 0; i < this.array.length; i++) {
      this.highlightIndices.sorted.push(i);
      this.draw();
      window.soundController.playSortTone(this.array[i]);
      await new Promise(r => setTimeout(r, Math.min(15, 300 / this.array.length)));
    }
  }

  // --- Sorting Implementations ---
  async bubbleSort() {
    const n = this.array.length;
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++) {
        if ((await this.compare(j, j + 1)) > 0) {
          await this.swap(j, j + 1);
          swapped = true;
        }
      }
      this.highlightIndices.sorted.push(n - i - 1);
      if (!swapped) break;
    }
  }

  async selectionSort() {
    const n = this.array.length;
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        if ((await this.compare(j, minIdx)) < 0) {
          minIdx = j;
        }
      }
      if (minIdx !== i) {
        await this.swap(i, minIdx);
      }
      this.highlightIndices.sorted.push(i);
    }
  }

  async insertionSort() {
    const n = this.array.length;
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0 && (await this.compare(j, j - 1)) < 0) {
        await this.swap(j, j - 1);
        j--;
      }
    }
  }

  async shellSort() {
    const n = this.array.length;
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
      for (let i = gap; i < n; i++) {
        let j = i;
        while (j >= gap && (await this.compare(j, j - gap)) < 0) {
          await this.swap(j, j - gap);
          j -= gap;
        }
      }
    }
  }

  async mergeSort(left, right) {
    if (left >= right || this.shouldStop) return;
    const mid = Math.floor((left + right) / 2);
    await this.mergeSort(left, mid);
    await this.mergeSort(mid + 1, right);
    await this.merge(left, mid, right);
  }

  async merge(left, mid, right) {
    const temp = [];
    let i = left, j = mid + 1;

    while (i <= mid && j <= right) {
      if ((await this.compare(i, j)) <= 0) {
        temp.push(this.array[i++]);
      } else {
        temp.push(this.array[j++]);
      }
    }
    while (i <= mid) temp.push(this.array[i++]);
    while (j <= right) temp.push(this.array[j++]);

    for (let k = 0; k < temp.length; k++) {
      if (this.shouldStop) return;
      this.array[left + k] = temp[k];
      this.swaps++;
      document.getElementById('algoSwaps').textContent = this.swaps;
      this.highlightIndices.active = [left + k];
      this.draw();
      window.soundController.playSortTone(temp[k]);
      await this.sleep();
    }
  }

  async quickSort(low, high) {
    if (low < high && !this.shouldStop) {
      const pi = await this.partition(low, high);
      await this.quickSort(low, pi - 1);
      await this.quickSort(pi + 1, high);
    }
  }

  async partition(low, high) {
    const pivot = high;
    let i = low - 1;
    for (let j = low; j < high; j++) {
      if ((await this.compare(j, pivot)) < 0) {
        i++;
        await this.swap(i, j);
      }
    }
    await this.swap(i + 1, high);
    return i + 1;
  }

  async heapSort() {
    const n = this.array.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      await this.heapify(n, i);
    }
    for (let i = n - 1; i > 0; i--) {
      await this.swap(0, i);
      this.highlightIndices.sorted.push(i);
      await this.heapify(i, 0);
    }
  }

  async heapify(n, i) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < n && (await this.compare(left, largest)) > 0) largest = left;
    if (right < n && (await this.compare(right, largest)) > 0) largest = right;

    if (largest !== i) {
      await this.swap(i, largest);
      await this.heapify(n, largest);
    }
  }

  async radixSort() {
    const maxVal = Math.max(...this.array);
    for (let exp = 1; Math.floor(maxVal / exp) > 0; exp *= 10) {
      await this.countSortByDigit(exp);
    }
  }

  async countSortByDigit(exp) {
    const n = this.array.length;
    const output = new Array(n).fill(0);
    const count = new Array(10).fill(0);

    for (let i = 0; i < n; i++) {
      const digit = Math.floor(this.array[i] / exp) % 10;
      count[digit]++;
    }
    for (let i = 1; i < 10; i++) count[i] += count[i - 1];

    for (let i = n - 1; i >= 0; i--) {
      const digit = Math.floor(this.array[i] / exp) % 10;
      output[count[digit] - 1] = this.array[i];
      count[digit]--;
    }

    for (let i = 0; i < n; i++) {
      if (this.shouldStop) return;
      this.array[i] = output[i];
      this.swaps++;
      document.getElementById('algoSwaps').textContent = this.swaps;
      this.highlightIndices.active = [i];
      this.draw();
      window.soundController.playSortTone(this.array[i]);
      await this.sleep();
    }
  }
}

window.algorithmsStation = new AlgorithmsStation();
