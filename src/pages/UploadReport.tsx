import React, { useState, useCallback } from 'react';
import { api } from '../api';

interface Props {
  patientId: string;
  patientName: string;
  onBack: () => void;
  onUploaded: () => void;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadReport({ patientId, patientName, onBack, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function validateFile(f: File): string | null {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return `Invalid file type: ${f.type}. Only PDF, JPG, and PNG are allowed.`;
    }
    if (f.size > MAX_SIZE) {
      return `File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`;
    }
    return null;
  }

  function handleFileSelect(f: File) {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
    } else {
      setFileError(null);
      setFile(f);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadReport(patientId, file);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto animate-slide-up">
      <button className="btn-secondary mb-6" onClick={onBack} aria-label="Go back">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </button>

      <div className="glass-card p-6">
        <h1 className="text-xl font-bold text-slate-100 mb-1">Upload Lab Report</h1>
        <p className="text-slate-400 text-sm mb-6">
          For <span className="text-indigo-300">{patientName}</span> · Gemini AI will extract lab values
        </p>

        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
            dragOver
              ? 'border-indigo-400 bg-indigo-500/10'
              : file
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-white/20 hover:border-indigo-500/50 hover:bg-white/[0.03]'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="region"
          aria-label="File upload drop zone"
        >
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-slate-200">{file.name}</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type}
                </p>
              </div>
              <button
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                onClick={() => setFile(null)}
                aria-label="Remove selected file"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-slate-300 font-medium">Drop your report here</p>
                <p className="text-slate-500 text-sm mt-1">or click to browse files</p>
              </div>
              <label htmlFor="file-upload" className="btn-secondary cursor-pointer text-sm">
                Choose File
              </label>
              <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleInputChange}
                aria-label="Upload medical report file"
              />
              <p className="text-xs text-slate-600">PDF, JPG, PNG · Max 10 MB</p>
            </div>
          )}
        </div>

        {fileError && (
          <p className="mt-2 text-sm text-red-400" role="alert">{fileError}</p>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
          <p className="text-xs text-violet-300">
            <strong>How it works:</strong> Gemini AI will extract test names, values, units, and reference ranges printed in the document. Extraction runs in the background — you'll see results in the patient record.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            id="upload-report-btn"
            className="btn-primary flex-1"
            onClick={handleUpload}
            disabled={!file || uploading}
            aria-busy={uploading}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload & Extract
              </>
            )}
          </button>
          <button className="btn-secondary" onClick={onBack}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
