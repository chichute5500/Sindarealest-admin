"""Build small static texture previews without modifying the full-size originals.

Run during Cloudflare Pages builds. The source WebP files remain untouched for
fullscreen/detail usages. No external image service, D1, R2 or upload needed.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / "public" / "images"
for stem in ("theme-croc-dark", "theme-croc-albino"):
    original = root / (stem + ".webp")
    output = root / (stem + "-tile.webp")
    if not original.is_file():
        raise SystemExit(f"Missing original texture: {original}")
    with Image.open(original) as image:
        image.load()
        if image.width < 1 or image.height < 1:
            raise SystemExit(f"Invalid source image: {original}")
        image.thumbnail((720, 720), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        image.save(output, format="WEBP", quality=78, method=6, exact=True)
    old_size = original.stat().st_size
    new_size = output.stat().st_size
    if new_size >= old_size or new_size > 120_000:
        raise SystemExit(f"Texture not optimized: {output} {new_size}/{old_size}")
    print(f"PASS: {stem} tile preview {old_size} -> {new_size} bytes")
