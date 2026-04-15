#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  parseGenome,
  applyInversion,
  applyDeletion,
  applyDuplication,
  genomesEqual,
  serializeGenome
} = require('./gameEngine');
const { solve } = require('./solver');

const DEFAULT_MAX_MOVES = 150;
const BENCHMARK_PATH = path.join(__dirname, 'benchmark', 'puzzles.json');

const args = process.argv.slice(2);
const puzzleArg = getArgValue('--puzzle');
const manifestArg = getArgValue('--manifest');
const fileArg = getArgValue('--file');
const maxMovesArg = getArgValue('--max-moves');
const useFullDisplay = args.includes('--full');
const suppressSolverDebug = args.includes('--no-solver-debug');
const listOnly = args.includes('--list');

function getArgValue(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node trace_solver.js --puzzle level20');
  console.log('  node trace_solver.js --manifest benchmark/phase2_dev.json --puzzle level30');
  console.log('  node trace_solver.js --file real_puzzles/dev/clostridium_easy_01.md');
  console.log('  node trace_solver.js --file real_puzzles/6304847664db33850899ed81.md');
  console.log('');
  console.log('Options:');
  console.log('  --max-moves N        Override the move budget (default 150)');
  console.log('  --full               Print full left/right genomes even for long puzzles');
  console.log('  --no-solver-debug    Hide the solver score-transition trace');
  console.log('  --list               List available puzzle ids for the selected source');
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

function tryParseJsonText(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function parseHistoricalExport(markdown) {
  const fencedMatch = markdown.match(/```json\s*([\s\S]*?)```/i);
  if (!fencedMatch) return null;
  return tryParseJsonText(fencedMatch[1].trim());
}

function readBenchmark() {
  return JSON.parse(fs.readFileSync(BENCHMARK_PATH, 'utf8'));
}

function listPuzzles() {
  if (fileArg) {
    console.error('--list is only supported with the default benchmark or with --manifest.');
    process.exit(1);
  }

  if (manifestArg) {
    const manifestPath = path.resolve(__dirname, manifestArg);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`Manifest puzzles in ${manifestArg}:`);
    for (const entry of manifest.puzzles || []) {
      console.log(`  ${entry.id}`);
    }
    return;
  }

  console.log('Benchmark puzzles:');
  for (const puzzle of readBenchmark()) {
    console.log(`  ${puzzle.id}`);
  }
}

function benchmarkPuzzleToSpec(puzzle) {
  return {
    id: puzzle.id,
    sourceLabel: 'benchmark',
    source: puzzle.source,
    category: puzzle.category || [],
    referenceScore: puzzle.knownBestScore || null,
    referenceScoreSource: 'knownBestScore',
    targetCsv: puzzle.target.join(','),
    mutableCsv: puzzle.mutable.join(',')
  };
}

function inferSourceFromPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('/real_puzzles/')) return 'real';
  if (normalized.includes('/syntetic_puzles/')) return 'synthetic';
  return 'unknown';
}

function parseNotesMetadata(notesText) {
  const metadata = {
    source: null,
    category: [],
    referenceScore: null,
    referenceScoreSource: null
  };

  if (!notesText) return metadata;

  const sourceMatch = notesText.match(/-\s*source:\s*`?([^`\n]+?)`?\s*$/im);
  if (sourceMatch) {
    metadata.source = sourceMatch[1].trim();
  }

  const categoryMatch = notesText.match(/-\s*category:\s*`?([^`\n]+?)`?\s*$/im);
  if (categoryMatch) {
    metadata.category = categoryMatch[1]
      .split(',')
      .map(token => token.trim())
      .filter(Boolean);
  }

  const orthoMatch = notesText.match(/-\s*OrthoAlign topScore:\s*`?(\d+)`?\s*$/im);
  if (orthoMatch) {
    metadata.referenceScore = Number(orthoMatch[1]);
    metadata.referenceScoreSource = 'OrthoAlign topScore from notes';
  }

  return metadata;
}

function markdownPuzzleToSpec(entry, puzzlePath) {
  const markdown = fs.readFileSync(puzzlePath, 'utf8');
  const sections = parseMarkdownSections(markdown);
  const targetCsv = sections.get('target') || sections.get('target_genome');
  const mutableCsv = sections.get('mutable') || sections.get('mutable_genome');
  const notesMetadata = parseNotesMetadata(sections.get('notes') || '');

  if (!targetCsv || !mutableCsv) {
    throw new Error(`Markdown puzzle is missing target or mutable sections: ${puzzlePath}`);
  }

  return {
    id: entry.id,
    sourceLabel: entry.sourceLabel || 'markdown',
    source: entry.source || inferSourceFromPath(puzzlePath),
    category: entry.category || notesMetadata.category,
    referenceScore: entry.referenceScore || notesMetadata.referenceScore,
    referenceScoreSource: entry.referenceScoreSource || notesMetadata.referenceScoreSource,
    targetCsv,
    mutableCsv
  };
}

function historicalExportToSpec(filePath, parsed) {
  return {
    id: parsed._id || path.basename(filePath, path.extname(filePath)),
    sourceLabel: 'historical-export',
    source: 'real',
    category: [],
    referenceScore: parsed.score || parsed.topScore || parsed.puzzleData?.topScore?.[0]?.score || null,
    referenceScoreSource: parsed.score ? 'historical human score' : 'historical topScore',
    targetCsv: parsed.targetGenome?.sequence,
    mutableCsv: parsed.mutableGenome?.sequence
  };
}

function loadPuzzleFromFile(filePath) {
  const absolutePath = path.resolve(__dirname, filePath);
  const text = fs.readFileSync(absolutePath, 'utf8');

  const historical = parseHistoricalExport(text);
  if (historical) {
    return historicalExportToSpec(absolutePath, historical);
  }

  const parsedJson = tryParseJsonText(text.trim());
  if (parsedJson && parsedJson.targetGenome?.sequence && parsedJson.mutableGenome?.sequence) {
    return historicalExportToSpec(absolutePath, parsedJson);
  }

  return markdownPuzzleToSpec(
    {
      id: path.basename(absolutePath, path.extname(absolutePath)),
      sourceLabel: 'file'
    },
    absolutePath
  );
}

function loadPuzzleFromManifest(manifestPath, puzzleId) {
  const absoluteManifestPath = path.resolve(__dirname, manifestPath);
  const manifest = JSON.parse(fs.readFileSync(absoluteManifestPath, 'utf8'));
  const entry = (manifest.puzzles || []).find(candidate => candidate.id === puzzleId);

  if (!entry) {
    throw new Error(`Puzzle "${puzzleId}" was not found in manifest ${manifestPath}`);
  }

  if (entry.kind === 'benchmark') {
    const benchmarkPuzzle = readBenchmark().find(candidate => candidate.id === entry.id);
    if (!benchmarkPuzzle) {
      throw new Error(`Benchmark puzzle "${entry.id}" referenced by manifest was not found.`);
    }
    const spec = benchmarkPuzzleToSpec(benchmarkPuzzle);
    spec.sourceLabel = `manifest:${manifest.name || path.basename(manifestPath)}`;
    return spec;
  }

  if (entry.kind === 'markdown') {
    const puzzlePath = path.resolve(__dirname, entry.path);
    const spec = markdownPuzzleToSpec(
      {
        ...entry,
        sourceLabel: `manifest:${manifest.name || path.basename(manifestPath)}`
      },
      puzzlePath
    );
    return spec;
  }

  throw new Error(`Unsupported manifest entry kind: ${entry.kind}`);
}

function loadPuzzleSpec() {
  if (fileArg) {
    return loadPuzzleFromFile(fileArg);
  }

  if (manifestArg) {
    if (!puzzleArg) {
      throw new Error('When using --manifest, also provide --puzzle <id>.');
    }
    return loadPuzzleFromManifest(manifestArg, puzzleArg);
  }

  if (!puzzleArg) {
    throw new Error('Provide --puzzle <id>, or use --manifest ... --puzzle ..., or --file <path>.');
  }

  const benchmarkPuzzle = readBenchmark().find(puzzle => puzzle.id === puzzleArg);
  if (!benchmarkPuzzle) {
    throw new Error(`Benchmark puzzle "${puzzleArg}" was not found.`);
  }
  return benchmarkPuzzleToSpec(benchmarkPuzzle);
}

function formatGeneList(genes) {
  if (useFullDisplay || genes.length <= 28) {
    return genes.join(', ');
  }

  const head = genes.slice(0, 12).join(', ');
  const tail = genes.slice(-12).join(', ');
  return `${head}, ..., ${tail}`;
}

function describeSides(genome) {
  return {
    left: genome.genes.slice(0, genome.terminusIndex),
    right: genome.genes.slice(genome.terminusIndex + 1)
  };
}

function printGenome(label, genome) {
  const sides = describeSides(genome);
  console.log(`${label} left  (${sides.left.length}): ${formatGeneList(sides.left)}`);
  console.log(`${label} right (${sides.right.length}): ${formatGeneList(sides.right)}`);
}

function applyMove(genome, move) {
  if (move.type === 'inversion') {
    return applyInversion(genome, move.start, move.length);
  }
  if (move.type === 'deletion') {
    return applyDeletion(genome, move.start, move.length);
  }
  if (move.type === 'duplication') {
    return applyDuplication(genome, move.srcStart, move.srcLength, move.destIndex);
  }
  throw new Error(`Unknown move type: ${move.type}`);
}

function describeMove(genome, move) {
  if (move.type === 'inversion') {
    const before = genome.genes.slice(move.start, move.start + move.length);
    const after = [...before].reverse();
    return [
      `segment before: ${formatGeneList(before)}`,
      `segment after : ${formatGeneList(after)}`
    ];
  }

  if (move.type === 'deletion') {
    const removed = genome.genes.slice(move.start, move.start + move.length);
    return [`removed      : ${formatGeneList(removed)}`];
  }

  if (move.type === 'duplication') {
    const source = genome.genes.slice(move.srcStart, move.srcStart + move.srcLength);
    const sourceSide = move.srcStart < genome.terminusIndex ? 'left' : 'right';
    const destSide = move.destIndex <= genome.terminusIndex ? 'left' : 'right';
    const inserted = sourceSide === destSide ? source : [...source].reverse();
    return [
      `source       : ${formatGeneList(source)} (${sourceSide})`,
      `inserted as  : ${formatGeneList(inserted)} (${destSide})`
    ];
  }

  return [];
}

function replaySolution(initialGenome, targetGenome, moves) {
  let current = initialGenome;

  console.log('');
  console.log('Replay');
  console.log('------');
  printGenome('Start ', current);

  for (let index = 0; index < moves.length; index++) {
    const move = moves[index];
    const next = applyMove(current, move);

    console.log('');
    console.log(`Step ${index + 1}/${moves.length}: ${JSON.stringify(move)}`);
    for (const line of describeMove(current, move)) {
      console.log(`  ${line}`);
    }
    printGenome('Before', current);
    printGenome('After ', next);

    current = next;
  }

  console.log('');
  printGenome('Target', targetGenome);
  console.log('');
  console.log(`Replay verified: ${genomesEqual(current, targetGenome) ? 'yes' : 'no'}`);
  return current;
}

function main() {
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  if (listOnly) {
    listPuzzles();
    return;
  }

  const maxMoves = maxMovesArg ? Number(maxMovesArg) : DEFAULT_MAX_MOVES;
  if (!Number.isFinite(maxMoves) || maxMoves <= 0) {
    throw new Error(`Invalid --max-moves value: ${maxMovesArg}`);
  }

  const spec = loadPuzzleSpec();
  const mutableGenome = parseGenome(spec.mutableCsv);
  const targetGenome = parseGenome(spec.targetCsv);

  console.log('Trace Solver');
  console.log('============');
  console.log(`Puzzle          : ${spec.id}`);
  console.log(`Source          : ${spec.sourceLabel}`);
  console.log(`Puzzle source   : ${spec.source}`);
  if (spec.category.length > 0) {
    console.log(`Categories      : ${spec.category.join(', ')}`);
  }
  if (spec.referenceScore !== null) {
    console.log(`Reference score : ${spec.referenceScore} (${spec.referenceScoreSource || 'reference'})`);
  }
  console.log(`Move budget     : ${maxMoves}`);
  console.log(`Mutable genes   : ${mutableGenome.genes.length}`);
  console.log(`Target genes    : ${targetGenome.genes.length}`);
  console.log('');
  printGenome('Mutable', mutableGenome);
  printGenome('Target ', targetGenome);

  console.log('');
  if (!suppressSolverDebug) {
    console.log('Solver score trace');
    console.log('------------------');
    console.log('Score tuple = [coreTotal, balancedCore, -countDistance, -lengthGap, anchoredMatches, weightedMatches]');
  }

  const result = solve(mutableGenome, targetGenome, {
    maxMoves,
    debug: !suppressSolverDebug
  });

  console.log('');
  console.log('Summary');
  console.log('-------');
  console.log(`Solved         : ${result.solved}`);
  console.log(`Move count     : ${result.moveCount}`);
  if (spec.referenceScore) {
    console.log(`Ratio          : ${(result.moveCount / spec.referenceScore).toFixed(3)}`);
  }
  console.log(`Final matches  : ${genomesEqual(result.finalGenome, targetGenome)}`);

  const replayFinal = replaySolution(mutableGenome, targetGenome, result.moves);
  if (!genomesEqual(replayFinal, result.finalGenome)) {
    console.log('');
    console.log('Warning: replay final genome does not match solver final genome.');
    console.log(`Solver final : ${serializeGenome(result.finalGenome)}`);
    console.log(`Replay final : ${serializeGenome(replayFinal)}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  console.error('');
  printUsage();
  process.exit(1);
}
