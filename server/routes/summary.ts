import { Router, Request, Response, NextFunction } from 'express';
import { dbGet, dbAll, dbRun } from '../db/index.js';
import { generateSummary } from '../services/gemini.js';
import { checkSummarySafety } from '../services/safety.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router({ mergeParams: true });

// POST /api/patients/:patientId/summary
router.post('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const patient = dbGet('SELECT * FROM patients WHERE id = ?', patientId) as
      | {
          id: string;
          name: string;
          age: number;
          sex: string;
          symptoms: string | null;
          conditions: string | null;
          allergies: string | null;
          medications: string | null;
          notes: string | null;
        }
      | undefined;

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const labResults = dbAll(
      `SELECT test_name, value, unit, reference_range_text, range_label, report_date, flag_text, source
       FROM lab_results
       WHERE patient_id = ?
       ORDER BY report_date DESC, test_name ASC`,
      patientId
    ) as Array<{
      test_name: string;
      value: string | null;
      unit: string | null;
      reference_range_text: string | null;
      range_label: string | null;
      report_date: string | null;
      flag_text: string | null;
      source: string;
    }>;

    const rawSummary = await generateSummary({ patient, labResults });
    const safetyResult = checkSummarySafety(rawSummary);

    const now = new Date().toISOString();
    dbRun(
      `INSERT INTO audit_log (id, patient_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)`,
      uuidv4(), patientId, 'summary_generated', JSON.stringify({ safe: safetyResult.safe }), now
    );

    res.json({
      summary: safetyResult.content,
      safe: safetyResult.safe,
      generatedAt: now,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:patientId/audit — audit log
router.get('/audit', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const patient = dbGet('SELECT id FROM patients WHERE id = ?', patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const logs = dbAll(
      'SELECT * FROM audit_log WHERE patient_id = ? ORDER BY created_at DESC LIMIT 100',
      patientId
    );

    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
