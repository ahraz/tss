import asyncio
import csv
import re
import argparse
from urllib.parse import urljoin
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

PLACEHOLDER_PATTERNS = [
    'filler@', 'youremail@', 'email@', 'your@', 'test@', 'example@',
    'admin@domain.com', 'info@domain.com', 'contact@domain.com',
]

CONTACT_PATHS = ['/contact', '/contact-us', '/about', '/about-us', '/reach-us', '/locations']

def is_valid_email(email):
    lower = email.lower()
    for pattern in PLACEHOLDER_PATTERNS:
        if lower.startswith(pattern):
            return False
    return True

def extract_emails(text):
    return list(set(e for e in EMAIL_REGEX.findall(text) if is_valid_email(e)))

async def scrape_site(crawler, row_num, url, semaphore, deep=False):
    async with semaphore:
        try:
            config = CrawlerRunConfig(cache_mode=CacheMode.DISABLED)
            result = await crawler.arun(url=url, config=config)
            if not result.success:
                return row_num, url, [], 0, 'site_down'

            all_emails = []
            pages_scraped = 0

            page_text = str(getattr(result, 'markdown', '') or '')
            emails = extract_emails(page_text)
            all_emails.extend(emails)
            pages_scraped += 1

            if deep:
                discovered = []
                for path in CONTACT_PATHS:
                    discovered.append(urljoin(url, path))

                for contact_url in discovered[:2]:
                    await asyncio.sleep(0.3)
                    sub_result = await crawler.arun(url=contact_url, config=config)
                    if sub_result.success:
                        sub_text = str(getattr(sub_result, 'markdown', '') or '')
                        sub_emails = extract_emails(sub_text)
                        all_emails.extend(sub_emails)
                        pages_scraped += 1

            unique_emails = list(set(all_emails))
            status = 'ok' if unique_emails else 'no_emails_found'
            return row_num, url, unique_emails, pages_scraped, status

        except Exception as e:
            return row_num, url, [], 0, f'error'

async def batch_scrape(args):
    leads = []
    with open(args.input, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            leads.append(row)

    targets = []
    for row in leads:
        website = row.get('Website', '').strip()
        email = row.get('Email', '').strip()
        row_num = row.get('Row', '').strip()
        if website and not email:
            targets.append((row_num, website))

    print(f"Total leads: {len(leads)}, targets to scrape: {len(targets)}")

    browser_config = BrowserConfig(headless=True, verbose=False)
    semaphore = asyncio.Semaphore(args.concurrency)
    results = []

    async with AsyncWebCrawler(config=browser_config) as crawler:
        tasks = [scrape_site(crawler, rn, u, semaphore, deep=False) for rn, u in targets]

        for i, coro in enumerate(asyncio.as_completed(tasks)):
            row_num, url, emails, pages, status = await coro
            results.append({
                'Row': row_num,
                'Website': url,
                'Found_Emails': '; '.join(emails),
                'Pages_Scraped': pages,
                'Status': status,
            })
            if (i + 1) % 10 == 0:
                print(f"  Progress: {i + 1}/{len(targets)}")

    with open(args.output, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['Row', 'Website', 'Found_Emails', 'Pages_Scraped', 'Status'])
        writer.writeheader()
        writer.writerows(results)

    found = sum(1 for r in results if r['Status'] == 'ok')
    print(f"Done: {found}/{len(targets)} sites yielded emails → {args.output}")

async def single_url(url, deep=False):
    browser_config = BrowserConfig(headless=True, verbose=False)
    async with AsyncWebCrawler(config=browser_config) as crawler:
        _, _, emails, _, _ = await scrape_site(crawler, '0', url, asyncio.Semaphore(1), deep=deep)
        if emails:
            print('; '.join(emails))
        else:
            print('')

def main():
    parser = argparse.ArgumentParser(description='Scrape websites for email addresses')
    parser.add_argument('--input', default='lead-emails.csv', help='Input CSV with leads')
    parser.add_argument('--output', default='scraped-emails.csv', help='Output CSV with found emails')
    parser.add_argument('--concurrency', type=int, default=5, help='Number of concurrent scrapes')
    parser.add_argument('--single-url', help='Scrape a single URL instead of batch')
    parser.add_argument('--deep', action='store_true', help='Follow contact/about links')
    args = parser.parse_args()

    if args.single_url:
        asyncio.run(single_url(args.single_url, args.deep))
    else:
        asyncio.run(batch_scrape(args))

if __name__ == '__main__':
    main()
