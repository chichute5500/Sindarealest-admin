"""Build compact WOFF2 webfonts while retaining Vietnamese glyphs and the original TTF.
No typography, font-family, font weight, CSS or network/API changes.

The Noto TTF originals stay intact as a fallback. The subset is a superset of
Latin, combining accents, Vietnamese precomposed letters and site punctuation,
so the browser never needs an extra font download for normal Vietnamese copy.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.subset import Options, Subsetter

BASE = Path("public/fonts")
FONTS = ("NotoSans-Regular", "NotoSans-Bold", "NotoSerif-Regular", "NotoSerif-Bold")
# Latin, Latin Extended A/B, combining diacritics, Vietnamese U+1EA0–U+1EF9,
# common quotes/punctuation, money symbols, arrows and simple UI symbols.
RANGES = (
    (0x0020, 0x024F),
    (0x0300, 0x036F),
    (0x1E00, 0x1EFF),
    (0x2000, 0x206F),
    (0x20A0, 0x20CF),
    (0x2100, 0x214F),
    (0x2190, 0x21FF),
    (0x25A0, 0x25FF),
)
REQUIRED = {codepoint for low, high in RANGES for codepoint in range(low, high + 1)}
VIETNAMESE_SMOKE = {ord(c) for c in "SinDarealest — Thời Trang Da Cá Sấu. Giày lười, thắt lưng, ví cầm tay; đặt cọc 30%, bảo hành 1 năm."}

for family in FONTS:
    original = BASE / (family + ".ttf")
    output = BASE / (family + ".woff2")
    if not original.is_file():
        raise SystemExit("Missing original Noto source font: " + str(original))

    font = TTFont(original, recalcBBoxes=False, recalcTimestamp=False)
    original_cmap = set(font.getBestCmap() or {})
    # Fail closed on a font swap that loses common Vietnamese text.
    if not VIETNAMESE_SMOKE.issubset(original_cmap):
        missing = sorted(VIETNAMESE_SMOKE - original_cmap)
        raise SystemExit(f"Original {family} lacks expected Vietnamese characters: {missing}")

    options = Options()
    options.layout_features = ["*"]  # Retain original OpenType shaping/kerning.
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=REQUIRED)
    subsetter.subset(font)
    retained_cmap = set(font.getBestCmap() or {})
    missing = (REQUIRED & original_cmap) - retained_cmap
    if missing:
        raise SystemExit(f"Subsetting unexpectedly lost {len(missing)} glyphs: {family}")

    font.flavor = "woff2"
    font.save(output)
    font.close()
    size = output.stat().st_size
    full_size = original.stat().st_size
    if not (10_000 < size < full_size * 0.8):
        raise SystemExit(f"Unexpected subset font size {family}: {size}/{full_size}")
    print(f"PASS: {family}: original {full_size} bytes -> subset {size} bytes; {len(retained_cmap)} Unicode mappings retained")


# The approved Welcome and code-only Hero have short, stable first-paint copy.
# Serve the exact same original Noto outlines/metrics from a tiny companion face
# before the general Vietnamese webfonts finish downloading. Other text still
# falls back to the complete Noto WOFF2 above, including Owner-edited copy.
FIRST_PAINT_COPY = (
    "Dấu ấn da cá sấu. Tinh tế trong từng chi tiết. "
    "Mỗi thiết kế là một dấu ấn riêng, được chăm chút từ chất liệu đến từng chi tiết. "
    "Phong cách Đẳng cấp từ da cá sấu. "
    "SINDAREALEST · SIGNATURE Premium Crocodile Leather Fashion "
    "Giá trị nằm trong từng chi tiết. " 
)
FIRST_PAINT_CODEPOINTS = {ord(c) for c in FIRST_PAINT_COPY} | VIETNAMESE_SMOKE
for family in ("NotoSerif-Regular", "NotoSerif-Bold"):
    original = BASE / (family + ".ttf")
    output = BASE / (family + "-FirstPaint.woff2")
    font = TTFont(original, recalcBBoxes=False, recalcTimestamp=False)
    original_cmap = set(font.getBestCmap() or {})
    missing_source = FIRST_PAINT_CODEPOINTS - original_cmap
    if missing_source:
        raise SystemExit(f"FirstPaint source is missing glyphs: {family}: {sorted(missing_source)}")
    options = Options()
    options.layout_features = ["*"]  # Same OpenType shaping as complete Noto.
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=FIRST_PAINT_CODEPOINTS)
    subsetter.subset(font)
    retained = set(font.getBestCmap() or {})
    if not FIRST_PAINT_CODEPOINTS.issubset(retained):
        raise SystemExit(f"FirstPaint glyph coverage regression: {family}")
    font.flavor = "woff2"
    font.save(output)
    font.close()
    size = output.stat().st_size
    full_size = (BASE / (family + ".woff2")).stat().st_size
    if not (1500 < size < full_size * 0.75):
        raise SystemExit(f"Unexpected FirstPaint asset size {family}: {size} / {full_size}")
    print(f"PASS: {family} FirstPaint {size} bytes from original TTF; {len(retained)} mappings")
