CXX := g++
CXXFLAGS := -std=c++17 -Wall -Wextra -O3 -Iinclude
TARGET := bin/benchmark
SRCS := src/main.cpp

all: $(TARGET)

$(TARGET): $(SRCS)
	@mkdir -p bin
	$(CXX) $(CXXFLAGS) $^ -o $@

clean:
	rm -rf bin

run: all
	./$(TARGET)

.PHONY: all clean run
