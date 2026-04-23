# ToolScan Round 6 — Pre-Launch Blind Test

Copy everything below the line and paste it into Claude chat.

---

I'm doing a final validation of an AI tool identification feature before sharing it publicly. I need 30 photos that represent what real users will actually scan — the everyday tools in a woodworker's shop. No exotic edge cases, no trick photos. Just realistic tools, realistic photos.

**Important:** These must be completely different listings from any previous round. Fresh photos only.

For each photo:
- **Single tool per photo** (critical — no multi-tool shots)
- Realistic seller-quality photos (eBay sold listings, workshop photos)
- Confirmed identification
- Mix: ~50% Good, ~30% Fair, ~20% Excellent

## Distribution (30 photos)

**Bench Planes — 6 photos (the #1 thing people will scan):**
- 1x Stanley No. 4 smoothing plane (any era)
- 1x Stanley No. 5 jack plane (any era)
- 1x Stanley No. 7 jointer
- 1x Record bench plane (any size)
- 1x Lie-Nielsen bench plane (any model)
- 1x Any bench plane in Fair/rough condition

**Block Planes — 2 photos:**
- 1x Stanley No. 60-1/2 or 9-1/2
- 1x Veritas or LN block plane

**Chisels — 3 photos:**
- 1x Single bench chisel (any maker)
- 1x Chisel set (any maker)
- 1x Japanese chisel

**Saws — 3 photos:**
- 1x Handsaw (Disston or similar)
- 1x Backsaw (dovetail or tenon, any maker)
- 1x Japanese pull saw

**Other Hand Tools — 4 photos:**
- 1x Spokeshave
- 1x Marking gauge
- 1x Combination square
- 1x Sharpening stone or diamond plate

**Power Tools — 6 photos (new category, needs validation):**
- 1x Festool anything (track saw, router, sander, or Domino)
- 1x Bandsaw (Laguna, Rikon, Grizzly, or similar)
- 1x Benchtop planer (DeWalt DW735 or similar)
- 1x Router (Bosch, Festool, or similar)
- 1x Table saw OR miter saw (any quality brand)
- 1x Any other shop machine (drill press, lathe, jointer, dust collector, etc.)

**Workholding & Sharpening — 2 photos:**
- 1x Woodworking vise
- 1x Tormek or bench grinder

**Challenging — 4 photos (realistic difficulty, not trick shots):**
- 1x Tool photographed on a messy workbench
- 1x Tool in Fair/Project condition with rust or wear
- 1x Tool where brand is partially visible or worn
- 1x Phone-quality photo (slight blur, imperfect lighting — like a real user would take)

## Sourcing

1. **eBay completed/sold listings** — main listing photo, title confirms ID
2. **r/handtools, r/woodworking** — show-and-tell posts
3. **r/tools** — for power tool photos
4. **Hyperkitten.com** — vintage hand tools

**Photo quality guidance:**
- Prefer photos that look like a real person took them — workbench backgrounds, natural lighting, slight imperfections
- Power tools should show the full machine, not just a detail shot
- For Fair/Project condition, search "as-is," "rusty," "barn find," or "estate"
- NO studio/catalog shots, NO stock photos

## Output

After listing all 30 photos, generate:

1. **Shell script** to download all photos:
```bash
#!/bin/bash
mkdir -p ~/Downloads/r6_test_photos
curl -L -o ~/Downloads/r6_test_photos/r6_filename1.jpg "URL1"
# ... etc
```
ALL filenames must start with `r6_` prefix.

2. **CSV** (`ground_truth_r6.csv`):
```
filename,url,tool_type,maker,model,era,condition,notable,why_good_test
```

Only include photos where you are CONFIDENT in the ground truth. Skip anything ambiguous.
