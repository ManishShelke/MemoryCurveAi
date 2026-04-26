// ─────────────────────────────────────────────────────────────
// Firestore Service Layer — Extended
// ─────────────────────────────────────────────────────────────

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

// ── Collection references ──────────────────────────────────
const lessonsCol = collection(db, 'lessons');
const remindersCol = collection(db, 'reminders');
const studyMaterialsCol = collection(db, 'studyMaterials');
const quizAttemptsCol = collection(db, 'quizAttempts');
const pomodoroSessionsCol = collection(db, 'pomodoroSessions');
const studySessionsCol = collection(db, 'studySessions');

// ═══════════════════════════════════════════════════════════
// LESSONS (existing)
// ═══════════════════════════════════════════════════════════

export async function addLesson(topicName, demoMode = false, userId, userEmail = null, userName = null) {
  if (!userId) throw new Error('User not authenticated.');
  const docRef = await addDoc(lessonsCol, {
    topic_name: topicName,
    timestamp: serverTimestamp(),
    created_at: new Date().toISOString(),
    demo_mode: demoMode,
    status: 'active',
    feedback_history: [],
    reminder_count: 0,
    userId,
    user_id: userId,
    user_email: userEmail,
    user_name: userName,
  });
  return docRef.id;
}

export function subscribeLessons(userId, callback) {
  if (!userId) return () => {};
  const q = query(lessonsCol, where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    callback(items);
  });
}

export async function updateLessonStatus(lessonId, status) {
  await updateDoc(doc(db, 'lessons', lessonId), { status });
}

export async function deleteLesson(lessonId) {
  const q = query(remindersCol, where('lesson_id', '==', lessonId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'lessons', lessonId));
}

export async function addFeedbackToLesson(lessonId, feedbackEntry, allDone = false) {
  const lessonRef = doc(db, 'lessons', lessonId);
  const lessonSnap = await getDoc(lessonRef);
  if (!lessonSnap.exists()) return;
  const current = lessonSnap.data().feedback_history || [];
  current.push(feedbackEntry);
  const update = { feedback_history: current };
  if (allDone) update.status = 'completed';
  await updateDoc(lessonRef, update);
}

// ═══════════════════════════════════════════════════════════
// REMINDERS (existing)
// ═══════════════════════════════════════════════════════════

export async function addReminders(reminders, userId, userEmail = null, userName = null) {
  if (!userId) throw new Error('User not authenticated.');
  await Promise.all(
    reminders.map((r) =>
      addDoc(remindersCol, {
        lesson_id: r.lesson_id,
        topic_name: r.topic_name,
        scheduled_time: r.scheduled_time,
        interval_label: r.interval_label,
        sent_status: false,
        feedback: null,
        created_at: new Date().toISOString(),
        userId,
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
      })
    )
  );
}

export function subscribeReminders(userId, callback) {
  if (!userId) return () => {};
  const q = query(remindersCol, where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));
    callback(items);
  });
}

export async function markReminderSent(reminderId) {
  await updateDoc(doc(db, 'reminders', reminderId), { sent_status: true });
}

export async function updateReminderFeedback(reminderId, feedback) {
  await updateDoc(doc(db, 'reminders', reminderId), { feedback, sent_status: true });
}

export async function deleteReminder(reminderId) {
  await deleteDoc(doc(db, 'reminders', reminderId));
}

// ═══════════════════════════════════════════════════════════
// STUDY MATERIALS (new)
// ═══════════════════════════════════════════════════════════

export async function addStudyMaterial(material, userId) {
  if (!userId) throw new Error('User not authenticated.');
  const docRef = await addDoc(studyMaterialsCol, {
    ...material,
    userId,
    created_at: new Date().toISOString(),
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeStudyMaterials(userId, callback) {
  if (!userId) return () => {};
  const q = query(studyMaterialsCol, where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    callback(items);
  });
}

export async function getStudyMaterial(materialId) {
  const snap = await getDoc(doc(db, 'studyMaterials', materialId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateStudyMaterial(materialId, updates) {
  await updateDoc(doc(db, 'studyMaterials', materialId), updates);
}

export async function deleteStudyMaterial(materialId) {
  // Delete associated quiz attempts
  const q = query(quizAttemptsCol, where('materialId', '==', materialId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

  // Delete associated revision reminders
  const rq = query(remindersCol, where('materialId', '==', materialId));
  const rsnap = await getDocs(rq);
  await Promise.all(rsnap.docs.map((d) => deleteDoc(d.ref)));

  await deleteDoc(doc(db, 'studyMaterials', materialId));
}

// ═══════════════════════════════════════════════════════════
// REVISION REMINDERS (new — linked to study materials)
// ═══════════════════════════════════════════════════════════

/**
 * Create 7 daily reminder documents from a revision plan,
 * linked to the study material. These will trigger email
 * reminders via the Cloud Function.
 */
export async function createRevisionReminders(materialId, materialTitle, revisionPlan, userId, userEmail = null, userName = null) {
  if (!userId) throw new Error('User not authenticated.');
  if (!revisionPlan?.schedule) return;

  const now = new Date();
  const reminders = revisionPlan.schedule.map((day, index) => {
    // Schedule each day's reminder at 8:00 AM local time
    const reminderDate = new Date(now);
    reminderDate.setDate(reminderDate.getDate() + index); // Day 1 = today, Day 2 = tomorrow, etc.
    reminderDate.setHours(8, 0, 0, 0);

    // If the first reminder would be in the past today, push to next occurrence
    if (index === 0 && reminderDate < now) {
      reminderDate.setDate(reminderDate.getDate() + 1);
    }

    return {
      materialId,
      topic_name: `${materialTitle} — ${day.label}`,
      scheduled_time: reminderDate.toISOString(),
      interval_label: day.label,
      revision_day: day.day,
      revision_activities: day.activities || [],
      revision_duration: day.duration || '',
      revision_priority: day.priority || 'medium',
      revision_focus: day.focusAreas || [],
      revision_topics: day.topicsToRevise || [],
      revision_technique: day.technique || '',
      sent_status: false,
      feedback: null,
      type: 'revision', // Distinguish from lesson reminders
      created_at: new Date().toISOString(),
      userId,
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
    };
  });

  await Promise.all(
    reminders.map((r) => addDoc(remindersCol, r))
  );

  console.log(`[Firestore] Created ${reminders.length} revision reminders for "${materialTitle}"`);
}

// ═══════════════════════════════════════════════════════════
// REVISION DAY PROGRESS (persisted per material)
// ═══════════════════════════════════════════════════════════

/**
 * Save which revision days are completed for a material
 */
export async function updateRevisionDayProgress(materialId, completedDays) {
  await updateDoc(doc(db, 'studyMaterials', materialId), {
    revisionCompletedDays: completedDays,
  });
}

// ═══════════════════════════════════════════════════════════
// QUIZ ATTEMPTS (new)
// ═══════════════════════════════════════════════════════════

export async function addQuizAttempt(attempt, userId) {
  if (!userId) throw new Error('User not authenticated.');
  const docRef = await addDoc(quizAttemptsCol, {
    ...attempt,
    userId,
    timestamp: new Date().toISOString(),
  });
  return docRef.id;
}

export function subscribeQuizAttempts(userId, callback) {
  if (!userId) return () => {};
  const q = query(quizAttemptsCol, where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    callback(items);
  });
}

// ═══════════════════════════════════════════════════════════
// POMODORO SESSIONS (new)
// ═══════════════════════════════════════════════════════════

export async function addPomodoroSession(session, userId) {
  if (!userId) throw new Error('User not authenticated.');
  const docRef = await addDoc(pomodoroSessionsCol, {
    ...session,
    userId,
    completedAt: new Date().toISOString(),
  });
  return docRef.id;
}

export function subscribePomodoroSessions(userId, callback) {
  if (!userId) return () => {};
  const q = query(pomodoroSessionsCol, where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    callback(items);
  });
}

// ═══════════════════════════════════════════════════════════
// STUDY SESSIONS — General study time tracking
// ═══════════════════════════════════════════════════════════

export async function saveStudySession(session, userId) {
  if (!userId) throw new Error('User not authenticated.');
  const docRef = await addDoc(studySessionsCol, {
    ...session,
    userId,
    timestamp: new Date().toISOString(),
  });
  return docRef.id;
}

export function subscribeStudySessions(userId, callback) {
  if (!userId) return () => {};
  const q = query(studySessionsCol, where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    callback(items);
  });
}

// ═══════════════════════════════════════════════════════════
// FLASHCARD PROGRESS (stored within studyMaterial)
// ═══════════════════════════════════════════════════════════

export async function updateFlashcardProgress(materialId, cardIndex, difficulty) {
  const materialRef = doc(db, 'studyMaterials', materialId);
  const snap = await getDoc(materialRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const progress = data.flashcardProgress || {};
  const now = Date.now();

  // Spaced repetition intervals in ms
  const intervals = {
    easy: 7 * 24 * 60 * 60 * 1000,    // 7 days
    medium: 3 * 24 * 60 * 60 * 1000,   // 3 days
    hard: 1 * 24 * 60 * 60 * 1000,     // 1 day
  };

  progress[cardIndex] = {
    lastReviewed: now,
    nextReview: now + (intervals[difficulty] || intervals.medium),
    difficulty,
    reviewCount: (progress[cardIndex]?.reviewCount || 0) + 1,
  };

  await updateDoc(materialRef, { flashcardProgress: progress });
}

// ═══════════════════════════════════════════════════════════
// GAMIFICATION — User Progress (XP, Streaks, Levels)
// ═══════════════════════════════════════════════════════════

const userProgressCol = collection(db, 'userProgress');

export async function getOrCreateUserProgress(userId) {
  if (!userId) return null;
  const q = query(userProgressCol, where('userId', '==', userId));
  const snap = await getDocs(q);

  if (snap.docs.length > 0) {
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  // Create new progress document
  const newProgress = {
    userId,
    xp: 0,
    level: 'Beginner',
    streak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    totalQuizzes: 0,
    totalFlashcardsReviewed: 0,
    totalStudySessions: 0,
    totalStudyMinutes: 0,
    achievements: [],
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(userProgressCol, newProgress);
  return { id: docRef.id, ...newProgress };
}

export async function addXP(progressId, amount, source = 'general') {
  if (!progressId) return;
  const ref = doc(db, 'userProgress', progressId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const today = new Date().toISOString().split('T')[0];
  const lastActive = data.lastActiveDate || '';

  // Calculate streak
  let newStreak = data.streak || 0;
  if (lastActive !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    newStreak = lastActive === yesterdayStr ? newStreak + 1 : 1;
  }

  const updates = {
    xp: (data.xp || 0) + amount,
    streak: newStreak,
    lastActiveDate: today,
  };

  // Track source-specific stats
  if (source === 'quiz') updates.totalQuizzes = (data.totalQuizzes || 0) + 1;
  if (source === 'flashcard') updates.totalFlashcardsReviewed = (data.totalFlashcardsReviewed || 0) + 1;
  if (source === 'pomodoro') updates.totalStudySessions = (data.totalStudySessions || 0) + 1;

  await updateDoc(ref, updates);
  return { ...data, ...updates };
}

export function subscribeUserProgress(userId, callback) {
  if (!userId) return () => {};
  const q = query(userProgressCol, where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.docs.length > 0) {
      callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
    }
  });
}

// ═══════════════════════════════════════════════════════════
// ANALYTICS — Computed from existing data
// ═══════════════════════════════════════════════════════════

/**
 * Calculate comprehensive analytics from all available data
 */
export function computeAnalytics(studyMaterials, quizAttempts, pomodoroSessions, reminders, userProgress) {
  // Study consistency (days active in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeDays = new Set();
  quizAttempts.forEach(a => {
    if (a.timestamp) activeDays.add(new Date(a.timestamp).toDateString());
  });
  pomodoroSessions.forEach(s => {
    if (s.completedAt) activeDays.add(new Date(s.completedAt).toDateString());
  });
  const studyConsistency = Math.round((activeDays.size / 30) * 100);

  // Quiz performance trend (last 5 quizzes)
  const recentQuizzes = quizAttempts.slice(0, 5);
  const quizTrend = recentQuizzes.map(q => ({
    score: Math.round((q.score / q.totalQuestions) * 100),
    title: q.materialTitle,
    date: q.timestamp,
  }));

  // Weak and strong topics (from quiz results)
  const topicScores = {};
  quizAttempts.forEach(a => {
    const title = a.materialTitle || 'Unknown';
    if (!topicScores[title]) topicScores[title] = { total: 0, correct: 0, attempts: 0 };
    topicScores[title].total += a.totalQuestions || 0;
    topicScores[title].correct += a.score || 0;
    topicScores[title].attempts += 1;
  });

  const weakTopics = [];
  const strongTopics = [];
  Object.entries(topicScores).forEach(([topic, data]) => {
    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    if (pct < 60) weakTopics.push({ topic, score: pct, attempts: data.attempts });
    else strongTopics.push({ topic, score: pct, attempts: data.attempts });
  });

  // Retention rate from reminders
  const remembered = reminders.filter(r => r.feedback === 'remembered').length;
  const forgot = reminders.filter(r => r.feedback === 'forgot').length;
  const retentionRate = remembered + forgot > 0 ? Math.round((remembered / (remembered + forgot)) * 100) : 0;

  // Revision completion
  const totalRevisionDays = studyMaterials.reduce((acc, m) => {
    return acc + (m.revisionPlan?.schedule?.length || 0);
  }, 0);
  const completedRevisionDays = studyMaterials.reduce((acc, m) => {
    const completed = m.revisionCompletedDays || {};
    return acc + Object.values(completed).filter(Boolean).length;
  }, 0);
  const revisionCompletion = totalRevisionDays > 0 ? Math.round((completedRevisionDays / totalRevisionDays) * 100) : 0;

  // Weekly progress (sessions this week vs last week)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const thisWeekSessions = pomodoroSessions.filter(s =>
    s.completedAt && new Date(s.completedAt) >= startOfWeek
  ).length;

  const lastWeekSessions = pomodoroSessions.filter(s =>
    s.completedAt && new Date(s.completedAt) >= startOfLastWeek && new Date(s.completedAt) < startOfWeek
  ).length;

  return {
    studyConsistency,
    quizTrend,
    weakTopics,
    strongTopics,
    retentionRate,
    revisionCompletion,
    thisWeekSessions,
    lastWeekSessions,
    streak: userProgress?.streak || 0,
    totalStudyMinutes: pomodoroSessions.reduce((acc, s) => acc + (s.duration || 0) / 60, 0),
    activeDaysCount: activeDays.size,
  };
}
