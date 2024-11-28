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

### 2.2 POSIX Threads Implementation
- **Double Buffering:** Alternating between `matrix_a` and `matrix_b` avoids memory allocation overhead per step.
- **Barrier Synchronization (`pthread_barrier_t`):** Two barrier synchronizations per iteration:
  1. *Computation Barrier:* Ensures all threads have finished computing new values from the read matrix before any thread swaps pointers.
  2. *Convergence Reduction:* Aggregates maximum delta across thread-local variables.

### 2.3 OpenMP Multi-Core Scaling
Using work-sharing directives with loop scheduling:
```c
#pragma omp parallel for collapse(2) schedule(static) reduction(max:max_delta)
for (size_t r = 1; r < rows - 1; ++r) {
    for (size_t c = 1; c < cols - 1; ++c) {
        double new_val = 0.25 * (current[r-1][c] + current[r+1][c] +
                                 current[r][c-1] + current[r][c+1]);
        double diff = fabs(new_val - current[r][c]);
        if (diff > max_delta) max_delta = diff;
        next[r][c] = new_val;
    }
}
```

---

## 3. Scaling & Performance Metrics

- **Speedup:** $S(P) = \frac{T_1}{T_P}$
- **Parallel Efficiency:** $E(P) = \frac{S(P)}{P} = \frac{T_1}{P \cdot T_P}$
- **Amdahl's Law Limit:**
  $$S(P) = \frac{1}{(1 - f) + \frac{f}{P}}$$
  where $f$ is the parallelizable fraction ($\approx 0.98$ for large grids).
