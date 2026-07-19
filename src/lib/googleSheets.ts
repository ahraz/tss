// ============================================================
// GTA Scrub — Google Sheets API Service
// ============================================================
// Handles OAuth token management and Sheets API read/write
// for the Leads Call Center feature.
// ============================================================

import type { Lead } from '../types';

// ─── Configuration ──────────────────────────────────────────

const CLIENT_ID = '1065566722892-0qq7pm931g6cnd4l2e5emtigt4r0jqr3.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const SPREADSHEET_ID = '1-0wOhrEFX5EkiajX0gtNFsVSDCaPObt8rD94kQoK6XA';
const SHEET_NAME = 'Results';

// Column registry — single source of truth
const COLUMNS: Record<string, { index: number; label: string }> = {
  A: { index: 0,  label: 'Business Type' },
  B: { index: 1,  label: 'Phone' },
  C: { index: 2,  label: 'Business Name' },
  D: { index: 3,  label: 'Google Types' },
  E: { index: 4,  label: 'Rating' },
  F: { index: 5,  label: 'Address' },
  G: { index: 6,  label: 'Reviews' },
  H: { index: 7,  label: 'Website' },
  I: { index: 8,  label: 'Email' },
  J: { index: 9,  label: 'GPS Coordinates' },
  K: { index: 10, label: 'Call Status' },     // legacy
  L: { index: 11, label: 'Called By' },        // legacy
  M: { index: 12, label: 'Last Called' },      // legacy
  N: { index: 13, label: 'Notes' },            // legacy
  O: { index: 14, label: 'Place ID' },
  P: { index: 15, label: 'Current Cleaner' },
  Q: { index: 16, label: 'Competitor Notes' },
  R: { index: 17, label: 'Last Contacted' },
};

// ─── Module-level state ─────────────────────────────────────

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiresAt = 0;
let headersEnsured = false;
let gisReady = false;

// ─── Init ───────────────────────────────────────────────────

/** Wait for the GIS (Google Identity Services) library to load */
export function waitForGis(): Promise<void> {
  return new Promise((resolve) => {
    if (gisReady) { resolve(); return; }
    const check = () => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        gisReady = true;
        resolve();
      } else {
        setTimeout(check, 200);
      }
    };
    check();
  });
}

/** Initialize the GIS token client */
export function initTokenClient(): void {
  if (tokenClient) return;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.access_token) {
        accessToken = resp.access_token;
        tokenExpiresAt = Date.now() + ((resp.expires_in ?? 3600) - 300) * 1000;
      }
    },
  });
}

// ─── Token Management ───────────────────────────────────────

/** Get a valid access token, refreshing silently if needed */
export async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;

  // Token missing or expired — try silent refresh
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('NEEDS_AUTH')); return; }

    const timeout = setTimeout(() => reject(new Error('NEEDS_AUTH')), 10000);
    tokenClient.callback = (resp) => {
      clearTimeout(timeout);
      if (resp.access_token) {
        accessToken = resp.access_token;
        tokenExpiresAt = Date.now() + ((resp.expires_in ?? 3600) - 300) * 1000;
        resolve(accessToken);
      } else {
        reject(new Error('NEEDS_AUTH'));
      }
    };
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

/** Request user sign-in (triggers the OAuth popup) */
export async function signIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) reject(new Error('Token client not initialized'));
    tokenClient!.callback = (resp) => {
      if (resp.access_token) {
        accessToken = resp.access_token;
        tokenExpiresAt = Date.now() + ((resp.expires_in ?? 3600) - 300) * 1000;
        resolve(accessToken!);
      } else {
        reject(new Error(resp.error || 'Sign-in failed'));
      }
    };
    tokenClient!.requestAccessToken({ prompt: 'consent' });
  });
}

/** Check whether we have a valid token */
export function isSignedIn(): boolean {
  return !!accessToken;
}

// ─── Sheets API Calls ───────────────────────────────────────

/**
 * Ensure all header columns (A-O) exist in the Results sheet.
 * Runs once per session.
 */
export async function ensureHeaderColumns(): Promise<void> {
  if (headersEnsured) return;
  const token = await getAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!1:1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  const existingHeaders: string[] = data.values?.[0] || [];

  const updates: { range: string; value: string }[] = [];
  for (const [letter, col] of Object.entries(COLUMNS)) {
    if (!existingHeaders[col.index] || existingHeaders[col.index] !== col.label) {
      updates.push({ range: `${SHEET_NAME}!${letter}1`, value: col.label });
    }
  }

  if (updates.length === 0) { headersEnsured = true; return; }

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updates.map(u => ({ range: u.range, values: [[u.value]] })),
      }),
    }
  );
  headersEnsured = true;
}

/** Fetch all leads from the "Results" tab */
export async function fetchLeadsFromSheet(): Promise<Lead[]> {
  await waitForGis();
  initTokenClient();

  // If we don't have a token, throw so the UI can show the connect button
  if (!isSignedIn()) {
    throw new Error('NEEDS_AUTH');
  }

  const token = await getAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:R`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    if (response.status === 401) throw new Error('NEEDS_AUTH');
    throw new Error(`Sheets API error: ${response.status}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];
  const leads: Lead[] = [];

  // Skip header row (row 0), start from row 2 (1-based = row 2)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty rows
    if (!row || row.every(c => !c?.trim())) continue;

    leads.push({
      rowIndex: i + 1, // 1-based row number in the sheet
      type: row[COLUMNS.A.index] || '',
      phone: row[COLUMNS.B.index] || '',
      businessName: row[COLUMNS.C.index] || '',
      types: row[COLUMNS.D.index] || '',
      rating: row[COLUMNS.E.index] || '',
      address: row[COLUMNS.F.index] || '',
      reviews: row[COLUMNS.G.index] || '',
      website: row[COLUMNS.H.index] || '',
      email: row[COLUMNS.I.index]?.trim() || undefined,
      gpsCoordinates: row[COLUMNS.J.index] || '',
      placeId: row[COLUMNS.O.index] || String(i + 1),
      currentCleaner: row[COLUMNS.P.index]?.trim() || undefined,
      competitorNotes: row[COLUMNS.Q.index]?.trim() || undefined,
      lastContactedAt: row[COLUMNS.R.index]?.trim() || undefined,
    });
  }

  // Ensure header columns exist (async, non-blocking)
  ensureHeaderColumns().catch(() => {});

  return leads;
}

const CATEGORIES = [
  'Dental Clinic',
  'Medical Center',
  'Physiotherapy Clinic',
  'Veterinary Clinic',
  'Law Firm',
  'Accounting Office',
  'Real Estate Agency',
  'Insurance Agency',
  'Daycare Center',
  'Gym / Fitness Center',
  'Beauty Salon & Spa',
  'Optometry Clinic',
  'Pharmacy',
  'Chiropractic Clinic',
  'Funeral Home',
  'Auto Dealership',
  'Private School / Tutoring',
];

export async function syncCategoriesToSheet(): Promise<void> {
  const token = await getAccessToken();

  // Clear the sheet first, then write categories
  const values = CATEGORIES.map(c => [c, 'Active']);
  values.unshift(['Subcategory', 'STATUS']); // header

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Google+Maps+Categories!A:B?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: 'Google Maps Categories!A:B', majorDimension: 'ROWS', values }),
    }
  );
}

const PLACES_API_KEY = 'AIzaSyD1pPF75uPs0zG9ys4cY5Y9mdZfIwJoAxY';
const PLACES_API_BASE = 'https://places.googleapis.com/v1/places';

interface PlaceResult {
  name: string;
  place_id: string;
  formatted_address?: string;
  vicinity?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  business_status?: string;
  /** New Places API field names */
  id?: string;
  displayName?: { text: string };
  formattedAddress?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  primaryTypeDisplayName?: { text: string };
  location?: { latitude: number; longitude: number };
}

async function fetchSheetValues(token: string, range: string): Promise<string[][]> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

async function fetchPlaceDetails(placeId: string): Promise<{ phone: string; website: string; reviews: string }> {
  try {
    const res = await fetch(
      `${PLACES_API_BASE}/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': 'internationalPhoneNumber,websiteUri,reviews',
        },
      }
    );
    const data = await res.json();
    const reviews = (data.reviews || []).map((r: Record<string, unknown>) => ({
      name: (r.name as string) || '',
      rating: r.rating as number,
      text: (r.text as string) || (r.originalText as { text: string; languageCode: string }) || { text: '', languageCode: 'en' },
      authorAttribution: r.authorAttribution || {},
      publishTime: (r.publishTime as string) || '',
      relativePublishTimeDescription: (r.relativePublishTimeDescription as string) || '',
    }));
    return {
      phone: data.internationalPhoneNumber || '',
      website: data.websiteUri || '',
      reviews: JSON.stringify(reviews),
    };
  } catch { return { phone: '', website: '', reviews: '[]' }; }
}

async function searchPlaces(query: string): Promise<{ places: PlaceResult[]; total: number }> {
  const body: Record<string, unknown> = { textQuery: query, maxResultCount: 20 };
  const res = await fetch(
    `${PLACES_API_BASE}:searchText`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.location',
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  console.log('[scraper] results:', data.places?.length || 0, 'error:', data.error?.message || 'none');
  if (!data.places) return { places: [], total: 0 };
  return {
    places: data.places.map((p: Record<string, unknown>) => ({
      id: p.id as string,
      name: ((p.displayName as { text?: string })?.text) || '',
      place_id: (p.id as string) || '',
      formatted_address: (p.formattedAddress as string) || '',
      rating: p.rating as number,
      userRatingCount: (p.userRatingCount as number) || 0,
      types: p.types as string[] || [],
      location: p.location as { latitude: number; longitude: number },
    })),
    total: data.places.length,
  };
}

export interface ScrapeResult {
  searched: number;
  added: number;
  existing: number;
}

export async function scrapeLeadsFromMaps(
  onProgress: (msg: string) => void
): Promise<ScrapeResult> {
  const token = await getAccessToken();

  // Read categories
  onProgress('Reading categories...');
  const catRows = await fetchSheetValues(token, 'Google+Maps+Categories!A:B');
  const categories: string[] = [];
  for (let i = 1; i < catRows.length; i++) {
    const name = catRows[i][0];
    const status = String(catRows[i][1] || '').toLowerCase();
    if (name && status === 'active') categories.push(name);
  }

  // Read zips with their status
  onProgress('Reading postal codes...');
  const zipRows = await fetchSheetValues(token, 'AZ+Zips!A:B');
  const zips: { code: string; status: string; row: number }[] = [];
  for (let i = 1; i < zipRows.length; i++) {
    const code = String(zipRows[i][0] || '').trim();
    const status = String(zipRows[i][1] || '').trim().toLowerCase();
    if (code) zips.push({ code, status, row: i + 1 }); // row is 1-indexed for sheet
  }

  // Read existing business names for bulletproof dedup
  onProgress('Checking existing leads...');
  const resultsRows = await fetchSheetValues(token, 'Results!A:R');
  const seenKeys = new Set<string>();
  for (let i = 1; i < resultsRows.length; i++) {
    const name = String(resultsRows[i][COLUMNS.C.index] || '').toLowerCase().trim();
    const address = String(resultsRows[i][COLUMNS.F.index] || '');
    const city = address.split(',')[1]?.trim().toLowerCase() || '';
    if (name) seenKeys.add(`${name}|${city}`);
  }

  // Scrape
  const newRows: (string | null)[][] = [];
  let searched = 0;
  const zipUpdates: { row: number; status: string }[] = [];

  for (const zip of zips) {
    const skipMsg = zip.status === 'complete' ? ' (skipped — already complete)' : zip.status === 'scraped' ? ' (retrying — was partial)' : '';
    onProgress(`Processing ${zip.code}${skipMsg}...`);

    if (zip.status === 'complete') {
      searched += categories.length;
      continue;
    }

    let maxThisZip = 0;
    let newThisZip = 0;

    for (const category of categories) {
      searched++;
      onProgress(`Searching: ${category} in ${zip.code} (${searched}/${zips.length * categories.length})`);
      try {
        const { places, total } = await searchPlaces(`${category} ${zip.code}`);
        if (total > maxThisZip) maxThisZip = total;
        for (const place of places) {
          const nameKey = place.name.toLowerCase().trim();
          const city = (place.formatted_address || '').split(',')[1]?.trim().toLowerCase() || '';
          const dedupKey = `${nameKey}|${city}`;
          if (seenKeys.has(dedupKey)) continue;
          seenKeys.add(dedupKey);
          newThisZip++;

          const details = await fetchPlaceDetails(place.place_id);
          await new Promise(r => setTimeout(r, 200)); // rate limit

          const gps = place.location
            ? JSON.stringify({ latitude: place.location.latitude, longitude: place.location.longitude })
            : '';

          newRows.push([
            category,                                // A: type
            details.phone,                           // B: phone
            place.name,                              // C: title
            JSON.stringify(place.types || []),       // D: types
            String(place.rating || ''),              // E: rating
            place.formatted_address || '',           // F: address
            details.reviews,                         // G: reviews (JSON array)
            details.website,                         // H: website
            null,                                    // I: email (empty — user fills later)
            gps,                                     // J: gpsCoordinates
            null, null, null, null,                   // K-N: legacy tracking (not used)
            place.place_id,                           // O: stable Google Maps place_id
            null, null, null,                          // P-R: new intel fields
          ]);
        }
      } catch (e) {
        console.warn(`Failed: ${category} in ${zip.code}`, e);
      }
    }

    // Track zip completion status — use new leads added, not API total
    if (newThisZip === 0 && maxThisZip < 20) {
      zipUpdates.push({ row: zip.row, status: 'complete' });
    } else if (newThisZip > 0) {
      zipUpdates.push({ row: zip.row, status: 'partial' });
    }
  }

  // Write zip statuses first — so if the rows write fails, zips aren't left active
  if (zipUpdates.length > 0) {
    for (const u of zipUpdates) {
      try {
        const range = `'AZ Zips'!B${u.row}`;
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ range, majorDimension: 'ROWS', values: [[u.status]] }),
          }
        );
      } catch (e) {
        console.warn(`Failed to update status for row ${u.row}:`, e);
      }
    }
    onProgress(`Updated ${zipUpdates.length} zip statuses`);
  }

  // Write to Results tab
  if (newRows.length > 0) {
    onProgress(`Writing ${newRows.length} new leads...`);
    const lastRow = resultsRows.length; // already has header at row 0
    const range = `Results!A${lastRow + 1}:R${lastRow + newRows.length}`;

    let retries = 3;
    while (retries > 0) {
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ range, majorDimension: 'ROWS', values: newRows }),
          }
        );
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        await new Promise(r => setTimeout(r, 2000));
        console.warn(`Rows write failed, retrying (${retries} left):`, e);
      }
    }
  }

  onProgress(`Done. ${newRows.length} new leads added.`);
  return { searched, added: newRows.length, existing: seenKeys.size };
}

/** Reset AZ Zips statuses to 'active' and clear Firestore leads for a fresh scrape */
export async function resetAllForRescrape(): Promise<void> {
  const token = await getAccessToken();

  // Read all AZ Zips
  const zipRows = await fetchSheetValues(token, 'AZ+Zips!A:A');
  const updates: { row: number }[] = [];
  for (let i = 1; i < zipRows.length; i++) {
    const code = String(zipRows[i][0] || '').trim();
    if (code) updates.push({ row: i + 1 });
  }

  // Reset each zip to 'active'
  for (const u of updates) {
    try {
      const range = `'AZ Zips'!B${u.row}`;
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ range, majorDimension: 'ROWS', values: [['active']] }),
        }
      );
    } catch (e) {
      console.warn(`Failed to reset zip row ${u.row}:`, e);
    }
  }
}

export async function backfillPlaceIds(
  onProgress: (msg: string) => void
): Promise<{ updated: number }> {
  const token = await getAccessToken();
  onProgress('Reading leads...');
  const rows = await fetchSheetValues(token, 'Results!A:R');

  // Build updates in batches of 50
  const updates: { row: number; placeId: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const existing = (row[14] || '').trim();
    if (existing) continue;

    const reviews = (row[6] || '').toString();
    const match = reviews.match(/places\/(ChIJ[^/]+)\/reviews/);
    if (!match) continue;

    updates.push({ row: i + 1, placeId: match[1] });
  }

  if (updates.length === 0) {
    onProgress('No place IDs to backfill');
    return { updated: 0 };
  }

  // Write in batches
  let updated = 0;
  const BATCH_SIZE = 50;
  for (let b = 0; b < updates.length; b += BATCH_SIZE) {
    const batch = updates.slice(b, b + BATCH_SIZE);
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            valueInputOption: 'RAW',
            data: batch.map(u => ({
              range: `Results!O${u.row}`,
              values: [[u.placeId]],
            })),
          }),
        }
      );
      updated += batch.length;
      onProgress(`Backfilled ${updated}/${updates.length}...`);
    } catch (e) {
      console.warn(`Batch failed at ${b}:`, e);
    }
    if (b + BATCH_SIZE < updates.length) {
      await new Promise(r => setTimeout(r, 1000)); // rate limit buffer
    }
  }

  onProgress(`Backfilled ${updated} place IDs`);
  return { updated };
}



// ─── Email Import (temporary) ───────────────────────────────

const SCRAPED_EMAILS: [number, string][] = [
  [3, "bddentalmanager@gmail.com; bgdentalmanager@gmail.com"],
  [4, "smiles@905dental.ca"],
  [6, "info@mavisbristoldental.com"],
  [7, "20toothlandoffice@gmail.com; toothlandoffice@gmail.com"],
  [8, "info@bramptonfamilydental.com"],
  [10, "20smile@rosedaledentalcare.com; info@campbellvilledentistry.ca; smile@rosedaledentalcare.com"],
  [11, "info@mountpleasantdentalclinic.ca"],
  [13, "latenightdental@gmail.com"],
  [14, "info@mayfielddental.com"],
  [15, "fletchersmeadows@gmail.com"],
  [16, "smilehousedentistry@gmail.com"],
  [17, "info@providencedentalcenter.ca; info@providencedentalcenter.ca"],
  [18, "sharingsmiles32@gmail.com"],
  [19, "info@polarisdental.ca"],
  [20, "reception@alidentistry.com"],
  [24, "info@williamsparkwaymedical.com; royalwestrx@gmail.com; williamsparkwaymedical@gmail.com"],
  [32, "info@royalwestmedical.ca"],
  [36, "info@royalwestmedical.ca"],
  [43, "brampton@lifemark.ca; brampton@lifemark.ca"],
  [44, "paramountphysio@bellnet.ca"],
  [47, "mybramptonphysio@gmail.com; mybramptonphysio@gmail.com"],
  [48, "info@physiorehabcenter.com; info@prgbrampton.ca"],
  [49, "admin.fw@careplusphysio.ca; admin.jp@careplusphysio.ca; admin.pd@careplusphysio.ca; admin.ya@careplusphysio.ca; bg-discover-ease-in-movement@2x.jpg; bg-services@2x.jpg; bg-your-first-visit@2x.jpg; img-begin-your-journey@2x.jpg; img-care-for-every-stage@2x.jpg; img-hero-banner@2x.jpg; img-injured-on-the-job@2x.jpg"],
  [50, "info@actionphysiotherapy.com"],
  [52, "contact@healthhorizonphysio.com; healthhorizon.physio@gmail.com"],
  [53, "info@mediwaysphysiotherapy.com"],
  [54, "info@athletescare.com"],
  [55, "paulgarvey@kingscrossphysio.com"],
  [56, "info@intelligenthealthgroup.ca"],
  [57, "info@springbrookhealth.ca"],
  [58, "elitephysiogroup@gmail.com; elitephysiogroup@gmail.com"],
  [60, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; 88170cb0c9d64f94b5821ca7fd2d55a4@sentry-next.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; info@ptcarerehab.com"],
  [61, "info@totalwellnessrehab.com"],
  [62, "movementrehabinc@gmail.com"],
  [64, "info@northtownvethospital.com"],
  [66, "kennedyrdvetclinic@gmail.com"],
  [67, "heartlakevet@gmail.com"],
  [68, "info@bramptonvethospital.com; info@bramptonvethospital.com"],
  [69, "hello@embletonvet.com"],
  [70, "support@evetsites.com"],
  [72, "PeelPetVet@gmail.com; PeelPetVet@gmail.com"],
  [73, "info@mcqueenanimalhospital.com"],
  [74, "20northparkvethospital@gmail.com; northparkvethospital@gmail.com"],
  [76, "bramptonvet@outlook.com"],
  [77, "brarhs@gmail.com; brarhs@gmail.com"],
  [78, "staff@doghospitalofbrampton.com"],
  [79, "mobilevetbrar@gmail.com"],
  [81, "gardenbrookevh@gmail.com"],
  [82, "info@mayfieldanimalhospital.ca"],
  [83, "david@acrilaw.com; david@acrilaw.com"],
  [86, "info@nazlaw.ca"],
  [87, "pdc@pdclawyers.ca"],
  [90, "info@sharmalaw.ca"],
  [92, "sukhminder@sslaws.ca"],
  [94, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 78f7996315bc402f9dcb8a2f974b82d1@sentry.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; cd64ba1f47df485bba2b0076c0dd3b25@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; info@khehralaw.com; info@khehralawfirm.com; khehralaw@gmail.com"],
  [95, "mikesh@patellawfirm.ca"],
  [96, "info@evertrustlaw.ca"],
  [97, "info@mblawyer.ca"],
  [98, "18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; contact@devlaws.com; example@mysite.com"],
  [99, "carolyn@dalestreimanlaw.com; chodder@dalestreimanlaw.com; lily@dalestreimanlaw.com; nelia@dalestreimanlaw.com; shuvasri@dalestreimanlaw.com; tamara@dalestreimanlaw.com"],
  [101, "info@bhinderlaw.com"],
  [102, "info@guptalaw.ca"],
  [103, "456-7890hi@mygroovydomain.com"],
  [104, "harkiratcpa@gmail.com"],
  [105, "info@orientaccounting.ca"],
  [106, "contact@zeracpa.com; contact@zeracpa.com"],
  [107, "info@rscpa.com; info@rscpafirm.com; support@rscpa.com"],
  [108, "2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; shriraj@accounttips.com"],
  [110, "info@globalaccounting.ca"],
  [111, "focustaxservices@gmail.com"],
  [112, "nellpurnell@gmail.com; pblake@psbassociateaccountingtaxservices.ca"],
  [113, "hello@isgconsulting.ca; hello@isgconsulting.ca"],
  [114, "info@navcpa.ca; navinc.ca@gmail.com"],
  [115, "info@adviceaccounting.ca"],
  [118, "info@orientalbiz.ca; info@orientalbiz.ca"],
  [119, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; ep-sons@rogers.com; info@mysite.com"],
  [122, "dave@lab6.com; hi@typemade.mx"],
  [123, "alex@alexcygal.com"],
  [124, "deals@teamexecutive.net; hp@gaind.ca"],
  [125, "info@goldtitanzrealty.com"],
  [126, "askpawarnow@gmail.com"],
  [128, "gthindhomes@gmail.com"],
  [129, "propertyzonecanada@gmail.com; recruiting@century21pz.ca"],
  [130, "homekey123@gmail.com"],
  [131, "buysellwithraj@gmail.com"],
  [134, "lallsells13@gmail.com; mpslall13@gmail.com; mpslall@yahoo.com"],
  [137, "callsunnysavemoney@gmail.com; sunny@sunnypurewal.com"],
  [140, "realtorjora@gmail.com"],
  [142, "frontdeskcertified@royallepage.ca; frontdeskcertified@royallepage.ca"],
  [143, "navneet@navinsurance.ca"],
  [145, "charlotte@thebig.ca; contact@thebig.ca"],
  [146, "info@insurancebazaar.ca; info@insurancebazaar.ca"],
  [147, "varinder@punjabinsurance.ca"],
  [148, "dptaneja@yahoo.com; info@paulsinsurance.ca"],
  [151, "sunny@insurepedia.ca"],
  [152, "crampersaud@all-risks.com; insure@all-risks.com; djairaj@all-risks.com; diksha@all-risks.com; crampersaud@all-risks.com; insure@all-risks.com; djairaj@all-risks.com; diksha@all-risks.com"],
  [155, "charlotte@thebig.ca; contact@thebig.ca"],
  [156, "audit@fivestarinsurance.ca; u003eaudit@fivestarinsurance.ca"],
  [158, "onservice@brokerlink.ca; onservice@brokerlink.ca"],
  [159, "amitshahcanada@gmail.com"],
  [160, "newpropertyclaims@allstate.ca; newpropertyclaims@allstate.ca"],
  [161, "admin@punjabinsurance.ca"],
  [162, "info@rajatmalhotra.ca"],
  [163, "aurora@lullaboo.ca; avenue@lullaboo.ca; beaches@lullaboo.ca; bedford@lullaboo.ca; bradford@lullaboo.ca; brampton@lullaboo.ca; cambridge@lullaboo.ca; centennial@lullaboo.ca; churchill@lullaboo.ca; college@lullaboo.ca; elginmills@lullaboo.ca; heartland@lullaboo.ca; homestead@lullaboo.ca; maple@lullaboo.ca; meadowvale@lullaboo.ca; miltoneast@lullaboo.ca; mississaugawest@lullaboo.ca; oshawa@lullaboo.ca; wanless@lullaboo.ca"],
  [164, "aurora@lullaboo.ca; avenue@lullaboo.ca; beaches@lullaboo.ca; bedford@lullaboo.ca; bradford@lullaboo.ca; brampton@lullaboo.ca; cambridge@lullaboo.ca; centennial@lullaboo.ca; churchill@lullaboo.ca; college@lullaboo.ca; elginmills@lullaboo.ca; heartland@lullaboo.ca; homestead@lullaboo.ca; maple@lullaboo.ca; meadowvale@lullaboo.ca; miltoneast@lullaboo.ca; mississaugawest@lullaboo.ca; oshawa@lullaboo.ca; wanless@lullaboo.ca"],
  [165, "growinginportelgin@gmail.com; supervisor.growinginhanover@gmail.com; supervisor.littlebloomerscc@gmail.com"],
  [167, "childcareservices@familydaycare.com; placementstudents@familydaycare.com"],
  [169, "info@yunaland.ca"],
  [170, "18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; happylifecentre1975@gmail.com; happylifechildcare@gmail.com"],
  [173, "arqueries@plasp.com; arteam@plasp.com; childcare@plasp.com; volunteering@plasp.com"],
  [174, "careers@brightpathkids.com; enrollment@brightpathkids.com; info@brightpathkids.com"],
  [175, "pathwaychildcare11@bellnet.ca"],
  [176, "brampton@willowbraechildcare.com"],
  [177, "financial@busyhandsnminds.com; glenerin@busyhandsnminds.com"],
  [178, "arqueries@plasp.com; arteam@plasp.com; childcare@plasp.com; volunteering@plasp.com"],
  [182, "members@goodlifefitness.com"],
  [184, "quickfitservice@hotmail.com"],
  [185, "fitforgood1981@gmail.com"],
  [186, "info@signatureshape.ca"],
  [187, "info@themegagym.ca; themegagym@gmail.com"],
  [188, "18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com; tbfitnessinc@gmail.com"],
  [189, "members@goodlifefitness.com"],
  [190, "press@pfhq.com"],
  [191, "customercare@abcfitness.com"],
  [192, "dreamlandathletics@gmail.com"],
  [195, "mymail@mailservice.com; support@mahila.ca"],
  [199, "mara.lanz@brampton.ca"],
  [202, "virainsondhi12@gmail.com"],
  [208, "deepbeautysalon@gmail.com"],
  [210, "info@favouritesalon.com"],
  [213, "dev7561@gmail.com"],
  [215, "13e49d785d8d4f828038b6136f3b48ba@sentry.io; glowgirlesthetics@hotmail.com; hi@mystore.com"],
  [219, "info@sarpzsalonspa.ca; sarpzsalon@gmail.com"],
  [220, "staff@boceyes.com"],
  [224, "info@minteyecare.ca; info@minteyecare.ca"],
  [228, "info@akaloptical.com"],
  [229, "info@eyeology.com"],
  [230, "hello@eyeleveloptical.com"],
  [231, "bramptonfamilyeyecare@gmail.com"],
  [232, "info@opticalpulse.com"],
  [233, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; info@fandorvisionpoint.com"],
  [234, "brampton@drgillsoffice.com"],
  [236, "info@vivideyes.ca"],
  [238, "barrieeyecare@lmc.ca; bayvieweyecare@lmc.ca; bolton@individualeyes.ca; bramptoneyecare@lmc.ca; ottawaeyecare@lmc.ca; richmondhill@individualeyes.ca; sbeyecare@lmc.ca; thornhilleyecare@lmc.ca"],
  [240, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; gillinghampharmacy@gmail.com"],
  [241, "info@hoopershealth.com"],
  [243, "peoplescompoundingpharmacy@gmail.com"],
  [245, "eben@eyebytes.com; pendalepharmacy@gmail.com"],
  [248, "atulbadiani@hotmail.com; crystalbeachpharmacy@gmail.com; madawaskadrugs@gmail.com; pharmasave9407@gmail.com; portagepharmasave@gmail.com; ps406@email.ca"],
  [249, "medgurupharmacy@gmail.com"],
  [251, "hello@rfuenzalida.com; impallari@gmail.com; info@indiantypefoundry.com; sandalwood.pharmacy@gmail.com"],
  [252, "asxvmprobertest@gmail.com; smart.journey.prober@gmail.com"],
  [254, "info@wexfordmed.com; info@wexfordmed.com"],
  [256, "cosimo@voddenpharmacy.com"],
  [258, "info@pharmasavewestbram.com"],
  [259, "header@2x.jpg; our-services-banner@2x.jpg"],
  [260, "info@intelligenthealthgroup.ca"],
  [262, "contact@mysite.com; info@fcccbrampton.ca; info@fcccbrampton.com"],
  [263, "_info@ladakchiropractichealthcentre.com; _info@ladakchiropractichealthcentre.com"],
  [266, "epichealthandmovement@gmail.com"],
  [267, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; sandalwoodchiropractic@hotmail.com"],
  [268, "dr.p.keogh@gmail.com"],
  [270, "headtotoechiropractic@gmail.com"],
  [271, "2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 54b4aac306184111a223c0f4aea635c3@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; bfb679c754744c58a7374ee6e25cfc13@sentry.wixpress.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com; info@bramptonchirowellness.com"],
  [272, "18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; example@mysite.com; info@drdoug.ca"],
  [276, "18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 1eeb89147c984dc6bc3ffafd9e6cd089@sentry.wixpress.com; 2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 59f3fdbcc4da44ab841236a7406e9b3b@sentry.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; 98b21aa53d68482b8414e892d9af0e5f@sentry-next.wixpress.com; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com; fivesensesdayspa@gmail.com"],
  [277, "dr.spinalpain@gmail.com"],
  [278, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; info@downtowntorontowellness.ca; info@newlightnorthyork.com; newlightfrontoffice@gmail.com"],
  [280, "mymail@mailservice.com"],
  [283, "bramptonvisitation@bcvc.info"],
  [284, "clientfeedback@mountpleasantgroup.com"],
  [291, "eben@eyebytes.com"],
  [292, "contact@everestfuneral.com; mediainquiries@everestfuneral.com"],
  [293, "hhernandez@convertus.com; jane@gmail.com; nom@exemple.com"],
  [294, "wheels@22gautosales.com"],
  [295, "sales@caautosales.ca"],
  [296, "autofreakgroup@gmail.com"],
  [297, "info@bramptonautocenter.ca"],
  [298, "10xfineauto@gmail.com"],
  [300, "sales@nawabmotors.ca"],
  [303, "autocrewsales@gmail.com"],
  [306, "dmndautosales@gmail.com"],
  [308, "sukhmandeepkang25@gmail.com"],
  [310, "sales@acezauto.com"],
  [311, "info@firstmotors.ca; sales@firstmotors.ca"],
  [313, "learnwithashina@gmail.com"],
  [314, "educatoracademy.can@gmail.com"],
  [315, "info@xpertlearn.com; webmaster@xpertlearns.com"],
  [317, "2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 54b4aac306184111a223c0f4aea635c3@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; 88170cb0c9d64f94b5821ca7fd2d55a4@sentry-next.wixpress.com; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; bfb679c754744c58a7374ee6e25cfc13@sentry.wixpress.com; contact@hakamacademyoflearning.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com"],
  [318, "BramptonNorth@ScholarsEd.com; Info@ScholarsED.com"],
  [319, "info@xlencelearing.ca"],
  [320, "AcctsTutoringServices@gmail.com; acctstutoringservices@gmail.com; AcctsTutoringServices@gmail.com; acctstutoringservices@gmail.com"],
  [322, "Info@ScholarsED.com; BramptonEast@ScholarsEd.com"],
  [323, "info@shafiedu.com"],
  [324, "gd.academy@yahoo.com"],
  [325, "micah@micahrich.com"],
  [326, "contact@superstaracademy.ca"],
  [327, "micah@micahrich.com"],
  [333, "info@northgatesmiles.ca"],
  [334, "northparkdental@drcrisol.com"],
  [335, "info.sunnymeadow@gmail.com"],
  [336, "dentist@smileton.ca; info@smiletondental.ca"],
  [337, "bramparkdentistry@gmail.com"],
  [338, "info@drdanewalia.com"],
  [339, "info@bramdaledentaloffice.com"],
  [340, "info@sterlingdental.com"],
  [341, "office@peeldental.com"],
  [343, "7hilldental@gmail.com; info@bovairdsmilesdental.ca; veteransdrdental@gmail.com"],
  [347, "airportbovaird@gmail.com"],
  [348, "info@springdalefamilydental.ca"],
  [350, "salvaggiodentistry@gmail.com; smile@salvaggiodentistry.ca"],
  [351, "impallari@gmail.com"],
  [352, "info@howdenmedicalclinic.com"],
  [354, "castleportmedical2@gmail.com"],
  [358, "contact@northgateclinic.com"],
  [359, "fallback-thumbnail@2x.jpg; mens_health-thumbnail@2x-1.jpg; obstetrics-thumbnail@2x.jpg; physiotherapy_allied_health-thumbnail@2x.jpg; womens_health-thumbnail@2x.jpg"],
  [360, "dhrumil@ammc.ca; info@lakeridgemedical.ca"],
  [363, "ihc@torontomu.ca; ihc@torontomu.ca"],
  [365, "info@compassmd.ca; info@indiantypefoundry.com"],
  [367, "drsphysio105@gmail.com; haninder.dhillon@gmail.com"],
  [368, "info@completephysiorehab.ca"],
  [370, "northbramalea@lifemark.ca; northbramalea@lifemark.ca"],
  [372, "info@alphaphysio.ca"],
  [373, "info@accesshealthcentre.ca; info@accessphysio.ca"],
  [375, "info@rejuvenatephysiorehab.com"],
  [376, "info@liferehab.ca; info@myhealthflow.ca"],
  [377, "info@righttimerehab.ca; righttimerehab@gmail.com"],
  [380, "nextstepphysioandrehab@gmail.com"],
  [381, "guelph@pacificphysiotherapy.ca; hamilton@pacificphysiotherapy.ca; info@finchgatephysio.ca; info@pacificphysiotherapy.ca"],
  [382, "info@orthocarephysio.ca; xxx@xx.com"],
  [383, "admin@ljrphysio.ca"],
  [384, "info@myohealthphysio.com"],
  [386, "peelvethospital@gmail.com; peelvethospital@gmail.com"],
  [387, "hp@khuranalawyer.com"],
  [388, "info@dnlawfirm.ca"],
  [389, "dsaini@sainilaw.ca"],
  [393, "gilllaw01@gmail.com"],
  [394, "mandeep@saggilawfirm.com"],
  [395, "info@kalialaw.com; office@kalialaw.com"],
  [396, "hostwithkunika@gmai.com; hostwithkunika@gmail.com; info@aasaralawyers.ca"],
  [397, "amar@dlawpc.ca; info@dlawpc.ca"],
  [398, "team@hplaw.org"],
  [399, "info@anitapereralaw.ca"],
  [401, "mandeep@saggilawfirm.com"],
  [403, "info@gondaliyacpa.ca; sharad@gondaliyacpa.ca; vandana@gondaliyacpa.ca"],
  [404, "accounting16-825x340@2x-890x664.jpg; info@vnaccountingsolutions.com"],
  [405, "info@zadaccounting.ca"],
  [406, "info@universalaccountingfirm.com"],
  [407, "jascpa@rogers.com"],
  [408, "name@company.com; qsatax@gmail.com"],
  [409, "fileyourtax@taxxel.ca"],
  [411, "aksood@ashwanisood.com; impallari@gmail.com"],
  [412, "info@wealthcloud.com"],
  [413, "info@bssaini.com"],
  [414, "info@thinkaccounting.ca"],
  [416, "info@baljindersra.ca"],
  [417, "info@upstaterealty.ca"],
  [419, "ruby.thambiah@gmail.com"],
  [420, "info@teampanag.com"],
  [421, "samsantony@gmail.com"],
  [422, "paulmannhomes@gmail.com"],
  [423, "info@realtorsunnyg.com"],
  [428, "info@teampaul.ca"],
  [429, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; castlemorerealestate@live.ca"],
  [432, "info@canadianlic.com"],
  [434, "onlinesales@myinsurancebroker.com"],
  [436, "info@avoninsurance.ca"],
  [437, "amandeep.bajwa@desjardins.com"],
  [438, "client_service_support@cooperators.ca; report_fraud@cooperators.ca"],
  [439, "info@parentsupervisa.ca"],
  [440, "allkindinsuranceinc@gmail.com"],
  [441, "andrea.villamizar@nacora.com; contact.nacorafrance@nacora.com; francine.fang@kuehne-nagel.com; german.aguiar@nacora.com; hello@nacora.com; hing.yuen@nacora.com; info.australia@nacora.com; info.austria@nacora.com; info.belgium@nacora.com; info.canada@nacora.com; info.ee@nacora.com; info.germany@nacora.com; info.italy@nacora.com; info.luxembourg@nacora.com; info.nacora@brokins.gr; info.netherlands@nacora.com; info.portugal@nacora.com; info.southafrica@nacora.com; info.spain@nacora.com; info.sweden@nacora.com; info.swiss@nacora.com; info.turkey@nacora.com; info.usa@nacora.com; info@anchorrisk.com; info@gfh-insurance.com; infomex.nacora@nacora.com; marcel.guerra@nacora.com; nacora@pec.it; pablo.quintero@nacora.com; richard.huang@nacora.com; sunil.kannoujiya@kuehne-nagel.com; uk.salesteam@nacora.com; yasuhide.miyamoto@nacora.com"],
  [443, "info@insuremeright.ca"],
  [446, "childcareservices@familydaycare.com; placementstudents@familydaycare.com"],
  [447, "arqueries@plasp.com; arteam@plasp.com; childcare@plasp.com; volunteering@plasp.com"],
  [450, "careers@brightpathkids.com; enrollment@brightpathkids.com; info@brightpathkids.com"],
  [451, "info@learninghappenschildcare.com; support@thinkflame.com"],
  [452, "info@yminds.ca"],
  [453, "connect@eyeschildcare.com"],
  [454, "arqueries@plasp.com; arteam@plasp.com; childcare@plasp.com; volunteering@plasp.com"],
  [455, "arqueries@plasp.com; arteam@plasp.com; childcare@plasp.com; volunteering@plasp.com"],
  [459, "mara.lanz@brampton.ca"],
  [461, "northparkbrampton@f45training.com; northparkbrampton@f45training.com"],
  [462, "members@goodlifefitness.com"],
  [463, "info@crunchbrampton.ca; info@crunchbrampton.ca"],
  [464, "members@goodlifefitness.com"],
  [465, "info@freebirdgym.com"],
  [467, "mara.lanz@brampton.ca"],
  [468, "info@rubeebeautyspa.com"],
  [470, "2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 88170cb0c9d64f94b5821ca7fd2d55a4@sentry-next.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com; sapphirebeautysalonandspa@gmail.com"],
  [471, "stylishsalonspa@yahoo.com"],
  [473, "sahotahardeep1@gmail.com"],
  [480, "info@magicbeautysalon.ca"],
  [483, "contact@thompsonoptometry.ca; vtadmin@thompsonoptometry.ca"],
  [484, "info@imageoptical.ca"],
  [486, "info@bccoptometry.com"],
  [487, "info@macandcoeyecare.com"],
  [488, "mann_len@hotmail.com"],
  [489, "info@drkhanna.ca"],
  [490, "info@akaloptical.com"],
  [494, "clients@carroteye.com"],
  [495, "18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; contact@mahiloptometry.ca"],
  [496, "northbramalea@gmail.com"],
  [501, "atulbadiani@hotmail.com; crystalbeachpharmacy@gmail.com; madawaskadrugs@gmail.com; pharmasave9407@gmail.com; portagepharmasave@gmail.com; ps406@email.ca"],
  [503, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; ultramedpharmacy@gmail.com"],
  [512, "info@kaurchiropractic.com"],
  [513, "info@fitclinic.ca"],
  [514, "admin@ingoodhandswellness.com"],
  [515, "info@saharahealth.com"],
  [516, "info@peakrehab.ca"],
  [517, "drgidda@gmail.com"],
  [518, "info@executiverehab.ca"],
  [519, "contactbramtoprehab@gmail.com; infobramtoprehab@gmail.com"],
  [521, "info@thenewhavenfuneralcentre.ca"],
  [524, "info@lotusfuneralandcremation.com"],
  [525, "infoaroymiller@newediukfuneralhome.com; infonewediuk@newediukfuneralhome.com"],
  [526, "clientfeedback@mountpleasantgroup.com"],
  [527, "info@mackinnonbowes.com; info@mackinnonbowes.com"],
  [528, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; bituspetcremationservices@gmail.com"],
  [529, "hhernandez@convertus.com; jane@gmail.com; nom@exemple.com"],
  [530, "gurpreetsgill97@gmail.com"],
  [532, "bramptonlearna@gmail.com; info@learnabrampton.com"],
  [533, "2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; 88170cb0c9d64f94b5821ca7fd2d55a4@sentry-next.wixpress.com; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com; info@sktutoring.ca"],
  [535, "zentul@gmail.com"],
  [536, "info@edusmilelearning.ca"],
  [538, "info@megamindlearning.com"],
  [539, "info@bramptonlearna.com; info@stylemixthemes.com"],
  [540, "learnershub2019@gmail.com"],
  [543, "info@benipaldental.ca"],
  [545, "info@drpkahlon.com; staffdrpkahlon@gmail.com"],
  [547, "info@vsdcare.ca"],
  [548, "info@bramptonsmiles.com"],
  [549, "info@sandalwoodsmilesdentistry.com"],
  [550, "info@fathertobindentistry.com"],
  [552, "contact@braydondentalcare.com"],
  [553, "dental22731@outlook.com; dental22732@outlook.com; dental22733@outlook.com; dental22734@outlook.com; dental22735@outlook.com; dental22736@outlook.com; dental22737@outlook.com; dental2278@outlook.com"],
  [554, "dewside_dentistry@yahoo.com"],
  [555, "info@primadenta.ca; info@primadental.ca"],
  [557, "springdalemedical@gmail.com; springdalemedicalpb@gmail.com"],
  [558, "edf672e8b252555a68b79ad3462373cd@sentry.cortico.cc"],
  [562, "healthlinewalkinclinic@gmail.com; healhlinewalkinclinic@gmail.com; healthlinewalkinclinic@gmail.com; healhlinewalkinclinic@gmail.com"],
  [564, "healthlinewalkinclinic@gmail.com; healhlinewalkinclinic@gmail.com; healthlinewalkinclinic@gmail.com; healhlinewalkinclinic@gmail.com"],
  [568, "info@urgentcarecentre.ca"],
  [569, "info@campshealthclinic.com; info@campshealthclinic.com"],
  [571, "info@ruhaniphysio.com"],
  [573, "mayfieldphysio@gmail.com"],
  [574, "altumhealthreferrals@uhn.ca; medlegal.assessments@uhn.ca"],
  [575, "inspiremassage@outlook.com"],
  [576, "bg-our-philosophy@2x.jpg; bg-our-services@2x.jpg; faq-questions@2x.jpg; img-hero-banner@2x.jpg"],
  [577, "castlemorefrontdesk@gmail.com"],
  [579, "info@regainrehab.com"],
  [580, "petcare@lacosteanimalhospital.ca; petcare@lacosteanimalhospital.ca"],
  [582, "staff@cathospitalofbrampton.com"],
  [583, "office@vashishthalaw.ca; rajesh@vashishthalaw.ca"],
  [584, "info@mwalialaw.com"],
  [586, "gps@gpslawfirm.ca"],
  [587, "kamaljitlawoffice@gmail.com"],
  [588, "info@jslpc.ca"],
  [589, "info@ssloombalaw.ca"],
  [590, "info@thindlaw.ca"],
  [591, "info@dhasilaw.com"],
  [593, "narinder@taxreturnfilers.com; support@taxreturnfilers.com; umar@taxreturnfilers.com; waqar@taxreturnfilers.com"],
  [595, "info@eccountant.ca"],
  [597, "info@germansandhu.ca; sandhuhomes1313@gmail.com"],
  [600, "tiwana.realtor@gmail.com"],
  [602, "info@captainrealestate.ca; info@captainrealestate.ca"],
  [610, "info@dig.insure"],
  [611, "csrai7@gmail.com; info@basictheme.com"],
  [614, "info@learninghappenschildcare.com; support@thinkflame.com"],
  [615, "20bradford@littlegalaxycc.com; 20bramptongore@littlegalaxycc.com; 20hensall@littlegalaxycc.com; bradford@littlegalaxycc.com; bramptongore@littlegalaxycc.com; hensall@littlegalaxycc.com"],
  [616, "info@learninghappenschildcare.com; support@thinkflame.com"],
  [617, "memberservices@ymcagta.org"],
  [618, "members@goodlifefitness.com"],
  [619, "460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 88170cb0c9d64f94b5821ca7fd2d55a4@sentry-next.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 98b21aa53d68482b8414e892d9af0e5f@sentry-next.wixpress.com; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; info@elevate-nation.com"],
  [622, "outlooksalon.ca@gmail.com"],
  [627, "info@beautypalacesalon.ca"],
  [628, "dev7561@gmail.com"],
  [629, "info@inspirevisioncare.ca; reception@ovdc.ca"],
  [630, "contact@ojooptical.com"],
  [631, "service@purbavision.com"],
  [633, "springdaleeyewear@gmail.com"],
  [636, "info@akaloptical.com"],
  [644, "info@loflinfuneralservice.com; loflinfuneralhome@embarqmail.com"],
  [645, "ridge@ridgefuneralhome.com"],
  [646, "jeff@swartzmortuary.com; jeff@swartzmortuary.com"],
  [647, "info@szalfuneralhome.com; michael@szalfuneralhome.com; mpffd@icloud.com; mpffd@me.com; zoe@szalfuneralhome.com"],
  [648, "info@noveltransport.ca"],
  [650, "info@bigbullmotors.ca"],
  [651, "gkcstutor@gmail.com; gkcstutor@gmail.com"],
  [653, "info@avondaledental.ca"],
  [654, "bramalea@altima.ca; bramalea@altima.ca"],
  [655, "bramcare321@gmail.com"],
  [656, "info@bramptonccd.com"],
  [657, "info@magnoliadentalbrampton.ca; info@magnoliadentalbrampton.ca"],
  [658, "info@drpapneja.com"],
  [660, "bramptondentalcare@gmail.com"],
  [661, "bramaleadental@gmail.com"],
  [663, "Kimberley.Floyd@wellfort.ca; info@wellfort.ca; finance@wellfort.ca"],
  [664, "ealvarado@healthpointmedicine.ca; lionhead@healthpointmedicine.ca; office@healthpointmedicine.ca; remembrance@healthpointmedicine.ca; sandalwood@healthpointmedicine.ca"],
  [667, "ealvarado@healthpointmedicine.ca; lionhead@healthpointmedicine.ca; office@healthpointmedicine.ca; remembrance@healthpointmedicine.ca; sandalwood@healthpointmedicine.ca"],
  [670, "tulrich@torontomu.ca; medicine@torontomu.ca; tulrich@torontomu.ca; medicine@torontomu.ca"],
  [673, "info@bramaleaphysio.com; info@bramaleaphysio.com"],
  [674, "contact@axiomphysio.com"],
  [675, "intake@activaclinics.com"],
  [677, "vitalcarephysio@gmail.com"],
  [680, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; derrydalehospital@gmail.com"],
  [681, "hvc.vet@gmail.com"],
  [682, "maltonvet@rogers.com"],
  [684, "rcp@kaurlaw.com"],
  [685, "aman@dulletlaw.com"],
  [688, "info@vyaslaw.ca"],
  [689, "grewaldefence@gmail.com"],
  [690, "info@aggarwallaw.ca"],
  [691, "info@tlepc.ca"],
  [692, "lawcrim@gmail.com; lawyersandhu@gmail.com; lslawfirmpc@gmail.com"],
  [693, "info@morelaw.ca"],
  [694, "info@supriyachadha.com; info@supriyachadha.com"],
  [695, "aksood@ashwanisood.com; impallari@gmail.com"],
  [697, "info@meedacpa.com"],
  [698, "info@cityaccountingservice.ca"],
  [699, "info@mzacpa.ca"],
  [700, "gbirdi@birdi.ca; name@company.com; wordpress@birdi.ca"],
  [701, "18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com"],
  [704, "info@wadehrapc.ca"],
  [706, "leads@remaxspec.on.ca"],
  [708, "realtorviktomar@gmail.com"],
  [709, "ravsarai.realtor@gmail.com"],
  [710, "hsangha@live.ca"],
  [713, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; info@titaninsurance.ca"],
  [715, "kamalinsurance9@gmail.com"],
  [716, "info@wohlstandfinancial.com"],
  [717, "allkindinsuranceinc@gmail.com"],
  [718, "info@soundinsurance.ca"],
  [719, "info@ms-insurance.ca"],
  [721, "memberservices@ymcagta.org"],
  [722, "childrenschoice@rogers.com; childrenschoice@rogers.com"],
  [723, "wecare@giantleapkids.com"],
  [724, "memberservices@ymcagta.org"],
  [725, "bramalea@mini-skool.ca; brampton@mini-skool.ca; bromsgrove@mini-skool.ca; cawthra@mini-skool.ca; richmondhill@mini-skool.ca"],
  [729, "sultanfitness12@gmail.com"],
  [730, "mara.lanz@brampton.ca"],
  [732, "theaura4you@gmail.com"],
  [733, "luxesalon87@gmail.com"],
  [738, "info@clarityeye.ca"],
  [740, "info@riverstoneeyecare.com; info@riverstoneeyecare.com"],
  [742, "atulbadiani@hotmail.com; crystalbeachpharmacy@gmail.com; madawaskadrugs@gmail.com; pharmasave9407@gmail.com; portagepharmasave@gmail.com; ps406@email.ca"],
  [744, "info@pharmasavebramqueen.com; info@pharmasavebramqueen.com"],
  [745, "cacustrel@wal-mart.com; help@customercare.walmart.com; support-cacustrel@wal-mart.com"],
  [747, "better@medboxpharmacy.ca; info@medboxpharmacy.ca; info@stouffvilleapothecary.com; stockyards@medboxpharmacy.ca"],
  [749, "atulbadiani@hotmail.com; crystalbeachpharmacy@gmail.com; madawaskadrugs@gmail.com; pharmasave9407@gmail.com; portagepharmasave@gmail.com; ps406@email.ca"],
  [751, "info@howdenmedicalclinic.com"],
  [752, "vanrosepharmacy1@gmail.com"],
  [753, "info@royalclinic.ca"],
  [754, "infinitemotionhealth@gmail.com"],
  [756, "astigma@astigmatic.com; eben@eyebytes.com; info@omhw.ca"],
  [757, "todd@carsgaloreauto.com"],
  [758, "alibabamotors4@gmail.com"],
  [759, "info@bramptoncarbazaar.ca"],
  [762, "info@smilemakersdental.ca"],
  [763, "drmeisels@yahoo.com; drmeisels@yahoo.com"],
  [764, "dentalfax@uponline.com; info@parkplacedentalcentre.com; reception@ppdc.dental"],
  [766, "ajax-loader@2x.gif; kennedydentalcarebrampton@outlook.com"],
  [767, "2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; bfb679c754744c58a7374ee6e25cfc13@sentry.wixpress.com; conestogadental@gmail.com"],
  [768, "info@fishermanfamilydental.com"],
  [769, "info@dentistry-main.com"],
  [771, "info@vcarepointmedical.ca"],
  [772, "excellentcare-phb@hotmail.com; dev7561@gmail.com"],
  [777, "contactpeelmedicalcentre@gmail.com"],
  [779, "airportrehab@gmail.com"],
  [780, "impallari@gmail.com; team@latofonts.com"],
  [783, "info@naturaltouch.com; info@naturaltouchrehab.ca"],
  [784, "heal360physio@gmail.com"],
  [785, "bovairdvanrehabphysio@gmail.com; info@vanrehabphysio.ca; maltonvanrehab@gmail.com; vanrehabairport@gmail.com"],
  [786, "contactwellnessrehab@gmail.com"],
  [787, "info@lawden.ca"],
  [788, "contact@mjlaws.ca"],
  [790, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; info@x-crown.ca"],
  [791, "contact@gdlawyers.ca; v@gdlawyers.ca"],
  [793, "sjohn@glhaccounting.ca"],
  [794, "chirag@wealthywaveaccounting.com"],
  [795, "info@japjiaccounting.com"],
  [796, "brampton@royallepage.ca; brampton@royallepage.ca"],
  [797, "sgrewal@royallepage.ca"],
  [798, "buyandsellwithharish@gmail.com"],
  [800, "neilmcintyre@rogers.com"],
  [801, "support@quotelea.com"],
  [802, "info@vertexinsurance.ca"],
  [804, "memberservices@ymcagta.org"],
  [805, "careers@brightpathkids.com; enrollment@brightpathkids.com; info@brightpathkids.com"],
  [806, "ruth@krt.org"],
  [809, "contact@ajads360.com; megaoptical786@gmail.com"],
  [812, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; cumberlandpharmacy@gmail.com"],
  [822, "info@vipmotorscanada.ca"],
  [825, "info@onedentaltoronto.ca; info@onedentaltoronto.ca"],
  [826, "frontdesk@kjdental.ca"],
  [828, "info@hansendental.ca"],
  [829, "kennedysquaredental@gmail.com"],
  [833, "2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; contact@kennedysmilesdental.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com"],
  [835, "services@kennedymedicalclinic.com"],
  [836, "brampton_centre_req@welldiagnostics.ca; brampton_centre_req@welldiagnostics.ca"],
  [840, "info@easternclinic.ca"],
  [841, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; raylawsonfamilyclinic123@gmail.com"],
  [842, "contact@worldmedcentre.ca"],
  [845, "brampton@lifeclinics.ca"],
  [846, "info@itiwelness.com"],
  [847, "info@reliefphysio.ca; info@reliefphysiogroup.com"],
  [848, "physiovillage@gmail.com"],
  [849, "info@physio-fix.ca"],
  [850, "info@rejuvenatephysiorehab.com"],
  [851, "communityrehabon@cbihealth.ca; drt_ontario@cbihealth.ca; u003ecommunityrehabon@cbihealth.ca; u003edrt_ontario@cbihealth.ca; u003evocreferrals@cbi.ca; vocreferrals@cbi.ca"],
  [853, "trinovawellnesscentre@gmail.com"],
  [854, "derryvillagevet@gmail.com"],
  [855, "info@zenalaw.ca"],
  [856, "info@sabiollp.com"],
  [857, "18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 54b4aac306184111a223c0f4aea635c3@sentry.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com"],
  [858, "john.doe@gmail.com"],
  [859, "vhlaw@rogers.com"],
  [860, "info@cnllp.ca; info@nc-law.ca"],
  [862, "info@batthlaw.com"],
  [863, "20info@paragonafs.ca; info@paragonafs.ca"],
  [865, "cpajsingh@gmail.com"],
  [866, "info@bajajtax.com"],
  [867, "info@yesrealty.ca"],
  [868, "christine.dasilva@century21.ca; christine.dasilva@century21.ca"],
  [869, "info@remaxcentre.ca"],
  [870, "info@livio.ca"],
  [871, "kingrealtybrokerage@gmail.com; reception.kingrealty@gmail.com"],
  [874, "email@website.com; info@gmannhomes.com"],
  [876, "realtor@vinnykalsi.com"],
  [878, "lovepreetsingh1709@gmail.com"],
  [879, "lorna.downs@desjardins.com"],
  [880, "busybees002@outlook.com"],
  [881, "info@kundaxteam.com; info@youngmiraclesmontessori.com"],
  [882, "pristinepearlseyes@gmail.com"],
  [884, "careers@brightpathkids.com; enrollment@brightpathkids.com; info@brightpathkids.com"],
  [885, "admin@nestlingschildcare.com; info@nestlingschildcare.com"],
  [886, "members@goodlifefitness.com"],
  [887, "info@rgxfitness.com; info@rgxgroup.com; ruby@orendagroupx.com"],
  [889, "alphaaurasalon@gmail.com"],
  [892, "krystalsalon@outlook.com"],
  [894, "info@prismeye.ca"],
  [895, "info@uptowneye.ca"],
  [896, "queenlynchpharmacy@gmail.com"],
  [898, "flowercitypharmacy@gmail.com"],
  [901, "allwellpharmacyinc@gmail.com; allwell.huronheights@gmail.com"],
  [905, "dranitachopra@gmail.com; dranitachopra@gmail.com"],
  [907, "0e6a29e4756740a8a63493e912ba2174@sentry.wixpress.com; 18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 2062d0a4929b45348643784b5cb39c36@sentry.wixpress.com; 271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; 88170cb0c9d64f94b5821ca7fd2d55a4@sentry-next.wixpress.com; 8c30b2581acc426badc414e8a5dc04ef@sentry.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; baf30a2b91654c5a840931f0137bed30@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com; f36cc48fb72b4d298c835f2793cf3b84@sentry-next.wixpress.com; info@advancedvitality.ca"],
  [908, "funeral.services@ahmadiyya.ca"],
  [909, "info@tdotcars.ca"],
  [910, "info@moovexmotors.net"],
  [911, "mindarctutors51@gmail.com; mindarctutors51@gmail.com"],
  [912, "info@conestogadentalgroup.com"],
  [913, "help@toothcorner.com"],
  [914, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; kenedyruthdentalcentre@yahoo.ca"],
  [915, "chopradentistryprofessional@gmail.com; chopradentistryprofessional@gmail.com"],
  [918, "north@ismiledentalcentre.com; north@ismiledentalcentre.com"],
  [920, "sandalwooddentalteam@gmail.com"],
  [921, "heartlakemedical88@gmail.com"],
  [922, "sandalwood@verismohealth.com"],
  [923, "info@cbfht.com"],
  [925, "info@sandalwoodphysio.com; info@sandalwoodphysio.com"],
  [926, "communityrehabon@cbihealth.ca; drt_ontario@cbihealth.ca; u003ecommunityrehabon@cbihealth.ca; u003edrt_ontario@cbihealth.ca; u003evocreferrals@cbi.ca; vocreferrals@cbi.ca"],
  [927, "admin@newhopephysio.com"],
  [928, "akalphysio@gmail.com"],
  [929, "info@renewalphysio.com"],
  [930, "huronwoodphysio@gmail.com"],
  [931, "g_01_s@hotmail.com; info@circlephysiotherapy.ca"],
  [933, "info@physiodiscovery.com"],
  [935, "immlaw@akahlon.ca"],
  [936, "info@gswlaw.ca; office.gswlaw@gmail.com; office@gswlaw.ca; info@gswlaw.ca; office.gswlaw@gmail.com; office@gswlaw.ca"],
  [937, "info@godwitlaw.com"],
  [938, "eben@eyebytes.com; impallari@gmail.com; team@latofonts.com"],
  [939, "rupinder@dhaliwal.law"],
  [940, "kushlawoffice@gmail.com"],
  [945, "taxedinsolutions@gmail.com"],
  [946, "realtorshikhar@gmail.com"],
  [948, "contact@vishalvij.ca"],
  [950, "info@shergilllawfirm.ca; info@ssloombalaw.ca; jagmohan.realtor@gmail.com; tewathia.law@gmail.com"],
  [952, "rockydarealtor@gmail.com; rockydarealtor@gmail.com"],
  [953, "hi@typemade.mx; luciano@latinotype.com"],
  [954, "client_service_support@cooperators.ca; report_fraud@cooperators.ca"],
  [955, "605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; fakinremi@surnet.net"],
  [956, "newpropertyclaims@allstate.ca; u003enewpropertyclaims@allstate.ca"],
  [957, "newpropertyclaims@allstate.ca; u003enewpropertyclaims@allstate.ca"],
  [958, "susan.tait@desjardins.com"],
  [961, "info@lightoftheworldchildcare.ca; info@lightoftheworldchildcare.ca"],
  [962, "271e9fa3230b4eec94b02bf95780f5f2@sentry.wixpress.com; 460ff4620fa44cba8df530afde949785@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com; 8eb368c655b84e029ed79ad7a5c1718e@sentry.wixpress.com; ed436f5053144538958ad06a5005e99a@sentry.wixpress.com; f36cc48fb72b4d298c835f2793cf3b84@sentry-next.wixpress.com"],
  [963, "info@hnsdaycare.com"],
  [964, "info@bridgewaycentre.ca"],
  [966, "mara.lanz@brampton.ca"],
  [968, "aarondsilva20@gmail.com"],
  [969, "mara.lanz@brampton.ca"],
  [970, "jose.pt.clienthub@gmail.com"],
  [971, "reachus@sandyspastudio.com"],
  [973, "sensationspabyjk@gmail.com"],
  [974, "admin@kingsteruni.edu; info@uctc.edu.bd"],
  [975, "aa4cacd33be28673d7e69be559ce7ad7@o4506196830715904.ingest.us.sentry.io"],
  [978, "huronwoodrx@gmail.com"],
  [983, "info@mainstreetmedicalpharmacy.com"],
  [985, "dentalfcdo@gmail.com"],
  [986, "office@thesunshinedental.ca"],
  [987, "info@dental2.ca; info2@dental2.ca; info@dental2.ca; info2@dental2.ca"],
  [989, "info@caledondentalcentre.com"],
  [990, "frontdesk@drpatmartinodental.ca"],
  [992, "info@brinkleydentalgroup.com"],
  [996, "edf672e8b252555a68b79ad3462373cd@sentry.cortico.cc"],
  [997, "info@storybrookmedical.com; storybrookreception@gmail.com"],
  [999, "maymcmedicalcentre@gmail.com"],
  [1000, "info@urgentcarecentre.ca"],
  [1002, "reception@vitalmedicine.ca; info@vitalmedicine.ca"],
  [1003, "brampton@medrehabgroup.com; woodbridge@medrehabgroup.com; pickering@medrehabgroup.com; georgetown@medrehabgroup.com; stclair@medrehabgroup.com; northyork@medrehabgroup.com; stoneycreek@medrehabgroup.com; richmondhill@medrehabgroup.com; newmarket@medrehabgroup.com"],
  [1005, "info@northviewphysiotherapy.ca; info@northviewphysiotherapy.ca"],
  [1007, "info@renewalphysio.com"],
  [1008, "info@chinguacousyphysio.com; info@chinguacousyphysio.com"],
  [1009, "info@guelphstreetah.com"],
  [1010, "info@georgetownanimalclinic.ca"],
  [1012, "chhokarlaw1@chhokarlaw.ca"],
  [1013, "info@poojalawoffice.com; info@poojalawoffice.com"],
  [1015, "info@naranglaw.ca"],
  [1016, "info@dcamgroup.ca"],
  [1017, "cpakashishchawla@gmail.com"],
  [1018, "18d2f96d279149989b95faf0a4b41882@sentry-next.wixpress.com; 5d1795a2db124a268f1e1bd88f503500@sentry.wixpress.com; 605a7baede844d278b89dc95ae0a9123@sentry-next.wixpress.com; 78f7996315bc402f9dcb8a2f974b82d1@sentry.wixpress.com; 8c4075d5481d476e945486754f783364@sentry.io; 9a65e97ebe8141fca0c4fd686f70996b@sentry.wixpress.com; c183baa23371454f99f417f6616b724d@sentry.wixpress.com; dd0a55ccb8124b9c9d938e3acf41f8aa@sentry.wixpress.com; info@expertaccounting.com"],
  [1019, "info@aurafinance.ca"],
  [1020, "michael@clearpathcfo.ca"],
  [1021, "anjana@singlafs.com"],
  [1025, "info@kvrcpa.ca"],
  [1026, "amirkhawaja@hotmail.com; info@easytaxcanada.com"],
  [1027, "sumitchopra@live.ca"],
  [1028, "sunny@sunnyrealestate.ca"],
  [1029, "info@mmagadia.com"],
  [1030, "bugreport@moatable.com"],
  [1033, "ravinalalli@hotmail.com; ravinalalli@hotmail.com"],
  [1036, "info@welovelittlestars.com; littlestars@bellnet.ca; mariola.symons@rogers.com"],
  [1037, "arqueries@plasp.com; arteam@plasp.com; childcare@plasp.com; volunteering@plasp.com"],
  [1039, "mara.lanz@brampton.ca"],
  [1040, "info@caledon.ca"],
  [1042, "salonsafari@rogers.com"],
  [1043, "asxvmprobertest@gmail.com; smart.journey.prober@gmail.com"],
  [1050, "info@divineeyecare.com"],
  [1051, "info@visionempire.ca"],
  [1053, "info@sunshineeyecare.ca"],
  [1055, "Emailwanlesscompoundingpharmacy@gmail.com; Emailwanlesscompoundingpharmacy@gmail.com"],
  [1058, "atulbadiani@hotmail.com; crystalbeachpharmacy@gmail.com; madawaskadrugs@gmail.com; pharmasave9407@gmail.com; portagepharmasave@gmail.com; ps406@email.ca"],
  [1059, "atulbadiani@hotmail.com; crystalbeachpharmacy@gmail.com; madawaskadrugs@gmail.com; pharmasave9407@gmail.com; portagepharmasave@gmail.com; ps406@email.ca"],
  [1064, "creditviewida@gmail.com"],
  [1065, "webmaster@cambridgesportandspine.com; webmaster@cambridgesportandspine.com"],
  [1066, "info@jonesfuneralhome.co"],
  [1067, "firstlinecars@hotmail.com; firstlinemotors@outlook.com"],
  [1068, "bramptonlearna@gmail.com; info@learnabrampton.com"],
  [1070, "info@southbramptondental.com"],
  [1072, "info@cbfht.com"],
  [1074, "oakvillevet@hotmail.com"],
  [1076, "info@dvma.ca"],
  [1077, "info@mankooguptacpa.com"],
  [1078, "info@platinumtax.ca"],
  [1079, "preet.arora@peelcpa.ca"],
  [1080, "Clientcare@Rpalcpa.ca"],
  [1081, "Riyataxes@hotmail.com; Info@riyadeol.ca"],
  [1082, "Info@scalecpa.ca"],
  [1083, "dharmg.realtor@gmail.com"],
  [1084, "prateek.kapur@century21.ca"],
  [1085, "garry.gill@live.com"],
  [1086, "realtorwillbasra@gmail.com"],
  [1088, "likeabhijeet@gmail.com"],
  [1097, "woodstockmotorsltd@hotmail.com"],
  [1098, "info@newtonstutoring.com"],
  [1099, "info@torbramdental.com"],
  [1100, "info@sehgaldental.com"],
  [1101, "info@kensingtondentaloffice.com"],
  [1104, "info@deltaparkdental.com"],
  [1105, "bcc@dentalstudiogta.com"],
  [1106, "contact@northgateclinic.com"],
  [1108, "info@reformphphysio.ca"],
  [1110, "info@limitlessrehab.ca"],
  [1111, "rupinder@sidhulc.com"],
  [1113, "taman@rzcdlaw.com"],
  [1114, "contact@bamrahgroup.ca"],
  [1115, "info@stscpa.ca; daljit@stscpa.ca"],
  [1116, "info@hsbatax.com"],
  [1119, "jagsellsgta@gmail.com"],
  [1120, "info@rakeshsharma.ca"],
  [1122, "Realtor.raj30@gmail.com"],
  [1125, "shikha@einsured.ca; info@einsured.ca"],
  [1127, "info@adhaliwal.ca"],
  [1128, "info@lifecareinsurance.ca"],
  [1129, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1130, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1131, "enrollment@brightpathkids.com; avondale@brightpathkids.comSend; info@brightpathkids.com; careers@brightpathkids.com"],
  [1132, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1134, "memberservices@ymcagta.org; Grenoble@ymcagta.org"],
  [1135, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1136, "EarlyONMarkham@FamilyDayCare.com; MississaugaEarlyON@FamilyDayCare.com; EarlyONThornhill@FamilyDayCare.com; DonValleyEastEarlyON@FamilyDayCare.com; ScarboroughCentreEarlyON@FamilyDayCare.com; EarlyONadmin@FamilyDayCare.com; EarlyONMarkhamEast@FamilyDayCare.com; bramptonearlyon@FamilyDayCare.com"],
  [1137, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1138, "Strengthcampcustomerservice@gmail.com; sctoronto@hotmail.com"],
  [1139, "wyzefit@gmail.com"],
  [1145, "lenzsmith@hotmail.com"],
  [1146, "store.bramaleacitycentre.ca@specsavers.com"],
  [1151, "brameastpharmacy@gmail.com"],
  [1152, "info@ignitehealthclinic.com"],
  [1154, "aimstudycentre.ca@gmail.com; info@aimstudycentre.ca; 691-1011aimstudycentre.ca@gmail.com"],
  [1157, "allstudybuddy@gmail.com"],
  [1158, "drqazi@drqazisigmadentistry.com"],
  [1161, "bramptonclinics@gmail.com"],
  [1162, "havephysio106@gmail.com"],
  [1164, "maxxcarephysio@gmail.com"],
  [1165, "dsaini@sainilaw.ca"],
  [1166, "info@omnilawfirm.ca"],
  [1178, "info@prepskills.com"],
  [1179, "brampton@orbdental.com"],
  [1180, "info@drpkahlon.com; staffdrpkahlon@gmail.com"],
  [1181, "info@care4family.ca"],
  [1182, "info@righttimerehab.ca; righttimerehab@gmail.com"],
  [1183, "info@vanrehabphysio.ca; __info@vanrehabphysio.ca; maltonvanrehab@gmail.com; vanrehabairport@gmail.com; bovairdvanrehabphysio@gmail.com"],
  [1185, "herman@hermandhillonlaw.com"],
  [1186, "sanjay@vermacpa.ca"],
  [1187, "ravinder@ravindermakkar.com; makkarcpa@gmail.com"],
  [1188, "HELLO@COUNTING.CLOUD"],
  [1190, "samlegharemax@gmail.com"],
  [1192, "beaumaris@laughandlearnelcc.com"],
  [1193, "memberservices@ymcagta.org; Goldcrest@ymcagta.org"],
  [1194, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1195, "311@brampton.ca"],
  [1197, "info@maharajabeautysalonandspa.com"],
  [1203, "smilebramalea@gmail.com"],
  [1206, "michaeldibua@gmail.com; michael.dibua@gmail.com"],
  [1207, "bsingh@balisingh.ca"],
  [1211, "homes@sukhdeepchawla.com"],
  [1213, "service@connexinsurance.com"],
  [1214, "info@glamorebeautybar.com"],
  [1220, "interface@interfacelaw.ca"],
  [1222, "info@bajwacpa.com"],
  [1223, "Profitpioneersinfo@gmail.com"],
  [1224, "info@dreammaxrealestate.com"],
  [1226, "info@heartlakeinsurance.com"],
  [1227, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1230, "Info@strattonlaw.ca"],
  [1234, "info@bramwestdental.com"],
  [1237, "info@accountor.ca"],
  [1239, "info@askmona.ca"],
  [1242, "drqazi@drqazibramptondentistry.ca"],
  [1243, "pearldentistry@icloud.com"],
  [1244, "info@qcdentistry.ca; 453-0999jagmohi@yahoo.ca"],
  [1246, "info@pinpointhealth.ca"],
  [1247, "contact@taxccount.com"],
  [1248, "millennium@century21.ca"],
  [1249, "calgarynorthwest@thebig.ca; tecumseh@thebig.ca; oshawanorth@thebig.ca; uxbridge@thebig.ca; peterborough@thebig.ca; grimsby@thebig.ca; sarnia@thebig.ca; niagarafalls@thebig.ca; altavista@thebig.ca; edmontoneast@thebig.ca; binbrook@thebig.ca; ouellettecorners@thebig.ca; contact@thebig.ca; moncton@thebig.ca; pickering@thebig.ca; oakvilleeast@thebig.ca; acton@thebig.ca; brantford@thebig.ca; mississaugawest@thebig.ca; whitby@thebig.ca; smithsfalls@thebig.ca; thornhill@thebig.ca; markhamsouth@thebig.ca; queensway@thebig.ca; sherwoodpark@thebig.ca; stouffville@thebig.ca; etobicoke@thebig.ca; bigcourtice@thebig.ca; forterie@thebig.ca; kingston@thebig.ca; maple@thebig.ca; lansing@thebig.ca; halifaxwest@thebig.ca; waterloo@thebig.ca; burlingtonwest@thebig.ca; clarkson@thebig.ca; scarborougheast@thebig.ca; cambridge@thebig.ca; woodstock@thebig.ca; kitchener@thebig.ca; ancaster@thebig.ca; riverside@thebig.ca; sudbury@thebig.ca; eastyork@thebig.ca; bolton@thebig.ca; aurora@thebig.ca; mississaugaeast@thebig.ca; georgetown@thebig.ca; kanata@thebig.ca; belleville@thebig.ca; fredericton@thebig.ca; deerfoot@thebig.ca; portcredit@thebig.ca; guelph@thebig.ca; brampton@thebig.ca; edmontonsouth@thebig.ca; markhamwest@thebig.ca; milton@thebig.ca; londoncentral@thebig.ca; vaughan@thebig.ca; markhamnorth@thebig.ca; orangeville@thebig.ca; ajax@thebig.ca; stoneycreek@thebig.ca; portunion@thebig.ca; richmondhill@thebig.ca; york@thebig.ca; reddeer@thebig.ca; bowmanville@thebig.ca; stcatharines@thebig.ca; hamilton@thebig.ca; oakville@thebig.ca; macleod@thebig.ca; northyork@thebig.ca; markhameast@thebig.ca; barrie@thebig.ca; westboro@thebig.ca; burlingtonsouth@thebig.ca; windsor@thebig.ca; burlingtonnorth@thebig.ca; bedford@thebig.ca"],
  [1250, "marketing@kidsandcompany.com; parents@kidsandcompany.com; backup@kidsandcompany.com; corporatesales@kidsandcompany.com; careers@kidsandcompany.com; brampton@kidsandcompany.com"],
  [1251, "info@revivebeautyspa.com"],
  [1252, "info@bc.pharmasave.ca"],
  [1254, "info@cornerstonepharmacy.ca"],
  [1261, "info@edserv.ca"],
  [1262, "dental2278@outlook.com; dental22736@outlook.com; dental22734@outlook.com; dental22735@outlook.com; dental22737@outlook.com; dental22732@outlook.com; dental22731@outlook.com; dental22733@outlook.com"],
  [1264, "feedback@cpso.on.ca"],
  [1265, "info.alignandhealclinic@gmail.com"],
  [1266, "legalassistant@titaniumlaw.ca; harsher@titaniumlaw.ca; info@titaniumlaw.ca"],
  [1267, "corporate@msassociates.ca; info@msassociates.ca"],
  [1269, "lifeline.insurances@gmail.com"],
  [1273, "info@glamorousbeautysalonandspa.com"],
  [1274, "chiceyes115@gmail.com"],
  [1275, "avalawellness@gmail.com"],
  [1278, "info@aligndentalsmiles.com"],
  [1279, "info@janfamilyclinic.ca"],
  [1284, "sales@autokart.ca"],
  [1285, "info@bramptondentalwalkin.com"],
  [1291, "domainforsale@incomrealestate.com"],
  [1292, "info@theplanetinsurance.com"],
  [1294, "311@brampton.ca"],
  [1295, "dev7561@gmail.com"],
  [1297, "info@ccrcclinic.com"],
  [1298, "hello@fortishealth.ca"],
  [1301, "info@brcpa.ca"],
  [1302, "kapil.remaxclientcare@gmail.com"],
  [1305, "memberservices@ymcagta.org"],
  [1306, "info.ivmoptical@gmail.com"],
  [1308, "info@globaldentaloffice.ca"],
  [1309, "info@passipatel.com"],
  [1311, "hornbillinsurance@gmail.com"],
  [1312, "allinsuredinc@gmail.com"],
  [1315, "info@pharmasavebramcentre.com"],
  [1322, "homesteaddental@yahoo.com; Homesteaddental@yahoo.com"],
  [1323, "info@glenroseparkdental.ca"],
  [1328, "info@garglaw.ca"],
  [1332, "vitalrxpharmacy@gmail.com"],
  [1335, "info@valleycreekdental.com"],
  [1337, "smile@abcfamilydental.ca"],
  [1345, "info@lawofficeamansharma.ca"],
  [1346, "info@apsodhilawoffice.com"],
  [1348, "info@rrmlawoffice.com"],
  [1350, "ashok@aptaccounting.ca; apttaxservices@gmail.com"],
  [1351, "info@wilsoncpa.ca"],
  [1352, "onkarscheema@gmail.com"],
  [1354, "insurewithekta@gmail.com; info@einsured.ca"],
  [1358, "kelly@wildlingslearning.ca"],
  [1361, "eyeonox@gmail.com"],
  [1362, "epicvisioneyecare@gmail.com"],
  [1363, "info.chalooptical@gmail.com"],
  [1364, "info@riverstoneeyecare.com"],
  [1370, "bolton@eganfuneralhome.com"],
  [1373, "info@demarcofuneralhomes.com; demarcokeele@gmail.com; demarcowood@hotmail.com"],
  [1374, "hwy27dentalclinic@gmail.com"],
  [1375, "info@milanidentistry.ca"],
  [1379, "riverstonedental@porterdentistry.ca; northparkdental@porterdentistry.ca"],
  [1382, "info@noordental.com; contact@noordental.com"],
  [1383, "+1-905-303-0066info@marbledentalcentre.ca; Info@MarbleDentalCentre.ca; info@marbledentalcentre.ca"],
  [1387, "info@medicalwalkin.ca"],
  [1388, "imaphysiocentre@gmail.com"],
  [1389, "vellorewoodsveterinary@gmail.com; support@evetsites.com"],
  [1390, "staff@westwoodbridgepethospital.com"],
  [1391, "careteam@kleinburgvet.com"],
  [1392, "wecare@deanvet.ca"],
  [1395, "info@sutherlaw.com"],
  [1399, "closer2homeccc@gmail.com"],
  [1401, "info@kingacademychildcarecentre.com"],
  [1402, "kiddycity292@gmail.com"],
  [1403, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1405, "info@iron24.com"],
  [1410, "budgeting@vaughan.ca; integrity.commissioner@vaughan.ca; parks@vaughan.ca; corpcomm@vaughan.ca; mayor@vaughan.ca; chris.ainsworth@vaughan.ca; service@vaughan.ca; recCSD@vaughan.ca; rec@vaughan.ca; procurement@vaughan.ca; officecio@vaughan.ca; humanresources@vaughan.ca; firerescue@vaughan.ca; ipcam@vaughan.ca; buildingstandards@vaughan.ca; rosanna.defrancesca@vaughan.ca; QRealEstate@vaughan.ca; fitness@vaughan.ca; transitinfo@york.ca; marilyn.iafrate@vaughan.ca; mario.ferri@vaughan.ca; environment@vaughan.ca; bylaw@vaughan.ca; marioG.racco@vaughan.ca; fleet@vaughan.ca; ed@vaughan.ca; gino.rosati@vaughan.ca; customerservice@alectrautilities.com; adriano.volpentesta@vaughan.ca; linda.jackson@vaughan.ca; council@vaughan.ca; mobilityplusfeedback@york.ca; clerks@vaughan.ca; gila.martow@vaughan.ca; lobbyistregistrar@vaughan.ca; prepE@vaughan.ca; infrastructure.delivery@vaughan.ca"],
  [1414, "abaus@drtangeyecare.com; info@drtangeyecare.com"],
  [1415, "info@vaughanmillseyecare.com"],
  [1418, "info@drpink.ca"],
  [1428, "Info@delsolepharmacy.ca"],
  [1437, "info@purealignmentchiropractic.ca"],
  [1438, "john@bacdoc.ca"],
  [1441, "info@vibrantlifechiropractic.com"],
  [1442, "dr.cafaro@ivchc.ca"],
  [1443, "info@avidclinic.com"],
  [1445, "vfhmapleoffice@gmail.com; vfhtorontooffice@gmail.com; info@vesciofuneralhome.com; vfhwoodbridgeoffice@gmail.com"],
  [1447, "vfhmapleoffice@gmail.com; vfhtorontooffice@gmail.com; info@vesciofuneralhome.com; vfhwoodbridgeoffice@gmail.com"],
  [1451, "frenchwithsisters@gmail.com"],
  [1453, "stc@medcareclinics.com; markham@medcareclinics.com; newmarket@medcareclinics.com; waterdown@medcareclinics.com; vaughan@medcareclinics.com; info@medcareclinics.com; mayfield@medcareclinics.com; riverview@medcareclinics.com; burlington@medcareclinics.com; hamilton@medcareclinics.com; welland@medcareclinics.com; pc@medcareclinics.com; kitchener@medcareclinics.com; niagara@medcareclinics.com"],
  [1455, "info@physiotherapyfirst.ca"],
  [1456, "info@bodysensesphysio.ca"],
  [1461, "info@bkllp.ca"],
  [1463, "accountant@kaapro.ca"],
  [1464, "goldychatha@gmail.com; goldychatha@gmail.com"],
  [1467, "Dreambeautylaserservices@gmail.com"],
  [1469, "info@pharmasaveconnaught.com"],
  [1471, "newmarket@medcaredrugmart.com; niagara@medcaredrugmart.com; riverview@medcaredrugmart.com"],
  [1477, "varsha@innovativelearning.ca"],
  [1478, "Info@gorewaydental.com"],
  [1479, "derry@toothcorner.com; help@toothcorner.com"],
  [1480, "admin@gkmedcenter.com; dhillonmedcenter@gmail.com"],
  [1483, "Kimberley.Floyd@wellfort.ca; finance@wellfort.ca; info@wellfort.ca"],
  [1484, "media@ontariohealthathome.ca"],
  [1487, "airportmedicalhealth@gmail.com"],
  [1492, "airportmedicalhealth@gmail.com"],
  [1493, "pearsonphysiotherapyclinic@gmail.com"],
  [1494, "titanphysiotherapyhealth@gmail.com"],
  [1495, "bramptonphysioandmassage@gmail.com"],
  [1497, "info@gorewayphysiotherapy.com"],
  [1498, "humberwoodvet@gmail.com"],
  [1499, "Info@infinitylawfirm.ca"],
  [1501, "info@minhaslawyers.ca; rupinder@minhaslawyers.ca; manpreet@minhaslawyers.ca"],
  [1502, "info@legalroute.ca"],
  [1503, "contact@gsbrar.law"],
  [1504, "info@babbaraccountant.com; info@website.com"],
  [1505, "info@reliableaoc.com"],
  [1506, "mohan.kundra@tagroup.ca"],
  [1509, "info@Aimsgroup.ca"],
  [1511, "sultan@monarchaccounting.ca"],
  [1513, "info@radtax.ca"],
  [1515, "info@hbaccounting.ca"],
  [1516, "info@ariseaccounting.ca"],
  [1517, "skyportfinancialgroup@gmail.com"],
  [1519, "jagkenhomes@gmail.com; ken.purewal@gmail.com"],
  [1520, "dealswithrav@gmail.comBrampton; dealswithrav@gmail.com"],
  [1521, "hardeep@indexrealtybrokerage.com; info@indexrealtybrokerage.com"],
  [1526, "contacts@realtyspace.com; info@vinodbansal.com; hello@realtyspace.com; florida@realtyspace.com; info@realtors4you.ca"],
  [1527, "info@vinodbansal.com"],
  [1529, "team@canadacareinsurance.ca"],
  [1532, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1533, "rainbowvillagedaycarecentre@gmail.com"],
  [1534, "daisybluechildcare@gmail.com"],
  [1535, "ARTeam@plasp.com; volunteering@plasp.com; childcare@plasp.com"],
  [1536, "littletownchildcare@outlook.com"],
  [1537, "311@toronto.ca"],
  [1540, "TransferServices@HumberITAL.onmicrosoft.com; cplhelp@humber.ca"],
  [1545, "info@levanawellnessspa.ca; Info@Levanawellnessspa.ca"],
  [1550, "BramptonOptometrists@gmail.com"],
  [1551, "dhaliwalpharmacy@hotmail.com"],
  [1554, "thp140@thpharmacy.com"],
  [1557, "drtfarooq@gmail.com"],
  [1558, "maltonpainandrehab@gmail.com"],
  [1559, "info@pinpointhealth.ca"],
  [1560, "humbervalleychiropractic@bellnet.ca"],
  [1562, "mymail@mailservice.com"],
  [1566, "contact@learninggeniusacademy.com"],
  [1567, "info@easytutoring.ca"],
  [1568, "info@prismdental.ca"],
  [1569, "contact@thesmilecompany.ca"],
  [1570, "kennedymail125@gmail.com"],
  [1571, "info@apexucc.ca"],
  [1572, "info@inglewoodvetclinic.com"],
  [1573, "info@cheltenhamvet.ca"],
  [1577, "caledonoptometry@outlook.com"],
  [1582, "vfhmapleoffice@gmail.com; vfhtorontooffice@gmail.com; info@vesciofuneralhome.com; vfhwoodbridgeoffice@gmail.com"]
];

export async function importScrapedEmails(
  onProgress: (msg: string) => void
): Promise<{ updated: number }> {
  const token = await getAccessToken();
  let updated = 0;
  const BATCH_SIZE = 50;
  for (let b = 0; b < SCRAPED_EMAILS.length; b += BATCH_SIZE) {
    const batch = SCRAPED_EMAILS.slice(b, b + BATCH_SIZE);
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            valueInputOption: 'USER_ENTERED',
            data: batch.map(([row, email]) => ({ range: `${SHEET_NAME}!I${row}`, values: [[email]] })),
          }),
        }
      );
      updated += batch.length;
      onProgress(`Imported ${updated}/${SCRAPED_EMAILS.length} emails...`);
    } catch (e) {
      console.warn(`Batch failed at ${b}:`, e);
    }
    if (b + BATCH_SIZE < SCRAPED_EMAILS.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  onProgress(`Done. ${updated} emails imported.`);
  return { updated };
}
