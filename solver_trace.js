'use strict';

const {
  parseGenome,
  cloneGenome,
  serializeGenome,
  genomesEqual,
  applyInversion,
  applyDeletion,
  applyDuplication
} = require('./gameEngine');
const { __internals } = require('./solver');

const DEFAULT_MAX_MOVES = 150;

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

function formatScore(score) {
  return __internals.formatScore(score);
}

function formatGeneList(genes, limit = 8) {
  if (genes.length <= limit) {
    return genes.join(', ');
  }

  const head = genes.slice(0, Math.ceil(limit / 2)).join(', ');
  const tail = genes.slice(-Math.floor(limit / 2)).join(', ');
  return `${head}, ..., ${tail}`;
}

function snapshotGenome(genome) {
  return {
    genes: [...genome.genes],
    terminusIndex: genome.terminusIndex,
    serial: serializeGenome(genome),
    left: genome.genes.slice(0, genome.terminusIndex),
    right: genome.genes.slice(genome.terminusIndex + 1)
  };
}

function makeRange(start, length, kind, marker) {
  return { start, length, kind, marker };
}

function moveTypeLabel(move) {
  if (move.type === 'duplication') return 'Duplication';
  if (move.type === 'deletion') return 'Deletion';
  if (move.type === 'inversion') return 'Inversion';
  return move.type;
}

function compactMoveLabel(move) {
  if (move.type === 'duplication') {
    return `D ${move.srcStart}:${move.srcLength} -> ${move.destIndex}`;
  }
  if (move.type === 'deletion') {
    return `L ${move.start}:${move.length}`;
  }
  if (move.type === 'inversion') {
    return `I ${move.start}:${move.length}`;
  }
  return JSON.stringify(move);
}

function buildNarration(beforeGenome, afterGenome, move, beforeCore, afterCore, beforeScore, afterScore) {
  if (move.type === 'duplication') {
    const source = beforeGenome.genes.slice(move.srcStart, move.srcStart + move.srcLength);
    const sourceSide = move.srcStart < beforeGenome.terminusIndex ? 'left' : 'right';
    const destSide = move.destIndex <= beforeGenome.terminusIndex ? 'left' : 'right';
    const inserted = sourceSide === destSide ? source : [...source].reverse();
    const crossTerminus = sourceSide !== destSide;

    return {
      title: `Copy ${move.srcLength} gene${move.srcLength === 1 ? '' : 's'} into the ${destSide} frontier`,
      summary: crossTerminus
        ? `The solver copies ${formatGeneList(source)} from the ${sourceSide} side across [t], so the block reverses into ${formatGeneList(inserted)} at the ${destSide} frontier.`
        : `The solver copies ${formatGeneList(source)} from the ${sourceSide} side directly into the ${destSide} frontier to extend the exact match around [t].`,
      details: [
        `source block: ${formatGeneList(source)}`,
        `inserted block: ${formatGeneList(inserted)}`,
        `anchored core: ${beforeCore.left + beforeCore.right} -> ${afterCore.left + afterCore.right}`,
        `score: ${formatScore(beforeScore)} -> ${formatScore(afterScore)}`
      ],
      markers: {
        before: [makeRange(move.srcStart, move.srcLength, 'duplication-source', 'arrow-green.png')],
        after: [makeRange(move.destIndex, move.srcLength, 'duplication-destination', 'arrow-blue.png')]
      }
    };
  }

  if (move.type === 'deletion') {
    const removed = beforeGenome.genes.slice(move.start, move.start + move.length);
    return {
      title: `Delete an excess block of ${move.length}`,
      summary: `The solver removes ${formatGeneList(removed)} because that block is extra at the current frontier and the target can still be completed without it.`,
      details: [
        `removed block: ${formatGeneList(removed)}`,
        `anchored core: ${beforeCore.left + beforeCore.right} -> ${afterCore.left + afterCore.right}`,
        `score: ${formatScore(beforeScore)} -> ${formatScore(afterScore)}`
      ],
      markers: {
        before: [makeRange(move.start, move.length, 'deletion-source', 'arrow-red.png')],
        after: []
      }
    };
  }

  if (move.type === 'inversion') {
    const beforeSegment = beforeGenome.genes.slice(move.start, move.start + move.length);
    const afterSegment = [...beforeSegment].reverse();
    return {
      title: `Invert a ${move.length}-gene bridge across [t]`,
      summary: `The solver flips ${formatGeneList(beforeSegment)} across the terminus so it becomes ${formatGeneList(afterSegment)}, reshaping the local order before growing the core again.`,
      details: [
        `segment before: ${formatGeneList(beforeSegment)}`,
        `segment after: ${formatGeneList(afterSegment)}`,
        `anchored core: ${beforeCore.left + beforeCore.right} -> ${afterCore.left + afterCore.right}`,
        `score: ${formatScore(beforeScore)} -> ${formatScore(afterScore)}`
      ],
      markers: {
        before: [makeRange(move.start, move.length, 'inversion-source', 'arrow-purple.png')],
        after: [makeRange(move.start, move.length, 'inversion-result', 'arrow-purple.png')]
      }
    };
  }

  return {
    title: moveTypeLabel(move),
    summary: 'The solver applies the next move in its planned sequence.',
    details: [`score: ${formatScore(beforeScore)} -> ${formatScore(afterScore)}`],
    markers: {
      before: [],
      after: []
    }
  };
}

function summarizeCandidate(beforeGenome, candidate) {
  return {
    label: compactMoveLabel(candidate.move),
    type: candidate.move.type,
    title: moveTypeLabel(candidate.move),
    score: candidate.score,
    scoreText: formatScore(candidate.score),
    move: candidate.move
  };
}

function traceSolve(spec, options = {}) {
  const maxMoves = options.maxMoves || DEFAULT_MAX_MOVES;
  const mutableGenome = parseGenome(spec.mutableCsv);
  const targetGenome = parseGenome(spec.targetCsv);

  let current = cloneGenome(mutableGenome);
  const seen = new Set([serializeGenome(current)]);
  const steps = [];

  while (!genomesEqual(current, targetGenome) && steps.length < maxMoves) {
    const beforeGenome = current;
    const beforeScore = __internals.scoreGenome(beforeGenome, targetGenome);
    const beforeCore = __internals.computeAnchoredCore(beforeGenome, targetGenome);
    const candidates = __internals.generateCandidates(beforeGenome, targetGenome);
    const immediate = __internals.evaluateImmediateCandidates(
      beforeGenome,
      targetGenome,
      candidates,
      seen,
      beforeScore
    );
    const best = __internals.chooseLookaheadMove(
      beforeGenome,
      targetGenome,
      immediate,
      seen,
      false
    );

    if (!best) break;

    const afterGenome = best.result;
    const afterScore = best.score;
    const afterCore = __internals.computeAnchoredCore(afterGenome, targetGenome);
    const narration = buildNarration(
      beforeGenome,
      afterGenome,
      best.move,
      beforeCore,
      afterCore,
      beforeScore,
      afterScore
    );

    steps.push({
      index: steps.length + 1,
      move: best.move,
      moveLabel: compactMoveLabel(best.move),
      moveTypeLabel: moveTypeLabel(best.move),
      before: snapshotGenome(beforeGenome),
      after: snapshotGenome(afterGenome),
      baseScore: beforeScore,
      baseScoreText: formatScore(beforeScore),
      nextScore: afterScore,
      nextScoreText: formatScore(afterScore),
      beforeCore,
      afterCore,
      totalCandidates: candidates.length,
      improvingCandidates: immediate.length,
      topCandidates: immediate.slice(0, 5).map(candidate => summarizeCandidate(beforeGenome, candidate)),
      title: narration.title,
      summary: narration.summary,
      details: narration.details,
      markers: narration.markers
    });

    current = afterGenome;
    seen.add(best.serial);
  }

  const finalGenome = current;
  const solved = genomesEqual(finalGenome, targetGenome);
  const referenceScore = spec.referenceScore || null;

  return {
    puzzle: {
      id: spec.id,
      sourceLabel: spec.sourceLabel,
      source: spec.source,
      category: spec.category || [],
      referenceScore,
      referenceScoreSource: spec.referenceScoreSource || null
    },
    solved,
    moveCount: steps.length,
    ratio: referenceScore ? (steps.length / referenceScore) : null,
    maxMoves,
    initial: snapshotGenome(mutableGenome),
    target: snapshotGenome(targetGenome),
    final: snapshotGenome(finalGenome),
    steps
  };
}

module.exports = {
  DEFAULT_MAX_MOVES,
  compactMoveLabel,
  formatGeneList,
  formatScore,
  snapshotGenome,
  traceSolve
};
