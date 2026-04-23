# ToolScan Blind Test Set — Photo Sourcing Prompt

Copy everything below the line and paste it into Claude chat.

---

I'm validating an AI tool identification feature for a hand tool marketplace called Benchlot. I need a BLIND test set of ~50 photos — tools my AI has never been tuned against — to measure real-world accuracy. The goal is 90%+ correct identification on tools a real customer would photograph.

**Important: These must be DIFFERENT tools/listings than previous rounds.** Do not reuse any eBay listing URLs. Source fresh photos.

For each photo, I need:
- A photo of a **single tool** (not group shots)
- Realistic seller-quality photos (eBay listings, forum posts — not catalog/stock photos)
- A confirmed identification: tool type, maker, model, approximate era
- Mix of conditions: ~60% Good/Very Good, ~25% Fair, ~15% Excellent/Like New

## Distribution (50 photos total)

**Bench Planes — 8 photos:**
- 2x Stanley No. 4 smoothing plane (different types/eras from each other)
- 2x Stanley No. 5 jack plane (different conditions)
- 1x Stanley No. 7 or No. 8 jointer
- 1x Record bench plane (any size)
- 1x Lie-Nielsen or Veritas bench plane
- 1x Unknown/obscure maker bench plane (Sargent, Union, Millers Falls, or unbranded)

**Block & Specialty Planes — 6 photos:**
- 1x Stanley No. 60-1/2 or No. 9-1/2 block plane
- 1x Veritas or LN block plane
- 1x Shoulder plane (any maker)
- 1x Router plane (Stanley No. 71 or similar)
- 1x Rabbet plane (Stanley No. 78 or similar)
- 1x Plow/combination plane (Stanley No. 45, wooden plow, or similar)

**Saws — 6 photos:**
- 1x Disston or vintage American handsaw
- 1x Non-Disston handsaw (Atkins, Simonds, or unknown maker)
- 1x Dovetail saw (any maker — brass-backed, short blade)
- 1x Tenon saw (larger backsaw, 12-14" blade)
- 1x Japanese pull saw (ryoba or dozuki)
- 1x Coping saw or fret saw

**Chisels — 6 photos:**
- 1x Single bench chisel (bevel-edge, any maker)
- 1x Mortise chisel (thick, rectangular cross-section)
- 1x Chisel set (any maker, any condition)
- 1x Japanese chisel (oire nomi)
- 1x Carving gouge (single)
- 1x Paring chisel (long, thin blade)

**Marking & Measuring — 5 photos:**
- 1x Marking gauge (wooden or metal, any maker)
- 1x Combination square (any maker)
- 1x Sliding T-bevel (Stanley or similar — smooth blade, NO teeth, pivots from handle)
- 1x Marking knife
- 1x Dividers or calipers

**Sharpening — 4 photos:**
- 1x Sharpening stone (oilstone, waterstone, or Arkansas stone)
- 1x Diamond plate (DMT or similar)
- 1x Honing guide (Eclipse-style or Veritas)
- 1x Leather strop

**Other Hand Tools — 8 photos:**
- 1x Spokeshave (Stanley No. 151 or similar — wing handles)
- 1x Drawknife
- 1x Card scraper (just a thin flat piece of steel, rectangular or curved — NO handle)
- 1x Card scraper set (multiple thin steel shapes with a burnishing rod)
- 1x Brace / hand drill (U-shaped crank)
- 1x Wooden molding plane
- 1x Tongue & groove / match plane (Stanley No. 48 with scroll handle, or wooden pair)
- 1x Hand adze OR cabinet scraper (Stanley No. 80 — scraper in a cast-iron body with handles, looks like a spokeshave)

**Workholding — 3 photos:**
- 1x Woodworking vise (Record, Yost, or similar)
- 1x Holdfast (L-shaped iron bar)
- 1x Clamp (handscrew, bar clamp, or pipe clamp)

**Challenging / Edge Cases — 4 photos:**
- 1x Heavily rusty/project-grade tool (any type — should still be identifiable)
- 1x Tool photographed from an unusual angle or in poor lighting
- 1x Tool on a cluttered workbench with distracting background
- 1x Uncommon or unusual tool that tests the limits (scrub plane, cabinet maker's plane, eggbeater drill, bow saw, etc.)

## Where to source:

1. **eBay completed/sold listings** — Search for the specific tool, filter to "Sold." Use the main listing photo. The listing title confirms the ID.
2. **r/handtools** — Show-and-tell posts where the owner names the tool
3. **Hyperkitten.com** — Vintage tool dealer with well-identified inventory
4. **LumberJocks / Sawmill Creek forums** — Tool identification threads with confirmed answers

**Tips for realistic photos:**
- Prefer photos taken on workbenches, tables, or in workshops — not white-background studio shots
- Include some with imperfect lighting, slight blur, or busy backgrounds
- For "Fair" condition tools, search eBay for "as-is," "rusty," "barn find," or "project"
- For card scrapers specifically: they look like thin flat rectangles of blue/gray steel, often with maker text stamped on them. They are NOT thick plates and have NO handles.

## Output format:

For each photo:
```
Filename: [descriptive_name.jpg — e.g., stanley_no4_type19_blue.jpg]
Source URL: [direct image URL to download]
Ground truth:
  - Tool type: [e.g., Smoothing Plane]
  - Maker: [e.g., Stanley]
  - Model: [e.g., No. 4]
  - Era: [e.g., 1948-1961 (Type 19)]
  - Condition: [Excellent / Good / Fair / Project]
  - Notable: [key features, why you're confident in the ID]
Why this is a good test case: [what makes this photo realistic/challenging]
```

Please find all 50 photos. Prioritize ACCURACY of identification over speed — only include photos where you are confident in the ground truth. If a listing title is ambiguous or the photo is unclear, skip it and find a better one.

## IMPORTANT: Download Script + CSV

After listing all 50 photos, generate TWO things:

1. **A shell script** I can run on macOS to download all photos to `~/Downloads/blind_test_photos/`:
```bash
#!/bin/bash
mkdir -p ~/Downloads/blind_test_photos
curl -L -o ~/Downloads/blind_test_photos/filename1.jpg "URL1"
curl -L -o ~/Downloads/blind_test_photos/filename2.jpg "URL2"
# ... etc for all 50
```

2. **A CSV file** (`ground_truth_blind.csv`) with these columns that I can paste into a file:
```
filename,url,tool_type,maker,model,era,condition,notable,why_good_test
```

I will run the download script, then move the photos and CSV into my project repo for evaluation.
