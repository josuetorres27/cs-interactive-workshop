#ifndef CS_TEST_RUNNER_H
#define CS_TEST_RUNNER_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <math.h>
#include <time.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    int total_tests;
    int passed_tests;
    int failed_tests;
    int total_assertions;
    const char* current_suite;
    const char* current_test;
    bool current_test_failed;
    double start_time;
} test_context_t;

static test_context_t g_test_ctx = {0, 0, 0, 0, NULL, NULL, false, 0.0};

static inline double test_get_time_sec(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (double)ts.tv_sec + (double)ts.tv_nsec * 1e-9;
}

static inline void test_suite_begin(const char* suite_name) {
    g_test_ctx.current_suite = suite_name;
    g_test_ctx.start_time = test_get_time_sec();
    printf("\n======================================================================\n");
    printf("   TEST SUITE: %s\n", suite_name);
    printf("======================================================================\n");
}

static inline void test_case_begin(const char* test_name) {
    g_test_ctx.current_test = test_name;
    g_test_ctx.current_test_failed = false;
    g_test_ctx.total_tests++;
}

static inline void test_case_end(void) {
    if (!g_test_ctx.current_test_failed) {
        g_test_ctx.passed_tests++;
        printf("  [PASS] %s\n", g_test_ctx.current_test);
    } else {
        g_test_ctx.failed_tests++;
        printf("  [FAIL] %s\n", g_test_ctx.current_test);
    }
}

static inline int test_suite_summary(void) {
    double elapsed = test_get_time_sec() - g_test_ctx.start_time;
    printf("----------------------------------------------------------------------\n");
    printf("Summary: %d/%d passed (%d failed) in %.4f seconds (%d assertions)\n",
           g_test_ctx.passed_tests, g_test_ctx.total_tests, g_test_ctx.failed_tests,
           elapsed, g_test_ctx.total_assertions);
    printf("======================================================================\n\n");
    return g_test_ctx.failed_tests > 0 ? 1 : 0;
}

#define ASSERT_TRUE(cond) do { \
    g_test_ctx.total_assertions++; \
    if (!(cond)) { \
        printf("    Assertion Failed at %s:%d: Expected TRUE: %s\n", __FILE__, __LINE__, #cond); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#define ASSERT_FALSE(cond) do { \
    g_test_ctx.total_assertions++; \
    if (cond) { \
        printf("    Assertion Failed at %s:%d: Expected FALSE: %s\n", __FILE__, __LINE__, #cond); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#define ASSERT_EQ(a, b) do { \
    g_test_ctx.total_assertions++; \
    if ((a) != (b)) { \
        printf("    Assertion Failed at %s:%d: %s == %s\n", __FILE__, __LINE__, #a, #b); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#define ASSERT_NE(a, b) do { \
    g_test_ctx.total_assertions++; \
    if ((a) == (b)) { \
        printf("    Assertion Failed at %s:%d: %s != %s\n", __FILE__, __LINE__, #a, #b); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#define ASSERT_LE(a, b) do { \
    g_test_ctx.total_assertions++; \
    if ((a) > (b)) { \
        printf("    Assertion Failed at %s:%d: %s <= %s\n", __FILE__, __LINE__, #a, #b); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#define ASSERT_GE(a, b) do { \
    g_test_ctx.total_assertions++; \
    if ((a) < (b)) { \
        printf("    Assertion Failed at %s:%d: %s >= %s\n", __FILE__, __LINE__, #a, #b); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#define ASSERT_LT(a, b) do { \
    g_test_ctx.total_assertions++; \
    if ((a) >= (b)) { \
        printf("    Assertion Failed at %s:%d: %s < %s\n", __FILE__, __LINE__, #a, #b); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#define ASSERT_GT(a, b) do { \
    g_test_ctx.total_assertions++; \
    if ((a) <= (b)) { \
        printf("    Assertion Failed at %s:%d: %s > %s\n", __FILE__, __LINE__, #a, #b); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#define ASSERT_STR_EQ(a, b) do { \
    g_test_ctx.total_assertions++; \
    if (strcmp((a), (b)) != 0) { \
        printf("    Assertion Failed at %s:%d: \"%s\" == \"%s\"\n", __FILE__, __LINE__, (a), (b)); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#define ASSERT_NEAR(a, b, eps) do { \
    g_test_ctx.total_assertions++; \
    if (fabs((double)(a) - (double)(b)) > (double)(eps)) { \
        printf("    Assertion Failed at %s:%d: |%s - %s| <= %e\n", __FILE__, __LINE__, #a, #b, (double)(eps)); \
        g_test_ctx.current_test_failed = true; \
    } \
} while(0)

#ifdef __cplusplus
}
#endif

#endif // CS_TEST_RUNNER_H
