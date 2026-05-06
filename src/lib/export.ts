import type { ColumnConfig } from '../types.js';

type ExcelLibrary = {
  utils: {
    json_to_sheet: (data: Record<string, unknown>[]) => unknown;
    book_new: () => unknown;
    book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
  };
  writeFile: (wb: unknown, filename: string) => void;
};

export function exportCSV(
  data: Record<string, unknown>[],
  columns: ColumnConfig[],
  filename: string
): void {
  const exportableColumns = columns.filter(col => col.exportable !== false && col.field != null);
  const headers = exportableColumns.map(col => col.title);
  const rows = data.map(row =>
    exportableColumns.map(col => {
      const val = row[col.field as string];
      const str = val == null ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    })
  );

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportXLSX(
  data: Record<string, unknown>[],
  columns: ColumnConfig[],
  filename: string,
  loader: () => Promise<ExcelLibrary>
): Promise<void> {
  const xlsx = await loader();
  const exportableColumns = columns.filter(col => col.exportable !== false && col.field != null);
  const rows = data.map(row => {
    const out: Record<string, unknown> = {};
    for (const col of exportableColumns) {
      out[col.title] = row[col.field as string] ?? '';
    }
    return out;
  });

  const ws = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
