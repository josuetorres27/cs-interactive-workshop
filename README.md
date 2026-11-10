# CS Interactive Lab

[![Standard](https://img.shields.io/badge/Language-C99%20%2F%20C11%20%2F%20C%2B%2B17-blue.svg)](https://en.wikipedia.org/wiki/C%2B%2B17)
[![Concurrency](https://img.shields.io/badge/Concurrency-POSIX%20Threads%20%7C%20OpenMP%20%7C%20Atomics-orange.svg)](https://computing.llnl.gov/tutorials/pthreads/)
[![Networking](https://img.shields.io/badge/Networking-BSD%20Sockets%20%7C%20HTTP%201.1-purple.svg)](docs/networking/Protocol_Specification.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build & Tests](https://img.shields.io/badge/Tests-870%2B%20Passing-brightgreen.svg)](tests/)
[![Author](https://img.shields.io/badge/Author-Josu%C3%A9%20Torres%20Sibaja-0ea5e9.svg)](https://github.com/josuetorres27)
[![Hosting: Firebase](https://img.shields.io/badge/Deploy-Firebase%20Hosting-ffca28.svg)](https://firebase.google.com/)

An interactive web workbench and educational laboratory exploring **Algorithms & Data Structures**, **Concurrent & Parallel Systems**, and **Distributed Networking** through real-time simulations, interactive visualizers, and high-performance native C/C++ computational engines.

Designed as an open-source, hands-on learning suite for Computer Science students tackling challenging foundations.

---

## 🏛️ System Architecture & Monorepo Structure

```text
cs-interactive-lab/
├── Makefile                            # Master orchestrator: builds all native engines
├── LICENSE                             # MIT License
├── README.md                           # Comprehensive documentation & guides
├── firebase.json                       # Firebase Hosting configuration (SPA routing)
├── .firebaserc                         # Firebase target project descriptor
├── .github/
│   └── workflows/deploy.yml            # Automated CI/CD deployment to GitHub Pages
├── docs/                               # Theoretical specifications & analysis
│   ├── algorithms/                     # Complexity proofs, Big-O tables, sorting guides
│   ├── concurrency/                    # PDE heat diffusion, Coffman conditions, semaphores
│   └── networking/                     # BSD socket lifecycle, protocols, and test cases
├── core-c-engines/                     # Native high-performance computational backends
│   ├── algorithms/                     # C++17 sorting benchmark harness and sorters
│   ├── concurrency/                    # Pthreads, OpenMP, and Atomics simulations
│   │   ├── simulations/roundabout/     # Traffic simulator with POSIX semaphores
│   │   ├── simulations/heat-diffusion/ # Serial, Pthreads, and OpenMP 2D PDE solvers
│   │   └── patterns/                   # Bounded Buffer, Philosophers, H2O, Sync Bench
│   └── networking/                     # Multi-threaded TCP socket server & client
│       ├── src/                        # VSocket abstraction, Server, Client, FileSystem
│       └── ascii_figures/              # 12 high-density ASCII figure assets
└── web/                                # Production Single-Page Web Application (SPA)
    ├── index.html                      # Unified portal & interactive playground
    ├── css/styles.css                  # Modern cyber-academic glassmorphic dark theme
    ├── js/                             # Modular Vanilla ES6 architecture
    │   ├── app.js                      # Tab router, keyboard shortcuts, global state
    │   ├── audio.js                    # Web Audio API procedural sound synthesizer
    │   └── modules/                    # Specialized visualizer controllers
    │       ├── algorithms.js           # Sorting visualizer with real-time telemetry
    │       ├── concurrency.js          # Roundabout 2D & Heat Diffusion colormap
    │       ├── networking.js           # ASCII Art Studio & Socket packet inspector
    │       ├── cheatsheets.js          # Amdahl's Law calculator & complexity matrices
    │       └── figuresData.js          # Standalone embedded fallback asset dictionary
    └── assets/ascii_figures/           # High-density ASCII text assets
```

---

## 🔬 Core Laboratory Pillars

### 1. Algorithms & Data Structures (`web/` & `core-c-engines/algorithms/`)
- **Algorithms Implemented:** Quick Sort, Merge Sort, Heap Sort, Shell Sort, Insertion Sort, Selection Sort, Bubble Sort, and Radix Sort (LSD).
- **Interactive Features:** Real-time array canvas, step-by-step playback, customizable distribution presets (Random Uniform, Nearly Sorted, Reversed, Few Unique), and comparative execution timers.
- **Auditory Synthesis:** Multi-octave frequency pitch mapping using Web Audio API oscillators proportional to element values.

### 2. Concurrency & Parallel Systems (`core-c-engines/concurrency/`)
- **Traffic Roundabout Simulation:**
  - 4 quadrants regulated by counting semaphores (`sem_t`).
  - **Coffman Circular Wait Switch:** Demonstrates live system deadlocks when semaphore guards are disabled vs fluent liveness when enabled.
- **2D Heat Diffusion Solver:**
  - Solves the parabolic Fourier heat conduction PDE $\frac{\partial u}{\partial t} = \alpha \nabla^2 u$ using explicit 5-point finite difference stencils.
  - Multi-core implementations in **Pthreads** (1D row domain slicing + `pthread_barrier_t`) and **OpenMP** (`#pragma omp parallel for reduction`).
- **Classic Concurrency Patterns:**
  - Bounded Buffer with dual counting semaphores (`sem_empty`, `sem_full`) and mutexes.
  - Dining Philosophers deadlock avoidance via Dijkstra's resource hierarchy.
  - H2O Molecular Rendezvous assembler ($2\text{H} + 1\text{O} \to \text{H}_2\text{O}$).
  - Synchronization Benchmark: Atomic Fetch-and-Add vs Spinlocks vs Mutexes vs Semaphores.

### 3. Distributed Systems & Networks (`core-c-engines/networking/`)
- **Multi-Threaded Socket Server:**
  - C++17 TCP server implementing custom thread pool worker dispatching.
  - Object-oriented socket wrapper (`Socket`, `VSocket`) abstracting POSIX system calls (`bind`, `listen`, `accept`, `connect`, `recv`, `send`).
- **Interactive ASCII Studio & Packet Inspector:**
  - Real-time packet wire inspector emulating request/response header lifecycles (`HTTP/1.1 200 OK`, `Content-Length`, `Worker-Thread`).
  - 12 high-density ASCII figure assets with search, category filtering, and instant clipboard export.

### 4. Interactive Theory & Cheatsheets
- **Amdahl's Law Calculator:** Dynamic calculation of speedup $S(N) = \frac{1}{(1-f) + f/N}$ and maximum theoretical speedup $S_{\infty} = \frac{1}{1-f}$.
- **Coffman Conditions Reference:** Detailed breakdown of Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait.
- **Big-O Complexity Cheat Sheet:** Complete tabular matrix across time and auxiliary space.

---

## ⚡ Quick Start & Native Compilation

### Prerequisites
- GCC / G++ supporting C11, C++17, POSIX Threads (`-pthread`), and OpenMP (`-fopenmp`).
- Make build tool.
- Linux, macOS, or Windows Subsystem for Linux (WSL).

### Build All Native C/C++ Engines
```bash
# Clone the repository
git clone https://github.com/josuetorres27/cs-interactive-lab.git
cd cs-interactive-lab

# Compile all engines simultaneously
make all
```

### Run Automated Native Test Suite
```bash
make test
```
*Compiles and executes the master suite of **870+ automated tests** verifying correctness, safety, and performance across all three computational engines and the web lab. Run only the web lab tests (no compiler needed) with `make test-web` or `node tests/web/run.js`.*

---

## 🧪 Comprehensive Automated Test Suite (876 Tests)

The system includes a custom zero-dependency C/C++ assertion test harness (`tests/runner.h`) along with Python integration tests and a dependency-free JavaScript test runner for the web lab, totaling **876 automated test cases**:

| Module / Engine | Test File | Test Count | Scope & Verifications |
| :--- | :--- | :---: | :--- |
| **Algorithms Engine** | `tests/algorithms/test_sorting.cpp` | **120** | Quick, Merge, Heap, Insertion, Selection, Radix sorts; idempotence, reverse sorted, all-equal, negative keys, power-of-two boundaries, high entropy arrays. |
| **Concurrency: Traffic** | `tests/concurrency/test_roundabout.c` | **50** | Directional quadrant transitions, semaphore bounds $[0, 1]$, route validation, multi-threaded contention waves, collision freedom. |
| **Concurrency: PDE Heat** | `tests/concurrency/test_heat_diffusion.c` | **70** | Tests the real solver library: borders, maximum principle, symmetry, row partitioning, the stencil kernel, convergence and input validation, and pthreads (spin and sleep barriers) and OpenMP producing the exact same grid as serial, bit for bit. |
| **Concurrency: Patterns** | `tests/concurrency/test_patterns.c` | **50** | FIFO bounded buffer integrity, dining philosophers deadlock freedom, H2O stoichiometric ratio ($2:1$), C11 atomic fetch-and-add race freedom. |
| **Distributed Networking** | `tests/networking/test_networking.cpp` | **50** | HTTP 1.1 request line parsing, header extraction, response framing, block filesystem chunking, asset integrity for all 12 ASCII art figures. |
| **Web Assets & Config** | `tests/web/test_web_assets.py` | **23** | Single-Page Application DOM anchors, CSS design system variables, Vanilla JS syntax, Web Audio API integration, and Firebase Hosting configuration. |
| **Web Lab (JavaScript)** | `tests/web/run.js` | **513** | Heat diffusion station and model (same plate with any number of threads, cost model, instability), art direction (one ink colour, hard shadows, outlined panels), optional accounts (progress model, guest storage, Google sign-in merge and sync against a fake Firebase backend, Firestore rules), HTTP-over-TCP model checked against `Server.cc` routing (200/404/400, LIST, segmentation, seq/ack numbers, handshake and teardown), tracer engine, interview/data-structure/SQL problems vs. reference solutions on presets and seeded random inputs, sorting/roundabout/heat/Amdahl simulations, router, and page/stylesheet integrity. |
| **TOTAL** | **7 Test Suites** | **876** | **100% Automated & Passing (0 Failures, 0 Memory Leaks)** |

---

## 🌐 Running & Deploying the Web Visualizer

### Local Execution (Zero Dependencies)
Simply open `web/index.html` in any modern web browser:
```bash
# Linux
xdg-open web/index.html

# macOS
open web/index.html

# Windows PowerShell
Start-Process web/index.html
```

---

## 🔥 Deploying to Firebase Hosting (`.web.app`)

The repository includes a ready-to-deploy `firebase.json` configuration configured for high-performance global CDN delivery.

### Step 1: Install Firebase CLI
If you do not have Firebase CLI installed:
```bash
npm install -g firebase-tools
```

### Step 2: Authenticate with Google
```bash
firebase login
```

### Step 3: Link Project & Deploy
```bash
# Connect to your Firebase project (or create one in Firebase Console)
firebase use --add

# Deploy static web assets to Firebase CDN
firebase deploy --only hosting
```
Your application will be live at: `https://<your-project-id>.web.app`

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Authored & Engineered with precision by **Josué Torres Sibaja**.
