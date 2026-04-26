import React, { useState } from 'react';
import { BookOpen, Zap, Plus } from 'lucide-react';

/**
 * LessonForm – Add new lessons to the system.
 * Includes topic input and demo-mode toggle.
 */
export default function LessonForm({ onAddLesson, demoMode, onToggleDemo }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      await onAddLesson(trimmed);
      setTopic('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-card lesson-form-card" id="lesson-form">
      <div className="card-header">
        <div className="card-icon">
          <BookOpen size={20} />
        </div>
        <h2>Log a New Lesson</h2>
      </div>

      <form onSubmit={handleSubmit} className="lesson-form">
        <div className="input-group">
          <input
            id="topic-input"
            type="text"
            placeholder="e.g. Neural Networks – Key Concepts"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !topic.trim()}
            id="add-lesson-btn"
          >
            {loading ? (
              <span className="spinner" />
            ) : (
              <>
                <Plus size={18} />
                Add Lesson
              </>
            )}
          </button>
        </div>
      </form>

      <div className="demo-toggle">
        <label className="toggle-label" htmlFor="demo-toggle">
          <Zap size={16} className={demoMode ? 'text-accent' : ''} />
          <span>Demo Mode</span>
          <span className="toggle-hint">
            {demoMode ? '(intervals in minutes)' : '(real-time intervals)'}
          </span>
        </label>
        <button
          id="demo-toggle"
          type="button"
          role="switch"
          aria-checked={demoMode}
          className={`toggle-switch ${demoMode ? 'active' : ''}`}
          onClick={onToggleDemo}
        >
          <span className="toggle-thumb" />
        </button>
      </div>
    </section>
  );
}
