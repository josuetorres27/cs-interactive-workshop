/**
 * Concurrent Systems Laboratory
 * Module: 2D Thermal Heat Diffusion Simulation (OpenMP)
 * File: main.c
 *
 * Parallel implementation of the 2D heat equation using OpenMP work-sharing
 * loops and reduction clauses for maximum performance on multi-core architectures.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2024-2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <omp.h>

int main(int argc, char* argv[]) {
  long long rows = 200;
  long long cols = 200;
  int thread_count = omp_get_max_threads();
  double epsilon = 0.01;
  double alpha = 1.0;
  double delta_t = 0.2;
  double h = 1.0;
  long long max_iterations = 25000;

  if (argc >= 2) rows = atoll(argv[1]);
  if (argc >= 3) cols = atoll(argv[2]);
  if (argc >= 4) thread_count = atoi(argv[3]);
  if (argc >= 5) epsilon = atof(argv[4]);

  omp_set_num_threads(thread_count);

  printf("====================================================================\n");
  printf("     2D HEAT DIFFUSION SIMULATION - OPENMP HIGH-PERFORMANCE         \n");
  printf("====================================================================\n");
  printf(" [✓] Plate Dimensions: %lld x %lld (%lld elements)\n", rows, cols, rows * cols);
  printf(" [✓] OpenMP Threads:   %d threads\n", thread_count);
  printf(" [✓] Convergence:      epsilon = %f\n", epsilon);
  printf("====================================================================\n\n");

  double* current = (double*) calloc(rows * cols, sizeof(double));
  double* next    = (double*) calloc(rows * cols, sizeof(double));
  double r = (delta_t * alpha) / (h * h);

  /* Set boundary temperatures */
  for (long long j = 0; j < cols; ++j) {
    current[0 * cols + j] = 100.0;
    next[0 * cols + j]    = 100.0;
    current[(rows - 1) * cols + j] = 0.0;
    next[(rows - 1) * cols + j]    = 0.0;
  }
  for (long long i = 0; i < rows; ++i) {
    current[i * cols + 0] = 50.0;
    next[i * cols + 0]    = 50.0;
    current[i * cols + (cols - 1)] = 50.0;
    next[i * cols + (cols - 1)]    = 50.0;
  }

  double start_time = omp_get_wtime();

  long long iteration = 0;
  double max_delta = 0.0;

  do {
    max_delta = 0.0;
    iteration++;

    #pragma omp parallel for reduction(max:max_delta) schedule(static)
    for (long long i = 1; i < rows - 1; ++i) {
      long long row_offset = i * cols;
      for (long long j = 1; j < cols - 1; ++j) {
        long long idx = row_offset + j;
        double u_ij = current[idx];
        double u_next = u_ij + r * (
          current[idx - cols] +
          current[idx + cols] +
          current[idx - 1] +
          current[idx + 1] -
          4.0 * u_ij
        );
        next[idx] = u_next;

        double delta = fabs(u_next - u_ij);
        if (delta > max_delta) {
          max_delta = delta;
        }
      }
    }

    /* Swap pointers */
    double* temp = current;
    current = next;
    next = temp;

  } while (max_delta > epsilon && iteration < max_iterations);

  double elapsed_sec = omp_get_wtime() - start_time;

  printf(" [✓] OpenMP Simulation Finished:\n");
  printf("     - Iterations to Equilibrium: %lld\n", iteration);
  printf("     - Final Max Delta:           %e\n", max_delta);
  printf("     - Elapsed Time (%d threads):  %.4f seconds\n", thread_count, elapsed_sec);
  printf("     - OpenMP Throughput:         %.2f Megacells/sec\n",
         ((double)rows * cols * iteration) / (elapsed_sec * 1e6));
  printf("====================================================================\n");

  free(current);
  free(next);
  return EXIT_SUCCESS;
}
