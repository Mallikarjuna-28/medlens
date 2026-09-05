import React, { useState } from 'react';
import { api } from '../api';
import { type Patient } from '../types';

interface Props {
  onBack: () => void;
  onCreated: (patient: Patient) => void;
}

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

interface FormData {
  name: string;
  age: string;
  sex: string;
  symptoms: string;
  conditions: string;
  allergies: string;
  medications: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  age?: string;
  sex?: string;
}

export function NewPatient({ onBack, onCreated }: Props) {
  const [form, setForm] = useState<FormData>({
    name: '',
    age: '',
    sex: '',
    symptoms: '',
    conditions: '',
    allergies: '',
    medications: '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    const age = parseInt(form.age, 10);
    if (!form.age || isNaN(age) || age < 0 || age > 150) newErrors.age = 'Valid age (0–150) is required';
    if (!form.sex) newErrors.sex = 'Sex is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const created = await api.createPatient({
        name: form.name.trim(),
        age: parseInt(form.age, 10),
        sex: form.sex,
        symptoms: form.symptoms.trim() || null,
        conditions: form.conditions.trim() || null,
        allergies: form.allergies.trim() || null,
        medications: form.medications.trim() || null,
        notes: form.notes.trim() || null,
      }) as Patient;
      onCreated(created);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Failed to create patient');
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Back button */}
      <button className="btn-secondary mb-6" onClick={onBack} aria-label="Go back to patient list">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      </button>

      <div className="glass-card p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">New Patient Intake</h1>
          <p className="text-slate-400 text-sm mt-1">
            All fields are tagged as <span className="text-indigo-300">user-entered</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate aria-label="New patient intake form">
          {apiError && (
            <div role="alert" className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {apiError}
            </div>
          )}

          {/* Required fields */}
          <fieldset className="mb-6">
            <legend className="section-heading text-base">Basic Information</legend>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="patient-name" className="label-text">
                  Full Name <span className="text-red-400" aria-label="required">*</span>
                </label>
                <input
                  id="patient-name"
                  type="text"
                  className={`input-field ${errors.name ? 'border-red-500/50' : ''}`}
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Jane Doe"
                  autoComplete="name"
                  aria-required="true"
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p id="name-error" className="mt-1 text-xs text-red-400" role="alert">{errors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Age */}
                <div>
                  <label htmlFor="patient-age" className="label-text">
                    Age <span className="text-red-400" aria-label="required">*</span>
                  </label>
                  <input
                    id="patient-age"
                    type="number"
                    className={`input-field ${errors.age ? 'border-red-500/50' : ''}`}
                    value={form.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                    placeholder="35"
                    min={0}
                    max={150}
                    aria-required="true"
                    aria-describedby={errors.age ? 'age-error' : undefined}
                    aria-invalid={!!errors.age}
                  />
                  {errors.age && (
                    <p id="age-error" className="mt-1 text-xs text-red-400" role="alert">{errors.age}</p>
                  )}
                </div>

                {/* Sex */}
                <div>
                  <label htmlFor="patient-sex" className="label-text">
                    Biological Sex <span className="text-red-400" aria-label="required">*</span>
                  </label>
                  <select
                    id="patient-sex"
                    className={`input-field ${errors.sex ? 'border-red-500/50' : ''}`}
                    value={form.sex}
                    onChange={(e) => handleChange('sex', e.target.value)}
                    aria-required="true"
                    aria-describedby={errors.sex ? 'sex-error' : undefined}
                    aria-invalid={!!errors.sex}
                  >
                    <option value="">Select...</option>
                    {SEX_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {errors.sex && (
                    <p id="sex-error" className="mt-1 text-xs text-red-400" role="alert">{errors.sex}</p>
                  )}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Optional fields */}
          <fieldset className="mb-6">
            <legend className="section-heading text-base">Clinical Information <span className="text-slate-500 text-sm font-normal">(optional)</span></legend>
            <div className="space-y-4">
              <div>
                <label htmlFor="patient-symptoms" className="label-text">Current Symptoms</label>
                <textarea
                  id="patient-symptoms"
                  className="input-field min-h-[80px] resize-y"
                  value={form.symptoms}
                  onChange={(e) => handleChange('symptoms', e.target.value)}
                  placeholder="e.g. Fatigue, shortness of breath, dizziness"
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="patient-conditions" className="label-text">Existing Conditions</label>
                <textarea
                  id="patient-conditions"
                  className="input-field min-h-[80px] resize-y"
                  value={form.conditions}
                  onChange={(e) => handleChange('conditions', e.target.value)}
                  placeholder="e.g. Type 2 Diabetes, Hypertension"
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="patient-allergies" className="label-text">Allergies</label>
                <input
                  id="patient-allergies"
                  type="text"
                  className="input-field"
                  value={form.allergies}
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs"
                />
              </div>
              <div>
                <label htmlFor="patient-medications" className="label-text">Current Medications</label>
                <textarea
                  id="patient-medications"
                  className="input-field resize-y"
                  value={form.medications}
                  onChange={(e) => handleChange('medications', e.target.value)}
                  placeholder="e.g. Metformin 500mg, Lisinopril"
                  rows={2}
                />
              </div>
              <div>
                <label htmlFor="patient-notes" className="label-text">Additional Notes</label>
                <textarea
                  id="patient-notes"
                  className="input-field resize-y"
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Any other relevant information..."
                  rows={3}
                />
              </div>
            </div>
          </fieldset>

          <div className="flex gap-3">
            <button
              type="submit"
              id="submit-patient-btn"
              className="btn-primary flex-1"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Create Patient Record
                </>
              )}
            </button>
            <button type="button" className="btn-secondary" onClick={onBack}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
