// Networking station UI (web/js/modules/networking.js) on a fake DOM.
'use strict';

module.exports = (t, { createEnv }) => {
  const fresh = (setup) => {
    const env = createEnv();
    env.load('js/modules/figuresData.js');
    env.load('js/tracer.js');
    env.load('js/modules/httpsim.js');
    env.load('js/modules/networking.js');
    const $ = (id) => env.document.getElementById(id);
    $('netCommand').value = 'GET';
    if (setup) setup($);
    const stn = env.window.networkingStation;
    stn.init();
    return { env, stn, $ };
  };

  t.suite('networking · station UI', () => {
    t.test('starts with a GET for batman ready to play', () => {
      const { stn } = fresh();
      t.eq(stn.exchange.response.route, 'figure'); t.eq(stn.exchange.response.figure, 'batman'); t.eq(stn.idx, 0);
    });
    t.test('the figure picker lists every figure plus one that does not exist', () => {
      const { stn, $ } = fresh();
      stn.figures.forEach((f) => t.includes($('netFigure').innerHTML, `value="${f}"`));
      t.includes($('netFigure').innerHTML, 'unicornio');
    });
    t.test('the server disk shows every stored figure', () => { const { stn, $ } = fresh(); t.eq(($('netFiles').innerHTML.match(/net-file/g) || []).length, stn.figures.length); });
    t.test('the timeline has one dot per step after the starting state', () => { const { stn, $ } = fresh(); t.eq(($('netTimeline').innerHTML.match(/class="net-dot"/g) || []).length, stn.exchange.steps.filter((s) => s.phase !== 'ready').length); });
    t.test('the counter shows the current step', () => { const { stn, $ } = fresh(); stn.go(3); t.eq($('netCount').textContent, `4 / ${stn.exchange.steps.length}`); });
    t.test('go() never leaves the range of steps', () => { const { stn } = fresh(); stn.go(999); t.eq(stn.idx, stn.exchange.steps.length - 1); stn.go(-3); t.eq(stn.idx, 0); });
    t.test('next() and prev() move one step', () => { const { stn } = fresh(); stn.next(); stn.next(); stn.prev(); t.eq(stn.idx, 1); });
    t.test('TCP states of both machines are displayed', () => {
      const { stn, $ } = fresh(); stn.go(3);
      t.eq($('netClientState').textContent, 'ESTABLISHED'); t.eq($('netServerState').textContent, 'ESTABLISHED');
    });
    t.test('the packet is shown on steps that send something', () => { const { stn, $ } = fresh(); stn.go(1); t.eq($('netPacket').hidden, false); t.eq($('netPacketLabel').textContent, 'SYN'); });
    t.test('the packet is hidden while a machine is just working', () => { const { stn, $ } = fresh(); stn.go(4); t.eq($('netPacket').hidden, true); });
    t.test('the inspector lists TCP flags for each packet', () => { const { stn, $ } = fresh(); stn.go(2); t.includes($('netTcp').innerHTML, 'f-SYN'); t.includes($('netTcp').innerHTML, 'f-ACK'); });
    t.test('the inspector colours the HTTP request parts', () => {
      const { stn, $ } = fresh(); stn.go(stn.exchange.steps.findIndex((s) => s.packet && s.packet.kind === 'request'));
      const h = $('netHttp').innerHTML; t.includes(h, 'h-start'); t.includes(h, 'h-head'); t.includes(h, '\\r\\n');
    });
    t.test('continuation segments are shown as pure body', () => { const { stn } = fresh(); const h = stn.anatomy('abc', true); t.includes(h, 'h-body'); t.notIncludes(h, 'h-start'); });
    t.test('choosing LIST builds a LIST exchange', () => { const { stn } = fresh(($) => { $('netCommand').value = 'LIST'; }); t.eq(stn.exchange.response.route, 'list'); });
    t.test('choosing POST makes the server answer 400', () => {
      const { stn, $ } = fresh();
      $('netMethod').dispatch('click', { target: { closest: () => ({ dataset: { method: 'POST' } }) } });
      t.eq(stn.exchange.response.status, 400);
    });
    t.test('sending a request starts playback; stop() halts it', () => {
      const { stn, $ } = fresh(); $('netRequestForm').dispatch('submit'); t.ok(stn.timer !== null); stn.stop(); t.eq(stn.timer, null);
    });
  });
};
