#!/usr/bin/env node
// evaluate_dataset.js - Generic dataset evaluator for Phase 2 research.
//
// Usage:
//   node evaluate_dataset.js
//   node evaluate_dataset.js --manifest benchmark/phase2_dev.json
//   node evaluate_dataset.js --manifest benchmark/phase2_holdout.json
//   node evaluate_dataset.js --manifest benchmark/phase2_dev.json --puzzle level30
//   HYPOTHESIS="my hypothesis" node evaluate_dataset.js --manifest benchmark/phase2_dev.json
//
// This file is read-only during solver research. Only solver.js should evolve.

'use strict';

const fs = require('fs');
const path = require('path');
const { parseGenome } = require('./gameEngine');
const { solve } = require('./solver');

const MAX_MOVES_BUDGET = 150;
const BENCHMARK_PATH = path.join(__dirname, 'benchmark', 'puzzles.json');
const DEFAULT_MANIFEST_PATH = path.join(__dirname, 'benchmark', 'phase2_dev.json');
const DEFAULT_RESULTS_PATH = path.join(__dirname, 'results_phase2.tsv');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const NO_LOG = args.includes('--no-log');
const puzzleArg = getArgValue('--puzzle');
const manifestArg = getArgValue('--manifest');
const HYPOTHESIS = process.env.HYPOTHESIS || 'no-hypothesis';

function getArgValue(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function readSolverVersion() {
  try {
    const src = fs.readFileSync(path.join(__dirname, 'solver.js'), 'utf8');
    const match = src.match(/^\/\/\s*@version\s+(\S+)/m);
    return match ? match[1] : 'unknown';
  } catch (_) {
    return 'unknown';
  }
}

function normalizeSectionKey(text) {
  return text.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseMarkdownSections(markdown) {
  const sections = new Map();
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let currentKey = null;
  let buffer = [];

  function flush() {
    if (!currentKey) return;
    while (buffer.length > 0 && buffer[0].trim() === '') {
      buffer.shift();
    }
    while (buffer.length > 0 && buffer[buffer.length - 1].trim() === '') {
      buffer.pop();
    }
    sections.set(currentKey, buffer.join('\n').trim());
  }

  for (const line of lines) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) {
      flush();
      currentKey = normalizeSectionKey(match[1]);
      buffer = [];
      continue;
    }
    if (currentKey) {
      buffer.push(line);
    }
  }

  flush();
  return sections;
}

function parseGeneList(csvText) {
  return csvText
    .split(',')
    .map(token => token.trim())
    .filter(token => token.length > 0);
}

function resolveManifestPath() {
  return manifestArg
    ? path.resolve(__dirname, manifestArg)
    : DEFAULT_MANIFEST_PATH;
}

function loadBenchmarkMap() {
  const benchmark = JSON.parse(fs.readFileSync(BENCHMARK_PATH, 'utf8'));
  return new Map(benchmark.map(puzzle => [puzzle.id, puzzle]));
}

function loadMarkdownPuzzle(entry) {
  const puzzlePath = path.resolve(__dirname, entry.path);
  const markdown = fs.readFileSync(puzzlePath, 'utf8');
  const sections = parseMarkdownSections(markdown);
  const targetText = sections.get('target') || sections.get('target_genome');
  const mutableText = sections.get('mutable') || sections.get('mutable_genome');

  if (!targetText || !mutableText) {
    throw new Error(`Markdown puzzle is missing target or mutable sections: ${entry.path}`);
  }

  return {
    id: entry.id,
    source: entry.source,
    category: entry.category || [],
    referenceScore: entry.referenceScore,
    referenceScoreSource: entry.referenceScoreSource || 'manifest',
    baselineScore: entry.baselineScore || null,
    target: parseGeneList(targetText),
    mutable: parseGeneList(mutableText)
  };
}

function loadPuzzle(entry, benchmarkMap) {
  if (entry.kind === 'benchmark') {
    const benchmarkPuzzle = benchmarkMap.get(entry.id);
    if (!benchmarkPuzzle) {
      throw new Error(`Benchmark puzzle not found: ${entry.id}`);
    }

    return {
      id: benchmarkPuzzle.id,
      source: benchmarkPuzzle.source,
      category: benchmarkPuzzle.category,
      referenceScore: benchmarkPuzzle.knownBestScore,
      referenceScoreSource: 'knownBestScore',
      baselineScore: benchmarkPuzzle.baselineScore,
      target: benchmarkPuzzle.target,
      mutable: benchmarkPuzzle.mutable
    };
  }

  if (entry.kind === 'markdown') {
    return loadMarkdownPuzzle(entry);
  }

  throw new Error(`Unsupported manifest entry kind: ${entry.kind}`);
}

function evaluatePuzzle(puzzle) {
  const mutableGenome = parseGenome(puzzle.mutable.join(','));
  const targetGenome = parseGenome(puzzle.target.join(','));
  const start = Date.now();
  const result = solve(mutableGenome, targetGenome, { maxMoves: MAX_MOVES_BUDGET });
  const elapsed = Date.now() - start;

  const ratio = puzzle.referenceScore > 0
    ? (result.moveCount / puzzle.referenceScore)
    : null;

  return {
    id: puzzle.id,
    source: puzzle.source,
    category: puzzle.category,
    solved: result.solved,
    moveCount: result.moveCount,
    referenceScore: puzzle.referenceScore,
    referenceScoreSource: puzzle.referenceScoreSource,
    baselineScore: puzzle.baselineScore,
    ratio,
    elapsedMs: elapsed,
    moves: result.moves
  };
}

function computeMetrics(results) {
  const solved = results.filter(result => result.solved);

  function averageRatio(subset) {
    if (subset.length === 0) return null;
    const values = subset
      .map(result => result.ratio)
      .filter(value => value !== null);
    return values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  }

  const synthetic = solved.filter(result => result.source === 'synthetic');
  const real = solved.filter(result => result.source === 'real');
  const optimal = solved.filter(result => result.ratio !== null && result.ratio <= 1.0);

  return {
    solvedCount: solved.length,
    totalCount: results.length,
    avgRatio: averageRatio(solved),
    avgRatioSynthetic: averageRatio(synthetic),
    avgRatioReal: averageRatio(real),
    optimalCount: optimal.length
  };
}

function fmt(number, decimals = 2) {
  return number === null ? '  N/A' : number.toFixed(decimals);
}

function printResults(manifestName, manifestPath, results, metrics, solverVersion) {
  const sep = '-'.repeat(78);
  console.log('\n' + sep);
  console.log('  GSP Dataset Evaluation');
  console.log('  Timestamp  : ' + new Date().toISOString());
  console.log('  Manifest   : ' + manifestName);
  console.log('  Path       : ' + manifestPath);
  console.log('  Hypothesis : ' + HYPOTHESIS);
  console.log('  Solver     : ' + solverVersion);
  console.log(sep);
  console.log('');

  const colWidth = 36;
  for (const result of results) {
    const tag = result.solved ? 'SOLVED' : 'STUCK ';
    const opt = result.solved && result.ratio !== null && result.ratio <= 1.0 ? ' *OPTIMAL*' : '';
    const idPad = result.id.slice(0, colWidth).padEnd(colWidth);
    const ratioText = result.ratio !== null ? fmt(result.ratio) : ' N/A ';
    console.log(
      `  ${idPad} [${tag}]  moves=${String(result.moveCount).padStart(3)}  ` +
      `ref=${String(result.referenceScore).padStart(3)}  ratio=${ratioText}${opt}`
    );

    if (VERBOSE) {
      console.log(`    categories: ${result.category.join(', ')}`);
      console.log(`    reference : ${result.referenceScoreSource}`);
      if (result.moves && result.moves.length > 0) {
        console.log(`    moves: ${JSON.stringify(result.moves)}`);
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

function appendTSV(resultsPath, manifestName, results, metrics, solverVersion) {
  const perPuzzle = results.map(result =>
    `${result.id}:${result.solved ? (result.ratio !== null ? result.ratio.toFixed(3) : 'NA') : 'STUCK'}`
  ).join(';');

  const row = [
    new Date().toISOString(),
    manifestName,
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
    'timestamp',
    'manifest',
    'hypothesis',
    'solver_version',
    'solved_count',
    'avg_ratio',
    'avg_ratio_synthetic',
    'avg_ratio_real',
    'optimal_count',
    'per_puzzle_ratios'
  ].join('\t');

  let content = '';
  if (!fs.existsSync(resultsPath)) {
    content = header + '\n';
  }
  content += row + '\n';
  fs.appendFileSync(resultsPath, content);
}

function main() {
  const manifestPath = resolveManifestPath();
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const benchmarkMap = loadBenchmarkMap();
  const solverVersion = readSolverVersion();
  const resultsPath = path.resolve(__dirname, manifest.resultsPath || DEFAULT_RESULTS_PATH);

  const resolvedPuzzles = manifest.puzzles.map(entry => loadPuzzle(entry, benchmarkMap));
  const puzzles = puzzleArg
    ? resolvedPuzzles.filter(puzzle => puzzle.id === puzzleArg)
    : resolvedPuzzles;

  if (puzzles.length === 0) {
    console.error(`No puzzle found with id: ${puzzleArg}`);
    process.exit(1);
  }

  const results = puzzles.map(puzzle => {
    process.stdout.write(`  Running ${puzzle.id}...`);
    const result = evaluatePuzzle(puzzle);
    process.stdout.write(` ${result.solved ? 'SOLVED' : 'STUCK'} (${result.moveCount} moves, ${result.elapsedMs}ms)\n`);
    return result;
  });

  const metrics = computeMetrics(results);
  printResults(manifest.name || path.basename(manifestPath), manifestPath, results, metrics, solverVersion);

  if (!puzzleArg && !NO_LOG) {
    appendTSV(resultsPath, manifest.name || path.basename(manifestPath), results, metrics, solverVersion);
    console.log(`  Results appended to ${resultsPath}\n`);
  }
}

main();
