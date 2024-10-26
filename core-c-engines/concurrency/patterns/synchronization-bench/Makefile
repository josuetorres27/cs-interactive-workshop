CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -pthread -O3
BIN_DIR = bin
BUILD_DIR = build
TARGET = $(BIN_DIR)/sync_bench

all: $(TARGET)

$(TARGET): src/main.c | $(BIN_DIR)
	$(CC) $(CFLAGS) $< -o $@

$(BIN_DIR):
	mkdir -p $@

run: $(TARGET)
	./$(TARGET) 4

clean:
	rm -rf $(BIN_DIR) $(BUILD_DIR)
