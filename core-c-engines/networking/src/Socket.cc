/**
 * Distributed ASCII Art System
 * Module: Socket.cc
 *
 * Stream-oriented socket wrapper implementation for connection and data transfer.
 *
 * Author: Josue Torres
 * Copyright (c) 2025 Josue Torres
 * Licensed under the MIT License.
 */

#include <sys/socket.h>  // sockaddr_in
#include <arpa/inet.h>   // ntohs
#include <unistd.h>      // write, read
#include <cstring>
#include <stdexcept>
#include <stdio.h>       // printf
#include <iostream>      // cerr, cout
#include "Socket.h"      // Derived class

/**
 * Class constructor
 * Use Unix socket system call
 *
 * @param char t: socket type to define
 *   's' for stream
 *   'd' for datagram
 * @param bool IPv6: if we need a IPv6 socket
 */
Socket::Socket(char t, bool IPv6) {
  this->BuildSocket(t, IPv6);  // Call base class constructor
}

/**
 * Constructor that wraps an existing socket file descriptor.
 * Used when a new connection is accepted and the system provides a file descriptor.
 *
 * @param fd The socket file descriptor (from accept or similar system call).
 */
Socket::Socket(int fd) {
  this->IDSocket = fd;
  this->type = 's';  // Assume TCP

  // Detect if it is IPv6 (same as in BuildSocket)
  struct sockaddr_storage ss;
  socklen_t len = sizeof(ss);
  if (getsockname(fd, (struct sockaddr*)&ss, &len) == 0) {
    this->IPv6 = (ss.ss_family == AF_INET6);
  } else {
    this->IPv6 = false;
  }
}

/**
 * Class destructor
 *
 * @param int ID: socket descriptor
 */
Socket::~Socket() {
  this->Close();
}

/**
 * Read method
 * Use "read" Unix system call (man 3 read)
 *
 * @param void *buffer: buffer to store data read from socket
 * @param int size: buffer capacity, read will stop if buffer is full
 */
size_t Socket::Read(void *buffer, size_t size) {
  // read() is a function that attempts to read up to <size> bytes from the socket (IDSocket) and stores them in buffer:
  ssize_t bytesRead = read(this->IDSocket, buffer, size);  // Returns the number of bytes read on success

  if (bytesRead == -1) {
    throw std::runtime_error("Socket::Read: Error reading from socket\n");
  } else if (bytesRead == 0) {
    //std::cerr << "Socket::Read: Connection closed by peer\n";
  } else {
    //std::cout << "Socket::Read: Read from socket successfully\n";
  }

  // read() returns a ssize_t (can be negative in case of error), but our function returns a size_t (unsigned value)
  return static_cast<size_t>(bytesRead);  // Cast the value to return the correct value type
}

/**
 * Write method
 * Use "write" Unix system call (man 3 write)
 *
 * @param void *buffer: buffer to store data write to socket
 * @param size_t size: buffer capacity, number of bytes to write
 */
size_t Socket::Write(const void *buffer, size_t size) {
  // write() is a function that attempts to send (write) <size> bytes from buffer through the socket (IDSocket):
  ssize_t bytesWritten = write(this->IDSocket, buffer, size);  // Returns the number of bytes sent on success

  if (bytesWritten == -1) {
    throw std::runtime_error("Socket::Write: Error writing to socket\n");
  } else {
    //std::cout << "Socket::Write: Written to socket successfully\n";
  }

  return static_cast<size_t>(bytesWritten);  // Cast the value to return the correct value type
}

/**
 * Write method
 * Use "write" Unix system call (man 3 write)
 *
 * @param char *text: text to write to socket
 */
size_t Socket::Write(const char *text) {
  /**
   * text is a string ending in \0
   * strlen() returns the number of characters excluding the \0
   * This method converts text to const void * to match the other version of Write()
   */

  // Send text strings without having to manually calculate the size:
  return this->Write(static_cast<const void *>(text), strlen(text));
}

/**
 * Accepts an incoming connection on a listening socket.
 * Only valid for stream (TCP) sockets. Returns a new Socket object
 * representing the client connection.
 *
 * @return VSocket* A pointer to a new Socket object for the accepted connection.
 * @throws std::runtime_error if the socket type is not TCP or if accept fails.
 */
VSocket* Socket::AcceptConnection() {
  if (this->type != 's') {
    throw std::runtime_error("Only TCP (stream) sockets can accept connections");
  }

  struct sockaddr_storage client_addr;  // Compatible with IPv4 and IPv6
  socklen_t addr_len = sizeof(client_addr);

  int client_fd = accept(this->IDSocket, (struct sockaddr*)&client_addr, &addr_len);
  if (client_fd == -1) {
    throw std::runtime_error("Accept failed: " + std::string(strerror(errno)));
  }

  // Create a new socket with the same address family
  Socket* client = new Socket(client_fd);
  client->IPv6 = (client_addr.ss_family == AF_INET6);
  return client;
}
