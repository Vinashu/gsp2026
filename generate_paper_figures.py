#!/usr/bin/env python3
"""Generate additional SVG figures for the paper draft.

Figure 4: Solver convergence — avgRatio over solver versions (Phase 2 dev track).
Figure 5: Ratio distribution histogram — solver/OrthoAlign across all comparable pairs.
Figure 6: Delta vs genome length gap scatter — showing the growth-difficulty relationship.

Usage:
    python generate_paper_figures.py
"""

from __future__ import annotations

import csv
import math
import statistics
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent
PAIRS_PATH = ROOT / "analysis" / "clostridium_pairs_full" / "pairs_all.tsv"
RESULTS_P2 = ROOT / "results_phase2.tsv"
FIGURES_DIR = ROOT / "analysis" / "clostridium_pairs_full" / "figures"

FONT_FAMILY = "Segoe UI, Arial, sans-serif"
TEXT = "#16324f"
MUTED = "#6b7c93"
GRID = "#d9e2ec"
BETTER = "#2b7a78"
WORSE = "#d1495b"
NEUTRAL = "#d4a72c"
ACCENT = "#2f6fed"
TIE = "#5b3a8e"
LIGHT_BG = "#f8fbff"


def svg_root(width, height, body):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img">\n'
        + "\n".join(body)
        + "\n</svg>\n"
    )


def txt(x, y, value, size=14, fill=TEXT, anchor="start", weight="400", rotate=None):
    attrs = [
        f'x="{x:.1f}"', f'y="{y:.1f}"', f'fill="{fill}"',
        f'font-size="{size}"', f'font-family="{FONT_FAMILY}"',
        f'font-weight="{weight}"', f'text-anchor="{anchor}"',
    ]
    if rotate is not None:
        attrs.append(f'transform="rotate({rotate:.1f} {x:.1f} {y:.1f})"')
    return f"<text {' '.join(attrs)}>{escape(str(value))}</text>"


def rect(x, y, w, h, fill, stroke="none", sw=1, rx=0, opacity=None):
    attrs = [
        f'x="{x:.1f}"', f'y="{y:.1f}"', f'width="{w:.1f}"', f'height="{h:.1f}"',
        f'fill="{fill}"', f'stroke="{stroke}"', f'stroke-width="{sw}"',
    ]
    if rx: attrs.append(f'rx="{rx}"')
    if opacity is not None: attrs.append(f'opacity="{opacity}"')
    return f"<rect {' '.join(attrs)} />"


def line(x1, y1, x2, y2, stroke=GRID, sw=1, dash=None):
    attrs = [
        f'x1="{x1:.1f}"', f'y1="{y1:.1f}"', f'x2="{x2:.1f}"', f'y2="{y2:.1f}"',
        f'stroke="{stroke}"', f'stroke-width="{sw}"',
    ]
    if dash: attrs.append(f'stroke-dasharray="{dash}"')
    return f"<line {' '.join(attrs)} />"


def circle(cx, cy, r, fill, opacity=None):
    attrs = [f'cx="{cx:.1f}"', f'cy="{cy:.1f}"', f'r="{r:.1f}"', f'fill="{fill}"']
    if opacity is not None: attrs.append(f'opacity="{opacity}"')
    return f"<circle {' '.join(attrs)} />"


def polyline(points, stroke, sw=2, fill="none", dash=None):
    pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
    attrs = [f'points="{pts}"', f'stroke="{stroke}"', f'stroke-width="{sw}"', f'fill="{fill}"']
    if dash: attrs.append(f'stroke-dasharray="{dash}"')
    return f"<polyline {' '.join(attrs)} />"


def lin(val, dmin, dmax, rmin, rmax):
    if dmax == dmin:
        return (rmin + rmax) / 2
    return rmin + (val - dmin) * (rmax - rmin) / (dmax - dmin)


# -------------------------------------------------------------------
# Figure 4: Convergence plot
# -------------------------------------------------------------------
def generate_convergence():
    rows = []
    with RESULTS_P2.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for r in reader:
            if r["manifest"] == "phase2-dev":
                rows.append(r)

    # Deduplicate: keep best avgRatio per version
    best = {}
    for r in rows:
        ver = r["solver_version"]
        ratio = float(r["avg_ratio"])
        if ver not in best or ratio < best[ver]:
            best[ver] = ratio

    # Extract version number and sort
    items = []
    for ver, ratio in best.items():
        num = int(ver.replace("v", ""))
        items.append((num, ratio))
    items.sort()

    W, H = 700, 380
    ml, mr, mt, mb = 70, 30, 50, 60
    pw, ph = W - ml - mr, H - mt - mb

    xmin = items[0][0]
    xmax = items[-1][0]
    ymin = min(r for _, r in items) - 0.01
    ymax = max(r for _, r in items) + 0.01

    body = [rect(0, 0, W, H, "#ffffff")]
    body.append(rect(ml, mt, pw, ph, LIGHT_BG))
    body.append(txt(W / 2, 28, "Solver Convergence: avgRatio over Versions (Phase 2 Dev)", 16, TEXT, "middle", "600"))

    # Y grid and labels
    y_ticks = [round(ymin + i * (ymax - ymin) / 5, 3) for i in range(6)]
    for yt in y_ticks:
        py = lin(yt, ymin, ymax, mt + ph, mt)
        body.append(line(ml, py, ml + pw, py, GRID))
        body.append(txt(ml - 8, py + 5, f"{yt:.3f}", 11, MUTED, "end"))

    # X axis labels
    x_versions = sorted(set(n for n, _ in items))
    for xv in x_versions:
        px = lin(xv, xmin, xmax, ml, ml + pw)
        body.append(txt(px, mt + ph + 18, f"v{xv}", 10, MUTED, "middle"))

    # Reference line at 1.0
    if ymin < 1.0 < ymax:
        py1 = lin(1.0, ymin, ymax, mt + ph, mt)
        body.append(line(ml, py1, ml + pw, py1, WORSE, 1, "4 3"))
        body.append(txt(ml + pw + 3, py1 + 4, "1.0", 10, WORSE, "start"))

    # Plot line
    pts = [(lin(n, xmin, xmax, ml, ml + pw), lin(r, ymin, ymax, mt + ph, mt)) for n, r in items]
    body.append(polyline(pts, ACCENT, 2.5))
    for px, py in pts:
        body.append(circle(px, py, 4, ACCENT))

    # Axis labels
    body.append(txt(W / 2, H - 8, "Solver Version", 13, TEXT, "middle"))
    body.append(txt(18, H / 2, "avgRatio (lower is better)", 13, TEXT, "middle", "400", -90))

    # Axes
    body.append(line(ml, mt, ml, mt + ph, TEXT))
    body.append(line(ml, mt + ph, ml + pw, mt + ph, TEXT))

    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    (FIGURES_DIR / "convergence_phase2.svg").write_text(svg_root(W, H, body), encoding="utf-8")
    print("  -> convergence_phase2.svg")


# -------------------------------------------------------------------
# Figure 5: Ratio distribution histogram
# -------------------------------------------------------------------
def generate_ratio_histogram():
    ratios = []
    with PAIRS_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for r in reader:
            if r["ratio_solver_to_ortho"] != "NA":
                ratios.append(float(r["ratio_solver_to_ortho"]))
            elif r["comparison"] == "equal":
                # 0/0 case: both solver and OrthoAlign needed zero moves, still a tie
                ratios.append(1.0)

    # Exact ties get one dedicated bar; every other ratio is binned by bin_width
    tie_count = sum(1 for r in ratios if r == 1.0)
    others = [r for r in ratios if r != 1.0]

    bin_width = 0.05
    lo = math.floor(min(others) / bin_width) * bin_width
    hi = math.ceil(max(others) / bin_width) * bin_width
    n_bins = round((hi - lo) / bin_width)
    counts = [0] * n_bins
    for r in others:
        idx = min(int((r - lo) / bin_width), n_bins - 1)
        counts[idx] += 1

    # Slot where the tie bar is inserted, right where ratio 1.0 falls among the regular bins
    tie_slot = min(max(int(round((1.0 - lo) / bin_width)), 0), n_bins)
    total_slots = n_bins + 1
    max_count = max(counts + [tie_count])

    W, H = 700, 380
    ml, mr, mt, mb = 70, 30, 50, 60
    pw, ph = W - ml - mr, H - mt - mb
    bar_w = pw / total_slots

    def slot_x(slot):
        return ml + slot * bar_w

    body = [rect(0, 0, W, H, "#ffffff")]
    body.append(rect(ml, mt, pw, ph, LIGHT_BG))
    # body.append(txt(W / 2, 28, f"Distribution of Solver/OrthoAlign Ratio ({len(ratios)} pairs)", 16, TEXT, "middle", "600"))

    # Y grid
    y_step = max(1, max_count // 5)
    for i in range(0, max_count + y_step, y_step):
        py = lin(i, 0, max_count, mt + ph, mt)
        body.append(line(ml, py, ml + pw, py, GRID))
        body.append(txt(ml - 8, py + 5, str(i), 11, MUTED, "end"))

    # Reference line through the dedicated tie bar (exact ratio = 1.0)
    tie_x = slot_x(tie_slot)
    tie_center = tie_x + bar_w / 2
    body.append(line(tie_center, mt, tie_center, mt + ph, WORSE, 1.5, "4 3"))
    body.append(txt(tie_center + 4, mt + 14, "ratio = 1.0", 10, WORSE, "start"))

    # Regular bins (everything except exact ties)
    for i, c in enumerate(counts):
        slot = i if i < tie_slot else i + 1
        bx = slot_x(slot)
        bar_h = lin(c, 0, max_count, 0, ph)
        mid = lo + (i + 0.5) * bin_width
        color = BETTER if mid < 1.0 else (NEUTRAL if mid < 1.05 else WORSE)
        body.append(rect(bx + 1, mt + ph - bar_h, bar_w - 2, bar_h, color, "none", 0, 1, 0.85))

    # Dedicated tie bar
    tie_h = lin(tie_count, 0, max_count, 0, ph)
    body.append(rect(tie_x + 1, mt + ph - tie_h, bar_w - 2, tie_h, TIE, TEXT, 1, 1, 0.95))
    body.append(txt(tie_center, mt + ph - tie_h - 6, tie_count, 10, TEXT, "middle", "700"))
    # body.append(txt(tie_center, mt + ph + 18, "tie", 10, TIE, "middle", "700"))

    # X labels every 0.10 of ratio, regardless of bin width (tie slot is labeled separately above)
    label_step = max(1, round(0.10 / bin_width))
    for i in range(0, n_bins + 1, label_step):
        val = lo + i * bin_width
        # slot = i if i < tie_slot else i + 1
        slot = i 
        px = slot_x(slot)
        body.append(txt(px, mt + ph + 18, f"{val:.2f}", 10, MUTED, "middle"))

    # Axis labels
    body.append(txt(W / 2, H - 8, "Solver / OrthoAlign Ratio", 13, TEXT, "middle"))
    body.append(txt(18, H / 2, "Number of Pairs", 13, TEXT, "middle", "400", -90))

    body.append(line(ml, mt, ml, mt + ph, TEXT))
    body.append(line(ml, mt + ph, ml + pw, mt + ph, TEXT))

    # Color legend
    legend_items = [
        (BETTER, "solver better (< 1.0)"),
        (TIE, f"exact tie (= 1.0, n={tie_count})"),
        (NEUTRAL, "near miss (1.0-1.05)"),
        (WORSE, "solver worse (>= 1.05)"),
    ]
    lx, ly = ml + 8, mt + 14
    for i, (color, label) in enumerate(legend_items):
        body.append(rect(lx, ly + i * 16 - 9, 10, 10, color, "none", 0, 2, 0.9))
        body.append(txt(lx + 16, ly + i * 16, label, 10, MUTED, "start"))

    # Legend text
    med = statistics.median(ratios)
    avg = statistics.mean(ratios)
    body.append(txt(ml + pw - 10, mt + 20, f"median = {med:.3f}", 11, TEXT, "end"))
    body.append(txt(ml + pw - 10, mt + 36, f"mean = {avg:.3f}", 11, TEXT, "end"))
    body.append(txt(ml + pw - 10, mt + 52, f"n = {len(ratios)}", 11, MUTED, "end"))

    (FIGURES_DIR / "ratio_distribution.svg").write_text(svg_root(W, H, body), encoding="utf-8")
    print("  -> ratio_distribution.svg")


# -------------------------------------------------------------------
# Figure 6: Delta vs length gap scatter
# -------------------------------------------------------------------
def generate_delta_vs_length_gap():
    points = []
    with PAIRS_PATH.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for r in reader:
            if r["delta_solver_minus_ortho"] != "NA":
                gap = int(r["target_length"]) - int(r["mutable_length"])
                delta = int(r["delta_solver_minus_ortho"])
                points.append((gap, delta))

    W, H = 700, 500
    ml, mr, mt, mb = 70, 30, 50, 60
    pw, ph = W - ml - mr, H - mt - mb

    xmin = min(p[0] for p in points) - 2
    xmax = max(p[0] for p in points) + 2
    ymin = min(p[1] for p in points) - 2
    ymax = max(p[1] for p in points) + 2

    body = [rect(0, 0, W, H, "#ffffff")]
    body.append(rect(ml, mt, pw, ph, LIGHT_BG))
    body.append(txt(W / 2, 28, "Delta (Solver − OrthoAlign) vs Length Gap (Target − Mutable)", 15, TEXT, "middle", "600"))

    # Grid
    x_step = max(1, (xmax - xmin) // 8)
    for xv in range(int(xmin), int(xmax) + 1, x_step):
        px = lin(xv, xmin, xmax, ml, ml + pw)
        body.append(line(px, mt, px, mt + ph, GRID))
        body.append(txt(px, mt + ph + 18, str(xv), 10, MUTED, "middle"))

    y_step = max(1, (ymax - ymin) // 8)
    for yv in range(int(ymin), int(ymax) + 1, y_step):
        py = lin(yv, ymin, ymax, mt + ph, mt)
        body.append(line(ml, py, ml + pw, py, GRID))
        body.append(txt(ml - 8, py + 5, str(yv), 11, MUTED, "end"))

    # Zero lines
    if xmin < 0 < xmax:
        px0 = lin(0, xmin, xmax, ml, ml + pw)
        body.append(line(px0, mt, px0, mt + ph, TEXT, 1, "4 3"))
    if ymin < 0 < ymax:
        py0 = lin(0, ymin, ymax, mt + ph, mt)
        body.append(line(ml, py0, ml + pw, py0, TEXT, 1, "4 3"))

    # Points
    for gap, delta in points:
        px = lin(gap, xmin, xmax, ml, ml + pw)
        py = lin(delta, ymin, ymax, mt + ph, mt)
        color = BETTER if delta < 0 else (NEUTRAL if delta == 0 else WORSE)
        body.append(circle(px, py, 2.5, color, 0.4))

    # Quadrant labels
    body.append(txt(ml + 10, mt + 18, "Solver worse, shrinking", 10, MUTED, "start"))
    body.append(txt(ml + pw - 10, mt + 18, "Solver worse, growing", 10, WORSE, "end"))
    body.append(txt(ml + 10, mt + ph - 8, "Solver better, shrinking", 10, BETTER, "start"))
    body.append(txt(ml + pw - 10, mt + ph - 8, "Solver better, growing", 10, MUTED, "end"))

    body.append(txt(W / 2, H - 8, "Length Gap (target − mutable genes)", 13, TEXT, "middle"))
    body.append(txt(18, H / 2, "Delta (solver − OrthoAlign moves)", 13, TEXT, "middle", "400", -90))

    body.append(line(ml, mt, ml, mt + ph, TEXT))
    body.append(line(ml, mt + ph, ml + pw, mt + ph, TEXT))

    (FIGURES_DIR / "delta_vs_length_gap.svg").write_text(svg_root(W, H, body), encoding="utf-8")
    print("  -> delta_vs_length_gap.svg")


if __name__ == "__main__":
    print("Generating paper figures...")
    generate_convergence()
    generate_ratio_histogram()
    generate_delta_vs_length_gap()
    print("Done.")
