"""Losslessly repackage existing Noto fonts as WOFF2 for Storefront.
No glyph edits, subsetting, font family changes or network requests.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
base=Path("public/fonts")
fonts=("NotoSans-Regular","NotoSans-Bold","NotoSerif-Regular","NotoSerif-Bold")
for family in fonts:
    src=base/(family+".ttf")
    out=base/(family+".woff2")
    if not src.is_file():
        raise SystemExit("Missing source font "+str(src))
    font=TTFont(src,recalcBBoxes=False,recalcTimestamp=False)
    font.flavor="woff2"
    font.save(out)
    font.close()
    ratio=out.stat().st_size/src.stat().st_size
    if ratio>=0.8 or out.stat().st_size<10_000:
        raise SystemExit("Refusing unexpectedly large/invalid Web font: "+family)
    print(f"PASS: {family}: {src.stat().st_size} -> {out.stat().st_size} bytes; glyphs unchanged")
