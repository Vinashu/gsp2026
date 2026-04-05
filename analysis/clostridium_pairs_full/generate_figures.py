#!/usr/bin/env python3
"""Generate SVG figures for the Clostridium pair sweep summary."""

from __future__ import annotations

import csv
import json
import math
import statistics
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parent
PAIRS_PATH = ROOT / "pairs_all.tsv"
SUMMARY_PATH = ROOT / "summary.json"
FIGURES_DIR = ROOT / "figures"

FONT_FAMILY = "Segoe UI, Arial, sans-serif"
TEXT = "#16324f"
MUTED = "#6b7c93"
GRID = "#d9e2ec"
PANEL_BG = "#f8fbff"
BETTER = "#2b7a78"
WORSE = "#d1495b"
NEUTRAL = "#d4a72c"
EXPANDING = "#e67e22"
SHRINKING = "#2f6fed"
SAME = "#9aa5b1"


def load_rows():
    rows = []
    with PAIRS_PATH.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for raw in reader:
            row = dict(raw)
            for key in (
                "pair_index",
                "mutable_length",
                "target_length",
                "mutable_unique_genes",
                "target_unique_genes",
                "orthalign_ms",
                "solver_ms",
            ):
                row[key] = int(row[key])

            row["orthalign_cost"] = (
                None if raw["orthalign_cost"] == "NA" else int(raw["orthalign_cost"])
            )
            row["solver_solved"] = raw["solver_solved"].lower() == "true"
            row["solver_moves"] = (
                None if raw["solver_moves"] == "NA" else int(raw["solver_moves"])
            )
            row["delta"] = (
                None
                if raw["delta_solver_minus_ortho"] == "NA"
                else int(raw["delta_solver_minus_ortho"])
            )
            row["ratio"] = (
                None
                if raw["ratio_solver_to_ortho"] == "NA"
                else float(raw["ratio_solver_to_ortho"])
            )
            rows.append(row)
    return rows


def load_summary():
    return json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))


def short_id(name: str) -> str:
    return name.split("_", 1)[0].strip()


def pct(count: int, total: int) -> str:
    return f"{(100.0 * count / total):.1f}%"


def svg_root(width: int, height: int, body: list[str]) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">\n'
        + "\n".join(body)
        + "\n</svg>\n"
    )


def text(x, y, value, size=14, fill=TEXT, anchor="start", weight="400", rotate=None):
    attrs = [
        f'x="{x:.1f}"',
        f'y="{y:.1f}"',
        f'fill="{fill}"',
        f'font-size="{size}"',
        f'font-family="{FONT_FAMILY}"',
        f'font-weight="{weight}"',
        f'text-anchor="{anchor}"',
    ]
    if rotate is not None:
        attrs.append(f'transform="rotate({rotate:.1f} {x:.1f} {y:.1f})"')
    return f"<text {' '.join(attrs)}>{escape(str(value))}</text>"


def rect(x, y, width, height, fill, stroke="none", stroke_width=1, rx=0, opacity=None):
    attrs = [
        f'x="{x:.1f}"',
        f'y="{y:.1f}"',
        f'width="{width:.1f}"',
        f'height="{height:.1f}"',
        f'fill="{fill}"',
        f'stroke="{stroke}"',
        f'stroke-width="{stroke_width}"',
    ]
    if rx:
        attrs.append(f'rx="{rx}"')
    if opacity is not None:
        attrs.append(f'opacity="{opacity}"')
    return f"<rect {' '.join(attrs)} />"


def line(x1, y1, x2, y2, stroke=GRID, stroke_width=1, dash=None, opacity=None):
    attrs = [
        f'x1="{x1:.1f}"',
        f'y1="{y1:.1f}"',
        f'x2="{x2:.1f}"',
        f'y2="{y2:.1f}"',
        f'stroke="{stroke}"',
        f'stroke-width="{stroke_width}"',
    ]
    if dash:
        attrs.append(f'stroke-dasharray="{dash}"')
    if opacity is not None:
        attrs.append(f'opacity="{opacity}"')
    return f"<line {' '.join(attrs)} />"


def circle(cx, cy, r, fill, stroke="none", stroke_width=0, opacity=None):
    attrs = [
        f'cx="{cx:.1f}"',
        f'cy="{cy:.1f}"',
        f'r="{r:.1f}"',
        f'fill="{fill}"',
        f'stroke="{stroke}"',
        f'stroke-width="{stroke_width}"',
    ]
    if opacity is not None:
        attrs.append(f'opacity="{opacity}"')
    return f"<circle {' '.join(attrs)} />"


def polyline(points, stroke, stroke_width=2, fill="none", dash=None, opacity=None):
    attrs = [
        f'points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in points)}"',
        f'stroke="{stroke}"',
        f'stroke-width="{stroke_width}"',
        f'fill="{fill}"',
    ]
    if dash:
        attrs.append(f'stroke-dasharray="{dash}"')
    if opacity is not None:
        attrs.append(f'opacity="{opacity}"')
    return f"<polyline {' '.join(attrs)} />"


def rgb(hex_color: str):
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def mix(color_a: str, color_b: str, t: float) -> str:
    t = max(0.0, min(1.0, t))
    a = rgb(color_a)
    b = rgb(color_b)
    channels = [round(a[i] + (b[i] - a[i]) * t) for i in range(3)]
    return "#%02x%02x%02x" % tuple(channels)


def diverging_color(value: float, max_abs: float) -> str:
    if max_abs <= 0:
        return "#ffffff"
    if value >= 0:
        return mix("#fff5f5", WORSE, value / max_abs)
    return mix("#f3f8ff", SHRINKING, abs(value) / max_abs)


def linear_map(value, domain_min, domain_max, range_min, range_max):
    if domain_max == domain_min:
        return (range_min + range_max) / 2
    return range_min + (value - domain_min) * (range_max - range_min) / (domain_max - domain_min)


def log_map(value, domain_min, domain_max, range_min, range_max):
    log_min = math.log10(domain_min)
    log_max = math.log10(domain_max)
    return linear_map(math.log10(value), log_min, log_max, range_min, range_max)


def canonical_asymmetry_rows(rows):
    comparable = {
        (row["mutable_genome"], row["target_genome"]): row
        for row in rows
        if row["comparison"] in {"better", "equal", "worse"}
    }
    matched = []
    for row in comparable.values():
        reverse = comparable.get((row["target_genome"], row["mutable_genome"]))
        if reverse is None:
            continue
        if row["pair_index"] < reverse["pair_index"]:
            matched.append(
                {
                    "mutable": row["mutable_genome"],
                    "target": row["target_genome"],
                    "length_gap": row["target_length"] - row["mutable_length"],
                    "solver_diff": row["solver_moves"] - reverse["solver_moves"],
                    "ortho_diff": row["orthalign_cost"] - reverse["orthalign_cost"],
                }
            )
    return matched


def draw_quality_runtime(summary, comparable_rows):
    width, height = 1040, 460
    body = [
        '<title id="title">Clostridium sweep: quality distribution and runtime tradeoff</title>',
        '<desc id="desc">Histogram of solver minus OrthoAlign deltas across comparable pairs and a log-scale average runtime comparison.</desc>',
        rect(0, 0, width, height, "#ffffff"),
        text(48, 42, "Figure 1. Quality wins are broad, but runtime is expensive", size=22, weight="700"),
        text(
            48,
            68,
            "Comparable pairs: "
            f"better {summary['solverBetterCount']} ({pct(summary['solverBetterCount'], summary['comparablePairs'])}), "
            f"equal {summary['solverEqualCount']} ({pct(summary['solverEqualCount'], summary['comparablePairs'])}), "
            f"worse {summary['solverWorseCount']} ({pct(summary['solverWorseCount'], summary['comparablePairs'])})",
            size=13,
            fill=MUTED,
        ),
    ]

    panel_y = 96
    panel_h = 300

    hist_x = 48
    hist_w = 610
    body.append(rect(hist_x, panel_y, hist_w, panel_h, PANEL_BG, stroke=GRID, rx=14))
    body.append(text(hist_x + 18, panel_y + 28, "Delta distribution (solver - OrthoAlign, lower is better)", size=15, weight="600"))

    bins = [
        (-50, -31, "<= -31"),
        (-30, -21, "-30..-21"),
        (-20, -11, "-20..-11"),
        (-10, -6, "-10..-6"),
        (-5, -1, "-5..-1"),
        (0, 0, "0"),
        (1, 5, "1..5"),
        (6, 10, "6..10"),
        (11, 15, "11..14"),
    ]
    counts = []
    for lo, hi, _ in bins:
        counts.append(sum(1 for row in comparable_rows if lo <= row["delta"] <= hi))

    plot_x = hist_x + 54
    plot_y = panel_y + 48
    plot_w = hist_w - 84
    plot_h = panel_h - 104
    max_count = max(counts)
    for tick in range(0, max_count + 1, 100):
        y = linear_map(tick, 0, max_count, plot_y + plot_h, plot_y)
        body.append(line(plot_x, y, plot_x + plot_w, y))
        body.append(text(plot_x - 10, y + 4, tick, size=11, fill=MUTED, anchor="end"))

    body.append(line(plot_x, plot_y, plot_x, plot_y + plot_h, stroke=TEXT, stroke_width=1.5))
    body.append(line(plot_x, plot_y + plot_h, plot_x + plot_w, plot_y + plot_h, stroke=TEXT, stroke_width=1.5))

    gap = 10
    bar_w = (plot_w - gap * (len(bins) - 1)) / len(bins)
    for index, ((lo, hi, label), count) in enumerate(zip(bins, counts)):
        x = plot_x + index * (bar_w + gap)
        y = linear_map(count, 0, max_count, plot_y + plot_h, plot_y)
        height_px = plot_y + plot_h - y
        if hi < 0:
            fill = BETTER
        elif lo > 0:
            fill = WORSE
        else:
            fill = NEUTRAL
        body.append(rect(x, y, bar_w, height_px, fill, rx=4))
        body.append(text(x + bar_w / 2, y - 6, count, size=11, anchor="middle"))
        body.append(text(x + bar_w / 2, plot_y + plot_h + 20, label, size=11, anchor="middle", fill=MUTED))

    body.append(text(plot_x + plot_w / 2, plot_y + plot_h + 44, "Delta bucket (moves)", size=12, anchor="middle", fill=MUTED))
    body.append(text(plot_x - 36, plot_y + plot_h / 2, "Pairs", size=12, anchor="middle", fill=MUTED, rotate=-90))
    body.append(text(hist_x + 18, panel_y + panel_h - 18, f"Mean delta = {summary['averageDelta']:.2f}; median delta = {summary['medianDelta']}", size=12, fill=MUTED))

    rt_x = 692
    rt_w = 300
    body.append(rect(rt_x, panel_y, rt_w, panel_h, PANEL_BG, stroke=GRID, rx=14))
    body.append(text(rt_x + 18, panel_y + 28, "Average runtime (log scale)", size=15, weight="600"))

    rt_plot_x = rt_x + 64
    rt_plot_y = panel_y + 44
    rt_plot_w = rt_w - 98
    rt_plot_h = panel_h - 92
    rt_min = 100
    rt_max = 100000
    for tick, label in ((100, "0.1s"), (1000, "1s"), (10000, "10s"), (100000, "100s")):
        y = log_map(tick, rt_min, rt_max, rt_plot_y + rt_plot_h, rt_plot_y)
        body.append(line(rt_plot_x, y, rt_plot_x + rt_plot_w, y))
        body.append(text(rt_plot_x - 12, y + 4, label, size=11, fill=MUTED, anchor="end"))
    body.append(line(rt_plot_x, rt_plot_y, rt_plot_x, rt_plot_y + rt_plot_h, stroke=TEXT, stroke_width=1.5))
    body.append(line(rt_plot_x, rt_plot_y + rt_plot_h, rt_plot_x + rt_plot_w, rt_plot_y + rt_plot_h, stroke=TEXT, stroke_width=1.5))

    runtime_items = [
        ("OrthoAlign", summary["averageOrthoMs"], "#7b8ba1"),
        (f"Solver {summary['solverVersion']}", summary["averageSolverMs"], "#7346d3"),
    ]
    slot_w = rt_plot_w / len(runtime_items)
    for index, (label, value, fill) in enumerate(runtime_items):
        cx = rt_plot_x + slot_w * index + slot_w / 2
        bar_w = 56
        y = log_map(value, rt_min, rt_max, rt_plot_y + rt_plot_h, rt_plot_y)
        body.append(rect(cx - bar_w / 2, y, bar_w, rt_plot_y + rt_plot_h - y, fill, rx=6))
        body.append(text(cx, y - 8, f"{value / 1000:.2f}s", size=12, anchor="middle", weight="600"))
        body.append(text(cx, rt_plot_y + rt_plot_h + 22, label, size=12, anchor="middle"))

    slowdown = summary["averageSolverMs"] / summary["averageOrthoMs"]
    body.append(text(rt_x + 18, panel_y + panel_h - 18, f"Solver average runtime is {slowdown:.1f}x higher.", size=12, fill=MUTED))

    return svg_root(width, height, body)


def draw_loss_heatmap(rows):
    width, height = 980, 430
    body = [
        '<title id="title">Clostridium sweep: concentrated loss cluster</title>',
        '<desc id="desc">Heatmap of solver minus OrthoAlign deltas for the recurring hard cluster discussed in the summary.</desc>',
        rect(0, 0, width, height, "#ffffff"),
        text(48, 42, "Figure 2. The loss pattern is concentrated, not diffuse", size=22, weight="700"),
        text(
            48,
            68,
            "Selected cluster from the narrative: positive values mean the solver needs more moves than OrthoAlign.",
            size=13,
            fill=MUTED,
        ),
    ]

    by_key = {(row["mutable_genome"], row["target_genome"]): row for row in rows}
    mutables = [
        "AP012212_ 1042156.4",
        "CP001078_ 508767.5",
        "CP010520_ 1491.354",
        "CP010521_ 1491.355",
    ]
    targets = [
        "CP010994_ 1502.177",
        "CP010993_ 1502.176",
        "CP000721_ 290402.41",
        "CP006777_ 864803.3",
        "CP002160_ 573061.5",
    ]
    values = [[by_key[(mutable, target)]["delta"] for target in targets] for mutable in mutables]
    max_abs = max(abs(value) for row in values for value in row)

    panel_x = 48
    panel_y = 100
    panel_w = 884
    panel_h = 270
    body.append(rect(panel_x, panel_y, panel_w, panel_h, PANEL_BG, stroke=GRID, rx=14))

    left_margin = 210
    top_margin = 76
    cell_w = 122
    cell_h = 42
    grid_x = panel_x + left_margin
    grid_y = panel_y + top_margin

    for row_index, mutable in enumerate(mutables):
        y = grid_y + row_index * cell_h + cell_h / 2 + 4
        body.append(text(panel_x + 170, y, short_id(mutable), size=13, anchor="end", weight="600"))

    for col_index, target in enumerate(targets):
        x = grid_x + col_index * cell_w + cell_w / 2
        body.append(text(x, panel_y + 58, short_id(target), size=12, anchor="start", weight="600", rotate=-28))

    for row_index, row_values in enumerate(values):
        for col_index, value in enumerate(row_values):
            x = grid_x + col_index * cell_w
            y = grid_y + row_index * cell_h
            fill = diverging_color(value, max_abs)
            body.append(rect(x, y, cell_w - 2, cell_h - 2, fill, stroke="#ffffff", stroke_width=1, rx=4))
            label_fill = "#ffffff" if abs(value) >= 10 else TEXT
            body.append(text(x + (cell_w - 2) / 2, y + cell_h / 2 + 5, f"{value:+d}", size=13, anchor="middle", weight="700", fill=label_fill))

    legend_x = panel_x + 250
    legend_y = panel_y + panel_h - 26
    legend_w = 420
    for step in range(0, 101):
        t = step / 100
        value = -max_abs + (2 * max_abs * t)
        x = legend_x + legend_w * t
        body.append(rect(x, legend_y, legend_w / 100 + 1, 14, diverging_color(value, max_abs), stroke="none"))
    body.append(line(legend_x, legend_y + 15, legend_x + legend_w, legend_y + 15, stroke=TEXT, stroke_width=1))
    for tick_value in (-max_abs, 0, max_abs):
        x = linear_map(tick_value, -max_abs, max_abs, legend_x, legend_x + legend_w)
        body.append(line(x, legend_y + 15, x, legend_y + 20, stroke=TEXT, stroke_width=1))
        body.append(text(x, legend_y + 36, f"{tick_value:+d}", size=11, anchor="middle", fill=MUTED))
    body.append(text(legend_x + legend_w / 2, legend_y - 6, "Cell value: solver - OrthoAlign (moves)", size=12, anchor="middle", fill=MUTED))

    body.append(text(panel_x + 16, panel_y + 26, "Mutables", size=13, weight="600"))
    body.append(text(grid_x + 250, panel_y + 26, "Targets", size=13, weight="600"))

    return svg_root(width, height, body)


def draw_asymmetry(rows):
    matched = canonical_asymmetry_rows(rows)
    width, height = 980, 520

    xs = [item["length_gap"] for item in matched]
    ys = [item["solver_diff"] for item in matched]
    mean_x = statistics.fmean(xs)
    mean_y = statistics.fmean(ys)
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    var_x = sum((x - mean_x) ** 2 for x in xs)
    slope = cov / var_x
    intercept = mean_y - slope * mean_x
    corr = cov / math.sqrt(var_x * sum((y - mean_y) ** 2 for y in ys))

    solver_abs = [abs(item["solver_diff"]) for item in matched]
    ortho_abs = [abs(item["ortho_diff"]) for item in matched]

    body = [
        '<title id="title">Clostridium sweep: directional asymmetry vs length gap</title>',
        '<desc id="desc">Scatter plot of target length minus mutable length against solver forward minus reverse move count for matched directional pairs.</desc>',
        rect(0, 0, width, height, "#ffffff"),
        text(48, 42, "Figure 3. Directional asymmetry tracks the length gap almost linearly", size=22, weight="700"),
        text(
            48,
            68,
            f"Matched canonical pairs: {len(matched)}; Pearson r = {corr:.2f}; "
            f"mean |solver diff| = {statistics.fmean(solver_abs):.2f}; mean |OrthoAlign diff| = {statistics.fmean(ortho_abs):.2f}",
            size=13,
            fill=MUTED,
        ),
    ]

    panel_x = 48
    panel_y = 96
    panel_w = 884
    panel_h = 366
    body.append(rect(panel_x, panel_y, panel_w, panel_h, PANEL_BG, stroke=GRID, rx=14))

    plot_x = panel_x + 72
    plot_y = panel_y + 32
    plot_w = panel_w - 104
    plot_h = panel_h - 84

    x_min, x_max = -80, 80
    y_min, y_max = -35, 35

    for tick in range(-80, 81, 20):
        x = linear_map(tick, x_min, x_max, plot_x, plot_x + plot_w)
        body.append(line(x, plot_y, x, plot_y + plot_h))
        body.append(text(x, plot_y + plot_h + 20, tick, size=11, anchor="middle", fill=MUTED))
    for tick in range(-30, 31, 10):
        y = linear_map(tick, y_min, y_max, plot_y + plot_h, plot_y)
        body.append(line(plot_x, y, plot_x + plot_w, y))
        body.append(text(plot_x - 10, y + 4, tick, size=11, anchor="end", fill=MUTED))

    zero_x = linear_map(0, x_min, x_max, plot_x, plot_x + plot_w)
    zero_y = linear_map(0, y_min, y_max, plot_y + plot_h, plot_y)
    body.append(line(plot_x, zero_y, plot_x + plot_w, zero_y, stroke=TEXT, stroke_width=1.6))
    body.append(line(zero_x, plot_y, zero_x, plot_y + plot_h, stroke=TEXT, stroke_width=1.6))

    for item in matched:
        x = linear_map(item["length_gap"], x_min, x_max, plot_x, plot_x + plot_w)
        y = linear_map(item["solver_diff"], y_min, y_max, plot_y + plot_h, plot_y)
        if item["length_gap"] > 0:
            fill = EXPANDING
        elif item["length_gap"] < 0:
            fill = SHRINKING
        else:
            fill = SAME
        body.append(circle(x, y, 3.2, fill, opacity=0.55))

    line_points = []
    for endpoint in (x_min, x_max):
        predicted = intercept + slope * endpoint
        line_points.append(
            (
                linear_map(endpoint, x_min, x_max, plot_x, plot_x + plot_w),
                linear_map(predicted, y_min, y_max, plot_y + plot_h, plot_y),
            )
        )
    body.append(polyline(line_points, stroke=TEXT, stroke_width=2.4, dash="8 6"))

    highlights = [
        ("AP012212 -> CP000721 / CP006777", 72, 32, EXPANDING, 14, -12),
        ("CP000721 -> CP010086", -53, -18, SHRINKING, -128, 18),
        ("CP000726 -> CP000939", 4, 1, SAME, 10, -14),
    ]
    for label, x_value, y_value, color, dx, dy in highlights:
        x = linear_map(x_value, x_min, x_max, plot_x, plot_x + plot_w)
        y = linear_map(y_value, y_min, y_max, plot_y + plot_h, plot_y)
        body.append(circle(x, y, 5.0, "#ffffff", stroke=color, stroke_width=2))
        body.append(line(x, y, x + dx, y + dy, stroke=color, stroke_width=1.6))
        anchor = "start" if dx >= 0 else "end"
        body.append(text(x + dx + (4 if dx >= 0 else -4), y + dy + 4, label, size=12, anchor=anchor, fill=color, weight="600"))

    legend_x = panel_x + 20
    legend_y = panel_y + 20
    legend_items = [
        (EXPANDING, "target longer than mutable (315)"),
        (SHRINKING, "target shorter than mutable (195)"),
        (SAME, "same length (14)"),
    ]
    for index, (color, label) in enumerate(legend_items):
        y = legend_y + 18 * index
        body.append(circle(legend_x, y, 5, color))
        body.append(text(legend_x + 12, y + 4, label, size=12, fill=MUTED))

    body.append(text(plot_x + plot_w / 2, plot_y + plot_h + 46, "Target length - mutable length (genes)", size=12, anchor="middle", fill=MUTED))
    body.append(text(plot_x - 50, plot_y + plot_h / 2, "Solver moves (forward - reverse)", size=12, anchor="middle", fill=MUTED, rotate=-90))

    return svg_root(width, height, body)


def main():
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    rows = load_rows()
    summary = load_summary()
    comparable = [row for row in rows if row["comparison"] in {"better", "equal", "worse"}]

    outputs = {
        FIGURES_DIR / "quality_runtime_overview.svg": draw_quality_runtime(summary, comparable),
        FIGURES_DIR / "loss_cluster_heatmap.svg": draw_loss_heatmap(rows),
        FIGURES_DIR / "directional_asymmetry.svg": draw_asymmetry(rows),
    }

    for path, svg in outputs.items():
        path.write_text(svg, encoding="utf-8")
        print(f"Wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
