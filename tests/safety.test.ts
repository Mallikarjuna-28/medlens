import { describe, it, expect } from 'vitest';
import { checkSummarySafety } from '../server/services/safety.js';

const DISCLAIMER = 'This summary is for organizational purposes only and is not a medical diagnosis.';

describe('checkSummarySafety', () => {
  describe('safe content', () => {
    it('returns safe for plain informational summary', () => {
      const content = `Patient John has hemoglobin at 13.5 g/dL which is within the reference range. ${DISCLAIMER}`;
      const result = checkSummarySafety(content);
      expect(result.safe).toBe(true);
      expect(result.content).toContain(DISCLAIMER);
    });

    it('appends disclaimer if missing', () => {
      const content = 'Patient shows normal blood glucose levels.';
      const result = checkSummarySafety(content);
      expect(result.safe).toBe(true);
      expect(result.content).toContain(DISCLAIMER);
    });

    it('does not duplicate disclaimer if already present', () => {
      const content = `Lab values recorded. ${DISCLAIMER}`;
      const result = checkSummarySafety(content);
      const count = (result.content.match(/This summary is for organizational purposes/g) ?? []).length;
      expect(count).toBe(1);
    });
    it('allows plain lab values like "glucose is 105 mg/dl"', () => {
      const content = `Patient fasting blood glucose is 105 mg/dl which is slightly elevated. ${DISCLAIMER}`;
      const result = checkSummarySafety(content);
      expect(result.safe).toBe(true);
    });

    it('allows lab values consistent with reference range', () => {
      const content = `Thyroid TSH level of 2.1 mIU/L is consistent with standard reference range. ${DISCLAIMER}`;
      const result = checkSummarySafety(content);
      expect(result.safe).toBe(true);
    });
  });

  describe('unsafe content — diagnosis language', () => {
    it('rejects content with "diagnose"', () => {
      const result = checkSummarySafety(`We diagnose the patient with anemia. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });

    it('rejects content with "diagnosis"', () => {
      const result = checkSummarySafety(`The diagnosis is Type 2 Diabetes. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });

    it('rejects "consistent with diabetes"', () => {
      const result = checkSummarySafety(`This lab result is consistent with diabetes. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });

    it('rejects "suggests hypertension"', () => {
      const result = checkSummarySafety(`Elevated reading suggests hypertension. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });

    it('rejects "indicative of infection"', () => {
      const result = checkSummarySafety(`High WBC count is indicative of infection. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });

    it('rejects "you have" followed by condition', () => {
      const result = checkSummarySafety(`The report shows you have Diabetes. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });
  });

  describe('unsafe content — prescription language', () => {
    it('rejects content with "prescribe"', () => {
      const result = checkSummarySafety(`We prescribe metformin. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });

    it('rejects content with "prescription"', () => {
      const result = checkSummarySafety(`A prescription for insulin is needed. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });
  });

  describe('unsafe content — dosage language', () => {
    it('rejects content with "dosage"', () => {
      const result = checkSummarySafety(`The dosage should be adjusted. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });

    it('rejects content with numeric mg values near prescription verbs', () => {
      const result = checkSummarySafety(`Patient should take 500mg daily. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });

    it('rejects prescribe verb near dosage unit', () => {
      const result = checkSummarySafety(`Prescribe 100 mg of medication. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });
  });

  describe('unsafe content — treatment language', () => {
    it('rejects content with "treatment"', () => {
      const result = checkSummarySafety(`Treatment with antibiotics is recommended. ${DISCLAIMER}`);
      expect(result.safe).toBe(false);
    });
  });

  describe('fallback message', () => {
    it('fallback message itself contains disclaimer', () => {
      const unsafe = checkSummarySafety('We diagnose you with hypertension.');
      expect(unsafe.safe).toBe(false);
      expect(unsafe.content).toContain(DISCLAIMER);
    });
  });
});
