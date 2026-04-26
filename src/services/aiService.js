// Frontend AI Service Client
// This service now forwards all requests to the Express backend API.

const API_BASE_URL = 'http://localhost:3001/api';

// ── Configuration ──────────────────────────────────────────
export function setApiKey(key) {
  localStorage.setItem('groq_api_key', key);
}

export function hasApiKey() {
  // Can just return true since the backend uses its own environment variable
  return true; 
}

/**
 * Make a request to the backend API
 */
async function fetchFromBackend(endpoint, body) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Backend API failed with status: ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || 'Backend returned an error');
    }

    return json.data;
  } catch (err) {
    console.error(`[Frontend API Error] ${endpoint}:`, err);
    throw err;
  }
}

// ── 1. SUMMARIZE CONTENT ──────────────────────────────────
export async function summarizeContent(text) {
  // Actually the backend doesn't have a standalone summarize endpoint yet, 
  // but we can add one or use analyze-document.
  // For regeneration, analyze-document returns everything, we could just extract summary.
  // Let's implement it to call analyze-document and return only summary parts.
  const data = await fetchFromBackend('/analyze-document', { text });
  return {
    tldr: data.tldr,
    summary: data.summary,
    keyPoints: data.keyPoints,
    importantTerms: data.importantTerms,
    difficulty: data.difficulty,
    estimatedStudyTime: data.estimatedStudyTime,
    keyFacts: data.keyFacts
  };
}

// ── 2. GENERATE FLASHCARDS ─────────────────────────────────
export async function generateFlashcards(text, count = 15) {
  return await fetchFromBackend('/generate-flashcards', { text, count });
}

// ── 3. GENERATE QUIZ ───────────────────────────────────────
export async function generateQuiz(text, count = 10) {
  return await fetchFromBackend('/generate-quiz', { text, count });
}

// ── 4. EXAM QUESTIONS ──────────────────────────────────────
export async function generateExamQuestions(text, topic = '') {
  // In the backend, we don't have a standalone endpoint for exam questions yet.
  // We can just call analyze-document to regenerate.
  const data = await fetchFromBackend('/analyze-document', { text, title: topic });
  return { questions: data.examQuestions, examTips: data.examTips };
}

// ── 5. DIAGRAM ─────────────────────────────────────────────
export async function generateDiagram(text) {
  const data = await fetchFromBackend('/analyze-document', { text });
  return { diagrams: data.diagrams };
}

// ── 6. NOTES ───────────────────────────────────────────────
export async function generateNotes(text) {
  const data = await fetchFromBackend('/analyze-document', { text });
  return { notes: data.notes, title: data.title, sections: data.notesSections };
}

// ── 7. CONCEPT BREAKDOWN ───────────────────────────────────
export async function generateConceptBreakdown(text) {
  const data = await fetchFromBackend('/analyze-document', { text });
  return data.conceptBreakdown;
}

// ── 8. ANALYSIS MODE ───────────────────────────────────────
export async function generateAnalysis(text) {
  const data = await fetchFromBackend('/analyze-document', { text });
  return data.analysis;
}

// ── 9. REVISION PLAN (7-Day Spaced Repetition) ─────────────
export async function generateRevisionPlan(text, topic = '') {
  return await fetchFromBackend('/generate-study-plan', { text, title: topic });
}

// ── 10. SMART STUDY TIPS ───────────────────────────────────
export async function generateStudyTips(text) {
  return await fetchFromBackend('/generate-tips', { text });
}
