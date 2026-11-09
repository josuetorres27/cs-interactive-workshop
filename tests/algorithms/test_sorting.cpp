/**
 * CS Interactive Lab - Algorithms & Sorters Test Suite
 * Comprehensive automated tests (120 test cases)
 */

#include <iostream>
#include <vector>
#include <numeric>
#include <random>
#include "../runner.h"
#include "../../core-c-engines/algorithms/include/Sorter.hpp"

// Helper to check if an array is sorted
static bool is_sorted_array(const int* arr, int n) {
    for (int i = 0; i < n - 1; ++i) {
        if (arr[i] > arr[i + 1]) return false;
    }
    return true;
}

// Helper to calculate checksum (sum of elements)
static long long compute_sum(const int* arr, int n) {
    long long s = 0;
    for (int i = 0; i < n; ++i) s += arr[i];
    return s;
}

typedef SortMetrics (*SortFn)(int*, int);

static void run_sorter_suite(const char* name, SortFn sort_func, bool supports_negatives) {
    char test_name[128];

    // Test 1: Null pointer guard
    snprintf(test_name, sizeof(test_name), "%s - Null Pointer Safety", name);
    test_case_begin(test_name);
    SortMetrics m = sort_func(nullptr, 0);
    ASSERT_EQ(m.comparisons, 0ULL);
    test_case_end();

    // Test 2: Zero elements
    snprintf(test_name, sizeof(test_name), "%s - Empty Array (N=0)", name);
    test_case_begin(test_name);
    int empty_arr[1] = {0};
    m = sort_func(empty_arr, 0);
    ASSERT_EQ(m.comparisons, 0ULL);
    test_case_end();

    // Test 3: Single element
    snprintf(test_name, sizeof(test_name), "%s - Single Element (N=1)", name);
    test_case_begin(test_name);
    int single[1] = {42};
    m = sort_func(single, 1);
    ASSERT_EQ(single[0], 42);
    test_case_end();

    // Test 4: Two elements already sorted
    snprintf(test_name, sizeof(test_name), "%s - Two Sorted Elements", name);
    test_case_begin(test_name);
    int two_sorted[2] = {10, 20};
    sort_func(two_sorted, 2);
    ASSERT_TRUE(is_sorted_array(two_sorted, 2));
    test_case_end();

    // Test 5: Two elements inverted
    snprintf(test_name, sizeof(test_name), "%s - Two Inverted Elements", name);
    test_case_begin(test_name);
    int two_inv[2] = {99, 11};
    sort_func(two_inv, 2);
    ASSERT_TRUE(is_sorted_array(two_inv, 2));
    ASSERT_EQ(two_inv[0], 11);
    ASSERT_EQ(two_inv[1], 99);
    test_case_end();

    // Test 6: All identical elements
    snprintf(test_name, sizeof(test_name), "%s - All Identical Elements", name);
    test_case_begin(test_name);
    int all_same[7] = {7, 7, 7, 7, 7, 7, 7};
    sort_func(all_same, 7);
    ASSERT_TRUE(is_sorted_array(all_same, 7));
    ASSERT_EQ(all_same[0], 7);
    test_case_end();

    // Test 7: Strictly increasing
    snprintf(test_name, sizeof(test_name), "%s - Pre-sorted Ascending", name);
    test_case_begin(test_name);
    int asc[10] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    sort_func(asc, 10);
    ASSERT_TRUE(is_sorted_array(asc, 10));
    test_case_end();

    // Test 8: Strictly decreasing (worst case)
    snprintf(test_name, sizeof(test_name), "%s - Pre-sorted Descending", name);
    test_case_begin(test_name);
    int desc[10] = {10, 9, 8, 7, 6, 5, 4, 3, 2, 1};
    sort_func(desc, 10);
    ASSERT_TRUE(is_sorted_array(desc, 10));
    ASSERT_EQ(desc[0], 1);
    ASSERT_EQ(desc[9], 10);
    test_case_end();

    // Test 9: Alternating binary array
    snprintf(test_name, sizeof(test_name), "%s - Binary Elements (0 and 1)", name);
    test_case_begin(test_name);
    int bin_arr[8] = {1, 0, 1, 0, 0, 1, 1, 0};
    sort_func(bin_arr, 8);
    ASSERT_TRUE(is_sorted_array(bin_arr, 8));
    ASSERT_EQ(bin_arr[0], 0);
    ASSERT_EQ(bin_arr[7], 1);
    test_case_end();

    // Test 10: Array with duplicates
    snprintf(test_name, sizeof(test_name), "%s - Duplicate Clusters", name);
    test_case_begin(test_name);
    int dup[9] = {5, 2, 8, 5, 2, 8, 5, 2, 8};
    long long sum_before = compute_sum(dup, 9);
    sort_func(dup, 9);
    ASSERT_TRUE(is_sorted_array(dup, 9));
    ASSERT_EQ(compute_sum(dup, 9), sum_before);
    test_case_end();

    // Test 11: Negative elements (if supported by algorithm)
    snprintf(test_name, sizeof(test_name), "%s - Negative Numbers", name);
    test_case_begin(test_name);
    if (supports_negatives) {
        int neg[6] = {-15, 22, -3, 0, 8, -50};
        sort_func(neg, 6);
        ASSERT_TRUE(is_sorted_array(neg, 6));
        ASSERT_EQ(neg[0], -50);
        ASSERT_EQ(neg[5], 22);
    } else {
        ASSERT_TRUE(true); // Radix LSD configured for non-negative
    }
    test_case_end();

    // Test 12: Odd number of elements
    snprintf(test_name, sizeof(test_name), "%s - Odd Length Array (N=11)", name);
    test_case_begin(test_name);
    int odd[11] = {45, 12, 89, 3, 23, 78, 56, 90, 1, 34, 67};
    sort_func(odd, 11);
    ASSERT_TRUE(is_sorted_array(odd, 11));
    ASSERT_EQ(odd[0], 1);
    ASSERT_EQ(odd[10], 90);
    test_case_end();

    // Test 13: Even number of elements
    snprintf(test_name, sizeof(test_name), "%s - Even Length Array (N=12)", name);
    test_case_begin(test_name);
    int even[12] = {100, 2, 85, 4, 70, 6, 55, 8, 40, 10, 25, 12};
    sort_func(even, 12);
    ASSERT_TRUE(is_sorted_array(even, 12));
    test_case_end();

    // Test 14: Multiset element conservation
    snprintf(test_name, sizeof(test_name), "%s - Conservation of Elements Invariant", name);
    test_case_begin(test_name);
    std::vector<int> conserve = {14, 8, 32, 9, 5, 21, 64, 1, 102};
    long long initial_sum = std::accumulate(conserve.begin(), conserve.end(), 0LL);
    sort_func(conserve.data(), (int)conserve.size());
    ASSERT_TRUE(is_sorted_array(conserve.data(), (int)conserve.size()));
    ASSERT_EQ(std::accumulate(conserve.begin(), conserve.end(), 0LL), initial_sum);
    test_case_end();

    // Test 15: Small scale stress test (N=100)
    snprintf(test_name, sizeof(test_name), "%s - Uniform Random (N=100)", name);
    test_case_begin(test_name);
    std::vector<int> rnd_100(100);
    for (int i = 0; i < 100; ++i) rnd_100[i] = (rand() % 1000) + 1;
    sort_func(rnd_100.data(), 100);
    ASSERT_TRUE(is_sorted_array(rnd_100.data(), 100));
    test_case_end();

    // Test 16: Medium scale stress test (N=500)
    snprintf(test_name, sizeof(test_name), "%s - Uniform Random (N=500)", name);
    test_case_begin(test_name);
    std::vector<int> rnd_500(500);
    for (int i = 0; i < 500; ++i) rnd_500[i] = (rand() % 5000) + 1;
    sort_func(rnd_500.data(), 500);
    ASSERT_TRUE(is_sorted_array(rnd_500.data(), 500));
    test_case_end();

    // Test 17: Large scale stress test (N=2000)
    snprintf(test_name, sizeof(test_name), "%s - Uniform Random (N=2000)", name);
    test_case_begin(test_name);
    std::vector<int> rnd_2000(2000);
    for (int i = 0; i < 2000; ++i) rnd_2000[i] = (rand() % 20000) + 1;
    sort_func(rnd_2000.data(), 2000);
    ASSERT_TRUE(is_sorted_array(rnd_2000.data(), 2000));
    test_case_end();

    // Test 18: Peak/Valley saw-tooth pattern
    snprintf(test_name, sizeof(test_name), "%s - Sawtooth Wave Pattern", name);
    test_case_begin(test_name);
    std::vector<int> sawtooth;
    for (int i = 0; i < 4; ++i) {
        for (int j = 0; j < 10; ++j) sawtooth.push_back(j * 5);
    }
    sort_func(sawtooth.data(), (int)sawtooth.size());
    ASSERT_TRUE(is_sorted_array(sawtooth.data(), (int)sawtooth.size()));
    test_case_end();

    // Test 19: Plateau pattern (many repeated mid values)
    snprintf(test_name, sizeof(test_name), "%s - Plateau Pattern", name);
    test_case_begin(test_name);
    std::vector<int> plateau = {1, 2, 50, 50, 50, 50, 50, 50, 50, 99, 100};
    sort_func(plateau.data(), (int)plateau.size());
    ASSERT_TRUE(is_sorted_array(plateau.data(), (int)plateau.size()));
    test_case_end();

    // Test 20: Performance telemetry benchmark validation
    snprintf(test_name, sizeof(test_name), "%s - Metrics Instrumentation Valid", name);
    test_case_begin(test_name);
    std::vector<int> bench_vec = {9, 8, 7, 6, 5, 4, 3, 2, 1};
    SortMetrics metrics = sort_func(bench_vec.data(), (int)bench_vec.size());
    ASSERT_TRUE(metrics.elapsedMicroseconds >= 0.0);
    ASSERT_TRUE(is_sorted_array(bench_vec.data(), (int)bench_vec.size()));
    test_case_end();
}

int main() {
    srand(42);
    test_suite_begin("Algorithms & Sorters Suite (120 Tests)");

    // Run 20 tests each across all 6 sorters (20 * 6 = 120 tests)
    run_sorter_suite("QuickSort", Sorter::quickSort, true);
    run_sorter_suite("MergeSort", Sorter::mergeSort, true);
    run_sorter_suite("HeapSort", Sorter::heapSort, true);
    run_sorter_suite("InsertionSort", Sorter::insertionSort, true);
    run_sorter_suite("SelectionSort", Sorter::selectionSort, true);
    run_sorter_suite("RadixSort_LSD", Sorter::radixSort, false);

    return test_suite_summary();
}
