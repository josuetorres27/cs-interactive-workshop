# CS Interactive Lab

[![Standard](https://img.shields.io/badge/Language-C99%20%2F%20C11%20%2F%20C%2B%2B17-blue.svg)](https://en.wikipedia.org/wiki/C%2B%2B17)
[![Concurrency](https://img.shields.io/badge/Concurrency-POSIX%20Threads%20%7C%20OpenMP%20%7C%20Atomics-orange.svg)](https://computing.llnl.gov/tutorials/pthreads/)
[![Networking](https://img.shields.io/badge/Networking-BSD%20Sockets%20%7C%20HTTP%201.1-purple.svg)](docs/networking/Protocol_Specification.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build & Tests](https://img.shields.io/badge/Tests-870%2B%20Passing-brightgreen.svg)](tests/)
[![Author](https://img.shields.io/badge/Author-Josue%20Torres%20Sibaja-0ea5e9.svg)](https://github.com/josuetorres27)

An interactive lab for Computer Science students at the ECCI (Universidad de Costa Rica). It covers **algorithms and data structures**, **parallel and concurrent programming**, **networking**, **technical interview patterns** and **SQL**, through visual simulations in the browser backed by real C and C++ engines.

The web lab is a wooden workshop with workbenches (work areas) and stations. Every station has three steps:

- **Experimenta:** play with a live simulation.
- **Entiende:** the theory behind it, with diagrams.
- **Implementa:** the real code from the C/C++ engines and how to run it.

Accounts are optional. Guests keep their progress on their own device; students who sign in with Google keep it in the cloud.

---

## Repository layout

```text
cs-interactive-lab/
├── Makefile                            # Builds every native engine and runs all tests
├── LICENSE                             # MIT License
├── firebase.json                       # Firebase Hosting configuration (optional)
├── firestore.rules                     # Firestore rules for student progress (optional)
├── .github/workflows/deploy.yml        # CI: runs every test, then deploys web/ to GitHub Pages
├── docs/                               # Theory and specifications
│   ├── algorithms/                     # Sorting guide, complexity analysis
│   ├── concurrency/                    # Heat diffusion, roundabout, concurrency patterns
│   └── networking/                     # Protocol, compilation guide, test cases
├── core-c-engines/                     # Native engines
│   ├── algorithms/                     # C++17 sorting benchmark and sorters
│   ├── concurrency/
│   │   ├── simulations/roundabout/     # Traffic roundabout with POSIX semaphores
│   │   ├── simulations/heat-diffusion/ # Shared library (common/) + serial, pthreads, OpenMP programs
│   │   └── patterns/                   # Bounded buffer, philosophers, H2O, sync benchmark
│   └── networking/                     # Multi-threaded TCP server and client (C++17)
│       ├── src/                        # Socket/VSocket wrappers, Server, Client, FileSystem
│       └── ascii_figures/              # The 12 ASCII figures the server sends
├── tests/                              # C/C++ suites, Python checks, and the web lab runner
└── web/                                # The web lab (static, no build step)
    ├── index.html                      # Every screen and station
    ├── css/styles.css                  # Workshop theme, drawn like Bit the robot
    ├── js/
    │   ├── app.js                      # Router, work areas, guide, tours
    │   ├── progress.js                 # Progress model (pure data)
    │   ├── account.js                  # Optional Google sign-in and sync
    │   ├── firebase-config.js          # Firebase settings (null = guest mode only)
    │   ├── tracer.js                   # Line-by-line code walkthrough engine
    │   ├── audio.js                    # Web Audio sound effects
    │   └── modules/                    # One file per station (plus pure models)
    │       ├── algorithms.js           # Ordenamiento
    │       ├── datastructures.js       # Estructuras de datos (tracer)
    │       ├── concurrency.js          # La Rotonda
    │       ├── heatsim.js, heat.js     # Difusion de calor: model and station
    │       ├── httpsim.js, networking.js # Sockets TCP: model and station
    │       ├── interview.js            # Patrones de entrevista (tracer)
    │       ├── sql.js                  # SQL paso a paso (tracer)
    │       ├── cheatsheets.js          # El Cuaderno
    │       └── figuresData.js          # Embedded copy of the ASCII figures
    └── assets/ascii_figures/           # ASCII figures served to the web lab
```

---

## Stations

### Algoritmos y Estructuras de Datos
- **Ordenamiento:** Quick, Merge, Heap, Shell, Insertion, Selection, Bubble and Radix (LSD) sort on a live array, with input presets (random, nearly sorted, reversed, few unique), counters and sound mapped to values.
- **Estructuras de datos:** balanced parentheses, reversing a linked list and inserting into a BST, traced line by line like a debugger.

### Programacion Paralela y Concurrente
- **La Rotonda:** a four-quadrant roundabout guarded by counting semaphores (`sem_t`). Turn the guard off to cause a deadlock (circular wait), turn it on to fix it, and explore the classic patterns.
- **Difusion de calor:** a metal plate solved by threads. Each thread owns a band of rows and must wait at a barrier every iteration; you can see which threads are working and which are waiting, change the number of threads, split the rows unevenly, slow one thread down, paint heat sources and break stability with r > 1/4. It shows live speedup, efficiency and time spent at the barrier.

### Redes
- **Sockets TCP:** a client and a server exchanging HTTP over TCP, step by step: handshake, segments with seq/ack numbers, the request, the server thread that handles it, the response and the teardown. The model follows the routing of `Server.cc` (200, 404, 400 and `LIST`).

### Entrevistas Tecnicas
- **Patrones de entrevista:** two pointers, sliding window, interval merging and monotonic deque, on six classic problems, traced line by line.

### Bases de Datos
- **SQL paso a paso:** queries run clause by clause in logical order (`FROM`, `JOIN`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, `LIMIT`).

### El Cuaderno
- Amdahl's law calculator, the Coffman conditions and a Big-O reference.

---

## Native engines

### Algorithms (`core-c-engines/algorithms/`)
C++17 implementations of the eight sorting algorithms with a benchmark harness.

### Concurrency (`core-c-engines/concurrency/`)
- **Roundabout:** threads as vehicles and POSIX semaphores as quadrant guards.
- **Heat diffusion:** the 2D heat equation $\frac{\partial u}{\partial t} = \alpha \nabla^2 u$ solved with an explicit 5-point stencil and double buffering.
  - One library (`common/`) shared by the serial, pthreads and OpenMP programs. All three produce **bit-for-bit identical** plates.
  - **pthreads:** one barrier per iteration, a per-thread maximum change padded to its own cache line, and a choice between a spinning barrier on C11 atomics (default) and a sleeping `pthread_barrier_t` (`--sleep-barrier`). A start gate prevents a deadlock if thread creation fails.
  - **OpenMP:** a single parallel region with `omp for reduction(max:...)` and one `single` block per iteration.
  - `--compare` also runs the serial version and prints the speedup. Measured results are in [Heat_Diffusion_Theory.md](docs/concurrency/Heat_Diffusion_Theory.md).
- **Patterns:** bounded buffer (two semaphores and a mutex), dining philosophers (resource hierarchy), the H2O rendezvous and a benchmark of atomics, spinlocks, mutexes and semaphores.

### Networking (`core-c-engines/networking/`)
A C++17 TCP server that starts one thread per client connection, on top of an object-oriented socket wrapper (`Socket`, `VSocket`) over the POSIX calls (`bind`, `listen`, `accept`, `connect`, `recv`, `send`). It serves the 12 ASCII figures over an HTTP/1.1-style protocol.

---

## Build and test

### Prerequisites
- GCC / G++ with C11, C++17, POSIX threads (`-pthread`) and OpenMP (`-fopenmp`).
- Make.
- Linux, macOS or WSL.
- Node.js 18+ and Python 3 for the web lab tests.

### Build every engine
```bash
git clone https://github.com/josuetorres27/cs-interactive-lab.git
cd cs-interactive-lab
make all
```

### Run every test
```bash
make test
```

Run only the web lab tests (no compiler needed):
```bash
make test-web
```

### Try the heat diffusion engines
```bash
cd core-c-engines/concurrency/simulations/heat-diffusion
make -C pthreads && make -C openmp
./pthreads/bin/heat_pthreads 400 400 4 0.05 --compare
./openmp/bin/heat_openmp 400 400 4 0.05 --compare
```

---

## Test suite (876 tests)

A zero-dependency C/C++ assertion harness (`tests/runner.h`), Python checks and a dependency-free JavaScript runner that loads the real web files inside a fake DOM:

| Module | Test file | Tests | What it checks |
| :--- | :--- | :---: | :--- |
| **Algorithms** | `tests/algorithms/test_sorting.cpp` | **120** | Every sorter on sorted, reversed, all-equal, negative, power-of-two and random inputs. |
| **Concurrency: roundabout** | `tests/concurrency/test_roundabout.c` | **50** | Quadrant transitions, semaphore bounds $[0, 1]$, route validation, contention, no collisions. |
| **Concurrency: heat** | `tests/concurrency/test_heat_diffusion.c` | **70** | The real library: borders, maximum principle, symmetry, row partitioning, the kernel, convergence, input validation, and pthreads (both barriers) and OpenMP matching serial bit for bit. |
| **Concurrency: patterns** | `tests/concurrency/test_patterns.c` | **50** | Bounded buffer FIFO order, no deadlock among philosophers, the 2:1 H2O ratio, atomic fetch-and-add without races. |
| **Networking** | `tests/networking/test_networking.cpp` | **50** | Request line parsing, headers, response framing, file system chunking, all 12 figures. |
| **Web assets** | `tests/web/test_web_assets.py` | **23** | Page anchors, CSS variables, JS syntax, audio and hosting configuration. |
| **Web lab** | `tests/web/run.js` | **513** | Every station and model (sorting, roundabout, heat, HTTP over TCP, tracer problems against reference solutions), progress and accounts against a fake Firebase backend, Firestore rules, the router, art direction and page integrity. |
| **Total** | **7 suites** | **876** | **All passing** |

---

## Running the web lab

The web lab is static. Serve the `web/` folder with any static server:
```bash
python3 -m http.server 8000 --directory web
```
Then open `http://localhost:8000`.

### Deployment
Every push to `main` runs the full test suite in GitHub Actions and, if it passes, deploys `web/` to GitHub Pages.

### Optional: accounts with Firebase
Without configuration the lab runs in guest mode. To enable Google sign-in and cloud progress:
1. Create a Firebase project, enable Google sign-in and Firestore.
2. Put the web app settings in `web/js/firebase-config.js`.
3. Deploy the rules: `firebase deploy --only firestore:rules`.
4. Add your GitHub Pages domain to the authorized domains in Firebase Authentication.

The included `firebase.json` can also host the site: `firebase deploy --only hosting`.

---

## License
MIT. See [LICENSE](LICENSE).

Created by **Josue Torres Sibaja**.
