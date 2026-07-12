import React from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { formatCAD } from '../../utils/formatters';
import type { QuoteVersion } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  versionA: QuoteVersion;
  versionB: QuoteVersion;
}

export function QuoteVersionCompare({ isOpen, onClose, versionA, versionB }: Props) {
  const older = versionA.version < versionB.version ? versionA : versionB;
  const newer = versionA.version < versionB.version ? versionB : versionA;

  const oldItems = new Map(older.snapshot.lineItems.map(li => [li.id, li]));
  const newItems = new Map(newer.snapshot.lineItems.map(li => [li.id, li]));

  const added = newer.snapshot.lineItems.filter(li => !oldItems.has(li.id));
  const removed = older.snapshot.lineItems.filter(li => !newItems.has(li.id));
  const changed = newer.snapshot.lineItems.filter(li => {
    const old = oldItems.get(li.id);
    return old && (
      old.description !== li.description ||
      old.amountPerVisit !== li.amountPerVisit ||
      old.visitsPerWeek !== li.visitsPerWeek ||
      old.monthlyAmount !== li.monthlyAmount
    );
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compare Versions" size="lg">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <Badge label={`v${older.version}`} variant="neutral" />
            <span className="ml-2 text-sm text-gray-500">Older</span>
          </div>
          <div>
            <Badge label={`v${newer.version}`} variant="info" />
            <span className="ml-2 text-sm text-gray-500">Newer</span>
          </div>
        </div>

        {added.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-green-700 mb-2">Added</h4>
            {added.map(li => (
              <div key={li.id} className="p-2 bg-green-50 rounded-lg text-sm">
                {li.description} - {formatCAD(li.monthlyAmount)}/mo
              </div>
            ))}
          </div>
        )}

        {removed.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-700 mb-2">Removed</h4>
            {removed.map(li => (
              <div key={li.id} className="p-2 bg-red-50 rounded-lg text-sm">
                {li.description} - {formatCAD(li.monthlyAmount)}/mo
              </div>
            ))}
          </div>
        )}

        {changed.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-700 mb-2">Changed</h4>
            {changed.map(li => {
              const old = oldItems.get(li.id)!;
              return (
                <div key={li.id} className="p-2 bg-amber-50 rounded-lg text-sm">
                  <div className="font-medium">{li.description}</div>
                  <div className="text-xs text-gray-500">
                    {old.amountPerVisit} → {li.amountPerVisit} per visit,{' '}
                    {old.visitsPerWeek} → {li.visitsPerWeek} visits/week
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t pt-3 flex justify-between text-sm font-semibold">
          <span>Total Change</span>
          <span>
            {formatCAD(older.snapshot.totalMonthly)} → {formatCAD(newer.snapshot.totalMonthly)}
          </span>
        </div>
      </div>
    </Modal>
  );
}
