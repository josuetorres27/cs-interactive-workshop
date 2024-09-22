/**
 * Sorting Algorithms Suite
 * File: main.cpp
 *
 * Benchmark driver program comparing the performance and operation counts
 * of Selection, Insertion, Merge, Heap, Quick, and Radix Sort across
 * Random, Sorted (Best Case), and Reversed (Worst Case) datasets.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2024-2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#include <iostream>
#include <iomanip>
#include <vector>
#include <random>
#include <algorithm>
#include "Sorter.hpp"

enum class Distribution { RANDOM, SORTED, REVERSED };

std::vector<int> generateData(int n, Distribution dist) {
  std::vector<int> data(n);
  for (int i = 0; i < n; ++i) data[i] = i + 1;

  if (dist == Distribution::RANDOM) {
    std::mt19937 g(42);  // Fixed seed for reproducible benchmarks
    std::shuffle(data.begin(), data.end(), g);
  } else if (dist == Distribution::REVERSED) {
    std::reverse(data.begin(), data.end());
  }
  return data;
}

void runBenchmark(const std::string &name, Distribution dist, int n) {
  std::cout << "\n========================================================================\n";
  std::cout << " BENCHMARK: " << name << " (N = " << n << ")\n";
  std::cout << "========================================================================\n";
  std::cout << std::left << std::setw(18) << "Algorithm"
            << std::setw(16) << "Time (us)"
            << std::setw(18) << "Comparisons"
            << std::setw(16) << "Swaps/Moves" << "\n";
  std::cout << "------------------------------------------------------------------------\n";

  auto baseData = generateData(n, dist);

  auto testAlgo = [&](const std::string &algoName, auto func) {
    auto dataCopy = baseData;
    SortMetrics m = func(dataCopy.data(), dataCopy.size());
    std::cout << std::left << std::setw(18) << algoName
              << std::setw(16) << std::fixed << std::setprecision(2) << m.elapsedMicroseconds
              << std::setw(18) << m.comparisons
              << std::setw(16) << m.swaps << "\n";
  };

  testAlgo("Selection Sort", Sorter::selectionSort);
  testAlgo("Insertion Sort", Sorter::insertionSort);
  testAlgo("Merge Sort", Sorter::mergeSort);
  testAlgo("Heap Sort", Sorter::heapSort);
  testAlgo("Quick Sort", Sorter::quickSort);
  testAlgo("Radix Sort", Sorter::radixSort);
}

int main() {
  std::cout << "========================================================================\n";
  std::cout << "      SORTING ALGORITHMS BENCHMARK SUITE - C++17 IMPLEMENTATION        \n";
  std::cout << "========================================================================\n";

  int n = 5000;
  runBenchmark("RANDOM ARRAY (Average Case)", Distribution::RANDOM, n);
  runBenchmark("ALREADY SORTED ARRAY (Best Case for Insertion)", Distribution::SORTED, n);
  runBenchmark("REVERSED ARRAY (Worst Case for Quadratic Sorts)", Distribution::REVERSED, n);

  std::cout << "\n[✓] All sorting benchmarks completed successfully.\n";
  return 0;
}
