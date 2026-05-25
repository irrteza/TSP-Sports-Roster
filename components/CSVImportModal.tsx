import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Download, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { parseCSVFile, downloadCSVTemplate, CSVParseResult, ParsedCreator, InvalidRow } from '../lib/csvImport';
import { batchCreateRecords, BatchProgress, BatchCreateAllResult, RecordResult } from '../lib/csvBatchCreate';

type Step = 'upload' | 'preview' | 'importing' | 'results';

interface CSVImportModalProps {
  onClose: () => void;
  onSuccess: (count: number) => void;
}

const CSVImportModal: React.FC<CSVImportModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [importProgress, setImportProgress] = useState<BatchProgress | null>(null);
  const [importResult, setImportResult] = useState<BatchCreateAllResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid'>('valid');
  const [showFailureDetails, setShowFailureDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);

    try {
      const result = await parseCSVFile(selectedFile);
      setParseResult(result);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleImport = useCallback(async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setStep('importing');
    setImportProgress({
      currentBatch: 0,
      totalBatches: Math.ceil(parseResult.valid.length / 10),
      processedRecords: 0,
      totalRecords: parseResult.valid.length,
      successCount: 0,
      failureCount: 0,
    });

    const result = await batchCreateRecords(
      parseResult.valid.map(v => ({ rowNumber: v.rowNumber, data: v.data })),
      (progress) => setImportProgress(progress)
    );

    setImportResult(result);
    setStep('results');
  }, [parseResult]);

  const handleDone = useCallback(() => {
    if (importResult && importResult.successCount > 0) {
      onSuccess(importResult.successCount);
    } else {
      onClose();
    }
  }, [importResult, onSuccess, onClose]);

  const renderStepIndicator = () => {
    const steps = [
      { key: 'upload', label: '1' },
      { key: 'preview', label: '2' },
      { key: 'importing', label: '3' },
      { key: 'results', label: '4' },
    ];
    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i <= currentIndex
                  ? 'bg-[#5072a7] text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 transition-colors ${
                  i < currentIndex ? 'bg-[#5072a7]' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderUploadStep = () => (
    <div className="flex flex-col items-center">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full max-w-md p-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragging
            ? 'border-[#5072a7] bg-[#5072a7]/5'
            : 'border-slate-300 hover:border-[#5072a7] hover:bg-slate-50'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#5072a7]/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-[#5072a7]" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-slate-700">
              Drag & drop CSV file
            </p>
            <p className="text-sm text-slate-500 mt-1">
              or click to browse
            </p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500 mb-2">Need a template?</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadCSVTemplate();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-[#5072a7] hover:bg-[#5072a7]/10 rounded-lg transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Download CSV Template
        </button>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!parseResult) return null;

    const { valid, invalid } = parseResult;

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 mb-4">
          <FileText className="w-5 h-5 text-slate-500" />
          <span className="text-sm text-slate-600 font-medium">{file?.name}</span>
        </div>

        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-slate-700">
              Valid rows: <span className="text-green-600">{valid.length}</span>
            </span>
          </div>
          {invalid.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-slate-700">
                Invalid rows: <span className="text-red-600">{invalid.length}</span>
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('valid')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'valid'
                ? 'bg-[#5072a7] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Valid ({valid.length})
          </button>
          {invalid.length > 0 && (
            <button
              onClick={() => setActiveTab('invalid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'invalid'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Invalid ({invalid.length})
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Row</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Email</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">
                  {activeTab === 'valid' ? 'Warnings' : 'Errors'}
                </th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'valid' ? (
                valid.slice(0, 100).map((row) => (
                  <tr key={row.rowNumber} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500">{row.rowNumber}</td>
                    <td className="px-4 py-2 font-medium text-slate-700">{row.data.name}</td>
                    <td className="px-4 py-2 text-slate-600">{row.data.email || '-'}</td>
                    <td className="px-4 py-2">
                      {row.warnings.length > 0 ? (
                        <span className="text-amber-600 text-xs">{row.warnings.join(', ')}</span>
                      ) : (
                        <span className="text-green-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                invalid.slice(0, 100).map((row) => (
                  <tr key={row.rowNumber} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500">{row.rowNumber}</td>
                    <td className="px-4 py-2 font-medium text-slate-700">
                      {row.rawData['Name'] || row.rawData['name'] || '(empty)'}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {row.rawData['Email'] || row.rawData['email'] || '-'}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-red-600 text-xs">{row.errors.join(', ')}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {((activeTab === 'valid' && valid.length > 100) ||
            (activeTab === 'invalid' && invalid.length > 100)) && (
            <div className="p-3 bg-slate-50 text-center text-sm text-slate-500">
              Showing first 100 rows. Total:{' '}
              {activeTab === 'valid' ? valid.length : invalid.length}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={valid.length === 0}
            className="px-6 py-2 bg-[#5072a7] text-white rounded-lg hover:bg-[#5072a7]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {valid.length} Creator{valid.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    );
  };

  const renderImportingStep = () => {
    if (!importProgress) return null;

    const percentage = importProgress.totalRecords > 0
      ? Math.round((importProgress.processedRecords / importProgress.totalRecords) * 100)
      : 0;

    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-16 h-16 text-[#5072a7] animate-spin mb-6" />

        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          Importing creators...
        </h3>

        <p className="text-sm text-slate-500 mb-6">
          Please don't close this window
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-md mb-4">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5072a7] transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-lg font-semibold text-slate-700">{percentage}%</p>
          <p className="text-sm text-slate-500">
            Processing batch {importProgress.currentBatch} of {importProgress.totalBatches}
          </p>
          <p className="text-sm text-slate-500">
            {importProgress.processedRecords} of {importProgress.totalRecords} records processed
          </p>
        </div>

        {(importProgress.successCount > 0 || importProgress.failureCount > 0) && (
          <div className="flex gap-4 mt-4">
            <span className="text-sm text-green-600">
              {importProgress.successCount} successful
            </span>
            {importProgress.failureCount > 0 && (
              <span className="text-sm text-red-600">
                {importProgress.failureCount} failed
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderResultsStep = () => {
    if (!importResult) return null;

    const { successCount, failureCount, results } = importResult;
    const failedResults = results.filter(r => !r.success);

    return (
      <div className="flex flex-col items-center py-8">
        {successCount > 0 ? (
          <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
        ) : (
          <AlertCircle className="w-20 h-20 text-red-500 mb-6" />
        )}

        <h3 className="text-2xl font-semibold text-slate-800 mb-2">
          {successCount > 0 ? 'Import Complete!' : 'Import Failed'}
        </h3>

        <div className="text-center mb-6">
          {successCount > 0 && (
            <p className="text-green-600 font-medium">
              {successCount} creator{successCount !== 1 ? 's' : ''} added successfully
            </p>
          )}
          {failureCount > 0 && (
            <p className="text-red-600 font-medium mt-1">
              {failureCount} failed
            </p>
          )}
        </div>

        {failedResults.length > 0 && (
          <div className="w-full max-w-lg">
            <button
              onClick={() => setShowFailureDetails(!showFailureDetails)}
              className="text-sm text-slate-500 hover:text-slate-700 underline mb-2"
            >
              {showFailureDetails ? 'Hide' : 'Show'} failure details
            </button>

            {showFailureDetails && (
              <div className="border rounded-lg p-4 bg-red-50 max-h-48 overflow-auto">
                {failedResults.map((r) => (
                  <div key={r.rowNumber} className="text-sm mb-2 last:mb-0">
                    <span className="font-medium text-slate-700">
                      Row {r.rowNumber} ({r.name}):
                    </span>{' '}
                    <span className="text-red-600">{r.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleDone}
          className="mt-8 px-8 py-3 bg-[#5072a7] text-white rounded-lg hover:bg-[#5072a7]/90 transition-colors font-medium"
        >
          Done
        </button>
      </div>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'preview':
        return renderPreviewStep();
      case 'importing':
        return renderImportingStep();
      case 'results':
        return renderResultsStep();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step !== 'importing' ? onClose : undefined}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Import Creators</h2>
          {step !== 'importing' && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderStepIndicator()}
          {renderContent()}
        </div>
      </motion.div>
    </div>
  );
};

export default CSVImportModal;
