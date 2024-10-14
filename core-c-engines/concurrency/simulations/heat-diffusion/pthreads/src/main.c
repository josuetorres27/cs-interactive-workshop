/**
 * Concurrent Systems Laboratory
 * Module: 2D Thermal Heat Diffusion Simulation (POSIX Threads)
 * File: main.c
 *
 * Implements 1D row-based domain decomposition using POSIX threads
 * and pthread barriers for synchronized multi-core iterative convergence.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2024-2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <pthread.h>
#include <time.h>
#include <string.h>

typedef struct {
  long long rows;
  long long cols;
  double* current;
  double* next;
  double r;
  double epsilon;
  long long max_iterations;
  int thread_count;
  pthread_barrier_t barrier;
  double* thread_max_deltas;
  double global_max_delta;
  int converged;
  long long completed_iterations;
} SharedSimulation;

typedef struct {
  int thread_id;
  long long start_row;
  long long end_row;
  SharedSimulation* shared;
} WorkerArgs;

void* worker_thread(void* arg) {
  WorkerArgs* args = (WorkerArgs*) arg;
  SharedSimulation* s = args->shared;
  int tid = args->thread_id;
  long long start = args->start_row;
  long long end   = args->end_row;
  long long cols  = s->cols;
  double r        = s->r;

  for (long long iter = 0; iter < s->max_iterations; ++iter) {
    double local_max_delta = 0.0;

    for (long long i = start; i < end; ++i) {
      long long row_offset = i * cols;
      for (long long j = 1; j < cols - 1; ++j) {
        long long idx = row_offset + j;
        double u_ij = s->current[idx];
        double u_next = u_ij + r * (
          s->current[idx - cols] +
          s->current[idx + cols] +
          s->current[idx - 1] +
          s->current[idx + 1] -
          4.0 * u_ij
        );
        s->next[idx] = u_next;

        double delta = fabs(u_next - u_ij);
        if (delta > local_max_delta) {
          local_max_delta = delta;
        }
      }
    }

    s->thread_max_deltas[tid] = local_max_delta;

    /* Barrier 1: Wait for all threads to finish computing next matrix */
    pthread_barrier_wait(&s->barrier);

    /* Thread 0 aggregates global delta and swaps pointers */
    if (tid == 0) {
      double g_max = 0.0;
      for (int t = 0; t < s->thread_count; ++t) {
        if (s->thread_max_deltas[t] > g_max) {
          g_max = s->thread_max_deltas[t];
        }
      }
      s->global_max_delta = g_max;
      s->completed_iterations = iter + 1;

      if (g_max <= s->epsilon) {
        s->converged = 1;
      }

      /* Swap matrices */
      double* temp = s->current;
      s->current = s->next;
      s->next = temp;
    }

    /* Barrier 2: Wait for Thread 0 to perform convergence check and pointer swap */
    pthread_barrier_wait(&s->barrier);

    if (s->converged) {
      break;
    }
  }

  free(args);
  return NULL;
}

int main(int argc, char* argv[]) {
  long long rows = 200;
  long long cols = 200;
  int thread_count = 4;
  double epsilon = 0.01;
  double alpha = 1.0;
  double delta_t = 0.2;
  double h = 1.0;
  long long max_iterations = 25000;

  if (argc >= 2) rows = atoll(argv[1]);
  if (argc >= 3) cols = atoll(argv[2]);
  if (argc >= 4) thread_count = atoi(argv[3]);
  if (argc >= 5) epsilon = atof(argv[4]);

  printf("====================================================================\n");
  printf("     2D HEAT DIFFUSION SIMULATION - POSIX THREADS DOMAIN DECOMP    \n");
  printf("====================================================================\n");
  printf(" [✓] Plate Dimensions: %lld x %lld (%lld elements)\n", rows, cols, rows * cols);
  printf(" [✓] Worker Threads:   %d threads\n", thread_count);
  printf(" [✓] Convergence:      epsilon = %f\n", epsilon);
  printf("====================================================================\n\n");

  SharedSimulation s;
  s.rows = rows;
  s.cols = cols;
  s.current = (double*) calloc(rows * cols, sizeof(double));
  s.next    = (double*) calloc(rows * cols, sizeof(double));
  s.r = (delta_t * alpha) / (h * h);
  s.epsilon = epsilon;
  s.max_iterations = max_iterations;
  s.thread_count = thread_count;
  s.thread_max_deltas = (double*) calloc(thread_count, sizeof(double));
  s.global_max_delta = 0.0;
  s.converged = 0;
  s.completed_iterations = 0;

  pthread_barrier_init(&s.barrier, NULL, thread_count);

  /* Set boundary temperatures */
  for (long long j = 0; j < cols; ++j) {
    s.current[0 * cols + j] = 100.0;
    s.next[0 * cols + j]    = 100.0;
    s.current[(rows - 1) * cols + j] = 0.0;
    s.next[(rows - 1) * cols + j]    = 0.0;
  }
  for (long long i = 0; i < rows; ++i) {
    s.current[i * cols + 0] = 50.0;
    s.next[i * cols + 0]    = 50.0;
    s.current[i * cols + (cols - 1)] = 50.0;
    s.next[i * cols + (cols - 1)]    = 50.0;
  }

  pthread_t* threads = (pthread_t*) malloc(thread_count * sizeof(pthread_t));
  long long internal_rows = rows - 2;
  long long rows_per_thread = internal_rows / thread_count;
  long long remainder = internal_rows % thread_count;

  struct timespec start, end;
  clock_gettime(CLOCK_MONOTONIC, &start);

  long long current_row = 1;
  for (int t = 0; t < thread_count; ++t) {
    long long assigned = rows_per_thread + (t < remainder ? 1 : 0);
    WorkerArgs* args = (WorkerArgs*) malloc(sizeof(WorkerArgs));
    args->thread_id = t;
    args->start_row = current_row;
    args->end_row   = current_row + assigned;
    args->shared    = &s;
    current_row    += assigned;

    pthread_create(&threads[t], NULL, worker_thread, args);
  }

  for (int t = 0; t < thread_count; ++t) {
    pthread_join(threads[t], NULL);
  }

  clock_gettime(CLOCK_MONOTONIC, &end);
  double elapsed_sec = (end.tv_sec - start.tv_sec) + (end.tv_nsec - start.tv_nsec) / 1e9;

  printf(" [✓] Multi-Threaded Simulation Finished:\n");
  printf("     - Iterations to Equilibrium: %lld\n", s.completed_iterations);
  printf("     - Final Max Delta:           %e\n", s.global_max_delta);
  printf("     - Elapsed Time (%d threads):  %.4f seconds\n", thread_count, elapsed_sec);
  printf("     - Multi-Core Throughput:     %.2f Megacells/sec\n",
         ((double)rows * cols * s.completed_iterations) / (elapsed_sec * 1e6));
  printf("====================================================================\n");

  pthread_barrier_destroy(&s.barrier);
  free(threads);
  free(s.thread_max_deltas);
  free(s.current);
  free(s.next);

  return EXIT_SUCCESS;
}
