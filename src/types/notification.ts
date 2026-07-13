export type NotificationType = 'contract_signed' | 'quote_accepted' | 'quote_rejected' | 'payroll_pending';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
  userId: string;
}

export const NOTIFICATION_CONTENT: Record<NotificationType, (params: { prospectName?: string; quoteId?: string; count?: number }) => { title: string; body: string; link: string }> = {
  contract_signed: ({ prospectName = 'A client', quoteId = '' }) => ({
    title: 'Contract Signed',
    body: `${prospectName} signed their contract`,
    link: `/quotes/${quoteId}`,
  }),
  quote_accepted: ({ prospectName = 'A client', quoteId = '' }) => ({
    title: 'Quote Accepted',
    body: `${prospectName} accepted the quote`,
    link: `/quotes/${quoteId}`,
  }),
  quote_rejected: ({ prospectName = 'A client', quoteId = '' }) => ({
    title: 'Quote Rejected',
    body: `${prospectName} rejected the quote`,
    link: `/quotes/${quoteId}`,
  }),
  payroll_pending: ({ count = 1 }) => ({
    title: 'Payroll Pending',
    body: `${count} employee(s) ready for approval`,
    link: '/money',
  }),
};
