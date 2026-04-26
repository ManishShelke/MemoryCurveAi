import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, FileType, Sparkles, Loader2, CheckCircle,
  BookOpen, Layers, FileQuestion, Brain, X, AlertCircle
} from 'lucide-react';
import { parseFile, SUPPORTED_EXTENSIONS, getFileInfo } from '../utils/fileParser';
import { hasApiKey, setApiKey } from '../services/aiService';
import { addStudyMaterial, createRevisionReminders } from '../firebase/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const AI_STEPS = [
  { key: 'summary', label: 'Summarizing content...', emoji: '📝' },
  { key: 'flashcards', label: 'Generating flashcards...', emoji: '🃏' },
  { key: 'quiz', label: 'Creating quiz questions...', emoji: '❓' },
  { key: 'diagrams', label: 'Creating visual diagrams...', emoji: '📊' },
  { key: 'notes', label: 'Building study notes...', emoji: '📒' },
  { key: 'concepts', label: 'Breaking down concepts...', emoji: '🧩' },
  { key: 'analysis', label: 'Analyzing content...', emoji: '🧪' },
  { key: 'revision', label: 'Creating revision plan...', emoji: '🔁' },
];

/** Delay between sequential AI calls to avoid rate limits */
const DELAY_BETWEEN_CALLS_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function StudyUpload({ onNavigate, onMaterialCreated }) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processStage, setProcessStage] = useState('');
  const [currentAIStep, setCurrentAIStep] = useState(0);
  const [result, setResult] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyForm, setShowApiKeyForm] = useState(!hasApiKey());
  const fileInputRef = useRef(null);

  // ── Drag & Drop ──
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
    }
  }, [title]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleApiKeySave = () => {
    if (apiKeyInput.trim().length > 10) {
      setApiKey(apiKeyInput.trim());
      setShowApiKeyForm(false);
      toast.success('API key saved!');
    } else {
      toast.error('Please enter a valid API key.');
    }
  };

  // ── Safe AI call with error handling and rate limit recovery ──
  const safeAICall = async (fn, ...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      console.warn(`[Upload] AI call ${fn.name} failed:`, e.message);
      
      // If it's an authorization/API key error, throw it immediately to stop the whole process
      if (e.message.includes('401') || e.message.includes('403') || e.message.includes('API key')) {
        throw e;
      }

      // Rate limit errors are now handled inside aiService with retry,
      // so if we still get here it means all retries failed
      if (e.message.toLowerCase().includes('rate limit') || e.message.includes('429')) {
        toast.error('Rate limit hit — waiting 60s before continuing...');
        await sleep(60000);
        // Try once more after the long wait
        try {
          return await fn(...args);
        } catch (retryErr) {
          console.warn(`[Upload] Retry after rate limit also failed:`, retryErr.message);
          return null;
        }
      }
      return null;
    }
  };

  // ── Process Content ──
  const handleProcess = async () => {
    if (!title.trim()) { toast.error('Please enter a title.'); return; }
    if (!file && !rawText.trim()) { toast.error('Upload a file or paste text.'); return; }
    if (!hasApiKey()) { setShowApiKeyForm(true); return; }

    setProcessing(true);
    setStep('processing');
    setCurrentAIStep(0);

    try {
      // Step 1: Extract text
      let textContent = rawText.trim();
      let fileType = 'text';
      if (file) {
        setProcessStage('Reading file...');
        const parsed = await parseFile(file);
        textContent = parsed.text;
        fileType = parsed.type;
      }

      if (!textContent || textContent.trim().length < 20) {
        throw new Error('Not enough text content extracted. Please try a different file or paste text directly.');
      }

      // Step 2: Send to Backend API
      setProcessStage('Sending to backend for AI processing (this may take 30-60s)...');
      
      const formData = new FormData();
      formData.append('title', title.trim());
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('text', rawText.trim());
      }

      const response = await fetch('http://localhost:3001/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const { data } = await response.json();
      
      // Map data from backend
      const summaryData = {
        tldr: data.tldr,
        summary: data.summary,
        keyPoints: data.keyPoints,
        importantTerms: data.importantTerms,
        difficulty: data.difficulty,
        estimatedStudyTime: data.estimatedStudyTime,
        keyFacts: data.keyFacts
      };
      const flashcardData = { cards: data.flashcards };
      const quizData = { questions: data.quizQuestions };
      const examData = { questions: data.examQuestions, examTips: data.examTips };
      const diagramData = { diagrams: data.diagrams };
      const notesData = { notes: data.notes, sections: data.notesSections };
      const conceptData = data.conceptBreakdown;
      const analysisData = data.analysis;
      const revisionData = data.revisionPlan;
      const tipsData = data.studyTips;

      // Make progress bar reach 100% smoothly
      setCurrentAIStep(AI_STEPS.length - 1);

      // Step 3: Save to Firestore
      setProcessStage('Saving to your library...');
      const getArray = (arr) => Array.isArray(arr) ? arr : [];

      const material = {
        title: data.title || title.trim(),
        subject: subject.trim() || 'General',
        rawText: data.rawText || textContent.substring(0, 15000), 
        fileType,
        fileName: file?.name || 'Pasted Text',
        // Summary
        tldr: summaryData.tldr || '',
        summary: summaryData.summary || '',
        keyPoints: summaryData.keyPoints || [],
        importantTerms: summaryData.importantTerms || [],
        difficulty: summaryData.difficulty || 'intermediate',
        estimatedStudyTime: summaryData.estimatedStudyTime || '30 minutes',
        keyFacts: summaryData.keyFacts || [],
        // Flashcards
        flashcards: getArray(flashcardData.cards),
        // Quiz
        quizQuestions: getArray(quizData.questions),
        // Exam
        examQuestions: getArray(examData.questions),
        examTips: examData.examTips || [],
        // Diagrams
        diagrams: diagramData.diagrams || [],
        // Notes
        notes: notesData.notes || '',
        notesSections: notesData.sections || [],
        // Concept Breakdown
        conceptBreakdown: conceptData,
        // Analysis
        analysis: analysisData,
        // Revision Plan
        revisionPlan: revisionData,
        // Study Tips
        studyTips: tipsData,
        // Progress tracking
        flashcardProgress: {},
        quizBestScore: 0,
        revisionCompletedDays: {},
      };

      const materialId = await addStudyMaterial(material, currentUser.uid);
      material.id = materialId;

      // Step 4: Auto-create 7-day revision reminders if revision plan was generated
      if (revisionData?.schedule) {
        setProcessStage('Setting up revision reminders...');
        try {
          await createRevisionReminders(
            materialId,
            title.trim(),
            revisionData,
            currentUser.uid,
            currentUser.email || null,
            currentUser.displayName || null
          );
          console.log('[Upload] Revision reminders created successfully');
        } catch (err) {
          console.warn('[Upload] Failed to create revision reminders:', err);
          // Non-fatal — continue even if reminders fail
        }
      }

      setResult(material);

      toast.success('🎉 Study materials generated! Loading Concepts...');
      if (onMaterialCreated) onMaterialCreated(material);

      resetForm();
      onNavigate('concepts');

    } catch (err) {
      console.error('Processing error:', err);
      toast.error(`Processing failed: ${err.message}`);
      setStep('upload');
    } finally {
      setProcessing(false);
      setProcessStage('');
    }
  };

  const resetForm = () => {
    setStep('upload');
    setFile(null);
    setRawText('');
    setTitle('');
    setSubject('');
    setResult(null);
    setCurrentAIStep(0);
  };

  // Stat counts for result
  const countFeatures = (r) => {
    if (!r) return [];
    return [
      { label: 'Flashcards', count: r.flashcards?.length || 0, icon: '🃏', page: 'flashcards' },
      { label: 'Quiz Qs', count: r.quizQuestions?.length || 0, icon: '❓', page: 'quiz' },
      { label: 'Concepts', count: r.conceptBreakdown?.concepts?.length || 0, icon: '🧩', page: 'concepts' },
      { label: 'Diagrams', count: r.diagrams?.length || 0, icon: '📊', page: 'concepts' },
    ].filter(f => f.count > 0);
  };

  // ── API Key Form ──
  if (showApiKeyForm) {
    return (
      <div className="study-upload-page">
        <div className="glass-card api-key-card">
          <div className="card-header">
            <div className="card-icon"><Sparkles size={20} /></div>
            <h2>Set Up AI</h2>
          </div>
          <p className="api-key-desc">
            Enter your Groq API key to unlock AI-powered features. Get one free at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-accent-link">
              console.groq.com
            </a>
          </p>
          <div className="input-group">
            <input
              type="password"
              placeholder="Paste your Groq API key here..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="api-key-input"
            />
            <button onClick={handleApiKeySave} className="btn-primary">Save Key</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done State ──
  if (step === 'done' && result) {
    const features = countFeatures(result);
    return (
      <div className="study-upload-page">
        <div className="glass-card result-card">
          <div className="result-header">
            <CheckCircle size={48} className="result-check" />
            <h2>Study Material Ready!</h2>
            <p className="result-title">{result.title}</p>
            <span className="result-xp">+50 XP earned! 🎉</span>
          </div>

          {/* TL;DR */}
          {result.tldr && (
            <div className="result-tldr">
              <h3>⚡ TL;DR</h3>
              <p>{result.tldr}</p>
            </div>
          )}

          {result.summary && (
            <div className="result-summary">
              <h3>📝 Summary</h3>
              <p>{result.summary}</p>
            </div>
          )}

          {Array.isArray(result.keyPoints) && result.keyPoints.length > 0 && (
            <div className="result-keypoints">
              <h3>🎯 Key Points</h3>
              <ul>
                {result.keyPoints.map((kp, i) => <li key={i}>{kp}</li>)}
              </ul>
            </div>
          )}

          {/* Feature counts */}
          <div className="result-features">
            {features.map((f, i) => (
              <button key={i} className="result-feature-btn" onClick={() => onNavigate(f.page)}>
                <span className="feature-icon">{f.icon}</span>
                <span className="feature-count">{f.count}</span>
                <span className="feature-label">{f.label}</span>
              </button>
            ))}
          </div>

          <div className="result-actions">
            <button className="result-action-btn" onClick={() => onNavigate('flashcards')}>
              <Layers size={20} />
              <span>Study Flashcards</span>
            </button>
            <button className="result-action-btn" onClick={() => onNavigate('quiz')}>
              <FileQuestion size={20} />
              <span>Take Quiz</span>
            </button>
            <button className="result-action-btn" onClick={() => onNavigate('dashboard')}>
              <Brain size={20} />
              <span>View Dashboard</span>
            </button>
          </div>

          <button className="btn-outline-full" onClick={resetForm}>
            <Upload size={16} /> Upload Another
          </button>
        </div>
      </div>
    );
  }

  // ── Processing State ──
  if (step === 'processing') {
    const progressPct = ((currentAIStep + 1) / AI_STEPS.length) * 100;
    return (
      <div className="study-upload-page">
        <div className="glass-card processing-card">
          <div className="processing-animation">
            <div className="processing-brain">
              <Brain size={56} />
            </div>
            <div className="processing-rings">
              <div className="ring ring-1"></div>
              <div className="ring ring-2"></div>
              <div className="ring ring-3"></div>
            </div>
          </div>
          <h2>AI is Processing...</h2>
          <p className="processing-stage">{processStage}</p>

          {/* Step Progress */}
          <div className="processing-steps">
            {AI_STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`processing-step ${i < currentAIStep ? 'done' : i === currentAIStep ? 'active' : ''}`}
              >
                <span className="step-emoji">{s.emoji}</span>
                <span className="step-label">{s.label.replace('...', '')}</span>
                {i < currentAIStep && <CheckCircle size={14} className="step-check" />}
              </div>
            ))}
          </div>

          <div className="processing-bar">
            <div className="processing-bar-fill" style={{ width: `${progressPct}%` }}></div>
          </div>
          <p className="processing-pct">{Math.round(progressPct)}% complete</p>
        </div>
      </div>
    );
  }

  // ── Upload State ──
  return (
    <div className="study-upload-page">
      <div className="upload-header">
        <h1>📤 Upload Study Material</h1>
        <p>Upload your notes, textbooks, or paste text — AI will create flashcards, quizzes, summaries, and 5 more study tools.</p>
      </div>

      <div className="upload-grid">
        <div className="glass-card upload-form-card">
          {/* Title & Subject */}
          <div className="upload-fields">
            <div className="field-group">
              <label htmlFor="upload-title">Title *</label>
              <input
                id="upload-title"
                type="text"
                placeholder="e.g. Chapter 5: Cell Biology"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label htmlFor="upload-subject">Subject</label>
              <input
                id="upload-subject"
                type="text"
                placeholder="e.g. Biology, Physics, History"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={handleFileSelect}
              hidden
            />
            {file ? (
              <div className="file-preview">
                <span className="file-emoji">{getFileInfo(file.name).icon}</span>
                <div className="file-details">
                  <strong>{file.name}</strong>
                  <span>{getFileInfo(file.name).label} • {(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button className="file-remove" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="drop-zone-content">
                <Upload size={40} />
                <p><strong>Drag & drop</strong> your file here</p>
                <span>or click to browse • PDF, DOCX, TXT</span>
              </div>
            )}
          </div>

          {/* OR Divider */}
          <div className="upload-divider">
            <span>OR paste text directly</span>
          </div>

          {/* Raw Text */}
          <textarea
            className="raw-text-input"
            placeholder="Paste your study notes, lecture content, or any text here..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
          />

          {/* Submit */}
          <button
            className="btn-primary btn-process"
            onClick={handleProcess}
            disabled={processing || (!file && !rawText.trim()) || !title.trim()}
          >
            <Sparkles size={18} />
            Process with AI
          </button>
        </div>

        {/* Side info */}
        <div className="upload-info-stack">
          <div className="glass-card upload-info-card">
            <h3>✨ What AI Generates</h3>
            <ul className="feature-list">
              <li><BookOpen size={16} /> Smart summary with TL;DR</li>
              <li><Layers size={16} /> 15 interactive flashcards</li>
              <li><FileQuestion size={16} /> 10 MCQ quiz questions</li>
              <li><Sparkles size={16} /> Visual diagrams</li>
              <li>🧩 Concept breakdowns with analogies</li>
              <li>🧪 Content analysis & priorities</li>
              <li>🔁 7-day revision plan with email reminders</li>
              <li>📒 Structured study notes</li>
            </ul>
          </div>
          <div className="glass-card upload-info-card">
            <h3>📁 Supported Files</h3>
            <div className="file-types">
              <span className="file-type-badge">PDF</span>
              <span className="file-type-badge">DOCX</span>
              <span className="file-type-badge">DOC</span>
              <span className="file-type-badge">TXT</span>
              <span className="file-type-badge">MD</span>
            </div>
          </div>
          <div className="glass-card upload-info-card upload-xp-card">
            <h3>🎮 Earn XP</h3>
            <p>+50 XP for uploading material</p>
            <p>+100 XP for acing a quiz</p>
            <p>+15 XP per revision completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
