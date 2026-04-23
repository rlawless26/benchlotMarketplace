"""Generate Instagram ad creatives for the Founding Sellers campaign."""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from pathlib import Path

ROOT = Path("/Users/robertlawless/Documents/benchlot")
HERE = Path(__file__).parent
PETRONA = ROOT / "brand/profile-pictures/Petrona-Bold.ttf"
OUTFIT = HERE / "Outfit.ttf"
HERO_PHOTO = ROOT / "public/images/shop_tools_bg.jpg"

# Codebase-canonical palette (tailwind.config.js / CLAUDE.md)
SPRUCE = (26, 48, 48)        # #1a3030
SPRUCE_DEEP = (14, 32, 32)   # #0e2020
BONE = (242, 240, 235)       # #f2f0eb
BONE_SOFT = (216, 213, 202)  # ~80% bone for subheads over photo
HONEY = (212, 170, 96)       # #d4aa60
DARK_TEAL = (12, 28, 30)     # #0c1c1e


def load_font(path: Path, size: int, weight: int | None = None) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(path), size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def text_w(draw: ImageDraw.ImageDraw, s: str, font) -> int:
    l, _, r, _ = draw.textbbox((0, 0), s, font=font)
    return r - l


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if text_w(draw, trial, font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_wrapped(draw, lines, font, xy, fill, line_spacing=1.08):
    x, y = xy
    ascent, descent = font.getmetrics()
    line_h = int((ascent + descent) * line_spacing)
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        y += line_h
    return y


def pill_button(draw, xy, size, text, font, bg=HONEY, fg=DARK_TEAL, pad_x=44, pad_y=22):
    """Draw a rounded-rect CTA button centered at xy (anchor = top-left at xy)."""
    x, y = xy
    tw = text_w(draw, text, font)
    ascent, descent = font.getmetrics()
    th = ascent  # visual cap height-ish
    w = tw + pad_x * 2
    h = th + pad_y * 2
    radius = h // 2
    draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=bg)
    # center text
    tx = x + (w - tw) // 2
    ty = y + (h - (ascent + descent)) // 2 - 2
    draw.text((tx, ty), text, font=font, fill=fg)
    return w, h


def photo_bg(size: tuple[int, int], darken: float = 0.48) -> Image.Image:
    """Load hero photo, center-crop to size, darken for text legibility."""
    src = Image.open(HERO_PHOTO).convert("RGB")
    tw, th = size
    sw, sh = src.size
    src_ratio = sw / sh
    tgt_ratio = tw / th
    if src_ratio > tgt_ratio:
        # too wide — fit height
        new_h = th
        new_w = int(sw * th / sh)
    else:
        new_w = tw
        new_h = int(sh * tw / sw)
    resized = src.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - tw) // 2
    top = (new_h - th) // 2
    cropped = resized.crop((left, top, left + tw, top + th))
    # darken with a spruce-tinted overlay for warmth
    overlay = Image.new("RGB", (tw, th), SPRUCE_DEEP)
    darkened = Image.blend(cropped, overlay, darken)
    # slight desaturate so honey accents pop
    darkened = ImageEnhance.Color(darkened).enhance(0.85)
    return darkened


def wordmark(draw, xy, size=40, color=BONE):
    font = load_font(PETRONA, size, weight=900)
    # slight negative tracking — approximate by drawing with a tight offset
    x, y = xy
    draw.text((x, y), "Benchlot", font=font, fill=color)


def honey_rule(draw, xy, width, thickness=6):
    x, y = xy
    draw.rectangle([x, y, x + width, y + thickness], fill=HONEY)


# ---------- Creative 1: Feed 1:1 with hero photo ----------
def feed_photo(out_name: str):
    W, H = 1080, 1080
    img = photo_bg((W, H), darken=0.55)
    draw = ImageDraw.Draw(img)

    margin = 64

    # Wordmark top-left
    wordmark(draw, (margin, margin), size=40)

    # Urgency tag top-right
    tag_font = load_font(OUTFIT, 22, weight=600)
    tag_text = "50 FOUNDING SELLERS"
    tw = text_w(draw, tag_text, tag_font)
    tag_pad_x, tag_pad_y = 16, 9
    tag_x2 = W - margin
    tag_x1 = tag_x2 - (tw + tag_pad_x * 2)
    tag_y1 = margin
    tag_y2 = tag_y1 + 40
    draw.rounded_rectangle([tag_x1, tag_y1, tag_x2, tag_y2], radius=20, outline=HONEY, width=2)
    draw.text((tag_x1 + tag_pad_x, tag_y1 + tag_pad_y - 2), tag_text, font=tag_font, fill=HONEY)

    # Headline — scaled for square
    head_font = load_font(PETRONA, 88, weight=800)
    head_text = "Your tools deserve a better next home."
    head_lines = wrap(draw, head_text, head_font, W - margin * 2)

    sub_font = load_font(OUTFIT, 28, weight=400)
    sub_text = "The curated marketplace for quality hand tools. 0% fees for founding sellers."
    sub_lines = wrap(draw, sub_text, sub_font, W - margin * 2)

    ascent_s, desc_s = sub_font.getmetrics()
    sub_line_h = int((ascent_s + desc_s) * 1.25)

    cta_font = load_font(OUTFIT, 28, weight=700)
    cta_text = "Become a Founding Seller →"
    cta_pad_x, cta_pad_y = 36, 18
    cta_h = cta_font.getmetrics()[0] + cta_pad_y * 2

    # Stack from bottom
    cta_y = H - margin - cta_h
    sub_y = cta_y - 44 - len(sub_lines) * sub_line_h
    ascent_h, desc_h = head_font.getmetrics()
    head_line_h = int((ascent_h + desc_h) * 1.02)
    head_y = sub_y - 24 - len(head_lines) * head_line_h

    honey_rule(draw, (margin, head_y - 28), width=80, thickness=5)
    draw_wrapped(draw, head_lines, head_font, (margin, head_y), fill=BONE, line_spacing=1.02)
    draw_wrapped(draw, sub_lines, sub_font, (margin, sub_y), fill=BONE_SOFT, line_spacing=1.25)
    pill_button(draw, (margin, cta_y), None, cta_text, cta_font, pad_x=cta_pad_x, pad_y=cta_pad_y)

    path = HERE / out_name
    img.save(path, "JPEG", quality=90, optimize=True, progressive=True)
    return path


# ---------- Creative 2: Feed 1:1 typographic ----------
def feed_type(out_name: str):
    W, H = 1080, 1080
    img = Image.new("RGB", (W, H), SPRUCE)
    draw = ImageDraw.Draw(img)
    margin = 72

    # Giant B monogram faded in background, bottom-right
    mono_font = load_font(PETRONA, 1100, weight=800)
    mono_text = "B"
    mono_bbox = draw.textbbox((0, 0), mono_text, font=mono_font)
    mono_w = mono_bbox[2] - mono_bbox[0]
    mono_h = mono_bbox[3] - mono_bbox[1]
    mono_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mono_draw = ImageDraw.Draw(mono_layer)
    mono_x = W - mono_w + 100 - mono_bbox[0]
    mono_y = H - mono_h + 140 - mono_bbox[1]
    mono_draw.text((mono_x, mono_y), mono_text, font=mono_font, fill=(242, 240, 235, 28))
    img = Image.alpha_composite(img.convert("RGBA"), mono_layer).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Wordmark top
    wordmark(draw, (margin, margin), size=40)

    # Honey rule
    honey_rule(draw, (margin, margin + 88), width=80, thickness=5)

    # Eyebrow
    eb_font = load_font(OUTFIT, 24, weight=600)
    eb_text = "FOUNDING SELLERS — 50 SPOTS"
    draw.text((margin, margin + 112), eb_text, font=eb_font, fill=HONEY)

    # Headline
    head_font = load_font(PETRONA, 100, weight=800)
    head_text = "Your tools deserve a better next home."
    head_lines = wrap(draw, head_text, head_font, W - margin * 2)
    head_y = margin + 180
    end_y = draw_wrapped(draw, head_lines, head_font, (margin, head_y), fill=BONE, line_spacing=0.98)

    # Subhead
    sub_font = load_font(OUTFIT, 28, weight=400)
    sub_text = "A curated marketplace for quality hand tools — built by a woodworker, for woodworkers. 0% fees on your first 3 listings."
    sub_lines = wrap(draw, sub_text, sub_font, W - margin * 2)
    sub_y = end_y + 24
    draw_wrapped(draw, sub_lines, sub_font, (margin, sub_y), fill=BONE_SOFT, line_spacing=1.3)

    # CTA pinned to bottom
    cta_font = load_font(OUTFIT, 28, weight=700)
    cta_text = "Become a Founding Seller →"
    cta_pad_x, cta_pad_y = 36, 18
    cta_h = cta_font.getmetrics()[0] + cta_pad_y * 2
    cta_y = H - margin - cta_h
    pill_button(draw, (margin, cta_y), None, cta_text, cta_font, pad_x=cta_pad_x, pad_y=cta_pad_y)

    # URL hint
    url_font = load_font(OUTFIT, 20, weight=500)
    draw.text((margin, cta_y - 36), "benchlot.com/founding-sellers", font=url_font, fill=BONE_SOFT)

    path = HERE / out_name
    img.save(path, "JPEG", quality=92, optimize=True, progressive=True)
    return path


# ---------- Creative 3: Stories/Reels 9:16 photo ----------
def story_photo(out_name: str):
    W, H = 1080, 1920
    img = photo_bg((W, H), darken=0.52)
    draw = ImageDraw.Draw(img)

    margin = 84
    # Leave safe zone: top 250px (profile overlay), bottom 350px (caption/CTA overlay)
    safe_top = 280
    safe_bottom = H - 360

    # Wordmark
    wordmark(draw, (margin, safe_top - 140), size=48)

    # Eyebrow
    eb_font = load_font(OUTFIT, 28, weight=600)
    draw.text((margin, safe_top - 74), "FOUNDING SELLERS — 50 SPOTS", font=eb_font, fill=HONEY)

    # Headline
    head_font = load_font(PETRONA, 120, weight=800)
    head_text = "Your tools deserve a better next home."
    head_lines = wrap(draw, head_text, head_font, W - margin * 2)
    head_y = safe_top
    end_y = draw_wrapped(draw, head_lines, head_font, (margin, head_y), fill=BONE, line_spacing=1.0)

    # Honey rule
    honey_rule(draw, (margin, end_y + 36), width=96, thickness=6)

    # Subhead
    sub_font = load_font(OUTFIT, 36, weight=400)
    sub_text = "Benchlot is the curated marketplace for quality hand tools. 0% fees on your first 3 listings."
    sub_lines = wrap(draw, sub_text, sub_font, W - margin * 2)
    sub_y = end_y + 86
    draw_wrapped(draw, sub_lines, sub_font, (margin, sub_y), fill=BONE_SOFT, line_spacing=1.28)

    # CTA inside safe bottom zone
    cta_font = load_font(OUTFIT, 34, weight=700)
    cta_text = "Become a Founding Seller →"
    cta_pad_x, cta_pad_y = 48, 26
    cta_w = text_w(draw, cta_text, cta_font) + cta_pad_x * 2
    cta_h = cta_font.getmetrics()[0] + cta_pad_y * 2
    cta_y = safe_bottom - cta_h
    pill_button(draw, (margin, cta_y), None, cta_text, cta_font, pad_x=cta_pad_x, pad_y=cta_pad_y)

    path = HERE / out_name
    img.save(path, "JPEG", quality=90, optimize=True, progressive=True)
    return path


if __name__ == "__main__":
    outputs = [
        feed_photo("ad-feed-photo-1080x1080.jpg"),
        feed_type("ad-feed-type-1080x1080.jpg"),
        story_photo("ad-story-photo-1080x1920.jpg"),
    ]
    for p in outputs:
        print(f"wrote {p.name} ({p.stat().st_size:,} bytes)")
