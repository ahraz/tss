import React from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { QuotePdfDocument } from './QuotePdfDocument';
import type { Quote } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  businessName: string;
}

export function QuotePdfPreview({ isOpen, onClose, quote, businessName }: Props) {
  const fileName = `Quote-${quote.prospectName.replace(/\s+/g, '_')}.pdf`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PDF Preview" size="xl">
      <div className="space-y-4">
        <div className="h-[600px] border rounded-lg overflow-hidden">
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <QuotePdfDocument quote={quote} businessName={businessName} />
          </PDFViewer>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <PDFDownloadLink
            document={<QuotePdfDocument quote={quote} businessName={businessName} />}
            fileName={fileName}
          >
            {({ loading }) => (
              <Button icon={Download} disabled={loading}>
                {loading ? 'Generating...' : 'Download PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>
    </Modal>
  );
}
