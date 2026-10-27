#!/usr/bin/env python3
"""Render a NEW 1200x630 social preview from the site's ORIGINAL SinDarealest logo.
Source of truth is public/logo.png, not AI-created or traced artwork.
Owner-approved older og-sindarealest.jpg remains for rollback.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math, random

ROOT=Path(__file__).resolve().parents[1]
PUB=ROOT/"public"
W,H=1200,630
NAVY=(8,30,39)
MID=(18,46,55)
CHAMPAGNE=(247,242,231)
INK=(17,39,49)
GOLD=(175,122,47)
SOFT_GOLD=(210,170,93)
RED=(140,53,40)
SAN=PUB/"fonts/NotoSans-Regular.ttf"
SAN_BOLD=PUB/"fonts/NotoSans-Bold.ttf"
SERIF=PUB/"fonts/NotoSerif-Bold.ttf"
SERIF_R=PUB/"fonts/NotoSerif-Regular.ttf"

def font(path,size):return ImageFont.truetype(str(path),size)

# Distinct new warm editorial design: dark logo plate + light product story.
canvas=Image.new("RGB",(W,H),CHAMPAGNE)
px=canvas.load()
for y in range(H):
    for x in range(W):
        # soft diagonal satin paper wash, intentionally unlike old black-leather OG
        t=x/W
        paper=(round(247-9*t+2*y/H),round(243-11*t+2*y/H),round(234-17*t+2*y/H))
        px[x,y]=paper

bg=Image.new("RGB",(500,H),NAVY)
a=ImageDraw.Draw(bg)
for y in range(H):
    t=y/H
    a.line((0,y,500,y),fill=(round(6+12*t),round(24+13*t),round(33+16*t)),width=1)
a.ellipse((-220,-190,360,390),outline=(36,66,68),width=2)
a.ellipse((-170,-130,420,450),outline=(32,57,61),width=2)
a.ellipse((-110,-70,480,510),outline=(25,51,56),width=2)
a.arc((-275,90,610,960),260,330,fill=(63,82,73),width=3)
for i in range(10):
    x0=-200+i*75
    a.line((x0,0,x0+425,H),fill=(17,43,47),width=1)
canvas.paste(bg,(0,0))
d=ImageDraw.Draw(canvas)
# Fine gilded composition lines and small ornamental corners.
d.line((498,0,498,H),fill=SOFT_GOLD,width=3)
d.line((31,31,468,31),fill=(108,86,49),width=2)
d.line((31,H-31,468,H-31),fill=(108,86,49),width=2)
d.line((31,31,31,90),fill=SOFT_GOLD,width=3)
d.line((31,H-90,31,H-31),fill=SOFT_GOLD,width=3)
d.line((468,31,468,90),fill=SOFT_GOLD,width=3)
d.line((468,H-90,468,H-31),fill=SOFT_GOLD,width=3)

# Exact original logo with transparency preserved. Never redraw.
logo=Image.open(PUB/"logo.png").convert("RGBA")
alpha=logo.getchannel("A")
bbox=alpha.getbbox()
if not bbox: raise RuntimeError("Official logo has no alpha content")
logo=logo.crop(bbox)
target=(390,390)
scale=min(target[0]/logo.width,target[1]/logo.height)
mark=logo.resize((round(logo.width*scale),round(logo.height*scale)),Image.Resampling.LANCZOS)
where=((500-mark.width)//2, (630-mark.height)//2-8)
canvas.paste(mark,where,mark)

# Gold brand signature above and below, styled differently from old OG.
d=ImageDraw.Draw(canvas)
d.text((250,88),"SINDAREALEST",font=font(SAN_BOLD,16),fill=(203,166,95),anchor="mm",stroke_width=0)
d.text((250,554),"PREMIUM CROCODILE LEATHER",font=font(SAN,16),fill=(205,177,116),anchor="mm")

# Ivory premium product-title panel, display-optimized for Zalo small previews.
x=548
d.rounded_rectangle((x,76,x+75,81),radius=2,fill=RED)
d.text((x,119),"SINDAREALEST  /  SIGNATURE",font=font(SAN_BOLD,18),fill=GOLD)
d.line((x,166,1152,166),fill=(201,176,129),width=2)
d.text((x,223),"DA CÁ SẤU",font=font(SERIF,54),fill=INK)
d.text((x,300),"THẬT.",font=font(SERIF,63),fill=RED)
d.line((x,367,x+86,367),fill=GOLD,width=4)
d.text((x,417),"Phong cách sống thật.",font=font(SERIF_R,32),fill=INK)
d.text((x,502),"GIÀY  ·  TÚI  ·  VÍ  ·  PHỤ KIỆN",font=font(SAN_BOLD,19),fill=(82,86,78))
d.line((x,551,1152,551),fill=(206,185,148),width=2)
d.text((x,582),"sindarealest2.pages.dev",font=font(SAN,18),fill=(93,91,84))
# small gold seal with exact emblem, visually reinforces house motif
emblem=Image.open(PUB/"images/brand-emblem.png").convert("RGBA")
emblem.thumbnail((58,58),Image.Resampling.LANCZOS)
canvas.paste(emblem,(1136-emblem.width,570-emblem.height//2),emblem)
out=PUB/"og-sindarealest-20261027.jpg"
canvas.save(out,quality=93,subsampling=0,optimize=True,progressive=True)
verify=Image.open(out)
assert verify.size==(1200,630) and verify.mode=="RGB"
print(f"NEW_OFFICIAL_OG=PASS path={out.relative_to(ROOT)} size={verify.size} bytes={out.stat().st_size}; original=logo.png; original old OG preserved")
