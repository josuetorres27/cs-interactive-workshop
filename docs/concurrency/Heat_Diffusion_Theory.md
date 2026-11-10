# Heat Diffusion Simulation & Domain Decomposition

## 1. Physical & Mathematical Formulation

The transient heat conduction in a two-dimensional isotropic medium with constant thermal diffusivity $\alpha$ is governed by the 2D parabolic partial differential equation (Fourier's Heat Equation):

$$\frac{\partial u}{\partial t} = \alpha \left( \frac{\partial^2 u}{\partial x^2} + \frac{\partial^2 u}{\partial y^2} \right)$$

where:
- $u(x, y, t)$ represents temperature at spatial coordinate $(x, y)$ and time $t$.
- $\alpha = \frac{k}{c_p \rho}$ is the thermal diffusivity coefficient ($\text{m}^2/\text{s}$).

### 1.1 Finite Difference Discretization
Using explicit forward Euler time stepping and second-order central spatial differences on a uniform Cartesian grid with spatial step $h = \Delta x = \Delta y$:

$$\frac{\partial u}{\partial t} \approx \frac{u_{i,j}^{t+1} - u_{i,j}^t}{\Delta t}$$

$$\frac{\partial^2 u}{\partial x^2} + \frac{\partial^2 u}{\partial y^2} \approx \frac{u_{i+1,j}^t + u_{i-1,j}^t + u_{i,j+1}^t + u_{i,j-1}^t - 4u_{i,j}^t}{h^2}$$

Rearranging gives the 5-point stencil update equation:

$$u_{i,j}^{t+1} = u_{i,j}^t + \frac{\alpha \Delta t}{h^2} \left( u_{i+1,j}^t + u_{i-1,j}^t + u_{i,j+1}^t + u_{i,j-1}^t - 4u_{i,j}^t \right)$$

### 1.2 Numerical Stability Criterion (CFL Condition)
For numerical stability of the explicit scheme in 2D, the Courant-Friedrichs-Lewy (CFL) condition requires:

$$r = \frac{\alpha \Delta t}{h^2} \le \frac{1}{4}$$

When $r = \frac{1}{4}$, the stencil simplifies to a discrete Laplace averaging filter:

$$u_{i,j}^{t+1} = \frac{1}{4} \left( u_{i+1,j}^t + u_{i-1,j}^t + u_{i,j+1}^t + u_{i,j-1}^t \right)$$

The simulation iterates until steady-state convergence:

$$\max_{i,j} |u_{i,j}^{t+1} - u_{i,j}^t| < \varepsilon$$

---

## 2. Parallelization Strategies

### 2.1 Domain Decomposition (1D Row Slicing)
The $R \times C$ grid is partitioned horizontally across $P$ threads or processes. Thread $p \in [0, P-1]$ owns row interval:

$$\text{start\_row}(p) = 1 + \left\lfloor \frac{p \cdot (R-2)}{P} \right\rfloor, \quad \text{end\_row}(p) = 1 + \left\lfloor \frac{(p+1) \cdot (R-2)}{P} \right\rfloor$$

```
+------------------------------------------------+  Row 0 (Boundary: Constant Temp)
|                   Thread 0                     |  Rows 1 .. K
+ - - - - - - - - - - - - - - - - - - - - - - - -+  Halo / Ghost Row
|                   Thread 1                     |  Rows K+1 .. 2K
+ - - - - - - - - - - - - - - - - - - - - - - - -+  Halo / Ghost Row
|                   Thread P-1                   |  Rows (P-1)K+1 .. R-2
+------------------------------------------------+  Row R-1 (Boundary: Constant Temp)
```

### 2.2 POSIX Threads Implementation (`common/heat.c`)
All three programs share one library (`simulations/heat-diffusion/common`): `heat_step_rows` is the kernel, `heat_partition` splits the interior rows, and `heat_solve_serial`, `heat_solve_pthreads` and `heat_solve_openmp` are the solvers. Because every new value depends only on the previous grid, the three solvers produce **bit-for-bit identical** grids; the test suite checks this for 1 to 16 threads.

- **Double buffering:** each thread keeps its *own* `cur`/`next` pointers and swaps them locally, so no shared pointer is written during the solve.
- **One barrier per iteration.** Each thread writes its local maximum change into `deltas[parity][tid]` (`parity = iteration % 2`), waits at the barrier, then *every* thread reads all slots and computes the same global maximum, so all of them take the same continue/stop decision without a second barrier. The two parity slots matter: a fast thread may already write iteration $k+1$ while a slow one still reads iteration $k$.
- **No false sharing:** each slot is padded to a 64-byte cache line.
- **Two barriers to compare:**
  - `HEAT_BARRIER_SPIN` (default): a sense-reversing barrier on C11 atomics. The last thread to arrive flips a shared `sense` flag; the others spin on it briefly and then `sched_yield()`.
  - `HEAT_BARRIER_SLEEP` (`--sleep-barrier`): `pthread_barrier_wait`, which puts waiting threads to sleep in the kernel and wakes them every iteration.
- **Safe start:** workers wait on a start gate (mutex + condition variable). If any `pthread_create` fails, the gate says "abort" instead of "go", so no thread is left blocked on a barrier that can never fill.

### 2.3 OpenMP Multi-Core Scaling (`common/heat_omp.c`)
Threads are created once for the whole solve, not once per iteration:
```c
#pragma omp parallel num_threads(threads)
while (!done) {
    #pragma omp for schedule(static) reduction(max:step_delta)
    for (int i = 1; i < rows - 1; ++i)
        step_delta = fmax(step_delta, heat_step_rows(cur, next, cols, r, i, i + 1));
    #pragma omp single   /* implicit barriers before and after */
    { swap(&cur, &next); done = step_delta <= eps || ++iterations >= max_iterations; step_delta = 0.0; }
}
```

### 2.4 Measured behaviour
4 threads, $\varepsilon = 0.05$, 557 iterations; every run produced the same grid as the serial solver:

| Plate | pthreads (spin barrier) | pthreads (sleep barrier) | OpenMP |
|---|---|---|---|
| 120 × 120 | 1.73x | 0.19x | 2.52x |
| 400 × 400 | 3.36x | 1.40x | 3.50x |
| 1000 × 1000 | 1.42x | 1.60x | 1.37x |

- **Small plates:** one iteration takes microseconds, so the cost of the barrier dominates. A sleeping barrier makes 4 threads about 5x *slower* than one.
- **Large plates:** two 8 MB grids no longer fit in cache and every engine is limited by memory bandwidth, not by the number of threads.

Reproduce with `./pthreads/bin/heat_pthreads 400 400 4 0.05 --compare [--sleep-barrier]` and `./openmp/bin/heat_openmp 400 400 4 0.05 --compare`.

---

## 3. Scaling & Performance Metrics

- **Speedup:** $S(P) = \frac{T_1}{T_P}$
- **Parallel Efficiency:** $E(P) = \frac{S(P)}{P} = \frac{T_1}{P \cdot T_P}$
- **Amdahl's Law Limit:**
  $$S(P) = \frac{1}{(1 - f) + \frac{f}{P}}$$
  where $f$ is the parallelizable fraction ($\approx 0.98$ for large grids).
