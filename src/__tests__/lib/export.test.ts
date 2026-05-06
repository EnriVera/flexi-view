import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCSV, exportXLSX } from '../../lib/export.js';
import type { ColumnConfig } from '../../types.js';

const columns: ColumnConfig[] = [
  { title: 'Name', field: 'name', exportable: true },
  { title: 'Age', field: 'age', exportable: true },
];

const data = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
];

describe('exportCSV', () => {
  let blobContent: string;
  let downloadFilename: string;

  beforeEach(() => {
    blobContent = '';
    downloadFilename = '';

    vi.stubGlobal('Blob', class MockBlob {
      private parts: string[];
      constructor(parts: string[]) { this.parts = parts; }
      text() { return Promise.resolve(this.parts.join('')); }
      get _content() { return this.parts.join(''); }
    });

    vi.stubGlobal('URL', {
      createObjectURL: (blob: { _content: string }) => {
        blobContent = blob._content;
        return 'blob:mock';
      },
      revokeObjectURL: vi.fn(),
    });

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn().mockImplementation(function(this: { download: string }) {
        downloadFilename = this.download;
      }),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
  });

  it('produces correct CSV with headers and rows', () => {
    exportCSV(data, columns, 'test');
    expect(blobContent).toContain('Name,Age');
    expect(blobContent).toContain('Alice,25');
    expect(blobContent).toContain('Bob,30');
  });

  it('appends .csv to filename if missing', () => {
    exportCSV(data, columns, 'myfile');
    expect(downloadFilename).toBe('myfile.csv');
  });

  it('does not double-append .csv if already present', () => {
    exportCSV(data, columns, 'myfile.csv');
    expect(downloadFilename).toBe('myfile.csv');
  });

  it('excludes columns with exportable: false', () => {
    const cols: ColumnConfig[] = [
      { title: 'Name', field: 'name', exportable: true },
      { title: 'Secret', field: 'age', exportable: false },
    ];
    exportCSV(data, cols, 'test');
    expect(blobContent).toContain('Name');
    expect(blobContent).not.toContain('Secret');
  });
});

describe('exportXLSX', () => {
  it('calls loader and uses SheetJS to write file', async () => {
    const writeFile = vi.fn();
    const book_append_sheet = vi.fn();
    const mockXLSX = {
      utils: {
        json_to_sheet: vi.fn().mockReturnValue('ws'),
        book_new: vi.fn().mockReturnValue('wb'),
        book_append_sheet,
      },
      writeFile,
    };
    const loader = vi.fn().mockResolvedValue(mockXLSX);

    await exportXLSX(data, columns, 'myfile', loader as any);

    expect(loader).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledWith('wb', 'myfile.xlsx');
    expect(book_append_sheet).toHaveBeenCalledWith('wb', 'ws', 'Sheet1');
  });
});
