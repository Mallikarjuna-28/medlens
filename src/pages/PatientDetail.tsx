import React, { useState, useEffect, useCallback } from 'react';
import { type Patient, type Report, type LabResult, type AuditLog } from '../types';
import { api } from '../api';
import { SourceBadge } from '../components/SourceBadge';
import { RangeLabel } from '../components/RangeLabel';

interface Props {
  patientId: string;
  onBack: () => void;
  onUploadReport: () => void;
}

interface PatientDetailData {
  patient: Patient;
  reports: Report[];
  labResults: LabResult[];
}

interface EditState {
  resultId: string;
  value: string;
  unit: string;
}

interface SummaryState {
  content: string;
  generatedAt: string;
  safe: boolean;
}

export function PatientDetail({ patientId, onBack, onUploadReport }: Props) {
  const [data, setData] = useState<PatientDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [pollingReports, setPollingReports] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const result = await api.getPatient(patientId) as PatientDetailData;
      setData(result);

      // Start polling for pending reports
      const pending = result.reports.filter((r) => r.status === 'pending');
      if (pending.length > 0) {
        setPollingReports(new Set(pending.map((r) => r.id)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load patient');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll for pending report extractions
  useEffect(() => {
    if (pollingReports.size === 0) return;

    const intervalId = setInterval(async () => {
      const stillPending = new Set<string>();

      for (const reportId of pollingReports) {
        try {
          const status = await api.getReportStatus(patientId, reportId) as {
            report: Report;
            labResults: LabResult[];
          };

          if (status.report.status === 'pending') {
            stillPending.add(reportId);
          } else {
            // Refresh full data when extracted or failed
            loadData();
          }
        } catch {
          // ignore polling errors
        }
      }

      setPollingReports(stillPending);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [pollingReports, patientId, loadData]);

  async function handleVerify(result: LabResult) {
    if (!editState) return;
    setSaving(true);
    try {
      const updated = await api.verifyLabResult(patientId, result.id, {
        value: editState.value,
        unit: editState.unit,
        source: 'user_verified',
      }) as LabResult;

      setData((prev) =>
        prev
          ? {
              ...prev,
              labResults: prev.labResults.map((r) => (r.id === updated.id ? updated : r)),
            }
          : prev
      );
      setEditState(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateSummary() {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await api.generateSummary(patientId) as SummaryState;
      setSummary(result);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleShowAudit() {
    if (showAudit) {
      setShowAudit(false);
      return;
    }
    try {
      const logs = await api.getAuditLog(patientId) as AuditLog[];
      setAuditLog(logs);
      setShowAudit(true);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-label="Loading patient record">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div role="alert" className="glass-card p-8 text-center">
        <p className="text-red-400 font-medium">{error ?? 'Patient not found'}</p>
        <button className="btn-secondary mt-4" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  const { patient, reports, labResults } = data;
  const SEX_LABELS: Record<string, string> = {
    male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say',
  };

  // Group lab results by report
  const resultsByReport = new Map<string, LabResult[]>();
  for (const r of labResults) {
    const arr = resultsByReport.get(r.report_id) ?? [];
    arr.push(r);
    resultsByReport.set(r.report_id, arr);
  }

  const hasPendingReports = reports.some((r) => r.status === 'pending');

  return (
    <div className="animate-slide-up space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button className="btn-secondary" onClick={onBack} aria-label="Back to patient list">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All Patients
        </button>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" onClick={handleShowAudit} aria-expanded={showAudit}>
            {showAudit ? 'Hide' : 'View'} Audit Log
          </button>
          <button id="upload-report-action-btn" className="btn-primary text-sm" onClick={onUploadReport}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Report
          </button>
        </div>
      </div>

      {/* Patient Card */}
      <section aria-labelledby="patient-info-heading" className="glass-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shrink-0" aria-hidden="true">
            {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 id="patient-info-heading" className="text-xl font-bold text-slate-100">{patient.name}</h1>
              <SourceBadge source="user" />
            </div>
            <p className="text-slate-400 text-sm mt-1">
              {patient.age} years · {SEX_LABELS[patient.sex] ?? patient.sex}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Symptoms', value: patient.symptoms },
            { label: 'Existing Conditions', value: patient.conditions },
            { label: 'Allergies', value: patient.allergies },
            { label: 'Medications', value: patient.medications },
            { label: 'Notes', value: patient.notes },
          ].map(
            ({ label, value }) =>
              value && (
                <div key={label}>
                  <dt className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</dt>
                  <dd className="mt-1 text-sm text-slate-300 flex items-start gap-2">
                    <span className="flex-1">{value}</span>
                    <SourceBadge source="user" />
                  </dd>
                </div>
              )
          )}
        </dl>
      </section>

      {/* Reports + Lab Results */}
      <section aria-labelledby="lab-results-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="lab-results-heading" className="section-heading mb-0">Lab Reports & Results</h2>
          {hasPendingReports && (
            <span className="text-xs text-amber-300 flex items-center gap-1 animate-pulse-gentle">
              <span className="w-2 h-2 bg-amber-400 rounded-full" aria-hidden="true" />
              Extracting...
            </span>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-slate-400 text-sm">No reports uploaded yet.</p>
            <button className="btn-primary mt-4 text-sm" onClick={onUploadReport}>
              Upload First Report
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => {
              const results = resultsByReport.get(report.id) ?? [];
              return (
                <article key={report.id} className="glass-card overflow-hidden">
                  {/* Report header */}
                  <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        report.status === 'extracted' ? 'bg-emerald-400' :
                        report.status === 'failed' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
                      }`} aria-hidden="true" />
                      <div>
                        <p className="font-medium text-slate-200 text-sm">{report.original_name}</p>
                        <p className="text-xs text-slate-500">
                          Uploaded {new Date(report.upload_date).toLocaleString()} ·{' '}
                          <span className={
                            report.status === 'extracted' ? 'text-emerald-400' :
                            report.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                          }>
                            {report.status === 'extracted' ? `${results.length} result${results.length !== 1 ? 's' : ''} extracted` :
                             report.status === 'failed' ? 'Extraction failed' : 'Extracting with AI...'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <SourceBadge source="ai_extracted" />
                  </div>

                  {report.status === 'failed' && report.error_message && (
                    <div className="px-5 py-3 bg-red-500/10 text-red-400 text-sm">
                      Error: {report.error_message}
                    </div>
                  )}

                  {results.length > 0 && (
                    <div className="table-container">
                      <table className="w-full text-sm">
                        <caption className="sr-only">Lab results from {report.original_name}</caption>
                        <thead>
                          <tr className="border-b border-white/10 bg-black/20">
                            <th scope="col" className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Test</th>
                            <th scope="col" className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Value</th>
                            <th scope="col" className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Reference Range</th>
                            <th scope="col" className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Status</th>
                            <th scope="col" className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Source</th>
                            <th scope="col" className="text-left px-4 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result, idx) => (
                            <tr
                              key={result.id}
                              className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${idx % 2 === 0 ? '' : 'bg-black/10'}`}
                            >
                              <td className="px-4 py-3 font-medium text-slate-200">{result.test_name}</td>
                              <td className="px-4 py-3">
                                {editState?.resultId === result.id ? (
                                  <div className="flex gap-1">
                                    <input
                                      className="input-field w-24 py-1 text-sm"
                                      value={editState.value}
                                      onChange={(e) => setEditState({ ...editState, value: e.target.value })}
                                      aria-label={`Edit value for ${result.test_name}`}
                                    />
                                    <input
                                      className="input-field w-16 py-1 text-sm"
                                      value={editState.unit}
                                      onChange={(e) => setEditState({ ...editState, unit: e.target.value })}
                                      aria-label={`Edit unit for ${result.test_name}`}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-slate-300 font-mono">
                                    {result.value ?? 'N/A'} <span className="text-slate-500 text-xs">{result.unit ?? ''}</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs">
                                {result.reference_range_text ?? (
                                  result.reference_range_low !== null || result.reference_range_high !== null
                                    ? `${result.reference_range_low ?? '?'} – ${result.reference_range_high ?? '?'}`
                                    : <span className="text-slate-600">not provided</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <RangeLabel label={result.range_label} />
                              </td>
                              <td className="px-4 py-3">
                                <SourceBadge source={result.source} />
                                {result.confidence !== null && (
                                  <span className="ml-1 text-xs text-slate-600" title={`AI confidence: ${(result.confidence * 100).toFixed(0)}%`}>
                                    {(result.confidence * 100).toFixed(0)}%
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {editState?.resultId === result.id ? (
                                  <div className="flex gap-1">
                                    <button
                                      className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 transition-colors"
                                      onClick={() => handleVerify(result)}
                                      disabled={saving}
                                      aria-label={`Save verified value for ${result.test_name}`}
                                    >
                                      {saving ? '...' : 'Save'}
                                    </button>
                                    <button
                                      className="text-xs px-2 py-1 text-slate-500 hover:text-slate-300 transition-colors"
                                      onClick={() => setEditState(null)}
                                      aria-label="Cancel edit"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded hover:bg-indigo-500/20 transition-colors"
                                    onClick={() => setEditState({ resultId: result.id, value: result.value ?? '', unit: result.unit ?? '' })}
                                    aria-label={`Edit and verify ${result.test_name}`}
                                  >
                                    Edit &amp; Verify
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* AI Summary */}
      <section aria-labelledby="ai-summary-heading" className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 id="ai-summary-heading" className="section-heading mb-0">AI Summary</h2>
          <button
            id="generate-summary-btn"
            className="btn-primary text-sm"
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            aria-busy={summaryLoading}
          >
            {summaryLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate Summary
              </>
            )}
          </button>
        </div>

        {summaryError && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {summaryError}
          </div>
        )}

        {summary ? (
          <div className="space-y-3">
            <div className="p-4 bg-black/20 rounded-lg text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {summary.content}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Generated {new Date(summary.generatedAt).toLocaleString()}</span>
              {!summary.safe && (
                <span className="text-amber-400">⚠ Content safety filter applied</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">
            Click "Generate Summary" to get a plain-language overview of this patient's record.
          </p>
        )}
      </section>

      {/* Audit Log */}
      {showAudit && (
        <section aria-labelledby="audit-log-heading" className="glass-card p-5">
          <h2 id="audit-log-heading" className="section-heading">Audit / Timeline</h2>
          {auditLog.length === 0 ? (
            <p className="text-slate-500 text-sm">No events recorded.</p>
          ) : (
            <ol className="space-y-2" aria-label="Audit log events">
              {auditLog.map((log) => (
                <li key={log.id} className="flex items-start gap-3 text-sm">
                  <time className="text-slate-500 text-xs shrink-0 mt-0.5" dateTime={log.created_at}>
                    {new Date(log.created_at).toLocaleString()}
                  </time>
                  <span className="text-slate-300">{log.action.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
