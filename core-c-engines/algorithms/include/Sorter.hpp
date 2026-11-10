/**
 * Sorting Algorithms Suite
 * File: Sorter.hpp
 *
 * High-performance, clean C++ implementation of fundamental sorting algorithms:
 * Selection Sort, Insertion Sort, Merge Sort, Heap Sort, Quick Sort, and Radix Sort.
 *
 * Author: Josue Torres
 * Copyright (c) 2024-2025 Josue Torres
 * Licensed under the MIT License.
 */

#pragma once

#include <iostream>
#include <vector>
#include <algorithm>
#include <cstring>
#include <cmath>
#include <chrono>

struct SortMetrics {
  unsigned long long comparisons = 0;
  unsigned long long swaps = 0;
  double elapsedMicroseconds = 0.0;
};

class Sorter {
 private:
  // Helper swap
  static inline void swapElements(int &a, int &b) {
    int temp = a;
    a = b;
    b = temp;
  }

  // Quick Sort Partition (Lomuto scheme)
  static int partition(int *A, int p, int r, SortMetrics &metrics) {
    int pivot = A[r];
    int i = p - 1;

    for (int j = p; j < r; ++j) {
      metrics.comparisons++;
      if (A[j] <= pivot) {
        ++i;
        swapElements(A[i], A[j]);
        metrics.swaps++;
      }
    }
    swapElements(A[i + 1], A[r]);
    metrics.swaps++;
    return i + 1;
  }

  // Quick Sort Recursive
  static void quickSortRec(int *A, int p, int r, SortMetrics &metrics) {
    if (p < r) {
      int q = partition(A, p, r, metrics);
      quickSortRec(A, p, q - 1, metrics);
      quickSortRec(A, q + 1, r, metrics);
    }
  }

  // Merge Sort Merge Subroutine
  static void merge(int *A, int p, int q, int r, SortMetrics &metrics) {
    int n1 = q - p + 1;
    int n2 = r - q;

    std::vector<int> L(n1);
    std::vector<int> R(n2);

    for (int i = 0; i < n1; ++i) L[i] = A[p + i];
    for (int j = 0; j < n2; ++j) R[j] = A[q + 1 + j];

    int i = 0, j = 0, k = p;
    while (i < n1 && j < n2) {
      metrics.comparisons++;
      if (L[i] <= R[j]) {
        A[k++] = L[i++];
      } else {
        A[k++] = R[j++];
      }
      metrics.swaps++;
    }

    while (i < n1) {
      A[k++] = L[i++];
      metrics.swaps++;
    }
    while (j < n2) {
      A[k++] = R[j++];
      metrics.swaps++;
    }
  }

  // Merge Sort Recursive
  static void mergeSortRec(int *A, int p, int r, SortMetrics &metrics) {
    if (p < r) {
      int q = p + (r - p) / 2;
      mergeSortRec(A, p, q, metrics);
      mergeSortRec(A, q + 1, r, metrics);
      merge(A, p, q, r, metrics);
    }
  }

  // Heap Sort - Max-Heapify
  static void maxHeapify(int *A, int heapSize, int i, SortMetrics &metrics) {
    int left = 2 * i + 1;
    int right = 2 * i + 2;
    int largest = i;

    if (left < heapSize) {
      metrics.comparisons++;
      if (A[left] > A[largest]) largest = left;
    }

    if (right < heapSize) {
      metrics.comparisons++;
      if (A[right] > A[largest]) largest = right;
    }

    if (largest != i) {
      swapElements(A[i], A[largest]);
      metrics.swaps++;
      maxHeapify(A, heapSize, largest, metrics);
    }
  }

 public:
  Sorter() = default;

  /**
   * Selection Sort - O(n^2) Best, Average, Worst
   */
  static SortMetrics selectionSort(int *A, int n) {
    SortMetrics metrics;
    auto start = std::chrono::high_resolution_clock::now();

    if (A != nullptr && n > 1) {
      for (int i = 0; i < n - 1; ++i) {
        int minIdx = i;
        for (int j = i + 1; j < n; ++j) {
          metrics.comparisons++;
          if (A[j] < A[minIdx]) {
            minIdx = j;
          }
        }
        if (minIdx != i) {
          swapElements(A[i], A[minIdx]);
          metrics.swaps++;
        }
      }
    }

    auto end = std::chrono::high_resolution_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(end - start).count();
    return metrics;
  }

  /**
   * Insertion Sort - O(n) Best, O(n^2) Worst
   */
  static SortMetrics insertionSort(int *A, int n) {
    SortMetrics metrics;
    auto start = std::chrono::high_resolution_clock::now();

    if (A != nullptr && n > 1) {
      for (int i = 1; i < n; ++i) {
        int key = A[i];
        int j = i - 1;

        while (j >= 0) {
          metrics.comparisons++;
          if (A[j] > key) {
            A[j + 1] = A[j];
            metrics.swaps++;
            --j;
          } else {
            break;
          }
        }
        A[j + 1] = key;
      }
    }

    auto end = std::chrono::high_resolution_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(end - start).count();
    return metrics;
  }

  /**
   * Merge Sort - O(n log n) Best, Average, Worst (Stable)
   */
  static SortMetrics mergeSort(int *A, int n) {
    SortMetrics metrics;
    auto start = std::chrono::high_resolution_clock::now();

    if (A != nullptr && n > 1) {
      mergeSortRec(A, 0, n - 1, metrics);
    }

    auto end = std::chrono::high_resolution_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(end - start).count();
    return metrics;
  }

  /**
   * Heap Sort - O(n log n) Best, Average, Worst (In-place)
   */
  static SortMetrics heapSort(int *A, int n) {
    SortMetrics metrics;
    auto start = std::chrono::high_resolution_clock::now();

    if (A != nullptr && n > 1) {
      // Build max heap
      for (int i = (n / 2) - 1; i >= 0; --i) {
        maxHeapify(A, n, i, metrics);
      }

      // Extract elements
      for (int i = n - 1; i >= 1; --i) {
        swapElements(A[0], A[i]);
        metrics.swaps++;
        maxHeapify(A, i, 0, metrics);
      }
    }

    auto end = std::chrono::high_resolution_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(end - start).count();
    return metrics;
  }

  /**
   * Quick Sort - O(n log n) Average, O(n^2) Worst
   */
  static SortMetrics quickSort(int *A, int n) {
    SortMetrics metrics;
    auto start = std::chrono::high_resolution_clock::now();

    if (A != nullptr && n > 1) {
      quickSortRec(A, 0, n - 1, metrics);
    }

    auto end = std::chrono::high_resolution_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(end - start).count();
    return metrics;
  }

  /**
   * Radix Sort (LSD) - Non-comparative O(d * (n + k))
   */
  static SortMetrics radixSort(int *A, int n) {
    SortMetrics metrics;
    auto start = std::chrono::high_resolution_clock::now();

    if (A != nullptr && n > 1) {
      // Find max element
      int maxVal = A[0];
      for (int i = 1; i < n; ++i) {
        metrics.comparisons++;
        if (A[i] > maxVal) maxVal = A[i];
      }

      std::vector<int> output(n);

      for (int exp = 1; maxVal / exp > 0; exp *= 10) {
        int count[10] = {0};

        for (int i = 0; i < n; ++i) {
          count[(A[i] / exp) % 10]++;
        }

        for (int i = 1; i < 10; ++i) {
          count[i] += count[i - 1];
        }

        for (int i = n - 1; i >= 0; --i) {
          int digit = (A[i] / exp) % 10;
          output[count[digit] - 1] = A[i];
          count[digit]--;
          metrics.swaps++;
        }

        for (int i = 0; i < n; ++i) {
          A[i] = output[i];
        }
      }
    }

    auto end = std::chrono::high_resolution_clock::now();
    metrics.elapsedMicroseconds = std::chrono::duration<double, std::micro>(end - start).count();
    return metrics;
  }
};
