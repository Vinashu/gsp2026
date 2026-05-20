package gesort;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Benchmark runner for the Java GSP solver.
 * Loads puzzles, runs the solver, validates correctness, and measures performance.
 */
public final class BenchmarkRunner {

    public static void main(String[] args) {
        System.out.println("=================================================");
        System.out.println("  Java Genome Sorting Heuristic Solver Benchmark ");
        System.out.println("=================================================");

        File puzzlesFile = findPuzzlesFile();
        if (puzzlesFile == null) {
            System.err.println("Error: Could not locate benchmark/puzzles.json");
            System.exit(1);
        }

        System.out.println("Loading benchmark from: " + puzzlesFile.getAbsolutePath());

        List<Puzzle> puzzles;
        try {
            puzzles = parsePuzzles(puzzlesFile);
        } catch (Exception e) {
            System.err.println("Error parsing puzzles.json: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
            return;
        }

        System.out.println("Loaded " + puzzles.size() + " puzzles.\n");

        int solvedCount = 0;
        int optimalCount = 0;
        double totalRatio = 0.0;
        long totalElapsedNs = 0;

        System.out.printf("  %-25s | %-6s | %-5s | %-5s | %-6s | %-10s\n", 
            "Puzzle ID", "Status", "Moves", "Best", "Ratio", "Runtime");
        System.out.println("  " + "-".repeat(74));

        for (Puzzle p : puzzles) {
            Genome mutable = GameEngine.parseGenome(String.join(",", p.mutable));
            Genome target = GameEngine.parseGenome(String.join(",", p.target));

            long start = System.nanoTime();
            Solver.Result result = Solver.solve(mutable, target);
            long elapsed = System.nanoTime() - start;

            totalElapsedNs += elapsed;

            boolean solved = result.solved;
            int moves = result.moveCount;
            int best = p.knownBestScore;
            double ratio = best > 0 ? (double) moves / best : 1.0;

            if (solved) {
                solvedCount++;
                if (ratio <= 1.0) {
                    optimalCount++;
                }
                totalRatio += ratio;
            }

            String statusStr = solved ? "SOLVED" : "STUCK";
            String ratioStr = best > 0 ? String.format("%.2f", ratio) : "N/A";
            String runtimeStr = formatDuration(elapsed);

            System.out.printf("  %-25s | %-6s | %-5d | %-5d | %-6s | %-10s\n", 
                p.id, statusStr, moves, best, ratioStr, runtimeStr);
        }

        System.out.println("  " + "-".repeat(74));
        System.out.println("\n  Summary:");
        System.out.printf("  - Solved          : %d / %d\n", solvedCount, puzzles.size());
        System.out.printf("  - Optimal         : %d / %d\n", optimalCount, puzzles.size());
        if (solvedCount > 0) {
            System.out.printf("  - Avg ratio       : %.3f\n", totalRatio / solvedCount);
        }
        System.out.printf("  - Total Runtime   : %s\n", formatDuration(totalElapsedNs));
        System.out.println("=================================================");
    }

    private static File findPuzzlesFile() {
        String[] paths = {
            "benchmark/puzzles.json",
            "../benchmark/puzzles.json",
            "java-solver/../benchmark/puzzles.json"
        };
        for (String p : paths) {
            File f = new File(p);
            if (f.exists() && f.isFile()) {
                return f;
            }
        }
        return null;
    }

    private static List<Puzzle> parsePuzzles(File file) throws Exception {
        String content = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
        List<Puzzle> puzzles = new ArrayList<>();

        // Split on opening brace for each puzzle
        String[] objects = content.split("\\{\\s*\\n\\s*\"id\"");
        for (int i = 1; i < objects.length; i++) {
            String objText = "\"id\"" + objects[i];

            String id = extractField(objText, "id");
            String source = extractField(objText, "source");
            int knownBestScore = Integer.parseInt(extractField(objText, "knownBestScore"));

            String[] category = extractArray(objText, "category");
            String[] target = extractArray(objText, "target");
            String[] mutable = extractArray(objText, "mutable");

            puzzles.add(new Puzzle(id, source, category, knownBestScore, target, mutable));
        }
        return puzzles;
    }

    private static String extractField(String text, String fieldName) {
        int startIdx = text.indexOf("\"" + fieldName + "\"");
        if (startIdx == -1) return "";
        int colonIdx = text.indexOf(":", startIdx);
        if (colonIdx == -1) return "";
        int endIdx = text.indexOf(",", colonIdx);
        if (endIdx == -1) {
            endIdx = text.indexOf("\n", colonIdx);
        }
        if (endIdx == -1) {
            endIdx = text.length();
        }
        String val = text.substring(colonIdx + 1, endIdx).trim();
        if (val.startsWith("\"") && val.endsWith("\"")) {
            val = val.substring(1, val.length() - 1);
        } else if (val.endsWith("}")) {
            val = val.substring(0, val.length() - 1).trim();
            if (val.startsWith("\"") && val.endsWith("\"")) {
                val = val.substring(1, val.length() - 1);
            }
        }
        return val;
    }

    private static String[] extractArray(String text, String fieldName) {
        int startIdx = text.indexOf("\"" + fieldName + "\"");
        if (startIdx == -1) return new String[0];
        int openBracket = text.indexOf("[", startIdx);
        if (openBracket == -1) return new String[0];
        int closeBracket = openBracket;
        while (true) {
            closeBracket = text.indexOf("]", closeBracket + 1);
            if (closeBracket == -1) return new String[0];
            if (closeBracket >= 2 && text.charAt(closeBracket - 1) == 't' && text.charAt(closeBracket - 2) == '[') {
                continue;
            }
            break;
        }
        String arrText = text.substring(openBracket + 1, closeBracket);
        if (arrText.trim().isEmpty()) return new String[0];
        String[] items = arrText.split(",");
        String[] result = new String[items.length];
        for (int i = 0; i < items.length; i++) {
            String item = items[i].trim();
            if (item.startsWith("\"") && item.endsWith("\"")) {
                item = item.substring(1, item.length() - 1);
            }
            result[i] = item;
        }
        return result;
    }

    private static String formatDuration(long ns) {
        if (ns < 1000) {
            return ns + " ns";
        }
        long us = ns / 1000;
        if (us < 1000) {
            return us + " us";
        }
        long ms = us / 1000;
        if (ms < 1000) {
            return ms + " ms";
        }
        double sec = (double) ms / 1000.0;
        return String.format("%.2f s", sec);
    }
}
