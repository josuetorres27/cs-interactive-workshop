/**
 * Concurrent Systems Laboratory
 * Module: 2D Thermal Heat Diffusion Simulation (Sequential Baseline)
 * File: main.c
 *
 * Implements finite-difference numerical solution for the 2D heat equation.
 * Serves as the single-core baseline for measuring parallel speedup and efficiency.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2024-2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#define _POSIX_C_SOURCE 199309L

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>
#include <string.h>

typedef struct {
  long long rows;
  long long cols;
  double* current;
  double* next;
} HeatPlate;

HeatPlate* create_plate(long long rows, long long cols) {
  HeatPlate* plate = (HeatPlate*) malloc(sizeof(HeatPlate));
  plate->rows = rows;
  plate->cols = cols;
  plate->current = (double*) calloc(rows * cols, sizeof(double));
  plate->next    = (double*) calloc(rows * cols, sizeof(double));

  /* Set hot top boundary (100 C) and cool bottom (0 C) */
  for (long long j = 0; j < cols; ++j) {
    plate->current[0 * cols + j] = 100.0;
    plate->next[0 * cols + j]    = 100.0;
    plate->current[(rows - 1) * cols + j] = 0.0;
    plate->next[(rows - 1) * cols + j]    = 0.0;
  }
  for (long long i = 0; i < rows; ++i) {
    plate->current[i * cols + 0] = 50.0;
    plate->next[i * cols + 0]    = 50.0;
    plate->current[i * cols + (cols - 1)] = 50.0;
    plate->next[i * cols + (cols - 1)]    = 50.0;
  }
  return plate;
}

void free_plate(HeatPlate* plate) {
  if (plate) {
    free(plate->current);
    free(plate->next);
    free(plate);
  }
}

int main(int argc, char* argv[]) {
  long long rows = 200;
  long long cols = 200;
  double epsilon = 0.01;
  double alpha = 1.0;
  double delta_t = 0.2;
  double h = 1.0;
  long long max_iterations = 25000;

  if (argc >= 2) rows = atoll(argv[1]);
  if (argc >= 3) cols = atoll(argv[2]);
  if (argc >= 4) epsilon = atof(argv[3]);

  printf("====================================================================\n");
  printf("     2D HEAT DIFFUSION SIMULATION - SEQUENTIAL BASELINE (SERIAL)    \n");
  printf("====================================================================\n");
  printf(" [✓] Plate Dimensions: %lld x %lld (%lld elements)\n", rows, cols, rows * cols);
  printf(" [✓] Convergence Target: epsilon = %f\n", epsilon);
  printf(" [✓] Physical Parameters: alpha = %.2f, delta_t = %.2f, h = %.2f\n", alpha, delta_t, h);
  printf("====================================================================\n\n");

  HeatPlate* plate = create_plate(rows, cols);
  double r = (delta_t * alpha) / (h * h);

  struct timespec start, end;
  clock_gettime(CLOCK_MONOTONIC, &start);

  long long iteration = 0;
  double max_delta = 0.0;

  do {
    max_delta = 0.0;
    iteration++;

    for (long long i = 1; i < rows - 1; ++i) {
      long long row_offset = i * cols;
      for (long long j = 1; j < cols - 1; ++j) {
        long long idx = row_offset + j;
        double u_ij = plate->current[idx];
        double u_next = u_ij + r * (
          plate->current[idx - cols] +
          plate->current[idx + cols] +
          plate->current[idx - 1] +
          plate->current[idx + 1] -
          4.0 * u_ij
        );
        plate->next[idx] = u_next;

        double delta = fabs(u_next - u_ij);
        if (delta > max_delta) {
          max_delta = delta;
        }
      }
    }

    /* Swap pointers for next iteration */
    double* temp = plate->current;
    plate->current = plate->next;
    plate->next = temp;

  } while (max_delta > epsilon && iteration < max_iterations);

  clock_gettime(CLOCK_MONOTONIC, &end);
  double elapsed_sec = (end.tv_sec - start.tv_sec) + (end.tv_nsec - start.tv_nsec) / 1e9;

  printf(" [✓] Simulation Finished:\n");
  printf("     - Iterations to Equilibrium: %lld\n", iteration);
  printf("     - Final Max Delta:           %e\n", max_delta);
  printf("     - Total Elapsed Time:        %.4f seconds\n", elapsed_sec);
  printf("     - Throughput:                %.2f Megacells/sec\n",
         ((double)rows * cols * iteration) / (elapsed_sec * 1e6));
  printf("====================================================================\n");

  free_plate(plate);
  return EXIT_SUCCESS;
}
