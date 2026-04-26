import React from 'react';
import { BookMarked, Trash2, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

/**
 * LessonList – Displays all logged lessons with status badges.
 */
export default function LessonList({ lessons, onDelete }) {
  if (!lessons.length) {
    return (
      <section className="glass-card" id="lesson-list">
        <div className="card-header">
          <div className="card-icon">
            <BookMarked size={20} />
          </div>
          <h2>Your Lessons</h2>
        </div>
        <div className="empty-state">
          <BookMarked size={48} strokeWidth={1} />
          <p>No lessons logged yet. Add one above to get started!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card" id="lesson-list">
      <div className="card-header">
        <div className="card-icon">
          <BookMarked size={20} />
        </div>
        <h2>Your Lessons</h2>
        <span className="badge">{lessons.length}</span>
      </div>

      <ul className="lesson-items">
        {lessons.map((lesson) => {
          const createdAt = lesson.created_at
            ? format(new Date(lesson.created_at), 'MMM d, yyyy – h:mm a')
            : 'Just now';

          return (
            <li key={lesson.id} className="lesson-item">
              <div className="lesson-info">
                <h3>{lesson.topic_name}</h3>
                <span className="lesson-meta">
                  <Clock size={13} />
                  {createdAt}
                  {lesson.demo_mode && (
                    <span className="demo-badge">DEMO</span>
                  )}
                </span>
              </div>
              <div className="lesson-actions">
                <span
                  className={`status-badge ${lesson.status}`}
                  id={`status-${lesson.id}`}
                >
                  {lesson.status === 'completed' ? (
                    <><CheckCircle size={13} /> Completed</>
                  ) : (
                    <><Clock size={13} /> Active</>
                  )}
                </span>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => onDelete(lesson.id)}
                  title="Delete lesson"
                  id={`delete-${lesson.id}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
