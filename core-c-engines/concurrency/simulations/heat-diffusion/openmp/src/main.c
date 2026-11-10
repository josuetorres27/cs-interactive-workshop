/**
 * Concurrent Systems Laboratory
 * Module: 2D Heat Diffusion - OpenMP
 *
 * usage: heat_openmp [rows] [cols] [threads] [epsilon] [--compare]
 *
 * One parallel region, `omp for schedule(static)` with a max reduction.
 * The solver lives in ../../common/heat_omp.c.
 *
 * Author: Josue Torres
 * Licensed under the MIT License.
 */
#include "../../common/heat_cli.h"

int main(int argc, char* argv[]) {
  heat_cli_t c;
  if (!heat_cli_parse(argc, argv, &c)) { heat_cli_usage(argv[0]); return EXIT_FAILURE; }

  heat_cli_banner("OPENMP (static schedule + max reduction)", &c, 1);
  heat_plate_t plate;
  heat_params_t p = { HEAT_CLI_R, c.epsilon, HEAT_CLI_MAX_ITER };
  heat_result_t r;
  int rc = heat_plate_init(&plate, c.rows, c.cols, HEAT_CLI_BOUNDARY);
  if (rc == HEAT_OK) rc = heat_solve_openmp(&plate, &p, c.threads, &r);
  if (rc != HEAT_OK) { fprintf(stderr, "error: %s\n", heat_strerror(rc)); heat_plate_free(&plate); return EXIT_FAILURE; }

  heat_cli_report(&c, &r);
  int status = c.compare ? heat_cli_compare(&c, &plate, &r) : 0;
  printf("====================================================================\n");
  heat_plate_free(&plate);
  return status ? EXIT_FAILURE : EXIT_SUCCESS;
}
