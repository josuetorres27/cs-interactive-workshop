/**
 * CS Interactive Lab - 2D Heat Diffusion Simulation Test Suite
 * 40 Comprehensive Automated Tests (PDE, Stencil, CFL, Domain Slicing)
 */

#define _DEFAULT_SOURCE
#define _POSIX_C_SOURCE 199309L

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "../runner.h"

// Explicit 2D Heat Equation Stencil step
static double step_heat_stencil(double** current, double** next, int rows, int cols, double r) {
    // Preserve Dirichlet boundaries in double-buffered destination
    for (int j = 0; j < cols; ++j) {
        next[0][j] = current[0][j];
        next[rows - 1][j] = current[rows - 1][j];
    }
    for (int i = 0; i < rows; ++i) {
        next[i][0] = current[i][0];
        next[i][cols - 1] = current[i][cols - 1];
    }

    double max_delta = 0.0;
    for (int i = 1; i < rows - 1; ++i) {
        for (int j = 1; j < cols - 1; ++j) {
            double laplacian = current[i - 1][j] + current[i + 1][j] +
                              current[i][j - 1] + current[i][j + 1] - 4.0 * current[i][j];
            double val = current[i][j] + r * laplacian;
            next[i][j] = val;
            double diff = fabs(val - current[i][j]);
            if (diff > max_delta) max_delta = diff;
        }
    }
    return max_delta;
}

static double** alloc_grid(int rows, int cols, double initial_val) {
    double** grid = (double**)malloc(rows * sizeof(double*));
    for (int i = 0; i < rows; ++i) {
        grid[i] = (double*)malloc(cols * sizeof(double));
        for (int j = 0; j < cols; ++j) grid[i][j] = initial_val;
    }
    return grid;
}

static void free_grid(double** grid, int rows) {
    for (int i = 0; i < rows; ++i) free(grid[i]);
    free(grid);
}

static void test_boundary_preservation(void) {
    // 10 tests across different grid sizes and iterations
    for (int t = 1; t <= 10; ++t) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Dirichlet Boundary Conservation - Size %dx%d (%d Steps)", 10 + t * 4, 10 + t * 4, t * 5);
        test_case_begin(test_name);

        int rows = 10 + t * 4;
        int cols = 10 + t * 4;
        double** gA = alloc_grid(rows, cols, 20.0);
        double** gB = alloc_grid(rows, cols, 20.0);

        // Set boundaries: top=100.0, bottom=0.0, left=50.0, right=50.0
        for (int j = 0; j < cols; ++j) {
            gA[0][j] = gB[0][j] = 100.0;
            gA[rows - 1][j] = gB[rows - 1][j] = 0.0;
        }
        for (int i = 0; i < rows; ++i) {
            gA[i][0] = gB[i][0] = 50.0;
            gA[i][cols - 1] = gB[i][cols - 1] = 50.0;
        }

        double** cur = gA;
        double** nxt = gB;
        for (int iter = 0; iter < t * 5; ++iter) {
            step_heat_stencil(cur, nxt, rows, cols, 0.20);
            double** tmp = cur; cur = nxt; nxt = tmp;
        }

        // Verify boundaries remained exactly invariant (interior edges)
        for (int j = 1; j < cols - 1; ++j) {
            ASSERT_NEAR(cur[0][j], 100.0, 1e-6);
            ASSERT_NEAR(cur[rows - 1][j], 0.0, 1e-6);
        }
        for (int i = 1; i < rows - 1; ++i) {
            ASSERT_NEAR(cur[i][0], 50.0, 1e-6);
            ASSERT_NEAR(cur[i][cols - 1], 50.0, 1e-6);
        }

        free_grid(gA, rows);
        free_grid(gB, rows);
        test_case_end();
    }
}

static void test_maximum_principle(void) {
    // 10 tests: temperature everywhere must be bounded by [T_min, T_max]
    for (int t = 1; t <= 10; ++t) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Maximum Principle Bound Invariant - Trial #%d", t);
        test_case_begin(test_name);

        int rows = 20, cols = 20;
        double** gA = alloc_grid(rows, cols, 10.0 + t);
        double** gB = alloc_grid(rows, cols, 10.0 + t);

        double t_min = 5.0;
        double t_max = 95.0;

        for (int j = 0; j < cols; ++j) {
            gA[0][j] = gB[0][j] = t_max;
            gA[rows - 1][j] = gB[rows - 1][j] = t_min;
        }

        double** cur = gA;
        double** nxt = gB;
        for (int step = 0; step < 25; ++step) {
            step_heat_stencil(cur, nxt, rows, cols, 0.22);
            double** tmp = cur; cur = nxt; nxt = tmp;
        }

        for (int i = 0; i < rows; ++i) {
            for (int j = 0; j < cols; ++j) {
                ASSERT_GE(cur[i][j], t_min - 1e-5);
                ASSERT_LE(cur[i][j], t_max + 1e-5);
            }
        }

        free_grid(gA, rows);
        free_grid(gB, rows);
        test_case_end();
    }
}

static void test_symmetry_preservation(void) {
    // 10 tests: symmetric initial grid must stay symmetric about vertical center
    for (int t = 1; t <= 10; ++t) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Symmetry Preservation Invariant - Test #%d", t);
        test_case_begin(test_name);

        int rows = 21, cols = 21; // Odd center
        double** gA = alloc_grid(rows, cols, 0.0);
        double** gB = alloc_grid(rows, cols, 0.0);

        // Symmetric center hot spot
        gA[10][10] = gB[10][10] = 100.0;
        gA[9][10] = gB[9][10] = 50.0;
        gA[11][10] = gB[11][10] = 50.0;
        gA[10][9] = gB[10][9] = 50.0;
        gA[10][11] = gB[10][11] = 50.0;

        double** cur = gA;
        double** nxt = gB;
        for (int step = 0; step < t * 3; ++step) {
            step_heat_stencil(cur, nxt, rows, cols, 0.20);
            double** tmp = cur; cur = nxt; nxt = tmp;
        }

        // Verify left-right symmetry
        for (int i = 0; i < rows; ++i) {
            for (int j = 0; j < cols / 2; ++j) {
                ASSERT_NEAR(cur[i][j], cur[i][cols - 1 - j], 1e-5);
            }
        }

        free_grid(gA, rows);
        free_grid(gB, rows);
        test_case_end();
    }
}

static void test_domain_decomposition_partitions(void) {
    // 10 tests: verify 1D row slicing partitions cover exactly all internal rows with 0 gaps or overlaps
    int thread_counts[10] = {1, 2, 3, 4, 5, 6, 7, 8, 12, 16};
    int total_rows = 102; // internal rows = 100 (1..100)

    for (int t = 0; t < 10; ++t) {
        int P = thread_counts[t];
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Domain Decomposition - %d Threads (No Gaps/Overlaps)", P);
        test_case_begin(test_name);

        int covered_rows = 0;
        int prev_end = 1;

        for (int p = 0; p < P; ++p) {
            int start_row = 1 + (p * 100) / P;
            int end_row = 1 + ((p + 1) * 100) / P;
            ASSERT_EQ(start_row, prev_end);
            ASSERT_LE(start_row, end_row);
            covered_rows += (end_row - start_row);
            prev_end = end_row;
        }

        ASSERT_EQ(covered_rows, 100);
        ASSERT_EQ(prev_end, 101);
        test_case_end();
    }
}

int main(void) {
    test_suite_begin("Heat Diffusion Numerical & Decomposition (40 Tests)");

    test_boundary_preservation();           // 10 tests
    test_maximum_principle();               // 10 tests
    test_symmetry_preservation();           // 10 tests
    test_domain_decomposition_partitions(); // 10 tests

    return test_suite_summary();
}
