# Functional Test Matrix

This document provides functional test scenarios to validate the multi-threaded HTTP server and the block-based virtual file system. Tests are performed using both the native CLI client and standard network tools (`curl`, `wget`, web browsers).

---

### 1. LIST - Request Directory Index

**CLI Client:**
```bash
./exec/Client LIST
```

**HTTP Tools:**
```bash
curl http://localhost:1234/LIST
```

**Expected Result:**  
The server returns the list of all indexed ASCII figures categorized by directory block numbers:

```text
Figures stored on disk:
Directory block #0:
- batman (2 data blocks)
- charizard (19 data blocks)
- computer (3 data blocks)
- gengar (6 data blocks)
- goomba (5 data blocks)
- jigglypuff (4 data blocks)
- mario (5 data blocks)

Directory block #1:
- mcqueen (13 data blocks)
- pikachu (15 data blocks)
- spiderman_1 (17 data blocks)
- spiderman_2 (11 data blocks)
- yoshi (7 data blocks)
```

---

### 2. GET <figure> - Valid Asset Retrieval

**CLI Client:**
```bash
./exec/Client GET spiderman_1
```

**HTTP Tools:**
```bash
curl http://localhost:1234/GET/spiderman_1
wget -qO- http://localhost:1234/GET/spiderman_1
```

**Expected Result:**  
The complete ASCII representation of the requested asset is streamed back to the client.

---

### 3. GET <figure> - Non-Existent Asset

**Command:**
```bash
./exec/Client GET ironman
curl http://localhost:1234/GET/ironman
```

**Expected Result:**
```text
Figure not found
```

---

### 4. Invalid Command Handling

**Command:**
```bash
./exec/Client DELETE spiderman_1
curl http://localhost:1234/DELETE/spiderman_1
```

**Expected Result:**
```text
Invalid command. Use: LIST/GET <figure_name>
```

---

### 5. Concurrent Requests

**Command:**
```bash
./exec/Client GET spiderman_1 & ./exec/Client GET spiderman_2
curl http://localhost:1234/GET/spiderman_1 & curl http://localhost:1234/GET/spiderman_2
```

**Expected Result:**  
Both clients receive their complete responses concurrently without corruption or deadlock, demonstrating the thread-safe socket handling and block reading.
