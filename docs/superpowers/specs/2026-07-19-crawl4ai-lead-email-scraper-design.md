# Crawl4AI Lead Email Scraper — Design Doc

## Goal
Install crawl4ai and build a batch email scraper that processes 328 GTA Scrub leads (dental/medical clinics) missing email addresses by crawling their websites. Also create a reusable opencode custom tool for ad-hoc URL scraping.

## Architecture

```
lead-emails.csv (input)
       │
       ▼
┌─────────────────────────────────┐
│  Python batch script            │
│  (crawl4ai AsyncWebCrawler)     │
│                                 │
│  For each lead with no email:   │
│  1. GET website homepage        │
│  2. Extract emails from page    │
│  3. Find contact/about links    │
│  4. Crawl contact page           │
│  5. Extract more emails          │
│  6. Rate-limit (1s between)     │
└─────────────────────────────────┘
       │
       ▼
scraped-emails.csv (output)
       │
       ▼
Merge back into lead-emails.csv
```

## Components

### 1. crawl4ai Installation
- `pip install crawl4ai` + `crawl4ai-setup` (Playwright browser)
- Writes to `scripts/requirements-crawl4ai.txt`

### 2. Batch Scraper Script (`scripts/email_scraper.py`)
- **Input:** `lead-emails.csv`
- **Scraping logic per site:**
  - Crawl homepage with crawl4ai `AsyncWebCrawler`
  - Extract emails from rendered markdown via regex `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
  - Find internal links matching `contact`, `about`, `team`, `reach`, `connect`
  - Crawl up to 3 internal pages for deeper email discovery
  - Filter out placeholder emails (`filler@godaddy.com`, `youremail@address.com`)
- **Concurrency:** 5 async workers with `asyncio.Semaphore`
- **Politeness:** 0.5s delay between requests per worker
- **Output:** `scraped-emails.csv` with columns `Row | Website | Found_Emails | Pages_Scraped | Status`
- **Status values:** `ok`, `no_emails_found`, `site_down`, `error`

### 3. Opencode Custom Tool (`.opencode/tools/web_scrape.ts`)
- Wraps crawl4ai Python for single-URL scraping
- Takes `url` and optional `deep` (boolean) arguments
- Returns extracted emails + page title
- Reusable for future ad-hoc tasks

### 4. Merge Back
- After batch scrape, script `scripts/merge_emails.py` reads both CSVs
- Updates `lead-emails.csv` Email column with newly found emails
- Generates `lead-emails-for-sheet.csv` in same format as existing one

## Error Handling
- 10s timeout per page crawl
- Non-2xx responses logged as `site_down`
- Invalid URLs skipped
- Progress logging every 10 sites

## Output Example
```csv
Row,Website,Found_Emails,Pages_Scraped,Status
5,https://www.mydentalcorner.ca/,info@mydentalcorner.ca,2,ok
12,http://www.drsoniasharma.com/,,3,no_emails_found
```

## Files Created
| File | Purpose |
|------|---------|
| `scripts/email_scraper.py` | Batch scrape script |
| `scripts/merge_emails.py` | Merge results back into CSV |
| `.opencode/tools/web_scrape.ts` | Reusable opencode tool |
| `scraped-emails.csv` | Output (gitignored) |

## Non-Goals
- NOT updating Google Sheet directly (CSV-based workflow only)
- NOT scraping sites that already have emails
- NOT doing deep multi-level crawling (max 4 pages/site)
