#!/usr/bin/env python3
"""Write scraped emails directly to the Google Sheet via OAuth + Google Sheets API."""

import csv
import json
import os
import re
import socket
import sys
import urllib.parse
import urllib.request
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler

CLIENT_ID = '1065566722892-0qq7pm931g6cnd4l2e5emtigt4r0jqr3.apps.googleusercontent.com'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SPREADSHEET_ID = '1-0wOhrEFX5EkiajX0gtNFsVSDCaPObt8rD94kQoK6XA'
SHEET_NAME = 'Results'
TOKEN_FILE = '.sheet-oauth-token.json'

PLACEHOLDER_PATTERNS = [
    'filler@', 'youremail@', '@example.com', '@godaddy.com',
    '@domain.com', '@email.com', '@test.com', '@yourdomain.com',
    'no-email', 'noemail',
]

def is_placeholder(email):
    e = email.lower()
    return any(p.lower() in e for p in PLACEHOLDER_PATTERNS)

def clean_emails(email_str):
    emails = [e.strip() for e in email_str.split(';') if e.strip()]
    real = [e for e in emails if not is_placeholder(e)]
    return '; '.join(real) if real else None

def load_emails():
    rows = []
    with open('lead-emails-for-sheet.csv', newline='') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) < 2:
                continue
            sheet_row, email = row[0].strip(), row[1].strip()
            if not sheet_row or not email:
                continue
            clean = clean_emails(email)
            if not clean:
                continue
            rows.append((int(sheet_row), clean))
    rows.sort(key=lambda x: x[0])
    return rows

def http_json(url, data=None, headers=None, method=None):
    if headers is None:
        headers = {}
    if data is not None:
        headers.setdefault('Content-Type', 'application/json')
        if isinstance(data, dict) or isinstance(data, list):
            data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f'HTTP {e.code}: {body}')
        sys.exit(1)

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

class OAuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        if 'code' in params:
            self.server.auth_code = params['code'][0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(b'<html><body><h1>Authorization complete!</h1><p>You can close this tab and return to the terminal.</p></body></html>')
        else:
            self.send_response(400)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Missing authorization code')
    def log_message(self, fmt, *args):
        pass

def get_redirect_uri(port):
    return f'http://127.0.0.1:{port}'

def authenticate():
    saved = None
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE) as f:
            saved = json.load(f)
    
    if saved and 'refresh_token' in saved:
        print('Using saved refresh token...')
        data = {
            'client_id': CLIENT_ID,
            'refresh_token': saved['refresh_token'],
            'grant_type': 'refresh_token',
        }
        encoded = urllib.parse.urlencode(data).encode('utf-8')
        try:
            resp = http_json('https://oauth2.googleapis.com/token', data=encoded, 
                           headers={'Content-Type': 'application/x-www-form-urlencoded'})
            if 'refresh_token' not in resp:
                resp['refresh_token'] = saved['refresh_token']
            with open(TOKEN_FILE, 'w') as f:
                json.dump(resp, f)
            os.chmod(TOKEN_FILE, 0o600)
            return resp['access_token']
        except Exception as e:
            print(f'Refresh failed: {e}. Re-authenticating...\n')

    port = find_free_port()
    redirect_uri = get_redirect_uri(port)
    
    scope_str = ' '.join(SCOPES)
    auth_url = (
        f'https://accounts.google.com/o/oauth2/v2/auth?'
        f'client_id={CLIENT_ID}&'
        f'redirect_uri={urllib.parse.quote(redirect_uri)}&'
        f'response_type=code&'
        f'scope={urllib.parse.quote(scope_str)}&'
        f'access_type=offline&'
        f'prompt=consent'
    )

    print(f'\n{"="*60}', flush=True)
    print(f'Open this URL in your browser to authorize:', flush=True)
    print(f'  {auth_url}', flush=True)
    print(f'{"="*60}', flush=True)
    
    try:
        webbrowser.open(auth_url)
    except:
        pass

    server = HTTPServer(('127.0.0.1', port), OAuthHandler)
    server.auth_code = None
    server.timeout = 300
    
    print('Waiting for authorization in browser... (will timeout in 5 minutes)', flush=True)
    while server.auth_code is None:
        server.handle_request()
    
    auth_code = server.auth_code
    server.server_close()
    
    data = urllib.parse.urlencode({
        'code': auth_code,
        'client_id': CLIENT_ID,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }).encode('utf-8')
    
    token_data = http_json('https://oauth2.googleapis.com/token', data=data,
                          headers={'Content-Type': 'application/x-www-form-urlencoded'})
    
    with open(TOKEN_FILE, 'w') as f:
        json.dump(token_data, f)
    os.chmod(TOKEN_FILE, 0o600)
    
    print('Authorization granted!')
    return token_data['access_token']

def write_emails(access_token, rows):
    total = len(rows)
    print(f'Writing {total} emails to column I in sheet...')

    written = 0
    BATCH_SIZE = 50

    for i in range(0, total, BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        payload = {
            'valueInputOption': 'USER_ENTERED',
            'data': [{'range': f'{SHEET_NAME}!I{row}', 'values': [[email]]} for row, email in batch],
        }
        headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}

        for retry in range(3):
            try:
                http_json(
                    f'https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values:batchUpdate',
                    data=payload, headers=headers,
                )
                written += len(batch)
                print(f'  {written}/{total} ({written * 100 // total}%)')
                break
            except urllib.error.HTTPError as e:
                if e.code == 401 and retry < 2:
                    print('  Token expired, refreshing...')
                    saved = None
                    if os.path.exists(TOKEN_FILE):
                        with open(TOKEN_FILE) as f:
                            saved = json.load(f)
                    if saved and 'refresh_token' in saved:
                        data = urllib.parse.urlencode({
                            'client_id': CLIENT_ID,
                            'refresh_token': saved['refresh_token'],
                            'grant_type': 'refresh_token',
                        }).encode('utf-8')
                        resp = http_json('https://oauth2.googleapis.com/token', data=data,
                                        headers={'Content-Type': 'application/x-www-form-urlencoded'})
                        if 'refresh_token' not in resp:
                            resp['refresh_token'] = saved['refresh_token']
                        with open(TOKEN_FILE, 'w') as f:
                            json.dump(resp, f)
                        access_token = resp['access_token']
                        headers['Authorization'] = f'Bearer {access_token}'
                else:
                    raise

    print(f'\nDone! {written}/{total} emails written.')
    if written < total:
        print(f'⚠️  {total - written} failed.')
    else:
        print('✓ All emails successfully imported to the sheet.')

if __name__ == '__main__':
    rows = load_emails()
    print(f'Loaded {len(rows)} emails', flush=True)

    access_token = authenticate()
    write_emails(access_token, rows)
