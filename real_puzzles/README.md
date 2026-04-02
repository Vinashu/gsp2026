## _id
This is match **identifier** in the ``mach`` collection. 

## moves
The sequence of moves used to solve the puzzle. 

- **I47:33;** An inversion starting at position 47 with 33 genes.
- **L69:1;** A deletion starting at position 69 with 1 gene.
- **D85:3:65;** A duplication starting at position 85 with 3 genes, paste at position 65.

## topscore
The amount of operations to solve the puzzle using the OrthoAlign algorithm.

## score
The amount of operations used by a real human to solve the puzzle (the lentgh of the **** property).
moves

## target_genome
The goal is to apply evolutionary moves (duplications, deletions and inversions) to transform the **mutable_genome** into the **target_genome**.

### sequence
The **target_genome** sequence of genes. **[o]** identify where the gene order starts and cannot be changed or moved; however, it is counted as a position; so the genes starts at 1 instead of 0. **[t]** represents represents the terminus region.

## mutable_genome
Is the genome we can apply evolutionary moves and the goal is to transform it into the **target_genome**.

### sequence
The **mutable_genome** sequence of genes.   