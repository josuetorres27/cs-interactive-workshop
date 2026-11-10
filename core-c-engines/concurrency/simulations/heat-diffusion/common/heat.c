/**
 * Concurrent Systems Laboratory
 * Module: 2D Heat Diffusion - shared solver library (serial + POSIX threads)
 *
 * Author: Josue Torres
 * Licensed under the MIT License.
 */
#define _POSIX_C_SOURCE 200112L
#define _DEFAULT_SOURCE   /* sched_yield */

#include "heat.h"

#include <math.h>
#include <pthread.h>
#include <sched.h>
#include <stdatomic.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* ── Small helpers ───────────────────────────────────────────────────── */

static double now_seconds(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (double)ts.tv_sec + (double)ts.tv_nsec * 1e-9;
}

const char* heat_strerror(int code) {
  switch (code) {
    case HEAT_OK: return "ok";
    case HEAT_EINVAL: return "invalid argument";
    case HEAT_ENOMEM: return "out of memory";
    case HEAT_ETHREAD: return "could not create threads or barrier";
    default: return "unknown error";
  }
}

/* ── Plate ───────────────────────────────────────────────────────────── */

static void apply_boundary(double* grid, int rows, int cols, heat_boundary_t b) {
  for (int i = 0; i < rows; ++i) {
    for (int j = 0; j < cols; ++j) grid[(size_t)i * cols + j] = b.interior;
    grid[(size_t)i * cols] = b.left;
    grid[(size_t)i * cols + cols - 1] = b.right;
  }
  /* Top and bottom rows win the corners. Corners never enter the stencil. */
  for (int j = 0; j < cols; ++j) {
    grid[j] = b.top;
    grid[(size_t)(rows - 1) * cols + j] = b.bottom;
  }
}

int heat_plate_init(heat_plate_t* plate, int rows, int cols, heat_boundary_t boundary) {
  if (!plate || rows < 3 || cols < 3) return HEAT_EINVAL;
  memset(plate, 0, sizeof(*plate));
  size_t n = (size_t)rows * (size_t)cols;
  plate->cur = (double*)malloc(n * sizeof(double));
  plate->next = (double*)malloc(n * sizeof(double));
  if (!plate->cur || !plate->next) {
    heat_plate_free(plate);
    return HEAT_ENOMEM;
  }
  plate->rows = rows;
  plate->cols = cols;
  /* Both buffers carry the borders, so swapping never loses them. */
  apply_boundary(plate->cur, rows, cols, boundary);
  apply_boundary(plate->next, rows, cols, boundary);
  return HEAT_OK;
}

void heat_plate_free(heat_plate_t* plate) {
  if (!plate) return;
  free(plate->cur);
  free(plate->next);
  plate->cur = plate->next = NULL;
  plate->rows = plate->cols = 0;
}

double heat_plate_get(const heat_plate_t* plate, int i, int j) {
  return plate->cur[(size_t)i * plate->cols + j];
}

int heat_params_valid(const heat_params_t* p) {
  return p && p->r > 0.0 && p->r <= 0.25 && p->epsilon > 0.0 && p->max_iterations > 0;
}

/* ── Decomposition and kernel ────────────────────────────────────────── */

void heat_partition(int rows, int threads, int t, int* begin, int* end) {
  int interior = rows - 2;
  int base = interior / threads;
  int extra = interior % threads;           /* the first `extra` threads get one more row */
  int start = 1 + t * base + (t < extra ? t : extra);
  *begin = start;
  *end = start + base + (t < extra ? 1 : 0);
}

double heat_step_rows(const double* restrict cur, double* restrict next, int cols, double r,
                      int row_begin, int row_end) {
  double max_delta = 0.0;
  for (int i = row_begin; i < row_end; ++i) {
    const double* up = cur + (size_t)(i - 1) * cols;
    const double* mid = cur + (size_t)i * cols;
    const double* down = cur + (size_t)(i + 1) * cols;
    double* out = next + (size_t)i * cols;
    for (int j = 1; j < cols - 1; ++j) {
      double u = mid[j];
      double v = u + r * (up[j] + down[j] + mid[j - 1] + mid[j + 1] - 4.0 * u);
      out[j] = v;
      double d = fabs(v - u);
      if (d > max_delta) max_delta = d;
    }
  }
  return max_delta;
}

/* ── Serial solver ───────────────────────────────────────────────────── */

int heat_solve_serial(heat_plate_t* plate, const heat_params_t* params, heat_result_t* result) {
  if (!plate || !plate->cur || !heat_params_valid(params) || !result) return HEAT_EINVAL;
  double start = now_seconds();
  long it = 0;
  double delta = 0.0;
  while (it < params->max_iterations) {
    delta = heat_step_rows(plate->cur, plate->next, plate->cols, params->r, 1, plate->rows - 1);
    double* tmp = plate->cur; plate->cur = plate->next; plate->next = tmp;
    ++it;
    if (delta <= params->epsilon) break;
  }
  result->iterations = it;
  result->max_delta = delta;
  result->converged = delta <= params->epsilon;
  result->threads = 1;
  result->seconds = now_seconds() - start;
  return HEAT_OK;
}

/* ── POSIX threads solver ────────────────────────────────────────────────
 *
 * One barrier per iteration:
 *   1. every thread computes its band of `next` and writes its local max into
 *      deltas[parity][tid]  (parity = iteration % 2)
 *   2. barrier
 *   3. every thread reads all deltas[parity][*], computes the same global max,
 *      swaps its own local cur/next pointers and decides to continue or stop.
 *
 * Why two parity slots: a fast thread may already be writing iteration k + 1
 * while a slow one is still reading iteration k. With separate slots, the slot
 * it overwrites (k + 1) is not the one being read (k); slot k is only written
 * again at k + 2, after everyone has passed barrier k + 1.
 *
 * Why padding: each slot fills a whole cache line, so threads updating their
 * own slot never invalidate each other's cache lines (no false sharing).
 *
 * Why a start gate: workers wait for "go" before touching the barrier. If a
 * pthread_create fails, the main thread says "abort" instead, so nobody gets
 * stuck in a barrier that would never fill up.
 *
 * Two barrier implementations:
 *   HEAT_BARRIER_SPIN   (default) sense-reversing barrier on C11 atomics. The
 *                       last thread to arrive flips a shared "sense" flag; the
 *                       others spin on it for a short while and then yield the
 *                       CPU. Cheap when iterations are short (small plates).
 *   HEAT_BARRIER_SLEEP  pthread_barrier_wait: waiting threads sleep in the
 *                       kernel and must be woken up every iteration, which can
 *                       cost more than the work itself on small plates.
 */

#define CACHE_LINE 64

typedef struct {
  double value;
  char pad[CACHE_LINE - sizeof(double)];
} padded_delta_t;

typedef struct {
  _Alignas(CACHE_LINE) atomic_int remaining;   /* threads still to arrive this round */
  _Alignas(CACHE_LINE) atomic_int sense;       /* flips every time the barrier opens */
  int total;
} spin_barrier_t;

static void spin_barrier_init(spin_barrier_t* b, int total) {
  atomic_init(&b->remaining, total);
  atomic_init(&b->sense, 0);
  b->total = total;
}

static void spin_barrier_wait(spin_barrier_t* b, int* local_sense) {
  const int my_sense = !*local_sense;
  *local_sense = my_sense;
  /* acq_rel: publishes this thread's writes and, for the last thread, sees everyone's */
  if (atomic_fetch_sub_explicit(&b->remaining, 1, memory_order_acq_rel) == 1) {
    atomic_store_explicit(&b->remaining, b->total, memory_order_relaxed);
    atomic_store_explicit(&b->sense, my_sense, memory_order_release);   /* open */
    return;
  }
  int spins = 0;
  while (atomic_load_explicit(&b->sense, memory_order_acquire) != my_sense) {
    if (++spins >= 2000) { sched_yield(); spins = 0; }  /* do not starve oversubscribed cores */
  }
}

typedef struct {
  /* read-only after start */
  int rows, cols, threads, barrier_kind;
  double r, epsilon;
  long max_iterations;
  double* grid_a;
  double* grid_b;
  /* synchronization */
  pthread_barrier_t sleep_barrier;
  spin_barrier_t spin_barrier;
  pthread_mutex_t gate_lock;
  pthread_cond_t gate_cond;
  int gate;                     /* 0 = wait, 1 = go, -1 = abort */
  padded_delta_t* deltas;       /* [2 * threads] */
  /* written by thread 0 only, read after join */
  long iterations;
  double final_delta;
} shared_t;

typedef struct {
  shared_t* s;
  int tid;
} worker_arg_t;

static int wait_for_gate(shared_t* s) {
  pthread_mutex_lock(&s->gate_lock);
  while (s->gate == 0) pthread_cond_wait(&s->gate_cond, &s->gate_lock);
  int go = s->gate == 1;
  pthread_mutex_unlock(&s->gate_lock);
  return go;
}

static void open_gate(shared_t* s, int value) {
  pthread_mutex_lock(&s->gate_lock);
  s->gate = value;
  pthread_cond_broadcast(&s->gate_cond);
  pthread_mutex_unlock(&s->gate_lock);
}

static void* heat_worker(void* arg) {
  worker_arg_t* w = (worker_arg_t*)arg;
  shared_t* s = w->s;
  const int tid = w->tid;
  if (!wait_for_gate(s)) return NULL;

  int begin, end;
  heat_partition(s->rows, s->threads, tid, &begin, &end);
  double* cur = s->grid_a;     /* every thread swaps its own copy of the pointers */
  double* next = s->grid_b;
  int local_sense = 0;

  for (long it = 0; it < s->max_iterations; ++it) {
    const int parity = (int)(it & 1);
    s->deltas[parity * s->threads + tid].value = heat_step_rows(cur, next, s->cols, s->r, begin, end);

    if (s->barrier_kind == HEAT_BARRIER_SLEEP) pthread_barrier_wait(&s->sleep_barrier);
    else spin_barrier_wait(&s->spin_barrier, &local_sense);

    double global = 0.0;
    for (int t = 0; t < s->threads; ++t) {
      double d = s->deltas[parity * s->threads + t].value;
      if (d > global) global = d;
    }
    double* tmp = cur; cur = next; next = tmp;

    if (tid == 0) { s->iterations = it + 1; s->final_delta = global; }
    if (global <= s->epsilon) break;   /* same data, same decision in every thread */
  }
  return NULL;
}

int heat_solve_pthreads_ex(heat_plate_t* plate, const heat_params_t* params, int threads,
                           int barrier_kind, heat_result_t* result) {
  if (!plate || !plate->cur || !heat_params_valid(params) || !result || threads < 1) return HEAT_EINVAL;
  if (barrier_kind != HEAT_BARRIER_SPIN && barrier_kind != HEAT_BARRIER_SLEEP) return HEAT_EINVAL;
  int interior = plate->rows - 2;
  if (threads > interior) threads = interior;   /* never create threads with no rows */

  shared_t* s = (shared_t*)aligned_alloc(CACHE_LINE, (sizeof(shared_t) + CACHE_LINE - 1) / CACHE_LINE * CACHE_LINE);
  pthread_t* ids = (pthread_t*)calloc((size_t)threads, sizeof(pthread_t));
  worker_arg_t* args = (worker_arg_t*)calloc((size_t)threads, sizeof(worker_arg_t));
  padded_delta_t* deltas = (padded_delta_t*)aligned_alloc(CACHE_LINE, (size_t)threads * 2 * sizeof(padded_delta_t));
  if (!s || !ids || !args || !deltas) { free(s); free(ids); free(args); free(deltas); return HEAT_ENOMEM; }

  memset(s, 0, sizeof(*s));
  s->rows = plate->rows; s->cols = plate->cols; s->threads = threads; s->barrier_kind = barrier_kind;
  s->r = params->r; s->epsilon = params->epsilon; s->max_iterations = params->max_iterations;
  s->grid_a = plate->cur; s->grid_b = plate->next;
  s->deltas = deltas;

  if (barrier_kind == HEAT_BARRIER_SLEEP && pthread_barrier_init(&s->sleep_barrier, NULL, (unsigned)threads) != 0) {
    free(s); free(ids); free(args); free(deltas);
    return HEAT_ETHREAD;
  }
  spin_barrier_init(&s->spin_barrier, threads);
  pthread_mutex_init(&s->gate_lock, NULL);
  pthread_cond_init(&s->gate_cond, NULL);

  double start = now_seconds();
  int created = 0, rc = HEAT_OK;
  for (; created < threads; ++created) {
    args[created].s = s;
    args[created].tid = created;
    if (pthread_create(&ids[created], NULL, heat_worker, &args[created]) != 0) { rc = HEAT_ETHREAD; break; }
  }
  open_gate(s, rc == HEAT_OK ? 1 : -1);
  for (int t = 0; t < created; ++t) pthread_join(ids[t], NULL);
  double elapsed = now_seconds() - start;

  if (rc == HEAT_OK) {
    /* After an odd number of swaps the newest grid is the original `next` buffer. */
    if (s->iterations & 1) { double* tmp = plate->cur; plate->cur = plate->next; plate->next = tmp; }
    result->iterations = s->iterations;
    result->max_delta = s->final_delta;
    result->converged = s->final_delta <= params->epsilon;
    result->threads = threads;
    result->seconds = elapsed;
  }

  pthread_cond_destroy(&s->gate_cond);
  pthread_mutex_destroy(&s->gate_lock);
  if (barrier_kind == HEAT_BARRIER_SLEEP) pthread_barrier_destroy(&s->sleep_barrier);
  free(s); free(ids); free(args); free(deltas);
  return rc;
}

int heat_solve_pthreads(heat_plate_t* plate, const heat_params_t* params, int threads, heat_result_t* result) {
  return heat_solve_pthreads_ex(plate, params, threads, HEAT_BARRIER_SPIN, result);
}
