import React, { useEffect, useState } from 'react';
import { Bell, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { getTimeUntil } from '../utils/ebbinghaus';

/**
 * ReminderPanel – Shows upcoming & past reminders with live countdowns.
 * Users can mark reminders as "Remembered" or "Forgot".
 */
export default function ReminderPanel({ reminders, onFeedback }) {
  const [now, setNow] = useState(Date.now());

  // Tick every second for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Separate by status
  const upcoming = reminders.filter((r) => !r.sent_status && !r.feedback);
  const completed = reminders.filter((r) => r.feedback);
  const pending = reminders.filter((r) => r.sent_status && !r.feedback);

  const getUrgencyClass = (scheduledTime) => {
    const diff = new Date(scheduledTime).getTime() - now;
    if (diff <= 0) return 'urgency-now';
    if (diff < 2 * 60 * 1000) return 'urgency-soon';
    return 'urgency-later';
  };

  const ReminderItem = ({ reminder, showActions }) => {
    const diff = new Date(reminder.scheduled_time).getTime() - now;
    const isDue = diff <= 0;
    const urgencyClass = getUrgencyClass(reminder.scheduled_time);

    // FLICKER LOGIC: Only pulse between 10 and 15 seconds remaining
    const shouldFlicker = diff > 10000 && diff <= 15000;

    return (
      <li className={`reminder-item ${urgencyClass} ${reminder.feedback ? `feedback-${reminder.feedback}` : ''}`}>
        <div className="reminder-info">
          <div className="reminder-top">
            <span className="reminder-label">{reminder.interval_label}</span>
            {isDue && !reminder.feedback && (
              <span className="due-badge">
                <AlertTriangle size={12} /> DUE
              </span>
            )}
            {!isDue && shouldFlicker && !reminder.feedback && (
              <span className="due-badge pulse">
                <AlertTriangle size={12} /> ALMOST DUE
              </span>
            )}
            {reminder.feedback === 'remembered' && (
              <span className="feedback-badge remembered">
                <Check size={12} /> Remembered
              </span>
            )}
            {reminder.feedback === 'forgot' && (
              <span className="feedback-badge forgot">
                <X size={12} /> Forgot
              </span>
            )}
          </div>
          <h4>Revise: {reminder.topic_name}</h4>
          <span className="reminder-time">
            <Clock size={13} />
            {isDue && !reminder.feedback
              ? 'Due now – time to revise!'
              : getTimeUntil(reminder.scheduled_time)}
          </span>
        </div>

        {showActions && isDue && !reminder.feedback && (
          <div className="reminder-actions">
            <button
              className="btn-feedback btn-remembered"
              onClick={() => onFeedback(reminder.id, reminder.lesson_id, 'remembered', reminder.interval_label)}
              id={`remembered-${reminder.id}`}
            >
              <Check size={16} />
              Remembered
            </button>
            <button
              className="btn-feedback btn-forgot"
              onClick={() => onFeedback(reminder.id, reminder.lesson_id, 'forgot', reminder.interval_label)}
              id={`forgot-${reminder.id}`}
            >
              <X size={16} />
              Forgot
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <section className="glass-card reminder-panel" id="reminder-panel">
      <div className="card-header">
        <div className="card-icon">
          <Bell size={20} />
        </div>
        <h2>Reminders</h2>
        <span className="badge">{upcoming.length + pending.length}</span>
      </div>

      {(upcoming.length === 0 && pending.length === 0 && completed.length === 0) && (
        <div className="empty-state">
          <Bell size={48} strokeWidth={1} />
          <p>No reminders yet. Add a lesson to start your spaced-repetition schedule!</p>
        </div>
      )}

      {/* Due / Pending reminders needing action */}
      {pending.length > 0 && (
        <div className="reminder-section">
          <h3 className="section-label">⚡ Needs Your Response</h3>
          <ul className="reminder-list">
            {pending.map((r) => (
              <ReminderItem key={r.id} reminder={r} showActions={true} />
            ))}
          </ul>
        </div>
      )}

      {/* Upcoming reminders */}
      {upcoming.length > 0 && (
        <div className="reminder-section">
          <h3 className="section-label">🔔 Upcoming</h3>
          <ul className="reminder-list">
            {upcoming.map((r) => (
              <ReminderItem key={r.id} reminder={r} showActions={true} />
            ))}
          </ul>
        </div>
      )}

      {/* Completed reminders */}
      {completed.length > 0 && (
        <div className="reminder-section">
          <h3 className="section-label">✅ Completed</h3>
          <ul className="reminder-list">
            {completed.map((r) => (
              <ReminderItem key={r.id} reminder={r} showActions={false} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
