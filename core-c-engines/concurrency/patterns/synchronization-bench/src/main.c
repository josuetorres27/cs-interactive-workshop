/**
 * Concurrent Systems Laboratory
 * Module: Synchronization Primitives Benchmark
 * File: main.c
 *
 * Micro-benchmarking suite comparing Mutex, POSIX Semaphore, Spinlock,
 * and C11 Atomic operations under high thread contention.
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
#include <stdatomic.h>
#include <time.h>

#define DEFAULT_THREADS 4
#define OPS_PER_THREAD 1000000

/* Shared state variables */
static volatile long long g_counter = 0;
static pthread_mutex_t g_mutex = PTHREAD_MUTEX_INITIALIZER;
static sem_t g_sem;
static pthread_spinlock_t g_spinlock;
static atomic_llong g_atomic_counter = 0;

void* worker_mutex(void* arg) {
  (void)arg;
  for (long long i = 0; i < OPS_PER_THREAD; ++i) {
    pthread_mutex_lock(&g_mutex);
    g_counter++;
    pthread_mutex_unlock(&g_mutex);
  }
  return NULL;
}

void* worker_semaphore(void* arg) {
  (void)arg;
  for (long long i = 0; i < OPS_PER_THREAD; ++i) {
    sem_wait(&g_sem);
    g_counter++;
    sem_post(&g_sem);
  }
  return NULL;
}

void* worker_spinlock(void* arg) {
  (void)arg;
  for (long long i = 0; i < OPS_PER_THREAD; ++i) {
    pthread_spin_lock(&g_spinlock);
    g_counter++;
    pthread_spin_unlock(&g_spinlock);
  }
  return NULL;
}

void* worker_atomic(void* arg) {
  (void)arg;
  for (long long i = 0; i < OPS_PER_THREAD; ++i) {
    atomic_fetch_add_explicit(&g_atomic_counter, 1, memory_order_relaxed);
  }
  return NULL;
}

double run_benchmark(int num_threads, void* (*worker_func)(void*)) {
  pthread_t threads[64];
  struct timespec start, end;

  g_counter = 0;
  atomic_store(&g_atomic_counter, 0);

  clock_gettime(CLOCK_MONOTONIC, &start);

  for (int i = 0; i < num_threads; ++i) {
    pthread_create(&threads[i], NULL, worker_func, NULL);
  }
  for (int i = 0; i < num_threads; ++i) {
    pthread_join(threads[i], NULL);
  }

  clock_gettime(CLOCK_MONOTONIC, &end);
  return (end.tv_sec - start.tv_sec) + (end.tv_nsec - start.tv_nsec) / 1e9;
}

int main(int argc, char* argv[]) {
  int num_threads = DEFAULT_THREADS;
  if (argc >= 2) num_threads = atoi(argv[1]);
  if (num_threads > 64) num_threads = 64;

  printf("========================================================================\n");
  printf("      SYNCHRONIZATION PRIMITIVES BENCHMARK (HIGH CONTENTION)            \n");
  printf("========================================================================\n");
  printf(" [✓] Worker Threads:   %d threads\n", num_threads);
  printf(" [✓] Ops per Thread:   %d operations\n", OPS_PER_THREAD);
  printf(" [✓] Total Operations: %lld operations\n", (long long)num_threads * OPS_PER_THREAD);
  printf("========================================================================\n\n");

  sem_init(&g_sem, 0, 1);
  pthread_spin_init(&g_spinlock, PTHREAD_PROCESS_PRIVATE);

  printf("%-24s | %-15s | %-15s\n", "Primitive", "Elapsed Time", "Throughput (Mops/s)");
  printf("------------------------------------------------------------------------\n");

  double t_atomic = run_benchmark(num_threads, worker_atomic);
  printf("%-24s | %8.4f sec    | %10.2f Mops/s\n", "C11 Atomic Fetch-Add", t_atomic,
         ((double)num_threads * OPS_PER_THREAD) / (t_atomic * 1e6));

  double t_spin = run_benchmark(num_threads, worker_spinlock);
  printf("%-24s | %8.4f sec    | %10.2f Mops/s\n", "POSIX Spinlock", t_spin,
         ((double)num_threads * OPS_PER_THREAD) / (t_spin * 1e6));

  double t_mutex = run_benchmark(num_threads, worker_mutex);
  printf("%-24s | %8.4f sec    | %10.2f Mops/s\n", "Pthread Mutex", t_mutex,
         ((double)num_threads * OPS_PER_THREAD) / (t_mutex * 1e6));

  double t_sem = run_benchmark(num_threads, worker_semaphore);
  printf("%-24s | %8.4f sec    | %10.2f Mops/s\n", "POSIX Binary Semaphore", t_sem,
         ((double)num_threads * OPS_PER_THREAD) / (t_sem * 1e6));

  printf("========================================================================\n");

  sem_destroy(&g_sem);
  pthread_spin_destroy(&g_spinlock);

  return EXIT_SUCCESS;
}
