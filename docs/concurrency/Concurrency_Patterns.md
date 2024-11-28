# Classic Concurrency Patterns & Benchmarking

## 1. Overview
This module demonstrates fundamental synchronization patterns, lock-free atomics, and deadlocks mitigation mechanisms in systems programming using POSIX Threads (`pthreads`), C11 Atomics, and POSIX Realtime Extensions.

---

## 2. Patterns Catalog

### 2.1 Bounded Buffer (Producer-Consumer)
- **Problem Statement:** Multiple producer threads generate data tokens into a fixed-size ring buffer while multiple consumer threads extract them. Producers must block when full; consumers must block when empty.
- **Synchronization Primitives:**
  - `sem_t sem_empty`: Initialized to `BUFFER_CAPACITY` (tracks empty slots).
  - `sem_t sem_full`: Initialized to `0` (tracks filled items).
  - `pthread_mutex_t mutex`: Protects ring buffer indices (`head`, `tail`, `count`).
- **Liveness Guarantee:** Using counting semaphores eliminates busy-waiting and prevents buffer overrun/underrun race conditions.

```
Producers ---> [ sem_wait(&empty) ] ---> [ lock(&mutex) ] ---> [ Insert Item ] ---> [ unlock ] ---> [ sem_post(&full) ]
Consumers <--- [ sem_wait(&full) ]  <--- [ lock(&mutex) ] <--- [ Remove Item ] <--- [ unlock ] <--- [ sem_post(&empty) ]
```

---

### 2.2 Dining Philosophers (Dijkstra Resource Hierarchy)
- **Problem Statement:** $N$ philosophers sit around a circular table. Each philosopher alternates between thinking and eating. Eating requires acquiring both adjacent chopsticks (shared mutexes).
- **Deadlock Condition:** If every philosopher simultaneously picks up their left chopstick, a circular wait is established:
  $$P_0 \to C_1 \land P_1 \to C_2 \land \dots \land P_{N-1} \to C_0$$
- **Solution:** **Resource Ordering (Dijkstra's Hierarchy)**.
  Every philosopher always requests the lower-numbered chopstick first:
  ```c
  int first  = (left < right) ? left : right;
  int second = (left < right) ? right : left;
  pthread_mutex_lock(&forks[first]);
  pthread_mutex_lock(&forks[second]);
  ```
  Because philosopher $N-1$ requests chopstick $0$ before chopstick $N-1$, the symmetry is broken and circular wait is mathematically impossible.

---

### 2.3 H2O Molecule Assembler (Thread Rendezvous)
- **Problem Statement:** Hydrogen and Oxygen threads arrive asynchronously. They must barrier-synchronize and bond in precise stoichiometric proportions: exactly $2\text{H} + 1\text{O} \to \text{H}_2\text{O}$.
- **Synchronization Mechanism:**
  - Protected state tracking `hydrogen_count` and `oxygen_count`.
  - When $2\text{H}$ and $1\text{O}$ are available, the completing thread signals semaphores `sem_post(&hydro_sem)` twice and `sem_post(&oxy_sem)` once.
  - All three threads synchronize on a reusable rendezvous barrier (`pthread_barrier_t`) before and after bonding.

---

### 2.4 Low-Level Synchronization Primitives Benchmark
A micro-benchmark evaluating throughput and lock contention across four synchronization techniques incrementing a shared counter under $N$ worker threads:

| Mechanism | Description | Contention Behavior | Typical Throughput |
|---|---|---|---|
| **C11 Atomic** (`atomic_fetch_add`) | Hardware-level lock-free `LOCK XADD` | Hardware bus arbitration / MESI cache line bouncing | **Extremely High** |
| **Pthread Spinlock** (`pthread_spinlock_t`) | Busy-wait loop in user space | Efficient for ultra-short critical sections; burns CPU cycles | **High** |
| **Pthread Mutex** (`pthread_mutex_t`) | Adaptive hybrid (spin-then-futex sleep) | Minimal CPU waste during long stalls; OS context switch cost | **Moderate** |
| **POSIX Semaphore** (`sem_t`) | Kernel-level counter with wait queue | System call overhead per decrement/increment | **Baseline** |
