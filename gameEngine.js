'use strict';

/**
 * gameEngine.js — Genome Sorting Problem rules engine.
 *
 * Pure functions only. No solver logic, no heuristics, no randomness.
 * This file must never be modified by the autoresearch agent.
 *
 * Genome representation: { genes: string[], terminusIndex: number }
 *   genes        — ordered array of gene name strings, e.g. ['Lys', '[t]', 'Met']
 *   terminusIndex — cached index of '[t]' in genes; kept in sync after every operation
 */

// ---------------------------------------------------------------------------
// Parse / serialize
// ---------------------------------------------------------------------------

/**
 * Parse a comma-separated sequence string into a genome object.
 * Strips '[o]' if present. Validates exactly one '[t]'.
 * @param {string} csvString
 * @returns {{ genes: string[], terminusIndex: number }}
 */
function parseGenome(csvString) {
  const genes = csvString
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== '[o]');

  const tCount = genes.filter(g => g === '[t]').length;
  if (tCount !== 1) {
    throw new Error(`Genome must have exactly one [t], found ${tCount}: "${csvString.slice(0, 80)}"`);
  }

  const terminusIndex = genes.indexOf('[t]');
  return { genes, terminusIndex };
}

/**
 * Serialize a genome back to a comma-separated string.
 * @param {{ genes: string[] }} genome
 * @returns {string}
 */
function serializeGenome(genome) {
  return genome.genes.join(',');
}

// ---------------------------------------------------------------------------
// Comparison / clone
// ---------------------------------------------------------------------------

/**
 * Deep-compare two genomes for equality.
 * @returns {boolean}
 */
function genomesEqual(a, b) {
  if (a.genes.length !== b.genes.length) return false;
  for (let i = 0; i < a.genes.length; i++) {
    if (a.genes[i] !== b.genes[i]) return false;
  }
  return true;
}

/**
 * Deep-clone a genome (immutable-style).
 * @returns {{ genes: string[], terminusIndex: number }}
 */
function cloneGenome(genome) {
  return { genes: [...genome.genes], terminusIndex: genome.terminusIndex };
}

// ---------------------------------------------------------------------------
// Internal: recompute + validate terminus
// ---------------------------------------------------------------------------

/**
 * Recompute and validate the terminusIndex field after a mutation.
 * Mutates genome in place for efficiency; always call on newly created objects.
 * @param {{ genes: string[], terminusIndex: number }} genome
 * @returns {typeof genome}
 */
function recomputeTerminus(genome) {
  let idx = -1;
  let count = 0;
  for (let i = 0; i < genome.genes.length; i++) {
    if (genome.genes[i] === '[t]') { idx = i; count++; }
  }
  if (count === 0) throw new Error('Genome lost the [t] terminus marker');
  if (count > 1)  throw new Error(`Genome has ${count} terminus markers after operation`);
  genome.terminusIndex = idx;
  return genome;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Apply an inversion to a genome.
 *
 * CONSTRAINT: the segment [start, start+length) must include [t].
 * (Conservative rule: [t] must be strictly inside the segment.)
 *
 * Returns a new genome object; does not mutate the input.
 *
 * @param {{ genes: string[], terminusIndex: number }} genome
 * @param {number} start   — inclusive start index
 * @param {number} length  — number of genes to reverse
 * @returns {{ genes: string[], terminusIndex: number }}
 */
function applyInversion(genome, start, length) {
  const end = start + length;
  const n = genome.genes.length;

  if (start < 0 || length <= 0 || end > n) {
    throw new Error(
      `Inversion out of bounds: start=${start}, length=${length}, genomeLength=${n}`
    );
  }

  const tIdx = genome.terminusIndex;
  if (tIdx < start || tIdx >= end) { // tIdx > end ?
    throw new Error(
      `Invalid inversion: segment [${start},${end}) does not include terminus at index ${tIdx}`
    );
  }

  const genes = [...genome.genes];
  let l = start, r = end - 1;
  while (l < r) {
    [genes[l], genes[r]] = [genes[r], genes[l]];
    l++; r--;
  }

  const result = { genes, terminusIndex: -1 };
  return recomputeTerminus(result);
}

/**
 * Apply a deletion to a genome.
 *
 * CONSTRAINT: the segment must not contain [t].
 *
 * Returns a new genome object; does not mutate the input.
 *
 * @param {{ genes: string[], terminusIndex: number }} genome
 * @param {number} start   — inclusive start index
 * @param {number} length  — number of genes to remove
 * @returns {{ genes: string[], terminusIndex: number }}
 */
function applyDeletion(genome, start, length) {
  const end = start + length;
  const n = genome.genes.length;

  if (start < 0 || length <= 0 || end > n) {
    throw new Error(
      `Deletion out of bounds: start=${start}, length=${length}, genomeLength=${n}`
    );
  }

  const tIdx = genome.terminusIndex;
  if (tIdx >= start && tIdx < end) {
    throw new Error(
      `Invalid deletion: segment [${start},${end}) would delete terminus at index ${tIdx}`
    );
  }

  const genes = [...genome.genes.slice(0, start), ...genome.genes.slice(end)];
  const result = { genes, terminusIndex: -1 };
  return recomputeTerminus(result);
}

/**
 * Apply a duplication to a genome.
 *
 * CONSTRAINT: the source segment must not contain [t].
 * Cross-terminus rule: if source and destination are on opposite sides of [t],
 *   the inserted copy is reversed.
 *
 * "Left" side  = indices < terminusIndex  (destIndex <= terminusIndex counts as left)
 * "Right" side = indices > terminusIndex  (destIndex > terminusIndex counts as right)
 *
 * Returns a new genome object; does not mutate the input.
 *
 * @param {{ genes: string[], terminusIndex: number }} genome
 * @param {number} srcStart  — start of the source region
 * @param {number} srcLength — number of genes to copy
 * @param {number} destIndex — insertion point (0 = before first gene, n = after last)
 * @returns {{ genes: string[], terminusIndex: number }}
 */
function applyDuplication(genome, srcStart, srcLength, destIndex) {
  const srcEnd = srcStart + srcLength;
  const n = genome.genes.length;

  if (srcStart < 0 || srcLength <= 0 || srcEnd > n) {
    throw new Error(
      `Duplication source out of bounds: srcStart=${srcStart}, srcLength=${srcLength}, genomeLength=${n}`
    );
  }
  if (destIndex < 0 || destIndex > n) {
    throw new Error(
      `Duplication destination out of bounds: destIndex=${destIndex}, genomeLength=${n}`
    );
  }

  const tIdx = genome.terminusIndex;
  if (tIdx >= srcStart && tIdx < srcEnd) {
    throw new Error(
      `Invalid duplication: source segment [${srcStart},${srcEnd}) contains terminus at ${tIdx}`
    );
  }

  // Cross-terminus detection
  const sourceSide = srcStart < tIdx ? 'left' : 'right';
  const destSide   = destIndex <= tIdx ? 'left' : 'right';
  const crossTerminus = sourceSide !== destSide;

  let segment = genome.genes.slice(srcStart, srcEnd);
  if (crossTerminus) segment = [...segment].reverse();

  const genes = [
    ...genome.genes.slice(0, destIndex),
    ...segment,
    ...genome.genes.slice(destIndex)
  ];

  const result = { genes, terminusIndex: -1 };
  return recomputeTerminus(result);
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Validate a proposed operation without applying it.
 * @param {{ genes: string[], terminusIndex: number }} genome
 * @param {{ type: string, [key: string]: any }} op
 * @returns {{ valid: boolean, reason: string }}
 */
function validateOperation(genome, op) {
  try {
    if (op.type === 'inversion') {
      applyInversion(genome, op.start, op.length);
    } else if (op.type === 'deletion') {
      applyDeletion(genome, op.start, op.length);
    } else if (op.type === 'duplication') {
      applyDuplication(genome, op.srcStart, op.srcLength, op.destIndex);
    } else {
      return { valid: false, reason: `Unknown operation type: "${op.type}"` };
    }
    return { valid: true, reason: '' };
  } catch (e) {
    return { valid: false, reason: e.message };
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  parseGenome,
  serializeGenome,
  genomesEqual,
  cloneGenome,
  recomputeTerminus,
  applyInversion,
  applyDeletion,
  applyDuplication,
  validateOperation
};
