I'm building an AI tool identification feature for a hand tool marketplace called Benchlot. I need to source ~20-30
         test photos of woodworking hand tools where the tool identity is **known with certainty** so I can use them as groun
         d truth to evaluate my AI's accuracy.
       8
       9 For each photo you help me find, I need:
      10 - A photo of a single tool (not group shots)
      11 - A confirmed identification: tool type, maker, model number, and approximate era
      12 - Photos that look like what a real seller would upload — workbench shots, not studio/catalog photos
      13
      14 ## Tool types I need coverage for:
      15
      16 **Stanley bench planes (highest priority — most common tools on our marketplace):**
      17 - Stanley No. 4 smoothing plane (various types — Type 11, Type 15, Type 17/WWII, Type 19/blue)
      18 - Stanley No. 5 jack plane
      19 - Stanley No. 7 or No. 8 jointer
      20 - Stanley No. 3 smoothing plane
      21
      22 **Stanley block planes:**
      23 - Stanley No. 60½ low-angle block plane
      24 - Stanley No. 9½ block plane
      25 - Stanley No. 220 block plane
      26
      27 **Other planes:**
      28 - Lie-Nielsen No. 4 or No. 62 (bronze body, cherry handles)
      29 - Veritas low-angle jack or smoothing plane (green, modern)
      30 - Record No. 4 or No. 5 (blue, English)
      31 - Stanley No. 78 rabbet plane
      32 - Stanley No. 71 router plane
      33 - A wooden molding plane or plow plane
      34
      35 **Non-plane tools:**
      36 - Disston handsaw (D-8 or similar, with medallion visible)
      37 - Set of bench chisels (Narex, Stanley, or similar)
      38 - Marking gauge (any maker)
      39 - Spokeshave (Stanley No. 151 or similar)
      40 - Brace and bit
      41 - Japanese pull saw (ryoba or dozuki)
      42 - Combination square
      43
      44 ## Where to look:
      45
      46 1. **Completed eBay listings** — search for the specific tool, filter to "Sold" items. These have confirmed IDs from
          knowledgeable sellers. Save the main listing photo.
      47 2. **r/handtools or r/woodworking** — posts where someone asks "what is this?" and gets a confirmed answer, or show-
         and-tell posts where the owner identifies their tool.
      48 3. **LumberJocks, Sawmill Creek, WoodNet forums** — tool identification threads.
      49 4. **Blood & Gore (supertool.com)** — Patrick Leach's Stanley encyclopedia, has reference photos.
      50 5. **Hyperkitten.com** — vintage tool dealer with well-identified inventory photos.
      51
      52 ## What I need you to output:
      53
      54 For each photo you find, give me:
      55
      56 ```
      57 Filename to save as: stanley_no4_type17_wwii.jpg
      58 Source URL: [where to download the photo]
      59 Ground truth:
      60   - Tool type: Smoothing Plane
      61   - Maker: Stanley
      62   - Model: No. 4
      63   - Era: 1942-1945 (Type 17, WWII)
      64   - Condition: Good
      65   - Notable: Stained hardwood handles, wartime production
      66 Why this is a good test case: [what makes this photo interesting for testing — tricky angle, unusual condition, etc.
         ]
      67 ```
      68
      69 Aim for 25 photos total. Prioritize diversity: different tool types, different makers, different eras, different pho
         to qualities (some clean, some cluttered backgrounds, some dim lighting). I want to stress-test the AI, not just giv
         e it easy shots.
