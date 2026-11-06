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

# A density-appropriate welcome mark prevents the 360px fallback from being
# downloaded into its ~105px mobile frame. The source logo remains untouched.
responsive_dst=Path("public/logo-ui-320.webp")
with Image.open(src) as image:
    image=ImageOps.exif_transpose(image)
    image.thumbnail((320,320),Image.Resampling.LANCZOS)
    if image.mode not in ("RGBA","RGB"):
        image=image.convert("RGBA")
    image.save(responsive_dst,format="WEBP",quality=68,method=6,exact=True)
if not responsive_dst.is_file() or responsive_dst.stat().st_size>30_000:
    raise SystemExit("Responsive 320px logo exceeds 30KB budget")
with Image.open(responsive_dst) as image:
    if image.size != (320,320):
        raise SystemExit("Responsive logo variant must be exactly 320x320")
print(f"PASS: generated 320px welcome logo ({responsive_dst.stat().st_size} bytes)")

# The mobile navigation uses a separate compact brand symbol, not the
# complete square logo. It must be generated on every Pages build; the old
# HTML referenced this file although it was missing from the Git tree.
nav_src=Path("public/images/brand-emblem.png")
nav_dst=Path("public/images/brand-emblem-nav.webp")
if not nav_src.is_file():
    raise SystemExit("Official navigation emblem source is missing")
with Image.open(nav_src) as emblem:
    emblem=ImageOps.exif_transpose(emblem)
    emblem.thumbnail((96, 96), Image.Resampling.LANCZOS)
    if emblem.mode not in ("RGB", "RGBA"):
        emblem=emblem.convert("RGBA")
    emblem.save(nav_dst, format="WEBP", quality=88, method=6, exact=True)
if nav_dst.stat().st_size > 20_000:
    raise SystemExit("Navigation brand symbol exceeds 20KB budget")
print(f"PASS: official nav emblem {nav_src.stat().st_size} -> {nav_dst.stat().st_size} bytes")
