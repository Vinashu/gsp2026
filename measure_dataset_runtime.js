#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parseGenome } = require('./gameEngine');
const { solve } = require('./solver');

const MAX_MOVES_BUDGET = 150;
const DEFAULT_MANIFEST_PATH = path.join(__dirname, 'benchmark', 'phase3_hard_genomic.json');
const DEFAULT_TIMINGS_PATH = path.join(__dirname, 'timings_phase3.tsv');

const args = process.argv.slice(2);
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
    while (buffer.length > 0 && buffer[0].trim() === '') buffer.shift();
    while (buffer.length > 0 && buffer[buffer.length - 1].trim() === '') buffer.pop();
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
    if (currentKey) buffer.push(line);
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
  const benchmarkPath = path.join(__dirname, 'benchmark', 'puzzles.json');
  const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
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

  return {
    id: puzzle.id,
    solved: result.solved,
    moveCount: result.moveCount,
    elapsedMs: elapsed
  };
}

function average(values) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function printResults(manifestName, manifestPath, results, solverVersion) {
  const times = results.map(result => result.elapsedMs);
  const totalMs = times.reduce((sum, value) => sum + value, 0);
  const avgMs = average(times);
  const medianMs = median(times);
  const maxMs = times.length > 0 ? Math.max(...times) : null;
  const solvedCount = results.filter(result => result.solved).length;
  const sep = '-'.repeat(78);

  console.log('\n' + sep);
  console.log('  GSP Runtime Evaluation');
  console.log('  Timestamp  : ' + new Date().toISOString());
  console.log('  Manifest   : ' + manifestName);
  console.log('  Path       : ' + manifestPath);
  console.log('  Hypothesis : ' + HYPOTHESIS);
  console.log('  Solver     : ' + solverVersion);
  console.log(sep);
  console.log('');

  for (const result of results) {
    console.log(
      `  ${result.id.padEnd(36)} solved=${String(result.solved).padEnd(5)} ` +
      `moves=${String(result.moveCount).padStart(3)}  ms=${String(result.elapsedMs).padStart(6)}`
    );
  }

  console.log('');
  console.log(sep);
  console.log('  Summary');
  console.log(sep);
  console.log(`  Solved      : ${solvedCount} / ${results.length}`);
  console.log(`  Total ms    : ${totalMs}`);
  console.log(`  Avg ms      : ${avgMs !== null ? avgMs.toFixed(1) : 'NA'}`);
  console.log(`  Median ms   : ${medianMs !== null ? medianMs.toFixed(1) : 'NA'}`);
  console.log(`  Max ms      : ${maxMs !== null ? maxMs.toFixed(1) : 'NA'}`);
  console.log(sep + '\n');
}

function appendTSV(resultsPath, manifestName, results, solverVersion) {
  const times = results.map(result => result.elapsedMs);
  const totalMs = times.reduce((sum, value) => sum + value, 0);
  const avgMs = average(times);
  const medianMs = median(times);
  const maxMs = times.length > 0 ? Math.max(...times) : null;
  const solvedCount = results.filter(result => result.solved).length;
  const perPuzzleMs = results.map(result => `${result.id}:${result.elapsedMs}`).join(';');

  const row = [
    new Date().toISOString(),
    manifestName,
    HYPOTHESIS,
    solverVersion,
    solvedCount,
    totalMs,
    avgMs !== null ? avgMs.toFixed(1) : 'NA',
    medianMs !== null ? medianMs.toFixed(1) : 'NA',
    maxMs !== null ? maxMs.toFixed(1) : 'NA',
    perPuzzleMs
  ].join('\t');

  const header = [
    'timestamp',
    'manifest',
    'hypothesis',
    'solver_version',
    'solved_count',
    'total_ms',
    'avg_ms',
    'median_ms',
    'max_ms',
    'per_puzzle_ms'
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
  const resultsPath = path.resolve(__dirname, manifest.timingsPath || DEFAULT_TIMINGS_PATH);

  const resolvedPuzzles = manifest.puzzles.map(entry => loadPuzzle(entry, benchmarkMap));
  const puzzles = puzzleArg
    ? resolvedPuzzles.filter(puzzle => puzzle.id === puzzleArg)
    : resolvedPuzzles;

  if (puzzles.length === 0) {
    console.error(`No puzzle found with id: ${puzzleArg}`);
    process.exit(1);
  }

  const results = puzzles.map(puzzle => {
    process.stdout.write(`  Timing ${puzzle.id}...`);
    const result = evaluatePuzzle(puzzle);
    process.stdout.write(` ${result.elapsedMs}ms (${result.moveCount} moves)\n`);
    return result;
  });

  printResults(manifest.name || path.basename(manifestPath), manifestPath, results, solverVersion);

  if (!puzzleArg && !NO_LOG) {
    appendTSV(resultsPath, manifest.name || path.basename(manifestPath), results, solverVersion);
    console.log(`  Results appended to ${resultsPath}\n`);
  }
}

main();
