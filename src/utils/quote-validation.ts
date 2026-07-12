import { z } from 'zod';

const canadianPostalCode = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
const canadianPhone = /^(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

export const quoteFormSchema = z.object({
  prospectName: z.string().min(2, 'Name must be at least 2 characters'),
  prospectAddress: z.string().min(5, 'Address must be at least 5 characters'),
  prospectCity: z.string().min(2, 'City must be at least 2 characters'),
  prospectProvince: z.string().min(2, 'Province is required'),
  prospectPostalCode: z.string().regex(canadianPostalCode, 'Invalid postal code (e.g., L6P 1A1)'),
  prospectPhone: z.string().regex(canadianPhone, 'Invalid phone number (e.g., 905-555-0404)').optional().or(z.literal('')),
  clientId: z.string().optional(),
  notes: z.string().optional(),
  validUntil: z.string().refine((val) => {
    if (!val) return true;
    return new Date(val) > new Date();
  }, 'Valid until must be a future date'),
});

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  siteId: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  amountPerVisit: z.number().positive('Amount must be greater than 0'),
  visitsPerWeek: z.number().positive('Visits must be at least 1'),
});

export type QuoteFormData = z.infer<typeof quoteFormSchema>;
export type LineItemFormData = z.infer<typeof lineItemSchema>;

export function validateQuoteForm(data: unknown) {
  return quoteFormSchema.safeParse(data);
}

export function validateLineItem(data: unknown) {
  return lineItemSchema.safeParse(data);
}
