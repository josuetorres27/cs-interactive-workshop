# CS Interactive Workshop

[![Live Site](https://img.shields.io/badge/Live_Site-workshop.josuetorressibaja.com-3b82f6?style=flat-square&logo=firebase&logoColor=white)](https://workshop.josuetorressibaja.com/)
[![Standard](https://img.shields.io/badge/Language-C99%20%2F%20C11%20%2F%20C%2B%2B17-blue?style=flat-square)](https://en.wikipedia.org/wiki/C%2B%2B17)
[![Concurrency](https://img.shields.io/badge/Concurrency-POSIX%20Threads%20%7C%20OpenMP%20%7C%20Atomics-orange?style=flat-square)](https://computing.llnl.gov/tutorials/pthreads/)
[![Networking](https://img.shields.io/badge/Networking-BSD%20Sockets%20%7C%20HTTP%201.1-purple?style=flat-square)](docs/networking/Protocol_Specification.md)
[![Tests](https://img.shields.io/badge/Tests-1%2C376%20Passing-brightgreen?style=flat-square)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)

An interactive workshop for Computer Science students at the School of Computer Science and Informatics (ECCI) of the University of Costa Rica (UCR). It covers algorithms and data structures, parallel and concurrent programming, networking, classic coding problems and SQL, through visual simulations in the browser backed by real C and C++ engines.

The workshop is written in Spanish with a full English translation, has two looks (the tech lab and the original wooden workshop), works on phones, tablets and desktops, and includes Bit, a robot guide with a tour for every station. Accounts are optional: guests keep their progress on their own device, and students who sign in with Google keep it in the cloud.

**Live:** [https://workshop.josuetorressibaja.com/](https://workshop.josuetorressibaja.com/)

---

## Stations

The web workshop is a lab with workbenches (work areas) and stations. Every station has three steps:

- **Understand:** The theory behind it, with diagrams.
- **Experiment:** Play with a live simulation.
- **Implement:** The real code from the C/C++ engines and how to run it.

Twelve stations: eleven on five workbenches, plus The Notebook. Each one has a checklist, and finishing it completes the station.

### Algorithms and Data Structures

- **Sorting:** Quick, Merge, Heap, Shell, Insertion, Selection, Bubble and Radix (LSD) sort on a live array, with input presets (random, nearly sorted, reversed, few unique), counters and sound mapped to values.
- **Algorithm vs. Algorithm:** Two of the eight algorithms race on the same array, one operation per tick each, with live comparison and write counters and a verdict that explains who won and why.
- **Data Structures · Easy and Medium:** Balanced parentheses, reversing a linked list and inserting into a BST, traced line by line like a debugger.

### Parallel and Concurrent Programming

- **The Roundabout:** A four-quadrant roundabout guarded by counting semaphores (`sem_t`). Turning the guard off causes a deadlock (circular wait), turning it on fixes it, and the station also explores the classic patterns.
- **Heat Diffusion:** A metal plate solved by threads. Each thread owns a band of rows and must wait at a barrier every iteration; the station shows which threads are working and which are waiting, and lets the student change the number of threads, split the rows unevenly, slow one thread down, paint heat sources and break stability with r > 1/4. It shows live speedup, efficiency and time spent at the barrier.

### Networking

- **TCP Sockets:** A client and a server exchanging HTTP over TCP, step by step: handshake, segments with seq/ack numbers, the request, the server thread that handles it, the response and the teardown. The model follows the routing of `Server.cc` (200, 404, 400 and `LIST`).

### Coding Problems

- **Classic Problems · Easy, Medium and Hard:** Thirteen classic problems (palindromes, binary search, two pointers, sliding window, interval merging, islands, coin change, trapping rain water, largest rectangle and more), traced line by line on the student's own input.

### Databases

- **SQL Step by Step:** Queries run clause by clause in logical order (`FROM`, `JOIN`, `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY`, `LIMIT`).

### The Notebook

- **The Notebook:** Amdahl's law calculator, the Coffman conditions, a Big-O reference and a personal notebook saved on the device.

---

## Native Engines

### Algorithms (`core-c-engines/algorithms/`)

C++17 implementations of the eight sorting algorithms with a benchmark harness.

### Concurrency (`core-c-engines/concurrency/`)

- **Roundabout:** Threads as vehicles and POSIX semaphores as quadrant guards.
- **Heat diffusion:** The 2D heat equation $\frac{\partial u}{\partial t} = \alpha \nabla^2 u$ solved with an explicit 5-point stencil and double buffering.
  - One library (`common/`) shared by the serial, pthreads and OpenMP programs. All three produce bit-for-bit identical plates.
  - **pthreads:** One barrier per iteration, a per-thread maximum change padded to its own cache line, and a choice between a spinning barrier on C11 atomics (default) and a sleeping `pthread_barrier_t` (`--sleep-barrier`). A start gate prevents a deadlock if thread creation fails.
  - **OpenMP:** A single parallel region with `omp for reduction(max:...)` and one `single` block per iteration.
  - `--compare` also runs the serial version and prints the speedup. Measured results are in [Heat_Diffusion_Theory.md](docs/concurrency/Heat_Diffusion_Theory.md).
- **Patterns:** Bounded buffer (two semaphores and a mutex), dining philosophers (resource hierarchy), the H2O rendezvous and a benchmark of atomics, spinlocks, mutexes and semaphores.

### Networking (`core-c-engines/networking/`)

A C++17 TCP server that starts one thread per client connection, on top of an object-oriented socket wrapper (`Socket`, `VSocket`) over the POSIX calls (`bind`, `listen`, `accept`, `connect`, `recv`, `send`). It serves the 12 ASCII figures over an HTTP/1.1-style protocol.

---

## Deployment

Every push to `main` runs the full test suite in GitHub Actions and, if it passes, deploys `web/` to Firebase Hosting, served at [https://workshop.josuetorressibaja.com/](https://workshop.josuetorressibaja.com/) (the default `cs-interactive-workshop.web.app` address keeps working too).

### Optional Firebase Accounts

Without configuration the workshop runs in guest mode. To enable Google sign-in and cloud progress:

1. Create a Firebase project, enable Google sign-in and Firestore.
2. Put the web app settings in `web/js/firebase-config.js`.
3. Deploy the rules: `firebase deploy --only firestore:rules`.
4. In Firebase Authentication, add any custom domain, such as `workshop.josuetorressibaja.com`, to the authorized domains (the `*.web.app` domain is already allowed).

The included `firebase.json` can also host the site: `firebase deploy --only hosting`.

---

## Project Structure

```text
cs-interactive-workshop/
├── Makefile                              # Builds every native engine and runs all tests
├── LICENSE                               # MIT License
├── firebase.json                         # Firebase Hosting configuration and cache headers
├── firestore.rules                       # Firestore rules for student progress
├── .github/workflows/deploy.yml          # CI: runs every test, then deploys web/ to Firebase Hosting
├── docs/                                 # Theory and specifications
│   ├── algorithms/                       # Sorting guide, complexity analysis
│   ├── concurrency/                      # Heat diffusion, roundabout, concurrency patterns
│   └── networking/                       # Protocol, compilation guide, test cases
├── core-c-engines/                       # Native engines
│   ├── algorithms/                       # C++17 sorting benchmark and sorters
│   ├── concurrency/
│   │   ├── simulations/roundabout/       # Traffic roundabout with POSIX semaphores
│   │   ├── simulations/heat-diffusion/   # Shared library (common/) + serial, pthreads, OpenMP programs
│   │   └── patterns/                     # Bounded buffer, philosophers, H2O, sync benchmark
│   └── networking/                       # Multi-threaded TCP server and client (C++17)
│       ├── src/                          # Socket/VSocket wrappers, Server, Client, FileSystem
│       └── ascii_figures/                # The 12 ASCII figures the server sends
├── tests/                                # C/C++ suites, Python checks, and the web workshop runner
└── web/                                  # The web workshop (static, no build step)
    ├── index.html                        # Every screen and station
    ├── sitemap.xml, robots.txt           # Search engine files for the custom domain
    ├── css/styles.css                    # Both themes, responsive layouts for phone, tablet and desktop
    ├── js/
    │   ├── app.js                        # Router, work areas, Bit the guide, tours
    │   ├── i18n.js, i18n/en.js           # Spanish source text and the English translation
    │   ├── theme.js                      # Tech lab and wooden workshop themes
    │   ├── progress.js                   # Progress model (pure data)
    │   ├── account.js                    # Optional Google sign-in and sync
    │   ├── firebase-config.js            # Firebase settings (null = guest mode only)
    │   ├── tracer.js                     # Line-by-line code walkthrough engine
    │   ├── audio.js                      # Web Audio sound effects
    │   └── modules/                      # One file per station (plus pure models)
    │       ├── algorithms.js             # Sorting station
    │       ├── versus.js                 # Algorithm vs. Algorithm station
    │       ├── datastructures.js         # Data Structures station (tracer)
    │       ├── concurrency.js            # The Roundabout station
    │       ├── heatsim.js, heat.js       # Heat Diffusion: model and station
    │       ├── httpsim.js, networking.js # TCP Sockets: model and station
    │       ├── interview.js              # Classic Problems station (tracer)
    │       ├── sql.js                    # SQL Step by Step station (tracer)
    │       ├── cheatsheets.js            # The Notebook station
    │       ├── notebook.js               # My Notes, the notebook inside The Notebook
    │       └── figuresData.js            # Embedded copy of the ASCII figures
    └── assets/ascii_figures/             # ASCII figures served to the web workshop
```

---

## Getting Started

### Prerequisites

- GCC / G++ with C11, C++17, POSIX threads (`-pthread`) and OpenMP (`-fopenmp`).
- Make.
- Linux, macOS or WSL.
- Node.js 18+ and Python 3 for the web workshop tests.

### Build

Build every native engine:

```bash
git clone https://github.com/josuetorres27/cs-interactive-workshop.git
cd cs-interactive-workshop
make all
```

### Run

The web workshop is static. Serve the `web/` folder with any static server, then open `http://localhost:8000`:

```bash
python3 -m http.server 8000 --directory web
```

Run the heat diffusion engines:

```bash
cd core-c-engines/concurrency/simulations/heat-diffusion
make -C pthreads && make -C openmp
./pthreads/bin/heat_pthreads 400 400 4 0.05 --compare
./openmp/bin/heat_openmp 400 400 4 0.05 --compare
```

---

## Testing

The test suite has 1,382 tests. It uses a zero-dependency C/C++ assertion harness (`tests/runner.h`), Python checks and a dependency-free JavaScript runner that loads the real web files inside a fake DOM.

Run every test:

```bash
make test
```

Run only the web workshop tests (no compiler needed):

```bash
make test-web
```

| Module | Test File | Tests | What It Checks |
| :--- | :--- | :---: | :--- |
| **Algorithms** | `tests/algorithms/test_sorting.cpp` | 120 | Every sorter on sorted, reversed, all-equal, negative, power-of-two and random inputs. |
| **Concurrency: roundabout** | `tests/concurrency/test_roundabout.c` | 50 | Quadrant transitions, semaphore bounds $[0, 1]$, route validation, contention, no collisions. |
| **Concurrency: heat** | `tests/concurrency/test_heat_diffusion.c` | 70 | The real library: borders, maximum principle, symmetry, row partitioning, the kernel, convergence, input validation, and pthreads (both barriers) and OpenMP matching serial bit for bit. |
| **Concurrency: patterns** | `tests/concurrency/test_patterns.c` | 50 | Bounded buffer FIFO order, no deadlock among philosophers, the 2:1 H2O ratio, atomic fetch-and-add without races. |
| **Networking** | `tests/networking/test_networking.cpp` | 50 | Request line parsing, headers, response framing, file system chunking, all 12 figures. |
| **Web assets** | `tests/web/test_web_assets.py` | 41 | Page anchors, CSS variables, JS syntax, audio, hosting configuration and search engine files. |
| **Web workshop** | `tests/web/run.js` | 1,001 | Every station and model (sorting, races, roundabout, heat, HTTP over TCP, tracer problems against reference solutions), progress and accounts against a fake Firebase backend, Firestore rules, the router, both languages, both themes, responsive layouts and page integrity. |
| **Total** | **7 suites** | **1,382** | **All passing** |

---

## Documentation

- **Algorithms:** [Algorithms_Guide.md](docs/algorithms/Algorithms_Guide.md), [Complexity_Analysis.md](docs/algorithms/Complexity_Analysis.md).
- **Concurrency:** [Heat_Diffusion_Theory.md](docs/concurrency/Heat_Diffusion_Theory.md), [Roundabout_Specification.md](docs/concurrency/Roundabout_Specification.md), [Concurrency_Patterns.md](docs/concurrency/Concurrency_Patterns.md).
- **Networking:** [Protocol_Specification.md](docs/networking/Protocol_Specification.md), [Compilation_Guide.md](docs/networking/Compilation_Guide.md), [Test_Cases.md](docs/networking/Test_Cases.md).

---

## License

This project is licensed under the [MIT License](LICENSE).

---

Created by **Josue Torres Sibaja** · [Portfolio](https://josuetorressibaja.com/) · [LinkedIn](https://www.linkedin.com/in/josue-torres-sibaja/) · [GitHub](https://github.com/josuetorres27)
