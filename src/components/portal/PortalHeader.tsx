import type { Site, Inspection } from '../../types';

interface Props {
  site: Site;
  latestInspection: Inspection | null;
}

function getScore(inspection: Inspection | null): { pct: number; label: string; color: string } {
  if (!inspection) return { pct: 0, label: 'N/A', color: 'text-gray-400 bg-gray-100' };
  const pass = inspection.items.filter(i => i.rating === 'pass').length;
  const pct = Math.round((pass / inspection.items.length) * 100);
  if (pct >= 90) return { pct, label: `${pct}%`, color: 'text-emerald-700 bg-emerald-100' };
  if (pct >= 70) return { pct, label: `${pct}%`, color: 'text-amber-700 bg-amber-100' };
  return { pct, label: `${pct}%`, color: 'text-red-700 bg-red-100' };
}

export function PortalHeader({ site, latestInspection }: Props) {
  const score = getScore(latestInspection);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          GTA<span className="text-emerald-600">Scrub</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{site.name}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${score.color}`}>
          {score.label}
        </div>
      </div>
    </div>
  );
}
