#!/usr/bin/env python3
"""
Generate the email call-to-action buttons as PNGs.

Why images: Gmail's dark-mode conversion is not a true invert. It maps colours
onto a curve, so a pure white button lands on roughly #2b2b2b, never on pure
black. The banner is a PNG and Gmail never repaints images, so it stays true
#000000. Side by side, the two blacks visibly disagree.

Rendering the button as an image puts it on the same footing as the banner:
both are images, both keep their real colour in every client and every mode.

The tradeoff is image blocking. Every button therefore carries alt text and a
styled fallback background, so a blocked image still shows a readable, clickable
label rather than a gap.

Run: python3 scripts/generate-email-buttons.py
Output: public/brand/btn-*.png
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# 2x for retina. Displayed at half these numbers in the email.
SCALE = 2
HEIGHT = 52 * SCALE
PAD_X = 28 * SCALE
FONT_SIZE = 14 * SCALE
TRACKING = 2 * SCALE  # letter-spacing, matching the banner's wide type

BG = (0, 0, 0, 255)        # same black as the banner PNG
FG = (255, 255, 255, 255)

FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

BUTTONS = {
    "btn-affiliate": "JOIN THE AFFILIATE PROGRAM",
    "btn-services": "SEE THE SERVICES",
    "btn-chip-in": "CHIP IN",
}

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "brand"


def text_width(draw, text, font, tracking):
    """Width including per-character tracking, which PIL does not do natively."""
    total = 0
    for ch in text:
        total += draw.textlength(ch, font=font) + tracking
    return total - tracking if text else 0


def draw_tracked(draw, xy, text, font, fill, tracking):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking


def main():
    font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))

    for name, label in BUTTONS.items():
        w = int(text_width(probe, label, font, TRACKING)) + PAD_X * 2
        img = Image.new("RGBA", (w, HEIGHT), BG)
        draw = ImageDraw.Draw(img)

        ascent, descent = font.getmetrics()
        y = (HEIGHT - (ascent + descent)) // 2
        draw_tracked(draw, (PAD_X, y), label, font, FG, TRACKING)

        path = OUT_DIR / f"{name}.png"
        img.save(path, "PNG", optimize=True)
        print(f"{path.name}: {w}x{HEIGHT} (displays {w // SCALE}x{HEIGHT // SCALE}) '{label}'")


if __name__ == "__main__":
    main()
