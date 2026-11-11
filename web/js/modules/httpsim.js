// CS Interactive Workshop - HTTP over TCP exchange model (no DOM).
//
// Mirrors the project's C++ engine in core-c-engines/networking:
//   * Server.cc listens on port 1234 (IPv6), accepts a connection and starts one
//     std::thread per client running task(), which routes:
//       GET /LIST            -> 200, figure list (no Content-Length)
//       GET /api/figures     -> 200, JSON list   (with Content-Length)
//       GET /GET/<name>      -> 200, figure text (no Content-Length) or 404
//       GET /<name>          -> same as /GET/<name>
//       anything not GET     -> 400 Bad Request
//     then writes the response and closes the socket (server closes first).
//   * Client.cc sends "GET /GET/<name> HTTP/1.1" or "GET /LIST HTTP/1.1".
//
// buildExchange() turns one request into the full list of steps: TCP three-way
// handshake, request segment, server work, response segments (split by MSS),
// ACK and the connection teardown, each with TCP header values and states.
(function (root) {
  const SERVER = { name: 'servidor.local', ip: '2001:db8::1', port: 1234 };
  const CLIENT = { name: 'cliente', ip: '2001:db8::2', port: 52814 };
  const MSS = 1440;            // 1500 (Ethernet MTU) - 40 (IPv6) - 20 (TCP)
  const BLOCK_SIZE = 256;      // FileSystem.h
  const DIR_ENTRIES = 7;       // FileSystem.h
  const CLIENT_ISN = 2000;
  const SERVER_ISN = 7000;

  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  function byteLength(str) {
    if (encoder) return encoder.encode(str).length;
    return unescape(encodeURIComponent(str)).length; // fallback
  }

  function figures() {
    const assets = (root && root.EMBEDDED_ASSETS) || {};
    return assets;
  }

  // ── Client side: what Client.cc puts on the wire ───────────────────────
  // command: 'GET' (one figure) | 'LIST'; method lets the student break it.
  function buildRequest({ command = 'GET', figure = '', method = 'GET' } = {}) {
    const target = command === 'LIST' ? '/LIST' : `/GET/${figure}`;
    return `${method} ${target} HTTP/1.1\r\nHost: ${SERVER.name}:${SERVER.port}\r\n\r\n`;
  }

  // Split "METHOD TARGET VERSION\r\nHeaders\r\n\r\nBody" into parts.
  function parseMessage(raw) {
    const sep = raw.indexOf('\r\n\r\n');
    const head = sep === -1 ? raw : raw.slice(0, sep);
    const body = sep === -1 ? '' : raw.slice(sep + 4);
    const lines = head.split('\r\n');
    const startLine = lines[0] || '';
    const headers = lines.slice(1).filter(Boolean).map((l) => {
      const i = l.indexOf(':');
      return i === -1 ? [l, ''] : [l.slice(0, i), l.slice(i + 1).trim()];
    });
    return { startLine, headers, body, head, headLength: byteLength(head) + (sep === -1 ? 0 : 4) };
  }

  // ── Server side: a faithful port of task() in Server.cc ────────────────
  function figureList(figs) {
    const names = Object.keys(figs);
    let out = 'Figures stored on disk:\n';
    for (let b = 0; b * DIR_ENTRIES < Math.max(names.length, 1); b++) {
      if (b > 0) out += '\n';
      out += `Directory block #${b}:\n`;
      names.slice(b * DIR_ENTRIES, (b + 1) * DIR_ENTRIES).forEach((n) => {
        const blocks = Math.floor(byteLength(figs[n]) / BLOCK_SIZE) + 1;
        out += `- ${n} (${blocks} data blocks)\n`;
      });
    }
    return out + '\n';
  }

  function handleRequest(raw, figs = figures()) {
    const base = [['Content-Type', 'text/plain; charset=utf-8']];
    const cors = ['Access-Control-Allow-Origin', '*'];
    const close = ['Connection', 'close'];
    const res = (status, reason, headers, body, route, extra = {}) => ({ status, reason, headers, body, route, ...extra });

    if (raw.slice(0, 4) !== 'GET ') {
      return res(400, 'Bad Request', [...base, close], 'Invalid command', 'bad');
    }
    const p2 = raw.indexOf(' HTTP');
    if (p2 === -1) return res(400, 'Bad Request', [...base, close], 'Invalid command', 'bad');
    const url = raw.slice(4, p2).replace(/[\r\n]/g, '');

    if (url === '/api/figures' || url === '/api/list') {
      const body = JSON.stringify(Object.keys(figs));
      return res(200, 'OK', [['Content-Type', 'application/json; charset=utf-8'], cors, close, ['Content-Length', String(byteLength(body))]], body, 'api', { url });
    }
    if (url === '/LIST') {
      return res(200, 'OK', [...base, cors, close], figureList(figs), 'list', { url });
    }
    let name = url;
    if (name.indexOf('/GET/') === 0) name = name.slice(5);
    else if (name.indexOf('/') === 0) name = name.slice(1);
    if (Object.prototype.hasOwnProperty.call(figs, name) && figs[name]) {
      return res(200, 'OK', [...base, cors, close], figs[name], 'figure', { url, figure: name });
    }
    return res(404, 'Not Found', [...base, close], 'Figure not found', 'notfound', { url, figure: name });
  }

  function serializeResponse(r) {
    return `HTTP/1.1 ${r.status} ${r.reason}\r\n${r.headers.map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n${r.body}`;
  }

  // Cut a byte count into MSS-sized segments.
  function segment(total, mss = MSS) {
    const out = [];
    for (let off = 0; off < total; off += mss) out.push({ offset: off, len: Math.min(mss, total - off) });
    return out.length ? out : [{ offset: 0, len: 0 }];
  }

  // Slice a string by UTF-8 byte offsets (ASCII art is 1 byte per char).
  function sliceBytes(str, start, len) {
    if (!encoder) return str.slice(start, start + len);
    const bytes = encoder.encode(str).slice(start, start + len);
    return new TextDecoder().decode(bytes);
  }

  // ── The whole conversation, step by step ───────────────────────────────
  function buildExchange(opts = {}, figs = figures()) {
    const request = buildRequest(opts);
    const response = handleRequest(request, figs);
    const responseRaw = serializeResponse(response);
    const reqLen = byteLength(request);
    const resLen = byteLength(responseRaw);
    const segs = segment(resLen, opts.mss || MSS);
    const thread = opts.thread || 1;

    let cSeq = CLIENT_ISN, sSeq = SERVER_ISN;
    const steps = [];
    const st = { client: 'CLOSED', server: 'LISTEN', conn: null, screen: '', log: ['main: socket() → bind(1234) → listen()', 'main: accept() bloqueado, esperando clientes…'], threads: [{ name: 'main', state: 'accept()' }] };
    const tcp = (dir, flags, seq, ack, len = 0) => ({
      src: dir === 'c2s' ? `[${CLIENT.ip}]:${CLIENT.port}` : `[${SERVER.ip}]:${SERVER.port}`,
      dst: dir === 'c2s' ? `[${SERVER.ip}]:${SERVER.port}` : `[${CLIENT.ip}]:${CLIENT.port}`,
      flags, seq, ack, len
    });
    const push = (s) => steps.push({
      ...s,
      client: st.client, server: st.conn || st.server, listening: st.server,
      screen: st.screen, log: st.log.slice(), threads: st.threads.map((t) => ({ ...t }))
    });

    push({ phase: 'ready', title: 'Todo listo', packet: null,
      note: `El servidor ya hizo <code>bind()</code> y <code>listen()</code> en el puerto ${SERVER.port} y espera en <code>accept()</code>. El cliente todavía no tiene conexión.` });

    // 1. Three-way handshake
    st.client = 'SYN_SENT';
    st.screen = `$ ./client ${opts.command === 'LIST' ? 'LIST' : `GET ${opts.figure || ''}`}\nConectando a ${SERVER.name} (puerto ${SERVER.port})…`;
    push({ phase: 'open', title: 'SYN', packet: { dir: 'c2s', label: 'SYN', tcp: tcp('c2s', ['SYN'], cSeq, null), payload: null },
      note: `El cliente llama a <code>connect()</code>. El sistema operativo envía un segmento <b>SYN</b> con su número de secuencia inicial (${cSeq}): "quiero hablar contigo".` });
    st.conn = 'SYN_RCVD';
    push({ phase: 'open', title: 'SYN-ACK', packet: { dir: 's2c', label: 'SYN-ACK', tcp: tcp('s2c', ['SYN', 'ACK'], sSeq, cSeq + 1), payload: null },
      note: `El servidor responde <b>SYN-ACK</b>: confirma el SYN (ack = ${cSeq + 1}) y propone su propio número inicial (${sSeq}).` });
    cSeq += 1; sSeq += 1;
    st.client = 'ESTABLISHED';
    st.conn = 'ESTABLISHED';
    st.screen += '\nConectado.';
    push({ phase: 'open', title: 'ACK', packet: { dir: 'c2s', label: 'ACK', tcp: tcp('c2s', ['ACK'], cSeq, sSeq), payload: null },
      note: 'El cliente confirma con <b>ACK</b>. Listo el <b>saludo de tres vías</b>: la conexión TCP está establecida en ambos lados.' });

    st.log.push('main: accept() devolvió un socket nuevo para el cliente');
    st.log.push(`main: std::thread(task, client).detach() → hilo #${thread}`);
    st.threads = [{ name: 'main', state: 'accept()' }, { name: `hilo #${thread}`, state: 'task()' }];
    push({ phase: 'server', title: 'Nuevo hilo', packet: null,
      note: `<code>accept()</code> entrega un socket nuevo solo para este cliente. El servidor crea un <b>hilo</b> que ejecuta <code>task()</code>, y el hilo principal vuelve a esperar más clientes.` });

    // 2. HTTP request
    push({ phase: 'request', title: 'Arma la petición', packet: null, preview: { kind: 'request', raw: request },
      note: `El cliente escribe la petición HTTP: una <b>línea de petición</b> (método, ruta y versión), los <b>encabezados</b> y una <b>línea vacía</b> que marca el final. Son ${reqLen} bytes de texto.` });
    push({ phase: 'request', title: 'Petición HTTP', packet: { dir: 'c2s', label: opts.method && opts.method !== 'GET' ? `HTTP ${opts.method}` : 'HTTP GET', tcp: tcp('c2s', ['PSH', 'ACK'], cSeq, sSeq, reqLen), payload: request, kind: 'request' },
      note: `La petición viaja <b>dentro</b> de un segmento TCP (flags PSH, ACK). El campo seq avanza por bytes: el siguiente segmento del cliente empezará en ${cSeq + reqLen}.` });
    cSeq += reqLen;

    // 3. Server work
    st.log.push(`hilo #${thread}: Read() → "${request.split('\r\n')[0]}"`);
    const parsed = response.route === 'bad'
      ? `No empieza con "GET ": el servidor no sabe qué hacer.`
      : response.route === 'list' ? 'La ruta es <code>/LIST</code>: hay que listar el disco.' : `La ruta es <code>${response.url}</code>: piden la figura <b>${response.figure}</b>.`;
    push({ phase: 'server', title: 'Lee la petición', packet: null,
      note: `El hilo hace <code>Read()</code> y revisa la primera línea. ${parsed}` });

    if (response.route === 'figure') st.log.push(`hilo #${thread}: fs.getFigureContent("${response.figure}") → ${byteLength(response.body)} bytes`);
    else if (response.route === 'notfound') st.log.push(`hilo #${thread}: fs.getFigureContent("${response.figure}") → no existe`);
    else if (response.route === 'list') st.log.push(`hilo #${thread}: fs.getFigureList()`);
    else st.log.push(`hilo #${thread}: método no soportado`);
    const work = {
      figure: `Busca la figura en su sistema de archivos (<code>disk.bin</code>, en bloques de ${BLOCK_SIZE} bytes) y la encuentra.`,
      notfound: `Busca "${response.figure}" en el disco y <b>no existe</b>.`,
      list: 'Recorre los bloques de directorio del disco y arma la lista de figuras.',
      bad: 'No hay nada que buscar: la petición es inválida.',
      api: 'Arma la lista de figuras en formato JSON.'
    }[response.route];
    push({ phase: 'server', title: response.route === 'bad' ? 'Rechaza' : 'Busca en disco', packet: null, highlight: response.figure || null, note: work });

    push({ phase: 'response', title: 'Arma la respuesta', packet: null, preview: { kind: 'response', raw: responseRaw },
      note: `Respuesta <b>${response.status} ${response.reason}</b>. ${response.headers.some(([k]) => k === 'Content-Length')
        ? 'Incluye Content-Length, así el cliente sabe cuántos bytes esperar.'
        : 'No trae Content-Length: el cliente sabrá que terminó cuando el servidor cierre la conexión (<code>Connection: close</code>).'}` });

    // 4. Response segments
    let received = '';
    const bodyStart = parseMessage(responseRaw).head.length + 4;
    // TCP cuts by bytes, so a multi-byte character (the Braille art in some
    // figures uses 3 bytes each) can be split between two segments. Decode as
    // a stream, the way a real client does, so no character is ever corrupted.
    const allBytes = encoder ? encoder.encode(responseRaw) : null;
    const streamDecoder = encoder ? new TextDecoder() : null;
    segs.forEach((sg, i) => {
      const chunk = allBytes
        ? streamDecoder.decode(allBytes.slice(sg.offset, sg.offset + sg.len), { stream: i < segs.length - 1 })
        : sliceBytes(responseRaw, sg.offset, sg.len);
      received += chunk;
      if (i === 0) st.log.push(`hilo #${thread}: Write() → ${resLen} bytes`);
      const shownBody = received.length > bodyStart ? received.slice(bodyStart) : '';
      st.screen = `$ ./client ${opts.command === 'LIST' ? 'LIST' : `GET ${opts.figure || ''}`}\n${shownBody}`;
      push({ phase: 'response', title: segs.length > 1 ? `Respuesta ${i + 1}/${segs.length}` : 'Respuesta HTTP',
        packet: { dir: 's2c', label: i === 0 ? `HTTP ${response.status}` : `datos ${i + 1}/${segs.length}`, tcp: tcp('s2c', ['PSH', 'ACK'], sSeq + sg.offset, cSeq, sg.len), payload: chunk, kind: 'response', part: segs.length > 1 ? `segmento ${i + 1} de ${segs.length}` : null },
        note: segs.length > 1
          ? `La respuesta mide ${resLen} bytes y no cabe en un solo segmento (máximo ${MSS} bytes de datos, el MSS). TCP la parte: este es el segmento ${i + 1} de ${segs.length}, seq = ${sSeq + sg.offset}.`
          : `La respuesta (${resLen} bytes) cabe en un solo segmento TCP. Su ack = ${cSeq} confirma que la petición llegó completa.` });
    });
    sSeq += resLen;
    push({ phase: 'response', title: 'ACK', packet: { dir: 'c2s', label: 'ACK', tcp: tcp('c2s', ['ACK'], cSeq, sSeq), payload: null },
      note: `El cliente confirma que recibió todo: ack = ${sSeq}, el siguiente byte que espera.` });

    // 5. Teardown: the server closes first (client->Close() in task())
    st.conn = 'FIN_WAIT_1';
    st.log.push(`hilo #${thread}: Close() y termina`);
    st.threads = [{ name: 'main', state: 'accept()' }, { name: `hilo #${thread}`, state: 'terminado' }];
    push({ phase: 'close', title: 'FIN', packet: { dir: 's2c', label: 'FIN', tcp: tcp('s2c', ['FIN', 'ACK'], sSeq, cSeq), payload: null },
      note: 'El hilo llama a <code>Close()</code>: el servidor envía <b>FIN</b>, "ya no tengo más que decir". El hilo termina.' });
    st.client = 'LAST_ACK';
    push({ phase: 'close', title: 'FIN-ACK', packet: { dir: 'c2s', label: 'FIN-ACK', tcp: tcp('c2s', ['FIN', 'ACK'], cSeq, sSeq + 1), payload: null },
      note: `Al recibir el FIN, <code>Read()</code> del cliente devuelve 0: así sabe que la respuesta terminó${response.headers.some(([k]) => k === 'Content-Length') ? '' : ' (por eso no hacía falta Content-Length)'}. Confirma y cierra su lado con otro <b>FIN</b>.` });
    st.client = 'CLOSED';
    st.conn = 'TIME_WAIT';
    push({ phase: 'close', title: 'ACK final', packet: { dir: 's2c', label: 'ACK', tcp: tcp('s2c', ['ACK'], sSeq + 1, cSeq + 1), payload: null },
      note: 'El servidor confirma el último FIN. La conexión queda en <b>TIME_WAIT</b> un momento (por si algún paquete viejo llega tarde) y luego se libera.' });

    return { request, response, responseRaw, requestBytes: reqLen, responseBytes: resLen, segments: segs.length, steps };
  }

  const api = { SERVER, CLIENT, MSS, BLOCK_SIZE, DIR_ENTRIES, CLIENT_ISN, SERVER_ISN, byteLength, buildRequest, parseMessage, handleRequest, serializeResponse, figureList, segment, sliceBytes, buildExchange };
  root.HttpSim = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
