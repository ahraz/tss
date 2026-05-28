import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'warning';
}

export function ConfirmModal({
  isOpen, onClose, title = 'Are you sure?', message,
  confirmLabel = 'Confirm', onConfirm, variant = 'danger'
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`p-3 rounded-full ${variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'}`}>
          {variant === 'danger'
            ? <Trash2 size={24} className="text-red-600" />
            : <AlertTriangle size={24} className="text-amber-600" />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{message}</p>
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
