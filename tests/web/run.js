#!/usr/bin/env node
// CS Interactive Lab - Web test runner.
// Usage: node tests/web/run.js [--verbose] [--filter <text>]
'use strict';
const fs = require('fs');
const path = require('path');
const { createHarness } = require('./js/harness');
const helpers = require('./js/env');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const fi = args.indexOf('--filter');
const filter = fi !== -1 ? args[fi + 1] || '' : '';

const h = createHarness();
const dir = path.join(__dirname, 'js', 'suites');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort();
files.forEach((f) => require(path.join(dir, f))(h, helpers));

console.log('\n======================================================================');
console.log('   TEST SUITE: Web Lab (JavaScript modules, HTML and CSS)');
console.log('======================================================================');

h.run({ filter, verbose }).then(({ total, passed, failed }) => {
  console.log('----------------------------------------------------------------------');
  console.log(`Summary: ${passed}/${total} passed (${failed} failed)`);
  console.log('======================================================================\n');
  process.exit(failed ? 1 : 0);
});
