# Crawl4AI Lead Email Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install crawl4ai, build a batch email scraper for 328 GTA Scrub leads missing emails, and wire it as a reusable opencode custom tool.

**Architecture:** Python batch script using crawl4ai's AsyncWebCrawler scans each lead's website (homepage + contact pages), extracts emails via regex, filters placeholders, outputs results to CSV. A merge script updates the original leads CSV. An opencode custom tool wraps the Python script for ad-hoc URL scraping.

**Tech Stack:** Python 3, crawl4ai, Playwright (bundled with crawl4ai), asyncio, opencode custom tools (TypeScript via `@opencode-ai/plugin`)

**Spec:** `docs/superpowers/specs/2026-07-19-crawl4ai-lead-email-scraper-design.md`

---

## File Structure

| File | Purpose |
|------|---------|
| `scripts/email_scraper.py` | Batch + single-URL email scraper using crawl4ai |
| `scripts/merge_emails.py` | Merge scraped results back into lead-emails.csv |
| `.opencode/tools/scrape_emails.ts` | Reusable opencode custom tool for ad-hoc URL scraping |
| `scraped-emails.csv` | Output (not committed) |
| `lead-emails-for-sheet.csv` | Updated sheet-friendly output |

---

### Task 1: Install crawl4ai and verify

**Files:**
- Create: `scripts/requirements-crawl4ai.txt`

- [ ] **Step 1: Install crawl4ai via pip**

```bash
pip install crawl4ai 2>&1 | tail -5
```

- [ ] **Step 2: Run crawl4ai setup (installs Playwright browser)**

```bash
crawl4ai-setup 2>&1 | tail -5
```

- [ ] **Step 3: Verify installation**

```bash
python3 -c "from crawl4ai import AsyncWebCrawler; print('crawl4ai OK')"
```

Expected output: `crawl4ai OK`

- [ ] **Step 4: Create requirements file for reproducibility**

Write to `scripts/requirements-crawl4ai.txt`:

```
crawl4ai>=0.9.2
```

- [ ] **Step 5: Commit**

```bash
git add scripts/requirements-crawl4ai.txt
git commit -m "chore: add crawl4ai dependency"
```

---

### Task 2: Write the batch email scraper

**Files:**
- Create: `scripts/email_scraper.py`

**Interfaces:**
- CLI: `python3 scripts/email_scraper.py [--input lead-emails.csv] [--output scraped-emails.csv] [--concurrency 5] [--single-url https://...] [--deep]`
- Batch mode output: CSV with columns `Row,Website,Found_Emails,Pages_Scraped,Status`
- Single-URL mode: stdout line with `email1; email2; email3` or empty line

- [ ] **Step 1: Write the email_scraper.py script**

```python
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
```

- [ ] **Step 2: Verify the script parses CLI args correctly**

```bash
python3 scripts/email_scraper.py --help
```

Expected: shows usage with all arguments

- [ ] **Step 3: Quick smoke test with a known URL**

```bash
python3 scripts/email_scraper.py --single-url "http://www.bovairddental.ca/"
```

Expected: prints email(s) found or empty line

- [ ] **Step 4: Commit**

```bash
git add scripts/email_scraper.py
git commit -m "feat: add crawl4ai email scraper script"
```

---

### Task 3: Write the merge script

**Files:**
- Create: `scripts/merge_emails.py`

**Interfaces:**
- CLI: `python3 scripts/merge_emails.py [--leads lead-emails.csv] [--scraped scraped-emails.csv]`
- Updates `lead-emails.csv` in-place (Email column)
- Writes `lead-emails-for-sheet.csv`

- [ ] **Step 1: Write merge_emails.py**

```python
import csv
import argparse

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
                    combined = f"{existing}; {new_emails}"
                else:
                    combined = new_emails
                row['Email'] = combined
            rows.append(row)

    with open(args.leads, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

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
    print(f"Sheet output → {args.output_sheet} ({total_with_email} rows with emails)")

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Verify script works (dry run with current CSV)**

```bash
python3 scripts/merge_emails.py --help
```

Expected: shows usage

- [ ] **Step 3: Commit**

```bash
git add scripts/merge_emails.py
git commit -m "feat: add merge script for scraped emails"
```

---

### Task 4: Create opencode custom tool

**Files:**
- Create: `.opencode/tools/scrape_emails.ts`

**Interfaces:**
- Tool name: `scrape_emails`
- Args: `url` (string, required), `deep` (boolean, default false)
- Returns: string with found emails (semicolon-separated) or "No emails found"

- [ ] **Step 1: Create `.opencode/tools/` directory**

```bash
mkdir -p /home/ahrazmalik/Documents/New\ OpenCode\ Project/.opencode/tools
```

- [ ] **Step 2: Write scrape_emails.ts**

```typescript
import { tool } from "@opencode-ai/plugin"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"

const exec = promisify(execFile)

export default tool({
  description: "Scrape a URL for email addresses using crawl4ai. Crawls the page and optionally follows contact/about links for deeper extraction.",
  args: {
    url: tool.schema.string().describe("The URL to scrape for emails"),
    deep: tool.schema.boolean().default(false).describe("Follow contact/about links for deeper extraction"),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, "scripts", "email_scraper.py")
    const pythonArgs = [script, "--single-url", args.url]
    if (args.deep) pythonArgs.push("--deep")

    try {
      const { stdout } = await exec("python3", pythonArgs, {
        cwd: context.worktree,
        timeout: 30000,
      })
      const result = stdout.trim()
      return result || "No emails found"
    } catch (err: any) {
      return `Error: ${err.message}`
    }
  },
})
```

- [ ] **Step 3: Verify the tool file is syntactically valid**

```bash
python3 -c "
import ast
# TypeScript can't be validated with Python, but we check the .opencode dir exists
import os
print('.opencode/tools/ exists:', os.path.isdir('.opencode/tools'))
print('scrape_emails.ts exists:', os.path.isfile('.opencode/tools/scrape_emails.ts'))
"
```

- [ ] **Step 4: Commit**

```bash
git add .opencode/tools/scrape_emails.ts
git commit -m "feat: add scrape_emails opencode custom tool"
```

---

### Task 5: Run batch scrape and verify

**Files:**
- No new files. Execute and verify.

- [ ] **Step 1: Run the batch scraper against all 328 missing-email leads**

```bash
python3 scripts/email_scraper.py --input lead-emails.csv --output scraped-emails.csv --concurrency 5
```

Expected: runs through all 328 URLs, outputs progress every 10, writes `scraped-emails.csv`

- [ ] **Step 2: Inspect results**

```bash
python3 -c "
import csv
with open('scraped-emails.csv') as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    ok = sum(1 for r in rows if r['Status'] == 'ok')
    no_emails = sum(1 for r in rows if r['Status'] == 'no_emails_found')
    errors = sum(1 for r in rows if r['Status'] != 'ok' and r['Status'] != 'no_emails_found')
    print(f'Total: {len(rows)}, Emails found: {ok}, No emails: {no_emails}, Errors: {errors}')
    print()
    print('Samples with emails:')
    for r in rows[:5]:
        if r['Found_Emails']:
            print(f'  Row {r[\"Row\"]}: {r[\"Found_Emails\"]}')
"
```

- [ ] **Step 3: Merge scraped emails back into leads CSV**

```bash
python3 scripts/merge_emails.py --leads lead-emails.csv --scraped scraped-emails.csv
```

Expected: updates `lead-emails.csv` and writes `lead-emails-for-sheet.csv`

- [ ] **Step 4: Verify merge results**

```bash
python3 -c "
import csv
with open('lead-emails.csv') as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    total = len(rows)
    with_email = sum(1 for r in rows if r.get('Email', '').strip())
    print(f'Total leads: {total}')
    print(f'With email: {with_email}')
    print(f'Still missing: {total - with_email}')
"
```

Expected: `With email` count should be significantly higher (original was ~577, now should be much closer to 905)
