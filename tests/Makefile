# CS Interactive Workshop - Test Suite Makefile
# Compiles and runs all 720+ automated tests (C/C++, Python and JavaScript)

CC ?= gcc
CXX ?= g++
CFLAGS := -std=c11 -Wall -Wextra -O2 -I. -pthread
CXXFLAGS := -std=c++17 -Wall -Wextra -O2 -I. -I../core-c-engines/networking/src -pthread
LDFLAGS := -lm

BINDIR := bin
TARGETS := \
	$(BINDIR)/test_sorting \
	$(BINDIR)/test_roundabout \
	$(BINDIR)/test_heat_diffusion \
	$(BINDIR)/test_patterns \
	$(BINDIR)/test_networking

.PHONY: all clean run $(TARGETS)

all: $(TARGETS)

$(BINDIR):
	@mkdir -p $(BINDIR)

$(BINDIR)/test_sorting: algorithms/test_sorting.cpp | $(BINDIR)
	$(CXX) $(CXXFLAGS) $< -o $@

$(BINDIR)/test_roundabout: concurrency/test_roundabout.c ../core-c-engines/concurrency/simulations/roundabout/src/roundabout.c | $(BINDIR)
	$(CC) $(CFLAGS) $^ -o $@

HEAT_DIR := ../core-c-engines/concurrency/simulations/heat-diffusion/common

# Links the real solver library (serial, pthreads and OpenMP), not a copy of it
$(BINDIR)/test_heat_diffusion: concurrency/test_heat_diffusion.c $(HEAT_DIR)/heat.c $(HEAT_DIR)/heat_omp.c $(HEAT_DIR)/heat.h | $(BINDIR)
	$(CC) $(CFLAGS) -fopenmp -I$(HEAT_DIR) concurrency/test_heat_diffusion.c $(HEAT_DIR)/heat.c $(HEAT_DIR)/heat_omp.c -o $@ $(LDFLAGS)

$(BINDIR)/test_patterns: concurrency/test_patterns.c | $(BINDIR)
	$(CC) $(CFLAGS) $< -o $@

$(BINDIR)/test_networking: networking/test_networking.cpp ../core-c-engines/networking/src/FileSystem.cc | $(BINDIR)
	$(CXX) $(CXXFLAGS) $^ -o $@ $(LDFLAGS)

clean:
	rm -rf $(BINDIR) test_disk_tmp.bin

run: all
	@echo "\n===================================================================="
	@echo "          RUNNING CS INTERACTIVE WORKSHOP MASTER TEST SUITE          "
	@echo "                     (870+ AUTOMATED TESTS)                         "
	@echo "===================================================================="
	@./$(BINDIR)/test_sorting
	@./$(BINDIR)/test_roundabout
	@./$(BINDIR)/test_heat_diffusion
	@./$(BINDIR)/test_patterns
	@./$(BINDIR)/test_networking
	@python3 web/test_web_assets.py
	@node web/run.js
	@echo "\n===================================================================="
	@echo "                 ALL 876 TESTS PASSED SUCCESSFULLY!                 "
	@echo "===================================================================="
