/**
 * Concurrent Systems Laboratory
 * Module: Dining Philosophers (Dijkstra's Deadlock-Free Solution)
 * File: main.c
 *
 * Implements Dijkstra's resource hierarchy solution to the Dining Philosophers
 * problem, breaking the Circular Wait condition to guarantee deadlock-free execution.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2024-2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#define _DEFAULT_SOURCE
#define _POSIX_C_SOURCE 200809L

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>
#include <time.h>

#define NUM_PHILOSOPHERS 5
#define ROUNDS_PER_PHILOSOPHER 5

pthread_mutex_t forks[NUM_PHILOSOPHERS];
pthread_mutex_t print_lock = PTHREAD_MUTEX_INITIALIZER;

void log_action(int id, const char* state) {
  pthread_mutex_lock(&print_lock);
  printf("  [Philosopher %d] %s\n", id, state);
  pthread_mutex_unlock(&print_lock);
}

void* philosopher_thread(void* arg) {
  int id = *((int*) arg);
  free(arg);

  int left_fork  = id;
  int right_fork = (id + 1) % NUM_PHILOSOPHERS;

  /* Dijkstra's Resource Hierarchy: always acquire lower-numbered fork first */
  int first_fork  = (left_fork < right_fork) ? left_fork : right_fork;
  int second_fork = (left_fork < right_fork) ? right_fork : left_fork;

  for (int round = 1; round <= ROUNDS_PER_PHILOSOPHER; ++round) {
    /* Thinking */
    log_action(id, "is THINKING...");
    usleep((rand() % 20 + 10) * 1000);

    /* Hungry -> Acquire first fork */
    log_action(id, "is HUNGRY, attempting to take forks");
    pthread_mutex_lock(&forks[first_fork]);
    pthread_mutex_lock(&forks[second_fork]);

    /* Eating */
    log_action(id, "acquired both forks -> EATING");
    usleep((rand() % 25 + 15) * 1000);

    /* Release forks */
    pthread_mutex_unlock(&forks[second_fork]);
    pthread_mutex_unlock(&forks[first_fork]);
    log_action(id, "finished eating, put down forks");
  }

  return NULL;
}

int main() {
  printf("====================================================================\n");
  printf("    DINING PHILOSOPHERS - DIJKSTRA'S RESOURCE HIERARCHY SOLUTION    \n");
  printf("====================================================================\n");
  printf(" [OK] Philosophers: %d\n", NUM_PHILOSOPHERS);
  printf(" [OK] Strategy:     Always pick min(fork_L, fork_R) first (breaks Circular Wait)\n");
  printf(" [OK] Rounds:       %d meals per philosopher\n", ROUNDS_PER_PHILOSOPHER);
  printf("====================================================================\n\n");

  srand((unsigned int) time(NULL));

  for (int i = 0; i < NUM_PHILOSOPHERS; ++i) {
    pthread_mutex_init(&forks[i], NULL);
  }

  pthread_t threads[NUM_PHILOSOPHERS];
  for (int i = 0; i < NUM_PHILOSOPHERS; ++i) {
    int* id = malloc(sizeof(int));
    *id = i;
    pthread_create(&threads[i], NULL, philosopher_thread, id);
  }

  for (int i = 0; i < NUM_PHILOSOPHERS; ++i) {
    pthread_join(threads[i], NULL);
  }

  for (int i = 0; i < NUM_PHILOSOPHERS; ++i) {
    pthread_mutex_destroy(&forks[i]);
  }
  pthread_mutex_destroy(&print_lock);

  printf("\n====================================================================\n");
  printf(" [OK] All philosophers finished eating with 0 deadlocks and 0 starvation.\n");
  printf("====================================================================\n");
  return EXIT_SUCCESS;
}
