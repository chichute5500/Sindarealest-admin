"""Optimize only the tiny Storefront navigation monogram.

Read the existing SinDarealest emblem. Preserve its original PNG for lightbox,
watermarks and brand assets. No design change and no network/deploy writes.
"""
from pathlib import Path
from PIL import Image

images = Path(__file__).resolve().parents[1] / "public" / "images"
original = images / "brand-emblem.png"
target = images / "brand-emblem-nav.webp"
with Image.open(original) as source:
    source.load()
    if source.width < 1 or source.height < 1:
        raise SystemExit("Invalid brand emblem")
    source.thumbnail((96, 96), Image.Resampling.LANCZOS)
    # Keep real transparency: never flatten logo against a white/black canvas.
    source = source.convert("RGBA")
    source.save(target, "WEBP", quality=90, method=6, exact=True)

original_size = original.stat().st_size
target_size = target.stat().st_size
if target_size >= original_size or target_size > 25_000:
    raise SystemExit(f"Navigation emblem too heavy: {target_size}/{original_size}")
print(f"PASS: original brand monogram preserved; nav icon {original_size} -> {target_size} bytes")
