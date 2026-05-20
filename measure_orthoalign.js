#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const ORTHO_DIR = path.join(ROOT, '_legacy', 'levelCreator', 'OrthoAlign');
const MANIFEST_PATH = path.join(ROOT, 'benchmark', 'phase3_hard_genomic.json');

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

function loadMarkdownPuzzle(entry) {
  const puzzlePath = path.resolve(ROOT, entry.path);
  const markdown = fs.readFileSync(puzzlePath, 'utf8');
  const sections = parseMarkdownSections(markdown);
  const targetText = sections.get('target') || sections.get('target_genome');
  const mutableText = sections.get('mutable') || sections.get('mutable_genome');

  if (!targetText || !mutableText) {
    throw new Error(`Markdown puzzle is missing target or mutable sections: ${entry.path}`);
  }

  // OrthoAlign expects commas and no line breaks
  const cleanTarget = targetText.replace(/\s+/g, '');
  const cleanMutable = mutableText.replace(/\s+/g, '');

  return {
    id: entry.id,
    target: cleanTarget,
    mutable: cleanMutable
  };
}

function parseOrthoAlignCost(stdout) {
  const match = stdout.match(/>=== Total cost =\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function runOrthoAlign(targetSequence, mutableSequence) {
  const start = process.hrtime.bigint();
  const result = spawnSync(
    'java',
    ['Aligning', '-d', targetSequence, mutableSequence],
    {
      cwd: ORTHO_DIR,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 32 * 1024 * 1024
    }
  );
  const end = process.hrtime.bigint();
  const elapsedMs = Number(end - start) / 1e6;

  if (result.error) {
    return { cost: null, status: 'error', elapsedMs };
  }

  const cost = parseOrthoAlignCost(result.stdout || '');
  if (cost === null) {
    return {
      cost: null,
      status: result.status === 0 ? 'parse_failed' : `exit_${result.status}`,
      elapsedMs
    };
  }

  return { cost, status: 'ok', elapsedMs };
}

function main() {
  console.log("=================================================");
  console.log("     OrthoAlign Java Solver Dataset Runner       ");
  console.log("=================================================");
  console.log(`Loading manifest: ${MANIFEST_PATH}`);

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const puzzles = manifest.puzzles.map(entry => loadMarkdownPuzzle(entry));

  console.log(`Loaded ${puzzles.length} puzzles.\n`);

  let solvedCount = 0;
  let totalElapsedMs = 0;
  const times = [];

  console.log(`  %-36s | %-6s | %-5s | %-10s`.replace(/%/g, '%%'), "Puzzle ID", "Status", "Cost", "Runtime");
  console.log(`  ` + "-".repeat(67));

  for (const puzzle of puzzles) {
    const result = runOrthoAlign(puzzle.target, puzzle.mutable);

    totalElapsedMs += result.elapsedMs;
    times.push(result.elapsedMs);

    const isOk = result.status === 'ok';
    if (isOk) solvedCount++;

    const statusStr = isOk ? "OK" : result.status.toUpperCase();
    const costStr = result.cost !== null ? String(result.cost) : "NA";
    const runtimeStr = (result.elapsedMs / 1000).toFixed(2) + " s";

    console.log(
      `  ${puzzle.id.padEnd(36)} | ${statusStr.padEnd(6)} | ${costStr.padStart(5)} | ${runtimeStr.padStart(10)}`
    );
  }

  const avgMs = totalElapsedMs / puzzles.length;
  times.sort((a, b) => a - b);
  const medianMs = times[Math.floor(times.length / 2)];
  const maxMs = Math.max(...times);

  console.log(`  ` + "-".repeat(67));
  console.log(`\n  Summary:`);
  console.log(`  - Completed   : ${solvedCount} / ${puzzles.length}`);
  console.log(`  - Total time  : ${(totalElapsedMs / 1000).toFixed(2)} s`);
  console.log(`  - Avg time    : ${(avgMs / 1000).toFixed(2)} s`);
  console.log(`  - Median time : ${(medianMs / 1000).toFixed(2)} s`);
  console.log(`  - Max time    : ${(maxMs / 1000).toFixed(2)} s`);
  console.log("=================================================");
}

main();
