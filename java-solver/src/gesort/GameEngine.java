package gesort;

import java.util.ArrayList;
import java.util.List;

/**
 * Pure functions implementing the rules engine for the Genome Sorting Problem.
 * Mirroring gameEngine.js behavior exactly.
 */
public final class GameEngine {

    public static Genome parseGenome(String csvString) {
        String[] parts = csvString.split(",");
        List<String> geneList = new ArrayList<>();
        int tCount = 0;
        int tIndex = -1;

        for (String p : parts) {
            String gene = p.trim();
            if (gene.isEmpty() || gene.equals("[o]")) {
                continue;
            }
            if (gene.equals("[t]")) {
                tCount++;
                tIndex = geneList.size();
            }
            geneList.add(gene);
        }

        if (tCount != 1) {
            throw new IllegalArgumentException("Genome must have exactly one [t], found " + tCount);
        }

        return new Genome(geneList.toArray(new String[0]), tIndex);
    }

    public static String serializeGenome(Genome genome) {
        return genome.toString();
    }

    public static boolean genomesEqual(Genome a, Genome b) {
        if (a == b) return true;
        if (a == null || b == null) return false;
        return a.equals(b);
    }

    public static Genome cloneGenome(Genome genome) {
        String[] copiedGenes = genome.genes.clone();
        return new Genome(copiedGenes, genome.terminusIndex);
    }

    private static int findAndValidateTerminus(String[] genes) {
        int idx = -1;
        int count = 0;
        for (int i = 0; i < genes.length; i++) {
            if (genes[i].equals("[t]")) {
                idx = i;
                count++;
            }
        }
        if (count == 0) {
            throw new IllegalStateException("Genome lost the [t] terminus marker");
        }
        if (count > 1) {
            throw new IllegalStateException("Genome has " + count + " terminus markers after operation");
        }
        return idx;
    }

    public static Genome applyInversion(Genome genome, int start, int length) {
        int end = start + length;
        int n = genome.genes.length;

        if (start < 0 || length <= 0 || end > n) {
            throw new IllegalArgumentException(
                String.format("Inversion out of bounds: start=%d, length=%d, genomeLength=%d", start, length, n)
            );
        }

        int tIdx = genome.terminusIndex;
        if (tIdx < start || tIdx >= end) {
            throw new IllegalArgumentException(
                String.format("Invalid inversion: segment [%d,%d) does not include terminus at index %d", start, end, tIdx)
            );
        }

        String[] newGenes = genome.genes.clone();
        int l = start, r = end - 1;
        while (l < r) {
            String temp = newGenes[l];
            newGenes[l] = newGenes[r];
            newGenes[r] = temp;
            l++;
            r--;
        }

        int newTIndex = findAndValidateTerminus(newGenes);
        return new Genome(newGenes, newTIndex);
    }

    public static Genome applyDeletion(Genome genome, int start, int length) {
        int end = start + length;
        int n = genome.genes.length;

        if (start < 0 || length <= 0 || end > n) {
            throw new IllegalArgumentException(
                String.format("Deletion out of bounds: start=%d, length=%d, genomeLength=%d", start, length, n)
            );
        }

        int tIdx = genome.terminusIndex;
        if (tIdx >= start && tIdx < end) {
            throw new IllegalArgumentException(
                String.format("Invalid deletion: segment [%d,%d) would delete terminus at index %d", start, end, tIdx)
            );
        }

        String[] newGenes = new String[n - length];
        System.arraycopy(genome.genes, 0, newGenes, 0, start);
        System.arraycopy(genome.genes, end, newGenes, start, n - end);

        int newTIndex = findAndValidateTerminus(newGenes);
        return new Genome(newGenes, newTIndex);
    }

    public static Genome applyDuplication(Genome genome, int srcStart, int srcLength, int destIndex) {
        int srcEnd = srcStart + srcLength;
        int n = genome.genes.length;

        if (srcStart < 0 || srcLength <= 0 || srcEnd > n) {
            throw new IllegalArgumentException(
                String.format("Duplication source out of bounds: srcStart=%d, srcLength=%d, genomeLength=%d", srcStart, srcLength, n)
            );
        }
        if (destIndex < 0 || destIndex > n) {
            throw new IllegalArgumentException(
                String.format("Duplication destination out of bounds: destIndex=%d, genomeLength=%d", destIndex, n)
            );
        }

        int tIdx = genome.terminusIndex;
        if (tIdx >= srcStart && tIdx < srcEnd) {
            throw new IllegalArgumentException(
                String.format("Invalid duplication: source segment [%d,%d) contains terminus at %d", srcStart, srcEnd, tIdx)
            );
        }

        // Cross-terminus detection
        String sourceSide = srcStart < tIdx ? "left" : "right";
        String destSide   = destIndex <= tIdx ? "left" : "right";
        boolean crossTerminus = !sourceSide.equals(destSide);

        String[] segment = new String[srcLength];
        if (crossTerminus) {
            for (int i = 0; i < srcLength; i++) {
                segment[i] = genome.genes[srcEnd - 1 - i];
            }
        } else {
            System.arraycopy(genome.genes, srcStart, segment, 0, srcLength);
        }

        String[] newGenes = new String[n + srcLength];
        System.arraycopy(genome.genes, 0, newGenes, 0, destIndex);
        System.arraycopy(segment, 0, newGenes, destIndex, srcLength);
        System.arraycopy(genome.genes, destIndex, newGenes, destIndex + srcLength, n - destIndex);

        int newTIndex = findAndValidateTerminus(newGenes);
        return new Genome(newGenes, newTIndex);
    }
}
