import React from 'react';

export function Disclaimer() {
  return (
    <aside role="complementary" aria-label="Medical disclaimer">
      <div className="disclaimer-bar">
        <svg
          className="w-5 h-5 mt-0.5 shrink-0 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p>
          <strong>Important:</strong> This is an organizational aid, not a medical diagnosis.
          Consult a licensed clinician for medical decisions. All AI-extracted data should be
          verified against source documents.
        </p>
      </div>
    </aside>
  );
}
