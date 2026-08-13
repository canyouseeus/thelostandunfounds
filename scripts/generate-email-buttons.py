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

import hashlib
import json
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

# 2x for retina. Displayed at half these numbers in the email.
SCALE = 2

# EVERY BUTTON IS THIS SIZE. Set by the owner on 2026-08-13: buttons that sized
# themselves to their label came out visibly uneven down the email. The width is
# the one the longest current label needs, and short labels centre inside it
# rather than shrinking the button.
#
# Displayed at 340x52. Do not make a button that sizes itself to its text.
WIDTH = 340 * SCALE
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
    manifest = {}

    for name, label in BUTTONS.items():
        tw = text_width(probe, label, font, TRACKING)

        # A label that cannot fit the fixed width is a design decision, not
        # something to silently squeeze. Fail loudly and shorten the label.
        if tw > WIDTH - PAD_X * 2:
            raise SystemExit(
                f"'{label}' needs {int(tw)}px but only {WIDTH - PAD_X * 2}px is available "
                f"inside the fixed {WIDTH}px button. Shorten the label."
            )

        img = Image.new("RGBA", (WIDTH, HEIGHT), BG)
        draw = ImageDraw.Draw(img)

        ascent, descent = font.getmetrics()
        y = (HEIGHT - (ascent + descent)) // 2
        x = (WIDTH - tw) / 2  # centred, so every button is the same size

        draw_tracked(draw, (x, y), label, font, FG, TRACKING)

        # Content-hashed filename, because Vercel serves everything under
        # /public with `cache-control: max-age=31536000, immutable`. Overwriting
        # a button at the same filename does NOT reach anyone who already has
        # it, and Gmail's image proxy caches harder still: a resized button kept
        # serving the old size for exactly this reason.
        #
        # Hashing means a changed button is a new URL, so it always lands.
        buf = BytesIO()
        img.save(buf, "PNG", optimize=True)
        data = buf.getvalue()
        digest = hashlib.sha256(data).hexdigest()[:8]

        filename = f"{name}.{digest}.png"
        (OUT_DIR / filename).write_bytes(data)
        manifest[name] = filename

        # Remove superseded copies of this button so the folder does not fill up
        # with every past version.
        for old in OUT_DIR.glob(f"{name}.*.png"):
            if old.name != filename:
                old.unlink()

        print(f"{filename}: {WIDTH}x{HEIGHT} (displays {WIDTH // SCALE}x{HEIGHT // SCALE}) '{label}'")


    # Consumers read this rather than hardcoding a hashed filename.
    (OUT_DIR / "buttons.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"manifest: {OUT_DIR / 'buttons.json'}")


if __name__ == "__main__":
    main()
