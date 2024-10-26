# Root Makefile for Concurrent Systems Laboratory
# Orchestrates building all simulations and concurrency patterns

CC ?= gcc

SUBDIRS = \
	simulations/roundabout \
	simulations/heat-diffusion/serial \
	simulations/heat-diffusion/pthreads \
	simulations/heat-diffusion/openmp \
	patterns/bounded-buffer \
	patterns/dining-philosophers \
	patterns/synchronization-bench \
	patterns/molecule-assembler

.PHONY: all $(SUBDIRS) clean test roundabout heat patterns

all: $(SUBDIRS)

$(SUBDIRS):
	@echo ">>> Building $@..."
	@$(MAKE) -C $@

roundabout: simulations/roundabout
	@$(MAKE) -C $<

heat: simulations/heat-diffusion/serial simulations/heat-diffusion/pthreads simulations/heat-diffusion/openmp

patterns: patterns/bounded-buffer patterns/dining-philosophers patterns/synchronization-bench patterns/molecule-assembler

test: all
	@echo "\n===================================================================="
	@echo "              RUNNING CONCURRENT SYSTEMS LAB TEST SUITE             "
	@echo "===================================================================="
	@echo "\n--- 1. Testing Roundabout Concurrency Simulator ---"
	@./simulations/roundabout/bin/roundabout 2 5 2
	@echo "\n--- 2. Testing 2D Heat Diffusion (Sequential) ---"
	@./simulations/heat-diffusion/serial/bin/heat_serial 100 100 0.1
	@echo "\n--- 3. Testing 2D Heat Diffusion (Pthreads 4T) ---"
	@./simulations/heat-diffusion/pthreads/bin/heat_pthreads 100 100 4 0.1
	@echo "\n--- 4. Testing 2D Heat Diffusion (OpenMP) ---"
	@./simulations/heat-diffusion/openmp/bin/heat_openmp 100 100 4 0.1
	@echo "\n--- 5. Testing Bounded Buffer (Producer-Consumer) ---"
	@./patterns/bounded-buffer/bin/bounded_buffer
	@echo "\n--- 6. Testing Dining Philosophers (Deadlock-Free) ---"
	@./patterns/dining-philosophers/bin/dining_philosophers
	@echo "\n--- 7. Testing Synchronization Primitives Benchmark ---"
	@./patterns/synchronization-bench/bin/sync_bench 4
	@echo "\n--- 8. Testing H2O Molecular Assembly ---"
	@./patterns/molecule-assembler/bin/molecule_assembler
	@echo "\n===================================================================="
	@echo " [✓] ALL 8 MODULE TESTS COMPLETED SUCCESSFULLY WITH 0 FAILURES.     "
	@echo "===================================================================="

clean:
	@for dir in $(SUBDIRS); do \
		$(MAKE) -C $$dir clean; \
	done
