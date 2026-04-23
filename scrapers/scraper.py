"""
Benchlot Price Guide Data Collector
====================================
Scrapes eBay sold listings for common hand tools to build pricing data.

Usage:
    python scraper.py                  # Scrape all tools
    python scraper.py --tool "Stanley No. 4"  # Scrape one tool
    python scraper.py --pages 5        # More pages per tool (default 3)

Output: CSV files in ./data/ directory + combined JSON for Firebase import

NOTE: eBay's completed/sold listings are publicly visible in the browser.
This scraper respects rate limits with delays between requests.
For personal/research use in building a price guide.
"""

import requests
from bs4 import BeautifulSoup
import csv
import json
import time
import os
import re
import argparse
from datetime import datetime
from urllib.parse import quote_plus
import random

# ============================================================
# TOOL DEFINITIONS - The Benchlot Top 40
# ============================================================
# Organized by category with search queries optimized for eBay

TOOLS = {
    # === BENCH PLANES ===
    "Stanley No. 3 Smoothing Plane": {
        "query": "Stanley No 3 smoothing plane",
        "category": "Bench Planes",
        "subcategory": "Smoothing",
        "brand": "Stanley",
        "new_price_range": None,  # vintage only
        "notes": "Small smoothing plane, 8\". Common vintage find."
    },
    "Stanley No. 4 Smoothing Plane": {
        "query": "Stanley No 4 smoothing plane",
        "category": "Bench Planes",
        "subcategory": "Smoothing",
        "brand": "Stanley",
        "new_price_range": None,
        "notes": "The workhorse. Most common bench plane ever made."
    },
    "Stanley No. 5 Jack Plane": {
        "query": "Stanley No 5 jack plane",
        "category": "Bench Planes",
        "subcategory": "Jack",
        "brand": "Stanley",
        "new_price_range": None,
        "notes": "14\" jack plane. The do-everything plane."
    },
    "Stanley No. 6 Fore Plane": {
        "query": "Stanley No 6 fore plane",
        "category": "Bench Planes",
        "subcategory": "Fore",
        "brand": "Stanley",
        "new_price_range": None,
        "notes": "18\" fore plane. Less common than 5 or 7."
    },
    "Stanley No. 7 Jointer Plane": {
        "query": "Stanley No 7 jointer plane",
        "category": "Bench Planes",
        "subcategory": "Jointer",
        "brand": "Stanley",
        "new_price_range": None,
        "notes": "22\" jointer. Premium prices for good ones."
    },
    "Lie-Nielsen No. 4 Smoothing Plane": {
        "query": "Lie-Nielsen No 4 smoothing plane",
        "category": "Bench Planes",
        "subcategory": "Smoothing",
        "brand": "Lie-Nielsen",
        "new_price_range": [375, 425],
        "notes": "Bronze body. The gold standard of modern bench planes."
    },
    "Lie-Nielsen No. 5 Jack Plane": {
        "query": "Lie-Nielsen No 5 jack plane",
        "category": "Bench Planes",
        "subcategory": "Jack",
        "brand": "Lie-Nielsen",
        "new_price_range": [375, 425],
        "notes": "Bronze or iron body. Holds value extremely well."
    },
    "Lie-Nielsen No. 7 Jointer Plane": {
        "query": "Lie-Nielsen No 7 jointer plane",
        "category": "Bench Planes",
        "subcategory": "Jointer",
        "brand": "Lie-Nielsen",
        "new_price_range": [475, 525],
        "notes": "22\" bronze jointer. High-end collector and user piece."
    },

    # === BLOCK & SPECIALTY PLANES ===
    "Lie-Nielsen No. 60-1/2 Block Plane": {
        "query": "Lie-Nielsen 60-1/2 block plane",
        "category": "Block Planes",
        "subcategory": "Low Angle",
        "brand": "Lie-Nielsen",
        "new_price_range": [165, 185],
        "notes": "Low angle block plane. Most popular LN plane."
    },
    "Lie-Nielsen No. 62 Low Angle Jack": {
        "query": "Lie-Nielsen 62 low angle jack plane",
        "category": "Bench Planes",
        "subcategory": "Low Angle Jack",
        "brand": "Lie-Nielsen",
        "new_price_range": [345, 375],
        "notes": "Bevel-up jack. Versatile, popular with beginners."
    },
    "Veritas Low Angle Block Plane": {
        "query": "Veritas low angle block plane",
        "category": "Block Planes",
        "subcategory": "Low Angle",
        "brand": "Veritas",
        "new_price_range": [159, 179],
        "notes": "Lee Valley/Veritas. Adjustable mouth, A2 or PM-V11 iron."
    },
    "Veritas Low Angle Jack Plane": {
        "query": "Veritas low angle jack plane",
        "category": "Bench Planes",
        "subcategory": "Low Angle Jack",
        "brand": "Veritas",
        "new_price_range": [269, 299],
        "notes": "Bevel-up design. Strong competitor to LN 62."
    },
    "Veritas Low Angle Smoother": {
        "query": "Veritas low angle smoother plane",
        "category": "Bench Planes",
        "subcategory": "Smoothing",
        "brand": "Veritas",
        "new_price_range": [259, 289],
        "notes": "Bevel-up smoother. Excellent with figured wood."
    },
    "Stanley No. 71 Router Plane": {
        "query": "Stanley 71 router plane",
        "category": "Specialty Planes",
        "subcategory": "Router",
        "brand": "Stanley",
        "new_price_range": None,
        "notes": "Vintage router plane. Prices have skyrocketed."
    },
    "Veritas Router Plane": {
        "query": "Veritas router plane",
        "category": "Specialty Planes",
        "subcategory": "Router",
        "brand": "Veritas",
        "new_price_range": [219, 249],
        "notes": "Modern alternative to Stanley 71. Excellent build."
    },
    "Stanley No. 78 Rabbet Plane": {
        "query": "Stanley 78 rabbet plane",
        "category": "Specialty Planes",
        "subcategory": "Rabbet",
        "brand": "Stanley",
        "new_price_range": None,
        "notes": "Duplex rabbet. Common and useful."
    },
    "Record No. 043 Plow Plane": {
        "query": "Record 043 plow plane",
        "category": "Specialty Planes",
        "subcategory": "Plow",
        "brand": "Record",
        "new_price_range": None,
        "notes": "English-made plow plane. Popular with hand-tool woodworkers."
    },
    "Stanley No. 45 Combination Plane": {
        "query": "Stanley 45 combination plane",
        "category": "Specialty Planes",
        "subcategory": "Combination",
        "brand": "Stanley",
        "new_price_range": None,
        "notes": "The 'plane that does everything'. Collector and user."
    },

    # === CHISELS ===
    "Lie-Nielsen Bench Chisels": {
        "query": "Lie-Nielsen bench chisel",
        "category": "Chisels",
        "subcategory": "Bench",
        "brand": "Lie-Nielsen",
        "new_price_range": [45, 65],
        "notes": "A2 steel, hornbeam handles. Per chisel pricing."
    },
    "Narex Bench Chisels": {
        "query": "Narex bench chisel set woodworking",
        "category": "Chisels",
        "subcategory": "Bench",
        "brand": "Narex",
        "new_price_range": [30, 90],
        "notes": "Czech-made. Best value in new chisels. Entry point."
    },
    "Stanley Sweetheart Chisels": {
        "query": "Stanley Sweetheart chisel set",
        "category": "Chisels",
        "subcategory": "Bench",
        "brand": "Stanley",
        "new_price_range": [60, 120],
        "notes": "Modern Sweetheart line. Mixed reviews vs vintage."
    },
    "Japanese Bench Chisels (Oire Nomi)": {
        "query": "Japanese oire nomi bench chisel",
        "category": "Chisels",
        "subcategory": "Japanese",
        "brand": "Various",
        "new_price_range": [30, 200],
        "notes": "White or blue steel. Wide price range by maker."
    },

    # === SAWS ===
    "Lie-Nielsen Dovetail Saw": {
        "query": "Lie-Nielsen dovetail saw",
        "category": "Saws",
        "subcategory": "Dovetail",
        "brand": "Lie-Nielsen",
        "new_price_range": [125, 150],
        "notes": "Progressive pitch. Industry standard dovetail saw."
    },
    "Veritas Dovetail Saw": {
        "query": "Veritas dovetail saw",
        "category": "Saws",
        "subcategory": "Dovetail",
        "brand": "Veritas",
        "new_price_range": [89, 109],
        "notes": "Lee Valley. Solid alternative to LN."
    },
    "Bad Axe Dovetail Saw": {
        "query": "Bad Axe dovetail saw",
        "category": "Saws",
        "subcategory": "Dovetail",
        "brand": "Bad Axe",
        "new_price_range": [275, 350],
        "notes": "Mark Harrell handmade. Premium artisan saw."
    },
    "Japanese Dozuki Saw": {
        "query": "Japanese dozuki saw woodworking",
        "category": "Saws",
        "subcategory": "Japanese Pull",
        "brand": "Various",
        "new_price_range": [25, 120],
        "notes": "Backed pull saw for joinery. Gyokucho, Z-Saw brands."
    },
    "Japanese Ryoba Saw": {
        "query": "Japanese ryoba saw woodworking",
        "category": "Saws",
        "subcategory": "Japanese Pull",
        "brand": "Various",
        "new_price_range": [25, 80],
        "notes": "Double-edged pull saw. Crosscut and rip."
    },
    "Disston Hand Saw": {
        "query": "Disston hand saw vintage",
        "category": "Saws",
        "subcategory": "Hand Saw",
        "brand": "Disston",
        "new_price_range": None,
        "notes": "Classic American saw. D-7, D-8 most sought after."
    },

    # === MEASURING & LAYOUT ===
    "Starrett Combination Square": {
        "query": "Starrett combination square",
        "category": "Measuring",
        "subcategory": "Square",
        "brand": "Starrett",
        "new_price_range": [100, 250],
        "notes": "The standard. 12\" most common. Made in USA."
    },
    "Veritas Marking Gauge": {
        "query": "Veritas marking gauge",
        "category": "Measuring",
        "subcategory": "Marking Gauge",
        "brand": "Veritas",
        "new_price_range": [39, 79],
        "notes": "Wheel or pin style. Very popular."
    },
    "Veritas Sliding Bevel": {
        "query": "Veritas sliding bevel gauge",
        "category": "Measuring",
        "subcategory": "Bevel Gauge",
        "brand": "Veritas",
        "new_price_range": [35, 55],
        "notes": "Precision bevel gauge."
    },

    # === SHARPENING ===
    "Shapton Glass Stones": {
        "query": "Shapton glass stone sharpening",
        "category": "Sharpening",
        "subcategory": "Water Stones",
        "brand": "Shapton",
        "new_price_range": [35, 80],
        "notes": "Per stone. 1000, 4000, 8000 grit most common."
    },
    "DMT Diamond Stones": {
        "query": "DMT diamond sharpening stone woodworking",
        "category": "Sharpening",
        "subcategory": "Diamond",
        "brand": "DMT",
        "new_price_range": [50, 120],
        "notes": "Dia-Sharp or DuoSharp. Long lasting, no flattening."
    },
    "Veritas Mk.II Honing Guide": {
        "query": "Veritas honing guide",
        "category": "Sharpening",
        "subcategory": "Honing Guide",
        "brand": "Veritas",
        "new_price_range": [74, 84],
        "notes": "The standard honing guide. Essential for beginners."
    },

    # === WORKHOLDING ===
    "Veritas Twin-Screw Vise": {
        "query": "Veritas twin screw vise",
        "category": "Workholding",
        "subcategory": "Vise",
        "brand": "Veritas",
        "new_price_range": [295, 345],
        "notes": "Moxon-style vise. Popular for dovetailing."
    },
    "Record Woodworking Vise": {
        "query": "Record woodworking vise",
        "category": "Workholding",
        "subcategory": "Vise",
        "brand": "Record",
        "new_price_range": None,
        "notes": "Vintage English vise. No. 52 and 53 most common."
    },

    # === SPOKESHAVES & SCRAPERS ===
    "Lie-Nielsen Spokeshave": {
        "query": "Lie-Nielsen spokeshave",
        "category": "Shaping Tools",
        "subcategory": "Spokeshave",
        "brand": "Lie-Nielsen",
        "new_price_range": [80, 110],
        "notes": "Flat or round sole. Bronze body."
    },
    "Stanley No. 151 Spokeshave": {
        "query": "Stanley 151 spokeshave",
        "category": "Shaping Tools",
        "subcategory": "Spokeshave",
        "brand": "Stanley",
        "new_price_range": None,
        "notes": "Classic flat-bottom spokeshave. Very common vintage."
    },
    "Lie-Nielsen Card Scraper": {
        "query": "Lie-Nielsen card scraper",
        "category": "Shaping Tools",
        "subcategory": "Scraper",
        "brand": "Lie-Nielsen",
        "new_price_range": [12, 18],
        "notes": "Simple but essential. Multiple thicknesses."
    },
}


# ============================================================
# SCRAPER
# ============================================================

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
}


def build_sold_url(query, page=1):
    """Build eBay sold items search URL."""
    encoded = quote_plus(query)
    # LH_Complete=1 = completed listings, LH_Sold=1 = sold only
    # _sop=13 = sort by end date newest first
    return (
        f"https://www.ebay.com/sch/i.html?"
        f"_nkw={encoded}"
        f"&LH_Complete=1&LH_Sold=1"
        f"&_sop=13"
        f"&_ipg=120"  # 120 items per page
        f"&_pgn={page}"
    )


def parse_price(price_text):
    """Extract numeric price from text like '$49.99' or '$25.00 to $35.00'."""
    if not price_text:
        return None, None

    prices = re.findall(r'\$[\d,]+\.?\d*', price_text)
    if len(prices) == 0:
        return None, None
    elif len(prices) == 1:
        val = float(prices[0].replace('$', '').replace(',', ''))
        return val, val
    else:
        low = float(prices[0].replace('$', '').replace(',', ''))
        high = float(prices[-1].replace('$', '').replace(',', ''))
        return low, high


def parse_date(date_text):
    """Extract date from 'Sold  Jan 15, 2025' format."""
    if not date_text:
        return None
    # Try various patterns
    match = re.search(r'Sold\s+(\w+\s+\d+,?\s*\d{4})', date_text)
    if match:
        try:
            return datetime.strptime(match.group(1).strip(), "%b %d, %Y").strftime("%Y-%m-%d")
        except ValueError:
            pass
    match = re.search(r'(\w+\s+\d+,?\s*\d{4})', date_text)
    if match:
        try:
            return datetime.strptime(match.group(1).strip(), "%b %d, %Y").strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


def scrape_sold_page(url, session):
    """Scrape a single page of eBay sold listings.
    
    eBay updated their search results layout from .s-item to .s-card in late 2025.
    Cards with id starting with 'item' are real listings; others are sponsored/ads.
    """
    time.sleep(random.uniform(2.0, 4.5))  # polite delay

    try:
        response = session.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"  ⚠ Request failed: {e}")
        return [], False

    soup = BeautifulSoup(response.text, 'html.parser')
    items = []

    # eBay now uses .s-card class for search results (was .s-item)
    listings = soup.select('.s-card')

    for listing in listings:
        try:
            # Skip sponsored/ad cards - real listings have id="item..."
            card_id = listing.get('id', '')
            if not card_id.startswith('item'):
                continue

            # Title - from .s-card__title or the img alt text
            title_el = listing.select_one('.s-card__title')
            if title_el:
                title = title_el.get_text(strip=True)
            else:
                img_el = listing.select_one('.s-card__image')
                title = img_el.get('alt', '') if img_el else ''
            
            if not title or title.lower() in ['shop on ebay', 'results matching fewer words']:
                continue

            # Price - from .s-card__price
            price_el = listing.select_one('.s-card__price')
            price_text = price_el.get_text(strip=True) if price_el else None
            price_low, price_high = parse_price(price_text)

            if price_low is None:
                continue

            # Sold date - from .s-card__caption (contains "Sold  Feb 9, 2026")
            sold_date = None
            caption_el = listing.select_one('.s-card__caption')
            if caption_el:
                sold_text = caption_el.get_text(strip=True)
                sold_date = parse_date(sold_text)
            
            # If no caption, check for date in any .positive class text
            if not sold_date:
                positive_el = listing.select_one('.positive')
                if positive_el:
                    sold_date = parse_date(positive_el.get_text(strip=True))

            # Condition - from .s-card__subtitle
            condition_el = listing.select_one('.s-card__subtitle')
            condition = condition_el.get_text(strip=True) if condition_el else "Unknown"

            # Shipping & bids - from attribute rows in the footer
            shipping = "Unknown"
            bids = None
            attr_rows = listing.select('.s-card__attribute-row')
            for row in attr_rows:
                text = row.get_text(strip=True)
                if 'delivery' in text.lower() or 'shipping' in text.lower() or 'free' in text.lower():
                    shipping = text
                elif 'bid' in text.lower():
                    bids = text

            # Link - from any anchor with class s-card__link
            link_el = listing.select_one('a.s-card__link[href*="/itm/"]')
            link = link_el.get('href', '') if link_el else ''
            # Clean tracking params from URL
            if '&' in link:
                base_match = re.match(r'(https://www\.ebay\.com/itm/\d+)', link)
                if base_match:
                    link = base_match.group(1)

            items.append({
                "title": title,
                "price_low": price_low,
                "price_high": price_high,
                "price_avg": (price_low + price_high) / 2,
                "sold_date": sold_date,
                "condition": condition,
                "shipping": shipping,
                "bids": bids,
                "url": link,
                "scraped_at": datetime.now().isoformat()
            })

        except Exception as e:
            continue

    # Check if there's a next page - try multiple selectors
    has_next = bool(
        soup.select_one('.pagination__next') or
        soup.select_one('a[aria-label="Next page"]') or
        soup.select_one('[class*="pagination"] [rel="next"]')
    )

    return items, has_next


def scrape_tool(tool_name, tool_info, max_pages=3, session=None):
    """Scrape all sold listings for a specific tool."""
    print(f"\n{'='*60}")
    print(f"  Scraping: {tool_name}")
    print(f"  Query: {tool_info['query']}")
    print(f"{'='*60}")

    if session is None:
        session = requests.Session()

    all_items = []

    for page in range(1, max_pages + 1):
        url = build_sold_url(tool_info['query'], page)
        print(f"  Page {page}... ", end="", flush=True)

        items, has_next = scrape_sold_page(url, session)
        print(f"found {len(items)} listings")

        for item in items:
            item["tool_name"] = tool_name
            item["category"] = tool_info["category"]
            item["subcategory"] = tool_info["subcategory"]
            item["brand"] = tool_info["brand"]
            item["new_price_low"] = tool_info["new_price_range"][0] if tool_info["new_price_range"] else None
            item["new_price_high"] = tool_info["new_price_range"][1] if tool_info["new_price_range"] else None

        all_items.extend(items)

        if not has_next:
            print(f"  No more pages.")
            break

    return all_items


def compute_stats(items):
    """Compute pricing statistics for a set of listings."""
    if not items:
        return {}

    prices = [i["price_avg"] for i in items]
    prices.sort()
    n = len(prices)

    return {
        "count": n,
        "min": round(min(prices), 2),
        "max": round(max(prices), 2),
        "mean": round(sum(prices) / n, 2),
        "median": round(prices[n // 2], 2),
        "p25": round(prices[n // 4], 2) if n >= 4 else round(prices[0], 2),
        "p75": round(prices[3 * n // 4], 2) if n >= 4 else round(prices[-1], 2),
    }


def main():
    parser = argparse.ArgumentParser(description="Benchlot Price Guide Scraper")
    parser.add_argument("--tool", type=str, help="Scrape a specific tool by name")
    parser.add_argument("--pages", type=int, default=3, help="Max pages per tool (default 3)")
    parser.add_argument("--output", type=str, default="data", help="Output directory")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    session = requests.Session()

    # Select tools to scrape
    if args.tool:
        matching = {k: v for k, v in TOOLS.items() if args.tool.lower() in k.lower()}
        if not matching:
            print(f"No tool matching '{args.tool}'. Available tools:")
            for name in sorted(TOOLS.keys()):
                print(f"  - {name}")
            return
        tools_to_scrape = matching
    else:
        tools_to_scrape = TOOLS

    print(f"\nBenchlot Price Guide Scraper")
    print(f"Tools to scrape: {len(tools_to_scrape)}")
    print(f"Max pages per tool: {args.pages}")
    print(f"Output directory: {args.output}/")

    all_data = []
    price_guide = {}

    for tool_name, tool_info in tools_to_scrape.items():
        items = scrape_tool(tool_name, tool_info, max_pages=args.pages, session=session)
        all_data.extend(items)

        # Compute stats
        stats = compute_stats(items)
        if stats:
            price_guide[tool_name] = {
                "tool_name": tool_name,
                "brand": tool_info["brand"],
                "category": tool_info["category"],
                "subcategory": tool_info["subcategory"],
                "new_price_low": tool_info["new_price_range"][0] if tool_info["new_price_range"] else None,
                "new_price_high": tool_info["new_price_range"][1] if tool_info["new_price_range"] else None,
                "notes": tool_info["notes"],
                "ebay_sold": stats,
                "value_retention": None,
            }
            # Calculate value retention if we have new price
            if tool_info["new_price_range"]:
                new_mid = (tool_info["new_price_range"][0] + tool_info["new_price_range"][1]) / 2
                if new_mid > 0:
                    price_guide[tool_name]["value_retention"] = round(stats["median"] / new_mid * 100, 1)

            print(f"\n  📊 Stats: ${stats['min']:.0f} - ${stats['max']:.0f} | "
                  f"Median: ${stats['median']:.0f} | "
                  f"Mean: ${stats['mean']:.0f} | "
                  f"n={stats['count']}")
            if price_guide[tool_name]["value_retention"]:
                print(f"  📈 Value retention: {price_guide[tool_name]['value_retention']}% of new price")

    # === SAVE OUTPUTS ===

    # 1. Raw data CSV
    csv_path = os.path.join(args.output, "ebay_sold_listings.csv")
    if all_data:
        fieldnames = [
            "tool_name", "brand", "category", "subcategory",
            "title", "price_low", "price_high", "price_avg",
            "sold_date", "condition", "shipping", "bids", "url",
            "new_price_low", "new_price_high", "scraped_at"
        ]
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(all_data)
        print(f"\n✅ Raw data saved: {csv_path} ({len(all_data)} listings)")

    # 2. Price guide JSON (for Firebase import)
    guide_path = os.path.join(args.output, "price_guide.json")
    with open(guide_path, 'w') as f:
        json.dump(price_guide, f, indent=2)
    print(f"✅ Price guide saved: {guide_path} ({len(price_guide)} tools)")

    # 3. Summary report
    summary_path = os.path.join(args.output, "price_summary.txt")
    with open(summary_path, 'w') as f:
        f.write("BENCHLOT PRICE GUIDE SUMMARY\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write(f"Total listings scraped: {len(all_data)}\n")
        f.write(f"Tools covered: {len(price_guide)}\n")
        f.write("=" * 80 + "\n\n")

        # Group by category
        categories = {}
        for name, data in price_guide.items():
            cat = data["category"]
            if cat not in categories:
                categories[cat] = []
            categories[cat].append((name, data))

        for cat in sorted(categories.keys()):
            f.write(f"\n{'='*60}\n")
            f.write(f"  {cat.upper()}\n")
            f.write(f"{'='*60}\n\n")

            for name, data in sorted(categories[cat], key=lambda x: x[0]):
                stats = data["ebay_sold"]
                f.write(f"  {name}\n")
                f.write(f"    Brand: {data['brand']}\n")
                f.write(f"    eBay sold range: ${stats['min']:.0f} - ${stats['max']:.0f}\n")
                f.write(f"    Median: ${stats['median']:.0f} | Mean: ${stats['mean']:.0f}\n")
                f.write(f"    25th-75th percentile: ${stats['p25']:.0f} - ${stats['p75']:.0f}\n")
                f.write(f"    Sample size: {stats['count']} sold listings\n")
                if data["new_price_low"]:
                    f.write(f"    New price: ${data['new_price_low']:.0f} - ${data['new_price_high']:.0f}\n")
                if data["value_retention"]:
                    f.write(f"    Value retention: {data['value_retention']}%\n")
                f.write(f"    Notes: {data['notes']}\n\n")

    print(f"✅ Summary saved: {summary_path}")

    # Print quick overview
    print(f"\n{'='*60}")
    print(f"  QUICK OVERVIEW")
    print(f"{'='*60}")
    print(f"{'Tool':<45} {'Median':>8} {'Range':>15} {'n':>5}")
    print("-" * 75)
    for name, data in sorted(price_guide.items(), key=lambda x: x[1]['category']):
        s = data["ebay_sold"]
        retention = f" ({data['value_retention']}%)" if data['value_retention'] else ""
        print(f"{name:<45} ${s['median']:>6.0f}  ${s['min']:.0f}-${s['max']:.0f}{retention:>10} {s['count']:>5}")


if __name__ == "__main__":
    main()
