import React, { useState, useEffect, useCallback } from 'react';
import { type Patient, type PaginatedResponse } from '../types';
import { api } from '../api';
import { PatientCard } from '../components/PatientCard';

interface Props {
  onSelect: (id: string) => void;
  onNewPatient: () => void;
}

export function Home({ onSelect, onNewPatient }: Props) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listPatients(page) as PaginatedResponse<Patient>;
      setPatients(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients(1);
  }, [fetchPatients]);

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Patient Records</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {pagination.total} patient{pagination.total !== 1 ? 's' : ''} in the system
          </p>
        </div>
        <button
          id="new-patient-btn"
          className="btn-primary"
          onClick={onNewPatient}
          aria-label="Add new patient"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Patient
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-label="Loading patients">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading records...</p>
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="glass-card p-6 text-center border-red-500/30">
          <p className="text-red-400 font-medium">{error}</p>
          <button className="btn-secondary mt-4" onClick={() => fetchPatients(1)}>
            Retry
          </button>
        </div>
      ) : patients.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-slate-200 font-semibold text-lg mb-2">No patients yet</h2>
          <p className="text-slate-400 text-sm mb-6">Create your first patient record to get started.</p>
          <button className="btn-primary" onClick={onNewPatient}>
            Create First Patient
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="Patient list">
            {patients.map((p) => (
              <div key={p.id} role="listitem">
                <PatientCard patient={p} onClick={() => onSelect(p.id)} />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Patient list pagination">
              <button
                className="btn-secondary"
                onClick={() => fetchPatients(pagination.page - 1)}
                disabled={pagination.page === 1}
                aria-label="Previous page"
              >
                ← Prev
              </button>
              <span className="text-slate-400 text-sm px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn-secondary"
                onClick={() => fetchPatients(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                aria-label="Next page"
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
