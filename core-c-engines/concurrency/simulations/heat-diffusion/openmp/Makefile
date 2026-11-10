CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -O3
TARGET = bin/heat_openmp
SRCS = src/main.c ../common/heat.c ../common/heat_omp.c
HDRS = ../common/heat.h ../common/heat_cli.h

all: $(TARGET)

$(TARGET): $(SRCS) $(HDRS) | bin
	$(CC) $(CFLAGS) -fopenmp $(SRCS) -o $@ -lm -pthread

bin:
	mkdir -p $@

run: $(TARGET)
	./$(TARGET) 200 200 4 0.01 --compare

clean:
	rm -rf bin build

.PHONY: all run clean
