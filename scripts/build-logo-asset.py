"""Build a small, color-preserving brand image for mobile UI at deploy time.
Source logo.png and social/print image are deliberately never changed.
Only writes public/logo-ui.webp; no network, D1/R2 or user data.
"""
from pathlib import Path
from PIL import Image, ImageOps
src=Path("public/logo.png")
dst=Path("public/logo-ui.webp")
if not src.is_file():
    raise SystemExit("Source brand logo.png is missing")
with Image.open(src) as image:
    image=ImageOps.exif_transpose(image)
    image.thumbnail((360,360),Image.Resampling.LANCZOS)
    if image.mode not in ("RGBA","RGB"):
        image=image.convert("RGBA")
    image.save(dst,format="WEBP",quality=90,method=6,exact=True)
if dst.stat().st_size >= src.stat().st_size or dst.stat().st_size>140_000:
    raise SystemExit("Compressed brand image exceeds expected budget; abort preview deploy")
print(f"PASS: original logo unchanged; mobile brand image {src.stat().st_size} -> {dst.stat().st_size} bytes")
