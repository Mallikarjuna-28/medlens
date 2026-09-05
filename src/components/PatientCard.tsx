import React from 'react';
import { type Patient } from '../types';
import { SourceBadge } from './SourceBadge';

interface Props {
  patient: Patient;
  onClick?: () => void;
}

const SEX_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export function PatientCard({ patient, onClick }: Props) {
  return (
    <article
      className="glass-card p-5 hover:border-indigo-500/40 transition-all duration-200 cursor-pointer animate-fade-in hover:bg-white/[0.07] group"
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      tabIndex={0}
      role="button"
      aria-label={`View patient record for ${patient.name}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {patient.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
              {patient.name}
            </h2>
            <p className="text-sm text-slate-400">
              {patient.age} years · {SEX_LABELS[patient.sex] ?? patient.sex}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SourceBadge source="user" />
          <svg
            className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {patient.symptoms && (
          <div>
            <span className="text-slate-500">Symptoms</span>
            <p className="text-slate-300 mt-0.5 truncate">{patient.symptoms}</p>
          </div>
        )}
        {patient.conditions && (
          <div>
            <span className="text-slate-500">Conditions</span>
            <p className="text-slate-300 mt-0.5 truncate">{patient.conditions}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
        {patient.report_count !== undefined && (
          <span>
            <span className="text-slate-300 font-medium">{patient.report_count}</span> report
            {patient.report_count !== 1 ? 's' : ''}
          </span>
        )}
        {patient.result_count !== undefined && (
          <span>
            <span className="text-slate-300 font-medium">{patient.result_count}</span> lab result
            {patient.result_count !== 1 ? 's' : ''}
          </span>
        )}
        <span className="ml-auto">
          Added {new Date(patient.created_at).toLocaleDateString()}
        </span>
      </div>
    </article>
  );
}
