#!/usr/bin/env python3
"""Produce browser/favicon image sizes from the actual SinDarealest emblem.
Source-of-truth: public/images/brand-emblem.png, NEVER a generated replacement.
Only icon sizes are produced. Existing owner-approved OG 1200x630 remains intact.
"""
from pathlib import Path
from PIL import Image
import io

PUBLIC = Path(__file__).resolve().parents[1] / "public"
emblem = Image.open(PUBLIC / "images/brand-emblem.png").convert("RGBA")
bounds = emblem.getchannel("A").getbbox()
if not bounds:
    raise RuntimeError("Missing visible official SinDarealest brand emblem")
emblem = emblem.crop(bounds)
background = (6, 21, 34, 255)  # Matches the site's approved dark palette.

def icon(px):
    canvas = Image.new("RGBA", (px,px), background)
    # Compose with a generous high-resolution source and then downsample once.
    large = px*4
    work = Image.new("RGBA", (large,large),background)
    scale = min((large*.90)/emblem.width, (large*.90)/emblem.height)
    mark = emblem.resize((max(1,round(emblem.width*scale)),max(1,round(emblem.height*scale))),Image.Resampling.LANCZOS)
    work.alpha_composite(mark,((large-mark.width)//2,(large-mark.height)//2))
    return work.resize((px,px),Image.Resampling.LANCZOS)

for px in [16,32,48]:
    icon(px).save(PUBLIC/f"favicon-{px}x{px}.png",optimize=True)
icon(180).save(PUBLIC/"apple-touch-icon.png",optimize=True)
for px in [192,512]:
    icon(px).save(PUBLIC/f"android-chrome-{px}x{px}.png",optimize=True)
icon(64).save(PUBLIC/"favicon.ico",format="ICO",sizes=[(16,16),(32,32),(48,48),(64,64)])
print("OFFICIAL_FAVICONS=OK source=images/brand-emblem.png sizes=16,32,48,64,180,192,512")
