#!/usr/bin/env node
// checkBenchmark.js — One-time engine validator.
//
// Run once after setup: node benchmark/validation/checkBenchmark.js
//
// Checks:
//   1. Unit tests for each engine operation (with known expected results)
//   2. Benchmark integrity (every puzzle has [t], arrays are valid)
//   3. Cross-operation consistency tests
//
// If all pass you will see "ALL CHECKS PASSED". Any failure exits with code 1.

'use strict';

const path = require('path');
const {
  parseGenome,
  serializeGenome,
  genomesEqual,
  cloneGenome,
  applyInversion,
  applyDeletion,
  applyDuplication,
  validateOperation
} = require(path.join(__dirname, '../../gameEngine'));

let passed = 0;
let failed = 0;

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function assertThrows(label, fn) {
  try {
    fn();
    console.error(`  ✗ FAIL: ${label} — expected an error but none was thrown`);
    failed++;
  } catch (e) {
    console.log(`  ✓ ${label} (threw: ${e.message.slice(0, 60)})`);
    passed++;
  }
}

function section(title) {
  console.log(`\n--- ${title} ---`);
}

// ---------------------------------------------------------------------------
// 1. parseGenome
// ---------------------------------------------------------------------------
section('parseGenome');

const g1 = parseGenome('Lys,Met,[t],Gln,Gly');
assert('parse 5-gene genome', g1.genes.length === 5, `got ${g1.genes.length}`);
assert('terminus at index 2', g1.terminusIndex === 2);
assert('[o] is stripped', !g1.genes.includes('[o]'));

const g1o = parseGenome('[o], Lys, Met, [t], Gln');
assert('[o] stripped from real-format sequence', !g1o.genes.includes('[o]'));
assert('terminus found after [o] strip', g1o.terminusIndex === 2);

assertThrows('no terminus throws', () => parseGenome('Lys,Met,Gln'));
assertThrows('double terminus throws', () => parseGenome('Lys,[t],Met,[t]'));

// ---------------------------------------------------------------------------
// 2. applyInversion
// ---------------------------------------------------------------------------
section('applyInversion');

// Basic inversion of whole genome
const inv1 = applyInversion(g1, 0, 5);
assert('full inversion reverses genes', serializeGenome(inv1) === 'Gly,Gln,[t],Met,Lys');
assert('terminus index updated after inversion', inv1.terminusIndex === 2);

// Inversion of just [t]+one neighbour (minimum valid)
const g2 = parseGenome('Ala,Bla,[t],Cla,Dla');
const inv2 = applyInversion(g2, 1, 3); // [Bla,[t],Cla] → [Cla,[t],Bla]
assert('small inversion: Bla,[t],Cla → Cla,[t],Bla',
  serializeGenome(inv2) === 'Ala,Cla,[t],Bla,Dla');
assert('terminus still at correct position after small inversion', inv2.terminusIndex === 2);

// Self-inverse property: applying same inversion twice restores original
const inv1b = applyInversion(inv1, 0, 5);
assert('inversion is self-inverse', genomesEqual(inv1b, g1));

// Inversion that does NOT include [t] must throw
assertThrows('inversion without [t] throws', () => applyInversion(g1, 0, 2));
assertThrows('inversion without [t] (right side) throws', () => applyInversion(g1, 3, 2));

// Out-of-bounds
assertThrows('inversion out of bounds throws', () => applyInversion(g1, 0, 10));

// ---------------------------------------------------------------------------
// 3. applyDeletion
// ---------------------------------------------------------------------------
section('applyDeletion');

const del1 = applyDeletion(g1, 0, 1); // delete 'Lys'
assert('delete first gene', serializeGenome(del1) === 'Met,[t],Gln,Gly');
assert('terminus index decrements after left deletion', del1.terminusIndex === 1);

const del2 = applyDeletion(g1, 3, 2); // delete 'Gln,Gly'
assert('delete last two genes', serializeGenome(del2) === 'Lys,Met,[t]');
assert('terminus unchanged after right deletion', del2.terminusIndex === 2);

const del3 = applyDeletion(g1, 1, 1); // delete 'Met'
assert('delete gene before [t]', serializeGenome(del3) === 'Lys,[t],Gln,Gly');
assert('terminus decrements by 1', del3.terminusIndex === 1);

assertThrows('deletion of [t] throws', () => applyDeletion(g1, 2, 1));
assertThrows('deletion spanning [t] throws', () => applyDeletion(g1, 1, 3));
assertThrows('deletion out of bounds throws', () => applyDeletion(g1, 3, 5));

// ---------------------------------------------------------------------------
// 4. applyDuplication (same-side, no reversal)
// ---------------------------------------------------------------------------
section('applyDuplication — same side');

// Source on left, dest on left → no reversal
const dup1 = applyDuplication(g1, 0, 1, 1); // dup 'Lys' before 'Met'
assert('same-side dup inserts copy without reversal',
  serializeGenome(dup1) === 'Lys,Lys,Met,[t],Gln,Gly');
assert('terminus shifts right after left insertion', dup1.terminusIndex === 3);

// Source on right, dest on right → no reversal
const dup2 = applyDuplication(g1, 3, 1, 5); // dup 'Gln' at end
assert('same-side right dup: Gln appended',
  serializeGenome(dup2) === 'Lys,Met,[t],Gln,Gly,Gln');
assert('terminus unchanged after right-side insertion', dup2.terminusIndex === 2);

// ---------------------------------------------------------------------------
// 5. applyDuplication (cross-terminus, with reversal)
// ---------------------------------------------------------------------------
section('applyDuplication — cross-terminus reversal');

// Source 'Lys,Met' (left), dest on right (after [t]) → reversed to 'Met,Lys'
const dup3 = applyDuplication(g1, 0, 2, 3); // insert after [t]
// genes: Lys,Met,[t],_insert_,Gln,Gly
// segment 'Lys,Met' cross-terminus → reversed 'Met,Lys'
assert('cross-terminus dup reverses segment',
  serializeGenome(dup3) === 'Lys,Met,[t],Met,Lys,Gln,Gly');
assert('terminus index unchanged for cross-right insertion', dup3.terminusIndex === 2);

// Source on right, dest on left → also reversed
const g3 = parseGenome('Aa,Bb,[t],Cc,Dd,Ee');
const dup4 = applyDuplication(g3, 3, 2, 0); // dup 'Cc,Dd' to before 'Aa' → reversed 'Dd,Cc'
assert('cross-terminus right-to-left dup reverses',
  serializeGenome(dup4) === 'Dd,Cc,Aa,Bb,[t],Cc,Dd,Ee');
assert('terminus shifts right after left insertion in cross-dup', dup4.terminusIndex === 4);

assertThrows('duplication of [t] throws', () => applyDuplication(g1, 1, 2, 4)); // src spans [t]
assertThrows('duplication dest out of bounds throws', () => applyDuplication(g1, 0, 1, 10));

// ---------------------------------------------------------------------------
// 6. validateOperation
// ---------------------------------------------------------------------------
section('validateOperation');

const vOk  = validateOperation(g1, { type: 'inversion', start: 0, length: 5 });
assert('validateOperation: valid inversion', vOk.valid);

const vBad = validateOperation(g1, { type: 'inversion', start: 0, length: 2 });
assert('validateOperation: invalid inversion (no [t])', !vBad.valid && vBad.reason.length > 0);

const vDel = validateOperation(g1, { type: 'deletion', start: 0, length: 1 });
assert('validateOperation: valid deletion', vDel.valid);

const vUnk = validateOperation(g1, { type: 'zap', start: 0, length: 1 });
assert('validateOperation: unknown op returns invalid', !vUnk.valid);

// ---------------------------------------------------------------------------
// 7. Benchmark integrity
// ---------------------------------------------------------------------------
section('Benchmark integrity');

const benchmark = JSON.parse(
  require('fs').readFileSync(path.join(__dirname, '../puzzles.json'), 'utf8')
);

assert('benchmark has 8 puzzles', benchmark.length === 8, `got ${benchmark.length}`);

for (const puzzle of benchmark) {
  const tInTarget  = puzzle.target.includes('[t]');
  const tInMutable = puzzle.mutable.includes('[t]');
  assert(`${puzzle.id}: target has [t]`,  tInTarget);
  assert(`${puzzle.id}: mutable has [t]`, tInMutable);

  try {
    const t = parseGenome(puzzle.target.join(','));
    const m = parseGenome(puzzle.mutable.join(','));
    assert(`${puzzle.id}: target parses cleanly`,  t.terminusIndex >= 0);
    assert(`${puzzle.id}: mutable parses cleanly`, m.terminusIndex >= 0);
  } catch (e) {
    assert(`${puzzle.id}: parse error: ${e.message}`, false);
  }

  assert(`${puzzle.id}: knownBestScore > 0`, puzzle.knownBestScore > 0);
  assert(`${puzzle.id}: id is a string`, typeof puzzle.id === 'string' && puzzle.id.length > 0);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('ALL CHECKS PASSED — engine is ready for research.\n');
} else {
  console.error(`${failed} CHECK(S) FAILED — fix engine before starting research.\n`);
  process.exit(1);
}
