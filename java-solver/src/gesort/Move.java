package gesort;

import java.util.Objects;

/**
 * Represents a genome sorting operation (Move).
 * Can be an Inversion, Deletion, or Duplication.
 */
public final class Move {
    public final String type; // "inversion", "deletion", "duplication"
    
    // For Inversion / Deletion
    public final int start;
    public final int length;

    // For Duplication
    public final int srcStart;
    public final int srcLength;
    public final int destIndex;

    private Move(String type, int start, int length, int srcStart, int srcLength, int destIndex) {
        this.type = type;
        this.start = start;
        this.length = length;
        this.srcStart = srcStart;
        this.srcLength = srcLength;
        this.destIndex = destIndex;
    }

    public static Move inversion(int start, int length) {
        return new Move("inversion", start, length, -1, -1, -1);
    }

    public static Move deletion(int start, int length) {
        return new Move("deletion", start, length, -1, -1, -1);
    }

    public static Move duplication(int srcStart, int srcLength, int destIndex) {
        return new Move("duplication", -1, -1, srcStart, srcLength, destIndex);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Move other = (Move) o;
        return start == other.start &&
                length == other.length &&
                srcStart == other.srcStart &&
                srcLength == other.srcLength &&
                destIndex == other.destIndex &&
                Objects.equals(type, other.type);
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, start, length, srcStart, srcLength, destIndex);
    }

    @Override
    public String toString() {
        if ("inversion".equals(type)) {
            return String.format("{\"type\":\"inversion\",\"start\":%d,\"length\":%d}", start, length);
        } else if ("deletion".equals(type)) {
            return String.format("{\"type\":\"deletion\",\"start\":%d,\"length\":%d}", start, length);
        } else if ("duplication".equals(type)) {
            return String.format("{\"type\":\"duplication\",\"srcStart\":%d,\"srcLength\":%d,\"destIndex\":%d}", srcStart, srcLength, destIndex);
        }
        return "{}";
    }
}
