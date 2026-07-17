import type { Quote } from './index';

export interface QuoteVersion {
  id: string;
  version: number;
  snapshot: Omit<Quote, 'versions'>;
  changedBy: string;
  changedAt: string;
  changeNote?: string;
}

export function createVersion(
  quote: Quote,
  changedBy: string,
  changeNote?: string
): QuoteVersion {
  const { versions: _, ...snapshot } = quote; void _;
  return {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    version: (quote.currentVersion || 0) + 1,
    snapshot,
    changedBy,
    changedAt: new Date().toISOString(),
    changeNote,
  };
}

export function addVersionToQuote(
  quote: Quote,
  version: QuoteVersion
): Quote {
  return {
    ...quote,
    currentVersion: version.version,
    versions: [...(quote.versions || []), version],
  };
}
