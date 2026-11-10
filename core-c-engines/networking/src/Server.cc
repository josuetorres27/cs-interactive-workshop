/**
 * Distributed ASCII Art System
 * Module: Server.cc
 *
 * Multi-threaded HTTP-like server that listens for incoming client connections
 * and serves ASCII art figures from a simulated block file system or an interactive
 * web interface.
 *
 * Author: Josue Torres
 * Copyright (c) 2025 Josue Torres
 * Licensed under the MIT License.
 */

#include <iostream>
#include <fstream>
#include <sstream>
#include <thread>
#include <filesystem>
#include <algorithm>  // std::remove
#include <cctype>     // std::isspace
#include <cstdint>
#include <vector>
#include "FileSystem.h"
#include "VSocket.h"
#include "Socket.h"

#define PORT 1234
#define BUFSIZE 4096

/**
 * Handles a client request in a separate thread.
 * Parses the HTTP request and routes to web UI, JSON API, raw list, or figure content.
 *
 * @param client The client socket
 * @param fs Reference to the FileSystem instance
 */
void task(VSocket *client, FileSystem& fs) {
  char buffer[BUFSIZE] = {};
  client->Read(buffer, BUFSIZE);  // Read incoming HTTP request
  std::string request(buffer);

  std::string response;

  if (request.substr(0, 4) == "GET ") {
    size_t pos1 = request.find("GET ");
    size_t pos2 = request.find(" HTTP");

    if (pos1 != std::string::npos && pos2 != std::string::npos) {
      std::string url = request.substr(pos1 + 4, pos2 - (pos1 + 4));

      // Remove CR and LF
      url.erase(std::remove(url.begin(), url.end(), '\r'), url.end());
      url.erase(std::remove(url.begin(), url.end(), '\n'), url.end());

      // Route 1: Web UI Terminal
      if (url.empty() || url == "/" || url == "/index.html") {
        std::ifstream file("web/index.html");
        if (file) {
          std::ostringstream ss;
          ss << file.rdbuf();
          std::string html = ss.str();
          response = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\nContent-Length: "
                     + std::to_string(html.size()) + "\r\n\r\n" + html;
        } else {
          response = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\n\r\nweb/index.html not found";
        }
      }
      // Route 2: JSON API list for web UI
      else if (url == "/api/figures" || url == "/api/list") {
        auto names = fs.getFigureNames();
        std::ostringstream json;
        json << "[";
        for (size_t i = 0; i < names.size(); ++i) {
          json << "\"" << names[i] << "\"";
          if (i + 1 < names.size()) json << ",";
        }
        json << "]";
        std::string body = json.str();
        response = "HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\nContent-Length: "
                   + std::to_string(body.size()) + "\r\n\r\n" + body;
      }
      // Route 3: Formatted raw directory list (CLI & curl)
      else if (url == "/LIST") {
        std::string list = fs.getFigureList();
        response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n" + list;
      }
      // Route 4: Figure content
      else {
        if (url.find("/GET/") == 0) {
          url = url.substr(5);
        } else if (url.find("/") == 0) {
          url = url.substr(1);
        }

        std::string figureName = url;
        std::string figure = fs.getFigureContent(figureName);

        if (!figure.empty() && figure != "Figure not found.\n") {
          response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n" + figure;
        } else {
          response = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\n\r\nFigure not found";
        }
      }
    }
  } else {
    response = "HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\n\r\nInvalid command";
  }

  client->Write(response.c_str(), response.size());
  client->Close();
}

/**
 * Entry point for the server.
 * Initializes the file system, loads ASCII figures, and starts listening
 * for incoming client connections. Each request is handled in a separate thread.
 *
 * @return Exit status
 */
int main() {
  FileSystem fs("disk.bin");

  int figureCount = fs.countFigures("ascii_figures");
  int dirBlocks = (figureCount + DIR_ENTRIES - 1) / DIR_ENTRIES;

  if (dirBlocks == 0) {
    dirBlocks = 1;
  }

  if (!std::filesystem::exists("disk.bin")) {
    fs.initDisk(dirBlocks);
  }

  fs.loadFiguresFromFolder("ascii_figures");

  VSocket *s1, *client;
  s1 = new Socket('s', true);  // Create an IPv6 stream socket

  s1->Bind(PORT);
  s1->MarkPassive(5);

  std::cout << "====================================================\n";
  std::cout << "   DISTRIBUTED ASCII ART SYSTEM - HTTP SERVER       \n";
  std::cout << "====================================================\n";
  std::cout << " [OK] Server listening on port: " << PORT << "\n";
  std::cout << " [OK] Web Terminal UI: http://localhost:" << PORT << "/\n";
  std::cout << " [OK] Total ASCII figures indexed: " << figureCount << "\n";
  std::cout << "====================================================\n\n";

  for (;;) {
    client = s1->AcceptConnection();
    std::thread(task, client, std::ref(fs)).detach();
  }

  return 0;
}