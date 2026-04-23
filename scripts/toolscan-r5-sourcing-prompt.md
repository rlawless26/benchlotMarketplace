# ToolScan Round 5 — Blind Test Photo Sourcing

Copy everything below the line and paste it into Claude chat.

---

I'm validating an AI tool identification feature for a hand tool marketplace. This is round 5 of blind testing. I need 50 NEW photos — completely different listings from any previous round. The AI has never been tuned against these.

Current accuracy: 81% on blind set. Goal: 90%+.

**Known weak spots to stress-test (include extra photos for these):**
- Cabinet scrapers (Stanley No. 80 — looks like a spokeshave but blade sticks UP)
- Card scraper sets (thin flat steel shapes with a burnisher rod)
- Plow planes / combination planes (Stanley No. 45, wooden plows)
- Japanese chisels (laminated steel, hoop handles)
- Sharpening stones (stones in wooden boxes — NOT lapping plates)
- Shoulder planes (tall narrow body, blade full width)

For each photo, I need:
- A photo of a **single tool** (not group shots — this is critical, no multi-tool photos)
- Realistic seller-quality photos (eBay sold listings preferred)
- A confirmed identification
- Mix of conditions: ~60% Good, ~25% Fair, ~15% Excellent

## Distribution (50 photos total)

**Bench Planes — 6 photos:**
- 1x Stanley No. 4 (any type/era)
- 1x Stanley No. 5 (any type/era)
- 1x Stanley No. 7 or No. 8 jointer
- 1x Record bench plane
- 1x Sargent, Union, or Millers Falls bench plane
- 1x Any bench plane in Fair/Project condition

**Block & Specialty Planes — 8 photos (extra here — weak spot):**
- 1x Block plane (any maker)
- 1x Shoulder plane — MUST be a tall, narrow-bodied plane with blade full width of sole, NO tote. Not a spokeshave.
- 1x Router plane (Stanley No. 71 — wide flat base, two round knobs, blade projects downward)
- 1x Rabbet plane (Stanley No. 78 or similar)
- 1x Plow or combination plane (Stanley No. 45, or a wooden plow plane with fence and arms)
- 1x Tongue & groove / match plane (Stanley No. 48 with scroll handle, or wooden pair)
- 1x Scrub plane (short narrow body, heavily cambered iron)
- 1x Low-angle jack plane (Veritas or LN)

**Saws — 5 photos:**
- 1x Handsaw (any maker)
- 1x Dovetail saw (brass-backed, short blade)
- 1x Tenon saw (larger backsaw)
- 1x Japanese pull saw
- 1x Coping saw or bow saw

**Chisels — 6 photos (extra — weak spot):**
- 1x Bench chisel (single, bevel-edge)
- 1x Mortise chisel (THICK rectangular cross-section — clearly thicker than a bench chisel)
- 1x Paring chisel (LONG thin blade, clearly longer than a bench chisel)
- 1x Carving gouge (CURVED cutting edge, often says "Swiss Made" or Pfeil)
- 1x Japanese chisel (laminated steel, metal hoop on wooden handle, Japanese maker marks)
- 1x Chisel set (any maker)

**Marking & Measuring — 4 photos:**
- 1x Marking gauge
- 1x Combination square
- 1x Sliding T-bevel (smooth flat blade pivoting from handle — NO teeth. Often says STANLEY)
- 1x Dividers or calipers

**Sharpening — 5 photos (extra — weak spot):**
- 1x Arkansas oilstone in wooden box (rectangular stone, NOT a metal plate)
- 1x Japanese waterstone (colored synthetic block)
- 1x Diamond plate (DMT or similar — perforated metal surface)
- 1x Honing guide (Eclipse-style with roller, or Veritas)
- 1x Leather strop

**Scrapers — 4 photos (extra — weak spot):**
- 1x Card scraper (single thin flat piece of steel, rectangular. NO handle. May say "DFM" or have maker stamp)
- 1x Card scraper set (multiple thin steel shapes — rectangular, curved, gooseneck — often with a burnishing rod. These are just thin flat pieces of steel)
- 1x Cabinet scraper Stanley No. 80 (cast iron body with wing handles AND a thin blade sticking UP vertically from the top. Says "STANLEY." NOT a spokeshave — spokeshave blades are flush/recessed)
- 1x Spokeshave Stanley No. 151 (for comparison — wing handles, blade recessed in body, two adjustment screws)

**Other Tools — 7 photos:**
- 1x Drawknife (SINGLE tool photo — long blade with a handle at EACH end)
- 1x Spokeshave (round sole, for concave work)
- 1x Brace / ratchet brace (U-shaped crank)
- 1x Eggbeater hand drill
- 1x Wooden molding plane
- 1x Holdfast
- 1x Woodworking vise

**Challenging — 5 photos:**
- 1x Rusty/project grade tool (still identifiable)
- 1x Tool from unusual angle
- 1x Tool on cluttered workbench
- 1x Uncommon tool (adze, inshave, travisher, panel gauge, etc.)
- 1x Any tool in Fair condition with worn markings

## Where to source:

1. **eBay completed/sold listings** — main listing photo, title confirms ID
2. **r/handtools** — show-and-tell posts
3. **Hyperkitten.com** — vintage tool dealer

**CRITICAL photo quality rules:**
- SINGLE TOOL per photo. If the photo shows multiple tools, DO NOT use it.
- The tool must be clearly visible and identifiable
- Prefer workbench/table photos over white-background studio shots
- For card scrapers: they are thin flat pieces of steel. NOT thick plates. NO handles.
- For cabinet scraper No. 80: blade sticks UP from body. Different from spokeshave.
- For sliding T-bevel: smooth blade, NO teeth, pivots from handle body.
- For sharpening stones: rectangular stone block in wooden box. NOT a metal plate or digital device.

## Output:

After listing all 50 photos, generate:

1. **A shell script** to download all photos:
```bash
#!/bin/bash
mkdir -p ~/Downloads/r5_test_photos
curl -L -o ~/Downloads/r5_test_photos/r5_filename1.jpg "URL1"
# ... etc
```
ALL filenames must start with `r5_` prefix.

2. **A CSV** (`ground_truth_r5.csv`):
```
filename,url,tool_type,maker,model,era,condition,notable,why_good_test
```

Please find all 50 photos. Only include photos where you are CONFIDENT in the ground truth. Skip ambiguous listings.
