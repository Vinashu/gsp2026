---
name: bioinformatics
description: Use when analyzing biological sequence, annotation, variation, expression, or comparative genomics data with reproducible computational workflows.
---

# Bioinformatics

## Use when

- The task involves DNA, RNA, protein, genomes, annotations, variants, alignments, or expression data.
- You need help with workflow design, parsing bioinformatics formats, or interpreting computational biology outputs.
- Reproducibility, metadata handling, and statistical care matter.

## Operating defaults

- Start by identifying organism, assay type, reference build, and coordinate system.
- Preserve provenance for samples, versions, parameters, and filtering thresholds.
- Treat file formats such as FASTA, FASTQ, GFF, GTF, BED, SAM, BAM, VCF, and TSV as contract surfaces.
- Prefer reproducible pipelines and explicit QC checkpoints.
- Separate biological interpretation from computational signal extraction.

## Workflow

1. Define the biological question and the computational unit of analysis.
2. Confirm data format, reference assets, and quality constraints.
3. Implement or review parsing, normalization, filtering, and summarization steps.
4. Validate intermediate outputs before biological interpretation.
5. Report assumptions, thresholds, and known biases.

## Quality bar

- Be explicit about strandedness, coordinate conventions, and genome build compatibility.
- Flag batch effects, missing metadata, and reference mismatches early.
- Use biologically meaningful controls and sanity checks.
- Keep scripts pipeline-friendly and restartable.

## Avoid

- Mixing incompatible reference versions.
- Interpreting low-quality or low-coverage signals as strong biology.
- Dropping metadata that is required for downstream interpretation.
