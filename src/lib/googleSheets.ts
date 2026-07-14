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

interface GapiResponse<T> {
  result: T;
}

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
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:O`,
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
      placeId: row[COLUMNS.O.index] || String(i + 1),
      gpsCoordinates: row[COLUMNS.J.index] || '',
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
    const reviews = (data.reviews || []).map((r: any) => ({
      name: r.name || '',
      rating: r.rating,
      text: r.text || r.originalText || { text: '', languageCode: 'en' },
      authorAttribution: r.authorAttribution || {},
      publishTime: r.publishTime || '',
      relativePublishTimeDescription: r.relativePublishTimeDescription || '',
    }));
    return {
      phone: data.internationalPhoneNumber || '',
      website: data.websiteUri || '',
      reviews: JSON.stringify(reviews),
    };
  } catch { return { phone: '', website: '', reviews: '[]' }; }
}

async function searchPlaces(query: string): Promise<{ places: PlaceResult[]; total: number }> {
  const body: any = { textQuery: query, maxResultCount: 20 };
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
    places: data.places.map((p: any) => ({
      id: p.id,
      name: p.displayName?.text || '',
      place_id: p.id || '',
      formatted_address: p.formattedAddress || '',
      rating: p.rating,
      userRatingCount: p.userRatingCount || 0,
      types: p.types || [],
      location: p.location,
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
  const resultsRows = await fetchSheetValues(token, 'Results!A:O');
  const seenKeys = new Set<string>();
  for (let i = 1; i < resultsRows.length; i++) {
    const name = String(resultsRows[i][COLUMNS.C.index] || '').toLowerCase().trim();
    const address = String(resultsRows[i][COLUMNS.F.index] || '');
    const city = address.split(',')[1]?.trim().toLowerCase() || '';
    if (name) seenKeys.add(`${name}|${city}`);
  }

  // Scrape
  let newRows: (string | null)[][] = [];
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

  // Write zip statuses back to AZ Zips sheet
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
    const range = `Results!A${lastRow + 1}:O${lastRow + newRows.length}`;

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range, majorDimension: 'ROWS', values: newRows }),
      }
    );
  }

  onProgress(`Done. ${newRows.length} new leads added.`);
  return { searched, added: newRows.length, existing: seenKeys.size };
}

export async function backfillPlaceIds(
  onProgress: (msg: string) => void
): Promise<{ updated: number }> {
  const token = await getAccessToken();
  onProgress('Reading leads...');
  const rows = await fetchSheetValues(token, 'Results!A:O');

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


