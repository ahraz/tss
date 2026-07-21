# Lead Card Email Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the email address in LeadCard into a clickable mailto: link.

**Architecture:** Single-line change in `LeadCard.tsx` — wrap `{lead.email}` in `<a href="mailto:...">` matching existing website link pattern.

**Tech Stack:** React, TypeScript, Tailwind CSS

## Global Constraints

- Use existing patterns (website link at line 217-220 for styling reference)
- `target="_blank"` per user preference

---

### Task 1: Update email display in LeadCard.tsx

**Files:**
- Modify: `src/components/leads/LeadCard.tsx:208`

**Change:**
Replace:
```tsx
<span className="truncate max-w-[180px]">{lead.email}</span>
```
With:
```tsx
<a href={`mailto:${lead.email}`} target="_blank" rel="noopener noreferrer" className="truncate max-w-[180px] text-blue-600 hover:text-blue-700">{lead.email}</a>
```

**Verification:**
1. `npm run lint` passes
2. `npm run typecheck` passes
3. Visual: email appears blue, clickable, opens mail client

### Task 2: Commit and merge to main

**Files:**
- Modify: `src/components/leads/LeadCard.tsx`
- Add: `docs/superpowers/specs/2026-07-21-lead-card-email-link-design.md`
- Add: `docs/superpowers/plans/2026-07-21-lead-card-email-link.md`

**Steps:**
1. `git add` relevant files
2. `git commit` with descriptive message
3. `git checkout main && git merge` feature branch
