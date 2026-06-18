import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Inspection } from '../../types';

interface Props {
  isOpen: boolean;
  inspection: Inspection | null;
  signOffName: string;
  onNameChange: (v: string) => void;
  onSignOff: () => void;
  onClose: () => void;
}

export function SignOffModal({ isOpen, inspection, signOffName, onNameChange, onSignOff, onClose }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Client Sign-off">
      {inspection && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Record client sign-off for this inspection report.
          </p>
          <Input
            label="Client Name"
            value={signOffName}
            onChange={e => onNameChange(e.target.value)}
            placeholder="Enter client's name…"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={onSignOff} disabled={!signOffName.trim()}>
              Confirm Sign-off
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
