/**
 * Concurrent Systems Laboratory
 * Module: 2D Heat Diffusion - POSIX threads
 *
 * usage: heat_pthreads [rows] [cols] [threads] [epsilon] [--compare] [--sleep-barrier]
 *
 * Row bands per thread, one barrier per iteration (spinning by default), padded per-thread
 * reduction slots. The solver lives in ../../common/heat.c.
 *
 * Author: Josue Torres Sibaja
 * Licensed under the MIT License.
 */
#include "../../common/heat_cli.h"

int main(int argc, char* argv[]) {
  heat_cli_t c;
  if (!heat_cli_parse(argc, argv, &c)) { heat_cli_usage(argv[0]); return EXIT_FAILURE; }

  heat_cli_banner(c.sleep_barrier ? "POSIX THREADS (row bands, sleeping pthread_barrier)"
                                  : "POSIX THREADS (row bands, spinning barrier)", &c, 1);
  heat_plate_t plate;
  heat_params_t p = { HEAT_CLI_R, c.epsilon, HEAT_CLI_MAX_ITER };
  heat_result_t r;
  int rc = heat_plate_init(&plate, c.rows, c.cols, HEAT_CLI_BOUNDARY);
  if (rc == HEAT_OK) rc = heat_solve_pthreads_ex(&plate, &p, c.threads,
                                                c.sleep_barrier ? HEAT_BARRIER_SLEEP : HEAT_BARRIER_SPIN, &r);
  if (rc != HEAT_OK) { fprintf(stderr, "error: %s\n", heat_strerror(rc)); heat_plate_free(&plate); return EXIT_FAILURE; }

  heat_cli_report(&c, &r);
  int status = c.compare ? heat_cli_compare(&c, &plate, &r) : 0;
  printf("====================================================================\n");
  heat_plate_free(&plate);
  return status ? EXIT_FAILURE : EXIT_SUCCESS;
}
