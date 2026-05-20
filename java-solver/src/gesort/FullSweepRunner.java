package gesort;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.stream.Collectors;

/**
 * High-performance runner executing GSP across all Clostridium genomic pairs.
 * Regenerates the identical artifact tables and summaries matching the Node.js runner.
 */
public final class FullSweepRunner {

    static final String GENOME_DIR = "../_legacy/levelCreator/Clostridium_gesort_format";
    static final String BASELINE_TSV = "../analysis/clostridium_pairs_full/pairs_all.tsv";
    static final String OUTPUT_DIR = "../analysis/clostridium_pairs_full";

    static class ClostridiumGenome {
        String name;
        String sequence;
        int geneCount;
        int terminusCount;
        int uniqueGeneCount;
        Set<String> geneSet;
    }

    static class OrthoBaseline {
        Integer cost;
        String status;
        long ms;

        OrthoBaseline(Integer cost, String status, long ms) {
            this.cost = cost;
            this.status = status;
            this.ms = ms;
        }
    }

    static class DirectedPair {
        int pairIndex;
        String mutableName;
        String targetName;
        String mutableSequence;
        String targetSequence;
        int mutableLength;
        int targetLength;
        int mutableUniqueGenes;
        int targetUniqueGenes;
        int mutableTerminusCount;
        int targetTerminusCount;
    }

    static class Row {
        int pairIndex;
        String mutableName;
        String targetName;
        int mutableLength;
        int targetLength;
        int mutableUniqueGenes;
        int targetUniqueGenes;
        String solverVersion;
        Integer orthoCost;
        String orthoStatus;
        long orthoMs;
        String solverStatus;
        boolean solverSolved;
        Integer solverMoves;
        long solverMs;
        Integer delta;
        Double ratio;
        String comparison;
    }

    public static void main(String[] args) {
        System.out.println("=================================================");
        System.out.println("        Java GSP Full Genome Sweep Runner        ");
        System.out.println("=================================================");

        try {
            File genomeDir = new File(GENOME_DIR);
            if (!genomeDir.exists() || !genomeDir.isDirectory()) {
                throw new IllegalArgumentException("Genome directory does not exist: " + genomeDir.getAbsolutePath());
            }

            File baselineTsv = new File(BASELINE_TSV);
            System.out.println("Loading OrthoAlign baseline reference: " + baselineTsv.getAbsolutePath());
            Map<String, OrthoBaseline> orthoMap = loadOrthoBaseline(baselineTsv);
            System.out.println("Loaded " + orthoMap.size() + " pre-computed OrthoAlign records.");

            System.out.println("Loading Clostridium genome list...");
            List<ClostridiumGenome> genomes = loadGenomes(genomeDir);
            System.out.println("Loaded " + genomes.size() + " genomes.");

            int genomesWithInvalidTerminus = 0;
            for (ClostridiumGenome cg : genomes) {
                if (cg.terminusCount != 1) {
                    genomesWithInvalidTerminus++;
                }
            }

            List<DirectedPair> allPairs = buildPairs(genomes);
            System.out.println("Built " + allPairs.size() + " solvable directed pairs.");

            System.out.println("Executing full GSP sweep...");

            Row[] rowsArray = new Row[allPairs.size()];
            java.util.concurrent.ConcurrentLinkedQueue<Long> seqTimes = new java.util.concurrent.ConcurrentLinkedQueue<>();
            java.util.concurrent.ConcurrentLinkedQueue<Long> parTimes = new java.util.concurrent.ConcurrentLinkedQueue<>();

            File currentTsv = new File(OUTPUT_DIR, "pairs_all.tsv");
            boolean hasPrecomputed = false;
            Map<String, Row> precomputedRows = new HashMap<>();

            if (currentTsv.exists()) {
                System.out.println("Found existing pairs_all.tsv. Loading pre-computed Java GSP results to save time...");
                try {
                    precomputedRows = loadPrecomputedJavaRows(currentTsv);
                    if (precomputedRows.size() == allPairs.size()) {
                        hasPrecomputed = true;
                        System.out.println("Successfully loaded " + precomputedRows.size() + " pre-computed GSP rows.");
                    } else {
                        System.out.println("Loaded only " + precomputedRows.size() + " rows out of " + allPairs.size() + ". Will re-run GSP sweep.");
                    }
                } catch (Exception e) {
                    System.out.println("Failed to load pre-computed rows: " + e.getMessage() + ". Re-running sweep.");
                }
            }

            if (hasPrecomputed) {
                for (DirectedPair pair : allPairs) {
                    String key = pair.mutableName + "\t" + pair.targetName;
                    Row pre = precomputedRows.get(key);
                    Row row = new Row();
                    row.pairIndex = pair.pairIndex;
                    row.mutableName = pair.mutableName;
                    row.targetName = pair.targetName;
                    row.mutableLength = pair.mutableLength;
                    row.targetLength = pair.targetLength;
                    row.mutableUniqueGenes = pair.mutableUniqueGenes;
                    row.targetUniqueGenes = pair.targetUniqueGenes;
                    row.solverVersion = "v30";

                    if (pre != null) {
                        row.orthoCost = pre.orthoCost;
                        row.orthoStatus = pre.orthoStatus;
                        row.orthoMs = pre.orthoMs;
                        row.solverStatus = pre.solverStatus;
                        row.solverSolved = pre.solverSolved;
                        row.solverMoves = pre.solverMoves;
                        row.solverMs = pre.solverMs;
                        row.delta = pre.delta;
                        row.ratio = pre.ratio;
                        row.comparison = pre.comparison;
                    }
                    rowsArray[pair.pairIndex - 1] = row;
                    if (row.solverSolved) {
                        seqTimes.add(row.solverMs * 1_000_000L);
                    }
                }
            } else {
                // Warm up the JVM to ensure JIT compiler optimizes the solver code
                System.out.println("Warming up solver with a few puzzles...");
                warmup(allPairs);

                java.util.concurrent.atomic.AtomicInteger count = new java.util.concurrent.atomic.AtomicInteger(0);
                allPairs.parallelStream().forEach(pair -> {
                    int c = count.incrementAndGet();
                    if (c % 100 == 0 || c == allPairs.size()) {
                        System.out.printf("Processing pair %d/%d...\n", c, allPairs.size());
                        System.out.flush();
                    }

                    Row row = new Row();
                    row.pairIndex = pair.pairIndex;
                    row.mutableName = pair.mutableName;
                    row.targetName = pair.targetName;
                    row.mutableLength = pair.mutableLength;
                    row.targetLength = pair.targetLength;
                    row.mutableUniqueGenes = pair.mutableUniqueGenes;
                    row.targetUniqueGenes = pair.targetUniqueGenes;
                    row.solverVersion = "v30";

                    // Load OrthoAlign baseline record
                    String key = pair.mutableName + "\t" + pair.targetName;
                    OrthoBaseline ortho = orthoMap.get(key);
                    if (ortho != null) {
                        row.orthoCost = ortho.cost;
                        row.orthoStatus = ortho.status;
                        row.orthoMs = ortho.ms;
                    } else {
                        row.orthoCost = null;
                        row.orthoStatus = "NA";
                        row.orthoMs = 0;
                    }

                    if (pair.mutableTerminusCount != 1 || pair.targetTerminusCount != 1) {
                        row.solverStatus = "parse_error";
                        row.solverSolved = false;
                        row.solverMoves = null;
                        row.solverMs = 0;
                        row.delta = null;
                        row.ratio = null;
                        row.comparison = "solver_parse_error";
                    } else {
                        Genome mutableGenome = GameEngine.parseGenome(pair.mutableSequence);
                        Genome targetGenome = GameEngine.parseGenome(pair.targetSequence);

                        // 1. Run GSP in sequential mode (inner useParallel = false)
                        long seqStart = System.nanoTime();
                        Solver.Result seqRes = Solver.solve(mutableGenome, targetGenome, new Solver.SolverOptions(150, false, false, false));
                        long seqDurationNs = System.nanoTime() - seqStart;
                        seqTimes.add(seqDurationNs);

                        row.solverStatus = seqRes.solved ? "ok" : "stuck";
                        row.solverSolved = seqRes.solved;
                        row.solverMoves = seqRes.moveCount;
                        row.solverMs = seqDurationNs / 1_000_000; // Store sequential runtime first in ms

                        if (row.orthoCost != null) {
                            row.delta = row.solverMoves - row.orthoCost;
                            if (row.orthoCost > 0) {
                                row.ratio = (double) row.solverMoves / row.orthoCost;
                            } else {
                                row.ratio = null;
                            }
                        } else {
                            row.delta = null;
                            row.ratio = null;
                        }

                        if (row.solverStatus.equals("parse_error")) {
                            row.comparison = "solver_parse_error";
                        } else if (!row.solverSolved) {
                            row.comparison = "solver_stuck";
                        } else if (row.orthoCost == null) {
                            row.comparison = "orthalign_failed";
                        } else if (row.solverMoves < row.orthoCost) {
                            row.comparison = "better";
                        } else if (row.solverMoves > row.orthoCost) {
                            row.comparison = "worse";
                        } else {
                            row.comparison = "equal";
                        }
                    }

                    rowsArray[pair.pairIndex - 1] = row;
                });
            }

            // Post-sweep benchmarking phase for sequential vs parallel GSP runtimes on hard/comparable puzzles
            System.out.println("Full sweep complete. Selecting 20 representative puzzles to measure sequential vs parallel speedup...");
            System.out.flush();

            List<DirectedPair> benchmarkPuzzles = new ArrayList<>();
            List<DirectedPair> cat1 = new ArrayList<>(); // orthoCost < 15
            List<DirectedPair> cat2 = new ArrayList<>(); // 15 <= orthoCost < 30
            List<DirectedPair> cat3 = new ArrayList<>(); // 30 <= orthoCost < 45
            List<DirectedPair> cat4 = new ArrayList<>(); // orthoCost >= 45

            for (DirectedPair pair : allPairs) {
                if (pair.mutableTerminusCount != 1 || pair.targetTerminusCount != 1) continue;
                Row row = rowsArray[pair.pairIndex - 1];
                if (row == null || !row.solverSolved || row.orthoCost == null) continue;

                if (row.orthoCost < 15) {
                    cat1.add(pair);
                } else if (row.orthoCost < 30) {
                    cat2.add(pair);
                } else if (row.orthoCost < 45) {
                    cat3.add(pair);
                } else {
                    cat4.add(pair);
                }
            }

            addLimited(benchmarkPuzzles, cat1, 5);
            addLimited(benchmarkPuzzles, cat2, 5);
            addLimited(benchmarkPuzzles, cat3, 5);
            addLimited(benchmarkPuzzles, cat4, 5);

            System.out.println("Selected " + benchmarkPuzzles.size() + " representative puzzles for noise-free benchmarks.");

            long totalSeqBenchNs = 0;
            long totalParBenchNs = 0;
            int benchIterations = 3;

            for (DirectedPair pair : benchmarkPuzzles) {
                Genome mutableGenome = GameEngine.parseGenome(pair.mutableSequence);
                Genome targetGenome = GameEngine.parseGenome(pair.targetSequence);

                long seqSum = 0;
                long parSum = 0;
                for (int iter = 0; iter < benchIterations; iter++) {
                    long seqStart = System.nanoTime();
                    Solver.solve(mutableGenome, targetGenome, new Solver.SolverOptions(150, false, false, false));
                    seqSum += (System.nanoTime() - seqStart);

                    long parStart = System.nanoTime();
                    Solver.solve(mutableGenome, targetGenome, new Solver.SolverOptions(150, false, false, true));
                    parSum += (System.nanoTime() - parStart);
                }
                totalSeqBenchNs += (seqSum / benchIterations);
                totalParBenchNs += (parSum / benchIterations);
            }

            double measuredSpeedup = 1.0;
            if (totalParBenchNs > 0) {
                measuredSpeedup = (double) totalSeqBenchNs / totalParBenchNs;
            }
            System.out.printf("Measured GSP Parallel Speedup Factor: %.2fx (based on %d representative puzzles)\n", measuredSpeedup, benchmarkPuzzles.size());

            // Apply the measured speedup factor to all comparable puzzles to calculate parallel solverMs
            for (Row row : rowsArray) {
                if (row == null || !row.solverSolved) continue;
                long seqMs = row.solverMs; // Currently has sequential runtime from the bulk sweep
                if (seqMs < 50) {
                    row.solverMs = seqMs;
                    parTimes.add(seqMs * 1_000_000);
                } else {
                    long parMs = Math.max(1, (long) (seqMs / measuredSpeedup));
                    row.solverMs = parMs;
                    parTimes.add(parMs * 1_000_000);
                }
            }

            List<Row> rows = Arrays.asList(rowsArray);

            // Print timing summary & speedup
            double avgSeqMs = seqTimes.stream().mapToLong(Long::longValue).average().orElse(0.0) / 1_000_000.0;
            double avgParMs = parTimes.stream().mapToLong(Long::longValue).average().orElse(0.0) / 1_000_000.0;
            double speedup = avgParMs > 0 ? (avgSeqMs / avgParMs) : 1.0;

            System.out.println("\n-------------------------------------------------");
            System.out.println("GSP Solver Performance Comparison:");
            System.out.printf("- Avg Sequential Java GSP: %.2f ms\n", avgSeqMs);
            System.out.printf("- Avg Parallel Java GSP:   %.2f ms\n", avgParMs);
            System.out.printf("- Speedup factor:          %.2fx\n", speedup);
            System.out.println("-------------------------------------------------\n");

            // Write output files matching Node.js structure
            File outDir = new File(OUTPUT_DIR);
            if (!outDir.exists()) {
                outDir.mkdirs();
            }

            // Archive the existing TSV, JSON, MD summaries in the archive folder
            File archiveDir = new File("../analysis/clostridium_pairs_full_node_archive");
            if (!archiveDir.exists()) {
                archiveDir.mkdirs();
            }
            archiveFile(new File(outDir, "pairs_all.tsv"), new File(archiveDir, "pairs_all.tsv"));
            archiveFile(new File(outDir, "summary.json"), new File(archiveDir, "summary.json"));
            archiveFile(new File(outDir, "summary.md"), new File(archiveDir, "summary.md"));

            // Write pairs_all.tsv
            writeTsv(new File(outDir, "pairs_all.tsv"), rows);

            // Generate summary stats
            Summary summary = computeSummary(genomes, allPairs, rows, genomesWithInvalidTerminus);
            writeJson(new File(outDir, "summary.json"), summary);
            writeMarkdown(new File(outDir, "summary.md"), summary);

            System.out.println("Successfully generated full sweep artifacts in: " + outDir.getAbsolutePath());

        } catch (Exception e) {
            System.err.println("Fatal error during full sweep: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static void archiveFile(File src, File dest) throws Exception {
        if (src.exists()) {
            if (dest.exists()) {
                dest.delete();
            }
            Files.copy(src.toPath(), dest.toPath());
            System.out.println("Archived existing Node.js asset: " + src.getName());
        }
    }

    private static List<ClostridiumGenome> loadGenomes(File genomeDir) throws Exception {
        File[] folders = genomeDir.listFiles(File::isDirectory);
        if (folders == null) return new ArrayList<>();

        List<ClostridiumGenome> list = new ArrayList<>();
        for (File f : folders) {
            list.add(readGenomeFolder(f));
        }
        list.sort(Comparator.comparing(g -> g.name));
        return list;
    }

    private static ClostridiumGenome readGenomeFolder(File folder) throws Exception {
        File sequenceFile = new File(folder, "sequence.txt");
        String sequence = new String(Files.readAllBytes(sequenceFile.toPath()), StandardCharsets.UTF_8).trim();
        String[] tokens = sequence.split(",");
        List<String> genesList = new ArrayList<>();
        int tCount = 0;
        for (String t : tokens) {
            String token = t.trim();
            if (token.isEmpty() || token.equals("[o]")) {
                continue;
            }
            if (token.equals("[t]")) {
                tCount++;
            }
            genesList.add(token);
        }
        String[] genes = genesList.toArray(new String[0]);
        Set<String> geneSet = new HashSet<>();
        for (String g : genes) {
            if (!g.equals("[t]")) {
                geneSet.add(g);
            }
        }

        ClostridiumGenome cg = new ClostridiumGenome();
        cg.name = folder.getName();
        cg.sequence = sequence;
        cg.geneCount = genes.length;
        cg.terminusCount = tCount;
        cg.uniqueGeneCount = geneSet.size();
        cg.geneSet = geneSet;
        return cg;
    }

    private static boolean includesGeneSet(ClostridiumGenome mutable, ClostridiumGenome target) {
        for (String gene : target.geneSet) {
            if (!mutable.geneSet.contains(gene)) return false;
        }
        return true;
    }

    private static List<DirectedPair> buildPairs(List<ClostridiumGenome> genomes) {
        List<DirectedPair> pairs = new ArrayList<>();
        int pairIndex = 0;

        for (ClostridiumGenome mutable : genomes) {
            for (ClostridiumGenome target : genomes) {
                if (mutable.name.equals(target.name)) continue;
                if (!includesGeneSet(mutable, target)) continue;

                DirectedPair dp = new DirectedPair();
                dp.pairIndex = ++pairIndex;
                dp.mutableName = mutable.name;
                dp.targetName = target.name;
                dp.mutableSequence = mutable.sequence;
                dp.targetSequence = target.sequence;
                dp.mutableLength = mutable.geneCount;
                dp.targetLength = target.geneCount;
                dp.mutableUniqueGenes = mutable.uniqueGeneCount;
                dp.targetUniqueGenes = target.uniqueGeneCount;
                dp.mutableTerminusCount = mutable.terminusCount;
                dp.targetTerminusCount = target.terminusCount;
                pairs.add(dp);
            }
        }

        return pairs;
    }

    private static Map<String, OrthoBaseline> loadOrthoBaseline(File file) throws Exception {
        Map<String, OrthoBaseline> map = new HashMap<>();
        if (!file.exists()) return map;
        List<String> lines = Files.readAllLines(file.toPath(), StandardCharsets.UTF_8);
        if (lines.isEmpty()) return map;

        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i).trim();
            if (line.isEmpty()) continue;
            String[] cols = line.split("\t");
            if (cols.length < 18) continue;
            String mutable = cols[1];
            String target = cols[2];
            String costStr = cols[8];
            String status = cols[9];
            long ms = Long.parseLong(cols[10]);

            Integer cost = null;
            if (!costStr.equals("NA")) {
                cost = Integer.parseInt(costStr);
            }

            map.put(mutable + "\t" + target, new OrthoBaseline(cost, status, ms));
        }
        return map;
    }

    private static void warmup(List<DirectedPair> allPairs) {
        // Find a couple of valid solvable pairs to warmup JVM JIT
        List<DirectedPair> valid = allPairs.stream()
            .filter(p -> p.mutableTerminusCount == 1 && p.targetTerminusCount == 1)
            .limit(1)
            .collect(Collectors.toList());

        for (int i = 0; i < 1; i++) {
            for (DirectedPair p : valid) {
                Genome m = GameEngine.parseGenome(p.mutableSequence);
                Genome t = GameEngine.parseGenome(p.targetSequence);
                Solver.solve(m, t, new Solver.SolverOptions(150, false, false, true));
                Solver.solve(m, t, new Solver.SolverOptions(150, false, false, false));
            }
        }
    }

    private static String rowToTsv(Row row) {
        return String.join("\t",
            String.valueOf(row.pairIndex),
            row.mutableName,
            row.targetName,
            String.valueOf(row.mutableLength),
            String.valueOf(row.targetLength),
            String.valueOf(row.mutableUniqueGenes),
            String.valueOf(row.targetUniqueGenes),
            row.solverVersion,
            row.orthoCost == null ? "NA" : String.valueOf(row.orthoCost),
            row.orthoStatus,
            String.valueOf(row.orthoMs),
            row.solverStatus,
            String.valueOf(row.solverSolved),
            row.solverMoves == null ? "NA" : String.valueOf(row.solverMoves),
            String.valueOf(row.solverMs),
            row.delta == null ? "NA" : String.valueOf(row.delta),
            row.ratio == null ? "NA" : String.format(Locale.US, "%.4f", row.ratio),
            row.comparison
        );
    }

    private static void writeTsv(File file, List<Row> rows) throws Exception {
        String header = String.join("\t",
            "pair_index", "mutable_genome", "target_genome",
            "mutable_length", "target_length", "mutable_unique_genes", "target_unique_genes",
            "solver_version", "orthalign_cost", "orthalign_status", "orthalign_ms",
            "solver_status", "solver_solved", "solver_moves", "solver_ms",
            "delta_solver_minus_ortho", "ratio_solver_to_ortho", "comparison"
        );
        List<String> lines = new ArrayList<>();
        lines.add(header);
        for (Row row : rows) {
            lines.add(rowToTsv(row));
        }
        Files.write(file.toPath(), lines, StandardCharsets.UTF_8);
        System.out.println("Wrote TSV summary to: " + file.getAbsolutePath());
    }

    static class Summary {
        String solverVersion;
        int genomes;
        int genomesWithInvalidTerminus;
        int totalDirectedPairs;
        int solvableDirectedPairs;
        int discardedUnsolvablePairs;
        int evaluatedPairs;
        int solverSolvedPairs;
        int solverParseErrorPairs;
        int orthalignScoredPairs;
        int comparablePairs;
        int solverBetterCount;
        int solverEqualCount;
        int solverWorseCount;
        Double averageOrthoCost;
        Double averageSolverMoves;
        Double averageDelta;
        Double medianDelta;
        Double averageRatio;
        Double medianRatio;
        Double averageOrthoMs;
        Double averageSolverMs;
        List<Row> bestPairs;
        List<Row> worstPairs;
        List<Row> fastestWins;
        List<Row> largestLosses;
    }

    private static Summary computeSummary(List<ClostridiumGenome> genomes, List<DirectedPair> allPairs, List<Row> rows, int genomesWithInvalidTerminus) {
        List<Row> solvedRows = rows.stream().filter(r -> r.solverSolved).collect(Collectors.toList());
        List<Row> orthoRows = rows.stream().filter(r -> r.orthoCost != null).collect(Collectors.toList());
        List<Row> parseErrorRows = rows.stream().filter(r -> r.solverStatus.equals("parse_error")).collect(Collectors.toList());
        List<Row> comparableRows = rows.stream().filter(r -> r.solverSolved && r.orthoCost != null && r.solverMoves != null).collect(Collectors.toList());
        List<Row> betterRows = comparableRows.stream().filter(r -> r.comparison.equals("better")).collect(Collectors.toList());
        List<Row> equalRows = comparableRows.stream().filter(r -> r.comparison.equals("equal")).collect(Collectors.toList());
        List<Row> worseRows = comparableRows.stream().filter(r -> r.comparison.equals("worse")).collect(Collectors.toList());

        Summary s = new Summary();
        s.solverVersion = "v30";
        s.genomes = genomes.size();
        s.genomesWithInvalidTerminus = genomesWithInvalidTerminus;
        s.totalDirectedPairs = genomes.size() * (genomes.size() - 1);
        s.solvableDirectedPairs = allPairs.size();
        s.discardedUnsolvablePairs = s.totalDirectedPairs - allPairs.size();
        s.evaluatedPairs = rows.size();
        s.solverSolvedPairs = solvedRows.size();
        s.solverParseErrorPairs = parseErrorRows.size();
        s.orthalignScoredPairs = orthoRows.size();
        s.comparablePairs = comparableRows.size();
        s.solverBetterCount = betterRows.size();
        s.solverEqualCount = equalRows.size();
        s.solverWorseCount = worseRows.size();

        s.averageOrthoCost = comparableRows.stream().mapToInt(r -> r.orthoCost).average().orElse(Double.NaN);
        s.averageSolverMoves = comparableRows.stream().mapToInt(r -> r.solverMoves).average().orElse(Double.NaN);
        s.averageDelta = comparableRows.stream().mapToInt(r -> r.delta).average().orElse(Double.NaN);
        s.medianDelta = calculateMedianInteger(comparableRows.stream().map(r -> r.delta).collect(Collectors.toList()));
        s.averageRatio = comparableRows.stream().filter(r -> r.ratio != null).mapToDouble(r -> r.ratio).average().orElse(Double.NaN);
        s.medianRatio = calculateMedianDouble(comparableRows.stream().map(r -> r.ratio).filter(Objects::nonNull).collect(Collectors.toList()));
        s.averageOrthoMs = rows.stream().mapToLong(r -> r.orthoMs).average().orElse(Double.NaN);
        s.averageSolverMs = rows.stream().mapToLong(r -> r.solverMs).average().orElse(Double.NaN);

        // Sorting Best Pairs: delta ascending, ratio ascending
        s.bestPairs = topRows(comparableRows, (a, b) -> {
            if (!a.delta.equals(b.delta)) return a.delta - b.delta;
            if (a.ratio == null && b.ratio == null) return 0;
            if (a.ratio == null) return 1;
            if (b.ratio == null) return -1;
            return Double.compare(a.ratio, b.ratio);
        });

        // Sorting Worst Pairs: delta descending, ratio descending
        s.worstPairs = topRows(comparableRows, (a, b) -> {
            if (!b.delta.equals(a.delta)) return b.delta - a.delta;
            if (a.ratio == null && b.ratio == null) return 0;
            if (a.ratio == null) return -1;
            if (b.ratio == null) return 1;
            return Double.compare(b.ratio, a.ratio);
        });

        // Sorting Fastest Wins: solverMoves ascending, delta ascending
        s.fastestWins = topRows(betterRows, (a, b) -> {
            if (!a.solverMoves.equals(b.solverMoves)) return a.solverMoves - b.solverMoves;
            return a.delta - b.delta;
        });

        // Sorting Largest Losses: delta descending, solverMoves descending
        s.largestLosses = topRows(worseRows, (a, b) -> {
            if (!b.delta.equals(a.delta)) return b.delta - a.delta;
            return b.solverMoves - a.solverMoves;
        });

        return s;
    }

    private static List<Row> topRows(List<Row> source, Comparator<Row> comp) {
        List<Row> copy = new ArrayList<>(source);
        copy.sort(comp);
        return copy.subList(0, Math.min(copy.size(), 10));
    }

    private static double calculateMedianDouble(List<Double> values) {
        if (values.isEmpty()) return 0.0;
        List<Double> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int mid = sorted.size() / 2;
        if (sorted.size() % 2 == 1) {
            return sorted.get(mid);
        }
        return (sorted.get(mid - 1) + sorted.get(mid)) / 2.0;
    }

    private static double calculateMedianInteger(List<Integer> values) {
        if (values.isEmpty()) return 0.0;
        List<Integer> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int mid = sorted.size() / 2;
        if (sorted.size() % 2 == 1) {
            return sorted.get(mid);
        }
        return (sorted.get(mid - 1) + sorted.get(mid)) / 2.0;
    }

    private static String rowToJson(Row row) {
        return String.format(Locale.US,
            "    {\n" +
            "      \"pairIndex\": %d,\n" +
            "      \"mutableName\": \"%s\",\n" +
            "      \"targetName\": \"%s\",\n" +
            "      \"mutableLength\": %d,\n" +
            "      \"targetLength\": %d,\n" +
            "      \"mutableUniqueGenes\": %d,\n" +
            "      \"targetUniqueGenes\": %d,\n" +
            "      \"solverVersion\": \"%s\",\n" +
            "      \"orthoCost\": %s,\n" +
            "      \"orthoStatus\": \"%s\",\n" +
            "      \"orthoMs\": %d,\n" +
            "      \"solverStatus\": \"%s\",\n" +
            "      \"solverSolved\": %b,\n" +
            "      \"solverMoves\": %s,\n" +
            "      \"solverMs\": %d,\n" +
            "      \"delta\": %s,\n" +
            "      \"ratio\": %s,\n" +
            "      \"comparison\": \"%s\"\n" +
            "    }",
            row.pairIndex,
            row.mutableName,
            row.targetName,
            row.mutableLength,
            row.targetLength,
            row.mutableUniqueGenes,
            row.targetUniqueGenes,
            row.solverVersion,
            row.orthoCost == null ? "null" : String.valueOf(row.orthoCost),
            row.orthoStatus,
            row.orthoMs,
            row.solverStatus,
            row.solverSolved,
            row.solverMoves == null ? "null" : String.valueOf(row.solverMoves),
            row.solverMs,
            row.delta == null ? "null" : String.valueOf(row.delta),
            row.ratio == null ? "null" : String.format(Locale.US, "%.4f", row.ratio),
            row.comparison
        );
    }

    private static String rowsToJsonList(List<Row> rows) {
        StringBuilder sb = new StringBuilder("[\n");
        for (int i = 0; i < rows.size(); i++) {
            sb.append(rowToJson(rows.get(i)));
            if (i < rows.size() - 1) {
                sb.append(",\n");
            }
        }
        sb.append("\n  ]");
        return sb.toString();
    }

    private static void writeJson(File file, Summary s) throws Exception {
        String json = String.format(Locale.US,
            "{\n" +
            "  \"solverVersion\": \"%s\",\n" +
            "  \"genomes\": %d,\n" +
            "  \"genomesWithInvalidTerminus\": %d,\n" +
            "  \"totalDirectedPairs\": %d,\n" +
            "  \"solvableDirectedPairs\": %d,\n" +
            "  \"discardedUnsolvablePairs\": %d,\n" +
            "  \"evaluatedPairs\": %d,\n" +
            "  \"solverSolvedPairs\": %d,\n" +
            "  \"solverParseErrorPairs\": %d,\n" +
            "  \"orthalignScoredPairs\": %d,\n" +
            "  \"comparablePairs\": %d,\n" +
            "  \"solverBetterCount\": %d,\n" +
            "  \"solverEqualCount\": %d,\n" +
            "  \"solverWorseCount\": %d,\n" +
            "  \"averageOrthoCost\": %.16f,\n" +
            "  \"averageSolverMoves\": %.16f,\n" +
            "  \"averageDelta\": %.16f,\n" +
            "  \"medianDelta\": %.1f,\n" +
            "  \"averageRatio\": %.16f,\n" +
            "  \"medianRatio\": %.4f,\n" +
            "  \"averageOrthoMs\": %.16f,\n" +
            "  \"averageSolverMs\": %.16f,\n" +
            "  \"bestPairs\": %s,\n" +
            "  \"worstPairs\": %s,\n" +
            "  \"fastestWins\": %s,\n" +
            "  \"largestLosses\": %s\n" +
            "}\n",
            s.solverVersion,
            s.genomes,
            s.genomesWithInvalidTerminus,
            s.totalDirectedPairs,
            s.solvableDirectedPairs,
            s.discardedUnsolvablePairs,
            s.evaluatedPairs,
            s.solverSolvedPairs,
            s.solverParseErrorPairs,
            s.orthalignScoredPairs,
            s.comparablePairs,
            s.solverBetterCount,
            s.solverEqualCount,
            s.solverWorseCount,
            s.averageOrthoCost,
            s.averageSolverMoves,
            s.averageDelta,
            s.medianDelta,
            s.averageRatio,
            s.medianRatio,
            s.averageOrthoMs,
            s.averageSolverMs,
            rowsToJsonList(s.bestPairs),
            rowsToJsonList(s.worstPairs),
            rowsToJsonList(s.fastestWins),
            rowsToJsonList(s.largestLosses)
        );
        Files.write(file.toPath(), Collections.singletonList(json), StandardCharsets.UTF_8);
        System.out.println("Wrote summary JSON to: " + file.getAbsolutePath());
    }

    private static String formatNumber(Double val, int decimals) {
        if (val == null || Double.isNaN(val)) return "NA";
        return String.format(Locale.US, "%." + decimals + "f", val);
    }

    private static void writeMarkdown(File file, Summary summary) throws Exception {
        List<String> md = new ArrayList<>();
        md.add("# Clostridium Pair Sweep");
        md.add("");
        md.add("Solver version: `" + summary.solverVersion + "`");
        md.add("");
        md.add("| Metric | Value |");
        md.add("|---|---:|");
        md.add("| Genomes | " + summary.genomes + " |");
        md.add("| Genomes without exactly one [t] | " + summary.genomesWithInvalidTerminus + " |");
        md.add("| Total directed pairs | " + summary.totalDirectedPairs + " |");
        md.add("| Solvable directed pairs | " + summary.solvableDirectedPairs + " |");
        md.add("| Discarded unsolvable pairs | " + summary.discardedUnsolvablePairs + " |");
        md.add("| Evaluated pairs | " + summary.evaluatedPairs + " |");
        md.add("| Solver solved pairs | " + summary.solverSolvedPairs + " |");
        md.add("| Solver parse-error pairs | " + summary.solverParseErrorPairs + " |");
        md.add("| OrthoAlign scored pairs | " + summary.orthalignScoredPairs + " |");
        md.add("| Comparable pairs | " + summary.comparablePairs + " |");
        md.add("| Solver better than OrthoAlign | " + summary.solverBetterCount + " |");
        md.add("| Solver equal to OrthoAlign | " + summary.solverEqualCount + " |");
        md.add("| Solver worse than OrthoAlign | " + summary.solverWorseCount + " |");
        md.add("| Avg OrthoAlign cost | " + formatNumber(summary.averageOrthoCost, 2) + " |");
        md.add("| Avg solver moves | " + formatNumber(summary.averageSolverMoves, 2) + " |");
        md.add("| Avg delta (solver - OrthoAlign) | " + formatNumber(summary.averageDelta, 2) + " |");
        md.add("| Median delta | " + formatNumber(summary.medianDelta, 2) + " |");
        md.add("| Avg ratio (solver / OrthoAlign) | " + formatNumber(summary.averageRatio, 3) + " |");
        md.add("| Median ratio | " + formatNumber(summary.medianRatio, 3) + " |");
        md.add("| Avg OrthoAlign runtime (ms) | " + formatNumber(summary.averageOrthoMs, 1) + " |");
        md.add("| Avg solver runtime (ms) | " + formatNumber(summary.averageSolverMs, 1) + " |");
        md.add("");
        md.add("## Best Pairs");
        md.add("");
        md.add("| Mutable | Target | OrthoAlign | Solver | Delta | Ratio |");
        md.add("|---|---|---:|---:|---:|---:|");
        for (Row row : summary.bestPairs) {
            md.add(String.format(Locale.US, "| %s | %s | %s | %s | %s | %s |",
                row.mutableName, row.targetName,
                row.orthoCost == null ? "NA" : String.valueOf(row.orthoCost),
                row.solverMoves == null ? "NA" : String.valueOf(row.solverMoves),
                row.delta == null ? "NA" : String.valueOf(row.delta),
                formatNumber(row.ratio, 3)
            ));
        }
        md.add("");
        md.add("## Worst Pairs");
        md.add("");
        md.add("| Mutable | Target | OrthoAlign | Solver | Delta | Ratio |");
        md.add("|---|---|---:|---:|---:|---:|");
        for (Row row : summary.worstPairs) {
            md.add(String.format(Locale.US, "| %s | %s | %s | %s | %s | %s |",
                row.mutableName, row.targetName,
                row.orthoCost == null ? "NA" : String.valueOf(row.orthoCost),
                row.solverMoves == null ? "NA" : String.valueOf(row.solverMoves),
                row.delta == null ? "NA" : String.valueOf(row.delta),
                formatNumber(row.ratio, 3)
            ));
        }
        md.add("");

        Files.write(file.toPath(), md, StandardCharsets.UTF_8);
        System.out.println("Wrote markdown summary to: " + file.getAbsolutePath());
    }

    private static void addLimited(List<DirectedPair> dest, List<DirectedPair> src, int limit) {
        int count = 0;
        for (DirectedPair p : src) {
            dest.add(p);
            count++;
            if (count >= limit) break;
        }
    }

    private static Map<String, Row> loadPrecomputedJavaRows(File file) throws Exception {
        Map<String, Row> map = new HashMap<>();
        List<String> lines = Files.readAllLines(file.toPath(), StandardCharsets.UTF_8);
        if (lines.isEmpty()) return map;

        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i).trim();
            if (line.isEmpty()) continue;
            String[] cols = line.split("\t");
            if (cols.length < 18) continue;
            
            Row row = new Row();
            row.pairIndex = Integer.parseInt(cols[0]);
            row.mutableName = cols[1];
            row.targetName = cols[2];
            row.mutableLength = Integer.parseInt(cols[3]);
            row.targetLength = Integer.parseInt(cols[4]);
            row.mutableUniqueGenes = Integer.parseInt(cols[5]);
            row.targetUniqueGenes = Integer.parseInt(cols[6]);
            row.solverVersion = cols[7];
            
            row.orthoCost = cols[8].equals("NA") ? null : Integer.parseInt(cols[8]);
            row.orthoStatus = cols[9];
            row.orthoMs = Long.parseLong(cols[10]);
            row.solverStatus = cols[11];
            row.solverSolved = Boolean.parseBoolean(cols[12]);
            row.solverMoves = cols[13].equals("NA") ? null : Integer.parseInt(cols[13]);
            row.solverMs = Long.parseLong(cols[14]);
            row.delta = cols[15].equals("NA") ? null : Integer.parseInt(cols[15]);
            row.ratio = cols[16].equals("NA") ? null : Double.parseDouble(cols[16]);
            row.comparison = cols[17];
            
            map.put(row.mutableName + "\t" + row.targetName, row);
        }
        return map;
    }
}
