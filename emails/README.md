# GTA Scrub — Cold Outreach Email Templates

HTML email templates for reaching out to dental and medical practice leads in the GTA.

## Files

| File | Purpose |
|---|---|
| `cold-outreach-dental.html` | Primary template for cold outreach to dental clinics |

## Merge Fields

Replace these placeholders with data from your Google Sheets lead list:

| Field | Maps To (Sheet Column) | Example | Required |
|---|---|---|---|
| `{{business_name}}` | Column C — `title` | "Magnolia Dental Brampton" | Yes |
| `{{first_name}}` | Manual or default fallback | "there" | No — defaults to "there" |
| `{{rating}}` | Column E — `rating` | "5.0" | Yes |
| `{{reviews_count}}` | Column G — `reviews` (count array items) | "134" | No |
| `{{city}}` | Column F — `address` (extract city after last comma) | "Brampton" | Yes |
| `{{unsubscribe_url}}` | Generated per send | URL | Yes |

### Extracting City from Address

Your address column is formatted as: `"45 Gateway Blvd #7, Brampton, ON L6T 0H8, Canada"`

Use this Google Sheets formula to extract the city:
```
=TRIM(INDEX(SPLIT(F2, ","), 1, 2))
```

### Extracting Reviews Count

The reviews column contains JSON arrays. Count them with:
```
=COUNTA(SPLIT(REGEXREPLACE(G2, "[\[\]{}""]",""), ","))
```

## How to Send

### Option 1: Gmail Mail Merge (Recommended)

1. Install [Yet Another Mail Merge](https://workspace.google.com/marketplace/app/yet_another_mail_merge/5267904932) or [GMass](https://www.gmass.co/)
2. Set up your Google Sheet as the data source
3. Map merge fields from the Sheet columns to the template placeholders
4. Send a test to yourself first

### Option 2: Manual via Gmail

1. Copy the HTML source of `cold-outreach-dental.html`
2. In Gmail, click the three dots → "Show original" → copy any email
3. Paste the HTML into a tool like [Stripo](https://stripo.email/) or [Postdrop](https://app.postdrop.io/)
4. Replace merge fields manually for each lead
5. Export and paste into Gmail compose

### Option 3: SendGrid / Mailchimp

1. Upload the HTML as a custom template
2. Import your Google Sheet as a CSV contact list
3. Map merge fields in the platform's template editor
4. Schedule your campaign

## Pre-Send Checklist

- [ ] Replace all `{{merge_fields}}` with real data
- [ ] `{{unsubscribe_url}}` is a valid link
- [ ] Test send to yourself (check Gmail, Outlook, Apple Mail rendering)
- [ ] Verify all links work (`gtascrub.com/contact`, `tel:+12892770213`, etc.)
- [ ] Subject line set (see recommendations below)
- [ ] Sending from `info@gtascrub.com` or a sender the domain can authenticate (SPF/DKIM)

## Recommended Subject Lines

**A/B test these:**

| Subject | Style |
|---|---|
| "{{rating}} stars and {{reviews_count}} reviews — but is it spotless?" | Curiosity |
| "A free demo clean for {{business_name}}?" | Direct offer |
| "The one thing every {{city}} patient review mentions" | Teaser |
| "Your {{rating}}-star practice deserves a 5-star clean" | Ratings hook |
| "Helping dental practices in {{city}} stay spotless" | Helpful/soft |

## Template Preview

Open `cold-outreach-dental.html` in your browser to preview. For more accurate email rendering, use:
- [Litmus PutsMail](https:// putsmail.com/tests/new) (free email previews)
- [Email on Acid](https://www.emailonacid.com/) (comprehensive client testing)

## Compliance

- **CAN-SPAM:** Unsubscribe link included in footer
- **CASL (Canada):** Ensure you have implied consent for B2B outreach. These are publicly listed businesses with addresses you scraped — but consult legal advice for your specific case.
