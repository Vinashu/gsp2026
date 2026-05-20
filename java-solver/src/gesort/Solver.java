package gesort;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Heuristic solver for the Genome Sorting Problem.
 * Ported from solver.js (v30).
 */
public final class Solver {

    private static final int MAX_INVERSION_RADIUS = 12;
    private static final int MAX_BLOCK_DUPLICATION = 64;
    private static final int MAX_FRONTIER_DELETION = 64;
    private static final int MAX_SOURCE_MATCHES = 8;
    private static final int LOOKAHEAD_CANDIDATES = 8;
    private static final int MAX_DUPLICATION_LENGTH_OPTIONS = 3;
    private static final int EXTRA_SHORT_INVERSION_CANDIDATES = 4;
    private static final int INVERSION_ROLLOUT_CORE_THRESHOLD = 1;
    private static final int INVERSION_ROLLOUT_CANDIDATES = 8;
    private static final int INVERSION_ROLLOUT_MAX_MOVES = 24;
    private static final int DUPLICATION_LENGTH_ROLLOUT_CANDIDATES = 4;
    private static final int DUPLICATION_LENGTH_ROLLOUT_MAX_MOVES = 12;
    private static final int NEUTRAL_INVERSION_ROLLOUT_CANDIDATES = 3;
    private static final int STRONG_GROWTH_GAP_THRESHOLD = 20;
    private static final int GROWTH_STATE_SOURCE_MATCH_LIMIT = 4;
    private static final int FRONTIER_DELETION_ENABLE_GAP = 3;

    public static class SolverOptions {
        public final int maxMoves;
        public final boolean debug;
        public final boolean rolloutMode;
        public final boolean useParallel;

        public SolverOptions() {
            this(150, false, false, true);
        }

        public SolverOptions(int maxMoves, boolean debug, boolean rolloutMode) {
            this(maxMoves, debug, rolloutMode, true);
        }

        public SolverOptions(int maxMoves, boolean debug, boolean rolloutMode, boolean useParallel) {
            this.maxMoves = maxMoves;
            this.debug = debug;
            this.rolloutMode = rolloutMode;
            this.useParallel = useParallel;
        }
    }

    public static class Result {
        public final List<Move> moves;
        public final Genome finalGenome;
        public final boolean solved;
        public final int moveCount;

        public Result(List<Move> moves, Genome finalGenome, boolean solved, int moveCount) {
            this.moves = moves;
            this.finalGenome = finalGenome;
            this.solved = solved;
            this.moveCount = moveCount;
        }
    }

    public static class EvaluatedMove {
        public final Move move;
        public final Genome result;
        public final int[] score;

        public EvaluatedMove(Move move, Genome result, int[] score) {
            this.move = move;
            this.result = result;
            this.score = score;
        }
    }

    public static class Selection {
        public final EvaluatedMove evaluatedMove;
        public final int[] rank;
        public final int[] rolloutRank;

        public Selection(EvaluatedMove evaluatedMove, int[] rank) {
            this(evaluatedMove, rank, null);
        }

        public Selection(EvaluatedMove evaluatedMove, int[] rank, int[] rolloutRank) {
            this.evaluatedMove = evaluatedMove;
            this.rank = rank;
            this.rolloutRank = rolloutRank;
        }
    }

    public static Result solve(Genome mutableGenome, Genome targetGenome) {
        return solve(mutableGenome, targetGenome, new SolverOptions());
    }

    public static Result solve(Genome mutableGenome, Genome targetGenome, SolverOptions options) {
        Genome current = GameEngine.cloneGenome(mutableGenome);
        List<Move> moves = new ArrayList<>();
        HashSet<Genome> seen = new HashSet<>();
        seen.add(current);

        while (!GameEngine.genomesEqual(current, targetGenome) && moves.size() < options.maxMoves) {
            int[] baseScore = scoreGenome(current, targetGenome);
            List<Move> candidates = generateCandidates(current, targetGenome);
            List<EvaluatedMove> immediate = evaluateImmediateCandidates(current, targetGenome, candidates, seen, baseScore);
            EvaluatedMove best = chooseLookaheadMove(current, targetGenome, immediate, seen, options);

            if (best == null) {
                if (options.debug) {
                    System.out.println(String.format("[solver] stuck at move %d, score=%s", moves.size(), formatScore(baseScore)));
                }
                break;
            }

            if (options.debug) {
                System.out.println(
                    String.format("[solver] move %d: %s %s -> %s",
                        moves.size() + 1, best.move.toString(), formatScore(baseScore), formatScore(best.score))
                );
            }

            moves.add(best.move);
            current = best.result;
            seen.add(current);
        }

        return new Result(
            moves,
            current,
            GameEngine.genomesEqual(current, targetGenome),
            moves.size()
        );
    }

    public static List<Move> generateCandidates(Genome current, Genome target) {
        AnchoredCore core = computeAnchoredCore(current, target);
        LinkedHashSet<Move> candidates = new LinkedHashSet<>();

        addFrontierDuplicationCandidates(candidates, current, target, core, "left");
        addFrontierDuplicationCandidates(candidates, current, target, core, "right");
        if (shouldUseFrontierDeletions(current, target)) {
            addFrontierDeletionCandidates(candidates, current, target, core, "left");
            addFrontierDeletionCandidates(candidates, current, target, core, "right");
        }
        if (shouldUseInversionCandidates(current, target, core)) {
            addInversionCandidates(candidates, current);
        }

        return new ArrayList<>(candidates);
    }

    public static List<EvaluatedMove> evaluateImmediateCandidates(
        Genome current, Genome target, List<Move> candidates, HashSet<Genome> seen, int[] baseScore
    ) {
        List<EvaluatedMove> evaluated = new ArrayList<>();

        for (Move move : candidates) {
            Genome result;
            try {
                result = applyMove(current, move);
            } catch (Exception e) {
                continue;
            }

            if (seen.contains(result)) continue;

            int[] score = scoreGenome(result, target);
            if (compareScores(score, baseScore) <= 0) continue;

            evaluated.add(new EvaluatedMove(move, result, score));
        }

        evaluated.sort((a, b) -> compareScores(b.score, a.score));
        return evaluated;
    }

    public static EvaluatedMove chooseLookaheadMove(
        Genome current, Genome target, List<EvaluatedMove> immediate, HashSet<Genome> seen, SolverOptions options
    ) {
        if (immediate.isEmpty()) return null;

        List<EvaluatedMove> shortlist = new ArrayList<>(immediate.subList(0, Math.min(immediate.size(), LOOKAHEAD_CANDIDATES)));

        List<EvaluatedMove> extraInversions = new ArrayList<>();
        for (EvaluatedMove cand : immediate) {
            if ("inversion".equals(cand.move.type)) {
                extraInversions.add(cand);
            }
        }
        extraInversions.sort((a, b) -> {
            if (a.move.length != b.move.length) return a.move.length - b.move.length;
            return compareScores(b.score, a.score);
        });

        for (EvaluatedMove candidate : extraInversions) {
            boolean exists = false;
            for (EvaluatedMove existing : shortlist) {
                if (existing.result.equals(candidate.result)) {
                    exists = true;
                    break;
                }
            }
            if (exists) continue;
            shortlist.add(candidate);
            if (shortlist.size() >= LOOKAHEAD_CANDIDATES + EXTRA_SHORT_INVERSION_CANDIDATES) break;
        }

        java.util.stream.Stream<EvaluatedMove> stream = options.useParallel ? shortlist.parallelStream() : shortlist.stream();
        List<Selection> selections = stream
            .map(candidate -> {
                int[] lookahead = bestSuccessorScore(candidate.result, target, seen, candidate.result, candidate.score);
                int[] rank = concatArrays(lookahead, candidate.score);
                return new Selection(candidate, rank);
            })
            .collect(Collectors.toList());

        Selection best = null;
        for (Selection sel : selections) {
            if (best == null || compareScores(sel.rank, best.rank) > 0) {
                best = sel;
            }
        }

        if (!options.rolloutMode) {
            Selection rolloutBest = chooseOpeningRolloutCandidate(current, target, immediate, best, options);
            if (rolloutBest != null) {
                best = rolloutBest;
            }
        }

        if (!options.rolloutMode && shouldUseDuplicationLengthRollout(current, target)) {
            Selection lengthRolloutBest = chooseDuplicationLengthRolloutCandidate(target, immediate, best, options);
            if (lengthRolloutBest != null) {
                best = lengthRolloutBest;
            }
        }

        return best != null ? best.evaluatedMove : immediate.get(0);
    }

    public static Selection chooseOpeningRolloutCandidate(
        Genome current, Genome target, List<EvaluatedMove> immediate, Selection fallback, SolverOptions parentOptions
    ) {
        AnchoredCore core = computeAnchoredCore(current, target);
        if (core.left + core.right > INVERSION_ROLLOUT_CORE_THRESHOLD) return fallback;

        List<Selection> rolloutCandidates = new ArrayList<>();
        if (fallback != null) {
            rolloutCandidates.add(fallback);
        }

        List<EvaluatedMove> inversionCandidates = new ArrayList<>();
        for (EvaluatedMove cand : immediate) {
            if ("inversion".equals(cand.move.type)) {
                inversionCandidates.add(cand);
            }
        }
        inversionCandidates.sort((a, b) -> compareScores(b.score, a.score));

        for (EvaluatedMove candidate : inversionCandidates) {
            boolean exists = false;
            for (Selection existing : rolloutCandidates) {
                if (existing.evaluatedMove.result.equals(candidate.result)) {
                    exists = true;
                    break;
                }
            }
            if (exists) continue;
            rolloutCandidates.add(new Selection(candidate, null));
            if (rolloutCandidates.size() >= INVERSION_ROLLOUT_CANDIDATES) break;
        }

        if (rolloutCandidates.size() < INVERSION_ROLLOUT_CANDIDATES) {
            List<EvaluatedMove> neutralInvs = new ArrayList<>();
            for (Move move : generateCandidates(current, target)) {
                if (!"inversion".equals(move.type)) continue;
                Genome result;
                try {
                    result = applyMove(current, move);
                } catch (Exception e) {
                    continue;
                }
                int[] score = scoreGenome(result, target);
                int[] baseScore = scoreGenome(current, target);
                if (compareScores(score, baseScore) == 0) {
                    neutralInvs.add(new EvaluatedMove(move, result, score));
                }
            }

            neutralInvs.sort((a, b) -> compareScores(b.score, a.score));
            int limit = Math.min(neutralInvs.size(), NEUTRAL_INVERSION_ROLLOUT_CANDIDATES);
            for (int i = 0; i < limit; i++) {
                rolloutCandidates.add(new Selection(neutralInvs.get(i), null));
            }
        }

        if (rolloutCandidates.size() <= 1) return fallback;

        java.util.stream.Stream<Selection> stream = parentOptions.useParallel ? rolloutCandidates.parallelStream() : rolloutCandidates.stream();
        List<Selection> evaluatedRollouts = stream
            .map(selection -> {
                EvaluatedMove candidate = selection.evaluatedMove;
                SolverOptions rolloutOpts = new SolverOptions(INVERSION_ROLLOUT_MAX_MOVES, false, true, false);
                Result rollout = solve(candidate.result, target, rolloutOpts);

                int[] finalScore = scoreGenome(rollout.finalGenome, target);
                int[] rolloutRank = new int[2 + finalScore.length + candidate.score.length];
                rolloutRank[0] = rollout.solved ? 1 : 0;
                rolloutRank[1] = rollout.solved ? -rollout.moveCount : 0;
                System.arraycopy(finalScore, 0, rolloutRank, 2, finalScore.length);
                System.arraycopy(candidate.score, 0, rolloutRank, 2 + finalScore.length, candidate.score.length);

                return new Selection(candidate, selection.rank, rolloutRank);
            })
            .collect(Collectors.toList());

        Selection best = null;
        for (Selection sel : evaluatedRollouts) {
            if (best == null || compareScores(sel.rolloutRank, best.rolloutRank) > 0) {
                best = sel;
            }
        }

        return best != null ? best : fallback;
    }

    public static Selection chooseDuplicationLengthRolloutCandidate(
        Genome target, List<EvaluatedMove> immediate, Selection fallback, SolverOptions parentOptions
    ) {
        if (fallback == null || !"duplication".equals(fallback.evaluatedMove.move.type)) return fallback;

        Move fallbackMove = fallback.evaluatedMove.move;
        List<EvaluatedMove> shorterLengths = new ArrayList<>();
        for (EvaluatedMove candidate : immediate) {
            Move cm = candidate.move;
            if ("duplication".equals(cm.type) &&
                cm.destIndex == fallbackMove.destIndex &&
                cm.srcStart == fallbackMove.srcStart &&
                cm.srcLength < fallbackMove.srcLength
            ) {
                shorterLengths.add(candidate);
            }
        }

        shorterLengths.sort((a, b) -> {
            int leftGap = fallbackMove.srcLength - a.move.srcLength;
            int rightGap = fallbackMove.srcLength - b.move.srcLength;
            if (leftGap != rightGap) return leftGap - rightGap;
            return compareScores(b.score, a.score);
        });

        int limit = Math.min(shorterLengths.size(), Math.max(0, DUPLICATION_LENGTH_ROLLOUT_CANDIDATES - 1));
        List<EvaluatedMove> shortlistedShorter = shorterLengths.subList(0, limit);

        if (shortlistedShorter.isEmpty()) return fallback;

        SolverOptions rolloutOpts = new SolverOptions(DUPLICATION_LENGTH_ROLLOUT_MAX_MOVES, false, true, false);
        Result rolloutFallback = solve(fallback.evaluatedMove.result, target, rolloutOpts);

        class EvaluatedDuplicationRollout {
            final EvaluatedMove candidate;
            final Result rollout;

            EvaluatedDuplicationRollout(EvaluatedMove candidate, Result rollout) {
                this.candidate = candidate;
                this.rollout = rollout;
            }
        }

        java.util.stream.Stream<EvaluatedMove> stream = parentOptions.useParallel ? shortlistedShorter.parallelStream() : shortlistedShorter.stream();
        List<EvaluatedDuplicationRollout> results = stream
            .map(candidate -> {
                Result rollout = solve(candidate.result, target, rolloutOpts);
                return new EvaluatedDuplicationRollout(candidate, rollout);
            })
            .collect(Collectors.toList());

        Selection best = fallback;
        Result bestRollout = rolloutFallback;

        for (EvaluatedDuplicationRollout res : results) {
            boolean candidateBeatsFallback =
                res.rollout.solved &&
                (!bestRollout.solved || res.rollout.moveCount < bestRollout.moveCount);

            if (candidateBeatsFallback) {
                best = new Selection(res.candidate, null);
                bestRollout = res.rollout;
            }
        }

        return best;
    }

    public static int[] bestSuccessorScore(
        Genome current, Genome target, HashSet<Genome> seen, Genome currentResult, int[] fallbackScore
    ) {
        List<Move> candidates = generateCandidates(current, target);
        int[] best = fallbackScore;

        for (Move move : candidates) {
            Genome result;
            try {
                result = applyMove(current, move);
            } catch (Exception e) {
                continue;
            }

            if (seen.contains(result) || result.equals(currentResult)) continue;

            int[] score = scoreGenome(result, target);
            if (compareScores(score, best) > 0) {
                best = score;
            }
        }

        return best;
    }

    public static void addFrontierDuplicationCandidates(
        LinkedHashSet<Move> candidates, Genome current, Genome target, AnchoredCore core, String side
    ) {
        int targetFrontier = side.equals("left") ? core.targetLeftFrontier : core.targetRightFrontier;
        int remaining = side.equals("left") ? targetFrontier : target.genes.length - targetFrontier;

        if (remaining <= 0) return;

        int destIndex = side.equals("left") ? core.currentLeftFrontier : core.currentRightFrontier;
        int maxLen = Math.min(MAX_BLOCK_DUPLICATION, remaining);
        int sourceMatchLimit = isStrongGrowthState(current, target) ? GROWTH_STATE_SOURCE_MATCH_LIMIT : MAX_SOURCE_MATCHES;
        int lengthOptionLimit = isStrongGrowthState(current, target) ? 1 : MAX_DUPLICATION_LENGTH_OPTIONS;
        int matchedLengths = 0;

        for (int len = maxLen; len >= 1; len--) {
            String[] desired = new String[len];
            if (side.equals("left")) {
                System.arraycopy(target.genes, targetFrontier - len, desired, 0, len);
            } else {
                System.arraycopy(target.genes, targetFrontier, desired, 0, len);
            }

            List<Integer> matches = findSourceMatches(current, desired, side, destIndex, len, sourceMatchLimit);
            for (int srcStart : matches) {
                candidates.add(Move.duplication(srcStart, len, destIndex));
            }

            if (!matches.isEmpty()) {
                matchedLengths++;
                if (matchedLengths >= lengthOptionLimit) return;
            }
        }
    }

    public static void addFrontierDeletionCandidates(
        LinkedHashSet<Move> candidates, Genome current, Genome target, AnchoredCore core, String side
    ) {
        if (side.equals("left")) {
            int maxLen = Math.min(MAX_FRONTIER_DELETION, core.currentLeftFrontier);
            for (int len = 1; len <= maxLen; len++) {
                int start = core.currentLeftFrontier - len;
                if (!segmentIsExcess(current, target, start, len)) continue;
                candidates.add(Move.deletion(start, len));
            }
            return;
        }

        int maxLen = Math.min(
            MAX_FRONTIER_DELETION,
            current.genes.length - core.currentRightFrontier
        );
        for (int len = 1; len <= maxLen; len++) {
            int start = core.currentRightFrontier;
            if (!segmentIsExcess(current, target, start, len)) continue;
            candidates.add(Move.deletion(start, len));
        }
    }

    public static void addInversionCandidates(LinkedHashSet<Move> candidates, Genome current) {
        int tIdx = current.terminusIndex;
        int maxBefore = Math.min(tIdx, MAX_INVERSION_RADIUS);
        int maxAfter = Math.min(current.genes.length - tIdx - 1, MAX_INVERSION_RADIUS);

        for (int before = 1; before <= maxBefore; before++) {
            for (int after = 1; after <= maxAfter; after++) {
                candidates.add(Move.inversion(tIdx - before, before + 1 + after));
            }
        }
    }

    public static List<Integer> findSourceMatches(
        Genome current, String[] desired, String destSide, int destIndex, int len, int limit
    ) {
        List<Integer> results = new ArrayList<>();
        String sameSide = destSide;
        String crossSide = destSide.equals("left") ? "right" : "left";

        collectPatternMatches(results, current, sameSide, desired, destIndex, len, limit);
        collectPatternMatches(results, current, crossSide, reverseArray(desired), destIndex, len, limit);

        if (results.size() > limit) {
            return results.subList(0, limit);
        }
        return results;
    }

    public static void collectPatternMatches(
        List<Integer> results, Genome current, String sourceSide, String[] pattern, int destIndex, int len, int limit
    ) {
        List<Integer> positions = new ArrayList<>();
        int tIdx = current.terminusIndex;
        int startMin = sourceSide.equals("left") ? 0 : tIdx + 1;
        int startMax = sourceSide.equals("left") ? tIdx - len : current.genes.length - len;

        for (int start = startMin; start <= startMax; start++) {
            if (!segmentEquals(current.genes, start, pattern)) continue;
            positions.add(start);
        }

        positions.sort((a, b) -> distanceToDestination(a, destIndex) - distanceToDestination(b, destIndex));

        for (int start : positions) {
            if (results.contains(start)) continue;
            results.add(start);
            if (results.size() >= limit) return;
        }
    }

    public static boolean segmentEquals(String[] genes, int start, String[] pattern) {
        for (int i = 0; i < pattern.length; i++) {
            if (!genes[start + i].equals(pattern[i])) return false;
        }
        return true;
    }

    public static int distanceToDestination(int srcStart, int destIndex) {
        return Math.abs(srcStart - destIndex);
    }

    public static String[] reverseArray(String[] values) {
        String[] rev = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            rev[i] = values[values.length - 1 - i];
        }
        return rev;
    }

    public static boolean shouldUseDuplicationLengthRollout(Genome current, Genome target) {
        return !isStrongGrowthState(current, target);
    }

    public static boolean shouldUseFrontierDeletions(Genome current, Genome target) {
        return (target.genes.length - current.genes.length) <= FRONTIER_DELETION_ENABLE_GAP;
    }

    public static boolean shouldUseInversionCandidates(Genome current, Genome target, AnchoredCore core) {
        return !isStrongGrowthState(current, target) ||
            (core.left + core.right) <= INVERSION_ROLLOUT_CORE_THRESHOLD;
    }

    public static boolean isStrongGrowthState(Genome current, Genome target) {
        return (target.genes.length - current.genes.length) >= STRONG_GROWTH_GAP_THRESHOLD;
    }

    public static AnchoredCore computeAnchoredCore(Genome current, Genome target) {
        int currentLeftLimit = current.terminusIndex;
        int targetLeftLimit = target.terminusIndex;
        int leftLimit = Math.min(currentLeftLimit, targetLeftLimit);

        int left = 0;
        while (
            left < leftLimit &&
            current.genes[current.terminusIndex - 1 - left].equals(target.genes[target.terminusIndex - 1 - left])
        ) {
            left++;
        }

        int currentRightLimit = current.genes.length - current.terminusIndex - 1;
        int targetRightLimit = target.genes.length - target.terminusIndex - 1;
        int rightLimit = Math.min(currentRightLimit, targetRightLimit);

        int right = 0;
        while (
            right < rightLimit &&
            current.genes[current.terminusIndex + 1 + right].equals(target.genes[target.terminusIndex + 1 + right])
        ) {
            right++;
        }

        return new AnchoredCore(
            left,
            right,
            current.terminusIndex - left,
            current.terminusIndex + 1 + right,
            target.terminusIndex - left,
            target.terminusIndex + 1 + right
        );
    }

    public static int[] scoreGenome(Genome current, Genome target) {
        AnchoredCore core = computeAnchoredCore(current, target);
        int anchoredMatches = countAnchoredMatches(current, target);
        int weightedMatches = weightedAnchoredMatches(current, target);
        int countPenalty = geneCountDistance(current, target);
        int lengthPenalty = Math.abs(current.genes.length - target.genes.length);

        return new int[] {
            core.left + core.right,
            Math.min(core.left, core.right),
            -countPenalty,
            -lengthPenalty,
            anchoredMatches,
            weightedMatches
        };
    }

    public static int countAnchoredMatches(Genome current, Genome target) {
        int matches = 0;
        int leftLimit = Math.min(current.terminusIndex, target.terminusIndex);
        int rightLimit = Math.min(
            current.genes.length - current.terminusIndex - 1,
            target.genes.length - target.terminusIndex - 1
        );

        for (int offset = 1; offset <= leftLimit; offset++) {
            if (current.genes[current.terminusIndex - offset].equals(target.genes[target.terminusIndex - offset])) {
                matches++;
            }
        }

        for (int offset = 1; offset <= rightLimit; offset++) {
            if (current.genes[current.terminusIndex + offset].equals(target.genes[target.terminusIndex + offset])) {
                matches++;
            }
        }

        return matches;
    }

    public static int weightedAnchoredMatches(Genome current, Genome target) {
        int score = 0;
        int leftLimit = Math.min(current.terminusIndex, target.terminusIndex);
        int rightLimit = Math.min(
            current.genes.length - current.terminusIndex - 1,
            target.genes.length - target.terminusIndex - 1
        );

        for (int offset = 1; offset <= leftLimit; offset++) {
            if (current.genes[current.terminusIndex - offset].equals(target.genes[target.terminusIndex - offset])) {
                score += Math.max(1, 24 - offset);
            }
        }

        for (int offset = 1; offset <= rightLimit; offset++) {
            if (current.genes[current.terminusIndex + offset].equals(target.genes[target.terminusIndex + offset])) {
                score += Math.max(1, 24 - offset);
            }
        }

        return score;
    }

    public static int geneCountDistance(Genome current, Genome target) {
        Map<String, Integer> counts = buildGeneCounts(target.genes);

        for (String gene : current.genes) {
            if (gene.equals("[t]")) continue;
            counts.put(gene, counts.getOrDefault(gene, 0) - 1);
        }

        int distance = 0;
        for (int count : counts.values()) {
            distance += Math.abs(count);
        }
        return distance;
    }

    public static boolean segmentIsExcess(Genome current, Genome target, int start, int length) {
        Map<String, Integer> targetCounts = buildGeneCounts(target.genes);
        Map<String, Integer> currentCounts = buildGeneCounts(current.genes);
        Map<String, Integer> removedCounts = new HashMap<>();

        for (int i = start; i < start + length; i++) {
            String gene = current.genes[i];
            if (gene.equals("[t]")) return false;
            removedCounts.put(gene, removedCounts.getOrDefault(gene, 0) + 1);
        }

        for (Map.Entry<String, Integer> entry : removedCounts.entrySet()) {
            String gene = entry.getKey();
            int removed = entry.getValue();
            int remaining = currentCounts.getOrDefault(gene, 0) - removed;
            if (remaining < targetCounts.getOrDefault(gene, 0)) return false;
        }

        return true;
    }

    public static Map<String, Integer> buildGeneCounts(String[] genes) {
        Map<String, Integer> counts = new HashMap<>();
        for (String gene : genes) {
            if (gene.equals("[t]")) continue;
            counts.put(gene, counts.getOrDefault(gene, 0) + 1);
        }
        return counts;
    }

    public static int[] concatArrays(int[] a, int[] b) {
        int[] result = new int[a.length + b.length];
        System.arraycopy(a, 0, result, 0, a.length);
        System.arraycopy(b, 0, result, a.length, b.length);
        return result;
    }

    public static int compareScores(int[] a, int[] b) {
        int length = Math.max(a.length, b.length);
        for (int i = 0; i < length; i++) {
            int left = i < a.length ? a[i] : 0;
            int right = i < b.length ? b[i] : 0;
            if (left != right) return left - right;
        }
        return 0;
    }

    public static String formatScore(int[] score) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < score.length; i++) {
            sb.append(score[i]);
            if (i < score.length - 1) sb.append(", ");
        }
        sb.append("]");
        return sb.toString();
    }

    public static Genome applyMove(Genome genome, Move move) {
        if ("inversion".equals(move.type)) {
            return GameEngine.applyInversion(genome, move.start, move.length);
        }
        if ("deletion".equals(move.type)) {
            return GameEngine.applyDeletion(genome, move.start, move.length);
        }
        if ("duplication".equals(move.type)) {
            return GameEngine.applyDuplication(genome, move.srcStart, move.srcLength, move.destIndex);
        }
        throw new IllegalArgumentException("Unknown move type: " + move.type);
    }
}
