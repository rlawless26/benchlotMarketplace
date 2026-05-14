# Stanley bench plane reference content — drafts

Prose for the per-(model, type) reference pages at `/planes/stanley/{model}/type-{N}`.
Layout is per Claude Design's mockup: lead paragraph (italic), "How to identify" (bullets),
"Common misidentifications" (short paragraph), sidebar pulls from existing data tables.

Content drafted 2026-05-14, design-independent. Once layout lands, port into
`src/data/stanleyBenchPlanes.js` as additional fields on `STANLEY_BENCH_PLANE_TYPES`.

Source: Patrick Leach's Blood & Gore consensus, distilled. Wherever a feature
is described, the goal is a *visual marker* a buyer can see in a photo — not
abstract era prose.

---

## Type 11 (1910–1918) — Classic

### Lead
The Type 11 is what most people mean when they say "vintage Stanley." Rosewood handles, three patent dates cast into the bed, the lateral lever stamped clean. Classic-era proportions, before the company started cutting corners.

### How to identify
- **"STANLEY"** stamped clean on the lateral adjustment lever
- **Three patent dates** cast into the bed behind the frog: `MAR-25-02`, `AUG-19-02`, `APR-19-10`
- **Hard rubber depth adjuster nut** (later types switched to painted metal)
- **Rosewood tote and knob** (low knob — the high-knob redesign comes later)
- **Pre-Sweetheart cutter** — older Stanley markings, no SW cartouche
- **Frog receiver** is a solid casting with a small forward arc — no rib through the middle

### Common misidentifications
Without seeing the frog area, Types 9, 10, 12, and 13 all look similar. The forward-arc receiver is the cleanest tell once you've seen it twice — Types 9–15 share it, and the cast rib appears on Type 16 onward. From Type 13 onward, the SW cartouche on the cutter is the easiest single marker; if it's there, it's not a Type 11.

---

## Type 13 (1925–1928) — Sweetheart

### Lead
The Sweetheart years. The "SW" trademark cartouche on the cutter, rosewood handles still holding the line. Type 13 sits in the heart of the era collectors actually want, and prices reflect it.

### How to identify
- **SW cartouche** — the heart-shaped trademark around "SW", stamped on the cutter (the iron). This is the era marker
- **Rosewood tote and knob** still — premium handles, before the 1933 switch to stained hardwood
- **Two patent dates** on the bed (down from three in Type 11)
- **Frog receiver** looks similar to Type 11 — small forward arc, no center rib
- **Lateral lever** continues with "STANLEY" stamp, single-piece twisted steel

### Common misidentifications
Type 12 (1919–1924) sits immediately before — no SW cartouche, otherwise close. Type 14 (1929–1932) sits immediately after — also has the SW cartouche, but adds an orange-painted frog adjustment screw. The SW + rosewood + no-orange-screw combination uniquely pins Type 13.

---

## Type 15 (1932–1933) — Late classic

### Lead
The last rosewood-handled Stanley. A two-year transition before stained hardwood took over for good. Subtler markers than the surrounding types — most identification leans on the handle wood.

### How to identify
- **Rosewood tote and knob** still — the final rosewood-era generation
- **No SW cartouche** on the cutter — the Sweetheart trademark moved off the iron in 1932
- **Slightly redesigned lever cap** — profile is subtly different from Types 11–14
- **Hard rubber depth adjuster nut** continues
- Two-year run, low production volume, so genuinely less common than the surrounding types

### Common misidentifications
Type 14 (still has the SW cartouche + orange frog adjustment screw) sits immediately before. Type 16 (stained hardwood handles) sits immediately after. The Type 15 combination is rosewood + no SW cartouche + no orange screw — but the lever cap profile is the most diagnostic feature for someone who's seen reference photos. Without comparison reference, calling a Type 15 with confidence is genuinely hard; lean on the rosewood + no-orange + no-SW combination and accept a wider date range.

---

## Type 17 (1942–1945) — WWII

### Lead
War-era Stanley. Stained hardwood handles (rosewood is long gone by now), and a casting quality that subtly tells you when the plane was made. Functional planes that show the era they came from.

### How to identify
- **Stained hardwood tote and knob** — not rosewood; this happened at Type 16 (1933) and continues
- **Slightly rougher casting quality** — visible mold lines, marginally rougher finish than pre-war and post-war types. Wartime materials and labor
- **Hard rubber depth adjuster nut** continues
- **Bed marking** typically reads "MADE IN U.S.A." with no patent dates (the dates dropped around Type 12)
- **No blue paint** — that's Type 19 and onward

### Common misidentifications
Type 16 (1933–1941) and Type 18 (1946–1947) sit on either side, both with stained hardwood. The rougher casting quality is the WWII tell, but it's subtle. If you can read clear date markings or you know the plane came out of a 1940s tool chest, the surrounding context is often more diagnostic than the casting itself. Many sellers list these as "Type 16-17" without committing — that's honest practice.

---

## Type 19 (1948–1961) — Blue paint

### Lead
When Stanley went blue. Blue-painted bed and frog mark the post-war modern era — Stanley's biggest visual change since the originals. Long production run; lots of these around, generally the most affordable working Stanley you'll find.

### How to identify
- **Blue-painted bed and frog** — the signature change. Earlier types are black-japanned
- **Ribbed depth adjustment nut** (vs. the smooth knurled nut on Types 1–18)
- **Stained hardwood tote and knob** — not yet plastic; that's Type 20
- **"STANLEY" in cursive script** on the lateral adjustment lever
- **Frog adjustment screw** painted gray or blue to match the bed (vs. raw metal or orange on earlier types)

### Common misidentifications
Type 18 (1946–1947) sits immediately before blue paint — still black-japanned, smooth-knurled depth nut. Type 20 (1962–1967+) continues the blue paint but switches the lateral lever stamp to a rectangular cartouche. The ribbed depth nut is the cleanest delta from Type 18; the cursive lever-lever stamp is the cleanest delta from Type 20.

---

## Type 20 (1962–1967+) — Modern

### Lead
Late blue-paint Stanley. Rectangular "STANLEY" cartouche on the lateral lever; later examples have plastic handles. The end of the Stanley story as a serious tool maker. Functional, plentiful, inexpensive.

### How to identify
- **Blue paint** continues
- **"STANLEY" in a rectangular cartouche** on the lateral adjustment lever (vs. cursive script on Type 19)
- **Stained hardwood handles** on earlier Type 20 examples; **plastic tote and knob** on later examples
- **Ribbed depth adjustment nut** continues from Type 19
- **Frog adjustment screw** painted to match bed

### Common misidentifications
Type 19 also has blue paint. The rectangular cartouche is the cleanest single tell — Type 19 has cursive script. If the handles are plastic, it's unambiguously a late Type 20. Beyond Type 20 the type-study tradition mostly ends — Stanley's later production isn't tracked with the same per-year granularity, and "post-1967 Stanley" is the working label for anything after.

---

## Per-model intros (shorter — used as page subheads/header context)

These pair with the type content above to form per-(model, type) pages. Layout note: the existing `STANLEY_BENCH_PLANE_MODELS` data already has length, iron width, and a one-liner role. These intros add the *feel* and use-case context that's design-independent.

### No. 3 (8" sole, 1¾" iron) — Small smoothing plane
The small smoother. Lighter and shorter than the No. 4, useful for tight work or for smaller hands. Common enough to find for working prices; not a collector's first choice.

### No. 4 (9½" sole, 2" iron) — The standard smoothing plane
The most common bench plane Stanley ever made. If a vintage Stanley is going to surface at a flea market or estate sale, odds are it's a No. 4. The default smoothing plane in most working shops — and the default first vintage plane for new collectors.

### No. 4½ (10" sole, 2⅜" iron) — Wide smoothing plane
Wider sole and iron than the No. 4. Less common, slightly heavier — preferred by users who want a more substantial smoother. Modest premium over the No. 4.

### No. 5 (14" sole, 2" iron) — The standard jack plane
The other most-common Stanley. Where the No. 4 smooths, the No. 5 takes off material — the working jack plane for rough flattening before smoothing. Lots of these around, generally affordable.

### No. 5½ (15" sole, 2⅜" iron) — Wide jack plane
Wider iron version of the No. 5. Less common, slightly heavier. The wider iron makes it better for surfacing wide boards in one pass.

### No. 6 (18" sole, 2⅜" iron) — Fore plane
The "in-between" size — longer than a jack, shorter than a jointer. Less common than either neighbor. Useful as a try plane for medium-length boards; collectors often skip it.

### No. 7 (22" sole, 2⅜" iron) — Jointer plane
The standard jointer. Long enough to flatten edges and faces on furniture-scale boards. Heavy and committed — not a beginner's first plane, but the workhorse for anyone doing serious joinery by hand.

### No. 8 (24" sole, 2⅝" iron) — Largest jointer
The biggest bench plane Stanley made. Heavy, long, less common. For dedicated jointing work on long boards or large panels. Modest collector premium over the No. 7.

---

## Bedrock per-model intros (shorter)

Bedrock variants (No. 602–608) share the same nominal sizes as their Bailey-pattern counterparts but use a different frog design — fully bedded frog with no gap between the frog and the body casting. Considered structurally superior; collected separately and priced higher than Bailey-pattern Stanleys.

### No. 604 — Bedrock smoother (smoothing equivalent of No. 4)
The Bedrock equivalent of the No. 4. Same nominal size, fully bedded frog. Modest premium over a Bailey-pattern No. 4 in similar condition.

### No. 605 — Bedrock jack
Bedrock equivalent of the No. 5. Same nominal size. Common enough among Bedrock variants; the Bedrock jack is one of the more practical Bedrocks to acquire as a user.

### No. 607 — Bedrock jointer
Bedrock equivalent of the No. 7. Heavy, full-size jointer; the Bedrock frog design helps with the kind of edge work this plane is for. Less common than No. 7, premium pricing.

---

## Style notes (for the writer porting this content)

- **Voice:** trusted-friend-who-knows-tools. Specific. Decision-led. Occasionally dry. Match the verdict-card voice from the Claude Design mockup: *"Looks like a Type 11 No. 5 in good shape. Lateral lever is correct for the era; tote and knob look original."*
- **Don't say:** "AI-powered," "smart," anything that sounds like an aggregator.
- **Visual specificity over era prose.** Every "How to identify" bullet should describe something a buyer can *see* in a photo. Date ranges and era labels go in the sidebar; visual markers go in the bullets.
- **Honest about ambiguity.** Types 15 and 17 are genuinely hard to call from photos. Say so. "Without comparison reference, calling a Type 15 with confidence is genuinely hard" reads as expertise, not weakness.
- **No padding.** If a type has 4 distinguishing features, the list is 4 bullets. Don't pad to 6.
- **No links inside prose.** Cross-references to other types live in the sidebar/related-variants block, not buried in sentences.
