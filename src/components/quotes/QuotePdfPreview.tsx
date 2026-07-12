import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Quote } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function QuotePdfPreview({ isOpen, onClose, quote, contentRef }: Props) {
  const [generating, setGenerating] = useState(false);
  const fileName = `Quote-${quote.prospectName.replace(/\s+/g, '_')}.pdf`;

  const handleDownload = async () => {
    if (!contentRef.current) return;
    setGenerating(true);
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Download PDF" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Generate a PDF that matches the on-screen layout exactly.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Download} onClick={handleDownload} disabled={generating}>
            {generating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
