import type { QuoteLineItem } from './index';

export interface SharedContract {
  id: string;
  quoteId: string;
  quoteData: {
    prospectName: string;
    prospectAddress: string;
    prospectCity: string;
    prospectProvince: string;
    prospectPostalCode: string;
    prospectPhone: string;
    lineItems: QuoteLineItem[];
    totalMonthly: number;
  };
  contractNumber: string;
  status: 'pending' | 'signed';
  clientSignature?: string;
  signedAt?: string;
  notificationDismissedAt?: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
}

export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 20; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
