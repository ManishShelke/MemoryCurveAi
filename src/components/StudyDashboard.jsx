import React from 'react';
import {
  BookOpen, Layers, FileQuestion, Timer, Brain, TrendingUp,
  Clock, Target, Calendar, Flame, BarChart3, CheckCircle,
  Award, Zap, Lightbulb, TestTube, Trash2, RefreshCw
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip
} from 'recharts';
import { getLevel, getNextLevel, getLevelProgress } from './GamificationBar';
import { computeAnalytics } from '../firebase/firestoreService';

const CHART_COLORS = ['#E8736C', '#4ECDC4', '#6CB4EE', '#FFD93D', '#F0918B'];

export default function StudyDashboard({
  studyMaterials, lessons, reminders, quizAttempts, pomodoroSessions, userProgress, onNavigate, onDeleteMaterial, onRegenerateMaterial
}) {
  const getMissingContent = (material) => {
    const missing = [];
    if (!material.flashcards || material.flashcards.length === 0) missing.push('flashcards');
    if (!material.quizQuestions || material.quizQuestions.length === 0) missing.push('quiz');
    if (!material.conceptBreakdown || material.conceptBreakdown.concepts?.length === 0) missing.push('concepts');
    if (!material.analysis) missing.push('analysis');
    if (!material.revisionPlan) missing.push('revision');
    if (!material.notes) missing.push('notes');
    if (!material.tldr) missing.push('summary');
    return missing;
  };

  const analytics = computeAnalytics(studyMaterials, quizAttempts, pomodoroSessions, reminders, userProgress);
  const totalMaterials = studyMaterials.length;
  const totalFlashcards = studyMaterials.reduce((acc, m) => acc + (m.flashcards?.length || 0), 0);
  const avgScore = quizAttempts.length > 0
    ? Math.round(quizAttempts.reduce((acc, a) => acc + (a.score / a.totalQuestions) * 100, 0) / quizAttempts.length) : 0;
  const totalStudyMinutes = pomodoroSessions.reduce((acc, s) => acc + (s.duration || 0) / 60, 0);
  const studyHours = Math.floor(totalStudyMinutes / 60);
  const studyMins = Math.round(totalStudyMinutes % 60);
  const upcomingReviews = reminders.filter((r) => !r.feedback && !r.sent_status)
    .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time)).slice(0, 5);
  const subjectMap = {};
  studyMaterials.forEach((m) => { const subj = m.subject || 'General'; subjectMap[subj] = (subjectMap[subj] || 0) + 1; });
  const subjectData = Object.entries(subjectMap).map(([name, value]) => ({ name, value }));
  const xp = userProgress?.xp || 0;
  const streak = userProgress?.streak || 0;
  const level = getLevel(xp);
  const nextLevel = getNextLevel(xp);
  const levelProgress = getLevelProgress(xp);

  return (
    <div className="page-container dashboard-page">
      <div className="page-header">
        <h1>📊 Student Dashboard</h1>
        <p>Your study progress at a glance — track, analyze, and optimize your learning.</p>
      </div>
      <div className="glass-card dash-gamification-card">
        <div className="dash-gami-left">
          <span className="dash-gami-emoji">{level.emoji}</span>
          <div className="dash-gami-info">
            <h3>{level.name}</h3>
            <div className="dash-gami-xp-row">
              <Zap size={14} style={{ color: level.color }} />
              <span>{xp} XP</span>
              {nextLevel && <span className="dash-gami-next">· {nextLevel.minXP - xp} XP to {nextLevel.name}</span>}
            </div>
          </div>
        </div>
        <div className="dash-gami-right">
          {streak > 0 && (<div className="dash-gami-streak"><Flame size={18} className="streak-flame" /><span>{streak} day streak</span></div>)}
          <div className="dash-gami-bar"><div className="gami-progress-bar"><div className="gami-progress-fill" style={{ width: `${levelProgress}%`, background: level.color }}></div></div></div>
        </div>
      </div>
      <div className="dash-stats-row">
        <div className="glass-card dash-stat-card" onClick={() => onNavigate('upload')}><div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, #E8736C, #F0918B)' }}><BookOpen size={22} /></div><div className="dash-stat-info"><span className="dash-stat-value">{totalMaterials}</span><span className="dash-stat-label">Materials</span></div></div>
        <div className="glass-card dash-stat-card" onClick={() => onNavigate('flashcards')}><div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, #4ECDC4, #2EAD9E)' }}><Layers size={22} /></div><div className="dash-stat-info"><span className="dash-stat-value">{totalFlashcards}</span><span className="dash-stat-label">Flashcards</span></div></div>
        <div className="glass-card dash-stat-card" onClick={() => onNavigate('quiz')}><div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, #6CB4EE, #4A9BD9)' }}><FileQuestion size={22} /></div><div className="dash-stat-info"><span className="dash-stat-value">{avgScore}%</span><span className="dash-stat-label">Quiz Avg</span></div></div>
        <div className="glass-card dash-stat-card" onClick={() => onNavigate('pomodoro')}><div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, #FFD93D, #F0C040)' }}><Timer size={22} /></div><div className="dash-stat-info"><span className="dash-stat-value">{studyHours}h {studyMins}m</span><span className="dash-stat-label">Study Time</span></div></div>
        <div className="glass-card dash-stat-card"><div className="dash-stat-icon" style={{ background: 'linear-gradient(135deg, #E8736C, #4ECDC4)' }}><Brain size={22} /></div><div className="dash-stat-info"><span className="dash-stat-value">{analytics.retentionRate}%</span><span className="dash-stat-label">Retention</span></div></div>
      </div>
      <div className="dash-grid">
        <div className="dash-col">
          <div className="glass-card">
            <div className="card-header"><div className="card-icon"><BookOpen size={20} /></div><h2>Uploaded Materials</h2></div>
            {studyMaterials.length === 0 ? (
              <div className="empty-state"><p>No materials uploaded yet.</p><button className="btn-primary btn-sm" onClick={() => onNavigate('upload')}>Upload Now</button></div>
            ) : (
              <div className="recent-materials-list">
                {studyMaterials.map((mat) => (
                  <div key={mat.id} className="recent-material-item">
                    <div className="recent-mat-info"><h4>{mat.title}</h4><span className="recent-mat-meta">{mat.subject || 'General'} · {mat.flashcards?.length || 0} cards · {mat.quizQuestions?.length || 0} Qs</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getMissingContent(mat).length > 0 && (<button className="btn-icon btn-warning" onClick={(e) => { e.stopPropagation(); onRegenerateMaterial && onRegenerateMaterial(mat.id, mat.rawText); }} title={`Regenerate ${getMissingContent(mat).length} missing`}><RefreshCw size={16} /></button>)}
                      <span className={`difficulty-tag ${mat.difficulty}`}>{mat.difficulty || 'intermediate'}</span>
                      <button className="btn-icon btn-danger" onClick={(e) => { e.stopPropagation(); onDeleteMaterial && onDeleteMaterial(mat.id); }} title="Delete Material"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {subjectData.length > 0 && (
            <div className="glass-card">
              <div className="card-header"><div className="card-icon"><BarChart3 size={20} /></div><h2>Subjects</h2></div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={subjectData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">{subjectData.map((e, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}</Pie><Tooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-primary)', fontFamily: 'Inter' }} /><Legend wrapperStyle={{ fontFamily: 'Inter', fontSize: '12px' }} /></PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="glass-card">
            <div className="card-header"><div className="card-icon" style={{ background: 'linear-gradient(135deg, #4ECDC4, #2EAD9E)' }}><TrendingUp size={20} /></div><h2>Weekly Progress</h2></div>
            <div className="gami-stats-grid">
              <div className="gami-stat"><span className="gami-stat-value">{analytics.thisWeekSessions}</span><span className="gami-stat-label">This Week</span></div>
              <div className="gami-stat"><span className="gami-stat-value">{analytics.lastWeekSessions}</span><span className="gami-stat-label">Last Week</span></div>
              <div className="gami-stat"><span className="gami-stat-value">{analytics.studyConsistency}%</span><span className="gami-stat-label">Consistency</span></div>
              <div className="gami-stat"><span className="gami-stat-value">{analytics.revisionCompletion}%</span><span className="gami-stat-label">Revision Done</span></div>
            </div>
          </div>
        </div>
        <div className="dash-col">
          <div className="glass-card">
            <div className="card-header"><div className="card-icon"><Calendar size={20} /></div><h2>Upcoming Reviews</h2><span className="badge">{upcomingReviews.length}</span></div>
            {upcomingReviews.length === 0 ? (<div className="empty-state"><p>No upcoming reviews. All caught up! 🎉</p></div>) : (
              <div className="upcoming-list">{upcomingReviews.map((r) => (<div key={r.id} className="upcoming-item"><Clock size={14} /><div className="upcoming-info"><span className="upcoming-topic">{r.topic_name}</span><span className="upcoming-time">{r.interval_label}</span></div></div>))}</div>
            )}
          </div>
          <div className="glass-card">
            <div className="card-header"><div className="card-icon"><Flame size={20} /></div><h2>Quick Actions</h2></div>
            <div className="quick-actions">
              <button className="quick-action-btn" onClick={() => onNavigate('upload')}><BookOpen size={18} /> Upload Material</button>
              <button className="quick-action-btn" onClick={() => onNavigate('flashcards')}><Layers size={18} /> Review Flashcards</button>
              <button className="quick-action-btn" onClick={() => onNavigate('quiz')}><FileQuestion size={18} /> Take a Quiz</button>
              <button className="quick-action-btn" onClick={() => onNavigate('pomodoro')}><Timer size={18} /> Focus Session</button>
              <button className="quick-action-btn" onClick={() => onNavigate('concepts')}><Brain size={18} /> Explore Concepts</button>
              <button className="quick-action-btn" onClick={() => onNavigate('revision')}><Calendar size={18} /> Revision Plan</button>
            </div>
          </div>
          <div className="glass-card">
            <div className="card-header"><div className="card-icon" style={{ background: 'linear-gradient(135deg, #FFD93D, #F0C040)' }}><Award size={20} /></div><h2>Your Stats</h2></div>
            <div className="gami-stats-grid">
              <div className="gami-stat"><span className="gami-stat-value">{userProgress?.totalQuizzes || 0}</span><span className="gami-stat-label">Quizzes Taken</span></div>
              <div className="gami-stat"><span className="gami-stat-value">{userProgress?.totalFlashcardsReviewed || 0}</span><span className="gami-stat-label">Cards Reviewed</span></div>
              <div className="gami-stat"><span className="gami-stat-value">{userProgress?.totalStudySessions || 0}</span><span className="gami-stat-label">Focus Sessions</span></div>
              <div className="gami-stat"><span className="gami-stat-value">{streak}</span><span className="gami-stat-label">Day Streak</span></div>
            </div>
          </div>
          {(analytics.weakTopics.length > 0 || analytics.strongTopics.length > 0) && (
            <div className="glass-card">
              <div className="card-header"><div className="card-icon" style={{ background: 'linear-gradient(135deg, #6CB4EE, #4A9BD9)' }}><Target size={20} /></div><h2>Topic Analysis</h2></div>
              {analytics.strongTopics.length > 0 && (<div style={{ marginBottom: '12px' }}><h4 style={{ color: 'var(--success)', marginBottom: '6px', fontSize: '13px' }}>✅ Strong Topics</h4>{analytics.strongTopics.map((t, i) => (<div key={i} className="upcoming-item"><CheckCircle size={14} style={{ color: 'var(--success)' }} /><div className="upcoming-info"><span className="upcoming-topic">{t.topic}</span><span className="upcoming-time">{t.score}% avg</span></div></div>))}</div>)}
              {analytics.weakTopics.length > 0 && (<div><h4 style={{ color: 'var(--danger)', marginBottom: '6px', fontSize: '13px' }}>⚠️ Needs Improvement</h4>{analytics.weakTopics.map((t, i) => (<div key={i} className="upcoming-item"><Target size={14} style={{ color: 'var(--danger)' }} /><div className="upcoming-info"><span className="upcoming-topic">{t.topic}</span><span className="upcoming-time">{t.score}% avg</span></div></div>))}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
