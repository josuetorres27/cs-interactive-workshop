# Compilation & Execution Guide

### 1. Build
Open a terminal in the root directory of the repository and execute:

```bash
make clean  # Clean previous build artifacts
make        # Compile server and client
```

Binaries will be placed in the `exec/` directory:
- `exec/Server`: The multi-threaded ASCII art server.
- `exec/Client`: The command-line client.

---

### 2. Running Server and Client

**Terminal 1 (Server):**
```bash
./exec/Server
```
*When the server starts for the first time, it automatically reads the `ascii_figures/` directory, builds the virtual block filesystem in `disk.bin`, and starts listening on port 1234.*

**Terminal 2 (Client):**
```bash
# Request the directory listing of stored figures
./exec/Client LIST

# Request a specific ASCII figure
./exec/Client GET spiderman_1
```

---

### 3. Testing with Standard HTTP Tools
Since the server implements an HTTP-compliant response interface, you can test it directly with `curl`, `wget`, or your web browser:

```bash
# List figures
curl http://localhost:1234/LIST

# Get a figure
curl http://localhost:1234/GET/spiderman_1

# Using wget
wget -qO- http://localhost:1234/GET/spiderman_1
```

---

### 4. Updating Figures on the Simulated Disk
The `disk.bin` file stores the initialized filesystem. If you edit or replace any `.txt` figures in `ascii_figures/` and want the disk to be rebuilt from scratch, simply delete `disk.bin` and restart the server:

```bash
rm disk.bin
./exec/Server
```
