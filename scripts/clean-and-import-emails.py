#!/usr/bin/env python3
"""
Clean up scraped emails and create an importable CSV + Apps Script for sheet update.
"""
import csv
import re
import json

PLACEHOLDER_PATTERNS = [
    r'filler@', r'youremail@', r'your-email@', r'email@example',
    r'test@', r'info@example', r'admin@example', r'hello@example',
    r'name@', r'user@', r'sample@', r'demo@', r'contact@example',
    r'^\d+x\d+\.(png|jpg|jpeg|gif|svg|webp)',
    r'\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)@',
    r'@2x', r'@3x',
    r'flag@', r'flags@',
    r'img[-_].+@', r'bg[-_].+@',
    r'icon[-_].+@',
    r'logo@', r'logo[-_].+@',
    r'wp-content',
]

def is_real_email(email):
    email = email.strip().lower()
    if not email:
        return False
    for pat in PLACEHOLDER_PATTERNS:
        if re.search(pat, email):
            return False
    domain = email.split('@')[-1]
    tld = domain.split('.')[-1]
    if len(tld) < 2 or len(tld) > 6:
        return False
    if len(domain) < 5:
        return False
    if '.' not in domain:
        return False
    return True

# Read scraped results
rows = []
with open('lead-emails.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

print(f"Total scraped results: {len(rows)}")

# Clean emails
total_original = 0
total_clean = 0
for r in rows:
    raw = r['Email']
    if not raw:
        r['Clean_Email'] = ''
        continue
    emails = [e.strip() for e in raw.split(';')]
    real_emails = [e for e in emails if is_real_email(e)]
    # Deduplicate
    seen = set()
    unique = []
    for e in real_emails:
        if e not in seen:
            seen.add(e)
            unique.append(e)
    total_original += len(emails)
    total_clean += len(unique)
    r['Clean_Email'] = '; '.join(unique)

print(f"Original email entries (including junk): {total_original}")
print(f"After cleaning: {total_clean}")
print(f"Leads with at least one real email: {sum(1 for r in rows if r['Clean_Email'])}")

# Write cleaned CSV
with open('lead-emails-cleaned.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Row', 'Business Type', 'Business Name', 'Phone', 'Rating', 'Website', 'Email'])
    for r in rows:
        writer.writerow([
            r['Row'], r['Business Type'], r['Business Name'],
            r['Phone'], r['Rating'], r['Website'], r['Clean_Email']
        ])

# Write a minimal CSV for sheet import (just sheet row number and email)
# Row numbers are 1-based in the sheet, so row 2 = header is row 1
# The row numbers in our data are the actual sheet row numbers
sheet_updates = [(int(r['Row']), r['Clean_Email']) for r in rows if r['Clean_Email']]
with open('lead-emails-for-sheet.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['SheetRow', 'Email (paste to column I)'])
    for sheet_row, email in sheet_updates:
        writer.writerow([sheet_row, email])

print(f"\nCleaned CSV: lead-emails-cleaned.csv")
print(f"Sheet import CSV: lead-emails-for-sheet.csv")
print(f"Total sheet rows to update: {len(sheet_updates)}")

# Show top real emails
print("\n=== Sample Cleaned Emails ===")
count = 0
for r in rows:
    if r['Clean_Email'] and count < 20:
        print(f"  Row {r['Row']}: {r['Business Name']} -> {r['Clean_Email']}")
        count += 1
