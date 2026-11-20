"""Generate every app + website image from assets/source/icon-original.png.

The original artwork is a 500 px PNG with a white margin baked in around a
rounded square, which is wrong for both stores (iOS wants a full-bleed opaque
1024 px icon; Android adaptive icons need a transparent foreground inside the
66% safe zone). This script extracts the cream glyph, then rebuilds each
variant from it.

Run:  python scripts/generate-icons.py
Needs: Pillow, numpy
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source" / "icon-original.png"
OUT = ROOT / "assets" / "images"
WEB = ROOT / "website" / "assets" / "img"

BRAND_TOP = (238, 112, 70)
BRAND_BOTTOM = (200, 70, 52)
GLYPH = (253, 247, 236)
APP_BG = (7, 8, 11)


def extract_glyph() -> Image.Image:
    """Return the glyph as an 'L' alpha mask cropped to its bounding box."""
    im = np.asarray(Image.open(SRC).convert("RGBA")).astype(np.float32)
    # Square sits at 55..444; stay inside it so the white margin never leaks in.
    inner = im[62:438, 62:438]
    g = inner[..., 1]
    # Background green channel is 75-112; glyph is ~246. Linear ramp in between
    # keeps the anti-aliased edge.
    alpha = np.clip((g - 135.0) / (235.0 - 135.0), 0.0, 1.0)
    mask = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    return mask.crop(mask.getbbox())


def upscale_mask(mask: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Lanczos upscale, then re-sharpen the edge so it doesn't look blurry."""
    big = mask.resize(size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
    a = np.asarray(big).astype(np.float32) / 255.0
    a = np.clip((a - 0.5) * 2.2 + 0.5, 0.0, 1.0)
    return Image.fromarray((a * 255).astype(np.uint8), "L")


def fit(mask: Image.Image, box: int) -> Image.Image:
    w, h = mask.size
    scale = box / max(w, h)
    return upscale_mask(mask, (max(1, round(w * scale)), max(1, round(h * scale))))


def gradient(size: int) -> Image.Image:
    top = np.array(BRAND_TOP, np.float32)
    bottom = np.array(BRAND_BOTTOM, np.float32)
    t = np.linspace(0, 1, size, dtype=np.float32)[:, None, None]
    rows = top * (1 - t) + bottom * t
    arr = np.repeat(rows, size, axis=1).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def paste_center(canvas: Image.Image, glyph_mask: Image.Image, color, dy: float = 0.0):
    layer = Image.new("RGBA", glyph_mask.size, color + (255,))
    layer.putalpha(glyph_mask)
    x = (canvas.width - glyph_mask.width) // 2
    y = (canvas.height - glyph_mask.height) // 2 + round(dy * canvas.height)
    canvas.alpha_composite(layer, (x, y)) if canvas.mode == "RGBA" else canvas.paste(layer, (x, y), layer)


def rounded_brand_tile(size: int, glyph_ratio: float = 0.72) -> Image.Image:
    """Brand gradient squircle on transparent background (logos, splash)."""
    tile = gradient(size).convert("RGBA")
    m = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=int(size * 4 * 0.23), fill=255)
    tile.putalpha(m.resize((size, size), Image.LANCZOS))
    paste_center(tile, fit(GLYPH_MASK, int(size * glyph_ratio)), GLYPH)
    return tile


GLYPH_MASK = extract_glyph()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    WEB.mkdir(parents=True, exist_ok=True)

    # iOS / store icon: full-bleed, opaque, no alpha channel.
    icon = gradient(1024)
    paste_center(icon, fit(GLYPH_MASK, 700), GLYPH)
    icon.save(OUT / "icon.png", optimize=True)

    # Android adaptive: transparent foreground in the safe zone + gradient background.
    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    paste_center(fg, fit(GLYPH_MASK, 560), GLYPH)
    fg.save(OUT / "adaptive-icon.png", optimize=True)
    gradient(1024).save(OUT / "adaptive-icon-background.png", optimize=True)

    mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    paste_center(mono, fit(GLYPH_MASK, 560), (255, 255, 255))
    mono.save(OUT / "monochrome-icon.png", optimize=True)

    # Android notification small icon: white silhouette on transparent.
    notif = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    paste_center(notif, fit(GLYPH_MASK, 80), (255, 255, 255))
    notif.save(OUT / "notification-icon.png", optimize=True)

    rounded_brand_tile(512).save(OUT / "splash-icon.png", optimize=True)
    rounded_brand_tile(128).save(OUT / "logo.png", optimize=True)

    fav = rounded_brand_tile(48)
    fav.save(OUT / "favicon.png", optimize=True)

    # Website images.
    for s in (180, 64, 32):
        rounded_brand_tile(s).save(WEB / f"icon-{s}.png", optimize=True)
    og = Image.new("RGB", (1200, 630), APP_BG)
    glow = gradient(630).resize((1200, 630)).filter(ImageFilter.GaussianBlur(2))
    og = Image.blend(og, glow, 0.18)
    og_rgba = og.convert("RGBA")
    tile = rounded_brand_tile(300)
    og_rgba.alpha_composite(tile, (450, 165))
    og_rgba.convert("RGB").save(WEB / "og-image.jpg", quality=86)

    for p in sorted(OUT.glob("*.png")):
        print(p.name, Image.open(p).size, Image.open(p).mode)


if __name__ == "__main__":
    main()
