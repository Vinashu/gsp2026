#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseGenome } = require('./gameEngine');
const { solve } = require('./solver');

const ROOT = __dirname;
const GENOME_DIR = path.join(ROOT, '_legacy', 'levelCreator', 'Clostridium_gesort_format');
const ORTHO_DIR = path.join(ROOT, '_legacy', 'levelCreator', 'OrthoAlign');
const DEFAULT_OUT_DIR = path.join(ROOT, 'analysis', 'clostridium_pairs');
const MAX_MOVES_BUDGET = 150;
const ORTHO_TIMEOUT_MS = 120000;
const ORTHO_MAX_BUFFER = 32 * 1024 * 1024;

const args = process.argv.slice(2);
const shardCount = Math.max(1, Number(getArgValue('--shard-count') || '1'));
const shardIndex = Math.max(0, Number(getArgValue('--shard-index') || '0'));
const outDir = path.resolve(ROOT, getArgValue('--out-dir') || DEFAULT_OUT_DIR);
const mergeOnly = args.includes('--merge-only');
const noResume = args.includes('--no-resume');

if (shardIndex >= shardCount) {
  console.error(`--shard-index must be smaller than --shard-count (got ${shardIndex} / ${shardCount})`);
  process.exit(1);
}

function getArgValue(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function readSolverVersion() {
  const src = fs.readFileSync(path.join(ROOT, 'solver.js'), 'utf8');
  const match = src.match(/^\/\/\s*@version\s+(\S+)/m);
  return match ? match[1] : 'unknown';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readGenomeFolder(name) {
  const sequencePath = path.join(GENOME_DIR, name, 'sequence.txt');
  const sequence = fs.readFileSync(sequencePath, 'utf8').trim();
  const tokens = sequence.split(',').map(token => token.trim()).filter(Boolean);
  const genes = tokens.filter(token => token !== '[o]');
  const terminusCount = genes.filter(token => token === '[t]').length;
  const uniqueGenes = [...new Set(genes.filter(token => token !== '[t]'))];
  const geneSet = new Set(uniqueGenes);

  return {
    name,
    sequence,
    geneCount: genes.length,
    terminusCount,
    uniqueGeneCount: uniqueGenes.length,
    geneSet
  };
}

function loadGenomes() {
  return fs.readdirSync(GENOME_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => readGenomeFolder(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function includesGeneSet(mutable, target) {
  for (const gene of target.geneSet) {
    if (!mutable.geneSet.has(gene)) return false;
  }
  return true;
}

function buildPairs(genomes) {
  const pairs = [];
  let pairIndex = 0;

  for (const mutable of genomes) {
    for (const target of genomes) {
      if (mutable.name === target.name) continue;
      if (!includesGeneSet(mutable, target)) continue;

      pairs.push({
        pairIndex: ++pairIndex,
        mutableName: mutable.name,
        targetName: target.name,
        mutableSequence: mutable.sequence,
        targetSequence: target.sequence,
        mutableLength: mutable.geneCount,
        targetLength: target.geneCount,
        mutableUniqueGenes: mutable.uniqueGeneCount,
        targetUniqueGenes: target.uniqueGeneCount
      });
    }
  }

  return pairs;
}

function getAssignedPairs(pairs) {
  return pairs.filter((_, index) => (index % shardCount) === shardIndex);
}

function shardTag() {
  return `shard${String(shardIndex + 1).padStart(2, '0')}-of-${String(shardCount).padStart(2, '0')}`;
}

function shardTsvPath() {
  return path.join(outDir, `pairs_${shardTag()}.tsv`);
}

function summaryJsonPath() {
  return path.join(outDir, 'summary.json');
}

function mergedTsvPath() {
  return path.join(outDir, 'pairs_all.tsv');
}

function mergedMarkdownPath() {
  return path.join(outDir, 'summary.md');
}

function tsvHeader() {
  return [
    'pair_index',
    'mutable_genome',
    'target_genome',
    'mutable_length',
    'target_length',
    'mutable_unique_genes',
    'target_unique_genes',
    'solver_version',
    'orthalign_cost',
    'orthalign_status',
    'orthalign_ms',
    'solver_status',
    'solver_solved',
    'solver_moves',
    'solver_ms',
    'delta_solver_minus_ortho',
    'ratio_solver_to_ortho',
    'comparison'
  ].join('\t');
}

function parseExistingShardRows(filePath) {
  if (!fs.existsSync(filePath)) return new Map();

  const rows = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  if (rows.length === 0) return new Map();

  const dataRows = rows.slice(1);
  const map = new Map();
  for (const row of dataRows) {
    const cols = row.split('\t');
    if (cols.length < 18) continue;
    map.set(cols[0], row);
  }
  return map;
}

function appendShardRow(filePath, rowText) {
  const exists = fs.existsSync(filePath);
  if (!exists) {
    fs.writeFileSync(filePath, tsvHeader() + '\n');
  }
  fs.appendFileSync(filePath, rowText + '\n');
}

function parseOrthoAlignCost(stdout) {
  const match = stdout.match(/>=== Total cost =\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function runOrthoAlign(targetSequence, mutableSequence) {
  const start = Date.now();
  const result = spawnSync(
    'java',
    ['Aligning', '-d', targetSequence, mutableSequence],
    {
      cwd: ORTHO_DIR,
      encoding: 'utf8',
      timeout: ORTHO_TIMEOUT_MS,
      maxBuffer: ORTHO_MAX_BUFFER
    }
  );
  const elapsedMs = Date.now() - start;

  if (result.error) {
    const status = result.error.code === 'ETIMEDOUT' ? 'timeout' : 'error';
    return { cost: null, status, elapsedMs, stderr: String(result.error.message || '') };
  }

  const cost = parseOrthoAlignCost(result.stdout || '');
  if (cost === null) {
    return {
      cost: null,
      status: result.status === 0 ? 'parse_failed' : `exit_${result.status}`,
      elapsedMs,
      stderr: result.stderr || ''
    };
  }

  return { cost, status: 'ok', elapsedMs, stderr: result.stderr || '' };
}

function runSolver(mutableSequence, targetSequence) {
  const start = Date.now();

  try {
    const mutableGenome = parseGenome(mutableSequence);
    const targetGenome = parseGenome(targetSequence);
    const result = solve(mutableGenome, targetGenome, { maxMoves: MAX_MOVES_BUDGET });
    const elapsedMs = Date.now() - start;

    return {
      status: result.solved ? 'ok' : 'stuck',
      solved: result.solved,
      moveCount: result.moveCount,
      elapsedMs
    };
  } catch (error) {
    const elapsedMs = Date.now() - start;
    return {
      status: 'parse_error',
      solved: false,
      moveCount: null,
      elapsedMs,
      error: String(error && error.message ? error.message : error)
    };
  }
}

function evaluatePair(pair, solverVersion) {
  const ortho = runOrthoAlign(pair.targetSequence, pair.mutableSequence);
  const solver = runSolver(pair.mutableSequence, pair.targetSequence);

  const delta = (ortho.cost === null || solver.moveCount === null)
    ? null
    : (solver.moveCount - ortho.cost);
  const ratio = (ortho.cost && ortho.cost > 0 && solver.moveCount !== null)
    ? (solver.moveCount / ortho.cost)
    : null;

  let comparison = 'unknown';
  if (solver.status === 'parse_error') {
    comparison = 'solver_parse_error';
  } else if (!solver.solved) {
    comparison = 'solver_stuck';
  } else if (ortho.cost === null) {
    comparison = 'orthalign_failed';
  } else if (solver.moveCount < ortho.cost) {
    comparison = 'better';
  } else if (solver.moveCount > ortho.cost) {
    comparison = 'worse';
  } else {
    comparison = 'equal';
  }

  return {
    pairIndex: pair.pairIndex,
    mutableName: pair.mutableName,
    targetName: pair.targetName,
    mutableLength: pair.mutableLength,
    targetLength: pair.targetLength,
    mutableUniqueGenes: pair.mutableUniqueGenes,
    targetUniqueGenes: pair.targetUniqueGenes,
    solverVersion,
    orthoCost: ortho.cost,
    orthoStatus: ortho.status,
    orthoMs: ortho.elapsedMs,
    solverStatus: solver.status,
    solverSolved: solver.solved,
    solverMoves: solver.moveCount,
    solverMs: solver.elapsedMs,
    delta,
    ratio,
    comparison
  };
}

function rowToTsv(row) {
  return [
    row.pairIndex,
    row.mutableName,
    row.targetName,
    row.mutableLength,
    row.targetLength,
    row.mutableUniqueGenes,
    row.targetUniqueGenes,
    row.solverVersion,
    row.orthoCost === null ? 'NA' : row.orthoCost,
    row.orthoStatus,
    row.orthoMs,
    row.solverStatus,
    row.solverSolved ? 'true' : 'false',
    row.solverMoves === null ? 'NA' : row.solverMoves,
    row.solverMs,
    row.delta === null ? 'NA' : row.delta,
    row.ratio === null ? 'NA' : row.ratio.toFixed(4),
    row.comparison
  ].join('\t');
}

function parseTsvRows(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  if (content.length <= 1) return [];
  return content.slice(1).map(line => {
    const cols = line.split('\t');
    return {
      pairIndex: Number(cols[0]),
      mutableName: cols[1],
      targetName: cols[2],
      mutableLength: Number(cols[3]),
      targetLength: Number(cols[4]),
      mutableUniqueGenes: Number(cols[5]),
      targetUniqueGenes: Number(cols[6]),
      solverVersion: cols[7],
      orthoCost: cols[8] === 'NA' ? null : Number(cols[8]),
      orthoStatus: cols[9],
      orthoMs: Number(cols[10]),
      solverStatus: cols[11],
      solverSolved: cols[12] === 'true',
      solverMoves: cols[13] === 'NA' ? null : Number(cols[13]),
      solverMs: Number(cols[14]),
      delta: cols[15] === 'NA' ? null : Number(cols[15]),
      ratio: cols[16] === 'NA' ? null : Number(cols[16]),
      comparison: cols[17]
    };
  });
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

function formatNumber(value, decimals = 2) {
  return value === null ? 'NA' : value.toFixed(decimals);
}

function topRows(rows, filterFn, compareFn, limit = 10) {
  return rows.filter(filterFn).sort(compareFn).slice(0, limit);
}

function writeMergedOutputs(genomes, allPairs, allRows) {
  allRows.sort((left, right) => {
    if (left.pairIndex !== right.pairIndex) return left.pairIndex - right.pairIndex;
    if (left.mutableName !== right.mutableName) return left.mutableName.localeCompare(right.mutableName);
    return left.targetName.localeCompare(right.targetName);
  });

  const mergedLines = [tsvHeader(), ...allRows.map(rowToTsv)];
  fs.writeFileSync(mergedTsvPath(), mergedLines.join('\n') + '\n');

  const solvedRows = allRows.filter(row => row.solverSolved);
  const orthoRows = allRows.filter(row => row.orthoCost !== null);
  const parseErrorRows = allRows.filter(row => row.solverStatus === 'parse_error');
  const comparableRows = allRows.filter(row => row.solverSolved && row.orthoCost !== null && row.solverMoves !== null);
  const betterRows = comparableRows.filter(row => row.comparison === 'better');
  const equalRows = comparableRows.filter(row => row.comparison === 'equal');
  const worseRows = comparableRows.filter(row => row.comparison === 'worse');

  const summary = {
    solverVersion: allRows[0] ? allRows[0].solverVersion : readSolverVersion(),
    genomes: genomes.length,
    genomesWithInvalidTerminus: genomes.filter(genome => genome.terminusCount !== 1).length,
    totalDirectedPairs: genomes.length * (genomes.length - 1),
    solvableDirectedPairs: allPairs.length,
    discardedUnsolvablePairs: (genomes.length * (genomes.length - 1)) - allPairs.length,
    evaluatedPairs: allRows.length,
    solverSolvedPairs: solvedRows.length,
    solverParseErrorPairs: parseErrorRows.length,
    orthalignScoredPairs: orthoRows.length,
    comparablePairs: comparableRows.length,
    solverBetterCount: betterRows.length,
    solverEqualCount: equalRows.length,
    solverWorseCount: worseRows.length,
    averageOrthoCost: average(comparableRows.map(row => row.orthoCost)),
    averageSolverMoves: average(comparableRows.map(row => row.solverMoves)),
    averageDelta: average(comparableRows.map(row => row.delta)),
    medianDelta: median(comparableRows.map(row => row.delta)),
    averageRatio: average(comparableRows.map(row => row.ratio)),
    medianRatio: median(comparableRows.map(row => row.ratio)),
    averageOrthoMs: average(allRows.map(row => row.orthoMs)),
    averageSolverMs: average(allRows.map(row => row.solverMs)),
    bestPairs: topRows(comparableRows, () => true, (a, b) => a.delta - b.delta || a.ratio - b.ratio),
    worstPairs: topRows(comparableRows, () => true, (a, b) => b.delta - a.delta || b.ratio - a.ratio),
    fastestWins: topRows(betterRows, () => true, (a, b) => a.solverMoves - b.solverMoves || a.delta - b.delta),
    largestLosses: topRows(worseRows, () => true, (a, b) => b.delta - a.delta || b.solverMoves - a.solverMoves)
  };

  fs.writeFileSync(summaryJsonPath(), JSON.stringify(summary, null, 2) + '\n');

  const markdown = [
    '# Clostridium Pair Sweep',
    '',
    `Solver version: \`${summary.solverVersion}\``,
    '',
    '| Metric | Value |',
    '|---|---:|',
    `| Genomes | ${summary.genomes} |`,
    `| Genomes without exactly one [t] | ${summary.genomesWithInvalidTerminus} |`,
    `| Total directed pairs | ${summary.totalDirectedPairs} |`,
    `| Solvable directed pairs | ${summary.solvableDirectedPairs} |`,
    `| Discarded unsolvable pairs | ${summary.discardedUnsolvablePairs} |`,
    `| Evaluated pairs | ${summary.evaluatedPairs} |`,
    `| Solver solved pairs | ${summary.solverSolvedPairs} |`,
    `| Solver parse-error pairs | ${summary.solverParseErrorPairs} |`,
    `| OrthoAlign scored pairs | ${summary.orthalignScoredPairs} |`,
    `| Comparable pairs | ${summary.comparablePairs} |`,
    `| Solver better than OrthoAlign | ${summary.solverBetterCount} |`,
    `| Solver equal to OrthoAlign | ${summary.solverEqualCount} |`,
    `| Solver worse than OrthoAlign | ${summary.solverWorseCount} |`,
    `| Avg OrthoAlign cost | ${formatNumber(summary.averageOrthoCost, 2)} |`,
    `| Avg solver moves | ${formatNumber(summary.averageSolverMoves, 2)} |`,
    `| Avg delta (solver - OrthoAlign) | ${formatNumber(summary.averageDelta, 2)} |`,
    `| Median delta | ${formatNumber(summary.medianDelta, 2)} |`,
    `| Avg ratio (solver / OrthoAlign) | ${formatNumber(summary.averageRatio, 3)} |`,
    `| Median ratio | ${formatNumber(summary.medianRatio, 3)} |`,
    `| Avg OrthoAlign runtime (ms) | ${formatNumber(summary.averageOrthoMs, 1)} |`,
    `| Avg solver runtime (ms) | ${formatNumber(summary.averageSolverMs, 1)} |`,
    '',
    '## Best Pairs',
    '',
    '| Mutable | Target | OrthoAlign | Solver | Delta | Ratio |',
    '|---|---|---:|---:|---:|---:|',
    ...summary.bestPairs.map(row =>
      `| ${row.mutableName} | ${row.targetName} | ${row.orthoCost} | ${row.solverMoves} | ${row.delta} | ${formatNumber(row.ratio, 3)} |`
    ),
    '',
    '## Worst Pairs',
    '',
    '| Mutable | Target | OrthoAlign | Solver | Delta | Ratio |',
    '|---|---|---:|---:|---:|---:|',
    ...summary.worstPairs.map(row =>
      `| ${row.mutableName} | ${row.targetName} | ${row.orthoCost} | ${row.solverMoves} | ${row.delta} | ${formatNumber(row.ratio, 3)} |`
    ),
    ''
  ];
  fs.writeFileSync(mergedMarkdownPath(), markdown.join('\n'));
}

function mergeOutputs(genomes, allPairs) {
  const shardFiles = [];
  for (let index = 0; index < shardCount; index++) {
    const filePath = path.join(outDir, `pairs_shard${String(index + 1).padStart(2, '0')}-of-${String(shardCount).padStart(2, '0')}.tsv`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing shard output: ${filePath}`);
    }
    shardFiles.push(filePath);
  }

  const allRows = shardFiles.flatMap(parseTsvRows);
  if (allRows.length !== allPairs.length) {
    throw new Error(`Expected ${allPairs.length} merged rows but found ${allRows.length}`);
  }

  writeMergedOutputs(genomes, allPairs, allRows);
  console.log(`Merged ${allRows.length} rows into ${mergedTsvPath()}`);
  console.log(`Summary written to ${summaryJsonPath()}`);
  console.log(`Markdown summary written to ${mergedMarkdownPath()}`);
}

function main() {
  ensureDir(outDir);

  const solverVersion = readSolverVersion();
  const genomes = loadGenomes();
  const allPairs = buildPairs(genomes);

  if (mergeOnly) {
    mergeOutputs(genomes, allPairs);
    return;
  }

  const assignedPairs = getAssignedPairs(allPairs);
  const shardPath = shardTsvPath();
  const existingRows = noResume ? new Map() : parseExistingShardRows(shardPath);

  console.log(`Solver version: ${solverVersion}`);
  console.log(`Genomes: ${genomes.length}`);
  console.log(`Solvable directed pairs: ${allPairs.length}`);
  console.log(`Assigned pairs for ${shardTag()}: ${assignedPairs.length}`);
  console.log(`Output: ${shardPath}`);

  let processed = existingRows.size;
  if (existingRows.size > 0) {
    console.log(`Resuming with ${existingRows.size} existing rows already present`);
  }

  for (const pair of assignedPairs) {
    const rowKey = String(pair.pairIndex);
    if (existingRows.has(rowKey)) continue;

    console.log(
      `[${shardTag()}] ${processed + 1}/${assignedPairs.length} ` +
      `${pair.mutableName} -> ${pair.targetName}`
    );

    const row = evaluatePair(pair, solverVersion);
    appendShardRow(shardPath, rowToTsv(row));
    processed += 1;
  }

  console.log(`Completed ${processed}/${assignedPairs.length} rows for ${shardTag()}`);
}

main();
