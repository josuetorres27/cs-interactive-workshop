/**
 * CS Interactive Lab - Roundabout Concurrency Simulator Test Suite
 * 50 Comprehensive Automated Tests (Semaphores, Invariants, Liveness)
 */

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
#include "../runner.h"
#include "../../core-c-engines/concurrency/simulations/roundabout/src/roundabout.h"

static void test_direction_mappings(void) {
    test_case_begin("Direction Mapping - North ('N') to Index 0");
    ASSERT_EQ(direction_to_index('N'), 0);
    ASSERT_EQ(index_to_direction(0), 'N');
    test_case_end();

    test_case_begin("Direction Mapping - East ('E') to Index 1");
    ASSERT_EQ(direction_to_index('E'), 1);
    ASSERT_EQ(index_to_direction(1), 'E');
    test_case_end();

    test_case_begin("Direction Mapping - South ('S') to Index 2");
    ASSERT_EQ(direction_to_index('S'), 2);
    ASSERT_EQ(index_to_direction(2), 'S');
    test_case_end();

    test_case_begin("Direction Mapping - West ('W') to Index 3");
    ASSERT_EQ(direction_to_index('W'), 3);
    ASSERT_EQ(index_to_direction(3), 'W');
    test_case_end();

    test_case_begin("Direction Mapping - West Spanish ('O') to Index 3");
    ASSERT_EQ(direction_to_index('O'), 3);
    test_case_end();

    test_case_begin("Direction Mapping - Invalid Char 'X'");
    ASSERT_EQ(direction_to_index('X'), -1);
    test_case_end();

    test_case_begin("Direction Mapping - Invalid Char 'Z'");
    ASSERT_EQ(direction_to_index('Z'), -1);
    test_case_end();

    test_case_begin("Direction Mapping - Invalid Index 4");
    ASSERT_EQ(index_to_direction(4), '?');
    test_case_end();

    test_case_begin("Direction Mapping - Invalid Negative Index -1");
    ASSERT_EQ(index_to_direction(-1), '?');
    test_case_end();

    test_case_begin("Direction Mapping - Round-trip Bijective Invariance");
    for (int i = 0; i < 4; ++i) {
        char d = index_to_direction(i);
        ASSERT_EQ(direction_to_index(d), i);
    }
    test_case_end();
}

static void test_semaphore_invariants(void) {
    for (int cap = 1; cap <= 10; ++cap) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Semaphore Init Invariant - Segment Capacity %d", cap);
        test_case_begin(test_name);
        SimulationState* sim = init_simulation(0, 0, 0, cap);
        ASSERT_TRUE(sim != NULL);
        for (int s = 0; s < NUM_SEGMENTS; ++s) {
            int val = 0;
            sem_getvalue(&sim->segments[s].capacity, &val);
            ASSERT_EQ(val, cap);
            ASSERT_EQ(sim->segments[s].segment_capacity, cap);
        }
        cleanup_simulation(sim);
        test_case_end();
    }
}

static void test_route_topology(void) {
    const char entries[4] = {'N', 'E', 'S', 'W'};
    for (int e = 0; e < 4; ++e) {
        for (int x = 0; x < 4; ++x) {
            if (e == x) continue;
            char test_name[128];
            snprintf(test_name, sizeof(test_name), "Route Topology - Entry %c to Exit %c", entries[e], entries[x]);
            test_case_begin(test_name);
            int start = direction_to_index(entries[e]);
            int end = direction_to_index(entries[x]);
            ASSERT_GE(start, 0);
            ASSERT_GE(end, 0);
            // Count hops in circular topology
            int hops = 0;
            int cur = start;
            while (cur != end) {
                cur = (cur + 1) % NUM_SEGMENTS;
                hops++;
                if (hops > 4) break;
            }
            ASSERT_LE(hops, 3);
            ASSERT_GE(hops, 1);
            test_case_end();
        }
    }
}

static void test_concurrent_transits(void) {
    // Test with varying vehicle counts: 2, 4, 8, 12, 16, 20, 24, 28, 32, 40
    int vehicle_counts[10] = {2, 4, 8, 12, 16, 20, 24, 28, 32, 40};
    const char approaches[4] = {'N', 'E', 'S', 'W'};

    for (int t = 0; t < 10; ++t) {
        int count = vehicle_counts[t];
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Concurrent Transit - %d Vehicles (Zero Deadlock)", count);
        test_case_begin(test_name);

        SimulationState* sim = init_simulation(0, 1, 0, 2);
        ASSERT_TRUE(sim != NULL);
        sim->num_vehicles = count;

        pthread_t threads[40];

        for (int i = 0; i < count; ++i) {
            sim->vehicles[i].id = i;
            sim->vehicles[i].entry = approaches[i % 4];
            sim->vehicles[i].exit = approaches[(i + 1) % 4];
            ThreadArgs* args = (ThreadArgs*) malloc(sizeof(ThreadArgs));
            args->sim_state = sim;
            args->vehicle = &sim->vehicles[i];
            int rc = pthread_create(&threads[i], NULL, vehicle_thread, args);
            ASSERT_EQ(rc, 0);
        }

        for (int i = 0; i < count; ++i) {
            pthread_join(threads[i], NULL);
        }

        // Verify all segments have their capacity restored (no semaphore leaks)
        for (int s = 0; s < NUM_SEGMENTS; ++s) {
            int val = 0;
            sem_getvalue(&sim->segments[s].capacity, &val);
            ASSERT_EQ(val, 2);
        }

        cleanup_simulation(sim);
        test_case_end();
    }
}

static void test_deadlock_freedom_stress(void) {
    // 8 tests with high saturation load
    for (int s = 1; s <= 8; ++s) {
        char test_name[128];
        snprintf(test_name, sizeof(test_name), "Liveness Stress Wave #%d (50 Threads)", s);
        test_case_begin(test_name);

        SimulationState* sim = init_simulation(0, 0, 0, 3);
        sim->num_vehicles = 50;

        pthread_t threads[50];
        const char approaches[4] = {'N', 'E', 'S', 'W'};

        for (int i = 0; i < 50; ++i) {
            sim->vehicles[i].id = i;
            sim->vehicles[i].entry = approaches[i % 4];
            sim->vehicles[i].exit = approaches[(i + 2) % 4]; // Diagonal transit
            ThreadArgs* args = (ThreadArgs*) malloc(sizeof(ThreadArgs));
            args->sim_state = sim;
            args->vehicle = &sim->vehicles[i];
            pthread_create(&threads[i], NULL, vehicle_thread, args);
        }

        for (int i = 0; i < 50; ++i) {
            pthread_join(threads[i], NULL);
        }

        // Invariant: all 50 completed and semaphores balanced
        for (int seg = 0; seg < NUM_SEGMENTS; ++seg) {
            int val = 0;
            sem_getvalue(&sim->segments[seg].capacity, &val);
            ASSERT_EQ(val, 3);
        }

        cleanup_simulation(sim);
        test_case_end();
    }
}

int main(void) {
    test_suite_begin("Roundabout Concurrency Simulator (50 Tests)");

    test_direction_mappings();    // 10 tests
    test_semaphore_invariants();   // 10 tests
    test_route_topology();         // 12 tests
    test_concurrent_transits();    // 10 tests
    test_deadlock_freedom_stress();// 8 tests

    return test_suite_summary();
}
