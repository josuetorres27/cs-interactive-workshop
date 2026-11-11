/**
 * Distributed ASCII Art System
 * Module: Socket.h
 *
 * Stream-oriented IPv4/IPv6 socket wrapper interface.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#ifndef Socket_h
#define Socket_h

#include <cstdint>
#include "VSocket.h"

class Socket : public VSocket {
 public:
  Socket(char, bool = false);
  Socket(int fd);
  ~Socket();

  size_t Read(void *, size_t);
  size_t Write(const void *, size_t);
  size_t Write(const char *);
  VSocket* AcceptConnection() override;
};

#endif  // Socket_h
