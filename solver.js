// @version v30
// Genome Sorting Heuristic Solver - Terminus-Frontier Block Grower
//
// Strategy: build an exact matching core around [t], prefer block duplications
// and deletions at the current frontier, and keep inversions available as
// structural reset moves when the two sides are locally misoriented.

'use strict';

const {
  applyInversion,
  applyDeletion,
  applyDuplication,
  genomesEqual,
  cloneGenome,
  serializeGenome
} = require('./gameEngine');

const MAX_INVERSION_RADIUS = 12;
const MAX_BLOCK_DUPLICATION = 64;
const MAX_FRONTIER_DELETION = 64;
const MAX_SOURCE_MATCHES = 8;
const LOOKAHEAD_CANDIDATES = 8;
const MAX_DUPLICATION_LENGTH_OPTIONS = 3;
const EXTRA_SHORT_INVERSION_CANDIDATES = 4;
const INVERSION_ROLLOUT_CORE_THRESHOLD = 1;
const INVERSION_ROLLOUT_CANDIDATES = 8;
const INVERSION_ROLLOUT_MAX_MOVES = 24;
const DUPLICATION_LENGTH_ROLLOUT_CANDIDATES = 4;
const DUPLICATION_LENGTH_ROLLOUT_MAX_MOVES = 12;
const NEUTRAL_INVERSION_ROLLOUT_CANDIDATES = 3;
const STRONG_GROWTH_GAP_THRESHOLD = 20;
const GROWTH_STATE_SOURCE_MATCH_LIMIT = 4;
const FRONTIER_DELETION_ENABLE_GAP = 3;

/**
 * Solve a genome sorting puzzle.
 *
 * @param {{ genes: string[], terminusIndex: number }} mutableGenome
 * @param {{ genes: string[], terminusIndex: number }} targetGenome
 * @param {{ maxMoves?: number, debug?: boolean }} [options]
 * @returns {{ moves: object[], finalGenome: object, solved: boolean, moveCount: number }}
 */
function solve(mutableGenome, targetGenome, options = {}) {
  const { maxMoves = 150, debug = false, rolloutMode = false } = options;

  let current = cloneGenome(mutableGenome);
  const target = targetGenome;
  const moves = [];
  const seen = new Set([serializeGenome(current)]);

  while (!genomesEqual(current, target) && moves.length < maxMoves) {
    const baseScore = scoreGenome(current, target);
    const candidates = generateCandidates(current, target);
    const immediate = evaluateImmediateCandidates(current, target, candidates, seen, baseScore);
    const best = chooseLookaheadMove(current, target, immediate, seen, rolloutMode);

    if (!best) {
      if (debug) {
        console.log(`[solver] stuck at move ${moves.length}, score=${formatScore(baseScore)}`);
      }
      break;
    }

    if (debug) {
      console.log(
        `[solver] move ${moves.length + 1}: ${JSON.stringify(best.move)} ` +
        `${formatScore(baseScore)} -> ${formatScore(best.score)}`
      );
    }

    moves.push(best.move);
    current = best.result;
    seen.add(serializeGenome(current));
  }

  return {
    moves,
    finalGenome: current,
    solved: genomesEqual(current, target),
    moveCount: moves.length
  };
}

function generateCandidates(current, target) {
  const core = computeAnchoredCore(current, target);
  const candidates = new Map();

  addFrontierDuplicationCandidates(candidates, current, target, core, 'left');
  addFrontierDuplicationCandidates(candidates, current, target, core, 'right');
  if (shouldUseFrontierDeletions(current, target)) {
    addFrontierDeletionCandidates(candidates, current, target, core, 'left');
    addFrontierDeletionCandidates(candidates, current, target, core, 'right');
  }
  if (shouldUseInversionCandidates(current, target, core)) {
    addInversionCandidates(candidates, current);
  }

  return [...candidates.values()];
}

function evaluateImmediateCandidates(current, target, candidates, seen, baseScore) {
  const evaluated = [];

  for (const move of candidates) {
    let result;
    try {
      result = applyMove(current, move);
    } catch (_) {
      continue;
    }

    const serial = serializeGenome(result);
    if (seen.has(serial)) continue;

    const score = scoreGenome(result, target);
    if (compareScores(score, baseScore) <= 0) continue;

    evaluated.push({ move, result, score, serial });
  }

  evaluated.sort((a, b) => compareScores(b.score, a.score));
  return evaluated;
}

function chooseLookaheadMove(current, target, immediate, seen, rolloutMode = false) {
  if (immediate.length === 0) return null;

  const shortlist = immediate.slice(0, LOOKAHEAD_CANDIDATES);
  const extraInversions = immediate
    .filter(candidate => candidate.move.type === 'inversion')
    .sort((a, b) => {
      if (a.move.length !== b.move.length) return a.move.length - b.move.length;
      return compareScores(b.score, a.score);
    });

  for (const candidate of extraInversions) {
    if (shortlist.some(existing => existing.serial === candidate.serial)) continue;
    shortlist.push(candidate);
    if (shortlist.length >= LOOKAHEAD_CANDIDATES + EXTRA_SHORT_INVERSION_CANDIDATES) break;
  }

  let best = null;

  for (const candidate of shortlist) {
    const lookahead = bestSuccessorScore(candidate.result, target, seen, candidate.serial, candidate.score);
    const rank = [...lookahead, ...candidate.score];

    if (!best || compareScores(rank, best.rank) > 0) {
      best = { ...candidate, rank };
    }
  }

  if (!rolloutMode) {
    const rolloutBest = chooseOpeningRolloutCandidate(current, target, immediate, best);
    if (rolloutBest) {
      best = rolloutBest;
    }
  }

  if (!rolloutMode && shouldUseDuplicationLengthRollout(current, target)) {
    const lengthRolloutBest = chooseDuplicationLengthRolloutCandidate(target, immediate, best);
    if (lengthRolloutBest) {
      best = lengthRolloutBest;
    }
  }

  return best || immediate[0];
}

function chooseOpeningRolloutCandidate(current, target, immediate, fallback) {
  const core = computeAnchoredCore(current, target);
  if (core.left + core.right > INVERSION_ROLLOUT_CORE_THRESHOLD) return fallback;

  const rolloutCandidates = [];
  if (fallback) {
    rolloutCandidates.push(fallback);
  }

  const inversionCandidates = immediate
    .filter(candidate => candidate.move.type === 'inversion')
    .sort((a, b) => compareScores(b.score, a.score));

  for (const candidate of inversionCandidates) {
    if (rolloutCandidates.some(existing => existing.serial === candidate.serial)) continue;
    rolloutCandidates.push(candidate);
    if (rolloutCandidates.length >= INVERSION_ROLLOUT_CANDIDATES + (fallback ? 1 : 0)) break;
  }

  // When no improving inversion exists, also try a few near-neutral inversions as
  // potential setup moves — they temporarily worsen the score but may unlock a
  // shorter overall path.
  if (rolloutCandidates.length <= 1 && NEUTRAL_INVERSION_ROLLOUT_CANDIDATES > 0) {
    const baseScore = scoreGenome(current, target);
    const tIdx = current.terminusIndex;
    const maxBefore = Math.min(tIdx, MAX_INVERSION_RADIUS);
    const maxAfter = Math.min(current.genes.length - tIdx - 1, MAX_INVERSION_RADIUS);
    const neutralInvs = [];
    for (let before = 1; before <= maxBefore; before++) {
      for (let after = 1; after <= maxAfter; after++) {
        const move = { type: 'inversion', start: tIdx - before, length: before + 1 + after };
        let result;
        try { result = applyMove(current, move); } catch (_) { continue; }
        const serial = serializeGenome(result);
        if (rolloutCandidates.some(e => e.serial === serial)) continue;
        const score = scoreGenome(result, target);
        if (compareScores(score, baseScore) >= 0) continue;
        neutralInvs.push({ move, result, score, serial });
      }
    }
    neutralInvs.sort((a, b) => compareScores(b.score, a.score));
    for (const c of neutralInvs.slice(0, NEUTRAL_INVERSION_ROLLOUT_CANDIDATES)) {
      rolloutCandidates.push(c);
    }
  }

  if (rolloutCandidates.length <= 1) return fallback;

  let best = null;
  for (const candidate of rolloutCandidates) {
    const rollout = solve(candidate.result, target, {
      maxMoves: INVERSION_ROLLOUT_MAX_MOVES,
      rolloutMode: true
    });
    const finalScore = scoreGenome(rollout.finalGenome, target);
    const rolloutRank = [
      rollout.solved ? 1 : 0,
      rollout.solved ? -rollout.moveCount : 0,
      ...finalScore,
      ...candidate.score
    ];

    if (!best || compareScores(rolloutRank, best.rolloutRank) > 0) {
      best = {
        ...candidate,
        rank: rolloutRank,
        rolloutRank
      };
    }
  }

  return best || fallback;
}

function chooseDuplicationLengthRolloutCandidate(target, immediate, fallback) {
  if (!fallback || fallback.move.type !== 'duplication') return fallback;

  const shorterLengths = immediate
    .filter(candidate =>
      candidate.move.type === 'duplication' &&
      candidate.move.destIndex === fallback.move.destIndex &&
      candidate.move.srcStart === fallback.move.srcStart &&
      candidate.move.srcLength < fallback.move.srcLength
    )
    .sort((a, b) => {
      const leftGap = fallback.move.srcLength - a.move.srcLength;
      const rightGap = fallback.move.srcLength - b.move.srcLength;
      if (leftGap !== rightGap) return leftGap - rightGap;
      return compareScores(b.score, a.score);
    })
    .slice(0, Math.max(0, DUPLICATION_LENGTH_ROLLOUT_CANDIDATES - 1));

  if (shorterLengths.length === 0) return fallback;

  const fallbackRollout = solve(fallback.result, target, {
    maxMoves: DUPLICATION_LENGTH_ROLLOUT_MAX_MOVES,
    rolloutMode: true
  });

  let best = fallback;
  let bestRollout = fallbackRollout;

  for (const candidate of shorterLengths) {
    const rollout = solve(candidate.result, target, {
      maxMoves: DUPLICATION_LENGTH_ROLLOUT_MAX_MOVES,
      rolloutMode: true
    });

    const candidateBeatsFallback =
      rollout.solved &&
      (!bestRollout.solved || rollout.moveCount < bestRollout.moveCount);

    if (candidateBeatsFallback) {
      best = candidate;
      bestRollout = rollout;
    }
  }

  return best;
}

function bestSuccessorScore(current, target, seen, currentSerial, fallbackScore) {
  const candidates = generateCandidates(current, target);
  let best = fallbackScore;

  for (const move of candidates) {
    let result;
    try {
      result = applyMove(current, move);
    } catch (_) {
      continue;
    }

    const serial = serializeGenome(result);
    if (seen.has(serial) || serial === currentSerial) continue;

    const score = scoreGenome(result, target);
    if (compareScores(score, best) > 0) {
      best = score;
    }
  }

  return best;
}

function addFrontierDuplicationCandidates(candidates, current, target, core, side) {
  const targetFrontier = side === 'left' ? core.targetLeftFrontier : core.targetRightFrontier;
  const remaining = side === 'left'
    ? targetFrontier
    : target.genes.length - targetFrontier;

  if (remaining <= 0) return;

  const destIndex = side === 'left' ? core.currentLeftFrontier : core.currentRightFrontier;
  const maxLen = Math.min(MAX_BLOCK_DUPLICATION, remaining);
  const sourceMatchLimit = isStrongGrowthState(current, target)
    ? GROWTH_STATE_SOURCE_MATCH_LIMIT
    : MAX_SOURCE_MATCHES;
  const lengthOptionLimit = isStrongGrowthState(current, target)
    ? 1
    : MAX_DUPLICATION_LENGTH_OPTIONS;
  let matchedLengths = 0;

  for (let len = maxLen; len >= 1; len--) {
    const desired = side === 'left'
      ? target.genes.slice(targetFrontier - len, targetFrontier)
      : target.genes.slice(targetFrontier, targetFrontier + len);

    const matches = findSourceMatches(current, desired, side, destIndex, len, sourceMatchLimit);
    for (const srcStart of matches) {
      addCandidate(candidates, {
        type: 'duplication',
        srcStart,
        srcLength: len,
        destIndex
      });
    }

    if (matches.length > 0) {
      matchedLengths++;
      if (matchedLengths >= lengthOptionLimit) return;
    }
  }
}

function addFrontierDeletionCandidates(candidates, current, target, core, side) {
  if (side === 'left') {
    const maxLen = Math.min(MAX_FRONTIER_DELETION, core.currentLeftFrontier);
    for (let len = 1; len <= maxLen; len++) {
      const start = core.currentLeftFrontier - len;
      if (!segmentIsExcess(current, target, start, len)) continue;
      addCandidate(candidates, {
        type: 'deletion',
        start,
        length: len
      });
    }
    return;
  }

  const maxLen = Math.min(
    MAX_FRONTIER_DELETION,
    current.genes.length - core.currentRightFrontier
  );
  for (let len = 1; len <= maxLen; len++) {
    const start = core.currentRightFrontier;
    if (!segmentIsExcess(current, target, start, len)) continue;
    addCandidate(candidates, {
      type: 'deletion',
      start,
      length: len
    });
  }
}

function addInversionCandidates(candidates, current) {
  const tIdx = current.terminusIndex;
  const maxBefore = Math.min(tIdx, MAX_INVERSION_RADIUS);
  const maxAfter = Math.min(current.genes.length - tIdx - 1, MAX_INVERSION_RADIUS);

  for (let before = 1; before <= maxBefore; before++) {
    for (let after = 1; after <= maxAfter; after++) {
      addCandidate(candidates, {
        type: 'inversion',
        start: tIdx - before,
        length: before + 1 + after
      });
    }
  }
}

function findSourceMatches(current, desired, destSide, destIndex, len, limit = MAX_SOURCE_MATCHES) {
  const results = [];
  const sameSide = destSide;
  const crossSide = destSide === 'left' ? 'right' : 'left';

  collectPatternMatches(
    results,
    current,
    sameSide,
    desired,
    destIndex,
    len,
    limit
  );

  collectPatternMatches(
    results,
    current,
    crossSide,
    reverseArray(desired),
    destIndex,
    len,
    limit
  );

  return results.slice(0, limit);
}

function collectPatternMatches(results, current, sourceSide, pattern, destIndex, len, limit) {
  const positions = [];
  const tIdx = current.terminusIndex;
  const startMin = sourceSide === 'left' ? 0 : tIdx + 1;
  const startMax = sourceSide === 'left'
    ? tIdx - len
    : current.genes.length - len;

  for (let start = startMin; start <= startMax; start++) {
    if (!segmentEquals(current.genes, start, pattern)) continue;
    positions.push(start);
  }

  positions.sort((a, b) => distanceToDestination(a, destIndex) - distanceToDestination(b, destIndex));

  for (const start of positions) {
    if (results.includes(start)) continue;
    results.push(start);
    if (results.length >= limit) return;
  }
}

function segmentEquals(genes, start, pattern) {
  for (let i = 0; i < pattern.length; i++) {
    if (genes[start + i] !== pattern[i]) return false;
  }
  return true;
}

function distanceToDestination(srcStart, destIndex) {
  return Math.abs(srcStart - destIndex);
}

function reverseArray(values) {
  return [...values].reverse();
}

function shouldUseDuplicationLengthRollout(current, target) {
  return !isStrongGrowthState(current, target);
}

function shouldUseFrontierDeletions(current, target) {
  return (target.genes.length - current.genes.length) <= FRONTIER_DELETION_ENABLE_GAP;
}

function shouldUseInversionCandidates(current, target, core) {
  return !isStrongGrowthState(current, target) ||
    (core.left + core.right) <= INVERSION_ROLLOUT_CORE_THRESHOLD;
}

function isStrongGrowthState(current, target) {
  return (target.genes.length - current.genes.length) >= STRONG_GROWTH_GAP_THRESHOLD;
}

function computeAnchoredCore(current, target) {
  const currentLeftLimit = current.terminusIndex;
  const targetLeftLimit = target.terminusIndex;
  const leftLimit = Math.min(currentLeftLimit, targetLeftLimit);

  let left = 0;
  while (
    left < leftLimit &&
    current.genes[current.terminusIndex - 1 - left] === target.genes[target.terminusIndex - 1 - left]
  ) {
    left++;
  }

  const currentRightLimit = current.genes.length - current.terminusIndex - 1;
  const targetRightLimit = target.genes.length - target.terminusIndex - 1;
  const rightLimit = Math.min(currentRightLimit, targetRightLimit);

  let right = 0;
  while (
    right < rightLimit &&
    current.genes[current.terminusIndex + 1 + right] === target.genes[target.terminusIndex + 1 + right]
  ) {
    right++;
  }

  return {
    left,
    right,
    currentLeftFrontier: current.terminusIndex - left,
    currentRightFrontier: current.terminusIndex + 1 + right,
    targetLeftFrontier: target.terminusIndex - left,
    targetRightFrontier: target.terminusIndex + 1 + right
  };
}

function scoreGenome(current, target) {
  const core = computeAnchoredCore(current, target);
  const anchoredMatches = countAnchoredMatches(current, target);
  const weightedMatches = weightedAnchoredMatches(current, target);
  const countPenalty = geneCountDistance(current, target);
  const lengthPenalty = Math.abs(current.genes.length - target.genes.length);

  return [
    core.left + core.right,
    Math.min(core.left, core.right),
    -countPenalty,
    -lengthPenalty,
    anchoredMatches,
    weightedMatches
  ];
}

function countAnchoredMatches(current, target) {
  let matches = 0;
  const leftLimit = Math.min(current.terminusIndex, target.terminusIndex);
  const rightLimit = Math.min(
    current.genes.length - current.terminusIndex - 1,
    target.genes.length - target.terminusIndex - 1
  );

  for (let offset = 1; offset <= leftLimit; offset++) {
    if (current.genes[current.terminusIndex - offset] === target.genes[target.terminusIndex - offset]) {
      matches++;
    }
  }

  for (let offset = 1; offset <= rightLimit; offset++) {
    if (current.genes[current.terminusIndex + offset] === target.genes[target.terminusIndex + offset]) {
      matches++;
    }
  }

  return matches;
}

function weightedAnchoredMatches(current, target) {
  let score = 0;
  const leftLimit = Math.min(current.terminusIndex, target.terminusIndex);
  const rightLimit = Math.min(
    current.genes.length - current.terminusIndex - 1,
    target.genes.length - target.terminusIndex - 1
  );

  for (let offset = 1; offset <= leftLimit; offset++) {
    if (current.genes[current.terminusIndex - offset] === target.genes[target.terminusIndex - offset]) {
      score += Math.max(1, 24 - offset);
    }
  }

  for (let offset = 1; offset <= rightLimit; offset++) {
    if (current.genes[current.terminusIndex + offset] === target.genes[target.terminusIndex + offset]) {
      score += Math.max(1, 24 - offset);
    }
  }

  return score;
}

function geneCountDistance(current, target) {
  const counts = buildGeneCounts(target.genes);

  for (const gene of current.genes) {
    if (gene === '[t]') continue;
    counts[gene] = (counts[gene] || 0) - 1;
  }

  let distance = 0;
  for (const gene of Object.keys(counts)) {
    distance += Math.abs(counts[gene]);
  }
  return distance;
}

function segmentIsExcess(current, target, start, length) {
  const targetCounts = buildGeneCounts(target.genes);
  const currentCounts = buildGeneCounts(current.genes);
  const removedCounts = Object.create(null);

  for (let i = start; i < start + length; i++) {
    const gene = current.genes[i];
    if (gene === '[t]') return false;
    removedCounts[gene] = (removedCounts[gene] || 0) + 1;
  }

  for (const gene of Object.keys(removedCounts)) {
    const remaining = (currentCounts[gene] || 0) - removedCounts[gene];
    if (remaining < (targetCounts[gene] || 0)) return false;
  }

  return true;
}

function buildGeneCounts(genes) {
  const counts = Object.create(null);
  for (const gene of genes) {
    if (gene === '[t]') continue;
    counts[gene] = (counts[gene] || 0) + 1;
  }
  return counts;
}

function compareScores(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    if (left !== right) return left - right;
  }
  return 0;
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

function addCandidate(candidates, move) {
  candidates.set(JSON.stringify(move), move);
}

function formatScore(score) {
  return `[${score.join(', ')}]`;
}

module.exports = { solve };
