CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -O3 -lm
BIN_DIR = bin
BUILD_DIR = build
TARGET = $(BIN_DIR)/heat_serial

all: $(TARGET)

$(TARGET): src/main.c | $(BIN_DIR)
	$(CC) $(CFLAGS) $< -o $@

$(BIN_DIR):
	mkdir -p $@

run: $(TARGET)
	./$(TARGET) 150 150 0.05

clean:
	rm -rf $(BIN_DIR) $(BUILD_DIR)
