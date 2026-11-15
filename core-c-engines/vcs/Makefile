CC ?= gcc
CFLAGS := -std=c11 -Wall -Wextra -O2
TARGET := bin/minigit
SRCS := src/main.c src/minigit.c src/sha1.c

all: $(TARGET)

$(TARGET): $(SRCS) src/minigit.h src/sha1.h
	@mkdir -p bin
	$(CC) $(CFLAGS) $(SRCS) -o $@

clean:
	rm -rf bin

.PHONY: all clean
