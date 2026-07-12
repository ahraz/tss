// ============================================================
// GTA Scrub — CSV Export Utility
// ============================================================

export interface CSVColumn<T> {
  header: string;
  accessor: (item: T) => string | number;
}

export function exportToCSV<T>(data: T[], columns: CSVColumn<T>[], filename: string): void {
  const escape = (val: string | number): string => {
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = columns.map(c => escape(c.header)).join(',');
  const rows = data.map(item =>
    columns.map(c => escape(c.accessor(item))).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
