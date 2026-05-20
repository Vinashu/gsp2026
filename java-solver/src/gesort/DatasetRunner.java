package gesort;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;

/**
 * Dataset runner for the Java GSP solver.
 * Loads the Phase 3 hard-genomic manifest, executes the solver,
 * and measures runtime performance to compare against Node.js.
 */
public final class DatasetRunner {

    private static class ManifestEntry {
        final String id;
        final String path;
        final String kind;

        ManifestEntry(String id, String path, String kind) {
            this.id = id;
            this.path = path;
            this.kind = kind;
        }
    }

    public static void main(String[] args) {
        System.out.println("=================================================");
        System.out.println("     Java Genome Sorting Solver Dataset Runner   ");
        System.out.println("=================================================");

        File manifestFile = findFile("benchmark/phase3_hard_genomic.json");
        if (manifestFile == null) {
            System.err.println("Error: Could not locate benchmark/phase3_hard_genomic.json");
            System.exit(1);
        }

        System.out.println("Loading dataset manifest: " + manifestFile.getAbsolutePath());

        List<Puzzle> puzzles = new ArrayList<>();
        try {
            puzzles = loadManifest(manifestFile);
        } catch (Exception e) {
            System.err.println("Error loading manifest or puzzles: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }

        System.out.println("Loaded " + puzzles.size() + " puzzles.\n");

        int solvedCount = 0;
        long totalElapsedNs = 0;
        List<Long> times = new ArrayList<>();

        System.out.printf("  %-36s | %-6s | %-5s | %-10s\n", 
            "Puzzle ID", "Status", "Moves", "Runtime");
        System.out.println("  " + "-".repeat(67));

        for (Puzzle p : puzzles) {
            Genome mutable = GameEngine.parseGenome(String.join(",", p.mutable));
            Genome target = GameEngine.parseGenome(String.join(",", p.target));

            long start = System.nanoTime();
            Solver.Result result = Solver.solve(mutable, target);
            long elapsed = System.nanoTime() - start;

            totalElapsedNs += elapsed;
            times.add(elapsed);

            boolean solved = result.solved;
            int moves = result.moveCount;

            if (solved) {
                solvedCount++;
            }

            String statusStr = solved ? "SOLVED" : "STUCK";
            String runtimeStr = formatDuration(elapsed);

            System.out.printf("  %-36s | %-6s | %-5d | %-10s\n", 
                p.id, statusStr, moves, runtimeStr);
        }

        System.out.println("  " + "-".repeat(67));
        System.out.println("\n  Summary:");
        System.out.printf("  - Solved      : %d / %d\n", solvedCount, puzzles.size());
        System.out.printf("  - Total time  : %s\n", formatDuration(totalElapsedNs));
        System.out.printf("  - Avg time    : %s\n", formatDuration(totalElapsedNs / puzzles.size()));
        System.out.printf("  - Median time : %s\n", formatDuration(calculateMedian(times)));
        System.out.printf("  - Max time    : %s\n", formatDuration(Collections.max(times)));
        System.out.println("=================================================");
    }

    private static File findFile(String relPath) {
        String[] paths = {
            relPath,
            "../" + relPath,
            "java-solver/../" + relPath,
            "c:/Repos/gsp2026/" + relPath
        };
        for (String p : paths) {
            File f = new File(p);
            if (f.exists() && f.isFile()) {
                return f;
            }
        }
        return null;
    }

    private static List<Puzzle> loadManifest(File manifestFile) throws Exception {
        String content = new String(Files.readAllBytes(manifestFile.toPath()), StandardCharsets.UTF_8);
        List<ManifestEntry> entries = new ArrayList<>();

        // Parse puzzles array from JSON
        int puzzlesIdx = content.indexOf("\"puzzles\"");
        if (puzzlesIdx == -1) {
            throw new IllegalArgumentException("No puzzles field found in manifest JSON");
        }
        int arrayStart = content.indexOf("[", puzzlesIdx);
        if (arrayStart == -1) {
            throw new IllegalArgumentException("Malformed manifest: no open bracket for puzzles array");
        }
        int arrayEnd = content.lastIndexOf("]");
        if (arrayEnd == -1) {
            throw new IllegalArgumentException("Malformed manifest: no close bracket for puzzles array");
        }

        int searchIdx = arrayStart + 1;
        while (true) {
            int objStart = content.indexOf("{", searchIdx);
            if (objStart == -1 || objStart > arrayEnd) break;
            int objEnd = content.indexOf("}", objStart);
            if (objEnd == -1) break;

            String objText = content.substring(objStart, objEnd + 1);
            String id = extractField(objText, "id");
            String path = extractField(objText, "path");
            String kind = extractField(objText, "kind");

            entries.add(new ManifestEntry(id, path, kind));
            searchIdx = objEnd + 1;
        }

        List<Puzzle> puzzles = new ArrayList<>();
        for (ManifestEntry entry : entries) {
            if ("markdown".equals(entry.kind)) {
                puzzles.add(loadMarkdownPuzzle(entry.id, entry.path));
            } else {
                throw new UnsupportedOperationException("Manifest entry kind '" + entry.kind + "' not implemented");
            }
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

    private static Puzzle loadMarkdownPuzzle(String id, String relativePath) throws Exception {
        File f = findFile(relativePath);
        if (f == null) {
            throw new IllegalArgumentException("Could not find markdown puzzle: " + relativePath);
        }

        String content = new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8);
        Map<String, String> sections = parseMarkdownSections(content);

        String targetText = sections.get("target_genome");
        if (targetText == null) targetText = sections.get("target");
        String mutableText = sections.get("mutable_genome");
        if (mutableText == null) mutableText = sections.get("mutable");

        if (targetText == null || mutableText == null) {
            throw new IllegalArgumentException("Markdown puzzle missing target or mutable genome section: " + relativePath);
        }

        String[] targetGenes = parseGeneList(targetText);
        String[] mutableGenes = parseGeneList(mutableText);

        return new Puzzle(id, "real", new String[]{"phase3-dev"}, 0, targetGenes, mutableGenes);
    }

    private static Map<String, String> parseMarkdownSections(String content) {
        Map<String, String> sections = new HashMap<>();
        String[] lines = content.replace("\r\n", "\n").split("\n");
        String currentKey = null;
        List<String> buffer = new ArrayList<>();

        for (String line : lines) {
            if (line.startsWith("## ")) {
                if (currentKey != null) {
                    sections.put(currentKey, String.join("\n", buffer).trim());
                }
                currentKey = line.substring(3).trim().toLowerCase().replace(" ", "_");
                buffer.clear();
            } else if (currentKey != null) {
                buffer.add(line);
            }
        }
        if (currentKey != null) {
            sections.put(currentKey, String.join("\n", buffer).trim());
        }
        return sections;
    }

    private static String[] parseGeneList(String csv) {
        String[] parts = csv.split(",");
        List<String> list = new ArrayList<>();
        for (String p : parts) {
            String token = p.trim();
            if (token.isEmpty() || token.equals("[o]")) continue;
            list.add(token);
        }
        return list.toArray(new String[0]);
    }

    private static long calculateMedian(List<Long> values) {
        if (values.isEmpty()) return 0;
        List<Long> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int mid = sorted.size() / 2;
        if (sorted.size() % 2 == 1) {
            return sorted.get(mid);
        }
        return (sorted.get(mid - 1) + sorted.get(mid)) / 2;
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
