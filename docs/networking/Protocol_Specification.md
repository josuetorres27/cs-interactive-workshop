# Distributed Proxy-Server Communication Protocol

## Overview
This specification describes the inter-node communication protocol used between distributed ASCII art servers and routing proxies. Proxy-to-server communication utilizes this lightweight text protocol, while client-facing interfaces use HTTP/1.1.

---

## 1. Server Discovery

### 1.1 Discovery Request (New Proxy)
When a proxy node joins the network, it broadcasts to server nodes:

```text
Request: GET /servers
```

Active servers receiving this request reply directly to the originating proxy:

```text
Response: <ServerName> | <ip> | {<comma_separated_figures>}
```

**Example:**
```text
Response: ServerAlpha | 172.16.123.51 | pikachu, charizard, gengar
```

The proxy registers this node in its dynamic routing table to forward future requests.

---

### 1.2 Discovery Announcement (New Server)
When a server node starts up, it broadcasts its presence to all available proxies:

```text
Response: <ServerName> | <ip> | {<comma_separated_figures>}
```

---

## 2. Asset Requests

### 2.1 Proxy to Server Request
```text
Request: GET /figure/<figure_name>
```

### 2.2 Server Response
* **Success:** Returns the raw ASCII art stream.
* **Not Found:**
  ```text
  Response: 404 Not Found
  ```

---

## 3. Graceful Shutdown & Deregistration
When a server node shuts down:

```text
Request: DELETE /server/<ServerName>
```

Proxies remove the server from their routing pool and flush corresponding cache entries.
