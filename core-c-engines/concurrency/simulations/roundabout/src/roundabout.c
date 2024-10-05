/**
 * Concurrent Systems Laboratory
 * Module: Roundabout Traffic Concurrency Simulator
 * File: roundabout.c
 *
 * Implementation of vehicle threading, capacity constraint enforcement
 * via POSIX semaphores, and ordered trajectory logging.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2024-2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#include "roundabout.h"

int direction_to_index(char direction) {
  switch (direction) {
    case 'N': return 0;
    case 'E': return 1;
    case 'S': return 2;
    case 'O':
    case 'W': return 3;
    default:  return -1;
  }
}

char index_to_direction(int index) {
  switch (index) {
    case 0:  return 'N';
    case 1:  return 'E';
    case 2:  return 'S';
    case 3:  return 'W';
    default: return '?';
  }
}

long long time_since_start(struct timespec start_time) {
  struct timespec current_time;
  clock_gettime(CLOCK_REALTIME, &current_time);
  return (current_time.tv_sec - start_time.tv_sec) * 1000000000LL +
         (current_time.tv_nsec - start_time.tv_nsec);
}

void* vehicle_thread(void* arg) {
  ThreadArgs* thread_args = (ThreadArgs*) arg;
  SimulationState* sim_state = thread_args->sim_state;
  Vehicle* v = thread_args->vehicle;
  int vehicle_id = v->id;

  Trajectory* trajectory = &sim_state->trajectories[vehicle_id];
  trajectory->vehicle_id = vehicle_id;
  trajectory->path_index = 0;

  if (direction_to_index(v->entry) == -1 || direction_to_index(v->exit) == -1) {
    pthread_mutex_lock(&sim_state->print_mutex);
    fprintf(stderr, "Error: Vehicle %d has invalid entry/exit: %c -> %c\n",
            vehicle_id + 1, v->entry, v->exit);
    pthread_mutex_unlock(&sim_state->print_mutex);
    free(thread_args);
    return NULL;
  }

  struct timespec start_time;
  clock_gettime(CLOCK_REALTIME, &start_time);

  char full_path[] = {'N', 'W', 'S', 'E'};
  int cycle_size = 4;
  int start_index = 0;
  int has_completed_cycle = 0;

  char entry_norm = (v->entry == 'O') ? 'W' : v->entry;
  char exit_norm  = (v->exit == 'O') ? 'W' : v->exit;

  while (full_path[start_index] != entry_norm) {
    start_index = (start_index + 1) % cycle_size;
  }
  int current_index = start_index;

  do {
    int segment_index = direction_to_index(full_path[current_index]);

    /* Acquire segment semaphore to respect capacity */
    sem_wait(&sim_state->segments[segment_index].capacity);

    trajectory->path[trajectory->path_index++] = full_path[current_index];

    if (sim_state->verbose_mode) {
      pthread_mutex_lock(&sim_state->print_mutex);
      printf("  [Vehicle %3d] Entered segment %c (Elapsed: %lld us)\n",
             vehicle_id + 1, full_path[current_index], time_since_start(start_time) / 1000LL);
      pthread_mutex_unlock(&sim_state->print_mutex);
    }

    /* Simulate transit time inside the segment */
    if (sim_state->max_time > 0) {
      int sleep_time = sim_state->min_time;
      if (sim_state->max_time > sim_state->min_time) {
        sleep_time += rand() % (sim_state->max_time - sim_state->min_time + 1);
      }
      usleep(sleep_time * 1000);
    }

    /* Release segment capacity semaphore */
    sem_post(&sim_state->segments[segment_index].capacity);

    current_index = (current_index + 1) % cycle_size;

    if (current_index == start_index) {
      has_completed_cycle = 1;
    }
  } while (!has_completed_cycle && full_path[current_index] != exit_norm);

  trajectory->path[trajectory->path_index++] = exit_norm;
  trajectory->path[trajectory->path_index] = '\0';
  trajectory->total_transit_ns = time_since_start(start_time);

  /* Ordered barrier output: prints vehicles in arrival ID order */
  pthread_mutex_lock(&sim_state->order_mutex);
  while (trajectory->vehicle_id + 1 != sim_state->next_to_print) {
    pthread_cond_wait(&sim_state->order_cond, &sim_state->order_mutex);
  }

  pthread_mutex_lock(&sim_state->print_mutex);
  printf("Vehicle %3d (%c -> %c): ", trajectory->vehicle_id + 1, v->entry, v->exit);
  for (int i = 0; i < trajectory->path_index; i++) {
    printf("%c", trajectory->path[i]);
    if (i < trajectory->path_index - 1) {
      printf(" -> ");
    }
  }
  printf(" [Transit: %.2f ms]\n", trajectory->total_transit_ns / 1000000.0);
  pthread_mutex_unlock(&sim_state->print_mutex);

  sim_state->next_to_print++;
  pthread_cond_broadcast(&sim_state->order_cond);
  pthread_mutex_unlock(&sim_state->order_mutex);

  free(thread_args);
  return NULL;
}

SimulationState* init_simulation(int min_time, int max_time, int verbose_mode,
                                 int segment_capacity) {
  SimulationState* sim_state = (SimulationState*) malloc(sizeof(SimulationState));
  if (!sim_state) return NULL;

  sim_state->num_vehicles = 0;
  sim_state->min_time = min_time;
  sim_state->max_time = max_time;
  sim_state->verbose_mode = verbose_mode;

  pthread_mutex_init(&sim_state->print_mutex, NULL);
  sim_state->next_to_print = 1;
  pthread_mutex_init(&sim_state->order_mutex, NULL);
  pthread_cond_init(&sim_state->order_cond, NULL);

  for (int i = 0; i < NUM_SEGMENTS; i++) {
    sim_state->segments[i].segment_capacity = segment_capacity;
    sem_init(&sim_state->segments[i].capacity, 0, segment_capacity);
  }

  return sim_state;
}

void cleanup_simulation(SimulationState* sim_state) {
  if (!sim_state) return;

  for (int i = 0; i < NUM_SEGMENTS; i++) {
    sem_destroy(&sim_state->segments[i].capacity);
  }
  pthread_mutex_destroy(&sim_state->print_mutex);
  pthread_mutex_destroy(&sim_state->order_mutex);
  pthread_cond_destroy(&sim_state->order_cond);

  free(sim_state);
}
