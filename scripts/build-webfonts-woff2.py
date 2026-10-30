"""Generate matching WOFF2 copies of the existing SinDarealest font assets.

Run only on the isolated Preview branch. The original TTF assets remain
as compatibility fallbacks. No font is downloaded or replaced.
"""
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
folder = root / "public" / "fonts"
names = (
    "NotoSans-Regular",
    "NotoSans-Bold",
    "NotoSerif-Regular",
    "NotoSerif-Bold",
)

for name in names:
    original = folder / f"{name}.ttf"
    output = folder / f"{name}.woff2"
    if not original.is_file():
        raise FileNotFoundError(original)
    font = TTFont(original)
    glyphs = font.getGlyphOrder()
    font.flavor = "woff2"
    font.save(output)
    verify = TTFont(output)
    if verify.flavor != "woff2" or verify.getGlyphOrder() != glyphs:
        raise RuntimeError(f"Font roundtrip failed: {name}")
    if output.read_bytes()[:4] != b"wOF2":
        raise RuntimeError(f"Invalid WOFF2 header: {output}")
    if output.stat().st_size >= original.stat().st_size:
        raise RuntimeError(f"No savings detected for {name}")
    print(f"PASS {name}: {original.stat().st_size} -> {output.stat().st_size} bytes")

html_path = root / "public" / "index.html"
html = html_path.read_text(encoding="utf-8")
for name in names:
    old = f"src:url('fonts/{name}.ttf') format('truetype')"
    new = f"src:url('fonts/{name}.woff2') format('woff2'),url('fonts/{name}.ttf') format('truetype')"
    if html.count(old) != 1:
        if html.count(new) == 1:
            continue
        raise RuntimeError(f"Font declaration not unique: {name}")
    html = html.replace(old, new)
for name in ("NotoSerif-Regular", "NotoSans-Regular"):
    old = f'href="/fonts/{name}.ttf" as="font" type="font/ttf"'
    new = f'href="/fonts/{name}.woff2" as="font" type="font/woff2"'
    if html.count(old) != 1:
        if html.count(new) == 1:
            continue
        raise RuntimeError(f"Preload declaration not unique: {name}")
    html = html.replace(old, new)
html_path.write_text(html, encoding="utf-8")
print("PASS: Storefront preloads and font faces prefer WOFF2, with TTF fallback")
