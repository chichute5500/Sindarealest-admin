#!/usr/bin/env python3
"""Publish the user-approved light-blue SinDarealest social preview.

Seed parts are an optimized JPEG encoding of the approved image (not an
assistant-recreated brand). A fixed checksum prevents publishing corrupted
data. Upscale to social-preview 1200x630 with high quality Lanczos.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import base64
import hashlib
import io

ROOT = Path(__file__).resolve().parents[1]
parts = [ROOT / f"scripts/_blue_preview_seed.part{i}.b64" for i in range(5)]
data = base64.b64decode("".join(path.read_text(encoding="ascii").strip() for path in parts), validate=True)
digest = hashlib.sha256(data).hexdigest()
expected = "bf8734e32a4fc9d4028180778d381641d3ea6d0f77edd53718456bcf13f64a60"
if digest != expected:
    raise SystemExit(f"APPROVED_IMAGE_CORRUPTED: {digest} != {expected}")
image = Image.open(io.BytesIO(data)).convert("RGB")
if image.size != (480,252):
    raise SystemExit(f"UNEXPECTED_APPROVED_SEED: {image.size}")
large = image.resize((1200,630),Image.Resampling.LANCZOS)
large = large.filter(ImageFilter.UnsharpMask(radius=0.8,percent=95,threshold=3))
out = ROOT / "public/og-sindarealest-light-blue-20261027.jpg"
large.save(out,"JPEG",quality=94,subsampling=0,optimize=True,progressive=True)
verify=Image.open(out)
assert verify.size==(1200,630) and verify.format=="JPEG"
print(f"APPROVED_BLUE_OG=PASS sha256={digest} size={verify.size} bytes={out.stat().st_size}")
