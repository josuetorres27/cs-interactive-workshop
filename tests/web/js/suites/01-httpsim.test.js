// HTTP over TCP model (web/js/modules/httpsim.js)
'use strict';

module.exports = (t, { createEnv }) => {
  const env = createEnv();
  env.load('js/modules/figuresData.js');
  env.load('js/modules/httpsim.js');
  const S = env.window.HttpSim;
  const FIGS = env.window.EMBEDDED_ASSETS;
  const NAMES = Object.keys(FIGS);
  const header = (res, k) => (res.headers.find(([n]) => n.toLowerCase() === k.toLowerCase()) || [])[1];
  const dataPackets = (ex) => ex.steps.filter((s) => s.packet && s.packet.payload);

  t.suite('httpsim · bytes and requests', () => {
    t.test('byteLength counts ASCII as one byte each', () => t.eq(S.byteLength('GET /'), 5));
    t.test('byteLength counts ñ as two bytes in UTF-8', () => t.eq(S.byteLength('ñ'), 2));
    t.test('byteLength of an empty string is zero', () => t.eq(S.byteLength(''), 0));
    t.test('GET request uses /GET/<name> like Client.cc', () => t.ok(S.buildRequest({ figure: 'batman' }).startsWith('GET /GET/batman HTTP/1.1\r\n')));
    t.test('LIST request targets /LIST', () => t.ok(S.buildRequest({ command: 'LIST' }).startsWith('GET /LIST HTTP/1.1\r\n')));
    t.test('requests end with an empty line (CRLF CRLF)', () => t.ok(S.buildRequest({ figure: 'x' }).endsWith('\r\n\r\n')));
    t.test('requests carry a Host header with the server port', () => t.includes(S.buildRequest({ figure: 'x' }), `Host: ${S.SERVER.name}:${S.SERVER.port}`));
    t.test('the method can be changed to break the request', () => t.ok(S.buildRequest({ figure: 'x', method: 'POST' }).startsWith('POST ')));
    t.test('server listens on port 1234 like Server.cc', () => t.eq(S.SERVER.port, 1234));
    t.test('MSS is 1440 bytes for Ethernet + IPv6 + TCP', () => t.eq(S.MSS, 1500 - 40 - 20));
  });

  t.suite('httpsim · parsing messages', () => {
    const p = S.parseMessage('GET /a HTTP/1.1\r\nHost: h\r\nX: 1\r\n\r\nbody');
    t.test('parseMessage reads the start line', () => t.eq(p.startLine, 'GET /a HTTP/1.1'));
    t.test('parseMessage reads every header', () => t.deepEq(p.headers, [['Host', 'h'], ['X', '1']]));
    t.test('parseMessage separates the body', () => t.eq(p.body, 'body'));
    t.test('parseMessage reports the head length including the blank line', () => t.eq(p.headLength, S.byteLength('GET /a HTTP/1.1\r\nHost: h\r\nX: 1') + 4));
    t.test('parseMessage tolerates a message without body separator', () => t.eq(S.parseMessage('HELLO').body, ''));
  });

  t.suite('httpsim · server routing (port of task() in Server.cc)', () => {
    NAMES.forEach((name) => {
      t.test(`GET /GET/${name} returns 200 with the exact figure`, () => {
        const r = S.handleRequest(S.buildRequest({ figure: name }), FIGS);
        t.eq(r.status, 200);
        t.eq(r.body, FIGS[name]);
      });
    });
    t.test('GET /<name> is equivalent to GET /GET/<name>', () => {
      t.eq(S.handleRequest('GET /mario HTTP/1.1\r\n\r\n', FIGS).body, FIGS.mario);
    });
    t.test('unknown figure answers 404 "Figure not found"', () => {
      const r = S.handleRequest(S.buildRequest({ figure: 'unicornio' }), FIGS);
      t.eq(r.status, 404); t.eq(r.body, 'Figure not found'); t.eq(r.route, 'notfound');
    });
    t.test('non-GET methods answer 400 "Invalid command"', () => {
      const r = S.handleRequest(S.buildRequest({ figure: 'batman', method: 'POST' }), FIGS);
      t.eq(r.status, 400); t.eq(r.body, 'Invalid command');
    });
    t.test('a GET without " HTTP" version answers 400', () => t.eq(S.handleRequest('GET /batman\r\n\r\n', FIGS).status, 400));
    t.test('GET /LIST answers 200 and names every figure', () => {
      const r = S.handleRequest(S.buildRequest({ command: 'LIST' }), FIGS);
      t.eq(r.status, 200);
      NAMES.forEach((n) => t.includes(r.body, `- ${n} (`));
    });
    t.test('LIST groups figures in directory blocks of 7 entries', () => {
      const body = S.figureList(FIGS);
      t.eq((body.match(/Directory block #/g) || []).length, Math.ceil(NAMES.length / S.DIR_ENTRIES));
    });
    t.test('LIST reports data blocks as floor(bytes/256)+1', () => {
      const body = S.figureList(FIGS);
      NAMES.forEach((n) => t.includes(body, `- ${n} (${Math.floor(S.byteLength(FIGS[n]) / 256) + 1} data blocks)`));
    });
    t.test('/api/figures answers valid JSON with every name', () => {
      const r = S.handleRequest('GET /api/figures HTTP/1.1\r\n\r\n', FIGS);
      t.deepEq(JSON.parse(r.body), NAMES);
    });
    t.test('/api/figures Content-Length equals the body size', () => {
      const r = S.handleRequest('GET /api/figures HTTP/1.1\r\n\r\n', FIGS);
      t.eq(Number(header(r, 'Content-Length')), S.byteLength(r.body));
    });
    t.test('/api/list is an alias of /api/figures', () => t.eq(S.handleRequest('GET /api/list HTTP/1.1\r\n\r\n', FIGS).route, 'api'));
    t.test('figure responses have no Content-Length (like the C++ server)', () => t.eq(header(S.handleRequest('GET /GET/yoshi HTTP/1.1\r\n\r\n', FIGS), 'Content-Length'), undefined));
    t.test('every response says Connection: close', () => {
      ['GET /GET/yoshi HTTP/1.1', 'GET /LIST HTTP/1.1', 'GET /nope HTTP/1.1', 'POST / HTTP/1.1'].forEach((l) => t.eq(header(S.handleRequest(`${l}\r\n\r\n`, FIGS), 'Connection'), 'close'));
    });
    t.test('200 figure responses allow CORS', () => t.eq(header(S.handleRequest('GET /GET/yoshi HTTP/1.1\r\n\r\n', FIGS), 'Access-Control-Allow-Origin'), '*'));
    t.test('404 responses do not add CORS', () => t.eq(header(S.handleRequest('GET /GET/nope HTTP/1.1\r\n\r\n', FIGS), 'Access-Control-Allow-Origin'), undefined));
    t.test('text responses declare UTF-8 plain text', () => t.eq(header(S.handleRequest('GET /GET/yoshi HTTP/1.1\r\n\r\n', FIGS), 'Content-Type'), 'text/plain; charset=utf-8'));
  });

  t.suite('httpsim · serialization and segmentation', () => {
    t.test('serialized response starts with the status line', () => t.ok(S.serializeResponse({ status: 404, reason: 'Not Found', headers: [], body: '' }).startsWith('HTTP/1.1 404 Not Found\r\n')));
    t.test('serialize → parse keeps the body intact', () => {
      const r = S.handleRequest('GET /GET/batman HTTP/1.1\r\n\r\n', FIGS);
      t.eq(S.parseMessage(S.serializeResponse(r)).body, FIGS.batman);
    });
    t.test('segment(0) still yields one empty segment', () => t.deepEq(S.segment(0), [{ offset: 0, len: 0 }]));
    t.test('segment(MSS) fits exactly in one segment', () => t.eq(S.segment(S.MSS).length, 1));
    t.test('segment(MSS + 1) needs two segments', () => t.deepEq(S.segment(S.MSS + 1).map((s) => s.len), [S.MSS, 1]));
    t.test('segment lengths add up to the total', () => t.eq(S.segment(5000).reduce((a, s) => a + s.len, 0), 5000));
    t.test('segment honours a custom MSS', () => t.eq(S.segment(10, 3).length, 4));
    t.test('sliceBytes cuts by byte offsets', () => t.eq(S.sliceBytes('abcdef', 2, 3), 'cde'));
    t.test('sliceBytes past the end returns the remainder', () => t.eq(S.sliceBytes('abc', 2, 10), 'c'));
  });

  t.suite('httpsim · full exchange per figure', () => {
    NAMES.forEach((name) => {
      t.test(`${name}: split into ceil(bytes / MSS) segments that reassemble exactly`, () => {
        const ex = S.buildExchange({ command: 'GET', figure: name }, FIGS);
        t.eq(ex.segments, Math.ceil(ex.responseBytes / S.MSS), 'segment count');
        const back = dataPackets(ex).filter((s) => s.packet.dir === 's2c').map((s) => s.packet.payload).join('');
        t.eq(back, ex.responseRaw, 'reassembled response');
      });
    });
  });

  t.suite('httpsim · TCP behaviour of one exchange', () => {
    const ex = S.buildExchange({ command: 'GET', figure: 'charizard' }, FIGS);
    const packets = ex.steps.filter((s) => s.packet).map((s) => s.packet);
    const flags = packets.map((p) => p.tcp.flags.join('-'));
    t.test('opens with the three-way handshake SYN, SYN-ACK, ACK', () => t.deepEq(flags.slice(0, 3), ['SYN', 'SYN-ACK', 'ACK']));
    t.test('SYN carries the client ISN and no ack', () => { t.eq(packets[0].tcp.seq, S.CLIENT_ISN); t.eq(packets[0].tcp.ack, null); });
    t.test('SYN-ACK acknowledges ISN + 1', () => t.eq(packets[1].tcp.ack, S.CLIENT_ISN + 1));
    t.test('final handshake ACK acknowledges the server ISN + 1', () => t.eq(packets[2].tcp.ack, S.SERVER_ISN + 1));
    t.test('request segment carries exactly the request bytes', () => t.eq(packets[3].tcp.len, ex.requestBytes));
    t.test('request segment uses PSH and ACK', () => t.eq(flags[3], 'PSH-ACK'));
    t.test('first response segment starts at server ISN + 1', () => t.eq(packets[4].tcp.seq, S.SERVER_ISN + 1));
    t.test('response acknowledges the whole request', () => t.eq(packets[4].tcp.ack, S.CLIENT_ISN + 1 + ex.requestBytes));
    t.test('response segment seq numbers are contiguous', () => {
      const res = packets.filter((p) => p.dir === 's2c' && p.payload);
      res.slice(1).forEach((p, i) => t.eq(p.tcp.seq, res[i].tcp.seq + res[i].tcp.len));
    });
    t.test('no segment carries more than the MSS', () => packets.forEach((p) => t.ok(p.tcp.len <= S.MSS)));
    t.test('client ACK covers every response byte', () => {
      const ack = packets[4 + ex.segments];
      t.eq(ack.tcp.flags.join('-'), 'ACK'); t.eq(ack.tcp.ack, S.SERVER_ISN + 1 + ex.responseBytes);
    });
    t.test('the server closes first (FIN from the server)', () => {
      const fin = packets.find((p) => p.tcp.flags.includes('FIN'));
      t.eq(fin.dir, 's2c');
    });
    t.test('teardown is FIN, FIN-ACK, ACK', () => t.deepEq(flags.slice(-3), ['FIN-ACK', 'FIN-ACK', 'ACK']));
    t.test('client packets go client → server and vice versa', () => {
      packets.forEach((p) => t.ok(p.dir === 'c2s' ? p.tcp.dst.endsWith(':1234') : p.tcp.src.endsWith(':1234')));
    });
    t.test('client TCP state goes SYN_SENT → ESTABLISHED → CLOSED', () => {
      const states = ex.steps.map((s) => s.client);
      t.ok(states.indexOf('SYN_SENT') < states.indexOf('ESTABLISHED'));
      t.eq(states[states.length - 1], 'CLOSED');
    });
    t.test('server connection ends in TIME_WAIT because it closed first', () => t.eq(ex.steps[ex.steps.length - 1].server, 'TIME_WAIT'));
    t.test('phases appear in order open → request → server → response → close', () => {
      const order = ['ready', 'open', 'request', 'server', 'response', 'close'];
      const seen = ex.steps.map((s) => order.indexOf(s.phase));
      // "server" work happens twice (new thread, then lookup) but never after the response starts
      t.ok(seen.indexOf(4) > seen.lastIndexOf(3));
      t.eq(seen[seen.length - 1], 5);
    });
    t.test('one thread per client is created after accept()', () => t.ok(ex.steps[ex.steps.length - 1].log.some((l) => l.includes('std::thread(task, client)'))));
    t.test('the worker thread ends after Close()', () => t.eq(ex.steps[ex.steps.length - 1].threads[1].state, 'terminado'));
    t.test('the client screen ends showing the figure', () => t.includes(ex.steps[ex.steps.length - 1].screen, FIGS.charizard.trim().slice(0, 40)));
    t.test('every step has a title and an explanation without "undefined"', () => ex.steps.forEach((s) => { t.ok(s.title && s.note); t.notIncludes(s.note, 'undefined'); }));
    t.test('preview steps show the message before it is sent', () => t.eq(ex.steps.filter((s) => s.preview).length, 2));
  });

  t.suite('httpsim · other scenarios', () => {
    t.test('LIST exchange shows the list on the client screen', () => {
      const ex = S.buildExchange({ command: 'LIST' }, FIGS);
      t.includes(ex.steps[ex.steps.length - 1].screen, 'Figures stored on disk:');
    });
    t.test('missing figure exchange ends with "Figure not found" on screen', () => {
      const ex = S.buildExchange({ command: 'GET', figure: 'unicornio' }, FIGS);
      t.includes(ex.steps[ex.steps.length - 1].screen, 'Figure not found');
    });
    t.test('POST exchange has a "Rechaza" step and status 400', () => {
      const ex = S.buildExchange({ command: 'GET', figure: 'batman', method: 'POST' }, FIGS);
      t.eq(ex.response.status, 400); t.ok(ex.steps.some((s) => s.title === 'Rechaza'));
    });
    t.test('small responses fit in one segment and take 15 steps', () => {
      const ex = S.buildExchange({ command: 'GET', figure: 'batman' }, FIGS);
      t.eq(ex.segments, 1); t.eq(ex.steps.length, 15);
    });
    t.test('a smaller MSS creates more segments', () => {
      t.ok(S.buildExchange({ command: 'GET', figure: 'batman', mss: 100 }, FIGS).segments > 1);
    });
    t.test('the thread number can be chosen', () => {
      const ex = S.buildExchange({ command: 'GET', figure: 'batman', thread: 7 }, FIGS);
      t.ok(ex.steps[ex.steps.length - 1].log.some((l) => l.includes('hilo #7')));
    });
  });
};
