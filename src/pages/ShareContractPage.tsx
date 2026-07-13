import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import app, { db } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { formatCAD } from '../utils/formatters';
import { CONTRACT_TERMS, CONTRACT_FOOTER } from '../utils/contract-terms';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import logoImage from '../assets/gtascrub.png';
import type { SharedContract } from '../types/sharedContract';
import { generateId } from '../utils/storage';
import { sanitizeForFirestore } from '../lib/firebaseSync';
import type { CleaningFrequency, SiteType } from '../types';

type PageState = 'loading' | 'expired' | 'signed' | 'ready' | 'thankyou' | 'notfound';

export function ShareContractPage() {
  const { token } = useParams<{ token: string }>();
  const contractRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [contract, setContract] = useState<SharedContract | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setPageState('notfound');
      return;
    }

    const loadContract = async () => {
      try {
        const docRef = doc(db, 'sharedContracts', token);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setPageState('notfound');
          return;
        }

        const data = { id: docSnap.id, ...docSnap.data() } as SharedContract;

        if (new Date(data.expiresAt) < new Date()) {
          setPageState('expired');
          return;
        }

        if (data.status === 'signed') {
          setContract(data);
          setSignatureDataUrl(data.clientSignature ?? null);
          setPageState('signed');
          return;
        }

        setContract(data);
        setPageState('ready');
      } catch (err) {
        console.error('Failed to load contract:', err);
        setPageState('notfound');
      }
    };

    loadContract();
  }, [token]);

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

  const handleSignAndSubmit = async () => {
    if (!contract || !signatureDataUrl || !token) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      // Ensure anonymous auth so Firestore writes succeed
      const auth = getAuth(app);
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      // Create client record
      const clientId = generateId();
      const newClient = {
        id: clientId,
        name: contract.quoteData.prospectName,
        address: contract.quoteData.prospectAddress,
        city: contract.quoteData.prospectCity,
        province: contract.quoteData.prospectProvince,
        postalCode: contract.quoteData.prospectPostalCode,
        contactName: contract.quoteData.prospectName,
        contactPhone: contract.quoteData.prospectPhone,
        contractRate: contract.quoteData.totalMonthly,
        frequency: 'weekly' as CleaningFrequency,
        cleaningDays: ['monday' as const, 'tuesday' as const, 'wednesday' as const, 'thursday' as const, 'friday' as const],
        status: 'active' as const,
        notes: `Converted from Contract #${contract.contractNumber}`,
        contractPdf: '',
        contractSignature: signatureDataUrl,
        createdAt: now,
      };
      await setDoc(doc(db, 'clients', clientId), sanitizeForFirestore(newClient), { merge: true });

      // Create site record linked to client
      const siteId = generateId();
      const newSite = {
        id: siteId,
        name: contract.quoteData.prospectName,
        address: contract.quoteData.prospectAddress,
        city: contract.quoteData.prospectCity,
        province: contract.quoteData.prospectProvince,
        postalCode: contract.quoteData.prospectPostalCode,
        areaTags: [],
        type: 'other' as SiteType,
        contactName: contract.quoteData.prospectName,
        contactPhone: contract.quoteData.prospectPhone,
        contractRate: contract.quoteData.totalMonthly,
        frequency: 'weekly' as CleaningFrequency,
        cleaningDays: ['monday' as const, 'tuesday' as const, 'wednesday' as const, 'thursday' as const, 'friday' as const],
        scheduleStart: '17:00',
        scheduleEnd: '19:00',
        assignedUserIds: [],
        accessNotes: '',
        status: 'active' as const,
        checklist: [],
        clientId,
        isSubSite: false,
        createdAt: now,
      };
      await setDoc(doc(db, 'sites', siteId), sanitizeForFirestore(newSite), { merge: true });

      // Update quote status to accepted
      await updateDoc(doc(db, 'quotes', contract.quoteId), {
        status: 'accepted',
        updatedAt: now,
      });

      // Mark contract as signed (last — atomic commit; if anything above failed, contract stays pending)
      const docRef = doc(db, 'sharedContracts', token);
      await updateDoc(docRef, {
        status: 'signed',
        clientSignature: signatureDataUrl,
        signedAt: now,
        expiresAt: now,
      });

      setPageState('thankyou');
      toast.success('Contract signed successfully!');
    } catch (err) {
      console.error('Failed to sign contract:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contractRef.current) return;
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

      const fileName = `Contract-${contract?.quoteData.prospectName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    }
  };

  const renderContractHtml = () => {
    if (!contract) return null;
    const { quoteData } = contract;
    const today = new Date().toLocaleDateString('en-CA', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
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
            <div className="mt-1">{contract.contractNumber}</div>
            <div>{today}</div>
          </div>
        </div>

        <div className="mb-6 text-sm">
          <div className="mb-2"><strong>Between:</strong> GTA Scrub (Service Provider)</div>
          <div className="mb-1"><strong>Client:</strong> {quoteData.prospectName}</div>
          <div>{quoteData.prospectAddress}</div>
          <div>{quoteData.prospectCity}, {quoteData.prospectProvince} {quoteData.prospectPostalCode}</div>
          {quoteData.prospectPhone && <div>Phone: {quoteData.prospectPhone}</div>}
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
              {quoteData.lineItems.map((item) => (
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
                <td className="py-2 text-right font-bold text-lg">{formatCAD(quoteData.totalMonthly)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mb-6 text-sm leading-relaxed whitespace-pre-wrap">
          {CONTRACT_TERMS}
        </div>

        <div className="mb-6 pt-4 border-t border-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
    );
  };

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (pageState === 'notfound') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Not Found</h1>
          <p className="text-gray-500">This contract link is invalid.</p>
        </div>
      </div>
    );
  }

  if (pageState === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-500">This contract link has expired. Please contact GTA Scrub for a new link.</p>
        </div>
      </div>
    );
  }

  if (pageState === 'signed') {
    return (
      <>
        <div className="fixed -left-[9999px] top-0">{renderContractHtml()}</div>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Contract Already Signed</h1>
            <p className="text-gray-500 mb-4">This contract has already been signed.</p>
            <Button onClick={handleDownloadPdf}>Download Copy</Button>
          </div>
        </div>
      </>
    );
  }

  if (pageState === 'thankyou') {
    return (
      <>
        <div className="fixed -left-[9999px] top-0">{renderContractHtml()}</div>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you, {contract?.quoteData.prospectName}!</h1>
            <p className="text-gray-500 mb-4">Your contract has been signed successfully.</p>
            <Button onClick={handleDownloadPdf}>Download a Copy</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {renderContractHtml()}

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

        <div className="flex justify-end">
          <Button
            onClick={handleSignAndSubmit}
            disabled={!hasSignature || submitting}
            loading={submitting}
          >
            {submitting ? 'Submitting...' : 'Sign & Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
