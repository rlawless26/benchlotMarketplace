# Rekerf Price Guide Data Collector

Two scrapers to build pricing data for the Rekerf hand tool marketplace.

## Setup

```bash
pip install requests beautifulsoup4
```

## Scrapers

### 1. eBay Sold Listings (`scraper.py`)

Scrapes completed/sold listings from eBay for 40 common hand tools. Returns actual transaction prices, dates, conditions.

```bash
# Scrape all 40 tools (takes ~30-45 min with polite delays)
python scraper.py

# Test with one tool first
python scraper.py --tool "Stanley No. 4"

# More pages for deeper data
python scraper.py --pages 5

# Specific tool categories
python scraper.py --tool "Lie-Nielsen"
python scraper.py --tool "Veritas"
python scraper.py --tool "chisel"
```

**Output:**
- `data/ebay_sold_listings.csv` — Raw listing data (title, price, date, condition, URL)
- `data/price_guide.json` — Aggregated stats per tool (min, max, median, mean, percentiles)
- `data/price_summary.txt` — Human-readable summary report

### 2. Jim Bode Value Guide (`jimbode_scraper.py`)

Pulls Jim Bode's publicly published sold tool archive via Shopify's products.json endpoint. This is a massive dataset (~40,000+ tools) with actual sale prices.

```bash
# Scrape everything (will take a while - ~1800+ pages)
python jimbode_scraper.py

# Test with 5 pages first (~1,250 products)
python jimbode_scraper.py --limit 5
```

**Output:**
- `data/jimbode_sold.csv` — All sold tools with prices, categories, brands
- `data/jimbode_sold.json` — Same data in JSON for Firebase import

## The Rekerf Top 40 Tool List

### Bench Planes
| Tool | Brand | New Price | Notes |
|------|-------|-----------|-------|
| Stanley No. 3 Smoothing Plane | Stanley | Vintage only | Small smoother, 8" |
| Stanley No. 4 Smoothing Plane | Stanley | Vintage only | The workhorse. Most common ever made |
| Stanley No. 5 Jack Plane | Stanley | Vintage only | 14" jack. Do-everything plane |
| Stanley No. 6 Fore Plane | Stanley | Vintage only | 18" fore. Less common |
| Stanley No. 7 Jointer Plane | Stanley | Vintage only | 22" jointer. Premium prices |
| Lie-Nielsen No. 4 Smoothing | Lie-Nielsen | $375-425 | Bronze. Gold standard |
| Lie-Nielsen No. 5 Jack | Lie-Nielsen | $375-425 | Holds value extremely well |
| Lie-Nielsen No. 7 Jointer | Lie-Nielsen | $475-525 | High-end collector and user |
| Lie-Nielsen No. 62 LA Jack | Lie-Nielsen | $345-375 | Bevel-up. Popular with beginners |
| Veritas LA Jack Plane | Veritas | $269-299 | Strong competitor to LN 62 |
| Veritas LA Smoother | Veritas | $259-289 | Excellent with figured wood |

### Block & Specialty Planes
| Tool | Brand | New Price | Notes |
|------|-------|-----------|-------|
| Lie-Nielsen No. 60-1/2 Block | Lie-Nielsen | $165-185 | Most popular LN plane |
| Veritas LA Block Plane | Veritas | $159-179 | Adjustable mouth, A2 or PM-V11 |
| Stanley No. 71 Router Plane | Stanley | Vintage only | Prices have skyrocketed |
| Veritas Router Plane | Veritas | $219-249 | Modern alternative to Stanley 71 |
| Stanley No. 78 Rabbet | Stanley | Vintage only | Duplex rabbet. Common and useful |
| Record No. 043 Plow | Record | Vintage only | English-made. Popular |
| Stanley No. 45 Combination | Stanley | Vintage only | Collector and user piece |

### Chisels
| Tool | Brand | New Price | Notes |
|------|-------|-----------|-------|
| Lie-Nielsen Bench Chisels | Lie-Nielsen | $45-65 ea | A2 steel, hornbeam handles |
| Narex Bench Chisels | Narex | $30-90/set | Best value. Entry point |
| Stanley Sweetheart Chisels | Stanley | $60-120/set | Mixed reviews vs vintage |
| Japanese Oire Nomi | Various | $30-200 | White or blue steel |

### Saws
| Tool | Brand | New Price | Notes |
|------|-------|-----------|-------|
| Lie-Nielsen Dovetail Saw | Lie-Nielsen | $125-150 | Industry standard |
| Veritas Dovetail Saw | Veritas | $89-109 | Solid alternative |
| Bad Axe Dovetail Saw | Bad Axe | $275-350 | Handmade artisan |
| Japanese Dozuki | Various | $25-120 | Backed pull saw |
| Japanese Ryoba | Various | $25-80 | Double-edged pull saw |
| Disston Hand Saw | Disston | Vintage only | D-7, D-8 most sought after |

### Measuring & Layout
| Tool | Brand | New Price | Notes |
|------|-------|-----------|-------|
| Starrett Combination Square | Starrett | $100-250 | The standard. Made in USA |
| Veritas Marking Gauge | Veritas | $39-79 | Wheel or pin style |
| Veritas Sliding Bevel | Veritas | $35-55 | Precision bevel gauge |

### Sharpening
| Tool | Brand | New Price | Notes |
|------|-------|-----------|-------|
| Shapton Glass Stones | Shapton | $35-80 ea | 1000/4000/8000 most common |
| DMT Diamond Stones | DMT | $50-120 | Dia-Sharp or DuoSharp |
| Veritas Mk.II Honing Guide | Veritas | $74-84 | Essential for beginners |

### Workholding & Shaping
| Tool | Brand | New Price | Notes |
|------|-------|-----------|-------|
| Veritas Twin-Screw Vise | Veritas | $295-345 | Moxon-style for dovetailing |
| Record Woodworking Vise | Record | Vintage only | No. 52, 53 most common |
| Lie-Nielsen Spokeshave | Lie-Nielsen | $80-110 | Bronze body |
| Stanley No. 151 Spokeshave | Stanley | Vintage only | Classic flat-bottom |
| Lie-Nielsen Card Scraper | Lie-Nielsen | $12-18 | Simple but essential |

## Data Strategy

The combined eBay + Jim Bode data gives you:

1. **eBay**: Current market prices for both vintage and modern tools, with actual transaction dates and buyer behavior (auction vs buy-it-now, shipping preferences)
2. **Jim Bode**: Historical sold prices for premium/collector-grade vintage tools, establishing the upper end of the market

Together, these create a pricing database that no other marketplace in this space has. This becomes Rekerf's version of Kelley Blue Book — users come to check what their tool is worth, and stay to buy/sell.

## Loading into Firebase

The `price_guide.json` output is structured for direct import into Firestore:

```javascript
// Example Firebase import
const priceGuide = require('./data/price_guide.json');

for (const [toolName, data] of Object.entries(priceGuide)) {
  await db.collection('priceGuide').doc(data.brand + '_' + toolName).set(data);
}
```

## Legal Notes

- eBay sold listings are publicly visible in the browser
- Jim Bode's Value Guide is intentionally published as a public reference
- Both scrapers use polite delays between requests
- Data is used to power a pricing tool, not to replicate the source
