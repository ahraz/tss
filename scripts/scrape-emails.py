#!/usr/bin/env python3
"""
GTA Scrub — Email Scraper for Lead Websites
=============================================
Reads leads from the Google Sheet, scrapes each website for email
addresses, and writes results back to the sheet and a CSV file.

Usage:
  python3 scripts/scrape-emails.py [--workers 20] [--output emails.csv]
"""

import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, urljoin

SPREADSHEET_ID = '1-0wOhrEFX5EkiajX0gtNFsVSDCaPObt8rD94kQoK6XA'
SHEET_NAME = 'Results'

# Email regex
EMAIL_RE = re.compile(r'[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}')
# Skip emails from these domains (placeholders, common no-reply, etc.)
SKIP_DOMAINS = {
    'example.com', 'domain.com', 'yourdomain.com', 'email.com',
    'mail.com', 'test.com', 'demo.com',
}
SKIP_PREFIXES = ('noreply', 'no-reply', 'donotreply', 'do-not-reply')

CONTACT_PATHS = ['', '/contact', '/contact-us', '/contactus', '/about', '/about-us',
                 '/aboutus', '/get-in-touch', '/reach-us', '/contact.php',
                 '/contact.html', '/support', '/en/contact', '/contact/',
                 '/page/contact']


def is_usable_email(email):
    email = email.strip().lower()
    if not email:
        return False
    domain = email.split('@')[-1] if '@' in email else ''
    if domain in SKIP_DOMAINS:
        return False
    prefix = email.split('@')[0] if '@' in email else ''
    if prefix.startswith(SKIP_PREFIXES):
        return False
    if '.' not in domain:
        return False
    return True


def fetch_url(url, timeout=8):
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-CA,en;q=0.9',
        }
    )
    resp = urllib.request.urlopen(req, timeout=timeout)
    content_type = resp.headers.get('Content-Type', '')
    if 'text/html' not in content_type and 'application/xhtml' not in content_type:
        raise ValueError(f"Not HTML: {content_type}")
    return resp.read().decode('utf-8', errors='replace')


def extract_emails_from_html(html, base_url):
    emails = set()
    for match in EMAIL_RE.finditer(html):
        email = match.group(0)
        if is_usable_email(email):
            # Decode common obfuscation
            email = email.replace('[at]', '@').replace('[dot]', '.').replace(' AT ', '@').replace(' DOT ', '.')
            email = email.replace('(at)', '@').replace('(dot)', '.')
            emails.add(email.lower())
    return emails


def scrape_website(business_name, website):
    if not website or not website.strip():
        return []

    website = website.strip().split('?')[0].split('#')[0]
    if not website.startswith('http'):
        website = 'https://' + website

    parsed = urlparse(website)
    if not parsed.netloc:
        return []

    base_url = f"{parsed.scheme}://{parsed.netloc}"
    found_emails = set()

    for path in CONTACT_PATHS:
        url = urljoin(base_url, path) if path else base_url
        try:
            html = fetch_url(url, timeout=6)
            emails = extract_emails_from_html(html, url)
            found_emails.update(emails)
            if emails:
                break
        except Exception:
            continue

    return sorted(found_emails)


def read_sheet_data():
    url = (f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/"
           f"gviz/tq?tqx=out:csv&sheet={SHEET_NAME}&tq=select+A,B,C,E,F,H,O")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    resp = urllib.request.urlopen(req, timeout=30)
    content = resp.read().decode("utf-8")
    reader = csv.reader(content.splitlines())
    headers = next(reader)
    rows = list(reader)
    return headers, rows


def write_sheet_data(rows_with_emails):
    """
    Write emails back to column I (email) in the sheet using batch update.
    We need to use the Google Sheets API with the same OAuth approach.
    """
    print("\nTo write emails back to the sheet, you need to use the TSS app.")
    print("The emails CSV has been saved — you can import it from the Leads page.")
    print("Or manually copy column I from the CSV into the Results sheet.\n")


def main():
    parser = argparse.ArgumentParser(description='Scrape emails for lead websites')
    parser.add_argument('--workers', type=int, default=20, help='Number of concurrent workers')
    parser.add_argument('--output', type=str, default='lead-emails.csv', help='Output CSV file')
    parser.add_argument('--resume', type=str, help='Resume from existing results CSV')
    args = parser.parse_args()

    print("=== GTA Scrub Email Scraper ===\n")

    # Read sheet data
    print("Reading leads from Google Sheet...")
    headers, rows = read_sheet_data()
    print(f"Found {len(rows)} leads\n")

    # Build lead list
    leads = []
    for i, row in enumerate(rows):
        business_name = row[2].strip() if len(row) > 2 else ''
        website = row[5].strip() if len(row) > 5 else ''
        row_index = i + 2  # 1-based + header
        leads.append({
            'row_index': row_index,
            'type': row[0].strip() if len(row) > 0 else '',
            'phone': row[1].strip() if len(row) > 1 else '',
            'business_name': business_name,
            'rating': row[3].strip() if len(row) > 3 else '',
            'website': website,
        })

    # Filter to leads with websites (skip placeholder row)
    to_scrape = [l for l in leads if l['website'] and l['business_name'] != 's']
    print(f"Leads with websites to scrape: {len(to_scrape)}")
    print(f"Leads without websites: {len(leads) - len(to_scrape)}\n")

    # Scrape
    results = []
    scraped = 0
    found_count = 0
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_map = {
            executor.submit(scrape_website, l['business_name'], l['website']): l
            for l in to_scrape
        }

        for future in as_completed(future_map):
            lead = future_map[future]
            scraped += 1
            try:
                emails = future.result()
                if emails:
                    found_count += 1
                    results.append({
                        **lead,
                        'emails': '; '.join(emails),
                    })
                    if found_count <= 3:
                        print(f"  FOUND: {lead['business_name']} -> {emails[0]}")
                else:
                    results.append({**lead, 'emails': ''})

                if scraped % 50 == 0:
                    elapsed = time.time() - start_time
                    rate = scraped / elapsed if elapsed > 0 else 0
                    print(f"\n  Progress: {scraped}/{len(to_scrape)} ({found_count} with emails) "
                          f"@ {rate:.1f}/sec\n")

            except Exception as e:
                results.append({**lead, 'emails': ''})
                if scraped % 100 == 0:
                    print(f"  Error on {lead['business_name']}: {e}")

    elapsed = time.time() - start_time
    print(f"\n=== Done in {elapsed:.0f}s ===")
    print(f"Scraped: {scraped}")
    print(f"Found emails: {found_count}/{scraped} ({found_count/scraped*100:.1f}%)")

    # Write CSV
    output_path = args.output
    with open(output_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Row', 'Business Type', 'Business Name', 'Phone', 'Rating', 'Website', 'Email'])
        for r in sorted(results, key=lambda x: x['row_index']):
            writer.writerow([
                r['row_index'], r['type'], r['business_name'],
                r['phone'], r['rating'], r['website'], r['emails']
            ])
    print(f"\nResults saved to: {output_path}")

    # Show summary
    print("\n=== Sample Results (first 20 with emails) ===")
    count = 0
    for r in sorted(results, key=lambda x: x['row_index']):
        if r['emails'] and count < 20:
            print(f"  Row {r['row_index']}: {r['business_name']}")
            print(f"    Website: {r['website']}")
            print(f"    Email(s): {r['emails']}")
            print()
            count += 1

    write_sheet_data(results)

    return results


if __name__ == '__main__':
    main()
