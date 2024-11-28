# Algorithms Reference Guide

A structured technical reference for all sorting algorithms implemented in this repository.

---

## 1. Selection Sort
Iteratively finds the minimum element from the unsorted section and swaps it with the first unsorted element.

```text
Algorithm SelectionSort(A, n):
    for i from 0 to n - 2:
        minIdx = i
        for j from i + 1 to n - 1:
            if A[j] < A[minIdx]:
                minIdx = j
        if minIdx != i:
            swap(A[i], A[minIdx])
```

---

## 2. Insertion Sort
Builds the sorted array one element at a time by consuming one input element per repetition and shifting greater elements forward.

```text
Algorithm InsertionSort(A, n):
    for i from 1 to n - 1:
        key = A[i]
        j = i - 1
        while j >= 0 and A[j] > key:
            A[j + 1] = A[j]
            j = j - 1
        A[j + 1] = key
```

---

## 3. Merge Sort
Classic Divide & Conquer paradigm. Recursively halves the sequence and merges two sorted sub-sequences into an auxiliary array.

```text
Algorithm MergeSort(A, p, r):
    if p < r:
        q = floor((p + r) / 2)
        MergeSort(A, p, q)
        MergeSort(A, q + 1, r)
        Merge(A, p, q, r)
```

---

## 4. Heap Sort
Transforms the array into a complete binary Max-Heap structure, then swaps root (the maximum element) to the end and restores heap invariants.

```text
Algorithm HeapSort(A, n):
    BuildMaxHeap(A, n)
    for i from n - 1 down to 1:
        swap(A[0], A[i])
        MaxHeapify(A, i, 0)
```

---

## 5. Quick Sort (Lomuto Partition)
Selects a pivot element (last index) and partitions the array such that all elements smaller than pivot precede it, and larger elements follow it.

```text
Algorithm QuickSort(A, p, r):
    if p < r:
        q = Partition(A, p, r)
        QuickSort(A, p, q - 1)
        QuickSort(A, q + 1, r)
```

---

## 6. Radix Sort (LSD)
Non-comparative integer sorting algorithm that sorts data with integer keys by grouping keys by the individual digits which share the same significant position and value.
