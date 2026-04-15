'use strict';

const fs = require('fs');
const path = require('path');
const { parseGenome } = require('./gameEngine');

const BENCHMARK_PATH = path.join(__dirname, 'benchmark', 'puzzles.json');
const DEFAULT_MANIFEST_PATHS = [
  path.join(__dirname, 'benchmark', 'phase2_dev.json'),
  path.join(__dirname, 'benchmark', 'phase2_holdout.json'),
  path.join(__dirname, 'benchmark', 'phase3_hard_genomic.json')
];
const SCAN_ROOTS = [
  path.join(__dirname, 'real_puzzles'),
  path.join(__dirname, 'syntetic_puzles')
];

function relativeRepoPath(absolutePath) {
  return path.relative(__dirname, absolutePath).replace(/\\/g, '/');
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

function benchmarkPuzzleToSpec(puzzle, sourceLabel = 'benchmark') {
  return {
    id: puzzle.id,
    sourceLabel,
    source: puzzle.source,
    category: puzzle.category || [],
    referenceScore: puzzle.knownBestScore || null,
    referenceScoreSource: 'knownBestScore',
    targetCsv: puzzle.target.join(','),
    mutableCsv: puzzle.mutable.join(',')
  };
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
    source: entry.source || notesMetadata.source || inferSourceFromPath(puzzlePath),
    category: entry.category || notesMetadata.category,
    referenceScore: entry.referenceScore || notesMetadata.referenceScore,
    referenceScoreSource: entry.referenceScoreSource || notesMetadata.referenceScoreSource,
    targetCsv,
    mutableCsv
  };
}

function historicalExportToSpec(filePath, parsed, sourceLabel = 'historical-export') {
  return {
    id: parsed._id || path.basename(filePath, path.extname(filePath)),
    sourceLabel,
    source: 'real',
    category: [],
    referenceScore: parsed.score || parsed.topScore || parsed.puzzleData?.topScore?.[0]?.score || null,
    referenceScoreSource: parsed.score ? 'historical human score' : 'historical topScore',
    targetCsv: parsed.targetGenome?.sequence,
    mutableCsv: parsed.mutableGenome?.sequence
  };
}

function loadPuzzleFromFile(filePath, options = {}) {
  const absolutePath = path.resolve(__dirname, filePath);
  const text = fs.readFileSync(absolutePath, 'utf8');
  const sourceLabel = options.sourceLabel || 'file';
  const id = options.id || path.basename(absolutePath, path.extname(absolutePath));

  const historical = parseHistoricalExport(text);
  if (historical) {
    return historicalExportToSpec(absolutePath, historical, sourceLabel);
  }

  const parsedJson = tryParseJsonText(text.trim());
  if (parsedJson && parsedJson.targetGenome?.sequence && parsedJson.mutableGenome?.sequence) {
    return historicalExportToSpec(absolutePath, parsedJson, sourceLabel);
  }

  return markdownPuzzleToSpec(
    {
      id,
      sourceLabel,
      source: options.source,
      category: options.category,
      referenceScore: options.referenceScore,
      referenceScoreSource: options.referenceScoreSource
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

  const manifestLabel = `manifest:${manifest.name || path.basename(manifestPath)}`;

  if (entry.kind === 'benchmark') {
    const benchmarkPuzzle = readBenchmark().find(candidate => candidate.id === entry.id);
    if (!benchmarkPuzzle) {
      throw new Error(`Benchmark puzzle "${entry.id}" referenced by manifest was not found.`);
    }
    return benchmarkPuzzleToSpec(benchmarkPuzzle, manifestLabel);
  }

  if (entry.kind === 'markdown') {
    return loadPuzzleFromFile(entry.path, { ...entry, sourceLabel: manifestLabel });
  }

  throw new Error(`Unsupported manifest entry kind: ${entry.kind}`);
}

function getManifestEntries(manifestPaths = DEFAULT_MANIFEST_PATHS) {
  const entries = new Map();

  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const manifestName = manifest.name || path.basename(manifestPath, path.extname(manifestPath));

    for (const entry of manifest.puzzles || []) {
      entries.set(entry.id, {
        manifestName,
        manifestPath: relativeRepoPath(manifestPath),
        entry
      });
    }
  }

  return entries;
}

function scanMarkdownPuzzleFiles(roots = SCAN_ROOTS) {
  const files = [];

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.toLowerCase().endsWith('.md')) continue;
      if (entry.name.toLowerCase() === 'readme.md') continue;
      files.push(absolutePath);
    }
  }

  for (const root of roots) {
    if (fs.existsSync(root)) {
      walk(root);
    }
  }

  return files.sort();
}

function buildCatalogEntry(spec, load) {
  const mutableGenome = parseGenome(spec.mutableCsv);
  const targetGenome = parseGenome(spec.targetCsv);
  return {
    id: spec.id,
    label: spec.id,
    sourceLabel: spec.sourceLabel,
    source: spec.source,
    category: spec.category || [],
    referenceScore: spec.referenceScore ?? null,
    referenceScoreSource: spec.referenceScoreSource ?? null,
    mutableGeneCount: mutableGenome.genes.length,
    targetGeneCount: targetGenome.genes.length,
    load
  };
}

function compareCatalogEntries(left, right) {
  const leftPriority = left.load.kind === 'benchmark' ? 0 : 1;
  const rightPriority = right.load.kind === 'benchmark' ? 0 : 1;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const leftSize = left.mutableGeneCount + left.targetGeneCount;
  const rightSize = right.mutableGeneCount + right.targetGeneCount;
  if (leftSize !== rightSize) {
    return leftSize - rightSize;
  }

  if (left.source !== right.source) {
    return left.source.localeCompare(right.source);
  }

  return left.id.localeCompare(right.id, undefined, {
    numeric: true,
    sensitivity: 'base'
  });
}

function buildPuzzleCatalog(options = {}) {
  const manifestPaths = options.manifestPaths || DEFAULT_MANIFEST_PATHS;
  const manifestEntries = getManifestEntries(manifestPaths);
  const catalog = new Map();

  for (const puzzle of readBenchmark()) {
    const spec = benchmarkPuzzleToSpec(puzzle);
    catalog.set(puzzle.id, buildCatalogEntry(spec, {
      kind: 'benchmark',
      id: puzzle.id
    }));
  }

  for (const absolutePath of scanMarkdownPuzzleFiles()) {
    const relativePath = relativeRepoPath(absolutePath);
    const id = path.basename(absolutePath, path.extname(absolutePath));

    if (catalog.has(id)) continue;

    const manifestMatch = manifestEntries.get(id);
    const spec = manifestMatch
      ? loadPuzzleFromFile(relativePath, {
        ...manifestMatch.entry,
        sourceLabel: `manifest:${manifestMatch.manifestName}`
      })
      : loadPuzzleFromFile(relativePath, {
        id,
        sourceLabel: 'file'
      });

    catalog.set(id, buildCatalogEntry(spec, {
      kind: 'file',
      path: relativePath
    }));
  }

  return [...catalog.values()].sort(compareCatalogEntries);
}

function loadPuzzleSpecByCatalogEntry(entry) {
  if (entry.load.kind === 'benchmark') {
    const benchmarkPuzzle = readBenchmark().find(candidate => candidate.id === entry.load.id);
    if (!benchmarkPuzzle) {
      throw new Error(`Benchmark puzzle "${entry.load.id}" was not found.`);
    }
    return benchmarkPuzzleToSpec(benchmarkPuzzle);
  }

  if (entry.load.kind === 'file') {
    return loadPuzzleFromFile(entry.load.path, {
      id: entry.id,
      sourceLabel: entry.sourceLabel,
      source: entry.source,
      category: entry.category,
      referenceScore: entry.referenceScore,
      referenceScoreSource: entry.referenceScoreSource
    });
  }

  throw new Error(`Unsupported catalog load kind: ${entry.load.kind}`);
}

function loadPuzzleSpec(options = {}) {
  if (options.filePath) {
    return loadPuzzleFromFile(options.filePath);
  }

  if (options.manifestPath) {
    if (!options.puzzleId) {
      throw new Error('When using a manifest path, also provide a puzzle id.');
    }
    return loadPuzzleFromManifest(options.manifestPath, options.puzzleId);
  }

  if (!options.puzzleId) {
    throw new Error('Provide a puzzle id, or a manifest + puzzle id, or a file path.');
  }

  const catalogEntry = buildPuzzleCatalog().find(entry => entry.id === options.puzzleId);
  if (!catalogEntry) {
    throw new Error(`Puzzle "${options.puzzleId}" was not found.`);
  }
  return loadPuzzleSpecByCatalogEntry(catalogEntry);
}

function listManifestPuzzleIds(manifestPath) {
  const absoluteManifestPath = path.resolve(__dirname, manifestPath);
  const manifest = JSON.parse(fs.readFileSync(absoluteManifestPath, 'utf8'));
  return (manifest.puzzles || []).map(entry => entry.id);
}

module.exports = {
  BENCHMARK_PATH,
  DEFAULT_MANIFEST_PATHS,
  buildPuzzleCatalog,
  listManifestPuzzleIds,
  loadPuzzleFromFile,
  loadPuzzleFromManifest,
  loadPuzzleSpec,
  loadPuzzleSpecByCatalogEntry,
  parseMarkdownSections,
  readBenchmark,
  relativeRepoPath
};
