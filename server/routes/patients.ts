import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/index.js';

const router = Router();

const CreatePatientSchema = z.object({
  name: z.string().min(1).max(200),
  age: z.number().int().min(0).max(150),
  sex: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  symptoms: z.string().max(2000).optional().nullable(),
  conditions: z.string().max(2000).optional().nullable(),
  allergies: z.string().max(2000).optional().nullable(),
  medications: z.string().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const UpdatePatientSchema = CreatePatientSchema.partial();

// GET /api/patients — paginated list
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const offset = (page - 1) * limit;

    const countRow = dbGet('SELECT COUNT(*) as count FROM patients') as { count: number } | undefined;
    const total = countRow?.count ?? 0;

    const patients = dbAll(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM reports WHERE patient_id = p.id) as report_count,
        (SELECT COUNT(*) FROM lab_results WHERE patient_id = p.id) as result_count
      FROM patients p
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      limit,
      offset
    );

    res.json({
      data: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id — single patient with reports and lab results
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = dbGet('SELECT * FROM patients WHERE id = ?', req.params.id);

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const reports = dbAll(
      'SELECT * FROM reports WHERE patient_id = ? ORDER BY upload_date DESC',
      req.params.id
    );

    const labResults = dbAll(
      'SELECT * FROM lab_results WHERE patient_id = ? ORDER BY report_date DESC, test_name ASC',
      req.params.id
    );

    res.json({ patient, reports, labResults });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients — create patient
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreatePatientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const { name, age, sex, symptoms, conditions, allergies, medications, notes } = parsed.data;

    dbRun(
      `INSERT INTO patients (id, name, age, sex, symptoms, conditions, allergies, medications, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, name, age, sex,
      symptoms ?? null, conditions ?? null, allergies ?? null, medications ?? null, notes ?? null,
      now, now
    );

    dbRun(
      `INSERT INTO audit_log (id, patient_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)`,
      uuidv4(), id, 'patient_created', JSON.stringify({ name }), now
    );

    const patient = dbGet('SELECT * FROM patients WHERE id = ?', id);
    res.status(201).json(patient);
  } catch (err) {
    next(err);
  }
});

// PUT /api/patients/:id — update patient
router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = dbGet('SELECT * FROM patients WHERE id = ?', req.params.id);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const parsed = UpdatePatientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      return;
    }

    const updates = parsed.data;
    const now = new Date().toISOString();

    const fields = (Object.keys(updates) as (keyof typeof updates)[])
      .filter((k) => updates[k] !== undefined)
      .map((k) => `${k} = ?`);

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const values = (Object.keys(updates) as (keyof typeof updates)[])
      .filter((k) => updates[k] !== undefined)
      .map((k) => updates[k]);

    dbRun(
      `UPDATE patients SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`,
      ...values, now, req.params.id
    );

    dbRun(
      `INSERT INTO audit_log (id, patient_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)`,
      uuidv4(), req.params.id, 'patient_updated', JSON.stringify(updates), now
    );

    const updated = dbGet('SELECT * FROM patients WHERE id = ?', req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
