// @version v0
// Genome Sorting Heuristic Solver — Terminus-Anchored Greedy
//
// Strategy: scan outward from [t], try inversions first (highest value),
// then targeted duplication or deletion to fix each mismatch.
// This is the ONLY file the autoresearch agent is allowed to modify.

'use strict';

const {
  applyInversion,
  applyDeletion,
  applyDuplication,
  genomesEqual,
  cloneGenome,
  serializeGenome
} = require('./gameEngine');

// ---------------------------------------------------------------------------
// Public API — must never change signature
// ---------------------------------------------------------------------------

/**
 * Solve a genome sorting puzzle.
 *
 * @param {{ genes: string[], terminusIndex: number }} mutableGenome
 * @param {{ genes: string[], terminusIndex: number }} targetGenome
 * @param {{ maxMoves?: number, debug?: boolean }} [options]
 * @returns {{ moves: object[], finalGenome: object, solved: boolean, moveCount: number }}
 */
function solve(mutableGenome, targetGenome, options = {}) {
  const { maxMoves = 150, debug = false } = options;

  let current = cloneGenome(mutableGenome);
  const target = targetGenome;
  const moves = [];

  // Convergence guard: abort if we revisit a state
  const seen = new Set();
  seen.add(serializeGenome(current));

  while (!genomesEqual(current, target) && moves.length < maxMoves) {
    const baseScore = alignmentScore(current, target);

    let bestMove = null;
    let bestScore = baseScore;   // must strictly improve
    let bestGenome = null;

    // --- 1. Try all valid inversions (must include [t]) ---
    const tIdx = current.terminusIndex;
    const maxBefore = tIdx;
    const maxAfter  = current.genes.length - tIdx - 1;
    const maxRadius = Math.min(maxBefore, maxAfter, MAX_INVERSION_RADIUS);

    for (let before = 1; before <= maxBefore && before <= MAX_INVERSION_RADIUS; before++) {
      for (let after = 1; after <= maxAfter && after <= MAX_INVERSION_RADIUS; after++) {
        const start  = tIdx - before;
        const length = before + 1 + after; // includes [t]
        try {
          const result = applyInversion(current, start, length);
          const serial = serializeGenome(result);
          if (!seen.has(serial)) {
            const score = alignmentScore(result, target);
            if (score > bestScore) {
              bestScore  = score;
              bestMove   = { type: 'inversion', start, length };
              bestGenome = result;
            }
          }
        } catch (_) { /* invalid, skip */ }
      }
    }

    // --- 2. Try targeted duplications for mismatch positions ---
    const mismatches = findMismatchPositions(current, target);
    for (const pos of mismatches.slice(0, MAX_DUP_CANDIDATES)) {
      const needed = target.genes[pos];
      if (!needed || needed === '[t]') continue;

      // Find every occurrence of the needed gene in current (not at pos, not [t])
      for (let src = 0; src < current.genes.length; src++) {
        if (current.genes[src] === needed && src !== pos && current.genes[src] !== '[t]') {
          try {
            const result = applyDuplication(current, src, 1, pos);
            const serial = serializeGenome(result);
            if (!seen.has(serial)) {
              const score = alignmentScore(result, target);
              if (score > bestScore) {
                bestScore  = score;
                bestMove   = { type: 'duplication', srcStart: src, srcLength: 1, destIndex: pos };
                bestGenome = result;
              }
            }
          } catch (_) { /* invalid, skip */ }
          break; // one source per mismatch position in v0
        }
      }
    }

    // --- 3. Try targeted deletions for excess genes ---
    const excess = findExcessGenePositions(current, target);
    for (const pos of excess.slice(0, MAX_DEL_CANDIDATES)) {
      try {
        const result = applyDeletion(current, pos, 1);
        const serial = serializeGenome(result);
        if (!seen.has(serial)) {
          const score = alignmentScore(result, target);
          if (score > bestScore) {
            bestScore  = score;
            bestMove   = { type: 'deletion', start: pos, length: 1 };
            bestGenome = result;
          }
        }
      } catch (_) { /* [t] deletion rejected by engine */ }
    }

    // No improving move found → stuck, abort
    if (!bestMove) {
      if (debug) console.log(`[solver] stuck at move ${moves.length}, score=${baseScore}`);
      break;
    }

    if (debug) {
      console.log(`[solver] move ${moves.length + 1}: ${JSON.stringify(bestMove)}, score ${baseScore}→${bestScore}`);
    }

    moves.push(bestMove);
    current = bestGenome;
    seen.add(serializeGenome(current));
  }

  return {
    moves,
    finalGenome: current,
    solved: genomesEqual(current, target),
    moveCount: moves.length
  };
}

// ---------------------------------------------------------------------------
// Solver parameters — agents may tune these
// ---------------------------------------------------------------------------

const MAX_INVERSION_RADIUS = 12;  // max genes on each side of [t] to include in inversion
const MAX_DUP_CANDIDATES   = 6;   // how many mismatch positions to try duplication for
const MAX_DEL_CANDIDATES   = 6;   // how many excess positions to try deletion for

// ---------------------------------------------------------------------------
// Internal helpers — agents may refactor these freely
// ---------------------------------------------------------------------------

/**
 * Alignment score: count matching positions (positional match from index 0),
 * penalised by length difference.
 * Higher = better.
 */
function alignmentScore(current, target) {
  const len = Math.min(current.genes.length, target.genes.length);
  let score = 0;
  for (let i = 0; i < len; i++) {
    if (current.genes[i] === target.genes[i]) score++;
  }
  score -= Math.abs(current.genes.length - target.genes.length);
  return score;
}

/**
 * Return positions where current[i] !== target[i], sorted by distance from [t]
 * (closest first), so the solver prioritises fixing near-terminus mismatches.
 */
function findMismatchPositions(current, target) {
  const tIdx = target.terminusIndex;
  const len  = Math.min(current.genes.length, target.genes.length);
  const positions = [];

  for (let i = 0; i < len; i++) {
    if (current.genes[i] !== target.genes[i]) positions.push(i);
  }
  // Also flag positions where target is longer (missing genes)
  for (let i = len; i < target.genes.length; i++) {
    positions.push(i);
  }

  positions.sort((a, b) => Math.abs(a - tIdx) - Math.abs(b - tIdx));
  return positions;
}

/**
 * Return positions in current that hold a gene occurring more times in current
 * than in target (true excess). Sorted by distance from [t], farthest first
 * (clean up the edges before the centre).
 */
function findExcessGenePositions(current, target) {
  const tIdx = current.terminusIndex;

  // Count gene frequencies
  const targetCount = {};
  for (const g of target.genes) {
    if (g !== '[t]') targetCount[g] = (targetCount[g] || 0) + 1;
  }
  const remaining = { ...targetCount };

  // Walk current and mark positions where the gene is truly in excess
  const excess = [];
  for (let i = 0; i < current.genes.length; i++) {
    const g = current.genes[i];
    if (g === '[t]') continue;
    if ((remaining[g] || 0) > 0) {
      remaining[g]--;
    } else {
      excess.push(i);
    }
  }

  // Farthest from terminus first (clean periphery before centre)
  excess.sort((a, b) => Math.abs(b - tIdx) - Math.abs(a - tIdx));
  return excess;
}

module.exports = { solve };
