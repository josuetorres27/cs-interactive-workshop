# Comprehensive Complexity & Trade-Off Analysis

This document provides a formal mathematical and empirical analysis of the sorting algorithms implemented in this suite.

---

## 1. Complexity Comparison Matrix

| Algorithm | Best Case (Time) | Average Case (Time) | Worst Case (Time) | Space Complexity | Stable? | Method / Strategy |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Insertion Sort** | $\mathcal{O}(n)$ | $\mathcal{O}(n^2)$ | $\mathcal{O}(n^2)$ | $\mathcal{O}(1)$ | Yes | Incremental insertion |
| **Selection Sort** | $\mathcal{O}(n^2)$ | $\mathcal{O}(n^2)$ | $\mathcal{O}(n^2)$ | $\mathcal{O}(1)$ | No | Minimum selection |
| **Bubble Sort** | $\mathcal{O}(n)$ | $\mathcal{O}(n^2)$ | $\mathcal{O}(n^2)$ | $\mathcal{O}(1)$ | Yes | Adjacent pairwise swaps |
| **Merge Sort** | $\mathcal{O}(n \log n)$ | $\mathcal{O}(n \log n)$ | $\mathcal{O}(n \log n)$ | $\mathcal{O}(n)$ | Yes | Divide and Conquer |
| **Heap Sort** | $\mathcal{O}(n \log n)$ | $\mathcal{O}(n \log n)$ | $\mathcal{O}(n \log n)$ | $\mathcal{O}(1)$ | No | Max-Heap selection |
| **Quick Sort (Lomuto)** | $\mathcal{O}(n \log n)$ | $\mathcal{O}(n \log n)$ | $\mathcal{O}(n^2)$ | $\mathcal{O}(\log n)$ | No | Partitioning around pivot |
| **Radix Sort (LSD)** | $\mathcal{O}(d \cdot (n + k))$ | $\mathcal{O}(d \cdot (n + k))$ | $\mathcal{O}(d \cdot (n + k))$ | $\mathcal{O}(n + k)$ | Yes | Non-comparative digit bucket |

---

## 2. In-Depth Case Analysis

### A. Insertion Sort
* **Best Case ($\mathcal{O}(n)$):** When the input array is already sorted or nearly sorted. The inner loop condition `A[j] > key` fails immediately on the first check after just 1 comparison, resulting in exactly $n - 1$ comparisons and 0 swaps.
* **Worst Case ($\mathcal{O}(n^2)$):** When the input is reverse-sorted. Every new element must travel across the entire sorted prefix:
  $$\sum_{i=1}^{n-1} i = \frac{n(n-1)}{2} \approx \frac{n^2}{2} \text{ comparisons and shifts}$$

---

### B. Selection Sort
* **Universal $\mathcal{O}(n^2)$:** Regardless of whether the input is sorted, reversed, or random, Selection Sort *always* scans the entire remaining unsorted suffix to locate the minimum element:
  $$\sum_{i=0}^{n-2} (n - 1 - i) = \frac{n(n-1)}{2} \text{ comparisons}$$
* **Advantage:** Minimizes memory writes ($\le n - 1$ swaps across the entire execution).

---

### C. Merge Sort
* **Guaranteed $\mathcal{O}(n \log n)$:** Recursively bisects the array into halves until singletons are reached ($\log_2 n$ recursion tree levels), and merges each level in linear $\mathcal{O}(n)$ time:
  $$T(n) = 2T(n/2) + \mathcal{O}(n) \implies T(n) = \mathcal{O}(n \log n)$$
* **Trade-Off:** Requires auxiliary memory buffer of size $\mathcal{O}(n)$ to merge sub-arrays.

---

### D. Quick Sort (Lomuto Scheme)
* **Average Case ($\mathcal{O}(n \log n)$):** Balanced partitioning divides the array into sub-arrays of roughly equal length.
* **Worst Case ($\mathcal{O}(n^2)$):** When the input is already sorted (or reverse-sorted) and the last element is chosen as pivot, each partition isolates only 1 element, degrading recursion depth to $n$:
  $$T(n) = T(n-1) + \mathcal{O}(n) \implies \mathcal{O}(n^2)$$

---

### E. Heap Sort
* **Guaranteed In-Place $\mathcal{O}(n \log n)$:** Builds a binary max-heap in linear time $\mathcal{O}(n)$, then performs $n - 1$ extractions of root, each triggering `maxHeapify` of depth $\mathcal{O}(\log n)$.
* **Advantage over Merge Sort:** Operates completely in-place ($\mathcal{O}(1)$ auxiliary space).
