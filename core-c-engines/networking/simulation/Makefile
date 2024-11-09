# Makefile for the Simulation

CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -pthread
TARGET = exec/main
SRC = main.cc

all: $(TARGET)

exec:
	mkdir -p exec

$(TARGET): $(SRC) | exec
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SRC)

run: all
	./$(TARGET)

clean:
	rm -rf exec
