// Tiny, dependency-free test harness for the web workshop (Node).
'use strict';

class AssertionError extends Error {}

function fmt(v) {
  let s;
  try { s = JSON.stringify(v); } catch (e) { s = String(v); }
  if (s === undefined) s = String(v);
  return s.length > 240 ? `${s.slice(0, 240)}… (${s.length} chars)` : s;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return Number.isNaN(a) && Number.isNaN(b);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

function createHarness() {
  const tests = [];
  let currentSuite = '';

  const api = {
    suite(name, fn) { const prev = currentSuite; currentSuite = name; fn(); currentSuite = prev; },
    test(name, fn) { tests.push({ suite: currentSuite, name, fn }); },

    ok(cond, msg = 'expected condition to be true') { if (!cond) throw new AssertionError(msg); },
    eq(actual, expected, msg = '') {
      if (actual !== expected) throw new AssertionError(`${msg ? msg + ': ' : ''}expected ${fmt(expected)}, got ${fmt(actual)}`);
    },
    deepEq(actual, expected, msg = '') {
      if (!deepEqual(actual, expected)) throw new AssertionError(`${msg ? msg + ': ' : ''}expected ${fmt(expected)}, got ${fmt(actual)}`);
    },
    near(actual, expected, eps = 1e-9, msg = '') {
      if (Math.abs(actual - expected) > eps) throw new AssertionError(`${msg ? msg + ': ' : ''}expected ≈${expected}, got ${actual}`);
    },
    includes(haystack, needle, msg = '') {
      if (!String(haystack).includes(needle)) throw new AssertionError(`${msg ? msg + ': ' : ''}expected to contain ${fmt(needle)}`);
    },
    notIncludes(haystack, needle, msg = '') {
      if (String(haystack).includes(needle)) throw new AssertionError(`${msg ? msg + ': ' : ''}expected NOT to contain ${fmt(needle)}`);
    },
    throws(fn, pattern, msg = '') {
      let threw = false;
      try { fn(); } catch (e) {
        threw = true;
        if (pattern && !pattern.test(e.message)) throw new AssertionError(`${msg ? msg + ': ' : ''}error "${e.message}" does not match ${pattern}`);
      }
      if (!threw) throw new AssertionError(`${msg ? msg + ': ' : ''}expected a thrown error`);
    },

    async run({ filter = '', verbose = false } = {}) {
      const selected = tests.filter((t) => `${t.suite} ${t.name}`.toLowerCase().includes(filter.toLowerCase()));
      const failures = [];
      let lastSuite = null;
      for (const t of selected) {
        if (t.suite !== lastSuite) { console.log(`\n  ${t.suite}`); lastSuite = t.suite; }
        try {
          await t.fn();
          if (verbose) console.log(`    [PASS] ${t.name}`);
        } catch (e) {
          failures.push({ t, e });
          console.log(`    [FAIL] ${t.name}\n           ${e && e.message ? e.message : e}`);
        }
      }
      if (!verbose) console.log('');
      return { total: selected.length, failed: failures.length, passed: selected.length - failures.length, failures };
    }
  };
  return api;
}

module.exports = { createHarness, deepEqual, AssertionError };
