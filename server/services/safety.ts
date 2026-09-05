/**
 * Safety check for AI-generated summaries.
 * Prevents diagnosis, prescription, dosage, or treatment language.
 * If triggered, returns a safe fallback message.
 */

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bdiagnos(e|es|ed|ing|is|tic|tics|tically)\b/i,
  /\bprescri(be|bes|bed|bing|ption|ptions)\b/i,
  /\bdosage\b/i,
  /\b\d+\s*(mg|mcg|ml|mg\/dl|iu|units?)\b/i,
  /\btreat(ment|ments|ing|ed|s)?\b/i,
  /\bmedication change\b/i,
  /\brecommend(s|ed|ing)?\s+(taking|starting|stopping|increasing|decreasing)\b/i,
  /\bshould (take|start|stop|increase|decrease|discontinue)\b/i,
  /\byou (have|might have|may have|could have)\s+(a\s+)?\w+\s*(disease|disorder|condition|syndrome)\b/i,
  /\bthis (indicates?|suggests?|confirms?|shows?)\s+\w+\s*(disease|disorder|condition)\b/i,
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
