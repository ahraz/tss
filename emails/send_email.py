#!/usr/bin/env python3
"""Send GTA Scrub cold outreach email via Gmail SMTP."""
import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from getpass import getpass

FROM_NAME = "GTA Scrub"
FROM_EMAIL = "info.gtascrub@gmail.com"
REPLY_TO = "info@gtascrub.com"
TO_EMAIL = "zoofishanfatima00@gmail.com"

SUBJECT = "A 4.8-star Brampton practice deserves a 5-star clean"

with open("emails/rendered-keshavarz-dentistry.html", "r") as f:
    html_content = f.read()

plain_text = """Hi there,

I'm reaching out because Keshavarz Dentistry in Brampton has built a strong
reputation — 4.8 stars across 5+ reviews. Patients notice when a practice is
spotless. We make sure yours always is.

GTA Scrub provides photo-verified commercial cleaning for dental and medical
practices across the GTA. Every clean comes with a CleanCheck report —
timestamped photos proving the job was done to standard.

What sets us apart:
- Photo-verified reports — see exactly what was cleaned
- No long-term contracts — cancel anytime
- Medical-grade disinfection for exam rooms and high-touch zones
- Fully insured & bonded — every cleaner background-checked

Try us risk-free with a free demo clean. No commitment. No charge.
Just a spotless practice and a photo-verified report to prove it.

Claim your free demo: https://gtascrub.com/contact
Or call: (289) 277-0213

--
GTA Scrub
20 Glenfield Cres, Brampton, ON L6S 1W2
info@gtascrub.com | gtascrub.com"""

msg = MIMEMultipart("alternative")
msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
msg["Reply-To"] = REPLY_TO
msg["To"] = TO_EMAIL
msg["Subject"] = SUBJECT

msg.attach(MIMEText(plain_text, "plain", "utf-8"))
msg.attach(MIMEText(html_content, "html", "utf-8"))

app_password = getpass("Gmail App Password for info.gtascrub@gmail.com: ").strip()

if not app_password:
    print("No password provided. Aborting.")
    sys.exit(1)

print(f"\nSending to {TO_EMAIL}...")

try:
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(FROM_EMAIL, app_password)
        server.send_message(msg)
    print("Email sent successfully.")
except smtplib.SMTPAuthenticationError:
    print("ERROR: Authentication failed. Check your app password.")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
