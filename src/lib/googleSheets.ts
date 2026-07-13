// ============================================================
// GTA Scrub — Google Sheets API Service
// ============================================================
// Handles OAuth token management and Sheets API read/write
// for the Leads Call Center feature.
// ============================================================

import type { Lead, CallOutcome } from '../types';

// ─── Configuration ──────────────────────────────────────────

const CLIENT_ID = '1065566722892-0qq7pm931g6cnd4l2e5emtigt4r0jqr3.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const SPREADSHEET_ID = '1-0wOhrEFX5EkiajX0gtNFsVSDCaPObt8rD94kQoK6XA';
const SHEET_NAME = 'Results';

// Column mapping (A=1, B=2, ...)
const COL = {
  type: 1, phone: 2, businessName: 3, types: 4, rating: 5,
  address: 6, reviews: 7, website: 8, placeId: 9, gpsCoordinates: 10,
  callStatus: 11, calledBy: 12, lastCalled: 13, notes: 14,
};

// Header labels we expect / write
const HEADER_LABELS: Record<number, string> = {
  [COL.callStatus]: 'Call Status',
  [COL.calledBy]: 'Called By',
  [COL.lastCalled]: 'Last Called',
  [COL.notes]: 'Notes',
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
 * Ensure the header columns (Call Status, Called By, etc.) exist.
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
  for (const [colIndex, label] of Object.entries(HEADER_LABELS)) {
    const colLetter = columnLetter(Number(colIndex));
    // If the column doesn't exist or header doesn't match
    if (!existingHeaders[Number(colIndex) - 1]) {
      updates.push({ range: `${SHEET_NAME}!${colLetter}1`, value: label });
    }
  }

  if (updates.length === 0) { headersEnsured = true; return; }

  const body = {
    valueInputOption: 'USER_ENTERED',
    data: updates.map(u => ({ range: u.range, values: [[u.value]] })),
  };

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:J`,
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
      type: row[0] || '',
      phone: row[1] || '',
      businessName: row[2] || '',
      types: row[3] || '',
      rating: row[4] || '',
      address: row[5] || '',
      reviews: row[6] || '',
      website: row[7] || '',
      email: row[8] || '',
      placeId: String(i + 1),
      gpsCoordinates: row[9] || '',
    });
  }

  // Ensure header columns exist (async, non-blocking)
  ensureHeaderColumns().catch(() => {});

  return leads;
}

/** Write call outcome back to the sheet for a given lead */
export async function updateLeadInSheet(
  rowIndex: number,
  outcome: CallOutcome,
  calledByName: string,
  notes: string,
): Promise<void> {
  const token = await getAccessToken();
  const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' });

  const statusLabels: Record<CallOutcome, string> = {
    completed: 'Completed',
    no_answer: 'No Answer',
    wrong_number: 'Wrong Number',
    callback: 'Callback',
  };

  const data = [
    { col: COL.callStatus, value: statusLabels[outcome] },
    { col: COL.calledBy, value: calledByName },
    { col: COL.lastCalled, value: now },
    { col: COL.notes, value: notes },
  ];

  // Build batch update
  const body = {
    valueInputOption: 'USER_ENTERED',
    data: data.map(d => ({
      range: `${SHEET_NAME}!${columnLetter(d.col)}${rowIndex}`,
      values: [[d.value]],
    })),
  };

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    if (response.status === 401) throw new Error('NEEDS_AUTH');
    throw new Error(`Sheets API write error: ${response.status}`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function columnLetter(n: number): string {
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
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
  'Hotel / Motel',
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

async function searchPlaces(query: string, lat?: number, lng?: number): Promise<PlaceResult[]> {
  const body: any = { textQuery: query, maxResultCount: 20 };
  if (lat !== undefined && lng !== undefined) {
    body.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius: 5000.0 },
    };
  }
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
  if (!data.places) return [];
  return data.places.map((p: any) => ({
    id: p.id,
    name: p.displayName?.text || '',
    place_id: p.id || '',
    formatted_address: p.formattedAddress || '',
    rating: p.rating,
    userRatingCount: p.userRatingCount || 0,
    types: p.types || [],
    location: p.location,
  }));
}

async function geocodePostalCode(zip: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip + ' Ontario Canada')}&key=${PLACES_API_KEY}`
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch { return null; }
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

  // Read zips
  onProgress('Reading postal codes...');
  const zipRows = await fetchSheetValues(token, 'AZ+Zips!A:B');
  const zips: string[] = [];
  for (let i = 1; i < zipRows.length; i++) {
    const z = String(zipRows[i][0] || '').trim();
    if (z) zips.push(z);
  }

  // Read existing placeIds AND business names for dedup
  onProgress('Checking existing leads...');
  const resultsRows = await fetchSheetValues(token, 'Results!A:N');
  const existingPlaceIds = new Set<string>();
  const existingNames = new Set<string>();
  for (let i = 1; i < resultsRows.length; i++) {
    const pid = resultsRows[i][8]; // Column I = placeId
    const name = String(resultsRows[i][2] || '').toLowerCase().trim(); // Column C = title
    if (pid) existingPlaceIds.add(String(pid).trim());
    if (name) existingNames.add(name);
  }

  // Scrape
  let newRows: string[][] = [];
  let searched = 0;

  for (const zip of zips) {
    onProgress(`Geocoding ${zip}...`);
    const coords = await geocodePostalCode(zip);
    if (!coords) {
      onProgress(`Skipping ${zip} — could not geocode`);
      continue;
    }

    for (const category of categories) {
      searched++;
      onProgress(`Searching: ${category} in ${zip} (${searched}/${zips.length * categories.length})`);
      try {
        const places = await searchPlaces(
          `${category}`,
          coords.lat,
          coords.lng
        );
        for (const place of places) {
          const nameKey = place.name.toLowerCase().trim();
          if (existingPlaceIds.has(place.place_id)) continue;
          if (existingNames.has(nameKey)) continue;
          existingPlaceIds.add(place.place_id);
          existingNames.add(nameKey);

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
            '',                                      // I: email (not available from Places API)
            gps,                                     // J: gpsCoordinates
            '', '', '', ''                           // K-N: tracking columns
          ]);
        }
      } catch (e) {
        console.warn(`Failed: ${category} in ${zip}`, e);
      }
    }
  }

  // Write to Results tab
  if (newRows.length > 0) {
    onProgress(`Writing ${newRows.length} new leads...`);
    const lastRow = resultsRows.length; // already has header at row 0
    const range = `Results!A${lastRow + 1}:N${lastRow + newRows.length}`;

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
  return { searched, added: newRows.length, existing: existingPlaceIds.size };
}
