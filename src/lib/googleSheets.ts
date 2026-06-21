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
      placeId: row[8] || '',
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
