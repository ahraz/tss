import csv
import argparse
import os

def main():
    parser = argparse.ArgumentParser(description='Merge scraped emails back into leads CSV')
    parser.add_argument('--leads', default='lead-emails.csv', help='Original leads CSV')
    parser.add_argument('--scraped', default='scraped-emails.csv', help='Scraped emails CSV')
    parser.add_argument('--output-sheet', default='lead-emails-for-sheet.csv', help='Sheet-friendly output')
    args = parser.parse_args()

    scraped_map = {}
    with open(args.scraped, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            emails = row.get('Found_Emails', '').strip()
            if emails:
                scraped_map[row['Row']] = emails

    print(f"Loaded {len(scraped_map)} rows with new emails from scraped data")

    rows = []
    with open(args.leads, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            r = row['Row'].strip()
            if r in scraped_map:
                existing = row.get('Email', '').strip()
                new_emails = scraped_map[r]
                if existing:
                    all_emails = list(dict.fromkeys([e.strip() for e in (existing + '; ' + new_emails).split(';') if e.strip()]))
                    combined = '; '.join(all_emails)
                else:
                    combined = new_emails
                row['Email'] = combined
            rows.append(row)

    tmp_file = args.leads + '.tmp'
    with open(tmp_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    os.replace(tmp_file, args.leads)

    updated = sum(1 for r in rows if r.get('Email', '').strip())
    print(f"Updated {args.leads}: {updated}/{len(rows)} rows now have emails")

    with open(args.output_sheet, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['SheetRow', 'Email (paste to column I)'])
        for row in rows:
            email = row.get('Email', '').strip()
            if email:
                writer.writerow([row['Row'], email])

    total_with_email = sum(1 for r in rows if r.get('Email', '').strip())
    print(f"Sheet output \u2192 {args.output_sheet} ({total_with_email} rows with emails)")

if __name__ == '__main__':
    main()
