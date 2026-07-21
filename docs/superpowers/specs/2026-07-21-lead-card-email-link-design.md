# Lead Card Email Link

**Date:** 2026-07-21
**Status:** Approved

## Problem

Email addresses displayed in LeadCard are plain text — users must copy the email and manually open their email client to compose a message.

## Design

Wrap the email address in a `<a href="mailto:...">` tag so clicking it opens the default email client.

### File Change

**`src/components/leads/LeadCard.tsx:208`**

```
<span className="truncate max-w-[180px]">{lead.email}</span>
```
→
```
<a href={`mailto:${lead.email}`} target="_blank" rel="noopener noreferrer" className="truncate max-w-[180px] text-blue-600 hover:text-blue-700">{lead.email}</a>
```

### Styling

Matches the existing website link pattern (line 217-220): blue text with hover effect, for visual consistency.

### Behavior

- `target="_blank"` per user preference
- Opens system default email client with recipient pre-filled
- Same-page navigation is preserved (mailto: links don't navigate away)

## Scope

Single file, one-line change. No new dependencies, types, or components.
