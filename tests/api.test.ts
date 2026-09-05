import { describe, it, expect, vi } from 'vitest';

// Mock node:sqlite before any imports that use it
const mockPatients: Record<string, unknown>[] = [];

vi.mock('node:sqlite', () => {
  const mockDb = {
    exec: vi.fn(),
    prepare: vi.fn((sql: string) => ({
      run: vi.fn((...args: unknown[]) => {
        if (sql.includes('INSERT INTO patients')) {
          mockPatients.push({
            id: args[0], name: args[1], age: args[2], sex: args[3],
            symptoms: args[4] ?? null, conditions: args[5] ?? null,
            allergies: args[6] ?? null, medications: args[7] ?? null,
            notes: args[8] ?? null, created_at: args[9], updated_at: args[10],
          });
        }
        return undefined;
      }),
      get: vi.fn((...args: unknown[]) => {
        if (sql.includes('COUNT(*)')) return { count: mockPatients.length };
        if (sql.includes('WHERE id = ?')) {
          return mockPatients.find((p) => p.id === args[0]) ?? null;
        }
        return mockPatients[0] ?? null;
      }),
      all: vi.fn(() => {
        if (sql.includes('SELECT') && sql.includes('patients')) return mockPatients;
        return [];
      }),
    })),
  };

  return {
    DatabaseSync: vi.fn(() => mockDb),
  };
});

// Mock Gemini
vi.mock('../server/services/gemini.js', () => ({
  extractFromText: vi.fn(async () => []),
  extractFromImage: vi.fn(async () => []),
  generateSummary: vi.fn(async () =>
    'Lab values are within expected ranges. This summary is for organizational purposes only and is not a medical diagnosis.'
  ),
}));

process.env.GEMINI_API_KEY = 'test-key-for-unit-tests';
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

import request from 'supertest';
import { app } from '../server/index.js';

describe('GET /api/health', () => {
  it('returns 200 with ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});

describe('POST /api/patients — validation', () => {
  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/patients')
      .send({ name: 'Jane' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('rejects invalid sex value', async () => {
    const res = await request(app)
      .post('/api/patients')
      .send({ name: 'Test', age: 30, sex: 'robot' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('rejects negative age', async () => {
    const res = await request(app)
      .post('/api/patients')
      .send({ name: 'Test', age: -5, sex: 'male' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/patients — pagination', () => {
  it('returns paginated list structure', async () => {
    const res = await request(app).get('/api/patients?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 5 });
  });

  it('clamps limit to max 50', async () => {
    const res = await request(app).get('/api/patients?limit=1000');
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(50);
  });
});
