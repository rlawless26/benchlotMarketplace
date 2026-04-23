"""
Jim Bode Value Guide Scraper
==============================
Pulls sold tool data from Jim Bode's public Shopify "Value Guide" collection.

Jim Bode intentionally publishes this data as a public reference tool for the
antique tool community. The Shopify products.json endpoint serves this data
in structured JSON format.

Usage:
    python jimbode_scraper.py              # Scrape all pages
    python jimbode_scraper.py --limit 5    # Just 5 pages (test)

Output: data/jimbode_sold.csv + data/jimbode_sold.json
"""

import requests
import json
import csv
import time
import os
import re
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
}

BASE_URL = "https://www.jimbodetools.com/collections/jim-bodes-value-guide-to-antique-tools/products.json"


def extract_tool_type(title, tags):
    """Classify a tool based on title and tags."""
    title_lower = title.lower()
    tags_lower = [t.lower() for t in tags] if tags else []

    if any(w in title_lower for w in ['plane', 'smoother', 'jointer', 'jack plane', 'block plane', 'rabbet', 'router plane', 'plow', 'plough']):
        if 'block' in title_lower:
            return "Block Planes"
        elif 'router' in title_lower:
            return "Router Planes"
        elif any(w in title_lower for w in ['plow', 'plough']):
            return "Plow Planes"
        elif 'rabbet' in title_lower:
            return "Rabbet Planes"
        elif any(w in title_lower for w in ['infill', 'norris', 'spiers', 'preston']):
            return "Infill Planes"
        return "Bench Planes"
    elif any(w in title_lower for w in ['chisel', 'gouge']):
        return "Chisels"
    elif any(w in title_lower for w in ['saw', 'dovetail saw', 'tenon saw', 'back saw']):
        return "Saws"
    elif any(w in title_lower for w in ['brace', 'drill', 'bit']):
        return "Braces & Drills"
    elif any(w in title_lower for w in ['axe', 'adze', 'hatchet']):
        return "Axes & Adzes"
    elif any(w in title_lower for w in ['spokeshave', 'drawknife', 'scraper']):
        return "Shaping Tools"
    elif any(w in title_lower for w in ['square', 'level', 'rule', 'gauge', 'caliper', 'bevel']):
        return "Measuring"
    elif any(w in title_lower for w in ['hammer', 'mallet']):
        return "Hammers"
    elif any(w in title_lower for w in ['vise', 'clamp', 'holdfast']):
        return "Workholding"
    elif any(w in title_lower for w in ['knife', 'croze']):
        return "Knives"
    return "Other"


def extract_brand(title):
    """Try to extract brand from title."""
    brands = [
        "Stanley", "Lie-Nielsen", "Veritas", "Record", "Norris", "Spiers",
        "Preston", "Disston", "Sargent", "Millers Falls", "Keen Kutter",
        "Winchester", "Chaplin", "Bailey", "Bedrock", "Union", "Ohio Tool",
        "Greenfield", "Buck Brothers", "Marples", "Ward", "Mathieson",
        "Sorby", "Gramercy", "Clifton", "Hock", "Blue Spruce", "Barton",
        "Moulson", "Rabone", "Starrett", "Brown & Sharpe", "Lufkin"
    ]
    title_lower = title.lower()
    for brand in brands:
        if brand.lower() in title_lower:
            return brand
    # Check for Stanley type numbers
    if re.search(r'stanley\s*#?\s*\d', title_lower):
        return "Stanley"
    return "Unknown"


def scrape_jimbode(max_pages=None):
    """Scrape Jim Bode's value guide via Shopify products.json."""
    session = requests.Session()
    all_products = []
    page = 1

    print("Jim Bode Value Guide Scraper")
    print("=" * 50)

    while True:
        if max_pages and page > max_pages:
            break

        url = f"{BASE_URL}?limit=250&page={page}"
        print(f"  Page {page}... ", end="", flush=True)

        try:
            time.sleep(1.5)  # polite delay
            response = session.get(url, headers=HEADERS, timeout=15)
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"Error: {e}")
            break

        products = data.get("products", [])
        if not products:
            print("no more products.")
            break

        print(f"found {len(products)} products")

        for p in products:
            title = p.get("title", "")
            tags = p.get("tags", [])

            # Get price from first variant
            variants = p.get("variants", [])
            price = None
            if variants:
                price_str = variants[0].get("price", "0")
                try:
                    price = float(price_str)
                except (ValueError, TypeError):
                    price = None

            # Images
            images = p.get("images", [])
            image_url = images[0].get("src", "") if images else ""
            image_count = len(images)

            # Dates
            created = p.get("created_at", "")
            updated = p.get("updated_at", "")

            all_products.append({
                "title": title,
                "price": price,
                "category": extract_tool_type(title, tags),
                "brand": extract_brand(title),
                "tags": ", ".join(tags) if tags else "",
                "image_url": image_url,
                "image_count": image_count,
                "handle": p.get("handle", ""),
                "created_at": created[:10] if created else "",
                "updated_at": updated[:10] if updated else "",
                "product_type": p.get("product_type", ""),
                "vendor": p.get("vendor", ""),
            })

        page += 1

    return all_products


def analyze_data(products):
    """Compute stats by category and brand."""
    from collections import defaultdict

    by_category = defaultdict(list)
    by_brand = defaultdict(list)

    for p in products:
        if p["price"] and p["price"] > 0:
            by_category[p["category"]].append(p["price"])
            if p["brand"] != "Unknown":
                by_brand[p["brand"]].append(p["price"])

    print(f"\n{'='*60}")
    print(f"  CATEGORY SUMMARY ({len(products)} total products)")
    print(f"{'='*60}")
    print(f"{'Category':<25} {'Count':>6} {'Median':>8} {'Mean':>8} {'Min':>8} {'Max':>8}")
    print("-" * 65)

    for cat in sorted(by_category.keys()):
        prices = sorted(by_category[cat])
        n = len(prices)
        if n == 0:
            continue
        median = prices[n // 2]
        mean = sum(prices) / n
        print(f"{cat:<25} {n:>6} ${median:>6.0f} ${mean:>6.0f} ${min(prices):>6.0f} ${max(prices):>6.0f}")

    print(f"\n{'='*60}")
    print(f"  TOP BRANDS BY VOLUME")
    print(f"{'='*60}")
    print(f"{'Brand':<25} {'Count':>6} {'Median':>8} {'Mean':>8}")
    print("-" * 50)

    for brand, prices in sorted(by_brand.items(), key=lambda x: -len(x[1]))[:20]:
        prices_sorted = sorted(prices)
        n = len(prices_sorted)
        median = prices_sorted[n // 2]
        mean = sum(prices_sorted) / n
        print(f"{brand:<25} {n:>6} ${median:>6.0f} ${mean:>6.0f}")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Jim Bode Value Guide Scraper")
    parser.add_argument("--limit", type=int, help="Max pages to scrape")
    parser.add_argument("--output", type=str, default="data", help="Output directory")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    products = scrape_jimbode(max_pages=args.limit)

    if not products:
        print("No products scraped.")
        return

    # Save CSV
    csv_path = os.path.join(args.output, "jimbode_sold.csv")
    fieldnames = ["title", "price", "category", "brand", "tags", "image_url",
                   "image_count", "handle", "created_at", "updated_at",
                   "product_type", "vendor"]
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(products)
    print(f"\n✅ CSV saved: {csv_path} ({len(products)} products)")

    # Save JSON
    json_path = os.path.join(args.output, "jimbode_sold.json")
    with open(json_path, 'w') as f:
        json.dump(products, f, indent=2)
    print(f"✅ JSON saved: {json_path}")

    # Analyze
    analyze_data(products)


if __name__ == "__main__":
    main()
