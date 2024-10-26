CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -pthread -O2
BIN_DIR = bin
BUILD_DIR = build
TARGET = $(BIN_DIR)/bounded_buffer

all: $(TARGET)

$(TARGET): src/main.c | $(BIN_DIR)
	$(CC) $(CFLAGS) $< -o $@

$(BIN_DIR):
	mkdir -p $@

run: $(TARGET)
	./$(TARGET)

clean:
	rm -rf $(BIN_DIR) $(BUILD_DIR)
