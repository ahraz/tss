import React from 'react';
import { Clock, User, RotateCcw } from 'lucide-react';
import type { QuoteVersion } from '../../types';
import { formatDateTime, formatCAD } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface Props {
  versions: QuoteVersion[];
  currentVersion: number;
  onRestore: (version: QuoteVersion) => void;
  onCompare: (v1: QuoteVersion, v2: QuoteVersion) => void;
}

export function QuoteVersionHistory({ versions, currentVersion, onRestore, onCompare }: Props) {
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  if (sortedVersions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        No version history yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedVersions.map((v, idx) => (
        <div
          key={v.id}
          className={`p-3 rounded-xl border ${
            v.version === currentVersion
              ? 'border-blue-200 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                label={`v${v.version}`}
                variant={v.version === currentVersion ? 'info' : 'neutral'}
              />
              {v.version === currentVersion && (
                <span className="text-xs text-blue-600 font-medium">Current</span>
              )}
            </div>
            <div className="flex gap-1">
              {idx < sortedVersions.length - 1 && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => onCompare(v, sortedVersions[idx + 1])}
                >
                  Compare
                </Button>
              )}
              {v.version !== currentVersion && (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={RotateCcw}
                  onClick={() => onRestore(v)}
                >
                  Restore
                </Button>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDateTime(v.changedAt)}
            </span>
            <span className="flex items-center gap-1">
              <User size={12} />
              {v.changedBy}
            </span>
          </div>
          {v.changeNote && (
            <p className="mt-1 text-xs text-gray-600">{v.changeNote}</p>
          )}
          <div className="mt-2 text-sm font-medium text-gray-900">
            {formatCAD(v.snapshot.totalMonthly)}/mo
          </div>
        </div>
      ))}
    </div>
  );
}
