/**
 * Concurrent Systems Laboratory
 * Module: 2D Heat Diffusion - OpenMP solver
 *
 * One parallel region for the whole solve (threads are created once, not every
 * iteration). Inside it, `omp for` splits the interior rows with a static
 * schedule and its implicit barrier plays the role of pthread_barrier_wait.
 * The max reduction is combined by OpenMP; a `single` block swaps the shared
 * pointers and decides whether to continue, and its implicit barrier makes
 * every thread see the decision before the next iteration.
 *
 * Compile with -fopenmp. Author: Josue Torres Sibaja. MIT License.
 */
#include "heat.h"

#include <omp.h>

int heat_solve_openmp(heat_plate_t* plate, const heat_params_t* params, int threads, heat_result_t* result) {
  if (!plate || !plate->cur || !heat_params_valid(params) || !result || threads < 1) return HEAT_EINVAL;
  int interior = plate->rows - 2;
  if (threads > interior) threads = interior;

  double* cur = plate->cur;
  double* next = plate->next;
  const int rows = plate->rows, cols = plate->cols;
  const double r = params->r, eps = params->epsilon;
  long iterations = 0;
  double delta = 0.0;
  double step_delta = 0.0;   /* reduction target: must be shared by the team */
  int done = 0;

  double start = omp_get_wtime();
  #pragma omp parallel num_threads(threads) default(none) \
          shared(cur, next, iterations, delta, step_delta, done) firstprivate(rows, cols, r, eps, params)
  {
    while (!done) {
      #pragma omp for schedule(static) reduction(max:step_delta)
      for (int i = 1; i < rows - 1; ++i) {
        double d = heat_step_rows(cur, next, cols, r, i, i + 1);
        if (d > step_delta) step_delta = d;
      }
      /* implicit barrier above: the whole `next` grid is ready */
      #pragma omp single
      {
        double* tmp = cur; cur = next; next = tmp;
        ++iterations;
        delta = step_delta;
        step_delta = 0.0;
        done = (delta <= eps) || (iterations >= params->max_iterations);
      }
      /* implicit barrier above: everyone sees the swap and `done` */
    }
  }
  double elapsed = omp_get_wtime() - start;

  plate->cur = cur;
  plate->next = next;
  result->iterations = iterations;
  result->max_delta = delta;
  result->converged = delta <= eps;
  result->threads = threads;
  result->seconds = elapsed;
  return HEAT_OK;
}
