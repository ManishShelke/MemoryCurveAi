import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import StudyDashboard from './components/StudyDashboard';
import StudyUpload from './components/StudyUpload';
import PomodoroTimer from './components/PomodoroTimer';
import LessonForm from './components/LessonForm';
import LessonList from './components/LessonList';
import ReminderPanel from './components/ReminderPanel';
import StatsChart from './components/StatsChart';
import AuthPage from './components/Auth/AuthPage';
import FlashcardViewer from './components/FlashcardViewer';
import QuizPage from './components/QuizPage';
import ConceptBreakdown from './components/ConceptBreakdown';
import AnalysisMode from './components/AnalysisMode';
import RevisionPlan from './components/RevisionPlan';

// Auth Context
import { useAuth } from './contexts/AuthContext';

// Firebase service
import {
  addLesson as addLessonToDb,
  subscribeLessons,
  deleteLesson as deleteLessonFromDb,
  addReminders,
  subscribeReminders,
  markReminderSent,
  updateReminderFeedback,
  addFeedbackToLesson,
  subscribeStudyMaterials,
  subscribeQuizAttempts,
  subscribePomodoroSessions,
  getOrCreateUserProgress,
  addXP,
  subscribeUserProgress,
  deleteStudyMaterial,
  updateStudyMaterial,
  saveStudySession,
} from './firebase/firestoreService';

// AI service for regeneration
import {
  summarizeContent, generateFlashcards, generateQuiz,
  generateRevisionPlan,
} from './services/aiService';

// Ebbinghaus engine
import { computeReminders } from './utils/ebbinghaus';

export default function App() {
  const { currentUser } = useAuth();

  // ── Navigation ──
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Existing state ──
  const [lessons, setLessons] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [demoMode, setDemoMode] = useState(true);

  // ── New state ──
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [pomodoroSessions, setPomodoroSessions] = useState([]);
  const [userProgress, setUserProgress] = useState(null);

  // ── Theme ──
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  // Track notified reminders
  const notifiedRef = useRef(new Set());

  // ── Study time tracking ──
  const studyStartRef = useRef(Date.now());

  useEffect(() => {
    if (!currentUser) return;

    // Track study session time
    studyStartRef.current = Date.now();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the page — save study session
        const duration = Math.round((Date.now() - studyStartRef.current) / 1000);
        if (duration > 30) { // Only save sessions longer than 30 seconds
          saveStudySession({
            type: 'browse',
            duration,
            page: activePage,
          }, currentUser.uid).catch(console.warn);
        }
      } else {
        // User returned — restart timer
        studyStartRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => {
      const duration = Math.round((Date.now() - studyStartRef.current) / 1000);
      if (duration > 30) {
        // Use sendBeacon for reliable saving on page close
        const data = JSON.stringify({
          type: 'browse',
          duration,
          page: activePage,
          userId: currentUser.uid,
          timestamp: new Date().toISOString(),
        });
        navigator.sendBeacon?.('/api/study-session', data);
        // Fallback: try to save via Firestore (may not complete)
        saveStudySession({ type: 'browse', duration, page: activePage }, currentUser.uid).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, activePage]);

  // ── Firestore Listeners ──
  useEffect(() => {
    if (!currentUser) {
      setLessons([]);
      setReminders([]);
      setStudyMaterials([]);
      setQuizAttempts([]);
      setPomodoroSessions([]);
      setUserProgress(null);
      return;
    }

    // Init gamification
    getOrCreateUserProgress(currentUser.uid).then((prog) => {
      if (prog) setUserProgress(prog);
    });

    const unsubs = [
      subscribeLessons(currentUser.uid, setLessons),
      subscribeReminders(currentUser.uid, setReminders),
      subscribeStudyMaterials(currentUser.uid, setStudyMaterials),
      subscribeQuizAttempts(currentUser.uid, setQuizAttempts),
      subscribePomodoroSessions(currentUser.uid, setPomodoroSessions),
      subscribeUserProgress(currentUser.uid, setUserProgress),
    ];

    return () => unsubs.forEach((u) => u());
  }, [currentUser]);

  // ── Reminder Notifications ──
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      const now = Date.now();
      reminders.forEach(async (r) => {
        const scheduledTime = new Date(r.scheduled_time).getTime();
        if (scheduledTime <= now && !r.sent_status && !notifiedRef.current.has(r.id)) {
          notifiedRef.current.add(r.id);
          toast(
            () => (
              <div className="toast-reminder">
                <strong>🔔 Revise: {r.topic_name}</strong>
                <p className="toast-label">{r.interval_label}</p>
                <p className="toast-cta">Check Reminders to respond!</p>
              </div>
            ),
            { duration: 8000, icon: '📚' }
          );

          try {
            await markReminderSent(r.id);
          } catch (err) {
            console.error('Failed to mark reminder sent:', err);
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [reminders, currentUser]);

  // ── XP Handler ──
  const handleXPEarned = useCallback(
    async (amount, source) => {
      if (!userProgress?.id) return;
      try {
        await addXP(userProgress.id, amount, source);
      } catch (err) {
        console.error('Failed to add XP:', err);
      }
    },
    [userProgress]
  );

  // ── Handlers ──
  const handleAddLesson = useCallback(
    async (topicName) => {
      if (!currentUser) return;
      try {
        const userEmail = currentUser.email || null;
        const userName = currentUser.displayName || null;
        const lessonId = await addLessonToDb(topicName, demoMode, currentUser.uid, userEmail, userName);
        const now = new Date();
        const scheduled = computeReminders(now, demoMode);
        const reminderDocs = scheduled.map((s) => ({
          lesson_id: lessonId,
          topic_name: topicName,
          scheduled_time: s.time.toISOString(),
          interval_label: s.label,
        }));
        await addReminders(reminderDocs, currentUser.uid, userEmail, userName);
        toast.success(`Lesson "${topicName}" added with ${scheduled.length} reminders!`);

        // XP for adding a lesson
        handleXPEarned(25, 'general');
      } catch (err) {
        console.error('Error adding lesson:', err);
        toast.error('Failed to add lesson.');
      }
    },
    [demoMode, currentUser, handleXPEarned]
  );

  const handleDeleteLesson = useCallback(async (lessonId) => {
    try {
      await deleteLessonFromDb(lessonId);
      toast.success('Lesson deleted.');
    } catch (err) {
      toast.error('Failed to delete lesson.');
    }
  }, []);

  const handleDeleteMaterial = useCallback(async (materialId) => {
    try {
      if (window.confirm("Are you sure you want to delete this material and ALL its generated data (flashcards, quizzes, etc)?")) {
        await deleteStudyMaterial(materialId);
        toast.success("Study material and all generated data deleted completely.");
      }
    } catch (err) {
      console.error('Failed to delete material:', err);
      toast.error('Failed to delete material.');
    }
  }, []);

  // ── Regenerate missing content for a material ──
  const handleRegenerateMaterial = useCallback(async (materialId, rawText) => {
    if (!rawText || rawText.trim().length < 20) {
      toast.error('Not enough text content to regenerate. Please re-upload the material.');
      return;
    }

    const material = studyMaterials.find(m => m.id === materialId);
    if (!material) {
      toast.error('Material not found.');
      return;
    }

    toast.loading('Regenerating missing content...', { id: 'regen' });

    try {
      const updates = {};
      const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      // Only regenerate what's missing
      if (!material.tldr && !material.summary) {
        const data = await summarizeContent(rawText);
        if (data) {
          updates.tldr = data.tldr || '';
          updates.summary = data.summary || '';
          updates.keyPoints = data.keyPoints || [];
          updates.importantTerms = data.importantTerms || [];
          updates.difficulty = data.difficulty || 'intermediate';
          updates.estimatedStudyTime = data.estimatedStudyTime || '30 minutes';
          updates.keyFacts = data.keyFacts || [];
        }
        await sleep(2000);
      }

      if (!material.flashcards || material.flashcards.length === 0) {
        const data = await generateFlashcards(rawText, 15);
        if (data) updates.flashcards = data.cards || [];
        await sleep(2000);
      }

      if (!material.quizQuestions || material.quizQuestions.length === 0) {
        const data = await generateQuiz(rawText, 10);
        if (data) updates.quizQuestions = data.questions || [];
        await sleep(2000);
      }

      if (!material.diagrams || material.diagrams.length === 0) {
        const data = await generateDiagram(rawText);
        if (data) updates.diagrams = data.diagrams || [];
        await sleep(2000);
      }
      if (!material.diagrams || material.diagrams.length === 0) {
        const data = await generateDiagram(rawText);
        if (data) updates.diagrams = data.diagrams || [];
        await sleep(2000);
      }

      if (!material.notes) {
        const data = await generateNotes(rawText);
        if (data) {
          updates.notes = data.notes || '';
          updates.notesSections = data.sections || [];
        }
        await sleep(2000);
      }

      if (!material.conceptBreakdown || !material.conceptBreakdown?.concepts?.length) {
        const data = await generateConceptBreakdown(rawText);
        if (data) updates.conceptBreakdown = data;
        await sleep(2000);
      }

      if (!material.analysis) {
        const data = await generateAnalysis(rawText);
        if (data) updates.analysis = data;
        await sleep(2000);
      }

      if (!material.revisionPlan) {
        const data = await generateRevisionPlan(rawText, material.title);
        if (data) updates.revisionPlan = data;
        await sleep(2000);
      }

      if (Object.keys(updates).length > 0) {
        await updateStudyMaterial(materialId, updates);
        toast.success(`✅ Regenerated ${Object.keys(updates).length} missing content types!`, { id: 'regen' });
      } else {
        toast.success('All content already exists!', { id: 'regen' });
      }
    } catch (err) {
      console.error('Regeneration error:', err);
      toast.error(`Regeneration failed: ${err.message}`, { id: 'regen' });
    }
  }, [studyMaterials]);

  const handleFeedback = useCallback(async (reminderId, lessonId, feedback, intervalLabel) => {
    try {
      await updateReminderFeedback(reminderId, feedback);
      await addFeedbackToLesson(lessonId, {
        interval_label: intervalLabel,
        feedback,
        timestamp: new Date().toISOString(),
      });
      if (feedback === 'remembered') {
        toast.success('Great job! Memory reinforced. 🧠');
        handleXPEarned(15, 'general');
      } else {
        toast("No worries – we'll revisit this sooner! 💪", { icon: '🔁' });
      }
    } catch (err) {
      toast.error('Failed to save feedback.');
    }
  }, [handleXPEarned]);

  const handleNavigate = (page) => setActivePage(page);

  // ── Render Pages ──
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <StudyDashboard
            studyMaterials={studyMaterials}
            lessons={lessons}
            reminders={reminders}
            quizAttempts={quizAttempts}
            pomodoroSessions={pomodoroSessions}
            userProgress={userProgress}
            onNavigate={handleNavigate}
            onDeleteMaterial={handleDeleteMaterial}
            onRegenerateMaterial={handleRegenerateMaterial}
          />
        );
      case 'upload':
        return (
          <StudyUpload
            onNavigate={handleNavigate}
            onMaterialCreated={() => { handleXPEarned(50, 'general'); }}
          />
        );
      case 'flashcards':
        return (
          <FlashcardViewer
            studyMaterials={studyMaterials}
            onXPEarned={handleXPEarned}
          />
        );
      case 'quiz':
        return <QuizPage studyMaterials={studyMaterials} onXPEarned={handleXPEarned} />;
      case 'pomodoro':
        return (
          <PomodoroTimer
            studyMaterials={studyMaterials}
            pomodoroSessions={pomodoroSessions}
            onXPEarned={handleXPEarned}
          />
        );
      case 'concepts':
        return <ConceptBreakdown studyMaterials={studyMaterials} />;
      case 'analysis':
        return <AnalysisMode studyMaterials={studyMaterials} />;
      case 'revision':
        return (
          <RevisionPlan
            studyMaterials={studyMaterials}
            onXPEarned={handleXPEarned}
          />
        );
      case 'reminders':
        return (
          <div className="page-container reminders-page">
            <div className="page-header">
              <h1>🔔 Spaced Repetition</h1>
              <p>Log lessons and get reminders based on the Ebbinghaus Forgetting Curve.</p>
            </div>
            <div className="dashboard-grid">
              <div className="grid-left">
                <LessonForm
                  onAddLesson={handleAddLesson}
                  demoMode={demoMode}
                  onToggleDemo={() => setDemoMode((prev) => !prev)}
                />
                <LessonList lessons={lessons} onDelete={handleDeleteLesson} />
                <StatsChart lessons={lessons} reminders={reminders} />
              </div>
              <div className="grid-right">
                <ReminderPanel reminders={reminders} onFeedback={handleFeedback} />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // ── Auth guard ──
  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        materialCount={studyMaterials.length}
        userProgress={userProgress}
      />

      <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar
          theme={theme}
          toggleTheme={toggleTheme}
          demoMode={demoMode}
          activePage={activePage}
          userProgress={userProgress}
        />

        <main className="main-content">{renderPage()}</main>

        <footer className="footer">
          <p>MemoryCurve &copy; 2026 — AI-Powered Adaptive Learning Platform</p>
        </footer>
      </div>
    </div>
  );
}
