import { chunkText } from './documentService.js';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-1.5-flash';

const genAI = new GoogleGenerativeAI(API_KEY);

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;

const SOURCE_CONSTRAINT = `CRITICAL RULES:
- Use ONLY the provided study material as your source of information.
- Do NOT invent, fabricate, or add information that is not present in the material.
- Keep all explanations student-friendly and easy to understand.
- Structure your output clearly by topic.
- Every piece of content you generate must be directly traceable to the provided text.
`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFromAI(systemPrompt, userText) {
  if (!API_KEY) {
    throw new Error('Server missing GEMINI_API_KEY environment variable');
  }

  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
    systemInstruction: systemPrompt,
  });

  let lastError = null;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`[AI] Attempt ${attempt}/${RETRY_ATTEMPTS} processing ~${userText.length} chars with Gemini...`);
      
      const result = await model.generateContent(userText);
      const response = await result.response;
      let content = response.text();
      
      if (content.startsWith('```json')) content = content.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (content.startsWith('```')) content = content.replace(/^```/, '').replace(/```$/, '').trim();

      const parsed = JSON.parse(content);
      return parsed;

    } catch (err) {
      lastError = err;
      console.warn(`[AI] Error on attempt ${attempt}:`, err.message);
      
      // Don't retry auth errors
      if (err.message.includes('API key') || err.message.includes('401') || err.message.includes('403')) {
        throw err;
      }

      // 429 quota errors should wait a bit longer
      if (err.message.includes('429')) {
        console.warn(`[AI] Rate limited. Waiting 30s...`);
        await sleep(30000);
        continue;
      }

      if (attempt < RETRY_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('AI request failed after all retries');
}

// ── Feature Generators ──────────────────────────────────────

export async function summarizeContent(text) {
  const systemPrompt = `You are an expert study assistant. Provide a comprehensive summary.
${SOURCE_CONSTRAINT}
Return JSON with this structure:
{
  "tldr": "A concise 5-6 line TL;DR",
  "summary": "Detailed summary in 3-5 paragraphs",
  "keyPoints": ["point 1", "point 2"],
  "importantTerms": [{"term": "word", "definition": "definition"}],
  "difficulty": "beginner|intermediate|advanced",
  "estimatedStudyTime": "e.g. 30 minutes",
  "keyFacts": ["fact 1", "fact 2"]
}`;
  return await fetchFromAI(systemPrompt, text);
}

export async function generateFlashcards(text, count = 15) {
  const systemPrompt = `Create exactly ${count} flashcards from this study material.
${SOURCE_CONSTRAINT}
Return ONLY JSON:
{
  "cards": [
    {"front": "question", "back": "answer", "difficulty": "easy|medium|hard", "category": "category"}
  ]
}`;
  return await fetchFromAI(systemPrompt, text);
}

export async function generateQuiz(text, count = 10) {
  const systemPrompt = `Create exactly ${count} multiple-choice questions from this material.
${SOURCE_CONSTRAINT}
Return ONLY JSON:
{
  "questions": [
    {
      "id": 1,
      "question": "question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "why this is correct",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;
  return await fetchFromAI(systemPrompt, text);
}

export async function generateExamQuestions(text, topic = '') {
  const systemPrompt = `Generate exam-style questions from this material.
${SOURCE_CONSTRAINT}
Return ONLY JSON:
{
  "questions": [
    {
      "id": 1,
      "question": "question text",
      "type": "short|long|application",
      "marks": 5,
      "priority": "star|fire|normal",
      "modelAnswer": "brief model answer"
    }
  ],
  "examTips": ["tip 1", "tip 2"]
}`;
  return await fetchFromAI(systemPrompt, text);
}

export async function generateDiagram(text) {
  const systemPrompt = `Analyze the material and create Mermaid diagram code visualizing key concepts.
${SOURCE_CONSTRAINT}
Return ONLY JSON:
{
  "diagrams": [
    {
      "title": "title",
      "type": "flowchart|mindmap|graph|sequence",
      "mermaidCode": "valid mermaid code",
      "description": "what this shows"
    }
  ]
}`;
  return await fetchFromAI(systemPrompt, text);
}

export async function generateNotes(text) {
  const systemPrompt = `Transform this material into well-structured Markdown study notes.
${SOURCE_CONSTRAINT}
Return ONLY JSON:
{
  "notes": "full markdown notes",
  "title": "notes title",
  "sections": ["section1", "section2"]
}`;
  return await fetchFromAI(systemPrompt, text);
}

export async function generateConceptAnalysis(text) {
  const systemPrompt = `Break down and analyze the concepts.
${SOURCE_CONSTRAINT}
Return ONLY JSON:
{
  "concepts": [
    {
      "title": "concept name",
      "simpleExplanation": "easy explanation",
      "steps": ["step 1", "step 2"],
      "commonMistakes": ["mistake 1"],
      "difficulty": "easy|medium|hard"
    }
  ],
  "coreIdeas": [{"idea": "concept", "importance": "high"}],
  "memorizeThis": ["fact 1"]
}`;
  return await fetchFromAI(systemPrompt, text);
}

export async function generateStudyPlan(text, topic = '') {
  const systemPrompt = `Create a 7-day spaced repetition revision plan using Ebbinghaus principles.
${SOURCE_CONSTRAINT}
Return ONLY JSON:
{
  "schedule": [
    {
      "day": 1,
      "label": "Day 1: Initial Learning",
      "activities": ["Read", "Summarize"],
      "duration": "45 minutes",
      "focusAreas": ["topic 1"],
      "priority": "high",
      "topicsToRevise": ["specific topic 1"]
    }
  ],
  "totalEstimatedTime": "3.5 hours"
}`;
  return await fetchFromAI(systemPrompt, text);
}

export async function generateStudyTips(text) {
  const systemPrompt = `Provide personalized study tips based on this material.
${SOURCE_CONSTRAINT}
Return ONLY JSON:
{
  "subjectType": "coding|science|theory|math|language",
  "tips": [
    {"title": "tip", "description": "desc", "category": "focus"}
  ],
  "mnemonics": [{"concept": "concept", "mnemonic": "trick"}]
}`;
  return await fetchFromAI(systemPrompt, text);
}

// ── Master Orchestrator ─────────────────────────────────────

export async function processFullDocument(fullText, title) {
  // Gemini 1.5 Flash handles up to 1M tokens, but we still chunk to keep JSON responses focused
  const chunks = chunkText(fullText, 40000); // Larger chunks for Gemini
  const primaryChunk = chunks[0]; 

  console.log(`[Backend] Processing document with Gemini. Using primary chunk of ${primaryChunk.length} chars.`);

  const results = {
    summary: null,
    flashcards: [],
    quizQuestions: [],
    examQuestions: [],
    examTips: [],
    diagrams: [],
    notes: null,
    conceptBreakdown: null,
    analysis: null,
    revisionPlan: null,
    studyTips: null
  };

  const safeRun = async (fn, key, ...args) => {
    try {
      const data = await fn(...args);
      return { key, data, success: true };
    } catch (e) {
      console.error(`[AI Task Failed] ${key}:`, e.message);
      return { key, error: e.message, success: false };
    }
  };

  // Run tasks concurrently in batches
  const batch1 = await Promise.all([
    safeRun(summarizeContent, 'summary', primaryChunk),
    safeRun(generateFlashcards, 'flashcards', primaryChunk, 15),
    safeRun(generateQuiz, 'quiz', primaryChunk, 10),
  ]);

  await sleep(1000); 

  const batch2 = await Promise.all([
    safeRun(generateConceptAnalysis, 'concepts', primaryChunk),
    safeRun(generateNotes, 'notes', primaryChunk),
    safeRun(generateDiagram, 'diagrams', primaryChunk),
  ]);

  await sleep(1000);

  const batch3 = await Promise.all([
    safeRun(generateStudyPlan, 'revision', primaryChunk, title),
    safeRun(generateExamQuestions, 'examQuestions', primaryChunk, title),
  ]);

  const allResults = [...batch1, ...batch2, ...batch3];

  for (const res of allResults) {
    if (res.success && res.data) {
      if (res.key === 'summary') {
        results.tldr = res.data.tldr;
        results.summary = res.data.summary;
        results.keyPoints = res.data.keyPoints;
        results.importantTerms = res.data.importantTerms;
        results.difficulty = res.data.difficulty;
        results.estimatedStudyTime = res.data.estimatedStudyTime;
        results.keyFacts = res.data.keyFacts;
      }
      if (res.key === 'flashcards') results.flashcards = res.data.cards || [];
      if (res.key === 'quiz') results.quizQuestions = res.data.questions || [];
      if (res.key === 'concepts') {
        results.conceptBreakdown = { concepts: res.data.concepts || [] };
        results.analysis = {
          coreIdeas: res.data.coreIdeas || [],
          memorizeThis: res.data.memorizeThis || []
        };
      }
      if (res.key === 'notes') {
        results.notes = res.data.notes;
        results.notesSections = res.data.sections;
      }
      if (res.key === 'diagrams') results.diagrams = res.data.diagrams || [];
      if (res.key === 'revision') results.revisionPlan = res.data;
      if (res.key === 'examQuestions') {
        results.examQuestions = res.data.questions || [];
        results.examTips = res.data.examTips || [];
      }
    }
  }

  return results;
}
