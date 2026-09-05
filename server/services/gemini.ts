import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is not set. Gemini features will not work.');
}

const genAI = new GoogleGenAI({ apiKey: apiKey ?? 'missing-key' });

const MODEL = 'gemini-2.5-flash';

const EXTRACTION_SYSTEM_PROMPT = `You are a medical report data extractor. Given a lab report (text or image), extract every test as JSON with fields: test_name, value, unit, reference_range_low, reference_range_high, reference_range_text, report_date, flag_text, confidence (0-1). Only use reference ranges explicitly printed in the document. If a field is not present, use null. Do not diagnose, interpret, or add medical opinions. Return only valid JSON, no prose.`;

const SUMMARY_SYSTEM_PROMPT = `You are a clinical information summarizer, not a diagnostician. Given structured patient intake data and lab results (each labeled by source, and each value labeled low/normal/high/unknown per its own reference range), write a concise, plain-language summary of what the record shows. Do not diagnose. Do not recommend or suggest any treatment, medication, or dosage. If information is missing, say so instead of guessing. End with: 'This summary is for organizational purposes only and is not a medical diagnosis.'`;

export interface ExtractedLabResult {
  test_name: string;
  value: string | null;
  unit: string | null;
  reference_range_low: number | null;
  reference_range_high: number | null;
  reference_range_text: string | null;
  report_date: string | null;
  flag_text: string | null;
  confidence: number | null;
}

export async function extractFromText(text: string): Promise<ExtractedLabResult[]> {
  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACTION_SYSTEM_PROMPT },
          { text: `Extract all lab results from this report:\n\n${text}` },
        ],
      },
    ],
  });

  const rawText = response.text ?? '';
  return parseExtractionResponse(rawText);
}

export async function extractFromImage(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedLabResult[]> {
  const base64Data = fileBuffer.toString('base64');

  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACTION_SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          { text: 'Extract all lab results from this medical report image.' },
        ],
      },
    ],
  });

  const rawText = response.text ?? '';
  return parseExtractionResponse(rawText);
}

function parseExtractionResponse(rawText: string): ExtractedLabResult[] {
  // Strip markdown code fences if present
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON array from response
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('Failed to parse Gemini extraction response as JSON');
    }
  }

  if (!Array.isArray(parsed)) {
    // Single object wrapped in array
    if (typeof parsed === 'object' && parsed !== null) {
      parsed = [parsed];
    } else {
      throw new Error('Gemini extraction response is not an array');
    }
  }

  return (parsed as ExtractedLabResult[]).map((item) => ({
    test_name: String(item.test_name ?? 'Unknown'),
    value: item.value != null ? String(item.value) : null,
    unit: item.unit != null ? String(item.unit) : null,
    reference_range_low:
      item.reference_range_low != null ? Number(item.reference_range_low) : null,
    reference_range_high:
      item.reference_range_high != null ? Number(item.reference_range_high) : null,
    reference_range_text: item.reference_range_text != null ? String(item.reference_range_text) : null,
    report_date: item.report_date != null ? String(item.report_date) : null,
    flag_text: item.flag_text != null ? String(item.flag_text) : null,
    confidence: item.confidence != null ? Number(item.confidence) : null,
  }));
}

export interface SummaryInput {
  patient: {
    name: string;
    age: number;
    sex: string;
    symptoms: string | null;
    conditions: string | null;
    allergies: string | null;
    medications: string | null;
    notes: string | null;
  };
  labResults: Array<{
    test_name: string;
    value: string | null;
    unit: string | null;
    reference_range_text: string | null;
    range_label: string | null;
    report_date: string | null;
    flag_text: string | null;
    source: string;
  }>;
}

export async function generateSummary(input: SummaryInput): Promise<string> {
  const patientSection = `Patient: ${input.patient.name}, Age ${input.patient.age}, Sex: ${input.patient.sex}
Symptoms: ${input.patient.symptoms ?? 'None reported'}
Existing Conditions: ${input.patient.conditions ?? 'None reported'}
Allergies: ${input.patient.allergies ?? 'None reported'}
Medications: ${input.patient.medications ?? 'None reported'}
Notes: ${input.patient.notes ?? 'None'}`;

  const labSection =
    input.labResults.length === 0
      ? 'No lab results available.'
      : input.labResults
          .map(
            (r) =>
              `- ${r.test_name}: ${r.value ?? 'N/A'} ${r.unit ?? ''} ` +
              `[${r.range_label?.toUpperCase() ?? 'UNKNOWN'}] ` +
              `(Range: ${r.reference_range_text ?? 'not provided'}) ` +
              `Date: ${r.report_date ?? 'unknown'} ` +
              `Source: ${r.source}` +
              (r.flag_text ? ` Flag: ${r.flag_text}` : '')
          )
          .join('\n');

  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: SUMMARY_SYSTEM_PROMPT },
          {
            text: `Please summarize the following patient record:\n\n${patientSection}\n\nLab Results:\n${labSection}`,
          },
        ],
      },
    ],
  });

  return response.text ?? '';
}
