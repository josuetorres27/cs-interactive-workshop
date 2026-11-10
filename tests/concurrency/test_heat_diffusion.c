/**
 * CS Interactive Lab - Heat Diffusion test suite
 *
 * Tests the real solver library used by the three engines
 * (core-c-engines/concurrency/simulations/heat-diffusion/common): kernel,
 * decomposition, numerical properties, and that pthreads (both barriers) and
 * OpenMP produce exactly the same grid as the serial solver.
 */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "../runner.h"
#include "heat.h"

static const heat_boundary_t HOT_TOP = { 100.0, 0.0, 50.0, 50.0, 0.0 };

static int same_grid(const heat_plate_t* a, const heat_plate_t* b) {
  size_t n = (size_t)a->rows * a->cols;
  for (size_t k = 0; k < n; ++k) if (a->cur[k] != b->cur[k]) return 0;
  return 1;
}

/* Solve a fresh plate with the chosen engine. engine: 0 serial, 1 pthreads spin,
 * 2 pthreads sleep, 3 openmp. */
static int solve(int engine, int rows, int cols, int threads, heat_params_t p, heat_boundary_t b,
                 heat_plate_t* plate, heat_result_t* res) {
  if (heat_plate_init(plate, rows, cols, b) != HEAT_OK) return -1;
  switch (engine) {
    case 0: return heat_solve_serial(plate, &p, res);
    case 1: return heat_solve_pthreads_ex(plate, &p, threads, HEAT_BARRIER_SPIN, res);
    case 2: return heat_solve_pthreads_ex(plate, &p, threads, HEAT_BARRIER_SLEEP, res);
    default: return heat_solve_openmp(plate, &p, threads, res);
  }
}

/* ── 1. Dirichlet borders never change (10) ─────────────────────────── */
static void test_boundary_preservation(void) {
  for (int t = 1; t <= 10; ++t) {
    int n = 8 + t * 5;
    char name[128];
    snprintf(name, sizeof name, "Borders stay fixed - %dx%d plate, %d iterations", n, n + 3, t * 20);
    test_case_begin(name);
    heat_plate_t pl; heat_result_t r;
    heat_params_t p = { 0.25, 1e-12, t * 20 };
    ASSERT_EQ(solve(0, n, n + 3, 1, p, HOT_TOP, &pl, &r), HEAT_OK);
    for (int j = 0; j < n + 3; ++j) {
      ASSERT_TRUE(heat_plate_get(&pl, 0, j) == 100.0);
      ASSERT_TRUE(heat_plate_get(&pl, n - 1, j) == 0.0);
    }
    for (int i = 1; i < n - 1; ++i) {
      ASSERT_TRUE(heat_plate_get(&pl, i, 0) == 50.0);
      ASSERT_TRUE(heat_plate_get(&pl, i, n + 2) == 50.0);
    }
    heat_plate_free(&pl);
    test_case_end();
  }
}

/* ── 2. Maximum principle: no value leaves [min border, max border] (10) ── */
static void test_maximum_principle(void) {
  for (int t = 1; t <= 10; ++t) {
    char name[128];
    double r = 0.05 + 0.02 * t;  /* 0.07 .. 0.25, all stable */
    snprintf(name, sizeof name, "Maximum principle holds with r = %.2f", r);
    test_case_begin(name);
    heat_plate_t pl; heat_result_t res;
    heat_boundary_t b = { 80.0 + t, 10.0, 30.0, 60.0, 45.0 };
    heat_params_t p = { r, 1e-9, 300 };
    ASSERT_EQ(solve(0, 30, 24, 1, p, b, &pl, &res), HEAT_OK);
    for (int i = 1; i < 29; ++i)
      for (int j = 1; j < 23; ++j) {
        double v = heat_plate_get(&pl, i, j);
        ASSERT_TRUE(v >= 10.0 - 1e-12 && v <= 80.0 + t + 1e-12);
      }
    heat_plate_free(&pl);
    test_case_end();
  }
}

/* ── 3. Symmetric borders give a symmetric plate (10) ───────────────── */
static void test_symmetry(void) {
  for (int t = 1; t <= 10; ++t) {
    int cols = 9 + 2 * t;  /* odd widths: the middle column is the mirror axis */
    char name[128];
    snprintf(name, sizeof name, "Left-right symmetry - %d columns", cols);
    test_case_begin(name);
    heat_plate_t pl; heat_result_t res;
    heat_boundary_t b = { 100.0, 5.0, 40.0, 40.0, 0.0 };
    heat_params_t p = { 0.2, 1e-9, 150 };
    ASSERT_EQ(solve(0, 20, cols, 1, p, b, &pl, &res), HEAT_OK);
    for (int i = 0; i < 20; ++i)
      for (int j = 0; j < cols / 2; ++j)
        ASSERT_TRUE(fabs(heat_plate_get(&pl, i, j) - heat_plate_get(&pl, i, cols - 1 - j)) < 1e-9);
    heat_plate_free(&pl);
    test_case_end();
  }
}

/* ── 4. Row bands cover the interior with no gaps or overlaps (10) ───── */
static void test_partition(void) {
  const int cases[10][2] = { {102, 1}, {102, 2}, {102, 3}, {102, 4}, {102, 7}, {102, 8},
                             {50, 16}, {11, 9}, {5, 3}, {6, 10} };
  for (int c = 0; c < 10; ++c) {
    int rows = cases[c][0], threads = cases[c][1];
    char name[128];
    snprintf(name, sizeof name, "Partition - %d rows into %d bands (contiguous, sizes differ <= 1)", rows, threads);
    test_case_begin(name);
    int prev_end = 1, min_size = rows, max_size = 0;
    for (int t = 0; t < threads; ++t) {
      int b, e;
      heat_partition(rows, threads, t, &b, &e);
      ASSERT_EQ(b, prev_end);
      ASSERT_LE(b, e);
      if (e - b < min_size) min_size = e - b;
      if (e - b > max_size) max_size = e - b;
      prev_end = e;
    }
    ASSERT_EQ(prev_end, rows - 1);
    ASSERT_LE(max_size - min_size, 1);
    test_case_end();
  }
}

/* ── 5. Kernel on a hand-checked case (3) ───────────────────────────── */
static void test_kernel(void) {
  test_case_begin("Kernel - one hot neighbour gives r * 100");
  {
    double cur[9] = { 0, 100, 0,  0, 0, 0,  0, 0, 0 };
    double next[9] = { 0 };
    double d = heat_step_rows(cur, next, 3, 0.25, 1, 2);
    ASSERT_TRUE(next[4] == 25.0);
    ASSERT_TRUE(d == 25.0);
  }
  test_case_end();

  test_case_begin("Kernel - r = 1/4 averages the four neighbours");
  {
    double cur[9] = { 0, 10, 0,  20, 99, 30,  0, 40, 0 };
    double next[9] = { 0 };
    heat_step_rows(cur, next, 3, 0.25, 1, 2);
    ASSERT_TRUE(fabs(next[4] - 25.0) < 1e-12);
  }
  test_case_end();

  test_case_begin("Kernel - only writes the requested rows and interior columns");
  {
    double cur[20] = { 0 }, next[20];
    for (int k = 0; k < 20; ++k) { cur[k] = k; next[k] = -1.0; }
    heat_step_rows(cur, next, 5, 0.1, 2, 3);
    for (int k = 0; k < 20; ++k) {
      int i = k / 5, j = k % 5;
      if (i == 2 && j > 0 && j < 4) ASSERT_TRUE(next[k] != -1.0);
      else ASSERT_TRUE(next[k] == -1.0);
    }
  }
  test_case_end();
}

/* ── 6. Parallel engines give exactly the serial result (15) ────────── */
static void test_parallel_equals_serial(void) {
  const int sizes[5][2] = { {37, 53}, {64, 64}, {101, 33}, {12, 90}, {200, 150} };
  const int threads[8] = { 1, 2, 3, 4, 5, 7, 8, 16 };
  heat_params_t p = { 0.2, 0.05, 50000 };

  for (int k = 0; k < 8; ++k) {
    int rows = sizes[k % 5][0], cols = sizes[k % 5][1];
    char name[128];
    snprintf(name, sizeof name, "pthreads (spin barrier, %d threads) == serial on %dx%d, bit for bit", threads[k], rows, cols);
    test_case_begin(name);
    heat_plate_t s, q; heat_result_t rs, rq;
    ASSERT_EQ(solve(0, rows, cols, 1, p, HOT_TOP, &s, &rs), HEAT_OK);
    ASSERT_EQ(solve(1, rows, cols, threads[k], p, HOT_TOP, &q, &rq), HEAT_OK);
    ASSERT_EQ(rs.iterations, rq.iterations);
    ASSERT_TRUE(rs.max_delta == rq.max_delta);
    ASSERT_TRUE(same_grid(&s, &q));
    heat_plate_free(&s); heat_plate_free(&q);
    test_case_end();
  }
  for (int k = 0; k < 3; ++k) {
    int t = 2 + 2 * k;
    char name[128];
    snprintf(name, sizeof name, "pthreads (sleeping barrier, %d threads) == serial, bit for bit", t);
    test_case_begin(name);
    heat_plate_t s, q; heat_result_t rs, rq;
    ASSERT_EQ(solve(0, 48, 40, 1, p, HOT_TOP, &s, &rs), HEAT_OK);
    ASSERT_EQ(solve(2, 48, 40, t, p, HOT_TOP, &q, &rq), HEAT_OK);
    ASSERT_EQ(rs.iterations, rq.iterations);
    ASSERT_TRUE(same_grid(&s, &q));
    heat_plate_free(&s); heat_plate_free(&q);
    test_case_end();
  }
  const int omp_threads[4] = { 1, 2, 4, 8 };
  for (int k = 0; k < 4; ++k) {
    char name[128];
    snprintf(name, sizeof name, "OpenMP (%d threads) == serial, bit for bit", omp_threads[k]);
    test_case_begin(name);
    heat_plate_t s, q; heat_result_t rs, rq;
    ASSERT_EQ(solve(0, 66, 70, 1, p, HOT_TOP, &s, &rs), HEAT_OK);
    ASSERT_EQ(solve(3, 66, 70, omp_threads[k], p, HOT_TOP, &q, &rq), HEAT_OK);
    ASSERT_EQ(rs.iterations, rq.iterations);
    ASSERT_TRUE(same_grid(&s, &q));
    heat_plate_free(&s); heat_plate_free(&q);
    test_case_end();
  }
}

/* ── 7. Convergence semantics (6) ───────────────────────────────────── */
static void test_convergence(void) {
  heat_plate_t pl; heat_result_t r;

  test_case_begin("Converged runs end with last change <= epsilon");
  heat_params_t p = { 0.2, 0.01, 100000 };
  ASSERT_EQ(solve(1, 40, 40, 4, p, HOT_TOP, &pl, &r), HEAT_OK);
  ASSERT_TRUE(r.converged);
  ASSERT_TRUE(r.max_delta <= 0.01);
  heat_plate_free(&pl);
  test_case_end();

  test_case_begin("A smaller epsilon needs more iterations");
  heat_result_t loose, tight;
  heat_params_t pl1 = { 0.2, 0.1, 100000 }, pl2 = { 0.2, 0.001, 100000 };
  solve(0, 30, 30, 1, pl1, HOT_TOP, &pl, &loose); heat_plate_free(&pl);
  solve(0, 30, 30, 1, pl2, HOT_TOP, &pl, &tight); heat_plate_free(&pl);
  ASSERT_LT(loose.iterations, tight.iterations);
  test_case_end();

  test_case_begin("The iteration limit stops the solver and reports not converged");
  heat_params_t lim = { 0.2, 1e-12, 25 };
  ASSERT_EQ(solve(1, 40, 40, 3, lim, HOT_TOP, &pl, &r), HEAT_OK);
  ASSERT_EQ(r.iterations, 25);
  ASSERT_FALSE(r.converged);
  heat_plate_free(&pl);
  test_case_end();

  test_case_begin("Equal borders converge to a uniform plate at that temperature");
  heat_boundary_t same = { 70.0, 70.0, 70.0, 70.0, 0.0 };
  heat_params_t p2 = { 0.25, 1e-6, 200000 };
  ASSERT_EQ(solve(1, 20, 20, 4, p2, same, &pl, &r), HEAT_OK);
  ASSERT_TRUE(r.converged);
  for (int i = 1; i < 19; ++i) for (int j = 1; j < 19; ++j) ASSERT_TRUE(fabs(heat_plate_get(&pl, i, j) - 70.0) < 0.01);
  heat_plate_free(&pl);
  test_case_end();

  test_case_begin("A plate already at equilibrium converges in one iteration");
  heat_boundary_t flat = { 20.0, 20.0, 20.0, 20.0, 20.0 };
  heat_params_t p3 = { 0.2, 1e-9, 100 };
  ASSERT_EQ(solve(0, 10, 10, 1, p3, flat, &pl, &r), HEAT_OK);
  ASSERT_EQ(r.iterations, 1);
  ASSERT_TRUE(r.max_delta == 0.0);
  heat_plate_free(&pl);
  test_case_end();

  test_case_begin("r = 1/4 (the stability limit) stays bounded");
  heat_params_t p4 = { 0.25, 1e-9, 2000 };
  ASSERT_EQ(solve(0, 25, 25, 1, p4, HOT_TOP, &pl, &r), HEAT_OK);
  for (int i = 0; i < 25; ++i) for (int j = 0; j < 25; ++j) ASSERT_TRUE(heat_plate_get(&pl, i, j) <= 100.0 + 1e-9);
  heat_plate_free(&pl);
  test_case_end();
}

/* ── 8. Invalid input is rejected (6) ───────────────────────────────── */
static void test_validation(void) {
  heat_plate_t pl; heat_result_t r;
  heat_params_t ok = { 0.2, 0.01, 100 };

  test_case_begin("Plates smaller than 3x3 are rejected");
  ASSERT_EQ(heat_plate_init(&pl, 2, 10, HOT_TOP), HEAT_EINVAL);
  ASSERT_EQ(heat_plate_init(&pl, 10, 2, HOT_TOP), HEAT_EINVAL);
  test_case_end();

  test_case_begin("Unstable r > 1/4 is rejected");
  heat_params_t bad = { 0.3, 0.01, 100 };
  ASSERT_FALSE(heat_params_valid(&bad));
  heat_plate_init(&pl, 10, 10, HOT_TOP);
  ASSERT_EQ(heat_solve_serial(&pl, &bad, &r), HEAT_EINVAL);
  heat_plate_free(&pl);
  test_case_end();

  test_case_begin("r <= 0 is rejected");
  heat_params_t zero = { 0.0, 0.01, 100 };
  ASSERT_FALSE(heat_params_valid(&zero));
  test_case_end();

  test_case_begin("epsilon <= 0 and max_iterations <= 0 are rejected");
  heat_params_t e0 = { 0.2, 0.0, 100 }, m0 = { 0.2, 0.01, 0 };
  ASSERT_FALSE(heat_params_valid(&e0));
  ASSERT_FALSE(heat_params_valid(&m0));
  test_case_end();

  test_case_begin("Zero threads is rejected by both parallel solvers");
  heat_plate_init(&pl, 10, 10, HOT_TOP);
  ASSERT_EQ(heat_solve_pthreads(&pl, &ok, 0, &r), HEAT_EINVAL);
  ASSERT_EQ(heat_solve_openmp(&pl, &ok, 0, &r), HEAT_EINVAL);
  heat_plate_free(&pl);
  test_case_end();

  test_case_begin("More threads than interior rows is clamped, not a crash");
  ASSERT_EQ(solve(1, 6, 30, 64, ok, HOT_TOP, &pl, &r), HEAT_OK);
  ASSERT_EQ(r.threads, 4);
  heat_plate_free(&pl);
  test_case_end();
}

int main(void) {
  test_suite_begin("Heat Diffusion - real solver library (70 Tests)");
  test_boundary_preservation();    /* 10 */
  test_maximum_principle();        /* 10 */
  test_symmetry();                 /* 10 */
  test_partition();                /* 10 */
  test_kernel();                   /*  3 */
  test_parallel_equals_serial();   /* 15 */
  test_convergence();              /*  6 */
  test_validation();               /*  6 */
  return test_suite_summary();
}
