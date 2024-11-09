#include <iostream>
#include <string>
#include <map>
#include <thread>
#include <chrono>
#include <mutex>
#include <condition_variable>

using namespace std::chrono_literals;

// Synchronization variables
bool shutdownRequested = false;
std::mutex mtx;
std::condition_variable cv;

void forkServer() {
  std::this_thread::sleep_for(1s);
  std::cout << "[Fork] Started: GET /servers\n";  // Fork started
  std::this_thread::sleep_for(5s);

  std::cout << "[Fork] Valid request: GET /figure/gato\n";  // Valid figure request
  std::this_thread::sleep_for(5s);

  std::cout << "[Fork] Invalid request: GET /figure/carro\n";  // Invalid figure request
  std::cout << "[Fork] Response to invalid request: 404 Not Found\n\n";  // "Replies to itself" with error message
  std::this_thread::sleep_for(5s);

  {
    std::lock_guard<std::mutex> lock(mtx);
    shutdownRequested = true;
  }
  cv.notify_one();  // Notify the server that it was deleted

  std::this_thread::sleep_for(5s);  // Wait to allow the server to print its shutdown before
  std::cout << "[Fork] Server removed from registry\n";  // Server deletion confirmation message (not in protocol)
}

void drawingServer() {
  std::this_thread::sleep_for(5s);  // Wait after the fork
  std::cout << "[Server] Started: ServidorA | 172.16.123.51 | ballena, perro, gato\n\n";  // Server started

  std::this_thread::sleep_for(5s);
  std::cout << "[Server] Response to /figure/gato:\n";  // Valid response message (not in protocol)
  std::cout << "<(=^_^=)>\n\n";

  std::this_thread::sleep_for(5s);
  {
    std::unique_lock<std::mutex> lock(mtx);
    cv.wait(lock, [] { return shutdownRequested; });  // Wait for the fork to indicate deletion
  }

  std::cout << "[Server] Shutdown ServidorA\n";
}

int main() {
  std::cout << "[Main] --- Simulation started ---\n\n";

  std::thread forkThread(forkServer);
  std::thread serverThread(drawingServer);

  forkThread.join();
  serverThread.join();

  std::cout << "\n[Main] --- Simulation finished ---\n";
  return 0;
}
