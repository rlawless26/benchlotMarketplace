from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

HERE = Path(__file__).parent
FONT_PATH = HERE / "Petrona-Bold.ttf"

SPRUCE = (45, 74, 62)       # #2D4A3E
BONE = (245, 240, 232)      # #F5F0E8

MASTER_SIZE = 1024
LETTER = "B"
# Target letter height ≈ 56% of frame (within the 50–60% guidance)
TARGET_HEIGHT_RATIO = 0.56
FONT_WEIGHT = 700  # Bold — reads confident at small sizes

def load_font(px_size: int) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(FONT_PATH), px_size)
    try:
        font.set_variation_by_axes([FONT_WEIGHT])
    except Exception:
        pass
    return font

def fit_font_for_height(canvas: int, target_h: float) -> ImageFont.FreeTypeFont:
    # Binary-search a font size so the glyph's actual bounding-box height ≈ target.
    lo, hi = 10, canvas * 2
    best = load_font(lo)
    for _ in range(40):
        mid = (lo + hi) // 2
        if mid == lo:
            break
        f = load_font(mid)
        bbox = f.getbbox(LETTER)
        h = bbox[3] - bbox[1]
        if h < target_h:
            lo = mid
            best = f
        else:
            hi = mid
    return best

def render_master() -> Image.Image:
    img = Image.new("RGB", (MASTER_SIZE, MASTER_SIZE), SPRUCE)
    draw = ImageDraw.Draw(img)
    target_h = MASTER_SIZE * TARGET_HEIGHT_RATIO
    font = fit_font_for_height(MASTER_SIZE, target_h)
    bbox = font.getbbox(LETTER)  # (l, t, r, b) — tight to glyph ink
    glyph_w = bbox[2] - bbox[0]
    glyph_h = bbox[3] - bbox[1]
    # Optical centering: place the glyph's ink box dead center, then nudge up ~1.5%
    # of the frame so the serif-heavy base doesn't make it feel bottom-heavy.
    x = (MASTER_SIZE - glyph_w) / 2 - bbox[0]
    y = (MASTER_SIZE - glyph_h) / 2 - bbox[1] - MASTER_SIZE * 0.015
    draw.text((x, y), LETTER, font=font, fill=BONE)
    return img

def export(master: Image.Image, size: int, name: str) -> Path:
    out = master if size == MASTER_SIZE else master.resize((size, size), Image.LANCZOS)
    path = HERE / name
    out.save(path, "PNG", optimize=True)
    return path

def main():
    master = render_master()
    paths = [
        export(master, 1024, "benchlot-profile-master-1024.png"),
        export(master, 360,  "benchlot-profile-fb-360.png"),
        export(master, 320,  "benchlot-profile-ig-320.png"),
    ]
    for p in paths:
        print(f"wrote {p.name} ({p.stat().st_size:,} bytes)")

if __name__ == "__main__":
    main()
