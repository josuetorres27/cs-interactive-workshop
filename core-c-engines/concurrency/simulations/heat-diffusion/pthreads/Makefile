CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -O3
TARGET = bin/heat_pthreads
SRCS = src/main.c ../common/heat.c 
HDRS = ../common/heat.h ../common/heat_cli.h

all: $(TARGET)

$(TARGET): $(SRCS) $(HDRS) | bin
	$(CC) $(CFLAGS) -pthread $(SRCS) -o $@ -lm 

bin:
	mkdir -p $@

run: $(TARGET)
	./$(TARGET) 200 200 4 0.01 --compare

clean:
	rm -rf bin build

.PHONY: all run clean
