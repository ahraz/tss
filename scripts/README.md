# GTA Scrub — Google Maps Lead Scraper

## Setup (one-time)

### 1. Add your Google Maps API key

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an API Key with **Places API** enabled
3. Open `scripts/gmaps-scraper.gs` and replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your key

### 2. Deploy the Apps Script

1. Open your lead sheet: https://docs.google.com/spreadsheets/d/1-0wOhrEFX5EkiajX0gtNFsVSDCaPObt8rD94kQoK6XA
2. Go to Extensions → Apps Script
3. Paste the entire contents of `scripts/gmaps-scraper.gs`
4. Replace the API key in the script editor
5. Click **Save** → **Run** → select `onOpen` → Authorize
6. Close the script editor

### 3. Deploy as Web App (for in-app trigger)

1. In the Apps Script editor: Deploy → New Deployment
2. Type: Web App
3. Execute as: Me
4. Who has access: Anyone
5. Deploy → Copy the URL
6. Paste the URL in the Leads page under Settings → **Scraper Web App URL**

### 4. Add postal codes to scrape

The scraper reads from the "AZ Zips" tab. Add postal code FSAs or full codes you want to target:

| A | B |
|---|---|
| L6X | |
| L6S | |
| L6T | |
| L6P | |
| N6G | |

The script searches each category × each postal code combination.

## Usage

**From the sheet (after step 2):**
- Sheet menu → GTA Scrub Scraper → Scrape All Leads

**From the Leads page (after step 3):**
- Click "Scrape Leads" button in the Leads tab

## How it works

1. Reads active categories from "Google Maps Categories" tab
2. Reads postal codes from "AZ Zips" tab
3. For each category × postal code: searches Google Maps Places API
4. Deduplicates against existing leads by `placeId`
5. Appends new leads to "Results" tab
6. Marks postal codes as "scraped"

No duplicates. Results land in the same format as your existing leads. Refresh from Sheets in the app to see new leads.
