// CS Interactive Lab - Algorithms & Data Structures Module
class AlgorithmsLab {
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
        title: "Quick Sort (Partición Divide y Vencerás)",
        concept: "Elige un elemento 'pivote' y particiona el arreglo: menores a la izquierda, mayores a la derecha. Luego procesa recursivamente cada mitad. Es el estándar en producción por su uso óptimo de la memoria caché.",
        tip: "⚠️ Examen UCR: Si el pivote es el peor posible (ej: arreglo ya ordenado sin pivote aleatorio), su complejidad degenera a O(n²)."
      },
      merge: {
        title: "Merge Sort (Fusión Divide y Vencerás)",
        concept: "Divide el arreglo a la mitad recursivamente hasta subarreglos de 1 elemento, y luego fusiona las mitades en orden ascendente.",
        tip: "💡 Clave: Garantiza O(n log n) SIEMPRE (incluso en el peor caso) y es ESTABLE, pero requiere O(n) de memoria auxiliar."
      },
      heap: {
        title: "Heap Sort (Montículo Binario)",
        concept: "Construye un Max-Heap in-place. La raíz (máximo elemento) se intercambia al final y se reajusta el montículo recursivamente.",
        tip: "💡 Clave: Tiempo O(n log n) garantizado en el peor caso con O(1) de memoria adicional. No es estable."
      },
      shell: {
        title: "Shell Sort (Inserción por Brechas)",
        concept: "Extensión de Insertion Sort que compara elementos distanciados por un intervalo (gap) decreciente, permitiendo saltos grandes.",
        tip: "💡 Clave: Reduce drásticamente los desplazamientos de Insertion Sort sin requerir memoria adicional."
      },
      insertion: {
        title: "Insertion Sort (Inserción Progresiva)",
        concept: "Como ordenar cartas en la mano: toma cada elemento y desplázalo hacia la izquierda hasta insertarlo en su posición correcta.",
        tip: "💡 Clave: En arreglos casi ordenados o muy pequeños (n ≤ 16), es el más veloz de todos: tiempo lineal O(n)."
      },
      selection: {
        title: "Selection Sort (Selección de Mínimo)",
        concept: "Recorre todo el arreglo no ordenado para encontrar el elemento más pequeño y lo intercambia con la posición inicial disponible.",
        tip: "⚠️ Examen UCR: Realiza a lo sumo n intercambios, pero siempre ejecuta O(n²) comparaciones sin importar el estado inicial."
      },
      bubble: {
        title: "Bubble Sort (Burbujeo de Adyacentes)",
        concept: "Compara pares contiguos y los intercambia si están desordenados, haciendo 'flotar' los valores mayores hacia el final.",
        tip: "💡 Clave: Excelente para comprender inversiones y estabilidad en primeros años, pero ineficiente en producción."
      },
      radix: {
        title: "Radix Sort LSD (Ordenamiento No Comparativo)",
        concept: "Ordena los enteros procesando dígito por dígito desde el menos significativo (LSD) usando conteo o baldes (buckets).",
        tip: "💡 Clave: Rompe la cota inferior teórica Ω(n log n) de los ordenamientos comparativos, alcanzando O(n · k) tiempo lineal."
      }
    };
  }

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
    this.canvas.height = 420;
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
    document.getElementById('algoStatus').textContent = 'IDLE';
  }

  updateComplexityBadges() {
    const data = this.complexities[this.currentAlgo];
    if (!data) return;
    document.getElementById('badgeBest').textContent = data.timeBest;
    document.getElementById('badgeAvg').textContent = data.timeAvg;
    document.getElementById('badgeWorst').textContent = data.timeWorst;
    document.getElementById('badgeSpace').textContent = data.space;
    document.getElementById('badgeStable').textContent = data.stable ? 'YES' : 'NO';

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

    const n = this.array.length;
    const barWidth = Math.max(1, (w - (n + 1) * 2) / n);
    const maxVal = 100;

    for (let i = 0; i < n; i++) {
      const val = this.array[i];
      const barHeight = (val / maxVal) * (h - 40);
      const x = 2 + i * (barWidth + 2);
      const y = h - barHeight - 10;

      if (this.highlightIndices.sorted.includes(i)) {
        this.ctx.fillStyle = '#10b981'; // Emerald
      } else if (this.highlightIndices.comparing.includes(i)) {
        this.ctx.fillStyle = '#f43f5e'; // Rose / Swapping
      } else if (this.highlightIndices.active.includes(i)) {
        this.ctx.fillStyle = '#00f0ff'; // Cyan / Active cursor
      } else {
        this.ctx.fillStyle = '#3b82f6'; // Blue
      }

      this.ctx.beginPath();
      this.ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
      this.ctx.fill();
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
      btnRun.innerHTML = '⏸ Pause';
      btnRun.classList.remove('btn-primary');
      btnRun.classList.add('btn-danger');
    }

    document.getElementById('algoStatus').textContent = 'SORTING';
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
        document.getElementById('algoStatus').textContent = 'SORTED';
        window.soundController.playSuccess();
      }
    } catch (e) {
      // Interrupted
    } finally {
      this.cleanupRun();
    }
  }

  pause() {
    this.isRunning = false;
    this.isPaused = true;
    this.shouldStop = true;
    this.cleanupRun();
    document.getElementById('algoStatus').textContent = 'PAUSED';
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
      btnRun.innerHTML = '▶ Run Algorithm';
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

window.algorithmsLab = new AlgorithmsLab();
