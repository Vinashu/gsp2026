package gesort;

import java.util.Arrays;

/**
 * Represents a genome state in the Genome Sorting Problem.
 * Immutable design for safety and clean search state transition.
 */
public final class Genome {
    public final String[] genes;
    public final int terminusIndex;
    private final int hashCode;

    public Genome(String[] genes, int terminusIndex) {
        this.genes = genes;
        this.terminusIndex = terminusIndex;
        
        int result = 17;
        result = 31 * result + terminusIndex;
        result = 31 * result + Arrays.hashCode(genes);
        this.hashCode = result;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Genome other = (Genome) o;
        if (this.hashCode != other.hashCode) return false;
        return this.terminusIndex == other.terminusIndex && Arrays.equals(this.genes, other.genes);
    }

    @Override
    public int hashCode() {
        return this.hashCode;
    }

    @Override
    public String toString() {
        return String.join(",", genes);
    }
}
