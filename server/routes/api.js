import express from 'express';
import multer from 'multer';
import { extractTextFromBuffer } from '../services/documentService.js';
import {
  processFullDocument,
  generateFlashcards,
  generateQuiz,
  generateStudyPlan,
  generateStudyTips,
  generateConceptAnalysis
} from '../services/aiService.js';

const router = express.Router();

// Setup Multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * 1. POST /api/upload-document
 * Uploads a file, extracts text, and triggers the full AI analysis pipeline.
 */
router.post('/upload-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file && !req.body.text) {
      return res.status(400).json({ error: 'No file or text provided' });
    }

    const title = req.body.title || (req.file ? req.file.originalname : 'Untitled');
    let rawText = req.body.text || '';

    if (req.file) {
      console.log(`[API] Extracting text from ${req.file.originalname}...`);
      rawText = await extractTextFromBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    if (!rawText || rawText.trim().length < 20) {
      return res.status(400).json({ error: 'Could not extract sufficient text from the document.' });
    }

    // Process the full document
    console.log(`[API] Starting full document analysis for "${title}"...`);
    const results = await processFullDocument(rawText, title);

    res.status(200).json({
      success: true,
      data: {
        title,
        rawText: rawText.substring(0, 15000), // Return truncated for UI preview
        ...results
      }
    });
  } catch (error) {
    console.error('[API] Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. POST /api/extract-document
 * Only extracts text without running AI (useful for debugging or manual triggering).
 */
router.post('/extract-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    const rawText = await extractTextFromBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.status(200).json({ success: true, text: rawText });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3. POST /api/analyze-document
 * Takes raw text and triggers the full pipeline.
 */
router.post('/analyze-document', async (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    
    const results = await processFullDocument(text, title || 'Untitled');
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Individual generation endpoints for specific features
 */
router.post('/generate-flashcards', async (req, res) => {
  try {
    const { text, count } = req.body;
    const data = await generateFlashcards(text, count || 15);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-quiz', async (req, res) => {
  try {
    const { text, count } = req.body;
    const data = await generateQuiz(text, count || 10);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-study-plan', async (req, res) => {
  try {
    const { text, title } = req.body;
    const data = await generateStudyPlan(text, title);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-tips', async (req, res) => {
  try {
    const { text } = req.body;
    const data = await generateStudyTips(text);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
