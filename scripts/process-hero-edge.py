#!/usr/bin/env python3
"""Create a presentation-only Hero derivative by feathering the real alpha silhouette.

The owner-supplied source PNG remains byte-for-byte intact. RGB pixels are not
brightened, recolored, blurred, or retouched. The only output change is alpha:
the true source silhouette is softly feathered against transparent padding,
while the two shoe regions are protected by the existing shoe keep masks.
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

# These protection polygons cover the two shoe silhouettes only. They are not
# used to define or cut the crocodile platform edge; that edge comes from the
# uploaded image's actual alpha silhouette and its transparent surroundings.
LEFT_SHOE = [
    (138, 715), (154, 662), (185, 610), (216, 578), (253, 558), (285, 557),
    (325, 577), (369, 599), (413, 625), (459, 650), (506, 680), (550, 708),
    (590, 737), (627, 769), (661, 805), (690, 839), (713, 875), (727, 907),
    (719, 933), (700, 955), (670, 972), (630, 985), (586, 991), (544, 984),
    (503, 971), (461, 951), (420, 929), (377, 907), (336, 885), (295, 861),
    (255, 835), (220, 808), (189, 778), (163, 747)
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
    source_bytes = SOURCE.read_bytes()
    with Image.open(SOURCE) as opened:
        source = opened.convert("RGBA")

    width, height = source.size
    if width < 600 or height < 800:
        raise SystemExit(f"Unexpectedly small Hero image ({width} x {height}); refusing to process.")

    alpha = source.getchannel("A")
    if alpha.getextrema() == (255, 255):
        raise SystemExit(
            "The source has no transparent pixels. Refusing to blur RGB or guess "
            "a platform polygon; an alpha silhouette is required."
        )

    # Pad before blur and keep that padding in the final output. Cropping the
    # blur back to the source rectangle recreates a straight edge at canvas bounds.
    padding = FEATHER_RADIUS * 3
    padded_alpha = Image.new("L", (width + padding * 2, height + padding * 2), 0)
    padded_alpha.paste(alpha, (padding, padding))
    blurred_padded_alpha = padded_alpha.filter(
        ImageFilter.GaussianBlur(radius=FEATHER_RADIUS)
    )

    padded_source = Image.new(
        "RGBA", (width + padding * 2, height + padding * 2), (0, 0, 0, 0)
    )
    padded_source.alpha_composite(source, (padding, padding))

    keep_shoes = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(keep_shoes)
    draw.polygon(scaled_polygon(LEFT_SHOE, width, height), fill=255)
    draw.polygon(scaled_polygon(RIGHT_SHOE, width, height), fill=255)
    keep_shoes = keep_shoes.filter(ImageFilter.GaussianBlur(radius=KEEP_MASK_RADIUS))
    padded_keep_shoes = Image.new("L", padded_source.size, 0)
    padded_keep_shoes.paste(keep_shoes, (padding, padding))

    original_alpha = list(padded_source.getchannel("A").getdata())
    soft_alpha = list(blurred_padded_alpha.getdata())
    keep = list(padded_keep_shoes.getdata())
    new_alpha = Image.new("L", padded_source.size)
    new_alpha.putdata([
        max(0, min(255, round(a * (k / 255.0) + b * (1.0 - k / 255.0))))
        for a, b, k in zip(original_alpha, soft_alpha, keep)
    ])
    padded_source.putalpha(new_alpha)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    padded_source.save(OUTPUT, format="PNG", optimize=True)

    with Image.open(OUTPUT) as result:
        result_alpha = result.getchannel("A")
        report = {
            "source": str(SOURCE.relative_to(ROOT)),
            "output": str(OUTPUT.relative_to(ROOT)),
            "source_dimensions": [width, height],
            "output_dimensions": list(result.size),
            "output_padding_pixels": padding,
            "output_keeps_transparent_padding": result.size == [width + padding * 2, height + padding * 2],
            "source_alpha_extrema": alpha.getextrema(),
            "output_alpha_extrema": result_alpha.getextrema(),
            "feather_radius_source_pixels": FEATHER_RADIUS,
            "transparent_padding_source_pixels": padding,
            "shoe_keep_mask_feather_source_pixels": KEEP_MASK_RADIUS,
            "platform_edge_mask": "source alpha silhouette with transparent padding; shoe regions protected",
            "rgb_modified": False,
            "source_sha256": hashlib.sha256(source_bytes).hexdigest(),
            "output_sha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
            "output_bytes": OUTPUT.stat().st_size,
        }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
