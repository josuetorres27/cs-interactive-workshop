CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -pthread -O2 -Isrc
BIN_DIR = bin
OBJ_DIR = build
TARGET = $(BIN_DIR)/roundabout

SOURCES = src/main.c src/roundabout.c
OBJECTS = $(patsubst src/%.c, $(OBJ_DIR)/%.o, $(SOURCES))

.PHONY: all clean run

all: $(TARGET)

$(TARGET): $(OBJECTS) | $(BIN_DIR)
	$(CC) $(CFLAGS) $^ -o $@

$(OBJ_DIR)/%.o: src/%.c | $(OBJ_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(BIN_DIR) $(OBJ_DIR):
	mkdir -p $@

run: $(TARGET)
	./$(TARGET)

clean:
	rm -rf $(BIN_DIR) $(OBJ_DIR)
