# CS Interactive Lab - Master Orchestrator Makefile
# High-performance C and C++ computational engines

CC ?= gcc
CXX ?= g++

ENGINES := core-c-engines/algorithms core-c-engines/concurrency core-c-engines/networking

.PHONY: all clean test algorithms concurrency networking $(ENGINES)

all: $(ENGINES)
	@echo "\n>>> All CS Interactive Lab engines built successfully."

core-c-engines/algorithms:
	@echo ">>> Building Algorithms & Data Structures Engine..."
	@$(MAKE) -C $@

core-c-engines/concurrency:
	@echo ">>> Building Concurrency & Parallel Systems Engine..."
	@$(MAKE) -C $@

core-c-engines/networking:
	@echo ">>> Building Networking & Distributed Systems Engine..."
	@$(MAKE) -C $@

algorithms: core-c-engines/algorithms
concurrency: core-c-engines/concurrency
networking: core-c-engines/networking

clean:
	@for dir in $(ENGINES); do \
		echo ">>> Cleaning $$dir..."; \
		$(MAKE) -C $$dir clean; \
	done
	@echo ">>> All build artifacts cleaned."

test: all
	@echo "\n===================================================================="
	@echo "              CS INTERACTIVE LAB - FULL TEST SUITE                  "
	@echo "===================================================================="
	@echo "\n[1/3] Testing Algorithms & Data Structures..."
	@core-c-engines/algorithms/bin/benchmark
	@echo "\n[2/3] Testing Concurrency & Parallel Systems..."
	@$(MAKE) -C core-c-engines/concurrency test
	@echo "\n[3/3] Testing Distributed Systems Compilation..."
	@test -f core-c-engines/networking/exec/Server && echo "Server binary verified."
	@test -f core-c-engines/networking/exec/Client && echo "Client binary verified."
	@echo "\n===================================================================="
	@echo "                 ALL SYSTEMS OPERATIONAL (3/3 OK)                   "
	@echo "===================================================================="
