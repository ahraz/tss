/**
 * GTA Scrub — Google Maps Lead Scraper (Google Apps Script)
 * ==========================================================
 * Reads categories and postal codes from tabs, searches Google
 * Maps Places API, appends new leads to the Results tab.
 *
 * SETUP:
 * 1. Open your sheet → Extensions → Apps Script
 * 2. Paste this entire file into the editor
 * 3. Replace GMAPS_API_KEY below with your Google Maps API key
 *    (must have Places API enabled: https://console.cloud.google.com)
 * 4. Save and run scrapeAll() once to authorize
 * 5. Optional: set up a time-driven trigger for daily scraping
 */

const SPREADSHEET_ID = '1-0wOhrEFX5EkiajX0gtNFsVSDCaPObt8rD94kQoK6XA';
const GMAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

const CATEGORIES_SHEET = 'Google Maps Categories';
const ZIPS_SHEET = 'AZ Zips';
const RESULTS_SHEET = 'Results';

// ─── MAIN ────────────────────────────────────────────────────

/** Scrape all category × postal code combinations and write to Results. */
function scrapeAll() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ── Read categories ──
  const catSheet = ss.getSheetByName(CATEGORIES_SHEET);
  const catData = catSheet.getDataRange().getValues();
  const categories = [];
  for (let i = 1; i < catData.length; i++) {
    const subcategory = catData[i][0];
    const status = catData[i][1];
    if (subcategory && status && String(status).toLowerCase() === 'active') {
      categories.push(subcategory);
    }
  }

  // ── Read postal codes ──
  const zipSheet = ss.getSheetByName(ZIPS_SHEET);
  const zipData = zipSheet.getDataRange().getValues();
  const zips = [];
  for (let i = 1; i < zipData.length; i++) {
    const zip = String(zipData[i][0] || '').trim();
    if (zip) zips.push(zip);
  }

  // ── Dedupe existing leads ──
  const resultsSheet = ss.getSheetByName(RESULTS_SHEET);
  const existingData = resultsSheet.getDataRange().getValues();
  const existingPlaceIds = new Set();
  for (let i = 1; i < existingData.length; i++) {
    const row = existingData[i];
    const placeId = row[8]; // Column I = placeId
    if (placeId) existingPlaceIds.add(String(placeId).trim());
  }

  // ── Scrape ──
  let newLeads = [];
  let totalSearched = 0;

  for (const category of categories) {
    for (const zip of zips) {
      totalSearched++;
      try {
        const results = searchPlaces(category, zip, existingPlaceIds);
        newLeads = newLeads.concat(results);
        // Small delay to avoid rate limits (50 queries/sec allowed)
        Utilities.sleep(100);
      } catch (e) {
        console.warn(`Failed: ${category} in ${zip} — ${e}`);
      }
    }
  }

  // ── Write to Results tab ──
  if (newLeads.length > 0) {
    const lastRow = resultsSheet.getLastRow();
    const rows = newLeads.map(lead => [
      lead.type,           // A
      lead.phone,          // B
      lead.businessName,   // C
      lead.types,          // D
      lead.rating,         // E
      lead.address,        // F
      lead.reviews,        // G
      lead.website,        // H
      lead.placeId,        // I (Emails)
      '',                  // J (Email page — blank, to be filled)
      '',                  // K (Call Status)
      '',                  // L (Called By)
      '',                  // M (Last Called)
      '',                  // N (Notes)
    ]);

    resultsSheet
      .getRange(lastRow + 1, 1, rows.length, rows[0].length)
      .setValues(rows);

    // Write headers if sheet was empty
    if (lastRow === 0) {
      resultsSheet.getRange(1, 1, 1, 14).setValues([[
        'type', 'phone', 'title', 'types', 'rating', 'address',
        'reviews', 'website', 'placeId', 'email', 'emailPage',
        'callStatus', 'calledBy', 'lastCalled', 'notes'
      ]]);
    }
  }

  // ── Update zip status ──
  for (const zip of zips) {
    for (let i = 1; i < zipData.length; i++) {
      if (String(zipData[i][0]).trim() === zip) {
        zipSheet.getRange(i + 1, 2).setValue('scraped');
      }
    }
  }

  console.log(
    `Done. Searched ${totalSearched} combos. ` +
    `Found ${newLeads.length} new leads. ` +
    `Total in sheet: ${existingPlaceIds.size + newLeads.length}`
  );

  return `Searched ${totalSearched} queries. Added ${newLeads.length} new leads.`;
}

// ─── PLACES API ──────────────────────────────────────────────

/** Search Google Maps for a category in a specific postal code. */
function searchPlaces(category, postalCode, existingPlaceIds) {
  const query = encodeURIComponent(
    `${category} ${postalCode} Ontario Canada`
  );
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GMAPS_API_KEY}`;

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(response.getContentText());

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status} — ${data.error_message || ''}`);
  }

  if (!data.results) return [];

  const leads = [];
  for (const place of data.results) {
    const placeId = place.place_id;
    if (existingPlaceIds.has(placeId)) continue;
    existingPlaceIds.add(placeId);

    // Get full details including website and phone
    const details = getPlaceDetails(placeId);
    const phone = details?.formatted_phone_number || '';
    const website = details?.website || '';

    leads.push({
      type: category,
      phone: phone,
      businessName: place.name,
      types: JSON.stringify(place.types || []),
      rating: String(place.rating || ''),
      address: place.formatted_address || place.vicinity || '',
      reviews: JSON.stringify(place.photos ? place.photos.length : 0), // rough count
      website: website,
      placeId: placeId,
    });
  }

  return leads;
}

/** Get detailed info for a single place. */
function getPlaceDetails(placeId) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,website&key=${GMAPS_API_KEY}`;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(response.getContentText());
    return data.result || null;
  } catch (e) {
    return null;
  }
}

// ─── MENU (adds Run button to sheet UI) ──────────────────────

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('GTA Scrub Scraper')
    .addItem('Scrape All Leads', 'scrapeAll')
    .addToUi();
}

/** Return JSON for external callers (called via Apps Script API from React app). */
function doGet(e) {
  const result = scrapeAll();
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  return doGet(e);
}
