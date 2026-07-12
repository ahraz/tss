import React, { useState } from 'react';
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

    const element = contentRef.current;
    let badgeDisplay = '';
    const tfootDisplays: string[] = [];

    try {
      // Add pdf-capture class to activate CSS hiding, plus hide status badge inline
      element.classList.add('pdf-capture');

      // Also hide the status badge (e.g. "draft") in the header
      const badge = element.querySelector('.mt-2') as HTMLElement | null;
      badgeDisplay = badge?.style.display ?? '';
      if (badge) badge.style.display = 'none';

      // Hide empty tfoot cells for the delete column
      const tfootCells = element.querySelectorAll('tfoot td:empty');
      tfootCells.forEach((cell, i) => {
        tfootDisplays[i] = (cell as HTMLElement).style.display;
        (cell as HTMLElement).style.display = 'none';
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297;

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
      // Restore everything
      element.classList.remove('pdf-capture');
      const badge = element.querySelector('.mt-2') as HTMLElement | null;
      if (badge) badge.style.display = badgeDisplay ?? '';
      const tfootCells = element.querySelectorAll('tfoot td:empty');
      tfootCells.forEach((cell, i) => {
        (cell as HTMLElement).style.display = (tfootDisplays[i] as string) ?? '';
      });
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
