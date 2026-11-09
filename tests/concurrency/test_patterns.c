/**
 * CS Interactive Lab - Concurrency Patterns Test Suite
 * 50 Comprehensive Automated Tests (Bounded Buffer, Philosophers, H2O, Atomics)
 */

#define _DEFAULT_SOURCE
#define _POSIX_C_SOURCE 199309L

#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <semaphore.h>
#include <stdatomic.h>
#include <unistd.h>
#include "../runner.h"

// --- 1. Bounded Buffer Pattern Test ---
typedef struct {
    int buffer[8];
    int head;
    int tail;
    int count;
    sem_t sem_empty;
    sem_t sem_full;
    pthread_mutex_t mutex;
} bounded_buffer_t;

static void bb_init(bounded_buffer_t* bb) {
    bb->head = 0;
    bb->tail = 0;
    bb->count = 0;
    sem_init(&bb->sem_empty, 0, 8);
    sem_init(&bb->sem_full, 0, 0);
    pthread_mutex_init(&bb->mutex, NULL);
}

static void bb_destroy(bounded_buffer_t* bb) {
    sem_destroy(&bb->sem_empty);
    sem_destroy(&bb->sem_full);
    pthread_mutex_destroy(&bb->mutex);
}

static void bb_produce(bounded_buffer_t* bb, int item) {
    sem_wait(&bb->sem_empty);
    pthread_mutex_lock(&bb->mutex);
    bb->buffer[bb->tail] = item;
    bb->tail = (bb->tail + 1) % 8;
    bb->count++;
    pthread_mutex_unlock(&bb->mutex);
    sem_post(&bb->sem_full);
}

static int bb_consume(bounded_buffer_t* bb) {
    sem_wait(&bb->sem_full);
    pthread_mutex_lock(&bb->mutex);
    int item = bb->buffer[bb->head];
    bb->head = (bb->head + 1) % 8;
    bb->count--;
    pthread_mutex_unlock(&bb->mutex);
    sem_post(&bb->sem_empty);
    return item;
}

static void test_bounded_buffer(void) {
    // 10 tests of bounded buffer operations
    for (int t = 1; t <= 10; ++t) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Bounded Buffer FIFO & Semaphore Balance #%d (%d Items)", t, t * 5);
        test_case_begin(test_name);

        bounded_buffer_t bb;
        bb_init(&bb);

        int n_items = t * 5;
        for (int i = 0; i < n_items; ++i) {
            bb_produce(&bb, 100 + i);
            if (i >= 7) {
                int val = bb_consume(&bb);
                ASSERT_EQ(val, 100 + (i - 7));
            }
        }
        while (bb.count > 0) {
            bb_consume(&bb);
        }

        int empty_val = 0, full_val = 0;
        sem_getvalue(&bb.sem_empty, &empty_val);
        sem_getvalue(&bb.sem_full, &full_val);

        ASSERT_EQ(empty_val, 8);
        ASSERT_EQ(full_val, 0);
        ASSERT_EQ(bb.count, 0);

        bb_destroy(&bb);
        test_case_end();
    }
}

// --- 2. Dining Philosophers Dijkstra Hierarchy ---
typedef struct {
    int id;
    int n;
    int meals;
    pthread_mutex_t* forks;
} phil_arg_t;

static void* phil_thread(void* arg) {
    phil_arg_t* p = (phil_arg_t*)arg;
    int left = p->id;
    int right = (p->id + 1) % p->n;

    // Dijkstra's resource hierarchy: acquire lower index first
    int first = (left < right) ? left : right;
    int second = (left < right) ? right : left;

    for (int m = 0; m < p->meals; ++m) {
        pthread_mutex_lock(&p->forks[first]);
        pthread_mutex_lock(&p->forks[second]);

        // Eating critical section
        pthread_mutex_unlock(&p->forks[second]);
        pthread_mutex_unlock(&p->forks[first]);
    }
    return NULL;
}

static void test_dining_philosophers(void) {
    // 15 tests: varying philosopher counts (3 to 17) with 0 deadlocks
    for (int n = 3; n <= 17; ++n) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Dining Philosophers Deadlock-Free (N=%d Philosophers)", n);
        test_case_begin(test_name);

        pthread_mutex_t forks[20];
        pthread_t threads[20];
        phil_arg_t args[20];

        for (int i = 0; i < n; ++i) pthread_mutex_init(&forks[i], NULL);

        for (int i = 0; i < n; ++i) {
            args[i].id = i;
            args[i].n = n;
            args[i].meals = 20;
            args[i].forks = forks;
            int rc = pthread_create(&threads[i], NULL, phil_thread, &args[i]);
            ASSERT_EQ(rc, 0);
        }

        for (int i = 0; i < n; ++i) {
            pthread_join(threads[i], NULL);
        }

        for (int i = 0; i < n; ++i) pthread_mutex_destroy(&forks[i]);

        test_case_end();
    }
}

// --- 3. H2O Molecular Assembly Stoichiometry ---
typedef struct {
    atomic_int hydrogen_bonded;
    atomic_int oxygen_bonded;
    atomic_int molecules_formed;
    pthread_mutex_t lock;
    int h_waiting;
    int o_waiting;
    sem_t h_sem;
    sem_t o_sem;
    pthread_barrier_t barrier;
} h2o_state_t;

static h2o_state_t g_h2o;

static void* h_thread(void* arg) {
    (void)arg;
    pthread_mutex_lock(&g_h2o.lock);
    g_h2o.h_waiting++;
    if (g_h2o.h_waiting >= 2 && g_h2o.o_waiting >= 1) {
        g_h2o.h_waiting -= 2;
        g_h2o.o_waiting -= 1;
        sem_post(&g_h2o.h_sem);
        sem_post(&g_h2o.h_sem);
        sem_post(&g_h2o.o_sem);
    }
    pthread_mutex_unlock(&g_h2o.lock);

    sem_wait(&g_h2o.h_sem);
    pthread_barrier_wait(&g_h2o.barrier);
    atomic_fetch_add(&g_h2o.hydrogen_bonded, 1);
    return NULL;
}

static void* o_thread(void* arg) {
    (void)arg;
    pthread_mutex_lock(&g_h2o.lock);
    g_h2o.o_waiting++;
    if (g_h2o.h_waiting >= 2 && g_h2o.o_waiting >= 1) {
        g_h2o.h_waiting -= 2;
        g_h2o.o_waiting -= 1;
        sem_post(&g_h2o.h_sem);
        sem_post(&g_h2o.h_sem);
        sem_post(&g_h2o.o_sem);
    }
    pthread_mutex_unlock(&g_h2o.lock);

    sem_wait(&g_h2o.o_sem);
    pthread_barrier_wait(&g_h2o.barrier);
    atomic_fetch_add(&g_h2o.oxygen_bonded, 1);
    atomic_fetch_add(&g_h2o.molecules_formed, 1);
    return NULL;
}

static void test_h2o_stoichiometry(void) {
    // 15 tests: exact 2:1 stoichiometric proportion assembly
    for (int molecules = 1; molecules <= 15; ++molecules) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "H2O Molecular Stoichiometry (%d Molecules = %dH + %dO)", molecules, molecules * 2, molecules);
        test_case_begin(test_name);

        atomic_init(&g_h2o.hydrogen_bonded, 0);
        atomic_init(&g_h2o.oxygen_bonded, 0);
        atomic_init(&g_h2o.molecules_formed, 0);
        g_h2o.h_waiting = 0;
        g_h2o.o_waiting = 0;
        pthread_mutex_init(&g_h2o.lock, NULL);
        sem_init(&g_h2o.h_sem, 0, 0);
        sem_init(&g_h2o.o_sem, 0, 0);
        pthread_barrier_init(&g_h2o.barrier, NULL, 3);

        int total_h = molecules * 2;
        int total_o = molecules;
        pthread_t h_th[30], o_th[15];

        for (int i = 0; i < total_h; ++i) pthread_create(&h_th[i], NULL, h_thread, NULL);
        for (int i = 0; i < total_o; ++i) pthread_create(&o_th[i], NULL, o_thread, NULL);

        for (int i = 0; i < total_h; ++i) pthread_join(h_th[i], NULL);
        for (int i = 0; i < total_o; ++i) pthread_join(o_th[i], NULL);

        ASSERT_EQ(atomic_load(&g_h2o.hydrogen_bonded), total_h);
        ASSERT_EQ(atomic_load(&g_h2o.oxygen_bonded), total_o);
        ASSERT_EQ(atomic_load(&g_h2o.molecules_formed), molecules);

        pthread_mutex_destroy(&g_h2o.lock);
        sem_destroy(&g_h2o.h_sem);
        sem_destroy(&g_h2o.o_sem);
        pthread_barrier_destroy(&g_h2o.barrier);

        test_case_end();
    }
}

// --- 4. Synchronization Atomics Race Freedom ---
typedef struct {
    atomic_long* atomic_counter;
    int increments;
} atomic_arg_t;

static void* atomic_worker(void* arg) {
    atomic_arg_t* a = (atomic_arg_t*)arg;
    for (int i = 0; i < a->increments; ++i) {
        atomic_fetch_add(a->atomic_counter, 1);
    }
    return NULL;
}

static void test_atomics_race_freedom(void) {
    // 10 tests: multi-threaded concurrent increments with zero lost updates
    int thread_counts[10] = {1, 2, 4, 6, 8, 10, 12, 14, 16, 20};
    for (int t = 0; t < 10; ++t) {
        int threads = thread_counts[t];
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "C11 Atomics Race Freedom (%d Threads, 200,000 Total)", threads);
        test_case_begin(test_name);

        atomic_long counter;
        atomic_init(&counter, 0);

        int inc_per_thread = 200000 / threads;
        int expected_total = inc_per_thread * threads;

        pthread_t th[32];
        atomic_arg_t args[32];

        for (int i = 0; i < threads; ++i) {
            args[i].atomic_counter = &counter;
            args[i].increments = inc_per_thread;
            pthread_create(&th[i], NULL, atomic_worker, &args[i]);
        }

        for (int i = 0; i < threads; ++i) {
            pthread_join(th[i], NULL);
        }

        ASSERT_EQ(atomic_load(&counter), expected_total);
        test_case_end();
    }
}

int main(void) {
    test_suite_begin("Classic Concurrency Patterns (50 Tests)");

    test_bounded_buffer();        // 10 tests
    test_dining_philosophers();   // 15 tests
    test_h2o_stoichiometry();     // 15 tests
    test_atomics_race_freedom();  // 10 tests

    return test_suite_summary();
}
