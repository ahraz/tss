export interface Contract {
  id: string;
  quoteId: string;
  contractNumber: string;
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientProvince: string;
  clientPostalCode: string;
  clientPhone: string;
  lineItems: {
    description: string;
    frequency: string;
    visitsPerWeek: number;
    amountPerVisit: number;
    monthlyAmount: number;
  }[];
  totalMonthly: number;
  signatureDataUrl: string;
  createdAt: string;
}
