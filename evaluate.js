#!/usr/bin/env node
// evaluate.js — Fixed evaluation harness for GSP autoresearch.
//
// Usage:
//   node evaluate.js
//   node evaluate.js --verbose
//   node evaluate.js --puzzle level20
//   HYPOTHESIS="my hypothesis" node evaluate.js
//
// This file must NEVER be modified by the autoresearch agent.

'use strict';

const fs   = require('fs');
const path = require('path');
const { parseGenome } = require('./gameEngine');
const { solve } = require('./solver');

// ---------------------------------------------------------------------------
// Constants — must never change between experiments
// ---------------------------------------------------------------------------
const MAX_MOVES_BUDGET = 150;
const BENCHMARK_PATH   = path.join(__dirname, 'benchmark', 'puzzles.json');
const RESULTS_PATH     = path.join(__dirname, 'results.tsv');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args        = process.argv.slice(2);
const VERBOSE     = args.includes('--verbose');
const puzzleArg   = (() => { const i = args.indexOf('--puzzle'); return i >= 0 ? args[i + 1] : null; })();
const HYPOTHESIS  = process.env.HYPOTHESIS || 'no-hypothesis';

// ---------------------------------------------------------------------------
// Read solver version from solver.js comment
// ---------------------------------------------------------------------------
function readSolverVersion() {
  try {
    const src = fs.readFileSync(path.join(__dirname, 'solver.js'), 'utf8');
    const m = src.match(/^\/\/\s*@version\s+(\S+)/m);
    return m ? m[1] : 'unknown';
  } catch (_) {
    return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Evaluate one puzzle
// ---------------------------------------------------------------------------
function evaluatePuzzle(puzzle) {
  const mutableGenome = parseGenome(puzzle.mutable.join(','));
  const targetGenome  = parseGenome(puzzle.target.join(','));

  const start    = Date.now();
  const result   = solve(mutableGenome, targetGenome, { maxMoves: MAX_MOVES_BUDGET });
  const elapsed  = Date.now() - start;

  const ratio = puzzle.knownBestScore > 0
    ? (result.moveCount / puzzle.knownBestScore)
    : null;

  return {
    id:             puzzle.id,
    source:         puzzle.source,
    category:       puzzle.category,
    solved:         result.solved,
    moveCount:      result.moveCount,
    knownBestScore: puzzle.knownBestScore,
    baselineScore:  puzzle.baselineScore,
    ratio:          ratio,
    elapsedMs:      elapsed,
    moves:          result.moves   // only used in verbose mode
  };
}

// ---------------------------------------------------------------------------
// Aggregate metrics
// ---------------------------------------------------------------------------
function computeMetrics(results) {
  const solved = results.filter(r => r.solved);

  function avgRatioFor(subset) {
    if (subset.length === 0) return null;
    const vals = subset.map(r => r.ratio).filter(v => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const synthetic  = solved.filter(r => r.source === 'synthetic');
  const real       = solved.filter(r => r.source === 'real');
  const optimal    = solved.filter(r => r.ratio !== null && r.ratio <= 1.0);

  return {
    solvedCount:        solved.length,
    totalCount:         results.length,
    avgRatio:           avgRatioFor(solved),
    avgRatioSynthetic:  avgRatioFor(synthetic),
    avgRatioReal:       avgRatioFor(real),
    optimalCount:       optimal.length
  };
}

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------
function fmt(n, decimals = 2) {
  return n === null ? '  N/A' : n.toFixed(decimals);
}

function printResults(results, metrics, solverVersion) {
  const sep = '─'.repeat(78);
  console.log('\n' + sep);
  console.log('  GSP Autoresearch Evaluation');
  console.log('  Timestamp  : ' + new Date().toISOString());
  console.log('  Hypothesis : ' + HYPOTHESIS);
  console.log('  Solver     : ' + solverVersion);
  console.log(sep);
  console.log('');

  const colW = 36;
  for (const r of results) {
    const tag    = r.solved ? 'SOLVED' : 'STUCK ';
    const opt    = r.solved && r.ratio !== null && r.ratio <= 1.0 ? ' *OPTIMAL*' : '';
    const cats   = r.category.join(', ');
    const idPad  = r.id.slice(0, colW).padEnd(colW);
    const ratioS = r.ratio !== null ? fmt(r.ratio) : ' N/A ';
    console.log(
      `  ${idPad} [${tag}]  moves=${String(r.moveCount).padStart(3)}  ` +
      `best=${String(r.knownBestScore).padStart(3)}  ratio=${ratioS}${opt}`
    );
    if (VERBOSE) {
      console.log(`    categories: ${cats}`);
      if (r.moves && r.moves.length > 0) {
        console.log(`    moves: ${JSON.stringify(r.moves)}`);
      }
    }
  }

  console.log('');
  console.log(sep);
  console.log('  Summary');
  console.log(sep);
  console.log(`  Solved          : ${metrics.solvedCount} / ${metrics.totalCount}`);
  console.log(`  Optimal         : ${metrics.optimalCount} / ${metrics.totalCount}`);
  console.log(`  Avg ratio       : ${fmt(metrics.avgRatio)}`);
  console.log(`  Avg ratio (syn) : ${fmt(metrics.avgRatioSynthetic)}`);
  console.log(`  Avg ratio (real): ${fmt(metrics.avgRatioReal)}`);
  console.log(sep + '\n');
}

// ---------------------------------------------------------------------------
// TSV logging (append-only)
// ---------------------------------------------------------------------------
function appendTSV(results, metrics, solverVersion) {
  const perPuzzle = results.map(r =>
    `${r.id}:${r.solved ? r.ratio !== null ? r.ratio.toFixed(3) : 'NA' : 'STUCK'}`
  ).join(';');

  const row = [
    new Date().toISOString(),
    HYPOTHESIS,
    solverVersion,
    metrics.solvedCount,
    metrics.avgRatio !== null ? metrics.avgRatio.toFixed(4) : 'NA',
    metrics.avgRatioSynthetic !== null ? metrics.avgRatioSynthetic.toFixed(4) : 'NA',
    metrics.avgRatioReal !== null ? metrics.avgRatioReal.toFixed(4) : 'NA',
    metrics.optimalCount,
    perPuzzle
  ].join('\t');

  const header = [
    'timestamp', 'hypothesis', 'solver_version',
    'solved_count', 'avg_ratio', 'avg_ratio_synthetic', 'avg_ratio_real',
    'optimal_count', 'per_puzzle_ratios'
  ].join('\t');

  let content = '';
  if (!fs.existsSync(RESULTS_PATH)) {
    content = header + '\n';
  }
  content += row + '\n';
  fs.appendFileSync(RESULTS_PATH, content);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const benchmark = JSON.parse(fs.readFileSync(BENCHMARK_PATH, 'utf8'));
  const solverVersion = readSolverVersion();

  const puzzles = puzzleArg
    ? benchmark.filter(p => p.id === puzzleArg)
    : benchmark;

  if (puzzles.length === 0) {
    console.error(`No puzzle found with id: ${puzzleArg}`);
    process.exit(1);
  }

  const results = puzzles.map(p => {
    process.stdout.write(`  Running ${p.id}...`);
    const r = evaluatePuzzle(p);
    process.stdout.write(` ${r.solved ? 'SOLVED' : 'STUCK'} (${r.moveCount} moves, ${r.elapsedMs}ms)\n`);
    return r;
  });

  const metrics = computeMetrics(results);
  printResults(results, metrics, solverVersion);

  // Only append to TSV on full benchmark runs (not single-puzzle mode)
  if (!puzzleArg) {
    appendTSV(results, metrics, solverVersion);
    console.log(`  Results appended to ${RESULTS_PATH}\n`);
  }
}

main();
