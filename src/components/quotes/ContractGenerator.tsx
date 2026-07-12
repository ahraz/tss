import React, { useRef, useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCAD } from '../../utils/formatters';
import { CONTRACT_TERMS, CONTRACT_FOOTER } from '../../utils/contract-terms';
import logoImage from '../../assets/gtascrub.png';
import type { Quote } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  onConvert: (contractPdf: string, contractSignature: string) => void;
}

export function ContractGenerator({ isOpen, onClose, quote, onConvert }: Props) {
  const contractRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const contractNumber = `CONTRACT-${quote.id.slice(-6).toUpperCase()}`;
  const today = new Date().toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((val, i) => i % 4 === 3 && val > 0);
    if (hasContent) {
      setHasSignature(true);
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      clearCanvas();
    }
  }, [isOpen, clearCanvas]);

  const handleDownloadAndConvert = async () => {
    if (!contractRef.current || !hasSignature || !signatureDataUrl) return;
    setGenerating(true);

    try {
      const element = contractRef.current;
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

      const pdfDataUrl = pdf.output('dataurlstring');
      const pdfBase64 = pdfDataUrl.split(',')[1];

      const fileName = `Contract-${quote.prospectName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);

      onConvert(`data:application/pdf;base64,${pdfBase64}`, signatureDataUrl);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Contract" size="xl">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        <div ref={contractRef} className="bg-white p-8 border rounded-lg" style={{ fontFamily: 'Times New Roman, serif' }}>
          <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-gray-800">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="GTA Scrub" width={48} height={48} style={{ objectFit: 'contain' }} />
              <div>
                <div className="text-xl font-bold text-gray-900">GTA Scrub</div>
                <div className="text-xs text-gray-500 tracking-wider uppercase">Commercial Cleaning Services</div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div className="font-bold text-lg text-gray-900">SERVICE AGREEMENT</div>
              <div className="mt-1">{contractNumber}</div>
              <div>{today}</div>
            </div>
          </div>

          <div className="mb-6 text-sm">
            <div className="mb-2"><strong>Between:</strong> GTA Scrub (Service Provider)</div>
            <div className="mb-1"><strong>Client:</strong> {quote.prospectName}</div>
            <div>{quote.prospectAddress}</div>
            <div>{quote.prospectCity}, {quote.prospectProvince} {quote.prospectPostalCode}</div>
            {quote.prospectPhone && <div>Phone: {quote.prospectPhone}</div>}
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold mb-2 uppercase tracking-wide">Scope of Services</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2">Description</th>
                  <th className="text-center py-2">Frequency</th>
                  <th className="text-center py-2">Visits/Week</th>
                  <th className="text-center py-2">Rate/Visit</th>
                  <th className="text-right py-2">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-center capitalize">{item.frequency}</td>
                    <td className="py-2 text-center">{item.visitsPerWeek}x</td>
                    <td className="py-2 text-right">{formatCAD(item.amountPerVisit)}</td>
                    <td className="py-2 text-right font-medium">{formatCAD(item.monthlyAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={4} className="py-2 text-right font-bold">Total Monthly</td>
                  <td className="py-2 text-right font-bold text-lg">{formatCAD(quote.totalMonthly)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mb-6 text-sm leading-relaxed whitespace-pre-wrap">
            {CONTRACT_TERMS}
          </div>

          <div className="mb-6 pt-4 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-sm font-bold mb-1">Client Signature</div>
                {signatureDataUrl ? (
                  <img src={signatureDataUrl} alt="Client Signature" className="h-12 border-b border-gray-400" />
                ) : (
                  <div className="h-12 border-b border-gray-400 flex items-end text-xs text-gray-400 pb-1">
                    Awaiting signature...
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">Date: {today}</div>
              </div>
              <div>
                <div className="text-sm font-bold mb-1">GTA Scrub Representative</div>
                <div className="h-12 border-b border-gray-400 flex items-end text-sm text-gray-700 pb-1">
                  GTA Scrub
                </div>
                <div className="text-xs text-gray-500 mt-1">Date: {today}</div>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-300">
            {CONTRACT_FOOTER}
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="text-sm font-semibold text-gray-700 mb-2">Client Signature</div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <canvas
                ref={canvasRef}
                width={300}
                height={150}
                className="border border-gray-300 rounded bg-white cursor-crosshair w-full max-w-[300px]"
                style={{ touchAction: 'none' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              <div className="text-xs text-gray-400 mt-1">Draw your signature above</div>
            </div>
            <Button variant="secondary" size="sm" onClick={clearCanvas}>
              Clear
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            icon={Download}
            onClick={handleDownloadAndConvert}
            disabled={!hasSignature || generating}
          >
            {generating ? 'Generating...' : 'Download & Convert'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
