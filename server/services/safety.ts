/**
 * Safety check for AI-generated summaries.
 * Prevents diagnosis, prescription, dosage, or treatment language.
 * If triggered, returns a safe fallback message.
 */

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bdiagnos(e|es|ed|ing|is|tic|tics|tically)\b/i,
  /\bprescri(be|bes|bed|bing|ption|ptions)\b/i,
  /\bdosage\b/i,
  /\b(take|start|stop|prescribe|administer|dose|dosage|give|inject|discontinue)\b[^.!?\n]*?\b\d+(\.\d+)?\s*(mg|mcg|ml|mg\/dl|iu|units?)\b/i,
  /\b\d+(\.\d+)?\s*(mg|mcg|ml|mg\/dl|iu|units?)\b[^.!?\n]*?\b(daily|twice|per day|every|three times|daily dose|take|prescribe|administer|dose|given|injected)\b/i,
  /\btreat(ment|ments|ing|ed|s)?\b/i,
  /\bmedication change\b/i,
  /\brecommend(s|ed|ing)?\s+(taking|starting|stopping|increasing|decreasing)\b/i,
  /\bshould (take|start|stop|increase|decrease|discontinue)\b/i,
  /\b(consistent with|suggestive of|indicative of|suggests?|indicates?|you have|you (might|may|could) have|suffer from)\s+([a-z0-9\s-]{0,25}?\b(disease|disorder|condition|syndrome|diabetes|hypertension|anemia|infection|cancer|asthma|copd|ckd|flu|arthritis|depression|anxiety|hepatitis|cirrhosis|leukemia|lymphoma|stroke|infarction|pneumonia|sepsis|renal failure|kidney failure|heart failure)\b)/i,
  /\b(consistent with|suggestive of|indicative of|suggests?|indicates?|[Yy]ou have|[Yy]ou (might|may|could) have|[Ss]uffer from)\s+([a-z0-9\s-]{0,25}?[A-Z][a-zA-Z0-9-]*)/,
];

const REQUIRED_DISCLAIMER =
  'This summary is for organizational purposes only and is not a medical diagnosis.';

const FALLBACK_MESSAGE = `Unable to generate summary due to content safety restrictions. Please consult a licensed clinician for medical interpretation of your lab results.\n\n${REQUIRED_DISCLAIMER}`;

export interface SafetyCheckResult {
  safe: boolean;
  content: string;
  triggeredPattern?: string;
}

export function checkSummarySafety(content: string): SafetyCheckResult {
  // Strip disclaimer before safety checks so disclaimer text ("is not a medical diagnosis") doesn't trigger the diagnosis filter
  const textToTest = content.replace(REQUIRED_DISCLAIMER, '').trim();

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(textToTest)) {
      return {
        safe: false,
        content: FALLBACK_MESSAGE,
        triggeredPattern: pattern.toString(),
      };
    }
  }

  // Ensure disclaimer is present
  if (!content.includes(REQUIRED_DISCLAIMER)) {
    return {
      safe: true,
      content: content + '\n\n' + REQUIRED_DISCLAIMER,
    };
  }

  return { safe: true, content };
}
