import { useState, useRef, useCallback } from 'react';
import { X, Upload, ArrowLeft, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { SHEET_COLUMN_TYPES } from '@/types';
import type { SheetColumn, SheetColumnType } from '@/types';
import {
  parseSpreadsheetFile,
  getSheetData,
  inferColumns,
  convertCellValue,
} from '@/lib/utils/importSheet';
import type XLSX from 'xlsx';

interface ImportSheetDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string | null;
    columns: SheetColumn[];
    rowCells: Record<string, unknown>[];
  }) => Promise<void>;
}

type Step = 'upload' | 'preview' | 'importing';

export function ImportSheetDialog({ open, onClose, onSubmit }: ImportSheetDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheet selection state
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Preview state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [rawRows, setRawRows] = useState<unknown[][]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setError(null);
    setParsing(false);
    setDragOver(false);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setName('');
    setDescription('');
    setColumns([]);
    setRawRows([]);
    setImportError(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const processSheet = useCallback((wb: XLSX.WorkBook, sheet: string, fileName: string) => {
    try {
      const { headers, rows } = getSheetData(wb, sheet);
      if (headers.length === 0) {
        setError('The selected sheet has no data.');
        return;
      }
      if (rows.length === 0) {
        setError('The selected sheet has no data rows (only a header row).');
        return;
      }

      const inferred = inferColumns(headers, rows);
      setColumns(inferred);
      setRawRows(rows);
      setName(fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
      setError(null);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process sheet');
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Unsupported file format. Please use .xlsx, .xls, or .csv files.');
      return;
    }

    setParsing(true);
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (parsed.sheetNames.length === 0) {
        setError('The file contains no sheets.');
        setParsing(false);
        return;
      }

      if (parsed.sheetNames.length === 1) {
        processSheet(parsed.workbook, parsed.sheetNames[0], file.name);
      } else {
        setWorkbook(parsed.workbook);
        setSheetNames(parsed.sheetNames);
        setSelectedSheet(parsed.sheetNames[0]);
        // Stay on upload step to show sheet selector
        setName(file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  }, [processSheet]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSheetSelect = () => {
    if (workbook && selectedSheet) {
      processSheet(workbook, selectedSheet, name || 'Import');
    }
  };

  const handleColumnChange = (index: number, field: 'name' | 'type', value: string) => {
    setColumns(prev => prev.map((col, i) => {
      if (i !== index) return col;
      if (field === 'type') {
        const newCol = { ...col, type: value as SheetColumnType };
        if (value === 'select') {
          // Auto-detect options from data
          const values = rawRows
            .map(row => {
              const cell = (row as unknown[])[index];
              return cell == null ? '' : String(cell).trim();
            })
            .filter(v => v !== '');
          const distinct = [...new Set(values)];
          if (distinct.length <= 20) {
            newCol.options = distinct.sort();
          }
        } else {
          delete newCol.options;
        }
        return newCol;
      }
      return { ...col, [field]: value };
    }));
  };

  const handleColumnOptionsChange = (index: number, value: string) => {
    setColumns(prev => prev.map((col, i) => {
      if (i !== index) return col;
      return { ...col, options: value.split(',').map(s => s.trim()).filter(Boolean) };
    }));
  };

  const handleDeleteColumn = (index: number) => {
    if (columns.length <= 1) return;
    setColumns(prev => prev.filter((_, i) => i !== index));
    setRawRows(prev => prev.map(row => {
      const arr = [...(row as unknown[])];
      arr.splice(index, 1);
      return arr;
    }));
  };

  const handleImport = async () => {
    if (!name.trim()) {
      setImportError('Sheet name is required.');
      return;
    }
    if (columns.length === 0) {
      setImportError('At least one column is required.');
      return;
    }

    setImportError(null);
    setStep('importing');

    try {
      // Build cell data from raw rows using current column config
      const rowCells = rawRows
        .filter(row => (row as unknown[]).some(cell => cell != null && String(cell).trim() !== ''))
        .map(row => {
          const cells: Record<string, unknown> = {};
          columns.forEach((col, j) => {
            const raw = (row as unknown[])[j];
            const value = convertCellValue(raw, col.type);
            if (value !== null) {
              cells[col.id] = value;
            }
          });
          return cells;
        });

      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        columns,
        rowCells,
      });
      handleClose();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
      setStep('preview');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-surface-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute top-3 right-3 p-1 rounded hover:bg-surface-100">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {step === 'upload' && 'Import from Spreadsheet'}
          {step === 'preview' && 'Preview & Configure'}
          {step === 'importing' && 'Importing...'}
        </h3>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            {!sheetNames.length && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-surface-300 hover:border-primary-300 hover:bg-surface-50'
                }`}
              >
                {parsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm text-gray-600">Parsing file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      Drop a spreadsheet here or click to browse
                    </p>
                    <p className="text-xs text-gray-400">
                      Supports .xlsx, .xls, and .csv files (max 10MB)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {/* Sheet selector for multi-sheet files */}
            {sheetNames.length > 1 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  This file contains multiple sheets. Select one to import:
                </p>
                <select
                  value={selectedSheet}
                  onChange={e => setSelectedSheet(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
                >
                  {sheetNames.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="flex justify-end">
                  <button
                    onClick={handleSheetSelect}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview & Configure */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Sheet name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sheet Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
                placeholder="e.g., Data Quality Issue Log"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-primary-500"
                placeholder="What is this sheet for?"
              />
            </div>

            {/* Column configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Columns ({columns.length})
              </label>
              <div className="space-y-2">
                {columns.map((col, index) => (
                  <div key={col.id} className="flex gap-2 items-start p-3 bg-surface-50 rounded-xl">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          value={col.name}
                          onChange={e => handleColumnChange(index, 'name', e.target.value)}
                          placeholder="Column name"
                          className="flex-1 px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                        />
                        <select
                          value={col.type}
                          onChange={e => handleColumnChange(index, 'type', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                        >
                          {SHEET_COLUMN_TYPES.map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      {col.type === 'select' && (
                        <input
                          value={col.options?.join(', ') ?? ''}
                          onChange={e => handleColumnOptionsChange(index, e.target.value)}
                          placeholder="Options (comma-separated, e.g., Low, Medium, High)"
                          className="w-full px-2 py-1.5 text-sm border border-surface-200 rounded-lg focus:border-primary-500 focus:ring-primary-500"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteColumn(index)}
                      disabled={columns.length <= 1}
                      className="p-1.5 rounded hover:bg-surface-100 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Row count */}
            {rawRows.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  {rawRows.filter(row => (row as unknown[]).some(cell => cell != null && String(cell).trim() !== '')).length} rows
                </span>
                <span className="text-xs text-gray-500">will be imported</span>
                {rawRows.length > 5000 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-3 h-3" />
                    Large dataset — import may take a moment
                  </span>
                )}
              </div>
            )}

            {/* Preview table */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
                {rawRows.length > 10 && (
                  <span className="font-normal text-gray-400 ml-1">
                    (showing first 10 of {rawRows.length} rows)
                  </span>
                )}
              </label>
              <div className="border border-surface-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-50 border-b border-surface-200">
                        {columns.map(col => (
                          <th key={col.id} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                            {col.name}
                            <span className="ml-1 text-gray-400 font-normal">({col.type})</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-surface-100 last:border-0">
                          {columns.map((col, colIndex) => {
                            const raw = (row as unknown[])[colIndex];
                            const display = raw == null ? '' : String(raw);
                            return (
                              <td key={col.id} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                                {display}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {importError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{importError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-surface-200 rounded-xl hover:bg-surface-100"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700"
              >
                Import Sheet
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-sm text-gray-600">Creating sheet and importing rows...</p>
          </div>
        )}
      </div>
    </div>
  );
}
