/**
 * Concurrent Systems Laboratory
 * Module: Roundabout Traffic Concurrency Simulator
 * File: roundabout.h
 *
 * Header definitions for the multi-threaded roundabout traffic system.
 * Uses POSIX threads, semaphores, and mutexes to enforce segment capacities
 * and avoid race conditions and deadlocks.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2024-2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#ifndef ROUNDABOUT_H
#define ROUNDABOUT_H

#ifndef _DEFAULT_SOURCE
#define _DEFAULT_SOURCE
#endif
#ifndef _POSIX_C_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <semaphore.h>
#include <unistd.h>
#include <time.h>
#include <string.h>

#define NUM_SEGMENTS 4
#define MAX_VEHICLES 5000

/**
 * @struct Segment
 * @brief Represents a single quadrant/segment of the roundabout.
 */
typedef struct {
  int segment_capacity;
  sem_t capacity;
} Segment;

/**
 * @struct Vehicle
 * @brief Represents a vehicle navigating through the roundabout.
 */
typedef struct {
  int id;
  char entry;   /** 'N', 'E', 'S', 'W' (or 'O') */
  char exit;    /** 'N', 'E', 'S', 'W' (or 'O') */
} Vehicle;

/**
 * @struct Trajectory
 * @brief Tracks the path taken by a vehicle through the roundabout.
 */
typedef struct {
  int vehicle_id;
  char path[128];
  int path_index;
  long long total_transit_ns;
} Trajectory;

/**
 * @struct SimulationState
 * @brief Holds shared state, synchronization primitives, and metrics.
 */
typedef struct {
  Segment segments[NUM_SEGMENTS];
  Vehicle vehicles[MAX_VEHICLES];
  Trajectory trajectories[MAX_VEHICLES];
  int num_vehicles;
  int min_time;
  int max_time;
  int verbose_mode;
  int next_to_print;
  pthread_mutex_t print_mutex;
  pthread_mutex_t order_mutex;
  pthread_cond_t order_cond;
} SimulationState;

/**
 * @struct ThreadArgs
 * @brief Arguments passed to individual vehicle worker threads.
 */
typedef struct {
  SimulationState* sim_state;
  Vehicle* vehicle;
} ThreadArgs;

int direction_to_index(char direction);
char index_to_direction(int index);
long long time_since_start(struct timespec start_time);
void* vehicle_thread(void* arg);
SimulationState* init_simulation(int min_time, int max_time, int verbose_mode, int segment_capacity);
void cleanup_simulation(SimulationState* sim_state);

#endif  /* ROUNDABOUT_H */
