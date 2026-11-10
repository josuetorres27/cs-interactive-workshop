/**
 * Concurrent Systems Laboratory
 * Module: 2D Heat Diffusion - sequential baseline
 *
 * usage: heat_serial [rows] [cols] [epsilon]
 *
 * Author: Josue Torres
 * Licensed under the MIT License.
 */
#include "../../common/heat_cli.h"

int main(int argc, char* argv[]) {
  heat_cli_t c = { 200, 200, 1, 0.01, 0, 0 };   /* no threads argument here */
  int ok = argc <= 4;
  if (ok && argc > 1) ok = heat_cli_int(argv[1], 3, 20000, &c.rows);
  if (ok && argc > 2) ok = heat_cli_int(argv[2], 3, 20000, &c.cols);
  if (ok && argc > 3) { char* end; c.epsilon = strtod(argv[3], &end); ok = !*end && c.epsilon > 0; }
  if (!ok) {
    fprintf(stderr, "usage: %s [rows>=3] [cols>=3] [epsilon>0]\n", argv[0]);
    return EXIT_FAILURE;
  }

  heat_cli_banner("SEQUENTIAL BASELINE", &c, 0);
  heat_plate_t plate;
  heat_params_t p = { HEAT_CLI_R, c.epsilon, HEAT_CLI_MAX_ITER };
  heat_result_t r;
  int rc = heat_plate_init(&plate, c.rows, c.cols, HEAT_CLI_BOUNDARY);
  if (rc == HEAT_OK) rc = heat_solve_serial(&plate, &p, &r);
  if (rc != HEAT_OK) { fprintf(stderr, "error: %s\n", heat_strerror(rc)); heat_plate_free(&plate); return EXIT_FAILURE; }

  heat_cli_report(&c, &r);
  printf("  center cell   %.4f\n", heat_plate_get(&plate, c.rows / 2, c.cols / 2));
  printf("====================================================================\n");
  heat_plate_free(&plate);
  return EXIT_SUCCESS;
}
