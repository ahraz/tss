import csv
import re

PLACEHOLDER_PATTERNS = [
    re.compile(r'filler@', re.I),
    re.compile(r'youremail@', re.I),
    re.compile(r'@example\.com', re.I),
    re.compile(r'@godaddy\.com', re.I),
    re.compile(r'@domain\.com', re.I),
    re.compile(r'@email\.com', re.I),
    re.compile(r'@test\.com', re.I),
    re.compile(r'@yourdomain\.com', re.I),
    re.compile(r'no-?email', re.I),
    re.compile(r'noemail', re.I),
]

def is_placeholder(email):
    for p in PLACEHOLDER_PATTERNS:
        if p.search(email):
            return True
    return False

def clean_emails(email_str):
    emails = [e.strip() for e in email_str.split(';') if e.strip()]
    real = [e for e in emails if not is_placeholder(e)]
    return '; '.join(real) if real else None

rows = []
with open('lead-emails-for-sheet.csv', newline='') as f:
    reader = csv.reader(f)
    headers = next(reader)
    for row in reader:
        if len(row) < 2:
            continue
        sheet_row = row[0].strip()
        email = row[1].strip()
        if not sheet_row or not email:
            continue
        clean = clean_emails(email)
        if not clean:
            continue
        rows.append((int(sheet_row), clean))

rows.sort(key=lambda x: x[0])

def format_array(rows):
    parts = []
    for r, email in rows:
        escaped = email.replace('\\', '\\\\').replace("'", "\\'")
        parts.append(f"[{r}, '{escaped}']")
    return '[\n' + ',\n'.join(parts) + '\n]'

array_str = format_array(rows)

GS_FILE = 'scripts/import-emails.gs'
HTML_FILE = 'scripts/email-importer.html'

with open(GS_FILE, 'r') as f:
    gs_content = f.read()

with open(HTML_FILE, 'r') as f:
    html_content = f.read()

gs_start = gs_content.find('const EMAIL_UPDATES = ')
gs_end = gs_content.find('\n];', gs_start) + 3 if gs_content.find('\n];', gs_start) != -1 else gs_content.find('];', gs_start) + 2
gs_new = gs_content[:gs_start] + f'const EMAIL_UPDATES = {array_str};\n' + gs_content[gs_end+1:]

html_start = html_content.find('const EMAIL_DATA = ')
html_end = html_content.find('\n];', html_start) + 3 if html_content.find('\n];', html_start) != -1 else html_content.find('];', html_start) + 2
html_new = html_content[:html_start] + f'const EMAIL_DATA = {array_str};\n' + html_content[html_end+1:]

with open(GS_FILE, 'w') as f:
    f.write(gs_new)

with open(HTML_FILE, 'w') as f:
    f.write(html_new)

print(f"Updated {GS_FILE} — {len(rows)} rows")
print(f"Updated {HTML_FILE} — {len(rows)} rows")
