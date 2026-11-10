# CS Interactive Lab - Master Orchestrator Makefile
# High-performance C and C++ computational engines

CC ?= gcc
CXX ?= g++

ENGINES := core-c-engines/algorithms core-c-engines/concurrency core-c-engines/networking

.PHONY: all clean test test-web algorithms concurrency networking $(ENGINES)

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
	@echo "            RUNNING CS INTERACTIVE LAB MASTER TEST SUITE             "
	@echo "                     (870+ AUTOMATED TESTS)                         "
	@echo "===================================================================="
	@$(MAKE) -C tests run

# Web lab tests only (no compiler needed, just Node.js)
test-web:
	@node tests/web/run.js
