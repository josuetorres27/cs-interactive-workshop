/**
 * Concurrent Systems Laboratory
 * Module: 2D Heat Diffusion - shared solver library
 *
 * Explicit (Jacobi / forward Euler) 5-point stencil on a rectangular plate
 * with fixed (Dirichlet) borders:
 *
 *   u'[i][j] = u[i][j] + r * (u[i-1][j] + u[i+1][j] + u[i][j-1] + u[i][j+1] - 4 u[i][j])
 *
 * Every cell of the new grid depends only on the previous grid, so rows can be
 * computed in any order and by any thread: serial, pthreads and OpenMP produce
 * bit-for-bit identical results. The tests in tests/concurrency rely on that.
 *
 * Author: Josue Torres
 * Licensed under the MIT License.
 */
#ifndef HEAT_H
#define HEAT_H

#ifdef __cplusplus
extern "C" {
#endif

/* Plate with two buffers (double buffering). Row-major: cell (i, j) = i * cols + j. */
typedef struct {
  int rows;
  int cols;
  double* cur;   /* values of the current iteration (read only during a step) */
  double* next;  /* values being written for the next iteration */
} heat_plate_t;

/* Fixed temperatures on the four borders and the initial interior value. */
typedef struct {
  double top;
  double bottom;
  double left;
  double right;
  double interior;
} heat_boundary_t;

typedef struct {
  double r;               /* alpha * dt / h^2, must be in (0, 0.25] to be stable */
  double epsilon;         /* stop when the largest change in one step is <= epsilon */
  long max_iterations;    /* safety limit */
} heat_params_t;

typedef struct {
  long iterations;        /* steps actually performed */
  double max_delta;       /* largest change in the last step */
  int converged;          /* 1 if max_delta <= epsilon before max_iterations */
  int threads;            /* threads actually used (may be fewer than requested) */
  double seconds;         /* wall-clock time of the solve */
} heat_result_t;

enum {
  HEAT_OK = 0,
  HEAT_EINVAL = 1,        /* invalid argument (size, r, epsilon, threads) */
  HEAT_ENOMEM = 2,        /* allocation failed */
  HEAT_ETHREAD = 3        /* a thread or barrier could not be created */
};

/* Plate lifetime. rows and cols must be >= 3. Both buffers get the borders. */
int heat_plate_init(heat_plate_t* plate, int rows, int cols, heat_boundary_t boundary);
void heat_plate_free(heat_plate_t* plate);
double heat_plate_get(const heat_plate_t* plate, int i, int j);

/* Validates r (stability), epsilon and max_iterations. */
int heat_params_valid(const heat_params_t* params);

/* Interior rows [1, rows - 2] split into `threads` contiguous bands that differ
 * by at most one row. Thread t gets rows [*begin, *end). */
void heat_partition(int rows, int threads, int t, int* begin, int* end);

/* The kernel: computes rows [row_begin, row_end) of `next` from `cur` and
 * returns the largest |next - cur| in those rows. */
double heat_step_rows(const double* cur, double* next, int cols, double r, int row_begin, int row_end);

/* Solvers. On success the final grid is in plate->cur. */
int heat_solve_serial(heat_plate_t* plate, const heat_params_t* params, heat_result_t* result);
/* Barrier used by the pthreads solver between iterations. */
enum { HEAT_BARRIER_SPIN = 0, HEAT_BARRIER_SLEEP = 1 };

int heat_solve_pthreads(heat_plate_t* plate, const heat_params_t* params, int threads, heat_result_t* result); /* spin barrier */
int heat_solve_pthreads_ex(heat_plate_t* plate, const heat_params_t* params, int threads,
                           int barrier_kind, heat_result_t* result);
int heat_solve_openmp(heat_plate_t* plate, const heat_params_t* params, int threads, heat_result_t* result); /* heat_omp.c */

const char* heat_strerror(int code);

#ifdef __cplusplus
}
#endif

#endif /* HEAT_H */
