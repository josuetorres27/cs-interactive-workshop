/**
 * Concurrent Systems Laboratory
 * Module: 2D Heat Diffusion - command-line helpers shared by the three programs
 *
 * Usage of every program:
 *   heat_<engine> [rows] [cols] [threads] [epsilon] [--compare] [--sleep-barrier]
 * (heat_serial ignores threads). --compare also runs the serial solver on the
 * same plate and prints speedup, efficiency and whether both grids are equal.
 * --sleep-barrier (heat_pthreads only) uses pthread_barrier_wait instead of
 * the spinning barrier, to compare both.
 *
 * Author: Josue Torres. MIT License.
 */
#ifndef HEAT_CLI_H
#define HEAT_CLI_H

#include "heat.h"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
  int rows, cols, threads;
  double epsilon;
  int compare;
  int sleep_barrier;
} heat_cli_t;

static const heat_boundary_t HEAT_CLI_BOUNDARY = { 100.0, 0.0, 50.0, 50.0, 0.0 };
static const double HEAT_CLI_R = 0.2;          /* alpha=1, dt=0.2, h=1: stable (<= 0.25) */
static const long HEAT_CLI_MAX_ITER = 200000;

static inline int heat_cli_int(const char* s, int lo, int hi, int* out) {
  char* end; errno = 0;
  long v = strtol(s, &end, 10);
  if (errno || *end || v < lo || v > hi) return 0;
  *out = (int)v; return 1;
}

static inline int heat_cli_parse(int argc, char** argv, heat_cli_t* c) {
  c->rows = 200; c->cols = 200; c->threads = 4; c->epsilon = 0.01; c->compare = 0; c->sleep_barrier = 0;
  int pos = 0;
  for (int a = 1; a < argc; ++a) {
    if (strcmp(argv[a], "--compare") == 0) { c->compare = 1; continue; }
    if (strcmp(argv[a], "--sleep-barrier") == 0) { c->sleep_barrier = 1; continue; }
    if (strcmp(argv[a], "--help") == 0 || strcmp(argv[a], "-h") == 0) return 0;
    switch (pos++) {
      case 0: if (!heat_cli_int(argv[a], 3, 20000, &c->rows)) return 0; break;
      case 1: if (!heat_cli_int(argv[a], 3, 20000, &c->cols)) return 0; break;
      case 2: if (!heat_cli_int(argv[a], 1, 1024, &c->threads)) return 0; break;
      case 3: { char* end; c->epsilon = strtod(argv[a], &end); if (*end || c->epsilon <= 0) return 0; break; }
      default: return 0;
    }
  }
  return 1;
}

static inline void heat_cli_usage(const char* prog) {
  fprintf(stderr, "usage: %s [rows>=3] [cols>=3] [threads>=1] [epsilon>0] [--compare]\n", prog);
}

static inline void heat_cli_banner(const char* engine, const heat_cli_t* c, int show_threads) {
  printf("====================================================================\n");
  printf("  2D HEAT DIFFUSION - %s\n", engine);
  printf("====================================================================\n");
  printf("  plate      %d x %d (%ld cells)\n", c->rows, c->cols, (long)c->rows * c->cols);
  if (show_threads) printf("  threads    %d\n", c->threads);
  printf("  epsilon    %g   r = %.2f (stable while r <= 0.25)\n", c->epsilon, HEAT_CLI_R);
  printf("  borders    top 100, bottom 0, left/right 50, interior starts at 0\n");
  printf("--------------------------------------------------------------------\n");
}

static inline void heat_cli_report(const heat_cli_t* c, const heat_result_t* r) {
  double cells = (double)(c->rows - 2) * (c->cols - 2) * (double)r->iterations;
  printf("  %s after %ld iterations (last change %.3e)\n",
         r->converged ? "converged" : "stopped (iteration limit)", r->iterations, r->max_delta);
  printf("  threads used  %d\n", r->threads);
  printf("  time          %.4f s   (%.1f million cell updates/s)\n", r->seconds,
         r->seconds > 0 ? cells / r->seconds / 1e6 : 0.0);
}

/* Runs the serial solver on a fresh plate and compares it with `parallel`. */
static inline int heat_cli_compare(const heat_cli_t* c, const heat_plate_t* parallel, const heat_result_t* pr) {
  heat_plate_t s;
  heat_params_t p = { HEAT_CLI_R, c->epsilon, HEAT_CLI_MAX_ITER };
  heat_result_t sr;
  if (heat_plate_init(&s, c->rows, c->cols, HEAT_CLI_BOUNDARY) != HEAT_OK) return 1;
  heat_solve_serial(&s, &p, &sr);
  size_t n = (size_t)c->rows * c->cols, diff = 0;
  for (size_t k = 0; k < n; ++k) if (s.cur[k] != parallel->cur[k]) ++diff;
  double speedup = pr->seconds > 0 ? sr.seconds / pr->seconds : 0.0;
  printf("--------------------------------------------------------------------\n");
  printf("  serial        %.4f s, %ld iterations\n", sr.seconds, sr.iterations);
  printf("  speedup       %.2fx   efficiency %.0f%%\n", speedup, 100.0 * speedup / pr->threads);
  printf("  same grid as serial: %s (%zu different cells)\n", diff == 0 ? "yes" : "NO", diff);
  heat_plate_free(&s);
  return diff == 0 && sr.iterations == pr->iterations ? 0 : 1;
}

#endif /* HEAT_CLI_H */
