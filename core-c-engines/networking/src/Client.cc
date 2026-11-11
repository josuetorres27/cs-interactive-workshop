/**
 * Distributed ASCII Art System
 * Module: Client.cc
 *
 * Client implementation that connects to the ASCII server over TCP/IP sockets to request and display figures.
 *
 * Author: Josue Torres Sibaja
 * Copyright (c) 2025 Josue Torres Sibaja
 * Licensed under the MIT License.
 */

#include <stdio.h>
#include <cstring>
#include <iostream>
#include <cstdint>
#include "Socket.h"

#define PORT 1234    // Server port to connect to
#define BUFSIZE 512  // Buffer size for reading responses

int main(int argc, char **argv) {
  // Check if the user provided at least one argument (LIST or GET <figure_name>)
  if (argc < 2) {
    std::cerr << "Usage: " << argv[0] << " LIST/GET <figure_name>\n";
    return 1;
  }

  // Create a new IPv6 socket using the custom Socket class
  VSocket *s = new Socket('s', true);
  s->EstablishConnection("::1", PORT);  // Connect to localhost (::1 for IPv6) on defined PORT

  std::string request;

  // Compose the HTTP-like request based on user input
  if (strcmp(argv[1], "LIST") == 0) {
    // Request list of available figures
    request = "GET /LIST HTTP/1.1\r\nHost: localhost\r\n\r\n";
  } else if (strcmp(argv[1], "GET") == 0 && argc == 3) {
    // Request a specific figure by name
    request = "GET /GET/" + std::string(argv[2]) + " HTTP/1.1\r\nHost: localhost\r\n\r\n";
  } else {
    std::cerr << "Invalid command. Use: LIST/GET <figure_name>\n";
    return 1;
  }

  // Send the request to the server
  s->Write(request.c_str(), request.size());

  // Buffer to store the server response
  char buffer[BUFSIZE];
  int bytesRead;

  // Read and print the server's response until there's nothing left to read
  while ((bytesRead = s->Read(buffer, BUFSIZE)) > 0) {
    fwrite(buffer, 1, bytesRead, stdout);  // Write directly to standard output
  }

  // Close the socket connection
  s->Close();
  return 0;
}
