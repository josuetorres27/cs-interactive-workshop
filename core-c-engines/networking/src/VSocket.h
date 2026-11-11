/**
 * Distributed ASCII Art System
 * Module: VSocket.h
 *
 * Base virtual socket interface for network communication.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#ifndef VSocket_h
#define VSocket_h

#include <cstddef>
#include <cstdint>

class VSocket {
 public:
  void BuildSocket(char, bool = false);  // Creates the socket (stream/datagram type)
  void BuildSocket(int fd);
  ~VSocket();                            // Calls Close() to destroy the socket

  void Close();  // Closes the socket
  int EstablishConnection(const char* address, const char* portOrService);  // Main function
  int EstablishConnection(const char* address, int port);  // Wrapper
  virtual size_t Read(void *, size_t) = 0;         // Data reading
  virtual size_t Write(const void *, size_t) = 0;  // Data writing
  virtual size_t Write(const char *) = 0;
  virtual VSocket* CreateVSocket(int fd);
  int Listen(int backlog);
  int MarkPassive(int backlog);
  int Bind(int port);
  virtual VSocket* AcceptConnection() = 0;
  int Shutdown(int how);

 protected:
  int IDSocket;  // Socket identifier
  bool IPv6;     // Is IPv6 socket?
  int port;      // Socket associated port
  char type;     // Socket type (datagram, stream, etc)
};

#endif  // VSocket_h
