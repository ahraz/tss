# Quotes Module Enhancement Design

**Date:** 2026-07-12
**Approach:** Incremental Enhancement
**Focus:** Template improvements, PDF generation, quote workflow, quote creation UX

## Overview

Enhance the existing Quotes module with incremental improvements to versioning, PDF generation, form validation, and bug fixes. This approach provides quick wins without major refactoring.

## Section 1: Quote Versioning

### Current State
- Quotes have `createdAt` and `updatedAt` but no version history
- Changes overwrite the current state
- No way to track changes or restore previous versions

### Proposed Change
Add version tracking to quotes.

### New Type Definitions

```typescript
interface QuoteVersion {
  id: string;
  version: number;
  snapshot: Omit<Quote, 'versions'>;  // Quote state without versions array (avoids circular ref)
  changedBy: string;
  changedAt: string;
  changeNote?: string;
}

interface Quote {
  // ... existing fields
  currentVersion: number;
  versions: QuoteVersion[];  // Only stored locally, not synced to Firestore
}
```

**Note:** The `versions` array is stored locally in IndexedDB only, not synced to Firestore. This keeps Firestore documents small while maintaining version history on the client.

### Behavior
- Every status change or line item modification creates a new version
- Users can view version history and compare changes
- "Restore version" button to revert to a previous state
- Version number displayed in quote header (e.g., "v3")

### Version Comparison
- Side-by-side view showing two versions
- Highlight differences in line items (added, removed, changed)
- Show total amount changes
- Allow selecting any two versions to compare

### Implementation Details
1. Update `Quote` type in `src/types/index.ts`
2. Create `QuoteVersionHistory` component
3. Add version creation logic to `QuoteDetailPage`
4. Add version comparison modal
5. Add "Restore version" functionality

## Section 2: PDF Generation Improvement

### Current State
- Uses `html2canvas` to screenshot the DOM, then converts to PDF
- Issues:
  - Low quality (screenshot-based)
  - No proper pagination
  - Missing digital branding
  - Large file sizes

### Proposed Change
Switch to `@react-pdf/renderer` for proper PDF generation.

### Benefits
- Vector-based text (sharp at any zoom)
- Proper page breaks
- Smaller file sizes
- Better control over layout
- Support for headers/footers on each page

### Implementation Details
1. Install `@react-pdf/renderer` package
2. Create `QuotePdfDocument` component
3. Create `QuotePdfPreview` modal
4. Maintain current `html2canvas` as fallback for printing
5. Add PDF preview modal before download

### PDF Preview Modal
- Shows preview of PDF before download
- Allows adjusting layout options (margins, font size)
- Shows file size estimate
- Download button with progress indicator

### New Dependencies
```json
{
  "@react-pdf/renderer": "^4.0.0"
}
```

## Section 3: Enhanced Form Validation

### Current State
- Basic validation (e.g., `disabled={!formData.prospectName}`)
- No field-level error messages
- Poor UX when validation fails

### Proposed Change
Add comprehensive validation with clear error messages.

### Validation Rules
- `prospectName`: Required, min 2 characters
- `prospectAddress`: Required, min 5 characters
- `prospectCity`: Required, min 2 characters
- `prospectPostalCode`: Format validation (Canadian postal code: A1A 1A1, case-insensitive)
- `prospectPhone`: Format validation (Canadian phone: XXX-XXX-XXXX or (XXX) XXX-XXXX)
- `validUntil`: Must be future date, required
- Line items: `amountPerVisit > 0`, `visitsPerWeek > 0`, `description` required

### UX Improvements
- Inline error messages below each field
- Red border on invalid fields
- Form-level error summary at top
- Prevent submission until all errors resolved

### Implementation Details
1. Use existing `react-hook-form` (already in dependencies)
2. Create `QuoteFormSchema` with validation rules
3. Display errors using existing `Input` component's error state
4. Add form-level error summary component

## Section 4: Bug Fixes

### Bug 1: Quote status not updating in real-time
**Issue:** When one user changes status, other users don't see the update.
**Fix:** Add real-time listener for quote updates (similar to how shifts are synced).

**Implementation:**
- Add Firestore real-time listener in `AppContext`
- Update `SET_QUOTES` action to handle real-time updates
- Add `onSnapshot` listener for quotes collection
- Ensure listener is properly cleaned up on unmount

### Bug 2: PDF generation fails on complex layouts
**Issue:** `html2canvas` struggles with certain CSS layouts.
**Fix:** Simplify print layout, add error handling with retry.

### Bug 3: Template line items losing IDs
**Issue:** When editing templates, line item IDs get regenerated.
**Fix:** Use stable IDs (UUID) instead of counter-based IDs.

### Bug 4: Quote total not recalculating on line item edit
**Issue:** Manually editing line items doesn't update `totalMonthly`.
**Fix:** Add `useEffect` to recalculate on line item changes.

## Files to Modify

### New Files
- `src/components/quotes/QuoteVersionHistory.tsx`
- `src/components/quotes/QuotePdfDocument.tsx`
- `src/components/quotes/QuotePdfPreview.tsx`
- `src/components/quotes/QuoteFormValidation.ts`

### Modified Files
- `src/types/index.ts` - Add version types
- `src/pages/QuoteDetailPage.tsx` - Add versioning UI, PDF preview
- `src/pages/QuotesPage.tsx` - Add version indicator
- `src/pages/TemplatesPage.tsx` - Fix line item IDs
- `src/components/quotes/CleaningEstimator.tsx` - Fix template line item IDs

## Success Criteria

1. **Versioning:** Users can view version history and restore previous versions
2. **PDF:** Generated PDFs are high-quality with proper pagination
3. **Validation:** All form fields have clear validation messages
4. **Bugs:** All identified bugs are fixed
5. **Performance:** No significant performance degradation

## Testing Plan

1. **Unit Tests:**
   - Version creation logic
   - PDF generation
   - Form validation rules

2. **Integration Tests:**
   - Quote creation with validation
   - Version history display
   - PDF download flow

3. **Manual Testing:**
   - Test across different browsers
   - Test on mobile devices
   - Test with large quotes (many line items)
