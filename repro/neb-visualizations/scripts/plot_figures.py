#!/usr/bin/env python3
"""Generate the NEB visualization figures for the blog post."""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np


SYSTEM_LABELS = {
    "cyclo": "Cycloaddition",
    "grignard": "Grignard addition",
    "bicyclo": "Bicyclobutane opening",
}

COLORS = {
    "ink": "#1f2933",
    "muted": "#657786",
    "teal": "#004D40",
    "coral": "#FF655D",
    "gold": "#b7791f",
    "plum": "#6b4c9a",
}


def set_style() -> None:
    mpl.rcParams.update(
        {
            "figure.dpi": 180,
            "savefig.dpi": 220,
            "font.size": 10,
            "axes.titlesize": 12,
            "axes.labelsize": 10,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "axes.grid": True,
            "grid.color": "#d7dde2",
            "grid.linewidth": 0.6,
            "grid.alpha": 0.7,
            "legend.frameon": False,
        }
    )


def read_profiles(path: Path) -> list[dict[str, float | int | str]]:
    rows: list[dict[str, float | int | str]] = []
    with path.open() as handle:
        for row in csv.DictReader(handle):
            rows.append(
                {
                    "system": row["system"],
                    "iteration": int(row["iteration"]),
                    "image": int(row["image"]),
                    "rxn_coord": float(row["rxn_coord"]),
                    "energy": float(row["energy"]),
                    "f_para": float(row["f_para"]),
                }
            )
    return rows


def read_geometry(path: Path) -> list[dict[str, float | int | str]]:
    rows: list[dict[str, float | int | str]] = []
    with path.open() as handle:
        for row in csv.DictReader(handle):
            rows.append(
                {
                    "system": row["system"],
                    "iteration": int(row["iteration"]),
                    "image": int(row["image"]),
                    "s": float(row["s"]),
                    "d": float(row["d"]),
                    "rmsd_reactant": float(row["rmsd_reactant"]),
                    "rmsd_product": float(row["rmsd_product"]),
                    "energy": float(row["energy"]),
                }
            )
    return rows


def group_by_iteration(rows: list[dict[str, float | int | str]], system: str) -> dict[int, list[dict[str, float | int | str]]]:
    grouped: dict[int, list[dict[str, float | int | str]]] = defaultdict(list)
    for row in rows:
        if row["system"] == system:
            grouped[int(row["iteration"])].append(row)
    for items in grouped.values():
        items.sort(key=lambda x: int(x["image"]))
    return dict(sorted(grouped.items()))


def final_iteration(rows: list[dict[str, float | int | str]], system: str) -> int:
    return max(int(row["iteration"]) for row in rows if row["system"] == system)


def save(fig: plt.Figure, output_dir: Path, filename: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(output_dir / filename, bbox_inches="tight")
    plt.close(fig)


def plot_pipeline(output_dir: Path) -> None:
    """Render the projection pipeline with Graphviz (matches the org-mode figure).

    The blog source of truth is the =dot= block in =content-org/all-posts.org=.
    This helper keeps the figure-reproduction bundle aligned with that diagram.
    """
    import shutil
    import subprocess
    import tempfile

    if shutil.which("dot") is None:
        raise RuntimeError("graphviz 'dot' is required to render neb-viz-pipeline.png")

    # Vertical layout: a flat LR strip collapses to ~80px tall in the content
    # column; TB keeps labels readable at full column width.
    source = r"""
digraph NEBProjectionPipeline {
  graph [
    fontname="Jost",
    fontsize=15,
    bgcolor="white",
    rankdir=TB,
    nodesep=0.40,
    ranksep=0.45,
    pad=0.18,
    splines=true
  ];
  node [
    fontname="Jost",
    fontsize=15,
    shape=box,
    style="rounded,filled",
    fillcolor="white",
    color="#004D40",
    fontcolor="#004D40",
    penwidth=2.0,
    margin="0.30,0.18",
    width=3.6
  ];
  edge [
    fontname="Jost",
    fontsize=13,
    color="#004D40",
    fontcolor="#004D40",
    penwidth=1.8,
    arrowsize=1.0
  ];

  neb [
    label="1. NEB band  ·  3N coords, E, F_parallel",
    fillcolor="#FF655D",
    fontcolor="white",
    color="#FF655D"
  ];
  ira [label="2. IRA RMSD  ·  r = d(R), p = d(P)"];
  grad [label="3. Synthetic gradients in (r, p)"];
  gp [
    label="4. Grad-enhanced GP  ·  IMQ kernel, mean + variance",
    fillcolor="#F1DB4B",
    color="#004D40"
  ];
  sd [label="5. Rotate frame  ·  s progress, d orthogonal"];
  out [
    label="6. s-d landscape  ·  path, samples, variance contours",
    fillcolor="#004D40",
    fontcolor="white",
    color="#004D40"
  ];

  neb -> ira;
  ira -> grad;
  grad -> gp;
  gp -> sd;
  sd -> out;
}
"""
    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".dot", delete=False) as handle:
        handle.write(source)
        dot_path = Path(handle.name)
    try:
        subprocess.run(
            [
                "dot",
                "-Kdot",
                "-Tpng",
                "-Gdpi=220",
                "-o",
                str(output_dir / "neb-viz-pipeline.png"),
                str(dot_path),
            ],
            check=True,
        )
    finally:
        dot_path.unlink(missing_ok=True)


def plot_profile(
    profiles: list[dict[str, float | int | str]],
    geometry: list[dict[str, float | int | str]],
    output_dir: Path,
    mode: str,
    filename: str,
) -> None:
    system = "cyclo"
    grouped = group_by_iteration(profiles, system)
    geom_grouped = group_by_iteration(geometry, system)
    final = max(grouped)
    fig, ax = plt.subplots(figsize=(7.1, 4.45))
    history = list(grouped.items())
    stride = max(len(history) // 9, 1)
    for iteration, rows in history[::stride]:
        alpha = 0.12 + 0.38 * iteration / max(final, 1)
        if mode == "path":
            x = [float(row["rxn_coord"]) for row in rows]
        elif mode == "index":
            x = [int(row["image"]) for row in rows]
        else:
            lookup = {int(row["image"]): float(row["rmsd_reactant"]) for row in geom_grouped[iteration]}
            x = [lookup[int(row["image"])] for row in rows]
        y = [float(row["energy"]) for row in rows]
        ax.plot(x, y, color=COLORS["teal"], alpha=alpha, lw=1.0)

    final_rows = grouped[final]
    if mode == "path":
        x_final = [float(row["rxn_coord"]) for row in final_rows]
        xlabel = "Path length / A"
    elif mode == "index":
        x_final = [int(row["image"]) for row in final_rows]
        xlabel = "Image index"
    else:
        lookup = {int(row["image"]): float(row["rmsd_reactant"]) for row in geom_grouped[final]}
        x_final = [lookup[int(row["image"])] for row in final_rows]
        xlabel = "Reactant RMSD / A"
    y_final = [float(row["energy"]) for row in final_rows]
    peak = int(np.argmax(y_final))
    ax.plot(x_final, y_final, color=COLORS["ink"], lw=2.1, marker="o", ms=4.2, label="final band")
    ax.scatter([x_final[peak]], [y_final[peak]], s=72, color=COLORS["coral"], zorder=4, label="highest image")
    ax.axhline(0.0, color="#a7b0b8", lw=0.9)
    ax.set_xlabel(xlabel)
    ax.set_ylabel("Relative energy / eV")
    ax.set_title({"path": "Energy against path length", "index": "Energy against image index", "rmsd": "Energy against reactant RMSD"}[mode])
    ax.legend(loc="best")
    save(fig, output_dir, filename)


def weighted_surface(points: np.ndarray, values: np.ndarray, xx: np.ndarray, yy: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    span = max(np.ptp(points[:, 0]), np.ptp(points[:, 1]), 1e-6)
    sigma = 0.18 * span
    grid = np.column_stack([xx.ravel(), yy.ravel()])
    dist2 = (grid[:, None, 0] - points[None, :, 0]) ** 2 + (grid[:, None, 1] - points[None, :, 1]) ** 2
    weights = np.exp(-dist2 / (2 * sigma**2))
    weights_sum = weights.sum(axis=1) + 1e-12
    surface = (weights @ values) / weights_sum
    uncertainty = 1.0 / np.sqrt(weights_sum)
    return surface.reshape(xx.shape), uncertainty.reshape(xx.shape)


def plot_landscape(
    geometry: list[dict[str, float | int | str]],
    output_dir: Path,
    system: str,
    filename: str,
) -> None:
    rows = [row for row in geometry if row["system"] == system and np.isfinite(float(row["energy"]))]
    final = final_iteration(geometry, system)
    final_rows = [row for row in rows if int(row["iteration"]) == final]
    sample_rows = rows[:: max(len(rows) // 900, 1)]
    points = np.asarray([[float(row["s"]), float(row["d"])] for row in sample_rows])
    values = np.asarray([float(row["energy"]) for row in sample_rows])
    pad_s = max(0.08 * np.ptp(points[:, 0]), 0.05)
    pad_d = max(0.18 * np.ptp(points[:, 1]), 0.05)
    xs = np.linspace(points[:, 0].min() - pad_s, points[:, 0].max() + pad_s, 170)
    ys = np.linspace(min(-pad_d, points[:, 1].min() - pad_d), points[:, 1].max() + pad_d, 150)
    xx, yy = np.meshgrid(xs, ys)
    surface, uncertainty = weighted_surface(points, values, xx, yy)

    fig, ax = plt.subplots(figsize=(5.8, 5.25))
    contour = ax.contourf(xx, yy, surface, levels=24, cmap="viridis")
    fig.colorbar(contour, ax=ax, label="Relative energy / eV", shrink=0.84)
    unc_levels = np.quantile(uncertainty, [0.55, 0.75, 0.90])
    ax.contour(xx, yy, uncertainty, levels=unc_levels, colors="white", linestyles="dashed", linewidths=0.8, alpha=0.85)
    ax.scatter(points[:, 0], points[:, 1], s=8, color="black", alpha=0.15, linewidths=0, label="sampled images")
    final_points = np.asarray([[float(row["s"]), float(row["d"])] for row in final_rows])
    final_energy = np.asarray([float(row["energy"]) for row in final_rows])
    ax.plot(final_points[:, 0], final_points[:, 1], color="white", lw=3.2, alpha=0.88)
    ax.plot(final_points[:, 0], final_points[:, 1], color=COLORS["ink"], lw=1.4, marker="o", ms=4.1, mfc="white", label="final path")
    peak = int(np.argmax(final_energy))
    ax.scatter([final_points[peak, 0]], [final_points[peak, 1]], marker="*", s=185, color=COLORS["coral"], edgecolor="white", linewidth=0.9, label="highest image")
    ax.set_xlabel("Progress coordinate s / A")
    ax.set_ylabel("Off-path coordinate d / A")
    ax.set_title(SYSTEM_LABELS[system])
    ax.legend(loc="upper right")
    save(fig, output_dir, filename)


def plot_convergence(profiles: list[dict[str, float | int | str]], output_dir: Path) -> None:
    grouped = group_by_iteration(profiles, "cyclo")
    iterations = np.asarray(list(grouped.keys()))
    barriers = np.asarray([max(float(row["energy"]) for row in grouped[it]) for it in iterations])
    max_force = np.asarray([max(abs(float(row["f_para"])) for row in grouped[it]) for it in iterations])

    fig, (ax1, ax2) = plt.subplots(
        2, 1, sharex=True, figsize=(7.2, 5.4), layout="constrained",
        gridspec_kw={"height_ratios": [1.15, 1.0]},
    )
    ax1.plot(iterations, barriers, color=COLORS["teal"], lw=2.1, marker="o", ms=3.5)
    ax1.set_ylabel("Barrier / eV", color=COLORS["teal"])
    ax1.tick_params(axis="y", labelcolor=COLORS["teal"])
    ax1.set_title("Barrier and force convergence (Cycloaddition)")
    ax2.plot(iterations, max_force, color=COLORS["coral"], lw=2.1, marker="o", ms=3.5)
    ax2.set_xlabel("NEB optimization step")
    ax2.set_ylabel(r"Max $|F_\parallel|$ / eV $\mathrm{\AA}^{-1}$", color=COLORS["coral"])
    ax2.tick_params(axis="y", labelcolor=COLORS["coral"])
    save(fig, output_dir, "neb-viz-convergence.png")


def plot_force_heatmap(profiles: list[dict[str, float | int | str]], output_dir: Path) -> None:
    grouped = group_by_iteration(profiles, "cyclo")
    iterations = list(grouped)
    images = [int(row["image"]) for row in grouped[iterations[-1]]]
    heat = np.zeros((len(iterations), len(images)))
    for i, iteration in enumerate(iterations):
        force_by_image = {int(row["image"]): abs(float(row["f_para"])) for row in grouped[iteration]}
        for j, image in enumerate(images):
            heat[i, j] = force_by_image.get(image, np.nan)

    fig, ax = plt.subplots(figsize=(7.2, 4.4))
    mesh = ax.imshow(
        heat, aspect="auto", origin="lower", cmap="magma", interpolation="nearest",
        extent=[min(images) - 0.5, max(images) + 0.5, min(iterations) - 0.5, max(iterations) + 0.5],
    )
    fig.colorbar(mesh, ax=ax, label=r"$|F_\parallel|$ / eV $\mathrm{\AA}^{-1}$")
    final_rows = grouped[iterations[-1]]
    climb = int(max(final_rows, key=lambda r: float(r["energy"]))["image"])
    ax.axvline(climb, color="white", ls="--", lw=1.2, alpha=0.9, label=f"highest image ({climb})")
    ax.set_xlabel("Image index")
    ax.set_ylabel("NEB optimization step")
    ax.set_title("Where the band still moves (Cycloaddition)")
    ax.set_xticks(images[:: max(1, len(images) // 10)])
    ax.set_yticks(iterations[:: max(1, len(iterations) // 10)])
    ax.legend(loc="upper left", fontsize=9)
    save(fig, output_dir, "neb-viz-force-heatmap.png")


def plot_sampling_density(geometry: list[dict[str, float | int | str]], output_dir: Path) -> None:
    fig, ax = plt.subplots(figsize=(7.1, 4.1))
    for idx, system in enumerate(["cyclo", "grignard", "bicyclo"]):
        final = final_iteration(geometry, system)
        rows = [row for row in geometry if row["system"] == system and int(row["iteration"]) == final]
        rows.sort(key=lambda x: int(x["image"]))
        s = np.asarray([float(row["s"]) for row in rows])
        spacing = np.diff(s)
        x = np.arange(len(spacing)) + idx * 0.08
        color = [COLORS["teal"], COLORS["gold"], COLORS["plum"]][idx]
        ax.plot(x, spacing, marker="o", lw=1.7, ms=4.0, color=color, label=SYSTEM_LABELS[system])
    ax.set_xlabel("Segment index")
    ax.set_ylabel(r"Path-length spacing / $\mathrm{\AA}$")
    ax.set_title("Final-band image spacing")
    ax.legend(loc="best")
    save(fig, output_dir, "neb-viz-sampling-density.png")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profiles", required=True)
    parser.add_argument("--geometry", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    set_style()
    output_dir = Path(args.output_dir)
    profiles = read_profiles(Path(args.profiles))
    geometry = read_geometry(Path(args.geometry))

    plot_pipeline(output_dir)
    plot_profile(profiles, geometry, output_dir, "path", "neb-viz-1d-path.png")
    plot_profile(profiles, geometry, output_dir, "index", "neb-viz-1d-index.png")
    plot_profile(profiles, geometry, output_dir, "rmsd", "neb-viz-1d-rmsd.png")
    plot_landscape(geometry, output_dir, "cyclo", "neb-viz-2d-cyclo.png")
    plot_landscape(geometry, output_dir, "grignard", "neb-viz-2d-grignard.png")
    plot_landscape(geometry, output_dir, "bicyclo", "neb-viz-2d-bicyclo.png")
    plot_convergence(profiles, output_dir)
    plot_force_heatmap(profiles, output_dir)
    plot_sampling_density(geometry, output_dir)


if __name__ == "__main__":
    main()
