#!/usr/bin/env python3
"""Create a presentation-only Hero derivative by feathering PNG alpha at canvas/platform edges.

RGB pixels are never brightened, recolored, blurred, or retouched. The owner-supplied
source PNG remains intact; only edge alpha is softened in a separate derivative.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/images/hero-upload/tb_image_share_1792519964514 (1).png"
OUTPUT = ROOT / "public/images/hero-upload/tb_image_share_1792519964514-blended.png"
FEATHER_RADIUS = 48
KEEP_MASK_RADIUS = 12
PLATFORM_EDGE_RADIUS = 58
PLATFORM_INNER_BLUR = 18

# Polygons wrap the visible shoe silhouettes with a small safety margin.
# Coordinates are expressed against the supplied 1200 x 1600 reference canvas
# and scaled proportionally if the owner ever replaces the source asset.
LEFT_SHOE = [
    (138, 715), (154, 662), (185, 610), (216, 578), (253, 558), (285, 557),
    (325, 577), (369, 599), (413, 625), (459, 650), (506, 680), (550, 708),
    (590, 737), (627, 769), (661, 805), (690, 839), (713, 875), (727, 907),
    (719, 933), (700, 955), (670, 972), (630, 985), (586, 991), (544, 984),
    (503, 971), (461, 951), (420, 929), (377, 907), (336, 885), (295, 861),
    (255, 835), (220, 808), (189, 778), (163, 747)
]
PLATFORM = [
    (105, 775), (175, 700), (275, 660), (385, 655), (505, 685),
    (625, 715), (770, 735), (930, 755), (1085, 770), (1198, 785),
    (1198, 1390), (1125, 1460), (1035, 1515), (950, 1570), (870, 1598),
    (790, 1555), (715, 1500), (640, 1430), (565, 1350), (485, 1265),
    (405, 1175), (325, 1085), (250, 1000), (190, 920), (145, 850)
]

RIGHT_SHOE = [
    (587, 568), (590, 505), (599, 438), (611, 378), (630, 325), (650, 281),
    (674, 247), (698, 231), (721, 229), (743, 241), (766, 267), (789, 307),
    (810, 354), (829, 406), (843, 464), (852, 526), (858, 592), (860, 655),
    (857, 714), (850, 765), (837, 811), (818, 850), (795, 881), (770, 903),
    (741, 916), (712, 922), (684, 915), (660, 899), (640, 874), (624, 840),
    (612, 800), (603, 754), (597, 705), (593, 655)
]


def scaled_polygon(points: list[tuple[int, int]], width: int, height: int) -> list[tuple[int, int]]:
    return [(round(x * width / 1200), round(y * height / 1600)) for x, y in points]


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Missing owner-provided Hero image: {SOURCE}")
    with Image.open(SOURCE) as opened:
        source = opened.convert("RGBA")

    width, height = source.size
    if width < 600 or height < 800:
        raise SystemExit(f"Unexpectedly small Hero image ({width} x {height}); refusing to process.")

    alpha = source.getchannel("A")
    alpha_min, alpha_max = alpha.getextrema()
    if alpha_min == alpha_max == 255:
        raise SystemExit(
            "The source has no transparent pixels. Refusing to blur the RGB image or apply "
            "an unverified background-removal operation."
        )

    blurred_alpha = alpha.filter(ImageFilter.GaussianBlur(radius=FEATHER_RADIUS))
    keep_shoes = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(keep_shoes)
    draw.polygon(scaled_polygon(LEFT_SHOE, width, height), fill=255)
    draw.polygon(scaled_polygon(RIGHT_SHOE, width, height), fill=255)
    keep_shoes = keep_shoes.filter(ImageFilter.GaussianBlur(radius=KEEP_MASK_RADIUS))

    # Build a feather band on the crocodile-leather platform's own silhouette.
    # Unlike a whole-image oval, this fades only the platform edge; the shoe
    # silhouettes are protected below. Keep the owner-provided RGB untouched.
    platform = Image.new("L", source.size, 0)
    ImageDraw.Draw(platform).polygon(scaled_polygon(PLATFORM, width, height), fill=255)
    shrink = max(3, PLATFORM_EDGE_RADIUS * 2 + 1)
    platform_inner = platform.filter(ImageFilter.MinFilter(size=shrink))
    platform_inner = platform_inner.filter(ImageFilter.GaussianBlur(radius=PLATFORM_INNER_BLUR))
    platform_edge = Image.new("L", source.size)
    platform_edge.putdata([
        max(0, min(255, int(outer) - int(inner)))
        for outer, inner in zip(platform.getdata(), platform_inner.getdata())
    ])

    original_alpha = list(alpha.getdata())
    soft_alpha = list(blurred_alpha.getdata())
    keep = list(keep_shoes.getdata())
    edge = list(platform_edge.getdata())
    new_alpha = Image.new("L", source.size)
    new_alpha.putdata([
        max(0, min(255, round(
            (a * (k / 255.0 + (1.0 - k / 255.0) * (1.0 - e / 255.0)))
            if e else (a * (k / 255.0) + b * (1.0 - k / 255.0))
        )))
        for a, b, k, e in zip(original_alpha, soft_alpha, keep, edge)
    ])
    source.putalpha(new_alpha)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    source.save(OUTPUT, format="PNG", optimize=True)

    with Image.open(OUTPUT) as result:
        result_alpha = result.getchannel("A")
        report = {
            "source": str(SOURCE.relative_to(ROOT)),
            "output": str(OUTPUT.relative_to(ROOT)),
            "dimensions": [width, height],
            "source_alpha_extrema": alpha.getextrema(),
            "output_alpha_extrema": result_alpha.getextrema(),
            "feather_radius_source_pixels": FEATHER_RADIUS,
            "shoe_keep_mask_feather_source_pixels": KEEP_MASK_RADIUS,
            "platform_edge_feather_source_pixels": PLATFORM_EDGE_RADIUS,
            "platform_edge_mask": "polygon feather band; shoe regions protected",
            "rgb_modified": False,
            "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            "output_sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
            "output_bytes": OUTPUT.stat().st_size,
        }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
