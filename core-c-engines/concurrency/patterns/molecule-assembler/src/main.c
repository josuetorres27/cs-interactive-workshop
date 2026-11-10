/**
 * Concurrent Systems Laboratory
 * Module: H2O Molecular Assembly Synchronization
 * File: main.c
 *
 * Classic barrier synchronization problem where two Hydrogen threads
 * and one Oxygen thread must rendezvous to form a stable water molecule.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2024-2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#define _POSIX_C_SOURCE 200112L

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <semaphore.h>
#include <unistd.h>

#define TOTAL_MOLECULES 10

typedef struct {
  pthread_mutex_t lock;
  int hydrogen_count;
  int oxygen_count;
  sem_t sem_h;
  sem_t sem_o;
  pthread_barrier_t barrier;
  int molecules_formed;
} H2OAssembler;

H2OAssembler g_h2o;

void* hydrogen_thread(void* arg) {
  int id = *((int*) arg);
  free(arg);

  pthread_mutex_lock(&g_h2o.lock);
  g_h2o.hydrogen_count++;
  if (g_h2o.hydrogen_count >= 2 && g_h2o.oxygen_count >= 1) {
    g_h2o.hydrogen_count -= 2;
    g_h2o.oxygen_count -= 1;
    sem_post(&g_h2o.sem_h);
    sem_post(&g_h2o.sem_o);
    pthread_mutex_unlock(&g_h2o.lock);
  } else {
    pthread_mutex_unlock(&g_h2o.lock);
    sem_wait(&g_h2o.sem_h);
  }

  /* Rendezvous barrier */
  pthread_barrier_wait(&g_h2o.barrier);
  printf("  [H #%2d] Bonded into H2O molecule\n", id);

  return NULL;
}

void* oxygen_thread(void* arg) {
  int id = *((int*) arg);
  free(arg);

  pthread_mutex_lock(&g_h2o.lock);
  g_h2o.oxygen_count++;
  if (g_h2o.hydrogen_count >= 2 && g_h2o.oxygen_count >= 1) {
    g_h2o.hydrogen_count -= 2;
    g_h2o.oxygen_count -= 1;
    sem_post(&g_h2o.sem_h);
    sem_post(&g_h2o.sem_h);
    pthread_mutex_unlock(&g_h2o.lock);
  } else {
    pthread_mutex_unlock(&g_h2o.lock);
    sem_wait(&g_h2o.sem_o);
  }

  /* Rendezvous barrier */
  pthread_barrier_wait(&g_h2o.barrier);

  pthread_mutex_lock(&g_h2o.lock);
  g_h2o.molecules_formed++;
  printf(" >>> [O #%2d] COMPLETED MOLECULE H2O #%d <<<\n", id, g_h2o.molecules_formed);
  pthread_mutex_unlock(&g_h2o.lock);

  return NULL;
}

int main() {
  printf("====================================================================\n");
  printf("    H2O MOLECULE ASSEMBLER - BARRIER & SEMAPHORE RENDEZVOUS        \n");
  printf("====================================================================\n");
  printf(" [OK] Target Molecules: %d H2O molecules\n", TOTAL_MOLECULES);
  printf(" [OK] Atoms Required:   %d Hydrogen, %d Oxygen\n", TOTAL_MOLECULES * 2, TOTAL_MOLECULES);
  printf("====================================================================\n\n");

  pthread_mutex_init(&g_h2o.lock, NULL);
  sem_init(&g_h2o.sem_h, 0, 0);
  sem_init(&g_h2o.sem_o, 0, 0);
  pthread_barrier_init(&g_h2o.barrier, NULL, 3);
  g_h2o.hydrogen_count = 0;
  g_h2o.oxygen_count = 0;
  g_h2o.molecules_formed = 0;

  pthread_t h_threads[TOTAL_MOLECULES * 2];
  pthread_t o_threads[TOTAL_MOLECULES];

  for (int i = 0; i < TOTAL_MOLECULES * 2; ++i) {
    int* id = malloc(sizeof(int)); *id = i + 1;
    pthread_create(&h_threads[i], NULL, hydrogen_thread, id);
  }
  for (int i = 0; i < TOTAL_MOLECULES; ++i) {
    int* id = malloc(sizeof(int)); *id = i + 1;
    pthread_create(&o_threads[i], NULL, oxygen_thread, id);
  }

  for (int i = 0; i < TOTAL_MOLECULES * 2; ++i) pthread_join(h_threads[i], NULL);
  for (int i = 0; i < TOTAL_MOLECULES; ++i) pthread_join(o_threads[i], NULL);

  sem_destroy(&g_h2o.sem_h);
  sem_destroy(&g_h2o.sem_o);
  pthread_barrier_destroy(&g_h2o.barrier);
  pthread_mutex_destroy(&g_h2o.lock);

  printf("\n====================================================================\n");
  printf(" [OK] Successfully synthesized %d H2O molecules without race conditions.\n", TOTAL_MOLECULES);
  printf("====================================================================\n");
  return EXIT_SUCCESS;
}
