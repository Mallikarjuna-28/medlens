import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { dbGet, dbAll, dbRun, transaction } from '../db/index.js';
import { upload } from '../middleware/upload.js';
import { extractFromText, extractFromImage } from '../services/gemini.js';
import { labelRange } from '../services/rangeCheck.js';
import { z } from 'zod';

const router = Router({ mergeParams: true });

// GET /api/patients/:patientId/reports
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const patient = dbGet('SELECT id FROM patients WHERE id = ?', patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const offset = (page - 1) * limit;

    const countRow = dbGet(
      'SELECT COUNT(*) as count FROM reports WHERE patient_id = ?',
      patientId
    ) as { count: number } | undefined;
    const total = countRow?.count ?? 0;

    const reports = dbAll(
      `SELECT r.*, (SELECT COUNT(*) FROM lab_results WHERE report_id = r.id) as result_count
       FROM reports r
       WHERE r.patient_id = ?
       ORDER BY r.upload_date DESC
       LIMIT ? OFFSET ?`,
      patientId, limit, offset
    );

    res.json({
      data: reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients/:patientId/reports — upload and extract
router.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const patient = dbGet('SELECT id FROM patients WHERE id = ?', patientId);
      if (!patient) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const reportId = uuidv4();
      const now = new Date().toISOString();

      dbRun(
        `INSERT INTO reports (id, patient_id, filename, original_name, mime_type, file_path, upload_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        reportId, patientId, req.file.filename, req.file.originalname,
        req.file.mimetype, req.file.path, now, 'pending'
      );

      dbRun(
        `INSERT INTO audit_log (id, patient_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)`,
        uuidv4(), patientId, 'report_uploaded',
        JSON.stringify({ filename: req.file.originalname }), now
      );

      res.status(202).json({
        reportId,
        status: 'pending',
        message: 'Report uploaded. Extraction started.',
      });

      // Run extraction in background
      setImmediate(async () => {
        try {
          let extracted;
          const fileBuffer = fs.readFileSync(req.file!.path);

          if (req.file!.mimetype === 'application/pdf') {
            const pdfData = await pdfParse(fileBuffer);
            if (pdfData.text.trim().length > 50) {
              extracted = await extractFromText(pdfData.text);
            } else {
              extracted = await extractFromImage(fileBuffer, 'image/png');
            }
          } else {
            extracted = await extractFromImage(fileBuffer, req.file!.mimetype);
          }

          transaction(() => {
            for (const r of extracted) {
              const rangeLabel = labelRange(r.value, r.reference_range_low, r.reference_range_high);
              dbRun(
                `INSERT INTO lab_results
                 (id, report_id, patient_id, test_name, value, unit,
                  reference_range_low, reference_range_high, reference_range_text,
                  report_date, flag_text, confidence, range_label, source, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                uuidv4(), reportId, patientId,
                r.test_name, r.value, r.unit,
                r.reference_range_low, r.reference_range_high, r.reference_range_text,
                r.report_date, r.flag_text, r.confidence,
                rangeLabel, 'ai_extracted', now
              );
            }
            dbRun(
              `UPDATE reports SET status = 'extracted', extracted_at = ? WHERE id = ?`,
              new Date().toISOString(), reportId
            );
          });

          dbRun(
            `INSERT INTO audit_log (id, patient_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)`,
            uuidv4(), patientId, 'report_extracted',
            JSON.stringify({ reportId, resultCount: extracted.length }),
            new Date().toISOString()
          );
        } catch (extractErr) {
          const errMsg = extractErr instanceof Error ? extractErr.message : String(extractErr);
          dbRun(
            `UPDATE reports SET status = 'failed', error_message = ? WHERE id = ?`,
            errMsg, reportId
          );
        }
      });
    } catch (err) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      }
      next(err);
    }
  }
);

// GET /api/patients/:patientId/reports/:reportId/status
router.get('/:reportId/status', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, reportId } = req.params;

    const report = dbGet(
      'SELECT * FROM reports WHERE id = ? AND patient_id = ?',
      reportId, patientId
    );

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const labResults =
      (report as { status: string }).status === 'extracted'
        ? dbAll('SELECT * FROM lab_results WHERE report_id = ? ORDER BY test_name ASC', reportId)
        : [];

    res.json({ report, labResults });
  } catch (err) {
    next(err);
  }
});

// PUT /api/patients/:patientId/reports/results/:resultId — verify/edit
const UpdateLabResultSchema = z.object({
  value: z.string().optional(),
  unit: z.string().optional(),
  reference_range_low: z.number().optional().nullable(),
  reference_range_high: z.number().optional().nullable(),
  reference_range_text: z.string().optional().nullable(),
  report_date: z.string().optional().nullable(),
  flag_text: z.string().optional().nullable(),
});

router.put('/results/:resultId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, resultId } = req.params;

    const existing = dbGet(
      'SELECT * FROM lab_results WHERE id = ? AND patient_id = ?',
      resultId, patientId
    ) as Record<string, unknown> | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Lab result not found' });
      return;
    }

    const parsed = UpdateLabResultSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      return;
    }

    const updates = parsed.data;
    const now = new Date().toISOString();

    const newValue = updates.value ?? (existing.value as string | null);
    const newLow = 'reference_range_low' in updates
      ? updates.reference_range_low
      : (existing.reference_range_low as number | null);
    const newHigh = 'reference_range_high' in updates
      ? updates.reference_range_high
      : (existing.reference_range_high as number | null);

    const newRangeLabel = labelRange(newValue, newLow, newHigh);

    dbRun(
      `UPDATE lab_results
       SET value = COALESCE(?, value),
           unit = COALESCE(?, unit),
           reference_range_low = ?,
           reference_range_high = ?,
           reference_range_text = COALESCE(?, reference_range_text),
           report_date = COALESCE(?, report_date),
           flag_text = COALESCE(?, flag_text),
           source = 'user_verified',
           range_label = ?,
           verified_at = ?
       WHERE id = ?`,
      updates.value ?? null,
      updates.unit ?? null,
      newLow ?? null,
      newHigh ?? null,
      updates.reference_range_text ?? null,
      updates.report_date ?? null,
      updates.flag_text ?? null,
      newRangeLabel,
      now,
      resultId
    );

    dbRun(
      `INSERT INTO audit_log (id, patient_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)`,
      uuidv4(), patientId, 'lab_result_verified', JSON.stringify({ resultId, updates }), now
    );

    const updated = dbGet('SELECT * FROM lab_results WHERE id = ?', resultId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
