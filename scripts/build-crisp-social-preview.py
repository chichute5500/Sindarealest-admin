#!/usr/bin/env python3
"""Generate a genuine 1200x630 sharp OG from APPROVED, repo-owned real artwork.
The old 20261027 blue OG enlarges a tiny 480x252 JPEG. Refrain from doing that:
native text + sharp SD emblem + original full-res croc textile, same pale-blue theme.
Reproducible without any AI/raster reinterpretation of the branded emblem.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import hashlib
import math

ROOT=Path(__file__).resolve().parents[1]
PUB=ROOT/"public"
W,H=1200,630
OUTPUT=PUB/"og-sindarealest-crisp-20261028.jpg"
FONT=PUB/"fonts"
EMBLEM=PUB/"images/brand-emblem.png"
MATERIAL=PUB/"images/theme-croc-albino.webp"
assert EMBLEM.exists() and MATERIAL.exists()

def font(name,size):return ImageFont.truetype(str(FONT/name),size)
def rgba(c,a=255):return (*c,a)
def overlay_round(base,box,color,radius,outline=None,width=2):
 layer=Image.new("RGBA",(W,H),(0,0,0,0))
 d=ImageDraw.Draw(layer)
 d.rounded_rectangle(box,radius=radius,fill=color,outline=outline,width=width)
 return Image.alpha_composite(base,layer)

# Original crocodile textile, not the low-resolution 480x252 preview.
texture=Image.open(MATERIAL).convert("RGB")
assert texture.width >= 1000 and texture.height >= 550, f"DO_NOT_UPSCALE_LOW_RES_BACKGROUND: {texture.size}"
scale=max(W/texture.width,H/texture.height)
size=(round(texture.width*scale),round(texture.height*scale))
tex=texture.resize(size,Image.Resampling.LANCZOS)
left=(tex.width-W)//2;top=(tex.height-H)//2
tex=tex.crop((left,top,left+W,top+H))
# Cool-glass blue overlay, natural leather grain still visible.
glass=Image.new("RGB",(W,H))
p=glass.load()
for y in range(H):
 for x in range(W):
  t=x/W; v=y/H
  p[x,y]=(round(171+50*t+9*v),round(220+19*t+4*v),round(238+9*t))
base=Image.blend(tex,glass,0.69).convert("RGBA")
# Crisp subtle lines and light glints at real pixels.
d=ImageDraw.Draw(base,"RGBA")
d.ellipse((-345,-300,460,510),outline=(255,255,255,140),width=3)
d.ellipse((-255,-235,570,580),outline=(61,133,163,86),width=2)
d.arc((650,-420,1590,520),30,143,fill=(255,255,255,190),width=4)
d.line((0,584,W,584),fill=(39,104,130,70),width=2)
# Pale mint liquid-glass panel with separate native-asset SD identity.
base=overlay_round(base,(48,66,405,554),(239,251,252,182),42,
                   outline=(255,255,255,225),width=3)
base=overlay_round(base,(430,90,1154,543),(252,255,255,207),40,
                   outline=(255,255,255,238),width=3)
# Gold original icon: preserve transparency and aspect ratio.
emblem=Image.open(EMBLEM).convert("RGBA")
bbox=emblem.getchannel("A").getbbox()
assert bbox, "ORIGINAL_BRAND_EMBLEM_EMPTY"
emblem=emblem.crop(bbox)
target_w=230
mark=emblem.resize((target_w,round(emblem.height*target_w/emblem.width)),Image.Resampling.LANCZOS)
brand_x=round((48+405-mark.width)/2)
brand_y=112
base.alpha_composite(mark,(brand_x,brand_y))
d=ImageDraw.Draw(base)
NAVY=(19,59,77)
MID=(46,97,117)
GOLD=(164,115,48)
GOLD2=(191,146,72)
d.text((226,414),"SinDarealest",font=font("NotoSerif-Bold.ttf",34),fill=NAVY,anchor="mm")
d.text((226,454),"PREMIUM LEATHER",font=font("NotoSans-Bold.ttf",15),fill=MID,anchor="mm")
d.rounded_rectangle((157,486,295,490),radius=2,fill=GOLD2)
# Brand typography is rendered from actual font at full resolution.
x=488
d.text((x,155),"SINDAREALEST  ·  SIGNATURE",
       font=font("NotoSans-Bold.ttf",19),fill=GOLD)
d.line((x,182,1090,182),fill=(190,165,121),width=2)
d.text((x,281),"Da cá sấu thật",font=font("NotoSerif-Bold.ttf",63),fill=NAVY,anchor="lm")
d.text((x,354),"Phong cách sống thật.",font=font("NotoSerif-Regular.ttf",34),fill=MID,anchor="lm")
d.line((x,401,x+122,401),fill=GOLD2,width=5)
d.text((x,454),"GIÀY  ·  TÚI  ·  VÍ  ·  PHỤ KIỆN",font=font("NotoSans-Bold.ttf",19),fill=NAVY)
d.text((x,497),"sindarealest2.pages.dev",font=font("NotoSans-Regular.ttf",19),fill=MID)
# Bottom glass line remains visually aligned with site light-blue palette.
d.line((54,590,1146,590),fill=(255,255,255),width=2)
image=base.convert("RGB")
image.save(OUTPUT,format="JPEG",quality=95,subsampling=0,optimize=True,progressive=True)
verify=Image.open(OUTPUT)
assert verify.size==(W,H) and verify.format=="JPEG" and OUTPUT.stat().st_size>=65000
print("CRISP_OG=PASS native=1200x630 bg_source="+str(texture.size)+
 " emblem_original="+str(Image.open(EMBLEM).size)+
 " bytes="+str(OUTPUT.stat().st_size)+" sha256="+hashlib.sha256(OUTPUT.read_bytes()).hexdigest())
