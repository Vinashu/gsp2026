package gesort;

/**
 * Container for a benchmark puzzle parsed from puzzles.json.
 */
public final class Puzzle {
    public final String id;
    public final String source;
    public final String[] category;
    public final int knownBestScore;
    public final String[] target;
    public final String[] mutable;

    public Puzzle(String id, String source, String[] category, int knownBestScore, String[] target, String[] mutable) {
        this.id = id;
        this.source = source;
        this.category = category;
        this.knownBestScore = knownBestScore;
        this.target = target;
        this.mutable = mutable;
    }
}
