# Compiler configuration
CXX := g++
CXXFLAGS := -std=c++17 -Wall -Wextra -I.
LDFLAGS :=

# Directories
SRCDIR := src
OBJDIR := obj
EXECDIR := exec

# Source files
SERVER_SRC := $(SRCDIR)/Server.cc
CLIENT_SRC := $(SRCDIR)/Client.cc
FS_SRC := $(SRCDIR)/FileSystem.cc
VSOCKET_SRC := $(SRCDIR)/VSocket.cc
SOCKET_SRC := $(SRCDIR)/Socket.cc

# Object files
SERVER_OBJ := $(OBJDIR)/Server.o $(OBJDIR)/FileSystem.o $(OBJDIR)/VSocket.o $(OBJDIR)/Socket.o
CLIENT_OBJ := $(OBJDIR)/Client.o $(OBJDIR)/VSocket.o $(OBJDIR)/Socket.o

# Executables
SERVER_EXEC := $(EXECDIR)/Server
CLIENT_EXEC := $(EXECDIR)/Client

# Main rule
all: $(SERVER_EXEC) $(CLIENT_EXEC)

# Rule for the server
$(SERVER_EXEC): $(SERVER_OBJ)
	@mkdir -p $(EXECDIR)
	$(CXX) $(CXXFLAGS) $^ -o $@ $(LDFLAGS)

# Rule for the client
$(CLIENT_EXEC): $(CLIENT_OBJ)
	@mkdir -p $(EXECDIR)
	$(CXX) $(CXXFLAGS) $^ -o $@ $(LDFLAGS)

# Rules to compile object files
$(OBJDIR)/Server.o: $(SRCDIR)/Server.cc
	@mkdir -p $(OBJDIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(OBJDIR)/Client.o: $(SRCDIR)/Client.cc
	@mkdir -p $(OBJDIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(OBJDIR)/FileSystem.o: $(SRCDIR)/FileSystem.cc $(SRCDIR)/FileSystem.h
	@mkdir -p $(OBJDIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(OBJDIR)/VSocket.o: $(SRCDIR)/VSocket.cc $(SRCDIR)/VSocket.h
	@mkdir -p $(OBJDIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(OBJDIR)/Socket.o: $(SRCDIR)/Socket.cc $(SRCDIR)/Socket.h
	@mkdir -p $(OBJDIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Cleanup
clean:
	rm -rf $(OBJDIR) $(EXECDIR)

.PHONY: all clean