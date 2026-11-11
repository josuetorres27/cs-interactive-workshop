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
    const lab = env.window.networkingStation;
    lab.init();
    return { env, lab, $ };
  };

  t.suite('networking · station UI', () => {
    t.test('starts with a GET for batman ready to play', () => {
      const { lab } = fresh();
      t.eq(lab.exchange.response.route, 'figure'); t.eq(lab.exchange.response.figure, 'batman'); t.eq(lab.idx, 0);
    });
    t.test('the figure picker lists every figure plus one that does not exist', () => {
      const { lab, $ } = fresh();
      lab.figures.forEach((f) => t.includes($('netFigure').innerHTML, `value="${f}"`));
      t.includes($('netFigure').innerHTML, 'unicornio');
    });
    t.test('the server disk shows every stored figure', () => { const { lab, $ } = fresh(); t.eq(($('netFiles').innerHTML.match(/net-file/g) || []).length, lab.figures.length); });
    t.test('the timeline has one dot per step after the starting state', () => { const { lab, $ } = fresh(); t.eq(($('netTimeline').innerHTML.match(/class="net-dot"/g) || []).length, lab.exchange.steps.filter((s) => s.phase !== 'ready').length); });
    t.test('the counter shows the current step', () => { const { lab, $ } = fresh(); lab.go(3); t.eq($('netCount').textContent, `4 / ${lab.exchange.steps.length}`); });
    t.test('go() never leaves the range of steps', () => { const { lab } = fresh(); lab.go(999); t.eq(lab.idx, lab.exchange.steps.length - 1); lab.go(-3); t.eq(lab.idx, 0); });
    t.test('next() and prev() move one step', () => { const { lab } = fresh(); lab.next(); lab.next(); lab.prev(); t.eq(lab.idx, 1); });
    t.test('TCP states of both machines are displayed', () => {
      const { lab, $ } = fresh(); lab.go(3);
      t.eq($('netClientState').textContent, 'ESTABLISHED'); t.eq($('netServerState').textContent, 'ESTABLISHED');
    });
    t.test('the packet is shown on steps that send something', () => { const { lab, $ } = fresh(); lab.go(1); t.eq($('netPacket').hidden, false); t.eq($('netPacketLabel').textContent, 'SYN'); });
    t.test('the packet is hidden while a machine is just working', () => { const { lab, $ } = fresh(); lab.go(4); t.eq($('netPacket').hidden, true); });
    t.test('the inspector lists TCP flags for each packet', () => { const { lab, $ } = fresh(); lab.go(2); t.includes($('netTcp').innerHTML, 'f-SYN'); t.includes($('netTcp').innerHTML, 'f-ACK'); });
    t.test('the inspector colours the HTTP request parts', () => {
      const { lab, $ } = fresh(); lab.go(lab.exchange.steps.findIndex((s) => s.packet && s.packet.kind === 'request'));
      const h = $('netHttp').innerHTML; t.includes(h, 'h-start'); t.includes(h, 'h-head'); t.includes(h, '\\r\\n');
    });
    t.test('continuation segments are shown as pure body', () => { const { lab } = fresh(); const h = lab.anatomy('abc', true); t.includes(h, 'h-body'); t.notIncludes(h, 'h-start'); });
    t.test('choosing LIST builds a LIST exchange', () => { const { lab } = fresh(($) => { $('netCommand').value = 'LIST'; }); t.eq(lab.exchange.response.route, 'list'); });
    t.test('choosing POST makes the server answer 400', () => {
      const { lab, $ } = fresh();
      $('netMethod').dispatch('click', { target: { closest: () => ({ dataset: { method: 'POST' } }) } });
      t.eq(lab.exchange.response.status, 400);
    });
    t.test('sending a request starts playback; stop() halts it', () => {
      const { lab, $ } = fresh(); $('netRequestForm').dispatch('submit'); t.ok(lab.timer !== null); lab.stop(); t.eq(lab.timer, null);
    });
  });
};
