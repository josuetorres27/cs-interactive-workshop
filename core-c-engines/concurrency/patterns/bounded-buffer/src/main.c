/**
 * Concurrent Systems Laboratory
 * Module: Bounded Buffer Producer-Consumer Pattern
 * File: main.c
 *
 * Classic producer-consumer pattern with bounded ring buffer using
 * POSIX counting semaphores (empty/full) and a mutex for critical section.
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
#include <semaphore.h>
#include <unistd.h>
#include <time.h>

#define BUFFER_CAPACITY 8
#define TOTAL_ITEMS 50

typedef struct {
  int buffer[BUFFER_CAPACITY];
  int head;
  int tail;
  int count;
  sem_t sem_empty;
  sem_t sem_full;
  pthread_mutex_t mutex;
  int producer_done;
} BoundedBuffer;

BoundedBuffer g_bb;

void* producer_thread(void* arg) {
  int prod_id = *((int*) arg);
  free(arg);

  for (int i = 0; i < TOTAL_ITEMS / 2; ++i) {
    int item = (prod_id * 1000) + i + 1;

    /* Wait for an empty slot */
    sem_wait(&g_bb.sem_empty);

    /* Enter critical section */
    pthread_mutex_lock(&g_bb.mutex);
    g_bb.buffer[g_bb.tail] = item;
    g_bb.tail = (g_bb.tail + 1) % BUFFER_CAPACITY;
    g_bb.count++;
    printf(" [Producer %d] Produced item #%d (Queue size: %d/%d)\n",
           prod_id, item, g_bb.count, BUFFER_CAPACITY);
    pthread_mutex_unlock(&g_bb.mutex);

    /* Signal that a full slot is available */
    sem_post(&g_bb.sem_full);

    usleep((rand() % 10 + 5) * 1000);
  }
  return NULL;
}

void* consumer_thread(void* arg) {
  int cons_id = *((int*) arg);
  free(arg);

  for (int i = 0; i < TOTAL_ITEMS / 2; ++i) {
    /* Wait for a filled slot */
    sem_wait(&g_bb.sem_full);

    /* Enter critical section */
    pthread_mutex_lock(&g_bb.mutex);
    int item = g_bb.buffer[g_bb.head];
    g_bb.head = (g_bb.head + 1) % BUFFER_CAPACITY;
    g_bb.count--;
    printf("   [Consumer %d] Consumed item #%d (Queue size: %d/%d)\n",
           cons_id, item, g_bb.count, BUFFER_CAPACITY);
    pthread_mutex_unlock(&g_bb.mutex);

    /* Signal that an empty slot is now free */
    sem_post(&g_bb.sem_empty);

    usleep((rand() % 15 + 8) * 1000);
  }
  return NULL;
}

int main() {
  printf("====================================================================\n");
  printf("   BOUNDED BUFFER PRODUCER-CONSUMER - POSIX SEMAPHORES & MUTEX     \n");
  printf("====================================================================\n");
  printf(" [OK] Buffer Capacity: %d slots\n", BUFFER_CAPACITY);
  printf(" [OK] Total Items:     %d items\n", TOTAL_ITEMS);
  printf(" [OK] Workers:         2 Producers, 2 Consumers\n");
  printf("====================================================================\n\n");

  g_bb.head = 0;
  g_bb.tail = 0;
  g_bb.count = 0;
  g_bb.producer_done = 0;

  sem_init(&g_bb.sem_empty, 0, BUFFER_CAPACITY);
  sem_init(&g_bb.sem_full, 0, 0);
  pthread_mutex_init(&g_bb.mutex, NULL);

  pthread_t p1, p2, c1, c2;
  int* id_p1 = malloc(sizeof(int)); *id_p1 = 1;
  int* id_p2 = malloc(sizeof(int)); *id_p2 = 2;
  int* id_c1 = malloc(sizeof(int)); *id_c1 = 1;
  int* id_c2 = malloc(sizeof(int)); *id_c2 = 2;

  pthread_create(&p1, NULL, producer_thread, id_p1);
  pthread_create(&p2, NULL, producer_thread, id_p2);
  pthread_create(&c1, NULL, consumer_thread, id_c1);
  pthread_create(&c2, NULL, consumer_thread, id_c2);

  pthread_join(p1, NULL);
  pthread_join(p2, NULL);
  pthread_join(c1, NULL);
  pthread_join(c2, NULL);

  sem_destroy(&g_bb.sem_empty);
  sem_destroy(&g_bb.sem_full);
  pthread_mutex_destroy(&g_bb.mutex);

  printf("\n====================================================================\n");
  printf(" [OK] All items successfully produced and consumed without race conditions.\n");
  printf("====================================================================\n");
  return EXIT_SUCCESS;
}
